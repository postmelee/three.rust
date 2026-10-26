import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { gzipSync } from 'node:zlib';
import { buildArchive, verifyArchive, sha256, normalizeMetadata, assertInvariant, numericFingerprint } from '../scripts/apps/archive-candidate-profile.mjs';
const write = (file,value) => fs.writeFile(file,typeof value==='string'?value:JSON.stringify(value));
async function fixture(t) {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'rthree-profile-archive-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.mkdir(path.join(root,'raw'));await fs.mkdir(path.join(root,'analysis'));
 await write(path.join(root,'raw','manifest.json'),{status:'capture-complete-attribution-pending',finishedAt:'2026-10-26T00:00:00Z',sourceIntegrity:'passed',sourceBefore:{tooling:{sha:'a'.repeat(40)}},candidateSha:'b'.repeat(40)});
 await write(path.join(root,'analysis','summary.json'),{runs:[{file:'0.json'}],unprocessed:[],analysisTool:{sha:'c'.repeat(40)}});await write(path.join(root,'analysis','0.json'),{value:7});
 const common=JSON.stringify({number:42,nested:[null,true,-3.5],counter:0});await write(path.join(root,'raw','same.json'),common);await write(path.join(root,'analysis','same.json'),common);
 await write(path.join(root,'raw','environment.json'),{power:'AC Power (id=12345)',home:'/Users/private/checkout',measurements:[0,1.25,null],uuid:''});
 return {root,out:path.join(root,'archive'),options:{root,out:path.join(root,'archive'),inputs:['raw=raw','analysis-001=analysis'],invalid:['analysis-001']}};
}
test('metadata-only normalization preserves exact primitives including signed zero',()=>{
 const text='{"battery":"AC Power (id=1234)","path":"/Users/name/foo","n":-0,"x":[1,null,true]}';const result=normalizeMetadata(text);assert.match(result.text,/<redacted>/);assertInvariant(JSON.parse(text),JSON.parse(result.text));assert.deepEqual(numericFingerprint(JSON.parse(text)),numericFingerprint(JSON.parse(result.text)));
 assert.throws(()=>assertInvariant({x:1},{x:2}));assert.throws(()=>assertInvariant({x:-0},{x:0}));assert.throws(()=>assertInvariant({x:'stable'},{x:'changed'}));assert.throws(()=>assertInvariant({x:[1]},{x:[1,2]}));
});
test('complete archive deduplicates bytes, retains invalid analysis and refuses overwrite',async t=>{
 const f=await fixture(t);const status=await buildArchive(f.options);assert.equal(status.status,'complete');assert(status.uniqueBlobs<status.logicalFiles);assert.equal(status.normalizedFiles,1);
 const result=await verifyArchive(f.out,{sourceRoot:f.root,extract:path.join(f.root,'extracted')});assert.equal(result.status,'verified');assert.equal(result.originalSourcesVerified,true);
 const index=JSON.parse(await fs.readFile(path.join(f.out,'archive-index.json')));assert.match(index.inputs[1].interpretation,/INVALID/);
 assert.equal(JSON.parse(await fs.readFile(path.join(f.root,'extracted/raw/environment.json'))).power,'AC Power (id=<redacted>)');
 await assert.rejects(buildArchive(f.options),/EEXIST/);await assert.rejects(verifyArchive(f.out,{extract:path.join(f.root,'extracted')}),/EEXIST/);
});
test('archive rejects unfinished captures before creating destination',async t=>{
 const f=await fixture(t);await write(path.join(f.root,'raw/manifest.json'),{status:'preparing'});await assert.rejects(buildArchive(f.options),/not finalized/);await assert.rejects(fs.access(f.out),/ENOENT/);
});
test('unexpected privacy UUID and private paths in executed source fail closed with retained partial status',async t=>{
 for(const [name,data] of [['metadata.json','{"uuid":"01234567-89ab-cdef-0123-456789abcdef"}'],['source.bin','const path = "/Users/private/private.js";']]){
  const f=await fixture(t);await write(path.join(f.root,'raw',name),data);await assert.rejects(buildArchive(f.options),/privacy review|explicit review/);const status=JSON.parse(await fs.readFile(path.join(f.out,'build-status.json')));assert.equal(status.status,'failed');await fs.access(path.join(f.out,'partial-index.json'));
 }
});
test('blob corruption, source changes and changed numeric payloads are rejected',async t=>{
 const f=await fixture(t);await buildArchive(f.options);const index=JSON.parse(await fs.readFile(path.join(f.out,'archive-index.json')));const item=index.files.find(x=>x.logicalPath==='raw/same.json');const blob=path.join(f.out,item.blob),original=await fs.readFile(blob);
 await fs.writeFile(blob,Buffer.from('corrupt'));await assert.rejects(verifyArchive(f.out));await fs.writeFile(blob,original);
 await write(path.join(f.root,item.sourcePath),{number:43});await assert.rejects(verifyArchive(f.out,{sourceRoot:f.root}));
 const other=index.files.find(x=>x.logicalPath==='analysis-001/0.json'),publicBytes=Buffer.from('{"value":8}'),stored=gzipSync(publicBytes,{level:9,mtime:0});await fs.unlink(path.join(f.out,other.blob));other.publicSha256=sha256(publicBytes);other.publicBytes=publicBytes.length;other.blob='blobs/'+other.publicSha256+'.gz';other.storedSha256=sha256(stored);other.storedBytes=stored.length;await fs.writeFile(path.join(f.out,other.blob),stored);await write(path.join(f.out,'archive-index.json'),index);await assert.rejects(verifyArchive(f.out),/deep-equal/);
});
test('source symlinks and path escapes are rejected',async t=>{
 const f=await fixture(t);await assert.rejects(buildArchive({...f.options,inputs:['raw=../elsewhere']}));await fs.symlink('/etc/hosts',path.join(f.root,'raw','link'));await assert.rejects(buildArchive(f.options),/symlink/);
});
