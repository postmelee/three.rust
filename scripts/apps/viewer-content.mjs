import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { hash } from './viewer-adapter.mjs';

// Explicit original asset variants. No model repair, resource substitution,
// primitive replication, or geometry/texture reduction is performed here.
export const VIEWER_CONTENT_PINS = Object.freeze({
 bistro: { entry:'BistroExterior.gltf', pin:'816a1d6533c55787b3fabc9b75660c0d0c57ebc6', repository:'qian-o/GLTF-Assets', files:407, bytes:546272742,
  entrySha256:'696a47147466697bc0f94bb6ef7deb0d403c60993da1c8157c9b03e7c1445ef2', license:'CC-BY-4.0',
  noticeURLs:['https://github.com/qian-o/GLTF-Assets/blob/816a1d6533c55787b3fabc9b75660c0d0c57ebc6/Bistro/README.md','https://github.com/qian-o/GLTF-Assets/blob/816a1d6533c55787b3fabc9b75660c0d0c57ebc6/Bistro/LICENSE.txt'],
  attribution:'Amazon Lumberyard Bistro, distributed through NVIDIA ORCA; glTF/KTX2 conversion by qian-o. Original source FBX v5.2. See both preserved upstream notices.',
  scope:'Unmodified BistroExterior glTF with all referenced KTX2 images and all 13 authored wind clips. The optional external HDRI is not a glTF dependency and is not selected.' },
 'beautiful-game': { entry:'ABeautifulGame.gltf', pin:'8f492390ddc7a2ae221a1369ef560589cf8c70fb', repository:'KhronosGroup/glTF-Sample-Assets', files:35, bytes:29805749,
  entrySha256:'2e1b63ae34173c6e3251f749b1b8b97a32e92517aab2cfd4bfffd9158f4dd278', license:'CC-BY-4.0',
  noticeURLs:['https://github.com/KhronosGroup/glTF-Sample-Assets/blob/8f492390ddc7a2ae221a1369ef560589cf8c70fb/Models/ABeautifulGame/README.md'],
  attribution:'Modeled by Moeen Sayed and Mujtaba Sayed for SideFX. Original assets copyright 2020 ASWF / MaterialX Project. glTF conversion copyright 2022 Ed Mackey. See the preserved upstream notice.',
  scope:'Unmodified A Beautiful Game glTF variant, original authored piece instances, JPEG images, transmission and volume materials. No additional instances.' }
});

export function safeContentName(value) {
 if(typeof value!=='string'||!value||value.includes('\\')||value.includes('\0')||value.startsWith('/')||value.split('/').some(part=>part==='..'||part==='.'||!part)||/^[a-z][a-z0-9+.-]*:/i.test(value))throw Error('Unsafe content resource path');
 return value;
}

