import assert from 'node:assert/strict';
import { gpu } from './viewer-browser.mjs';
import { captureViewerContentReadiness, assertViewerContentReadiness } from './viewer-content.mjs';
import { VIEWER_ROUTES } from './viewer-adapter.mjs';
import { captureViewerSnapshot, compareViewerSnapshots as compareBaseViewerSnapshots } from './viewer-oracle.mjs';

// Setup uses the native App loader and dat.gui controller handlers. Fixed-pose
// oracle work is deliberately separate from natural wall-clock capture pages.
export async function importViewerCaptureContent(run, asset) {
 await run.page.evaluate(() => { const app = VIEWER.app; globalThis.__viewerPreviousContent = app.viewer?.content; globalThis.__viewerPreviousReport = app.validator.report; });
 if (asset.zipPreparation) await run.page.locator('#file-input').setInputFiles(asset.zipPreparation.zip);
 else await run.page.evaluate(url => VIEWER.app.view(url, '', new Map()), run.origin + '/__viewer_content__/' + asset.id + '/' + asset.entry);
}
export async function setupViewerCapture(run, scenario, asset) {
 await run.page.goto(run.url); await run.page.bringToFront();
 await run.page.waitForFunction(() => window.VIEWER?.app); await run.page.evaluate(() => document.fonts.ready);
 await importViewerCaptureContent(run, asset);
 await run.page.waitForFunction(() => VIEWER.app.viewer?.content && VIEWER.app.viewer.content !== globalThis.__viewerPreviousContent && VIEWER.app.validator.report !== null && VIEWER.app.validator.report !== globalThis.__viewerPreviousReport, null, asset.zipPreparation ? { timeout: 180000 } : undefined);
 await run.save('validator.json', await run.page.evaluate(() => VIEWER.app.validator.report));
 if (asset.zipPreparation) await run.save('native-initial-playback.json', await run.page.evaluate(() => { const v = VIEWER.app.viewer; return { mixerTime: v.mixer?.time ?? null, renderFrame: v.renderer.info.render.frame, state: { ...v.state.actionStates }, clips: v.clips.map(clip => { const action = v.mixer?.existingAction(clip); return { name: clip.name, duration: clip.duration, running: action?.isRunning() ?? false, time: action?.time ?? null, weight: action?.getEffectiveWeight() ?? null }; }), scope: 'Initial native App.load and first-clip autoplay state, before scenario GUI setup; no stop/replay was applied.' }; }));
 if (asset.expected) { const readiness = await run.page.evaluate(captureViewerContentReadiness); await run.save('content-readiness.json', readiness); assertViewerContentReadiness(asset.expected, readiness); }
 const prepared = await run.page.evaluate(config => {
  delete globalThis.__viewerPreviousContent; delete globalThis.__viewerPreviousReport;
  const viewer = VIEWER.app.viewer, controllers = [];
  const visit = gui => { controllers.push(...gui.__controllers); for (const folder of Object.values(gui.__folders)) visit(folder); }; visit(viewer.gui);
  const set = (property, value) => {
   const matches = controllers.filter(controller => controller.property === property);
   if (matches.length !== 1) throw Error('Expected one native GUI controller: ' + property);
   if (matches[0].getValue() !== value) matches[0].setValue(value);
  };
  if (config.nativeDefaultClip) {
   if (viewer.clips[0]?.name !== config.clip) throw Error('Native default clip differs from the declared authored clip');
   const running = viewer.clips.filter(clip => viewer.mixer?.existingAction(clip)?.isRunning());
   if (running.length !== 1 || running[0].name !== config.clip || !viewer.state.actionStates[config.clip]) throw Error('Native first-clip autoplay history is not active');
  } else {
   for (const clip of viewer.clips) set(clip.name, false);
   if (config.playback !== 'static') {
    const selected = viewer.clips.find(clip => config.playback === 'walking' ? clip.name.endsWith('. Walking') : clip.name === config.clip);
    if (!selected) throw Error('Content has no declared native clip'); set(selected.name, true);
   }
  }
  set('playbackSpeed', 1); set('grid', config.grid); set('autoRotate', false);
  viewer.controls.reset();
  for (const renderer of [viewer.renderer, viewer.axesRenderer]) if (renderer.getPixelRatio() !== config.pixelRatio) renderer.setPixelRatio(config.pixelRatio);
  const attachment = __rthreeViewerTiming.attach(viewer, config);
  const selectedClip = config.playback === 'static' ? null : viewer.clips.find(clip => config.playback === 'walking' ? clip.name.endsWith('. Walking') : clip.name === config.clip);
  const clipIndex = selectedClip ? viewer.clips.indexOf(selectedClip) : -1;
  const authored = clipIndex < 0 ? null : VIEWER.json.parser.json.animations?.[clipIndex];
  const clipEvidence = selectedClip ? { name: selectedClip.name, duration: selectedClip.duration, tracks: selectedClip.tracks.length, targetCount: authored ? new Set(authored.channels.map(channel => channel.target.node)).size : null } : null;
  let previous = performance.now(), minimum = Infinity, positive = 0;
  for (let i = 0; i < 50000 && positive < 40; i++) { const now = performance.now(), delta = now - previous; if (delta > 0) { minimum = Math.min(minimum, delta); positive++; } previous = now; }
  if (!Number.isFinite(minimum) || minimum <= 0) throw Error('Performance clock has no observed positive increment');
  return { ...attachment, clip: clipEvidence, clock: { minPositiveDeltaMs: minimum, positiveDeltas: positive }, revision: THREE.REVISION,
   clips: viewer.clips.map(clip => clip.name), nativeAnimation: 'Native dat.gui handlers; unchanged rAF timestamp / delta / mixer updates',
   graphics: 'Native Viewer quality; no new shadow mode. Declared grid and renderer pixel ratio only.' };
 }, scenario);
 if (scenario.guiLoops) assert.deepEqual(prepared.guiLoops, scenario.guiLoops, 'Native GUI callback set differs from the frozen case');
 if (scenario.playback === 'clip') { assert.equal(prepared.clip.name, scenario.clip); assert.equal(prepared.clip.duration, scenario.clipDuration); assert.equal(prepared.clip.targetCount, scenario.clipTargetCount); }
 await run.save('setup.json', prepared);
 await run.save('gpu-main.json', await gpu(run.page, '.viewer > canvas')); await run.save('gpu-axes.json', await gpu(run.page, '.axes canvas'));
 const snapshot = await run.page.evaluate(() => __rthreeViewerTiming.snapshot());
 assertViewerEnvironment(snapshot, scenario, run.route);
 await run.verifyContent?.();
 return prepared;
}
export async function fixedViewerOracle(run, scenario, pose) {
 await run.page.evaluate(time => {
  const viewer = VIEWER.app.viewer;
  if (viewer.mixer) { viewer.mixer.timeScale = 1; viewer.mixer.setTime(time); viewer.mixer.timeScale = 0; }
  viewer.state.playbackSpeed = 0; viewer.controls.reset(); viewer.controls.autoRotate = false;
 }, pose);
 // No replacement rAF or frame stepping. Native callbacks continue at zero mixer
 // speed; the oracle's explicit render/readback is never a timed/profiled run.
 await run.page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
 const result = await run.page.evaluate(captureViewerSnapshot);
 const environment = await run.page.evaluate(() => __rthreeViewerTiming.snapshot());
 result.captureLayout = Object.fromEntries(Object.entries(environment.renderers).map(([name, renderer]) => [name, Object.fromEntries(['width', 'height', 'cssWidth', 'cssHeight', 'pixelRatio', 'layout'].map(key => [key, renderer[key]]))]));
 await run.save(`oracle-${pose}-unchecked.json`, result);
 assert.deepEqual(result.identityFailures, []); assert(result.controlsCameraIdentity); assert(result.axesCameraUpIdentity);
 for (const name of ['main', 'axes']) {
  const renderer = result.renderers[name];
  if (name === 'main' || scenario.grid) assert(renderer.work.calls > 0 && renderer.colors > 1, 'Missing nonblank native renderer: ' + name);
  else { assert.equal(renderer.work.calls, 0, 'Grid-off axes renderer unexpectedly drew'); assert(renderer.colors <= 1, 'Grid-off axes canvas is unexpectedly nonblank'); }
  if (renderer.png.startsWith('data:image/png;base64,')) await run.save(`oracle-${pose}-${name}.png`, Buffer.from(renderer.png.split(',')[1], 'base64'));
  else { assert(name === 'axes' && !scenario.grid && renderer.width * renderer.height === 0, 'Unexpected missing canvas image'); renderer.imageUnavailable = 'Native grid-off zero-size backing canvas; no image or resize was fabricated.'; }
  delete renderer.png;
 }
 await run.save(`oracle-${pose}.json`, result);
 return result;
}
export function compareViewerSnapshots(reference, actual, options = {}) {
 const base = compareBaseViewerSnapshots(reference, actual, options), layoutEqual = JSON.stringify(reference.captureLayout) === JSON.stringify(actual.captureLayout);
 if (options.strict !== false) assert(layoutEqual, 'Viewer native/overlay CSS and intrinsic canvas layout differ');
 return { ...base, layoutEqual, equal: base.equal && layoutEqual, differences: [...base.differences, ...(layoutEqual ? [] : [{ field: 'captureLayout' }])] };
}
export function assertViewerEnvironment(snapshot, scenario, routeName) {
 const route = VIEWER_ROUTES[routeName]; assert(route);
 assert.equal(snapshot.visibility, 'visible'); assert.equal(snapshot.focused, true); assert.equal(snapshot.crossOriginIsolated, true); assert.equal(snapshot.dpr, 1);
 assert.equal(snapshot.revision, route.revision); assert.equal(snapshot.state.grid, scenario.grid); assert.equal(snapshot.state.autoRotate, false); assert.equal(snapshot.controls.autoRotate, false);
 assert.equal(snapshot.state.playbackSpeed, 1);
 for (const [name, renderer] of Object.entries(snapshot.renderers)) {
  assert.equal(renderer.pixelRatio, scenario.pixelRatio); assert(renderer.width >= 0 && renderer.height >= 0);
  if (name === 'main' || scenario.grid) {
   assert(renderer.cssWidth > 0 && renderer.cssHeight > 0); assert.notEqual(renderer.layout.display, 'none'); assert.notEqual(renderer.layout.visibility, 'hidden'); assert.notEqual(renderer.layout.parentDisplay, 'none'); assert.notEqual(renderer.layout.parentVisibility, 'hidden');
   assert.equal(renderer.width, Math.floor(renderer.cssWidth * scenario.pixelRatio)); assert.equal(renderer.height, Math.floor(renderer.cssHeight * scenario.pixelRatio));
  }
 }
 if (scenario.guiLoops) assert.deepEqual(snapshot.guiLoops, scenario.guiLoops);
 const active = Object.entries(snapshot.state.actionStates).filter(([, value]) => value).map(([name]) => name);
 if (scenario.playback !== 'static') {
  assert.equal(active.length, 1); if (scenario.playback === 'walking') assert(active[0].endsWith('. Walking')); else assert.equal(active[0], scenario.clip);
  assert.equal(snapshot.action?.name, active[0]);
  assert.equal(snapshot.action.running, true); assert.equal(snapshot.action.paused, false); assert.equal(snapshot.action.enabled, true); assert.equal(snapshot.action.timeScale, 1);
 } else { assert.equal(active.length, 0); assert.equal(snapshot.action, null); }
 if (snapshot.mixerTime !== null) { assert(Number.isFinite(snapshot.mixerTime)); assert.equal(snapshot.mixerTimeScale, 1); }
 if (route.candidate) { assert.equal(snapshot.diagnostics?.backend, route.engine); if (route.engine === 'prepared-wasm') assert.equal(snapshot.diagnostics.wasmActive, true); }
 else assert.equal(snapshot.diagnostics, null);
}
export function validateViewerWindow(before, after, scenario, routeName) {
 assertViewerEnvironment(before, scenario, routeName); assertViewerEnvironment(after, scenario, routeName);
 assert(after.at > before.at); assert.deepEqual(after.state, before.state); assert.deepEqual(after.guiLoops, before.guiLoops);
 for (const name of ['main', 'axes']) for (const field of ['width', 'height', 'cssWidth', 'cssHeight', 'pixelRatio', 'layout', 'quality']) assert.deepEqual(after.renderers[name][field], before.renderers[name][field], 'Renderer changed: ' + name + '.' + field);
 const mainFrames = after.renderers.main.frame - before.renderers.main.frame, axesFrames = after.renderers.axes.frame - before.renderers.axes.frame;
 assert(mainFrames > 0); assert.equal(axesFrames, scenario.grid ? mainFrames : 0, 'Native main/axes pass coverage changed');
 if (before.mixerTime !== null) assert(after.mixerTime > before.mixerTime, 'Native mixer clock froze'); else assert.equal(after.mixerTime, null);
 if (before.action) {
  assert.equal(before.action.duration, after.action.duration); const duration = before.action.duration;
  assert(duration > 0 && [before.action.time, after.action.time].every(value => Number.isFinite(value) && value >= 0 && value < duration));
  const expected = (before.action.time + after.mixerTime - before.mixerTime) % duration, distance = Math.abs(after.action.time - expected);
  assert(Math.min(distance, duration - distance) <= Math.max(1e-9, 128 * Number.EPSILON * Math.max(1, Math.abs(after.mixerTime))), 'Native action phase differs from mixer advancement');
 }
 const keys = ['wasmCalls', 'preparedPasses', 'preparedWasmCalls', 'preparedFallbacks', 'matrixReads', 'preparedMatrixReads', 'materializedBytes'];
 const counters = before.diagnostics ? Object.fromEntries(keys.map(key => [key, after.diagnostics[key] - before.diagnostics[key]])) : null;
 if (counters) assert(Object.values(counters).every(value => Number.isFinite(value) && value >= 0));
 if (routeName === 'prepared-wasm-r186') assert(counters.wasmCalls > 0 || counters.preparedWasmCalls > 0, 'No actual Wasm work in observed Viewer window');
 return { mainFrames, axesFrames, mixerAdvance: before.mixerTime === null ? null : after.mixerTime - before.mixerTime, counters };
}
export function viewerProfileSnapshot() { return { ...__rthreeViewerTiming.snapshot(), activity: [...(globalThis.__viewerProfileActivity ?? [])] }; }
export function installViewerProfileObserver() {
 const activity = globalThis.__viewerProfileActivity = [];
 for (const type of ['blur', 'focus', 'resize', 'pointerdown', 'wheel', 'keydown', 'touchstart']) addEventListener(type, () => activity.push({ type, at: performance.now() }), { passive: true });
 document.addEventListener('visibilitychange', () => activity.push({ type: 'visibility:' + document.visibilityState, at: performance.now() }));
}
export function warmViewerFrames(count) {
 const snapshot = () => ({ ...__rthreeViewerTiming.snapshot(), activity: [...(globalThis.__viewerProfileActivity ?? [])] });
 const before = snapshot(); let frames = 0;
 return new Promise(resolve => { const tick = () => { if (++frames === count) resolve({ frames, before, after: snapshot() }); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
}
