// Explicit integration check; requires an already prepared pinned Viewer. No browser.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createViewerServer, hash } from '../scripts/apps/viewer-browser.mjs';

if (process.argv.length !== 5) throw Error('Usage: node tests/viewer-server.mjs APPS_ROOT PREPARED_VIEWER NEW_OUTPUT');
const [apps, prepared, out] = process.argv.slice(2).map(value => path.resolve(value));
await fs.mkdir(out, { recursive: false });
const fixtureRoot = path.join(out, 'content-fixture'); await fs.mkdir(fixtureRoot);
const fixtureFile = path.join(fixtureRoot, 'model.gltf');
const fixtureBytes = Buffer.from('{"asset":{"version":"2.0"},"scenes":[{}],"scene":0}\n');
await fs.writeFile(fixtureFile, fixtureBytes, { flag: 'wx' });
const mount = { id: 'fixture', root: fixtureRoot, files: [{ file: 'model.gltf', bytes: fixtureBytes.length, sha256: hash(fixtureBytes) }] };
const checks = [];
for (const route of ['original-r176', 'external-r176']) {
 const run = await createViewerServer(apps, prepared, path.join(out, route), { route, contentRoots: [mount], captureSources: true });
 try {
  const htmlResponse = await fetch(run.url), html = await htmlResponse.text();
  assert.equal(htmlResponse.status, 200); assert.equal(html.includes('type="importmap"'), route === 'external-r176');
  const content = await fetch(run.origin + '/__viewer_content__/fixture/model.gltf');
  assert.equal(content.status, 200); assert.equal(hash(Buffer.from(await content.arrayBuffer())), mount.files[0].sha256);
  const unlisted = await fetch(run.origin + '/__viewer_content__/fixture/unlisted.gltf'); assert.equal(unlisted.status, 404);
  const core = await fetch(run.origin + '/__viewer_runtime__/build/three.module.js'); assert.equal(core.status, 200);
  assert.equal(hash(Buffer.from(await core.arrayBuffer())), hash(await fs.readFile(path.join(apps, 'viewer/node_modules/three/build/three.module.js'))));
  assert.equal(run.errors.length, 1); assert.match(run.errors[0], /not allowlisted/);
 } finally { await run.close(); }
 const integrity = JSON.parse(await fs.readFile(path.join(out, route, 'integrity.json'))); assert.equal(integrity.unchanged, true);
 checks.push({ name: route + '-transport', pass: true, sourceAndUsedFileIntegrity: true, expectedRejectedRequests: 1 });
}

await assert.rejects(createViewerServer(apps, prepared, path.join(out, 'bad-content-hash'), { route: 'external-r176', contentRoots: [{ ...mount, files: [{ ...mount.files[0], sha256: '0'.repeat(64) }] }] }), /hash\/size changed: content/);
checks.push({ name: 'content-hash-mismatch-before-listening', pass: true });

const changed = await createViewerServer(apps, prepared, path.join(out, 'content-changed'), { route: 'external-r176', contentRoots: [mount] });
try {
 await fs.writeFile(fixtureFile, 'changed only this owned test fixture');
 const response = await fetch(changed.origin + '/__viewer_content__/fixture/model.gltf'); assert.equal(response.status, 404);
 assert.match(changed.errors[0], /hash\/size changed/);
 await assert.rejects(changed.close(), /Used file changed during Viewer run/);
} finally { await changed.close().catch(() => {}); }
const changedIntegrity = JSON.parse(await fs.readFile(path.join(out, 'content-changed/integrity.json'))); assert.equal(changedIntegrity.unchanged, false);
checks.push({ name: 'content-mutation-rejected-at-request-and-close', pass: true });

const badPreparation = path.join(out, 'bad-source-manifest'); await fs.mkdir(badPreparation);
const manifest = JSON.parse(await fs.readFile(path.join(prepared, 'manifest.json')));
manifest.sources[0].sha256 = '0'.repeat(64);
await fs.writeFile(path.join(badPreparation, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await assert.rejects(createViewerServer(apps, badPreparation, path.join(out, 'bad-source-check'), { route: 'external-r176' }), /File hash\/size changed: viewer\//);
checks.push({ name: 'source-evidence-hash-mismatch-rejected', pass: true });

await fs.writeFile(path.join(out, 'summary.json'), JSON.stringify({ schema: 1, browserExecuted: false, fixtureMutations: 'Only a newly created owned content test file and a copied manifest were modified; upstream source/dist and prepared output were not changed.', checks }, null, 2) + '\n');
console.log(JSON.stringify({ pass: checks.length, browserExecuted: false, expectedFailuresRetained: 3 }));
