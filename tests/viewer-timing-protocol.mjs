import test from 'node:test';
import assert from 'node:assert/strict';
import { VIEWER_PIN } from '../scripts/apps/viewer-adapter.mjs';
import { VIEWER_CAPTURE_SETTINGS, validateViewerProtocol, validateViewerCase } from '../scripts/apps/viewer-timing-protocol.mjs';

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
