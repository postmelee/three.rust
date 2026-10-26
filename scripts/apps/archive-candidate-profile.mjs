// Archive completed diagnostic captures/analyses only; never run during sampling.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const maxFileBytes = 100_000_000;
const textDecoder = new TextDecoder('utf-8', { fatal: true });
const safeRelative = value => typeof value === 'string' && value.length > 0 && !path.isAbsolute(value) && !value.split(/[\\/]/).some(x => x === '..' || x === '') && !value.includes('\0');
export function normalizeMetadata(text, replacements = []) {
 const notes = new Set(); let result = text;
 for (const [original, publicValue] of [...replacements].sort((a, b) => b[0].length - a[0].length)) {
  if (original && result.includes(original)) { result = result.split(original).join(publicValue); notes.add('absolute-path'); }
 }
 for (const [pattern, replacement, note] of [
  [/\/Users\/[^/\s"\\<>]+/g, '<home>', 'home-path'],
  [/\/(?:private\/)?var\/folders\/[^\s"\\<>]+/g, '<temporary-directory>', 'temporary-path'],
  [/\(id=\d+\)/g, '(id=<redacted>)', 'battery-instance-id'],
  [/--(user-data-dir|crash-dumps-dir|disk-cache-dir)=(?!<)[^\s"\\]+/g, '--$1=<browser-private-directory>', 'browser-profile-path']
 ]) result = result.replace(pattern, (...args) => { notes.add(note); return replacement.replace(/\$(\d)/g, (_, n) => args[Number(n)]); });
 assert(!/\/Users\/|\/(?:private\/)?var\/folders\//.test(result), 'Unnormalized private path');
 return { text: result, normalizations: [...notes].sort() };
}
export function assertInvariant(original, publicValue, replacements = []) {
 if (typeof original === 'string') { assert.equal(typeof publicValue, 'string'); assert.equal(normalizeMetadata(original, replacements).text, publicValue); return; }
 if (original === null || typeof original !== 'object') { assert(Object.is(original, publicValue), 'Changed JSON primitive or number'); return; }
 assert(publicValue !== null && typeof publicValue === 'object');
 assert.equal(Array.isArray(original), Array.isArray(publicValue));
 assert.deepEqual(Object.keys(original), Object.keys(publicValue), 'Changed JSON structure');
 for (const key of Object.keys(original)) assertInvariant(original[key], publicValue[key], replacements);
}
export function numericFingerprint(value) {
 const hash = createHash('sha256'); let numbers = 0, primitives = 0;
 function walk(v, p) {
  if (v === null || typeof v === 'number' || typeof v === 'boolean') { hash.update(JSON.stringify(p) + ':' + (Object.is(v, -0) ? '-0' : JSON.stringify(v)) + '\n'); primitives++; if (typeof v === 'number') numbers++; }
  else if (typeof v === 'object') for (const key of Object.keys(v)) walk(v[key], [...p, key]);
 }
 walk(value, []); return { sha256: hash.digest('hex'), numbers, primitives };
}
function inspectPrivacy(value, location = '') {
 if (typeof value === 'string') {
  assert(!/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(value), 'UUID requires explicit privacy review: ' + location);
  return;
 }
 if (!value || typeof value !== 'object') return;
 for (const [key, child] of Object.entries(value)) {
  if (/^(?:hostname|computer.?name|serial.?number|hardware.?uuid|battery.?id)$/i.test(key) && child !== '' && child !== null && child !== '<redacted>') throw Error('Private metadata field requires explicit review: ' + location + '/' + key);
  inspectPrivacy(child, location + '/' + key);
 }
}
async function listing(root, relative = '') {
 const output = [];
 for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
  assert(!entry.isSymbolicLink(), 'Source symlink is not accepted'); const file = path.join(relative, entry.name);
  if (entry.isDirectory()) output.push(...await listing(root, file)); else { assert(entry.isFile()); output.push(file.split(path.sep).join('/')); }
 }
 return output.sort();
}
const writeJSON = (root, name, value) => fs.writeFile(path.join(root, name), JSON.stringify(value, null, 2) + '\n');
export async function buildArchive({ root, out, inputs, invalid = [] }) {
 root = await fs.realpath(root); out = path.resolve(out);
 assert(inputs.length > 0); const seen = new Set(), suites = [];
 for (const item of inputs) {
  const at = item.indexOf('='), label = item.slice(0, at), relative = item.slice(at + 1);
  assert(at > 0 && /^[a-z0-9][a-z0-9-]*$/.test(label) && !seen.has(label) && safeRelative(relative), 'Invalid input label/path'); seen.add(label);
  const source = await fs.realpath(path.join(root, relative)); assert(source.startsWith(root + path.sep) && !out.startsWith(source + path.sep) && !source.startsWith(out + path.sep));
  let metadata, kind;
  try { metadata = JSON.parse(await fs.readFile(path.join(source, 'manifest.json'))); kind = 'capture'; }
  catch (error) { if (error.code !== 'ENOENT') throw error; metadata = JSON.parse(await fs.readFile(path.join(source, 'summary.json'))); kind = 'analysis'; }
  if (kind === 'capture') { assert(['capture-complete-attribution-pending', 'failed'].includes(metadata.status) && metadata.finishedAt && metadata.sourceIntegrity, 'Capture is not finalized'); }
  else { assert(Array.isArray(metadata.runs) && metadata.runs.length > 0 && Array.isArray(metadata.unprocessed), 'Analysis summary is incomplete'); for (const run of metadata.runs) { assert(safeRelative(run.file)); await fs.access(path.join(source, run.file)); } }
  suites.push({ label, source, relative, kind, metadata, files: await listing(source) });
 }
 assert(invalid.every(x => seen.has(x)), 'Unknown invalid analysis label');
 const replacements = [[root, '<tooling-checkout>'], [os.homedir(), '<home>'], ...suites.map(s => [s.source, '<capture:' + s.label + '>'])];
 await fs.mkdir(path.dirname(out), { recursive: true }); await fs.mkdir(out, { recursive: false });
 await fs.mkdir(path.join(out, 'blobs')); const files = [], blobs = new Map();
 const state = { status: 'building' }; await writeJSON(out, 'build-status.json', state);
 try {
  for (const suite of suites) for (const file of suite.files) {
   const source = path.join(suite.source, file), bytes = await fs.readFile(source); assert(bytes.length < maxFileBytes, 'Input exceeds 100MB bound: ' + file);
   const sourceGzip = file.endsWith('.gz'), decoded = sourceGzip ? gunzipSync(bytes, { maxOutputLength: maxFileBytes }) : bytes;
   const logicalPath = suite.label + '/' + file; let publicBytes = decoded, normalizations = [], fingerprint = null;
   const json = /\.(?:json|cpuprofile)(?:\.gz)?$/.test(file);
   let text;
   try { text = textDecoder.decode(decoded); } catch {}
   if (text !== undefined) {
    if (json) {
     const original = JSON.parse(text); const normalized = normalizeMetadata(text, replacements), changed = JSON.parse(normalized.text);
     assertInvariant(original, changed, replacements); inspectPrivacy(changed, logicalPath);
     fingerprint = numericFingerprint(original); assert.deepEqual(numericFingerprint(changed), fingerprint);
     publicBytes = Buffer.from(normalized.text); normalizations = normalized.normalizations;
    } else {
     // Executed sources, overlays, patches and PNG/Wasm bytes are immutable.
     const normalized = normalizeMetadata(text, replacements); assert.equal(normalized.text, text, 'Private path in source/text requires explicit review: ' + logicalPath);
    }
   }
   const publicSha256 = sha256(publicBytes), blob = 'blobs/' + publicSha256 + '.gz'; let record = blobs.get(publicSha256);
   if (!record) { const stored = gzipSync(publicBytes, { level: 9, mtime: 0 }); assert(stored.length < maxFileBytes); await fs.writeFile(path.join(out, blob), stored, { flag: 'wx' }); record = { blob, storedSha256: sha256(stored), storedBytes: stored.length }; blobs.set(publicSha256, record); }
   files.push({ logicalPath, sourcePath: suite.relative + '/' + file, sourceSha256: sha256(bytes), sourceBytes: bytes.length, sourceGzip, decodedSourceSha256: sha256(decoded), publicSha256, publicBytes: publicBytes.length, ...record, normalizations, numericFingerprint: fingerprint });
  }
  for (const suite of suites) assert.deepEqual(await listing(suite.source), suite.files, 'Capture listing changed during archive');
  for (const item of files) assert.equal(sha256(await fs.readFile(path.join(root, item.sourcePath))), item.sourceSha256, 'Original source changed during archive');
  const index = { format: 1, kind: 'Task49 native candidate profile evidence',
   policy: 'All explicitly listed suites preserved. Gzip is lossless after listed metadata-string normalization. Executed source/overlay/patch/image/Wasm bytes are unchanged. Numeric/null/boolean JSON paths and values are independently fingerprinted and recursively invariant. Original, decoded original, normalized public and stored SHA256 are separate. Identical public bytes share a content-addressed gzip blob.',
   privacy: 'Only literal local paths, browser profile/cache paths and battery instance strings are normalized. UUIDs or hostname/computer-name/serial/hardware UUID/battery ID fields fail closed for explicit review; never silently redact scene identities or numeric measurements.',
   inputs: suites.map(s => ({ label: s.label, sourcePath: s.relative, kind: s.kind, files: s.files.length,
    status: s.kind === 'capture' ? s.metadata.status : 'completed-derived-analysis', interpretation: invalid.includes(s.label) ? 'INVALID SUBSYSTEM CLASSIFICATION: candidate URL was mistaken for automation; preserve but do not use these buckets for conclusions.' : s.kind === 'capture' ? 'Raw diagnostic capture; no primary performance qualification.' : 'Corrected source-aware diagnostic attribution; no primary performance qualification.',
    captureToolSha: s.kind === 'capture' ? s.metadata.sourceBefore?.tooling.sha : s.metadata.captureToolSha ?? s.metadata.sourceToolSha,
    analysisToolSha: s.metadata.analysisTool?.sha ?? null, candidateSha: s.metadata.candidateSha, finishedAt: s.metadata.finishedAt ?? null })), files };
  await writeJSON(out, 'archive-index.json', index);
  Object.assign(state, { status: 'complete', logicalFiles: files.length, uniqueBlobs: blobs.size, storedBytes: [...blobs.values()].reduce((n,b)=>n+b.storedBytes,0), normalizedFiles: files.filter(f=>f.normalizations.length).length, sourceHashesRechecked: true, sourceListingsUnchanged: true });
  await writeJSON(out, 'build-status.json', state); return state;
 } catch (error) { Object.assign(state, { status: 'failed', error: normalizeMetadata(String(error.stack || error), replacements).text, copiedFiles: files.length }); await writeJSON(out, 'build-status.json', state); await writeJSON(out, 'partial-index.json', { files }); throw error; }
}
export async function verifyArchive(out, { sourceRoot, extract } = {}) {
 out = await fs.realpath(out); const index = JSON.parse(await fs.readFile(path.join(out, 'archive-index.json'))), blobs = new Map(), blobRecords = new Map(), logical = new Set();
 assert.equal(index.format, 1); assert.equal(JSON.parse(await fs.readFile(path.join(out, 'build-status.json'))).status, 'complete');
 if (extract) { extract = path.resolve(extract); await fs.mkdir(path.dirname(extract), { recursive: true }); await fs.mkdir(extract, { recursive: false }); }
 for (const item of index.files) {
  assert(safeRelative(item.logicalPath) && !logical.has(item.logicalPath)); logical.add(item.logicalPath);
  assert.match(item.publicSha256, /^[a-f0-9]{64}$/); assert.equal(item.blob, 'blobs/' + item.publicSha256 + '.gz');
  let bytes = blobs.get(item.blob);
  if (bytes) assert.deepEqual(blobRecords.get(item.blob), { sha256: item.storedSha256, bytes: item.storedBytes }, 'Inconsistent shared blob metadata');
  if (!bytes) { const file = await fs.realpath(path.join(out, item.blob)); assert(file.startsWith(out + path.sep)); const stored = await fs.readFile(file); assert(stored.length < maxFileBytes && stored.length === item.storedBytes && sha256(stored) === item.storedSha256); bytes = gunzipSync(stored, { maxOutputLength: maxFileBytes }); blobs.set(item.blob, bytes); blobRecords.set(item.blob, { sha256: item.storedSha256, bytes: item.storedBytes }); }
  assert.equal(bytes.length, item.publicBytes); assert.equal(sha256(bytes), item.publicSha256);
  if (item.numericFingerprint) { const value = JSON.parse(bytes); assert.deepEqual(numericFingerprint(value), item.numericFingerprint); inspectPrivacy(value, item.logicalPath); }
  if (sourceRoot) { assert(safeRelative(item.sourcePath)); const root = await fs.realpath(sourceRoot), file = await fs.realpath(path.join(root, item.sourcePath)); assert(file.startsWith(root + path.sep)); const source = await fs.readFile(file); assert.equal(sha256(source), item.sourceSha256); const decoded = item.sourceGzip ? gunzipSync(source) : source; assert.equal(sha256(decoded), item.decodedSourceSha256); if (item.numericFingerprint) assert.deepEqual(numericFingerprint(JSON.parse(decoded)), item.numericFingerprint); else assert(decoded.equals(bytes)); }
  if (extract) { const file = path.join(extract, item.logicalPath); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, item.sourceGzip ? gzipSync(bytes, { level: 9, mtime: 0 }) : bytes, { flag: 'wx' }); }
 }
 assert.deepEqual((await fs.readdir(path.join(out, 'blobs'))).sort(), [...blobs.keys()].map(x=>path.basename(x)).sort(), 'Unindexed blobs');
 return { status: 'verified', logicalFiles: logical.size, uniqueBlobs: blobs.size, originalSourcesVerified: Boolean(sourceRoot), extracted: Boolean(extract) };
}
async function cli() {
 const [action, ...args] = process.argv.slice(2), options = { inputs: [], invalid: [] };
 for (let i = 0; i < args.length; i += 2) { const key = args[i], value = args[i + 1]; assert(value && !value.startsWith('--')); if (key === '--input') options.inputs.push(value); else if (key === '--invalid') options.invalid.push(value); else { assert(['--root','--out','--source-root','--extract'].includes(key) && !Object.hasOwn(options,key)); options[key] = value; } }
 assert(['build','verify'].includes(action) && options['--out'], 'Use build --root ROOT --out FRESH --input LABEL=RELATIVE [--invalid LABEL], or verify --out ARCHIVE [--source-root ROOT] [--extract FRESH]');
 console.log(JSON.stringify(action === 'build' ? await buildArchive({ root: options['--root'], out: options['--out'], inputs: options.inputs, invalid: options.invalid }) : await verifyArchive(options['--out'], { sourceRoot: options['--source-root'], extract: options['--extract'] })));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await cli();
