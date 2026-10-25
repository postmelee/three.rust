import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
export const hash=b=>createHash('sha256').update(b).digest('hex');
export async function openRun(rootArg,outArg,options={}){
 const root=path.resolve(rootArg),out=path.resolve(outArg);
 await fs.mkdir(out,{recursive:false}); // Refuse overwriting any prior run.
 const resources=JSON.parse(await fs.readFile(new URL('./resources.json',import.meta.url)));
 for(const r of resources)if(hash(await fs.readFile(path.join(root,'vendor',r.file)))!==r.sha256)throw Error(`Bad resource ${r.file}`);
 const requests=[],errors=[],served=new Map();
 for(const [app,sha] of [['viewer','b5ee5dafe27f953ae1b55f42b5fa3697fef08683'],['editor','9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8']]){
  if(execFileSync('git',['rev-parse','HEAD'],{cwd:path.join(root,app),encoding:'utf8'}).trim()!==sha)throw Error('Wrong app source SHA');
  if(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:path.join(root,app),encoding:'utf8'}).trim())throw Error('Modified upstream source');
 }
 const server=http.createServer(async(req,res)=>{try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=path.resolve(root,'.'+(pathname.startsWith('/assets/') ? '/viewer/dist'+pathname : pathname));if(!file.startsWith(root+path.sep))throw Error('outside root');
  if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');
  const data=await fs.readFile(file);const ext=path.extname(file);served.set(path.relative(root,file),{file:path.relative(root,file),sha256:hash(data),bytes:data.length});
  res.writeHead(200,{'content-type':({'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.svg':'image/svg+xml','.glb':'model/gltf-binary','.ico':'image/x-icon'}[ext]||'application/octet-stream'),'cache-control':'no-store'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const origin=`http://127.0.0.1:${server.address().port}`;
 const executablePath=process.env.RTHREE_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
 let browser;
 try{browser=await chromium.launch({executablePath,headless:false});}catch(e){server.close();throw e;}
 const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,colorScheme:'light',locale:'en-US',serviceWorkers:'block'});
 await context.route('**/*',async route=>{
  const url=route.request().url();
  if(url.startsWith(origin+'/'))return route.continue();
  const normalized=url.replace('three@0.176.x/','three@0.176.0/');
  const r=resources.find(r=>r.url===normalized);
  if(r){requests.push({url,sha256:r.sha256,mirrored:true});return route.fulfill({path:path.join(root,'vendor',r.file),contentType:({'.wasm':'application/wasm','.css':'text/css','.ttf':'font/ttf','.woff2':'font/woff2'}[path.extname(r.file)]||'text/javascript'),headers:{'access-control-allow-origin':'*'}});}
  requests.push({url,blocked:true});await route.abort();
 });
 context.setDefaultTimeout(20000);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`HTTP ${r.status()} ${r.url().replace(origin,'<origin>')}`);});
 const save=async(name,data)=>fs.writeFile(path.join(out,name),typeof data==='string'?data:JSON.stringify(data,null,2)+'\n');
 await save('environment.json',{browser:browser.version(),executablePath,toolingSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),toolingDirty:!!execFileSync('git',['status','--porcelain','--untracked-files=normal'],{encoding:'utf8'}).trim(),headed:true,viewport:{width:1280,height:720},dpr:1,mode:options.mode||'correctness only; no profiles, timers or frame samples'});
 return {root,out,origin,page,context,save,requests,errors,async close(){await save('served-files.json',[...served.values()].sort((a,b)=>a.file.localeCompare(b.file)));await save('network.json',requests);await save('errors.json',errors);await browser.close();await new Promise(r=>server.close(r));}};
}
export async function gpu(page,selector){
 return page.locator(selector).first().evaluate(canvas=>{const gl=canvas.getContext('webgl2');if(!gl)throw Error('WebGL2 unavailable');const ext=gl.getExtension('WEBGL_debug_renderer_info');const renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'';if(!/Apple|AMD|Intel|NVIDIA/i.test(renderer)||/SwiftShader|llvmpipe|software/i.test(renderer))throw Error(`Not qualified hardware: ${renderer}`);return {renderer,vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):'',attributes:gl.getContextAttributes(),width:canvas.width,height:canvas.height,dpr:devicePixelRatio};});
}
