// Stage 3A whole-path diagnostic. Commit tooling before execution.
// This file never changes a runtime checkout or its fixtures.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,realpathSync} from 'node:fs';
import {execFileSync,spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import os from 'node:os';

const argv={};
const allowed=new Set(['c3','epoch','tool-root','out','repeats','warmup','samples']);
for(const arg of process.argv.slice(2)){
 const at=arg.indexOf('=');assert.ok(at>0,'Expected key=value');
 const key=arg.slice(0,at);assert.ok(allowed.has(key)&&!Object.hasOwn(argv,key),`Unknown/duplicate argument: ${key}`);argv[key]=arg.slice(at+1);
}
for(const key of ['c3','epoch','out'])assert.ok(argv[key],`Required argument: ${key}`);
const integer=(key,fallback,min,max)=>{const n=Number(argv[key]??fallback);assert.ok(Number.isSafeInteger(n)&&n>=min&&n<=max,`Invalid ${key}`);return n;};
const repeats=integer('repeats',6,1,6),warmup=integer('warmup',240,0,100000),samples=integer('samples',600,2,100000);
const toolFile=fileURLToPath(import.meta.url),toolRoot=realpathSync(argv['tool-root']??path.resolve(path.dirname(toolFile),'..'));
const out=path.resolve(argv.out);assert.ok(!existsSync(out),'Choose a fresh output directory');
const roots={c3:realpathSync(argv.c3),epoch:realpathSync(argv.epoch)};
assert.notEqual(roots.c3,roots.epoch,'Runtime roots must be separate checkouts');
assert.notEqual(toolRoot,roots.c3,'Driver must not be installed into the reference checkout');
assert.notEqual(toolRoot,roots.epoch,'Driver must not be installed into the candidate checkout');
const expected={c3:'ce21ffcf355534a8cf32eb4c9f7e43d6a86509b5',epoch:'6990fd92f61a031c8c2ba7a8282cfb63684e6dfb'};
const scenes=['cubes','hierarchy','small','shader'];
const routes=[
 {label:'original-A',root:'epoch',engine:'original'},
 {label:'original-B',root:'epoch',engine:'original'},
 {label:'C3-JS',root:'c3',engine:'prepared-js'},
 {label:'C3-Wasm',root:'c3',engine:'prepared-wasm'},
 {label:'epoch-JS',root:'epoch',engine:'prepared-js'},
 {label:'epoch-Wasm',root:'epoch',engine:'prepared-wasm'},
];
const orderSeed=[0,1,5,2,4,3],viewport={width:640,height:360};
const hash=b=>createHash('sha256').update(b).digest('hex');
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const parityFiles=[
 'package-lock.json','rust-toolchain.toml','Cargo.lock','scripts/fixtures.mjs','scripts/build.mjs',
 'fixtures/provenance.json','fixtures/original/webgl_interactive_cubes.html','fixtures/original/webgl_shader.html','fixtures/original/main.css',
 ...scenes.map(s=>`fixtures/generated/${s}.html`),
 'bench/browser.mjs','bench/timing.mjs','bench/config.mjs',
 'node_modules/three/package.json','node_modules/three/build/three.module.js','node_modules/three/build/three.core.js',
 'node_modules/three/examples/jsm/libs/stats.module.js',
 'packages/rthree/core.js','packages/rthree/runtime.js','packages/rthree/packed.js',
 'packages/rthree/facade-kernel.js','packages/rthree/prepared-kernel.js','packages/rthree/scene_core.wasm',
 'crates/scene-core/src/facade.rs','crates/scene-core/src/prepared.rs','scripts/server.mjs',
];
const runtimeFiles=[...parityFiles,'packages/rthree/facade-state.js','packages/rthree/prepared.js','packages/rthree/prepared-js.js','docs/prepared-source.json'];
const fileHashes=(root,files)=>Object.fromEntries(files.map(f=>[f,hash(readFileSync(path.join(root,f)))]));
const cleanPin=(root,pin)=>{const commit=git(root,'rev-parse','HEAD'),status=git(root,'status','--porcelain');assert.equal(status,'',`Checkout is not clean: ${root}`);if(pin)assert.equal(commit,pin,`Wrong runtime SHA: ${root}`);return {commit,sourceTreeDirty:false};};
const json=(name,value)=>{const f=path.join(out,name);mkdirSync(path.dirname(f),{recursive:true});writeFileSync(f,JSON.stringify(value,null,2)+'\n');};
mkdirSync(out,{recursive:true});
const manifest={status:'running',startedAt:new Date().toISOString(),kind:'whole-path-screening-only',
 fullPredeclaredMatrix:repeats===6&&warmup===240&&samples===600,
 node:process.version,host:{platform:os.platform(),release:os.release(),arch:os.arch(),cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,totalMemoryBytes:os.totalmem()},
 configuration:{repeats,warmup,samples,scenes,viewport,deviceScaleFactor:1,headless:false,isolated:true,profile:false,gpuQueries:false,stageTimings:false},
 routes,orders:Array.from({length:repeats},(_,r)=>orderSeed.map(i=>routes[(i+r)%6].label)),
 meaning:'Historical bench/browser.run CPU includes animate through renderer return. Row bridge counters are collected outside that CPU interval. Intervals are rAF timestamps, not callback starts, display latency or FPS. No product qualification.',
 correctness:[],runs:[],attempts:[],servers:{},runtime:{},tooling:{},errors:[],
};
const save=()=>json('manifest.json',manifest);
save();
// Keep returned samples/state even if the following page observation fails.
async function persistBeforeObservation(record,afterKey,observe,persist){
 persist(record);
 record[afterKey]=await observe();
 persist(record);
 return record;
}
const children=[],timed=[],correctnessReferences=new Map(),workReferences=new Map();
let browser,interrupted=false;
const stopRequested=()=>{interrupted=true;browser?.close().catch(()=>{});};
process.once('SIGINT',stopRequested);process.once('SIGTERM',stopRequested);

async function startServer(name,root){
 const source="import {serve} from './scripts/server.mjs'; const server=await serve(0,{isolated:true}); process.stdout.write(JSON.stringify({origin:'http://127.0.0.1:'+server.address().port})+'\\n'); const stop=()=>server.close(()=>process.exit(0));process.once('SIGTERM',stop);process.once('SIGINT',stop);";
 const child=spawn(process.execPath,['--input-type=module','-e',source],{cwd:root,env:{...process.env},stdio:['ignore','pipe','pipe']});
 const item={name,child,stdout:'',stderr:'',origin:null};children.push(item);
 child.stderr.on('data',b=>{item.stderr+=b.toString();});
 await new Promise((resolve,reject)=>{
  let done=false;const timer=setTimeout(()=>finish(new Error(`Server readiness timed out: ${name}`)),20000);
  const finish=error=>{if(done)return;done=true;clearTimeout(timer);if(error)reject(error);else resolve();};
  child.once('error',finish);child.once('exit',(code,signal)=>{if(!item.origin)finish(new Error(`Server exited before readiness: ${name} ${code}/${signal}`));});
  child.stdout.on('data',b=>{
   item.stdout+=b.toString();if(done)return;
   const newline=item.stdout.indexOf('\n');if(newline<0)return;
   try{const d=JSON.parse(item.stdout.slice(0,newline));assert.match(d.origin,/^http:\/\/127\.0\.0\.1:\d+$/);item.origin=d.origin;finish();}catch(e){finish(e);}
  });
 });
 manifest.servers[name]={origin:item.origin,root,childPid:child.pid,isolated:true};save();return item.origin;
}
async function stopServer(item){
 if(item.child.exitCode!==null||item.child.signalCode!==null)return;
 await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);resolve();};const timer=setTimeout(()=>{item.child.kill('SIGKILL');finish();},5000);item.child.once('exit',finish);item.child.kill('SIGTERM');});
}
function finiteArray(values,label){assert.ok(Array.isArray(values)&&values.length,`${label}: missing array`);assert.ok(values.every(Number.isFinite),`${label}: nonfinite values`);}
function quantile(values,p){const a=[...values].sort((x,y)=>x-y);assert.ok(a.length);const x=(a.length-1)*p;return a[Math.floor(x)]+(a[Math.ceil(x)]-a[Math.floor(x)])*(x%1);}
function statistics(values){finiteArray(values,'statistics');return {p50:quantile(values,.5),p95:quantile(values,.95),p99:quantile(values,.99),mean:values.reduce((a,b)=>a+b,0)/values.length,min:Math.min(...values),max:Math.max(...values)};}
function matrixCompare(actual,reference){
 assert.equal(actual.length,reference.length,'World matrix lengths differ');let maxAbsoluteError=0;
 for(let i=0;i<actual.length;i++){const a=actual[i],b=reference[i];assert.ok(Number.isFinite(a)&&Number.isFinite(b),'Nonfinite matrix');const e=Math.abs(a-b);maxAbsoluteError=Math.max(maxAbsoluteError,e);assert.ok(e<=1e-10+1e-12*Math.abs(b),`Matrix mismatch at ${i}: ${a} vs ${b}`);}
 return maxAbsoluteError;
}
function drawWork(info){return Object.fromEntries(['calls','triangles','points','lines'].map(k=>[k,info[k]]));}
function assertExecution(route,diag){
 if(route.engine==='original'){assert.equal(diag,null,'Upstream must not be a candidate engine');return;}
 assert.ok(diag&&diag.preparedPasses>0,`${route.label}: prepared path did not execute`);
 if(route.engine==='prepared-wasm')assert.ok(diag.wasmActive&&diag.wasmCalls>0&&diag.preparedWasmCalls>0,`${route.label}: native work absent`);
 else {assert.equal(diag.wasmActive,false);assert.equal(diag.preparedWasmCalls,0);}
}
function executionCoverage(route,rows,before){
 if(route.engine==='original'){assert.ok(rows.every(row=>!row.bridge),'Upstream row unexpectedly has candidate diagnostics');return null;}
 const keys=['preparedPasses','preparedWasmCalls','preparedFallbacks','wasmCalls'];
 for(const row of rows){assertExecution(route,row.bridge);assert.equal(row.bridge.preparedFallbacks,0,'Ordinary fixture unexpectedly used fallback');}
 for(let i=1;i<rows.length;i++){
  const a=rows[i-1].bridge,b=rows[i].bridge;
  assert.equal(b.preparedPasses-a.preparedPasses,1,`${route.label}: expected one prepared pass in measured sample ${i}`);
  if(route.engine==='prepared-wasm'){assert.equal(b.preparedWasmCalls-a.preparedWasmCalls,1,`${route.label}: expected one native prepared pass in measured sample ${i}`);assert.ok(b.wasmCalls>a.wasmCalls,'Expected native execution in each measured sample');}
 }
 const first=rows[0].bridge,last=rows.at(-1).bridge;
 assert.equal(first.preparedPasses-before.preparedPasses,warmup+1,'Warmup and first sample prepared coverage mismatch');
 if(route.engine==='prepared-wasm')assert.equal(first.preparedWasmCalls-before.preparedWasmCalls,warmup+1);
 return {beforeWarmup:before,first:Object.fromEntries(keys.map(k=>[k,first[k]])),last:Object.fromEntries(keys.map(k=>[k,last[k]])),delta:Object.fromEntries(keys.map(k=>[k,last[k]-first[k]])),consecutiveMeasuredIntervalsChecked:rows.length-1,meaning:'Every measured interval after the first advances prepared work. No fallback since page creation, including warmup. First row counters include warmup.'};
}
async function state(page){return page.evaluate(()=>({visibility:document.visibilityState,focused:document.hasFocus(),dpr:devicePixelRatio,width:innerWidth,height:innerHeight,tick:window.__tick??null,timeOrigin:performance.timeOrigin}));}
function assertVisible(s){assert.equal(s.visibility,'visible');assert.equal(s.focused,true);assert.equal(s.dpr,1);assert.equal(s.width,viewport.width);assert.equal(s.height,viewport.height);}
async function preparePage(route,scenario,hardwareRenderer){
 const context=await browser.newContext({viewport,deviceScaleFactor:1});
 const page=await context.newPage();page.setDefaultTimeout(120000);
 const errors=[],requestFailures=[];page.on('pageerror',e=>errors.push(e.stack??e.message));page.on('requestfailed',r=>requestFailures.push({url:r.url(),error:r.failure()?.errorText}));
 try{
  await page.goto(`${manifest.servers[route.root].origin}/fixtures/generated/${scenario}.html?engine=${route.engine}`);
  await page.waitForFunction(()=>!!window.__bench);
  const env=await page.evaluate(()=>window.__bench.ready());hardwareRenderer(env.renderer);
  assert.equal(env.width,viewport.width);assert.equal(env.height,viewport.height);assert.equal(env.dpr,1);
  await page.bringToFront();await page.evaluate(()=>new Promise(requestAnimationFrame));
  const initial=await state(page);assertVisible(initial);assert.equal(initial.tick,null,'Preparation must not advance fixture tick');
  const clock=await page.evaluate(async()=>{const {observeClock}=await import('/bench/timing.mjs');return observeClock();});
  assert.equal(clock.crossOriginIsolated,true);assert.ok(Number.isFinite(clock.minPositiveDeltaMs)&&clock.minPositiveDeltaMs>0);
  await page.evaluate(()=>window.__bench.THREE.configureDiagnostics?.({timings:false}));
  assert.deepEqual(errors,[]);assert.deepEqual(requestFailures,[]);
  return {context,page,env,clock,initial,errors,requestFailures};
 }catch(e){await context.close();throw e;}
}
async function correctness(route,scenario,hardwareRenderer){
 const key=`correctness/${scenario}-${route.label}`,attempt={kind:'correctness',route:route.label,scenario,status:'running',startedAt:new Date().toISOString()};manifest.attempts.push(attempt);save();
 let p,returnedStateAvailable=false;
 try{
  p=await preparePage(route,scenario,hardwareRenderer);
  const value=await p.page.evaluate(()=>{
   for(let i=0;i<12;i++)window.__bench.step();
   const before={...window.__bench.get().renderer.info.render};const snapshot=window.__bench.snapshot();
   return {snapshot,before,after:{...window.__bench.get().renderer.info.render},diagnostics:window.__bench.THREE.diagnostics?.()??null,tick:window.__tick};
  });
  const pixels=Buffer.from(value.snapshot.pixels);const {png,...snapshot}=value.snapshot;
  writeFileSync(path.join(out,key+'.png'),Buffer.from(png.split(',')[1],'base64'));
  const evidence={route:route.label,scenario,env:p.env,clock:p.clock,stateBefore:p.initial,stateAfter:null,errors:p.errors,requestFailures:p.requestFailures,
   ...value,snapshot:{...snapshot,pixelSha256:hash(pixels)},snapshotAddsRender:true,meaning:'Twelve fixed steps and one separate snapshot render; no timed page is reused.'};
  await persistBeforeObservation(evidence,'stateAfter',()=>state(p.page),record=>{
   writeFileSync(path.join(out,key+'.json.gz'),gzipSync(Buffer.from(JSON.stringify(record)),{level:9}));returnedStateAvailable=true;
  });
  assert.deepEqual(p.errors,[]);assert.deepEqual(p.requestFailures,[]);assertVisible(evidence.stateAfter);assert.equal(value.tick,11);assertExecution(route,value.diagnostics);
  assert.equal(pixels.length,viewport.width*viewport.height*4);finiteArray(snapshot.matrices,'World matrices');
  let maxAbsoluteMatrixError=0;
  if(correctnessReferences.has(scenario)){
   const ref=correctnessReferences.get(scenario);assert.deepEqual(pixels,ref.pixels,'Complete RGBA mismatch');
   maxAbsoluteMatrixError=matrixCompare(snapshot.matrices,ref.matrices);assert.deepEqual(drawWork(value.before),ref.before);assert.deepEqual(drawWork(value.after),ref.after);
  }else {assert.equal(route.label,'original-A');correctnessReferences.set(scenario,{pixels,matrices:snapshot.matrices,before:drawWork(value.before),after:drawWork(value.after)});}
  attempt.status='passed';manifest.correctness.push({route:route.label,scenario,file:key+'.json.gz',image:key+'.png',pixelSha256:hash(pixels),maxAbsoluteMatrixError,draws:drawWork(value.before),diagnostics:value.diagnostics});
 }catch(e){attempt.status='failed';attempt.error=e.stack??String(e);if(p)json(key+'-failure.json',{attempt,errors:p.errors,requestFailures:p.requestFailures,returnedStateAvailable,rawFile:returnedStateAvailable?key+'.json.gz':null});throw e;}
 finally{attempt.finishedAt=new Date().toISOString();save();await p?.context.close();}
}
function analyze(){
 const groups=[];const aa=[];const comparisons=[];
 for(const scenario of scenes){
  const original=timed.filter(r=>r.scenario===scenario&&r.route.startsWith('original-'));
  const midpoint=quantile(original.map(r=>r.cpu.p50),.5),clock=Math.max(...original.map(r=>r.clock.minPositiveDeltaMs)),tolerance=Math.max(midpoint*.05,4*clock);
  aa.push({scenario,runCount:original.length,medianP50:midpoint,toleranceMs:tolerance,clockIncrementMs:clock,passed:original.every(r=>Math.abs(r.cpu.p50-midpoint)<=tolerance)&&original.every(r=>r.blocks.every(b=>Math.abs(b.p50-r.cpu.p50)<=tolerance)),runs:original.map(r=>({file:r.file,route:r.route,repeat:r.repeat,p50:r.cpu.p50,deltaMs:r.cpu.p50-midpoint,withinAcrossRunTolerance:Math.abs(r.cpu.p50-midpoint)<=tolerance,blocks:r.blocks.map(b=>({...b,withinOriginalAaTolerance:Math.abs(b.p50-r.cpu.p50)<=tolerance})),blockScreenPassed:r.blocks.every(b=>Math.abs(b.p50-r.cpu.p50)<=tolerance)}))});
  for(const route of routes){
   const rs=timed.filter(r=>r.scenario===scenario&&r.route===route.label),medians={};
   for(const metric of ['cpu','rafInterval'])medians[metric]=Object.fromEntries(['p50','p95','p99','mean'].map(k=>[k,quantile(rs.map(r=>r[metric][k]),.5)]));
   groups.push({scenario,route:route.label,runCount:rs.length,medianOfRunQuantiles:medians,p50Range:[Math.min(...rs.map(r=>r.cpu.p50)),Math.max(...rs.map(r=>r.cpu.p50))],allBlockScreensPassed:rs.every(r=>r.blockScreenPassed)});
  }
  for(const [baseline,candidate] of [['original-A','C3-JS'],['original-A','C3-Wasm'],['original-A','epoch-JS'],['original-A','epoch-Wasm'],['C3-JS','epoch-JS'],['C3-Wasm','epoch-Wasm'],['epoch-JS','epoch-Wasm']]){
   const a=groups.find(g=>g.scenario===scenario&&g.route===baseline),b=groups.find(g=>g.scenario===scenario&&g.route===candidate);
   comparisons.push({scenario,baseline,candidate,quantiles:Object.fromEntries(['p50','p95','p99'].map(k=>{const x=a.medianOfRunQuantiles.cpu[k],y=b.medianOfRunQuantiles.cpu[k];return [k,{baselineMs:x,candidateMs:y,savingMs:x-y,reductionFraction:x>0?(x-y)/x:null}];})),repeatPairs:Array.from({length:repeats},(_,repeat)=>{const x=timed.find(r=>r.scenario===scenario&&r.route===baseline&&r.repeat===repeat),y=timed.find(r=>r.scenario===scenario&&r.route===candidate&&r.repeat===repeat);return {repeat,baselineFile:x.file,candidateFile:y.file,p50SavingMs:x.cpu.p50-y.cpu.p50,p95SavingMs:x.cpu.p95-y.cpu.p95};})});
  }
 }
 return {kind:'diagnostic-screen-only',fullPredeclaredMatrix:manifest.fullPredeclaredMatrix,method:'Linearly interpolated per-run quantiles, then medians across runs; no pooled-frame inference. A/A uses all original-A/B runs and one scene-wide max(5% of original median p50, four maximum observed original clock increments) tolerance for both across-run and original block checks. Separate per-route block diagnostics use max(5% of own run p50, four own clock increments). Each block is contiguous 120 frames; partial smoke blocks are labeled.',aa,groups,comparisons,runs:timed,verdict:'No product, FPS or Rust-default qualification. Preserve every run and failed stability screen.'};
}

