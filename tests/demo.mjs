import { browserPath } from '../scripts/browser-path.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {serve} from '../scripts/server.mjs';
const out=process.env.RTHREE_DEMO_RESULTS_DIR||'work/demo-validation';
const server=await serve();const browser=await chromium.launch({executablePath:browserPath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[],routes=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4173');
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('upstream JS'));
 for(const engine of ['wasm','prepared-js','prepared-wasm']){
  await page.selectOption('#engine',engine);await page.click('#open');
  await page.waitForFunction(engine=>{
   try {const s=JSON.parse(document.querySelector('#status').textContent);return s.engine===engine&&(engine==='wasm'?s.path.wasmCalls>0:s.path.preparedPasses>0);}catch{return false;}
  },engine);
  await page.click('#stop');
  const before=await page.evaluate(()=>document.querySelector('#view').contentWindow.__bench.THREE.diagnostics());
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const after=await page.evaluate(()=>document.querySelector('#view').contentWindow.__bench.THREE.diagnostics());
  assert.equal(before.wasmCalls,after.wasmCalls);assert.equal(before.preparedPasses,after.preparedPasses);
  if(engine==='prepared-wasm')assert.ok(after.preparedWasmCalls>0);
  if(engine==='prepared-js')assert.equal(after.wasmActive,false);
  routes.push({engine,diagnostics:after});
 }
 assert.deepEqual(errors,[]);mkdirSync(out,{recursive:true});await page.screenshot({path:out+'/demo.png',fullPage:true});
 writeFileSync(out+'/demo.json',JSON.stringify({passed:true,checks:['original autostart','legacy and both prepared route selection','Rust executed','pause stops updates'],routes,errors},null,2));
 console.log('Demo original, legacy and prepared routes with pause passed');
}finally{await browser.close();server.close();}
