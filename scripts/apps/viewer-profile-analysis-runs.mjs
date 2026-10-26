import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function viewerAnalysisRedactor(root, out, toolRoot) {
 const replacements = [[root, '<capture>'], [out, '<analysis>'], [toolRoot, '<tooling>'], [os.homedir(), '<home>']]
  .filter(([value]) => value).sort((a, b) => b[0].length - a[0].length);
 return value => replacements.reduce((text, [before, after]) => text.split(before).join(after), String(value))
  .replace(/\/Users\/[^/\s"'\\]+/g, '<home>');
}

// A surviving run is useful evidence, but cannot stand in for the declared
// scenario/round/engine matrix or for capture.finish()'s final gates.
async function validateCapture(root, manifest) {
 const expected = [], planErrors = [], finalGateErrors = [], entries = manifest.runs;
 try {
  assert(Array.isArray(manifest.cases) && manifest.cases.length, 'Missing planned scenarios');
  const scenarios = manifest.cases.map(row => row.id);
  assert(scenarios.every(id => typeof id === 'string' && id) && new Set(scenarios).size === scenarios.length, 'Invalid or duplicate planned scenario');
  assert(Array.isArray(manifest.routes) && manifest.routes.length, 'Missing planned engine routes');
  const engines = [...new Set(manifest.routes.map(row => row.engine))];
  assert(engines.every(engine => typeof engine === 'string' && engine), 'Invalid planned engine');
  const repeats = manifest.configuration?.repeats;
  assert(Number.isSafeInteger(repeats) && repeats > 0, 'Missing positive planned repeat count');
  for (const scenario of scenarios) for (let round = 0; round < repeats; round++) for (const engine of engines) expected.push({ scenario, round, engine });
  assert(Array.isArray(manifest.orders) && manifest.orders.length === repeats, 'Profile orders do not cover every planned round');
  for (const order of manifest.orders) assert.deepEqual([...order].sort(), [...engines].sort(), 'Profile order must contain each planned engine exactly once');
 } catch (error) { planErrors.push(error.message); }
 const key = row => JSON.stringify([row.scenario, row.round, row.engine]), planned = new Set(expected.map(key)), seen = new Map();
 for (const entry of entries) seen.set(key(entry), (seen.get(key(entry)) ?? 0) + 1);
 const missingRuns = expected.filter(row => !seen.has(key(row))), unexpectedRuns = entries.filter(row => !planned.has(key(row)))
  .map(({ scenario, round, engine, sequence }) => ({ scenario, round, engine, sequence }));
 const duplicateRuns = [...seen].filter(([, count]) => count > 1).map(([tuple, count]) => {
  const [scenario, round, engine] = JSON.parse(tuple); return { scenario, round, engine, count };
 });
 const check = async (gate, verify) => { try { await verify(); } catch (error) { finalGateErrors.push({ gate, reason: error.message }); } };
 await check('capture-status', () => assert.equal(manifest.status, 'capture-complete-attribution-pending', 'Capture did not finish successfully'));
 await check('capture-finished', () => assert(typeof manifest.finishedAt === 'string' && Number.isFinite(Date.parse(manifest.finishedAt)), 'Missing final capture timestamp'));
 await check('capture-errors', () => assert.deepEqual(manifest.errors, [], 'Capture errors remain'));
 await check('source-integrity', () => {
  assert.equal(manifest.sourceIntegrity, 'passed', 'Final source integrity gate did not pass');
  for (const name of ['tooling', 'candidate', 'viewer']) assert.match(manifest.sourceBefore?.[name]?.sha ?? '', /^[a-f0-9]{40}$/, 'Missing source pin: ' + name);
  assert.equal(manifest.sourceBefore.candidate.sha, manifest.candidateSha, 'Candidate source pin differs');
  assert.deepEqual(manifest.sourceAfter, manifest.sourceBefore, 'Final source pins differ from initial pins');
 });
 for (const [stage, field] of [['before', 'environmentBefore'], ['after', 'environmentAfter']]) await check('ac-power-' + stage, async () => {
  assert.equal(manifest[field]?.verifiedAC, true, 'AC power gate did not pass');
  assert.equal(manifest[field].file, `environment-${stage}/runner.json`, 'Missing expected power observation');
  const file = await fs.realpath(path.join(root, manifest[field].file)); assert(file.startsWith(root + path.sep), 'Power observation escapes capture root');
  const data = JSON.parse(await fs.readFile(file));
  assert.equal(data.power?.available, true, 'AC power observation unavailable');
  assert(typeof data.power.output === 'string' && data.power.output.includes('AC Power'), 'AC power required');
 });
 return { status: planErrors.length || finalGateErrors.length || missingRuns.length || unexpectedRuns.length || duplicateRuns.length || entries.some(row => row.status !== 'captured') ? 'failed' : 'passed',
  expectedRuns: expected.length, recordedRuns: entries.length, capturedRuns: entries.filter(row => row.status === 'captured').length,
  plannedScenarios: [...new Set(expected.map(row => row.scenario))], missingRuns, duplicateRuns, unexpectedRuns, planErrors, finalGateErrors,
  scope: 'Declared scenario × repeat × unique engine coverage and final capture/source/AC gates; per-run attribution is retained even when the capture is incomplete.' };
}

// Each captured profile keeps its own strict result. Never repair a failed
// profile or turn a surviving subset into a complete repeated comparison.
export async function analyzeViewerProfileRuns({ root, out, manifest, analyze, redact, provenance = {} }) {
 const entries = manifest.runs;
 assert(Array.isArray(entries), 'Missing capture run inventory');
 const result = { runs: [], unprocessed: [], analysisFailures: [] };
 const publicValue = value => typeof value === 'string' ? redact(value) : Array.isArray(value) ? value.map(publicValue)
  : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, publicValue(item)])) : value;
 const save = (file, value) => fs.writeFile(path.join(out, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
 result.captureValidation = publicValue(await validateCapture(root, manifest));
 for (const missing of result.captureValidation.missingRuns) result.unprocessed.push({ ...missing, status: 'missing', reason: 'Planned profile has no capture entry; no substitute run or attribution' });
 for (const [index, entry] of entries.entries()) {
  if (entry.status !== 'captured') { result.unprocessed.push({ ...publicValue(entry), reason: 'Incomplete capture is retained without attribution' }); continue; }
  let run, rawFile, rawProfile = null, file;
  try {
   file = `${String(entry.sequence).padStart(3, '0')}-${entry.scenario}-${entry.round}-${entry.engine}.json`;
   assert(!file.includes('/') && !file.includes('\\') && !file.includes('..'), 'Unsafe analysis filename');
   run = await fs.realpath(path.resolve(root, entry.directory)); assert(run.startsWith(root + path.sep), 'Profile directory escapes capture root');
   rawFile = path.join(run, 'profile.cpuprofile');
   const bytes = await fs.readFile(rawFile);
   rawProfile = { file: path.relative(root, rawFile).split(path.sep).join('/'), sha256: hash(bytes), bytes: bytes.length, integrity: 'unchecked' };
   const profile = JSON.parse(bytes), analyzed = await analyze({ entry, run, profile, file });
   const after = await fs.readFile(rawFile);
   assert(after.equals(bytes), 'Raw profile bytes changed during analysis'); rawProfile.integrity = 'unchanged';
   await save(file, { ...analyzed.report, rawProfile });
   result.runs.push(analyzed.summary);
  } catch (error) {
   if (rawProfile) {
    try {
     const after = await fs.readFile(rawFile); rawProfile.afterSha256 = hash(after); rawProfile.afterBytes = after.length;
     rawProfile.integrity = rawProfile.afterSha256 === rawProfile.sha256 && after.length === rawProfile.bytes ? 'unchanged' : 'changed';
    } catch (readError) { rawProfile.integrity = 'unavailable-after-analysis'; rawProfile.integrityError = redact(readError.message); }
   }
   const failureFile = `analysis-failure-${String(index + 1).padStart(3, '0')}.json`;
   const failure = { status: 'analysis-failed', ...provenance, entry: publicValue(entry), rawProfile,
    error: { name: error?.name ?? 'Error', message: redact(error?.message ?? error), stack: redact(error?.stack ?? error) },
    candidateQualification: false, scope: 'Unattributable profile retained unchanged; no clamping, sample filtering, timestamp sorting or substitute run. The repeated case is incomplete.' };
   await save(failureFile, failure);
   const row = { ...publicValue({ scenario: entry.scenario, engine: entry.engine, round: entry.round, sequence: entry.sequence }), file: failureFile, rawProfile, error: failure.error };
   result.analysisFailures.push(row); result.unprocessed.push({ ...publicValue(entry), analysisFailure: failureFile, reason: 'Strict profile analysis failed; raw evidence retained without attribution' });
  }
 }
 const captureIncomplete = result.captureValidation.status !== 'passed';
 result.status = result.analysisFailures.length ? 'incomplete-invalid-profiles' : captureIncomplete || result.unprocessed.length ? 'incomplete-capture' : result.runs.length ? 'analysis-complete' : 'incomplete-no-profiles';
 result.cases = [...new Set([...result.captureValidation.plannedScenarios, ...entries.map(entry => publicValue(entry.scenario))])].map(scenario => {
  const publicScenario = publicValue(scenario), runs = result.runs.filter(row => row.scenario === publicScenario), failures = result.analysisFailures.filter(row => row.scenario === publicScenario), unprocessed = result.unprocessed.filter(row => row.scenario === publicScenario);
  return { scenario: publicValue(scenario), status: failures.length ? 'incomplete-invalid-profiles' : captureIncomplete || unprocessed.length ? 'incomplete-capture' : 'analysis-complete', analyzedRuns: runs.length, analysisFailures: failures.length,
   unprocessedRuns: unprocessed.length, candidateQualification: false,
   scope: failures.length || captureIncomplete || unprocessed.length ? 'An incomplete repeated case cannot qualify a candidate improvement; valid observations remain separate.' : 'Complete diagnostic attribution alone does not qualify a candidate improvement.' };
 });
 result.exitCode = result.status === 'analysis-complete' ? 0 : 1;
 return result;
}
