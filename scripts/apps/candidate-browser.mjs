import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { hash, gpu } from './browser.mjs';

export { hash, gpu };

const APP_PINS = {
 viewer: 'b5ee5dafe27f953ae1b55f42b5fa3697fef08683',
 editor: '9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8'
};
const EDITOR_INDEX = 'editor/editor/index.html';
const EDITOR_INDEX_SHA256 = '1e186dca4fd7f15d3fea1f137406e250786b5fcd2451cf8677c65a77946aad36';
const CANDIDATE_PREFIX = '/__rthree_candidate__/';
const ENTRIES = { 'prepared-js': 'prepared-js.js', 'prepared-wasm': 'prepared.js' };
const MIME = {
 '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html',
 '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm',
 '.png': 'image/png', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary',
 '.gltf': 'model/gltf+json', '.ico': 'image/x-icon', '.ttf': 'font/ttf',
 '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
 '.webp': 'image/webp', '.ktx2': 'image/ktx2'
};
const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const inside = (root, file) => file === root || file.startsWith(root + path.sep);
const publicPath = file => file.split(path.sep).join('/');

export function parseRunOptions(args = process.argv.slice(4), defaultApp = 'all') {
 const options = { engine: 'original', app: defaultApp };
 const allowed = new Set(['engine', 'app', 'candidateRoot', 'candidateSha']);
 const seen = new Set();
 for (const arg of args) {
  const separator = arg.indexOf('=');
  const key = arg.slice(0, separator), value = arg.slice(separator + 1);
  if (separator < 1 || !value || !allowed.has(key)) throw Error('Expected engine=, app=, candidateRoot= or candidateSha= option');
  if (seen.has(key)) throw Error(`Duplicate option: ${key}`);
  seen.add(key); options[key] = value;
 }
 if (!['original', 'prepared-js', 'prepared-wasm'].includes(options.engine)) throw Error('engine must be original, prepared-js or prepared-wasm');
 if (!['all', 'editor'].includes(options.app) || (defaultApp === 'editor' && options.app !== 'editor')) throw Error(defaultApp === 'editor' ? 'UI checks support app=editor only' : 'app must be all or editor');
 if (options.engine !== 'original' && options.app !== 'editor') throw Error('Candidate engines require app=editor; Viewer remains original');
 if (options.engine !== 'original' && !options.candidateRoot) throw Error('Candidate engine requires candidateRoot');
 if (options.candidateSha && (!options.candidateRoot || !/^[0-9a-f]{40}$/.test(options.candidateSha))) throw Error('candidateSha requires candidateRoot and a full lowercase source SHA');
 return options;
}

async function safeFile(root, relative) {
 let file = path.resolve(root, relative);
 if (!inside(root, file)) throw Error('Request escaped its allowed root');
 if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
 file = await fs.realpath(file);
 if (!inside(root, file)) throw Error('Symlink escaped its allowed root');
 if (!(await fs.stat(file)).isFile()) throw Error('Requested path is not a file');
 return file;
}

function sourceState(root, untracked = false) {
 return {
  sha: git(root, ['rev-parse', 'HEAD']),
  dirty: Boolean(git(root, ['status', '--porcelain', untracked ? '--untracked-files=normal' : '--untracked-files=no']))
 };
}

