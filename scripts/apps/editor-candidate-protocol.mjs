// A new runtime uses a committed protocol and a dedicated output namespace.
// The historical CLI without protocol= remains restricted to its original SHA.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
export const HISTORICAL_EDITOR_CANDIDATE = '6990fd92f61a031c8c2ba7a8282cfb63684e6dfb';
export const EDITOR_SOURCE_PIN = '9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8';
export const EDITOR_PROTOCOL_SETTINGS = Object.freeze({
 profile: { full: { repeats: 3, warmupFrames: 600, seconds: 12, samplingIntervalUs: 100, prePostObservationSeconds: 2 }, smoke: { repeats: 1, warmupFrames: 60, seconds: 2, samplingIntervalUs: 100, prePostObservationSeconds: 2 } },
 timing: { full: { rounds: 4, warmup: 600, samples: 1200, idleWarmup: 120, idleSamples: 240 }, smoke: { rounds: 1, warmup: 10, samples: 30, idleWarmup: 10, idleSamples: 30 } }
});
export function validateEditorProtocol(value, kind, output, requestedSha) {
 assert(['profile','timing'].includes(kind), 'Unknown Editor capture kind');
 assert.equal(value.schema, 1); assert.equal(value.contract, 'native-editor-e3-v1');
 assert.equal(value.editorSha, EDITOR_SOURCE_PIN); assert.equal(value.adoptionPolicy, 'adoption-v1');
 assert.match(value.candidateSha, /^[0-9a-f]{40}$/); assert.notEqual(value.candidateSha, HISTORICAL_EDITOR_CANDIDATE, 'A candidate protocol must identify the new runtime');
 if (requestedSha !== undefined) assert.equal(requestedSha, value.candidateSha, 'Requested candidate differs from committed protocol');
 assert.deepEqual(value.settings, EDITOR_PROTOCOL_SETTINGS, 'Timing conditions changed; design a separately reviewed protocol instead');
 assert.equal(value.scene, 'Task46 native E3 RobotExpressive and E1 idle; unchanged callbacks, viewport and quality controls');
 for (const capture of ['profile','timing']) assert.match(value.outputPrefixes?.[capture], /^task[0-9]+-editor-[a-z0-9-]+-$/);
 assert.notEqual(value.outputPrefixes.profile, value.outputPrefixes.timing, 'Profile and timing output paths must be distinct');
 assert(path.basename(path.resolve(output)).startsWith(value.outputPrefixes[kind]), 'New candidate output must use its declared dedicated prefix');
 return value;
}
export async function resolveEditorProtocol(toolRoot, { kind, protocolPath, requestedSha, output }) {
 if (!protocolPath) {
  const candidateSha = requestedSha ?? HISTORICAL_EDITOR_CANDIDATE;
  assert.equal(candidateSha, HISTORICAL_EDITOR_CANDIDATE, 'A new candidate requires a committed protocol= file and dedicated output path');
  return { candidateSha, evidence: null, files: [] };
 }
 const root = await fs.realpath(toolRoot), file = await fs.realpath(path.resolve(root, protocolPath));
 const relative = path.relative(root, file).split(path.sep).join('/');
 assert(/^mydocs\/plans\/task_m[0-9a-z]+_[0-9]+_editor_protocol\.json$/.test(relative), 'Protocol must be in the approved task-plan location');
 const bytes = await fs.readFile(file), git = (...args) => execFileSync('git', args, { cwd: root, stdio: ['ignore','pipe','pipe'] });
 assert(bytes.equals(git('show', 'HEAD:' + relative)), 'Commit the exact protocol before use');
 const protocol = validateEditorProtocol(JSON.parse(bytes), kind, output, requestedSha);
 return { candidateSha: protocol.candidateSha, files: [relative], evidence: { file: relative, sha256: createHash('sha256').update(bytes).digest('hex'), protocol, verifiedAtToolSha: git('rev-parse','HEAD').toString().trim() } };
}
export function validateEditorProtocolConfiguration(resolved, kind, configuration) {
 if (!resolved.evidence) return;
 const expected = resolved.evidence.protocol.settings[kind][configuration.mode];
 assert(expected, 'Unknown capture mode');
 for (const [key, value] of Object.entries(expected)) assert.equal(configuration[key], value, 'Runner differs from frozen protocol: ' + key);
}
