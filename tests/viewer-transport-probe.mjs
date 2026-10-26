import test from 'node:test';
import assert from 'node:assert/strict';
import {transportProbeTrials,classifyTransportProbe,PROBE_PAYLOAD} from '../scripts/apps/viewer-transport-probe.mjs';

const trial=()=>({id:'one',method:'file-loader',url:'<origin>/payload.bin?trial=one',body:{status:'fulfilled',byteLength:PROBE_PAYLOAD.bytes,sha256:PROBE_PAYLOAD.sha256}});
const request=id=>({event:'Network.requestWillBeSent',requestId:id,request:{url:'<origin>/payload.bin?trial=one'}});

test('fresh query URLs isolate all four bounded calls without changing the payload path',()=>{
 const rows=transportProbeTrials('http://127.0.0.1:1234');assert.deepEqual(rows.map(row=>row.method),['native-fetch','file-loader','file-loader','native-fetch']);assert.equal(new Set(rows.map(row=>row.url)).size,4);assert(rows.every(row=>new URL(row.url).pathname.endsWith('/'+PROBE_PAYLOAD.file)));
});

test('complete verified body with canceled CDP event stays a strict transport failure',()=>{
 const value=classifyTransportProbe(trial(),PROBE_PAYLOAD,[request('id1'),{event:'Network.loadingFailed',requestId:'id1',errorText:'net::ERR_ABORTED',canceled:true}]);assert.equal(value.bodyIntegrityMatch,true);assert.equal(value.strictTransportPass,false);assert.equal(value.canceledEvents.length,1);assert.equal(value.canceledEvents[0].canceled,true);
});

test('wrong length/hash or rejected caller cannot be excused by a finished request',()=>{
 const events=[request('id1'),{event:'Network.loadingFinished',requestId:'id1'}];assert.equal(classifyTransportProbe(trial(),PROBE_PAYLOAD,events).strictTransportPass,true);
 for(const change of [row=>row.body.byteLength--,row=>row.body.sha256='0'.repeat(64),row=>row.body.status='rejected']){const row=trial();change(row);const value=classifyTransportProbe(row,PROBE_PAYLOAD,events);assert.equal(value.bodyIntegrityMatch,false);assert.equal(value.strictTransportPass,false);}
});

test('missing, duplicate and unrelated-query request evidence is never collapsed to success',()=>{
 const row=trial();for(const events of [[],[request('id1')],[request('id1'),request('id2'),{event:'Network.loadingFinished',requestId:'id1'},{event:'Network.loadingFinished',requestId:'id2'}],[{...request('other'),request:{url:'<origin>/payload.bin?trial=other'}},{event:'Network.loadingFinished',requestId:'other'}]])assert.equal(classifyTransportProbe(row,PROBE_PAYLOAD,events).strictTransportPass,false);
});

test('terminal latency keeps callback ordering and unavailable clocks explicit',()=>{
 const row=trial();row.body.timeOrigin=1000000;row.body.callback={now:250};const events=[{...request('id1'),timestamp:100,wallTime:1000},{event:'Network.loadingFailed',requestId:'id1',timestamp:100.2,canceled:true}];const value=classifyTransportProbe(row,PROBE_PAYLOAD,events);assert(Math.abs(value.requests[0].terminalRelativeToCallback[0].latencyMs+50)<1e-8);
 delete events[0].wallTime;assert.equal(classifyTransportProbe(row,PROBE_PAYLOAD,events).requests[0].terminalRelativeToCallback[0].latencyMs,null);
});
