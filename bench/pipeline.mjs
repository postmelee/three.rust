import { browserPath } from '../scripts/browser-path.mjs';
// Preparation diagnostic; not the M5 Rust-owned pipeline or a product speedup study.
import {chromium} from 'playwright';import {serve, serverOrigin} from '../scripts/server.mjs';import {configuration,hardwareRenderer} from './config.mjs';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import os from 'node:os';
const opt={};for(const s of process.argv.slice(2)){const i=s.indexOf('=');const key=s.slice(0,i);if(i<1||!['out','counts','bones','engines','repeats','warmup','samples','stage','mode','headless','angle'].includes(key)||key in opt)throw Error(`Invalid option: ${s}`);opt[key]=s.slice(i+1);}
const cfg=configuration(['scenarios=skinning',`repeats=${opt.repeats||3}`,`warmup=${opt.warmup||30}`,`samples=${opt.samples||60}`,`engines=${opt.engines||'original'}`,...['mode','headless','angle'].filter(k=>k in opt).map(k=>`${k}=${opt[k]}`)]);
cfg.viewport={width:640,height:540};
const counts=(opt.counts||'1,16,64').split(',').map(Number),bones=Number(opt.bones||24),stage=opt.stage||'cpu';
if(!['cpu','render'].includes(stage)||new Set(counts).size!==counts.length||counts.some(n=>!Number.isInteger(n)||n<1||n>256)||!Number.isInteger(bones)||bones<2||bones>128)throw Error('Invalid workload');
const out=opt.out||'work/pipeline-diagnostic';if(existsSync(out))throw Error('Choose a fresh output directory');mkdirSync(out,{recursive:true});
const paths=['fixtures/pipeline/rig.mjs','fixtures/pipeline/index.html','fixtures/pipeline/source-audit.json','bench/pipeline.mjs','package-lock.json','packages/rthree/core.js','packages/rthree/runtime.js','packages/rthree/scene_core.wasm'];
const fileHashes=Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
const read=p=>{try{return readFileSync(p,'utf8').trim();}catch{return null;}};
const manifest={classification:stage==='cpu'?'CPU-only preparation diagnostic; no render timing':'Full-frame preparation diagnostic; not a speedup study',status:'running',startedAt:new Date().toISOString(),sourceCommit:execFileSync('git',['rev-parse','HEAD']).toString().trim(),dirty:!!execFileSync('git',['status','--porcelain']).length,fileHashes,sourceAudit:JSON.parse(readFileSync('fixtures/pipeline/source-audit.json')),options:{...cfg,counts,bones,stage,out},renderTarget:{width:640,height:480,devicePixelRatio:1},host:{platform:os.platform(),release:os.release(),cpus:os.cpus().map(c=>c.model),memory:os.totalmem(),cpuQuota:read('/sys/fs/cgroup/cpu.max'),memoryLimit:read('/sys/fs/cgroup/memory.max'),gpuDeviceDirectory:existsSync('/dev/dri'),node:process.version},runs:[]};
const save=()=>writeFileSync(`${out}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');save();const server=await serve();let browser;
try{browser=await chromium.launch({executablePath:browserPath(),headless:cfg.headless,args:cfg.args});manifest.browser=browser.version();
for(let repeat=0;repeat<cfg.repeats;repeat++)for(const count of (repeat%2?[...counts].reverse():counts))for(const engine of (repeat%2?[...cfg.engines].reverse():cfg.engines)){
 const page=await browser.newPage({viewport:cfg.viewport,deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`${serverOrigin}/fixtures/pipeline/index.html?manual&count=${count}&bones=${bones}&engine=${engine}`);await page.waitForFunction(()=>!!window.__pipeline);
 const gpu=await page.evaluate(()=>window.__pipeline.gpu);if(cfg.hardware)hardwareRenderer(gpu.renderer);
 const data=await page.evaluate(async c=>window.__pipeline.measure(c),{mode:stage,warmup:cfg.warmup,samples:cfg.samples});if(errors.length)throw Error(errors.join('\n'));
 if(data.raw.length!==cfg.samples||data.raw.some(r=>!Number.isFinite(r.cpu)||r.cpu<0))throw Error('Incomplete samples');
 const name=`${stage}-${count}-${engine}-${repeat}.json`;writeFileSync(`${out}/${name}`,JSON.stringify({repeat,count,engine,...data},null,2)+'\n');manifest.runs.push(name);save();await page.close();console.log(name);
}manifest.status='complete';
}catch(e){manifest.status='failed';manifest.error=String(e);throw e;}finally{manifest.finishedAt=new Date().toISOString();save();if(browser)await browser.close();server.close();}
