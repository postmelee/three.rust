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

// Each captured profile keeps its own strict result. Never repair a failed
// profile or turn a surviving subset into a complete repeated comparison.
export async function analyzeViewerProfileRuns({ root, out, entries, analyze, redact, provenance = {} }) {
 const result = { runs: [], unprocessed: [], analysisFailures: [] };
 const publicValue = value => typeof value === 'string' ? redact(value) : Array.isArray(value) ? value.map(publicValue)
  : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, publicValue(item)])) : value;
 const save = (file, value) => fs.writeFile(path.join(out, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
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
 result.status = result.analysisFailures.length ? 'incomplete-invalid-profiles' : result.unprocessed.length ? 'incomplete-capture' : result.runs.length ? 'analysis-complete' : 'incomplete-no-profiles';
 result.cases = [...new Set(entries.map(entry => entry.scenario))].map(scenario => {
  const publicScenario = publicValue(scenario), runs = result.runs.filter(row => row.scenario === publicScenario), failures = result.analysisFailures.filter(row => row.scenario === publicScenario), unprocessed = result.unprocessed.filter(row => row.scenario === publicScenario);
  return { scenario: publicValue(scenario), status: failures.length ? 'incomplete-invalid-profiles' : unprocessed.length ? 'incomplete-capture' : 'analysis-complete', analyzedRuns: runs.length, analysisFailures: failures.length,
   unprocessedRuns: unprocessed.length, candidateQualification: false,
   scope: failures.length || unprocessed.length ? 'An incomplete repeated case cannot qualify a candidate improvement; valid observations remain separate.' : 'Complete diagnostic attribution alone does not qualify a candidate improvement.' };
 });
 result.exitCode = result.status === 'analysis-complete' ? 0 : 1;
 return result;
}
