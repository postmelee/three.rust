import { createHash } from 'node:crypto';

export const hash = value => createHash('sha256').update(value).digest('hex');
export const VIEWER_PIN = 'b5ee5dafe27f953ae1b55f42b5fa3697fef08683';
export const VIEWER_SOURCE_HASHES = Object.freeze({
 'index.html': '4f344b2c9ba276dd86d2ec0c011c5396cb779094e3ca99c8f6f79ba7766742fa',
 'src/app.js': 'dae069bc2655bb37db1beb88a836bb031c4c890e376db1feb25ad371b69d13f6',
 'src/viewer.js': '506b3246b0f7e994e448e708abb64d01c4262964198c195de7cef73e173264cb',
 'package.json': '8e0511ce95d18896009272fb95da6ea8bb0ec720ffc93df5f9712d5c93d94153',
 'yarn.lock': '0de5cea95be0d2ea2530c4d05edeab221b878bb2d8a134b5e429005667922b1a'
});
export const VIEWER_ROUTES = Object.freeze({
 'original-r176': { revision: '176', version: '0.176.0', externalized: false, candidate: false },
 'external-r176': { revision: '176', version: '0.176.0', externalized: true, candidate: false },
 'pure-r186': { revision: '186', version: '0.186.1', externalized: true, candidate: false },
 'prepared-js-r186': { revision: '186', version: '0.186.1', externalized: true, candidate: true, entry: 'prepared-js.js', engine: 'prepared-js' },
 'prepared-wasm-r186': { revision: '186', version: '0.186.1', externalized: true, candidate: true, entry: 'prepared.js', engine: 'prepared-wasm' }
});

export const ORIGINAL_STARTUP = `document.addEventListener('DOMContentLoaded', () => {
\tconst app = new App(document.body, location);

\twindow.VIEWER.app = app;

\tconsole.info('[glTF Viewer] Debugging data exported as \u0060window.VIEWER\u0060.');
});`;

export function readyStateStartup() {
 return `let viewerAppStarted = false;
const startViewerApp = () => {
\tif (viewerAppStarted) return;
\tviewerAppStarted = true;
\tglobalThis.__rthreeViewerBootstrap.appStarts++;
\tconst app = new App(document.body, location);

\twindow.VIEWER.app = app;

\tconsole.info('[glTF Viewer] Debugging data exported as \u0060window.VIEWER\u0060.');
};
if (document.readyState === 'loading') {
\tdocument.addEventListener('DOMContentLoaded', startViewerApp, { once: true });
} else {
\tstartViewerApp();
}`;
}

// Identical for externalized r176, pure r186 and both candidate routes. The only
// route selection is the HTML import map; application evaluation follows init.
export const VIEWER_BOOTSTRAP = `import * as THREE from 'three';
if (globalThis.__rthreeViewerBootstrap) throw Error('Viewer bootstrap evaluated twice');
const state = globalThis.__rthreeViewerBootstrap = { initCalls: 0, appStarts: 0, phase: 'created', error: null };
state.ready = (async () => {
 if (typeof THREE.init === 'function') {
  state.phase = 'initializing';
  state.initCalls++;
  await THREE.init();
 }
 state.phase = 'importing-app';
 await import('./src/app.js');
 state.phase = 'app-module-loaded';
})();
state.ready.catch(error => {
 state.error = String(error?.stack || error);
 state.phase = 'failed';
 setTimeout(() => { throw error; }, 0);
});
`;

export function replaceOnce(source, before, after) {
 if (source.split(before).length !== 2) throw Error('Viewer overlay anchor must occur exactly once');
 return source.replace(before, after);
}

export function fullPatch(file, original, adapted) {
 const before = original.replace(/\n$/, '').split('\n'), after = adapted.replace(/\n$/, '').split('\n');
 return [`--- a/${file}`, `+++ b/${file}`, `@@ -1,${before.length} +1,${after.length} @@`, ...before.map(line => '-' + line), ...after.map(line => '+' + line), ''].join('\n');
}

