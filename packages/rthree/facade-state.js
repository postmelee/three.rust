import {evaluateFacade} from './facade-kernel.js';

// One arena per module graph. No strong references from the arena to public objects.
const records=new WeakMap();
let config,arena,nextSlot=1,generation=0;
const freeSlots=[];
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
function retire({slot,generation:gen}){
 if(!arena||view()[slot*64+50]!==gen)return;
 view()[slot*64+50]=0;freeSlots.push(slot);config.counters.liveNodes--;
 if(config.counters.liveNodes===0){
  if(arena.id)call('scene_free',arena.id);
  arena=undefined;nextSlot=1;freeSlots.length=0;config.counters.arenas--;
 }
}
function materialize(r,m){
 if(m.valid||!r.slot)return;
 const start=now(),d=view(),b=r.slot*64+m.offset;
 for(let j=0;j<16;j++)m.target[j]=d[b+j];
 m.valid=true;config.counters.materializedBytes+=128;config.counters.matrixReads++;
 if(config.timings())config.counters.readMs+=performance.now()-start;
}
function trackedMatrix(r,matrix,offset){
 const m={matrix,offset,target:matrix.elements,valid:true,dirty:true};
 const proxy=new Proxy(m.target,{
  get(target,key,receiver){if(numeric(key))materialize(r,m);return Reflect.get(target,key,receiver);},
  getOwnPropertyDescriptor(target,key){if(numeric(key))materialize(r,m);return Reflect.getOwnPropertyDescriptor(target,key);},
  set(target,key,value){materialize(r,m);m.dirty=true;if(offset===16)r.inputs=true;return Reflect.set(target,key,value);},
  defineProperty(target,key,descriptor){materialize(r,m);r.supported=false;return Reflect.defineProperty(target,key,descriptor);},
  deleteProperty(target,key){materialize(r,m);r.supported=false;return Reflect.deleteProperty(target,key);},
  preventExtensions(target){materialize(r,m);r.supported=false;return Reflect.preventExtensions(target);}
 });
 let elements=proxy;
 Object.defineProperty(matrix,'elements',{configurable:true,enumerable:true,get(){return elements;},set(value){
  if(value===elements)return;
  materialize(r,m);elements=value;r.supported=false;
 }});
 return m;
}
function scalar(r,object,key){
 let value=object[key];
 Object.defineProperty(object,key,{configurable:true,enumerable:true,get(){return value;},set(next){value=next;r.inputs=true;}});
}
export function trackFacadeObject(object){
 if(!enabled())return;
 const r={slot:0,inputs:true,flags:true,supported:true,matrices:[]};records.set(object,r);
 for(const vector of [object.position,object.scale])for(const k of ['x','y','z'])scalar(r,vector,k);
 for(const k of ['_x','_y','_z','_w'])scalar(r,object.quaternion,k);
 scalar(r,object,'pivot');
 for(const k of ['matrixAutoUpdate','matrixWorldAutoUpdate','matrixWorldNeedsUpdate']){
  let value=object[k];
  Object.defineProperty(object,k,{configurable:true,enumerable:true,get(){return value;},set(next){value=next;r.flags=true;}});
 }
 r.matrices=[trackedMatrix(r,object.matrix,16),trackedMatrix(r,object.matrixWorld,32)];
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
 const hasParent=o.parent?1:0;
 if(d[b+49]!==hasParent){d[b+49]=hasParent;c.uploadedBytes+=8;}
}
// method='local' is a synchronous local compose. Other methods retain upstream
// ancestor/child selection and force propagation; direct property reads never call it.
export function facadeUpdate(root,method,base,{force=false,parents=false,children=false}={}){
 if(!enabled())return false;
 config.api();
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
 if(arena.id){if(!call('facade_update',arena.id,nodes.length))throw Error('rthree invalid facade operations');config.counters.wasmCalls++;config.counters.wasmNodes+=nodes.length;}
 else evaluateFacade(d,arena.ops,nodes.length);
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
 const r=records.get(root);
 if(r?.slot){for(const m of r.matrices)materialize(r,m);finalizer.unregister(r);retire(r.token);r.slot=0;}
 for(const child of root.children)releaseFacade(child);
}
