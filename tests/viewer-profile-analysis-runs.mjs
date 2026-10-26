import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { analyzeCandidateProfile } from '../scripts/apps/candidate-profile-analysis.mjs';
import { analyzeViewerProfileRuns, viewerAnalysisRedactor } from '../scripts/apps/viewer-profile-analysis-runs.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const profile = deltas => ({ startTime: 0, endTime: 300, nodes: [
 { id: 1, callFrame: { functionName: '(root)', url: '', scriptId: '0', lineNumber: -1, columnNumber: -1 }, children: [2] },
 { id: 2, callFrame: { functionName: 'render', url: 'http://fixture/viewer.js', scriptId: '1', lineNumber: 0, columnNumber: 0 } }
], samples: deltas.map(() => 2), timeDeltas: deltas });
async function fixture(t, values) {
 const directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'rthree-viewer-profile-runs-')));
 t.after(() => fs.rm(directory, { recursive: true, force: true }));
 const root = path.join(directory, 'capture'), out = path.join(directory, 'analysis'); await fs.mkdir(root); await fs.mkdir(out);
 const entries = [], originals = [];
 for (const [index, value] of values.entries()) {
  const entry = { sequence: index + 1, scenario: 'native-scene', engine: ['pure-r186', 'prepared-js-r186', 'prepared-wasm-r186'][index], round: 0, directory: 'run-' + index, status: 'captured' };
  const run = path.join(root, entry.directory); await fs.mkdir(run);
  const bytes = Buffer.from(JSON.stringify(value)), file = path.join(run, 'profile.cpuprofile'); await fs.writeFile(file, bytes); entries.push(entry); originals.push({ file, bytes });
 }
 const source = { tooling: { sha: 'a'.repeat(40), dirty: false }, candidate: { sha: 'c'.repeat(40), dirty: false }, viewer: { sha: 'b'.repeat(40), dirty: false } };
 const manifest = { kind: 'viewer-profile-smoke-only', candidateSha: source.candidate.sha, group: 'engine', configuration: { profiling: true, repeats: 1 },
  status: 'capture-complete-attribution-pending', finishedAt: '2026-10-26T12:00:00.000Z', errors: [], sourceBefore: source, sourceAfter: structuredClone(source), sourceIntegrity: 'passed',
  cases: [{ id: 'native-scene' }], routes: entries.map(({ engine }) => ({ engine })), orders: [entries.map(({ engine }) => engine)], runs: entries };
 for (const stage of ['before', 'after']) {
  const file = `environment-${stage}/runner.json`; manifest[stage === 'before' ? 'environmentBefore' : 'environmentAfter'] = { file, verifiedAC: true };
  await fs.mkdir(path.dirname(path.join(root, file))); await fs.writeFile(path.join(root, file), JSON.stringify({ power: { available: true, output: "Now drawing from 'AC Power'" } }));
 }
 return { root, out, entries, manifest, originals, redact: viewerAnalysisRedactor(root, out, path.resolve('.')) };
}
async function analyze({ entry, profile, file }) {
 const report = await analyzeCandidateProfile(profile, async frame => ({ label: frame.functionName, sourceStatus: 'unresolved-source' }));
 return { report, summary: { scenario: entry.scenario, engine: entry.engine, round: entry.round, file, samples: report.samples, weightedMs: report.weightedMs } };
}

test('a negative middle profile remains invalid while later valid attribution and all raw bytes survive', async t => {
 const input = await fixture(t, [profile([100, 200]), profile([100, -1]), profile([100, 200])]);
 const visited = [], result = await analyzeViewerProfileRuns({ ...input, analyze: async data => { visited.push([...data.profile.timeDeltas]); return analyze(data); } });
 assert.deepEqual(visited, [[100, 200], [100, -1], [100, 200]]);
 assert.equal(result.status, 'incomplete-invalid-profiles'); assert.equal(result.exitCode, 1);
 assert.deepEqual(result.runs.map(row => row.engine), ['pure-r186', 'prepared-wasm-r186']); assert.equal(result.analysisFailures.length, 1); assert.equal(result.unprocessed.length, 1);
 assert.equal(result.cases[0].candidateQualification, false); assert.match(result.cases[0].scope, /incomplete repeated case/);
 const failure = JSON.parse(await fs.readFile(path.join(input.out, result.analysisFailures[0].file)));
 assert.match(failure.error.message, /Invalid sample timeDelta/); assert.equal(failure.rawProfile.sha256, hash(input.originals[1].bytes)); assert.equal(failure.rawProfile.integrity, 'unchanged');
 assert.equal(JSON.parse(input.originals[1].bytes).timeDeltas[1], -1);
 for (const original of input.originals) assert.deepEqual(await fs.readFile(original.file), original.bytes);
 for (const row of result.runs) { const saved = JSON.parse(await fs.readFile(path.join(input.out, row.file))); assert.equal(saved.samples, 2); assert(Math.abs(saved.weightedMs - 0.3) < 1e-12); assert.equal(saved.rawProfile.integrity, 'unchanged'); }
 await assert.rejects(fs.access(path.join(input.out, '002-native-scene-0-prepared-js-r186.json')));
 assert(!JSON.stringify(result).includes(input.root)); assert(!JSON.stringify(failure).includes(os.homedir()));
});

