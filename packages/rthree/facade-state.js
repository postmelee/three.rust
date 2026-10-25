import {evaluateFacade} from './facade-kernel.js';
import {evaluateVersions,evaluatePass} from './prepared-kernel.js';

// One arena per module graph. No strong references from the arena to public objects.
const records=new WeakMap();
const matrixRecords=new WeakMap();
let config,arena,nextSlot=1,generation=0;
const freeSlots=[];
const planCache=new WeakMap(),dirtyInputs=new Set(),dirtyMeta=new Set();
let topologyEpoch=0,mutationEpoch=0,observationEpoch=0,activePass;
const prepared=()=>!!config?.prepared();
export function invalidatePrepared(){if(prepared()){topologyEpoch++;mutationEpoch++;activePass=undefined;}}
function markInput(r){if(prepared()){mutationEpoch++;if(r.slot)dirtyInputs.add(r.queueRef);}}
function markMeta(r){if(prepared()){mutationEpoch++;if(r.slot)dirtyMeta.add(r.queueRef);}}

const finalizer=new FinalizationRegistry(token=>retire(token));
const numeric=key=>typeof key==='string'&&/^(?:[0-9]|1[0-5])$/.test(key);
export function configureFacade(value){config=value;}
const enabled=()=>config?.enabled();
const now=()=>config.timings()?performance.now():0;
function call(name,...args){config.counters.abiCalls++;return config.api()[name](...args);}
function view(){
 if(arena?.id){
  const buffer=config.api().memory.buffer;
  if(arena.data.buffer!==buffer){
   arena.data=new Float64Array(buffer,arena.dataPtr,(arena.capacity+1)*64);
   arena.ops=new Uint32Array(buffer,arena.opsPtr,arena.opCapacity*7);
  }
 }
 return arena.data;
}
function reserve(capacity,operations){
 if(!arena){
  const api=config.api(); // Throws before any state mutation if Wasm is not ready.
  arena={id:api?call('scene_new'):0,capacity:0,opCapacity:0,data:new Float64Array(0),ops:new Uint32Array(0)};
  config.counters.arenas++;
 }
 let moved=false;
 if(capacity>arena.capacity){
  arena.capacity=Math.max(16,capacity,arena.capacity*2);
  if(arena.id){if(!call('scene_resize',arena.id,arena.capacity))throw Error('rthree facade allocation failed');moved=true;}
  else {const d=new Float64Array((arena.capacity+1)*64);d.set(arena.data);arena.data=d;}
 }
 if(operations>arena.opCapacity){
  arena.opCapacity=Math.max(16,operations,arena.opCapacity*2);
  if(arena.id){if(!call('facade_reserve_ops',arena.id,arena.opCapacity))throw Error('rthree facade operation allocation failed');moved=true;}
  else arena.ops=new Uint32Array(arena.opCapacity*7);
 }
 if(moved){
  arena.dataPtr=call('scene_ptr',arena.id);arena.opsPtr=call('facade_ops_ptr',arena.id);
  const buffer=config.api().memory.buffer;
  arena.data=new Float64Array(buffer,arena.dataPtr,(arena.capacity+1)*64);
  arena.ops=new Uint32Array(buffer,arena.opsPtr,arena.opCapacity*7);
 }
 return view();
}
function register(r){
 if(r.slot)return;
 if(generation===0xffffffff)throw Error('rthree facade generation exhausted');
 const slot=freeSlots.length?freeSlots.pop():nextSlot++;
 reserve(slot,1);
 r.slot=slot;r.generation=++generation;r.inputs=true;r.flags=true;
 for(const m of r.matrices)m.dirty=true;
 const d=view();d.fill(0,slot*64,(slot+1)*64);d[slot*64+50]=r.generation;
 r.token={slot,generation:r.generation};finalizer.register(r,r.token,r);
 config.counters.liveNodes++;
}
function retire(token){
 const {slot,generation:gen}=token;
 if(!arena||view()[slot*64+50]!==gen)return;
 if(token.plan&&arena.id===token.plan.arenaId)call('prepared_free',arena.id,token.plan.id);
 view()[slot*64+50]=0;freeSlots.push(slot);config.counters.liveNodes--;
 if(config.counters.liveNodes===0){
  if(arena.id)call('scene_free',arena.id);
  arena=undefined;nextSlot=1;freeSlots.length=0;config.counters.arenas--;
 }
}
function materialize(r,m){
 if(!r.slot)return;
 const versioned=prepared();
 if(m.valid&&(!versioned||m.dirty||m.observedEpoch===observationEpoch))return;
 const revision=versioned?view()[r.slot*64+(m.offset===16?55:56)]:0;
 m.observedEpoch=observationEpoch;
 if(m.valid&&m.revision===revision)return;
 const start=now(),d=view(),b=r.slot*64+m.offset;
 for(let j=0;j<16;j++)m.target[j]=d[b+j];
 m.valid=true;m.revision=revision;config.counters.materializedBytes+=128;config.counters.matrixReads++;
 if(config.timings())config.counters.readMs+=performance.now()-start;
}
function trackedMatrix(r,matrix,offset){
 const m={matrix,offset,target:matrix.elements,valid:true,dirty:true};
 const proxy=new Proxy(m.target,{
  get(target,key,receiver){if(numeric(key))materialize(r,m);return Reflect.get(target,key,receiver);},
  getOwnPropertyDescriptor(target,key){if(numeric(key))materialize(r,m);return Reflect.getOwnPropertyDescriptor(target,key);},
  set(target,key,value){materialize(r,m);m.dirty=true;if(offset===16)r.inputs=true;markInput(r);return Reflect.set(target,key,value);},
  defineProperty(target,key,descriptor){materialize(r,m);r.supported=false;invalidatePrepared();return Reflect.defineProperty(target,key,descriptor);},
  deleteProperty(target,key){materialize(r,m);r.supported=false;invalidatePrepared();return Reflect.deleteProperty(target,key);},
  preventExtensions(target){materialize(r,m);r.supported=false;invalidatePrepared();return Reflect.preventExtensions(target);}
 });
 m.proxy=proxy;matrixRecords.set(matrix,{r,m});
 let elements=proxy;
 Object.defineProperty(matrix,'elements',{configurable:true,enumerable:true,get(){return elements;},set(value){
  if(value===elements)return;
  materialize(r,m);elements=value;r.supported=false;invalidatePrepared();
 }});
 return m;
}
// Only pinned read-only core consumers use this private barrier. Never return
// this backing array through the public elements property or use it as a target.
export function readFacadeElements(matrix){
 const elements=matrix.elements,record=matrixRecords.get(matrix);
 if(record&&elements===record.m.proxy){materialize(record.r,record.m);return record.m.target;}
 return elements;
}
function scalar(r,object,key){
 let value=object[key];
 Object.defineProperty(object,key,{configurable:true,enumerable:true,get(){return value;},set(next){value=next;r.inputs=true;markInput(r);if(key==='pivot')invalidatePrepared();}});
}
export function trackFacadeObject(object){
 if(!enabled())return;
 const r={slot:0,inputs:true,flags:true,supported:true,matrices:[],ref:new WeakRef(object)};records.set(object,r);
 // Dirty work must not keep abandoned records (and their native slots) alive.
 if(prepared())r.queueRef=new WeakRef(r);
 for(const vector of [object.position,object.scale])for(const k of ['x','y','z'])scalar(r,vector,k);
 for(const k of ['_x','_y','_z','_w'])scalar(r,object.quaternion,k);
 scalar(r,object,'pivot');
 r.flagValues={matrixAutoUpdate:object.matrixAutoUpdate,matrixWorldAutoUpdate:object.matrixWorldAutoUpdate,matrixWorldNeedsUpdate:object.matrixWorldNeedsUpdate};
 for(const k of ['matrixAutoUpdate','matrixWorldAutoUpdate','matrixWorldNeedsUpdate']){
  let value=object[k];
  Object.defineProperty(object,k,{configurable:true,enumerable:true,get(){return prepared()&&r.slot&&!r.flags&&k==='matrixWorldNeedsUpdate'?!!(view()[r.slot*64+15]&4):prepared()?r.flagValues[k]:value;},set(next){if(prepared()&&r.slot&&!r.flags){r.flagValues.matrixWorldNeedsUpdate=!!(view()[r.slot*64+15]&4);}value=next;if(prepared())r.flagValues[k]=next;r.flags=true;markInput(r);}});
 }
 r.matrices=[trackedMatrix(r,object.matrix,16),trackedMatrix(r,object.matrixWorld,32)];
 if(prepared()){
  for(const key of ['matrix','matrixWorld','layers','updateMatrix','updateMatrixWorld','updateWorldMatrix','geometry','material','onBeforeRender','onAfterRender','onBeforeShadow','onAfterShadow','intersectsFrustum']){
   let value=object[key];Object.defineProperty(object,key,{configurable:true,enumerable:Object.hasOwn(object,key),get(){return value;},set(next){value=next;if(key==='layers')r.supported=false;invalidatePrepared();}});
  }
  for(const key of ['visible','renderOrder','frustumCulled','castShadow']){
   let value=object[key];Object.defineProperty(object,key,{configurable:true,enumerable:true,get(){return value;},set(next){value=next;markMeta(r);}});
  }
  const layers=object.layers;let mask=layers.mask;
  Object.defineProperty(layers,'mask',{configurable:true,enumerable:true,get(){return mask;},set(next){mask=next;markMeta(r);}});
 }

}
function eligible(o,base,method){
 const r=records.get(o);
 return r&&r.supported&&o.matrix===r.matrices[0].matrix&&o.matrixWorld===r.matrices[1].matrix
  &&o.updateMatrix===base.updateMatrix&&(method==='local'||o[method]===base[method]);
}
function upload(o,r,d){
 const b=r.slot*64,c=config.counters;
 if(r.inputs||o.pivot){
  const p=o.position,q=o.quaternion,s=o.scale,v=o.pivot;
  const values=[p.x,p.y,p.z,q.x,q.y,q.z,q.w,s.x,s.y,s.z,v?.x??0,v?.y??0,v?.z??0,v?1:0];
  for(let j=0;j<14;j++)d[b+j]=values[j];
  d[b+54]=1;r.inputs=false;c.uploadedBytes+=112;c.scannedBytes+=112;
 }
 if(r.flags){d[b+15]=(o.matrixAutoUpdate?1:0)|(o.matrixWorldAutoUpdate===true?2:0)|(o.matrixWorldNeedsUpdate?4:0);r.flags=false;c.uploadedBytes+=8;}
 for(const m of r.matrices)if(m.dirty){
  for(let j=0;j<16;j++)d[b+m.offset+j]=m.target[j];
  m.dirty=false;c.uploadedBytes+=128;
 }
 dirtyInputs.delete(r.queueRef);
 const hasParent=o.parent?1:0;
 if(d[b+49]!==hasParent){d[b+49]=hasParent;c.uploadedBytes+=8;}
}
// method='local' is a synchronous local compose. Other methods retain upstream
// ancestor/child selection and force propagation; direct property reads never call it.
export function facadeUpdate(root,method,base,{force=false,parents=false,children=false}={}){
 if(!enabled())return false;
 if(prepared())mutationEpoch++;
 config.api();
 if(prepared()&&method==='updateMatrixWorld'&&children&&!root.parent){
  const plan=ensurePlan(root,base);if(plan)return updatePlan(plan,!!force);
 }
 const start=now(),nodes=[],ops=[],index=new Map();
 const add=(o,inherited,forced,kind)=>{
  if(!eligible(o,base,kind))return false;
  index.set(o,nodes.length+1);nodes.push(o);ops.push({inherited,forced});return true;
 };
 const descend=(o,inherited,forced)=>{
  if(!add(o,inherited,forced,method))return false;
  const here=nodes.length;
  for(const child of o.children)if(!descend(child,here,false))return false;
  return true;
 };
 let ok=true;
 if(method==='local')ok=add(root,0,false,'local');
 else {
  if(parents){const ancestors=[];for(let p=root.parent;p;p=p.parent)ancestors.push(p);
   for(let i=ancestors.length-1;i>=0;i--)if(!add(ancestors[i],0,false,method)){ok=false;break;}
  }
  if(ok)ok=children?descend(root,0,force):add(root,0,force,method);
 }
 if(!ok){config.counters.fallbackRoots++;return false;}
 for(const o of nodes)register(records.get(o));
 reserve(nextSlot-1,nodes.length);
 // Only the first selected node can have an unselected parent. Use its last
 // evaluated matrix, even when that parent's public inputs are dirty.
 const external=method==='local'?null:nodes[0].parent;
 let externalElements;
 if(external&&!index.has(external))externalElements=external.matrixWorld.elements;
 let d=view();
 if(externalElements){for(let j=0;j<16;j++)d[32+j]=externalElements[j];config.counters.uploadedBytes+=128;d=view();}
 for(let i=0;i<nodes.length;i++){
  const o=nodes[i],r=records.get(o),parent=index.has(o.parent)?records.get(o.parent):undefined,k=i*7;
  upload(o,r,d);
  arena.ops.set([r.slot,r.generation,parent?.slot??0,parent?.generation??0,ops[i].forced?1:0,ops[i].inherited,method==='local'?1:0],k);
 }
 const synced=now();
 if(arena.id){if(!call(prepared()?'facade_update_versions':'facade_update',arena.id,nodes.length))throw Error('rthree invalid facade operations');config.counters.wasmCalls++;config.counters.wasmNodes+=nodes.length;}
 else (prepared()?evaluateVersions:evaluateFacade)(d,arena.ops,nodes.length);
 observationEpoch++; // Successful local/selective evaluation can change any observed matrix.
 const computed=now();
 for(const o of nodes){const r=records.get(o),b=r.slot*64,mask=d[b+51];
  if(mask&1)r.matrices[0].valid=false;
  if(mask&2)r.matrices[1].valid=false;
  o.matrixWorldNeedsUpdate=!!(d[b+15]&4);r.flags=false;
 }
 const c=config.counters;c.batches++;c.nodes+=nodes.length;c.operationBytes+=nodes.length*28;
 if(config.timings()){c.syncMs+=synced-start;c.kernelMs+=computed-synced;c.syncMs+=performance.now()-computed;}
 return true;
}
export function releaseFacade(root){
 if(!enabled())return;
 if(prepared()){dropPlan(root);invalidatePrepared();}
 const r=records.get(root);
 if(r?.slot){if(prepared()&&!r.flags)r.flagValues.matrixWorldNeedsUpdate=!!(view()[r.slot*64+15]&4);for(const m of r.matrices)materialize(r,m);finalizer.unregister(r);dirtyInputs.delete(r.queueRef);dirtyMeta.delete(r.queueRef);retire(r.token);r.slot=0;}
 for(const child of root.children)releaseFacade(child);
}

