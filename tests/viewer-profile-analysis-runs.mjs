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
 return { root, out, entries, originals, redact: viewerAnalysisRedactor(root, out, path.resolve('.')) };
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
 await fs.writeFile(path.join(input.root, 'manifest.json'), JSON.stringify({ kind: 'viewer-profile-smoke-only', configuration: { profiling: true },
  candidateSha: 'c'.repeat(40), group: 'engine', status: 'capture-complete-attribution-pending', sourceBefore: { tooling: { sha: 'a'.repeat(40) } }, runs: input.entries }));
 const script = fileURLToPath(new URL('../scripts/apps/viewer-profile-analyze.mjs', import.meta.url));
 await assert.rejects(promisify(execFile)(process.execPath, [script, input.root, input.out]), error => {
  assert.equal(error.code, 1); const output = JSON.parse(error.stdout); assert.equal(output.status, 'incomplete-invalid-profiles'); assert.equal(output.analysisFailures, 1); return true;
 });
 const summary = JSON.parse(await fs.readFile(path.join(input.out, 'summary.json')));
 assert.equal(summary.status, 'incomplete-invalid-profiles'); assert.equal(summary.runs.length, 0); assert.equal(summary.cases[0].candidateQualification, false);
 const failure = JSON.parse(await fs.readFile(path.join(input.out, summary.analysisFailures[0].file)));
 assert.equal(failure.rawProfile.sha256, hash(input.originals[0].bytes)); assert.equal(failure.rawProfile.integrity, 'unchanged'); assert(!JSON.stringify(failure).includes(input.root));
});
