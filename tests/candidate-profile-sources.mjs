import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';
import { sourceHash, canonicalProfileURL, readCapturedBytes, createCapturedFrameResolver, captureProfileScripts } from '../scripts/apps/candidate-profile-sources.mjs';

async function fixture(t) {
 const run = await fs.mkdtemp(path.join(os.tmpdir(), 'rthree-profile-sources-')); t.after(() => fs.rm(run, { recursive: true, force: true }));
 await fs.mkdir(path.join(run, 'sources')); await fs.mkdir(path.join(run, 'debug-sources'));
 const sources = [], scripts = [];
 async function put(text, directory) {
  const bytes = Buffer.from(text), sha256 = sourceHash(bytes), file = `${directory}/${sha256}.bin`;
  await fs.writeFile(path.join(run, file), bytes); return { file, sha256, bytes: bytes.length };
 }
 async function add(url, label, served, compiled = served, parsed = {}) {
  const source = { url, label, ...await put(served, 'sources') }; sources.push(source);
  const script = { scriptId: String(scripts.length + 1), parsed: { url, startLine: 0, startColumn: 0, ...parsed }, kind: label.endsWith('.wasm') ? 'wasm' : 'javascript', ...await put(compiled, 'debug-sources') }; scripts.push(script);
  return { source, script };
 }
 async function resolver() {
  await fs.writeFile(path.join(run, 'captured-sources.json'), JSON.stringify(sources));
  await fs.writeFile(path.join(run, 'profile-scripts.json'), JSON.stringify(scripts));
  await fs.writeFile(path.join(run, 'served-files.json'), JSON.stringify(sources.filter(item => item.url.startsWith('<origin>/')).map(item => ({ file: item.label, sha256: item.sha256 }))));
  await fs.writeFile(path.join(run, 'network.json'), JSON.stringify(sources.filter(item => !item.url.startsWith('<origin>/')).map(item => ({ url: item.url, sha256: item.sha256, mirrored: true }))));
  return createCapturedFrameResolver(run, 'http://127.0.0.1:1234');
 }
 return { run, sources, scripts, add, resolver, put };
}
const frame = (id, functionName = 'raw', columnNumber = 0) => ({ scriptId: id, functionName, url: 'raw URL retained elsewhere', lineNumber: 0, columnNumber });

test('candidate, app and mirrored scripts resolve from archived exact bytes without app checkouts', async t => {
 const f = await fixture(t);
 for (const [url, label] of [['<origin>/__rthree_candidate__/facade-state.js', 'candidate/packages/rthree/facade-state.js'], ['<origin>/editor/editor/js/Viewport.js', 'editor/editor/js/Viewport.js'], ['https://cdn.example/module.js', 'vendor/module.js']]) await f.add(url, label, 'function materialize() { return 1; }');
 const r = await f.resolver();
 for (const script of f.scripts) { const value = r.resolve(frame(script.scriptId)); assert.equal(value.sourceStatus, 'verified-js'); assert.equal(value.label, 'materialize'); }
 assert.equal(canonicalProfileURL('http://127.0.0.1:1234/editor/x.js?v=1', 'http://127.0.0.1:1234'), '<origin>/editor/x.js?v=1');
 assert.equal(canonicalProfileURL('http://127.0.0.1:12345/x', 'http://127.0.0.1:1234'), 'http://127.0.0.1:12345/x');
});

test('adapted inline scripts require an exact served HTML slice and preserve source offsets', async t => {
 const f = await fixture(t), text = 'function bootstrap() { return 2; }';
 await f.add('<origin>/editor/editor/', 'editor/editor/index.html', `<script>${text}</script>`, text, { startColumn: 8, endLine: 0, endColumn: 8 + text.length });
 let r = await f.resolver(); assert.equal(r.resolve(frame('1', 'raw', 8)).label, 'bootstrap');
 f.scripts[0].parsed.endColumn--; r = await f.resolver(); assert.equal(r.resolve(frame('1')).sourceStatus, 'unresolved-inline-offset-mismatch');
});