function makeOverlay(original, engine) {
 if (hash(original) !== EDITOR_INDEX_SHA256) throw Error('Pinned Editor index.html hash mismatch');
 const before = original.toString('utf8');
 if (engine === 'original') return { data: original, patch: '', edits: [] };
 const edits = [
  ['"three": "../build/three.module.js"', `"three": "${CANDIDATE_PREFIX}${ENTRIES[engine]}"`],
  ['"three/addons/": "../examples/jsm/"', `"three/addons/": "${CANDIDATE_PREFIX}addons/"`],
  ["\t\t\timport * as THREE from 'three';", "\t\t\timport * as THREE from 'three';\n\t\t\tawait THREE.init();"],
  ...['Editor','Viewport','Toolbar','Script','Player','Sidebar','Menubar','Resizer','AnimationResizer','Animation'].map(name =>
   [`\t\t\timport { ${name} } from './js/${name}.js';`, `\t\t\tconst { ${name} } = await import('./js/${name}.js');`]),
  ["\t\t\timport { TextGeometry } from 'three/addons/geometries/TextGeometry.js';", "\t\t\tconst { TextGeometry } = await import('three/addons/geometries/TextGeometry.js');"]
 ];
 let after = before;
 for (const [from, to] of edits) {
  if (after.split(from).length !== 2) throw Error('Editor overlay anchor must occur exactly once');
  after = after.replace(from, to);
 }
 // A complete-file unified hunk is intentional: the preserved source and every
 // changed byte are reviewable without relying on machine-specific file names.
 const oldLines = before.replace(/\n$/, '').split('\n');
 const newLines = after.replace(/\n$/, '').split('\n');
 const patch = ['--- a/' + EDITOR_INDEX, '+++ b/' + EDITOR_INDEX,
  `@@ -1,${oldLines.length} +1,${newLines.length} @@`,
  ...oldLines.map(line => '-' + line), ...newLines.map(line => '+' + line), ''].join('\n');
 return { data: Buffer.from(after), patch, edits: edits.map(([from, to]) => ({ from, to })) };
}