const TEXTURE_SLOTS={baseColorTexture:['map'],metallicRoughnessTexture:['metalnessMap','roughnessMap'],normalTexture:['normalMap'],occlusionTexture:['aoMap'],emissiveTexture:['emissiveMap'],specularTexture:['specularIntensityMap'],specularColorTexture:['specularColorMap'],transmissionTexture:['transmissionMap'],thicknessTexture:['thicknessMap']};
const ATTRIBUTE_NAMES={POSITION:'position',NORMAL:'normal',TANGENT:'tangent',TEXCOORD_0:'uv',TEXCOORD_1:'uv1',TEXCOORD_2:'uv2',TEXCOORD_3:'uv3',COLOR_0:'color',JOINTS_0:'skinIndex',WEIGHTS_0:'skinWeight'};
const ITEM_SIZE={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
function sourceTexture(json,index,info,slot) {
 const texture=json.textures[index],imageIndex=texture.extensions?.KHR_texture_basisu?.source??texture.extensions?.EXT_texture_webp?.source??texture.extensions?.EXT_texture_avif?.source??texture.source;
 const sampler=json.samplers?.[texture.sampler]??{},transform=info.extensions?.KHR_texture_transform??{};
 return {slot,textureIndex:index,imageIndex,imageURI:json.images[imageIndex].uri??null,sampler:{wrapS:sampler.wrapS??10497,wrapT:sampler.wrapT??10497,magFilter:sampler.magFilter??9729,minFilter:sampler.minFilter??9987},texCoord:transform.texCoord??info.texCoord??0,offset:transform.offset??[0,0],scale:transform.scale??[1,1],rotation:transform.rotation??0,flipY:false,colorTransfer:['map','emissiveMap','specularColorMap'].includes(slot)?'srgb':'linear'};
}

export function gltfContentExpectations(json, entry) {
 const references=[entry,...(json.buffers??[]).map(item=>item.uri),...(json.images??[]).map(item=>item.uri)].filter(value=>value!==undefined).map(value=>safeContentName(decodeURIComponent(value)));
 const sourceNodes=new Set(), sourceMeshes=new Set(), sourceMaterials=new Set();
 let meshNodes=0, skinnedNodes=0, morphNodes=0, primitiveInstances=0;
 function walk(index, ancestors=new Set()) {
  if(ancestors.has(index))throw Error('Cycle in source scene');
  if(sourceNodes.has(index))return;
  const node=json.nodes?.[index];if(!node)throw Error('Missing source node');
  sourceNodes.add(index);const chain=new Set([...ancestors,index]);
  if(node.mesh!==undefined){const mesh=json.meshes?.[node.mesh];if(!mesh)throw Error('Missing source mesh');meshNodes++;sourceMeshes.add(node.mesh);if(node.skin!==undefined)skinnedNodes++;if(mesh.primitives.some(p=>p.targets?.length))morphNodes++;for(const primitive of mesh.primitives){primitiveInstances++;if(primitive.material!==undefined)sourceMaterials.add(primitive.material);}}
  for(const child of node.children??[])walk(child,chain);
 }
 const scene=json.scenes?.[json.scene??0];if(!scene)throw Error('Asset has no default scene');
 for(const index of scene.nodes??[])walk(index);
 const names=[...sourceNodes].map(index=>json.nodes[index].name);assert(names.every(name=>typeof name==='string'&&name.length>0),'Pinned content nodes require nonempty original names');assert.equal(new Set(names).size,names.length,'Pinned content requires unique original node names');
 const parent=new Map();for(const index of sourceNodes)for(const child of json.nodes[index].children??[]){assert(!parent.has(child),'A source node cannot have multiple parents');parent.set(child,index);}
 const animatedTargets=new Set((json.animations??[]).flatMap(animation=>animation.channels.map(channel=>channel.target.node)));
 const nodeRecords=[...sourceNodes].sort((a,b)=>a-b).map(index=>{const node=json.nodes[index];return {index,name:node.name,parentName:parent.has(index)?json.nodes[parent.get(index)].name:null,childNames:(node.children??[]).map(child=>json.nodes[child].name).sort(),meshIndex:node.mesh??null,animated:animatedTargets.has(index),translation:node.translation??[0,0,0],rotation:node.rotation??[0,0,0,1],scale:node.scale??[1,1,1],matrix:node.matrix??null,primitives:node.mesh===undefined?[]:json.meshes[node.mesh].primitives.map((primitive,primitiveIndex)=>({primitiveIndex,materialIndex:primitive.material??null,indexCount:primitive.indices===undefined?0:json.accessors[primitive.indices].count,attributes:Object.fromEntries(Object.entries(primitive.attributes).map(([key,accessorIndex])=>{assert(ATTRIBUTE_NAMES[key],'Unsupported source attribute '+key);const accessor=json.accessors[accessorIndex];return [ATTRIBUTE_NAMES[key],{count:accessor.count,itemSize:ITEM_SIZE[accessor.type],normalized:accessor.normalized??false}];}))}))};});
 const sourceTextures=new Set();
 function textureRefs(value) { if(!value||typeof value!=='object')return;for(const [key,item]of Object.entries(value)){if(key.endsWith('Texture')&&Number.isSafeInteger(item?.index))sourceTextures.add(item.index);else textureRefs(item);} }
 const materials=[...sourceMaterials].sort((a,b)=>a-b).map(index=>{const value=json.materials?.[index];if(!value)throw Error('Missing source material');textureRefs(value);const textureSlots=[];function slots(object){if(!object||typeof object!=='object')return;for(const [key,info]of Object.entries(object)){if(key.endsWith('Texture')&&Number.isSafeInteger(info?.index)){assert(TEXTURE_SLOTS[key],'Unsupported authored texture slot '+key);for(const slot of TEXTURE_SLOTS[key])textureSlots.push(sourceTexture(json,info.index,info,slot));}else slots(info);}}slots(value);return {index,name:value.name??'',textureSlots:textureSlots.sort((a,b)=>a.slot.localeCompare(b.slot)),transmission:value.extensions?.KHR_materials_transmission?.transmissionFactor??0,thickness:value.extensions?.KHR_materials_volume?.thicknessFactor??0,attenuationDistance:value.extensions?.KHR_materials_volume?.attenuationDistance??null,attenuationColor:value.extensions?.KHR_materials_volume?.attenuationColor??[1,1,1],specularIntensity:value.extensions?.KHR_materials_specular?.specularFactor??1,specularColor:value.extensions?.KHR_materials_specular?.specularColorFactor??[1,1,1],hasTransmission:Boolean(value.extensions?.KHR_materials_transmission),hasVolume:Boolean(value.extensions?.KHR_materials_volume),hasSpecular:Boolean(value.extensions?.KHR_materials_specular)};});
 const imageForTexture=index=>{const texture=json.textures?.[index];if(!texture)throw Error('Missing source texture');const image=texture.extensions?.KHR_texture_basisu?.source??texture.extensions?.EXT_texture_webp?.source??texture.extensions?.EXT_texture_avif?.source??texture.source;if(!Number.isSafeInteger(image)||!json.images?.[image])throw Error('Missing source texture image');return image;};
 return { references:[...new Set(references)].sort(), nodeIndices:[...sourceNodes].sort((a,b)=>a-b), nodeRecords,nodes:sourceNodes.size, meshNodes, meshDefinitions:sourceMeshes.size, primitiveInstances, skinnedNodes, morphNodes,
  materialIndices:[...sourceMaterials].sort((a,b)=>a-b), materials, textureIndices:[...sourceTextures].sort((a,b)=>a-b), imageIndices:[...new Set([...sourceTextures].map(imageForTexture))].sort((a,b)=>a-b), declaredImages:(json.images??[]).length,
  animations:(json.animations??[]).map((animation,index)=>({index,name:animation.name??'',nativeName:`${index+1}. ${animation.name??'animation_'+index}`,channels:animation.channels.length,targets:[...new Set(animation.channels.map(channel=>channel.target.node))].sort((a,b)=>a-b)})),
  extensionsUsed:json.extensionsUsed??[],extensionsRequired:json.extensionsRequired??[] };
}

export function normalizeContentManifest(id, manifest) {
 const pin=VIEWER_CONTENT_PINS[id];if(!pin)throw Error('Unsupported pinned Viewer content');
 assert.equal(manifest.status,'complete');assert.equal(manifest.pin??manifest.sourcePin,pin.pin);
 const files=manifest.files.map(row=>({file:safeContentName(row.uri??row.localPath),bytes:row.bytes,sha256:row.sha256,gitBlobSha1:row.gitBlobSha1??null,sourceURL:row.url??row.sourceURL,lfsPointer:row.lfsPointer??null}));
 assert.equal(files.length,pin.files);assert.equal(new Set(files.map(row=>row.file)).size,files.length);
 for(const row of files){assert(Number.isSafeInteger(row.bytes)&&row.bytes>0);assert(/^[a-f0-9]{64}$/.test(row.sha256));assert(typeof row.sourceURL==='string'&&row.sourceURL.includes('/'+pin.pin+'/'));if(row.gitBlobSha1!==null)assert(/^[a-f0-9]{40}$/.test(row.gitBlobSha1));}
 assert.equal(files.reduce((sum,row)=>sum+row.bytes,0),pin.bytes);assert.equal(files.find(row=>row.file===pin.entry)?.sha256,pin.entrySha256);
 return files.sort((a,b)=>a.file.localeCompare(b.file));
}

export async function createPinnedViewerContent(id, rootArg) {
 const pin=VIEWER_CONTENT_PINS[id];if(!pin)throw Error('Unsupported pinned Viewer content');
 const root=await fs.realpath(path.resolve(rootArg));
 const manifestBytes=await fs.readFile(path.join(root,'fetch-manifest.json'));
 const files=normalizeContentManifest(id,JSON.parse(manifestBytes));
 const entryBytes=await fs.readFile(path.join(root,pin.entry));assert.equal(hash(entryBytes),pin.entrySha256);
 const expected=gltfContentExpectations(JSON.parse(entryBytes),pin.entry);
 assert.deepEqual(files.map(row=>row.file).sort(),expected.references,'All original referenced resources and only those resources must be present in the allowlist');
 return {id,root,entry:pin.entry,files,source:{pin:pin.pin,repository:pin.repository,license:pin.license,noticeURLs:pin.noticeURLs,attribution:pin.attribution,scope:pin.scope,fetchManifestSha256:hash(manifestBytes),entrySha256:pin.entrySha256,files:pin.files,bytes:pin.bytes},expected};
}

// Passive native-loader state inspection. This never calls getDependencies(),
// adds material maps, or requests images that native App.view did not load.
export function captureViewerContentReadiness() {
 const v=VIEWER.app.viewer,p=VIEWER.json?.parser;if(!v?.content||!p)throw Error('Native content/parser unavailable');
 const materials=new Set(),textures=new Set(),geometries=new Set(),arrays=new Set(),nodes=[],nodeRecords=[];
 const sourceNames=new Set(p.json.nodes.map(node=>node.name));
 const isSourceNode=object=>typeof object.userData?.name==='string'&&sourceNames.has(object.userData.name);
 const filters=new Map([[THREE.NearestFilter,9728],[THREE.LinearFilter,9729],[THREE.NearestMipmapNearestFilter,9984],[THREE.LinearMipmapNearestFilter,9985],[THREE.NearestMipmapLinearFilter,9986],[THREE.LinearMipmapLinearFilter,9987]]);
 const wraps=new Map([[THREE.ClampToEdgeWrapping,33071],[THREE.MirroredRepeatWrapping,33648],[THREE.RepeatWrapping,10497]]);
 const textureRelation=(texture,slot)=>{const index=p.associations.get(texture)?.textures??null,definition=index===null?null:p.json.textures[index],imageIndex=definition?.extensions?.KHR_texture_basisu?.source??definition?.extensions?.EXT_texture_webp?.source??definition?.extensions?.EXT_texture_avif?.source??definition?.source??null;return {slot,textureIndex:index,imageIndex,imageURI:imageIndex===null?null:p.json.images[imageIndex]?.uri??null,sampler:{wrapS:wraps.get(texture.wrapS)??null,wrapT:wraps.get(texture.wrapT)??null,magFilter:filters.get(texture.magFilter)??null,minFilter:filters.get(texture.minFilter)??null},texCoord:texture.channel,offset:texture.offset.toArray(),scale:texture.repeat.toArray(),rotation:texture.rotation,flipY:texture.flipY,colorSpace:texture.colorSpace,colorTransfer:THREE.ColorManagement.getTransfer(texture.colorSpace)};};
 const memoryArray=array=>{if(ArrayBuffer.isView(array))arrays.add(array.buffer);};
 v.content.traverse(object=>{const association=p.associations.get(object);if(association?.nodes!==undefined)nodes.push(association.nodes);if(object.geometry){geometries.add(object.geometry);for(const attribute of Object.values(object.geometry.attributes))memoryArray(attribute.array??attribute.data?.array);memoryArray(object.geometry.index?.array);}for(const material of object.material?(Array.isArray(object.material)?object.material:[object.material]):[])materials.add(material);
  if(isSourceNode(object)){let parent=object.parent;while(parent&&!isSourceNode(parent))parent=parent.parent;const childNames=[],primitives=[];
   function descend(current){if(current!==object&&isSourceNode(current)){childNames.push(current.userData.name);return;}if(current.geometry){const a=p.associations.get(current);primitives.push({primitiveIndex:a?.primitives??0,materialIndex:p.associations.get(current.material)?.materials??null,indexCount:current.geometry.index?.count??0,attributes:Object.fromEntries(Object.entries(current.geometry.attributes).map(([key,value])=>[key,{count:value.count,itemSize:value.itemSize,normalized:value.normalized}]))});}for(const child of current.children)descend(child);}
   descend(object);nodeRecords.push({name:object.userData.name,runtimeName:object.name,parentName:parent?.userData.name??null,childNames:childNames.sort(),meshIndex:association?.meshes??null,association:association?{...association}:null,translation:object.position.toArray(),rotation:object.quaternion.toArray(),scale:object.scale.toArray(),matrix:object.matrix.toArray(),primitives:primitives.sort((a,b)=>a.primitiveIndex-b.primitiveIndex)});
  }
 });
 const materialRows=[...materials].map(material=>{
  const slots=[];for(const [key,value]of Object.entries(material)){if(!value?.isTexture||key==='envMap')continue;textures.add(value);slots.push(textureRelation(value,key));}
  return {index:p.associations.get(material)?.materials??null,name:material.name,type:material.type,transmission:material.transmission??0,thickness:material.thickness??0,attenuationDistance:Number.isFinite(material.attenuationDistance)?material.attenuationDistance:null,attenuationColor:material.attenuationColor?.toArray()??null,specularIntensity:material.specularIntensity??null,specularColor:material.specularColor?.toArray()??null,textureSlots:slots.sort((a,b)=>a.slot.localeCompare(b.slot))};
 }).sort((a,b)=>(a.index??-1)-(b.index??-1)||a.name.localeCompare(b.name));
 const textureRows=[...textures].map(texture=>{
  const index=p.associations.get(texture)?.textures??null,definition=index===null?null:p.json.textures[index],imageIndex=definition?.extensions?.KHR_texture_basisu?.source??definition?.extensions?.EXT_texture_webp?.source??definition?.extensions?.EXT_texture_avif?.source??definition?.source??null;
  const image=texture.image,levels=(texture.mipmaps??[]).map(level=>({width:level.width,height:level.height,bytes:level.data?.byteLength??null}));
  memoryArray(image?.data);for(const level of texture.mipmaps??[])memoryArray(level.data);
  return {index,imageIndex,imageURI:imageIndex===null?null:p.json.images[imageIndex]?.uri??null,width:image?.width??null,height:image?.height??null,compressed:Boolean(texture.isCompressedTexture),format:texture.format,type:texture.type,colorSpace:texture.colorSpace,version:texture.version,mipmaps:levels,ready:Boolean(image&&image.width>0&&image.height>0&&(!texture.isCompressedTexture||levels.length>0)),matrix:texture.matrix.toArray(),channel:texture.channel,flipY:texture.flipY};
 }).sort((a,b)=>(a.index??-1)-(b.index??-1)||a.colorSpace.localeCompare(b.colorSpace));
 const actions=v.mixer?v.clips.map(clip=>{const action=v.mixer.existingAction(clip);return {name:clip.name,duration:clip.duration,tracks:clip.tracks.length,present:Boolean(action),running:action?.isRunning()??false,time:action?.time??null,weight:action?.getEffectiveWeight()??null};}):[];
 const loaderCache=Object.entries(THREE.Cache.files??{}).map(([url,value])=>({path:new URL(url,location.href).pathname,type:typeof value==='string'?'string':value?.constructor?.name??typeof value,bytes:value?.byteLength??null,textCodeUnits:typeof value==='string'?value.length:null}));
 return {nodeIndices:[...new Set(nodes)].sort((a,b)=>a-b),nodeRecords:nodeRecords.sort((a,b)=>a.name.localeCompare(b.name)),materials:materialRows,textures:textureRows,clips:actions,mixerTime:v.mixer?.time??null,renderFrame:v.renderer.info.render.frame,loaderCache:{enabled:THREE.Cache.enabled,entries:loaderCache},
  renderers:{main:{memory:{...v.renderer.info.memory},render:{...v.renderer.info.render}},axes:{memory:{...v.axesRenderer.info.memory},render:{...v.axesRenderer.info.render}}},
  memory:{loadedGeometryObjects:geometries.size,loadedMaterialObjects:materials.size,loadedTextureObjects:textures.size,uniqueRetainedArrayBufferBytes:[...arrays].reduce((sum,buffer)=>sum+buffer.byteLength,0),scope:'Observed geometry/index/compressed-mipmap backing ArrayBuffers; shared buffers counted once. Not total JS heap, browser process memory, or GPU allocation.',jsHeap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize,limit:performance.memory.jsHeapSizeLimit}:null},
  revision:THREE.REVISION,diagnostics:THREE.diagnostics?.()??null,bootstrap:globalThis.__rthreeViewerBootstrap?{initCalls:__rthreeViewerBootstrap.initCalls,appStarts:__rthreeViewerBootstrap.appStarts,error:__rthreeViewerBootstrap.error}:null,
  contextsLost:[v.renderer,v.axesRenderer].map(renderer=>renderer.getContext().isContextLost())};
}

