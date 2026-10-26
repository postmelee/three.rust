import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { parseWasmSymbols, resolveWasmFrame } from './candidate-profile-analysis.mjs';

export const sourceHash = bytes => createHash('sha256').update(bytes).digest('hex');
const inside = (root, file) => file.startsWith(root + path.sep);
export function canonicalProfileURL(url, origin) {
 return url.startsWith(origin + '/') ? '<origin>' + url.slice(origin.length) : url;
}
export async function readCapturedBytes(run, record) {
 assert.match(record.sha256, /^[a-f0-9]{64}$/);
 assert.match(record.file, /^(?:sources|debug-sources)\/[a-f0-9]{64}\.bin$/);
 assert.equal(path.basename(record.file), record.sha256 + '.bin');
 const root = await fs.realpath(run), file = await fs.realpath(path.resolve(root, record.file));
 assert(inside(root, file), 'Captured source escaped run directory');
 const bytes = await fs.readFile(file);
 assert.equal(sourceHash(bytes), record.sha256, 'Captured source hash mismatch: ' + record.file);
 assert.equal(bytes.length, record.bytes, 'Captured source size mismatch: ' + record.file);
 return bytes;
}

// Call only after Profiler.stop and after the raw profile has been persisted.
// Debugger is absent from the sampled window. Script IDs are retained verbatim.
export async function captureProfileScripts(cdp, profile, run, origin) {
 const parsed = new Map(), records = [];
 const onParsed = event => parsed.set(event.scriptId, event);
 cdp.on('Debugger.scriptParsed', onParsed);
 try {
  await cdp.send('Debugger.enable');
  await fs.mkdir(path.join(run, 'debug-sources'), { recursive: true });
  for (const scriptId of new Set(profile.nodes.map(node => node.callFrame.scriptId))) {
   const metadata = parsed.get(scriptId);
   const record = { scriptId, parsed: metadata ? { ...metadata, url: canonicalProfileURL(metadata.url, origin) } : null };
   records.push(record);
   try {
    const result = await cdp.send('Debugger.getScriptSource', { scriptId });
    const wasm = typeof result.bytecode === 'string';
    const bytes = wasm ? Buffer.from(result.bytecode, 'base64') : Buffer.from(result.scriptSource, 'utf8');
    const sha256 = sourceHash(bytes), file = `debug-sources/${sha256}.bin`;
    await fs.writeFile(path.join(run, file), bytes);
    Object.assign(record, { kind: wasm ? 'wasm' : 'javascript', sha256, file, bytes: bytes.length });
   } catch (error) { record.unavailable = String(error.message); }
  }
 } finally {
  cdp.off('Debugger.scriptParsed', onParsed);
  await cdp.send('Debugger.disable').catch(error => records.push({ cleanupError: String(error.message) }));
  await fs.writeFile(path.join(run, 'profile-scripts.json'), JSON.stringify(records, null, 2) + '\n');
 }
 return records;
}

function functionRanges(text, label) {
 const ast = ts.createSourceFile(label, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), ranges = [];
 function walk(node, owner = '') {
  if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) owner = node.name?.text || (ts.isVariableDeclaration(node.parent) ? node.parent.name.getText(ast) : 'anonymous-class');
  let nextOwner = owner;
  if (ts.isFunctionLike(node) && node.body) {
   let name = node.name?.getText(ast);
   if (!name && (ts.isVariableDeclaration(node.parent) || ts.isPropertyAssignment(node.parent))) name = node.parent.name.getText(ast);
   if (!name && ts.isBinaryExpression(node.parent) && ts.isPropertyAccessExpression(node.parent.left)) name = node.parent.left.name.text;
   const qualified = [owner, name || '(anonymous)'].filter(Boolean).join('.');
   ranges.push({ start: node.getStart(ast), end: node.end, label: qualified });
   if (ts.isFunctionDeclaration(node) && name) nextOwner = qualified;
  }
  ts.forEachChild(node, child => walk(child, nextOwner));
 }
 walk(ast);
 return { starts: ast.getLineStarts(), ranges };
}
function lineOffset(text, line, column) {
 if (!Number.isSafeInteger(line) || line < 0 || !Number.isSafeInteger(column) || column < 0) return null;
 const starts = [0]; for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
 if (line >= starts.length) return null;
 const end = line + 1 < starts.length ? starts[line + 1] : text.length;
 return starts[line] + column <= end ? starts[line] + column : null;
}

