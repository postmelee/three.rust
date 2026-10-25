import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {openRun,gpu,hash} from './browser.mjs';
const r=await openRun(process.argv[2],process.argv[3]);
const checks=[],references=new Map(),actions=[];
const record=(name,details={})=>{checks.push({name,pass:true,...details});console.log(name);};
async function capture(name,app,repeat){
 const data=await r.page.evaluate(async app=>{
  const viewer=window.VIEWER?.app?.viewer;
  const renderer=app==='viewer'?viewer.renderer:window.__referenceRenderer;
  const scene=app==='viewer'?viewer.scene:editor.scene;
  const camera=app==='viewer'?viewer.activeCamera:editor.viewportCamera;
  if(app==='viewer')viewer.render();else editor.signals.sceneGraphChanged.dispatch();
  const numeric=[],objects=[];
  scene.traverse(o=>{objects.push({name:o.name,type:o.type,visible:o.visible,castShadow:o.castShadow,receiveShadow:o.receiveShadow});numeric.push(...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray(),...o.matrix.elements,...o.matrixWorld.elements);if(o.skeleton)numeric.push(...o.skeleton.boneMatrices);if(o.morphTargetInfluences)numeric.push(...o.morphTargetInfluences);});
  numeric.push(...camera.matrixWorld.elements,...camera.projectionMatrix.elements);
  if(!numeric.every(Number.isFinite))throw Error('Nonfinite numeric output');
  const canvas=renderer.domElement,gl=renderer.getContext();
  const pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  const colors=new Set();for(let i=0;i<pixels.length;i+=4)colors.add(pixels[i]*65536+pixels[i+1]*256+pixels[i+2]);
  const png=canvas.toDataURL('image/png');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',pixels)),n=>n.toString(16).padStart(2,'0')).join('');
  return {numeric,objects,width:canvas.width,height:canvas.height,colors:colors.size,pixelSha256:digest,png,quality:{antialias:gl.getContextAttributes().antialias,toneMapping:renderer.toneMapping,exposure:renderer.toneMappingExposure,outputColorSpace:renderer.outputColorSpace,shadowEnabled:renderer.shadowMap.enabled,shadowType:renderer.shadowMap.type}};
 },app);
 const png=Buffer.from(data.png.split(',')[1],'base64');delete data.png;
 await fs.writeFile(`${r.out}/${name}-${repeat}.png`,png);await r.save(`${name}-${repeat}.json`,data);
 assert(data.colors>16,'blank/degenerate image');
 if(repeat===0)references.set(name,data);else{
  const a=references.get(name);assert.deepEqual(data.numeric,a.numeric,`${name}: numeric A/A mismatch`);assert.deepEqual(data.objects,a.objects,`${name}: object A/A mismatch`);assert.deepEqual(data.quality,a.quality);assert.equal(data.pixelSha256,a.pixelSha256,`${name}: pixel A/A mismatch`);
  record(name+' exact fixed-state A/A',{numericValues:data.numeric.length,pixelSha256:data.pixelSha256});
 }
 return data;
}
async function skinWeights(app,repeat){
 const weights=await r.page.evaluate(app=>{
  const root=app==='viewer'?VIEWER.app.viewer.content:editor.scene.getObjectByName('RobotExpressive');let vertices=0,maxSumError=0;const geometries=new Set();
  root.traverse(o=>{if(!o.isSkinnedMesh||geometries.has(o.geometry))return;geometries.add(o.geometry);const a=o.geometry.getAttribute('skinWeight');for(let i=0;i<a.count;i++){const sum=a.getX(i)+a.getY(i)+a.getZ(i)+a.getW(i);maxSumError=Math.max(maxSumError,Math.abs(sum-1));vertices++;}});
  return {vertices,geometries:geometries.size,maxSumError};
 },app);
 await r.save(`${app}-loaded-weights-${repeat}.json`,weights);
 assert(weights.vertices>0);assert(weights.maxSumError<=2e-7,'loaded weights must be normalized');
 record(`${app} upstream loader skin-weight normalization ${repeat}`,weights);
}
async function loadViewer(){
 await r.page.goto(r.origin+'/viewer/dist/');
 await r.page.waitForFunction(()=>window.VIEWER?.app);
 await r.page.locator('#file-input').setInputFiles(r.root+'/editor/examples/models/gltf/RobotExpressive/RobotExpressive.glb');
 await r.page.waitForFunction(()=>VIEWER.app.viewer?.clips.length===14);
 await r.page.waitForFunction(()=>VIEWER.app.validator.report!==null);
 await r.save('viewer-validator.json',await r.page.evaluate(()=>VIEWER.app.validator.report));
 await r.save('viewer-gpu.json',await gpu(r.page,'.viewer canvas'));
}
async function freezeViewer(time){await r.page.evaluate(t=>{const v=VIEWER.app.viewer;v.mixer.timeScale=1;v.mixer.setTime(t);v.mixer.timeScale=0;v.state.playbackSpeed=0;v.render();},time);}
async function viewer(repeat){
 await loadViewer();await skinWeights('viewer',repeat);
 const shape=await r.page.evaluate(()=>{const v=VIEWER.app.viewer;let skins=0,morphs=0;v.content.traverse(o=>{if(o.isSkinnedMesh)skins++;if(o.morphTargetInfluences)morphs++;});return {skins,morphs,clips:v.clips.map(c=>c.name)};});
 assert.equal(shape.morphs,3);assert.equal(shape.clips.length,14);assert(shape.skins>=2);await r.save(`viewer-shape-${repeat}.json`,shape);
 await r.page.getByText('Animation',{exact:true}).click();
 const ctrl=name=>r.page.getByText(name,{exact:true}).locator('..').locator('input');
 await ctrl('1. Dance').uncheck();await ctrl('11. Walking').check();
 await ctrl('playbackSpeed').fill('0.5');await ctrl('playbackSpeed').press('Enter');
 assert.equal(await r.page.evaluate(()=>VIEWER.app.viewer.mixer.timeScale),0.5);
 await ctrl('playbackSpeed').fill('0');await ctrl('playbackSpeed').press('Enter');
 assert.equal(await r.page.evaluate(()=>VIEWER.app.viewer.mixer.timeScale),0);
 await ctrl('playbackSpeed').fill('1');await ctrl('playbackSpeed').press('Enter');
 assert.equal(await r.page.evaluate(()=>VIEWER.app.viewer.mixer.timeScale),1);
 // Native clips also animate weights: stop Walking before testing persistent manual morph edits.
 await ctrl('11. Walking').uncheck();
 await r.page.getByText('Morph Targets',{exact:true}).click();
 const angry=r.page.getByText('Angry',{exact:true}).first().locator('..').locator('input');await angry.evaluate(input=>{input.value='0.65';input.dispatchEvent(new Event('change',{bubbles:true}));});
 const morph=await r.page.evaluate(()=>{let a=[];VIEWER.app.viewer.content.traverse(o=>{if(o.morphTargetInfluences)a.push(o.morphTargetInfluences[o.morphTargetDictionary.Angry]);});return a;});await r.save(`V1-manual-morph-${repeat}.json`,morph);assert(morph.some(n=>Math.abs(n-0.65)<1e-12));
 await capture('V1-static-manual-morph','viewer',repeat);
 const cameraBefore=await r.page.evaluate(()=>VIEWER.app.viewer.activeCamera.position.toArray());
 await r.page.mouse.move(400,300);await r.page.mouse.down();await r.page.mouse.move(480,340,{steps:8});await r.page.mouse.up();await r.page.mouse.wheel(0,100);
 await r.page.waitForFunction(before=>VIEWER.app.viewer.activeCamera.position.toArray().some((n,i)=>n!==before[i]),cameraBefore);
 record(`V1 native GUI clip/speed/pause/resume/morph/orbit ${repeat}`,shape);
 // Fixed-pose reference is explicitly a diagnostic adaptation, not native wall-clock playback.
 await r.page.evaluate(()=>{const v=VIEWER.app.viewer;v.controls.reset();v.mixer.stopAllAction();const clip=v.clips.find(c=>c.name.endsWith('. Walking'));v.mixer.clipAction(clip).reset().play();});
 await freezeViewer(0.75);
 await capture('V1-walking-morph','viewer',repeat);
 await r.page.screenshot({path:`${r.out}/V1-ui-${repeat}.png`});
 actions.push({scenario:'V1',repeat,inputs:['file-input RobotExpressive.glb','Dance unchecked','Walking checked','speed 0.5 -> 0 -> 1','Walking unchecked; atomic DOM change first Angry 0.65 (dat.gui listen refreshes text each rAF)','orbit (400,300)->(480,340), wheel 100'],reference:'controls.reset(); Walking at 0.75 seconds; mixer timeScale 0'});
}
async function loadEditor(){
 await r.page.goto('about:blank');
 const storage=await r.context.newCDPSession(r.page);await storage.send('Storage.clearDataForOrigin',{origin:r.origin,storageTypes:'all'});await storage.detach();
 await r.page.goto(r.origin+'/editor/editor/');await r.page.waitForFunction(()=>window.editor&&document.querySelector('#viewport canvas'));
 await r.page.evaluate(()=>{localStorage.clear();});
 await r.page.reload();await r.page.waitForFunction(()=>window.editor&&document.querySelector('#viewport canvas'));
 await r.page.evaluate(()=>{editor.signals.rendererCreated.add(renderer=>window.__referenceRenderer=renderer);const select=[...document.querySelectorAll('select')].find(s=>[...s.options].some(o=>o.value==='WebGLRenderer'));select.value='WebGLRenderer';select.dispatchEvent(new Event('change'));});
 await r.page.waitForFunction(()=>window.__referenceRenderer);
 await r.save('editor-gpu.json',await gpu(r.page,'#viewport canvas'));
}
async function editorStatic(repeat){
 await loadEditor();
 await r.page.evaluate(async()=>{
  const {AddObjectCommand}=await import('./js/commands/AddObjectCommand.js');
  for(const [name,x,color] of [['Left cube',-1,0x55aaff],['Right cube',1,0xffaa55]]){
   const o=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.8,0.8),new THREE.MeshStandardMaterial({color}));o.name=name;o.position.set(x,0.4,0);o.castShadow=true;editor.execute(new AddObjectCommand(editor,o));
  }
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshStandardMaterial({color:0x888888}));ground.name='Ground';ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;editor.execute(new AddObjectCommand(editor,ground));
  const light=new THREE.DirectionalLight(0xffffff,3);light.name='Key light';light.position.set(3,5,4);light.castShadow=true;light.shadow.mapSize.set(1024,1024);editor.execute(new AddObjectCommand(editor,light));
  const ambient=new THREE.AmbientLight(0xffffff,1);ambient.name='Fill light';editor.execute(new AddObjectCommand(editor,ambient));
  editor.camera.position.set(6,4,8);editor.camera.lookAt(0,0.4,0);editor.camera.updateMatrixWorld(true);editor.deselect();editor.signals.cameraChanged.dispatch();editor.signals.sceneGraphChanged.dispatch();
 });
 const point=async name=>r.page.evaluate(name=>{const o=editor.scene.getObjectByName(name),p=new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).project(editor.camera),rect=document.querySelector('#viewport canvas').getBoundingClientRect();return {x:rect.x+(p.x+1)*rect.width/2,y:rect.y+(1-p.y)*rect.height/2};},name);
 let p=await point('Left cube');await r.page.mouse.click(p.x,p.y);assert.equal(await r.page.evaluate(()=>editor.selected?.name),'Left cube');
 p=await point('Right cube');await r.page.keyboard.down('Shift');await r.page.mouse.click(p.x,p.y);await r.page.keyboard.up('Shift');
 assert.deepEqual(await r.page.evaluate(()=>editor.selector.selection.map(o=>o.name).sort()),['Left cube','Right cube']);
 record(`E1 pointer picking and shift selection ${repeat}`);
 const history=await r.page.evaluate(async()=>{
  const {SetPositionCommand}=await import('./js/commands/SetPositionCommand.js');const {SetRotationCommand}=await import('./js/commands/SetRotationCommand.js');
  const o=editor.scene.getObjectByName('Left cube');editor.select(o);const position=o.position,world=o.matrixWorld.elements;const events=[];
  const listen=x=>{if(x===o)events.push({position:x.position.toArray(),worldX:x.matrixWorld.elements[12]});};editor.signals.objectChanged.add(listen);
  editor.execute(new SetPositionCommand(editor,o,new THREE.Vector3(-1,1.2,0)));
  const moved=o.position.toArray();editor.undo();const undone=o.position.toArray();editor.redo();const redone=o.position.toArray();
  editor.execute(new SetRotationCommand(editor,o,new THREE.Euler(0,Math.PI/4,0)));const rotated=o.rotation.y;editor.undo();const undoRotation=o.rotation.y;editor.redo();const redoRotation=o.rotation.y;
  editor.signals.objectChanged.remove(listen);
  return {moved,undone,redone,rotated,undoRotation,redoRotation,events,identity:position===o.position&&world===o.matrixWorld.elements};
 });
 assert.deepEqual(history.moved,[-1,1.2,0]);assert.deepEqual(history.undone,[-1,0.4,0]);assert.deepEqual(history.redone,history.moved);assert.equal(history.rotated,Math.PI/4);assert.equal(history.undoRotation,0);assert.equal(history.redoRotation,Math.PI/4);assert(history.identity);assert(history.events.every(e=>e.worldX===e.position[0]));
 await r.save(`E1-history-${repeat}.json`,history);record(`E1 command transforms/undo/redo/synchronous reads ${repeat}`);
 await r.page.evaluate(()=>{editor.deselect();editor.signals.sceneGraphChanged.dispatch();});
 await capture('E1-small-static','editor',repeat);await r.save(`E1-scene-${repeat}.json`,await r.page.evaluate(()=>editor.toJSON()));
 // Observe render notifications, not CPU time or frame timing.
 const idle=await r.page.evaluate(async()=>{let count=0;const f=()=>count++;editor.signals.sceneRendered.add(f);await new Promise(resolve=>{let n=0;function frame(){if(++n===12)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);});editor.signals.sceneRendered.remove(f);return count;});
 assert.equal(idle,0,'idle should not continuously render');record(`E1 idle render suppression ${repeat}`,{renderNotifications:idle});
 await r.page.screenshot({path:`${r.out}/E1-ui-${repeat}.png`});
 actions.push({scenario:'E1',repeat,inputs:['authored two cubes/ground/directional/ambient lights via AddObjectCommand','pointer select Left cube','shift-click Right cube','SetPosition/SetRotation commands; undo/redo','deselect and observe 12 rAF callbacks'],limitations:['gizmo drag and focus UI replay not yet automated']});
}
async function editorAnimated(repeat){
 await loadEditor();
 await r.page.evaluate(async()=>{const url='../examples/models/gltf/RobotExpressive/RobotExpressive.glb';const data=await(await fetch(url)).arrayBuffer();editor.loader.loadFiles([new File([data],'RobotExpressive.glb',{type:'model/gltf-binary'})]);});
 await r.page.locator('.Dialog').getByRole('button',{name:'OK',exact:true}).click();
 await r.page.waitForFunction(()=>editor.scene.children.some(o=>o.animations.length===14));
 await r.page.evaluate(async()=>{
  const {AddObjectCommand}=await import('./js/commands/AddObjectCommand.js');const model=editor.scene.children.find(o=>o.animations.length===14);model.name='RobotExpressive';model.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  const b=new THREE.Box3().setFromObject(model,true),center=b.getCenter(new THREE.Vector3());
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshStandardMaterial({color:0xaaaaaa}));ground.name='Ground';ground.rotation.x=-Math.PI/2;ground.position.y=b.min.y;ground.receiveShadow=true;editor.execute(new AddObjectCommand(editor,ground));
  const light=new THREE.DirectionalLight(0xffffff,3);light.name='Key light';light.position.set(4,8,5);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-5;light.shadow.camera.right=5;light.shadow.camera.top=5;light.shadow.camera.bottom=-5;light.shadow.camera.near=0.1;light.shadow.camera.far=30;editor.execute(new AddObjectCommand(editor,light));
  const ambient=new THREE.AmbientLight(0xffffff,1);ambient.name='Fill light';editor.execute(new AddObjectCommand(editor,ambient));
  editor.camera.position.set(5,3.5,7);editor.camera.lookAt(center);editor.camera.updateMatrixWorld(true);
  let selected;model.traverse(o=>{if(!selected&&o.isSkinnedMesh)selected=o;});editor.select(selected);
  const action=editor.mixer.clipAction(model.animations.find(c=>c.name==='Walking'),model);action.play();editor.signals.sceneGraphChanged.dispatch();
 });
 await r.page.waitForFunction(()=>editor.mixer.time>0.1);await skinWeights('editor',repeat);
 const shape=await r.page.evaluate(()=>{const model=editor.scene.getObjectByName('RobotExpressive');let skins=0,morphs=0;model.traverse(o=>{if(o.isSkinnedMesh)skins++;if(o.morphTargetInfluences)morphs++;});return {skins,morphs,clips:model.animations.length,selected:editor.selected.type};});assert.equal(shape.clips,14);assert.equal(shape.morphs,3);assert.equal(shape.selected,'SkinnedMesh');await r.save(`E2-shape-${repeat}.json`,shape);
 await r.page.evaluate(()=>{editor.mixer.timeScale=1;editor.mixer.setTime(0.75);editor.mixer.timeScale=0;editor.signals.objectChanged.dispatch(editor.scene.getObjectByName('RobotExpressive'));});
 // Let the original viewport refresh its selected-object helper at the frozen pose.
 await r.page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const bounds=await r.page.evaluate(()=>{editor.selected.updateWorldMatrix(false,true);const b=new THREE.Box3().setFromObject(editor.selected,true);return [...b.min.toArray(),...b.max.toArray()];});assert(bounds.every(Number.isFinite));await r.save(`E2-bounds-${repeat}.json`,bounds);
 const initial=await capture('E2-animated-selected-shadow','editor',repeat);
 await r.page.evaluate(()=>{editor.scene.getObjectByName('Key light').castShadow=false;editor.signals.sceneGraphChanged.dispatch();});
 const noShadow=await capture('E2-shadow-disabled-control','editor',repeat);assert.notEqual(initial.pixelSha256,noShadow.pixelSha256,'shadow must affect image');
 await r.page.evaluate(()=>{editor.scene.getObjectByName('Key light').castShadow=true;editor.scene.getObjectByName('RobotExpressive').visible=false;editor.signals.sceneGraphChanged.dispatch();});
 const hidden=await capture('E2-hidden-control','editor',repeat);assert.notEqual(initial.pixelSha256,hidden.pixelSha256,'visibility must affect image');
 await r.page.evaluate(()=>{const model=editor.scene.getObjectByName('RobotExpressive');model.visible=true;editor.signals.sceneGraphChanged.dispatch();});
 await r.save(`E2-scene-${repeat}.json`,await r.page.evaluate(()=>editor.toJSON()));await r.page.screenshot({path:`${r.out}/E2-ui-${repeat}.png`});
 record(`E2 native loader/playback/selected bounds/shadows/visibility ${repeat}`,shape);
 actions.push({scenario:'E2',repeat,inputs:['native Loader.loadFiles RobotExpressive','authored ground, raster shadow light and ambient via AddObjectCommand','Walking action, select SkinnedMesh','fixed pose 0.75 seconds','shadow off/on, model visible off/on'],limitations:['programmatic native APIs; timeline and light GUI replay not yet automated','raster shadow workload is GPU-oriented, not proven GPU-bound']});
}
try{
 for(let repeat=0;repeat<2;repeat++){await viewer(repeat);await editorStatic(repeat);await editorAnimated(repeat);}
 assert.deepEqual(r.errors,[]);assert(!r.requests.some(r=>r.blocked));
 await r.save('result.json',{status:'passed',assetConformance:'Known upstream failure: 752 nonnormalized weight errors, four skin-node warnings; unchanged asset. Runtime normalized weights checked separately.',scope:'Upstream-only correctness preparation; no engine equivalence or performance qualification',checks,actions});
}catch(e){await r.save('result.json',{status:'failed',error:String(e),checks,actions});throw e;}finally{await r.close();}