function dropPlan(root){
 const p=planCache.get(root);if(!p)return;
 if(p.id&&arena?.id===p.arenaId)call('prepared_free',arena.id,p.id);
 const r=records.get(root);if(r?.token)r.token.plan=undefined;
 planCache.delete(root);activePass=undefined;
}
function planViews(p){
 if(p.id){const buffer=config.api().memory.buffer;
  if(p.meta?.buffer!==buffer){
   p.ops=new Uint32Array(buffer,p.ptrs[0],p.nodes.length*7);
   p.meta=new Float64Array(buffer,p.ptrs[1],p.nodes.length*16);
   p.output=new Float64Array(buffer,p.ptrs[2],p.nodes.length*32);
   p.order=new Uint32Array(buffer,p.ptrs[3],p.nodes.length);
   p.camera=new Float64Array(buffer,p.ptrs[4],64);
   p.resources=new Uint32Array(buffer,p.ptrs[5],p.nodes.length);
  }
 }
 return p;
}
function ensurePlan(root,base){
 let p=planCache.get(root);if(p&&p.epoch===topologyEpoch&&p.arenaId===(arena?.id??0))return p;
 dropPlan(root);
 const nodes=[],parents=[];
 function visit(o,parent){
  if(!eligible(o,base,'updateMatrixWorld')||o.pivot!==null)return false;
  const index=nodes.length;nodes.push(o);parents.push(parent);
  for(const child of o.children)if(!visit(child,index+1))return false;
  return true;
 }
 if(!visit(root,0))return null;
 for(const o of nodes)register(records.get(o));
 p={nodes,parents,indices:new Map(),epoch:topologyEpoch,arenaId:arena.id,base,passReady:false};
 if(arena.id){p.id=call('prepared_new',arena.id,nodes.length);if(!p.id)throw Error('rthree prepared allocation failed');p.ptrs=[0,1,2,3,4,5].map(k=>call('prepared_ptr',arena.id,p.id,k));planViews(p);}
 else {p.ops=new Uint32Array(nodes.length*7);p.meta=new Float64Array(nodes.length*16);p.output=new Float64Array(nodes.length*32);p.order=new Uint32Array(nodes.length);p.camera=new Float64Array(64);p.resources=new Uint32Array(nodes.length);}
 const d=view();
 for(let i=0;i<nodes.length;i++){
  const o=nodes[i],r=records.get(o),parent=parents[i]?records.get(nodes[parents[i]-1]):null;
  p.indices.set(r,i);upload(o,r,d);
  p.ops.set([r.slot,r.generation,parent?.slot??0,parent?.generation??0,0,parents[i],0],i*7);
  p.meta[i*16]=r.slot;p.meta[i*16+1]=r.generation;p.meta[i*16+2]=parents[i];r.flags=false;
 }
 if(p.id)records.get(root).token.plan={arenaId:arena.id,id:p.id};
 planCache.set(root,p);config.counters.preparedInputBytes+=nodes.length*24;config.counters.topologyBuilds++;config.counters.operationBytes+=nodes.length*28;
 return p;
}
function syncInputs(p){
 const d=view();let synced=0;
 for(const ref of dirtyInputs){const r=ref.deref(),o=r?.ref.deref();if(!o||!r.slot){dirtyInputs.delete(ref);continue;}
  if(!p.indices.has(r))continue;upload(o,r,d);r.flags=false;synced++;
 }
 config.counters.dirtyRecords+=synced;
 return d;
}
function updatePlan(p,force){
 const start=now();planViews(p);const d=syncInputs(p);
 const mid=now();
 if(p.id){if(!call('prepared_update',arena.id,p.id,force?1:0))throw Error('rthree invalid prepared topology');config.counters.wasmCalls++;config.counters.wasmNodes+=p.nodes.length;}
 else {p.ops[4]=force?1:0;evaluateVersions(d,p.ops,p.nodes.length);}
 observationEpoch++; // Retained evaluation invalidates only the observation check, not every snapshot.
 const c=config.counters;c.batches++;c.nodes+=p.nodes.length;c.retainedUpdates++;
 if(config.timings()){c.syncMs+=mid-start;c.kernelMs+=performance.now()-mid;}
 return true;
}
function objectMeta(p,o,r,i){
 const m=p.meta,b=i*16;
 m[b+3]=o.visible===false?0:1;m[b+4]=o.layers.mask>>>0;m[b+5]=o.isMesh?2:o.isGroup?1:o.isLight?3:0;
 m[b+6]=o.renderOrder;m[b+7]=o.id;m[b+15]=o.frustumCulled?1:0;dirtyMeta.delete(r.queueRef);
 config.counters.preparedInputBytes+=8*6;
}
function eligiblePass(p,bases){
 p.meshes=[];p.lights=[];p.materials=new Map();p.geometries=new Map();
 for(let i=0;i<p.nodes.length;i++){
  const o=p.nodes[i],r=records.get(o);objectMeta(p,o,r,i);
  if(o.isLOD||o.isSprite||o.isLine||o.isPoints||o.isLightProbeGrid||o.isSkinnedMesh||o.isInstancedMesh||o.isBatchedMesh||o.isCamera)return false;
  if(o.isLight){p.lights.push(i);continue;}
  if(o.isMesh){
   if(o.constructor!==bases.Mesh||o.intersectsFrustum!==bases.Mesh.prototype.intersectsFrustum||o.boundingSphere!==undefined)return false;
   for(const name of ['onBeforeRender','onAfterRender','onBeforeShadow','onAfterShadow'])if(o[name]!==bases.Object3D.prototype[name])return false;
   const g=o.geometry,m=o.material;
   if(!g?.isBufferGeometry||Array.isArray(m)||!m?.isMaterial)return false;
   p.meshes.push(i);
   if(!p.materials.has(m))p.materials.set(m,{indices:[],last:[]});p.materials.get(m).indices.push(i);
   if(!p.geometries.has(g))p.geometries.set(g,{indices:[],last:[]});p.geometries.get(g).indices.push(i);
  }else if(!o.isScene&&!o.isGroup&&o.constructor!==bases.Object3D)return false;
 }
 return true;
}
function refreshPassInputs(p,bases){
 for(const ref of dirtyMeta){const r=ref.deref(),o=r?.ref.deref();
  if(!o||!r.slot){dirtyMeta.delete(ref);continue;}
  if(p.indices.has(r))objectMeta(p,o,r,p.indices.get(r));
 }
 for(const [material,state] of p.materials){
  if(material.transmission>0||material.isNodeMaterial||material.onBeforeRender!==bases.Material.prototype.onBeforeRender)return false;
  const values=[material.id,material.transparent===true?1:0,material.visible?1:0];
  if(values.some((v,i)=>v!==state.last[i])){for(const i of state.indices)p.meta.set(values,i*16+12);config.counters.preparedInputBytes+=state.indices.length*24;state.last=values;}
 }
 for(const [geometry,state] of p.geometries){
  if(Object.keys(geometry.morphAttributes).length||geometry.isInstancedBufferGeometry)return false;
  // Upload hooks are arbitrary JS and can mutate later objects during projection.
  for(const attribute of [...Object.values(geometry.attributes),geometry.index].filter(Boolean)){
   const a=attribute.isInterleavedBufferAttribute?attribute.data:attribute;
   if(a.onUploadCallback!==bases.BufferAttribute.prototype.onUploadCallback)return false;
  }
  if(geometry.boundingSphere===null)geometry.computeBoundingSphere();
  const sphere=geometry.boundingSphere,values=[sphere.center.x,sphere.center.y,sphere.center.z,sphere.radius];
  if(!values.every(Number.isFinite))return false;
  if(values.some((v,i)=>v!==state.last[i])){for(const i of state.indices)p.meta.set(values,i*16+8);config.counters.preparedInputBytes+=state.indices.length*32;state.last=values;}
 }
 return true;
}
// The renderer supplies its current resources and frustum. No JS culling, sorting
// or per-draw matrix arithmetic is repeated after a successful native plan.
export function prepareScene(scene,camera,renderer,list,state,objects,frustum,projection,opaqueSort,transparentSort,bases,blocked){
 activePass=undefined;
 if(!prepared())return false;
 const preparedStart=now();
 const fallback=()=>{config.counters.preparedFallbacks++;return false;};
 if(blocked||opaqueSort||transparentSort||camera.isArrayCamera||camera.coordinateSystem!==2000||scene.overrideMaterial)return fallback();
 const p=ensurePlan(scene,bases.Object3D.prototype);if(!p)return fallback();planViews(p);
 if(!p.passReady){p.passEligible=eligiblePass(p,bases);p.passReady=true;}
 if(!p.passEligible||!refreshPassInputs(p,bases))return fallback();
 // Public manual matrices are immediately observable even if scene auto-update is off.
 // Import pending writes here without evaluating dirty TRS or advancing world state.
 syncInputs(p);
 const c=p.camera;c.set(readFacadeElements(camera.matrixWorldInverse),0);c.set(readFacadeElements(projection),16);
 for(let i=0;i<6;i++){const f=frustum.planes[i];c.set([f.normal.x,f.normal.y,f.normal.z,f.constant],32+i*4);}
 c[56]=camera.layers.mask>>>0;c[57]=renderer.sortObjects?1:0;c[58]=camera.reversedDepth?1:0;config.counters.preparedInputBytes+=59*8;
 const start=now();let count;
 if(p.id){const result=call('prepared_pass',arena.id,p.id);if(!result)throw Error('rthree invalid prepared pass');count=result-1;config.counters.preparedWasmCalls++;planViews(p);}
 else count=evaluatePass(view(),p);
 if(config.timings())config.counters.prepareKernelMs+=performance.now()-start;
 for(const i of p.lights)if(p.output[i*32+27]&&(p.nodes[i].layers.mask&camera.layers.mask)){state.pushLight(p.nodes[i]);if(p.nodes[i].castShadow)state.pushShadow(p.nodes[i]);}
 for(let j=0;j<p.camera[59];j++)objects.update(p.nodes[p.resources[j]]);
 for(let j=0;j<count;j++){
  const i=p.order[j],o=p.nodes[i];
  // Depth is already reversed when needed; push's camera adjustment is neutralized.
  list.push(o,o.geometry,o.material,p.output[i*32+26],p.output[i*32+25],null,{reversedDepth:false});
 }
 activePass={plan:new WeakRef(p),camera:new WeakRef(camera),epoch:mutationEpoch,topology:topologyEpoch};
 config.counters.preparedPasses++;config.counters.preparedDraws+=count;
 if(config.timings())config.counters.prepareMs+=performance.now()-preparedStart;
 return true;
}
export function consumePreparedMatrices(object,camera){
 if(!prepared()||!activePass||activePass.camera.deref()!==camera||activePass.epoch!==mutationEpoch||activePass.topology!==topologyEpoch)return false;
 const p=activePass.plan.deref(),r=records.get(object),i=p?.indices.get(r);if(i===undefined)return false;
 const start=now();planViews(p);const offset=i*32,m=object.modelViewMatrix.elements,n=object.normalMatrix.elements;
 for(let j=0;j<16;j++)m[j]=p.output[offset+j];for(let j=0;j<9;j++)n[j]=p.output[offset+16+j];
 config.counters.preparedMatrixBytes+=200;config.counters.preparedMatrixReads++;if(config.timings())config.counters.preparedReadMs+=performance.now()-start;return true;
}
