import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {browserPath} from '../scripts/browser-path.mjs';
import {serve} from '../scripts/server.mjs';
import {configuration,hardwareRenderer} from '../bench/config.mjs';
import {engines,prepareOutput,verifyRuns} from './compatibility.mjs';
import {compareTrace} from './compatibility/cases.mjs';

const out=process.env.RTHREE_CONTRACT_BROWSER_RESULTS_DIR||'work/compatibility-browser';
prepareOutput(out);
const hardware=process.env.RTHREE_BROWSER_MODE==='hardware';
const config=configuration(hardware?['mode=hardware',`headless=${process.env.RTHREE_HEADLESS||'false'}`,...(process.env.RTHREE_ANGLE_BACKEND?[`angle=${process.env.RTHREE_ANGLE_BACKEND}`]:[])]:[]);
const server=await serve(0),port=server.address().port;let browser;
const runs=[];
try{
  browser=await chromium.launch({executablePath:browserPath(),headless:config.headless,args:config.args});
  for(const engine of engines){
    const page=await browser.newPage({viewport:{width:128,height:128},deviceScaleFactor:1});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${port}/tests/compatibility/index.html?engine=${engine}`);
    await page.waitForFunction(()=>window.__contract);
    const run={engine,...await page.evaluate(()=>window.__contract),pageErrors:errors};runs.push(run);
    writeFileSync(`${out}/${engine}.json`,JSON.stringify(run,null,2));
    assert.equal(run.error,undefined);assert.deepEqual(errors,[]);
    if(hardware)hardwareRenderer(run.rendering.rendererName);
    for(const [i,frame] of run.rendering.frames.entries())writeFileSync(`${out}/${engine}-${i}.png`,Buffer.from(frame.png.split(',')[1],'base64'));
    await page.close();
  }
  verifyRuns(runs);
  for(const run of runs.slice(1)){
    compareTrace(run.rendering.events,runs[0].rendering.events,`${run.engine}/render-callbacks`);
    assert.equal(run.rendering.frames.length,2);
    for(let i=0;i<2;i++){
      compareTrace(run.rendering.frames[i].world,runs[0].rendering.frames[i].world);
      assert.deepEqual(run.rendering.frames[i].pixels,runs[0].rendering.frames[i].pixels,`${run.engine}/camera-${i} pixels`);
    }
  }
  writeFileSync(`${out}/summary.json`,JSON.stringify({passed:true,scope:'correctness only; no speed claim',browser:browser.version(),hardwareRequested:hardware,renderer:runs[0].rendering.rendererName,engines,semanticCases:runs[0].results.length,renderPassesPerRoute:2,exactPixels:true},null,2));
  console.log('Browser semantic, two-camera callback, matrix and exact-pixel contracts passed');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