test('all-invalid input still produces explicit failures and no fabricated zero-valued result', async t => {
 const input = await fixture(t, [profile([100, -1]), profile([100, null])]);
 const result = await analyzeViewerProfileRuns({ ...input, analyze });
 assert.equal(result.exitCode, 1); assert.equal(result.status, 'incomplete-invalid-profiles'); assert.equal(result.runs.length, 0); assert.equal(result.analysisFailures.length, 2);
 for (const row of result.analysisFailures) {
  const failed = JSON.parse(await fs.readFile(path.join(input.out, row.file))); assert.equal(failed.status, 'analysis-failed'); assert(!Object.hasOwn(failed, 'activeMs')); assert(!Object.hasOwn(failed, 'samples'));
 }
 for (const original of input.originals) assert.deepEqual(await fs.readFile(original.file), original.bytes);
});

test('complete inputs keep successful reports while source errors are redacted and never suppress later runs', async t => {
 const good = await fixture(t, [profile([0, 300]), profile([100, 200])]);
 const complete = await analyzeViewerProfileRuns({ ...good, analyze });
 assert.equal(complete.status, 'analysis-complete'); assert.equal(complete.exitCode, 0); assert.equal(complete.runs.length, 2); assert.deepEqual(complete.unprocessed, []); assert.deepEqual(complete.analysisFailures, []);
 const failed = await fixture(t, [profile([100, 200]), profile([100, 200])]);
 const result = await analyzeViewerProfileRuns({ ...failed, analyze: data => { if (data.entry.sequence === 1) throw Error(`Source mismatch in ${failed.root}/run-0/source.js and ${os.homedir()}/private.js`); return analyze(data); } });
 assert.equal(result.exitCode, 1); assert.equal(result.runs.length, 1); assert.equal(result.runs[0].engine, 'prepared-js-r186');
 const json = await fs.readFile(path.join(failed.out, result.analysisFailures[0].file), 'utf8'); assert(!json.includes(failed.root)); assert(!json.includes(os.homedir())); assert(json.includes('<capture>')); assert(json.includes('<home>'));
});

test('changed raw bytes cannot yield a successful report, and incomplete captures are not analyzed', async t => {
 const input = await fixture(t, [profile([100, 200]), profile([100, 200])]); input.entries[1].status = 'failed';
 let calls = 0;
 const result = await analyzeViewerProfileRuns({ ...input, analyze: async data => { calls++; const answer = await analyze(data); await fs.writeFile(input.originals[0].file, JSON.stringify(profile([0, 300]))); return answer; } });
 assert.equal(calls, 1); assert.equal(result.runs.length, 0); assert.equal(result.unprocessed.length, 2); assert.equal(result.analysisFailures.length, 1); assert.equal(result.analysisFailures[0].rawProfile.integrity, 'changed'); assert.equal(result.exitCode, 1);
 assert.match(result.analysisFailures[0].error.message, /Raw profile bytes changed/);
});