try{
 manifest.tooling={root:toolRoot,...cleanPin(toolRoot),file:path.relative(toolRoot,toolFile),fileSha256:hash(readFileSync(toolFile)),hashes:fileHashes(toolRoot,['package-lock.json','scripts/browser-path.mjs','scripts/runner-environment.mjs','bench/config.mjs'])};
 assert.ok(!manifest.tooling.file.startsWith('..')&&!path.isAbsolute(manifest.tooling.file),'Driver must reside in committed tooling checkout');
 git(toolRoot,'ls-files','--error-unmatch',manifest.tooling.file);
 for(const [name,root] of Object.entries(roots))manifest.runtime[name]={root,...cleanPin(root,expected[name]),hashes:fileHashes(root,runtimeFiles)};
 for(const file of parityFiles)assert.equal(manifest.runtime.c3.hashes[file],manifest.runtime.epoch.hashes[file],`Runtime parity failed: ${file}`);
 manifest.parityFiles=parityFiles;save();
 const require=createRequire(path.join(toolRoot,'package.json')),{chromium}=require('playwright');
 const {browserPath}=await import(pathToFileURL(path.join(toolRoot,'scripts/browser-path.mjs')).href);
 const {hardwareRenderer}=await import(pathToFileURL(path.join(toolRoot,'bench/config.mjs')).href);
 manifest.executablePath=browserPath();manifest.launch={headless:false,args:[]};save();
 execFileSync(process.execPath,[path.join(toolRoot,'scripts/runner-environment.mjs'),path.join(out,'environment-before')],{cwd:toolRoot,stdio:'pipe'});
 for(const [name,root] of Object.entries(roots))await startServer(name,root);
 browser=await chromium.launch({executablePath:manifest.executablePath,headless:false,args:[]});manifest.browser=browser.version();
 const cdp=await browser.newBrowserCDPSession();
 for(const [key,method] of [['browserVersion','Browser.getVersion'],['browserCommandLine','Browser.getBrowserCommandLine'],['gpuSystem','SystemInfo.getInfo']]){
  try{manifest[key]=await cdp.send(method);}catch(e){manifest[key]={available:false,error:e.message};}
 }
 await cdp.detach();save();mkdirSync(path.join(out,'correctness'),{recursive:true});mkdirSync(path.join(out,'runs'),{recursive:true});
 for(const scenario of scenes)for(const route of routes){if(interrupted)throw Error('Interrupted');await correctness(route,scenario,hardwareRenderer);}
 assert.equal(manifest.correctness.length,scenes.length*routes.length);manifest.correctnessPassedAt=new Date().toISOString();save();
 for(let repeat=0;repeat<repeats;repeat++)for(const scenario of scenes)for(const idx of orderSeed.map(i=>(i+repeat)%6)){
  if(interrupted)throw Error('Interrupted');const route=routes[idx],file=`runs/${scenario}-${route.label}-${repeat}.json`;
  const attempt={kind:'timing',route:route.label,scenario,repeat,file,status:'running',startedAt:new Date().toISOString()};manifest.attempts.push(attempt);save();
  let p,partialRowsAvailable=false;
  try{
   p=await preparePage(route,scenario,hardwareRenderer);const before=await state(p.page);assertVisible(before);
   const beforeDiagnostics=await p.page.evaluate(()=>window.__bench.THREE.diagnostics?.()??null);
   const wallStart=Date.now();const result=await p.page.evaluate(config=>window.__bench.run(config),{warmup,samples,profile:false,gpu:false});
   const record={route:route.label,runtime:route.root,engine:route.engine,scenario,repeat,position:orderSeed.map(i=>(i+repeat)%6).indexOf(idx),sourceCommit:manifest.runtime[route.root].commit,toolCommit:manifest.tooling.commit,env:p.env,clock:p.clock,before,after:null,elapsedWallMs:Date.now()-wallStart,errors:p.errors,requestFailures:p.requestFailures,beforeDiagnostics,...result};
   await persistBeforeObservation(record,'after',()=>state(p.page),value=>{
    json(file,value);if(!partialRowsAvailable){partialRowsAvailable=true;manifest.runs.push(file);save();}
   });
   const after=record.after;
   assert.deepEqual(p.errors,[]);assert.deepEqual(p.requestFailures,[]);assertVisible(after);assert.equal(result.rows.length,samples);
   for(const [i,row] of result.rows.entries()){assert.ok(Number.isFinite(row.cpu)&&row.cpu>=0);assert.equal(row.tick,warmup+i);assert.equal(row.gpuStatus,'not-requested');assert.equal(row.gpuMs,null);assert.ok(row.interval===null||(Number.isFinite(row.interval)&&row.interval>0));}
   assert.equal(after.tick,warmup+samples-1);const coverage=executionCoverage(route,result.rows,beforeDiagnostics);
   const work=drawWork(result.info);if(workReferences.has(scenario))assert.deepEqual(work,workReferences.get(scenario),`Timed draw work differs: ${scenario}/${route.label}`);else workReferences.set(scenario,work);
   const cpu=statistics(result.rows.map(r=>r.cpu)),rafInterval=statistics(result.rows.map(r=>r.interval).filter(Number.isFinite));
   const tolerance=Math.max(cpu.p50*.05,4*p.clock.minPositiveDeltaMs),blocks=[];
   for(let i=0;i<samples;i+=120){const rows=result.rows.slice(i,i+120),p50=quantile(rows.map(r=>r.cpu),.5);blocks.push({firstSample:i,lastSample:i+rows.length-1,count:rows.length,fullBlock:rows.length===120,p50,deltaMs:p50-cpu.p50,withinTolerance:Math.abs(p50-cpu.p50)<=tolerance});}
   timed.push({file,scenario,route:route.label,repeat,executionCoverage:coverage,clock:p.clock,cpu,rafInterval,blockToleranceMs:tolerance,blocks,blockScreenPassed:blocks.every(b=>b.withinTolerance),draws:work});
   attempt.status='complete';console.log(JSON.stringify({file,cpuP50:cpu.p50,cpuP95:cpu.p95,blockScreenPassed:blocks.every(b=>b.withinTolerance)}));
  }catch(e){attempt.status='failed';attempt.error=e.stack??String(e);if(p)json(file.replace('.json','-failure.json'),{attempt,errors:p.errors,requestFailures:p.requestFailures,partialRowsAvailable,rawFile:partialRowsAvailable?file:null});throw e;}
  finally{attempt.finishedAt=new Date().toISOString();save();await p?.context.close();}
 }
 json('analysis.json',analyze());manifest.status='complete';
}catch(e){manifest.status='failed';manifest.errors.push(e.stack??String(e));process.exitCode=interrupted?130:1;console.error(e.stack??String(e));}
finally{
 try{
  for(const [name,root] of Object.entries(roots))if(manifest.runtime[name]?.hashes){assert.equal(cleanPin(root,expected[name]).commit,manifest.runtime[name].commit);assert.deepEqual(fileHashes(root,runtimeFiles),manifest.runtime[name].hashes);}
  if(manifest.tooling.commit){assert.equal(cleanPin(toolRoot).commit,manifest.tooling.commit);assert.equal(hash(readFileSync(toolFile)),manifest.tooling.fileSha256);assert.deepEqual(fileHashes(toolRoot,['package-lock.json','scripts/browser-path.mjs','scripts/runner-environment.mjs','bench/config.mjs']),manifest.tooling.hashes);}
  manifest.finalSourceVerification=manifest.tooling.fileSha256&&Object.keys(roots).every(name=>manifest.runtime[name]?.hashes)?'passed':'unavailable-before-complete-source-capture';
 }catch(e){manifest.finalSourceVerification='failed';manifest.status='failed';manifest.errors.push(e.stack??String(e));process.exitCode=1;}
 await browser?.close().catch(e=>manifest.errors.push(e.message));
 try{execFileSync(process.execPath,[path.join(toolRoot,'scripts/runner-environment.mjs'),path.join(out,'environment-after')],{cwd:toolRoot,stdio:'pipe'});}catch(e){manifest.environmentAfter={available:false,error:e.message};}
 for(const child of children){await stopServer(child);json(`server-${child.name}.json`,{stdout:child.stdout,stderr:child.stderr,exitCode:child.child.exitCode,signalCode:child.child.signalCode});}
 manifest.finishedAt=new Date().toISOString();save();process.removeListener('SIGINT',stopRequested);process.removeListener('SIGTERM',stopRequested);
}
