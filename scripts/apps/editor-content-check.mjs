import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {boundedOperation} from './candidate-profile-session.mjs';
import {openRun,hash} from './candidate-browser.mjs';
import {readEditorContentPreparation,CONTENT_ROUTES} from './editor-content.mjs';
import {setupEditorContent,captureEditorContentReadiness,assertEditorContentReadiness,editorContentOracle,compareEditorContentOracles,editorContentSnapshot,validateEditorContentWindow,warmEditorContentFrames,editorFocusDiagnosticCheckpoint} from './editor-content-session.mjs';

export function editorContentRunOptions(args,{profile=false}={}) {
 const options={routes:CONTENT_ROUTES,mode:'smoke'};
 for(const arg of args){const at=arg.indexOf('='),key=arg.slice(0,at),value=arg.slice(at+1);assert(at>0&&value&&['candidateRoot','candidateSha','routes',...(profile?['mode','protocol']:['focusDiagnostic'])].includes(key)&&!Object.hasOwn(options,'provided-'+key),'Unknown/duplicate option');options['provided-'+key]=true;if(key==='focusDiagnostic'){assert.equal(value,'true','Only an explicit focusDiagnostic=true opts into setup diagnosis');options[key]=true;}else options[key]=key==='routes'?value.split(','):value;}
 assert(options.candidateRoot&&/^[0-9a-f]{40}$/.test(options.candidateSha??''));assert(options.routes.length&&new Set(options.routes).size===options.routes.length&&options.routes.every(route=>CONTENT_ROUTES.includes(route)));assert(['smoke','full'].includes(options.mode));return options;
}

export function assertEditorContentEvents(events) {assert.deepEqual(events.requestFailed,[]);assert.deepEqual(events.dialogs,[]);assert.deepEqual(events.crashes,[]);assert(!events.console.some(row=>row.type==='error'));}

export async function preserveEditorContentFailure(run,events,{focusDiagnostic=false}={}) {
 const outcomes=[],attempts=[['native-events.json',()=>run.save('native-events.json',events)],...(focusDiagnostic?[['focus-diagnostic-failure.json',()=>editorFocusDiagnosticCheckpoint({...run,editorFocusDiagnostic:true},'failure')]]:[]),['partial-state.json',async()=>run.save('partial-state.json',await run.page.evaluate(editorContentSnapshot))],['failure-ui.png',()=>run.page.screenshot({path:path.join(run.out,'failure-ui.png')})]];
 for(const [artifact,capture]of attempts)try{await capture();outcomes.push({artifact,status:'saved'});}catch(error){outcomes.push({artifact,status:'unavailable',errorName:error.name??'Error'});}
 // Preserve all feasible evidence independently; a missing pre-import state
 // must not suppress the input tail, screenshot or the caller's final cleanup.
 try{await run.save('failure-capture-status.json',outcomes);}catch{}return outcomes;
}

export async function openEditorContentRun(apps,prepared,out,engine,options) {
 const run=await openRun(apps,out,{app:'editor',engine,candidateRoot:options.candidateRoot,candidateSha:options.candidateSha,browser:options.browser,isolated:true,deviceScaleFactor:1,captureSources:true,sourceOverlays:[],mode:'Native original-content ZIP compatibility or separate diagnostic CPU sampling; no primary timing'});
 const events={console:[],requestFailed:[],dialogs:[],crashes:[],responses:[]};let phase='active',closePromise;
 const clean=value=>run.redact?run.redact(value):String(value).split(run.origin).join('<origin>');
 run.page.on('console',message=>{if(['error','warning'].includes(message.type()))events.console.push({phaseAtReceipt:phase,type:message.type(),text:clean(message.text())});});
 run.page.on('requestfailed',request=>events.requestFailed.push({phaseAtReceipt:phase,url:clean(request.url()).split(run.origin).join('<origin>'),error:request.failure()?.errorText??null}));
 run.page.on('dialog',async dialog=>{events.dialogs.push({phaseAtReceipt:phase,type:dialog.type(),message:clean(dialog.message())});await dialog.dismiss();});
 run.page.on('crash',()=>events.crashes.push({phaseAtReceipt:phase,event:'page-crash'}));
 run.page.on('response',response=>events.responses.push({phaseAtReceipt:phase,url:clean(response.url()).split(run.origin).join('<origin>'),status:response.status()}));
 return {...run,events,async close(){if(closePromise)return closePromise;closePromise=(async()=>{let failure;try{await run.save('native-events-before-close.json',{scope:'Events received before teardown begins; phase labels are receipt context, not a causal attribution.',events});}catch(error){failure=error;}phase='closing';try{await run.close();}catch(error){failure??=error;}finally{try{await run.save('native-events-after-close.json',{scope:'All events through context/browser closure; teardown observations remain strict failures and are not filtered.',events});}catch(error){failure??=error;}}if(failure)throw failure;})();return closePromise;},async verify(){await run.save('native-events.json',events);assertEditorContentEvents(events);assert.deepEqual(run.errors,[]);assert(!run.requests.some(row=>row.blocked));},async preserveFailure(){return preserveEditorContentFailure(run,events,{focusDiagnostic:options.focusDiagnostic===true});}};
}

