// Offline Viewer-only mapping. No Editor resolver changes, network or guessed
// minified names. A source-map point must bind exact captured/prepared bytes.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readCapturedBytes, sourceHash } from './candidate-profile-sources.mjs';
import { VIEWER_PIN } from './viewer-adapter.mjs';

const LIMIT = 64 * 1024 * 1024, MAX_SEGMENTS = 2_000_000;
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const decoder = new TextDecoder('utf-8', { fatal: true });
const hashPattern = /^[a-f0-9]{64}$/;
const safeRelative = value => typeof value === 'string' && value && !value.includes('\\') && !value.includes('\0') && !value.includes('%') && !path.posix.isAbsolute(value) && path.posix.normalize(value) === value && !value.split('/').some(part => part === '..' || part === '.' || part === '');
function safeSourceLabel(value) {
 assert(typeof value === 'string');
 if (value.startsWith('<virtual>/')) { assert(safeRelative('virtual/' + value.slice('<virtual>/'.length)), 'Unsafe virtual source label'); return false; }
 assert(safeRelative(value) && /^(?:adapted|viewer)\//.test(value), 'Unsafe source-map source label');
 return true;
}
export function resolveViewerSourceMapURL(reference, generatedURL, origin) {
 assert(typeof reference === 'string' && reference && !/[\\%\0]/.test(reference) && !reference.startsWith('//') && !reference.split(/[/?#]/).includes('..'), 'Unsafe source-map URL');
 const base = new URL(generatedURL), target = new URL(reference, base), expected = new URL(origin);
 assert(expected.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(expected.hostname) && expected.pathname === '/' && !expected.search && !expected.hash && !expected.username && !expected.password, 'Unexpected capture origin');
 assert.equal(base.origin, expected.origin); assert.equal(target.origin, expected.origin, 'External source-map URL is forbidden');
 assert(!base.username && !base.password && !target.username && !target.password && !target.search && !target.hash, 'Source-map URL credentials/query/fragment are unsupported');
 assert(!target.pathname.includes('%') && target.pathname.endsWith('.map'), 'Unexpected source-map path');
 return target;
}
function textBytes(record) {
 assert(record?.bytes instanceof Uint8Array && record.bytes.byteLength <= LIMIT, 'Invalid source-map evidence bytes');
 assert(hashPattern.test(record.sha256) && sourceHash(record.bytes) === record.sha256, 'Source-map evidence hash mismatch');
 return decoder.decode(record.bytes);
}
const linesOf = text => text.split('\n');
function offsetAt(lines, line, column) {
 if (!Number.isSafeInteger(line) || !Number.isSafeInteger(column) || line < 0 || line >= lines.length || column < 0 || column > lines[line].length) return null;
 let offset = column; for (let i = 0; i < line; i++) offset += lines[i].length + 1; return offset;
}

// Source-map v3 signed Base64 VLQ, with arithmetic rather than 32-bit JS shifts.
// Mapped fields carry across lines except generated column; one-field segments
// explicitly unmap a range. Indexed maps, URL roots and position interpolation
// are deliberately unsupported.
export function decodeViewerMappings(map, generatedText) {
 assert.equal(map.version, 3); assert(!Object.hasOwn(map, 'sections'), 'Indexed maps are unsupported');
 assert(map.sourceRoot === undefined || map.sourceRoot === '', 'Source roots are unsupported');
 assert(Array.isArray(map.sources) && Array.isArray(map.sourcesContent) && map.sources.length === map.sourcesContent.length && map.sources.length <= 20000);
 assert(Array.isArray(map.names) && map.names.length <= 200000 && map.names.every(name => typeof name === 'string'));
 assert(typeof map.mappings === 'string' && map.mappings.length <= LIMIT);
 const generated = linesOf(generatedText), sourceLines = map.sourcesContent.map(text => text === null ? null : (assert(typeof text === 'string'), linesOf(text)));
 const rawLines = map.mappings.split(';'); assert(rawLines.length <= generated.length, 'Mapping line exceeds generated text');
 let source = 0, originalLine = 0, originalColumn = 0, name = 0, total = 0;
 return rawLines.map((line, generatedLine) => {
  let generatedColumn = 0;
  if (!line) return [];
  return line.split(',').map(segment => {
   assert(segment && ++total <= MAX_SEGMENTS, 'Empty or excessive mapping segments');
   const fields = []; let at = 0;
   while (at < segment.length) {
    let value = 0, shift = 0, digit, count = 0;
    do {
     assert(at < segment.length && ++count <= 7, 'Truncated or overlong VLQ');
     digit = alphabet.indexOf(segment[at++]); assert(digit >= 0, 'Invalid Base64 VLQ character');
     value += (digit & 31) * 2 ** shift; shift += 5;
     assert(Number.isSafeInteger(value) && value <= 0xffffffff, 'VLQ overflow');
    } while (digit & 32);
    fields.push((value % 2 ? -1 : 1) * Math.floor(value / 2));
   }
   assert([1, 4, 5].includes(fields.length), 'Invalid mapping segment field count');
   assert(fields[0] >= 0, 'Generated columns are not monotonic'); generatedColumn += fields[0];
   assert(offsetAt(generated, generatedLine, generatedColumn) !== null, 'Generated column out of bounds');
   const result = { generatedLine, generatedColumn, mapped: fields.length > 1 };
   if (fields.length === 1) return result;
   source += fields[1]; originalLine += fields[2]; originalColumn += fields[3];
   assert(Number.isSafeInteger(source) && source >= 0 && source < map.sources.length, 'Source index out of bounds');
   assert(Number.isSafeInteger(originalLine) && Number.isSafeInteger(originalColumn) && originalLine >= 0 && originalColumn >= 0, 'Negative/overflowing original position');
   if (sourceLines[source]) assert(offsetAt(sourceLines[source], originalLine, originalColumn) !== null, 'Original position out of bounds');
   if (fields.length === 5) { name += fields[4]; assert(Number.isSafeInteger(name) && name >= 0 && name < map.names.length, 'Name index out of bounds'); }
   return { ...result, source, originalLine, originalColumn, nameIndex: fields.length === 5 ? name : null };
  });
 });
}
function astFunctions(text, file) {
 const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
 if (ast.parseDiagnostics.length) return null;
 const functions = [];
 function walk(node, owner = '') {
  if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) owner = node.name?.text || (ts.isVariableDeclaration(node.parent) ? node.parent.name.getText(ast) : '(anonymous class)');
  let nextOwner = owner;
  if (ts.isFunctionLike(node) && node.body) {
   let name = node.name?.getText(ast);
   if (!name && (ts.isVariableDeclaration(node.parent) || ts.isPropertyAssignment(node.parent))) name = node.parent.name.getText(ast);
   if (!name && ts.isBinaryExpression(node.parent) && ts.isPropertyAccessExpression(node.parent.left)) name = node.parent.left.name.text;
   const label = [owner, name || '(anonymous)'].filter(Boolean).join('.');
   functions.push({ start: node.getStart(ast), end: node.end, label });
   if (ts.isFunctionDeclaration(node) && name) nextOwner = label;
  }
  ts.forEachChild(node, child => walk(child, nextOwner));
 }
 walk(ast); return { functions, lines: linesOf(text) };
}
function uniqueRows(rows, key) {
 assert(Array.isArray(rows)); const result = new Map();
 for (const row of rows) { assert(!result.has(row[key]), 'Duplicate preparation evidence row'); result.set(row[key], row); }
 return result;
}
export function createVerifiedViewerSourceMap({ generated, sourceMap, prepared }) {
 assert.equal(prepared.status, 'prepared'); assert.equal(prepared.viewerPin, VIEWER_PIN);
 assert(prepared.integrity?.originalSourcesAndDistUnchanged && prepared.integrity?.capturedInputsUnchanged);
 assert(!prepared.instrumentation || prepared.instrumentation === 'none', 'Profile mapping requires an uninstrumented preparation');
 assert(safeRelative(generated.file) && generated.file.startsWith('dist/') && generated.file.endsWith('.js'));
 assert(safeRelative(sourceMap.file) && sourceMap.file.startsWith('dist/') && sourceMap.file.endsWith('.map'));
 const generatedText = textBytes(generated), generatedLines = linesOf(generatedText), mapText = textBytes(sourceMap), map = JSON.parse(mapText);
 const outputs = uniqueRows(prepared.outputs, 'file');
 for (const record of [generated, sourceMap]) {
  const expected = outputs.get(record.file); assert(expected && expected.sha256 === record.sha256 && expected.bytes === record.bytes.byteLength, 'Map/generated bytes differ from prepared output');
 }
 assert.equal(map.file, path.posix.basename(generated.file), 'Source map names a different generated bundle');
 const proofs = uniqueRows(prepared.sourceMaps, 'file'), proof = proofs.get(sourceMap.file);
 assert(proof && proof.nonPathPayloadUnchanged === true && proof.servedSha256 === sourceMap.sha256, 'Missing exact source-map preparation proof');
 assert.equal(sourceHash(map.mappings), proof.mappingsSha256);
 assert.equal(sourceHash(JSON.stringify(map.sourcesContent)), proof.sourcesContentSha256);
 assert.equal(sourceHash(JSON.stringify({ ...map, sources: [] })), proof.unchangedNonPathPayloadSha256);
 assert.equal(map.sources.length, proof.sourceCount);
 const mappings = decodeViewerMappings(map, generatedText), inputs = uniqueRows(prepared.buildInputs, 'file'), originals = uniqueRows(prepared.sources, 'file'), adaptations = uniqueRows(prepared.adaptations, 'file');
 const coverage = [];
 const sources = map.sources.map((file, index) => {
  const unresolved = reason => { coverage.push({ index, file, status: 'unresolved', reason }); return null; };
  if (!safeSourceLabel(file)) return unresolved('Virtual source has no original-file evidence');
  const text = map.sourcesContent[index]; if (text === null) return unresolved('No sourcesContent');
  const bytes = Buffer.from(text), digest = sourceHash(bytes), input = inputs.get(file);
  if (!input || input.sha256 !== digest || input.bytes !== bytes.length) return unresolved('sourcesContent does not match an exact recorded build input');
  let upstream = null;
  if (file.startsWith('adapted/')) {
   const relative = file.slice('adapted/'.length), original = originals.get('viewer/' + relative), adaptation = adaptations.get(relative);
   if (adaptation) {
    if (!original || original.sha256 !== adaptation.originalSha256 || original.bytes !== adaptation.originalBytes || digest !== adaptation.servedSha256 || bytes.length !== adaptation.servedBytes) return unresolved('Adaptation/original/build-input chain is incomplete');
    upstream = { file: original.file, sha256: original.sha256, adaptationFile: relative };
   } else if (relative === 'viewer-bootstrap.js') {
    if (prepared.bootstrap?.file !== 'source/' + relative || prepared.bootstrap.sha256 !== digest || prepared.bootstrap.bytes !== bytes.length) return unresolved('Bootstrap proof is incomplete');
   } else if (!original || original.sha256 !== digest || original.bytes !== bytes.length) return unresolved('Unchanged adapted source lacks matching original evidence');
   else upstream = { file: original.file, sha256: original.sha256 };
  }
  const ast = astFunctions(text, file); if (!ast) return unresolved('Original sourcesContent has parse diagnostics');
  coverage.push({ index, file, sha256: digest, status: 'verified-source-map-input', upstream });
  return { file, sha256: digest, upstream, ...ast };
 });
 return { coverage, generatedSha256: generated.sha256, mapSha256: sourceMap.sha256,
  resolve(line, column) {
   if (offsetAt(generatedLines, line, column) === null) return { resolved: false, reason: 'Generated function position out of bounds' };
   const segments = (mappings[line] ?? []).filter(segment => segment.generatedColumn === column);
   if (segments.length !== 1) return { resolved: false, reason: segments.length ? 'Ambiguous duplicate exact mappings' : 'No exact mapping at generated function position; no GLB interpolation' };
   const segment = segments[0]; if (!segment.mapped) return { resolved: false, reason: 'Explicitly unmapped segment' };
   const source = sources[segment.source]; if (!source) return { resolved: false, reason: 'Mapped source lacks a verified input chain' };
   const offset = offsetAt(source.lines, segment.originalLine, segment.originalColumn);
   const matches = source.functions.filter(fn => fn.start <= offset && offset < fn.end).sort((a, b) => (a.end - a.start) - (b.end - b.start));
   if (!matches.length || (matches[1] && matches[1].start === matches[0].start && matches[1].end === matches[0].end)) return { resolved: false, reason: 'No unique innermost original AST function' };
   return { resolved: true, label: matches[0].label, source: { file: source.file, sha256: source.sha256, line: segment.originalLine, column: segment.originalColumn,
    upstream: source.upstream, mapping: { method: 'exact-generated-segment-to-verified-input-AST', mapSha256: sourceMap.sha256, generatedSha256: generated.sha256, generatedFile: generated.file, generatedLine: line, generatedColumn: column } } };
  } };
}

export async function createViewerSourceMapResolver(captureRoot, runDir, origin, baseResolver) {
 const root = await fs.realpath(captureRoot), run = await fs.realpath(runDir); assert(run.startsWith(root + path.sep), 'Run escaped capture root');
 const read = async file => JSON.parse(await fs.readFile(path.join(run, file)));
 const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'))), adaptation = await read('adaptation.json');
 const proof = manifest.preparedManifestFiles?.native; assert(proof && safeRelative(proof.file) && proof.file === 'prepared-manifests/native.json', 'Missing captured native preparation manifest');
 const file = await fs.realpath(path.join(root, proof.file)); assert(file.startsWith(root + path.sep), 'Prepared manifest escaped capture root');
 const bytes = await fs.readFile(file); assert(bytes.length <= LIMIT && bytes.length === proof.bytes && sourceHash(bytes) === proof.sha256);
 assert.equal(proof.sha256, manifest.preparedManifests.native); assert.equal(proof.sha256, adaptation.preparationManifestSha256);
 const prepared = JSON.parse(bytes); assert.deepEqual(prepared.outputs, adaptation.appBundleOutputs);
 const sources = await read('captured-sources.json'), scripts = await read('profile-scripts.json'), byURL = uniqueRows(sources, 'url');
 const maps = new Map(), coverage = [];
 for (const script of scripts) {
  if (script.cleanupError) continue;
  const row = { scriptId: script.scriptId, status: 'generated-only', reason: null, positionOutcomes: {} }; coverage.push(row);
  const generated = byURL.get(script.parsed?.url);
  if (!generated?.label.startsWith('prepared/dist/') || !generated.label.endsWith('.js') || !script.parsed?.sourceMapURL) { row.reason = 'No captured prepared-map association; original r176 is never inferred from a rebuilt map'; continue; }
  const mapURL = resolveViewerSourceMapURL(script.parsed.sourceMapURL, script.parsed.url.replace('<origin>', origin), origin);
  const mapRecord = byURL.get('<origin>' + mapURL.pathname);
  assert(mapRecord && mapRecord.label === 'prepared/dist' + mapURL.pathname, 'Source map was not captured from its prepared output');
  const mapped = createVerifiedViewerSourceMap({ generated: { file: generated.label.slice('prepared/'.length), sha256: generated.sha256, bytes: await readCapturedBytes(run, generated) },
   sourceMap: { file: mapRecord.label.slice('prepared/'.length), sha256: mapRecord.sha256, bytes: await readCapturedBytes(run, mapRecord) }, prepared });
  maps.set(script.scriptId, { mapped, row, sha256: generated.sha256, label: generated.label, startLine: script.parsed.startLine ?? 0, startColumn: script.parsed.startColumn ?? 0 });
  Object.assign(row, { status: 'verified-map', generatedSha256: generated.sha256, mapSha256: mapped.mapSha256, inputs: mapped.coverage });
 }
 return { coverage, async resolve(frame) {
  const base = await baseResolver.resolve(frame), entry = maps.get(frame.scriptId);
  if (!entry || base.sourceStatus !== 'verified-js') return base;
  assert.equal(base.source?.sha256, entry.sha256); assert.equal(base.source?.file, entry.label);
  const line = frame.lineNumber - entry.startLine, column = frame.columnNumber - (line === 0 ? entry.startColumn : 0), mapped = entry.mapped.resolve(line, column);
  const outcome = mapped.resolved ? 'mapped' : mapped.reason; entry.row.positionOutcomes[outcome] = (entry.row.positionOutcomes[outcome] ?? 0) + 1;
  if (!mapped.resolved) return { ...base, source: { ...base.source, sourceMapFallback: mapped.reason } };
  return { ...base, label: mapped.label, sourceStatus: 'verified-js', source: { ...mapped.source, generated: base.source }, matchedFunction: true };
 } };
}