export function adaptViewerSource(file, bytes, { beforeAdapt } = {}) {
 if (!Object.hasOwn(VIEWER_SOURCE_HASHES, file) || hash(bytes) !== VIEWER_SOURCE_HASHES[file]) throw Error(`Pinned Viewer source hash mismatch: ${file}`);
 const original = bytes.toString('utf8');
 let adapted = beforeAdapt ? beforeAdapt(file, bytes) : original;
 if (typeof adapted !== 'string') throw Error('Viewer source transform must return text');
 if (file === 'index.html') adapted = replaceOnce(adapted, '<script defer type="module" src="src/app.js"></script>', '<script defer type="module" src="viewer-bootstrap.js"></script>');
 if (file === 'src/app.js') adapted = replaceOnce(adapted, ORIGINAL_STARTUP, readyStateStartup());
 if (file === 'src/viewer.js') adapted = replaceOnce(adapted, 'const THREE_PATH = `https://unpkg.com/three@0.${REVISION}.x`;', "const THREE_PATH = '/__viewer_runtime__';");
 return { original, adapted, originalSha256: hash(original), adaptedSha256: hash(adapted), patch: original === adapted ? '' : fullPatch(file, original, adapted) };
}

export function routeImportMap(routeName) {
 const route = VIEWER_ROUTES[routeName];
 if (!route) throw Error('Unknown Viewer route');
 if (!route.externalized) return null;
 return { imports: route.candidate ? {
  three: '/__viewer_candidate__/' + route.entry,
  'three/addons/': '/__viewer_candidate__/addons/'
 } : {
  three: '/__viewer_runtime__/build/three.module.js',
  'three/addons/': '/__viewer_runtime__/examples/jsm/'
 } };
}

export function injectViewerImportMap(html, routeName) {
 const importMap = routeImportMap(routeName);
 if (!importMap) return html;
 if (/type\s*=\s*['"]importmap['"]/.test(html)) throw Error('Viewer HTML already contains an import map');
 return replaceOnce(html, '<head>', '<head>\n\t<script type="importmap">' + JSON.stringify(importMap) + '</script>');
}

export function viewerDistribution(routeName, manifest) {
 const route = VIEWER_ROUTES[routeName];
 if (!route) throw Error('Unknown Viewer route');
 if (![undefined, null, 'timing'].includes(manifest.instrumentation) || ![undefined, true, false].includes(manifest.externalized)) throw Error('Unknown Viewer preparation kind');
 const bundledTimingControl = routeName === 'original-r176' && manifest.instrumentation === 'timing' && manifest.externalized === false;
 if (manifest.externalized === false && manifest.instrumentation !== 'timing') throw Error('Bundled preparation requires declared timing instrumentation');
 if (route.externalized && manifest.externalized === false) throw Error('Externalized route cannot use a bundled preparation');
 if (routeName === 'original-r176' && manifest.instrumentation === 'timing' && !bundledTimingControl) throw Error('Original r176 timing requires its separate bundled preparation');
 return { bundledTimingControl, usesPreparedDist: route.externalized || bundledTimingControl };
}

export const isThreeSpecifier = id => id === 'three' || id.startsWith('three/');

export function assertExternalizedModules(modules) {
 const bundled = modules.filter(id => /(?:^|[/\\])node_modules[/\\]three(?:[/\\]|$)/.test(id));
 if (bundled.length) throw Error('Externalized Viewer unexpectedly bundled Three.js: ' + bundled.join(', '));
}

export function normalizeViewerSourceMap(map, label) {
 if (!Array.isArray(map.sources) || !Array.isArray(map.sourcesContent) || map.sources.length !== map.sourcesContent.length || typeof map.mappings !== 'string' || map.sourceRoot) throw Error('Unexpected Viewer source-map structure');
 const unchangedPayload = value => hash(JSON.stringify({ ...value, sources: [] }));
 const before = unchangedPayload(map);
 const result = { ...map, sources: map.sources.map(label) };
 if (before !== unchangedPayload(result)) throw Error('Source-map normalization changed non-path content');
 return { map: result, proof: { sourceCount: map.sources.length, mappingsSha256: hash(map.mappings), sourcesContentSha256: hash(JSON.stringify(map.sourcesContent)), unchangedNonPathPayloadSha256: before, nonPathPayloadUnchanged: true } };
}
