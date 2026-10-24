import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
export function serve(port=4173,{isolated=false}={}){return new Promise(resolve=>{const server=http.createServer(async(req,res)=>{
 if(isolated){res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');}
 try{const u=new URL(req.url,'http://localhost');let p=decodeURIComponent(u.pathname);if(p==='/')p='/demo/index.html';
 const f=path.resolve('.','.'+p);if(!f.startsWith(process.cwd()+path.sep))throw Error('path');
 let data=await readFile(f);if(p.endsWith('.html')){const engine=u.searchParams.get('engine')||'original';
 if(engine!=='original')data=Buffer.from(data.toString().replaceAll('/node_modules/three/build/three.module.js',`/packages/rthree/${engine==='js'?'js':engine==='packed-js'?'packed-js':engine==='facade-wasm'?'facade':engine==='facade-js'?'facade-js':engine==='prepared-wasm'?'prepared':engine==='prepared-js'?'prepared-js':'index'}.js`).replaceAll('/node_modules/three/examples/jsm/','/packages/rthree/addons/'));
 }
 const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.svg':'image/svg+xml','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary'};
 res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
 }catch(e){res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>resolve(server));});}
if(process.argv[1]===new URL(import.meta.url).pathname){await serve();console.log('http://127.0.0.1:4173');}
