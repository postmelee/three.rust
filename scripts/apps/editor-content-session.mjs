import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {gpu,hash} from './candidate-browser.mjs';
import {assertBackend} from './editor-scenario.mjs';

const settle=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));

// Opt-in correctness diagnosis only. These observations may materialize public
// matrices; they never enter the profile/primary paths or replace native input.
function attachEditorFocusDiagnostic() {
 const state=globalThis.__editorFocusDiagnostic={phase:'page-ready-before-renderer-selection',events:[],overflow:false};
 const camera=()=>({position:editor.camera.position.toArray(),quaternion:editor.camera.quaternion.toArray(),scale:editor.camera.scale.toArray()});
 const append=row=>{if(state.events.length<10000)state.events.push(row);else state.overflow=true;};
 const targetRole=target=>{if(!(target instanceof Element))return {tag:null,role:'non-element'};const roles=['viewHelper','outliner','animation','menubar','viewport'];return {tag:target.tagName.toLowerCase(),role:roles.find(id=>target.closest('#'+id))??(target.closest('.Dialog')?'import-dialog':'other')};};
 for(const type of ['pointerdown','pointerup','pointermove','pointercancel','wheel'])addEventListener(type,event=>append({kind:'input',type,at:performance.now(),phase:state.phase,target:targetRole(event.target),clientX:event.clientX,clientY:event.clientY,button:event.button,buttons:event.buttons,pointerType:event.pointerType??null,isTrusted:event.isTrusted,...(type==='wheel'?{deltaX:event.deltaX,deltaY:event.deltaY,deltaMode:event.deltaMode}:{}),camera:camera()}),{capture:true,passive:true});
 editor.signals.cameraChanged.add(()=>append({kind:'native-cameraChanged-signal',at:performance.now(),phase:state.phase,camera:camera()}));
}

export async function editorFocusDiagnosticCheckpoint(run,phase) {
 if(!run.editorFocusDiagnostic)return;
 const data=await run.page.evaluate(phase=>{const state=__editorFocusDiagnostic;state.phase=phase;const camera=editor.camera;return {phase,at:performance.now(),camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),scale:camera.scale.toArray(),matrix:camera.matrix.toArray(),matrixWorld:camera.matrixWorld.toArray(),matrixWorldInverse:camera.matrixWorldInverse.toArray(),projectionMatrix:camera.projectionMatrix.toArray(),matrixAutoUpdate:camera.matrixAutoUpdate,matrixWorldAutoUpdate:camera.matrixWorldAutoUpdate,matrixWorldNeedsUpdate:camera.matrixWorldNeedsUpdate},controls:editor.controls?{enabled:editor.controls.enabled,center:editor.controls.center.toArray()}:null,selected:{name:editor.selected?.name??null,type:editor.selected?.type??null,isImportedRoot:editor.selected===globalThis.__editorContent?.root},viewHelper:{domPresent:Boolean(document.querySelector('#viewHelper')),animationState:'Unavailable without modifying the native Viewport closure.'},events:[...state.events],eventOverflow:state.overflow,scope:'Opt-in setup diagnosis; public matrix reads may materialize candidate values. No keyboard text or page contents are recorded; native controls/render/mixer are unchanged.'};},phase);
 await run.save('focus-diagnostic-'+phase+'.json',data);assert.equal(data.eventOverflow,false,'Focus diagnostic input buffer overflow');
}

export async function chooseEditorContentZip(page,zip) {
 // Attach both rejection handlers in this turn. A chooser timeout must not
 // become unhandled while Playwright is still waiting for a blocked click.
 const [chooser]=await Promise.all([page.waitForEvent('filechooser'),page.getByText('Import',{exact:true}).click()]);
 await chooser.setFiles(zip);
}

