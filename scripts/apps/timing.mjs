// Engineering screen: native wall-clock playback, not product qualification.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { openRun, gpu, hash } from './candidate-browser.mjs';
import { timingOverlays, installTimingCollector, TIMING_SOURCE_HASHES } from './timing-overlay.mjs';
import { observeClock, validateClock, timingPolicy } from '../../bench/timing.mjs';

const args = {};
for (const item of process.argv.slice(4)) {
 const at = item.indexOf('='), key = item.slice(0, at), value = item.slice(at + 1);
 assert(at > 0 && value && ['mode', 'candidateRoot', 'candidateSha'].includes(key) && !Object.hasOwn(args, key), 'Unknown, duplicate or empty key=value argument');
 args[key] = value;
}
assert(process.argv[2] && process.argv[3] && args.candidateRoot, 'Usage: node scripts/apps/timing.mjs APP_ROOT OUT mode=smoke|full candidateRoot=CHECKOUT [candidateSha=FULL_SHA]');
const mode = args.mode ?? 'smoke';
assert(['smoke', 'full'].includes(mode), 'mode must be smoke or full');
const candidateSha = args.candidateSha ?? '6990fd92f61a031c8c2ba7a8282cfb63684e6dfb';
assert.equal(candidateSha, '6990fd92f61a031c8c2ba7a8282cfb63684e6dfb', 'A new candidate requires a separately frozen protocol');
const appRoot = await fs.realpath(path.resolve(process.argv[2]));
const candidateRoot = await fs.realpath(path.resolve(args.candidateRoot));
const out = path.resolve(process.argv[3]);
const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const executablePath = process.env.RTHREE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const APP_PINS = { editor: '9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8', viewer: 'b5ee5dafe27f953ae1b55f42b5fa3697fef08683' };
const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const redact = value => [[appRoot, '<apps>'], [candidateRoot, '<candidate>'], [toolRoot, '<tooling>'], [out, '<output>'], [os.homedir(), '<home>']].reduce((s, [a, b]) => s.split(a).join(b), String(value));
await fs.mkdir(out, { recursive: false });
const save = async (name, value) => {
 const file = path.join(out, name); await fs.mkdir(path.dirname(file), { recursive: true });
 await fs.writeFile(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
};
const configuration = {
 mode, qualification: false, rounds: mode === 'full' ? 4 : 1,
 warmup: mode === 'full' ? 600 : 10, samples: mode === 'full' ? 1200 : 30,
 idleWarmup: mode === 'full' ? 120 : 10, idleSamples: mode === 'full' ? 240 : 30,
 cssViewport: { width: 1280, height: 720 }, pageDpr: 1, isolated: true,
 timelinePanelHeight: 307, timelineContentHeight: 306, profiling: false, gpuQueries: false, stageTimers: false,
 poseClock: 'Unchanged native wall-clock Timer/mixer; poses are not frame-matched across routes',
 scope: 'Sum of disjoint Viewport.animate and Animation.updateTime synchronous callback bodies; not entire browser CPU, display latency or FPS'
};
const routes = [
 { label: 'original-A', engine: 'original' }, { label: 'prepared-JS', engine: 'prepared-js' },
 { label: 'prepared-Wasm', engine: 'prepared-wasm' }, { label: 'original-B', engine: 'original' }
];
const cases = [
 { id: 'E3-root-selected-shadow', selected: true, shadow: true, pixelRatio: 1 },
 { id: 'E3-unselected-shadow', selected: false, shadow: true, pixelRatio: 1 },
 { id: 'E3-root-selected-no-shadow', selected: true, shadow: false, pixelRatio: 1 },
 { id: 'E3-root-selected-high-resolution', selected: true, shadow: true, pixelRatio: 2 }
];
const idleCase = { id: 'E1-idle', idle: true, selected: false, shadow: true, pixelRatio: 1 };
const orders = Array.from({ length: configuration.rounds }, (_, round) => [0, 1, 3, 2].map(i => (i + round) % 4));
const manifest = {
 status: 'preparing', kind: mode === 'full' ? 'unqualified-editor-cost-screen' : 'tooling-smoke-only', startedAt: new Date().toISOString(),
 configuration, candidateSha, routes, cases, idleCase, orders: orders.map(order => order.map(i => routes[i].label)),
 plannedContinuousRuns: cases.length * (2 + routes.length * configuration.rounds), plannedIdleRuns: routes.length * configuration.rounds,
 nativeInteractionsAlreadyCovered: ['picking and camera/focus', 'gizmo transforms and undo/redo', 'timeline play/pause/scrub/clip controls'],
 deferred: ['E1 gizmo handler timing', 'new optimization implementation', 'GPU-time attribution', 'other-date repeats'],
 timingSources: TIMING_SOURCE_HASHES, oracles: [], runs: [], errors: [],
 coverageExclusions: ['asynchronous IndexedDB completion', 'deferred resources UI outside the callback pair', 'vendor/browser tasks', 'paint/compositor/GPU', 'row bookkeeping'],
 higherRasterControl: 'Only renderer.setPixelRatio(2) changes; page DPR and CSS layout remain 1 and unchanged. GPU-bound status is not assumed.'
};
const persist = () => save('manifest.json', manifest);
await persist();
let browser, currentRun, tooling, interrupted = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
 interrupted = true;
 currentRun?.page.evaluate(message => globalThis.__rthreeEditorTiming?.abort(message), signal).catch(() => {});
});
const stopCheck = () => assert(!interrupted, 'Interrupted; retained completed and partial runs');
function sourcePins() {
 const state = (root, untracked = true) => ({ sha: git(root, 'rev-parse', 'HEAD'), dirty: Boolean(git(root, 'status', '--porcelain', untracked ? '--untracked-files=normal' : '--untracked-files=no')) });
 return { tooling: state(toolRoot), candidate: state(candidateRoot), apps: Object.fromEntries(Object.keys(APP_PINS).map(app => [app, state(path.join(appRoot, app), false)])) };
}
function validatePins(pins) {
 if (mode === 'full') assert.equal(pins.tooling.dirty, false, 'Commit full-mode tooling before capture');
 assert.equal(pins.candidate.sha, candidateSha); assert.equal(pins.candidate.dirty, false);
 for (const [app, sha] of Object.entries(APP_PINS)) { assert.equal(pins.apps[app].sha, sha); assert.equal(pins.apps[app].dirty, false); }
}
async function environment(stage) {
 const directory = path.join(out, `environment-${stage}`);
 try {
  execFileSync(process.execPath, [path.join(toolRoot, 'scripts/runner-environment.mjs'), directory], { cwd: toolRoot, encoding: 'utf8', stdio: 'pipe', timeout: 90000 });
  const file = path.join(directory, 'runner.json');
  const observed = JSON.parse(redact(await fs.readFile(file, 'utf8')));
  await fs.writeFile(file, JSON.stringify(observed, null, 2) + '\n');
  return { available: true, file: `environment-${stage}/runner.json`, power: { available: observed.power?.available === true,
   verifiedAC: observed.power?.available === true && observed.power.output.includes('AC Power'),
   observed: observed.power ?? { available: false, reason: 'Power query unavailable on this host' } } };
 } catch (error) { return { available: false, error: redact(error.message), power: { available: false, verifiedAC: false } }; }
}
function validatePower(observed) {
 if (mode === 'full') assert.equal(observed.power.available, true, 'Full capture requires verified power observations');
 if (observed.power.available) assert.equal(observed.power.verifiedAC, true, 'AC power is required for this screen');
}
async function browserMetadata() {
 let cdp;
 const records = {}, methods = [['version', 'Browser.getVersion'], ['commandLine', 'Browser.getBrowserCommandLine'], ['systemInfo', 'SystemInfo.getInfo']];
 const sanitize = value => {
  if (typeof value === 'string') return redact(value).replace(/--(user-data-dir|crash-dumps-dir|disk-cache-dir)=("[^"]*"|\S+)/g, '--$1=<browser-private-directory>');
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item)]));
  return value;
 };
 try {
  cdp = await browser.newBrowserCDPSession();
  for (const [key, method] of methods) {
   try { records[key] = { available: true, value: sanitize(await cdp.send(method)) }; }
   catch (error) { records[key] = { available: false, error: redact(error.message) }; }
  }
 } catch (error) { for (const [key] of methods) records[key] = { available: false, error: redact(error.message) }; }
 finally { if (cdp) await cdp.detach().catch(error => { records.detachError = redact(error.message); }); }
 records.scope = 'One browser-level metadata capture before parity; no profiler. Private profile/cache directories are redacted.';
 return records;
}
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function boundedPageOperation(promise, label, timeoutMs = 5000) {
 let timeout;
 try { return await Promise.race([promise, new Promise((_, reject) => { timeout = setTimeout(() => reject(Error(label + ': page did not respond before cleanup timeout')), timeoutMs); })]); }
 finally { clearTimeout(timeout); }
}
function quantile(values, p) {
 assert(values.length && values.every(Number.isFinite), 'Nonfinite/empty statistical series');
 const a = [...values].sort((x, y) => x - y), q = (a.length - 1) * p, low = Math.floor(q);
 return a[low] + (a[Math.ceil(q)] - a[low]) * (q - low);
}
const stats = values => ({ p50: quantile(values, .5), p95: quantile(values, .95), p99: quantile(values, .99), mean: values.reduce((a, b) => a + b, 0) / values.length, min: Math.min(...values), max: Math.max(...values) });
function assertBackend(engine, diag) {
 if (engine === 'original') return assert.equal(diag, null, 'Original must not resolve to a candidate');
 assert.equal(diag?.backend, engine, 'Wrong candidate backend');
 assert.equal(diag.wasmActive, engine === 'prepared-wasm', 'Wrong Wasm initialization state');
}
function assertEnvironment(state, scenario) {
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
async function newSession(scenario, route, directory, instrumented) {
 stopCheck();
 const sessionOut = path.join(out, directory);
 await fs.mkdir(path.dirname(sessionOut), { recursive: true });
 const r = await openRun(appRoot, sessionOut, {
  app: 'editor', engine: route.engine, candidateRoot, candidateSha, browser,
  browserExecutablePath: executablePath, isolated: true, deviceScaleFactor: 1,
  sourceOverlays: instrumented ? timingOverlays() : [],
  mode: instrumented ? 'Native Editor callback cost instrumentation; no profiler or forced render loop' : 'Unmodified native Editor oracle for timing-overlay parity'
 });
 currentRun = r;
 await r.context.addInitScript(installTimingCollector);
 return r;
}
async function setup(r, scenario) {
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
  if (scenario.selected) await p.locator('#outliner .option').filter({ hasText: 'RobotExpressive.glb' }).first().click();
  // Deselect BEFORE choosing the clip: native deselection stops the prior action.
  else await p.evaluate(() => editor.deselect());
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
async function oracleCapture(r, scenario, time) {
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
function compareOracle(actual, expected) {
 for (const key of ['pixelSha256', 'width', 'height', 'selected']) assert.equal(actual[key], expected[key], `Oracle mismatch: ${key}`);
 for (const key of ['objects', 'passes', 'history', 'quality', 'timeline']) assert.deepEqual(actual[key], expected[key], `Oracle mismatch: ${key}`);
 return { maxAbsoluteError: compareNumbers(actual.numeric, expected.numeric), pixelSha256: actual.pixelSha256, numericValues: actual.numeric.length };
}
async function closeVerified(r) {
 await r.close();
 assert.deepEqual(r.errors, [], 'Browser or serving errors'); assert(!r.requests.some(x => x.blocked), 'Unexpected external resource');
 currentRun = null;
}
async function parity() {
 const references = new Map();
 for (const scenario of [...cases, idleCase]) for (const engine of ['original', 'prepared-js', 'prepared-wasm']) {
  let unmodified;
  for (const instrumented of [false, true]) {
   const label = engine + (instrumented ? '-overlay' : '-unmodified');
   const entry = { scenario: scenario.id, engine, instrumented, status: 'running', directory: `oracles/${scenario.id}/${label}` };
   manifest.oracles.push(entry); await persist();
   const r = await newSession(scenario, { engine }, entry.directory, instrumented).catch(async error => { entry.status = 'failed'; entry.error = redact(error.stack || error); await persist(); throw error; });
   try {
    await setup(r, scenario);
    const captures = [];
    for (const time of scenario.idle ? [0] : [.25, .75]) captures.push(await oracleCapture(r, scenario, time));
    if (engine === 'original' && !instrumented) references.set(scenario.id, captures);
    const reference = references.get(scenario.id);
    entry.originalComparisons = captures.map((value, i) => compareOracle(value, reference[i]));
    if (instrumented) entry.overlayComparisons = captures.map((value, i) => compareOracle(value, unmodified[i]));
    else unmodified = captures;
    await closeVerified(r); entry.status = 'passed'; await persist();
   } catch (error) {
    entry.status = 'failed'; entry.error = redact(error.stack || error); await r.save('oracle-failure.json', entry); throw error;
   } finally { await r.close(); currentRun = null; }
  }
 }
}
function analyze(raw, scenario, clock) {
 assert.equal(raw.failure, null, raw.failure ?? 'Capture failed');
 assert.equal(raw.rows.length % raw.columns.length, 0);
 const groups = new Map();
 for (let i = 0; i < raw.rows.length; i += 7) {
  const [kind, raf, start, end, mixerTime, actionTime, duration] = raw.rows.slice(i, i + 7);
  assert([kind, raf, start, end, mixerTime].every(Number.isFinite)); assert(end >= start);
  assert([0, 1].includes(kind));
  if (kind === 1 && !scenario.idle) assert(Number.isFinite(actionTime) && duration > 0);
  else assert(actionTime === null && duration === null, 'Unexpected unavailable-value encoding');
  if (!groups.has(raf)) groups.set(raf, []); groups.get(raf).push({ kind, raf, start, end, mixerTime, actionTime, duration });
 }
 const pairs = [...groups.values()].sort((a, b) => a[0].raf - b[0].raf).map(group => {
  assert.equal(group.length, 2, 'Incomplete callback pair'); group.sort((a, b) => a.kind - b.kind);
  const [viewport, timeline] = group; assert.equal(viewport.kind, 0); assert.equal(timeline.kind, 1);
  assert(viewport.end <= timeline.start || timeline.end <= viewport.start, 'Overlapping callback intervals');
  return { raf: viewport.raf, start: Math.min(viewport.start, timeline.start), cpu: viewport.end - viewport.start + timeline.end - timeline.start,
   viewportCpu: viewport.end - viewport.start, timelineCpu: timeline.end - timeline.start,
   mixerTime: viewport.mixerTime, actionTime: timeline.actionTime, clipDuration: timeline.duration };
 });
 assert.equal(pairs.length, raw.warmup + raw.samples);
 const measured = pairs.slice(raw.warmup); assert.equal(measured.length, raw.samples);
 const cpu = stats(measured.map(x => x.cpu)), floor = 4 * clock.minPositiveDeltaMs;
 const blockSize = scenario.idle ? Math.max(1, Math.floor(raw.samples / 4)) : (mode === 'full' ? 300 : Math.max(1, Math.floor(raw.samples / 4)));
 const blocks = [];
 for (let i = 0; i < measured.length; i += blockSize) { const block = stats(measured.slice(i, i + blockSize).map(x => x.cpu)); blocks.push({ start: i, samples: Math.min(blockSize, measured.length - i), ...block, stable: Math.abs(block.p50 - cpu.p50) <= Math.max(.05 * cpu.p50, floor) }); }
 const intervals = measured.slice(1).map((x, i) => x.raf - measured[i].raf);
 const callbacks = measured.slice(1).map((x, i) => x.start - measured[i].start);
 return { samples: measured.length, cpu, viewportCpu: stats(measured.map(x => x.viewportCpu)), timelineCpu: stats(measured.map(x => x.timelineCpu)),
  rafIntervals: stats(intervals), callbackStartIntervals: stats(callbacks), arrivalDelay: stats(measured.map(x => x.start - x.raf)),
  blocks, blockStable: blocks.every(x => x.stable), observedClockIncrement: clock.minPositiveDeltaMs,
  phaseCoverage: { nativeWallClock: true, frameMatchedAcrossRoutes: false, mixerTimeStart: measured[0].mixerTime, mixerTimeEnd: measured.at(-1).mixerTime,
   actionTimeStart: measured[0].actionTime, actionTimeEnd: measured.at(-1).actionTime, clipDuration: measured[0].clipDuration,
   elapsedClipCycles: scenario.idle ? null : (measured.at(-1).mixerTime - measured[0].mixerTime) / measured[0].clipDuration },
  measuredPairs: measured };
}
async function captureRun(scenario, route, round, purpose, number) {
 stopCheck();
 const directory = `runs/${String(number).padStart(3, '0')}-${scenario.id}-${purpose}-${route.label}`;
 const entry = { scenario: scenario.id, label: route.label, engine: route.engine, round, purpose, directory, status: 'running' };
 manifest.runs.push(entry); await persist();
 console.log(`Starting ${directory}`);
 const r = await newSession(scenario, route, directory, true).catch(async error => { entry.status = 'failed'; entry.error = redact(error.stack || error); await persist(); throw error; });
 let watchdog, capture;
 try {
  const prepared = await setup(r, scenario);
  const counts = { warmup: scenario.idle ? configuration.idleWarmup : configuration.warmup, samples: scenario.idle ? configuration.idleSamples : configuration.samples };
  const maxMs = 30000 + (counts.warmup + counts.samples) * 100; // 10fps lower-bound watchdog, not a timed delay.
  try {
   capture = await Promise.race([
    r.page.evaluate(counts => __rthreeEditorTiming.run(counts), counts),
    new Promise((_, reject) => { watchdog = setTimeout(() => reject(Error('Capture watchdog expired')), maxMs); })
   ]);
  } catch (error) {
   await boundedPageOperation(r.page.evaluate(message => __rthreeEditorTiming.abort(message), String(error)), 'Abort capture').catch(abortError => { entry.abortError = redact(abortError.message); });
   throw error;
  } finally {
   clearTimeout(watchdog);
   const raw = await boundedPageOperation(r.page.evaluate(() => __rthreeEditorTiming.export()), 'Export capture').catch(error => ({ exportError: String(error), reason: 'The page was closed or could not execute the bounded partial-export request; no raw rows are claimed preserved.' }));
   await r.save('raw-callbacks.json', raw); entry.rawPreserved = !raw.exportError;
  }
  assert.equal(capture.status, 'captured', capture.error ?? 'Capture did not complete');
  const raw = JSON.parse(await fs.readFile(path.join(r.out, 'raw-callbacks.json'), 'utf8'));
  const result = analyze(raw, scenario, prepared.clock);
  assertEnvironment(raw.before, scenario); assertEnvironment(raw.after, scenario);
  assertBackend(route.engine, raw.before.diagnostics); assertBackend(route.engine, raw.after.diagnostics);
  for (const field of ['width', 'height', 'cssWidth', 'cssHeight', 'rendererPixelRatio']) assert.equal(raw.before[field], raw.after[field], `Capture geometry changed: ${field}`);
  assert.deepEqual(raw.before.quality, raw.after.quality);
  const sampleActivity = raw.activity.filter(x => x.phase === 'sample');
  assert.equal(sampleActivity.length, 0, 'Unexpected focus/visibility/resize/autosave activity in sample window');
  result.renderFrameDelta = raw.after.renderInfo.frame - raw.before.renderInfo.frame;
  if (scenario.idle) { assert.equal(result.renderFrameDelta, 0); assert.equal(raw.after.renderCount - raw.before.renderCount, 0, 'Static idle unexpectedly rendered'); }
  else assert(result.renderFrameDelta >= counts.samples, 'Continuous native render work is missing');
  result.counterDeltas = raw.before.diagnostics ? Object.fromEntries(['wasmCalls', 'preparedPasses', 'preparedWasmCalls', 'preparedFallbacks', 'preparedMatrixReads', 'matrixReads'].map(key => [key, raw.after.diagnostics[key] - raw.before.diagnostics[key]])) : null;
  if (result.counterDeltas) assert(Object.values(result.counterDeltas).every(value => Number.isFinite(value) && value >= 0), 'Invalid candidate counter delta');
  result.nativeWorkInWindow = result.counterDeltas ? result.counterDeltas.wasmCalls > 0 || result.counterDeltas.preparedWasmCalls > 0 : false;
  result.fallbackIsExpected = !scenario.idle && route.engine !== 'original';
  await r.save('measured-pairs.json', result.measuredPairs); delete result.measuredPairs;
  await r.save('summary.json', result);
  entry.result = result;
  if (!scenario.idle && route.engine === 'prepared-wasm') assert.equal(result.nativeWorkInWindow, true, 'Continuous Wasm route performed no actual Wasm calls during the measured window');
  await closeVerified(r);
  entry.status = 'captured'; entry.wallCaptureMs = raw.after.at - raw.before.at;
  await persist(); console.log(`Completed ${directory}: CPU p50 ${result.cpu.p50.toFixed(6)} ms`);
 } catch (error) {
  entry.status = 'failed'; entry.error = redact(error.stack || error);
  await r.save('failure.json', { ...entry, collector: await boundedPageOperation(r.page.evaluate(() => __rthreeEditorTiming.status()), 'Read failed collector status').catch(error => ({ unavailable: true, error: redact(error.message) })) });
  await persist(); throw error;
 } finally { clearTimeout(watchdog); await r.close(); currentRun = null; }
}
function summarize() {
 const result = { qualification: false, mode, scope: configuration.scope, scenarios: [] };
 for (const scenario of [...cases, idleCase]) {
  const runs = manifest.runs.filter(x => x.scenario === scenario.id && x.status === 'captured');
  const balanced = runs.filter(x => x.purpose === 'balanced'), originals = runs.filter(x => x.engine === 'original');
  const median = quantile(originals.map(x => x.result.cpu.p50), .5);
  const increment = Math.max(...originals.map(x => x.result.observedClockIncrement)), tolerance = Math.max(.05 * median, 4 * increment);
  const originalCheck = x => ({ purpose: x.purpose, directory: x.directory, cpu: x.result.cpu,
   withinTolerance: Math.abs(x.result.cpu.p50 - median) <= tolerance,
   blocksWithinSceneTolerance: x.result.blocks.every(block => Math.abs(block.p50 - x.result.cpu.p50) <= tolerance),
   sceneToleranceMs: tolerance, ownRunBlockStable: x.result.blockStable });
  const originalChecks = originals.filter(x => x.purpose === 'balanced').map(originalCheck);
  const bookends = originals.filter(x => x.purpose !== 'balanced').map(originalCheck);
  const engines = {};
  for (const engine of ['original', 'prepared-js', 'prepared-wasm']) {
   const subset = balanced.filter(x => x.engine === engine);
   const medians = metric => Object.fromEntries(['p50', 'p95', 'p99'].map(q => [q, quantile(subset.map(x => x.result[metric][q]), .5)]));
   engines[engine] = { independentRuns: subset.length, medianRunCpu: medians('cpu'), medianRunRafIntervals: medians('rafIntervals'), medianRunCallbackStartIntervals: medians('callbackStartIntervals'),
    p50Range: [Math.min(...subset.map(x => x.result.cpu.p50)), Math.max(...subset.map(x => x.result.cpu.p50))], ownRunBlockStable: subset.every(x => x.result.blockStable) };
  }
  const original = engines.original.medianRunCpu, js = engines['prepared-js'].medianRunCpu, wasm = engines['prepared-wasm'].medianRunCpu;
  const delta = (actual, reference) => Object.fromEntries(['p50', 'p95', 'p99'].map(q => [q, { absoluteMs: actual[q] - reference[q], relativeChangePercent: !scenario.idle && reference[q] > 4 * increment ? 100 * (actual[q] - reference[q]) / reference[q] : null }]));
  result.scenarios.push({ scenario: scenario.id, auxiliary: Boolean(scenario.idle), engines,
   jsVersusOriginal: delta(js, original), wasmVersusOriginal: delta(wasm, original), wasmVersusMatchedJS: delta(wasm, js),
   aa: { allOriginalMedian: median, includesBookendsInTolerance: true, toleranceMs: tolerance, originals: originalChecks, bookends,
    passes: mode === 'full' && [...originalChecks, ...bookends].every(x => x.withinTolerance && x.blocksWithinSceneTolerance) },
   interpretation: 'Observed callback costs only. A/A or block failures preclude a stable speedup claim. Native phase coverage and intervals remain per-run; no FPS claim.' });
 }
 return result;
}
try {
 manifest.sourceBefore = sourcePins(); validatePins(manifest.sourceBefore);
 tooling = { ...manifest.sourceBefore.tooling, node: process.version };
 const files = ['scripts/apps/timing.mjs', 'scripts/apps/timing-overlay.mjs', 'scripts/apps/candidate-browser.mjs', 'scripts/apps/browser.mjs', 'scripts/apps/resources.json', 'bench/timing.mjs', 'package-lock.json', 'scripts/runner-environment.mjs', 'scripts/browser-path.mjs'];
 tooling.files = Object.fromEntries(await Promise.all(files.map(async file => [file, hash(await fs.readFile(path.join(toolRoot, file)))])));
 tooling.collectorSha256 = hash(installTimingCollector.toString()); manifest.tooling = tooling;
 manifest.asset = { file: 'editor/examples/models/gltf/RobotExpressive/RobotExpressive.glb', sha256: hash(await fs.readFile(path.join(appRoot, 'editor/examples/models/gltf/RobotExpressive/RobotExpressive.glb'))) };
 manifest.environmentBefore = await environment('before'); validatePower(manifest.environmentBefore);
 manifest.environmentLimitations = ['Missing display refresh/mode and unrelated workload absence require the operator record; browser callback cadence is recorded separately.', 'Unavailable power queries are explicitly not verified; they do not establish AC operation.'];
 await persist();
 browser = await chromium.launch({ executablePath, headless: false }); manifest.browser = { version: browser.version(), executablePath: redact(executablePath), lifecycle: 'one caller-owned browser, fresh context/page per oracle and timed run' };
 manifest.browser.protocolMetadata = await browserMetadata(); await persist();
 await parity(); manifest.status = 'capturing'; await persist();
 let number = 0;
 for (const scenario of cases) {
  await captureRun(scenario, { label: 'original-pre', engine: 'original' }, null, 'bookend-before', ++number);
  for (const [round, order] of orders.entries()) for (const i of order) await captureRun(scenario, routes[i], round, 'balanced', ++number);
  await captureRun(scenario, { label: 'original-post', engine: 'original' }, null, 'bookend-after', ++number);
 }
 for (const [round, order] of orders.entries()) for (const i of order) await captureRun(idleCase, routes[i], round, 'balanced', ++number);
 stopCheck();
 await save('analysis.json', summarize());
 manifest.status = mode === 'full' ? 'screen-complete-unqualified' : 'smoke-complete-not-performance-evidence'; manifest.finishedAt = new Date().toISOString(); await persist();
} catch (error) {
 manifest.status = 'failed'; manifest.errors.push(redact(error.stack || error)); manifest.finishedAt = new Date().toISOString(); await persist(); process.exitCode = 1;
} finally {
 if (currentRun) await currentRun.close().catch(async error => { manifest.errors.push(redact(error.message)); manifest.status = 'failed'; process.exitCode = 1; await persist(); });
 if (browser) await browser.close().catch(error => { manifest.errors.push(redact(error.message)); manifest.status = 'failed'; process.exitCode = 1; });
 try {
  manifest.sourceAfter = sourcePins(); validatePins(manifest.sourceAfter);
  if (manifest.sourceBefore) assert.deepEqual(manifest.sourceAfter, manifest.sourceBefore, 'Source pins or cleanliness changed');
  for (const [file, digest] of Object.entries(tooling?.files ?? {})) assert.equal(hash(await fs.readFile(path.join(toolRoot, file))), digest, `Tooling changed: ${file}`);
  manifest.sourceIntegrity = { unchanged: true, checkedAfterFailure: manifest.status === 'failed' };
 } catch (error) {
  manifest.sourceIntegrity = { unchanged: false, error: redact(error.message) }; manifest.errors.push(redact(error.stack || error)); manifest.status = 'failed'; process.exitCode = 1;
 }
 manifest.environmentAfter = await environment('after');
 try { validatePower(manifest.environmentAfter); }
 catch (error) { manifest.errors.push(redact(error.message)); manifest.status = 'failed'; process.exitCode = 1; }
 manifest.powerVerifiedACBeforeAndAfter = manifest.environmentBefore?.power.verifiedAC === true && manifest.environmentAfter.power.verifiedAC === true;
 manifest.finishedAt = new Date().toISOString(); await persist();
}
