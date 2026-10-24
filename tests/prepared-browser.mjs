import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,existsSync,writeFileSync} from 'node:fs';
import {browserPath} from '../scripts/browser-path.mjs';
import {serve} from '../scripts/server.mjs';
import {compareTrace} from './compatibility/cases.mjs';
const out=process.env.RTHREE_PREPARED_RESULTS_DIR||'work/prepared-validation';
if(existsSync(out))throw Error('Choose fresh prepared results directory');mkdirSync(out,{recursive:true});
const server=await serve(0),origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:browserPath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];let reference,referenceFallbacks;
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
  const summary={engine,frames:frames.map(({pixels,...rest})=>rest),proof};results.push(summary);writeFileSync(`${out}/${index}-${engine}.json`,JSON.stringify(summary,null,2));await page.close();console.log(engine,'twelve main/camera/shadow/fallback checkpoints plus nested/exception/upload checks passed');
 }
 writeFileSync(`${out}/results.json`,JSON.stringify({passed:true,checks:['exact pixels','world/model-view/normal numerical oracle','equal draw work','callbacks and custom sort fallback','material groups fallback','second camera','shadow main interaction','JS bypass poison guards'],results},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