export async function setEditorContentNativeInput(page,zip) {
 // The pinned Menubar.File creates this hidden input and its change handler.
 // Exercise that same native loader/dialog without claiming OS chooser coverage.
 const input=page.locator('body > form > input[type="file"][multiple]');
 assert.equal(await input.count(),1,'Native Editor import input must be unique');
 const descriptor=await input.evaluate(element=>({tag:element.tagName,type:element.type,multiple:element.multiple,parentTag:element.parentElement.tagName,formDisplay:element.parentElement.style.display}));
 assert.deepEqual(descriptor,{tag:'INPUT',type:'file',multiple:true,parentTag:'FORM',formDisplay:'none'});
 await input.setInputFiles(zip);return descriptor;
}

// Native signals and passive endpoint state only. No render/rAF/mixer wrappers.
export function attachEditorContentState(observer=true) {
 const state=globalThis.__editorContent={renderer:null,root:null,clip:null,savingStarted:0,savingFinished:0,activity:[]};
 editor.signals.savingStarted.add(()=>state.savingStarted++);editor.signals.savingFinished.add(()=>state.savingFinished++);
 editor.signals.rendererCreated.add(renderer=>state.renderer=renderer);
 if(observer)for(const type of ['blur','focus','resize','pointerdown','wheel','keydown','touchstart'])addEventListener(type,()=>state.activity.push({type,at:performance.now()}),{passive:true});
 if(observer)document.addEventListener('visibilitychange',()=>state.activity.push({type:'visibility:'+document.visibilityState,at:performance.now()}));
 state.snapshot=function(){
 const s=__editorContent,r=s.renderer,c=r.domElement,action=s.clip?editor.mixer.existingAction(s.clip,s.root):null;
 return {at:performance.now(),visibility:document.visibilityState,focused:document.hasFocus(),isolated:crossOriginIsolated,dpr:devicePixelRatio,selectedRoot:editor.selected===s.root,
  width:c.width,height:c.height,cssWidth:c.clientWidth,cssHeight:c.clientHeight,pixelRatio:r.getPixelRatio(),autosave:editor.config.getKey('autosave'),savingStarted:s.savingStarted,savingFinished:s.savingFinished,activity:[...s.activity],render:{...r.info.render},mixerTime:editor.mixer.time,mixerTimeScale:editor.mixer.timeScale,actionsInUse:editor.mixer.stats.actions.inUse,
  action:action?{name:s.clip.name,duration:s.clip.duration,time:action.time,running:action.isRunning(),paused:action.paused,enabled:action.enabled,weight:action.getEffectiveWeight(),timeScale:action.getEffectiveTimeScale()}:null,
  camera:{position:editor.camera.position.toArray(),quaternion:editor.camera.quaternion.toArray(),scale:editor.camera.scale.toArray(),near:editor.camera.near,far:editor.camera.far,fov:editor.camera.fov,aspect:editor.camera.aspect,zoom:editor.camera.zoom,focus:editor.camera.focus,filmGauge:editor.camera.filmGauge,filmOffset:editor.camera.filmOffset},quality:{toneMapping:r.toneMapping,exposure:r.toneMappingExposure,outputColorSpace:r.outputColorSpace,shadowEnabled:r.shadowMap.enabled,shadowType:r.shadowMap.type,shading:editor.viewportShading,backgroundType:editor.scene.background?.type??typeof editor.scene.background,environment:editor.scene.environment?.name??null},contextLost:r.getContext().isContextLost(),diagnostics:THREE.diagnostics?.()??null};
 };
 const select=[...document.querySelectorAll('select')].find(select=>[...select.options].some(option=>option.value==='WebGLRenderer'));
 if(!select)throw Error('Native WebGLRenderer selection unavailable');select.value='WebGLRenderer';select.dispatchEvent(new Event('change'));
}

