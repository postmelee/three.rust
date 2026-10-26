import assert from 'node:assert/strict';
import { E3_SHADOW, assertEnvironment, assertBackend } from './editor-scenario.mjs';

export function installProfileObserver() {
 const activity = [];
 for (const type of ['blur', 'focus', 'resize']) addEventListener(type, () => activity.push({ type, at: performance.now() }));
 document.addEventListener('visibilitychange', () => activity.push({ type: 'visibility:' + document.visibilityState, at: performance.now() }));
 globalThis.__profileActivity = activity;
}
export function profileSnapshot() {
 return { ...__rthreeEditorTiming.snapshot(), activity: [...(globalThis.__profileActivity ?? [])] };
}
export function warmNativeFrames(count) {
 const snapshot = () => ({ ...__rthreeEditorTiming.snapshot(), activity: [...(globalThis.__profileActivity ?? [])] });
 const before = snapshot(); let frames = 0;
 return new Promise(resolve => {
  function tick() { if (++frames === count) resolve({ frames, before, after: snapshot(), scope: 'Pre-profile native rAF warmup; no forced updates' }); else requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
 });
}
export async function preserveProfile(profile, persist, observe) {
 await persist(profile);
 return { profile, after: await observe() };
}
export async function preserveObservation(raw, persist, validate) {
 await persist(raw);
 let validation;
 try { validation = validate(raw); }
 catch (error) { await persist({ ...raw, validationError: String(error.message) }); throw error; }
 const result = { ...raw, validation }; await persist(result); return result;
}
export async function boundedOperation(operation, { timeoutMs = 10000, signal, label = 'Page operation' } = {}) {
 assert(Number.isFinite(timeoutMs) && timeoutMs > 0);
 let timer, abort;
 try {
  return await Promise.race([operation, new Promise((_, reject) => {
   timer = setTimeout(() => reject(Error(label + ': timeout')), timeoutMs);
   abort = () => reject(Error(label + ': interrupted'));
   signal?.addEventListener('abort', abort, { once: true });
   if (signal?.aborted) abort();
  })]);
 } finally { clearTimeout(timer); if (abort) signal?.removeEventListener('abort', abort); }
}
// Oracle page only, after fixed-pose comparisons. Never install on a sampled page.
export function capturePassShape() {
 const renderer = __timingRenderer, original = renderer.render, passes = [];
 renderer.render = function(scene, camera, ...rest) {
  const nodes = [], counts = {}, before = THREE.diagnostics?.() ?? null;
  scene.traverse(object => {
   counts[object.type] = (counts[object.type] ?? 0) + 1;
   const excludedKinds = ['isLOD', 'isSprite', 'isLine', 'isPoints', 'isLightProbeGrid', 'isSkinnedMesh', 'isInstancedMesh', 'isBatchedMesh', 'isCamera'].filter(key => object[key]);
   const morphAttributes = Object.keys(object.geometry?.morphAttributes ?? {});
   if (excludedKinds.length || morphAttributes.length || object.pivot !== null) nodes.push({ name: object.name, type: object.type, excludedKinds, morphAttributes, hasPivot: object.pivot !== null });
  });
  const result = original.call(this, scene, camera, ...rest), after = THREE.diagnostics?.() ?? null;
  passes.push({ scene: { name: scene.name, type: scene.type, overrideMaterial: Boolean(scene.overrideMaterial) }, camera: { type: camera.type, isArrayCamera: Boolean(camera.isArrayCamera), coordinateSystem: camera.coordinateSystem },
   counts, observedExclusions: nodes, draw: { ...renderer.info.render }, candidateCounters: before ? Object.fromEntries(['preparedPasses', 'preparedFallbacks', 'preparedWasmCalls', 'wasmCalls', 'matrixReads'].map(key => [key, after[key] - before[key]])) : null });
  return result;
 };
 try { editor.signals.sceneGraphChanged.dispatch(); }
 finally { renderer.render = original; }
 return { passes, restored: renderer.render === original,
  scope: 'Fixed-pose oracle-page native passes only. Observed kinds/morph attributes are sufficient eligibility exclusions in the pinned source, not an instrumented first fallback reason or profile-window counter.' };
}
export function validateProfileWindow(before, after, engine) {
 assertEnvironment(before, E3_SHADOW); assertEnvironment(after, E3_SHADOW);
 assertBackend(engine, before.diagnostics); assertBackend(engine, after.diagnostics);
 for (const field of ['width', 'height', 'cssWidth', 'cssHeight', 'rendererPixelRatio', 'dpr']) assert.equal(after[field], before[field], 'Window geometry changed: ' + field);
 assert.deepEqual(after.quality, before.quality); assert.equal(after.activity.length, before.activity.length, 'Focus/visibility/resize activity inside observed window');
 assert.equal(after.savingStarted, before.savingStarted, 'Autosave began inside observed window');
 assert.equal(after.savingFinished, before.savingFinished, 'Autosave finished inside observed window');
 assert(after.at > before.at); assert(after.mixerTime > before.mixerTime, 'Mixer did not advance');
 assert.equal(after.action.duration, before.action.duration);
 const duration = before.action.duration, delta = after.mixerTime - before.mixerTime;
 assert(Number.isFinite(duration) && duration > 0);
 assert([before.action.time, after.action.time].every(value => Number.isFinite(value) && value >= 0 && value < duration));
 const expected = ((before.action.time + delta) % duration + duration) % duration;
 const distance = Math.abs(after.action.time - expected), tolerance = Math.max(1e-9, 128 * Number.EPSILON * Math.max(1, Math.abs(after.mixerTime)));
 assert(Math.min(distance, duration - distance) <= tolerance, 'Native action phase disagrees with mixer progression');
 const renderPasses = after.renderInfo.frame - before.renderInfo.frame;
 assert(renderPasses > 0, 'Native render work absent');
 const keys = ['wasmCalls', 'preparedPasses', 'preparedWasmCalls', 'preparedFallbacks', 'matrixReads', 'preparedMatrixReads', 'materializedBytes'];
 const counters = before.diagnostics ? Object.fromEntries(keys.map(key => [key, after.diagnostics[key] - before.diagnostics[key]])) : null;
 if (counters) assert(Object.values(counters).every(value => Number.isFinite(value) && value >= 0));
 if (engine === 'prepared-wasm') assert(counters.wasmCalls > 0 || counters.preparedWasmCalls > 0, 'No actual Wasm work in observed window');
 return { elapsedMs: after.at - before.at, mixerAdvanceSeconds: delta, renderPasses, counters, phaseErrorSeconds: Math.min(distance, duration - distance),
  scope: 'Endpoint phase/counter validation only; does not establish per-frame pose parity, CPU duration or FPS.' };
}
