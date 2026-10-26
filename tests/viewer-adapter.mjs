import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { VIEWER_BOOTSTRAP, VIEWER_ROUTES, readyStateStartup, routeImportMap, injectViewerImportMap, adaptViewerSource, replaceOnce, assertExternalizedModules, isThreeSpecifier, normalizeViewerSourceMap, viewerDistribution } from '../scripts/apps/viewer-adapter.mjs';
import { safeViewerFile } from '../scripts/apps/viewer-browser.mjs';

function documentFixture(readyState) {
 const listeners = [];
 const document = { readyState, body: {}, addEventListener(name, callback, options) { assert.equal(name, 'DOMContentLoaded'); listeners.push({ callback, options }); } };
 let starts = 0;
 const context = vm.createContext({ document, location: {}, console: { info() {} }, window: { VIEWER: {} }, __rthreeViewerBootstrap: { appStarts: 0 }, App: class { constructor() { starts++; } } });
 return { document, context, listeners, starts: () => starts, load() { vm.runInContext(readyStateStartup(), context); }, fire() { document.readyState = 'interactive'; for (const item of listeners) item.callback(); } };
}

test('startup preserves DOMContentLoaded and starts at most once even if invoked twice', () => {
 const f = documentFixture('loading'); f.load();
 assert.equal(f.starts(), 0); assert.equal(f.listeners.length, 1); assert.equal(f.listeners[0].options.once, true);
 f.fire(); f.fire(); assert.equal(f.starts(), 1); assert.equal(f.context.__rthreeViewerBootstrap.appStarts, 1); assert(f.context.window.VIEWER.app);
});

test('already interactive/complete documents start once without fabricating a DOM event', () => {
 for (const state of ['interactive', 'complete']) {
  const f = documentFixture(state); f.load();
  assert.equal(f.starts(), 1); assert.equal(f.listeners.length, 0); assert.equal(f.context.__rthreeViewerBootstrap.appStarts, 1);
 }
});

test('delayed Wasm initialization completes before importing app after DOMContentLoaded', async () => {
 const f = documentFixture('loading'); let resolveInit, imported = false, initCalls = 0;
 delete f.context.__rthreeViewerBootstrap;
 f.context.THREE = { init() { initCalls++; return new Promise(resolve => { resolveInit = resolve; }); } };
 f.context.setTimeout = () => { throw Error('Unexpected startup failure'); };
 f.context.loadApp = async () => { imported = true; f.load(); };
 const executable = VIEWER_BOOTSTRAP.replace("import * as THREE from 'three';", '').replace("await import('./src/app.js');", 'await loadApp();');
 vm.runInContext(executable, f.context);
 assert.equal(initCalls, 1); assert.equal(imported, false); assert.equal(f.starts(), 0);
 f.fire(); resolveInit(); await f.context.__rthreeViewerBootstrap.ready;
 assert.equal(imported, true); assert.equal(f.starts(), 1); assert.equal(f.context.__rthreeViewerBootstrap.initCalls, 1); assert.equal(f.context.__rthreeViewerBootstrap.appStarts, 1);
});

test('initialization failure is preserved and application construction never starts', async () => {
 const f = documentFixture('complete'); delete f.context.__rthreeViewerBootstrap;
 const errors = []; f.context.THREE = { init: async () => { throw Error('wasm init rejected'); } };
 f.context.setTimeout = callback => errors.push(callback);
 f.context.loadApp = async () => { f.load(); };
 vm.runInContext(VIEWER_BOOTSTRAP.replace("import * as THREE from 'three';", '').replace("await import('./src/app.js');", 'await loadApp();'), f.context);
 await assert.rejects(f.context.__rthreeViewerBootstrap.ready, /wasm init rejected/);
 assert.equal(f.starts(), 0); assert.equal(f.context.__rthreeViewerBootstrap.phase, 'failed'); assert.equal(errors.length, 1);
 assert.throws(errors[0], /wasm init rejected/);
});

test('pure upstream bootstrap imports the app without inventing an init call', async () => {
 const f = documentFixture('complete'); delete f.context.__rthreeViewerBootstrap;
 f.context.THREE = {}; f.context.setTimeout = () => { throw Error('Unexpected failure'); }; f.context.loadApp = async () => f.load();
 vm.runInContext(VIEWER_BOOTSTRAP.replace("import * as THREE from 'three';", '').replace("await import('./src/app.js');", 'await loadApp();'), f.context);
 await f.context.__rthreeViewerBootstrap.ready;
 assert.equal(f.starts(), 1); assert.equal(f.context.__rthreeViewerBootstrap.initCalls, 0);
});

test('all externalized routes retain one app bootstrap and explicit same-core addon maps', () => {
 assert.equal(routeImportMap('original-r176'), null);
 for (const [name, route] of Object.entries(VIEWER_ROUTES)) {
  if (!route.externalized) continue;
  const map = routeImportMap(name).imports;
  assert.deepEqual(Object.keys(map).sort(), ['three', 'three/addons/']);
  if (route.candidate) { assert(map.three.startsWith('/__viewer_candidate__/')); assert.equal(map['three/addons/'], '/__viewer_candidate__/addons/'); }
  else { assert.equal(map.three, '/__viewer_runtime__/build/three.module.js'); assert.equal(map['three/addons/'], '/__viewer_runtime__/examples/jsm/'); }
 }
 assert.throws(() => routeImportMap('unreviewed-route'), /Unknown/);
});

