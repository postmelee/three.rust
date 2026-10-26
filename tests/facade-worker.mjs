import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import * as O from 'three';
const mode=process.env.RTHREE_FACADE_ENGINE;
const T=await import(`../packages/rthree/${mode==='facade-wasm'?'facade':mode==='prepared-wasm'?'prepared':mode}.js`);
const bytes=readFileSync('packages/rthree/scene_core.wasm');
const near=(a,b)=>{assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)assert.ok(Math.abs(a[i]-b[i])<=1e-10+1e-12*Math.abs(b[i]),`index ${i}: ${a[i]} != ${b[i]}`);};

test(`${mode}: preparation failure/retry and pre-update aliases`,async()=>{
 const o=new T.Object3D(),alias=o.matrixWorld.elements;
 if(mode.endsWith('-wasm')){
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
  if(mode.endsWith('-wasm'))assert.ok(T.diagnostics().wasmCalls>0);
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
test(`${mode}: internal backing arrays never escape through overridden consumers`,()=>{
 const root=new T.Object3D(),child=new T.Object3D();root.add(child);root.updateMatrixWorld();
 const alias=root.matrixWorld.elements;let observed;
 const vector=new T.Vector3();vector.fromArray=function(array){observed=array;return this;};
 vector.setFromMatrixColumn(root.matrixWorld,0);assert.equal(observed,alias);
 root.matrixAutoUpdate=false;root.matrixWorldAutoUpdate=false;observed[12]=12;child.position.x=1;
 root.updateMatrixWorld(true);assert.equal(child.matrixWorld.elements[12],13);T.release(root);
});

// These calls select one operation even when the object has a parent/children.
// The same assertions run in facade and prepared JS/Wasm workers.
const oneOperation=()=>{
 const d=T.diagnostics();
 assert.equal(d.batches,1);assert.equal(d.nodes,1);assert.equal(d.operationBytes,28);assert.equal(d.fallbackRoots,0);
 assert.equal(d.wasmCalls,mode.endsWith('-wasm')?1:0);assert.equal(d.wasmNodes,mode.endsWith('-wasm')?1:0);
};
test(`${mode}: one-node selective updates retain parent snapshots, flags and aliases`,()=>{
 for(const auto of [false,true])for(const worldAuto of [false,true])for(const dirty of [false,true])for(const force of [false,true]){
  const a=new T.Group(),b=new O.Group(),c=new T.Object3D(),d=new O.Object3D(),e=new T.Object3D(),f=new O.Object3D();
  a.add(c);b.add(d);c.add(e);d.add(f);
  const local=c.matrix.elements,world=c.matrixWorld.elements;
  try{
   for(const [root,child,leaf] of [[a,c,e],[b,d,f]]){
    root.position.set(3,2,1);child.position.set(2,1,-1);leaf.position.x=4;root.updateMatrixWorld();
    root.position.x=50;leaf.position.x=80; // Both remain unevaluated by the selective call.
    child.position.set(7,-2,5);child.scale.set(-2,3,0.5);child.rotation.set(0.2,-0.4,0.1);
    child.matrix.elements[12]=11;child.matrixWorld.elements[13]=13;
    child.matrixAutoUpdate=auto;child.matrixWorldAutoUpdate=worldAuto;child.matrixWorldNeedsUpdate=dirty;
   }
   T.resetDiagnostics();c.updateWorldMatrix(false,false,force);d.updateWorldMatrix(false,false,force);oneOperation();
   assert.equal(c.matrix.elements,local);assert.equal(c.matrixWorld.elements,world);
   for(const [actual,expected] of [[a,b],[c,d],[e,f]]){
    near(actual.matrix.elements,expected.matrix.elements);near(actual.matrixWorld.elements,expected.matrixWorld.elements);
    assert.equal(actual.matrixWorldNeedsUpdate,expected.matrixWorldNeedsUpdate);
   }
  }finally{T.release(a);}
 }
 assert.equal(T.diagnostics().liveNodes,0);
});
test(`${mode}: one-node local compose keeps world and relatives stale`,()=>{
 const a=new T.Group(),b=new O.Group(),c=new T.Object3D(),d=new O.Object3D(),e=new T.Object3D(),f=new O.Object3D();
 a.add(c);b.add(d);c.add(e);d.add(f);
 const local=c.matrix.elements,world=c.matrixWorld.elements;
 try{
  for(const [root,child,leaf,Vector] of [[a,c,e,T.Vector3],[b,d,f,O.Vector3]]){
   root.position.x=3;child.position.x=2;leaf.position.x=4;root.updateMatrixWorld();
   root.position.x=50;leaf.position.x=80;child.position.set(7,-2,5);child.scale.set(-2,3,0.5);
   child.pivot=new Vector(1,2,3);child.matrixAutoUpdate=false;child.matrixWorldAutoUpdate=false;child.matrixWorldNeedsUpdate=false;
  }
  T.resetDiagnostics();c.updateMatrix();d.updateMatrix();oneOperation();
  assert.equal(c.matrix.elements,local);assert.equal(c.matrixWorld.elements,world);
  for(const [actual,expected] of [[a,b],[c,d],[e,f]]){
   near(actual.matrix.elements,expected.matrix.elements);near(actual.matrixWorld.elements,expected.matrixWorld.elements);
   assert.equal(actual.matrixWorldNeedsUpdate,expected.matrixWorldNeedsUpdate);
  }
  assert.equal(c.matrixWorldNeedsUpdate,true);
 }finally{T.release(a);}
 assert.equal(T.diagnostics().liveNodes,0);
});
test(`${mode}: one-node routes preserve replaced-array and override fallback`,()=>{
 const a=new T.Group(),b=new O.Group(),c=new T.Object3D(),d=new O.Object3D();a.add(c);b.add(d);
 try{
  for(const [root,child] of [[a,c],[b,d]]){root.position.x=2;root.updateMatrixWorld();child.matrix.elements=new Float64Array(child.matrix.elements);child.matrix.elements[12]=9;child.matrixAutoUpdate=false;child.matrixWorldNeedsUpdate=true;}
  const supplied=c.matrix.elements;
  T.resetDiagnostics();c.updateWorldMatrix(false,false,true);d.updateWorldMatrix(false,false,true);
  near(c.matrixWorld.elements,d.matrixWorld.elements);assert.equal(c.matrix.elements,supplied);
  let counts=T.diagnostics();assert.ok(counts.fallbackRoots>0);assert.equal(counts.batches,0);assert.equal(counts.nodes,0);assert.equal(counts.operationBytes,0);
 }finally{T.release(a);}
 const o=new T.Object3D(),ref=new O.Object3D();let calls=0,expectedCalls=0;
 o.updateMatrix=function(){calls++;T.Object3D.prototype.updateMatrix.call(this);};
 ref.updateMatrix=function(){expectedCalls++;O.Object3D.prototype.updateMatrix.call(this);};
 try{
  o.position.x=ref.position.x=6;T.resetDiagnostics();o.updateWorldMatrix(false,false,true);ref.updateWorldMatrix(false,false,true);
  assert.equal(calls,expectedCalls);assert.equal(calls,1);near(o.matrixWorld.elements,ref.matrixWorld.elements);
  const counts=T.diagnostics();assert.ok(counts.fallbackRoots>0);assert.equal(counts.batches,0);assert.equal(counts.nodes,0);assert.equal(counts.operationBytes,0);
 }finally{T.release(o);}
 assert.equal(T.diagnostics().liveNodes,0);
});
test(`${mode}: one-node aliases survive arena growth and released slot reuse`,()=>{
 const o=new T.Object3D(),ref=new O.Object3D(),local=o.matrix.elements,world=o.matrixWorld.elements,others=[];
 try{
  o.position.x=ref.position.x=3;o.updateWorldMatrix(false,false);ref.updateWorldMatrix(false,false);near(world,ref.matrixWorld.elements);
  for(let i=0;i<80;i++){const object=new T.Object3D();others.push(object);object.position.x=i;object.updateMatrix();}
  o.position.x=ref.position.x=7;T.resetDiagnostics();o.updateWorldMatrix(false,false,true);ref.updateWorldMatrix(false,false,true);oneOperation();
  near(local,ref.matrix.elements);near(world,ref.matrixWorld.elements);
  T.release(o);const replacement=new T.Object3D();others.push(replacement);replacement.position.x=100;replacement.updateWorldMatrix(false,false);
  assert.equal(world[12],7);
  o.position.x=ref.position.x=11;T.resetDiagnostics();o.updateWorldMatrix(false,false);ref.updateWorldMatrix(false,false);oneOperation();
  assert.equal(o.matrix.elements,local);assert.equal(o.matrixWorld.elements,world);near(local,ref.matrix.elements);near(world,ref.matrixWorld.elements);
 }finally{T.release(o);for(const object of others)T.release(object);}
 assert.equal(T.diagnostics().liveNodes,0);
});

test(`${mode}: one-node parent reads retain public access and failure before evaluation`,()=>{
 const a=new T.Group(),b=new O.Group(),c=new T.Object3D(),d=new O.Object3D();a.add(c);b.add(d);
 let reads=0,indices=[],throwAt=-1;
 for(const [root,child] of [[a,c],[b,d]]){root.position.x=2;child.position.x=3;root.updateMatrixWorld();root.position.x=50;child.position.x=7;}
 const alias=c.matrixWorld.elements;assert.equal(alias[12],5);
 const matrix=a.matrixWorld,descriptor=Object.getOwnPropertyDescriptor(matrix,'elements'),elements=matrix.elements;
 const observed=new Proxy(elements,{get(target,key,receiver){
  if(typeof key==='string'&&/^(?:[0-9]|1[0-5])$/.test(key)){indices.push(Number(key));if(Number(key)===throwAt)throw Error('parent read failed');}
  return Reflect.get(target,key,receiver);
 }});
 Object.defineProperty(matrix,'elements',{configurable:true,enumerable:true,get(){reads++;return observed;}});
 try{
  throwAt=7;T.resetDiagnostics();assert.throws(()=>c.updateWorldMatrix(false,false),/parent read failed/);
  assert.equal(reads,1);assert.deepEqual(indices,[0,1,2,3,4,5,6,7]);
  const failed=T.diagnostics();assert.equal(failed.batches,0);assert.equal(failed.nodes,0);assert.equal(failed.operationBytes,0);assert.equal(failed.wasmCalls,0);assert.equal(alias[12],5);
  throwAt=-1;reads=0;indices=[];T.resetDiagnostics();c.updateWorldMatrix(false,false);d.updateWorldMatrix(false,false);oneOperation();
  assert.equal(reads,1);assert.deepEqual(indices,Array.from({length:16},(_,i)=>i));near(alias,d.matrixWorld.elements);
  reads=0;indices=[];c.position.x=d.position.x=9;T.resetDiagnostics();c.updateMatrix();d.updateMatrix();oneOperation();
  assert.equal(reads,0);assert.deepEqual(indices,[]);near(c.matrix.elements,d.matrix.elements);near(alias,d.matrixWorld.elements);
 }finally{Object.defineProperty(matrix,'elements',descriptor);T.release(a);}
 assert.equal(T.diagnostics().liveNodes,0);
});
