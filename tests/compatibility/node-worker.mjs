import {readFileSync,writeFileSync} from 'node:fs';
import {runSemantics} from './cases.mjs';

const [engine,out]=process.argv.slice(2);
const entries={original:'three',js:'../../packages/rthree/js.js',wasm:'../../packages/rthree/index.js','packed-js':'../../packages/rthree/packed-js.js','facade-wasm':'../../packages/rthree/facade.js','facade-js':'../../packages/rthree/facade-js.js','prepared-js':'../../packages/rthree/prepared-js.js','prepared-wasm':'../../packages/rthree/prepared.js'};
if(!Object.hasOwn(entries,engine)||!out)throw Error('expected engine and result path');
const T=await import(entries[engine]);
await T.init?.({wasmBytes:readFileSync('packages/rthree/scene_core.wasm')});
const results=runSemantics(T);
writeFileSync(out,JSON.stringify({engine,results,diagnostics:T.diagnostics?.()??null},null,2));
