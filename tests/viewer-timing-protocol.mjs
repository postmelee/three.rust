import test from 'node:test';
import assert from 'node:assert/strict';
import { VIEWER_PIN } from '../scripts/apps/viewer-adapter.mjs';
import { VIEWER_CAPTURE_SETTINGS, validateViewerProtocol, validateViewerCase, validateViewerZipInput, bindViewerZipInput, publicViewerContent, validateViewerZipCase } from '../scripts/apps/viewer-timing-protocol.mjs';

function fixture() {
 return { schema: 1, contract: 'native-viewer-callbacks-v1', viewerSha: VIEWER_PIN, runtimeSha: 'a'.repeat(40), adoptionPolicy: 'adoption-v1', settings: structuredClone(VIEWER_CAPTURE_SETTINGS),
  boundary: 'Viewer.animate plus every frozen native dat.gui.updateDisplays rAF body', quantizationFloor: '2 * frozenCallbackCount * minPositiveDeltaMs',
  cases: [{ id: 'robot-static', asset: 'robot', playback: 'static', pixelRatio: 1, grid: true, guiLoops: [{ path: 'root/Display', controllers: ['camera'] }] }],
  preparedManifests: { native: 'b'.repeat(64), timing: 'c'.repeat(64), timingOriginal: 'd'.repeat(64) }, assets: [{ id: 'robot', entry: 'RobotExpressive.glb', files: [{ file: 'RobotExpressive.glb', bytes: 1, sha256: 'e'.repeat(64) }], source: 'Pinned fixture', license: 'CC0' }],
  outputPrefixes: { timing: { engine: 'task49-viewer-timing-engine-', migration: 'task49-viewer-timing-migration-' }, profile: { engine: 'task49-viewer-profile-engine-', migration: 'task49-viewer-profile-migration-' } } };
}
const options = { kind: 'timing', mode: 'full', output: '/tmp/task49-viewer-timing-engine-001', runtimeSha: 'a'.repeat(40), group: 'engine' };
test('full Viewer protocol pins callback boundary, GUI topology, settings, source and dedicated paths', () => {
 const value = fixture(); assert.equal(validateViewerProtocol(value, options), value);
 for (const change of [p => { p.viewerSha = 'f'.repeat(40); }, p => { p.settings.timing.full.samples = 600; }, p => { p.cases[0].guiLoops = []; }, p => { p.preparedManifests.timing = ''; }, p => { p.boundary = 'animate only'; }, p => { p.quantizationFloor = '4 ticks'; }]) {
  const changed = fixture(); change(changed); assert.throws(() => validateViewerProtocol(changed, options));
 }
 assert.throws(() => validateViewerProtocol(fixture(), { ...options, runtimeSha: 'e'.repeat(40) }));
 assert.throws(() => validateViewerProtocol(fixture(), { ...options, output: '/tmp/unrelated-old-capture' }));
});
test('authored animation requires a named native clip and cannot silently become a static scenario', () => {
 const candidate = { id: 'bistro-wind', asset: 'bistro', playback: 'clip', clip: '1. Authored Wind', clipDuration: 2, clipTargetCount: 3, pixelRatio: 1, grid: true };
 assert.doesNotThrow(() => validateViewerCase(candidate));
 assert.throws(() => validateViewerCase({ ...candidate, clip: '' }));
 assert.throws(() => validateViewerCase({ ...candidate, clipDuration: 0 })); assert.throws(() => validateViewerCase({ ...candidate, clipTargetCount: 0 }));
 assert.throws(() => validateViewerCase({ ...candidate, playback: 'play-all-unvalidated' }));
 assert.doesNotThrow(() => validateViewerCase({ ...candidate, grid: false })); assert.throws(() => validateViewerCase({ ...candidate, grid: 'false' }));
});
test('migration paths and instrumented bundled-r176 evidence remain separate from engine effects', () => {
 const value = fixture(), migration = { ...options, group: 'migration', output: '/tmp/task49-viewer-timing-migration-001' };
 assert.equal(validateViewerProtocol(value, migration), value);
 delete value.preparedManifests.timingOriginal; assert.throws(() => validateViewerProtocol(value, migration));
 assert.throws(() => validateViewerProtocol(fixture(), { ...options, group: 'migration' }));
});