export async function setupEditorContent(run,prepared,{play=false,observer=true,focusDiagnostic=false,input='filechooser'}={}) {
 assert(['filechooser','native-file-input'].includes(input));
 const page=run.page,expected=prepared.manifest.expected;
 await page.goto(run.origin+'/editor/editor/');await page.bringToFront();await page.waitForFunction(()=>globalThis.editor&&document.querySelector('#viewport canvas'));
 if(focusDiagnostic){run.editorFocusDiagnostic=true;await page.evaluate(attachEditorFocusDiagnostic);await editorFocusDiagnosticCheckpoint(run,'page-ready-before-renderer-selection');}
 await page.evaluate(attachEditorContentState,observer);await page.waitForFunction(()=>__editorContent.renderer);
 if(focusDiagnostic)await editorFocusDiagnosticCheckpoint(run,'after-renderer-selection');
 await page.evaluate(()=>{globalThis.__editorContentBeforeRoots=editor.scene.children.map(object=>object.uuid);});
 if(focusDiagnostic)await editorFocusDiagnosticCheckpoint(run,'before-native-import');
 await run.save('input.json',{kind:input,scope:input==='filechooser'?'Native File menu and browser chooser before original ZIP import.':'Pinned Menubar.File hidden file input and original change handler; menu click and OS chooser are not exercised.',assetBytesChanged:false});
 if(input==='native-file-input')await run.save('native-input-element.json',await setEditorContentNativeInput(page,prepared.zip));
 else{await page.locator('#menubar .menu').filter({has:page.getByText('File',{exact:true})}).hover();await chooseEditorContentZip(page,prepared.zip);}
 await page.locator('.Dialog').waitFor();assert.equal(await page.locator('.Dialog input[type=checkbox]').isChecked(),false,'Native ZIP import must remain asScene=false');
 await page.locator('.Dialog').getByRole('button',{name:'OK',exact:true}).click();
 await page.waitForFunction(()=>editor.scene.children.filter(object=>!__editorContentBeforeRoots.includes(object.uuid)).length===1,null,{timeout:180000});
 const imported=await page.evaluate(()=>{const roots=editor.scene.children.filter(object=>!__editorContentBeforeRoots.includes(object.uuid));delete globalThis.__editorContentBeforeRoots;if(roots.length!==1)throw Error('Expected one native AddObjectCommand import');__editorContent.root=roots[0];return {name:roots[0].name,id:roots[0].id,clips:roots[0].animations.map(clip=>({name:clip.name,duration:clip.duration,tracks:clip.tracks.length})),history:editor.history.undos.map(command=>command.type)};});
 if(focusDiagnostic)await editorFocusDiagnosticCheckpoint(run,'after-native-import');
 assert.deepEqual(imported.history,['AddObjectCommand']);assert.deepEqual(imported.clips.map(clip=>({name:clip.name,tracks:clip.tracks})),expected.editorAnimations.map(({name,tracks})=>({name,tracks})));
 // AddObjectCommand selects the imported root synchronously. Preserve loader
 // output before rejecting so texture failures cannot become timeline timeouts.
 const importedReadiness=await page.evaluate(captureEditorContentReadiness,expected);await run.save('source-readiness-after-import.json',importedReadiness);await run.verify();assertEditorContentReadiness(expected,importedReadiness);
 // The native outliner has object IDs as DOM option values; do not rename a
 // source scene to make it selectable or choose the global Scene by its label.
 const option=page.locator('#outliner .option').filter({hasText:imported.name});
 const ids=await option.evaluateAll(nodes=>nodes.map(node=>({value:node.value,text:node.textContent})));await run.save('native-outliner-options.json',ids);
 const index=ids.findIndex(item=>Number(item.value)===imported.id);assert(index>=0,'Imported root has no native outliner option');if(focusDiagnostic)await editorFocusDiagnosticCheckpoint(run,'before-outliner-click');await option.nth(index).click();if(focusDiagnostic){await editorFocusDiagnosticCheckpoint(run,'after-outliner-click');await editorFocusDiagnosticCheckpoint(run,'before-focus-key');}await page.keyboard.press('f');if(focusDiagnostic)await editorFocusDiagnosticCheckpoint(run,'immediately-after-focus-key');await settle(page);if(focusDiagnostic)await editorFocusDiagnosticCheckpoint(run,'after-focus-settle');
 assert.equal(await page.evaluate(()=>editor.selected===__editorContent.root),true);
 if(play){
  assert(expected.editorAnimations.length>0,'Animated content required');
  const bar=await page.locator('#animation-resizer').boundingBox();assert(bar);await page.mouse.move(bar.x+bar.width/2,bar.y+bar.height/2);await page.mouse.down();await page.mouse.move(bar.x+bar.width/2,bar.y+bar.height/2-270,{steps:12});await page.mouse.up();
  // Animation.onObjectSelected already selects the first authored clip. A
  // second click on its label toggles it off; preserve that native selection.
  const clip=expected.editorAnimations[0],selection=await page.evaluate(()=>{const s=__editorContent;s.clip=s.root.animations[0];const action=editor.mixer.existingAction(s.clip,s.root);return {selectedRoot:editor.selected===s.root,name:s.clip.name,tracks:s.clip.tracks.length,duration:s.clip.duration,actionsInUse:editor.mixer.stats.actions.inUse,action:action?{time:action.time,running:action.isRunning(),paused:action.paused,enabled:action.enabled,timeScale:action.getEffectiveTimeScale(),weight:action.getEffectiveWeight()}:null};});
  selection.row=await page.locator('#animation').getByText(clip.name,{exact:true}).evaluate(label=>({background:label.parentElement.style.background}));await run.save('native-first-clip-selection.json',selection);assertEditorNativeFirstClip(selection,clip);
  await page.locator('#animation button').nth(0).click();await page.waitForFunction(()=>editor.mixer.existingAction(__editorContent.clip,__editorContent.root)?.time>0.05);
 }
 await page.bringToFront();await settle(page);await page.waitForTimeout(1600);await page.waitForFunction(()=>__editorContent.savingStarted===__editorContent.savingFinished);
 if(focusDiagnostic)await editorFocusDiagnosticCheckpoint(run,'setup-complete');
 const environment=await page.evaluate(editorContentSnapshot);assertEditorContentEnvironment(environment,{play},run.engine);await run.save('gpu.json',await gpu(page,'#viewport canvas'));await run.save('native-import.json',{imported,play,input,scope:'Native import-input ZIP loader, unchanged asScene=false, root selection and focus. Menu/OS chooser coverage depends on the explicit input record. No extra lights/ground/shadows, no asset edits.',environment});
 return {imported,environment};
}

