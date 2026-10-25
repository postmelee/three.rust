export const TIMING_SOURCE_HASHES = {
 'editor/editor/js/Viewport.js': '597f323c2b9c8c7e6f87bc92192baf5ecd940edb9533198b0c8dcbdcf706e196',
 'editor/editor/js/Animation.js': '1d47972dd3b92c1c28a44f0699b6b0e770a5cfcddc8959db87f2d9ef4d982983'
};

export function timingOverlays() {
 return [
  { file: 'editor/editor/js/Viewport.js', sha256: TIMING_SOURCE_HASHES['editor/editor/js/Viewport.js'], edits: [
   { from: '\tfunction animate() {', to: '\tfunction animate( __rthreeRafTime ) {\n\t\tconst __rthreeStart = performance.now();\n\t\ttry {' },
   { from: '\t\tupdatePT();\n\n\t}\n\n\tfunction initPT()', to: '\t\tupdatePT();\n\n\t\t} finally {\n\t\t\tconst __rthreeEnd = performance.now();\n\t\t\tglobalThis.__rthreeEditorTiming?.record( 0, __rthreeRafTime, __rthreeStart, __rthreeEnd, editor.mixer.time, NaN, NaN );\n\t\t}\n\t}\n\n\tfunction initPT()' }
  ] },
  { file: 'editor/editor/js/Animation.js', sha256: TIMING_SOURCE_HASHES['editor/editor/js/Animation.js'], edits: [
   { from: '\tfunction updateTime() {', to: '\tfunction updateTime( __rthreeRafTime ) {\n\t\tconst __rthreeStart = performance.now();\n\t\ttry {' },
   { from: '\t\trequestAnimationFrame( updateTime );\n\n\t}\n\n\tfunction onObjectSelected', to: '\t\trequestAnimationFrame( updateTime );\n\n\t\t} finally {\n\t\t\tconst __rthreeEnd = performance.now();\n\t\t\tglobalThis.__rthreeEditorTiming?.record( 1, __rthreeRafTime, __rthreeStart, __rthreeEnd, editor.mixer.time, currentAction?.time ?? NaN, currentClip?.duration ?? NaN );\n\t\t}\n\t}\n\n\tfunction onObjectSelected' }
  ] }
 ];
}