const zipFixture = () => ({ kind: 'native-file-input ZIP', preparationManifestSha256: 'a'.repeat(64), zip: { file: 'beautiful-game.zip', bytes: 100, sha256: 'b'.repeat(64) }, assetBytesChanged: false });
test('native ZIP protocol pins exact input and forbids private paths, guard substitution and primary timing expansion', () => {
 const value = fixture(); value.cases[0] = { ...value.cases[0], id: 'beautiful-game-static', asset: 'beautiful-game', grid: false };
 value.assets[0] = { ...value.assets[0], id: 'beautiful-game', input: zipFixture() };
 const profile = { ...options, kind: 'profile', output: '/tmp/task49-viewer-profile-engine-001' };
 assert.equal(validateViewerProtocol(value, profile), value);
 for (const mutate of [v => v.assets[0].input.preparationManifestSha256 = 'bad', v => v.assets[0].zipPrepared = '/private/input', v => v.assets[0].input.zip.file = '/private/model.zip', v => v.transport = { network: 'proxy-cdp-remote' }, v => v.cases[0].grid = true, v => v.cases[0].pixelRatio = 2]) {
  const bad = structuredClone(value); mutate(bad); assert.throws(() => validateViewerProtocol(bad, profile));
 }
 assert.throws(() => validateViewerProtocol(value, options));
 for (const mutate of [v => v.root = '/private', v => v.zip.bytes = 0, v => v.zip.sha256 = 'bad', v => v.assetBytesChanged = true]) { const bad = zipFixture(); mutate(bad); assert.throws(() => validateViewerZipInput(bad)); }
});
test('verified ZIP binding rejects changed original entries and pins; public projection removes preparation paths', () => {
 const asset = { id: 'beautiful-game', entry: 'scene.gltf', files: [{ file: 'scene.gltf', bytes: 2, sha256: 'c'.repeat(64) }], root: '/private/content', zipPrepared: '/private/zip', zipPreparation: { zip: '/private/zip/model.zip' }, filepath: '/private/descriptor-only' };
 const prepared = { manifestSha256: 'a'.repeat(64), manifest: { content: asset.id, entry: asset.entry, files: asset.files, zip: zipFixture().zip } };
 assert.deepEqual(bindViewerZipInput(asset, prepared), zipFixture());
 assert(!JSON.stringify(publicViewerContent(asset)).includes('/private')); assert.deepEqual(publicViewerContent(asset).input, zipFixture());
 for (const mutate of [p => p.manifest.files = [], p => p.manifest.zip.bytes++, p => p.manifest.zip.sha256 = 'd'.repeat(64), p => p.manifestSha256 = 'e'.repeat(64), p => p.manifest.entry = 'other.gltf']) {
  const bad = structuredClone(prepared); mutate(bad); assert.throws(() => bindViewerZipInput({ ...asset }, bad));
 }
});
test('native ZIP cases retain initial authored first-clip autoplay or true static source, grid-off and DPR1', () => {
 const scenario = { asset: 'bistro', playback: 'clip', clip: '1. wind', nativeDefaultClip: true, grid: false, pixelRatio: 1 }, asset = { expected: { animations: [{ nativeName: '1. wind' }] } };
 assert.doesNotThrow(() => validateViewerZipCase(scenario, asset));
 assert.throws(() => validateViewerZipCase({ ...scenario, nativeDefaultClip: false }, asset)); assert.throws(() => validateViewerZipCase({ ...scenario, clip: '2. other' }, asset));
 const chess = { asset: 'beautiful-game', playback: 'static', grid: false, pixelRatio: 1 };
 assert.doesNotThrow(() => validateViewerZipCase(chess, { expected: { animations: [] } })); assert.throws(() => validateViewerZipCase(chess, asset));
});