export function editorContentSnapshot() { return __editorContent.snapshot(); }

export function assertEditorNativeFirstClip(selection,clip) {
 assert.equal(selection.selectedRoot,true);assert.equal(selection.name,clip.name);assert.equal(selection.tracks,clip.tracks);assert(Number.isFinite(selection.duration)&&selection.duration>0);assert.equal(selection.row.background,'rgba(0, 136, 255, 0.1)','Native first authored clip must already be selected');assert.equal(selection.actionsInUse,0);assert(selection.action,'Native auto-selection did not create its action');assert.equal(selection.action.running,false);assert.equal(selection.action.paused,false);assert.equal(selection.action.enabled,true);assert.equal(selection.action.time,0);assert.equal(selection.action.timeScale,1);assert.equal(selection.action.weight,1);
}

export function assertEditorContentEnvironment(state,scenario,engine) {
 assert.equal(state.visibility,'visible');assert.equal(state.focused,true);assert.equal(state.isolated,true);assert.equal(state.dpr,1);assert.equal(state.pixelRatio,1);assert(state.width>0&&state.height>0&&state.cssWidth>0&&state.cssHeight>0);assert.equal(state.selectedRoot,true);assert.equal(state.contextLost,false);assert.equal(state.autosave,true);assert.equal(state.savingStarted,state.savingFinished);assertBackend(engine,state.diagnostics);
 if(scenario.play){assert.equal(state.actionsInUse,1);assert(state.action?.running&&!state.action.paused&&state.action.enabled);assert.equal(state.action.timeScale,1);assert.equal(state.mixerTimeScale,1);}
 else{assert.equal(state.actionsInUse,0);assert.equal(state.action,null);}
}

