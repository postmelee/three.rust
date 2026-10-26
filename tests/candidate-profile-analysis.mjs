import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {analyzeCandidateProfile,parseWasmSymbols,resolveWasmFrame} from '../scripts/apps/candidate-profile-analysis.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const leb=n=>{const bytes=[];do{let b=n&127;n=Math.floor(n/128);if(n)b|=128;bytes.push(b);}while(n);return bytes;};
const string=value=>{const b=[...Buffer.from(value)];return [...leb(b.length),...b];};
const section=(id,body)=>[id,...leb(body.length),...body];
function moduleBytes({names=true,duplicateName=false,exportIndex=1}={}) {
 const nameMap=[2,0,...string(duplicateName?'shared':'host_function'),1,...string(duplicateName?'shared':'facade_update')];
 return Uint8Array.from([0,97,115,109,1,0,0,0,
  ...section(1,[1,0x60,0,0]),
  ...section(2,[1,...string('env'),...string('host'),0,0]),
  ...section(3,[1,0]),
  ...section(7,[1,...string('exported_update'),0,...leb(exportIndex)]),
  ...section(10,[1,2,0,0x0b]),
  ...(names?section(0,[...string('name'),1,...leb(nameMap.length),...nameMap]):[])
 ]);
}
const frame=(functionName,url='wasm://wasm/captured')=>({functionName,scriptId:'7',url,lineNumber:0,columnNumber:9});

test('Wasm map preserves imported function index offsets, names and exact artifact identity',()=>{
 const bytes=moduleBytes(),map=parseWasmSymbols(bytes,{expectedSha256:hash(bytes)});
 assert.equal(map.verified,true);assert.equal(map.importedFunctionCount,1);assert.equal(map.functionCount,2);
 assert.deepEqual(map.functions[0].import,{module:'env',name:'host',typeIndex:0});
 assert.equal(map.functions[1].name,'facade_update');assert.deepEqual(map.functions[1].exports,['exported_update']);
 const resolved=resolveWasmFrame(frame('wasm-function[1]'),map);
 assert.equal(resolved.functionIndex,1);assert.equal(resolved.label,'facade_update');assert.equal(resolved.moduleSha256,hash(bytes));
 assert.equal(resolveWasmFrame(frame('exported_update'),map).matchedBy,'exact-name');
});

test('Wasm missing names stay index-labelled and unverified, ambiguous or offset-only mappings stay unresolved',()=>{
 const bytes=moduleBytes({names:false}),map=parseWasmSymbols(bytes,{expectedSha256:hash(bytes)});
 assert.equal(map.nameSectionPresent,false);assert.equal(resolveWasmFrame(frame('wasm-function[0]'),map).label,'wasm-function[0]');
 assert.equal(resolveWasmFrame(frame('wasm-function[1]'),parseWasmSymbols(bytes)).resolved,false);
 assert.equal(resolveWasmFrame(frame(''),map).resolved,false);
 assert.equal(resolveWasmFrame(frame('wasm-function[99]'),map).resolved,false);
 const ambiguous=moduleBytes({duplicateName:true});
 assert.equal(resolveWasmFrame(frame('shared'),parseWasmSymbols(ambiguous,{expectedSha256:hash(ambiguous)})).resolved,false);
});

test('Wasm parser rejects changed identity, truncated/overflowing sections and invalid indices',()=>{
 const bytes=moduleBytes();
 assert.throws(()=>parseWasmSymbols(bytes,{expectedSha256:'0'.repeat(64)}),/SHA-256 mismatch/);
 assert.throws(()=>parseWasmSymbols(bytes.subarray(0,bytes.length-1)),/Truncated/);
 assert.throws(()=>parseWasmSymbols(Uint8Array.from([0,97,115,109,1,0,0,0,0,255,255,255,255,127])),/Overflowing/);
 assert.throws(()=>parseWasmSymbols(moduleBytes({exportIndex:2})),/out of range/);
 const invalid=Uint8Array.from(bytes);invalid[0]=1;assert.throws(()=>parseWasmSymbols(invalid),/header/);
});

test('unrelated custom and future sections are bounded and skipped without changing symbol identity',()=>{
 const bytes=Uint8Array.from([...moduleBytes(),...section(0,[...string('producers'),1,2,3]),...section(14,[9,8,7])]);
 const map=parseWasmSymbols(bytes,{expectedSha256:hash(bytes)});
 assert.equal(map.functionCount,2);assert.equal(map.functions[1].name,'facade_update');
});

const jsFrame=(name,url)=>({functionName:name,scriptId:'4',url,lineNumber:2,columnNumber:3});
function profile() {
 return {startTime:0,endTime:12000,nodes:[
  {id:1,callFrame:jsFrame('(root)',''),children:[2,5]},
  {id:2,callFrame:jsFrame('Skeleton.update','/core.js'),children:[3,4]},
  {id:3,callFrame:jsFrame('materialize','/facade-state.js')},
  {id:4,callFrame:frame('wasm-function[1]')},
  {id:5,callFrame:jsFrame('(idle)','')}
 ],samples:[3,4,5,3],timeDeltas:[1000,2000,3000,6000]};
}
async function resolver(f) {
 if(f.url.startsWith('wasm:')){const bytes=moduleBytes();return {label:'facade_update',sourceStatus:'verified-wasm',source:{file:'candidate/packages/rthree/scene_core.wasm',sha256:hash(bytes)},wasm:resolveWasmFrame(f,parseWasmSymbols(bytes,{expectedSha256:hash(bytes)}))};}
 return {label:f.functionName,sourceStatus:f.url?'verified-js':'unresolved-native',source:f.url?{file:'candidate/packages/rthree'+f.url,sha256:'a'.repeat(64)}:null};
}

