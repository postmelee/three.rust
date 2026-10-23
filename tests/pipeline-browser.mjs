import {chromium} from 'playwright';import {serve} from '../scripts/server.mjs';import {configuration,hardwareRenderer} from '../bench/config.mjs';import assert from 'node:assert/strict';import {mkdirSync,writeFileSync} from 'node:fs';
const out=process.env.RTHREE_PIPELINE_RESULTS_DIR||'work/pipeline-validation';mkdirSync(out,{recursive:true});
const hardware=process.env.RTHREE_BROWSER_MODE==='hardware',cfg=configuration(hardware?['mode=hardware',`headless=${process.env.RTHREE_HEADLESS||'true'}`,...(process.env.RTHREE_ANGLE_BACKEND?[`angle=${process.env.RTHREE_ANGLE_BACKEND}`]:[])]:[]);
const server=await serve();let browser,reference;const results=[];
try{browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',headless:cfg.headless,args:cfg.args});
for(const [i,engine] of ['original','original','js','wasm','packed-js'].entries()){
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:4173/fixtures/pipeline/index.html?manual&count=2&bones=8&engine=${engine}`);await page.waitForFunction(()=>!!window.__pipeline);
 const snap=await page.evaluate(()=>{const p=window.__pipeline;for(let i=0;i<37;i++)p.renderStep();return {palette:p.rig.snapshot(),pixels:p.pixels(),gpu:p.gpu,volumes:p.rig.volumes(),draws:p.renderer.info.render.calls};});
 assert.deepEqual(errors,[]);if(hardware)hardwareRenderer(snap.gpu.renderer);assert.equal(snap.draws,2);let maxPalette=0,maxPixel=0;
 if(reference){assert.equal(snap.palette.length,reference.palette.length);for(let n=0;n<snap.palette.length;n++)maxPalette=Math.max(maxPalette,Math.abs(snap.palette[n]-reference.palette[n]));for(let n=0;n<snap.pixels.length;n++)maxPixel=Math.max(maxPixel,Math.abs(snap.pixels[n]-reference.pixels[n]));assert(maxPalette<=1e-6);assert.equal(maxPixel,0);}else reference=snap;
 const textureColors=new Set();for(let n=0;n<snap.pixels.length;n+=4)textureColors.add(snap.pixels.slice(n,n+3).join(','));assert(textureColors.size>20,'Rig must produce a visible nonblank image');
 await page.locator('canvas').screenshot({path:`${out}/${engine}-${i}.png`});results.push({engine,maxPalette,maxPixel,colors:textureColors.size,gpu:snap.gpu,volumes:snap.volumes});await page.close();console.log('pipeline',engine,'ok');
}writeFileSync(`${out}/results.json`,JSON.stringify({method:'37 fixed ticks; A/A, A/B/C/D palette and exact pixel comparison; 2 characters / 8 bones',results},null,2));
}finally{if(browser)await browser.close();server.close();}
