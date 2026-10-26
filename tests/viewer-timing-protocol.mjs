import test from 'node:test';
import assert from 'node:assert/strict';
import { VIEWER_PIN } from '../scripts/apps/viewer-adapter.mjs';
import { VIEWER_CAPTURE_SETTINGS, validateViewerProtocol, validateViewerCase, validateViewerZipInput, bindViewerZipInput, publicViewerContent, validateViewerZipCase, validateViewerContentCapturePolicy } from '../scripts/apps/viewer-timing-protocol.mjs';

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
test('native ZIP profile pins exact input and cannot silently expand into primary timing', () => {
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
function bistroTimingProtocol() {
 const value = fixture(), clip = '1. Lantern_Wind_21|Take 001|BaseLayer';
 value.cases = [{ id: 'bistro-native-first-clip', asset: 'bistro', playback: 'clip', clip, clipDuration: 130.7916717529297, clipTargetCount: 1, nativeDefaultClip: true, pixelRatio: 1, grid: false,
  guiLoops: [{ path: 'root/Lighting', controllers: ['punctualLights'] }, { path: 'root/Animation', controllers: [clip] }] }];
 value.assets = [{ ...value.assets[0], id: 'bistro', input: { ...zipFixture(), zip: { ...zipFixture().zip, file: 'bistro.zip' } } }];
 value.transport = { network: 'playwright', strictContent: true, browser: 'one-process-sequential-fresh-contexts', input: 'native-file-input ZIP' };
 return value;
}
test('prospective native ZIP timing requires frozen native/timed bundles, strict input transport and a separate output', () => {
 const value = bistroTimingProtocol(); assert.equal(validateViewerProtocol(value, options), value);
 const migration = { ...options, group: 'migration', output: '/tmp/task49-viewer-timing-migration-001' };
 assert.equal(validateViewerProtocol(value, migration), value);
 for (const mutate of [v => delete v.preparedManifests.timing, v => delete v.transport, v => { v.transport.strictContent = false; }, v => { v.transport.browser = 'other'; }, v => { v.transport.input = 'HTTP'; }, v => { v.outputPrefixes.profile.engine = v.outputPrefixes.timing.engine; }]) {
  const bad = structuredClone(value); mutate(bad); assert.throws(() => validateViewerProtocol(bad, options));
 }
 const missingOriginal = structuredClone(value); delete missingOriginal.preparedManifests.timingOriginal; assert.throws(() => validateViewerProtocol(missingOriginal, migration));
});
test('native ZIP timing including smoke requires committed input evidence while profile and Robot policies stay distinct', () => {
 const protocol = bistroTimingProtocol(), asset = { ...protocol.assets[0], zipPrepared: '/private/zip', expected: { animations: [{ nativeName: protocol.cases[0].clip }] } };
 const capture = { kind: 'timing', group: 'engine', networkDiagnostic: 'playwright', protocolEvidence: { protocol } };
 const result = validateViewerContentCapturePolicy([asset], protocol.cases, capture);
 assert.equal(result.strictContent, true); assert.deepEqual(result.zipContents, [asset]);
 assert.throws(() => validateViewerContentCapturePolicy([asset], protocol.cases, { ...capture, protocolEvidence: null }), /committed prospective protocol/);
 const changed = structuredClone(asset); changed.input.zip.sha256 = 'f'.repeat(64);
 assert.throws(() => validateViewerContentCapturePolicy([changed], protocol.cases, capture), /committed input evidence/);
 assert.throws(() => validateViewerContentCapturePolicy([asset], protocol.cases, { ...capture, networkDiagnostic: 'proxy-cdp-remote' }));
 assert.equal(validateViewerContentCapturePolicy([asset], protocol.cases, { ...capture, kind: 'profile', protocolEvidence: null }).strictContent, true);
 const robot = fixture(); assert.equal(validateViewerContentCapturePolicy(robot.assets, robot.cases, { ...capture, protocolEvidence: null }).strictContent, false);
 const mounted = { ...asset }; delete mounted.zipPrepared; delete mounted.input;
 assert.throws(() => validateViewerContentCapturePolicy([mounted], protocol.cases, capture), /Mounted authored content/);
 assert.equal(validateViewerContentCapturePolicy([mounted], protocol.cases, { ...capture, kind: 'profile', networkDiagnostic: 'proxy-cdp-remote', protocolEvidence: null }).strictContent, true);
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
