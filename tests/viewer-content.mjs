import test from 'node:test';
import assert from 'node:assert/strict';
import {viewerContentOptions} from '../scripts/apps/viewer-content-check.mjs';
import {safeContentName,gltfContentExpectations,normalizeContentManifest,assertViewerContentReadiness,VIEWER_CONTENT_PINS,captureViewerNativeCacheChecksums} from '../scripts/apps/viewer-content.mjs';

const asset=()=>({scene:0,scenes:[{nodes:[0]}],nodes:[{name:'Root',children:[1]},{name:'Mesh',mesh:0}],meshes:[{primitives:[{material:0,attributes:{POSITION:0},indices:1}]}],accessors:[{count:3,type:'VEC3'},{count:3,type:'SCALAR'}],buffers:[{uri:'scene.bin'}],images:[{uri:'Textures/base.ktx2'}],textures:[{extensions:{KHR_texture_basisu:{source:0}}}],materials:[{name:'Glass',pbrMetallicRoughness:{baseColorTexture:{index:0}},extensions:{KHR_materials_transmission:{transmissionFactor:0.8},KHR_materials_volume:{thicknessFactor:0.5,attenuationDistance:2,attenuationColor:[0.5,0.6,0.7]},KHR_materials_specular:{specularFactor:0.4,specularColorFactor:[0.7,0.6,0.5]}}}],animations:[{name:'Wind',channels:[{target:{node:1,path:'translation'}}]}]});
const map=()=>({slot:'map',textureIndex:0,imageIndex:0,imageURI:'Textures/base.ktx2',sampler:{wrapS:10497,wrapT:10497,magFilter:9729,minFilter:9987},texCoord:0,offset:[0,0],scale:[1,1],rotation:0,flipY:false,colorSpace:'srgb',colorTransfer:'srgb'});
const observed=()=>({contextsLost:[false,false],nodeIndices:[0,1],nodeRecords:[{name:'Root',parentName:null,childNames:['Mesh'],meshIndex:null,translation:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1],primitives:[]},{name:'Mesh',parentName:'Root',childNames:[],meshIndex:0,translation:[3,0,0],rotation:[0,0,0,1],scale:[1,1,1],primitives:[{primitiveIndex:0,materialIndex:0,indexCount:3,attributes:{position:{count:3,itemSize:3,normalized:false}}}]}],materials:[{index:0,transmission:0.8,thickness:0.5,attenuationDistance:2,attenuationColor:[0.5,0.6,0.7],specularIntensity:0.4,specularColor:[0.7,0.6,0.5],textureSlots:[map()]}],textures:[{index:0,imageIndex:0,ready:true}],clips:[{name:'1. Wind',tracks:1}]});

test('content paths reject escape, remote, empty and encoded input after URI normalization',()=>{
 for(const path of ['../x','/x','x\\y','a//b','a/./b','http://host/x','x\0'])assert.throws(()=>safeContentName(path));
 assert.equal(safeContentName('Textures/base.ktx2'),'Textures/base.ktx2');
 const source=asset();source.images[0].uri='%2e%2e/escape.ktx2';assert.throws(()=>gltfContentExpectations(source,'scene.gltf'));
});

test('expectations retain original scene, KTX2 source, extensions and authored channels',()=>{
 const value=gltfContentExpectations(asset(),'scene.gltf');
 assert.deepEqual(value.references,['Textures/base.ktx2','scene.bin','scene.gltf']);assert.deepEqual(value.nodeIndices,[0,1]);assert.deepEqual(value.materialIndices,[0]);assert.deepEqual(value.textureIndices,[0]);assert.deepEqual(value.imageIndices,[0]);assert.equal(value.animations[0].nativeName,'1. Wind');assert.equal(value.materials[0].thickness,0.5);
 assert.throws(()=>gltfContentExpectations({...asset(),nodes:[{children:[0]}]},'scene.gltf'),/Cycle/);
});

test('resource manifest is exact, pin-bound and duplicate-safe',()=>{
 const pin=VIEWER_CONTENT_PINS['beautiful-game'];const rows=Array.from({length:35},(_,i)=>({localPath:i===0?pin.entry:`file-${i}.bin`,bytes:i===0?pin.bytes-34:1,sha256:i===0?pin.entrySha256:'a'.repeat(64),sourceURL:`https://raw.githubusercontent.com/${pin.repository}/${pin.pin}/file-${i}`,gitBlobSha1:'b'.repeat(40)}));
 const manifest={status:'complete',sourcePin:pin.pin,files:rows};assert.equal(normalizeContentManifest('beautiful-game',manifest).length,35);
 assert.throws(()=>normalizeContentManifest('beautiful-game',{...manifest,sourcePin:'0'.repeat(40)}));
 const duplicate=structuredClone(manifest);duplicate.files[1].localPath=pin.entry;assert.throws(()=>normalizeContentManifest('beautiful-game',duplicate));
 const changed=structuredClone(manifest);changed.files[0].bytes++;assert.throws(()=>normalizeContentManifest('beautiful-game',changed));
 const wrongResource=structuredClone(manifest);wrongResource.files[1].sourceURL='https://example.test/file';assert.throws(()=>normalizeContentManifest('beautiful-game',wrongResource));
});

