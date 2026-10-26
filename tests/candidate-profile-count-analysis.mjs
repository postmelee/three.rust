import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {analyzeCandidateProfileCounts} from '../scripts/apps/candidate-profile-count-analysis.mjs';
import {analyzeCandidateProfile} from '../scripts/apps/candidate-profile-analysis.mjs';

const frame=(functionName,url='')=>({functionName,url,scriptId:'1',lineNumber:0,columnNumber:0});
const fixture=()=>({startTime:100,endTime:1000,nodes:[
 {id:1,callFrame:frame('(root)'),children:[2,5,6,7]},
 {id:2,callFrame:frame('Skeleton.update','/core.js'),children:[3,4]},
 {id:3,callFrame:frame('materialize','/facade-state.js')},
 {id:4,callFrame:frame('wasm-function[1]','wasm://verified')},
 {id:5,callFrame:frame('(idle)')},{id:6,callFrame:frame('(program)')},{id:7,callFrame:frame('(garbage collector)')}
],samples:[3,4,5,3,6,7],timeDeltas:[10,-2,0,100,20,3]});
const resolve=async f=>f.url.startsWith('wasm:')?{label:'facade_update',sourceStatus:'verified-wasm',wasm:{resolved:true,functionIndex:1,moduleSha256:'b'.repeat(64)}}:{label:f.functionName,sourceStatus:f.url?'verified-js':'unresolved-native',source:f.url?{file:'candidate/packages/rthree'+f.url,sha256:'a'.repeat(64)}:null};
test('negative intervals retain every original sample ID while the historical weighted gate still fails',async()=>{
 const profile=fixture(),before=structuredClone(profile),result=await analyzeCandidateProfileCounts(profile,resolve);
 assert.equal(result.method,'counts-only-secondary');assert.equal(result.performanceQualification,false);assert.equal(result.totalHits,6);assert.equal(result.rawTiming.negativeCount,1);assert.equal(result.rawTiming.zeroCount,1);
 assert.deepEqual(result.rawTiming.negativeEntries,[{sampleIndex:1,nodeId:4,rawTimeDelta:-2}]);assert.deepEqual(result.sampleNodeIds,profile.samples);assert.deepEqual(result.nodes.map(node=>node.id),profile.nodes.map(node=>node.id));assert.deepEqual(profile,before);
 await assert.rejects(analyzeCandidateProfile(profile,resolve),/Invalid sample timeDelta/);
 for(const node of result.nodes)assert(!Object.hasOwn(node,'selfMs')&&!Object.hasOwn(node,'inclusiveMs'));
});
test('changing valid raw timestamp metadata cannot change counts, categories, identities or input order',async()=>{
 const profile=fixture(),changed=structuredClone(profile);changed.startTime=10000;changed.endTime=100000;changed.timeDeltas=[1000000000,0,5,-100,3,7];
 const first=await analyzeCandidateProfileCounts(profile,resolve),second=await analyzeCandidateProfileCounts(changed,resolve);delete first.rawTiming;delete second.rawTiming;assert.deepEqual(second,first);
});
test('exclusive, context and source counts account once; inclusive ancestry overlaps and excludes nothing silently',async()=>{
 const result=await analyzeCandidateProfileCounts(fixture(),resolve);
 assert.equal(result.buckets['facade matrix materialization/proxy'].hits,2);assert.equal(result.buckets['Wasm verified function'].hits,1);assert.equal(result.contextBuckets['skeleton/palette'].hits,3);assert.equal(result.activeHits,4);assert.deepEqual(result.activeDenominatorExcludes,['idle','program/native-unresolved','root']);
 assert.equal(result.nodes.find(node=>node.id===1).inclusiveHits,6);assert.equal(result.nodes.find(node=>node.id===2).inclusiveHits,3);assert.equal(result.nodes.find(node=>node.id===3).selfHits,2);assert.equal(result.nodes.find(node=>node.id===4).inclusiveHits,1);
 for(const key of ['inputSamples','exclusiveNodeHits','categoryHits','contextHits','sourceCoverageHits','rootInclusiveHits'])assert.equal(result.accounting[key],6);assert.equal(result.accounting.allSamplesAccounted,true);
 const unresolved=await analyzeCandidateProfileCounts(fixture());assert.equal(unresolved.buckets['source unresolved'].hits,2);assert.equal(unresolved.buckets['Wasm unresolved'].hits,1);assert.equal(unresolved.sourceCoverage['unresolved-no-resolver'].hits,6);
});
test('malformed tree, unknown sample, nonfinite delta or source mismatch cannot become partial counts',async()=>{
 for(const mutate of [p=>p.samples[0]=99,p=>p.timeDeltas[0]=NaN,p=>p.timeDeltas[0]=Infinity,p=>p.timeDeltas.pop(),p=>p.nodes[1].children.push(5),p=>p.nodes.push({...p.nodes[0]}),p=>p.nodes[0].children.push(99),p=>p.nodes[2].children=[1],p=>p.nodes[1].callFrame.lineNumber=null,p=>p.endTime=-1]){const profile=fixture();mutate(profile);await assert.rejects(analyzeCandidateProfileCounts(profile,resolve));}
 await assert.rejects(analyzeCandidateProfileCounts(fixture(),async()=>{throw Error('Captured source hash mismatch');}),/source hash mismatch/);
});

