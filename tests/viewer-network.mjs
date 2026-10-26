import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createViewerNetworkEvidence} from '../scripts/apps/viewer-network.mjs';

test('passive network evidence keeps duplicate URL requests distinct and canceled failure intact',async()=>{
 const session=new EventEmitter(),commands=[];session.send=async name=>commands.push(name);session.detach=async()=>{};
 const recorder=await createViewerNetworkEvidence(session,value=>value.replaceAll('http://127.0.0.1:4321','<origin>'));
 await recorder.mark('initial-load',async()=>({timeOrigin:1000,now:10}));
 for(const requestId of ['loader-1','validator-2'])session.emit('Network.requestWillBeSent',{requestId,frameId:'frame',loaderId:'document',timestamp:1,wallTime:1000,type:'Fetch',documentURL:'http://127.0.0.1:4321/viewer/',request:{url:'http://127.0.0.1:4321/model.bin',method:'GET'},initiator:{type:'script',stack:{callFrames:[{functionName:requestId,url:'http://127.0.0.1:4321/loader.js'}]}}});
 session.emit('Network.loadingFailed',{requestId:'loader-1',timestamp:2,type:'Fetch',errorText:'net::ERR_ABORTED',canceled:true});
 await recorder.mark('fixed',async()=>({timeOrigin:1000,now:30}));
 session.emit('Network.loadingFinished',{requestId:'validator-2',timestamp:3,encodedDataLength:100});
 const result=recorder.snapshot();assert.deepEqual(commands,['Network.enable']);assert.equal(result.events.filter(row=>row.event==='Network.requestWillBeSent').length,2);assert.equal(result.events.find(row=>row.event==='Network.loadingFailed').canceled,true);assert.equal(result.events.find(row=>row.event==='Network.loadingFinished').phaseAtReceipt,'fixed');assert(!JSON.stringify(result).includes('127.0.0.1'));assert(JSON.stringify(result).includes('loader-1'));assert(JSON.stringify(result).includes('validator-2'));
 await recorder.dispose();assert.equal(session.listenerCount('Network.loadingFailed'),0);
});

test('missing page clock is explicit and does not discard already captured failures',async()=>{
 const session=new EventEmitter();session.send=async()=>{};session.detach=async()=>{throw Error('already closed');};
 const recorder=await createViewerNetworkEvidence(session,x=>x);session.emit('Network.loadingFailed',{requestId:'one',timestamp:1,type:'Fetch',errorText:'closed',canceled:true});await recorder.mark('closing',async()=>{throw Error('Page closed');});
 assert.equal(recorder.snapshot().events[0].requestId,'one');assert.equal(recorder.snapshot().events[1].browserClockUnavailable,'Page closed');await recorder.dispose();
});