export async function checkEditorContent(appsArg,preparedArg,outArg,options) {
 const apps=path.resolve(appsArg),out=path.resolve(outArg);await fs.mkdir(out,{recursive:false});
 const result={schema:1,kind:'native Editor unchanged-content ZIP correctness gate',status:'preparing',performanceEvidence:false,focusDiagnostic:options.focusDiagnostic===true,diagnosticScope:options.focusDiagnostic?'Additional setup snapshots and input/signal observations; public matrix reads may materialize values. Strict oracle criteria remain unchanged.':null,routes:[],comparisons:[]};const save=()=>fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
 const toolRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),files=['scripts/apps/editor-content.mjs','scripts/apps/editor-content-session.mjs','scripts/apps/editor-content-check.mjs','scripts/apps/candidate-browser.mjs'];
 await save();
 const source={dirty:Boolean(execFileSync('git',['status','--porcelain','--untracked-files=normal'],{cwd:toolRoot,encoding:'utf8'}).trim()),sha:execFileSync('git',['rev-parse','HEAD'],{cwd:toolRoot,encoding:'utf8'}).trim(),files:Object.fromEntries(await Promise.all(files.map(async file=>[file,hash(await fs.readFile(path.join(toolRoot,file)))])))};result.tooling=source;
 let prepared,baseline,failure;
 try{
  assert.match(source.sha,/^[a-f0-9]{40}$/);assert.equal(source.dirty,false,'Commit/freeze content gate tooling before browser capture');
  prepared=await readEditorContentPreparation(preparedArg,apps);result.content={manifestSha256:prepared.manifestSha256,source:prepared.manifest.source,zip:prepared.manifest.zip};const play=prepared.manifest.expected.editorAnimations.length>0;
  for(const engine of options.routes){
   const row={engine,status:'preparing'};result.routes.push(row);await save();let run;
   try{
    run=await openEditorContentRun(apps,prepared,path.join(out,engine),engine,options);await setupEditorContent(run,prepared,{play,focusDiagnostic:options.focusDiagnostic===true});
    const readiness=await run.page.evaluate(captureEditorContentReadiness,prepared.manifest.expected);await run.save('source-readiness.json',readiness);row.sourceContract=assertEditorContentReadiness(prepared.manifest.expected,readiness);await run.verify();
    await run.save('native-observation.json',{before:await run.page.evaluate(editorContentSnapshot),after:null,status:'pending'});
    const observation=await boundedOperation(run.page.evaluate(warmEditorContentFrames,60),{timeoutMs:60000,label:'Native Editor content observation'});await run.save('native-observation.json',observation);row.nativeWork=validateEditorContentWindow(observation.before,observation.after,{play},engine);
    const poses=play?[0.25,0.75]:[0],captures=[];
    for(const pose of poses){const first=await editorContentOracle(run,pose,`pose-${String(pose).replace('.','p')}-repeat-0`),second=await editorContentOracle(run,pose,`pose-${String(pose).replace('.','p')}-repeat-1`);row.withinRoute??=[];row.withinRoute.push(compareEditorContentOracles(first,second));captures.push(first);}
    if(engine==='original')baseline=captures;else{assert(baseline,'Capture original first for candidate equivalence');row.originalComparisons=captures.map((capture,i)=>compareEditorContentOracles(baseline[i],capture));}
    await run.page.screenshot({path:path.join(out,engine,'native-ui.png')});await run.verify();await run.close();await run.verify();assert.deepEqual(run.errors,[]);row.status='passed';
   }catch(error){row.status='failed';row.error=String(error.stack??error).split(apps).join('<apps>').split(path.resolve(options.candidateRoot)).join('<candidate>').split(out).join('<output>');if(run)await run.preserveFailure();throw error;}finally{if(run){try{await run.close();}catch(error){row.status='failed';row.closeError=String(error.message);}finally{await run.save('result.json',row);}}await save();}
  }
  assert(result.routes.every(row=>row.status==='passed'),'A native route or its cleanup failed');
  for(const [file,expected]of Object.entries(source.files))assert.equal(hash(await fs.readFile(path.join(toolRoot,file))),expected);assert.equal(hash(await fs.readFile(path.join(prepared.root,'manifest.json'))),prepared.manifestSha256);result.integrityUnchanged=true;result.status='passed';
 }catch(error){failure=error;result.status='failed';result.error=String(error.message);}finally{try{result.toolingAfter={dirty:Boolean(execFileSync('git',['status','--porcelain','--untracked-files=normal'],{cwd:toolRoot,encoding:'utf8'}).trim()),sha:execFileSync('git',['rev-parse','HEAD'],{cwd:toolRoot,encoding:'utf8'}).trim(),files:Object.fromEntries(await Promise.all(files.map(async file=>[file,hash(await fs.readFile(path.join(toolRoot,file)))])))};result.toolingUnchanged=JSON.stringify(result.toolingAfter)===JSON.stringify(source);if(prepared){const after=await readEditorContentPreparation(prepared.root,apps);result.preparationUnchanged=after.manifestSha256===prepared.manifestSha256&&after.manifest.zip.sha256===prepared.manifest.zip.sha256;assert(result.preparationUnchanged,'Prepared ZIP changed during capture');}result.integrityUnchanged=result.toolingUnchanged&&(result.preparationUnchanged??true);if(!result.toolingUnchanged)result.status='failed';}catch(error){result.status='failed';result.integrityUnchanged=false;result.integrityError=String(error.message);}await save();}
 if(failure)throw failure;assert.equal(result.status,'passed','Content gate integrity/cleanup failed');return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert(process.argv.length>=7,'Usage: node scripts/apps/editor-content-check.mjs APPS_ROOT PREPARED_ZIP_ROOT NEW_OUTPUT candidateRoot=... candidateSha=... [routes=original,prepared-js,prepared-wasm] [focusDiagnostic=true]');
 const result=await checkEditorContent(...process.argv.slice(2,5),editorContentRunOptions(process.argv.slice(5)));console.log(JSON.stringify({status:result.status,routes:result.routes.length,performanceEvidence:false}));
}