export function validateEditorContentWindow(before,after,scenario,engine) {
 assertEditorContentEnvironment(before,scenario,engine);assertEditorContentEnvironment(after,scenario,engine);assert(after.at>before.at);
 for(const key of ['width','height','cssWidth','cssHeight','pixelRatio','quality','camera','activity','savingStarted','savingFinished'])assert.deepEqual(after[key],before[key],'Native state changed during observation: '+key);
 const renderPasses=after.render.frame-before.render.frame,mixerAdvance=after.mixerTime-before.mixerTime;
 if(scenario.play){assert(renderPasses>0);assert(mixerAdvance>0);assert.equal(after.action.name,before.action.name);assert.equal(after.action.duration,before.action.duration);const duration=before.action.duration,expected=(before.action.time+mixerAdvance)%duration,distance=Math.abs(after.action.time-expected);assert(Math.min(distance,duration-distance)<=Math.max(1e-9,128*Number.EPSILON*Math.max(1,after.mixerTime)),'Native clip phase differs from mixer progression');}
 else{assert.equal(renderPasses,0,'Static Editor must preserve native idle zero rendering');assert.equal(mixerAdvance,0);}
 const keys=['wasmCalls','preparedPasses','preparedWasmCalls','preparedFallbacks','matrixReads','preparedMatrixReads','materializedBytes'];const counters=before.diagnostics?Object.fromEntries(keys.map(key=>[key,after.diagnostics[key]-before.diagnostics[key]])):null;
 if(counters)assert(Object.values(counters).every(value=>Number.isFinite(value)&&value>=0));if(scenario.play&&engine==='prepared-wasm')assert(counters.wasmCalls>0||counters.preparedWasmCalls>0);
 return {elapsedMs:after.at-before.at,renderPasses,mixerAdvanceSeconds:mixerAdvance,counters,perRenderFrameDenominator:renderPasses||null,scope:'Diagnostic endpoints only; no primary CPU duration, FPS or GPU bottleneck claim.'};
}

