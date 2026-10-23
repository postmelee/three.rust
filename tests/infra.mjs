import {test} from 'node:test';
import assert from 'node:assert/strict';
import {configuration,hardwareRenderer} from '../bench/config.mjs';
import {syncRoadmap} from '../scripts/roadmap-sync.mjs';
test('hardware measurement rejects software, missing and masked renderers',()=>{
 for(const s of [undefined,'','WebKit WebGL','ANGLE (Google, Vulkan SwiftShader Device)','llvmpipe (LLVM)','Microsoft Basic Render Driver','Mesa offscreen','WARP'])assert.throws(()=>hardwareRenderer(s));
 for(const s of ['ANGLE (NVIDIA, NVIDIA T4, OpenGL)','ANGLE (Intel, Intel UHD Graphics, OpenGL)','Apple M3'])assert.equal(hardwareRenderer(s),s);
});
test('hardware configuration never forces software; options are explicit and validated',()=>{
 const c=configuration(['mode=hardware']);assert.deepEqual(c.args,[]);assert.equal(c.headless,false);
 assert.equal(configuration(['mode=hardware','headless=true']).headless,true);
 assert.deepEqual(configuration(['mode=hardware','angle=vulkan']).args,['--use-gl=angle','--use-angle=vulkan']);
 for(const a of [['mode=other'],['samples=1'],['repeats=-1'],['warmup=x'],['profile=yes'],['engines=wasm,wasm'],['scenarios=missing'],['angle=vulkan'],['out=x','out=y'],['unknown=true']])assert.throws(()=>configuration(a));
 assert(configuration([]).args.includes('--use-angle=swiftshader'));
});
function fixture(marker=true){
 const milestones=[],issue={number:2,state:'open',body:marker?'<!-- rthree-roadmap:one -->':'Unrelated',milestone:null},calls=[];
 const api={listMilestones(){},async get(){return {data:issue};},async createMilestone(args){calls.push(['create',args]);const data={...args,number:1,state:'open'};milestones.push(data);return {data};},async update(args){calls.push(['update',args]);issue.milestone={number:args.milestone};return {data:issue};}};
 return {args:{github:{rest:{issues:api},paginate:async()=>milestones},owner:'test',repo:'test',roadmap:{milestones:[{key:'m3',title:'M3',description:'test'}],tasks:[{key:'one',issue:2,milestone:'m3'}]}},calls,issue,milestones};
}
test('roadmap sync is idempotent and only assigns milestones',async()=>{
 const f=fixture();await syncRoadmap(f.args);await syncRoadmap(f.args);
 assert.deepEqual(f.calls.map(c=>c[0]),['create','update']);assert.equal(f.issue.state,'open');
 assert.deepEqual(Object.keys(f.calls[1][1]).sort(),['issue_number','milestone','owner','repo']);
});
test('roadmap sync refuses unmarked issues and closed milestones',async()=>{
 const f=fixture(false);await assert.rejects(syncRoadmap(f.args),/marker/);assert.equal(f.calls.length,0);
 const g=fixture();g.milestones.push({title:'M3',state:'closed',number:1});await assert.rejects(syncRoadmap(g.args),/closed/);assert.equal(g.calls.length,0);
});
test('analysis refuses false confidence from one run or zero reference timings',async()=>{
 const {mkdtempSync,writeFileSync,readFileSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');const {execFileSync}=await import('node:child_process');
 const dir=mkdtempSync(tmpdir()+'/rthree-analysis-');
 try{
  const m={status:'complete',repeats:1,samples:2,scenarios:['small'],engines:['original','js'],runs:['a.json','b.json']};
  writeFileSync(dir+'/manifest.json',JSON.stringify(m));
  for(const [file,engine,cpu] of [['a.json','original',0],['b.json','js',1]])writeFileSync(dir+'/'+file,JSON.stringify({scenario:'small',engine,rep:0,rows:[{cpu,interval:16},{cpu,interval:17}],info:{},startupMs:1}));
  execFileSync(process.execPath,['bench/analyze.mjs',dir]);
  let x=JSON.parse(readFileSync(dir+'/analysis.json')).comparisons[0].relativeP50Percent;
  assert.equal(x.median,null);assert.equal(x.lo,null);assert.equal(x.omitted,1);
  const a=JSON.parse(readFileSync(dir+'/a.json'));a.rows.forEach(x=>x.cpu=1);writeFileSync(dir+'/a.json',JSON.stringify(a));
  execFileSync(process.execPath,['bench/analyze.mjs',dir]);
  x=JSON.parse(readFileSync(dir+'/analysis.json')).comparisons[0].relativeP50Percent;
  assert.equal(x.median,0);assert.equal(x.lo,null);assert.equal(x.hi,null);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
