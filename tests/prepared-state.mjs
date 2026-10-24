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
