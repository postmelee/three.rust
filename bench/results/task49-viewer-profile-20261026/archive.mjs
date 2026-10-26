// Viewer wrapper around the already tested lossless Editor profile archiver.
// Run only after all selected captures/analyses are terminal and sampling ends.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { buildArchive, verifyArchive, sha256 } from '../../../scripts/apps/archive-candidate-profile.mjs';

export const DEFAULT_INPUTS = Object.freeze([
 'smoke=work/task49-viewer-profile-smoke-001',
 'smoke-analysis-001=work/task49-viewer-profile-smoke-analysis-001',
 'full=work/task49-viewer-robot-profile-full-001',
 'full-analysis-001=work/task49-viewer-robot-profile-full-analysis-001'
]);
const relative = value => typeof value === 'string' && value && !path.isAbsolute(value) && !value.includes('\\') && !value.split('/').some(part => !part || part === '.' || part === '..');
const write = async (root, file, bytes) => { assert(relative(file)); await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true }); await fs.writeFile(path.join(root, file), bytes, { flag: 'wx' }); };

async function support(root, out, inputs) {
 const records = [], seen = new Set();
 async function copy(file, bytes, provenance) {
  const digest = sha256(bytes);
  if (seen.has(file)) { assert.equal(sha256(await fs.readFile(path.join(out, file))), digest); return; }
  await write(out, file, bytes); records.push({ file, bytes: bytes.length, sha256: digest, provenance }); seen.add(file);
 }
 for (const input of inputs) {
  const at = input.indexOf('='), label = input.slice(0, at), source = input.slice(at + 1);
  let manifest;
  try { manifest = JSON.parse(await fs.readFile(path.join(root, source, 'manifest.json'))); }
  catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  if (manifest.protocol) {
   const file = manifest.protocol.file; assert(relative(file) && file.startsWith('mydocs/plans/'));
   const bytes = await fs.readFile(path.join(root, file)); assert.equal(sha256(bytes), manifest.protocol.sha256, 'Committed protocol bytes differ from capture');
   assert.deepEqual(JSON.parse(bytes), manifest.protocol.protocol);
   await copy('protocols/' + path.basename(file), bytes, { capture: label, sourceFile: file, capturedSha256: manifest.protocol.sha256 });
  }
 }
 // Reuse explicitly archived public notices without copying asset payloads.
 const noticesRoot = path.join(root, 'bench/results/task49-viewer-correctness-20261026');
 const index = JSON.parse(await fs.readFile(path.join(noticesRoot, 'archive-index.json')));
 for (const item of index.files.filter(item => item.path.startsWith('notices/') || item.path === 'work/task49-viewer-external-002/source/LICENSE')) {
  assert(relative(item.blob)); const stored = await fs.readFile(path.join(noticesRoot, item.blob));
  assert.equal(sha256(stored), item.storedSha256); const bytes = gunzipSync(stored, { maxOutputLength: 100_000_000 });
  assert.equal(sha256(bytes), item.decodedSha256); assert.equal(bytes.length, item.decodedBytes);
  const file = item.path.startsWith('notices/') ? 'licenses/' + item.path.slice('notices/'.length) : 'licenses/Viewer-LICENSE';
  await copy(file, bytes, { archive: 'task49-viewer-correctness-20261026', logicalPath: item.path, sourceSha256: item.sourceSha256 });
 }
 await write(out, 'support-index.json', Buffer.from(JSON.stringify({ records }, null, 2) + '\n'));
}

const [action, ...args] = process.argv.slice(2), options = { inputs: [] };
for (let i = 0; i < args.length; i += 2) {
 const key = args[i], value = args[i + 1]; assert(value && !value.startsWith('--'));
 if (key === '--input') options.inputs.push(value);
 else { assert(['--root','--out','--source-root','--extract'].includes(key) && !Object.hasOwn(options,key)); options[key] = value; }
}
assert(['build','verify'].includes(action) && options['--out'], 'Use build --root ROOT --out FRESH [--input label=relative], or verify --out ARCHIVE [--source-root ROOT] [--extract FRESH]');
if (action === 'build') {
 assert(options['--root']); const root = await fs.realpath(options['--root']), out = path.resolve(options['--out']), inputs = options.inputs.length ? options.inputs : [...DEFAULT_INPUTS];
 const result = await buildArchive({ root, out, inputs });
 try { await support(root, out, inputs); }
 catch (error) { await write(out, 'support-failure.json', Buffer.from(JSON.stringify({ status: 'failed', errorType: error.name, rawPayloadIndexRetained: true }, null, 2) + '\n')); throw error; }
 console.log(JSON.stringify({ ...result, support: 'complete', qualification: false }));
} else {
 const result = await verifyArchive(options['--out'], { sourceRoot: options['--source-root'], extract: options['--extract'] });
 const out = await fs.realpath(options['--out']), supportIndex = JSON.parse(await fs.readFile(path.join(out, 'support-index.json')));
 for (const item of supportIndex.records) { assert(relative(item.file)); const bytes = await fs.readFile(path.join(out, item.file)); assert.equal(bytes.length, item.bytes); assert.equal(sha256(bytes), item.sha256); }
 console.log(JSON.stringify({ ...result, support: 'verified' }));
}
