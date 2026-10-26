import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {openViewerRun} from './viewer-browser.mjs';
import {hash} from './viewer-adapter.mjs';
import {createPinnedViewerContent} from './viewer-content.mjs';
import {createViewerNetworkEvidence,viewerPhaseClock} from './viewer-network.mjs';

export const PROBE_PAYLOAD=Object.freeze({file:'ABeautifulGame.bin',bytes:10829440,sha256:'727eea28752b2b0c35cad89e726f0bc6a1800c3fa8696867ccf3d0c39933f5fb'});

export function transportProbeTrials(origin) {
 return ['native-fetch','file-loader','file-loader','native-fetch'].map((method,index)=>({id:`trial-${index+1}-${method}`,method,url:`${origin}/__viewer_content__/beautiful-game/${PROBE_PAYLOAD.file}?transport_probe=${index+1}-${method}`}));
}

// This runs in the page, after the unchanged original r176 app bootstrap. The
// diagnostic invokes a loader; it does not patch one or load/change an app scene.
export async function readTransportProbeBody({method,url,timeoutMs=30000}) {
 const result={method,url,status:'started',timeOrigin:performance.timeOrigin,startNow:performance.now(),cacheEnabled:THREE.Cache.enabled,cachePresentBefore:THREE.Cache.get(url)!==undefined,progress:[]};
 let timer;
 try {
  let operation;
  if(method==='native-fetch')operation=fetch(url).then(async response=>{
   result.response={status:response.status,contentLength:response.headers.get('content-length'),transferEncoding:response.headers.get('transfer-encoding'),contentType:response.headers.get('content-type'),cacheControl:response.headers.get('cache-control')};
   if(!response.ok)throw Error('Native fetch HTTP '+response.status);
   const bytes=await response.arrayBuffer();result.callback={kind:'fetch-arrayBuffer-fulfilled',now:performance.now(),byteLength:bytes.byteLength};return bytes;
  });
  else if(method==='file-loader')operation=new Promise((resolve,reject)=>{
   new THREE.FileLoader().setResponseType('arraybuffer').load(url,bytes=>{result.callback={kind:'FileLoader-onLoad',now:performance.now(),byteLength:bytes?.byteLength??null};resolve(bytes);},event=>result.progress.push({now:performance.now(),loaded:event.loaded,total:event.total,lengthComputable:event.lengthComputable}),error=>{result.callback={kind:'FileLoader-onError',now:performance.now()};reject(error);});
  });
  else throw Error('Unknown transport diagnostic method');
  const data=await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>{result.timedOut=true;reject(Error('Diagnostic loader completion timeout; request was not aborted by the probe'));},timeoutMs);})]);
  clearTimeout(timer);
  if(!(data instanceof ArrayBuffer))throw Error('Loader returned a non-ArrayBuffer value');
  result.byteLength=data.byteLength;result.sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),value=>value.toString(16).padStart(2,'0')).join('');result.digestFinishedNow=performance.now();result.status='fulfilled';
 }catch(error){result.status=result.timedOut?'timed-out':'rejected';result.error={type:error?.constructor?.name??typeof error,message:String(error?.message??error),stack:error?.stack??null};}
 finally{clearTimeout(timer);result.endNow=performance.now();const cached=THREE.Cache.get(url);result.cacheAfter={present:cached!==undefined,type:cached?.constructor?.name??null,bytes:cached?.byteLength??null};}
 return result;
}

export function classifyTransportProbe(trial,expected,events) {
 const requests=events.filter(event=>event.event==='Network.requestWillBeSent'&&event.request.url===trial.url);
 const rows=requests.map(request=>{
  const matching=events.filter(event=>event.requestId===request.requestId&&event.event!=='Network.requestWillBeSent');
  const ends=matching.filter(event=>['Network.loadingFinished','Network.loadingFailed'].includes(event.event));
  const callbackEpochMs=trial.body?.callback?.now===undefined?null:trial.body.timeOrigin+trial.body.callback.now;
  const clockAvailable=Number.isFinite(callbackEpochMs)&&Number.isFinite(request.timestamp)&&Number.isFinite(request.wallTime);
  return {request,events:matching,terminalRelativeToCallback:ends.map(event=>({event:event.event,latencyMs:clockAvailable&&Number.isFinite(event.timestamp)?(event.timestamp-request.timestamp-(callbackEpochMs/1000-request.wallTime))*1000:null,clockMapping:'latencyMs = (terminal.timestamp - request.timestamp) * 1000 - (browser.timeOrigin + callback.now - request.wallTime * 1000). Negative means terminal precedes callback.'}))};
 });
 const terminal=rows.flatMap(row=>row.events.filter(event=>['Network.loadingFinished','Network.loadingFailed'].includes(event.event)));
 const bodyIntegrityMatch=trial.body?.status==='fulfilled'&&trial.body.byteLength===expected.bytes&&trial.body.sha256===expected.sha256;
 const canceled=terminal.filter(event=>event.event==='Network.loadingFailed');
 const oneFinishedRequest=requests.length===1&&terminal.length===1&&terminal[0].event==='Network.loadingFinished';
 return {id:trial.id,method:trial.method,url:trial.url,bodyIntegrityMatch,requestCount:requests.length,terminalCount:terminal.length,canceledEvents:canceled,
  strictTransportPass:bodyIntegrityMatch&&oneFinishedRequest,requests:rows,
  observation:bodyIntegrityMatch&&canceled.length?'Complete caller-visible payload and canceled CDP event both observed. The cancellation is retained; mechanism is not established.':bodyIntegrityMatch&&oneFinishedRequest?'Complete caller-visible payload and finished CDP request observed.':'Payload verification or unique completed request evidence is unavailable or failed; inspect retained rows.'};
}

