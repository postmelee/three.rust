import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { gpu } from './browser.mjs';
import { VIEWER_PIN, VIEWER_ROUTES, hash, injectViewerImportMap, viewerDistribution } from './viewer-adapter.mjs';

export { gpu, hash };
const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const inside = (root, file) => file === root || file.startsWith(root + path.sep);
const slash = value => value.split(path.sep).join('/');
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.map': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.ktx2': 'image/ktx2', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const state = root => ({ sha: git(root, ['rev-parse', 'HEAD']), dirty: Boolean(git(root, ['status', '--porcelain', '--untracked-files=normal'])) });

export async function safeViewerFile(root, relative) {
 root = await fs.realpath(root);
 if (typeof relative !== 'string' || relative.includes('\0')) throw Error('Invalid local file');
 let file = path.resolve(root, relative);
 if (!inside(root, file)) throw Error('Request escaped its allowed root');
 if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
 file = await fs.realpath(file);
 if (!inside(root, file)) throw Error('Symlink escaped its allowed root');
 if (!(await fs.stat(file)).isFile()) throw Error('Requested path is not a file');
 return file;
}

// No browser is launched here, allowing transport/hash/security tests to run in Node.
export async function createViewerServer(appsArg, preparedArg, outArg, options = {}) {
 const apps = await fs.realpath(path.resolve(appsArg)), viewer = path.join(apps, 'viewer');
 const prepared = await fs.realpath(path.resolve(preparedArg)), out = path.resolve(outArg);
 await fs.mkdir(out, { recursive: false });
 const routeName = options.route ?? 'original-r176', route = VIEWER_ROUTES[routeName];
 const errors = [], requests = [], checked = new Map(), served = new Map(), captured = new Map();
 const aliases = [[apps, '<apps>'], [prepared, '<prepared>'], [out, '<output>'], [os.homedir(), '<home>']];
 const redact = value => aliases.reduce((text, [from, to]) => text.split(from).join(to), String(value));
 const save = async (name, value) => {
  const file = path.resolve(out, name);
  if (!inside(out, file) || file === out) throw Error('Invalid evidence output path');
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n');
 };
 const remember = async (file, label, expected) => {
  const bytes = await fs.readFile(file), sha256 = hash(bytes), prior = checked.get(file);
  if ((expected && (sha256 !== expected.sha256 || (expected.bytes !== undefined && bytes.length !== expected.bytes))) || (prior && prior.sha256 !== sha256)) throw Error('File hash/size changed: ' + label);
  checked.set(file, { file: label, sha256, bytes: bytes.length });
  return bytes;
 };
 const checkViewer = () => {
  if (git(viewer, ['rev-parse', 'HEAD']) !== VIEWER_PIN || git(viewer, ['status', '--porcelain', '--untracked-files=no'])) throw Error('Viewer upstream pin/source changed');
 };
 let runtimeRoot, runtimeState, threeRoot, candidateRoot, server, closed = false;
 try {
  if (!route) throw Error('Unknown Viewer route');
  checkViewer();
  const preparedManifestFile = await safeViewerFile(prepared, 'manifest.json');
  const manifest = JSON.parse(await remember(preparedManifestFile, 'prepared/manifest.json'));
  if (manifest.status !== 'prepared' || manifest.viewerPin !== VIEWER_PIN || !manifest.integrity?.originalSourcesAndDistUnchanged) throw Error('Viewer preparation manifest is incomplete');
  const { bundledTimingControl, usesPreparedDist } = viewerDistribution(routeName, manifest);
  for (const row of manifest.sources) await remember(await safeViewerFile(apps, row.file), row.file, row);
  for (const row of manifest.originalDist) await remember(await safeViewerFile(apps, row.file), row.file, row);
  for (const row of manifest.outputs) await remember(await safeViewerFile(prepared, row.file), 'prepared/' + row.file, row);
  if (route.revision === '176') threeRoot = await fs.realpath(path.join(viewer, 'node_modules/three'));
  else {
   if (!options.runtimeRoot || !/^[0-9a-f]{40}$/.test(options.runtimeSha ?? '')) throw Error('r186 routes require runtimeRoot and an exact full runtimeSha');
   runtimeRoot = await fs.realpath(path.resolve(options.runtimeRoot)); aliases.unshift([runtimeRoot, '<runtime>']);
   runtimeState = state(runtimeRoot);
   if (runtimeState.dirty || runtimeState.sha !== options.runtimeSha) throw Error('Runtime source must be clean at the requested SHA');
   const packageFile = await safeViewerFile(runtimeRoot, 'package.json');
   const pkg = JSON.parse(await remember(packageFile, 'runtime/package.json'));
   if (pkg.devDependencies?.three !== '0.186.1') throw Error('Runtime root must pin Three.js 0.186.1');
   for (const name of ['package-lock.json', 'Cargo.lock', 'rust-toolchain.toml', 'scripts/build.mjs']) await remember(await safeViewerFile(runtimeRoot, name), 'runtime/' + name);
   threeRoot = await fs.realpath(path.join(runtimeRoot, 'node_modules/three'));
  }
  const threePackage = JSON.parse(await remember(await safeViewerFile(threeRoot, 'package.json'), 'three-' + route.version + '/package.json'));
  if (threePackage.version !== route.version) throw Error('Installed Three.js version does not match route');
  if (route.candidate) {
   candidateRoot = await fs.realpath(path.join(runtimeRoot, 'packages/rthree'));
   if (!inside(runtimeRoot, candidateRoot)) throw Error('Candidate package escaped runtime root');
   const names = await fs.readdir(candidateRoot);
   for (const name of ['core.js', 'runtime.js', 'index.js', 'prepared.js', 'prepared-js.js', 'scene_core.wasm']) if (!names.includes(name)) throw Error('Candidate build missing ' + name);
   for (const name of names.filter(name => /\.(?:js|wasm)$/.test(name) || ['package.json', 'LICENSE', 'THREE-LICENSE'].includes(name))) await remember(await safeViewerFile(candidateRoot, name), 'candidate/' + name);
  }
  // Selected runtime modules and both decoder families are pinned before navigation.
  for (const name of ['LICENSE', 'build/three.module.js', 'build/three.core.js', 'examples/jsm/libs/draco/gltf/draco_decoder.js', 'examples/jsm/libs/draco/gltf/draco_decoder.wasm', 'examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js', 'examples/jsm/libs/basis/basis_transcoder.js', 'examples/jsm/libs/basis/basis_transcoder.wasm', 'examples/jsm/libs/meshopt_decoder.module.js']) await remember(await safeViewerFile(threeRoot, name), 'three-' + route.version + '/' + name);
  const resources = JSON.parse(await fs.readFile(new URL('./resources.json', import.meta.url)));
  for (const resource of resources) await remember(await safeViewerFile(apps, 'vendor/' + resource.file), 'vendor/' + resource.file, resource);
  const mounts = new Map();
  for (const mount of options.contentRoots ?? []) {
   if (!/^[a-z][a-z0-9-]*$/.test(mount.id) || mounts.has(mount.id) || !Array.isArray(mount.files) || !mount.files.length) throw Error('Invalid or duplicate content mount');
   const root = await fs.realpath(path.resolve(mount.root)); aliases.unshift([root, '<content-' + mount.id + '>']);
   const files = new Map();
   for (const item of mount.files) {
    if (typeof item.file !== 'string' || item.file.startsWith('/') || item.file.split('/').includes('..') || files.has(item.file) || !/^[0-9a-f]{64}$/.test(item.sha256) || !Number.isSafeInteger(item.bytes)) throw Error('Invalid content allowlist record');
    const file = await safeViewerFile(root, item.file);
    await remember(file, 'content/' + mount.id + '/' + item.file, item); files.set(item.file, { ...item, absolute: file });
   }
   mounts.set(mount.id, { root, files });
  }
  const dist = usesPreparedDist ? path.join(prepared, 'dist') : path.join(viewer, 'dist');
  const originalIndex = await remember(await safeViewerFile(dist, 'index.html'), usesPreparedDist ? 'prepared/dist/index.html' : 'viewer/dist/index.html');
  const index = Buffer.from(injectViewerImportMap(originalIndex.toString('utf8'), routeName));
  await save('index.original.html', originalIndex); await save('index.served.html', index);
  const metadata = { schema: 1, route: routeName, appPin: VIEWER_PIN, runtimeSha: runtimeState?.sha ?? null,
   revision: route.revision, threeVersion: route.version, engine: route.engine ?? 'original',
   externalized: route.externalized, instrumentation: manifest.instrumentation ?? null, bundledTimingControl, preparationManifestSha256: hash(await fs.readFile(preparedManifestFile)),
   appBundleOutputs: manifest.outputs, originalDist: manifest.originalDist,
   index: { originalSha256: hash(originalIndex), originalBytes: originalIndex.length, servedSha256: hash(index), servedBytes: index.length },
   content: [...mounts].map(([id, mount]) => ({ id, files: [...mount.files.values()].map(({ absolute, ...row }) => row) })),
   runtimeBuildProvenance: 'Existing build files are hashed. This server does not build or independently certify their source correspondence.',
   omittedClaims: ['r176-to-r186 image equality', 'unprepared external HDR environments', 'performance qualification'] };
  const toolingRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  aliases.unshift([toolingRoot, '<tooling>']);
  metadata.tooling = { ...state(toolingRoot), files: [] };
  for (const name of ['scripts/apps/viewer-browser.mjs', 'scripts/apps/viewer-adapter.mjs']) {
   const file = await safeViewerFile(toolingRoot, name);
   await remember(file, 'tooling/' + name); metadata.tooling.files.push(checked.get(file));
  }
  await save('adaptation.json', metadata);
  const isolate = options.isolated === true;
  const isolationHeaders = isolate ? { 'cross-origin-opener-policy': 'same-origin', 'cross-origin-embedder-policy': 'require-corp' } : {};
  const capture = async (url, label, data) => {
   if (!options.captureSources || !/\.(?:js|mjs|html|wasm|map)$/.test(label)) return;
   const sha256 = hash(data), file = `sources/${sha256}.bin`;
   if (captured.has(url) && captured.get(url).sha256 !== sha256) throw Error('Served source changed: ' + url);
   await save(file, data); captured.set(url, { url, label, file, sha256, bytes: data.length });
  };
  server = http.createServer(async (request, response) => {
   let pathname;
   try {
    if (!['GET', 'HEAD'].includes(request.method)) throw Error('Unsupported request method');
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file, label, data;
    if (pathname.startsWith('/__viewer_content__/')) {
     const [id, ...parts] = pathname.slice('/__viewer_content__/'.length).split('/'), name = parts.join('/');
     const entry = mounts.get(id)?.files.get(name); if (!entry) throw Error('Content request is not allowlisted');
     file = entry.absolute; label = 'content/' + id + '/' + name; data = await remember(file, label, entry);
    } else if (pathname.startsWith('/__viewer_candidate__/')) {
     if (!candidateRoot) throw Error('Candidate package is not selected');
     const relative = pathname.slice('/__viewer_candidate__/'.length);
     file = await safeViewerFile(candidateRoot, relative); label = 'candidate/' + slash(path.relative(candidateRoot, file));
     data = await remember(file, label);
     if (relative.startsWith('addons/') && relative.endsWith('.js')) {
      const name = relative.slice('addons/'.length), original = await remember(await safeViewerFile(threeRoot, 'examples/jsm/' + name), 'three-' + route.version + '/examples/jsm/' + name);
      const expected = original.toString('utf8').replace(/from ['"]three['"]/g, `from '${'../'.repeat(name.split('/').length)}index.js'`);
      if (data.toString('utf8') !== expected) throw Error('Candidate addon differs beyond the reviewed single-core import rewrite: ' + name);
     }
    } else if (pathname.startsWith('/__viewer_runtime__/')) {
     const relative = pathname.slice('/__viewer_runtime__/'.length);
     file = await safeViewerFile(threeRoot, relative); label = 'three-' + route.version + '/' + slash(path.relative(threeRoot, file)); data = await remember(file, label);
    } else {
     const relative = pathname === '/' || pathname === '/viewer/' || pathname === '/viewer/index.html' ? 'index.html' : pathname.slice(1);
     file = await safeViewerFile(dist, relative); label = (usesPreparedDist ? 'prepared/dist/' : 'viewer/dist/') + slash(path.relative(dist, file));
     data = await remember(file, label);
     if (relative === 'index.html') data = index;
    }
    const record = { file: label, sha256: hash(data), bytes: data.length };
    if (file === path.join(dist, 'index.html')) Object.assign(record, { originalSha256: hash(originalIndex), originalBytes: originalIndex.length });
    served.set(label, record); await capture('<origin>' + pathname, label, data);
    response.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store', ...isolationHeaders });
    response.end(request.method === 'HEAD' ? undefined : data);
   } catch (error) {
    errors.push(redact(`Local request ${pathname}: ${error.message}`)); response.writeHead(404); response.end('Not found');
   }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  return { origin, url: origin + '/viewer/', out, route: routeName, metadata, save, errors, requests, redact,
   async mirrorNetwork(routeRequest) {
    const url = routeRequest.request().url();
    if (url.startsWith(origin + '/')) return routeRequest.continue();
    const normalized = url.replace('three@0.176.x/', 'three@0.176.0/');
    const resource = resources.find(item => item.url === normalized);
    if (!resource) { requests.push({ url: redact(url), blocked: true }); await routeRequest.abort(); return; }
    const data = await remember(await safeViewerFile(apps, 'vendor/' + resource.file), 'vendor/' + resource.file, resource);
    requests.push({ url, selectedURL: resource.url, sha256: hash(data), bytes: data.length, mirrored: true });
    await capture(url, 'vendor/' + resource.file, data);
    await routeRequest.fulfill({ body: data, contentType: MIME[path.extname(resource.file)] ?? 'text/javascript', headers: { 'access-control-allow-origin': '*', ...(isolate ? { 'cross-origin-resource-policy': 'cross-origin' } : {}) } });
   },
   async close() {
    if (closed) return; closed = true;
    let failure;
    try {
     await new Promise(resolve => server.close(resolve)); checkViewer();
     if (runtimeRoot) { const after = state(runtimeRoot); if (after.dirty || after.sha !== runtimeState.sha) throw Error('Runtime source changed during Viewer run'); }
     for (const [file, row] of checked) if (hash(await fs.readFile(file)) !== row.sha256) throw Error('Used file changed during Viewer run: ' + row.file);
    } catch (error) { failure = error; errors.push(redact(error.message)); }
    finally {
     await save('used-files.json', [...checked.values()].sort((a, b) => a.file.localeCompare(b.file)));
     await save('served-files.json', [...served.values()].sort((a, b) => a.file.localeCompare(b.file)));
     await save('captured-sources.json', [...captured.values()].sort((a, b) => a.url.localeCompare(b.url)));
     await save('network.json', requests); await save('errors.json', errors);
     await save('integrity.json', { unchanged: !failure, error: failure ? redact(failure.message) : null });
    }
    if (failure) throw Error(redact(failure.message));
   }
  };
 } catch (error) {
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  errors.push(redact(error.message)); await save('errors.json', errors); await save('used-files.json', [...checked.values()]);
  throw Error(redact(error.message));
 }
}

export async function openViewerRun(apps, prepared, out, options = {}) {
 const run = await createViewerServer(apps, prepared, out, options);
 const ownsBrowser = !options.browser;
 let browser, context;
 try {
  const executablePath = options.browserExecutablePath || process.env.RTHREE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  browser = options.browser ?? await chromium.launch({ executablePath, headless: false });
  context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, colorScheme: 'light', locale: 'en-US', serviceWorkers: 'block' });
  context.setDefaultTimeout(30000); await context.route('**/*', run.mirrorNetwork);
  const page = await context.newPage();
  page.on('pageerror', error => run.errors.push(run.redact(error.stack || error.message).split(run.origin).join('<origin>')));
  page.on('response', response => { if (response.status() >= 400) run.errors.push(run.redact(`HTTP ${response.status()} ${response.url().replace(run.origin, '<origin>')}`)); });
  await run.save('environment.json', { browser: browser.version(), executablePath: run.redact(executablePath), headed: true,
   viewport: { width: 1280, height: 720 }, dpr: 1, isolated: options.isolated === true,
   route: run.route, runtimeSha: run.metadata.runtimeSha, browserLifecycle: ownsBrowser ? 'owned-per-run' : 'caller-owned-process-fresh-context',
   helperSha256: hash(await fs.readFile(fileURLToPath(import.meta.url))), mode: options.mode ?? 'Viewer compatibility only; no profiles or frame timers' });
  const serverClose = run.close;
  let closed = false;
  return { ...run, page, context, browser, async close() {
   if (closed) return; closed = true;
   let failure;
   try { await context.close(); } catch (error) { failure = error; run.errors.push(run.redact(error.message)); }
   try { if (ownsBrowser) await browser.close(); } catch (error) { failure ??= error; run.errors.push(run.redact(error.message)); }
   await serverClose();
   if (failure) throw failure;
  } };
 } catch (error) {
  run.errors.push(run.redact(error.message)); await context?.close().catch(() => {}); if (ownsBrowser) await browser?.close().catch(() => {});
  await run.close(); throw error;
 }
}
