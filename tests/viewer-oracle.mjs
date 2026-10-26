import test from 'node:test';
import assert from 'node:assert/strict';
import { compareViewerSnapshots } from '../scripts/apps/viewer-oracle.mjs';

function snapshot() {
 const renderer = () => ({width:16,height:8,pixelSha256:'a'.repeat(64),quality:{pixelRatio:1,antialias:true},work:{calls:3,triangles:64,lines:0,points:0},frame:7});
 return {numeric:[0,1,-2],objects:[{name:'root',type:'Group'}],clips:['1. Walking'],actions:[{name:'1. Walking',time:0.75,effectiveWeight:1,running:true}],state:{grid:true,environment:'Neutral',background:false,playbackSpeed:0},renderers:{main:renderer(),axes:renderer()},diagnostics:{wasmCalls:10},revision:'186'};
}

test('same work and images accept the declared numerical tolerance while counters stay diagnostic',()=>{
 const a=snapshot(),b=snapshot();b.numeric[1]+=1e-11;b.renderers.main.frame=99;b.diagnostics.wasmCalls=20;
 const result=compareViewerSnapshots(a,b);assert(result.equal);assert(result.maxAbsoluteDifference>0);
});

test('candidate comparison rejects each canvas pixel, quality, work, hierarchy and numerical regression',()=>{
 const mutations=[b=>b.numeric[0]=NaN,b=>b.numeric.push(4),b=>b.numeric[2]+=1e-6,b=>b.objects[0].type='Mesh',b=>b.actions[0].time=0.8,b=>b.actions[0].effectiveWeight=0.5,b=>b.actions[0].running=false,b=>b.renderers.main.pixelSha256='b'.repeat(64),b=>b.renderers.axes.pixelSha256='b'.repeat(64),b=>b.renderers.axes.width=9,b=>b.renderers.main.quality.antialias=false,b=>b.renderers.axes.work.lines=9];
 for(const mutate of mutations){const a=snapshot(),b=snapshot();mutate(b);assert.throws(()=>compareViewerSnapshots(a,b),/equivalence failed/);}
});

test('version migration retains differences without silently treating them as candidate equivalence',()=>{
 const a=snapshot(),b=snapshot();b.renderers.main.pixelSha256='b'.repeat(64);b.numeric[1]=1.01;
 const result=compareViewerSnapshots(a,b,{strict:false});assert.equal(result.strict,false);assert.equal(result.equal,false);assert(result.differences.some(x=>x.field==='numeric'));assert(result.differences.some(x=>x.field==='main.pixelSha256'));
});
