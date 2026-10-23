import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import * as O from 'three';
const mode=process.env.RTHREE_FACADE_ENGINE;
const T=await import(`../packages/rthree/${mode==='facade-wasm'?'facade':'facade-js'}.js`);
const bytes=readFileSync('packages/rthree/scene_core.wasm');
const near=(a,b)=>{assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)assert.ok(Math.abs(a[i]-b[i])<=1e-10+1e-12*Math.abs(b[i]),`index ${i}: ${a[i]} != ${b[i]}`);};

test(`${mode}: preparation failure/retry and pre-update aliases`,async()=>{
 const o=new T.Object3D(),alias=o.matrixWorld.elements;
 if(mode==='facade-wasm'){
  assert.throws(()=>o.updateMatrixWorld(),/await init/);
  await assert.rejects(()=>T.init({wasmBytes:new Uint8Array([0])}));
 }
 await Promise.all([T.init({wasmBytes:bytes}),T.init({wasmBytes:bytes})]);
 o.position.x=4;o.updateMatrixWorld();assert.equal(alias,o.matrixWorld.elements);assert.equal(alias[12],4);
 T.release(o);assert.equal(T.diagnostics().liveNodes,0);
});
test(`${mode}: dirty inputs and demand-only materialization`,()=>{
 const root=new T.Group();for(let i=0;i<100;i++)root.add(new T.Object3D());
 T.resetDiagnostics();root.updateMatrixWorld();
 assert.equal(T.diagnostics().materializedBytes,0);
 T.resetDiagnostics();root.updateMatrixWorld();
 assert.equal(T.diagnostics().uploadedBytes,0);assert.equal(T.diagnostics().materializedBytes,0);
 root.children[12].position.x=7;T.resetDiagnostics();root.updateMatrixWorld();
 assert.equal(T.diagnostics().uploadedBytes,112);assert.equal(T.diagnostics().materializedBytes,0);
 assert.equal(root.children[12].matrixWorld.elements[12],7);
 assert.equal(T.diagnostics().materializedBytes,128);
 assert.equal(root.children[12].matrixWorld.elements[12],7);assert.equal(T.diagnostics().materializedBytes,128);
 T.release(root);assert.equal(T.diagnostics().arenas,0);
});
test(`${mode}: randomized partial updates, hierarchy and dirty flags`,()=>{
 let seed=1729;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 const a=Array.from({length:61},()=>new T.Object3D()),b=Array.from({length:61},()=>new O.Object3D());
 for(let i=1;i<a.length;i++){const p=Math.floor((i-1)/3);a[p].add(a[i]);b[p].add(b[i]);}
 const compare=()=>{for(let i=0;i<a.length;i++){near(a[i].matrix.elements,b[i].matrix.elements);near(a[i].matrixWorld.elements,b[i].matrixWorld.elements);assert.equal(a[i].matrixWorldNeedsUpdate,b[i].matrixWorldNeedsUpdate);}};
 for(let frame=0;frame<40;frame++){
  for(let j=0;j<7;j++){
   const i=1+Math.floor(random()*60),x=random()*8-4,q=random();
   for(const o of [a[i],b[i]]){o.position.set(x,x/2,-x);o.rotation.set(q,-q,q/3);o.scale.set(1+q,1-q,-1);o.matrixAutoUpdate=frame%4!==0;if(!o.matrixAutoUpdate)o.matrix.makeTranslation(x,3,2);o.matrixWorldAutoUpdate=frame%7!==0;o.matrixWorldNeedsUpdate=frame%3===0;}
  }
  if(frame%5===0){const i=40+frame%20,p=frame%5;for(const list of [a,b])list[p].add(list[i]);}
  if(frame%3===0){a[11].updateWorldMatrix(true,true,frame%2===0);b[11].updateWorldMatrix(true,true,frame%2===0);}
  else {a[0].updateMatrixWorld(frame%2===0);b[0].updateMatrixWorld(frame%2===0);}
  compare();
 }
 T.release(a[0]);assert.equal(T.diagnostics().arenas,0);
});
test(`${mode}: skips displaced JS math and retains stale observations`,()=>{
 const r=new T.Group(),c=new T.Object3D();r.add(c);
 const compose=T.Matrix4.prototype.compose,multiply=T.Matrix4.prototype.multiplyMatrices;
 T.Matrix4.prototype.compose=T.Matrix4.prototype.multiplyMatrices=()=>{throw Error('displaced JS math');};
 try{
  r.position.x=2;c.position.x=3;r.updateMatrixWorld();assert.equal(c.matrixWorld.elements[12],5);
  c.position.x=8;assert.equal(c.matrixWorld.elements[12],5);
  c.updateMatrix();assert.equal(c.matrix.elements[12],8);assert.equal(c.matrixWorld.elements[12],5);
  c.updateWorldMatrix(true,false);assert.equal(c.matrixWorld.elements[12],10);
  if(mode==='facade-wasm')assert.ok(T.diagnostics().wasmCalls>0);
 }finally{T.Matrix4.prototype.compose=compose;T.Matrix4.prototype.multiplyMatrices=multiply;T.release(r);}
});
test(`${mode}: cached arrays across growth, release, slot reuse and pivot removal`,()=>{
 const root=new T.Group(),o=new T.Object3D();root.add(o);const local=o.matrix.elements,world=o.matrixWorld.elements;
 o.pivot=new T.Vector3(2,0,0);o.scale.x=2;root.updateMatrixWorld();assert.equal(world[12],-2);
 for(let i=0;i<2000;i++)root.add(new T.Object3D());root.updateMatrixWorld();assert.equal(world[12],-2);
 o.pivot=null;root.updateMatrixWorld();assert.equal(world[12],0);
 T.release(root);assert.equal(T.diagnostics().arenas,0);
 const other=new T.Object3D();other.position.x=100;other.updateMatrixWorld();
 o.position.x=4;o.updateMatrixWorld();assert.equal(world[12],4);assert.equal(local[12],4);
 assert.equal(o.matrix.elements,local);assert.equal(o.matrixWorld.elements,world);
 T.release(root);T.release(other);assert.equal(T.diagnostics().liveNodes,0);
});
test(`${mode}: caller-owned arrays and overrides fall back before evaluation`,()=>{
 const root=new T.Group(),o=new T.Object3D();root.add(o);root.updateMatrixWorld();
 const supplied=new Float64Array(o.matrix.elements);o.matrix.elements=supplied;o.matrixAutoUpdate=false;supplied[12]=9;o.matrixWorldNeedsUpdate=true;
 T.resetDiagnostics();root.updateMatrixWorld();assert.equal(o.matrix.elements,supplied);assert.equal(o.matrixWorld.elements[12],9);assert.ok(T.diagnostics().fallbackRoots>0);
 let calls=0;const base=T.Object3D.prototype.updateMatrix;o.updateMatrix=function(){calls++;base.call(this);};o.matrixAutoUpdate=true;o.position.x=6;
 root.updateMatrixWorld();assert.equal(calls,1);assert.equal(o.matrixWorld.elements[12],6);
 T.release(root);assert.equal(T.diagnostics().arenas,0);
});
test(`${mode}: internal matrix reads preserve snapshots and tracked destinations`,()=>{
 const o=new T.Object3D(),ref=new O.Object3D(),alias=o.matrixWorld.elements;
 for(const x of [o,ref]){x.position.set(3,2,1);x.scale.set(2,3,4);x.updateMatrixWorld();}
 T.resetDiagnostics();
 near(new T.Vector3(1,2,3).applyMatrix4(o.matrixWorld).toArray(),new O.Vector3(1,2,3).applyMatrix4(ref.matrixWorld).toArray());
 assert.equal(T.diagnostics().materializedBytes,128);assert.equal(o.matrixWorld.elements,alias);
 near(new T.Matrix4().multiplyMatrices(o.matrixWorld,o.matrixWorld).elements,new O.Matrix4().multiplyMatrices(ref.matrixWorld,ref.matrixWorld).elements);
 assert.equal(o.matrixWorld.determinant(),ref.matrixWorld.determinant());assert.equal(o.matrixWorld.getMaxScaleOnAxis(),ref.matrixWorld.getMaxScaleOnAxis());
 near(o.matrixWorld.clone().elements,ref.matrixWorld.clone().elements);
 o.matrixAutoUpdate=false;o.matrix.copy(new T.Matrix4().makeTranslation(7,8,9));o.matrixWorldNeedsUpdate=true;o.updateMatrixWorld();
 assert.equal(alias[12],7);assert.equal(alias[13],8);assert.equal(alias[14],9);
 T.release(o);
});
