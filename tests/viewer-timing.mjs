import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { installViewerTimingCollector } from '../scripts/apps/viewer-timing-collector.mjs';
import { analyzeViewerTiming, summarizeViewerTiming } from '../scripts/apps/viewer-timing-analysis.mjs';
import { instrumentViewerSource } from '../scripts/apps/viewer-timing-overlay.mjs';

function fixture({ playback = 'walking', noMixer = false } = {}) {
 const events = {}, clip = { name: '2. Walking', duration: 1 }, action = { time: 0, paused: false, enabled: true, getClip: () => clip, isRunning: () => true, getEffectiveTimeScale: () => 1 };
 const renderer = () => ({ domElement: { width: 100, height: 50, clientWidth: 100, clientHeight: 50 }, getPixelRatio: () => 1, getContext: () => ({ getContextAttributes: () => ({ antialias: true }) }), info: { render: { frame: 0, calls: 1, triangles: 1, lines: 1, points: 0 } }, shadowMap: { enabled: false, type: 1 }, toneMapping: 1, toneMappingExposure: 1, outputColorSpace: 'srgb' });
 const first = [{ property: 'camera' }], second = [{ property: clip.name }];
 const viewer = { gui: { __listening: first, __folders: { animation: { __listening: second, __folders: {} } } }, clips: [clip], mixer: noMixer ? null : { time: 0, timeScale: 1, existingAction: () => action }, renderer: renderer(), axesRenderer: renderer(), controls: { enabled: true, autoRotate: false },
  state: { grid: true, environment: 'Neutral', background: false, playbackSpeed: 1, wireframe: false, skeleton: false, autoRotate: false, camera: 'default', actionStates: playback === 'walking' ? { [clip.name]: true } : { [clip.name]: false } } };
 let now = 0;
 const context = vm.createContext({ performance: { now: () => ++now }, crossOriginIsolated: true, devicePixelRatio: 1, THREE: { REVISION: '186' }, getComputedStyle: () => ({ display: 'block', visibility: 'visible' }), addEventListener: (name, callback) => { events[name] = callback; }, document: { visibilityState: 'visible', hasFocus: () => true, addEventListener: (name, callback) => { events[name] = callback; } } });
 vm.runInContext(`(${installViewerTimingCollector.toString()})()`, context);
 const collector = context.__rthreeViewerTiming, scenario = { id: 'fixture', playback, grid: true, pixelRatio: 1 };
 collector.attach(viewer, scenario);
 const row = (kind, raf, { start = raf + kind * 2, end = start + 1 } = {}) => kind === 0 ? collector.recordViewer(viewer, raf, start, end) : collector.recordGUI(kind === 1 ? first : second, raf, start, end);
 const group = (raf, order = [0, 1, 2]) => { if (viewer.mixer) viewer.mixer.time = raf / 1000; action.time = raf / 1000 % 1; viewer.renderer.info.render.frame++; viewer.axesRenderer.info.render.frame++; for (const kind of order) row(kind, raf); };
 return { viewer, action, collector, events, scenario, row, group, raw: () => JSON.parse(JSON.stringify(collector.export())), first, second };
}
test('Viewer and every native GUI loop form a disjoint complete callback group with partial arming retained', async () => {
 const f = fixture(), done = f.collector.run({ warmup: 1, samples: 2 });
 f.row(2, 10); f.group(20, [2, 0, 1]); f.group(30, [1, 2, 0]); f.group(40);
 assert.equal((await done).status, 'captured'); const raw = f.raw();
 assert.equal(raw.armingRows.length, 9); assert.equal(raw.rows.length, 81); assert.equal(raw.kinds.length, 3); assert.equal(raw.pairs, 3);
 assert.equal(raw.after.renderers.main.frame - raw.before.renderers.main.frame, 2);
 const analysis = analyzeViewerTiming(raw, f.scenario, { minPositiveDeltaMs: .005 }, { mode: 'smoke', blockSize: 1 });
 assert.equal(analysis.cpu.p50, 3); assert.equal(analysis.animateCpu.p50, 1); assert.equal(analysis.guiCpu.p50, 2); assert.equal(analysis.quantizationFloorMs, .03); assert.equal(analysis.rafIntervals.p50, 10);
});
test('static content without a mixer retains all rendering and GUI work without fabricated phase', async () => {
 const f = fixture({ playback: 'static', noMixer: true }), done = f.collector.run({ warmup: 1, samples: 2 });
 f.group(10); f.group(20); f.group(30); f.group(40); assert.equal((await done).status, 'captured');
 const raw = f.raw(); assert.equal(raw.rows[4], null); assert.equal(raw.rows[5], null);
 assert.equal(analyzeViewerTiming(raw, f.scenario, { minPositiveDeltaMs: .01 }, { mode: 'smoke', blockSize: 1 }).samples, 2);
});
test('duplicate, missing, overlapping and unknown GUI callback rows fail with offending rows preserved', async () => {
 for (const reason of ['duplicate', 'missing', 'overlap', 'unknown']) {
  const f = fixture(), done = f.collector.run({ warmup: 1, samples: 2 }); f.group(10); f.row(0, 20);
  if (reason === 'duplicate') f.row(0, 20);
  if (reason === 'missing') f.row(0, 30);
  if (reason === 'overlap') f.row(1, 20, { start: 20.5, end: 22 });
  if (reason === 'unknown') f.collector.recordGUI([], 20, 22, 23);
  assert.equal((await done).status, 'failed'); assert.equal(f.raw().rows.length, 18);
 }
});
test('synchronous/nonfinite GUI work is retained and rejects; initial synchronous setup outside capture is harmless', async () => {
 const f = fixture(); f.collector.recordGUI(f.first, undefined, 1, 2);
 const done = f.collector.run({ warmup: 1, samples: 2 }); f.collector.recordGUI(f.first, undefined, 3, 4);
 assert.equal((await done).status, 'failed'); const raw = f.raw(); assert.equal(raw.armingRows.length, 9); assert.equal(raw.armingRows[1], null);
});
test('watchdog abort, GUI-loop changes and snapshot errors preserve partial capture', async () => {
 for (const reason of ['abort', 'loops', 'snapshot']) {
  const f = fixture(), done = f.collector.run({ warmup: 1, samples: 2 }); f.group(10); f.group(20); f.row(0, 30);
  if (reason === 'loops') f.first.push({ property: 'unexpected' });
  if (reason === 'snapshot') f.viewer.renderer.getPixelRatio = () => { throw Error('snapshot failure'); };
  f.collector.abort(reason); assert.equal((await done).status, 'failed'); assert.equal(f.raw().rows.length, 36); assert(f.raw().before);
 }
});
test('phase and main/axes pass regressions are rejected by raw analysis', async () => {
 const f = fixture(), done = f.collector.run({ warmup: 1, samples: 2 }); for (const raf of [10, 20, 30, 40]) f.group(raf); await done;
 for (const [offset, value] of [[27 + 4, .02], [27 + 5, .8], [27 + 6, 2], [27 + 7, 1], [27 + 8, 1]]) {
  const raw = f.raw(); raw.rows[offset] = value;
  assert.throws(() => analyzeViewerTiming(raw, f.scenario, { minPositiveDeltaMs: .01 }, { mode: 'smoke', blockSize: 1 }));
 }
});
test('source mismatch cannot create a speculative timing overlay', () => {
 assert.throws(() => instrumentViewerSource('src/viewer.js', Buffer.from('changed')), /hash mismatch/);
 assert.throws(() => instrumentViewerSource('node_modules/dat.gui/build/dat.gui.module.js', Buffer.from('changed')), /hash mismatch/);
});
function completeManifest() {
 const guiLoops = [{ kind: 1, name: 'dat.gui.updateDisplays', folder: 'root', controllers: ['camera'] }, { kind: 2, name: 'dat.gui.updateDisplays', folder: 'root/animation', controllers: ['2. Walking'] }];
 const result = { samples: 1200, callbackCount: 3, guiLoops, cpu: { p50: 1, p95: 2, p99: 3 }, animateCpu: { p50: .6, p95: 1, p99: 2 }, guiCpu: { p50: .4, p95: 1, p99: 1 }, rafIntervals: { p50: 8, p95: 9, p99: 10 }, callbackStartIntervals: { p50: 8, p95: 9, p99: 10 }, observedClockIncrement: .005, quantizationFloorMs: .03, blocks: [{ p50: 1 }], blockStable: true };
 const routes = [['pure-r186-A', 'pure-r186'], ['prepared-JS', 'prepared-js-r186'], ['prepared-Wasm', 'prepared-wasm-r186'], ['pure-r186-B', 'pure-r186']], runs = [];
 for (let round = 0; round < 4; round++) for (const [label, engine] of routes) runs.push({ scenario: 'fixture', engine, label, round, purpose: 'balanced', directory: `${round}-${label}`, status: 'captured', result: structuredClone(result) });
 for (const purpose of ['bookend-before', 'bookend-after']) runs.push({ scenario: 'fixture', engine: 'pure-r186', purpose, directory: purpose, status: 'captured', result: structuredClone(result) });
 return { group: 'engine', cases: [{ id: 'fixture', guiLoops: guiLoops.map(loop => ({ path: loop.folder, controllers: loop.controllers })) }], configuration: { mode: 'full', rounds: 4, warmup: 600, samples: 1200, blockSize: 300 }, runs };
}
test('baseline A/A includes bookends and callback-scaled quantization without mixing migration into engine effects', () => {
 const manifest = completeManifest(); assert.equal(summarizeViewerTiming(manifest).scenarios[0].aa.passes, true);
 manifest.runs.at(-1).result.cpu.p50 = 2;
 const summary = summarizeViewerTiming(manifest);
 assert.equal(summary.scenarios[0].aa.passes, false); assert.equal(summary.scenarios[0].aa.checks.length, 10); assert.equal(summary.scenarios[0].aa.quantizationFloorMs, .03); assert(summary.scenarios[0].wasmVersusMatchedJS);
});
test('missing, duplicate or failed runs cannot become a full A/A pass', () => {
 for (const change of [m => m.runs.pop(), m => { m.runs[0].label = m.runs[1].label; }, m => { m.runs[0].round = 1; }, m => { m.runs[0].status = 'failed'; }, m => { m.runs.at(-1).purpose = 'bookend-before'; }, m => { m.runs[0].result.callbackCount++; }]) {
  const manifest = completeManifest(); change(manifest); assert.throws(() => summarizeViewerTiming(manifest));
 }
});
test('collector failure in a native finally cannot replace the original exception', async () => {
 const f = fixture(), done = f.collector.run({ warmup: 1, samples: 2 });
 f.action.getClip = () => { throw Error('collector phase fault'); };
 assert.throws(() => { try { throw Error('native failure'); } finally { f.row(0, 10); } }, /native failure/);
 assert.equal((await done).status, 'failed'); assert.equal(f.raw().armingRows.length, 9); assert.equal(f.raw().armingRows[6], null);
});
