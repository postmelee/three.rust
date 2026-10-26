import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { VIEWER_PIN, hash } from './viewer-adapter.mjs';

export const VIEWER_CAPTURE_SETTINGS = Object.freeze({
 timing: { full: { rounds: 4, warmup: 600, samples: 1200, blockSize: 300 }, smoke: { rounds: 1, warmup: 10, samples: 30, blockSize: 10 } },
 profile: { full: { repeats: 3, warmupFrames: 600, seconds: 12, samplingIntervalUs: 100, prePostObservationSeconds: 2 }, smoke: { repeats: 1, warmupFrames: 60, seconds: 2, samplingIntervalUs: 100, prePostObservationSeconds: 2 } }
});
export const VIEWER_DEFAULT_CASES = Object.freeze([
 { id: 'robot-static', asset: 'robot', playback: 'static', pixelRatio: 1, grid: true },
 { id: 'robot-walking', asset: 'robot', playback: 'walking', pixelRatio: 1, grid: true },
 { id: 'robot-high-resolution', asset: 'robot', playback: 'walking', pixelRatio: 2, grid: true }
]);
export const VIEWER_PROFILE_DEFAULT_CASES = Object.freeze([...VIEWER_DEFAULT_CASES,
 { id: 'robot-walking-grid-off', asset: 'robot', playback: 'walking', pixelRatio: 1, grid: false, scope: 'Shipped grid-off behavior with Walking explicitly selected; the three grid-on feature/control cases remain separate.' }
]);
export const VIEWER_GROUPS = Object.freeze({
 engine: [{ label: 'pure-r186-A', engine: 'pure-r186' }, { label: 'prepared-JS', engine: 'prepared-js-r186' }, { label: 'prepared-Wasm', engine: 'prepared-wasm-r186' }, { label: 'pure-r186-B', engine: 'pure-r186' }],
 migration: [{ label: 'original-r176-A', engine: 'original-r176' }, { label: 'external-r176', engine: 'external-r176' }, { label: 'pure-r186', engine: 'pure-r186' }, { label: 'original-r176-B', engine: 'original-r176' }]
});
export function validateViewerCase(item, requireGui = false) {
 assert.match(item.id, /^[a-z][a-z0-9-]*$/); assert.match(item.asset, /^[a-z][a-z0-9-]*$/);
 assert(['static', 'walking', 'clip'].includes(item.playback)); if (item.playback === 'clip') {
  assert(typeof item.clip === 'string' && item.clip.length > 0, 'Pin the authored native GUI clip name');
  assert(Number.isFinite(item.clipDuration) && item.clipDuration > 0, 'Pin the authored clip duration'); assert(Number.isSafeInteger(item.clipTargetCount) && item.clipTargetCount > 0, 'Pin the authored target-node count');
 }
 assert([1, 2].includes(item.pixelRatio)); assert.equal(typeof item.grid, 'boolean');
 if (requireGui || item.guiLoops) {
  assert(Array.isArray(item.guiLoops) && item.guiLoops.length > 0);
  assert(new Set(item.guiLoops.map(loop => loop.path)).size === item.guiLoops.length);
  for (const loop of item.guiLoops) { assert(typeof loop.path === 'string' && loop.path.startsWith('root')); assert(Array.isArray(loop.controllers) && loop.controllers.length && loop.controllers.every(name => typeof name === 'string')); }
 }
}
export function validateViewerProtocol(value, { kind, mode, output, runtimeSha, group }) {
 assert.equal(value.schema, 1); assert.equal(value.contract, 'native-viewer-callbacks-v1');
 assert.equal(value.viewerSha, VIEWER_PIN); assert.equal(value.adoptionPolicy, 'adoption-v1');
 assert.match(value.runtimeSha, /^[0-9a-f]{40}$/); assert.equal(value.runtimeSha, runtimeSha);
 assert.deepEqual(value.settings, VIEWER_CAPTURE_SETTINGS); assert(VIEWER_GROUPS[group]);
 assert.equal(value.boundary, 'Viewer.animate plus every frozen native dat.gui.updateDisplays rAF body');
 assert.equal(value.quantizationFloor, '2 * frozenCallbackCount * minPositiveDeltaMs');
 assert(Array.isArray(value.cases) && value.cases.length && new Set(value.cases.map(item => item.id)).size === value.cases.length);
 for (const item of value.cases) validateViewerCase(item, true);
 for (const key of ['native', ...(kind === 'timing' ? ['timing', ...(group === 'migration' ? ['timingOriginal'] : [])] : [])]) assert.match(value.preparedManifests?.[key] ?? '', /^[0-9a-f]{64}$/);
 assert(Array.isArray(value.assets) && value.assets.length);
 assert.equal(new Set(value.assets.map(asset => asset.id)).size, value.assets.length, 'Duplicate protocol assets');
 for (const asset of value.assets) {
  assert.match(asset.id, /^[a-z][a-z0-9-]*$/); assert(typeof asset.entry === 'string' && !asset.entry.startsWith('/') && !asset.entry.split('/').includes('..'));
  assert(Array.isArray(asset.files) && asset.files.length && asset.files.some(row => row.file === asset.entry)); assert.equal(new Set(asset.files.map(row => row.file)).size, asset.files.length);
  for (const row of asset.files) { assert(typeof row.file === 'string' && !row.file.startsWith('/') && !row.file.split('/').includes('..')); assert.match(row.sha256, /^[0-9a-f]{64}$/); assert(Number.isSafeInteger(row.bytes) && row.bytes > 0); }
  assert(asset.source && (typeof asset.source === 'string' || typeof asset.source === 'object' && asset.source.pin && asset.source.repository));
  assert(typeof (asset.license ?? asset.source?.license) === 'string' && (asset.license ?? asset.source?.license));
  assert(!Object.hasOwn(asset, 'root'), 'Public protocol assets use hashes and IDs; local roots belong in the invocation descriptor');
 }
 for (const item of value.cases) assert(value.assets.some(asset => asset.id === item.asset), 'Case asset missing from protocol');
 assert.match(value.outputPrefixes?.[kind]?.[group] ?? '', /^task[0-9]+-viewer-[a-z0-9-]+-$/);
 assert(path.basename(path.resolve(output)).startsWith(value.outputPrefixes[kind][group]), 'Use the frozen dedicated Viewer output prefix');
 assert(['full', 'smoke'].includes(mode));
 return value;
}
export async function resolveViewerProtocol(toolRoot, options) {
 const { kind, mode, protocolPath, runtimeSha, group, casesPath } = options;
 assert(VIEWER_CAPTURE_SETTINGS[kind]?.[mode]); assert(VIEWER_GROUPS[group]); assert.match(runtimeSha, /^[0-9a-f]{40}$/);
 if (!protocolPath) {
  assert.equal(mode, 'smoke', 'Full Viewer capture requires a committed protocol');
  const bytes = casesPath ? await fs.readFile(casesPath) : null, cases = bytes ? JSON.parse(bytes) : (kind === 'profile' ? VIEWER_PROFILE_DEFAULT_CASES : VIEWER_DEFAULT_CASES).map(item => ({ ...item }));
  assert(Array.isArray(cases) && cases.length && new Set(cases.map(item => item.id)).size === cases.length); for (const item of cases) validateViewerCase(item);
  return { evidence: null, cases, caseEvidence: bytes ? { sha256: hash(bytes), scope: 'Unqualified smoke-only case discovery input' } : null, config: { mode, ...VIEWER_CAPTURE_SETTINGS[kind][mode] }, files: [] };
 }
 assert(!casesPath, 'A committed protocol cannot be overridden by an external cases file');
 const root = await fs.realpath(toolRoot), file = await fs.realpath(path.resolve(root, protocolPath)), relative = path.relative(root, file).split(path.sep).join('/');
 assert(/^mydocs\/plans\/task_m[0-9a-z]+_[0-9]+_viewer_protocol(?:_[a-z0-9-]+)?\.json$/.test(relative), 'Use the approved task-plan protocol location');
 const bytes = await fs.readFile(file), git = (...args) => execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
 assert(bytes.equals(git('show', 'HEAD:' + relative)), 'Commit exact protocol bytes before capture');
 const value = validateViewerProtocol(JSON.parse(bytes), options);
 return { evidence: { file: relative, sha256: hash(bytes), protocol: value, verifiedAtToolSha: git('rev-parse', 'HEAD').toString().trim() }, cases: value.cases,
  config: { mode, ...VIEWER_CAPTURE_SETTINGS[kind][mode] }, files: [relative] };
}
export async function loadViewerContents(apps, extraFile, declared) {
 const file = path.join(apps, 'editor/examples/models/gltf/RobotExpressive/RobotExpressive.glb'), bytes = await fs.readFile(file);
 assert.equal(hash(bytes), '047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319');
 const contents = [{ id: 'robot', root: path.dirname(file), entry: 'RobotExpressive.glb', files: [{ file: 'RobotExpressive.glb', bytes: bytes.length, sha256: hash(bytes) }], license: 'CC0', source: 'Pinned Three.js Editor RobotExpressive fixture' }];
 if (extraFile) contents.push(...JSON.parse(await fs.readFile(extraFile, 'utf8')));
 assert.equal(new Set(contents.map(item => item.id)).size, contents.length, 'Duplicate content IDs');
 for (const item of contents) {
  item.license ??= typeof item.source === 'object' ? item.source?.license : undefined;
  assert.match(item.id, /^[a-z][a-z0-9-]*$/);
  assert((typeof item.source === 'string' && item.source || item.source && typeof item.source === 'object' && item.source.pin && item.source.repository) && typeof item.license === 'string' && item.license, 'Content source/license evidence is required');
  assert(Array.isArray(item.files) && item.files.some(file => file.file === item.entry), 'Content entry must be allowlisted');
  item.root = await fs.realpath(path.resolve(item.root));
  if (declared) { const pin = declared.find(row => row.id === item.id); if (pin) { for (const key of ['entry', 'files', 'source']) assert.deepEqual(item[key], pin[key], 'Content differs from protocol: ' + item.id + '.' + key); assert.equal(item.license, pin.license ?? pin.source?.license, 'Content license differs from protocol'); } }
 }
 if (declared) for (const item of declared) assert(contents.some(row => row.id === item.id), 'Missing declared content: ' + item.id);
 return contents;
}