test('the CLI writes an incomplete summary and exits nonzero when captured source provenance is missing', async t => {
 const input = await fixture(t, [profile([100, 200])]); await fs.rmdir(input.out);
 await fs.writeFile(path.join(input.root, 'manifest.json'), JSON.stringify(input.manifest));
 const script = fileURLToPath(new URL('../scripts/apps/viewer-profile-analyze.mjs', import.meta.url));
 await assert.rejects(promisify(execFile)(process.execPath, [script, input.root, input.out]), error => {
  assert.equal(error.code, 1); const output = JSON.parse(error.stdout); assert.equal(output.status, 'incomplete-invalid-profiles'); assert.equal(output.analysisFailures, 1); return true;
 });
 const summary = JSON.parse(await fs.readFile(path.join(input.out, 'summary.json')));
 assert.equal(summary.status, 'incomplete-invalid-profiles'); assert.equal(summary.runs.length, 0); assert.equal(summary.cases[0].candidateQualification, false);
 const failure = JSON.parse(await fs.readFile(path.join(input.out, summary.analysisFailures[0].file)));
 assert.equal(failure.rawProfile.sha256, hash(input.originals[0].bytes)); assert.equal(failure.rawProfile.integrity, 'unchanged'); assert(!JSON.stringify(failure).includes(input.root));
});

test('an interruption between run entries retains attribution but exposes every missing planned tuple', async t => {
 const input = await fixture(t, [profile([100, 200])]);
 input.manifest.configuration.repeats = 2;
 input.manifest.cases.push({ id: 'second-scene' });
 input.manifest.routes.push({ engine: 'prepared-js-r186' }, { engine: 'pure-r186' }); // Repeated A/A label is one profile engine.
 input.manifest.orders = [['pure-r186', 'prepared-js-r186'], ['prepared-js-r186', 'pure-r186']];
 input.manifest.status = 'failed'; input.manifest.errors.push('Interrupted before creating the next run entry');
 const result = await analyzeViewerProfileRuns({ ...input, analyze });
 assert.equal(result.status, 'incomplete-capture'); assert.equal(result.exitCode, 1); assert.equal(result.runs.length, 1); assert.equal(result.analysisFailures.length, 0);
 assert.equal(result.captureValidation.expectedRuns, 8); assert.equal(result.captureValidation.missingRuns.length, 7); assert.equal(result.unprocessed.length, 7);
 assert(result.captureValidation.missingRuns.some(row => row.scenario === 'second-scene' && row.round === 1 && row.engine === 'prepared-js-r186'));
 assert.deepEqual(result.cases.map(row => [row.scenario, row.status]), [['native-scene', 'incomplete-capture'], ['second-scene', 'incomplete-capture']]);
 assert.deepEqual(await fs.readFile(input.originals[0].file), input.originals[0].bytes);
});

test('duplicate and unexpected tuples or truncated orders cannot replace a missing planned run', async t => {
 const input = await fixture(t, [profile([100, 200]), profile([100, 200]), profile([100, 200])]);
 input.entries[1].engine = input.entries[0].engine; input.entries[2].round = 2; input.manifest.orders = [];
 const result = await analyzeViewerProfileRuns({ ...input, analyze });
 assert.equal(result.exitCode, 1); assert.equal(result.status, 'incomplete-capture'); assert.equal(result.runs.length, 3);
 assert.equal(result.captureValidation.missingRuns.length, 2); assert.equal(result.captureValidation.duplicateRuns.length, 1); assert.equal(result.captureValidation.unexpectedRuns.length, 1);
 assert.match(result.captureValidation.planErrors[0], /every planned round/);
});

test('all captured runs remain separate from a failed final source or power gate', async t => {
 const variants = [
  ['capture-status', input => { input.manifest.status = 'failed'; }],
  ['capture-finished', input => { delete input.manifest.finishedAt; }],
  ['capture-errors', input => { input.manifest.errors.push('Final gate failed'); }],
  ['source-integrity', input => { delete input.manifest.sourceIntegrity; }],
  ['source-integrity', input => { input.manifest.sourceAfter.tooling.sha = 'd'.repeat(40); }],
  ['ac-power-after', input => { delete input.manifest.environmentAfter; }],
  ['ac-power-after', input => fs.writeFile(path.join(input.root, 'environment-after/runner.json'), JSON.stringify({ power: { available: true, output: "Now drawing from 'Battery Power'" } }))]
 ];
 for (const [gate, mutate] of variants) {
  const input = await fixture(t, [profile([100, 200])]); await mutate(input);
  const result = await analyzeViewerProfileRuns({ ...input, analyze });
  assert.equal(result.status, 'incomplete-capture', gate); assert.equal(result.exitCode, 1); assert.equal(result.runs.length, 1); assert.equal(result.analysisFailures.length, 0);
  assert(result.captureValidation.finalGateErrors.some(row => row.gate === gate)); assert.equal(result.cases[0].status, 'incomplete-capture');
  assert.deepEqual(await fs.readFile(input.originals[0].file), input.originals[0].bytes);
 }
});

