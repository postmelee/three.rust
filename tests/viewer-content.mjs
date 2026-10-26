import test from 'node:test';
import assert from 'node:assert/strict';
import {safeContentName,gltfContentExpectations,normalizeContentManifest,assertViewerContentReadiness,VIEWER_CONTENT_PINS} from '../scripts/apps/viewer-content.mjs';

const asset=()=>({scene:0,scenes:[{nodes:[0]}],nodes:[{children:[1]},{mesh:0}],meshes:[{primitives:[{material:0}]}],buffers:[{uri:'scene.bin'}],images:[{uri:'Textures/base.ktx2'}],textures:[{extensions:{KHR_texture_basisu:{source:0}}}],materials:[{name:'Glass',pbrMetallicRoughness:{baseColorTexture:{index:0}},extensions:{KHR_materials_transmission:{transmissionFactor:0.8},KHR_materials_volume:{thicknessFactor:0.5,attenuationDistance:2,attenuationColor:[0.5,0.6,0.7]},KHR_materials_specular:{specularFactor:0.4,specularColorFactor:[0.7,0.6,0.5]}}}],animations:[{name:'Wind',channels:[{target:{node:1,path:'translation'}}]}]});
const observed=()=>({contextsLost:[false,false],nodeIndices:[0,1],materials:[{index:0,transmission:0.8,thickness:0.5,attenuationDistance:2,attenuationColor:[0.5,0.6,0.7],specularIntensity:0.4,specularColor:[0.7,0.6,0.5]}],textures:[{index:0,imageIndex:0,ready:true}],clips:[{name:'1. Wind',tracks:1}]});

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
 const expected=gltfContentExpectations(asset(),'scene.gltf');assert.equal(assertViewerContentReadiness(expected,observed()).sourceFeaturesRetained,true);
 for(const mutation of [x=>x.nodeIndices.pop(),x=>x.textures.pop(),x=>x.textures[0].ready=false,x=>x.clips[0].tracks++,x=>x.materials[0].transmission=0,x=>x.materials[0].thickness=0,x=>x.materials[0].attenuationDistance=null,x=>x.materials[0].attenuationColor[0]=1,x=>x.materials[0].specularIntensity=1,x=>x.materials[0].specularColor[0]=1,x=>x.contextsLost[0]=true]){const value=observed();mutation(value);assert.throws(()=>assertViewerContentReadiness(expected,value));}
});
