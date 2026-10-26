// Serialized by Playwright. No imports, prototypes, native clocks or native
// scheduling are replaced. Collection and snapshots are outside timed bodies.
export function installViewerTimingCollector() {
 let viewer, scenario, loops, bindings, action, active = false, pending, raw, armingRaw;
 let rows = 0, armingRows = 0, pairs = 0, warmup, samples, firstRaf, currentRaf, seen, armingSeen, starts, ends, armingStarts, armingEnds, seenCount = 0;
 let before = null, after = null, failure = null;
 const activity = [], columns = ['kind', 'rafTimestampMs', 'startMs', 'endMs', 'mixerTimeSeconds', 'actionTimeSeconds', 'clipDurationSeconds', 'mainFrame', 'axesFrame'];
 const phase = () => active ? (pairs < warmup ? 'warmup' : 'sample') : 'outside';
 for (const name of ['blur', 'focus', 'resize', 'pointerdown', 'wheel', 'keydown', 'touchstart']) addEventListener(name, () => activity.push({ type: name, at: performance.now(), phase: phase() }), { passive: true });
 document.addEventListener('visibilitychange', () => activity.push({ type: 'visibility:' + document.visibilityState, at: performance.now(), phase: phase() }));
 function folders(gui, prefix = 'root', result = []) {
  if (gui.__listening.length) result.push({ path: prefix, array: gui.__listening, controllers: [...gui.__listening] });
  for (const [name, folder] of Object.entries(gui.__folders)) folders(folder, prefix + '/' + name, result);
  return result;
 }
 function checkLoops() {
  const actual = folders(viewer.gui);
  if (actual.length !== loops.length || actual.some((loop, i) => loop.array !== loops[i].array || loop.path !== loops[i].path || loop.controllers.length !== loops[i].controllers.length || loop.controllers.some((controller, j) => controller !== loops[i].controllers[j]))) throw Error('Native GUI listening loops changed');
 }
 function snapshot() {
  checkLoops();
  const renderers = Object.fromEntries([['main', viewer.renderer], ['axes', viewer.axesRenderer]].map(([name, renderer]) => {
   const canvas = renderer.domElement, style = getComputedStyle(canvas), parentStyle = getComputedStyle(canvas.parentElement);
   return [name, { width: canvas.width, height: canvas.height, cssWidth: canvas.clientWidth, cssHeight: canvas.clientHeight,
    layout: { display: style.display, visibility: style.visibility, parentDisplay: parentStyle.display, parentVisibility: parentStyle.visibility, inlineStyle: canvas.style?.cssText ?? '', parentInlineStyle: canvas.parentElement?.style?.cssText ?? '' },
    pixelRatio: renderer.getPixelRatio(), frame: renderer.info.render.frame, work: { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, lines: renderer.info.render.lines, points: renderer.info.render.points },
    quality: { antialias: renderer.getContext().getContextAttributes().antialias, toneMapping: renderer.toneMapping, exposure: renderer.toneMappingExposure, outputColorSpace: renderer.outputColorSpace, shadowEnabled: renderer.shadowMap.enabled, shadowType: renderer.shadowMap.type } }];
  }));
  return { at: performance.now(), visibility: document.visibilityState, focused: document.hasFocus(), crossOriginIsolated: globalThis.crossOriginIsolated === true, dpr: devicePixelRatio,
   revision: globalThis.THREE.REVISION, renderers, mixerTime: viewer.mixer?.time ?? null, mixerTimeScale: viewer.mixer?.timeScale ?? null,
   action: action ? { name: action.getClip().name, time: action.time, duration: action.getClip().duration, paused: action.paused, enabled: action.enabled, running: action.isRunning(), timeScale: action.getEffectiveTimeScale() } : null,
   guiLoops: loops.map(loop => ({ path: loop.path, controllers: loop.controllers.map(controller => String(controller.property)) })),
   state: { grid: viewer.state.grid, environment: viewer.state.environment, background: viewer.state.background, playbackSpeed: viewer.state.playbackSpeed, wireframe: viewer.state.wireframe, skeleton: viewer.state.skeleton, autoRotate: viewer.state.autoRotate, camera: viewer.state.camera, actionStates: { ...viewer.state.actionStates } },
   controls: { enabled: viewer.controls.enabled, autoRotate: viewer.controls.autoRotate }, diagnostics: globalThis.THREE.diagnostics?.() ?? null };
 }
 function finish(error) {
  if (!active) return;
  failure = error || null;
  try { after = snapshot(); } catch (error) { failure ||= 'Final snapshot failed: ' + error.message; }
  active = false;
  const resolve = pending; pending = null;
  resolve?.({ status: failure ? 'failed' : 'captured', error: failure, pairs, rows });
 }
 function record(kind, raf, start, end, sourceViewer) {
  if (!active) return;
  try {
   const isArming = firstRaf === undefined || raf === firstRaf;
   if (firstRaf === undefined) firstRaf = raf;
   const buffer = isArming ? armingRaw : raw, count = isArming ? armingRows++ : rows++, offset = count * columns.length;
   if (offset >= buffer.length) { if (isArming) armingRows--; else rows--; finish('Raw row capacity exceeded'); return; }
   buffer[offset] = kind; buffer[offset + 1] = raf; buffer[offset + 2] = start; buffer[offset + 3] = end;
   buffer[offset + 4] = kind === 0 ? viewer.mixer?.time ?? NaN : NaN;
   buffer[offset + 5] = kind === 0 && action ? action.time : NaN;
   buffer[offset + 6] = kind === 0 && action ? action.getClip().duration : NaN;
   buffer[offset + 7] = kind === 0 ? viewer.renderer.info.render.frame : NaN;
   buffer[offset + 8] = kind === 0 ? viewer.axesRenderer.info.render.frame : NaN;
   if (!Number.isFinite(kind) || !Number.isFinite(raf) || !Number.isFinite(start) || !Number.isFinite(end) || !Number.isInteger(kind) || kind < 0 || kind > loops.length || end < start) { finish('Invalid callback row retained'); return; }
   if (kind === 0 && (sourceViewer !== viewer || !Number.isFinite(buffer[offset + 7]) || !Number.isFinite(buffer[offset + 8]) || (viewer.mixer && !Number.isFinite(buffer[offset + 4])) || (action && (!Number.isFinite(buffer[offset + 5]) || !(buffer[offset + 6] > 0))))) { finish('Invalid native Viewer phase retained'); return; }
   const prior = isArming ? armingSeen : seen, priorStarts = isArming ? armingStarts : starts, priorEnds = isArming ? armingEnds : ends;
   if (!isArming && currentRaf !== raf) {
    if (!(raf > firstRaf) || (currentRaf !== undefined && (raf <= currentRaf || seenCount !== loops.length + 1))) { finish('Missing callback group or nonmonotonic rAF'); return; }
    currentRaf = raf; seen.fill(0); seenCount = 0;
   }
   if (prior[kind]) { finish('Duplicate callback kind retained'); return; }
   for (let i = 0; i < prior.length; i++) if (prior[i] && !(end <= priorStarts[i] || priorEnds[i] <= start)) { finish('Overlapping native callback intervals'); return; }
   prior[kind] = 1; priorStarts[kind] = start; priorEnds[kind] = end;
   if (isArming) return;
   if (++seenCount === loops.length + 1) {
    pairs++;
    if (pairs === warmup) { try { before = snapshot(); } catch (error) { finish('Initial snapshot failed: ' + error.message); return; } }
    if (pairs === warmup + samples) finish();
   }
  } catch (error) { finish('Collector failure: ' + String(error?.message ?? error)); }
 }
 globalThis.__rthreeViewerTiming = {
  attach(appViewer, caseConfig) {
   if (viewer) throw Error('Viewer collector attached twice');
   viewer = appViewer; scenario = caseConfig; loops = folders(viewer.gui); bindings = new WeakMap(loops.map((loop, i) => [loop.array, i + 1]));
   action = caseConfig.playback !== 'static' ? viewer.mixer?.existingAction(viewer.clips.find(clip => caseConfig.playback === 'walking' ? clip.name.endsWith('. Walking') : clip.name === caseConfig.clip)) : null;
   if (caseConfig.playback !== 'static' && !action) throw Error('Declared native clip action is missing');
   return { guiLoops: loops.map(loop => ({ path: loop.path, controllers: loop.controllers.map(controller => String(controller.property)) })), expectedCallbacks: loops.length + 1 };
  }, snapshot,
  status() { return { active, pairs, rows, armingRows, failure }; },
  abort(message = 'Capture aborted') { finish(message); },
  run(config) {
   if (!viewer || active || raw) throw Error('Each collector permits one attached capture');
   warmup = config.warmup; samples = config.samples;
   if (!Number.isSafeInteger(warmup) || warmup < 1 || !Number.isSafeInteger(samples) || samples < 2) throw Error('Invalid capture counts');
   raw = new Float64Array((warmup + samples + 2) * (loops.length + 1) * columns.length); armingRaw = new Float64Array((loops.length + 2) * columns.length);
   raw.fill(NaN); armingRaw.fill(NaN);
   seen = new Uint8Array(loops.length + 1); armingSeen = new Uint8Array(loops.length + 1);
   starts = new Float64Array(loops.length + 1); ends = new Float64Array(loops.length + 1); armingStarts = new Float64Array(loops.length + 1); armingEnds = new Float64Array(loops.length + 1); active = true;
   return new Promise(resolve => { pending = resolve; });
  },
  recordViewer(appViewer, raf, start, end) { record(0, raf, start, end, appViewer); },
  recordGUI(array, raf, start, end) {
   if (!active) return;
   // Initial synchronous .listen() setup is outside capture; any new synchronous
   // GUI work or changed listening array during a capture is an explicit failure.
   record(bindings.get(array) ?? -1, raf, start, end);
  },
  export() {
   if (active || !raw) throw Error('No completed capture to export');
   const clean = data => Array.from(data, value => Number.isFinite(value) ? value : null);
   return { columns, kinds: [{ kind: 0, name: 'Viewer.animate' }, ...loops.map((loop, i) => ({ kind: i + 1, name: 'dat.gui.updateDisplays', folder: loop.path, controllers: loop.controllers.map(controller => String(controller.property)) }))],
    scenario, warmup, samples, pairs, rows: clean(raw.subarray(0, rows * columns.length)), armingRows: clean(armingRaw.subarray(0, armingRows * columns.length)),
    armingReason: 'First observed rAF timestamp is retained and excluded because capture may arm between Viewer and GUI callbacks.',
    unavailableValues: 'GUI phase/frame fields are null; absent static-content mixer/action fields are null. Required timing/kind fields must be finite.',
    before, after, activity, failure, scope: 'Sum of disjoint native Viewer.animate and frozen dat.gui updateDisplays bodies. Excludes asynchronous/browser/GPU work and collector bookkeeping.' };
  }
 };
}