async function writeCLIFixture(input) {
 const preparedBytes = Buffer.from(JSON.stringify({ outputs: [] })), preparationManifestSha256 = hash(preparedBytes);
 const file = 'prepared-manifests/native.json'; await fs.mkdir(path.dirname(path.join(input.root, file))); await fs.writeFile(path.join(input.root, file), preparedBytes);
 input.manifest.preparedManifests = { native: preparationManifestSha256 };
 input.manifest.preparedManifestFiles = { native: { file, bytes: preparedBytes.length, sha256: preparationManifestSha256 } };
 const source = Buffer.from('function render() { return 1; }\n'), sha256 = hash(source), sourceFile = `sources/${sha256}.bin`, label = 'viewer/src/viewer.js', url = '<origin>/viewer.js';
 for (const entry of input.entries) {
  const run = path.join(input.root, entry.directory); await fs.mkdir(path.join(run, 'sources')); await fs.writeFile(path.join(run, sourceFile), source);
  for (const [name, value] of Object.entries({
   'profile-manifest.json': { origin: 'http://127.0.0.1:9000' }, 'adaptation.json': { preparationManifestSha256, appBundleOutputs: [] },
   'captured-sources.json': [{ url, label, sha256, bytes: source.length, file: sourceFile }], 'served-files.json': [{ file: label, sha256 }], 'network.json': [],
   'profile-scripts.json': [{ scriptId: '1', kind: 'javascript', parsed: { url }, sha256, bytes: source.length, file: sourceFile }]
  })) await fs.writeFile(path.join(run, name), JSON.stringify(value));
 }
 await fs.writeFile(path.join(input.root, 'manifest.json'), JSON.stringify(input.manifest));
}

test('weighted and counts CLIs preserve valid raw attribution but both exit nonzero for missing runs or failed final gates', async t => {
 const weightedScript = fileURLToPath(new URL('../scripts/apps/viewer-profile-analyze.mjs', import.meta.url));
 const countsScript = fileURLToPath(new URL('../scripts/apps/viewer-profile-count-analyze.mjs', import.meta.url));
 for (const variant of ['complete', 'missing-run', 'final-source', 'final-power']) {
  const input = await fixture(t, [profile([100, 200])]); await fs.rmdir(input.out);
  if (variant === 'missing-run') { input.manifest.configuration.repeats = 2; input.manifest.orders.push(['pure-r186']); }
  if (variant === 'final-source') { input.manifest.status = 'failed'; delete input.manifest.sourceAfter; input.manifest.errors.push('Final source validation failed'); }
  if (variant === 'final-power') { input.manifest.status = 'failed'; delete input.manifest.environmentAfter; input.manifest.errors.push('AC power required'); }
  await writeCLIFixture(input);
  const expectedStatus = variant === 'complete' ? 'analysis-complete' : 'incomplete-capture', expectedCode = variant === 'complete' ? 0 : 1;
  for (const [script, args, out] of [[weightedScript, [input.root, input.out], input.out], [countsScript, [input.root, input.out, input.out + '-counts'], input.out + '-counts']]) {
   const execution = await promisify(execFile)(process.execPath, [script, ...args]).then(value => ({ ...value, code: 0 }), error => error);
   assert.equal(execution.code, expectedCode, execution.stderr); assert.equal(JSON.parse(execution.stdout).status, expectedStatus);
   const summary = JSON.parse(await fs.readFile(path.join(out, 'summary.json')));
   assert.equal(summary.status, expectedStatus); assert.equal(summary.runs.length, 1); assert.equal(summary.analysisFailures.length, 0);
   assert.equal(summary.captureValidation.status, variant === 'complete' ? 'passed' : 'failed'); assert.equal(summary.cases[0].status, expectedStatus);
   const report = JSON.parse(await fs.readFile(path.join(out, summary.runs[0].file)));
   assert.equal(report.rawProfile.sha256, hash(input.originals[0].bytes)); assert.equal(report.rawProfile.integrity, 'unchanged');
   if (script === countsScript) { assert.equal(summary.historicalWeightedGate.status, expectedStatus); assert.equal(summary.historicalWeightedGate.verdictUnchanged, true); assert.equal(summary.performanceQualification, false); assert.equal(report.totalHits, 2); }
   else assert.equal(report.samples, 2);
  }
  assert.deepEqual(await fs.readFile(input.originals[0].file), input.originals[0].bytes);
 }
});
