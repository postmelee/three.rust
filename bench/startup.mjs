// Separate diagnostics. Cache-Control:no-store does not erase V8/Wasm process caches.
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import {serve} from '../scripts/server.mjs';
const dir='bench/results/startup';mkdirSync(dir,{recursive:true});const server=await serve();const args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',headless:true,args});const runs=[];
try{for(let repeat=0;repeat<5;repeat++)for(const engine of ['original','js','wasm','packed-js']){
 const context=await browser.newContext({viewport:{width:640,height:360}}),page=await context.newPage();
 await page.addInitScript(()=>{window.__wasmCompile=[];const instantiate=WebAssembly.instantiate;WebAssembly.instantiate=async function(...args){const t=performance.now();const result=await instantiate.apply(this,args);window.__wasmCompile.push(performance.now()-t);return result;};});
 await page.goto(`http://127.0.0.1:4173/fixtures/generated/cubes.html?engine=${engine}`);await page.waitForFunction(()=>!!window.__bench);
 const result=await page.evaluate(async()=>{const env=await window.__bench.ready(),readyAt=performance.now();const first=window.__bench.step();return {env,readyAt,firstRenderReturnAt:performance.now(),firstFrameCpuMs:first.cpu,wasmCompileInstantiateMs:window.__wasmCompile,wasmFetch:performance.getEntriesByType('resource').filter(r=>r.name.endsWith('.wasm')).map(r=>({duration:r.duration,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize})),path:window.__bench.THREE.diagnostics?.()??null};});
 runs.push({repeat,engine,...result});writeFileSync(`${dir}/runs.json`,JSON.stringify({method:'fresh browser contexts, shared browser process, no-store; not fully cold cache; first render return is not compositor presentation',browser:browser.version(),args,runs},null,2));await context.close();console.log('startup',repeat,engine);
}}finally{await browser.close();server.close();}
