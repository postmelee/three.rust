import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {editorContentExpectations} from '../scripts/apps/editor-content.mjs';
import {validateEditorContentProtocol,EDITOR_CONTENT_PROFILE_SETTINGS} from '../scripts/apps/editor-content-profile.mjs';
import {editorContentRunOptions,assertEditorContentEvents} from '../scripts/apps/editor-content-check.mjs';
import {editorContentOracle,assertEditorContentReadiness,validateEditorContentWindow,compareEditorContentOracles} from '../scripts/apps/editor-content-session.mjs';


const source=()=>({scene:0,scenes:[{name:'SourceScene',nodes:[0]}],nodes:[{name:'Root',children:[1]},{name:'Mesh',mesh:0}],meshes:[{primitives:[{material:0,attributes:{POSITION:0},indices:1}]}],accessors:[{count:3,type:'VEC3'},{count:3,type:'SCALAR'}],buffers:[{uri:'model.bin'}],images:[{uri:'Textures/a.jpg'}],textures:[{source:0,name:'authored-texture'}],materials:[{name:'Glass',pbrMetallicRoughness:{baseColorTexture:{index:0}},extensions:{KHR_materials_transmission:{transmissionFactor:0.8},KHR_materials_volume:{thicknessFactor:0.5,attenuationDistance:2,attenuationColor:[0.5,0.6,0.7]}}}],animations:[]});
function actual(e){return {contextLost:false,selectedRoot:true,meshInstances:e.primitiveInstances,nodes:e.nodeRecords.map(n=>({name:n.name,parentName:n.parentName,childNames:n.childNames,translation:n.translation,rotation:n.rotation,scale:n.scale,matrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],primitives:n.primitives.map(p=>({materialName:'Glass',indexCount:p.indexCount,attributes:p.attributes}))})),materials:e.materials.map(m=>({...m,textureSlots:m.textureSlots.map(t=>({...t,textureName:'authored-texture'}))})),textures:[{imageIndex:0,ready:true}],clips:[]};}
test('Editor source contract supports authored texture names and rejects ambiguous identity or missing features',()=>{
 const e=editorContentExpectations(source(),'model.gltf'),a=actual(e);assert.equal(e.textureNames['authored-texture'],0);assert.equal(assertEditorContentReadiness(e,a).nodes,2);
 for(const mutate of [x=>x.meshInstances++,x=>x.nodes.pop(),x=>x.nodes[1].parentName=null,x=>x.nodes[1].translation[0]=3,x=>x.nodes[1].primitives[0].materialName='Other',x=>x.nodes[1].primitives[0].attributes.position.count=4,x=>x.materials[0].textureSlots=[],x=>x.materials[0].textureSlots[0].texCoord=1,x=>x.materials[0].transmission=0,x=>x.materials[0].attenuationColor=[1,1,1],x=>x.textures[0].ready=false,x=>x.textures[0].imageIndex=1]){const bad=structuredClone(a);mutate(bad);assert.throws(()=>assertEditorContentReadiness(e,bad));}
 const cloned=structuredClone(a);cloned.materials.push(structuredClone(cloned.materials[0]));assert.equal(assertEditorContentReadiness(e,cloned).materialInstances,2);cloned.materials[1].transmission=0;assert.throws(()=>assertEditorContentReadiness(e,cloned));
 const ambiguous=source();ambiguous.images.push({uri:'different.jpg'});ambiguous.textures.push({name:'authored-texture',source:1});assert.throws(()=>editorContentExpectations(ambiguous,'model.gltf'),/ambiguously/);
});
const idle=()=>({at:1,visibility:'visible',focused:true,isolated:true,dpr:1,width:100,height:100,cssWidth:100,cssHeight:100,pixelRatio:1,selectedRoot:true,contextLost:false,autosave:true,savingStarted:1,savingFinished:1,activity:[],quality:{},camera:{},diagnostics:null,render:{frame:10},mixerTime:0,mixerTimeScale:1,actionsInUse:0,action:null});
test('native static Editor accepts zero rendering and rejects synthetic work or delayed autosave',()=>{
 const before=idle(),after={...idle(),at:100};assert.equal(validateEditorContentWindow(before,after,{play:false},'original').perRenderFrameDenominator,null);
 assert.throws(()=>validateEditorContentWindow(before,{...after,render:{frame:11}},{play:false},'original'),/zero rendering/);
 assert.throws(()=>validateEditorContentWindow(before,{...after,savingStarted:2,savingFinished:2},{play:false},'original'),/savingStarted/);
});
test('animated content phase requires actual selected-root native action and rendering',()=>{
 const before={...idle(),actionsInUse:1,action:{name:'Authored wind',duration:10,time:1,running:true,paused:false,enabled:true,timeScale:1}},after=structuredClone(before);after.at=101;after.mixerTime=1;after.action.time=2;after.render.frame=11;
 assert.equal(validateEditorContentWindow(before,after,{play:true},'original').renderPasses,1);after.action.time=1;assert.throws(()=>validateEditorContentWindow(before,after,{play:true},'original'),/phase/);
});
test('fixed oracle comparison rejects pixel and numerical changes',()=>{
 const a={pixelSha256:'a',width:1,height:1,objects:[],history:['AddObjectCommand'],selectedRoot:true,numeric:[1,2,3]};assert.equal(compareEditorContentOracles(a,structuredClone(a)).equal,true);assert.throws(()=>compareEditorContentOracles(a,{...a,pixelSha256:'b'}));assert.throws(()=>compareEditorContentOracles(a,{...a,numeric:[1,2,4]}));
});


