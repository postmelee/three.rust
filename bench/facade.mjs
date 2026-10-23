import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import os from 'node:os';
import {serve} from '../scripts/server.mjs';
import {browserPath} from '../scripts/browser-path.mjs';
import {configuration,hardwareRenderer} from './config.mjs';
import {compareTrace} from '../tests/compatibility/cases.mjs';

const args=process.argv.slice(2),suiteArgs=args.filter(x=>x.startsWith('suite='));
assert.ok(suiteArgs.length<=1);const suite=suiteArgs[0]?.slice(6)??'boundary';
assert.ok(['boundary','render'].includes(suite));
const c=configuration(args.filter(x=>!x.startsWith('suite=')));
if(existsSync(c.out))throw Error(`Choose a fresh output directory: ${c.out}`);
mkdirSync(c.out,{recursive:true});
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const sources=['package-lock.json','packages/rthree/core.js','packages/rthree/runtime.js','packages/rthree/facade-state.js','packages/rthree/facade-kernel.js','packages/rthree/packed.js','packages/rthree/scene_core.wasm','crates/scene-core/src/facade.rs','bench/facade.mjs','bench/facade.html','bench/browser.mjs','bench/config.mjs','bench/timing.mjs','fixtures/provenance.json','scripts/server.mjs'];
const manifest={date:new Date().toISOString(),commit:git('rev-parse','HEAD'),sourceTreeDirty:!!git('status','--porcelain'),suite,config:c,node:process.version,platform:os.platform(),os:os.release(),cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,hashes:Object.fromEntries(sources.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),status:'running',runs:[],meaning:suite==='boundary'?'CPU boundary experiment; no renderer, GPU or FPS conclusion':'Whole browser application CPU and rAF intervals; cloud software GPU is not hardware or FPS evidence'};
const save=()=>writeFileSync(`${c.out}/manifest.json`,JSON.stringify(manifest,null,2));save();
let server,browser;
try{
 server=await serve(0,{isolated:true});const origin=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({executablePath:browserPath(),headless:c.headless,args:c.args});manifest.browser=browser.version();save();
 for(let rep=0;rep<c.repeats;rep++){
  const engines=[...c.engines.slice(rep%c.engines.length),...c.engines.slice(0,rep%c.engines.length)];
  const reference=new Map();
  for(const scenario of suite==='boundary'?['boundary']:c.scenarios)for(const engine of engines){
   const page=await browser.newPage({viewport:c.viewport,deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const path=suite==='boundary'?'bench/facade.html':`fixtures/generated/${scenario}.html`;
   await page.goto(`${origin}/${path}?engine=${engine}`);
   await page.waitForFunction(suite=>suite==='boundary'?!!window.__facade:!!window.__bench,suite);
   let result;
   if(suite==='boundary')result=await page.evaluate(p=>window.__facade.run(p),{warmup:c.warmup,samples:c.samples,timings:c.timings});
   else {
    const env=await page.evaluate(()=>window.__bench.ready());if(c.hardware)hardwareRenderer(env.renderer);
    const clock=await page.evaluate(async()=>{const {observeClock}=await import('/bench/timing.mjs');return observeClock();});
    await page.evaluate(t=>window.__bench.THREE.configureDiagnostics?.({timings:t}),c.timings);
    result={env,clock,...await page.evaluate(p=>window.__bench.run(p),{warmup:c.warmup,samples:c.samples,profile:c.profile,gpu:c.gpu})};
   }
   assert.deepEqual(errors,[]);assert.equal(result.clock.crossOriginIsolated,true);assert.ok(result.clock.minPositiveDeltaMs>0);
   const file=`${scenario}-${engine}-${rep}.json`;
   writeFileSync(`${c.out}/${file}`,JSON.stringify({engine,rep,scenario,...result}));manifest.runs.push(file);save();
   if(suite==='boundary'){
    const values=result.cases.map(x=>({name:x.name,final:x.final,sink:x.sink}));
    if(reference.has(scenario))compareTrace(values,reference.get(scenario),`${engine}/final-state`);else reference.set(scenario,values);
   }
   await page.close();console.log(file);
  }
 }
 manifest.status='complete';
}catch(e){manifest.status='failed';manifest.error=e.stack;throw e;}
finally{manifest.finishedAt=new Date().toISOString();save();await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));}