test('changed, missing and path-escaping source archives fail before attribution', async t => {
 const f = await fixture(t), { source } = await f.add('<origin>/x.js', 'x.js', 'function x() {}');
 await fs.writeFile(path.join(f.run, source.file), 'changed'); await assert.rejects(f.resolver(), /hash mismatch/);
 await fs.unlink(path.join(f.run, source.file)); await assert.rejects(f.resolver(), /ENOENT/);
 await assert.rejects(readCapturedBytes(f.run, { ...source, file: '../outside' }));
});

test('debugger bytes differing from served JS fail; unknown sources and script IDs stay unresolved', async t => {
 const f = await fixture(t); await f.add('<origin>/x.js', 'x.js', 'function x() {}', 'function y() {}');
 await assert.rejects(f.resolver(), /Debugger\/served source mismatch/);
 f.scripts[0].parsed.url = 'eval://uncaptured'; const r = await f.resolver();
 assert.equal(r.resolve(frame('1')).sourceStatus, 'unresolved-script-not-served');
 assert.equal(r.resolve(frame('missing')).sourceStatus, 'unresolved-script-id');
});
test('a self-consistent source archive cannot override independent serving evidence', async t => {
 const f = await fixture(t); await f.add('<origin>/x.js', 'x.js', 'function x() {}'); await f.resolver();
 await fs.writeFile(path.join(f.run, 'served-files.json'), JSON.stringify([{ file: 'x.js', sha256: '0'.repeat(64) }]));
 await assert.rejects(createCapturedFrameResolver(f.run, 'http://127.0.0.1:1234'), /Archived\/served source hash mismatch/);
 await fs.writeFile(path.join(f.run, 'served-files.json'), '[]');
 await assert.rejects(createCapturedFrameResolver(f.run, 'http://127.0.0.1:1234'), /No serving evidence/);
});

test('Wasm script identity requires the same archived served binary, then resolves explicit indices', async t => {
 const f = await fixture(t), wasm = Buffer.from([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,7,7,1,3,114,117,110,0,0,10,4,1,2,0,11]);
 await f.add('<origin>/__rthree_candidate__/scene_core.wasm', 'candidate/packages/rthree/scene_core.wasm', wasm);
 f.scripts[0].parsed.url = 'wasm://wasm/not-a-cryptographic-hash';
 let r = await f.resolver(); const value = r.resolve(frame('1', 'wasm-function[0]'));
 assert.equal(value.sourceStatus, 'verified-wasm'); assert.equal(value.wasm.moduleSha256, sourceHash(wasm));
 assert.equal(r.resolve(frame('1', '')).sourceStatus, 'unresolved-wasm-function');
 const changed = Buffer.from(wasm); changed[24] = 120;
 Object.assign(f.scripts[0], await f.put(changed, 'debug-sources')); r = await f.resolver();
 assert.equal(r.resolve(frame('1', 'wasm-function[0]')).sourceStatus, 'unresolved-wasm-not-served');
});

test('post-profile debugger source capture preserves available bytes and explicit unavailable scripts', async t => {
 const f = await fixture(t), calls = [];
 class CDP extends EventEmitter {
  async send(method, params) {
   calls.push(method);
   if (method === 'Debugger.enable') this.emit('Debugger.scriptParsed', { scriptId: '1', url: 'http://127.0.0.1:1234/x.js', startLine: 0, startColumn: 0 });
   if (method === 'Debugger.getScriptSource') { if (params.scriptId === '0') throw Error('Native script unavailable'); return { scriptSource: 'function x() {}' }; }
   return {};
  }
 }
 const records = await captureProfileScripts(new CDP(), { nodes: [{ callFrame: { scriptId: '1' } }, { callFrame: { scriptId: '0' } }] }, f.run, 'http://127.0.0.1:1234');
 assert.equal(records[0].parsed.url, '<origin>/x.js'); assert.equal((await readCapturedBytes(f.run, records[0])).toString(), 'function x() {}');
 assert.match(records[1].unavailable, /Native/); assert.equal(calls.at(-1), 'Debugger.disable');
 assert.equal(JSON.parse(await fs.readFile(path.join(f.run, 'profile-scripts.json'))).length, 2);
});