test('content profile protocol pins unchanged import, quality, prepared asset and separate output',()=>{
 const prepared={manifest:{content:'beautiful-game',zip:{sha256:'b'.repeat(64)},expected:{editorAnimations:[]}},manifestSha256:'a'.repeat(64)},options={candidateSha:'c'.repeat(40)};
 const protocol={schema:1,contract:'native-editor-original-content-v1',editorSha:'9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8',candidateSha:options.candidateSha,settings:structuredClone(EDITOR_CONTENT_PROFILE_SETTINGS),import:'native-file-zip-asScene-false-root-selection-focus',quality:'native-WebGLRenderer-pageDPR1-rendererDPR1',scope:'diagnostic-sampling-only',contents:[{id:'beautiful-game',manifestSha256:prepared.manifestSha256,zipSha256:prepared.manifest.zip.sha256,playback:'native-static-idle'}],outputPrefix:'task49-editor-content-profile-chess-'};
 assert.equal(validateEditorContentProtocol(protocol,prepared,options,'task49-editor-content-profile-chess-001'),protocol);
 for(const mutate of [p=>p.candidateSha='d'.repeat(40),p=>p.contents[0].zipSha256='f'.repeat(64),p=>p.import='asScene=true',p=>p.settings.full.seconds=1,p=>p.contents[0].playback='forced-render']){const bad=structuredClone(protocol);mutate(bad);assert.throws(()=>validateEditorContentProtocol(bad,prepared,options,'task49-editor-content-profile-chess-001'));}
 assert.throws(()=>validateEditorContentProtocol(protocol,prepared,options,'robot-primary-001'));
 const args=['candidateRoot=/not-read','candidateSha='+options.candidateSha];assert.throws(()=>editorContentRunOptions([...args,'mode=full']));assert.equal(editorContentRunOptions([...args,'mode=full'],{profile:true}).mode,'full');
});

test('oracle writes real PNG bytes and preserves invalid state before rejecting; capture IDs never repeat',async()=>{
 const out=await fs.mkdtemp(path.join(os.tmpdir(),'editor-oracle-test-'));
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
 const raw={colors:0,numeric:[NaN],pixels:[0,0,0,0],png:'data:image/png;base64,'+png.toString('base64')};let calls=0;
 const run={out,page:{evaluate:async()=>++calls===3?structuredClone(raw):undefined},save:async(name,value)=>fs.writeFile(path.join(out,name),JSON.stringify(value))};
 try{
  await assert.rejects(editorContentOracle(run,0,'repeat-0'));
  const stored=await fs.readFile(path.join(out,'repeat-0.png'));assert.deepEqual(stored,png);assert.deepEqual([...stored.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  const json=JSON.parse(await fs.readFile(path.join(out,'repeat-0.json')));assert.deepEqual(json.numeric,[null]);assert.equal(json.colors,0);
  await assert.rejects(editorContentOracle(run,0,'repeat-0'),/already used/);assert.deepEqual(await fs.readFile(path.join(out,'repeat-0.png')),png);
 }finally{await fs.rm(out,{recursive:true,force:true});}
});

test('request/console failures remain failures on either side of the explicit close boundary',()=>{
 const clean=()=>({console:[],requestFailed:[],dialogs:[],crashes:[]});assertEditorContentEvents(clean());
 for(const phaseAtReceipt of ['active','closing']){const failed=clean();failed.requestFailed.push({phaseAtReceipt,url:'blob:fixture',error:'net::ERR_ABORTED'});assert.throws(()=>assertEditorContentEvents(failed));const consoleFailure=clean();consoleFailure.console.push({phaseAtReceipt,type:'error',text:'Native error'});assert.throws(()=>assertEditorContentEvents(consoleFailure));}
});
