import { updatePacked } from './packed.js';
import { configureFacade, trackFacadeObject, facadeUpdate, releaseFacade } from './facade-state.js';
export { trackFacadeObject };
let backend = 'uninitialized', wasm, pending;
const contexts = new WeakMap();
const counters = { batches:0, nodes:0, fallbackRoots:0, wasmCalls:0, wasmNodes:0, uploadedBytes:0, scannedBytes:0, materializedBytes:0, arenas:0, syncMs:0, kernelMs:0, readMs:0, abiCalls:0, operationBytes:0, matrixReads:0, liveNodes:0 };
let timing = false;
const facadeEnabled=()=>backend==='facade-wasm'||backend==='facade-js';
configureFacade({enabled:facadeEnabled,api(){if(backend==='facade-js')return null;if(!wasm)throw Error('rthree: await init() before updating objects');return wasm;},counters,timings:()=>timing});
const finalizer = new FinalizationRegistry(({id,api})=>{ api.scene_free(id); counters.arenas--; });
export function setBackend(value) {
 if (backend !== 'uninitialized' && backend !== value) throw Error('rthree: choose one engine per module graph');
 backend=value;
}
export async function init(options={}) {
 if(backend==='js'||backend==='packed-js'||backend==='facade-js') return;
 if(wasm) return;
 if(pending) return pending;
 const requested=backend;
 pending=(async()=>{
  const bytes=options.wasmBytes ?? await (async()=>{const r=await fetch(options.wasmURL ?? new URL('./scene_core.wasm',import.meta.url));if(!r.ok)throw Error(`rthree Wasm HTTP ${r.status}`);return r.arrayBuffer()})();
  const result=await WebAssembly.instantiate(bytes,{});
  if(backend!==requested)throw Error('rthree: backend changed during init');
  wasm=result.instance.exports;backend=requested==='facade-wasm'?'facade-wasm':'wasm';
 })();
 try {await pending;} catch(e){pending=undefined;throw e;}
}
export function diagnostics(){return {backend,wasmActive:backend==='wasm'||(backend==='facade-wasm'&&!!wasm),...counters,wasmMemoryBytes:wasm?.memory.buffer.byteLength??0};}
export function configureDiagnostics({timings=false}={}){timing=timings;}
export function resetDiagnostics(){for(const k of Object.keys(counters))if(k!=='arenas'&&k!=='liveNodes')counters[k]=0;}
export function release(root){if(facadeEnabled())return releaseFacade(root);const c=contexts.get(root);if(c){if(c.id){wasm.scene_free(c.id);finalizer.unregister(c);counters.arenas--;}contexts.delete(root);}for(const child of root.children)release(child);}
export function facadeLocal(root,base){return facadeUpdate(root,'local',base);}
export function facadeSelective(root,parents,children,force,base){return facadeUpdate(root,'updateWorldMatrix',base,{parents:parents===true,children:children===true,force:!!force});}
function context(root,n){
 let c=contexts.get(root);
 if(!c){c={capacity:0,id:backend==='wasm'?wasm.scene_new():0};contexts.set(root,c);if(c.id){counters.arenas++;finalizer.register(root,{id:c.id,api:wasm},c);}}
 if(c.capacity<n){c.capacity=Math.max(n,c.capacity*2,16);if(c.id){if(!wasm.scene_resize(c.id,c.capacity))throw Error('rthree arena allocation failed');}else c.data=new Float64Array((c.capacity+1)*64);}
 // A different arena can grow shared linear memory. Never retain a detached view.
 if(c.id)c.data=new Float64Array(wasm.memory.buffer,wasm.scene_ptr(c.id),(c.capacity+1)*64);
 return c;
}
export function batchUpdate(root,force,baseWorld,baseLocal,baseSelective){
 if(facadeEnabled())return facadeUpdate(root,'updateMatrixWorld',{updateMatrixWorld:baseWorld,updateMatrix:baseLocal,updateWorldMatrix:baseSelective},{force:!!force,children:true});
 if(backend==='js')return false;
 if(backend==='uninitialized')throw Error('rthree: await init() before updating objects');
 // Version-specific overrides must execute their own post-update work.
 const start=timing?performance.now():0;
 const nodes=[],parents=[];
 function collect(o,p){if(o.updateMatrixWorld!==baseWorld||o.updateMatrix!==baseLocal)return false;const id=nodes.length+1;nodes.push(o);parents.push(p);for(const child of o.children)if(!collect(child,id))return false;return true;}
 if(!collect(root,0)){counters.fallbackRoots++;return false;}
 const c=context(root,nodes.length),d=c.data;let bytes=0;
 function put(i,v){if(d[i]!==v){d[i]=v;bytes+=8;}}
 if(root.parent){const pe=root.parent.matrixWorld.elements;for(let j=0;j<16;j++)put(32+j,pe[j]);}
 for(let i=0;i<nodes.length;i++){
  const o=nodes[i],b=(i+1)*64,p=o.position,q=o.quaternion,s=o.scale,v=o.pivot;
  put(b,p.x);put(b+1,p.y);put(b+2,p.z);put(b+3,q.x);put(b+4,q.y);put(b+5,q.z);put(b+6,q.w);put(b+7,s.x);put(b+8,s.y);put(b+9,s.z);
  put(b+10,v?.x??0);put(b+11,v?.y??0);put(b+12,v?.z??0);put(b+13,v?1:0);put(b+14,parents[i]);
  put(b+15,(o.matrixAutoUpdate?1:0)|(o.matrixWorldAutoUpdate===true?2:0)|(o.matrixWorldNeedsUpdate?4:0));put(b+49,o.parent?1:0);
  // Conservative scan observes direct mutable matrix.elements writes too.
  for(let j=0;j<16;j++){put(b+16+j,o.matrix.elements[j]);put(b+32+j,o.matrixWorld.elements[j]);}
 }
 const synced=timing?performance.now():0;
 if(c.id){if(!wasm.scene_update(c.id,nodes.length,force?1:0))throw Error('rthree invalid topology');const calls=wasm.scene_calls(c.id),totalNodes=wasm.scene_nodes(c.id);counters.wasmCalls+=calls-(c.lastCalls??0);counters.wasmNodes+=totalNodes-(c.lastNodes??0);c.lastCalls=calls;c.lastNodes=totalNodes;}
 else updatePacked(d,nodes.length,!!force);
 const computed=timing?performance.now():0;
 for(let i=0;i<nodes.length;i++){const o=nodes[i],b=(i+1)*64;for(let j=0;j<16;j++){o.matrix.elements[j]=d[b+16+j];o.matrixWorld.elements[j]=d[b+32+j];}if(d[b+48])o.matrixWorldNeedsUpdate=false;}
 counters.batches++;counters.nodes+=nodes.length;counters.uploadedBytes+=bytes;counters.scannedBytes+=nodes.length*49*8;counters.materializedBytes+=nodes.length*32*8;
 if(timing){counters.syncMs+=synced-start;counters.kernelMs+=computed-synced;counters.readMs+=performance.now()-computed;}
 return true;
}
