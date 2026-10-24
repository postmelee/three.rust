import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {openRun,gpu} from './browser.mjs';
const args=Object.fromEntries(process.argv.slice(4).map(s=>s.split('=')));
const cases=(args.cases||'V1-play,V1-paused,E1-edit,E1-idle,E2-selected,E2-unselected,E2-no-shadow,E2-highres').split(',');
const seconds=Number(args.seconds||12),repeats=Number(args.repeats||2);
assert(seconds>0&&seconds<=60&&repeats>0&&repeats<=4);
const r=await openRun(process.argv[2],process.argv[3],{mode:'Original-app CPU profiling; sampling and instance diagnostics; NOT primary timing'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const inputs=[],completed=[];
assert(cases.every(c=>['V1-play','V1-paused','E1-edit','E1-idle','E2-selected','E2-unselected','E2-no-shadow','E2-highres'].includes(c)),'Unknown scenario');
async function fresh(){await r.page.goto('about:blank');const c=await r.context.newCDPSession(r.page);await c.send('Storage.clearDataForOrigin',{origin:r.origin,storageTypes:'all'});await c.detach();}
async function prepare(id){
 await fresh();
 if(id.startsWith('V1')){
  await r.page.goto(r.origin+'/viewer/dist/');await r.page.waitForFunction(()=>window.VIEWER?.app);
  await r.page.locator('#file-input').setInputFiles(r.root+'/editor/examples/models/gltf/RobotExpressive/RobotExpressive.glb');await r.page.waitForFunction(()=>VIEWER.app.viewer?.clips.length===14);
  await r.page.getByText('Animation',{exact:true}).click();const ctrl=n=>r.page.getByText(n,{exact:true}).locator('..').locator('input');await ctrl('1. Dance').uncheck();await ctrl('11. Walking').check();if(id==='V1-paused'){await ctrl('playbackSpeed').fill('0');await ctrl('playbackSpeed').press('Enter');}
  await r.page.evaluate(()=>{const v=VIEWER.app.viewer;window.__profileApp={renderer:v.renderer,mixer:v.mixer,root:v.scene,camera:v.activeCamera,controls:v.controls};});
 }else{
  await r.page.goto(r.origin+'/editor/editor/');await r.page.waitForFunction(()=>window.editor&&document.querySelector('#viewport canvas'));
  await r.page.evaluate(()=>{editor.signals.rendererCreated.add(renderer=>window.__profileRenderer=renderer);const s=[...document.querySelectorAll('select')].find(s=>[...s.options].some(o=>o.value==='WebGLRenderer'));s.dispatchEvent(new Event('change'));});
  if(id.startsWith('E2')){
   await r.page.evaluate(async()=>{const data=await(await fetch('../examples/models/gltf/RobotExpressive/RobotExpressive.glb')).arrayBuffer();editor.loader.loadFiles([new File([data],'RobotExpressive.glb',{type:'model/gltf-binary'})]);});await r.page.locator('.Dialog').getByRole('button',{name:'OK',exact:true}).click();await r.page.waitForFunction(()=>editor.scene.children.some(o=>o.animations.length===14));
  }
  await r.page.evaluate(async id=>{
   const {AddObjectCommand}=await import('./js/commands/AddObjectCommand.js');
   let model,center=new THREE.Vector3(0,.4,0),groundY=0;
   if(id.startsWith('E1')){
    for(const [name,x,color] of [['Left cube',-1,0x55aaff],['Right cube',1,0xffaa55]]){const o=new THREE.Mesh(new THREE.BoxGeometry(.8,.8,.8),new THREE.MeshStandardMaterial({color}));o.name=name;o.position.set(x,.4,0);o.castShadow=true;editor.execute(new AddObjectCommand(editor,o));}
   }else{model=editor.scene.children.find(o=>o.animations.length===14);model.name='RobotExpressive';model.traverse(o=>{if(o.isMesh)o.castShadow=true;});const b=new THREE.Box3().setFromObject(model,true);b.getCenter(center);groundY=b.min.y;}
   const ground=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshStandardMaterial({color:0xaaaaaa}));ground.name='Ground';ground.rotation.x=-Math.PI/2;ground.position.y=groundY;ground.receiveShadow=true;editor.execute(new AddObjectCommand(editor,ground));
   const light=new THREE.DirectionalLight(0xffffff,3);light.name='Key light';light.position.set(4,8,5);light.castShadow=id!=='E2-no-shadow';light.shadow.mapSize.set(id==='E2-highres'?2048:1024,id==='E2-highres'?2048:1024);Object.assign(light.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:30});editor.execute(new AddObjectCommand(editor,light));editor.execute(new AddObjectCommand(editor,new THREE.AmbientLight(0xffffff,1)));
   editor.camera.position.set(5,3.5,7);editor.camera.lookAt(center);editor.camera.updateMatrixWorld(true);
   if(model){let selected;model.traverse(o=>{if(!selected&&o.isSkinnedMesh)selected=o;});if(id==='E2-selected')editor.select(selected);else editor.deselect();editor.mixer.clipAction(model.animations.find(c=>c.name==='Walking'),model).play();}else editor.deselect();
   if(id==='E2-highres')__profileRenderer.setPixelRatio(2);
   window.__profileApp={renderer:__profileRenderer,mixer:editor.mixer,root:editor.scene,camera:editor.viewportCamera};editor.signals.sceneGraphChanged.dispatch();
  },id);
  if(id==='E1-edit'){await r.page.locator('#outliner .option').filter({hasText:'Left cube'}).first().click();await r.page.locator('#toolbar img[title="Translate"]').click();}
 }
 await r.page.bringToFront();if(id==='E1-edit')await editCycle('warmup');await sleep(2000);
 const g=await gpu(r.page,id.startsWith('V1')?'.viewer canvas':'#viewport canvas');
 const state=await observe();assert.equal(state.visibility,'visible');assert(state.finite);assert(state.meshes>0);return {gpu:g,state};
}
async function observe(){return r.page.evaluate(()=>{const a=__profileApp;let objects=0,meshes=0,skins=0,morphs=0,finite=true;const skeletons=new Set();a.root.traverse(o=>{objects++;meshes+=!!o.isMesh;skins+=!!o.isSkinnedMesh;morphs+=!!o.morphTargetInfluences;finite&&=o.matrixWorld.elements.every(Number.isFinite);if(o.skeleton)skeletons.add(o.skeleton);});return {now:performance.now(),renderPasses:a.renderer.info.render.frame,mixerTime:a.mixer?.time,objects,meshes,skins,morphs,skeletons:skeletons.size,bonesPerSkeleton:[...skeletons].map(s=>s.bones.length),selectedVertices:window.editor?.selected?.geometry?.attributes.position.count||0,finite,visibility:document.visibilityState,focus:document.hasFocus(),selected:window.editor?.selected?.type||null,drawsLastPass:{...a.renderer.info.render},programs:a.renderer.info.programs.length,canvas:{width:a.renderer.domElement.width,height:a.renderer.domElement.height},quality:{pixelRatio:a.renderer.getPixelRatio(),toneMapping:a.renderer.toneMapping,exposure:a.renderer.toneMappingExposure,shadowType:a.renderer.shadowMap.type}};});}
async function editCycle(label){
 await r.page.locator('#outliner .option').filter({hasText:'Right cube'}).first().click();
 const point=await r.page.evaluate(()=>{const o=editor.scene.getObjectByName('Left cube'),rect=document.querySelector('#viewport canvas').getBoundingClientRect(),p=o.getWorldPosition(new THREE.Vector3()).project(editor.camera);return {x:rect.x+(p.x+1)*rect.width/2,y:rect.y+(1-p.y)*rect.height/2};});
 await r.page.mouse.click(point.x,point.y);await r.page.waitForFunction(()=>editor.selected?.name==='Left cube');
 const hit=await r.page.evaluate(()=>{const c=editor.sceneHelpers.children.find(o=>o.controls)?.controls,rect=document.querySelector('#viewport canvas').getBoundingClientRect(),p=c.object.getWorldPosition(new THREE.Vector3()).project(editor.camera),x0=rect.x+(p.x+1)*rect.width/2,y0=rect.y+(1-p.y)*rect.height/2,ray=new THREE.Raycaster();for(let dy=-70;dy<=70;dy+=3)for(let dx=-70;dx<=70;dx+=3){if(Math.hypot(dx,dy)<30)continue;const x=x0+dx,y=y0+dy;ray.setFromCamera(new THREE.Vector2((x-rect.x)/rect.width*2-1,1-(y-rect.y)/rect.height*2),editor.camera);if(ray.intersectObject(c._gizmo.picker.translate,true).find(h=>h.object.visible)?.object.name==='X')return{x,y};}throw Error('No translate X hit');});
 await r.page.mouse.move(hit.x,hit.y);await r.page.mouse.down();await r.page.mouse.move(hit.x+25,hit.y-12,{steps:6});await r.page.mouse.up();await r.page.keyboard.press('Meta+z');await r.page.keyboard.press('f');inputs.push({label,pick:point,drag:{from:hit,to:{x:hit.x+25,y:hit.y-12},steps:6},keys:['Meta+z','f']});
}
async function windowRun(id,label,ms){const before=await observe();if(id==='E1-edit'){const end=Date.now()+ms;while(Date.now()<end){await editCycle(label);await sleep(150);}}else await sleep(ms);return {before,after:await observe()};}
async function diagnosticOracle(){
 await r.page.evaluate(()=>{__profileApp.mixer.timeScale=0;__profileApp.mixer.update(0);});await r.page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const capture=()=>r.page.evaluate(async()=>{const a=__profileApp;a.renderer.render(a.root,a.camera);const gl=a.renderer.getContext(),c=a.renderer.domElement,p=new Uint8Array(c.width*c.height*4),numeric=[];gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,p);a.root.traverse(o=>{numeric.push(...o.matrixWorld.elements);if(o.skeleton)numeric.push(...o.skeleton.boneMatrices);if(o.morphTargetInfluences)numeric.push(...o.morphTargetInfluences);});const digest=await crypto.subtle.digest('SHA-256',p);return {pixelSha256:[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join(''),numeric};});
 const before=await capture(),records=[];for(const mode of ['boundaries','gl']){await installDiagnostics(mode);const during=await capture();const restored=await r.page.evaluate(()=>__diagnostics.stop());assert.deepEqual(during.numeric,before.numeric,'wrapper numeric oracle');assert.equal(during.pixelSha256,before.pixelSha256,'wrapper pixel oracle');records.push({mode,restored:restored.restored,pixelSha256:during.pixelSha256,numericValues:during.numeric.length});}return {checks:records,numeric:before.numeric,pixelSha256:before.pixelSha256};
}
async function installDiagnostics(mode){return r.page.evaluate(mode=>{
 const a=__profileApp,restore=[],records={},counts={},targets=[];
 function wrap(o,k,label,timed=true){if(!o||typeof o[k]!=='function')return;targets.push({label,type:o.constructor.name,name:o.name||null});const desc=Object.getOwnPropertyDescriptor(o,k),f=o[k];o[k]=function(...args){if(!timed){const c=counts[label]??={calls:0,arrayArgumentBytes:0};c.calls++;for(const v of args)if(ArrayBuffer.isView(v))c.arrayArgumentBytes+=v.byteLength;return Reflect.apply(f,this,args);}const start=performance.now();try{return Reflect.apply(f,this,args);}finally{(records[label]??=[]).push(performance.now()-start);}};restore.push(()=>{if(desc)Object.defineProperty(o,k,desc);else delete o[k];if(o[k]!==f)throw Error('Restoration failed: '+label);});}
 if(mode==='boundaries'){
  wrap(a.renderer,'render','renderer.render');wrap(a.renderer,'renderBufferDirect','renderer.renderBufferDirect');wrap(a.mixer,'update','mixer.update');wrap(a.controls,'update','controls.update');wrap(a.root,'updateMatrixWorld','scene.updateMatrixWorld');
  const sk=new Set();a.root.traverse(o=>{if(o.skeleton)sk.add(o.skeleton);});for(const s of sk)wrap(s,'update','skeleton.update');
  if(window.editor){wrap(editor.selected,'updateWorldMatrix','selected.updateWorldMatrix');const box=editor.sceneHelpers.children.find(o=>o.type==='Box3Helper')?.box;wrap(box,'setFromObject','selectionBox.setFromObject');wrap(editor.signals.objectChanged,'dispatch','signals.objectChanged');wrap(editor.signals.morphTargetsUpdated,'dispatch','signals.morphTargetsUpdated');}
 }else{
  const gl=a.renderer.getContext();for(const k of ['uniformMatrix4fv','uniformMatrix3fv','bufferData','bufferSubData','texImage2D','texSubImage2D','drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced'])wrap(gl,k,k,false);
 }
 window.__diagnostics={mode,records,counts,stop(){for(const fn of restore.reverse())fn();return{mode,records,counts,restored:true};}};return {mode,hooks:restore.length,targets};
 },mode);}
