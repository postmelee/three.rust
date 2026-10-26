import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {openViewerRun,gpu} from './viewer-browser.mjs';
import {readEditorContentPreparation} from './editor-content.mjs';
import {VIEWER_NETWORK_DIAGNOSTICS} from './viewer-transport-guard.mjs';
import {VIEWER_ROUTES,hash} from './viewer-adapter.mjs';
import {captureViewerSnapshot,compareViewerSnapshots} from './viewer-oracle.mjs';
import {VIEWER_CONTENT_PINS,createPinnedViewerContent,captureViewerContentReadiness,assertViewerContentReadiness,captureViewerNativeCacheChecksums} from './viewer-content.mjs';
import {createViewerNetworkEvidence,viewerPhaseClock} from './viewer-network.mjs';

const nextFrames=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const input=(page,name)=>page.getByText(name,{exact:true}).first().locator('..').locator('input');

export function viewerContentOptions(args) {
 const options={routes:Object.keys(VIEWER_ROUTES),timeoutMs:180000,diagnosticContentLength:false},seen=new Set();
 for(const arg of args){const at=arg.indexOf('='),key=arg.slice(0,at),value=arg.slice(at+1);if(at<1||!value||seen.has(key)||!['content','contentRoot','routes','runtimeRoot','runtimeSha','timeoutMs','diagnosticContentLength','networkDiagnostic','zipPrepared'].includes(key))throw Error('Expected unique content=, contentRoot=, routes=, runtimeRoot=, runtimeSha=, timeoutMs=, diagnosticContentLength=true|false, networkDiagnostic= options');seen.add(key);if(key==='diagnosticContentLength'&&!['true','false'].includes(value))throw Error('diagnosticContentLength must be true or false');options[key]=key==='routes'?value.split(','):key==='timeoutMs'?Number(value):key==='diagnosticContentLength'?value==='true':value;}
 if(!VIEWER_CONTENT_PINS[options.content]||!options.contentRoot||!options.routes.length||new Set(options.routes).size!==options.routes.length||options.routes.some(route=>!VIEWER_ROUTES[route]))throw Error('Invalid content/root/routes');
 if(!Number.isSafeInteger(options.timeoutMs)||options.timeoutMs<30000||options.timeoutMs>600000)throw Error('timeoutMs must be between 30000 and 600000');
 if(options.routes.some(route=>VIEWER_ROUTES[route].revision==='186')&&(!options.runtimeRoot||!/^[a-f0-9]{40}$/.test(options.runtimeSha??'')))throw Error('r186 routes require an exact runtime SHA');
 if (options.zipPrepared && (seen.has('diagnosticContentLength') || seen.has('networkDiagnostic'))) throw Error('Native ZIP input uses the original transport policy, separately from HTTP diagnostics');
 options.contentFramingDiagnostic=seen.has('diagnosticContentLength');
 if (options.networkDiagnostic !== undefined && (!VIEWER_NETWORK_DIAGNOSTICS.includes(options.networkDiagnostic) || options.networkDiagnostic !== 'proxy-cdp-remote' && (options.content !== 'beautiful-game' || options.routes.length !== 1 || options.routes[0] !== 'original-r176'))) throw Error('Only remote-only guarded transport is available for extended content checks');
 if(options.contentFramingDiagnostic&&(options.content!=='beautiful-game'||options.routes.length!==1||options.routes[0]!=='original-r176'))throw Error('Content-Length diagnostic is restricted to the original-r176 A Beautiful Game whole-app load');
 return options;
}

// Native playback evidence only. This observer is never installed during CPU
// timing/profiling; it reads local TRS to distinguish work from a running clock.
async function observeNativeAnimation(page) {
 await page.evaluate(()=>{const v=VIEWER.app.viewer,values=[];v.content.traverse(o=>values.push(...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()));globalThis.__viewerContentMotion={time:v.mixer.time,frame:v.renderer.info.render.frame,values};});
 await page.waitForFunction(()=>{const v=VIEWER.app.viewer;return v.mixer.time>__viewerContentMotion.time+0.1&&v.renderer.info.render.frame>__viewerContentMotion.frame+2;});
 return page.evaluate(()=>{const v=VIEWER.app.viewer,before=__viewerContentMotion,values=[];v.content.traverse(o=>values.push(...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()));const changedValues=values.filter((value,index)=>value!==before.values[index]).length;delete globalThis.__viewerContentMotion;return {beforeTime:before.time,afterTime:v.mixer.time,renderFrameDelta:v.renderer.info.render.frame-before.frame,localTRSValues:values.length,changedValues,actions:v.clips.map(clip=>{const a=v.mixer.existingAction(clip);return {name:clip.name,duration:clip.duration,time:a?.time??null,weight:a?.getEffectiveWeight()??null,running:a?.isRunning()??false};})};});
}

