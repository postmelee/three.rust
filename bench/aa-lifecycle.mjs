import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {browserPath} from '../scripts/browser-path.mjs';
import {hardwareRenderer} from './config.mjs';

const expectedReference = '9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7';
const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const options = {};
for (const argument of process.argv.slice(2)) {
  const split = argument.indexOf('=');
  const key = argument.slice(0, split);
  if (split < 1 || !['reference', 'out', 'variant', 'rounds', 'warmup', 'samples'].includes(key) || key in options)
    throw Error(`Unknown, malformed or duplicate argument: ${argument}`);
  options[key] = argument.slice(split + 1);
}
if (!options.reference || !options.out) throw Error('Usage: node bench/aa-lifecycle.mjs reference=CHECKOUT out=FRESH_DIRECTORY [variant=owned-js|original rounds=3 warmup=1200 samples=3600]');
const reference = path.resolve(options.reference), out = path.resolve(options.out);
const variant = options.variant ?? 'owned-js';
if (!['owned-js', 'original'].includes(variant)) throw Error('Unsupported variant');
const integer = (key, fallback, minimum) => {
  const value = Number(options[key] ?? fallback);
  if (!Number.isSafeInteger(value) || value < minimum) throw Error(`Invalid ${key}`);
  return value;
};
const rounds = integer('rounds', 3, 1), warmup = integer('warmup', 1200, 0), samples = integer('samples', 3600, 2);
if (existsSync(out)) throw Error('Choose a fresh result directory');
mkdirSync(out, {recursive: true});
const json = (file, data) => writeFileSync(path.join(out, file), `${JSON.stringify(data, null, 2)}\n`);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const hashFile = file => sha256(readFileSync(file));
const git = (root, args) => execFileSync('git', ['-C', root, ...args], {encoding: 'utf8'}).trim();
const checkout = root => ({commit: git(root, ['rev-parse', 'HEAD']), dirty: git(root, ['status', '--porcelain']) !== ''});
const conditions = ['same-page', 'new-page', 'new-browser'];
const orderFor = round => conditions.map((_, index) => conditions[(index + round) % conditions.length]);
const manifest = {
  status: 'starting', startedAt: new Date().toISOString(),
  classification: rounds < 3 || warmup < 1200 || samples < 3600
    ? 'Smoke/short lifecycle diagnostic only; no performance qualification'
    : 'Prospective A/A lifecycle diagnostic only; no performance qualification',
  protocol: 'Task #46 Stage 2A; existing engine/scene unchanged; no trace, CPU profile or GPU query',
  options: {variant, scenario: 'animated-16', rounds, warmup, samples, viewport: {width: 640, height: 540}, deviceScaleFactor: 1, headless: false},
  order: Array.from({length: rounds}, (_, round) => orderFor(round)),
  timing: {mode: 'isolated', probeVersion: 1},
  referencePath: reference, toolRoot, executablePath: browserPath(),
  boundaries: 'CDP task/heap and browser-process CPU snapshots surround the full measure call, including warmup. They are diagnostic metadata, not the timed frame CPU result. CDP Performance counters are enabled uniformly; no sampler or tracing is active.',
  cache: 'Same-page retains its page/renderer and JIT state. New-page retains a different browser but creates a new context/page. New-browser relaunches each run. Shared OS/cache state is not a cold-cache experiment.',
  backgroundWork: 'No unrelated process names or browser contents are collected. Every run is retained; environment observations do not establish exclusive host control.',
  browsers: [], pages: [], runs: [],
};
const save = () => json('manifest.json', manifest);
save();
const runtimePaths = [
  'fixtures/fox/index.html', 'fixtures/fox/replay.mjs', 'fixtures/fox/descriptor.mjs',
  'fixtures/fox/provenance.json', 'fixtures/fox/LICENSE.md', 'work/assets/Fox.glb',
  'bench/fox.mjs', 'bench/config.mjs', 'bench/timing.mjs', 'scripts/browser-path.mjs',
  'scripts/server.mjs', 'package-lock.json', 'rust-toolchain.toml',
  'node_modules/three/build/three.module.js', 'node_modules/three/build/three.core.js',
  'node_modules/three/examples/jsm/loaders/GLTFLoader.js',
  'node_modules/three/examples/jsm/utils/SkeletonUtils.js', 'crates/scene-core/src/owned.rs',
  ...['owned', 'owned-layout', 'owned-js', 'owned-wasm', 'owned-renderer', 'owned-state'].map(name => `packages/rthree/${name}.js`),
  'packages/rthree/scene_core.wasm',
];
const toolPaths = ['bench/aa-lifecycle.mjs', 'bench/config.mjs', 'scripts/browser-path.mjs', 'package-lock.json', 'mydocs/plans/task_m6_46_impl.md'];
let server, origin, samePage, sameBrowser, newPageBrowser;
const activeBrowsers = new Set(), captures = [];
let nextBrowser = 0, nextPage = 0;
const unavailable = error => ({available: false, reason: String(error?.message ?? error)});
const optional = async action => {
  try { return {available: true, value: await action()}; }
  catch (error) { return unavailable(error); }
};
async function launch(condition) {
  const browser = await chromium.launch({executablePath: manifest.executablePath, headless: false, args: []});
  activeBrowsers.add(browser);
  const id = `browser-${++nextBrowser}`;
  const cdp = await browser.newBrowserCDPSession();
  const argv = await optional(() => cdp.send('Browser.getBrowserCommandLine'));
  const gpu = await optional(() => cdp.send('SystemInfo.getInfo'));
  const record = {id, condition, launchedAt: new Date().toISOString(), version: browser.version(), argv, gpu};
  manifest.browsers.push(record); save();
  return {browser, cdp, id};
}
async function createPage(owner) {
  const context = await owner.browser.newContext({viewport: manifest.options.viewport, deviceScaleFactor: 1});
  const page = await context.newPage(), errors = [];
  const id = `page-${++nextPage}`, contextId = `context-${nextPage}`;
  page.on('pageerror', error => errors.push(String(error)));
  const record = {id, contextId, browserId: owner.id, createdAt: new Date().toISOString()};
  manifest.pages.push(record); save();
  await page.goto(`${origin}/fixtures/fox/index.html?manual&count=16&variant=${variant}`);
  await page.waitForFunction(() => !!window.__fox);
  const cdp = await context.newCDPSession(page);
  const performanceCounters = await optional(() => cdp.send('Performance.enable'));
  record.performanceCounters = performanceCounters; save();
  return {owner, context, page, cdp, id, contextId, errors, performanceCounters};
}
async function snapshot(target) {
  const page = await target.page.evaluate(() => ({
    visibility: document.visibilityState, focused: document.hasFocus(),
    devicePixelRatio, viewport: {width: innerWidth, height: innerHeight},
    canvas: {width: window.__fox.renderer.domElement.width, height: window.__fox.renderer.domElement.height},
    crossOriginIsolated, gpu: window.__fox.gpu, tick: window.__fox.tick,
    adapter: window.__fox.adapter?.diagnostics() ?? null,
  }));
  const performanceCounters = target.performanceCounters.available
    ? await optional(async () => {
      const result = await target.cdp.send('Performance.getMetrics');
      const names = new Set(['Timestamp', 'TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'JSHeapUsedSize', 'JSHeapTotalSize', 'Nodes', 'Documents', 'JSEventListeners']);
      const values = Object.fromEntries(result.metrics.filter(item => names.has(item.name)).map(item => [item.name, item.value]));
      if (!Object.keys(values).length) throw Error('No CDP performance metrics returned');
      return values;
    })
    : target.performanceCounters;
  const processCpu = await optional(async () => {
    const value = await target.owner.cdp.send('SystemInfo.getProcessInfo');
    // Only this launched browser's process type, numeric ID and CPU duration; no names/command lines.
    return value.processInfo.map(({type, id, cpuTime}) => ({type, id, cpuTime}));
  });
  return {recordedAt: new Date().toISOString(), page, performanceCounters, processCpu};
}
function verifyEnvironment(value) {
  assert.equal(value.page.visibility, 'visible');
  assert.equal(value.page.focused, true);
  assert.equal(value.page.crossOriginIsolated, true);
  assert.equal(value.page.devicePixelRatio, 1);
  assert.deepEqual(value.page.viewport, {width: 640, height: 540});
  assert.deepEqual(value.page.canvas, {width: 640, height: 480});
  hardwareRenderer(value.page.gpu.renderer);
}
function numericDelta(before, after) {
  if (!before || !after) return null;
  return Object.fromEntries(Object.keys(after).filter(key => typeof after[key] === 'number' && typeof before[key] === 'number').map(key => [key, after[key] - before[key]]));
}
function quantile(values, p) {
  assert(values.length && values.every(Number.isFinite));
  const sorted = [...values].sort((a, b) => a - b), x = (sorted.length - 1) * p;
  return sorted[Math.floor(x)] + (sorted[Math.ceil(x)] - sorted[Math.floor(x)]) * (x % 1);
}
const stats = values => ({p50: quantile(values, 0.5), p95: quantile(values, 0.95), p99: quantile(values, 0.99), min: Math.min(...values), max: Math.max(...values), mean: values.reduce((a, b) => a + b, 0) / values.length});
function analyze() {
  const rows = captures.map(({file, data, capture}) => {
    const raw = data.raw;
    const blocks = [];
    for (let first = 0; first < raw.length; first += 600) {
      const block = raw.slice(first, first + 600);
      blocks.push({firstFrame: first, samples: block.length, complete600: block.length === 600, cpu: stats(block.map(frame => frame.cpu)), callbackArrival: stats(block.map(frame => frame.start - frame.raf))});
    }
    return {
      file, condition: capture.condition, round: capture.round,
      cpu: stats(raw.map(frame => frame.cpu)),
      callbackInterval: stats(raw.slice(1).map((frame, i) => frame.start - raw[i].start)),
      rafInterval: stats(raw.slice(1).map((frame, i) => frame.raf - raw[i].raf)),
      callbackArrival: stats(raw.map(frame => frame.start - frame.raf)), blocks,
      observedClockIncrementMs: capture.clock.minPositiveDeltaMs,
      finalStateSha256: sha256(JSON.stringify(data.final)),
      workload: {draws: data.draws, triangles: data.triangles, readCount: data.readCount, diagnosticsDelta: numericDelta(data.diagnosticsBefore, data.diagnostics), adapterDeltaIncludingWarmup: numericDelta(capture.before.page.adapter, data.adapter)},
    };
  });
  const groups = conditions.map(condition => {
    const members = rows.filter(row => row.condition === condition), medianP50 = quantile(members.map(row => row.cpu.p50), 0.5);
    const maximumObservedClockIncrementMs = Math.max(...members.map(row => row.observedClockIncrementMs));
    const toleranceMs = Math.max(medianP50 * 0.05, maximumObservedClockIncrementMs * 4);
    const checks = members.map(row => ({file: row.file, runDeviationMs: Math.abs(row.cpu.p50 - medianP50), runPass: Math.abs(row.cpu.p50 - medianP50) <= toleranceMs,
      blocks: row.blocks.map(block => ({firstFrame: block.firstFrame, samples: block.samples, deviationMs: Math.abs(block.cpu.p50 - row.cpu.p50), pass: Math.abs(block.cpu.p50 - row.cpu.p50) <= toleranceMs}))}));
    return {condition, runs: members.length, medianP50, p50Range: [Math.min(...members.map(row => row.cpu.p50)), Math.max(...members.map(row => row.cpu.p50))], toleranceMs, maximumObservedClockIncrementMs,
      diagnosticScreenPass: checks.every(check => check.runPass && check.blocks.every(block => block.pass)), checks};
  });
  const finalStateHashes = [...new Set(rows.map(row => row.finalStateSha256))];
  return {method: 'Run-level linearly interpolated quantiles; median of run p50s per lifecycle. Every run/block retained. Diagnostic reproducibility screen, not statistical significance or product qualification.',
    rule: 'Every run p50 within max(5% of its condition median p50, four maximum observed clock increments) of that condition median; every contiguous 600-frame block p50 within the same absolute tolerance of its own run p50. Partial blocks in smoke are identified.',
    classification: manifest.classification, finalStateHashes, identicalFinalState: finalStateHashes.length === 1, groups, rows};
}
try {
  manifest.reference = checkout(reference); manifest.tooling = checkout(toolRoot);
  assert.equal(manifest.reference.commit, expectedReference, 'Reference must be the exact historical baseline');
  assert.equal(manifest.reference.dirty, false, 'Reference checkout must be clean');
  assert.equal(manifest.tooling.dirty, false, 'Commit tooling before capture');
  manifest.runtimeHashes = Object.fromEntries(runtimePaths.map(file => [file, hashFile(path.join(reference, file))]));
  manifest.toolHashes = Object.fromEntries(toolPaths.map(file => [file, hashFile(path.join(toolRoot, file))]));
  save();
  execFileSync(process.execPath, [path.join(reference, 'scripts/runner-environment.mjs'), path.join(out, 'environment-before')], {cwd: reference, stdio: 'pipe'});
  const {serve} = await import(pathToFileURL(path.join(reference, 'scripts/server.mjs')).href);
  const {observeClock, validateClock} = await import(pathToFileURL(path.join(reference, 'bench/timing.mjs')).href);
  // The historical server resolves files against cwd for each request; keep it pinned until closed.
  process.chdir(reference);
  server = await serve(0, {isolated: true});
  origin = `http://127.0.0.1:${server.address().port}`;
  manifest.origin = origin; manifest.status = 'running'; save();
  sameBrowser = await launch('same-page');
  samePage = await createPage(sameBrowser);
  newPageBrowser = await launch('new-page');
  for (let round = 0; round < rounds; round++) {
    for (const condition of orderFor(round)) {
      const file = `${round}-${condition}-${variant}.json`;
      const capture = {round, condition, variant, order: orderFor(round), startedAt: new Date().toISOString()};
      manifest.activeRun = capture; save();
      let target, freshBrowser;
      try {
        if (condition === 'same-page') target = samePage;
        else if (condition === 'new-page') target = await createPage(newPageBrowser);
        else { freshBrowser = await launch('new-browser'); target = await createPage(freshBrowser); }
        Object.assign(capture, {browserId: target.owner.id, contextId: target.contextId, pageId: target.id});
        await target.page.bringToFront();
        capture.before = await snapshot(target); verifyEnvironment(capture.before);
        capture.clock = await target.page.evaluate(observeClock); validateClock(capture.clock, manifest.timing);
        const data = await target.page.evaluate(config => window.__fox.measure(config), {warmup, samples, mode: 'render'});
        capture.measureFinishedAt = new Date().toISOString(); capture.errors = [...target.errors];
        // Save raw output before optional post-capture observations can fail.
        // Keep every field and numeric sample of the historical return value unchanged.
        json(file, {...data, capture});
        manifest.runs.push(file); save();
        capture.after = await snapshot(target);
        capture.finishedAt = new Date().toISOString();
        json(file, {...data, capture});
        verifyEnvironment(capture.after);
        assert.deepEqual(capture.errors, []); assert.deepEqual(data.invalid, []);
        assert.equal(data.raw.length, samples); assert.equal(data.draws, 16); assert.equal(data.triangles, 9216);
        assert.equal(data.readCount, Math.floor(samples / 60));
        captures.push({file, data, capture});
        delete manifest.activeRun; save();
        console.log(`${file}: ${samples} frames captured`);
      } catch (error) {
        capture.failedAt = new Date().toISOString(); capture.error = String(error?.stack ?? error);
        if (target) capture.errors = [...target.errors];
        json(`${round}-${condition}-${variant}-failure.json`, capture);
        throw error;
      } finally {
        if (target && condition !== 'same-page') await target.context.close();
        if (freshBrowser) { await freshBrowser.browser.close(); activeBrowsers.delete(freshBrowser.browser); }
      }
    }
  }
  const analysis = analyze(); json('summary.json', analysis);
  assert.equal(analysis.identicalFinalState, true, 'Final numeric state must be identical across all lifecycle runs');
  for (const [file, hash] of Object.entries(manifest.runtimeHashes)) assert.equal(hashFile(path.join(reference, file)), hash, `Runtime input changed: ${file}`);
  for (const [file, hash] of Object.entries(manifest.toolHashes)) assert.equal(hashFile(path.join(toolRoot, file)), hash, `Tooling input changed: ${file}`);
  assert.deepEqual(checkout(reference), manifest.reference, 'Reference checkout changed during capture');
  assert.deepEqual(checkout(toolRoot), manifest.tooling, 'Tooling checkout changed during capture');
  manifest.status = 'complete';
  manifest.diagnosticScreenPass = analysis.groups.every(group => group.diagnosticScreenPass);
} catch (error) {
  manifest.status = 'failed'; manifest.error = String(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  for (const browser of activeBrowsers) await browser.close().catch(() => {});
  if (server) await new Promise(resolve => server.close(resolve));
  if (manifest.runtimeHashes) {
    try { execFileSync(process.execPath, [path.join(reference, 'scripts/runner-environment.mjs'), path.join(out, 'environment-after')], {cwd: reference, stdio: 'pipe'}); }
    catch (error) { manifest.environmentAfter = unavailable(error); }
  }
  manifest.finishedAt = new Date().toISOString(); save();
}
