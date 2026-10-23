import {execFileSync} from 'node:child_process';
for(const engine of ['facade-js','facade-wasm'])execFileSync(process.execPath,['--test','tests/facade-worker.mjs'],{stdio:'inherit',env:{...process.env,RTHREE_FACADE_ENGINE:engine}});
