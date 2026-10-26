import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { VIEWER_PIN, VIEWER_SOURCE_HASHES, VIEWER_BOOTSTRAP, adaptViewerSource, assertExternalizedModules, isThreeSpecifier, normalizeViewerSourceMap, fullPatch, hash } from './viewer-adapter.mjs';

const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const slash = value => value.split(path.sep).join('/');
const inside = (root, file) => file === root || file.startsWith(root + path.sep);

async function filesUnder(root, relative = '') {
 const result = [];
 for (const entry of (await fs.readdir(path.join(root, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
  const name = path.join(relative, entry.name);
  if (entry.isDirectory()) result.push(...await filesUnder(root, name));
  else if (entry.isFile()) result.push(name);
  else throw Error('Unexpected link in captured files: ' + slash(name));
 }
 return result;
}

export async function prepareViewer(appsArg, outArg, options = {}) {
 if (Object.keys(options).some(key => !['instrumentation', 'externalized'].includes(key)) || (options.instrumentation !== undefined && options.instrumentation !== 'timing') || (options.externalized !== undefined && typeof options.externalized !== 'boolean')) throw Error('Invalid Viewer preparation options');
 const externalized = options.externalized !== false;
 if (!externalized && options.instrumentation !== 'timing') throw Error('Bundled reproduction is reserved for the separately instrumented r176 control');
 const apps = await fs.realpath(path.resolve(appsArg)), viewer = path.join(apps, 'viewer');
 const out = path.resolve(outArg), source = path.join(out, 'source'), dist = path.join(out, 'dist');
 await fs.mkdir(out, { recursive: false });
 const manifest = { schema: 1, status: 'preparing', viewerPin: VIEWER_PIN, node: process.version, externalized, instrumentation: options.instrumentation ?? null,
  packaging: externalized ? 'One externalized application bundle shared by external-r176, pure-r186, prepared-js-r186 and prepared-wasm-r186. Original r176 dist is preserved.' : 'Separate bundled r176 timing control with native callback instrumentation and the common startup/decoder adaptation. Preserved original r176 dist remains untouched.',
  dependencyPolicy: externalized ? 'Original Viewer package/yarn.lock and non-Three dependencies are unchanged. Three and three/* imports are externalized; the server supplies separately pinned 0.176.0 or 0.186.1 runtime packages.' : 'Original locked r176 dependencies are bundled into a separate instrumented output. No package or lockfile is modified.',
  sources: [], adaptations: [], buildInputs: [], outputs: [], sourceMaps: [], originalDist: [], warnings: [], warningCapture:'Rollup onwarn code/message/id/location/frame; default warning emission retained.', errors: [] };
 const checked = new Map();
 const checkViewer = () => {
  if (git(viewer, ['rev-parse', 'HEAD']) !== VIEWER_PIN || git(viewer, ['status', '--porcelain', '--untracked-files=no'])) throw Error('Viewer must be the clean pinned upstream source');
 };
 const remember = async (file, label) => {
  const data = await fs.readFile(file), sha256 = hash(data), prior = checked.get(file);
  if (prior && prior.sha256 !== sha256) throw Error('Input changed while preparing: ' + label);
  const row = { file: label, bytes: data.length, sha256 }; checked.set(file, row); return row;
 };
 const publicLabel = file => {
  if (inside(source, file)) return 'adapted/' + slash(path.relative(source, file));
  if (inside(viewer, file)) return 'viewer/' + slash(path.relative(viewer, file));
  throw Error('Build input escaped the pinned Viewer and generated source roots');
 };
 const save = () => fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
 try {
  checkViewer();
  const toolingRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  manifest.tooling = { sha: git(toolingRoot, ['rev-parse', 'HEAD']), dirty: Boolean(git(toolingRoot, ['status', '--porcelain', '--untracked-files=normal'])), files: [] };
  for (const name of ['scripts/apps/viewer-adapter.mjs', 'scripts/apps/viewer-prepare.mjs']) manifest.tooling.files.push(await remember(path.join(toolingRoot, name), 'tooling/' + name));
  for (const [file, expected] of Object.entries(VIEWER_SOURCE_HASHES)) if ((await remember(path.join(viewer, file), 'viewer/' + file)).sha256 !== expected) throw Error('Pinned Viewer source hash mismatch: ' + file);
  const three = JSON.parse(await fs.readFile(path.join(viewer, 'node_modules/three/package.json')));
  const vite = JSON.parse(await fs.readFile(path.join(viewer, 'node_modules/vite/package.json')));
  if (three.version !== '0.176.0' || vite.version !== '6.4.2') throw Error('Use the prepared locked Three.js 0.176.0 / Vite 6.4.2 installation');
  manifest.build = { vite: vite.version, originalThree: three.version, external: externalized ? 'three and every three/* specifier' : 'none; separate r176 bundled control', defaultViteTarget: true, sourcemap: true };
  const vendorOverlays = new Map();
  let instrumentViewerSource;
  if (options.instrumentation === 'timing') {
   const name = 'scripts/apps/viewer-timing-overlay.mjs';
   manifest.tooling.files.push(await remember(path.join(toolingRoot, name), 'tooling/' + name));
   ({ instrumentViewerSource } = await import('./viewer-timing-overlay.mjs'));
   const file = await fs.realpath(path.join(viewer, 'node_modules/dat.gui/build/dat.gui.module.js'));
   if (!inside(viewer, file)) throw Error('dat.gui timing input escaped the Viewer dependency tree');
   const original = await fs.readFile(file), originalRecord = await remember(file, 'viewer/node_modules/dat.gui/build/dat.gui.module.js');
   const adapted = instrumentViewerSource('node_modules/dat.gui/build/dat.gui.module.js', original);
   vendorOverlays.set(file, adapted);
   await fs.mkdir(path.join(out, 'adaptation'), { recursive: true });
   const stem = 'node_modules__dat.gui__build__dat.gui.module.js';
   await fs.writeFile(path.join(out, 'adaptation', stem + '.original'), original, { flag: 'wx' });
   await fs.writeFile(path.join(out, 'adaptation', stem + '.adapted'), adapted, { flag: 'wx' });
   await fs.writeFile(path.join(out, 'adaptation', stem + '.patch'), fullPatch('node_modules/dat.gui/build/dat.gui.module.js', original.toString('utf8'), adapted), { flag: 'wx' });
   manifest.adaptations.push({ file: 'node_modules/dat.gui/build/dat.gui.module.js', originalSha256: originalRecord.sha256, originalBytes: original.length, servedSha256: hash(adapted), servedBytes: Buffer.byteLength(adapted), patch: 'adaptation/' + stem + '.patch', kind: 'native GUI callback timing envelope; source file not changed' });
  }
  await fs.mkdir(source);
  const originals = git(viewer, ['ls-files', '-z']).split('\0').filter(Boolean);
  for (const relative of originals) {
   const file = path.join(viewer, relative);
   if (!inside(viewer, file)) throw Error('Invalid tracked path');
   const data = await fs.readFile(file), row = await remember(file, 'viewer/' + slash(relative));
   manifest.sources.push(row);
   await fs.mkdir(path.dirname(path.join(source, relative)), { recursive: true });
   let served = data;
   if (Object.hasOwn(VIEWER_SOURCE_HASHES, relative)) {
    const overlay = adaptViewerSource(relative, data, relative === 'src/viewer.js' && instrumentViewerSource ? { beforeAdapt: instrumentViewerSource } : {});
    if (overlay.patch) {
     served = Buffer.from(overlay.adapted);
     const stem = slash(relative).replaceAll('/', '__');
     await fs.mkdir(path.join(out, 'adaptation'), { recursive: true });
     await fs.writeFile(path.join(out, 'adaptation', stem + '.original'), data, { flag: 'wx' });
     await fs.writeFile(path.join(out, 'adaptation', stem + '.adapted'), served, { flag: 'wx' });
     await fs.writeFile(path.join(out, 'adaptation', stem + '.patch'), overlay.patch, { flag: 'wx' });
     manifest.adaptations.push({ file: slash(relative), originalSha256: row.sha256, originalBytes: data.length, servedSha256: hash(served), servedBytes: served.length, patch: 'adaptation/' + stem + '.patch' });
    }
   }
   await fs.writeFile(path.join(source, relative), served, { flag: 'wx' });
  }
  await fs.writeFile(path.join(source, 'viewer-bootstrap.js'), VIEWER_BOOTSTRAP, { flag: 'wx' });
  manifest.bootstrap = { file: 'source/viewer-bootstrap.js', sha256: hash(VIEWER_BOOTSTRAP), bytes: Buffer.byteLength(VIEWER_BOOTSTRAP) };
  // Build-only dependency link; the server never exposes generated source or this link.
  await fs.symlink(path.join(viewer, 'node_modules'), path.join(source, 'node_modules'), 'dir');
  for (const relative of await filesUnder(path.join(viewer, 'dist'))) manifest.originalDist.push(await remember(path.join(viewer, 'dist', relative), 'viewer/dist/' + slash(relative)));
  const moduleRows = new Map(), chunks = [];
  const evidencePlugin = {
   name: 'rthree-viewer-externalization-evidence',
   enforce: 'pre',
   async load(id) {
    if (!vendorOverlays.size || id.startsWith('\0')) return null;
    const clean = id.split('?')[0];
    if (!path.isAbsolute(clean)) return null;
    try { return vendorOverlays.get(await fs.realpath(clean)) ?? null; }
    catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
   },
   async transform(code, id) {
    if (id.startsWith('\0')) return null;
    const clean = id.split('?')[0];
    if (!path.isAbsolute(clean)) return null;
    try {
     const real = await fs.realpath(clean);
     if ((await fs.stat(real)).isFile()) moduleRows.set(real, await remember(real, publicLabel(real)));
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    return null;
   },
   generateBundle(options, bundle) {
    for (const output of Object.values(bundle)) if (output.type === 'chunk') {
     const ids = Object.keys(output.modules);
     if (externalized) assertExternalizedModules(ids);
     const externals = [...output.imports, ...output.dynamicImports].filter(isThreeSpecifier);
     if (externals.some(id => id !== 'three' && !id.startsWith('three/addons/'))) throw Error('Viewer requires an unreviewed Three.js deep import');
     chunks.push({ file: output.fileName, externalImports: externals, modules: ids.filter(id => !id.startsWith('\0')).map(id => publicLabel(id.split('?')[0])) });
    }
   }
  };
  await save();
  const { build } = await import(pathToFileURL(path.join(viewer, 'node_modules/vite/dist/node/index.js')).href);
  const warningText = value => value == null ? null : String(value).split(source).join('<adapted>').split(viewer).join('<viewer>').split(out).join('<output>').split(apps).join('<apps>').split(toolingRoot).join('<tooling>').replace(/\/Users\/[^/]+/g,'<home>');
  await build({ configFile: false, root: source, plugins: [evidencePlugin],
   build: { outDir: dist, emptyOutDir: false, sourcemap: true, rollupOptions: { external: externalized ? isThreeSpecifier : undefined,
    onwarn(warning, defaultHandler) {
     manifest.warnings.push({code:warning.code??null,message:warningText(warning.message),id:warningText(warning.id),location:warning.loc?{file:warningText(warning.loc.file),line:warning.loc.line??null,column:warning.loc.column??null}:null,frame:warningText(warning.frame)});
     defaultHandler(warning);
    }
   } } });
  manifest.buildInputs = [...moduleRows.values()].sort((a, b) => a.file.localeCompare(b.file));
  manifest.chunks = chunks;
  if (externalized && !chunks.some(chunk => chunk.externalImports.includes('three'))) throw Error('Missing external core import evidence');
  if (!externalized && ![...moduleRows.values()].some(row => row.file.includes('/node_modules/three/build/three.core.js'))) throw Error('Missing bundled r176 core evidence');
  for (const file of vendorOverlays.keys()) if (!moduleRows.has(file)) throw Error('dat.gui timing override was not used by the build');
  // Source-map paths are public labels; mappings and sourcesContent are unchanged.
  for (const relative of await filesUnder(dist)) if (relative.endsWith('.map')) {
   const mapFile = path.join(dist, relative), originalBytes = await fs.readFile(mapFile), map = JSON.parse(originalBytes);
   const normalized = normalizeViewerSourceMap(map, name => {
    if (name.startsWith('\0')) return '<virtual>/' + name.slice(1);
    return publicLabel(path.resolve(path.dirname(mapFile), name));
   });
   const publicBytes = JSON.stringify(normalized.map);
   await fs.writeFile(mapFile, publicBytes);
   manifest.sourceMaps.push({ file: 'dist/' + slash(relative), originalSha256: hash(originalBytes), servedSha256: hash(publicBytes), ...normalized.proof });
  }
  for (const relative of await filesUnder(dist)) {
   const data = await fs.readFile(path.join(dist, relative));
   manifest.outputs.push({ file: 'dist/' + slash(relative), bytes: data.length, sha256: hash(data) });
  }
  checkViewer();
  for (const [file, row] of checked) if (hash(await fs.readFile(file)) !== row.sha256) throw Error('Input changed while preparing: ' + row.file);
  manifest.integrity = { originalSourcesAndDistUnchanged: true, capturedInputsUnchanged: true };
  manifest.status = 'prepared';
  return manifest;
 } catch (error) {
  manifest.status = 'failed';
  manifest.errors.push(String(error.message).split(viewer).join('<viewer>').split(out).join('<output>'));
  throw error;
 } finally { await save(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 if (process.argv.length < 4) throw Error('Usage: node scripts/apps/viewer-prepare.mjs APPS_ROOT NEW_OUTPUT [instrumentation=timing] [externalized=true|false]');
 const options = {};
 for (const arg of process.argv.slice(4)) {
  const [key, value, extra] = arg.split('=');
  if (extra !== undefined || !['instrumentation', 'externalized'].includes(key) || Object.hasOwn(options, key) || !value) throw Error('Invalid Viewer preparation option');
  if (key === 'externalized' && !['true', 'false'].includes(value)) throw Error('externalized must be true or false');
  options[key] = key === 'externalized' ? value === 'true' : value;
 }
 const manifest = await prepareViewer(process.argv[2], process.argv[3], options);
 console.log(JSON.stringify({ status: manifest.status, viewerPin: manifest.viewerPin, outputs: manifest.outputs.length, originalDistUnchanged: manifest.integrity.originalSourcesAndDistUnchanged }));
}
