import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root = new URL('./', import.meta.url);
const hash = value => createHash('sha256').update(value).digest('hex');
const index = JSON.parse(readFileSync(new URL('archive-index.json', root)));
for (const item of index.files) {
  const payload = readFileSync(new URL(item.path, root));
  assert.equal(hash(payload), item.sha256, item.path);
  const decoded = item.gzip ? gunzipSync(payload) : payload;
  assert.equal(hash(decoded), item.decodedSha256, item.path);
  JSON.parse(decoded);
}
const read = relative => {
  try { return JSON.parse(readFileSync(new URL(relative, root))); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  return JSON.parse(gunzipSync(readFileSync(new URL(`${relative}.gz`, root))));
};
let fullRuns = 0, fullFrames = 0, smokeRuns = 0, smokeFrames = 0;
let runFailures = 0, blockFailures = 0; const finalHashes = new Set();
for (const suite of ['smoke', 'js', 'original', 'js-long-warmup']) {
  const manifest = read(`${suite}/manifest.json`), summary = read(`${suite}/summary.json`);
  assert.equal(manifest.status, 'complete');
  assert.equal(manifest.reference.commit, '9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7');
  assert.equal(manifest.reference.dirty, false); assert.equal(manifest.tooling.dirty, false);
  assert.equal(manifest.tooling.commit, suite === 'js-long-warmup' ? '2894e7f39545ba2430c7f212a82990455daee466' : '9ce1301888777f11a85aff0c7a117ab7b19ec0e3');
  assert.equal(manifest.toolHashes['bench/aa-lifecycle.mjs'], 'dfeb147682833a78ae42e391e32f46346729217b8b26cd207d0f01489ea207e6');
  for (const file of manifest.runs) {
    const r = read(`${suite}/${file}`);
    assert.equal(r.raw.length, manifest.options.samples); assert.deepEqual(r.invalid, []);
    assert.deepEqual(r.capture.errors, []); assert.equal(r.draws, 16); assert.equal(r.triangles, 9216);
    assert.equal(r.readCount, Math.floor(r.raw.length / 60));
    for (const when of ['before', 'after']) {
      const p = r.capture[when].page;
      assert.equal(p.focused, true); assert.equal(p.visibility, 'visible'); assert.equal(p.crossOriginIsolated, true);
      assert.equal(p.devicePixelRatio, 1); assert.deepEqual(p.canvas, {width:640, height:480});
      assert.match(p.gpu.renderer, /ANGLE Metal Renderer: Apple M4 Pro/);
    }
    if (suite === 'smoke') { smokeRuns++; smokeFrames += r.raw.length; }
    else { fullRuns++; fullFrames += r.raw.length; finalHashes.add(hash(JSON.stringify(r.final))); }
  }
  if (suite !== 'smoke') for (const group of summary.groups) {
    assert.equal(group.diagnosticScreenPass, false);
    for (const check of group.checks) {
      runFailures += Number(!check.runPass);
      blockFailures += check.blocks.filter(b => !b.pass).length;
    }
  }
}
assert.deepEqual([fullRuns, fullFrames, smokeRuns, smokeFrames, runFailures, blockFailures], [27, 97200, 3, 360, 9, 36]);
assert.equal(finalHashes.size, 1);
assert.equal([...finalHashes][0], 'cd07e642b45c319d37f8293f059a983e60fa60a96cb1bf7a498f3bd747a90ccf');
console.log(JSON.stringify({payloads:index.files.length, fullRuns, fullFrames, smokeRuns, smokeFrames, failedRunScreens:runFailures, failedBlockScreens:blockFailures, finalStateIdentical:true}));