// Associations are deliberately not invented: native Editor does not retain the
// parser. Source indices below are resolved from unique original names, and all
// observable primitive/material/texture relationships are checked separately.
export function captureEditorContentReadiness(expected) {
 const root=__editorContent.root,sourceNames=new Set(expected.nodeRecords.map(row=>row.name)),materialNames=new Map(expected.materialNames.map(row=>[row.name,row.index]));
 let skinnedMeshes=0,morphMeshes=0,meshInstances=0;
 const sourceName=o=>o.userData?.name,isSource=o=>typeof sourceName(o)==='string'&&sourceNames.has(sourceName(o)),nodes=[],materials=new Set(),textures=new Set();
 const filter=new Map([[THREE.NearestFilter,9728],[THREE.LinearFilter,9729],[THREE.NearestMipmapNearestFilter,9984],[THREE.LinearMipmapNearestFilter,9985],[THREE.NearestMipmapLinearFilter,9986],[THREE.LinearMipmapLinearFilter,9987]]),wrap=new Map([[THREE.ClampToEdgeWrapping,33071],[THREE.MirroredRepeatWrapping,33648],[THREE.RepeatWrapping,10497]]);
 root.traverse(o=>{if(o.isMesh)meshInstances++;if(o.isSkinnedMesh)skinnedMeshes++;if(o.morphTargetInfluences)morphMeshes++;if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);if(!isSource(o))return;const meshes=o.isMesh?[o]:o.children.filter(child=>child.isMesh&&!isSource(child));nodes.push({name:sourceName(o),parentName:o.parent&&isSource(o.parent)?sourceName(o.parent):null,childNames:o.children.filter(isSource).map(sourceName).sort(),translation:o.position.toArray(),rotation:o.quaternion.toArray(),scale:o.scale.toArray(),matrix:o.matrix.toArray(),primitives:meshes.map(mesh=>({materialName:mesh.material.name,indexCount:mesh.geometry.index?.count??0,attributes:Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name,a])=>[name,{count:a.count,itemSize:a.itemSize,normalized:a.normalized}]))}))});});
 const materialRows=[...materials].map(m=>{const slots=[];for(const slot of ['map','metalnessMap','roughnessMap','normalMap','aoMap','emissiveMap','specularIntensityMap','specularColorMap','transmissionMap','thicknessMap']){const t=m[slot];if(!t)continue;textures.add(t);const imageIndex=expected.textureNames[t.name];slots.push({slot,textureName:t.name,imageIndex:imageIndex??null,sampler:{wrapS:wrap.get(t.wrapS),wrapT:wrap.get(t.wrapT),magFilter:filter.get(t.magFilter),minFilter:filter.get(t.minFilter)},texCoord:t.channel,offset:t.offset.toArray(),scale:t.repeat.toArray(),rotation:t.rotation,flipY:t.flipY,colorSpace:t.colorSpace,colorTransfer:THREE.ColorManagement.getTransfer(t.colorSpace)===THREE.SRGBTransfer?'srgb':'linear'});}return {index:materialNames.get(m.name)??null,name:m.name,textureSlots:slots.sort((a,b)=>a.slot.localeCompare(b.slot)),transmission:m.transmission??0,thickness:m.thickness??0,attenuationDistance:Number.isFinite(m.attenuationDistance)?m.attenuationDistance:null,attenuationColor:m.attenuationColor?.toArray()??[1,1,1],specularIntensity:m.specularIntensity??1,specularColor:m.specularColor?.toArray()??[1,1,1]};});
 const imageRows=[...textures].map(t=>({name:t.name,imageIndex:expected.textureNames[t.name]??null,width:t.image?.width??null,height:t.image?.height??null,compressed:Boolean(t.isCompressedTexture),mipmaps:t.mipmaps?.length??0,ready:Boolean(t.image?.width>0&&t.image?.height>0&&(!t.isCompressedTexture||t.mipmaps?.length>0))}));
 return {nodes,meshInstances,skinnedMeshes,morphMeshes,materials:materialRows,textures:imageRows,clips:root.animations.map(clip=>({name:clip.name,duration:clip.duration,tracks:clip.tracks.length})),selectedRoot:editor.selected===root,contextLost:__editorContent.renderer.getContext().isContextLost(),scope:'Native Editor source-name-resolved relationships; no GLTFLoader parser associations are claimed.'};
}

const near=(a,b)=>{assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)assert(Number.isFinite(a[i])&&Math.abs(a[i]-b[i])<=1e-10+1e-12*Math.abs(b[i]),'Numeric mismatch at '+i);};
export function assertEditorContentReadiness(expected,actual) {
 assert.equal(actual.contextLost,false);assert.equal(actual.selectedRoot,true);assert.equal(actual.meshInstances,expected.primitiveInstances);assert.equal(actual.skinnedMeshes??0,expected.skinnedNodes);assert.equal(actual.morphMeshes??0,expected.morphNodes);assert.equal(actual.nodes.length,expected.nodeRecords.length);assert.equal(new Set(actual.nodes.map(row=>row.name)).size,actual.nodes.length);
 for(const source of expected.nodeRecords){const row=actual.nodes.find(row=>row.name===source.name);assert(row,'Missing original node '+source.name);assert.equal(row.parentName,source.parentName);assert.deepEqual(row.childNames,source.childNames);if(!source.animated){if(source.matrix)near(row.matrix,source.matrix);else{near(row.translation,source.translation);near(row.rotation,source.rotation);near(row.scale,source.scale);}}assert.equal(row.primitives.length,source.primitives.length);for(let i=0;i<row.primitives.length;i++){const p=row.primitives[i],e=source.primitives[i];assert.equal(p.materialName,expected.materialNames.find(m=>m.index===e.materialIndex)?.name);assert.equal(p.indexCount,e.indexCount);for(const [name,a]of Object.entries(e.attributes))assert.deepEqual(p.attributes[name],a);}}
 assert.deepEqual([...new Set(actual.materials.map(row=>row.index))].sort((a,b)=>a-b),expected.materialIndices);
 for(const m of actual.materials){const e=expected.materials.find(row=>row.index===m.index);assert(e);for(const key of ['transmission','thickness','attenuationDistance','attenuationColor','specularIntensity','specularColor'])assert.deepEqual(m[key],e[key]);assert.deepEqual(m.textureSlots.map(row=>row.slot),e.textureSlots.map(row=>row.slot));for(const slot of e.textureSlots){const a=m.textureSlots.find(row=>row.slot===slot.slot);for(const key of ['imageIndex','sampler','texCoord','offset','scale','rotation','flipY','colorTransfer'])assert.deepEqual(a[key],slot[key]);}}
 assert(actual.textures.every(row=>row.ready));assert(actual.clips.every(clip=>Number.isFinite(clip.duration)&&clip.duration>0));assert.deepEqual([...new Set(actual.textures.map(row=>row.imageIndex))].sort((a,b)=>a-b),expected.imageIndices);assert.deepEqual(actual.clips.map(({name,tracks})=>({name,tracks})),expected.editorAnimations.map(({name,tracks})=>({name,tracks})));
 return {nodes:actual.nodes.length,materialInstances:actual.materials.length,sourceMaterials:expected.materials.length,materialSlots:actual.materials.reduce((n,m)=>n+m.textureSlots.length,0),decodedImages:expected.imageIndices.length,clips:actual.clips.length,sourceRelationshipsPassed:true};
}

