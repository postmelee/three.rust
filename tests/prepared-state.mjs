import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const mode=process.env.RTHREE_FACADE_ENGINE;
const T=await import(`../packages/rthree/${mode==='prepared-wasm'?'prepared':'prepared-js'}.js`);
await T.init({wasmBytes:readFileSync('packages/rthree/scene_core.wasm')});
test(`${mode}: unchanged topology has no JS command reconstruction`,()=>{
 const root=new T.Scene();for(let i=0;i<200;i++)root.add(new T.Object3D());
 root.updateMatrixWorld();T.resetDiagnostics();root.updateMatrixWorld();root.updateMatrixWorld();
 let d=T.diagnostics();assert.equal(d.retainedUpdates,2);assert.equal(d.operationBytes,0);assert.equal(d.topologyBuilds,0);assert.equal(d.dirtyRecords,0);assert.equal(d.materializedBytes,0);
 const child=root.children[17];child.position.x=7;root.updateMatrixWorld();d=T.diagnostics();assert.equal(d.dirtyRecords,1);assert.equal(d.uploadedBytes,112);assert.equal(child.matrixWorld.elements[12],7);
 T.release(root);assert.equal(T.diagnostics().liveNodes,0);
});
test(`${mode}: committed hierarchy is visible inside synchronous events`,()=>{
 const a=new T.Group(),b=new T.Group(),child=new T.Object3D();a.position.x=2;b.position.x=9;a.add(child);a.updateMatrixWorld();b.updateMatrixWorld();let observed;
 child.addEventListener('added',()=>{b.updateMatrixWorld();observed=child.matrixWorld.elements[12];});
 b.add(child);assert.equal(observed,9);assert.equal(child.parent,b);
 T.resetDiagnostics();b.updateMatrixWorld();assert.equal(T.diagnostics().topologyBuilds,0);
 T.release(a);T.release(b);assert.equal(T.diagnostics().liveNodes,0);
});
test(`${mode}: cached plans observe replaced matrices and layer objects`,()=>{
 const root=new T.Scene(),child=new T.Object3D();root.add(child);root.updateMatrixWorld();
 child.matrixAutoUpdate=false;child.matrix=new T.Matrix4().makeTranslation(8,0,0);child.matrixWorldNeedsUpdate=true;
 root.updateMatrixWorld();assert.equal(child.matrixWorld.elements[12],8);
 child.layers=new T.Layers();child.layers.mask=2;root.updateMatrixWorld();assert.equal(child.layers.mask,2);
 T.release(root);assert.equal(T.diagnostics().liveNodes,0);
});

test(`${mode}: release preserves the lazily cleared public dirty flag`,()=>{
 const root=new T.Group(),child=new T.Object3D();root.add(child);child.matrixWorldNeedsUpdate=true;
 root.updateMatrixWorld();assert.equal(child.matrixWorldNeedsUpdate,false);T.release(root);
 assert.equal(child.matrixWorldNeedsUpdate,false);root.updateMatrixWorld();assert.equal(child.matrixWorldNeedsUpdate,false);T.release(root);
});

test(`${mode}: dirty queues do not retain an abandoned detached record`,async()=>{
 assert.equal(typeof global.gc,'function','Run via test:prepared or node --expose-gc');
 const root=new T.Scene();
 const weak=(()=>{
  const child=new T.Object3D();root.add(child);root.updateMatrixWorld();
  child.visible=false;child.position.x=1;
  root.remove(child);root.updateMatrixWorld(); // Retire the old topology's reference.
  return new WeakRef(child);
 })();
 for(let i=0;i<100&&T.diagnostics().liveNodes!==1;i++){
  await new Promise(setImmediate);global.gc();await new Promise(setImmediate);
 }
 assert.equal(weak.deref(),undefined,'The public detached object can be collected');
 assert.equal(T.diagnostics().liveNodes,1,'Dirty metadata/input queues must not keep its native slot alive');
 root.updateMatrixWorld();T.release(root);assert.equal(T.diagnostics().liveNodes,0);
});

// Cached element arrays must stay observable across every evaluation entry point.
test(`${mode}: cached snapshots follow retained, selective, manual and lifetime updates`, async()=>{
 const O=await import('three');
 const a=new T.Group(),b=new O.Group(),c=new T.Object3D(),d=new O.Object3D(),g=new T.Object3D(),h=new O.Object3D();a.add(c);b.add(d);c.add(g);d.add(h);
 const world=c.matrixWorld.elements,local=c.matrix.elements;
 const check=()=>{assert.equal(c.matrixWorld.elements,world);for(const [x,y] of [[local,d.matrix.elements],[world,d.matrixWorld.elements],[g.matrixWorld.elements,h.matrixWorld.elements]])for(let i=0;i<16;i++)assert.ok(Math.abs(x[i]-y[i])<1e-10);};
 const actions=[
  (root,child)=>{root.position.x=2;child.position.x=3;root.updateMatrixWorld();},
  (root,child)=>{child.position.x=8;}, // Reads remain stale until evaluation.
  (root,child)=>child.updateMatrix(),
  (root,child)=>child.updateWorldMatrix(true,true),
  (root,child)=>{root.position.x=9;child.children[0].updateWorldMatrix(true,false);},
  (root,child)=>{child.matrixAutoUpdate=false;child.matrix.elements[12]=7;root.updateMatrixWorld(true);},
  (root)=>{root.matrixWorldAutoUpdate=false;root.matrixWorld.elements[12]=17;root.updateMatrixWorld(true);}
 ];
 for(const action of actions){action(a,c);action(b,d);check();}
 T.release(a);const other=new T.Scene();for(let i=0;i<2000;i++)other.add(new T.Object3D());other.updateMatrixWorld();check();
 a.updateMatrixWorld(true);b.updateMatrixWorld(true);check();T.release(a);T.release(other);assert.equal(T.diagnostics().liveNodes,0);
});

test(`${mode}: repeated verified public reads avoid native memory access`,{skip:mode!=='prepared-wasm'},()=>{
 const root=new T.Scene(),child=new T.Object3D();root.add(child);child.position.x=4;root.updateMatrixWorld();const alias=child.matrixWorld.elements;
 assert.equal(alias[12],4); // First read pays the revision check and snapshot.
 const descriptor=Object.getOwnPropertyDescriptor(WebAssembly.Memory.prototype,'buffer');let reads=0;
 Object.defineProperty(WebAssembly.Memory.prototype,'buffer',{...descriptor,get(){reads++;return Reflect.apply(descriptor.get,this,[]);}});
 try{
  const copy=Array.from(alias);for(let i=0;i<10;i++)assert.deepEqual(Array.from(alias),copy);
  child.matrixWorld.clone();assert.equal(reads,0,'Verified snapshots must not repeatedly consult Wasm memory');
  child.position.x=9;root.updateMatrixWorld();reads=0;assert.equal(alias[12],9);assert.ok(reads>0,'Evaluation must invalidate the observation guard');
  reads=0;assert.equal(alias[12],9);child.matrixWorld.clone();assert.equal(reads,0);
 }finally{Object.defineProperty(WebAssembly.Memory.prototype,'buffer',descriptor);T.release(root);}
});
