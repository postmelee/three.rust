// Separate diagnostic CPU sampling of the native Task #46 Editor scenario.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { openRun, hash } from './candidate-browser.mjs';
import { installTimingCollector } from './timing-overlay.mjs';
import { E3_SHADOW, setup, oracleCapture, compareOracle } from './editor-scenario.mjs';
import { captureProfileScripts } from './candidate-profile-sources.mjs';
import { installProfileObserver, warmNativeFrames, profileSnapshot, validateProfileWindow, preserveProfile, preserveObservation, boundedOperation, capturePassShape } from './candidate-profile-session.mjs';

const args = {};
for (const item of process.argv.slice(4)) {
 const at = item.indexOf('='), key = item.slice(0, at), value = item.slice(at + 1);
 assert(at > 0 && value && ['mode', 'candidateRoot', 'candidateSha'].includes(key) && !Object.hasOwn(args, key), 'Unknown, duplicate or empty argument');
 args[key] = value;
}
assert(process.argv[2] && process.argv[3] && args.candidateRoot, 'Usage: node scripts/apps/candidate-profile.mjs APP_ROOT FRESH_OUT mode=smoke|full candidateRoot=CHECKOUT [candidateSha=FULL_SHA]');
const mode = args.mode ?? 'smoke'; assert(['smoke', 'full'].includes(mode));
const candidateSha = args.candidateSha ?? '6990fd92f61a031c8c2ba7a8282cfb63684e6dfb';
assert.equal(candidateSha, '6990fd92f61a031c8c2ba7a8282cfb63684e6dfb', 'Freeze a new protocol before changing candidate');
const appRoot = await fs.realpath(path.resolve(process.argv[2])), candidateRoot = await fs.realpath(path.resolve(args.candidateRoot));
const out = path.resolve(process.argv[3]), toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
await fs.mkdir(path.dirname(out), { recursive: true }); await fs.mkdir(out, { recursive: false });
const executablePath = process.env.RTHREE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const redact = value => [[appRoot, '<apps>'], [candidateRoot, '<candidate>'], [toolRoot, '<tooling>'], [out, '<output>'], [os.homedir(), '<home>']].reduce((s, [a, b]) => s.split(a).join(b), String(value));
const save = (name, data) => fs.writeFile(path.join(out, name), JSON.stringify(data, null, 2) + '\n');
const config = { mode, repeats: mode === 'full' ? 3 : 1, warmupFrames: mode === 'full' ? 600 : 60,
 seconds: mode === 'full' ? 12 : 2, samplingIntervalUs: 100, prePostObservationSeconds: 2,
 scenario: E3_SHADOW, pageDpr: 1, rendererDpr: 1, viewport: { width: 1280, height: 720 }, isolated: true,
 timingOverlays: false, boundaryWrappers: false, gpuQueries: false, debuggerDuringSampling: false };
const engines = ['original', 'prepared-js', 'prepared-wasm'];
const manifest = { status: 'preparing', kind: mode === 'full' ? 'native-candidate-attribution-only' : 'profile-tooling-smoke-only',
 qualification: false, startedAt: new Date().toISOString(), config, candidateSha,
 orders: Array.from({ length: config.repeats }, (_, round) => engines.map((_, i) => engines[(i + round) % engines.length])),
 scope: 'CPU sampling only. Not primary CPU quantiles, GPU timing, FPS, or stable speedup evidence.',
 overhead: 'Requested 100us interval and passive snapshot/signals observers have uncalibrated CPU overhead. Before/after cadence (including a 120Hz ceiling) cannot calibrate CPU overhead. Preserve observed gaps; do not subtract overhead into product timings.',
 oracles: [], runs: [], errors: [] };