export function assertViewerContentReadiness(expected, observed) {
 assert.deepEqual(observed.contextsLost,[false,false]);
 const names=expected.nodeRecords.map(row=>row.name);assert.equal(new Set(names).size,names.length);assert(names.every(Boolean));
 assert.deepEqual(observed.nodeRecords.map(row=>row.name).sort(),names.toSorted(),'Every original named node instance must remain present exactly once');
 const near=(actual,reference,label)=>{assert.equal(actual.length,reference.length,label);for(let i=0;i<actual.length;i++)assert(Number.isFinite(actual[i])&&Math.abs(actual[i]-reference[i])<=1e-10+1e-12*Math.abs(reference[i]),label+'['+i+']');};
 for(const source of expected.nodeRecords){const actual=observed.nodeRecords.find(row=>row.name===source.name);assert.equal(actual.parentName,source.parentName,'Original node parent');assert.deepEqual(actual.childNames,source.childNames,'Original node children');assert.equal(actual.meshIndex,source.meshIndex,'Original node mesh relation');assert.equal(actual.primitives.length,source.primitives.length,'Original mesh primitive instance count');for(const primitive of source.primitives){const found=actual.primitives.find(row=>row.primitiveIndex===primitive.primitiveIndex);assert(found,'Missing authored primitive');assert.equal(found.materialIndex,primitive.materialIndex,'Primitive material relation');assert.equal(found.indexCount,primitive.indexCount,'Primitive index count');for(const [attribute,value]of Object.entries(primitive.attributes))assert.deepEqual(found.attributes[attribute],value,'Original geometry attribute '+attribute);}if(!source.animated){if(source.matrix)near(actual.matrix,source.matrix,'Static source local matrix');else{near(actual.translation,source.translation,'Static source translation');near(actual.rotation,source.rotation,'Static source rotation');near(actual.scale,source.scale,'Static source scale');}}}
 const unique=(rows,key)=>[...new Set(rows.map(row=>row[key]))].sort((a,b)=>a-b);
 assert.deepEqual(unique(observed.materials,'index'),expected.materialIndices,'Every material referenced by the original default scene must remain attached');
 assert.deepEqual(unique(observed.textures,'imageIndex'),expected.imageIndices,'Every authored material image must be decoded and attached');
 assert(observed.textures.every(row=>row.ready),'Native material textures must have decoded dimensions/mipmaps');
 assert.deepEqual(observed.clips.map(clip=>({name:clip.name,tracks:clip.tracks})),expected.animations.map(clip=>({name:clip.nativeName,tracks:clip.channels})),'All authored clips/channels must remain available');
 for(const source of expected.materials){for(const actual of observed.materials.filter(row=>row.index===source.index)){assert.deepEqual(actual.textureSlots.map(row=>row.slot),source.textureSlots.map(row=>row.slot),'Every authored material map slot must remain attached');for(const wanted of source.textureSlots){const got=actual.textureSlots.find(row=>row.slot===wanted.slot);for(const key of ['imageIndex','imageURI','sampler','texCoord','offset','scale','rotation','flipY','colorTransfer'])assert.deepEqual(got[key],wanted[key],'Material '+source.index+' '+wanted.slot+' '+key);}assert.equal(actual.transmission,source.transmission,'Transmission factor must be retained');assert.equal(actual.thickness,source.thickness,'Volume thickness must be retained');if(source.hasVolume){assert.equal(actual.attenuationDistance,source.attenuationDistance,'Volume attenuation distance must be retained');assert.deepEqual(actual.attenuationColor,source.attenuationColor,'Volume linear attenuation color must be retained');}if(source.hasSpecular){assert.equal(actual.specularIntensity,source.specularIntensity,'Specular factor must be retained');assert.deepEqual(actual.specularColor,source.specularColor,'Specular linear color must be retained');}}}
 return {originalNodeInstances:expected.nodeRecords.length,staticSourceTransformsChecked:expected.nodeRecords.filter(row=>!row.animated).length,animatedNodesRequireFixedCrossRouteOracle:expected.nodeRecords.filter(row=>row.animated).length,attachedOriginalMaterials:expected.materialIndices.length,authoredTextureDefinitions:expected.textureIndices.length,attachedMaterialTextureSlots:expected.materials.reduce((sum,row)=>sum+row.textureSlots.length,0),decodedAttachedImageDefinitions:expected.imageIndices.length,declaredImages:expected.declaredImages,authoredClips:expected.animations.length,checkedSourceFeaturesRetained:true,associationPolicy:'Raw node/texture association indices are diagnostic. Node identity uses unique original names and instance relationships; material slots require source image, sampler and UV semantics, allowing only equivalent source aliases.'};
}
