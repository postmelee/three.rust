import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {openRun,parseRunOptions,gpu,hash} from './candidate-browser.mjs';
const options=parseRunOptions(process.argv.slice(4),'editor');
const r=await openRun(process.argv[2],process.argv[3],options);
const route={engine:options.engine,app:options.app,candidateSha:r.candidateSha};
const checks=[],inputs=[],refs=new Map();
function pass(name,detail={}){checks.push({name,...detail});console.log(name);}
const settle=()=>r.page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function drag(from,to,label){inputs.push({label,from,to,steps:12});await r.page.mouse.move(from.x,from.y);await r.page.mouse.down();await r.page.mouse.move(to.x,to.y,{steps:12});await r.page.mouse.up();await settle();}
async function key(key){inputs.push({key});await r.page.keyboard.press(key);await settle();}
async function fresh(){
 await r.page.goto('about:blank');const c=await r.context.newCDPSession(r.page);await c.send('Storage.clearDataForOrigin',{origin:r.origin,storageTypes:'all'});await c.detach();
 await r.page.goto(r.origin+'/editor/editor/');await r.page.waitForFunction(()=>window.editor&&document.querySelector('#viewport canvas'));
 await r.page.evaluate(()=>{editor.signals.rendererCreated.add(x=>window.__uiRenderer=x);const s=[...document.querySelectorAll('select')].find(s=>[...s.options].some(o=>o.value==='WebGLRenderer'));s.dispatchEvent(new Event('change'));window.__uiEvents=[];editor.signals.objectChanged.add(o=>__uiEvents.push({name:o.name,position:o.position.toArray(),world:o.matrixWorld.elements.slice()}));editor.signals.objectFocused.add(o=>__uiEvents.push({focus:o.name}));});
 await r.save('gpu.json',await gpu(r.page,'#viewport canvas'));await settle();
}
async function state(){return r.page.evaluate(()=>{const names=['Left cube','Right cube'];return {objects:names.map(n=>{const o=editor.scene.getObjectByName(n);return {name:n,position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray(),matrix:o.matrixWorld.elements.slice()};}),selected:editor.selected?.name,selection:editor.selector.selection.map(o=>o.name),history:editor.history.undos.map(c=>c.type),camera:editor.camera.position.toArray()};});}
async function shot(name,repeat){
 await settle();
 const data=await r.page.evaluate(()=>{
  editor.signals.sceneGraphChanged.dispatch();
  const renderer=__uiRenderer,c=renderer.domElement,gl=renderer.getContext(),pixels=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  const numeric=[];editor.scene.traverse(o=>{numeric.push(...o.matrixWorld.elements);if(o.skeleton)numeric.push(...o.skeleton.boneMatrices);if(o.morphTargetInfluences)numeric.push(...o.morphTargetInfluences);});numeric.push(...editor.camera.matrixWorld.elements,...editor.camera.projectionMatrix.elements);
  const colors=new Set();for(let i=0;i<pixels.length;i+=4)colors.add(pixels[i]*65536+pixels[i+1]*256+pixels[i+2]);
  return {diagnostics:globalThis.THREE.diagnostics?.()??null,numeric,pixels:Array.from(pixels),colors:colors.size,png:c.toDataURL('image/png'),width:c.width,height:c.height,quality:{antialias:gl.getContextAttributes().antialias,toneMapping:renderer.toneMapping,exposure:renderer.toneMappingExposure,outputColorSpace:renderer.outputColorSpace,shadowEnabled:renderer.shadowMap.enabled,shadowType:renderer.shadowMap.type}};
 });
 const pixelSha256=hash(Buffer.from(data.pixels));delete data.pixels;await fs.writeFile(`${r.out}/${name}-${repeat}.png`,Buffer.from(data.png.split(',')[1],'base64'));delete data.png;data.pixelSha256=pixelSha256;
 if(options.engine!=='original'){assert.equal(data.diagnostics?.backend,options.engine,'Wrong candidate backend');if(options.engine==='prepared-wasm')assert(data.diagnostics.wasmActive&&data.diagnostics.wasmCalls>0,'Actual native execution required');}
 assert(data.colors>16,'blank/degenerate image');assert(data.numeric.every(Number.isFinite));await r.save(`${name}-${repeat}.json`,data);
 if(repeat===0)refs.set(name,data);else{assert.deepEqual(data.quality,refs.get(name).quality,name+' quality repeat');assert.deepEqual(data.numeric,refs.get(name).numeric,name+' numeric repeat');assert.equal(data.pixelSha256,refs.get(name).pixelSha256,name+' image repeat');pass(name+' exact reload A/A');}
 return data;
}
async function select(name){await r.page.locator('#outliner .option').filter({hasText:name}).first().click();await settle();assert.equal(await r.page.evaluate(()=>editor.selected?.name),name);inputs.push({select:name,via:'outliner click'});}
async function gizmo(mode,axis,repeat){
 await r.page.locator(`#toolbar img[title="${{translate:'Translate',rotate:'Rotate',scale:'Scale'}[mode]}"]`).click();await settle();
 // Read-only geometry/raycast inspection of the pinned helper finds an actual visible pointer hit.
 const hit=await r.page.evaluate(({mode,axis})=>{
  const c=editor.sceneHelpers.children.find(o=>o.controls?.isTransformControls)?.controls||editor.sceneHelpers.children.find(o=>o.controls)?.controls;
  if(!c||c.mode!==mode)throw Error('Missing current gizmo');
  const rect=document.querySelector('#viewport canvas').getBoundingClientRect();const p=c.object.getWorldPosition(new THREE.Vector3()).project(editor.camera),center={x:rect.x+(p.x+1)*rect.width/2,y:rect.y+(1-p.y)*rect.height/2};const ray=new THREE.Raycaster();let best;
  for(let dy=-100;dy<=100;dy+=3)for(let dx=-100;dx<=100;dx+=3){
   const d=Math.hypot(dx,dy);if(d<25||d>100)continue;const x=center.x+dx,y=center.y+dy;if(x<rect.x+10||x>rect.right-10||y<rect.y+10||y>rect.bottom-10)continue;
   ray.setFromCamera(new THREE.Vector2((x-rect.x)/rect.width*2-1,1-(y-rect.y)/rect.height*2),editor.camera);
   const h=ray.intersectObject(c._gizmo.picker[mode],true).find(h=>h.object.visible);
   if(h?.object.name===axis){const score=Math.abs(d-65);if(!best||score<best.score)best={x,y,score,center};}
  }
  if(!best)throw Error(`No visible ${mode}/${axis} handle hit`);return best;
 },{mode,axis});
 const before=await state();await r.page.mouse.move(hit.x,hit.y);assert.equal(await r.page.evaluate(()=>editor.sceneHelpers.children.find(o=>o.controls)?.controls.axis),axis,'pointer must hover actual requested handle');
 const delta=mode==='rotate'?{x:-(hit.y-hit.center.y)*0.4,y:(hit.x-hit.center.x)*0.4}:{x:38,y:-22};
 await drag(hit,{x:hit.x+delta.x,y:hit.y+delta.y},`${mode}/${axis}`);
 const after=await state();if(before.selection.length===2){const deltas=after.objects.map((o,i)=>o.position.map((v,k)=>v-before.objects[i].position[k]));for(let k=0;k<3;k++)assert(Math.abs(deltas[0][k]-deltas[1][k])<1e-12,'group translation preserves relative spacing');}assert.notDeepEqual(after.objects,before.objects,mode+' must change objects');assert(after.history.length>before.history.length,'pointer-up must add history');
 await key('Meta+z');const undone=await state();assert.deepEqual(undone.objects,before.objects,'undo restores entire transform');
 await key('Meta+Shift+z');const redone=await state();assert.deepEqual(redone.objects,after.objects,'redo restores pointer result');
 await r.save(`${mode}-${repeat}.json`,{hit,before,after,undone,redone});pass(`${mode} pointer gizmo + keyboard undo/redo ${repeat}`,{command:after.history.at(-1)});
 await key('Meta+z');
}
async function staticUI(repeat){
 await fresh();
 await r.page.evaluate(async()=>{const {AddObjectCommand}=await import('./js/commands/AddObjectCommand.js');for(const [name,x,color] of [['Left cube',-1,0x55aaff],['Right cube',1,0xffaa55]]){const o=new THREE.Mesh(new THREE.BoxGeometry(.8,.8,.8),new THREE.MeshStandardMaterial({color}));o.name=name;o.position.set(x,.4,0);o.castShadow=true;editor.execute(new AddObjectCommand(editor,o));}const ground=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshStandardMaterial({color:0x888888}));ground.name='Ground';ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;editor.execute(new AddObjectCommand(editor,ground));const light=new THREE.DirectionalLight(0xffffff,3);light.name='Key light';light.position.set(3,5,4);light.castShadow=true;editor.execute(new AddObjectCommand(editor,light));const fill=new THREE.AmbientLight(0xffffff,1);fill.name='Fill light';editor.execute(new AddObjectCommand(editor,fill));editor.camera.position.set(6,4,8);editor.camera.lookAt(0,.4,0);editor.camera.updateMatrixWorld(true);editor.signals.cameraChanged.dispatch();editor.signals.sceneGraphChanged.dispatch();});
 await select('Left cube');
 for(const [mode,axis] of [['translate','X'],['rotate','Z'],['scale','X']])await gizmo(mode,axis,repeat);
 await r.page.locator('#outliner .option').filter({hasText:'Right cube'}).first().click({modifiers:['Shift']});await settle();assert.deepEqual((await state()).selection.sort(),['Left cube','Right cube']);
 await gizmo('translate','X',repeat+'-group');pass('multi-selection pointer transform '+repeat);
 await select('Left cube');const before=await state();await key('f');const focused=await state();assert.notDeepEqual(focused.camera,before.camera);assert.deepEqual(focused.objects,before.objects);assert((await r.page.evaluate(()=>__uiEvents)).some(e=>e.focus==='Left cube'));pass('keyboard focus preserves objects '+repeat);
 await shot('focused-static',repeat);
 // Double-click a separate outliner object exercises the native focus path too.
 await r.page.locator('#outliner .option').filter({hasText:'Right cube'}).first().dblclick();await settle();const doub=await state();assert.notDeepEqual(doub.camera,focused.camera);assert.deepEqual(doub.objects,before.objects);pass('outliner double-click focus '+repeat);
 const events=await r.page.evaluate(()=>__uiEvents);const transforms=events.filter(e=>['Left cube','Right cube'].includes(e.name));assert(transforms.length>0);for(const e of transforms)assert.deepEqual(e.world.slice(12,15),e.position,'synchronous objectChanged world read');pass('synchronous pointer world reads '+repeat,{events:transforms.length});await r.save(`static-events-${repeat}.json`,events);await r.page.screenshot({path:`${r.out}/static-ui-${repeat}.png`});
 await select('Key light');
 const intensity=r.page.getByText('Intensity',{exact:true}).locator('..').locator('input');await intensity.fill('1.5');await intensity.press('Enter');await settle();assert.equal(await r.page.evaluate(()=>editor.scene.getObjectByName('Key light').intensity),1.5);pass('light intensity sidebar '+repeat);
 const shadow=r.page.getByText('Shadow',{exact:true}).locator('..').locator('input[type=checkbox]').first();await shadow.uncheck();assert.equal(await r.page.evaluate(()=>editor.scene.getObjectByName('Key light').castShadow),false);await shadow.check();assert.equal(await r.page.evaluate(()=>editor.scene.getObjectByName('Key light').castShadow),true);pass('light cast-shadow sidebar '+repeat);
 const visible=r.page.getByText('Visible',{exact:true}).locator('..').locator('input[type=checkbox]');await visible.uncheck();assert.equal(await r.page.evaluate(()=>editor.scene.getObjectByName('Key light').visible),false);await visible.check();pass('light visibility sidebar '+repeat);
 await shot('light-controls',repeat);
}
async function actionState(){return r.page.evaluate(()=>{const model=editor.scene.getObjectByName('RobotExpressive.glb');const clip=model.animations.find(c=>c.name==='Walking');const a=editor.mixer.existingAction(clip,model);return {time:a?.time,paused:a?.paused,running:a?.isRunning(),enabled:a?.enabled,timeScale:editor.mixer.timeScale,duration:clip.duration,active:editor.mixer.stats.actions.inUse};});}
async function timelineUI(repeat){
 await fresh();
 await r.page.locator('#menubar .menu').filter({has:r.page.getByText('File',{exact:true})}).hover();
 const [chooser]=await Promise.all([r.page.waitForEvent('filechooser'),r.page.getByText('Import',{exact:true}).click()]);
 await chooser.setFiles(r.root+'/editor/examples/models/gltf/RobotExpressive/RobotExpressive.glb');await r.page.locator('.Dialog').getByRole('button',{name:'OK',exact:true}).click();await r.page.waitForFunction(()=>editor.scene.children.some(o=>o.animations.length===14));
 await select('RobotExpressive.glb');await key('f');
 const box=await r.page.locator('#animation-resizer').boundingBox();await drag({x:box.x+box.width/2,y:box.y+box.height/2},{x:box.x+box.width/2,y:box.y+box.height/2-270},'expand timeline');
 await r.page.locator('#animation').getByText('Walking',{exact:true}).click();
 assert.equal((await actionState()).running,false,'clip selection must not autoplay');
 const buttons=r.page.locator('#animation button');await buttons.nth(0).click();await r.page.waitForFunction(()=>{const m=editor.scene.getObjectByName('RobotExpressive.glb');return editor.mixer.existingAction(m.animations.find(c=>c.name==='Walking'),m)?.time>0.05;});await buttons.nth(1).click();
 const paused=await actionState();assert(paused.paused);await settle();assert.equal((await actionState()).time,paused.time);pass('timeline play/pause '+repeat);
 await buttons.nth(0).click();await r.page.waitForFunction(t=>{const m=editor.scene.getObjectByName('RobotExpressive.glb');return editor.mixer.existingAction(m.animations.find(c=>c.name==='Walking'),m).time!==t;},paused.time);await buttons.nth(1).click();pass('timeline resume '+repeat);
 const speed=r.page.locator('#animation input');await speed.fill('0.5');await speed.press('Enter');assert.equal((await actionState()).timeScale,.5);await speed.fill('1');await speed.press('Enter');pass('timeline time-scale UI '+repeat);
 // Scrub a track row: a clip header also selects/toggles the clip on click.
 const track=r.page.locator('#animation div[title$=".quaternion"]').first();await track.scrollIntoViewIfNeeded();
 const row=await track.boundingBox(),area=await r.page.locator('#animation > div').nth(1).boundingBox();
 const poses=[];
 for(const fraction of [.25,.75]){
  const x=area.x+150+(area.width-150)*fraction,y=row.y+row.height/2;
  await drag({x:area.x+150+(area.width-150)*.1,y},{x,y},'timeline scrub '+fraction);
  const s=await actionState();assert(s.paused);assert(Math.abs(s.time-s.duration*fraction)<.01,'scrub time must match pointer fraction');await r.save(`timeline-${fraction}-${repeat}.json`,s);poses.push(await shot(`timeline-${fraction}`,repeat));
 }
 assert.notDeepEqual(poses[0].numeric,poses[1].numeric,'scrubbing changes numeric pose');assert.notEqual(poses[0].pixelSha256,poses[1].pixelSha256,'scrubbing changes rendered pose');
 pass('timeline pointer scrubbing '+repeat);
 await buttons.nth(2).click();const stopped=await actionState();assert.equal(stopped.running,false);assert.equal(stopped.time,0);pass('timeline stop '+repeat);
 await buttons.nth(0).click();await r.page.waitForFunction(()=>{const m=editor.scene.getObjectByName('RobotExpressive.glb');return editor.mixer.existingAction(m.animations.find(c=>c.name==='Walking'),m).time>0;});await buttons.nth(1).click();pass('timeline restart after stop '+repeat);
 await r.page.locator('#animation').getByText('Idle',{exact:true}).click();assert.equal((await actionState()).running,false);assert.equal((await actionState()).time,0);const idle=()=>r.page.evaluate(()=>{const m=editor.scene.getObjectByName('RobotExpressive.glb'),a=editor.mixer.existingAction(m.animations.find(c=>c.name==='Idle'),m);return {running:a.isRunning(),paused:a.paused,time:a.time};});assert.equal((await idle()).running,false);await buttons.nth(0).click();await r.page.waitForFunction(()=>{const m=editor.scene.getObjectByName('RobotExpressive.glb');return editor.mixer.existingAction(m.animations.find(c=>c.name==='Idle'),m).time>0;});await buttons.nth(1).click();assert((await idle()).paused);pass('timeline clip switch stops previous without autoplay '+repeat);
 await r.page.screenshot({path:`${r.out}/timeline-ui-${repeat}.png`});await r.save(`timeline-state-${repeat}.json`,{paused,stopped,final:await actionState()});
}
try{for(let repeat=0;repeat<2;repeat++){await staticUI(repeat);await timelineUI(repeat);}await r.close();assert.deepEqual(r.errors,[]);assert(!r.requests.some(x=>x.blocked));await r.save('result.json',{status:'passed',...route,scope:options.engine==='original'?'Native UI correctness only; no timing/profile/engine candidate':'Candidate native UI correctness with within-route reload A/A; no cross-engine equivalence or performance qualification',checks,inputs});}
catch(e){await r.save('result.json',{status:'failed',...route,error:String(e),checks,inputs});await r.save('failure-dom.txt',await r.page.locator('body').innerText().catch(()=>''));await r.page.screenshot({path:r.out+'/failure.png'}).catch(()=>{});throw e;}
finally{await r.close();}
