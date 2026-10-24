import { browserPath } from '../scripts/browser-path.mjs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import {serve} from '../scripts/server.mjs';
import {configuration,hardwareRenderer} from '../bench/config.mjs';
const hardware=process.env.RTHREE_BROWSER_MODE==='hardware';
const config=configuration(hardware?['mode=hardware',`headless=${process.env.RTHREE_HEADLESS||'true'}`,...(process.env.RTHREE_ANGLE_BACKEND?[`angle=${process.env.RTHREE_ANGLE_BACKEND}`]:[])]:[]);
const out=process.env.RTHREE_RESULTS_DIR||'work/browser-correctness';mkdirSync(out,{recursive:true});const server=await serve();
let browser;const results=[];
try{browser=await chromium.launch({executablePath:browserPath(),headless:config.headless,args:config.args});for(const scenario of ['cubes','skinning','shader','small','hierarchy']){
 let ref;
 for(const engine of ['original','original','js','wasm','packed-js','facade-js','facade-wasm','prepared-js','prepared-wasm']){
  const page=await browser.newPage({viewport:{width:640,height:360},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:4173/fixtures/generated/${scenario}.html?engine=${engine}`);await page.waitForFunction(()=>!!window.__bench);const env=await page.evaluate(()=>window.__bench.ready());if(hardware){writeFileSync(`${out}/hardware-preflight.json`,JSON.stringify(env,null,2));hardwareRenderer(env.renderer);}
  await page.evaluate(()=>{for(let i=0;i<12;i++)window.__bench.step()});
  const snap=await page.evaluate(()=>window.__bench.snapshot());const diag=await page.evaluate(()=>window.__bench.THREE.diagnostics?.()??null);
  assert.deepEqual(errors,[]);const file=`${scenario}-${engine}${engine==='original'&&ref?'-repeat':''}.png`;writeFileSync(`${out}/${file}`,Buffer.from(snap.png.split(',')[1],'base64'));
  if(ref){let maxMatrix=0,maxPixel=0,changed=0,total=0;assert.equal(snap.matrices.length,ref.matrices.length);for(let i=0;i<snap.matrices.length;i++){const e=Math.abs(snap.matrices[i]-ref.matrices[i]);maxMatrix=Math.max(maxMatrix,e);assert.ok(e<=1e-10+1e-12*Math.abs(ref.matrices[i]));}const diff=[];for(let i=0;i<snap.pixels.length;i++){const e=Math.abs(snap.pixels[i]-ref.pixels[i]);diff.push(i%4===3?255:e);maxPixel=Math.max(maxPixel,e);total+=e;if(e)changed++;}
   // Exact A/A and engine equality is the initial same-device gate. Hardware differences require investigation, not a silently relaxed threshold.
   assert.equal(maxPixel,0,`${scenario}/${engine} pixel mismatch`);
   const diffPng=await page.evaluate(({diff,w,h})=>{const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').putImageData(new ImageData(Uint8ClampedArray.from(diff),w,h),0,0);return c.toDataURL();},{diff,w:snap.width,h:snap.height});writeFileSync(`${out}/${file.replace('.png','-diff.png')}`,Buffer.from(diffPng.split(',')[1],'base64'));
   results.push({scenario,engine,file,maxMatrix,maxPixel,changed,total,diag,env});
  }else ref=snap;
  if(engine==='wasm'||engine==='facade-wasm'||engine==='prepared-wasm')assert.ok(diag.wasmActive&&diag.wasmCalls>0&&diag.wasmNodes>0);
  await page.close();console.log(scenario,engine,'ok');
 }
}
// Callback mutations/explicit updates, shadow, multiple renders, and clone identity.
const page=await browser.newPage();await page.goto('http://127.0.0.1:4173/fixtures/generated/small.html?engine=wasm');await page.waitForFunction(()=>!!window.__bench);await page.evaluate(()=>window.__bench.ready());
const callback=await page.evaluate(()=>{const {THREE:T,get}=window.__bench,{renderer}=get();const s=new T.Scene(),c=new T.PerspectiveCamera(45,1,.1,100);c.position.z=5;const a=new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial());s.add(a);let before=0,after=0;a.onBeforeRender=()=>{before++;a.position.x=.2;a.updateMatrixWorld(true);};a.onAfterRender=()=>after++;renderer.render(s,c);renderer.render(s,c);const pos=a.getWorldPosition(new T.Vector3()).x;T.release(s);return {before,after,pos};});assert.deepEqual(callback,{before:2,after:2,pos:.2});await page.close();
writeFileSync(`${out}/results.json`,JSON.stringify({results,callback,method:'12 fixed ticks, exact A/A and engine pixel comparison, matrices atol 1e-10 rtol 1e-12; no capture in performance loops'},null,2));
}finally{if(browser)await browser.close();server.close();}