const persist = () => save('manifest.json', manifest);
await persist();
let browser, current, interrupted = false, interruptWait;
const interruptController = new AbortController();
const onSignal = () => { interrupted = true; interruptController.abort(); interruptWait?.(); };
process.once('SIGINT', onSignal); process.once('SIGTERM', onSignal);
const stopCheck = () => assert(!interrupted, 'Interrupted; completed and returned partial profiles are retained');
async function delay(ms) {
 let timer;
 try { await new Promise(resolve => { timer = setTimeout(resolve, ms); interruptWait = resolve; }); stopCheck(); }
 finally { clearTimeout(timer); interruptWait = null; }
}
function pins() {
 const state = (root, untracked = true) => ({ sha: git(root, 'rev-parse', 'HEAD'), dirty: Boolean(git(root, 'status', '--porcelain', untracked ? '--untracked-files=normal' : '--untracked-files=no')) });
 const value = { tooling: state(toolRoot), candidate: state(candidateRoot), editor: state(path.join(appRoot, 'editor'), false), viewer: state(path.join(appRoot, 'viewer'), false) };
 assert.equal(value.candidate.sha, candidateSha); assert.equal(value.candidate.dirty, false);
 assert.equal(value.editor.sha, '9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8'); assert.equal(value.editor.dirty, false);
 assert.equal(value.viewer.sha, 'b5ee5dafe27f953ae1b55f42b5fa3697fef08683'); assert.equal(value.viewer.dirty, false);
 if (mode === 'full') assert.equal(value.tooling.dirty, false, 'Commit profiling tools before full capture');
 return value;
}
async function environment(stage) {
 const directory = path.join(out, 'environment-' + stage);
 execFileSync(process.execPath, [path.join(toolRoot, 'scripts/runner-environment.mjs'), directory], { cwd: toolRoot, stdio: 'pipe', timeout: 90000 });
 const file = path.join(directory, 'runner.json'), data = JSON.parse(redact(await fs.readFile(file, 'utf8')));
 await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n');
 assert.equal(data.power?.available, true, 'Profiling requires an available AC power observation');
 assert(data.power.output.includes('AC Power'), 'Profiling requires AC power');
 return { file: `environment-${stage}/runner.json`, verifiedAC: true };
}
async function session(engine, directory, observer) {
 stopCheck(); const destination = path.join(out, directory); await fs.mkdir(path.dirname(destination), { recursive: true });
 const r = await openRun(appRoot, destination, { app: 'editor', engine, candidateRoot, candidateSha, browser,
  browserExecutablePath: executablePath, isolated: true, deviceScaleFactor: 1, captureSources: observer,
  sourceOverlays: [], mode: 'Native E3 diagnostic profile preparation; no timing overlay or forced replay' });
 current = r;
 await r.context.addInitScript(installTimingCollector); // Passive snapshot/saving state; run() is never called.
 if (observer) await r.context.addInitScript(installProfileObserver);
 return r;
}
async function closeRun(r) {
 await r.close(); assert.deepEqual(r.errors, [], 'Browser/serving failure'); assert(!r.requests.some(item => item.blocked), 'Unknown external source'); current = null;
}
async function oracles() {
 let original;
 for (const engine of engines) {
  let noObserver;
  for (const observer of [false, true]) {
   const directory = `oracles/${engine}-${observer ? 'observer' : 'native'}`;
   const entry = { engine, observer, directory, status: 'running' }; manifest.oracles.push(entry); await persist();
   let r;
   try {
    r = await session(engine, directory, observer); await setup(r, E3_SHADOW);
    const poses = []; for (const time of [.25, .75]) poses.push(await oracleCapture(r, E3_SHADOW, time));
    if (engine === 'original' && !observer) original = poses;
    entry.originalComparisons = poses.map((pose, i) => compareOracle(pose, original[i]));
    if (observer) entry.observerComparisons = poses.map((pose, i) => compareOracle(pose, noObserver[i])); else noObserver = poses;
    const shape = await r.page.evaluate(capturePassShape); await r.save('fixed-pose-pass-shape.json', shape); assert.equal(shape.restored, true);
    await closeRun(r); entry.status = 'passed';
   } catch (error) { entry.status = 'failed'; entry.error = redact(error.stack || error); throw error; }
   finally { if (r) await r.close(); current = null; await persist(); }
  }
 }
}
async function snapshot(page) { return boundedOperation(page.evaluate(profileSnapshot), { signal: interruptController.signal, label: 'Endpoint snapshot' }); }
async function observationWindow(r, file) {
 const raw = { before: await snapshot(r.page), after: null, scope: 'Unprofiled diagnostic cadence; no callback CPU timing' };
 await r.save(file, raw); await delay(config.prePostObservationSeconds * 1000); raw.after = await snapshot(r.page);
 return preserveObservation(raw, value => r.save(file, value), value => validateProfileWindow(value.before, value.after, r.engine));
}
async function profileRun(engine, round) {
 const directory = `runs/${round}-${engine}`, entry = { engine, round, directory, status: 'preparing' };
 manifest.runs.push(entry); await persist(); let r, cdp, profiling = false;
 try {
  r = await session(engine, directory, true); const prepared = await setup(r, E3_SHADOW);
  entry.origin = r.origin; await r.save('profile-manifest.json', { engine, candidateSha, origin: r.origin, toolSha: manifest.sourceBefore.tooling.sha, config });
  const warmup = await boundedOperation(r.page.evaluate(warmNativeFrames, config.warmupFrames), { timeoutMs: 60000, signal: interruptController.signal, label: 'Native frame warmup' });
  await preserveObservation(warmup, value => r.save('warmup.json', value), value => validateProfileWindow(value.before, value.after, engine));
  assert.equal(warmup.frames, config.warmupFrames); assert(warmup.after.renderInfo.frame - warmup.before.renderInfo.frame >= config.warmupFrames);
  await observationWindow(r, 'before-window.json');
  cdp = await r.context.newCDPSession(r.page); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: config.samplingIntervalUs });
  const before = await snapshot(r.page);
  await r.save('profile-observations.json', { before, after: null, scope: 'Profiler window not yet completed' });
  const wallStart = Date.now();
  await cdp.send('Profiler.start'); profiling = true; entry.status = 'sampling';
  // No page evaluation, wrappers, Debugger or source reads in the sampled window.
  await delay(config.seconds * 1000);
  const { profile } = await cdp.send('Profiler.stop'); profiling = false;
  const evidence = await preserveProfile(profile, async value => { await r.save('profile.cpuprofile', value); entry.rawProfile = 'profile.cpuprofile'; }, () => snapshot(r.page));
  const after = evidence.after;
  const observed = { before, after, wallElapsedIncludingCDPms: Date.now() - wallStart,
   profileDurationMs: (profile.endTime - profile.startTime) / 1000, requestedIntervalUs: config.samplingIntervalUs,
   counterScope: 'Snapshots bracket Profiler.start/stop and are slightly wider than the sample window.',
   setup: prepared };
  await preserveObservation(observed, value => r.save('profile-observations.json', value), value => validateProfileWindow(value.before, value.after, engine));
  await cdp.send('Profiler.disable');
  await observationWindow(r, 'after-window.json');
  await captureProfileScripts(cdp, profile, r.out, r.origin);
  await cdp.detach(); cdp = null;
  await closeRun(r); entry.status = 'captured'; entry.profileDurationMs = observed.profileDurationMs;
 } catch (error) { entry.status = 'failed'; entry.error = redact(error.stack || error); throw error; }
 finally {
  if (cdp) {
   if (profiling) {
    try { const { profile } = await cdp.send('Profiler.stop'); await r.save('partial-profile.cpuprofile', profile); entry.partialProfile = 'partial-profile.cpuprofile'; }
    catch (error) { entry.partialProfileUnavailable = redact(error.message); }
   }
   await cdp.send('Profiler.disable').catch(error => { entry.profilerCleanupError = redact(error.message); });
   await cdp.detach().catch(error => { entry.detachError = redact(error.message); });
  }
  if (r) await r.close(); current = null; await persist();
 }
}
const toolFiles = ['scripts/apps/candidate-profile.mjs', 'scripts/apps/candidate-profile-session.mjs', 'scripts/apps/candidate-profile-sources.mjs', 'scripts/apps/candidate-profile-analysis.mjs', 'scripts/apps/editor-scenario.mjs', 'scripts/apps/candidate-browser.mjs', 'scripts/apps/browser.mjs', 'scripts/apps/timing-overlay.mjs', 'scripts/apps/resources.json', 'scripts/runner-environment.mjs', 'package-lock.json'];
try {
 manifest.sourceBefore = pins(); manifest.toolHashes = Object.fromEntries(await Promise.all(toolFiles.map(async file => [file, hash(await fs.readFile(path.join(toolRoot, file)))])));
 const eligibilityBytes = await fs.readFile(path.join(candidateRoot, 'packages/rthree/facade-state.js'));
 const eligibilityText = eligibilityBytes.toString('utf8'), start = eligibilityText.indexOf('function eligiblePass('), end = eligibilityText.indexOf('// The renderer supplies', start);
 assert(start >= 0 && end > start, 'Pinned eligibility source anchors changed');
 await save('eligibility-source.json', { candidateSha, file: 'packages/rthree/facade-state.js', sha256: hash(eligibilityBytes),
  functions: ['eligiblePass', 'refreshPassInputs'], excerpt: eligibilityText.slice(start, end),
  scope: 'Source conditions explaining sufficient exclusions in oracle pass shapes. Other earlier exclusions may apply; not an observed first-rejection trace.' });
 manifest.environmentBefore = await environment('before'); await persist();
 browser = await chromium.launch({ executablePath, headless: false });
 manifest.browser = { version: browser.version(), executablePath: redact(executablePath) };
 const browserCDP = await browser.newBrowserCDPSession();
 for (const [key, method] of [['version', 'Browser.getVersion'], ['commandLine', 'Browser.getBrowserCommandLine'], ['systemInfo', 'SystemInfo.getInfo']]) {
  try { manifest.browser[key] = JSON.parse(redact(JSON.stringify(await browserCDP.send(method))).replace(/--(user-data-dir|crash-dumps-dir|disk-cache-dir)=[^"\\\s]+/g, '--$1=<browser-private-directory>')); }
  catch (error) { manifest.browser[key] = { unavailable: true, error: redact(error.message) }; }
 }
 await browserCDP.detach(); await persist();
 await oracles();
 for (const [round, order] of manifest.orders.entries()) for (const engine of order) await profileRun(engine, round);
 manifest.status = 'capture-complete-attribution-pending';
} catch (error) { manifest.status = 'failed'; manifest.errors.push(redact(error.stack || error)); process.exitCode = 1; }
finally {
 if (current) await current.close().catch(error => { manifest.errors.push(redact(error.message)); manifest.status = 'failed'; process.exitCode = 1; });
 if (browser) await browser.close().catch(error => { manifest.errors.push(redact(error.message)); manifest.status = 'failed'; process.exitCode = 1; });
 try {
  manifest.sourceAfter = pins(); assert.deepEqual(manifest.sourceAfter, manifest.sourceBefore);
  for (const [file, expected] of Object.entries(manifest.toolHashes ?? {})) assert.equal(hash(await fs.readFile(path.join(toolRoot, file))), expected, 'Tool changed: ' + file);
  manifest.sourceIntegrity = 'passed'; manifest.environmentAfter = await environment('after');
 } catch (error) { manifest.status = 'failed'; manifest.errors.push(redact(error.stack || error)); process.exitCode = 1; }
 manifest.finishedAt = new Date().toISOString(); await persist(); process.removeListener('SIGINT', onSignal); process.removeListener('SIGTERM', onSignal);
}
