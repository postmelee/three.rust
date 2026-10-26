import fs from 'node:fs/promises';
import {createReadStream,openSync,writeSync,closeSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createPinnedViewerContent,gltfContentExpectations,safeContentName,VIEWER_CONTENT_PINS,normalizeContentManifest} from './viewer-content.mjs';

export const EDITOR_CONTENT_PIN='9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8';
export const sha256=data=>createHash('sha256').update(data).digest('hex');
export const CONTENT_ROUTES=['original','prepared-js','prepared-wasm'];
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();

// Streaming store-only ZIP: no asset encoding, compression, path normalization,
// or application edits. Its native decoder is the pinned Editor's own fflate.
export async function writeStoredContentZip(entries,destination,fflate) {
 assert(entries.length&&new Set(entries.map(row=>row.name)).size===entries.length);
 for(const row of entries)safeContentName(row.name);
 const fd=openSync(destination,'wx'),digest=createHash('sha256');let total=0,ended=false;
 const zip=new fflate.Zip((error,data,final)=>{if(error)throw error;writeSync(fd,data);digest.update(data);total+=data.length;ended=final;});
 try{
  for(const row of [...entries].sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){
   const entry=new fflate.ZipPassThrough(row.name);entry.mtime=new Date(1980,0,1,0,0,0);zip.add(entry);
   const hash=createHash('sha256');let bytes=0;
   const chunks=row.data?[row.data]:createReadStream(row.file,{highWaterMark:1024*1024});
   for await(const chunk of chunks){hash.update(chunk);bytes+=chunk.length;entry.push(chunk,false);}
   assert.equal(bytes,row.bytes,'Source byte length changed: '+row.name);assert.equal(hash.digest('hex'),row.sha256,'Source bytes changed: '+row.name);entry.push(new Uint8Array(),true);
  }
  zip.end();assert(ended,'ZIP final callback missing');
 }finally{closeSync(fd);}
 return {bytes:total,sha256:digest.digest('hex'),method:'store',dosTimestamp:'1980-01-01 00:00:00 local calendar fields; timezone-independent ZIP fields'};
}

export async function verifyStoredContentZip(file,expected,fflate) {
 const entries=[],seen=new Set(),pending=new Map();let failure;
 const parser=new fflate.Unzip(entry=>{
  try{safeContentName(entry.name);assert(!seen.has(entry.name),'Duplicate ZIP entry');seen.add(entry.name);assert.equal(entry.compression,0,'Only unchanged store entries permitted');const match=expected.find(row=>row.name===entry.name);assert(match,'Unexpected ZIP entry: '+entry.name);const digest=createHash('sha256');let bytes=0;pending.set(entry.name,true);
   entry.ondata=(error,data,final)=>{if(error){failure??=error;return;}digest.update(data);bytes+=data.length;if(final){const row={name:entry.name,bytes,sha256:digest.digest('hex')};entries.push(row);pending.delete(entry.name);try{assert.equal(bytes,match.bytes);assert.equal(row.sha256,match.sha256);}catch(error){failure??=error;}}};entry.start();
  }catch(error){failure??=error;}
 });
 for await(const chunk of createReadStream(file,{highWaterMark:1024*1024}))parser.push(chunk,false);
 parser.push(new Uint8Array(),true);if(failure)throw failure;assert.equal(pending.size,0);assert.equal(seen.size,expected.length,'Missing ZIP entries');return entries.sort((a,b)=>a.name<b.name?-1:1);
}

export function editorContentExpectations(json,entry) {
 const expected=gltfContentExpectations(json,entry);
 const materials=(json.materials??[]).map((item,index)=>({index,name:item.name??''}));
 const active=materials.filter(item=>expected.materialIndices.includes(item.index));
 assert(active.every(item=>item.name),'Native Editor content needs named source materials');assert.equal(new Set(active.map(item=>item.name)).size,active.length,'Material names must identify source definitions uniquely');
 const textureNames={};
 for(const texture of json.textures??[]){const imageIndex=texture.extensions?.KHR_texture_basisu?.source??texture.extensions?.EXT_texture_webp?.source??texture.extensions?.EXT_texture_avif?.source??texture.source,image=json.images[imageIndex];const name=texture.name||image.name||image.uri;assert(name,'Unnamed source texture');if(textureNames[name]!==undefined)assert.equal(textureNames[name],imageIndex,'Texture name ambiguously identifies different images');textureNames[name]=imageIndex;}
 return {...expected,materialNames:active,textureNames,images:(json.images??[]).map((image,index)=>({index,uri:image.uri})),sceneName:json.scenes[json.scene??0].name??'',editorAnimations:(json.animations??[]).map((item,index)=>({index,name:item.name??'animation_'+index,tracks:item.channels.length}))};
}

export function selectContentNotices(records,urls) {
 const canonical=url=>url.startsWith('https://github.com/')?url.replace('https://github.com/','https://raw.githubusercontent.com/').replace('/blob/','/'):url;
 const allowed=new Set(urls.map(canonical));assert.equal(allowed.size,urls.length);const selected=records.filter(row=>allowed.has(row.sourceURL));assert.equal(selected.length,allowed.size,'Expected exact original notices');assert.equal(new Set(selected.map(row=>row.sourceURL)).size,allowed.size,'Duplicate original notice');return selected;
}

