import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { openViewerRun } from './viewer-browser.mjs';
import { VIEWER_PIN, hash } from './viewer-adapter.mjs';
import { VIEWER_GROUPS, resolveViewerProtocol, loadViewerContents, publicViewerContent, validateViewerContentCapturePolicy, verifyViewerZipInputs } from './viewer-timing-protocol.mjs';
import { installViewerTimingCollector } from './viewer-timing-collector.mjs';
import { installViewerProfileObserver, setupViewerCapture, fixedViewerOracle, compareViewerSnapshots } from './viewer-timing-session.mjs';

export async function createViewerCapture(kind, argv) {
 assert(argv.length >= 3, `Usage: node scripts/apps/viewer-${kind}.mjs APPS PREPARED NEW_OUT runtimeRoot=... runtimeSha=... [mode=smoke|full] [group=engine|migration] [protocol=...] [contents=...] [timingPrepared=...] [timingOriginal=...]`);
 const options = {};
 for (const arg of argv.slice(3)) { const split = arg.indexOf('='), key = arg.slice(0, split), value = arg.slice(split + 1); assert(split > 0 && value && ['runtimeRoot', 'runtimeSha', 'mode', 'group', 'protocol', 'contents', 'cases', 'timingPrepared', 'timingOriginal', 'networkDiagnostic'].includes(key) && !Object.hasOwn(options, key), 'Unknown, duplicate or empty option'); options[key] = value; }
 const mode = options.mode ?? 'smoke', group = options.group ?? 'engine', toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
 const apps = await fs.realpath(path.resolve(argv[0])), prepared = await fs.realpath(path.resolve(argv[1])), out = path.resolve(argv[2]);
 assert(options.runtimeRoot && options.runtimeSha); const runtimeRoot = await fs.realpath(path.resolve(options.runtimeRoot));
 const protocol = await resolveViewerProtocol(toolRoot, { kind, mode, protocolPath: options.protocol, output: out, runtimeSha: options.runtimeSha, group, casesPath: options.cases });
 if (kind === 'timing') { assert(options.timingPrepared, 'Timing requires a separate instrumented external bundle'); if (group === 'migration') assert(options.timingOriginal, 'Migration timing requires an instrumented bundled-r176 control'); }
 else assert(!options.timingPrepared && !options.timingOriginal, 'CPU profiles must use uninstrumented app bundles');
 const networkDiagnostic = options.networkDiagnostic ?? protocol.evidence?.protocol.transport?.network ?? 'playwright';
 assert(['playwright', 'proxy-cdp-remote'].includes(networkDiagnostic));
 if (protocol.evidence?.protocol.transport) assert.equal(networkDiagnostic, protocol.evidence.protocol.transport.network, 'Network mode cannot override a committed transport contract');
 if (networkDiagnostic !== 'playwright') { assert.equal(kind, 'profile'); if (protocol.evidence) assert.equal(protocol.evidence.protocol.transport?.network, networkDiagnostic); }
 const ownedProcessPerRun = networkDiagnostic !== 'playwright';
 const preparedRoots = { native: prepared };
 for (const [key, value] of [['timing', options.timingPrepared], ['timingOriginal', options.timingOriginal]]) if (value) preparedRoots[key] = await fs.realpath(path.resolve(value));
 const contents = await loadViewerContents(apps, options.contents, protocol.evidence?.protocol.assets);
 for (const scenario of protocol.cases) assert(contents.some(asset => asset.id === scenario.asset), 'Missing case content: ' + scenario.asset);
 const { zipContents, strictContent } = validateViewerContentCapturePolicy(contents, protocol.cases, { kind, group, networkDiagnostic, protocolEvidence: protocol.evidence });
 await fs.mkdir(out, { recursive: false });
 const aliases = [[apps, '<apps>'], [runtimeRoot, '<runtime>'], [toolRoot, '<tooling>'], ...Object.entries(preparedRoots).map(([name, root]) => [root, '<prepared-' + name + '>']), ...contents.map(asset => [asset.root, '<content-' + asset.id + '>']), ...zipContents.map(asset => [asset.zipPrepared, '<zip-preparation-' + asset.id + '>']), [out, '<output>'], [os.homedir(), '<home>']];
 const redact = value => aliases.reduce((text, [from, to]) => text.split(from).join(to), String(value));
 const save = async (name, value) => { const file = path.join(out, name); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n'); };
 const configuration = { ...protocol.config, networkDiagnostic, strictContent, pageDpr: 1, cssViewport: { width: 1280, height: 720 }, isolated: true, profiling: kind === 'profile', gpuQueriesInWindow: false,
  scope: kind === 'timing' ? 'Disjoint native Viewer.animate plus every frozen dat.gui.updateDisplays rAF body; not full browser/GPU CPU or FPS.' : 'Diagnostic CPU sampling with uninstrumented native Viewer and GUI loops; not primary timing or FPS.',
  callbackQuantizationFloor: '2 * frozen callback count * observed minimum positive clock increment', nativeClock: 'Unchanged native rAF timestamps; poses are not frame-matched across routes.' };
 const routes = VIEWER_GROUPS[group], engines = [...new Set(routes.map(route => route.engine))];
 const manifest = { status: 'preparing', kind: 'viewer-' + kind + (mode === 'smoke' ? '-smoke-only' : '-unqualified'), candidateSha: options.runtimeSha, group, configuration, config: configuration,
  inputPolicy: zipContents.length ? 'Native file input → SimpleDropzone ZIP → App.load; unchanged original bytes and Playwright mirror policy; no mounted-content HTTP import.' : 'Native App.view mounted HTTP URL',
  protocol: protocol.evidence, smokeCaseInput: protocol.caseEvidence ?? null, cases: protocol.cases, routes, assets: contents.map(publicViewerContent), startedAt: new Date().toISOString(),
  originalVersionControl: 'original-r176, external-r176 and pure-r186 comparisons are migration evidence, never candidate engine effects.',
  oracles: [], runs: [], errors: [], coverageExclusions: ['asynchronous loader/validator/UI/browser tasks outside the declared bodies', 'paint/compositor/GPU', 'collector bookkeeping'],
  overhead: 'Timing envelope and collector overhead are uncalibrated and outside reported body CPU except boundary timer reads. Profiler/observer overhead is uncalibrated; before/after cadence cannot calibrate CPU overhead.' };
 const persist = () => save('manifest.json', manifest); await persist();
 const controller = new AbortController(); let browser, current, interrupted = false;
 const interrupt = () => { interrupted = true; controller.abort(); current?.page.evaluate(() => globalThis.__rthreeViewerTiming?.abort('Interrupted')).catch(() => {}); };
 process.once('SIGINT', interrupt); process.once('SIGTERM', interrupt);
 const check = () => assert(!interrupted, 'Interrupted; returned raw evidence is retained');
 const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
 const state = (root, trackedOnly = false) => ({ sha: git(root, 'rev-parse', 'HEAD'), dirty: Boolean(git(root, 'status', '--porcelain', trackedOnly ? '--untracked-files=no' : '--untracked-files=normal')) });
 const pins = () => {
  const observed = { tooling: state(toolRoot), candidate: state(runtimeRoot), viewer: state(path.join(apps, 'viewer'), true) };
  assert.equal(observed.candidate.sha, options.runtimeSha); assert.equal(observed.candidate.dirty, false); assert.equal(observed.viewer.sha, VIEWER_PIN); assert.equal(observed.viewer.dirty, false);
  if (mode === 'full') assert.equal(observed.tooling.dirty, false, 'Commit tools before full Viewer capture'); return observed;
 };
 async function environment(stage) {
  const directory = path.join(out, 'environment-' + stage);
  execFileSync(process.execPath, [path.join(toolRoot, 'scripts/runner-environment.mjs'), directory], { cwd: toolRoot, stdio: 'pipe', timeout: 60000 });
  const file = path.join(directory, 'runner.json'), data = JSON.parse(redact(await fs.readFile(file, 'utf8'))); await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n');
  assert.equal(data.power?.available, true, 'AC power observation unavailable'); assert(data.power.output.includes('AC Power'), 'AC power required');
  return { file: 'environment-' + stage + '/runner.json', verifiedAC: true };
 }
 async function closeRun(run) { try { await run.close(); assert.deepEqual(run.errors, []); assert(!run.requests.some(request => request.blocked)); } finally { if (current === run) current = null; } }
 async function open(engine, directory, instrumented, observer = false, scenario) {
  check(); await fs.mkdir(path.dirname(path.join(out, directory)), { recursive: true });
  const root = instrumented ? preparedRoots[engine === 'original-r176' ? 'timingOriginal' : 'timing'] : preparedRoots.native;
  assert(root, 'Missing required prepared bundle');
  const run = await openViewerRun(apps, root, path.join(out, directory), { route: engine, runtimeRoot, runtimeSha: options.runtimeSha, browser, networkDiagnostic,
   isolated: true, captureSources: kind === 'profile' || instrumented, contentRoots: (scenario ? contents.filter(asset => asset.id === scenario.asset) : contents).filter(asset => !asset.zipPrepared), mode: instrumented ? 'Native Viewer and dat.gui callback timing; no profiler' : 'Uninstrumented Viewer oracle or diagnostic profile' });
  current = run;
  const selectedAsset = scenario && contents.find(asset => asset.id === scenario.asset);
  await run.save('input.json', selectedAsset?.input ?? { kind: 'native App.view HTTP URL', assetBytesChanged: false });
  if (strictContent) {
   const failures = [], consoleErrors = [], mountedRequests = []; let phase = 'active';
   const publicText = value => redact(run.redact(value).split(run.origin).join('<origin>'));
   const failed = request => failures.push({ url: publicText(request.url()), error: request.failure()?.errorText ?? null, phaseAtReceipt: phase });
   const logged = message => { if (message.type() === 'error') consoleErrors.push({ text: publicText(message.text()), phaseAtReceipt: phase }); };
   const requested = request => { if (request.url().startsWith(run.origin + '/__viewer_content__/')) mountedRequests.push(publicText(request.url())); };
   run.page.on('requestfailed', failed); run.page.on('console', logged); run.page.on('request', requested);
   const evidence = () => ({ failures: [...failures], consoleErrors: [...consoleErrors], mountedRequests: [...mountedRequests], strict: true, input: selectedAsset?.input ?? { kind: 'native App.view HTTP URL' }, phaseAtReceiptScope: 'Receipt boundary only; closing events remain strict failures, not waived or assigned a causal origin.' });
   const verify = () => { assert.deepEqual(failures, [], 'Content transport failed'); assert.deepEqual(consoleErrors, [], 'Content console failed'); if (selectedAsset?.zipPrepared) assert.deepEqual(mountedRequests, [], 'Native ZIP input unexpectedly fetched mounted HTTP content'); };
   run.verifyContent = async () => { await run.save('content-transport-preflight.json', evidence()); verify(); };
   const nativeClose = run.close; let closing;
   run.close = () => { if (closing) return closing.catch(() => {}); closing = (async () => {
    let failure; try { await run.save('content-transport-before-close.json', evidence()); verify(); } catch (error) { failure = error; }
    phase = 'closing'; try { await nativeClose(); } catch (error) { failure ??= error; }
    try { await run.save('content-transport.json', evidence()); verify(); } catch (error) { failure ??= error; }
    finally { run.page.off('requestfailed', failed); run.page.off('console', logged); run.page.off('request', requested); }
    if (failure) { run.errors.push('Strict content transport/console gate failed: ' + publicText(failure.message)); throw failure; }
   })(); return closing; };
   await run.save('browser-process.json', await browserEvidence(run.browser));
  }
  await run.context.addInitScript(installViewerTimingCollector); if (observer) await run.context.addInitScript(installViewerProfileObserver); return run;
 }
 async function parity() {
  for (const scenario of manifest.cases) {
   let reference;
   for (const engine of engines) {
    let native;
    for (const observed of [false, true]) {
     const directory = `oracles/${scenario.id}/${engine}-${observed ? (kind === 'timing' ? 'timed' : 'observer') : 'native'}`, entry = { scenario: scenario.id, engine, directory, observed, status: 'running' };
     manifest.oracles.push(entry); await persist(); let run;
     try {
      run = await open(engine, directory, kind === 'timing' && observed, kind === 'profile' && observed, scenario);
      const setup = await setupViewerCapture(run, scenario, contents.find(asset => asset.id === scenario.asset));
      if (!scenario.guiLoops) { assert.equal(mode, 'smoke'); scenario.guiLoops = setup.guiLoops; scenario.guiContractSource = 'first native baseline oracle; smoke-only discovery'; }
      const captures = []; for (const pose of scenario.playback !== 'static' ? [.25, .75] : [0]) captures.push(await fixedViewerOracle(run, scenario, pose));
      if (!reference) reference = captures;
      const strict = group === 'engine' || engine !== 'pure-r186';
      entry.referenceComparisons = captures.map((capture, i) => compareViewerSnapshots(reference[i], capture, { strict }));
      if (observed) entry.instrumentationComparisons = captures.map((capture, i) => compareViewerSnapshots(native[i], capture)); else native = captures;
      await closeRun(run); entry.status = 'passed';
     } catch (error) { entry.status = 'failed'; entry.error = redact(error.stack || error); throw error; }
     finally { if (run) await run.close(); current = null; await persist(); }
    }
   }
  }
 }
 async function browserEvidence(instance) {
  const result = { version: instance.version() }, cdp = await instance.newBrowserCDPSession();
  try { for (const [key, method] of [['version', 'Browser.getVersion'], ['commandLine', 'Browser.getBrowserCommandLine'], ['systemInfo', 'SystemInfo.getInfo']]) { try { result[key] = JSON.parse(redact(JSON.stringify(await cdp.send(method))).replace(/--(user-data-dir|crash-dumps-dir|disk-cache-dir)=[^"\\\s]+/g, '--$1=<browser-private-directory>')); } catch (error) { result[key] = { unavailable: true, error: redact(error.message) }; } } }
  finally { await cdp.detach(); } return result;
 }
 async function prepare() {
  manifest.sourceBefore = pins();
  const scriptNames = (await fs.readdir(path.join(toolRoot, 'scripts/apps'))).filter(name => name.startsWith('viewer-') && name.endsWith('.mjs')).map(name => 'scripts/apps/' + name);
  const files = [...protocol.files, ...scriptNames, 'scripts/apps/editor-content.mjs', 'scripts/apps/candidate-profile-sources.mjs', 'scripts/apps/candidate-profile-analysis.mjs', 'scripts/apps/candidate-profile-session.mjs', 'scripts/apps/browser.mjs', 'scripts/apps/resources.json', 'scripts/runner-environment.mjs', 'package-lock.json'];
  manifest.toolHashes = Object.fromEntries(await Promise.all(files.map(async file => [file, hash(await fs.readFile(path.join(toolRoot, file)))])));
  manifest.preparedManifests = {};
  manifest.preparedManifestFiles = {};
  for (const [key, root] of Object.entries(preparedRoots)) {
   const bytes = await fs.readFile(path.join(root, 'manifest.json')); manifest.preparedManifests[key] = hash(bytes);
   const evidenceFile = 'prepared-manifests/' + key + '.json'; await save(evidenceFile, bytes.toString('utf8'));
   manifest.preparedManifestFiles[key] = { file: evidenceFile, sha256: hash(bytes), bytes: bytes.length };
   if (protocol.evidence) assert.equal(hash(bytes), protocol.evidence.protocol.preparedManifests[key], 'Prepared bundle differs from protocol: ' + key);
   const data = JSON.parse(bytes); assert.equal(data.status, 'prepared');
   // Both schemas are explicit: original preparation had no instrumentation key.
   const instrumentation = typeof data.instrumentation === 'object' ? data.instrumentation?.mode : data.instrumentation;
   if (key === 'native') assert(!instrumentation || instrumentation === 'none', 'Native/profile bundle must not include timing instrumentation');
   else assert.equal(instrumentation, 'timing', 'Timing bundle lacks explicit instrumentation provenance');
  }
  manifest.inputIntegrityBefore = await verifyViewerZipInputs(contents, apps);
  manifest.environmentBefore = await environment('before'); await persist();
  const executablePath = process.env.RTHREE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (ownedProcessPerRun) manifest.browser = { executablePath: redact(executablePath), lifecycle: 'Owned process per run; exact origin-only proxy bypass; process evidence in each run' };
  else { browser = await chromium.launch({ executablePath, headless: false }); manifest.browser = { executablePath: redact(executablePath), lifecycle: 'One process; sequential fresh contexts', ...await browserEvidence(browser) }; }
  await persist(); await parity();
 }
 async function finish(error) {
  if (error) { manifest.errors.push(redact(error.stack || error)); manifest.status = 'failed'; }
  for (const cleanup of [() => current?.close(), () => browser?.close()]) try { await cleanup(); } catch (error) { manifest.errors.push(redact(error.message)); manifest.status = 'failed'; }
  try {
   manifest.sourceAfter = pins(); if (manifest.sourceBefore) assert.deepEqual(manifest.sourceAfter, manifest.sourceBefore);
   for (const [file, expected] of Object.entries(manifest.toolHashes ?? {})) assert.equal(hash(await fs.readFile(path.join(toolRoot, file))), expected, 'Tool bytes changed: ' + file);
   for (const [key, expected] of Object.entries(manifest.preparedManifests ?? {})) assert.equal(hash(await fs.readFile(path.join(preparedRoots[key], 'manifest.json'))), expected);
   manifest.inputIntegrityAfter = await verifyViewerZipInputs(contents, apps); assert.deepEqual(manifest.inputIntegrityAfter, manifest.inputIntegrityBefore ?? []);
   manifest.sourceIntegrity = 'passed'; manifest.environmentAfter = await environment('after');
  } catch (error) { manifest.errors.push(redact(error.stack || error)); manifest.status = 'failed'; }
  manifest.finishedAt = new Date().toISOString(); await persist(); process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', interrupt);
  if (manifest.status === 'failed') process.exitCode = 1;
 }
 return { manifest, configuration, protocol, routes, engines, contents, options, apps, runtimeRoot, out, save, persist, redact, check, open, closeRun, prepare, finish, signal: controller.signal };
}
