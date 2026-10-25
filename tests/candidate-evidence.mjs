import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {tmpdir} from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

// Extract only the actual bounded persistence function. Importing the driver
// itself would parse CLI arguments and launch browsers, which this test avoids.
const source=readFileSync(new URL('../bench/candidate-screen.mjs',import.meta.url),'utf8');
const declaration='async function persistBeforeObservation(';
assert.equal(source.split(declaration).length,2);
const start=source.indexOf(declaration),end=source.indexOf('\n}',start)+2;
assert(end>start);
const persistBeforeObservation=vm.runInNewContext('('+source.slice(start,end)+')');

function directory(t){
 const dir=mkdtempSync(path.join(tmpdir(),'rthree-candidate-evidence-'));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;
}

test('returned timing rows survive a failed post-run page observation',async t=>{
 const file=path.join(directory(t),'run.json'),queryError=Error('page closed after run returned');
 const record={rows:[{tick:240,cpu:.3},{tick:241,cpu:.4}],after:null};
 let partialRowsAvailable=false,queries=0;
 await assert.rejects(persistBeforeObservation(record,'after',async()=>{
  queries++;assert(existsSync(file));throw queryError;
 },value=>{writeFileSync(file,JSON.stringify(value));partialRowsAvailable=true;}),error=>error===queryError);
 assert.equal(queries,1);assert.equal(partialRowsAvailable,true);
 assert.deepEqual(JSON.parse(readFileSync(file,'utf8')),{rows:[{tick:240,cpu:.3},{tick:241,cpu:.4}],after:null});
});

test('returned numeric and pixel correctness state survives the same failure in gzip evidence',async t=>{
 const file=path.join(directory(t),'correctness.json.gz'),queryError=Error('execution context disappeared');
 const record={snapshot:{matrices:[1,0,0,1],pixels:[0,127,255,255]},tick:11,stateAfter:null};
 let returnedStateAvailable=false;
 await assert.rejects(persistBeforeObservation(record,'stateAfter',async()=>{throw queryError;},value=>{
  writeFileSync(file,gzipSync(Buffer.from(JSON.stringify(value))));returnedStateAvailable=true;
 }),error=>error===queryError);
 assert.equal(returnedStateAvailable,true);
 assert.deepEqual(JSON.parse(gunzipSync(readFileSync(file)).toString()),record);
 assert.equal(record.stateAfter,null);
});

test('successful observation enriches preserved evidence without changing returned samples',async t=>{
 const file=path.join(directory(t),'run.json'),rows=[{tick:240,cpu:.3}];
 const record={rows,after:null},writes=[];
 const result=await persistBeforeObservation(record,'after',async()=>{
  assert.equal(JSON.parse(readFileSync(file,'utf8')).after,null);return {tick:240,focused:true};
 },value=>{writeFileSync(file,JSON.stringify(value));writes.push(JSON.parse(readFileSync(file,'utf8')));});
 assert.equal(result,record);assert.equal(record.rows,rows);assert.equal(writes.length,2);
 assert.deepEqual(writes[0],{rows,after:null});
 assert.deepEqual(writes[1],{rows,after:{tick:240,focused:true}});
});

test('failed initial persistence never queries the page or claims available rows',async()=>{
 const failure=Error('initial output write failed');let queried=false,available=false;
 await assert.rejects(persistBeforeObservation({rows:[1],after:null},'after',async()=>{queried=true;},()=>{
  throw failure;
  available=true;
 }),error=>error===failure);
 assert.equal(queried,false);assert.equal(available,false);
});