export async function createCapturedFrameResolver(run, origin) {
 const sources = JSON.parse(await fs.readFile(path.join(run, 'captured-sources.json')));
 const scripts = JSON.parse(await fs.readFile(path.join(run, 'profile-scripts.json')));
 const served = JSON.parse(await fs.readFile(path.join(run, 'served-files.json')));
 const network = JSON.parse(await fs.readFile(path.join(run, 'network.json')));
 const servedByLabel = new Map(served.map(item => [item.file, item.sha256]));
 const mirroredByURL = new Map(network.filter(item => item.mirrored).map(item => [item.url, item.sha256]));
 const byURL = new Map(), wasmByHash = new Map(), byScript = new Map(), coverage = [];
 for (const record of sources) {
  assert(!byURL.has(record.url), 'Duplicate captured URL');
  const expected = record.url.startsWith('<origin>/') ? servedByLabel.get(record.label) : mirroredByURL.get(record.url);
  assert(expected, 'No serving evidence for archived source: ' + record.url);
  assert.equal(record.sha256, expected, 'Archived/served source hash mismatch: ' + record.url);
  const bytes = await readCapturedBytes(run, record);
  byURL.set(record.url, { ...record, bytes });
  if (record.label.endsWith('.wasm')) wasmByHash.set(record.sha256, { ...record, map: parseWasmSymbols(bytes, { expectedSha256: record.sha256 }) });
 }
 for (const record of scripts) {
  if (record.cleanupError) { coverage.push(record); continue; }
  assert(!byScript.has(record.scriptId), 'Duplicate script ID');
  const unresolved = reason => ({ sourceStatus: 'unresolved-' + reason, label: '(unresolved)', reason });
  let resolved;
  if (!record.file) resolved = unresolved('script-unavailable');
  else {
   const bytes = await readCapturedBytes(run, record);
   if (record.kind === 'wasm') {
    const known = wasmByHash.get(record.sha256);
    resolved = known ? { sourceStatus: 'verified-wasm', wasmMap: known.map, source: { file: known.label, sha256: known.sha256, url: record.parsed?.url ?? null } } : unresolved('wasm-not-served');
   } else {
    const known = byURL.get(record.parsed?.url);
    if (!known) resolved = unresolved('script-not-served');
    else {
     const text = bytes.toString('utf8'), inline = known.label.endsWith('.html');
     let verified = sourceHash(bytes) === known.sha256;
     if (inline) {
      const html = known.bytes.toString('utf8'), start = lineOffset(html, record.parsed.startLine, record.parsed.startColumn), end = lineOffset(html, record.parsed.endLine, record.parsed.endColumn);
      verified = start !== null && end !== null && html.slice(start, end) === text;
     } else assert(verified, 'Debugger/served source mismatch: ' + known.label);
     resolved = verified ? { sourceStatus: 'verified-js', source: { file: known.label, sha256: record.sha256, servedSha256: known.sha256, url: known.url }, text,
      ...functionRanges(text, known.label), startLine: record.parsed?.startLine ?? 0, startColumn: record.parsed?.startColumn ?? 0 } : unresolved('inline-offset-mismatch');
    }
   }
  }
  byScript.set(record.scriptId, resolved);
  coverage.push({ scriptId: record.scriptId, url: record.parsed?.url ?? null, sourceStatus: resolved.sourceStatus, source: resolved.source ?? null });
 }
 const resolve = frame => {
  const value = byScript.get(frame.scriptId);
  if (!value) return { label: frame.functionName || '(anonymous)', sourceStatus: 'unresolved-script-id' };
  if (value.wasmMap) {
   const wasm = resolveWasmFrame(frame, value.wasmMap);
   return { label: wasm.label, sourceStatus: wasm.resolved ? 'verified-wasm' : 'unresolved-wasm-function', source: value.source, wasm };
  }
  if (value.sourceStatus !== 'verified-js') return { ...value, label: frame.functionName || '(anonymous)' };
  const line = frame.lineNumber - value.startLine, column = frame.columnNumber - (line === 0 ? value.startColumn : 0);
  const offset = lineOffset(value.text, line, column);
  const matched = offset === null ? null : value.ranges.filter(range => range.start <= offset && offset < range.end).sort((a, b) => a.end - a.start - (b.end - b.start))[0];
  return { label: matched?.label ?? frame.functionName ?? '(anonymous)', sourceStatus: 'verified-js', source: { ...value.source, line: frame.lineNumber, column: frame.columnNumber }, matchedFunction: Boolean(matched) };
 };
 return { resolve, coverage, sources: sources.map(({ url, label, sha256, bytes }) => ({ url, label, sha256, bytes })) };
}
