// Native Editor setup shared by timing and separate diagnostic profiling.
// Extracted from Task #46 without changing scene construction or native inputs.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { gpu, hash } from './candidate-browser.mjs';
import { observeClock, validateClock, timingPolicy } from '../../bench/timing.mjs';
export const EDITOR_LAYOUT = Object.freeze({ timelinePanelHeight: 307, timelineContentHeight: 306 });
export const E3_SHADOW = Object.freeze({ id: 'E3-root-selected-shadow', selected: true, shadow: true, pixelRatio: 1 });
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
export function assertBackend(engine, diag) {
 if (engine === 'original') return assert.equal(diag, null, 'Original must not resolve to a candidate');
 assert.equal(diag?.backend, engine, 'Wrong candidate backend');
 assert.equal(diag.wasmActive, engine === 'prepared-wasm', 'Wrong Wasm initialization state');
}
export function assertEnvironment(state, scenario) {
 assert.equal(state.crossOriginIsolated, true); assert.equal(state.visibility, 'visible'); assert.equal(state.focused, true);
 assert.equal(state.dpr, 1); assert.equal(state.rendererPixelRatio, scenario.pixelRatio);
 assert.equal(state.autosave, true, 'Native autosave must remain enabled');
 assert.equal(state.savingStarted, state.savingFinished, 'Autosave submission is pending');
 if (!scenario.idle) {
  assert(state.action?.running && !state.action.paused && state.action.enabled, 'Walking must run natively');
  assert.equal(state.action.name, 'Walking'); assert.equal(state.action.mixerTimeScale, 1);
  assert.equal(state.selected, scenario.selected ? 'RobotExpressive.glb' : null);
 }
}
function compareNumbers(actual, expected) {
 assert.equal(actual.length, expected.length); let maxAbsoluteError = 0;
 for (let i = 0; i < actual.length; i++) {
  const a = actual[i], b = expected[i]; assert(Number.isFinite(a) && Number.isFinite(b));
  const difference = Math.abs(a - b); maxAbsoluteError = Math.max(maxAbsoluteError, difference);
  assert(difference <= 1e-10 + 1e-12 * Math.abs(b), `Numerical oracle mismatch at ${i}`);
 }
 return maxAbsoluteError;
}
export async function setup(r, scenario, configuration = EDITOR_LAYOUT) {
 const p = r.page;
 await p.goto(r.origin + '/editor/editor/');
 await p.waitForFunction(() => globalThis.editor && document.querySelector('#viewport canvas'));
 await p.evaluate(idle => {
  editor.signals.rendererCreated.add(value => { globalThis.__timingRenderer = value; });
  const select = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === 'WebGLRenderer'));
  select.value = 'WebGLRenderer'; select.dispatchEvent(new Event('change'));
  __rthreeEditorTiming.attach(editor, __timingRenderer, idle);
 }, Boolean(scenario.idle));
 if (!scenario.idle) {
  await p.evaluate(async () => {
   const bytes = await (await fetch('../examples/models/gltf/RobotExpressive/RobotExpressive.glb')).arrayBuffer();
   editor.loader.loadFiles([new File([bytes], 'RobotExpressive.glb', { type: 'model/gltf-binary' })]);
  });
  await p.locator('.Dialog').getByRole('button', { name: 'OK', exact: true }).click();
  await p.waitForFunction(() => editor.scene.children.some(o => o.animations.length === 14));
 }
 const sceneSetup = await p.evaluate(async scenario => {
  const { AddObjectCommand } = await import('./js/commands/AddObjectCommand.js');
  let center = new THREE.Vector3(0, .4, 0), groundY = 0;
  if (scenario.idle) {
   for (const [name, x, color] of [['Left cube', -1, 0x55aaff], ['Right cube', 1, 0xffaa55]]) {
    const o = new THREE.Mesh(new THREE.BoxGeometry(.8, .8, .8), new THREE.MeshStandardMaterial({ color }));
    o.name = name; o.position.set(x, .4, 0); o.castShadow = true; editor.execute(new AddObjectCommand(editor, o));
   }
  } else {
   const model = editor.scene.children.find(o => o.animations.length === 14);
   model.name = 'RobotExpressive.glb'; model.traverse(o => { if (o.isMesh) o.castShadow = true; });
   const bounds = new THREE.Box3().setFromObject(model, true); center = bounds.getCenter(center); groundY = bounds.min.y;
   globalThis.__timingRobot = model; globalThis.__timingWalking = model.animations.find(clip => clip.name === 'Walking');
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(scenario.idle ? 10 : 20, scenario.idle ? 10 : 20), new THREE.MeshStandardMaterial({ color: scenario.idle ? 0x888888 : 0xaaaaaa }));
  ground.name = 'Ground'; ground.rotation.x = -Math.PI / 2; ground.position.y = groundY; ground.receiveShadow = true; editor.execute(new AddObjectCommand(editor, ground));
  const light = new THREE.DirectionalLight(0xffffff, 3); light.name = 'Key light'; light.position.set(...(scenario.idle ? [3, 5, 4] : [4, 8, 5])); light.castShadow = scenario.shadow;
  light.shadow.mapSize.set(1024, 1024);
  if (!scenario.idle) { light.shadow.camera.left = -5; light.shadow.camera.right = 5; light.shadow.camera.top = 5; light.shadow.camera.bottom = -5; light.shadow.camera.near = .1; light.shadow.camera.far = 30; }
  editor.execute(new AddObjectCommand(editor, light));
  const ambient = new THREE.AmbientLight(0xffffff, 1); ambient.name = 'Fill light'; editor.execute(new AddObjectCommand(editor, ambient));
  editor.camera.position.set(...(scenario.idle ? [6, 4, 8] : [5, 3.5, 7])); editor.camera.lookAt(center); editor.camera.updateMatrixWorld(true);
  editor.deselect(); editor.signals.cameraChanged.dispatch(); editor.signals.sceneGraphChanged.dispatch();
  __timingRenderer.setPixelRatio(scenario.pixelRatio);
  editor.signals.windowResize.dispatch();
  const shape = { skins: 0, morphMeshes: 0, clips: [], vertices: 0 };
  if (globalThis.__timingRobot) { shape.clips = __timingRobot.animations.map(c => c.name); __timingRobot.traverse(o => { if (o.isSkinnedMesh) shape.skins++; if (o.morphTargetInfluences) shape.morphMeshes++; if (o.geometry?.attributes.position) shape.vertices += o.geometry.attributes.position.count; }); }
  return { shape, camera: editor.camera.position.toArray(), target: center.toArray(), shadow: light.castShadow, shadowMapSize: light.shadow.mapSize.toArray() };
 }, scenario);
 if (!scenario.idle) {
  assert.equal(sceneSetup.shape.clips.length, 14); assert.equal(sceneSetup.shape.morphMeshes, 3); assert(sceneSetup.shape.skins >= 2);
  assert.equal(scenario.selected, true, 'Native timeline playback requires the animated root to remain selected');
  await p.locator('#outliner .option').filter({ hasText: 'RobotExpressive.glb' }).first().click();
  const bar = await p.locator('#animation-resizer').boundingBox(); assert(bar, 'Missing timeline resizer');
  await p.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2); await p.mouse.down();
  await p.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2 - 270, { steps: 12 }); await p.mouse.up();
  await p.locator('#animation').getByText('Walking', { exact: true }).click();
  await p.locator('#animation button').nth(0).click();
  await p.waitForFunction(() => editor.mixer.existingAction(__timingWalking, __timingRobot)?.time > .05);
 }
 await p.bringToFront(); await settle(p);
 // Preserve native autosave and delayed resource refresh; setup must finish.
 await p.waitForTimeout(1600);
 await p.waitForFunction(() => { const s = __rthreeEditorTiming.status(); return s.savingStarted === s.savingFinished; });
 const env = await p.evaluate(() => __rthreeEditorTiming.snapshot());
 assertEnvironment(env, scenario); assertBackend(r.engine, env.diagnostics);
 assert.equal(r.context.pages().length, 1, 'Unexpected export/popup page');
 const clock = await p.evaluate(observeClock); validateClock(clock, timingPolicy('isolated'));
 const hardware = await gpu(p, '#viewport canvas');
 const layout = await p.evaluate(() => ({ timelineHeight: document.querySelector('#animation').getBoundingClientRect().height, timelineContentHeight: parseFloat(getComputedStyle(document.querySelector('#animation')).height), viewportWidth: document.querySelector('#viewport canvas').clientWidth, viewportHeight: document.querySelector('#viewport canvas').clientHeight, shading: editor.viewportShading, xr: __timingRenderer.xr.isPresenting }));
 await r.save('setup.json', { scenario, sceneSetup, environment: env, clock, hardware, layout });
 assert.equal(layout.xr, false); assert.notEqual(layout.shading, 'realistic');
 if (!scenario.idle) { assert.equal(layout.timelineHeight, configuration.timelinePanelHeight, 'Timeline border-box layout changed'); assert.equal(layout.timelineContentHeight, configuration.timelineContentHeight, 'Timeline content-box layout changed'); }
 return { env, clock, hardware, layout };
}
export async function oracleCapture(r, scenario, time) {
 const p = r.page;
 if (!scenario.idle) {
  await p.evaluate(time => { editor.mixer.timeScale = 1; editor.mixer.setTime(time); editor.mixer.timeScale = 0; editor.signals.objectChanged.dispatch(__timingRobot); }, time);
  await settle(p);
 }
 const result = await p.evaluate(() => {
  const renderer = __timingRenderer, render = renderer.render, passes = [];
  renderer.render = function(...args) { const value = render.apply(this, args); passes.push({ calls: this.info.render.calls, triangles: this.info.render.triangles, lines: this.info.render.lines, points: this.info.render.points }); return value; };
  try { editor.signals.sceneGraphChanged.dispatch(); } finally { renderer.render = render; }
  const numeric = [], objects = [];
  editor.scene.traverse(o => { objects.push({ name: o.name, type: o.type, visible: o.visible, castShadow: o.castShadow, receiveShadow: o.receiveShadow }); numeric.push(...o.position.toArray(), ...o.quaternion.toArray(), ...o.scale.toArray(), ...o.matrix.elements, ...o.matrixWorld.elements); if (o.skeleton) numeric.push(...o.skeleton.boneMatrices); if (o.morphTargetInfluences) numeric.push(...o.morphTargetInfluences); });
  numeric.push(...editor.camera.matrixWorld.elements, ...editor.camera.projectionMatrix.elements);
  const c = renderer.domElement, gl = renderer.getContext(), pixels = new Uint8Array(c.width * c.height * 4);
  gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  let nonzero = 0; for (let i = 0; i < pixels.length; i += 4) if (pixels[i] || pixels[i + 1] || pixels[i + 2]) nonzero++;
  return { numeric, objects, passes, pixels: Array.from(pixels), png: c.toDataURL('image/png'), width: c.width, height: c.height, nonzero,
   selected: editor.selected?.name ?? null, history: editor.history.undos.map(x => x.type), quality: __rthreeEditorTiming.snapshot().quality,
   timeline: document.querySelector('#animation').innerText, diagnostics: THREE.diagnostics?.() ?? null };
 });
 assert(result.nonzero > 0); assert(result.numeric.every(Number.isFinite)); assertBackend(r.engine, result.diagnostics);
 result.pixelSha256 = hash(Buffer.from(result.pixels)); delete result.pixels;
 await fs.writeFile(path.join(r.out, `pose-${time}.png`), Buffer.from(result.png.split(',')[1], 'base64')); delete result.png;
 await r.save(`pose-${time}.json`, result);
 return result;
}
export function compareOracle(actual, expected) {
 for (const key of ['pixelSha256', 'width', 'height', 'selected']) assert.equal(actual[key], expected[key], `Oracle mismatch: ${key}`);
 for (const key of ['objects', 'passes', 'history', 'quality', 'timeline']) assert.deepEqual(actual[key], expected[key], `Oracle mismatch: ${key}`);
 return { maxAbsoluteError: compareNumbers(actual.numeric, expected.numeric), pixelSha256: actual.pixelSha256, numericValues: actual.numeric.length };
}