test('exclusive and contextual samples account once while inclusive ancestry overlaps',async()=>{
 const p=profile(),before=JSON.stringify(p),summary=await analyzeCandidateProfile(p,resolver);
 assert.equal(summary.weightedMs,12);assert.equal(summary.activeMs,9);assert.equal(summary.samples,4);
 assert.equal(summary.buckets['facade matrix materialization/proxy'].sampledMs,7);
 assert.equal(summary.buckets['Wasm verified function'].sampledMs,2);
 assert.equal(summary.contextBuckets['skeleton/palette'].sampledMs,9);
 assert.equal(summary.inclusive.find(n=>n.id===1).inclusiveMs,12);
 assert.equal(summary.inclusive.find(n=>n.id===2).inclusiveMs,9);
 assert.equal(summary.exclusive.find(n=>n.id===3).hits,2);
 assert.deepEqual(summary.exclusive.find(n=>n.id===4).callFrame,p.nodes[3].callFrame);
 assert.equal(summary.sensitivity.longGaps.length,1);assert.equal(summary.sensitivity.longGaps[0].sample,3);
 assert.equal(summary.sensitivity.shortGapBuckets['facade matrix materialization/proxy'].sampledMs,1);
 assert.equal(JSON.stringify(p),before);
});

test('unverified named JavaScript and Wasm remain unresolved rather than guessed kernels',async()=>{
 const summary=await analyzeCandidateProfile(profile(),async f=>({label:f.functionName,sourceStatus:'unresolved-source'}));
 assert.equal(summary.buckets['source unresolved'].sampledMs,7);
 assert.equal(summary.buckets['Wasm unresolved'].sampledMs,2);
 assert.equal(summary.sourceCoverage['unresolved-source'].samples,4);
});

test('source mismatch rejection propagates instead of yielding a partial attribution',async()=>{
 await assert.rejects(analyzeCandidateProfile(profile(),async()=>{throw Error('source hash mismatch');}),/source hash mismatch/);
});

test('profile accounting rejects unknown samples, malformed time deltas and graph ambiguity',async()=>{
 const mutations=[
  p=>p.samples[0]=99,
  p=>p.timeDeltas[0]=-1,
  p=>p.timeDeltas[0]=NaN,
  p=>p.timeDeltas.pop(),
  p=>p.nodes[1].children.push(5),
  p=>p.nodes.push({...p.nodes[0]}),
  p=>p.nodes[0].children.push(99),
  p=>p.nodes[2].children=[1],
  p=>p.endTime=-1
 ];
 for(const mutate of mutations){const p=profile();mutate(p);await assert.rejects(analyzeCandidateProfile(p,resolver));}
});

test('verified source context distinguishes JS kernels, proxy reads and operation preparation',async()=>{
 const p={startTime:0,endTime:3000,nodes:[{id:1,callFrame:jsFrame('(root)',''),children:[2,3,4]},
  {id:2,callFrame:jsFrame('trackedMatrix.get','/facade-state.js')},{id:3,callFrame:jsFrame('evaluateFacade','/facade-kernel.js')},{id:4,callFrame:jsFrame('syncInputs','/facade-state.js')}],samples:[2,3,4],timeDeltas:[1000,1000,1000]};
 const summary=await analyzeCandidateProfile(p,resolver);
 assert.equal(summary.buckets['facade matrix materialization/proxy'].samples,1);
 assert.equal(summary.buckets['matched-JS kernel'].samples,1);
 assert.equal(summary.buckets['facade operation preparation'].samples,1);
});
test('scalar and flag accessors cannot be classified as matrix materialization by a generic get/set name',async()=>{
 const labels=['scalar.get','trackFacadeObject.get','trackedMatrix.get','trackedMatrix.set','get','set'];
 const p={startTime:0,endTime:6000,nodes:[{id:1,callFrame:jsFrame('(root)',''),children:labels.map((_,i)=>i+2)},...labels.map((name,i)=>({id:i+2,callFrame:jsFrame(name,'/facade-state.js')}))],samples:labels.map((_,i)=>i+2),timeDeltas:labels.map(()=>1000)};
 const summary=await analyzeCandidateProfile(p,resolver);
 assert.equal(summary.buckets['facade scalar/input/flag tracking'].samples,2);
 assert.equal(summary.buckets['facade matrix materialization/proxy'].samples,2);
 assert.equal(summary.buckets['facade other'].samples,2);
});

test('full-rate profiles do not depend on JavaScript argument-spread limits',async()=>{
 const count=130001,p={startTime:0,endTime:count*100,nodes:[
  {id:1,callFrame:jsFrame('(root)',''),children:[2]},
  {id:2,callFrame:jsFrame('(idle)','')}
 ],samples:Array(count).fill(2),timeDeltas:Array(count).fill(100)};
 const result=await analyzeCandidateProfile(p);
 assert.equal(result.samples,count);assert.equal(result.sampleGapsUs.min,100);assert.equal(result.sampleGapsUs.max,100);
 assert.equal(result.buckets.idle.samples,count);assert.equal(result.buckets.idle.percentOfActive,null);
});
