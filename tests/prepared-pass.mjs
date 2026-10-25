import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {WebGLRenderList} from 'three/src/renderers/webgl/WebGLRenderLists.js';
import {evaluatePass} from '../packages/rthree/prepared-kernel.js';
const api=(await WebAssembly.instantiate(readFileSync('packages/rthree/scene_core.wasm'),{})).instance.exports;
const near=(a,b)=>{assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)assert.ok(Math.abs(a[i]-b[i])<=1e-10+1e-12*Math.abs(b[i]),`${i}: ${a[i]} / ${b[i]}`);};
test('randomized upstream culling, exact ordered lists, depth and per-draw matrices',()=>{
 let seed=811;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 const root=new T.Scene(),nodes=[root],parents=[0];const mats=Array.from({length:4},(_,i)=>new T.MeshBasicMaterial({transparent:i>1}));
 for(let i=1;i<90;i++){
  const o=i%7===0?new T.Group():new T.Mesh(new T.BoxGeometry(),mats[i%4]);const parent=Math.floor(rand()*i);
  nodes[parent].add(o);nodes.push(o);parents.push(parent+1);
  if(o.isMesh){o.geometry.computeBoundingSphere();o.geometry.boundingSphere.center.set(rand()-.5,rand()-.5,rand()-.5);}
 }
 const ordered=[];root.traverse(o=>ordered.push(o));nodes.splice(0,nodes.length,...ordered);const ordinal=new Map(nodes.map((o,i)=>[o,i]));parents.splice(0,parents.length,...nodes.map(o=>o.parent?ordinal.get(o.parent)+1:0));
 const id=api.scene_new();assert.equal(api.scene_resize(id,nodes.length),1);const plan=api.prepared_new(id,nodes.length);
 const p={meta:new Float64Array(api.memory.buffer,api.prepared_ptr(id,plan,1),nodes.length*16),output:new Float64Array(api.memory.buffer,api.prepared_ptr(id,plan,2),nodes.length*32),order:new Uint32Array(api.memory.buffer,api.prepared_ptr(id,plan,3),nodes.length),camera:new Float64Array(api.memory.buffer,api.prepared_ptr(id,plan,4),64)};
 const js={meta:new Float64Array(p.meta.length),output:new Float64Array(p.output.length),order:new Uint32Array(nodes.length),resources:new Uint32Array(nodes.length),camera:new Float64Array(64)};
 for(let frame=0;frame<24;frame++){
  const camera=frame%2?new T.PerspectiveCamera(55,1.4,.1,50):new T.OrthographicCamera(-5,5,5,-5,.1,50);
  camera.position.set(3,2,15);camera.lookAt(0,0,0);camera.updateMatrixWorld();camera.layers.mask=frame%3?1:3;
  const projection=new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),frustum=new T.Frustum().setFromProjectionMatrix(projection,T.WebGLCoordinateSystem);
  for(let i=0;i<nodes.length;i++){
   const o=nodes[i];o.position.set((rand()-.5)*20,(rand()-.5)*10,(rand()-.5)*10);o.rotation.set(rand(),rand(),rand());o.scale.set(i%11===0?0:rand()*2+.1,rand()+.2,frame%3===0?-1:1);o.visible=i%13!==frame%13;o.layers.mask=i%5===0?2:1;o.renderOrder=i%3;o.frustumCulled=i%4!==0;
  }
  root.updateMatrixWorld();const d=new Float64Array(api.memory.buffer,api.scene_ptr(id),(nodes.length+1)*64);
  for(let i=0;i<nodes.length;i++){
   const o=nodes[i],r=(i+1)*64,k=i*16;d[r+50]=1;d.set(o.matrixWorld.elements,r+32);
   p.meta.set([i+1,1,parents[i],+o.visible,o.layers.mask,o.isMesh?2:o.isGroup?1:0,o.renderOrder,o.id,0,0,0,0,o.material?.id??0,o.material?.transparent?1:0,o.material?.visible?1:0,+o.frustumCulled],k);
   if(o.isMesh){const s=o.geometry.boundingSphere;p.meta.set([s.center.x,s.center.y,s.center.z,s.radius],k+8);}
  }
  p.camera.set(camera.matrixWorldInverse.elements);p.camera.set(projection.elements,16);for(let i=0;i<6;i++){const f=frustum.planes[i];p.camera.set([f.normal.x,f.normal.y,f.normal.z,f.constant],32+i*4);}p.camera[56]=camera.layers.mask;p.camera[57]=frame%4!==0;p.camera[58]=frame%5===0?1:0;
  js.meta.set(p.meta);js.camera.set(p.camera);const jd=d.slice();const jc=evaluatePass(jd,js);const nc=api.prepared_pass(id,plan)-1;
  assert.equal(nc,jc);assert.deepEqual(Array.from(p.order.subarray(0,nc)),Array.from(js.order.subarray(0,jc)));near(p.output,js.output);
  const list=new WebGLRenderList(),indices=new Map(nodes.map((o,i)=>[o,i]));
  function visit(o,group){if(!o.visible)return;const visible=o.layers.test(camera.layers);if(visible&&o.isGroup)group=o.renderOrder;if(visible&&o.isMesh&&(!o.frustumCulled||o.intersectsFrustum(frustum))){const v=new T.Vector4().copy(o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld).applyMatrix4(projection);list.push(o,o.geometry,o.material,group,v.z,null,{reversedDepth:!!p.camera[58]});}for(const child of o.children)visit(child,group);}
  visit(root,0);if(p.camera[57])list.sort();const expected=[...list.opaque,...list.transparent].map(x=>indices.get(x.object));
  const actual=Array.from(p.order.subarray(0,nc));const bucketed=p.camera[57]?actual:[...actual.filter(i=>!p.meta[i*16+13]),...actual.filter(i=>p.meta[i*16+13])];assert.deepEqual(bucketed,expected,`frame ${frame}`);
  for(const i of actual){const o=nodes[i],mv=new T.Matrix4().multiplyMatrices(camera.matrixWorldInverse,o.matrixWorld),normal=new T.Matrix3().getNormalMatrix(mv);near(p.output.subarray(i*32,i*32+16),mv.elements);near(p.output.subarray(i*32+16,i*32+25),normal.elements);}
 }
 api.prepared_free(id,plan);assert.equal(api.prepared_pass(id,plan),0);api.scene_free(id);
});
