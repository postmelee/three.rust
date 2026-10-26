// Correctness-only passive CDP network metadata. Never reads response bodies,
// changes cache policy, intercepts requests, or alters native loader behavior.
export async function createViewerNetworkEvidence(session, redact) {
 const events=[],listeners=[];let phase='setup';
 const responseHeaders=headers=>Object.fromEntries(Object.entries(headers??{}).filter(([name])=>['content-length','transfer-encoding','content-type','cache-control','content-encoding'].includes(name.toLowerCase())).map(([name,value])=>[name.toLowerCase(),String(value)]));
 const clean=value=>typeof value==='string'?redact(value):Array.isArray(value)?value.map(clean):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,clean(item)])):value;
 const observe=(name,select)=>{const listener=event=>events.push(clean({event:name,phaseAtReceipt:phase,...select(event)}));session.on(name,listener);listeners.push([name,listener]);};
 observe('Network.requestWillBeSent',e=>({requestId:e.requestId,loaderId:e.loaderId,frameId:e.frameId,timestamp:e.timestamp,wallTime:e.wallTime,type:e.type,documentURL:e.documentURL,request:{url:e.request.url,method:e.request.method},initiator:e.initiator,redirectResponse:e.redirectResponse?{url:e.redirectResponse.url,status:e.redirectResponse.status}:null}));
 observe('Network.responseReceived',e=>({requestId:e.requestId,loaderId:e.loaderId,frameId:e.frameId,timestamp:e.timestamp,type:e.type,response:{url:e.response.url,status:e.response.status,mimeType:e.response.mimeType,protocol:e.response.protocol,headers:responseHeaders(e.response.headers),fromDiskCache:e.response.fromDiskCache??false,fromServiceWorker:e.response.fromServiceWorker??false,fromPrefetchCache:e.response.fromPrefetchCache??false,encodedDataLength:e.response.encodedDataLength}}));
 observe('Network.loadingFinished',e=>({requestId:e.requestId,timestamp:e.timestamp,encodedDataLength:e.encodedDataLength}));
 observe('Network.loadingFailed',e=>({requestId:e.requestId,timestamp:e.timestamp,type:e.type,errorText:e.errorText,canceled:e.canceled??null,blockedReason:e.blockedReason??null,corsErrorStatus:e.corsErrorStatus??null}));
 await session.send('Network.enable');
 return {
  async mark(name,clock){phase=name;const row={event:'phase',phaseAtReceipt:phase,hostWallTime:new Date().toISOString()};try{row.browserClock=await clock();}catch(error){row.browserClockUnavailable=redact(String(error.message));}events.push(row);},
  snapshot(){return {schema:1,scope:'Passive CDP request IDs, initiators and terminal events; no response bodies or cache overrides. Phase labels identify host receipt context; browser clock markers and CDP timestamps are retained for ordering.',events};},
  async dispose(){for(const [name,listener]of listeners)session.off(name,listener);try{await session.detach();}catch{/* Browser closure already detached this observation session. */}}
 };
}

export function viewerPhaseClock() {
 const v=globalThis.VIEWER?.app?.viewer;
 return {timeOrigin:performance.timeOrigin,now:performance.now(),contentName:v?.content?.name??null,renderFrame:v?.renderer?.info?.render?.frame??null,mixerTime:v?.mixer?.time??null};
}