export async function runViewerTransportProbe(appsArg,preparedArg,contentArg,outArg) {
 const apps=path.resolve(appsArg),prepared=path.resolve(preparedArg),contentRoot=path.resolve(contentArg),out=path.resolve(outArg);await fs.mkdir(out,{recursive:false});
 const summary={schema:1,kind:'one unchanged BIN transport-only diagnostic',status:'running',performanceEvidence:false,applicationCorrectnessVerdict:false,existingFailedGatesUnchanged:true,
  protocol:{route:'original-r176',trials:4,methods:['native-fetch','file-loader','file-loader','native-fetch'],freshQueryURLs:true,timeoutMs:30000,responseBodiesReadViaCDP:false,cachePolicyModified:false,requestFailureGuardModified:false,sceneLoaded:false,verdictScope:'Payload checksums, unique finished payload requests, and helper/Page errors. All CDP non-payload events are separately retained.'},payload:PROBE_PAYLOAD,trials:[],observations:[],limitations:['This diagnostic does not qualify a scene, candidate, CPU performance, or full application compatibility.','A full payload checksum does not by itself explain Chromium cancellation semantics. Raw failures remain failures in existing content gates.','No body data is returned to Node or written as a new asset; only byte length and SHA-256 are retained.']};
 const saveSummary=()=>fs.writeFile(path.join(out,'result.json'),JSON.stringify(summary,null,2)+'\n');
 let run,network;const events={console:[],dialogs:[],requestFailed:[],responseHeaders:[],crashes:[]};
 const toolingRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
 const state=()=>({sha:execFileSync('git',['rev-parse','HEAD'],{cwd:toolingRoot,encoding:'utf8'}).trim(),dirty:Boolean(execFileSync('git',['status','--porcelain','--untracked-files=normal'],{cwd:toolingRoot,encoding:'utf8'}).trim())});
 const redact=value=>String(value).split(apps).join('<apps>').split(prepared).join('<prepared>').split(contentRoot).join('<content>').split(out).join('<output>').split(toolingRoot).join('<tooling>');
 try {
  summary.tooling={...state(),files:[]};assert.equal(summary.tooling.dirty,false,'Transport diagnostic requires clean committed tooling');
  for(const file of ['scripts/apps/viewer-transport-probe.mjs','scripts/apps/viewer-network.mjs','scripts/apps/viewer-content.mjs']){const bytes=await fs.readFile(path.join(toolingRoot,file));summary.tooling.files.push({file,bytes:bytes.length,sha256:hash(bytes)});}
  const content=await createPinnedViewerContent('beautiful-game',contentRoot),payload=content.files.find(row=>row.file===PROBE_PAYLOAD.file);assert(payload);assert.equal(payload.bytes,PROBE_PAYLOAD.bytes);assert.equal(payload.sha256,PROBE_PAYLOAD.sha256);summary.source=content.source;
  // Deliberately mount only this already pinned binary for this transport probe.
  // The native model/scene correctness runner and its full mount remain unchanged.
  run=await openViewerRun(apps,prepared,path.join(out,'original-r176'),{route:'original-r176',captureSources:true,contentRoots:[{...content,files:[payload]}],mode:'One-file transport diagnosis only; no rendered app scene, profiler or timing collector'});
  const page=run.page,publicURL=value=>run.redact(value).split(run.origin).join('<origin>');
  const cdp=await run.context.newCDPSession(page);network=await createViewerNetworkEvidence(cdp,publicURL);
  const phase=name=>network.mark(name,()=>page.evaluate(viewerPhaseClock));
  cdp.on('Network.responseReceived',event=>{if(!event.response.url.startsWith(run.origin+'/__viewer_content__/'))return;const headers=Object.fromEntries(Object.entries(event.response.headers).filter(([key])=>['content-length','transfer-encoding','content-type','cache-control'].includes(key.toLowerCase())));events.responseHeaders.push({requestId:event.requestId,url:publicURL(event.response.url),timestamp:event.timestamp,status:event.response.status,headers});});
  page.on('console',message=>{if(['warning','error'].includes(message.type()))events.console.push({type:message.type(),text:publicURL(message.text())});});
  page.on('dialog',async dialog=>{events.dialogs.push({type:dialog.type(),message:publicURL(dialog.message())});await dialog.dismiss().catch(()=>{});});
  page.on('requestfailed',request=>events.requestFailed.push({url:publicURL(request.url()),error:request.failure()?.errorText??null}));
  page.on('crash',()=>events.crashes.push({event:'page-crash'}));
  await phase('navigation');await page.goto(run.url);await page.bringToFront();await page.waitForFunction(()=>window.VIEWER?.app&&window.THREE?.FileLoader);await page.evaluate(()=>document.fonts.ready);
  summary.nativeState=await page.evaluate(()=>({revision:THREE.REVISION,cacheEnabled:THREE.Cache.enabled,viewerCreated:VIEWER.app.viewer!==null,bootstrapPresent:globalThis.__rthreeViewerBootstrap!==undefined}));assert.equal(summary.nativeState.revision,'176');assert.equal(summary.nativeState.viewerCreated,false);
  await saveSummary();
  for(const trial of transportProbeTrials(run.origin)){
   const row={id:trial.id,method:trial.method,url:publicURL(trial.url),status:'running'};summary.trials.push(row);await phase(trial.id);await saveSummary();
   try{const body=await page.evaluate(readTransportProbeBody,{method:trial.method,url:trial.url,timeoutMs:30000});row.body=JSON.parse(publicURL(JSON.stringify(body)));row.status=body.status;}
   catch(error){row.status='page-evaluation-failed';row.error=publicURL(error.stack??error);}
   // Await only observational terminal delivery, without retrying or aborting IO.
   const deadline=Date.now()+1500;while(Date.now()<deadline){const evidence=classifyTransportProbe(row,PROBE_PAYLOAD,network.snapshot().events);if(evidence.terminalCount>0)break;await new Promise(resolve=>setTimeout(resolve,25));}
   const observation=classifyTransportProbe(row,PROBE_PAYLOAD,network.snapshot().events);summary.observations.push(observation);await run.save(trial.id+'.json',{trial:row,observation});await saveSummary();
   if(row.status==='timed-out'||row.status==='page-evaluation-failed'||events.crashes.length){summary.stoppedAfterIncompleteTrial=true;break;}
  }
  summary.bodyVerificationPass=summary.trials.length===4&&summary.observations.every(row=>row.bodyIntegrityMatch);
  summary.strictTransportPass=summary.trials.length===4&&summary.observations.every(row=>row.strictTransportPass)&&events.requestFailed.length===0&&run.errors.length===0;
  summary.status=summary.stoppedAfterIncompleteTrial?'incomplete':'collected';
 }catch(error){summary.status='failed';summary.error=redact(run?run.redact(error.stack??error):error.stack??error);throw error;}
 finally{
  if(run){if(network){await network.mark('closing',()=>run.page.evaluate(viewerPhaseClock));await run.save('cdp-network-before-close.json',network.snapshot());}await run.save('native-events-before-close.json',events);try{await run.close();}catch(error){summary.status='failed';summary.closeError=redact(run.redact(error.stack??error));}if(network){await run.save('cdp-network-after-close.json',network.snapshot());await network.dispose();}await run.save('native-events-after-close.json',events);summary.helperErrors=run.errors;summary.network=run.requests;}
  try{const after=state();assert.deepEqual(after,{sha:summary.tooling.sha,dirty:false});for(const file of summary.tooling.files)assert.equal(hash(await fs.readFile(path.join(toolingRoot,file.file))),file.sha256);summary.toolingIntegrityUnchanged=true;}catch(error){summary.status='failed';summary.integrityError=redact(error.stack??error);}
  if(summary.helperErrors?.length||events.requestFailed.length||summary.status!=='collected')summary.strictTransportPass=false;await saveSummary();
 }
 return summary;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==6)throw Error('Usage: node scripts/apps/viewer-transport-probe.mjs APPS_ROOT NATIVE_PREPARED_ROOT CHESS_CONTENT_ROOT NEW_OUTPUT');
 const result=await runViewerTransportProbe(...process.argv.slice(2));console.log(JSON.stringify({status:result.status,trials:result.trials.length,bodyVerificationPass:result.bodyVerificationPass,strictTransportPass:result.strictTransportPass,existingFailedGatesUnchanged:true}));if(result.status!=='collected')process.exitCode=1;
}
