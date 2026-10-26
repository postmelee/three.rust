import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as fflate from 'three/addons/libs/fflate.module.js';
import {writeStoredContentZip,verifyStoredContentZip,sha256,editorContentExpectations,selectContentNotices} from '../scripts/apps/editor-content.mjs';
test('native stored ZIP preserves exact paths/bytes and independent decoded buffers across time zones',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'editor-content-test-')),prior=process.env.TZ;
 const entries=[{name:'model.gltf',data:Buffer.from('{"asset":{"version":"2.0"}}')},{name:'Textures/normal.jpg',data:Buffer.from([0,1,2,255,15])}].map(row=>({...row,bytes:row.data.length,sha256:sha256(row.data)}));
 try{
  process.env.TZ='Asia/Seoul';const a=await writeStoredContentZip(entries,path.join(root,'a.zip'),fflate);
  process.env.TZ='America/Los_Angeles';const b=await writeStoredContentZip(entries,path.join(root,'b.zip'),fflate);assert.equal(a.sha256,b.sha256);
  const verified=await verifyStoredContentZip(path.join(root,'a.zip'),entries,fflate);assert.equal(verified.length,2);
  const decoded=fflate.unzipSync(await fs.readFile(path.join(root,'a.zip')));for(const entry of entries){assert.equal(decoded[entry.name].byteOffset,0);assert.equal(decoded[entry.name].buffer.byteLength,entry.bytes);assert.equal(sha256(Buffer.from(decoded[entry.name].buffer)),entry.sha256);}
  await assert.rejects(verifyStoredContentZip(path.join(root,'a.zip'),[{...entries[0],sha256:'0'.repeat(64)},entries[1]],fflate));
  await assert.rejects(verifyStoredContentZip(path.join(root,'a.zip'),entries.slice(0,1),fflate),/Unexpected ZIP entry/);
  await assert.rejects(writeStoredContentZip([{...entries[0],name:'../escape'}],path.join(root,'bad.zip'),fflate),/Unsafe/);
 }finally{if(prior===undefined)delete process.env.TZ;else process.env.TZ=prior;await fs.rm(root,{recursive:true,force:true});}
});

test('notice selection is asset-path exact even when excluded assets share the same source commit',()=>{
 const wanted={sourceURL:'https://raw.githubusercontent.com/group/assets/pin/Models/Chess/README.md'},other={sourceURL:'https://raw.githubusercontent.com/group/assets/pin/Models/Other/README.md'};
 assert.deepEqual(selectContentNotices([wanted,other],['https://github.com/group/assets/blob/pin/Models/Chess/README.md']),[wanted]);
 assert.throws(()=>selectContentNotices([other],['https://github.com/group/assets/blob/pin/Models/Chess/README.md']),/exact original notices/);
 assert.throws(()=>selectContentNotices([wanted,wanted],['https://github.com/group/assets/blob/pin/Models/Chess/README.md']));
});
