import {chromium} from 'playwright';
import {writeFileSync,mkdirSync,readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {serve} from '../scripts/server.mjs';
import {browserPath} from '../scripts/browser-path.mjs';
const out=process.argv[2]||'work/facade-profile';if(existsSync(out))throw Error('Choose a fresh profile directory');mkdirSync(out,{recursive:true});
const server=await serve(0,{isolated:true}),port=server.address().port;
const browser=await chromium.launch({executablePath:browserPath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 for(const engine of ['original','facade-wasm']){
  const page=await browser.newPage({viewport:{width:640,height:360},deviceScaleFactor:1});
  await page.goto(`http://127.0.0.1:${port}/fixtures/generated/hierarchy.html?engine=${engine}`);
  await page.waitForFunction(()=>window.__bench);const env=await page.evaluate(()=>window.__bench.ready());
  await page.evaluate(()=>window.__bench.run({warmup:20,samples:2}));
  const cdp=await page.context().newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});await cdp.send('Profiler.start');
  await page.evaluate(()=>window.__bench.run({warmup:0,samples:30}));
  const {profile}=await cdp.send('Profiler.stop');writeFileSync(`${out}/${engine}.cpuprofile`,JSON.stringify(profile));
  writeFileSync(`${out}/${engine}-environment.json`,JSON.stringify(env,null,2));await page.close();
 }
 const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
 writeFileSync(`${out}/manifest.json`,JSON.stringify({kind:'separate diagnostic CPU sampling; not primary timing',commit:git('rev-parse','HEAD'),trackedSourceDirty:!!git('status','--porcelain','--untracked-files=no'),browser:browser.version(),warmupFrames:22,sampledFrames:30,intervalMicroseconds:1000,hashes:Object.fromEntries(['packages/rthree/core.js','packages/rthree/facade-state.js','packages/rthree/scene_core.wasm','bench/facade-profile.mjs'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]))},null,2));
}finally{await browser.close();server.close();}
