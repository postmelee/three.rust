import { browserPath } from '../scripts/browser-path.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {hardwareRenderer} from '../bench/config.mjs';
const browser=await chromium.launch({executablePath:browserPath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage();const renderer=await page.evaluate(()=>{const gl=document.createElement('canvas').getContext('webgl2');if(!gl)throw Error('WebGL2 unavailable');const ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null;});
 assert.match(renderer,/SwiftShader/i);assert.throws(()=>hardwareRenderer(renderer),/software renderer/);
 mkdirSync('work/gpu-guard',{recursive:true});writeFileSync('work/gpu-guard/result.json',JSON.stringify({passed:true,renderer,check:'Actual SwiftShader renderer rejected by hardware guard; no hardware run performed'},null,2));console.log('Actual SwiftShader rejected:',renderer);
}finally{await browser.close();}
