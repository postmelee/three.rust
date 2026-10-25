import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

// Resolve symbols only against bytes actually served during this capture.
export async function profileSourceVerifier(run, apps, resources) {
  const served = JSON.parse(await fs.readFile(path.join(run, 'served-files.json')));
  const network = JSON.parse(await fs.readFile(path.join(run, 'network.json')));
  const expected = new Map();
  function record(file, hash) {
    assert(!expected.has(file) || expected.get(file) === hash, `Conflicting capture hashes: ${file}`);
    expected.set(file, hash);
  }
  for (const item of served) record(item.file, item.sha256);
  for (const item of network.filter(item => item.mirrored)) {
    const url = item.url.replace('three@0.176.x/', 'three@0.176.0/');
    const resource = resources.find(resource => resource.url === url);
    assert(resource, `Unknown captured resource: ${url}`);
    record('vendor/' + resource.file, item.sha256);
  }
  function verify(file, bytes) {
    const relative = path.relative(apps, file);
    assert(expected.has(relative), `No capture hash for source: ${relative}`);
    assert.equal(sha256(bytes), expected.get(relative), `Capture source mismatch: ${relative}`);
  }
  // Fail before producing an analysis, including when a source was removed.
  for (const file of expected.keys()) {
    const absolute = path.join(apps, file);
    verify(absolute, await fs.readFile(absolute));
  }
  return verify;
}
