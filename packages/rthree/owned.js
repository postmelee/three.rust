import {encodeDescriptor,encodeCommands,finite} from './owned-layout.js';
import {OwnedJS} from './owned-js.js';
import {ownedStates} from './owned-state.js';
export async function createOwnedAnimation(descriptor,options={}){
 for(const k of Object.keys(options))if(!['backend','wasmBytes','wasmURL'].includes(k))throw Error(`owned: unsupported option ${k}`);
 const encoded=encodeDescriptor(descriptor),backend=options.backend??'wasm';if(!['js','wasm'].includes(backend))throw Error('owned: invalid backend');
 const core=backend==='js'?new OwnedJS(encoded):await (await import('./owned-wasm.js')).createWasmOwned(encoded,options);
 const state={core,...encoded,backend,dead:false,rendering:false,dirty:true,revision:0,commandBatches:0,commandBytes:0,readBytes:0,paletteBytes:0,rootBytes:0};delete state.data;
 const live=()=>{if(state.dead)throw Error('owned: disposed');};const mutable=()=>{live();if(state.rendering)throw Error('owned: mutation during render');};
 const flush=()=>{live();if(state.dirty){core.step(0);state.dirty=false;state.revision++;}};
 const api={
  commands(list){mutable();const data=encodeCommands(list,state);core.commands(data);state.commandBatches++;state.commandBytes+=data.byteLength;state.dirty=true;},
  step(dt){mutable();finite(dt,'delta');if(Math.abs(dt)>1e6)throw Error('owned: delta out of range');core.step(dt);state.dirty=false;state.revision++;},
  snapshot(){flush();const result={};for(const [key,value] of Object.entries(core.buffers())){result[key]=value.slice();state.readBytes+=value.byteLength;}return result;},
  diagnostics(){live();return {backend,nodes:state.n,rigs:state.r,clips:state.c,revision:state.revision,steps:core.steps,wasmCalls:core.wasmCalls??0,wasmMemoryBytes:core.memoryBytes??0,commandBatches:state.commandBatches,commandBytes:state.commandBytes,readBytes:state.readBytes,paletteBytes:state.paletteBytes,rootBytes:state.rootBytes};},
  dispose(){if(state.dead)return;mutable();core.dispose();state.dead=true;}
 };
 state.live=live;state.flush=flush;ownedStates.set(api,state);return Object.freeze(api);
}
