import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {browserPath} from '../scripts/browser-path.mjs';
import {serve} from '../scripts/server.mjs';
import {compareTrace} from './compatibility/cases.mjs';
const out=process.env.RTHREE_PREPARED_RESULTS_DIR||'work/prepared-validation';
if(existsSync(out))throw Error('Choose fresh prepared results directory');mkdirSync(out,{recursive:true});
const server=await serve(0),origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:browserPath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];let reference,referenceFallbacks;
const hash=value=>createHash('sha256').update(value).digest('hex');
const manifest={kind:'correctness-only',commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceTreeDirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),browser:browser.version(),status:'running',hashes:Object.fromEntries(['packages/rthree/core.js','packages/rthree/runtime.js','packages/rthree/facade-state.js','packages/rthree/prepared-kernel.js','packages/rthree/scene_core.wasm','tests/prepared/index.html','tests/prepared-browser.mjs'].map(p=>[p,hash(readFileSync(p))]))};
writeFileSync(`${out}/manifest.json`,JSON.stringify(manifest,null,2));
const evidence=({pixels,...rest})=>({...rest,pixelSha256:hash(Buffer.from(pixels))});
try{
 for(const [index,engine] of ['original','original','facade-wasm','prepared-js','prepared-wasm'].entries()){
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`${origin}/tests/prepared/index.html?engine=${engine}`);await page.waitForFunction(()=>!!window.__prepared);
  const frames=[];
  for(let step=0;step<12;step++){
   const value=await page.evaluate(step=>window.__prepared.frame(step),step);frames.push(value);
   await page.screenshot({path:`${out}/${index}-${engine}-${step}.png`});
   if(reference){const ref=reference[step];assert.deepEqual(value.pixels,ref.pixels,`${engine}/${step} exact pixels`);for(const key of ['world','view','normal','events'])compareTrace(value[key],ref[key],`${engine}/${step}/${key}`);assert.deepEqual(value.info,ref.info);}
  }
  if(!reference)reference=frames;
  let proof;
  if(engine.startsWith('prepared-')){proof=await page.evaluate(()=>window.__prepared.proof());assert.ok(proof.preparedPasses>0);assert.ok(proof.preparedMatrixReads>0);assert.equal(proof.topologyBuilds,0);assert.equal(proof.operationBytes,28);if(engine==='prepared-wasm')assert.ok(proof.preparedWasmCalls>0);}
  const fallbacks=await page.evaluate(()=>window.__prepared.fallbacks());assert.equal(fallbacks.error,'render sentinel');
  if(referenceFallbacks){for(const name of ['nested','recovered','uploaded']){assert.deepEqual(fallbacks[name].pixels,referenceFallbacks[name].pixels,`${engine}/${name} exact pixels`);for(const key of ['world','view','normal','events'])compareTrace(fallbacks[name][key],referenceFallbacks[name][key],`${engine}/${name}/${key}`);}}else referenceFallbacks=fallbacks;
  assert.deepEqual(errors,[]);await page.evaluate(()=>window.__prepared.dispose());
  const summary={engine,frames:frames.map(evidence),proof,fallbacks:{error:fallbacks.error,...Object.fromEntries(['nested','recovered','uploaded'].map(k=>[k,evidence(fallbacks[k])]))}};results.push(summary);writeFileSync(`${out}/${index}-${engine}.json`,JSON.stringify(summary,null,2));await page.close();console.log(engine,'twelve main/camera/shadow/fallback checkpoints plus nested/exception/upload checks passed');
 }
 writeFileSync(`${out}/results.json`,JSON.stringify({passed:true,checks:['exact pixels','world/model-view/normal numerical oracle','equal draw work','callbacks and custom sort fallback','material groups fallback','second camera','shadow main interaction','resource disposal','reentrant rendering','callback exception','attribute upload callback','JS bypass poison guards','private uniform backing storage'],results},null,2));
 manifest.status='complete';
}catch(e){manifest.status='failed';manifest.error=e.stack;throw e;}finally{writeFileSync(`${out}/manifest.json`,JSON.stringify(manifest,null,2));await browser.close();await new Promise(r=>server.close(r));}
