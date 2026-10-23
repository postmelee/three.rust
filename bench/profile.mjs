import { browserPath } from '../scripts/browser-path.mjs';
import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
import {serve} from '../scripts/server.mjs';
const server=await serve();const browser=await chromium.launch({executablePath:browserPath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{for(const name of ['cubes','hierarchy','skinning']){const page=await browser.newPage({viewport:{width:640,height:360}});await page.goto(`http://127.0.0.1:4173/fixtures/generated/${name}.html`);await page.waitForFunction(()=>!!window.__bench);await page.evaluate(()=>window.__bench.run({warmup:30,samples:1}));const cdp=await page.context().newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:100});await cdp.send('Profiler.start');await page.evaluate(()=>window.__bench.run({warmup:0,samples:120}));const {profile}=await cdp.send('Profiler.stop');writeFileSync(`bench/results/m0/${name}.cpuprofile`,JSON.stringify(profile));console.log(name,profile.samples.length);await page.close();}}finally{await browser.close();server.close();}