test('secondary CLI preserves both complete and failed weighted outcomes, while still rejecting unverified or absent raw evidence',async t=>{
 const directory=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'rthree-counts-provenance-')));t.after(()=>fs.rm(directory,{recursive:true,force:true}));
 const script=fileURLToPath(new URL('../scripts/apps/viewer-profile-count-analyze.mjs',import.meta.url)),digest=bytes=>createHash('sha256').update(bytes).digest('hex');
 for(const status of ['analysis-complete','incomplete-invalid-profiles','incomplete-no-profiles','unverified-raw']){
  const parent=path.join(directory,status),root=path.join(parent,'capture'),weightedRoot=path.join(parent,'weighted'),out=path.join(parent,'counts'),run=path.join(root,'run-0');await fs.mkdir(run,{recursive:true});await fs.mkdir(weightedRoot);
  const profile=fixture();if(status==='analysis-complete')profile.timeDeltas[1]=2;const bytes=Buffer.from(JSON.stringify(profile));await fs.writeFile(path.join(run,'profile.cpuprofile'),bytes);
  const entry={sequence:1,scenario:'native-scene',engine:'pure-r186',round:0,directory:'run-0',status:'captured'},captureToolSha='a'.repeat(40),candidateSha='c'.repeat(40);
  await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify({kind:'viewer-profile-smoke-only',configuration:{profiling:true},candidateSha,group:'migration',status:'capture-complete-attribution-pending',sourceBefore:{tooling:{sha:captureToolSha}},runs:[entry]}));
  const row={...entry,file:'weighted-run.json'},failed=status!=='analysis-complete',retained={status:status==='unverified-raw'?'incomplete-invalid-profiles':status,captureToolSha,candidateSha,group:'migration',runs:failed?[]:[row],analysisFailures:failed?[row]:[]};
  await fs.writeFile(path.join(weightedRoot,'summary.json'),JSON.stringify(retained));await fs.writeFile(path.join(weightedRoot,row.file),JSON.stringify({rawProfile:{sha256:digest(bytes),integrity:status==='unverified-raw'?'unchecked':'unchanged'}}));
  await assert.rejects(promisify(execFile)(process.execPath,[script,root,weightedRoot,out]),error=>{assert.equal(error.code,1);if(status==='incomplete-no-profiles')assert.match(error.stderr,/complete or explicitly failed weighted result/);else if(status==='unverified-raw')assert.match(error.stderr,/not verified unchanged/);return true;});
  if(status==='analysis-complete'||status==='incomplete-invalid-profiles'){
   const summary=JSON.parse(await fs.readFile(path.join(out,'summary.json')));assert.equal(summary.historicalWeightedGate.status,status);assert.equal(summary.historicalWeightedGate.failedRuns,failed?1:0);assert.equal(summary.historicalWeightedGate.verdictUnchanged,true);assert.equal(summary.performanceQualification,false);
   // Accepted provenance does not waive the separate captured-source gate.
   assert.equal(summary.analysisFailures.length,1);assert.equal(summary.runs.length,0);const failure=JSON.parse(await fs.readFile(path.join(out,summary.analysisFailures[0].file)));assert.match(failure.error.message,/profile-manifest.json/);assert.equal(failure.rawProfile.sha256,digest(bytes));
  }else await assert.rejects(fs.access(path.join(out,'summary.json')));
  assert.deepEqual(await fs.readFile(path.join(run,'profile.cpuprofile')),bytes);
 }
});
