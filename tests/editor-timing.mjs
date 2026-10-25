import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const moduleURL = process.env.RTHREE_TIMING_OVERLAY_MODULE ?? new URL('../scripts/apps/timing-overlay.mjs', import.meta.url).href;
const { installTimingCollector, timingOverlays, TIMING_SOURCE_HASHES } = await import(moduleURL);

function fixture({ idle = false } = {}) {
 const events = {}, signals = {};
 for (const name of ['savingStarted', 'savingFinished', 'sceneRendered']) {
  const listeners = [];
  signals[name] = { add(callback) { listeners.push(callback); }, dispatch() { for (const callback of listeners) callback(); } };
 }
 const editor = { signals, config: { getKey: () => true }, mixer: { time: 0 }, selected: null };
 const renderer = {
  domElement: { width: 800, height: 400, clientWidth: 800, clientHeight: 400 },
  getPixelRatio: () => 1, getContext: () => ({ getContextAttributes: () => ({ antialias: true }) }),
  info: { render: { frame: 0, calls: 1, triangles: 12, lines: 0, points: 0 } },
  shadowMap: { enabled: true, type: 1 }, toneMapping: 1, toneMappingExposure: 1, outputColorSpace: 'srgb'
 };
 let now = 0;
 const context = vm.createContext({
  performance: { now: () => ++now }, crossOriginIsolated: true, devicePixelRatio: 1,
  addEventListener: (name, callback) => { events[name] = callback; },
  document: { visibilityState: 'visible', hasFocus: () => true, addEventListener: (name, callback) => { events[name] = callback; } }
 });
 vm.runInContext(`(${installTimingCollector.toString()})()`, context);
 const collector = context.__rthreeEditorTiming;
 collector.attach(editor, renderer, idle);
 const row = (kind, raf, overrides = {}) => collector.record(kind, raf, overrides.start ?? raf + kind * 2, overrides.end ?? raf + kind * 2 + 1,
  overrides.mixer ?? editor.mixer.time, overrides.action ?? (kind === 1 && !idle ? .25 : NaN), overrides.duration ?? (kind === 1 && !idle ? 1 : NaN));
 const pair = raf => { renderer.info.render.frame++; editor.mixer.time++; row(0, raf); row(1, raf); };
 const exported = () => JSON.parse(JSON.stringify(collector.export()));
 return { collector, row, pair, exported, editor, renderer, signals, events };
}

test('keeps partial arming rows, complete warmup/sample pairs, snapshots and explicit unavailable fields', async () => {
 const f = fixture(); const done = f.collector.run({ warmup: 1, samples: 2 });
 f.row(1, 10); // Capture starts after the viewport callback in this native frame.
 f.pair(20); f.pair(30); f.pair(40);
 assert.equal((await done).status, 'captured');
 const raw = f.exported();
 assert.equal(raw.armingRows.length, 7); assert.equal(raw.armingRows[0], 1);
 assert.match(raw.armingReason, /between/); assert.equal(raw.rows.length, 6 * 7); assert.equal(raw.pairs, 3);
 assert.equal(raw.before.renderInfo.frame, 1); assert.equal(raw.after.renderInfo.frame, 3);
 assert.equal(raw.rows[5], null); assert.equal(raw.rows[6], null);
 assert.equal(raw.rows[12], .25); assert.equal(raw.rows[13], 1);
 assert.match(raw.unavailableValues, /null/);
 assert.throws(() => f.collector.run({ warmup: 1, samples: 2 }), /one attached run/);
});

test('idle snapshots retain zero native rendering and null inactive timeline phase', async () => {
 const f = fixture({ idle: true }); const done = f.collector.run({ warmup: 1, samples: 2 });
 f.row(0, 10);
 for (const raf of [20, 30, 40]) { f.row(1, raf); f.row(0, raf); }
 assert.equal((await done).status, 'captured');
 const raw = f.exported();
 assert.equal(raw.after.renderInfo.frame - raw.before.renderInfo.frame, 0);
 assert.equal(raw.after.renderCount - raw.before.renderCount, 0);
 for (let i = 0; i < raw.rows.length; i += 7) { assert.equal(raw.rows[i + 5], null); assert.equal(raw.rows[i + 6], null); }
});

test('duplicate native callback kind fails and preserves the offending raw row', async () => {
 const f = fixture(); const done = f.collector.run({ warmup: 1, samples: 2 });
 f.pair(10); f.row(0, 20); f.row(0, 20);
 assert.match((await done).error, /Duplicate callback/);
 assert.equal(f.exported().rows.length, 14);
});

test('missing native callback pair fails on the next timestamp and preserves both partial rows', async () => {
 const f = fixture(); const done = f.collector.run({ warmup: 1, samples: 2 });
 f.row(1, 10); f.row(0, 20); f.row(0, 30);
 assert.match((await done).error, /Missing callback pair/);
 assert.equal(f.exported().rows.length, 14); assert.equal(f.exported().pairs, 0);
});

