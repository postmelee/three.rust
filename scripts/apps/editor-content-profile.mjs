import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {hash} from './candidate-browser.mjs';
import {readEditorContentPreparation,CONTENT_ROUTES,EDITOR_CONTENT_PIN} from './editor-content.mjs';
import {editorContentRunOptions,openEditorContentRun} from './editor-content-check.mjs';
import {setupEditorContent,editorContentSnapshot,warmEditorContentFrames,validateEditorContentWindow,captureEditorContentReadiness,assertEditorContentReadiness,editorContentOracle,compareEditorContentOracles} from './editor-content-session.mjs';
import {boundedOperation,preserveObservation,preserveProfile} from './candidate-profile-session.mjs';
import {captureProfileScripts} from './candidate-profile-sources.mjs';

export const EDITOR_CONTENT_PROFILE_SETTINGS=Object.freeze({smoke:{repeats:1,warmupFrames:60,seconds:2,samplingIntervalUs:100,prePostObservationSeconds:2},full:{repeats:3,warmupFrames:600,seconds:12,samplingIntervalUs:100,prePostObservationSeconds:2}});
export function validateEditorContentProtocol(value,prepared,options,out) {
 assert.equal(value.schema,1);assert.equal(value.contract,'native-editor-original-content-v1');assert.equal(value.editorSha,EDITOR_CONTENT_PIN);assert.equal(value.candidateSha,options.candidateSha);assert.deepEqual(value.settings,EDITOR_CONTENT_PROFILE_SETTINGS);
 assert.equal(value.import,'native-file-zip-asScene-false-root-selection-focus');assert.equal(value.quality,'native-WebGLRenderer-pageDPR1-rendererDPR1');assert.equal(value.scope,'diagnostic-sampling-only');
 const content=value.contents.find(item=>item.id===prepared.manifest.content);assert(content);assert.equal(content.manifestSha256,prepared.manifestSha256);assert.equal(content.zipSha256,prepared.manifest.zip.sha256);assert.equal(content.playback,prepared.manifest.expected.editorAnimations.length?'native-first-clip':'native-static-idle');
 if(content.playback==='native-first-clip')assert.equal(content.clip,prepared.manifest.expected.editorAnimations[0].name);
 assert.match(value.outputPrefix,/^task[0-9]+-editor-content-profile-[a-z0-9-]+-$/);assert(path.basename(out).startsWith(value.outputPrefix));return value;
}