export async function editorContentOracle(run,pose,captureId) {
 assert.match(captureId,/^[a-z0-9-]+$/);run.editorContentCaptureIds??=new Set();assert(!run.editorContentCaptureIds.has(captureId),'Oracle capture ID already used');run.editorContentCaptureIds.add(captureId);
 await run.page.evaluate(pose=>{const s=__editorContent;if(s.clip){editor.mixer.timeScale=1;editor.mixer.setTime(pose);editor.mixer.timeScale=0;}editor.signals.objectChanged.dispatch(s.root);},pose);await settle(run.page);
 const result=await run.page.evaluate(()=>{const s=__editorContent;editor.signals.sceneGraphChanged.dispatch();const r=s.renderer,c=r.domElement,gl=r.getContext(),pixels=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);const numeric=[],objects=[];editor.scene.traverse(o=>{objects.push({name:o.name,type:o.type,visible:o.visible});numeric.push(...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray(),...o.matrix.elements,...o.matrixWorld.elements);if(o.morphTargetInfluences)numeric.push(...o.morphTargetInfluences);if(o.skeleton)numeric.push(...o.skeleton.boneMatrices);});numeric.push(...editor.camera.matrixWorld.elements,...editor.camera.projectionMatrix.elements);const colors=new Set();for(let i=0;i<pixels.length;i+=4)colors.add(pixels[i]*65536+pixels[i+1]*256+pixels[i+2]);return {numeric,objects,width:c.width,height:c.height,colors:colors.size,pixels:Array.from(pixels),png:c.toDataURL('image/png'),history:editor.history.undos.map(command=>command.type),selectedRoot:editor.selected===s.root};});
 result.pixelSha256=hash(Buffer.from(result.pixels));delete result.pixels;const png=Buffer.from(result.png.split(',')[1],'base64');await fs.writeFile(path.join(run.out,`${captureId}.png`),png,{flag:'wx'});delete result.png;await run.save(`${captureId}.json`,result);assert(png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Invalid returned PNG signature');assert(result.colors>16);assert(result.numeric.every(Number.isFinite));return result;
}
export function compareEditorContentOracles(a,b) {for(const key of ['pixelSha256','width','height','objects','history','selectedRoot'])assert.deepEqual(a[key],b[key]);near(a.numeric,b.numeric);return {equal:true,numericValues:a.numeric.length,pixelSha256:a.pixelSha256};}
export function warmEditorContentFrames(count) {return new Promise(resolve=>{let frames=0;const before=__editorContent.snapshot();function tick(){if(++frames===count)resolve({before,after:__editorContent.snapshot(),frames});else requestAnimationFrame(tick);}requestAnimationFrame(tick);});}
