import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

const dir=process.argv[2];if(!dir)throw Error('Usage: node bench/facade-summary.mjs RESULT_DIRECTORY');
function read(name){const p=`${dir}/${name}`;return JSON.parse(existsSync(p)?readFileSync(p):gunzipSync(readFileSync(p+'.gz')));}
const manifest=read('manifest.json'),c=manifest.config;
assert.equal(manifest.status,'complete','Incomplete experiments cannot produce a performance summary');
assert.equal(manifest.sourceTreeDirty,false,'Primary evidence requires a clean source tree');
assert.equal(c.timings,false,'Diagnostic timings must remain separate');
assert.equal(c.profile,false);assert.ok(c.repeats>=3,'Smoke runs are not repeated evidence');
const scenarios=manifest.suite==='boundary'?['boundary']:c.scenarios;
const expected=new Set();for(let rep=0;rep<c.repeats;rep++)for(const scenario of scenarios)for(const engine of c.engines)expected.add(`${scenario}-${engine}-${rep}.json`);
assert.equal(manifest.runs.length,expected.size);assert.equal(new Set(manifest.runs).size,expected.size);
for(const file of manifest.runs)assert.ok(expected.delete(file),`Unexpected run ${file}`);
assert.equal(expected.size,0);
const quant=(a,q)=>{const values=a.slice().sort((a,b)=>a-b);return values[Math.floor((values.length-1)*q)];};
const median=a=>{const values=a.slice().sort((a,b)=>a-b),m=Math.floor(values.length/2);return values.length%2?values[m]:(values[m-1]+values[m])/2;};
const qs=values=>Object.fromEntries([['p50',.5],['p95',.95],['p99',.99]].map(([k,q])=>[k,quant(values,q)]));
const groups=new Map(),clocks=[],work=new Map();
for(const file of manifest.runs){
 const run=read(file);assert.ok(run.clock.crossOriginIsolated);clocks.push(run.clock.minPositiveDeltaMs);
 if(manifest.suite==='render'){
  const key=`${run.rep}/${run.scenario}`,description={info:run.info,objects:run.env.objects,width:run.env.width,height:run.env.height,dpr:run.env.dpr};
  if(work.has(key))assert.deepEqual(description,work.get(key),`Different rendered work: ${file}`);else work.set(key,description);
 }
 const cases=manifest.suite==='boundary'?run.cases:[{name:run.scenario,rows:run.rows}];
 if(manifest.suite==='boundary')assert.deepEqual(cases.map(x=>x.name),['static-none','sparse-none','dense-none','sparse-sparse','dense-all']);
 for(const item of cases){
  assert.equal(item.rows.length,c.samples);assert.ok(item.rows.every(r=>Number.isFinite(r.cpu)&&r.cpu>=0));
  const key=`${item.name}/${run.engine}`;
  if(!groups.has(key))groups.set(key,{scenario:item.name,engine:run.engine,runs:[]});
  const interval=item.rows.map(r=>r.interval).filter(Number.isFinite);
  groups.get(key).runs.push({rep:run.rep,cpu:qs(item.rows.map(r=>r.cpu)),interval:interval.length?qs(interval):null});
 }
}
const rows=[];
for(const g of groups.values()){
 assert.equal(g.runs.length,c.repeats);assert.equal(new Set(g.runs.map(x=>x.rep)).size,c.repeats);
 g.runs.sort((a,b)=>a.rep-b.rep);
 g.cpu=Object.fromEntries(['p50','p95','p99'].map(k=>[k,median(g.runs.map(r=>r.cpu[k]))]));
 g.runP50Range=[Math.min(...g.runs.map(r=>r.cpu.p50)),Math.max(...g.runs.map(r=>r.cpu.p50))];
 g.interval=g.runs.every(r=>r.interval)?Object.fromEntries(['p50','p95','p99'].map(k=>[k,median(g.runs.map(r=>r.interval[k]))])):null;
 rows.push(g);
}
const paired=[];
for(const candidate of rows.filter(x=>x.engine==='facade-wasm'))for(const control of ['original','facade-js','wasm']){
 const reference=rows.find(x=>x.scenario===candidate.scenario&&x.engine===control);if(!reference)continue;
 const differences=candidate.runs.map((r,i)=>reference.runs[i].cpu.p50-r.cpu.p50);
 paired.push({scenario:candidate.scenario,control,candidate:'facade-wasm',positiveMeansSavedMs:true,perRunSavedP50Ms:differences,medianSavedP50Ms:median(differences),fasterRuns:differences.filter(x=>x>0).length,repeats:c.repeats});
}
console.log(JSON.stringify({commit:manifest.commit,suite:manifest.suite,protocol:'per-run floor((n - 1) * q) sample quantiles, then arithmetic median of run quantiles; no pooled-frame confidence claim',config:c,clockRangeMs:[Math.min(...clocks),Math.max(...clocks)],matchedFinalRenderWork:manifest.suite==='render',rows,paired,limits:'Shared-cloud CPU/software-renderer evidence; no hardware/FPS or product qualification'},null,2));
