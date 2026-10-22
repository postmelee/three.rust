import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import {serve} from '../scripts/server.mjs';
const opt=Object.fromEntries(process.argv.slice(2).map(x=>x.split('=')));const out=opt.out||'bench/results/m0';mkdirSync(out,{recursive:true});
const scenarios=(opt.scenarios||'cubes,skinning,shader,small,hierarchy').split(',');const engines=(opt.engines||'original').split(',');const repeats=+(opt.repeats||5);const warmup=+(opt.warmup||30),samples=+(opt.samples||90);
const args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'];const server=await serve();const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',headless:true,args});
const manifest={date:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD']).toString().trim(),node:process.version,os:os.release(),cpu:os.cpus()[0],cpus:os.cpus().length,browser:browser.version(),args,warmup,samples,repeats,engines,scenarios,protocol:'fixed-frame exploratory cloud CPU; not 10s+30s hardware protocol',profile:opt.profile==='true',runs:[]};
try{for(let rep=0;rep<repeats;rep++)for(const scenario of scenarios)for(const engine of [...engines.slice(rep%engines.length),...engines.slice(0,rep%engines.length)]){
 const page=await browser.newPage({viewport:{width:640,height:360},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));const start=Date.now();await page.goto(`http://127.0.0.1:4173/fixtures/generated/${scenario}.html?engine=${engine}`);await page.waitForFunction(()=>!!window.__bench,{},{timeout:60000});const env=await page.evaluate(()=>window.__bench.ready());const startupMs=Date.now()-start;
 const result=await page.evaluate(p=>window.__bench.run(p),{warmup,samples,profile:opt.profile==='true'});if(errors.length)throw Error(errors.join('\n'));
 const file=`${scenario}-${engine}-${rep}.json`;writeFileSync(`${out}/${file}`,JSON.stringify({scenario,engine,rep,env,startupMs,...result}));manifest.runs.push(file);writeFileSync(`${out}/manifest.json`,JSON.stringify(manifest,null,2));console.log(file,JSON.stringify({cpu:quant(result.rows.map(x=>x.cpu),.5),env:env.renderer}));await page.close();
}}finally{await browser.close();server.close();}
function quant(a,q){return a.sort((a,b)=>a-b)[Math.floor((a.length-1)*q)]}
