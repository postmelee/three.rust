import {execFileSync} from 'node:child_process';
for(const engine of ['prepared-js','prepared-wasm'])execFileSync(process.execPath,['--test','tests/facade-worker.mjs','tests/prepared-state.mjs'],{stdio:'inherit',env:{...process.env,RTHREE_FACADE_ENGINE:engine}});
execFileSync(process.execPath,['--test','tests/prepared-pass.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['tests/prepared-browser.mjs'],{stdio:'inherit'});
