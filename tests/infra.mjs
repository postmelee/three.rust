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