// Drop-in openRun replacement. Only Editor's WebGL route is adapted; Viewer,
// WebGPU, path-tracer source and their existing mappings remain present.
export async function openRun(rootArg, outArg, options = {}) {
 const root = await fs.realpath(path.resolve(rootArg));
 const out = path.resolve(outArg);
 await fs.mkdir(out, { recursive: false });
 const engine = options.engine ?? 'original';
 const toolingRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
 let candidateRoot, candidatePackage, candidate, browser, context, server;
 const requests = [], errors = [], served = new Map(), checkedFiles = new Map();
 const redactions = [[root, '<apps>'], [out, '<output>'], [toolingRoot, '<tooling>'], [os.homedir(), '<home>']];
 const redact = value => redactions.reduce((s, [from, to]) => s.split(from).join(to), String(value));
 const save = async (name, data) => {
  const file = path.resolve(out, name);
  if (!inside(out, file) || file === out) throw Error('Invalid output file name');
  await fs.writeFile(file, typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
 };
 const remember = (file, label, data) => {
  const sha256 = hash(data), previous = checkedFiles.get(file);
  if (previous && previous.sha256 !== sha256) throw Error(`File changed during run: ${label}`);
  const record = { file: label, sha256, bytes: data.length };
  checkedFiles.set(file, record);
  return record;
 };
 const checkApps = () => {
  for (const [app, sha] of Object.entries(APP_PINS)) {
   const state = sourceState(path.join(root, app));
   if (state.sha !== sha || state.dirty) throw Error(`Wrong or modified pinned ${app} source`);
  }
 };
 try {
  if (engine !== 'original' && !Object.hasOwn(ENTRIES, engine)) throw Error('engine must be original, prepared-js or prepared-wasm');
  if (engine !== 'original' && !options.candidateRoot) throw Error('Candidate engine requires candidateRoot');
  checkApps();
  const resources = JSON.parse(await fs.readFile(new URL('./resources.json', import.meta.url)));
  for (const resource of resources) {
   const file = await safeFile(root, 'vendor/' + resource.file);
   const data = await fs.readFile(file);
   if (hash(data) !== resource.sha256) throw Error(`Bad resource ${resource.file}`);
   remember(file, 'vendor/' + resource.file, data);
  }
  if (options.candidateRoot) {
   candidateRoot = await fs.realpath(path.resolve(options.candidateRoot));
   redactions.unshift([candidateRoot, '<candidate>']);
   const state = sourceState(candidateRoot, true);
   if (state.dirty) throw Error('Candidate source must be clean');
   if (options.candidateSha && options.candidateSha !== state.sha) throw Error('Candidate SHA does not match requested SHA');
   candidatePackage = await fs.realpath(path.join(candidateRoot, 'packages/rthree'));
   if (!inside(candidateRoot, candidatePackage)) throw Error('Candidate package escaped its checkout');
   const packageJSON = JSON.parse(await fs.readFile(path.join(candidateRoot, 'package.json')));
   if (packageJSON.devDependencies?.three !== '0.186.1') throw Error('Candidate must use Three.js 0.186.1');
   const files = ['package.json', 'package-lock.json', 'Cargo.lock', 'rust-toolchain.toml', 'scripts/build.mjs'];
   const entries = await fs.readdir(candidatePackage, { withFileTypes: true });
   for (const entry of entries) {
    if (entry.isFile() && (/\.(?:js|wasm)$/.test(entry.name) || entry.name === 'package.json')) files.push('packages/rthree/' + entry.name);
   }
   for (const required of ['core.js', 'runtime.js', 'index.js', 'prepared.js', 'prepared-js.js', 'scene_core.wasm']) {
    if (!files.includes('packages/rthree/' + required)) throw Error(`Candidate build is missing ${required}`);
   }
   const artifacts = [];
   for (const relative of files.sort()) {
    const file = await safeFile(candidateRoot, relative);
    artifacts.push(remember(file, 'candidate/' + relative, await fs.readFile(file)));
   }
   candidate = { sha: state.sha, dirty: false, artifacts,
    buildProvenance: 'Existing build artifacts are hashed; this helper does not build or certify their source-to-build correspondence.' };
  }
  const indexFile = await safeFile(root, EDITOR_INDEX);
  const originalIndex = await fs.readFile(indexFile);
  const overlay = makeOverlay(originalIndex, engine);
  remember(indexFile, EDITOR_INDEX, originalIndex);
  await save('adaptation.json', { engine, app: options.app ?? 'all', scope: 'Pinned Editor WebGL compatibility only', appSources: APP_PINS,
   editor: { file: EDITOR_INDEX, originalSha256: hash(originalIndex), originalBytes: originalIndex.length, servedSha256: hash(overlay.data), servedBytes: overlay.data.length, edits: overlay.edits },
   candidate: candidate ?? null, unchangedBackendsOutsideComparison: ['WebGPU', 'path tracer'],
   viewer: 'Original bundled application; candidate routes do not replace its engine' });
  await save('editor-index.patch', overlay.patch);
  await save('editor-index.original.html', originalIndex.toString('utf8'));
  await save('editor-index.served.html', overlay.data.toString('utf8'));

  server = http.createServer(async (req, res) => {
   let pathname = '';
   try {
    if (req.method !== 'GET' && req.method !== 'HEAD') throw Error('Only GET and HEAD are supported');
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.includes('\0')) throw Error('Invalid request path');
    const isCandidate = pathname.startsWith(CANDIDATE_PREFIX);
    if (isCandidate && (!candidatePackage || engine === 'original')) throw Error('Candidate route is disabled');
    const relative = isCandidate ? pathname.slice(CANDIDATE_PREFIX.length)
     : (pathname.startsWith('/assets/') ? 'viewer/dist' + pathname : pathname.slice(1));
    const file = await safeFile(isCandidate ? candidatePackage : root, relative);
    const label = isCandidate ? 'candidate/packages/rthree/' + publicPath(path.relative(candidatePackage, file)) : publicPath(path.relative(root, file));
    const source = await fs.readFile(file);
    const record = remember(file, label, source);
    // Generated addons intentionally resolve to the package's same index/core.
    // Reject an accidentally unbuilt addon tree instead of loading another core.
    if (isCandidate && relative.startsWith('addons/') && file.endsWith('.js') && /\bfrom\s*['"]three['"]/.test(source.toString('utf8'))) throw Error('Candidate addon still has an unrewritten bare three import');
    const data = file === indexFile ? overlay.data : source;
    served.set(label, { ...record, sha256: hash(data), bytes: data.length, ...(file === indexFile ? { originalSha256: record.sha256, originalBytes: source.length, adapted: engine !== 'original' } : {}) });
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : data);
   } catch (error) {
    errors.push(redact(`Local request ${pathname}: ${error.message}`));
    res.writeHead(404); res.end('Not found');
   }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const executablePath = process.env.RTHREE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  browser = await chromium.launch({ executablePath, headless: false });
  context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, colorScheme: 'light', locale: 'en-US', serviceWorkers: 'block' });
  await context.route('**/*', async route => {
   const url = route.request().url();
   if (url.startsWith(origin + '/')) return route.continue();
   const normalized = url.replace('three@0.176.x/', 'three@0.176.0/');
   const resource = resources.find(item => item.url === normalized);
   if (resource) {
    const file = await safeFile(root, 'vendor/' + resource.file), data = await fs.readFile(file);
    remember(file, 'vendor/' + resource.file, data);
    requests.push({ url, sha256: resource.sha256, mirrored: true });
    return route.fulfill({ body: data, contentType: MIME[path.extname(resource.file)] || 'text/javascript', headers: { 'access-control-allow-origin': '*' } });
   }
   requests.push({ url: redact(url), blocked: true }); await route.abort();
  });
  context.setDefaultTimeout(20000);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(redact(error.stack || error.message).split(origin).join('<origin>')));
  page.on('response', response => { if (response.status() >= 400) errors.push(redact(`HTTP ${response.status()} ${response.url().replace(origin, '<origin>')}`)); });
  const tooling = sourceState(toolingRoot, true);
  await save('environment.json', { browser: browser.version(), executablePath: redact(executablePath), toolingSha: tooling.sha,
   toolingDirty: tooling.dirty, helperSha256: hash(await fs.readFile(fileURLToPath(import.meta.url))),
   engine, app: options.app ?? 'all', candidateSha: candidate?.sha ?? null, headed: true, viewport: { width: 1280, height: 720 }, dpr: 1,
   mode: options.mode || 'Candidate-aware correctness only; no profiles, timers or frame samples' });
  let closed = false;
  return { root, out, origin, page, context, save, requests, errors, engine, candidateSha: candidate?.sha ?? null,
   async close() {
    if (closed) return;
    closed = true;
    let integrityError;
    try {
     // Quiesce requests before checking the artifacts that were actually used.
     await browser.close();
     await new Promise(resolve => server.close(resolve));
     checkApps();
     if (candidateRoot) {
      const state = sourceState(candidateRoot, true);
      if (state.sha !== candidate.sha || state.dirty) throw Error('Candidate source changed during run');
     }
     for (const [file, record] of checkedFiles) {
      if (hash(await fs.readFile(file)) !== record.sha256) throw Error(`File changed during run: ${record.file}`);
     }
    } catch (error) { integrityError = error; errors.push(redact(error.message)); }
    finally {
     await browser.close().catch(() => {});
     if (server.listening) await new Promise(resolve => server.close(resolve));
     await save('served-files.json', [...served.values()].sort((a, b) => a.file.localeCompare(b.file)));
     await save('network.json', requests);
     await save('errors.json', errors);
     await save('integrity.json', { unchanged: !integrityError, error: integrityError ? redact(integrityError.message) : null });
    }
    if (integrityError) throw Error(redact(integrityError.message));
   }
  };
 } catch (error) {
  errors.push(redact(error.message));
  if (browser) await browser.close().catch(() => {});
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  await save('errors.json', errors);
  await save('served-files.json', [...served.values()]);
  await save('network.json', requests);
  throw Error(redact(error.message));
 }
}
