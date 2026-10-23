import { browserPath } from '../scripts/browser-path.mjs';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {serve, serverOrigin} from '../scripts/server.mjs';
import {configuration,hardwareRenderer} from './config.mjs';
const c=configuration(process.argv.slice(2));
const {out,scenarios,engines,repeats,warmup,samples,hardware,headless,args,viewport}=c;
// Never overwrite a recorded experiment, including a partial failed run.
if(existsSync(`${out}/manifest.json`))throw Error(`Output already contains an experiment: ${out}`);
mkdirSync(out,{recursive:true});
const git=(...a)=>execFileSync('git',a).toString().trim();
const manifest={date:new Date().toISOString(),commit:git('rev-parse','HEAD'),sourceTreeDirty:!!git('status','--porcelain','--untracked-files=no'),node:process.version,os:os.release(),cpu:os.cpus()[0],cpus:os.cpus().length,args,headless,viewport,warmup,samples,repeats,engines,scenarios,protocol:hardware?'fixed-frame hardware browser CPU experiment; headless intervals are not display presentation':'fixed-frame exploratory cloud CPU; not physical GPU evidence',profile:c.profile,hardware,gpuQuery:c.gpu,bridgeTimings:c.timings,hashes:Object.fromEntries(['package-lock.json','packages/rthree/scene_core.wasm','packages/rthree/core.js','packages/rthree/runtime.js','packages/rthree/packed.js','bench/browser.mjs','bench/run.mjs','bench/config.mjs'].map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),runs:[],status:'running'};
const save=()=>writeFileSync(`${out}/manifest.json`,JSON.stringify(manifest,null,2));save();
let server,browser;
try{
 server=await serve();browser=await chromium.launch({executablePath:browserPath(),headless,args});manifest.browser=browser.version();save();
 for(let rep=0;rep<repeats;rep++)for(const scenario of scenarios)for(const engine of [...engines.slice(rep%engines.length),...engines.slice(0,rep%engines.length)]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));const start=Date.now();
  await page.goto(`${serverOrigin}/fixtures/generated/${scenario}.html?engine=${engine}`);await page.waitForFunction(()=>!!window.__bench,{},{timeout:60000});
  const env=await page.evaluate(()=>window.__bench.ready());manifest.lastObservedEnvironment=env;save();
  const startupMs=Date.now()-start;if(hardware)hardwareRenderer(env.renderer);
  await page.evaluate(t=>window.__bench.THREE.configureDiagnostics?.({timings:t}),c.timings);
  const measurementStart=Date.now();const result=await page.evaluate(p=>window.__bench.run(p),{warmup,samples,profile:c.profile,gpu:c.gpu});
  if(errors.length)throw Error(errors.join('\n'));
  const file=`${scenario}-${engine}-${rep}.json`;writeFileSync(`${out}/${file}`,JSON.stringify({scenario,engine,rep,env,startupMs,measurementDurationMs:Date.now()-measurementStart,...result}));manifest.runs.push(file);save();
  console.log(file,JSON.stringify({cpu:quant(result.rows.map(x=>x.cpu),.5),renderer:env.renderer}));await page.close();
 }
 manifest.status='complete';
}catch(error){manifest.status='failed';manifest.error=error.message;throw error;}
finally{manifest.finishedAt=new Date().toISOString();save();if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));}
function quant(a,q){return a.sort((a,b)=>a-b)[Math.floor((a.length-1)*q)]}