export async function profileEditorContent(appsArg,preparedArg,outArg,options) {
 const toolRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),apps=await fs.realpath(appsArg),candidate=await fs.realpath(options.candidateRoot),out=path.resolve(outArg);await fs.mkdir(out,{recursive:false});
 const redact=value=>[[apps,'<apps>'],[candidate,'<candidate>'],[toolRoot,'<tooling>'],[path.resolve(preparedArg),'<prepared-content>'],[out,'<output>'],[os.homedir(),'<home>']].reduce((s,[a,b])=>s.split(a).join(b),String(value));
 const save=async(name,value)=>{const file=path.join(out,name);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');};
 const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),state=root=>({sha:git(root,'rev-parse','HEAD'),dirty:Boolean(git(root,'status','--porcelain','--untracked-files=normal'))});
 const config={mode:options.mode,...EDITOR_CONTENT_PROFILE_SETTINGS[options.mode],pageDpr:1,rendererDpr:1,viewport:{width:1280,height:720},isolated:true,timingOverlays:false,boundaryWrappers:false,debuggerDuringSampling:false};
 const manifest={schema:1,status:'preparing',kind:'native-editor-content-diagnostic-profile',qualification:false,candidateSha:options.candidateSha,config,oracles:[],runs:[],errors:[],scope:'Separate diagnostic CPU samples of native selected content. Includes exact selected bounds and timeline for animation. Static idle retains zero renders. No primary CPU quantiles, FPS or GPU-bound claim.',overhead:'Sampling, signal/activity and endpoint observer overhead is uncalibrated. Endpoint counters bracket a wider interval than the exact profile; before/after cadence is not overhead calibration.'};
 const persist=()=>save('manifest.json',manifest);await persist();let prepared,browser,current,failed,interrupted=false;
 const controller=new AbortController();const abort=()=>{interrupted=true;controller.abort();};process.once('SIGINT',abort);process.once('SIGTERM',abort);
 const check=()=>assert(!interrupted,'Interrupted; completed raw evidence is retained');
 const endpoint=page=>boundedOperation(page.evaluate(editorContentSnapshot),{signal:controller.signal,label:'Editor content endpoint'});
 async function delay(ms){let timer;try{await boundedOperation(new Promise(resolve=>{timer=setTimeout(resolve,ms);}),{timeoutMs:ms+5000,signal:controller.signal,label:'Editor content profile wait'});}finally{clearTimeout(timer);}}
 async function environment(stage){const directory=path.join(out,'environment-'+stage);execFileSync(process.execPath,[path.join(toolRoot,'scripts/runner-environment.mjs'),directory],{cwd:toolRoot,stdio:'pipe',timeout:60000});const file=path.join(directory,'runner.json'),data=JSON.parse(redact(await fs.readFile(file,'utf8')));await fs.writeFile(file,JSON.stringify(data,null,2)+'\n');assert.equal(data.power?.available,true);assert(data.power.output.includes('AC Power'));return {file:'environment-'+stage+'/runner.json',verifiedAC:true};}
 async function open(engine,directory,observer){check();await fs.mkdir(path.dirname(path.join(out,directory)),{recursive:true});const run=await openEditorContentRun(apps,prepared,path.join(out,directory),engine,{...options,candidateRoot:candidate,browser});current=run;await setupEditorContent(run,prepared,{play:manifest.play,observer});const raw=await run.page.evaluate(captureEditorContentReadiness,prepared.manifest.expected);await run.save('source-readiness.json',raw);assertEditorContentReadiness(prepared.manifest.expected,raw);await run.verify();return run;}
 async function close(run){let error;try{await run.verify();}catch(e){error=e;}try{await run.close();}catch(e){error??=e;}try{await run.verify();assert.deepEqual(run.errors,[]);}catch(e){error??=e;}finally{if(current===run)current=null;}if(error)throw error;}
 async function observation(run,name){const raw={before:await endpoint(run.page),after:null};await run.save(name,raw);await delay(config.prePostObservationSeconds*1000);raw.after=await endpoint(run.page);return preserveObservation(raw,value=>run.save(name,value),value=>validateEditorContentWindow(value.before,value.after,{play:manifest.play},run.engine));}
 try{
  manifest.sourceBefore={tooling:state(toolRoot),candidate:state(candidate)};assert.match(manifest.sourceBefore.tooling.sha,/^[a-f0-9]{40}$/);assert.equal(manifest.sourceBefore.tooling.dirty,false,'Commit/freeze content profiling tools before capture');assert.equal(manifest.sourceBefore.candidate.sha,options.candidateSha);assert.equal(manifest.sourceBefore.candidate.dirty,false);
  const files=(await fs.readdir(path.join(toolRoot,'scripts/apps'))).filter(name=>name.startsWith('editor-content')&&name.endsWith('.mjs')).map(name=>'scripts/apps/'+name).concat(['scripts/apps/candidate-browser.mjs','scripts/apps/candidate-profile-session.mjs','scripts/apps/candidate-profile-sources.mjs','scripts/runner-environment.mjs','package-lock.json']);
  manifest.toolHashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,hash(await fs.readFile(path.join(toolRoot,file)))])));
  prepared=await readEditorContentPreparation(preparedArg,apps);manifest.content={manifestSha256:prepared.manifestSha256,source:prepared.manifest.source,zip:prepared.manifest.zip};manifest.play=prepared.manifest.expected.editorAnimations.length>0;
  if(options.protocol){const file=await fs.realpath(path.resolve(toolRoot,options.protocol)),relative=path.relative(toolRoot,file).split(path.sep).join('/');assert(/^mydocs\/plans\/task_m[0-9a-z]+_[0-9]+_editor_content_protocol(?:_[a-z0-9-]+)?\.json$/.test(relative));const bytes=await fs.readFile(file);assert(bytes.equals(execFileSync('git',['show','HEAD:'+relative],{cwd:toolRoot})));const protocol=validateEditorContentProtocol(JSON.parse(bytes),prepared,options,out);manifest.protocol={file:relative,sha256:hash(bytes),value:protocol};}
  else assert.equal(options.mode,'smoke','Full content profiling requires its separately committed protocol');
  assert.deepEqual(options.routes,CONTENT_ROUTES,'Diagnostic profile uses original/JS/Wasm in the declared order');
  manifest.environmentBefore=await environment('before');await persist();const executablePath=process.env.RTHREE_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';browser=await chromium.launch({executablePath,headless:false});manifest.browser={version:browser.version(),executablePath:redact(executablePath)};
  const browserCDP=await browser.newBrowserCDPSession();try{for(const [key,method]of [['version','Browser.getVersion'],['commandLine','Browser.getBrowserCommandLine'],['systemInfo','SystemInfo.getInfo']])try{manifest.browser[key]=JSON.parse(redact(JSON.stringify(await browserCDP.send(method))).replace(/--(user-data-dir|crash-dumps-dir|disk-cache-dir)=[^"\\\s]+/g,'--$1=<browser-private-directory>'));}catch(error){manifest.browser[key]={unavailable:true,error:redact(error.message)};}}finally{await browserCDP.detach();}
  let original;
  for(const engine of CONTENT_ROUTES){let native;for(const observer of [false,true]){const directory=`oracles/${engine}-${observer?'observer':'native'}`,row={engine,observer,directory,status:'preparing'};manifest.oracles.push(row);await persist();let run;try{run=await open(engine,directory,observer);const captures=[];for(const pose of manifest.play?[0.25,0.75]:[0])captures.push(await editorContentOracle(run,pose,`pose-${String(pose).replace('.','p')}`));if(!original)original=captures;row.originalComparisons=captures.map((capture,i)=>compareEditorContentOracles(original[i],capture));if(observer)row.observerComparisons=captures.map((capture,i)=>compareEditorContentOracles(native[i],capture));else native=captures;await close(run);row.status='passed';}catch(error){row.status='failed';row.error=redact(error.stack??error);if(current)await current.preserveFailure();throw error;}finally{try{if(current)await close(current);}catch(error){row.status='failed';row.cleanupError=redact(error.message);throw error;}finally{await persist();}}}}
  manifest.orders=Array.from({length:config.repeats},(_,round)=>CONTENT_ROUTES.map((_,i)=>CONTENT_ROUTES[(i+round)%CONTENT_ROUTES.length]));manifest.status='profiling';await persist();
  for(const [round,order]of manifest.orders.entries())for(const engine of order){
   const directory=`runs/${round}-${engine}`,row={engine,round,directory,status:'preparing'};manifest.runs.push(row);await persist();let run,cdp,profiling=false;
   try{
    run=await open(engine,directory,true);await run.save('profile-manifest.json',{engine,origin:run.origin,candidateSha:options.candidateSha,toolSha:manifest.sourceBefore.tooling.sha,content:manifest.content,config});
    await run.save('warmup.json',{before:await endpoint(run.page),after:null,status:'pending',requestedFrames:config.warmupFrames});
    const warm=await boundedOperation(run.page.evaluate(warmEditorContentFrames,config.warmupFrames),{timeoutMs:60000,signal:controller.signal,label:'Editor content native warmup'});await preserveObservation(warm,value=>run.save('warmup.json',value),value=>validateEditorContentWindow(value.before,value.after,{play:manifest.play},engine));assert.equal(warm.frames,config.warmupFrames);if(manifest.play)assert(warm.after.render.frame-warm.before.render.frame>=config.warmupFrames);
    await observation(run,'before-window.json');await run.verify();cdp=await run.context.newCDPSession(run.page);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:config.samplingIntervalUs});const before=await endpoint(run.page);await run.save('profile-observations.json',{before,after:null});
    const wallStart=Date.now();await cdp.send('Profiler.start');profiling=true;row.status='sampling';await delay(config.seconds*1000);const {profile}=await cdp.send('Profiler.stop');profiling=false;
    const evidence=await preserveProfile(profile,value=>run.save('profile.cpuprofile',value),()=>endpoint(run.page));row.rawProfile='profile.cpuprofile';
    await preserveObservation({before,after:evidence.after,profileDurationMs:(profile.endTime-profile.startTime)/1000,wallElapsedIncludingCDPms:Date.now()-wallStart},value=>run.save('profile-observations.json',value),value=>validateEditorContentWindow(value.before,value.after,{play:manifest.play},engine));
    await cdp.send('Profiler.disable');await observation(run,'after-window.json');await captureProfileScripts(cdp,profile,run.out,run.origin);await cdp.detach();cdp=null;await close(run);row.status='captured';
   }catch(error){row.status='failed';row.error=redact(error.stack??error);if(current)await current.preserveFailure();throw error;}
   finally{if(cdp){if(profiling)try{const {profile}=await cdp.send('Profiler.stop');await run.save('partial-profile.cpuprofile',profile);row.partialProfile='partial-profile.cpuprofile';}catch(error){row.partialProfileUnavailable=redact(error.message);}await cdp.send('Profiler.disable').catch(()=>{});await cdp.detach().catch(()=>{});}try{if(current)await close(current);}catch(error){row.status='failed';row.cleanupError=redact(error.message);throw error;}finally{await persist();}}
  }
  assert(manifest.runs.every(row=>row.status==='captured'));manifest.status='capture-complete-attribution-pending';
 }catch(error){failed=error;manifest.status='failed';manifest.errors.push(redact(error.stack??error));}
 finally{
  for(const cleanup of [()=>current?.close(),()=>browser?.close()])try{await cleanup();}catch(error){failed??=error;manifest.status='failed';manifest.errors.push(redact(error.message));}
  try{manifest.sourceAfter={tooling:state(toolRoot),candidate:state(candidate)};assert.deepEqual(manifest.sourceAfter,manifest.sourceBefore);for(const [file,expected]of Object.entries(manifest.toolHashes??{}))assert.equal(hash(await fs.readFile(path.join(toolRoot,file))),expected);if(prepared){const after=await readEditorContentPreparation(prepared.root,apps);assert.equal(after.manifestSha256,prepared.manifestSha256);assert.equal(after.manifest.zip.sha256,prepared.manifest.zip.sha256);}manifest.sourceIntegrity='passed';manifest.environmentAfter=await environment('after');}catch(error){failed??=error;manifest.sourceIntegrity='failed';manifest.status='failed';manifest.errors.push(redact(error.message));}
  manifest.finishedAt=new Date().toISOString();await persist();process.removeListener('SIGINT',abort);process.removeListener('SIGTERM',abort);
 }
 if(failed)throw failed;return manifest;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert(process.argv.length>=7,'Usage: node scripts/apps/editor-content-profile.mjs APPS_ROOT PREPARED_ZIP_ROOT NEW_OUTPUT candidateRoot=... candidateSha=... mode=smoke|full [protocol=...]');const result=await profileEditorContent(...process.argv.slice(2,5),editorContentRunOptions(process.argv.slice(5),{profile:true}));console.log(JSON.stringify({status:result.status,profiles:result.runs.length,qualification:false}));
}