export async function prepareEditorContent(appsArg,id,contentRoot,outArg) {
 const apps=await fs.realpath(appsArg),editor=path.join(apps,'editor'),out=path.resolve(outArg);await fs.mkdir(out,{recursive:false});
 const toolRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
 const result={schema:1,status:'preparing',kind:'unchanged native app ZIP import container',content:id,editorSha:EDITOR_CONTENT_PIN,assetBytesChanged:false};
 result.tooling={sha:git(toolRoot,'rev-parse','HEAD'),dirty:Boolean(git(toolRoot,'status','--porcelain','--untracked-files=normal')),sourceSha256:sha256(await fs.readFile(fileURLToPath(import.meta.url)))};
 const save=()=>fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(result,null,2)+'\n');await save();
 try{
  assert.equal(git(editor,'rev-parse','HEAD'),EDITOR_CONTENT_PIN);assert.equal(git(editor,'status','--porcelain','--untracked-files=no'),'');
  const content=await createPinnedViewerContent(id,contentRoot),json=JSON.parse(await fs.readFile(path.join(content.root,content.entry)));
  await fs.writeFile(path.join(out,content.entry),await fs.readFile(path.join(content.root,content.entry)),{flag:'wx'});
  result.source=content.source;result.entry=content.entry;result.expected=editorContentExpectations(json,content.entry);result.files=content.files;
  const fflatePath=path.join(editor,'examples/jsm/libs/fflate.module.js'),fflateBytes=await fs.readFile(fflatePath),fflate=await import(pathToFileURL(fflatePath));
  result.nativeZipLibrary={file:'editor/examples/jsm/libs/fflate.module.js',sha256:sha256(fflateBytes),bytes:fflateBytes.length};
  const noticeRoot=path.join(toolRoot,'bench/results/task49-content-preparation-20261026/notices');
  const notices=selectContentNotices(JSON.parse(await fs.readFile(path.join(noticeRoot,'manifest.json'))).sources,content.source.noticeURLs);
  const entries=content.files.map(row=>({name:row.file,file:path.join(content.root,row.file),bytes:row.bytes,sha256:row.sha256}));
  result.notices=[];
  for(const row of notices){const stored=await fs.readFile(path.join(noticeRoot,row.file));assert.equal(sha256(stored),row.storedSHA256);const data=gunzipSync(stored);assert.equal(sha256(data),row.originalSHA256);assert.equal(data.length,row.originalBytes);const name='__notices__/'+row.file.replace(/\.gz$/,'');entries.push({name,data,bytes:data.length,sha256:row.originalSHA256});result.notices.push({...row,zipPath:name});}
  const attribution=Buffer.from(JSON.stringify({source:content.source,scope:'Container-only adaptation for native Editor/Viewer ZIP import. Every original referenced asset byte and relative path is unchanged; original notices are included.'},null,2)+'\n');
  entries.push({name:'__notices__/provenance.json',data:attribution,bytes:attribution.length,sha256:sha256(attribution)});
  result.zip={file:id+'.zip',...await writeStoredContentZip(entries,path.join(out,id+'.zip'),fflate)};
  result.verifiedEntries=await verifyStoredContentZip(path.join(out,id+'.zip'),entries,fflate);
  result.sourceIntegrityUnchanged=git(editor,'rev-parse','HEAD')===EDITOR_CONTENT_PIN&&!git(editor,'status','--porcelain','--untracked-files=no');assert(result.sourceIntegrityUnchanged);result.status='prepared';return result;
 }catch(error){result.status='failed';result.error=String(error.message);throw error;}finally{await save();}
}

export async function readEditorContentPreparation(rootArg,appsArg) {
 const root=await fs.realpath(rootArg),manifestBytes=await fs.readFile(path.join(root,'manifest.json')),manifest=JSON.parse(manifestBytes);assert.equal(manifest.status,'prepared');assert.equal(manifest.editorSha,EDITOR_CONTENT_PIN);assert.equal(manifest.assetBytesChanged,false);assert.equal(manifest.sourceIntegrityUnchanged,true);
 const pin=VIEWER_CONTENT_PINS[manifest.content];assert(pin);assert.equal(manifest.source.pin,pin.pin);assert.equal(manifest.entry,pin.entry);const source=await fs.readFile(path.join(root,pin.entry));assert.equal(sha256(source),pin.entrySha256);assert.deepEqual(manifest.expected,editorContentExpectations(JSON.parse(source),pin.entry));
 const toolRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),archive=path.join(toolRoot,'bench/results/task49-content-preparation-20261026',manifest.content==='bistro'?'bistro-fetch-manifest.json':'beautiful-game-fetch-manifest.json');assert.deepEqual(manifest.files,normalizeContentManifest(manifest.content,JSON.parse(await fs.readFile(archive))));
 const zip=path.join(root,safeContentName(manifest.zip.file)),digest=createHash('sha256');let bytes=0;for await(const chunk of createReadStream(zip)){digest.update(chunk);bytes+=chunk.length;}assert.equal(bytes,manifest.zip.bytes);assert.equal(digest.digest('hex'),manifest.zip.sha256);
 const library=path.join(appsArg,'editor/examples/jsm/libs/fflate.module.js');assert.equal(sha256(await fs.readFile(library)),manifest.nativeZipLibrary.sha256);const fflate=await import(pathToFileURL(library));assert.equal(manifest.verifiedEntries.length,manifest.files.length+manifest.notices.length+1);for(const file of manifest.files){const entry=manifest.verifiedEntries.find(entry=>entry.name===file.file);assert(entry);assert.equal(entry.bytes,file.bytes);assert.equal(entry.sha256,file.sha256);}await verifyStoredContentZip(zip,manifest.verifiedEntries,fflate);
 return {root,zip,manifest,manifestSha256:sha256(manifestBytes)};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,6,'Usage: node scripts/apps/editor-content.mjs APPS_ROOT bistro|beautiful-game CONTENT_ROOT NEW_OUTPUT');
 const result=await prepareEditorContent(...process.argv.slice(2));console.log(JSON.stringify({status:result.status,content:result.content,files:result.files.length,zipBytes:result.zip.bytes}));
}