test('abort without another callback resolves capture and exports partial data', async () => {
 const f = fixture(); const done = f.collector.run({ warmup: 1, samples: 2 });
 f.row(0, 10); f.pair(20); f.row(1, 30); f.collector.abort('watchdog expired');
 assert.equal((await done).error, 'watchdog expired');
 const raw = f.exported(); assert.equal(raw.rows.length, 21); assert(raw.before); assert(raw.after);
 assert.equal(raw.failure, 'watchdog expired');
});

test('nonfinite rAF and invalid arming intervals are retained and fail instead of disappearing', async () => {
 for (const [raf, overrides] of [[NaN, {}], [10, { start: 12, end: 11 }], [10, { mixer: Infinity }]]) {
  const f = fixture(); const done = f.collector.run({ warmup: 1, samples: 2 });
  f.row(0, raf, overrides);
  assert.match((await done).error, /Invalid callback row/);
  assert.equal(f.exported().armingRows.length, 7);
  if (!Number.isFinite(raf)) assert.equal(f.exported().armingRows[1], null);
 }
});

test('arming duplicate and overlapping intervals are rejected without losing arming records', async () => {
 for (const duplicate of [true, false]) {
  const f = fixture(); const done = f.collector.run({ warmup: 1, samples: 2 });
  f.row(0, 10, { start: 10, end: 14 });
  f.row(duplicate ? 0 : 1, 10, { start: 12, end: 15 });
  assert.match((await done).error, duplicate ? /Duplicate.*arming/ : /Overlapping arming/);
  assert.equal(f.exported().armingRows.length, 14);
 }
});

test('active animation requires finite timeline phase while idle permits unavailable phase', async () => {
 const f = fixture(); const done = f.collector.run({ warmup: 1, samples: 2 });
 f.row(1, 10, { action: NaN, duration: 1 });
 assert.match((await done).error, /Active timeline phase/);
 assert.equal(f.exported().armingRows[5], null);
});

test('activity phase and saving signals are retained; snapshot faults become capture failure', async () => {
 const f = fixture(); f.signals.savingStarted.dispatch(); f.signals.savingFinished.dispatch();
 const done = f.collector.run({ warmup: 1, samples: 2 });
 f.pair(10); f.pair(20); f.events.blur(); f.pair(30);
 f.renderer.getPixelRatio = () => { throw Error('snapshot fault'); };
 f.pair(40);
 assert.match((await done).error, /Final snapshot failed: snapshot fault/);
 const raw = f.exported();
 assert.equal(raw.before.savingStarted, 1); assert.equal(raw.before.savingFinished, 1);
 assert(raw.activity.some(event => event.type === 'blur' && event.phase === 'sample'));
 assert.equal(raw.rows.length, 42);
});

test('unexpected collector bookkeeping faults are isolated from native callback exceptions', async () => {
 const f = fixture(); const done = f.collector.run({ warmup: 1, samples: 2 });
 assert.doesNotThrow(() => f.collector.record(0, 10, Symbol('fault'), 11, 0, NaN, NaN));
 assert.match((await done).error, /Collector failure/);
 assert.equal(f.exported().armingRows.length, 7);
});

test('source overlays preserve native body order, rAF scheduling and original exceptions through finally', () => {
 for (const overlay of timingOverlays()) {
  assert.match(overlay.sha256, /^[a-f0-9]{64}$/); assert.equal(overlay.sha256, TIMING_SOURCE_HASHES[overlay.file]);
  const viewport = overlay.file.endsWith('/Viewport.js');
  const original = overlay.edits[0].from + '\n\t\tnativeBody();\n' + overlay.edits[1].from + (viewport ? ' {}' : '() {}');
  let adapted = original;
  for (const edit of overlay.edits) { assert.equal(adapted.split(edit.from).length, 2); adapted = adapted.replace(edit.from, edit.to); }
  for (const throws of [false, true]) {
   const calls = [], nativeError = Error('native failure'); let clock = 0;
   const context = vm.createContext({
    performance: { now: () => ++clock }, editor: { mixer: { time: 7 } }, currentAction: { time: .25 }, currentClip: { duration: 1 },
    nativeBody: () => { calls.push('native'); if (throws) throw nativeError; },
    updatePT: () => calls.push('updatePT'), requestAnimationFrame: callback => calls.push(['schedule', callback.name]),
    __rthreeEditorTiming: { record: (...row) => calls.push(['record', ...row]) }
   });
   vm.runInContext(adapted, context);
   const invoke = () => context[viewport ? 'animate' : 'updateTime'](123);
   if (throws) assert.throws(invoke, error => error === nativeError); else invoke();
   assert.equal(calls[0], 'native'); const record = calls.at(-1);
   assert.equal(record[0], 'record'); assert.equal(record[1], viewport ? 0 : 1); assert.equal(record[2], 123);
   assert.equal(record[3], 1); assert.equal(record[4], 2); assert.equal(record[5], 7);
   if (throws) assert.equal(calls.length, 2);
   else if (viewport) assert.equal(calls[1], 'updatePT');
   else assert.deepEqual(calls[1], ['schedule', 'updateTime']);
  }
 }
});
