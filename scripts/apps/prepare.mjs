import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.resolve(process.argv[2] || 'work/app-reproduction-002');
const sha = b => createHash('sha256').update(b).digest('hex');
const pins = { viewer: ['https://github.com/donmccurdy/three-gltf-viewer.git','b5ee5dafe27f953ae1b55f42b5fa3697fef08683'], editor: ['https://github.com/mrdoob/three.js.git','9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8'] };
await fs.mkdir(root, {recursive:true});
for (const [name,[url,ref]] of Object.entries(pins)) {
 const dir=path.join(root,name);
 try { await fs.access(path.join(dir,'.git')); } catch {
  execFileSync('git',['clone','--filter=blob:none','--no-checkout',url,dir],{stdio:'inherit'});
  if(name==='editor') execFileSync('git',['sparse-checkout','set','editor','build','src','files','examples/jsm','examples/fonts','examples/models/gltf/RobotExpressive'],{cwd:dir,stdio:'inherit'});
  execFileSync('git',['checkout','--detach',ref],{cwd:dir,stdio:'inherit'});
 }
 if(execFileSync('git',['rev-parse','HEAD'],{cwd:dir,encoding:'utf8'}).trim()!==ref) throw Error(`${name}: wrong source SHA`);
 if(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:dir,encoding:'utf8'}).trim()) throw Error(`${name}: modified tracked source`);
}
if(execFileSync('yarn',['--version'],{encoding:'utf8'}).trim()!=='1.22.22') throw Error('Use Yarn 1.22.22');
execFileSync('yarn',['install','--frozen-lockfile','--non-interactive'],{cwd:path.join(root,'viewer'),stdio:'inherit'});
execFileSync('yarn',['build'],{cwd:path.join(root,'viewer'),stdio:'inherit'});
const urls=[
 ['pathtracer.js','https://cdn.jsdelivr.net/npm/three-gpu-pathtracer@0.0.23/build/index.module.js'],
 ['bvh.js','https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.7.4/build/index.module.js'],
 ['draco-encoder.js','https://cdn.jsdelivr.net/gh/google/draco@1.5.7/javascript/draco_encoder.js'],
 ['pathtracer-LICENSE','https://cdn.jsdelivr.net/npm/three-gpu-pathtracer@0.0.23/LICENSE'],
 ['bvh-LICENSE','https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.7.4/LICENSE'],
 ['draco-LICENSE','https://cdn.jsdelivr.net/gh/google/draco@1.5.7/LICENSE'],
];
for(const name of ['draco_decoder.js','draco_decoder.wasm','draco_wasm_wrapper.js']) urls.push([name,`https://unpkg.com/three@0.176.0/examples/jsm/libs/draco/gltf/${name}`]);
for(const name of ['basis_transcoder.js','basis_transcoder.wasm']) urls.push([name,`https://unpkg.com/three@0.176.0/examples/jsm/libs/basis/${name}`]);
await fs.mkdir(path.join(root,'vendor'),{recursive:true});
const expected=JSON.parse(await fs.readFile(new URL('./resources.json',import.meta.url),'utf8'));
if(expected) for(const r of expected) if(!urls.some(u=>u[1]===r.url)) urls.push([r.file,r.url]);
const resources=[];
for(const [file,url] of urls){
 const target=path.join(root,'vendor',file);let data;
 try{data=await fs.readFile(target);}catch{const r=await fetch(url);if(!r.ok)throw Error(`${r.status}: ${url}`);data=Buffer.from(await r.arrayBuffer());await fs.writeFile(target,data,{flag:'wx'});}
 const row={file,url,sha256:sha(data),bytes:data.length};
 if(expected&&!expected.some(r=>r.url===url&&r.sha256===row.sha256))throw Error(`Resource hash mismatch: ${url}`);
 resources.push(row);
}
const asset=await fs.readFile(path.join(root,'editor/examples/models/gltf/RobotExpressive/RobotExpressive.glb'));
if(sha(asset)!=='047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319') throw Error('RobotExpressive hash mismatch');
await fs.writeFile(path.join(root,'resources.json'),JSON.stringify(resources,null,2)+'\n');
const files={};
for(const [key,file] of Object.entries({viewerLock:'viewer/yarn.lock',viewerPackage:'viewer/package.json',editorBuild:'editor/build/three.module.js',editorCore:'editor/build/three.core.js',editorPackage:'editor/package.json',asset:'editor/examples/models/gltf/RobotExpressive/RobotExpressive.glb'}))files[key]={file,sha256:sha(await fs.readFile(path.join(root,file)))};
await fs.writeFile(path.join(root,'inputs.json'),JSON.stringify({sources:pins,node:process.version,yarn:'1.22.22',files,resources,scope:'Original upstream apps. No engine candidate; no timings/profiles.'},null,2)+'\n');
console.log('Prepared pinned application inputs:',root);
