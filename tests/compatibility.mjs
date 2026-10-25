import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {cases,compareTrace} from './compatibility/cases.mjs';

export const engines=['original','js','wasm','packed-js','facade-js','facade-wasm','prepared-js','prepared-wasm'];
export function verifyRuns(runs){
  assert.deepEqual(runs.map(r=>r.engine),engines);
  for(const run of runs){
    assert.deepEqual(run.results.map(r=>r.id),cases.map(c=>c.id));
    for(const result of run.results){
      assert.equal(result.passed,true,`${run.engine}/${result.id}: ${result.error}`);
      const reference=runs[0].results.find(r=>r.id===result.id);
      compareTrace(result.trace,reference.trace,`${run.engine}/${result.id}`);
    }
    if((run.engine==='wasm'||run.engine==='facade-wasm'||run.engine==='prepared-wasm')){
      assert.ok(run.results.find(r=>r.id==='identity').wasmCalls>0,'eligible contract must execute Wasm');
      assert.equal(run.diagnostics.arenas,0,'contract objects must release their arenas');
    }else if(run.diagnostics)assert.equal(run.diagnostics.wasmCalls,0);
  }
}
export function prepareOutput(out){
  if(existsSync(out))throw Error(`Refusing to overwrite contract evidence: ${out}`);
  mkdirSync(out,{recursive:true});
  const paths=['package-lock.json','node_modules/three/src/core/Object3D.js','node_modules/three/src/core/EventDispatcher.js','node_modules/three/src/animation/AnimationMixer.js','node_modules/three/src/animation/AnimationAction.js','node_modules/three/src/animation/PropertyBinding.js','node_modules/three/src/objects/Skeleton.js','node_modules/three/src/renderers/WebGLRenderer.js','packages/rthree/scene_core.wasm','packages/rthree/core.js','packages/rthree/runtime.js','packages/rthree/facade-state.js','packages/rthree/facade-kernel.js','tests/compatibility.mjs','tests/compatibility-browser.mjs','tests/compatibility/cases.mjs','tests/compatibility/node-worker.mjs','tests/compatibility/render.mjs','tests/compatibility/index.html'];
  const metadata={kind:'correctness-only',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceTreeDirty:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().length>0,node:process.version,upstream:JSON.parse(readFileSync('node_modules/three/package.json')).version,hashes:Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),caseIds:cases.map(c=>c.id)};
  assert.equal(metadata.upstream,'0.186.1');
  writeFileSync(`${out}/manifest.json`,JSON.stringify(metadata,null,2));
  return metadata;
}
if(process.argv[1]===new URL(import.meta.url).pathname){
  const out=process.env.RTHREE_CONTRACT_RESULTS_DIR||'work/compatibility-node';
  prepareOutput(out);const runs=[];
  for(const engine of engines){
    const file=`${out}/${engine}.json`;
    execFileSync(process.execPath,['tests/compatibility/node-worker.mjs',engine,file],{stdio:'inherit'});
    runs.push(JSON.parse(readFileSync(file)));
  }
  verifyRuns(runs);
  writeFileSync(`${out}/summary.json`,JSON.stringify({passed:true,engines,cases:cases.length,comparisons:cases.length*(engines.length-1),scope:'C1 semantics including bounded C2 facade routes'},null,2));
  console.log(`${cases.length} semantic cases: original expectations and seven candidate traces passed`);
}