test('HTML injection is import-map-only, ordered before the native module and duplicate-safe', () => {
 const html = '<!doctype html>\n<head>\n<script type="module" src="/assets/shared.js"></script>\n</head><body>native controls</body>';
 assert.equal(injectViewerImportMap(html, 'original-r176'), html);
 const adapted = injectViewerImportMap(html, 'prepared-wasm-r186');
 assert(adapted.indexOf('importmap') < adapted.indexOf('type="module"'));
 assert.equal(adapted.replace(/\n\t<script type="importmap">.*?<\/script>/, ''), html);
 assert.throws(() => injectViewerImportMap(adapted, 'prepared-js-r186'), /already/);
});

test('source and anchor changes reject instead of applying speculative overlays', () => {
 let transformCalled=false;
 assert.throws(()=>adaptViewerSource('src/app.js',Buffer.from('changed source'),{beforeAdapt:()=>{transformCalled=true;return 'unsafe';}}),/hash mismatch/);
 assert.equal(transformCalled,false);
 assert.throws(() => adaptViewerSource('src/app.js', Buffer.from('changed source')), /hash mismatch/);
 assert.throws(() => adaptViewerSource('unexpected.js', Buffer.from('anything')), /hash mismatch/);
 assert.throws(() => replaceOnce('absent', 'anchor', 'replacement'), /exactly once/);
 assert.throws(() => replaceOnce('anchor anchor', 'anchor', 'replacement'), /exactly once/);
});

test('instrumented bundled r176 cannot be mixed with external candidate/control routes',()=>{
 assert.deepEqual(viewerDistribution('original-r176',{}),{bundledTimingControl:false,usesPreparedDist:false});
 assert.deepEqual(viewerDistribution('original-r176',{instrumentation:'timing',externalized:false}),{bundledTimingControl:true,usesPreparedDist:true});
 assert.deepEqual(viewerDistribution('pure-r186',{instrumentation:'timing',externalized:true}),{bundledTimingControl:false,usesPreparedDist:true});
 assert.throws(()=>viewerDistribution('original-r176',{instrumentation:'timing',externalized:true}),/separate bundled/);
 assert.throws(()=>viewerDistribution('prepared-wasm-r186',{instrumentation:'timing',externalized:false}),/cannot use a bundled/);
 assert.throws(()=>viewerDistribution('pure-r186',{instrumentation:'unknown'}),/Unknown/);
});

test('externalization catches all three imports and rejects embedded core/addons', () => {
 for (const id of ['three', 'three/addons/loaders/GLTFLoader.js', 'three/src/Three.js']) assert(isThreeSpecifier(id));
 for (const id of ['three-other', './three.js', 'dat.gui']) assert(!isThreeSpecifier(id));
 assertExternalizedModules(['/app/src/app.js', '/app/node_modules/dat.gui/index.js']);
 for (const id of ['/app/node_modules/three/build/three.module.js', '/app/node_modules/three/examples/jsm/loaders/GLTFLoader.js', 'C:\\app\\node_modules\\three\\src\\Three.js']) assert.throws(() => assertExternalizedModules([id]), /bundled Three/);
});

test('server paths reject traversal and symlink escape while accepting an in-root file', async () => {
 const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'viewer-security-'));
 try {
  const root = path.join(temporary, 'root'); await fs.mkdir(root); await fs.writeFile(path.join(root, 'ok.js'), 'ok'); await fs.writeFile(path.join(temporary, 'secret'), 'outside');
  await fs.symlink(path.join(temporary, 'secret'), path.join(root, 'link'));
  assert.equal(await safeViewerFile(root, 'ok.js'), await fs.realpath(path.join(root, 'ok.js')));
  await assert.rejects(safeViewerFile(root, '../secret'), /escaped/);
  await assert.rejects(safeViewerFile(root, 'link'), /Symlink escaped/);
  await assert.rejects(safeViewerFile(root, 'bad\0name'), /Invalid/);
 } finally { await fs.rm(temporary, { recursive: true, force: true }); }
});

test('source-map normalization preserves mappings, names and original source bodies', () => {
 const map = {version:3,file:'app.js',sources:['../private/app.js','../deps/library.js'],sourcesContent:['const x = 1;','export const y = 2;'],names:['x','y'],mappings:'AAAA,CAAC;AACD'};
 const before = JSON.stringify(map);
 const result = normalizeViewerSourceMap(map, (_, index) => 'public/' + index + '.js');
 assert.equal(JSON.stringify(map), before);
 assert.deepEqual(result.map.sources, ['public/0.js','public/1.js']);
 assert.deepEqual({...result.map,sources:[]},{...map,sources:[]});
 assert.equal(result.proof.nonPathPayloadUnchanged,true);
 assert.throws(()=>normalizeViewerSourceMap({...map,sourcesContent:[]},x=>x),/structure/);
 assert.throws(()=>normalizeViewerSourceMap({...map,sourceRoot:'/private'},x=>x),/structure/);
});
