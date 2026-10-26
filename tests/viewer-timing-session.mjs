import test from 'node:test';
import assert from 'node:assert/strict';
import { validateViewerWindow, importViewerCaptureContent } from '../scripts/apps/viewer-timing-session.mjs';

const scenario = { playback: 'walking', pixelRatio: 1, grid: true };
function endpoints() {
 const renderer = { width: 100, height: 50, cssWidth: 100, cssHeight: 50, pixelRatio: 1, frame: 100, layout: { display: 'block', visibility: 'visible', parentDisplay: 'block', parentVisibility: 'visible' }, quality: { antialias: true, shadowEnabled: false } };
 const before = { at: 100, visibility: 'visible', focused: true, crossOriginIsolated: true, dpr: 1, revision: '186',
  renderers: { main: structuredClone(renderer), axes: structuredClone(renderer) }, mixerTime: 10.8, mixerTimeScale: 1,
  action: { name: '13. Walking', time: .8, duration: 1, paused: false, enabled: true, running: true, timeScale: 1 },
  guiLoops: [{ path: 'root/Animation', controllers: ['13. Walking'] }],
  state: { grid: true, autoRotate: false, playbackSpeed: 1, actionStates: { '13. Walking': true } }, controls: { autoRotate: false }, diagnostics: null };
 const after = structuredClone(before); after.at += 500; after.mixerTime += .5; after.action.time = .3; after.renderers.main.frame += 30; after.renderers.axes.frame += 30;
 return { before, after };
}
test('profile endpoints retain native loop wrap and both renderer passes', () => {
 const { before, after } = endpoints(), result = validateViewerWindow(before, after, scenario, 'pure-r186');
 assert.equal(result.mainFrames, 30); assert.equal(result.axesFrames, 30); assert.equal(result.mixerAdvance, .5);
});
test('shipped grid-off behavior retains the axes renderer with zero axes render passes', () => {
 const { before, after } = endpoints(); before.state.grid = after.state.grid = false; after.renderers.axes.frame = before.renderers.axes.frame;
 const result = validateViewerWindow(before, after, { ...scenario, grid: false }, 'pure-r186'); assert.equal(result.mainFrames, 30); assert.equal(result.axesFrames, 0);
});
test('native hidden grid-off axes preserve their intrinsic buffer instead of requiring a CSS resize', () => {
 const { before, after } = endpoints(); before.state.grid = after.state.grid = false; after.renderers.axes.frame = before.renderers.axes.frame;
 for (const value of [before, after]) { value.renderers.axes.cssWidth = 0; value.renderers.axes.cssHeight = 0; value.renderers.axes.layout.parentDisplay = 'none'; }
 assert.equal(validateViewerWindow(before, after, { ...scenario, grid: false }, 'pure-r186').axesFrames, 0);
 after.renderers.axes.width = 0; assert.throws(() => validateViewerWindow(before, after, { ...scenario, grid: false }, 'pure-r186'), /Renderer changed/);
});
test('frozen mixer, missing axes, wrong clip phase or changed quality rejects', () => {
 for (const change of [a => { a.mixerTime = 10.8; }, a => { a.renderers.axes.frame--; }, a => { a.action.time = .7; }, a => { a.renderers.main.quality.shadowEnabled = true; }, a => { a.state.actionStates['13. Walking'] = false; }, a => { a.focused = false; }]) {
  const { before, after } = endpoints(); change(after); assert.throws(() => validateViewerWindow(before, after, scenario, 'pure-r186'));
 }
});
test('actual Wasm calls are required, independent of backend label', () => {
 const { before, after } = endpoints();
 const counters = { backend: 'prepared-wasm', wasmActive: true, wasmCalls: 0, preparedPasses: 0, preparedWasmCalls: 0, preparedFallbacks: 0, matrixReads: 0, preparedMatrixReads: 0, materializedBytes: 0 };
 before.diagnostics = { ...counters }; after.diagnostics = { ...counters };
 assert.throws(() => validateViewerWindow(before, after, scenario, 'prepared-wasm-r186'), /No actual Wasm/);
 after.diagnostics.wasmCalls = 10; assert.equal(validateViewerWindow(before, after, scenario, 'prepared-wasm-r186').counters.wasmCalls, 10);
});
test('static content without an animation mixer still requires native rendering', () => {
 const { before, after } = endpoints(); for (const value of [before, after]) { value.mixerTime = null; value.mixerTimeScale = null; value.action = null; value.state.actionStates = {}; }
 assert.equal(validateViewerWindow(before, after, { ...scenario, playback: 'static' }, 'pure-r186').mixerAdvance, null);
 after.renderers.main.frame = before.renderers.main.frame; assert.throws(() => validateViewerWindow(before, after, { ...scenario, playback: 'static' }, 'pure-r186'));
});

test('ZIP input calls the native file chooser and never dispatches an HTTP App.view import', async () => {
 const observed = [], app = { validator: { report: null }, view(...args) { observed.push(['view', ...args]); } };
 const run = { origin: 'http://local.test', page: { evaluate: async (fn, value) => { globalThis.VIEWER = { app }; try { return fn(value); } finally { delete globalThis.VIEWER; delete globalThis.__viewerPreviousContent; delete globalThis.__viewerPreviousReport; } }, locator: selector => ({ setInputFiles: async file => observed.push(['file', selector, file]) }) } };
 await importViewerCaptureContent(run, { id: 'beautiful-game', entry: 'scene.gltf', zipPreparation: { zip: '/private/prepared/beautiful-game.zip' } });
 assert.deepEqual(observed, [['file', '#file-input', '/private/prepared/beautiful-game.zip']]); observed.length = 0;
 await importViewerCaptureContent(run, { id: 'robot', entry: 'RobotExpressive.glb' });
 assert.equal(observed.length, 1); assert.deepEqual(observed[0], ['view', 'http://local.test/__viewer_content__/robot/RobotExpressive.glb', '', new Map()]);
});