export async function checkViewerContent(appsArg,preparedArg,outArg,options) {
 const apps=path.resolve(appsArg),prepared=path.resolve(preparedArg),out=path.resolve(outArg);await fs.mkdir(out,{recursive:false});
 const framingDiagnostic=options.contentFramingDiagnostic===true||options.diagnosticContentLength===true||options.networkDiagnostic!==undefined;
 const summary={schema:1,kind:'native Viewer original-content correctness gate',status:'running',performanceEvidence:false,transportDiagnostic:{networkMode:options.networkDiagnostic??'playwright',enabled:framingDiagnostic,contentLength:options.diagnosticContentLength===true,scope:'Successful mounted-content responses only; app/asset and strict failure gate unchanged; network diagnostic records any transport guard substitution.',existingFailedGatesUnchanged:true},content:options.content,runtimeSha:options.runtimeSha??null,routes:[],comparisons:[],limitations:['This gate does not establish CPU headroom, hardware throughput, or a stable performance advantage.','Texture readiness means decoded images attached to native scene material slots, plus served resource hash evidence. It does not claim a byte-exact inventory of GPU allocations.','The native validator runs unchanged and its warnings are retained. KTX2 conformance is outside that validator capability.','Fixed-pose mixer.setTime calls are diagnostic adaptations only, separated from native wall-clock playback checks.']};
 const save=(file,value)=>fs.writeFile(path.join(out,file),JSON.stringify(value,null,2)+'\n');
 const redact=value=>String(value).split(apps).join('<apps>').split(prepared).join('<prepared>').split(out).join('<output>').split(path.resolve(options.contentRoot)).join('<content>').split(path.resolve(options.zipPrepared??out)).join('<zip-preparation>');
 const routeData=new Map();let content,zipInput;
 try {
  content=await createPinnedViewerContent(options.content,options.contentRoot);
  if (options.zipPrepared) { zipInput=await readEditorContentPreparation(options.zipPrepared,apps); assert.equal(zipInput.manifest.content,options.content); assert.deepEqual(zipInput.manifest.files,content.files); summary.input={kind:'native-file-input ZIP',preparationManifestSha256:zipInput.manifestSha256,zip:zipInput.manifest.zip,sourceFiles:content.files.length,assetBytesChanged:false}; }
  else summary.input={kind:'native App.view HTTP URL',assetBytesChanged:false};
  const {root,...publicContent}=content;await save('content.json',publicContent);summary.source=content.source;
  const toolingRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),files=['scripts/apps/viewer-content-check.mjs','scripts/apps/viewer-content.mjs','scripts/apps/viewer-oracle.mjs','scripts/apps/viewer-network.mjs','scripts/apps/viewer-transport-guard.mjs','scripts/apps/editor-content.mjs'];
  summary.tooling={sha:execFileSync('git',['rev-parse','HEAD'],{cwd:toolingRoot,encoding:'utf8'}).trim(),dirty:Boolean(execFileSync('git',['status','--porcelain','--untracked-files=normal'],{cwd:toolingRoot,encoding:'utf8'}).trim()),files:[]};
  for(const file of files){const bytes=await fs.readFile(path.join(toolingRoot,file));summary.tooling.files.push({file,bytes:bytes.length,sha256:hash(bytes)});}
  for(const routeName of options.routes){
   const route=VIEWER_ROUTES[routeName],record={route:routeName,status:'running',checks:[]};summary.routes.push(record);await save('result.json',summary);
   let run,network,closing=false;const events={console:[],dialogs:[],responses:[],finished:[],failed:[],contextLoss:[],crashes:[]},captures={};
   try {
    run=await openViewerRun(apps,prepared,path.join(out,routeName),{route:routeName,runtimeRoot:options.runtimeRoot,runtimeSha:options.runtimeSha,captureSources:true,contentRoots:[content],diagnosticContentLength:options.diagnosticContentLength,networkDiagnostic:options.networkDiagnostic,mode:'Native original-content import/feature gate only. No profiler or CPU timing collector.'});
    const page=run.page;page.setDefaultTimeout(options.timeoutMs);
    const publicURL=url=>run.redact(url).split(run.origin).join('<origin>');
    network=await createViewerNetworkEvidence(await run.context.newCDPSession(page),publicURL);
    const phase=name=>network.mark(name,()=>page.evaluate(viewerPhaseClock));
    page.on('console',message=>{if(['warning','error'].includes(message.type()))events.console.push({type:message.type(),text:publicURL(message.text()),location:{...message.location(),url:publicURL(message.location().url)}});});
    page.on('dialog',async dialog=>{events.dialogs.push({type:dialog.type(),message:publicURL(dialog.message())});await dialog.dismiss().catch(()=>{});});
    page.on('crash',()=>events.crashes.push({event:'page-crash'}));
    page.on('response',response=>{if(response.url().startsWith(run.origin+'/__viewer_content__/'))events.responses.push({url:publicURL(response.url()),status:response.status()});});
    page.on('requestfinished',request=>{if(request.url().startsWith(run.origin+'/__viewer_content__/'))events.finished.push(publicURL(request.url()));});
    page.on('requestfailed',request=>events.failed.push({url:publicURL(request.url()),error:request.failure()?.errorText??null}));
    await page.addInitScript(()=>{globalThis.__viewerContentContextEvents=[];document.addEventListener('webglcontextlost',event=>__viewerContentContextEvents.push({type:event.type,at:performance.now(),width:event.target?.width??null,height:event.target?.height??null}),true);});
    await phase('navigation');await page.goto(run.url);await page.bringToFront();await page.waitForFunction(()=>window.VIEWER?.app);await page.evaluate(()=>document.fonts.ready);
    const importOriginal=async()=>zipInput ? page.locator('#file-input').setInputFiles(zipInput.zip) : page.evaluate(url=>VIEWER.app.view(url,'',new Map()),run.origin+'/__viewer_content__/'+content.id+'/'+content.entry);
    await phase('initial-load');
    await importOriginal();
    await page.waitForFunction(()=>Boolean(VIEWER.app.viewer?.content&&VIEWER.json?.parser&&VIEWER.app.validator.report),null,{timeout:options.timeoutMs});
    await phase('initial-ready');
    await nextFrames(page);
    await run.save('validator.json',await page.evaluate(()=>VIEWER.app.validator.report));
    await run.save('gpu-main.json',await gpu(page,'.viewer > canvas'));await run.save('gpu-axes.json',await gpu(page,'.axes canvas'));
    const loaded=await page.evaluate(captureViewerContentReadiness);await run.save('native-loaded.json',loaded);
    record.readiness=assertViewerContentReadiness(content.expected,loaded);assert.equal(loaded.revision,route.revision);
    if(route.externalized){assert.equal(loaded.bootstrap.appStarts,1);assert.equal(loaded.bootstrap.initCalls,route.candidate?1:0);assert.equal(loaded.bootstrap.error,null);}
    if(route.candidate){assert.equal(loaded.diagnostics.backend,route.engine);if(route.engine==='prepared-wasm')assert(loaded.diagnostics.wasmActive&&loaded.diagnostics.wasmCalls>0);}
    record.checks.push((zipInput?'Native file input, SimpleDropzone ZIP, App.load and App.view; ':'Native App.view HTTP URL; ')+'unchanged GLTFLoader/validator, original scene material/texture/clip inventory, both hardware renderer contexts.');
    await page.getByText('Display',{exact:true}).click();await input(page,'grid').check();
    if(content.expected.animations.length){
     await phase('live-autoplay');
     record.autoplay=await observeNativeAnimation(page);assert(record.autoplay.changedValues>0,'Autoplay must change original node TRS');
     await page.getByText('Animation',{exact:true}).click();await phase('live-play-all');await page.getByText('playAll',{exact:true}).click();
     record.playAll=await observeNativeAnimation(page);assert(record.playAll.changedValues>0);assert(record.playAll.actions.every(action=>action.running&&action.weight>0),'Every native authored wind clip must run after GUI playAll');
     await run.save('live-animation.json',{autoplay:record.autoplay,playAll:record.playAll,scope:'Natural wall-clock playback observations, retained separately from the fresh-load fixed-history oracle.'});
     // A new native loader scene/mixer separates the fixed oracle from any
     // property states saved at different phases during natural GUI playAll.
     await phase('reload');
     if(zipInput){
      await page.goto(run.url);await page.bringToFront();await page.waitForFunction(()=>window.VIEWER?.app);await page.evaluate(()=>document.fonts.ready);await importOriginal();
      await page.waitForFunction(()=>VIEWER.app.viewer?.content&&VIEWER.app.validator.report,null,{timeout:options.timeoutMs});
      await page.getByText('Display',{exact:true}).click();await input(page,'grid').check();await page.getByText('Animation',{exact:true}).click();
      record.reloadScope='Fresh native page and native ZIP file input, preserving the original ZIP decoder and App.load path; not an in-place App.view reload test.';
     }else{
      await page.evaluate(url=>{globalThis.__viewerPreviousContentUUID=VIEWER.app.viewer.content.uuid;globalThis.__viewerPreviousReport=VIEWER.app.validator.report;VIEWER.app.view(url,'',new Map());},run.origin+'/__viewer_content__/'+content.id+'/'+content.entry);
      await page.waitForFunction(()=>VIEWER.app.viewer?.content?.uuid!==globalThis.__viewerPreviousContentUUID&&VIEWER.app.viewer?.content&&VIEWER.app.validator.report&&VIEWER.app.validator.report!==globalThis.__viewerPreviousReport,null,{timeout:options.timeoutMs});
     }
     await page.evaluate(()=>{delete globalThis.__viewerPreviousContentUUID;delete globalThis.__viewerPreviousReport;});
     await phase('reloaded-ready');
     await run.save('validator-reloaded.json',await page.evaluate(()=>VIEWER.app.validator.report));
     await input(page,'playbackSpeed').fill('0');await input(page,'playbackSpeed').press('Enter');
     await page.evaluate(()=>{const v=VIEWER.app.viewer;v.mixer.timeScale=1;v.mixer.setTime(0);v.mixer.timeScale=0;});
     for(const name of await page.evaluate(()=>VIEWER.app.viewer.clips.map(clip=>clip.name)))await input(page,name).uncheck();
     await page.getByText('playAll',{exact:true}).click();
     const fresh=await page.evaluate(captureViewerContentReadiness);await run.save('native-reloaded-fixed-history.json',fresh);assertViewerContentReadiness(content.expected,fresh);assert.equal(fresh.mixerTime,0);assert(fresh.clips.every(clip=>clip.running&&clip.time===0));
     record.checks.push('Native first-clip autoplay and GUI playAll progress with actual local TRS changes retained separately. Fixed-pose diagnostic starts with '+(zipInput?'a fresh native page and ZIP file-input reload':'a fresh native App.view reload')+' and validator completion, then GUI speed0, mixer.setTime(0), GUI clip stop, GUI playAll. No binding from the previous live scene is reused.');
    }
    const cases=content.expected.animations.length?[['authored-wind-075',0.75],['authored-wind-150',1.5]]:[['authored-static',null]];
    for(const [name,time]of cases){
     await phase('fixed-'+name);
     if(time!==null)await page.evaluate(time=>{const v=VIEWER.app.viewer;v.mixer.timeScale=1;v.mixer.setTime(time);v.mixer.timeScale=0;},time);
     await nextFrames(page);let reference;
     for(let repeat=0;repeat<2;repeat++){
      const snapshot=await page.evaluate(captureViewerSnapshot);for(const [renderer,image]of Object.entries(snapshot.renderers)){await run.save(`${name}-${repeat}-${renderer}.png`,Buffer.from(image.png.split(',')[1],'base64'));delete image.png;}await run.save(`${name}-${repeat}.json`,snapshot);
      assert.deepEqual(snapshot.identityFailures,[]);assert(snapshot.axesCameraUpIdentity&&snapshot.controlsCameraIdentity);assert(snapshot.renderers.main.colors>16);assert(snapshot.renderers.axes.colors>1);
      if(reference)compareViewerSnapshots(reference,snapshot);else reference=snapshot;
     }
     captures[name]=reference;
    }
    await phase('final-checks');const finalReadiness=await page.evaluate(captureViewerContentReadiness);await run.save('native-final.json',finalReadiness);assertViewerContentReadiness(content.expected,finalReadiness);
    await page.screenshot({path:path.join(run.out,'native-ui.png')});
    if(framingDiagnostic){
     await phase('native-cache-checksum');
     const entries=content.files.filter(file=>file.file.endsWith('.bin')).map(file=>({file:file.file,url:run.origin+'/__viewer_content__/'+content.id+'/'+file.file,expectedBytes:file.bytes,expectedSha256:file.sha256}));
     const checksums=await page.evaluate(captureViewerNativeCacheChecksums,entries);await run.save('native-cache-checksums.json',checksums);record.nativeCacheChecksums=checksums;
     assert(checksums.every(row=>row.status!=='hashed'||row.matchesExpected),'A retained native loader BIN differs from the original pinned bytes');
     const prefix='<origin>/__viewer_content__/'+content.id+'/';
     const responses=network.snapshot().events.filter(row=>row.event==='Network.responseReceived'&&row.response.url.startsWith(prefix)).map(row=>{const file=decodeURIComponent(row.response.url.slice(prefix.length).split('?')[0]),expected=content.files.find(item=>item.file===file),headers=row.response.headers;return {requestId:row.requestId,timestamp:row.timestamp,phaseAtReceipt:row.phaseAtReceipt,file,status:row.response.status,headers,expectedBytes:expected?.bytes??null,matched:Boolean(expected&&row.response.status===200&&(options.diagnosticContentLength?headers['content-length']===String(expected.bytes)&&headers['transfer-encoding']===undefined:headers['content-length']===undefined&&headers['transfer-encoding']==='chunked'))};});
     await run.save('content-response-framing.json',responses);record.transportHeaders={framing:options.diagnosticContentLength?'content-length':'default-chunked',responses:responses.length,uniqueOriginalResources:new Set(responses.map(row=>row.file)).size,allMatched:responses.length>0&&responses.every(row=>row.matched)};
     assert(record.transportHeaders.allMatched,'Actual content response headers must match the selected framing condition');assert.equal(record.transportHeaders.uniqueOriginalResources,content.files.length,'Actual framing must be observed for every original resource');
    }
    events.contextLoss=await page.evaluate(()=>__viewerContentContextEvents);
    assert.deepEqual(events.contextLoss,[]);assert.deepEqual(events.dialogs,[]);assert.deepEqual(events.failed,[]);assert(!events.console.some(row=>row.type==='error'),'Native console errors retained in native-events.json');
    const prefix='<origin>/__viewer_content__/'+content.id+'/';const finished=new Set(events.finished.map(url=>decodeURIComponent(url.slice(prefix.length))));
    if(zipInput){record.requestCoverage={input:'native-file-input ZIP',originalFiles:content.files.length,verifiedZipEntries:zipInput.manifest.verifiedEntries.length,mountedHTTPRequests:events.responses.length,scope:'Every original entry was byte/hash verified in the ZIP before input; native decoded source/material/texture/clip relationships and strict request failures are checked. No HTTP payload coverage is fabricated for File/Blob input.'};assert.equal(events.responses.length,0,'Native ZIP input unexpectedly fetched mounted HTTP content');}
    else { const missing=content.files.filter(file=>!finished.has(file.file)).map(file=>file.file);record.requestCoverage={allowlisted:content.files.length,uniqueFinished:finished.size,missing,scope:'Includes native loader and native validator requests; decoded material associations independently prove renderer-facing image readiness.'};assert.deepEqual(missing,[],'Every referenced resource request must finish'); }
    await run.save('native-events.json',events);closing=true;await phase('closing');await run.save('cdp-network-before-close.json',network.snapshot());await run.close();assert.deepEqual(run.errors,[]);assert(!run.requests.some(row=>row.blocked),'Unmirrored external request');
    record.status='passed';routeData.set(routeName,{captures,materials:finalReadiness.materials,textures:finalReadiness.textures});
   }catch(error){record.status='failed';record.error=redact(run?run.redact(error.stack??error):error.stack??error);if(run){try{events.contextLoss=await run.page.evaluate(()=>globalThis.__viewerContentContextEvents??[]);await run.page.screenshot({path:path.join(run.out,'failure-ui.png')});}catch{}try{await run.save('partial-native-state.json',await run.page.evaluate(captureViewerContentReadiness));}catch{}record.fatalResourceFailure=events.contextLoss.length>0||events.crashes.length>0||(!closing&&!run.browser.isConnected())||/out[_ ]of[_ ]memory|\boom\b|context lost|crash/i.test(record.error+' '+events.console.map(row=>row.text).join(' '));await run.save('native-events.json',events);}}
   finally{if(run){if(network&&!closing){closing=true;await network.mark('closing',()=>run.page.evaluate(viewerPhaseClock));await run.save('cdp-network-before-close.json',network.snapshot());}try{await run.close();}catch(error){record.status='failed';record.closeError=redact(run.redact(error.stack??error));}if(network){await run.save('cdp-network-after-close.json',network.snapshot());await network.dispose();}await run.save('result.json',record);}await save('result.json',summary);}
   if(record.fatalResourceFailure){summary.stoppedAfterFatalResourceFailure=true;break;}
  }
  for(const [reference,actual,requiredEqual,purpose]of [['original-r176','external-r176',true,'packaging parity'],['external-r176','pure-r186',false,'upstream migration'],['pure-r186','prepared-js-r186',true,'candidate JS equivalence'],['pure-r186','prepared-wasm-r186',true,'candidate Wasm equivalence']]){
   if(!routeData.has(reference)||!routeData.has(actual))continue;const a=routeData.get(reference),b=routeData.get(actual);
   for(const name of Object.keys(a.captures)){const comparison=compareViewerSnapshots(a.captures[name],b.captures[name],{strict:false});summary.comparisons.push({reference,actual,case:name,requiredEqual,purpose,...comparison});}
   const equal=JSON.stringify(a.materials)===JSON.stringify(b.materials)&&JSON.stringify(a.textures)===JSON.stringify(b.textures);summary.comparisons.push({reference,actual,case:'native-material-texture-state',requiredEqual,purpose,equal});
  }
  for(const file of summary.tooling.files)assert.equal(hash(await fs.readFile(path.join(toolingRoot,file.file))),file.sha256,'Gate tool changed during run');
  assert.equal(hash(await fs.readFile(path.join(content.root,'fetch-manifest.json'))),content.source.fetchManifestSha256);assert.equal(hash(await fs.readFile(path.join(content.root,content.entry))),content.source.entrySha256);if(zipInput){const after=await readEditorContentPreparation(options.zipPrepared,apps);assert.equal(after.manifestSha256,zipInput.manifestSha256);assert.equal(after.manifest.zip.sha256,zipInput.manifest.zip.sha256);}summary.inputIntegrityUnchanged=true;
  assert(summary.routes.every(row=>row.status==='passed'),'At least one native content route failed; all completed results preserved');assert(summary.comparisons.every(row=>!row.requiredEqual||row.equal),'Content equivalence failed; raw states retained');summary.status='passed';return summary;
 }catch(error){summary.status='failed';summary.error=redact(error.stack??error);throw error;}finally{await save('result.json',summary);}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length<5)throw Error('Usage: node scripts/apps/viewer-content-check.mjs APPS_ROOT PREPARED_ROOT NEW_OUTPUT content=bistro|beautiful-game contentRoot=... [routes=...] [runtimeRoot=...] [runtimeSha=...] [timeoutMs=180000] [diagnosticContentLength=true|false] [networkDiagnostic=proxy-playwright|proxy-cdp-remote] [zipPrepared=...]');
 const result=await checkViewerContent(process.argv[2],process.argv[3],process.argv[4],viewerContentOptions(process.argv.slice(5)));console.log(JSON.stringify({status:result.status,content:result.content,routes:result.routes.length,comparisons:result.comparisons.length,performanceEvidence:false}));
}