try{
 const power=execFileSync('pmset',['-g','batt'],{encoding:'utf8'}).split('\n')[0];assert(power.includes('AC Power'),'Profiling requires AC power');
 await r.save('protocol.json',{cases,repeats,seconds,samplingIntervalUs:1000,warmupSeconds:2,observationSeconds:2,boundarySeconds:3,glCounterSeconds:2,power,scope:'Sampling profiles and diagnostic observations only. No primary timing or GPU elapsed measurement.',externalActivity:'Not controlled; no other builds or heavy agent work run during capture.'});
 for(let repeat=0;repeat<repeats;repeat++)for(const id of repeat%2?[...cases].reverse():cases){
  const name=`${id}-${repeat}`;console.log('start',name);const preflight=await prepare(id);await r.save(name+'-preflight.json',preflight);
  const before=await windowRun(id,name+'-before',2000);
  const c=await r.context.newCDPSession(r.page);await c.send('Profiler.enable');await c.send('Profiler.setSamplingInterval',{interval:1000});await c.send('Profiler.start');const during=await windowRun(id,name+'-sample',seconds*1000);const {profile}=await c.send('Profiler.stop');await c.send('Profiler.disable');await c.detach();
  for(const n of profile.nodes)n.callFrame.url=n.callFrame.url.replace(r.origin,'<origin>');await r.save(name+'.cpuprofile',profile);
  const after=await windowRun(id,name+'-after',2000);
  const diagnostics=[];for(const mode of ['boundaries','gl']){const hooks=await installDiagnostics(mode);const observations=await windowRun(id,name+'-'+mode,mode==='boundaries'?3000:2000);const data=await r.page.evaluate(()=>__diagnostics.stop());diagnostics.push({...hooks,...data,observations});}
  const final=await observe();assert(final.finite);assert.equal(final.visibility,'visible');if(id==='E1-idle')assert.equal(during.after.renderPasses,during.before.renderPasses);
  if(id==='E1-edit')assert.deepEqual(await r.page.evaluate(()=>editor.scene.getObjectByName('Left cube').position.toArray()),[-1,.4,0]);
  await r.page.screenshot({path:`${r.out}/${name}.png`});const oracle=await diagnosticOracle();await r.save(name+'-observations.json',{before,during,after,diagnostics,final,oracle});completed.push(name);console.log('done',name);
 }
 assert.deepEqual(r.errors,[]);assert(!r.requests.some(x=>x.blocked));await r.save('result.json',{status:'passed',completed,inputs});
}catch(e){await r.save('result.json',{status:'failed',error:String(e),completed,inputs});await r.page.screenshot({path:r.out+'/failure.png'}).catch(()=>{});throw e;}finally{await r.close();}