// Serialized by Playwright addInitScript. All allocation/export occurs outside
// the declared callback CPU intervals. No prototypes, native clocks or animation
// state are replaced. Raw buffers retain warmup as well as sampled callback rows.
export function installTimingCollector() {
 let editor, renderer, idle = false, active = false, pending, raw, rows = 0, armingRaw, armingRows = 0;
 let warmup = 0, samples = 0, pairs = 0, firstRaf, currentRaf, mask = 0, armingMask = 0, armingStart, armingEnd;
 let before, after, failure = null, renderCount = 0, savingStarted = 0, savingFinished = 0;
 const activity = [];
 const columns = ['kind', 'rafTimestampMs', 'startMs', 'endMs', 'mixerTimeSeconds', 'actionTimeSeconds', 'clipDurationSeconds'];
 const phase = () => active ? (pairs < warmup ? 'warmup' : 'sample') : 'outside';
 function event(type) { activity.push({ type, at: performance.now(), phase: phase() }); }
 for (const type of ['blur', 'focus', 'resize']) addEventListener(type, () => event(type));
 document.addEventListener('visibilitychange', () => event('visibility:' + document.visibilityState));
 function snapshot() {
  const model = globalThis.__timingRobot, clip = globalThis.__timingWalking;
  const action = model && clip ? editor.mixer.existingAction(clip, model) : null;
  return {
   at: performance.now(), visibility: document.visibilityState, focused: document.hasFocus(),
   crossOriginIsolated: globalThis.crossOriginIsolated === true, dpr: devicePixelRatio,
   width: renderer.domElement.width, height: renderer.domElement.height,
   cssWidth: renderer.domElement.clientWidth, cssHeight: renderer.domElement.clientHeight,
   rendererPixelRatio: renderer.getPixelRatio(), renderInfo: { ...renderer.info.render },
   quality: { antialias: renderer.getContext().getContextAttributes().antialias, toneMapping: renderer.toneMapping, exposure: renderer.toneMappingExposure, outputColorSpace: renderer.outputColorSpace, shadows: renderer.shadowMap.enabled, shadowType: renderer.shadowMap.type },
   autosave: editor.config.getKey('autosave'), savingStarted, savingFinished, renderCount,
   mixerTime: editor.mixer.time, selected: editor.selected?.name ?? null,
   action: action ? { name: clip.name, time: action.time, duration: clip.duration, paused: action.paused, enabled: action.enabled, running: action.isRunning(), mixerTimeScale: editor.mixer.timeScale } : null,
   diagnostics: globalThis.THREE?.diagnostics?.() ?? null
  };
 }
 function finish(error) {
  if (!active) return;
  failure = error || null;
  try { after = snapshot(); } catch (error) { failure = failure || 'Final snapshot failed: ' + error.message; }
  active = false;
  const resolve = pending; pending = null;
  // The returned promise resolves only after both native callback bodies finish.
  if (resolve) resolve({ status: failure ? 'failed' : 'captured', error: failure, warmup, samples, pairs, rows, before, after });
 }
 globalThis.__rthreeEditorTiming = {
  attach(app, webglRenderer, isIdle) {
   if (editor) throw Error('Timing collector attached twice');
   editor = app; renderer = webglRenderer; idle = isIdle;
   app.signals.savingStarted.add(() => { savingStarted++; event('savingStarted'); });
   app.signals.savingFinished.add(() => { savingFinished++; event('savingFinished'); });
   if (idle) app.signals.sceneRendered.add(() => { renderCount++; });
  },
  status() { return { active, pairs, rows, savingStarted, savingFinished, renderCount, failure }; },
  snapshot,
  abort(message = 'Capture aborted') { finish(message); },
  run(config) {
   if (!editor || active || raw) throw Error('Each collector permits one attached run');
   warmup = config.warmup; samples = config.samples;
   if (!Number.isSafeInteger(warmup) || warmup < 1 || !Number.isSafeInteger(samples) || samples < 2) throw Error('Invalid capture counts');
   raw = new Float64Array((warmup + samples + 8) * 2 * columns.length);
   armingRaw = new Float64Array(16 * columns.length);
   active = true;
   return new Promise(resolve => { pending = resolve; });
  },
  record(kind, raf, start, end, mixerTime, actionTime, duration) {
   if (!active) return;
   try {
   const isArming = firstRaf === undefined || raf === firstRaf;
   if (isArming) {
    if (firstRaf === undefined) firstRaf = raf;
    if (armingRows * columns.length >= armingRaw.length) { finish('Arming row capacity exceeded'); return; }
    const at = armingRows++ * columns.length;
    armingRaw[at] = kind; armingRaw[at + 1] = raf; armingRaw[at + 2] = start; armingRaw[at + 3] = end;
    armingRaw[at + 4] = mixerTime; armingRaw[at + 5] = actionTime; armingRaw[at + 6] = duration;
   } else {
   if (rows * columns.length >= raw.length) { finish('Raw row capacity exceeded'); return; }
   const at = rows++ * columns.length;
   raw[at] = kind; raw[at + 1] = raf; raw[at + 2] = start; raw[at + 3] = end;
   raw[at + 4] = mixerTime; raw[at + 5] = actionTime; raw[at + 6] = duration;
   }
   if (!Number.isFinite(raf) || !Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(mixerTime) || !(end >= start) || (kind !== 0 && kind !== 1)) { finish('Invalid callback row (retained including arming rows)'); return; }
   if (kind === 1 && !idle && (!Number.isFinite(actionTime) || !Number.isFinite(duration) || !(duration > 0))) { finish('Active timeline phase is unavailable'); return; }
   if (isArming) {
    if (armingMask & (1 << kind)) { finish('Duplicate callback kind in arming rows'); return; }
    if (armingMask && !(armingEnd <= start || end <= armingStart)) { finish('Overlapping arming callback intervals'); return; }
    armingMask |= 1 << kind; armingStart = start; armingEnd = end;
    return; // Validated and retained: arming may occur between callbacks.
   }
   if (raf <= firstRaf) { finish('Nonmonotonic rAF timestamp after arming'); return; }
   if (currentRaf !== raf) {
    if (currentRaf !== undefined && (mask !== 3 || raf <= currentRaf)) { finish('Missing callback pair or nonmonotonic rAF timestamp'); return; }
    currentRaf = raf; mask = 0;
   }
   if (mask & (1 << kind)) { finish('Duplicate callback kind in one rAF timestamp'); return; }
   mask |= 1 << kind;
   if (mask === 3) {
    pairs++;
    if (pairs === warmup) {
     try { before = snapshot(); } catch (error) { finish('Initial snapshot failed: ' + error.message); return; }
    }
    if (pairs === warmup + samples) finish();
   }
   } catch (error) {
    // Measurement failures are exported and must never replace a native error
    // propagating through the source overlay's finally block.
    finish('Collector failure: ' + String(error?.message ?? error));
   }
  },
  export() {
   if (active || !raw) throw Error('No completed capture to export');
   return { columns, kindNames: ['Viewport.animate', 'Animation.updateTime'], warmup, samples, pairs,
    rows: Array.from(raw.subarray(0, rows * columns.length), n => Number.isFinite(n) ? n : null),
    armingRows: Array.from(armingRaw.subarray(0, armingRows * columns.length), n => Number.isFinite(n) ? n : null),
    armingReason: 'First observed native rAF timestamp retained but excluded because arming may occur between its two callbacks.',
    unavailableValues: 'actionTimeSeconds and clipDurationSeconds are null for Viewport rows and for inactive idle timeline rows; required timing/mixer columns must be finite.',
    activity, before, after, failure,
    scope: 'Sum of disjoint native viewport-animation and timeline callback bodies; excludes other asynchronous/browser/GPU work and collection bookkeeping.' };
  }
 };
}
