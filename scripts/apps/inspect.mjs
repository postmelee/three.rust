import {openRun,gpu} from './browser.mjs';
const r=await openRun(process.argv[2],process.argv[3]);
try{
 console.log('navigate');await r.page.goto(r.origin+'/viewer/dist/');
 await r.page.locator('#file-input').setInputFiles(r.root+'/editor/examples/models/gltf/RobotExpressive/RobotExpressive.glb');
 console.log('wait ready');await r.page.waitForFunction(()=>window.VIEWER?.app?.viewer?.clips?.length===14);
 await r.save('viewer-gpu.json',await gpu(r.page,'.viewer canvas'));
 await r.page.screenshot({path:r.out+'/viewer-native.png'});
 await r.save('viewer-ui.txt',await r.page.locator('body').innerText());
 console.log('navigate');await r.page.goto(r.origin+'/editor/editor/');
 console.log('wait ready');await r.page.waitForFunction(()=>window.editor&&document.querySelector('#viewport canvas'));
 await r.save('editor-gpu.json',await gpu(r.page,'#viewport canvas'));
 await r.page.screenshot({path:r.out+'/editor-native.png'});
 await r.save('editor-ui.txt',await r.page.locator('body').innerText());
 if(r.errors.length||r.requests.some(r=>r.blocked))throw Error('Resource or page errors');
}finally{await r.close();}