test('readiness rejects missing nodes, maps, decode, clips and changed transmission/volume',()=>{
 const expected=gltfContentExpectations(asset(),'scene.gltf');assert.equal(assertViewerContentReadiness(expected,observed()).checkedSourceFeaturesRetained,true);
 for(const mutation of [x=>x.nodeRecords.pop(),x=>x.nodeRecords[1].parentName=null,x=>x.nodeRecords[0].childNames=[],x=>x.nodeRecords[0].translation[0]=1,x=>x.nodeRecords[1].primitives.pop(),x=>x.nodeRecords[1].primitives[0].attributes.position.count++,x=>x.materials[0].textureSlots.pop(),x=>x.materials[0].textureSlots[0].texCoord=1,x=>x.materials[0].textureSlots[0].colorTransfer='linear',x=>x.materials[0].textureSlots[0].offset[0]=0.5,x=>x.materials[0].textureSlots[0].sampler.wrapS=33071,x=>x.textures.pop(),x=>x.textures[0].ready=false,x=>x.clips[0].tracks++,x=>x.materials[0].transmission=0,x=>x.materials[0].thickness=0,x=>x.materials[0].attenuationDistance=null,x=>x.materials[0].attenuationColor[0]=1,x=>x.materials[0].specularIntensity=1,x=>x.materials[0].specularColor[0]=1,x=>x.contextsLost[0]=true]){const value=observed();mutation(value);assert.throws(()=>assertViewerContentReadiness(expected,value));}
});

test('equivalent texture aliases and raw node association aliases preserve actual relationships',()=>{
 const source=asset();source.textures.push(structuredClone(source.textures[0]));source.materials[0].extensions.KHR_materials_specular.specularColorTexture={index:1};const actual=observed();actual.nodeIndices=[1];actual.materials[0].textureSlots.push({...map(),slot:'specularColorMap'});
 const result=assertViewerContentReadiness(gltfContentExpectations(source,'scene.gltf'),actual);assert.equal(result.authoredTextureDefinitions,2);assert.equal(result.decodedAttachedImageDefinitions,1);assert.equal(result.originalNodeInstances,2);
 const duplicate=asset();duplicate.nodes[1].name='Root';assert.throws(()=>gltfContentExpectations(duplicate,'scene.gltf'),/unique original node names/);
});

test('native cache checksum observes intact retained BINs without fetching or repairing unavailable buffers',async()=>{
 const prior=globalThis.THREE,bytes=Uint8Array.from([97,98,99]).buffer,empty=new ArrayBuffer(0),detached=new ArrayBuffer(4);structuredClone(detached,{transfer:[detached]});
 const cache=new Map([['valid',bytes],['wrong',bytes],['wrong-length',bytes],['text','abc'],['empty',empty],['detached',detached]]),gets=[];
 const expected='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
 globalThis.THREE={Cache:{enabled:true,get:url=>{const key=new URL(url).pathname.slice(1);gets.push(key);return cache.get(key);}}};
 try{
  const names=['valid','wrong','wrong-length','missing','text','empty','detached'];
  const rows=await captureViewerNativeCacheChecksums(names.map(file=>({file,url:'http://localhost/'+file,expectedBytes:file==='wrong-length'?4:3,expectedSha256:file==='wrong'?'0'.repeat(64):expected})));
  assert.deepEqual(gets,names);assert.equal(rows[0].status,'hashed');assert.equal(rows[0].matchesExpected,true);assert.equal(rows[1].matchesExpected,false);assert.equal(rows[2].matchesExpected,false);
  for(const row of rows.slice(3)){assert.equal(row.status,'unavailable');assert.equal(row.matchesExpected,null);assert(row.reason);assert.equal(row.sha256,undefined);}
  assert.equal(bytes.byteLength,3);assert.deepEqual([...new Uint8Array(bytes)],[97,98,99]);assert.equal(detached.byteLength,0);
 }finally{if(prior===undefined)delete globalThis.THREE;else globalThis.THREE=prior;}
});

test('Content-Length CLI diagnostic is explicit and restricted without changing ordinary content defaults',()=>{
 const args=['content=beautiful-game','contentRoot=/not-read','routes=original-r176'];
 assert.equal(viewerContentOptions(args).diagnosticContentLength,false);assert.equal(viewerContentOptions(args).contentFramingDiagnostic,false);assert.equal(viewerContentOptions([...args,'diagnosticContentLength=false']).contentFramingDiagnostic,true);assert.equal(viewerContentOptions([...args,'diagnosticContentLength=false']).diagnosticContentLength,false);assert.equal(viewerContentOptions([...args,'diagnosticContentLength=true']).diagnosticContentLength,true);
 assert.throws(()=>viewerContentOptions([...args,'diagnosticContentLength=1']),/must be true or false/);
 assert.throws(()=>viewerContentOptions([...args,'diagnosticContentLength=true','diagnosticContentLength=false']),/unique/);
 assert.throws(()=>viewerContentOptions(['content=bistro',...args.slice(1),'diagnosticContentLength=true']),/restricted/);
 assert.throws(()=>viewerContentOptions([...args.slice(0,2),'routes=external-r176','diagnosticContentLength=true']),/restricted/);
});
