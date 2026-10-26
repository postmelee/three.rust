import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createPinnedViewerContent } from './viewer-content.mjs';
import { readEditorContentPreparation } from './editor-content.mjs';
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
 if (item.nativeDefaultClip !== undefined) { assert.equal(item.nativeDefaultClip, true); assert.equal(item.playback, 'clip'); }
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
  for (const key of ['root', 'zipPrepared', 'zipPreparation']) assert(!Object.hasOwn(asset, key), 'Public protocol assets must exclude local input paths: ' + key);
  if (asset.input) {
   assert(['profile', 'timing'].includes(kind)); validateViewerZipInput(asset.input);
   assert.equal(value.transport?.network ?? 'playwright', 'playwright', 'Native ZIP preserves the original Playwright mirror policy');
   if (kind === 'timing') assertViewerZipTimingProtocol(value, group);
  }
 }
 for (const item of value.cases) { const asset = value.assets.find(asset => asset.id === item.asset); assert(asset, 'Case asset missing from protocol'); if (asset.input) validateViewerZipCase(item); }
 assert.match(value.outputPrefixes?.[kind]?.[group] ?? '', /^task[0-9]+-viewer-[a-z0-9-]+-$/);
 assert(path.basename(path.resolve(output)).startsWith(value.outputPrefixes[kind][group]), 'Use the frozen dedicated Viewer output prefix');
 assert(['full', 'smoke'].includes(mode));
 return value;
}
function assertViewerZipTimingProtocol(value, group) {
 assert(value, 'Native ZIP timing requires a separately committed prospective protocol, including smoke');
 for (const key of ['native', 'timing', ...(group === 'migration' ? ['timingOriginal'] : [])]) assert.match(value.preparedManifests?.[key] ?? '', /^[0-9a-f]{64}$/, 'Pin every native/timing bundle before ZIP timing');
 assert.equal(value.transport?.network, 'playwright'); assert.equal(value.transport?.strictContent, true);
 assert.equal(value.transport?.input, 'native-file-input ZIP'); assert.equal(value.transport?.browser, 'one-process-sequential-fresh-contexts');
 assert.match(value.outputPrefixes?.timing?.[group] ?? '', /^task[0-9]+-viewer-[a-z0-9-]+-$/);
 assert.notEqual(value.outputPrefixes.timing[group], value.outputPrefixes.profile?.[group], 'Timing and profile outputs must remain distinct');
}
export function validateViewerContentCapturePolicy(contents, cases, { kind, group, networkDiagnostic, protocolEvidence }) {
 assert(['profile', 'timing'].includes(kind)); assert(['playwright', 'proxy-cdp-remote'].includes(networkDiagnostic));
 const zipContents = contents.filter(asset => asset.zipPrepared), ownedProcessPerRun = networkDiagnostic !== 'playwright';
 if (ownedProcessPerRun) assert.equal(kind, 'profile', 'Alternate content transport remains profile-only');
 if (zipContents.length) {
  assert.equal(networkDiagnostic, 'playwright', 'ZIP input preserves the original mirror policy');
  if (kind === 'timing') {
   assertViewerZipTimingProtocol(protocolEvidence?.protocol, group);
   for (const asset of zipContents) assert.deepEqual(asset.input, protocolEvidence.protocol.assets.find(item => item.id === asset.id)?.input, 'Timing ZIP must match its committed input evidence');
  }
 }
 for (const scenario of cases) {
  const asset = contents.find(item => item.id === scenario.asset); assert(asset, 'Missing case content: ' + scenario.asset);
  if (asset.zipPrepared) validateViewerZipCase(scenario, asset);
  else if (asset.expected) assert(ownedProcessPerRun, 'Mounted authored content requires its prospective strict transport/readiness profile path');
 }
 return { zipContents, strictContent: ownedProcessPerRun || zipContents.length > 0 };
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
// Local preparation paths never enter the public input contract. The original
// Editor-pinned ZIP writer and Viewer-native zip-js decoder remain distinct.
export function validateViewerZipInput(input) {
 assert.deepEqual(Object.keys(input).sort(), ['assetBytesChanged', 'kind', 'preparationManifestSha256', 'zip']);
 assert.equal(input.kind, 'native-file-input ZIP'); assert.equal(input.assetBytesChanged, false);
 assert.match(input.preparationManifestSha256, /^[0-9a-f]{64}$/);
 assert.deepEqual(Object.keys(input.zip).sort(), ['bytes', 'file', 'sha256']);
 assert.match(input.zip.file, /^[a-z][a-z0-9-]*\.zip$/); assert.match(input.zip.sha256, /^[0-9a-f]{64}$/);
 assert(Number.isSafeInteger(input.zip.bytes) && input.zip.bytes > 0); return input;
}
export function bindViewerZipInput(asset, prepared) {
 assert.equal(prepared.manifest.content, asset.id); assert.equal(prepared.manifest.entry, asset.entry);
 assert.deepEqual(prepared.manifest.files, asset.files, 'ZIP and mounted original source inventories differ');
 const input = { kind: 'native-file-input ZIP', preparationManifestSha256: prepared.manifestSha256,
  zip: { file: prepared.manifest.zip.file, bytes: prepared.manifest.zip.bytes, sha256: prepared.manifest.zip.sha256 }, assetBytesChanged: false };
 validateViewerZipInput(input); if (asset.input) assert.deepEqual(asset.input, input, 'ZIP input evidence differs'); asset.input = input; return input;
}
export function publicViewerContent(asset) {
 return Object.fromEntries(['id', 'entry', 'files', 'license', 'source', 'expected', 'input'].filter(key => Object.hasOwn(asset, key)).map(key => [key, asset[key]]));
}
export function validateViewerZipCase(scenario, asset) {
 assert.equal(scenario.grid, false, 'Native content profiles retain shipped grid-off quality'); assert.equal(scenario.pixelRatio, 1);
 if (scenario.asset === 'bistro') { assert.equal(scenario.playback, 'clip'); assert.equal(scenario.nativeDefaultClip, true, 'Retain initial first-clip autoplay'); }
 else { assert.equal(scenario.asset, 'beautiful-game'); assert.equal(scenario.playback, 'static'); }
 if (asset) {
  if (scenario.playback === 'static') assert.equal(asset.expected.animations.length, 0, 'Static Chess source unexpectedly contains animation');
  else assert.equal(scenario.clip, asset.expected.animations[0].nativeName, 'Pin the first native authored clip');
 }
}
export async function verifyViewerZipInputs(contents, apps) {
 const evidence = [];
 for (const asset of contents.filter(item => item.zipPrepared)) {
  const prepared = await readEditorContentPreparation(asset.zipPrepared, apps);
  assert.deepEqual(bindViewerZipInput({ ...asset }, prepared), asset.input, 'ZIP input changed during capture');
  evidence.push({ id: asset.id, input: asset.input, verifiedOriginalFiles: prepared.manifest.files.length, verifiedZipEntries: prepared.manifest.verifiedEntries.length });
 }
 return evidence;
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
  if (['bistro', 'beautiful-game'].includes(item.id)) { const pinned = await createPinnedViewerContent(item.id, item.root); for (const key of ['entry', 'files', 'source']) assert.deepEqual(item[key], pinned[key], 'Content differs from native feature contract: ' + key); item.expected = pinned.expected; }
  if (item.zipPrepared) {
   assert(item.expected, 'Native ZIP profile inputs require the pinned authored-content feature contract');
   item.zipPreparation = await readEditorContentPreparation(item.zipPrepared, apps);
   item.zipPrepared = item.zipPreparation.root; bindViewerZipInput(item, item.zipPreparation);
  } else assert(!item.input && !item.zipPreparation, 'ZIP input evidence requires a verified local preparation');
  if (declared) { const pin = declared.find(row => row.id === item.id); if (pin) { for (const key of ['entry', 'files', 'source', 'input']) assert.deepEqual(item[key], pin[key], 'Content differs from protocol: ' + item.id + '.' + key); assert.equal(item.license, pin.license ?? pin.source?.license, 'Content license differs from protocol'); } }
 }
 if (declared) for (const item of declared) assert(contents.some(row => row.id === item.id), 'Missing declared content: ' + item.id);
 return contents;
}
