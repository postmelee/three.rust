import { browserPath } from './browser-path.mjs';
import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:browserPath(),headless:true,args:['--no-sandbox']});
try{const page=await browser.newPage();const info=await page.evaluate(()=>{const gl=document.createElement('canvas').getContext('webgl2');if(!gl)return {webgl2:false};const ext=gl.getExtension('WEBGL_debug_renderer_info');return {webgl2:true,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR)};});writeFileSync('bench/results/m0/unforced-gpu-probe.json',JSON.stringify({browser:browser.version(),args:['--no-sandbox'],...info},null,2));console.log(info);}finally{await browser.close();}
