import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { openViewerRun, gpu } from './viewer-browser.mjs';
import { VIEWER_ROUTES, hash } from './viewer-adapter.mjs';
import { captureViewerSnapshot, compareViewerSnapshots } from './viewer-oracle.mjs';

function optionsFrom(args) {
 const options = { mode: 'smoke', routes: Object.keys(VIEWER_ROUTES) }, seen = new Set();
 for (const arg of args) {
  const split = arg.indexOf('='), key = arg.slice(0, split), value = arg.slice(split + 1);
  if (split < 1 || !value || !['mode', 'routes', 'runtimeRoot', 'runtimeSha'].includes(key) || seen.has(key)) throw Error('Expected unique mode=, routes=, runtimeRoot= and runtimeSha= options');
  seen.add(key); options[key] = key === 'routes' ? value.split(',') : value;
 }
 if (!['smoke', 'full'].includes(options.mode) || !options.routes.length || new Set(options.routes).size !== options.routes.length || options.routes.some(route => !VIEWER_ROUTES[route])) throw Error('Invalid Viewer mode/routes');
 if (options.routes.some(route => VIEWER_ROUTES[route].revision === '186') && (!options.runtimeRoot || !/^[0-9a-f]{40}$/.test(options.runtimeSha ?? ''))) throw Error('r186 routes require a pinned runtimeRoot/runtimeSha');
 return options;
}

async function pauseAtWalking(page) {
 await page.evaluate(() => {
  const viewer = VIEWER.app.viewer;
  viewer.controls.reset(); viewer.controls.autoRotate = false;
  viewer.mixer.stopAllAction();
  const walking = viewer.clips.find(clip => clip.name.endsWith('. Walking'));
  if (!walking) throw Error('Expected native Walking clip');
  viewer.mixer.clipAction(walking).reset().play();
  viewer.mixer.timeScale = 1; viewer.mixer.setTime(0.75); viewer.mixer.timeScale = 0; viewer.state.playbackSpeed = 0;
  viewer.render();
 });
 await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function reloadNativeRobot(run) {
 await run.page.evaluate(modelURL=>{globalThis.__previousViewerContent=VIEWER.app.viewer.content;globalThis.__previousViewerReport=VIEWER.app.validator.report;VIEWER.app.view(modelURL,'',new Map());},run.origin+'/__viewer_content__/robot/RobotExpressive.glb');
 await run.page.waitForFunction(()=>VIEWER.app.viewer.content!==globalThis.__previousViewerContent&&VIEWER.app.viewer.clips.length===14&&VIEWER.app.validator.report!==globalThis.__previousViewerReport);
 await run.page.evaluate(()=>{delete globalThis.__previousViewerContent;delete globalThis.__previousViewerReport;});
}

async function checkIdentity(run, routeName) {
 const route = VIEWER_ROUTES[routeName];
 const data = await run.page.evaluate(() => {
  const v = VIEWER.app.viewer, T = window.THREE;
  let skins = 0, morphs = 0, nodes = 0, geometryCount = 0;
  const geometry = new Set(); let skinVertices = 0, maxWeightError = 0;
  v.content.traverse(o => {
   nodes++; if (o.morphTargetInfluences) morphs++;
   if (o.geometry) geometry.add(o.geometry);
   if (o.isSkinnedMesh) { skins++; const weights = o.geometry.getAttribute('skinWeight'); for (let i=0;i<weights.count;i++) {maxWeightError=Math.max(maxWeightError,Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1));skinVertices++;} }
  }); geometryCount = geometry.size;
  return { revision: T.REVISION, skins, morphs, nodes, geometryCount, skinVertices, maxWeightError,
   clips: v.clips.map(clip=>clip.name), rendererIdentity: v.renderer instanceof T.WebGLRenderer && v.axesRenderer instanceof T.WebGLRenderer,
   viewerElements: document.querySelectorAll('.viewer').length, footerElements: document.querySelectorAll('footer').length,
   bootstrap: globalThis.__rthreeViewerBootstrap ? { initCalls: __rthreeViewerBootstrap.initCalls, appStarts: __rthreeViewerBootstrap.appStarts, phase: __rthreeViewerBootstrap.phase, error: __rthreeViewerBootstrap.error } : null,
   diagnostics: T.diagnostics?.() ?? null };
 });
 await run.save('initial-identity.json', data);
 assert.equal(data.revision, route.revision); assert(data.rendererIdentity); assert.equal(data.viewerElements, 1); assert.equal(data.footerElements, 1);
 assert.equal(data.clips.length, 14); assert.equal(data.morphs, 3); assert(data.skins >= 2); assert(data.skinVertices > 0); assert(data.maxWeightError <= 2e-7);
 if (route.externalized) { assert.equal(data.bootstrap.appStarts, 1); assert.equal(data.bootstrap.initCalls, route.candidate ? 1 : 0); assert.equal(data.bootstrap.error, null); }
 if (route.candidate) { assert.equal(data.diagnostics.backend, route.engine); if (route.engine === 'prepared-wasm') assert(data.diagnostics.wasmActive && data.diagnostics.wasmCalls > 0); }
 return data;
}

async function nativeControls(run, captures, capture, actions) {
 const page = run.page, ctrl = name => page.getByText(name, {exact:true}).first().locator('..').locator('input');
 await page.getByText('Animation', {exact:true}).click();
 await ctrl('1. Dance').uncheck(); await ctrl('11. Walking').check();
 for (const speed of ['0.5', '0', '1']) { await ctrl('playbackSpeed').fill(speed); await ctrl('playbackSpeed').press('Enter'); assert.equal(await page.evaluate(()=>VIEWER.app.viewer.mixer.timeScale), Number(speed)); }
 const phase = await page.evaluate(()=>VIEWER.app.viewer.mixer.time); await page.waitForFunction(t=>VIEWER.app.viewer.mixer.time > t + 0.02, phase);
 await ctrl('11. Walking').uncheck();
 await page.getByText('playAll', {exact:true}).click();
 assert(await page.evaluate(()=>Object.values(VIEWER.app.viewer.state.actionStates).every(Boolean)));
 for (const name of await page.evaluate(()=>VIEWER.app.viewer.clips.map(clip=>clip.name))) await ctrl(name).uncheck();
 // Each newly activated clip may save a property state at a different native
 // wall-clock phase. Preserve that interaction test, then reload the same source
 // to establish a deterministic initial pose for the separate manual-morph oracle.
 await reloadNativeRobot(run);
 await ctrl('1. Dance').uncheck();
 await page.getByText('Morph Targets', {exact:true}).click();
 const angry = page.getByText('Angry', {exact:true}).first().locator('..').locator('input');
 await angry.evaluate(input=>{input.value='0.65';input.dispatchEvent(new Event('change',{bubbles:true}));});
 const manualMorph = await page.evaluate(()=>{const a=[];VIEWER.app.viewer.content.traverse(o=>{if(o.morphTargetInfluences)a.push(o.morphTargetInfluences[o.morphTargetDictionary.Angry]);});return a;});
 assert(manualMorph.some(value=>Math.abs(value-0.65)<1e-12)); await run.save('manual-morph.json',manualMorph);
 // GUI stop restores the clip's original pose; this fixed manual state is shared across routes.
 await page.evaluate(()=>{const v=VIEWER.app.viewer;v.mixer.timeScale=0;v.state.playbackSpeed=0;v.controls.reset();v.render();});
 captures['manual-morph'] = await capture('manual-morph');
 actions.push('Native Animation GUI: Dance off, Walking on, speed 0.5/0/1 and observed time progress; playAll and each clip off. For the separate fixed manual-morph oracle, reload the unchanged source through App.view, stop its single autoplay Dance through the GUI, then change first Angry to 0.65 through dat.gui change. This removes uncontrolled clip activation history without changing the app or comparison tolerance.');

 // A distinct matched-history oracle retains playAll/stop semantics instead of
 // treating a fresh simple-morph pass as an explanation of the earlier mismatch.
 await reloadNativeRobot(run);
 await ctrl('playbackSpeed').fill('0'); await ctrl('playbackSpeed').press('Enter');
 assert.equal(await page.evaluate(()=>VIEWER.app.viewer.mixer.timeScale),0);
 await page.evaluate(()=>{const v=VIEWER.app.viewer;v.mixer.timeScale=1;v.mixer.setTime(0);v.mixer.timeScale=0;});
 await page.getByText('playAll',{exact:true}).click();
 await page.evaluate(()=>{const v=VIEWER.app.viewer;v.mixer.timeScale=1;v.mixer.setTime(0.75);v.mixer.timeScale=0;v.controls.reset();v.render();});
 assert.equal(await page.evaluate(()=>VIEWER.app.viewer.mixer.time),0.75);
 captures['fixed-play-all']=await capture('fixed-play-all');
 assert(captures['fixed-play-all'].actions.every(action=>action.present&&action.running&&action.scheduled));
 for(const name of await page.evaluate(()=>VIEWER.app.viewer.clips.map(clip=>clip.name)))await ctrl(name).uncheck();
 await angry.evaluate(input=>{input.value='0.65';input.dispatchEvent(new Event('change',{bubbles:true}));});
 captures['fixed-history-manual-morph']=await capture('fixed-history-manual-morph');
 assert(captures['fixed-history-manual-morph'].actions.every(action=>action.present&&!action.running&&!action.scheduled));
 assert.equal(captures['fixed-history-manual-morph'].mixerTime,0.75);
 await run.save('fixed-mixer-history.json',{scope:'Diagnostic fixed-time adaptation of the native playAll and GUI stop controls; not natural playback or a timing sample.',initialTime:0,playAllTime:0.75,playing:captures['fixed-play-all'].actions,stopped:captures['fixed-history-manual-morph'].actions});
 actions.push('Separate matched mixer history: native reload; GUI speed0; mixer.setTime(0) with temporary timeScale1; native playAll; mixer.setTime(0.75) with temporary timeScale1; freeze; snapshot all actions; every native clip checkbox off; Angry0.65; snapshot. Exact images, numerics and action times/weights/status compared across routes.');

 const before = await page.evaluate(()=>VIEWER.app.viewer.activeCamera.position.toArray());
 await page.mouse.move(400,300); await page.mouse.down(); await page.mouse.move(480,340,{steps:8}); await page.mouse.move(480,8,{steps:6}); await page.mouse.up();
 await page.waitForFunction(a=>VIEWER.app.viewer.activeCamera.position.toArray().some((x,i)=>x!==a[i]),before);
 const released = await page.evaluate(()=>VIEWER.app.viewer.activeCamera.position.toArray());
 await page.mouse.move(350,250,{steps:5}); await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.deepEqual(await page.evaluate(()=>VIEWER.app.viewer.activeCamera.position.toArray()),released,'Pointer release outside canvas must stop dragging');
 await page.mouse.wheel(0,100); await page.waitForFunction(a=>VIEWER.app.viewer.activeCamera.position.toArray().some((x,i)=>x!==a[i]),released);
 const beforePan = await page.evaluate(()=>VIEWER.app.viewer.controls.target.toArray());
 await page.mouse.move(400,300); await page.mouse.down({button:'right'}); await page.mouse.move(440,320,{steps:5}); await page.mouse.up({button:'right'});
 assert.notDeepEqual(await page.evaluate(()=>VIEWER.app.viewer.controls.target.toArray()),beforePan,'Native right-button pan must move the orbit target');
 await page.evaluate(()=>VIEWER.app.viewer.controls.reset());
 actions.push('Native pointer orbit, release in the header outside canvas, subsequent button-free motion, wheel dolly, right-button pan and OrbitControls.reset().');
}

export async function checkViewer(appsArg, preparedArg, outArg, options) {
 const apps = path.resolve(appsArg), prepared = path.resolve(preparedArg), out = path.resolve(outArg);
 await fs.mkdir(out, {recursive:false});
 const summary = { schema:1, mode:options.mode, performanceEvidence:false, appPin:'b5ee5dafe27f953ae1b55f42b5fa3697fef08683', runtimeSha:options.runtimeSha??null, routes:[], comparisons:[], status:'running', limitations:['RobotExpressive only; larger content is a separate native App.view import gate.','External EXR environment options retained but not selected in this check.','Robot source has retained upstream validator findings; loader-normalized skin weights checked separately.'] };
 const saveSummary=()=>fs.writeFile(path.join(out,'result.json'),JSON.stringify(summary,null,2)+'\n');
 const routeData = new Map();
 try {
 const toolingRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
 const toolFiles=['scripts/apps/viewer-check.mjs','scripts/apps/viewer-oracle.mjs'];
 summary.tooling={sha:execFileSync('git',['rev-parse','HEAD'],{cwd:toolingRoot,encoding:'utf8'}).trim(),dirty:Boolean(execFileSync('git',['status','--porcelain','--untracked-files=normal'],{cwd:toolingRoot,encoding:'utf8'}).trim()),files:[]};
 for(const file of toolFiles){const bytes=await fs.readFile(path.join(toolingRoot,file));summary.tooling.files.push({file,bytes:bytes.length,sha256:hash(bytes)});}
 const robotFile=path.join(apps,'editor/examples/models/gltf/RobotExpressive/RobotExpressive.glb');
 const robotBytes=await fs.readFile(robotFile);assert.equal(hash(robotBytes),'047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319');
 summary.asset={file:'RobotExpressive.glb',bytes:robotBytes.length,sha256:hash(robotBytes)};
  for (const routeName of options.routes) {
   const route = VIEWER_ROUTES[routeName], captures = {}, actions = [], checks = [];
   const run = await openViewerRun(apps,prepared,path.join(out,routeName),{route:routeName,runtimeRoot:options.runtimeRoot,runtimeSha:options.runtimeSha,captureSources:true,contentRoots:[{id:'robot',root:path.dirname(robotFile),files:[{file:summary.asset.file,bytes:summary.asset.bytes,sha256:summary.asset.sha256}]}],mode:'Viewer '+options.mode+' correctness only; no profiler/timing collector'});
   const record={route:routeName,status:'running',checks,actions}; summary.routes.push(record); await saveSummary();
   const capture = async name => {
    let reference;
    for (let repeat=0;repeat<2;repeat++) {
     const data=await run.page.evaluate(captureViewerSnapshot);
     for (const [renderer,image] of Object.entries(data.renderers)) {await run.save(`${name}-${repeat}-${renderer}.png`,Buffer.from(image.png.split(',')[1],'base64'));delete image.png;}
     await run.save(`${name}-${repeat}.json`,data);
     assert.deepEqual(data.identityFailures,[]);assert(data.axesCameraUpIdentity&&data.controlsCameraIdentity);assert(data.renderers.main.colors>16);
     if(data.state.grid)assert(data.renderers.axes.colors>1,'Axes canvas must contain rendered work with grid enabled');
     if(route.candidate){assert.equal(data.diagnostics.backend,route.engine);if(route.engine==='prepared-wasm')assert(data.diagnostics.wasmActive&&data.diagnostics.wasmCalls>0);}
     if(reference){assert.deepEqual(data.numeric,reference.numeric,'Frozen numerical A/A');compareViewerSnapshots(reference,data);}else reference=data;
    }
    checks.push({name,withinRouteExactImagesAndNumerics:true}); return reference;
   };
   try {
    await run.page.goto(run.url); await run.page.bringToFront(); await run.page.waitForFunction(()=>window.VIEWER?.app);
    await run.page.evaluate(()=>document.fonts.ready);
    await run.page.locator('#file-input').setInputFiles(path.join(apps,'editor/examples/models/gltf/RobotExpressive/RobotExpressive.glb'));
    await run.page.waitForFunction(()=>VIEWER.app.viewer?.clips.length===14&&VIEWER.app.validator.report!==null);
    const initialPhase=await run.page.evaluate(()=>VIEWER.app.viewer.mixer.time);await run.page.waitForFunction(t=>VIEWER.app.viewer.mixer.time>t+0.02,initialPhase);
    await run.save('validator.json',await run.page.evaluate(()=>VIEWER.app.validator.report));
    await run.save('gpu-main.json',await gpu(run.page,'.viewer > canvas')); await run.save('gpu-axes.json',await gpu(run.page,'.axes canvas'));
    await checkIdentity(run,routeName); actions.push('Native file-input load of the pinned RobotExpressive GLB, native validator and first-clip autoplay retained.');
    if(options.mode==='full')await nativeControls(run,captures,capture,actions);
    await pauseAtWalking(run.page); captures['walking-grid-off']=await capture('walking-grid-off');
    await run.page.getByText('Display',{exact:true}).click();
    const checkbox=name=>run.page.getByText(name,{exact:true}).first().locator('..').locator('input');
    await checkbox('grid').check(); await run.page.waitForFunction(()=>VIEWER.app.viewer.state.grid); captures['walking-grid-on']=await capture('walking-grid-on');
    await checkbox('grid').uncheck(); captures['walking-grid-off-again']=await capture('walking-grid-off-again');
    actions.push('Fixed native Walking clip at 0.75s; grid off/on/off retains main and axes renderers, axes depth-clear callback and main-after-axes rendering. Fixed poses are correctness adaptations, not wall-clock playback or timing samples.');
    if(options.mode==='full') {
     await checkbox('wireframe').check(); await checkbox('skeleton').check(); captures['helpers-wireframe']=await capture('helpers-wireframe');
     await checkbox('wireframe').uncheck(); await checkbox('skeleton').uncheck();
     await run.page.getByText('Lighting',{exact:true}).click();
     const environment=run.page.getByText('environment',{exact:true}).first().locator('..').locator('select');
     await environment.selectOption({label:'None'}); await run.page.waitForFunction(()=>VIEWER.app.viewer.scene.environment===null); captures['environment-none']=await capture('environment-none');
     await environment.selectOption({label:'Neutral'}); await run.page.waitForFunction(()=>VIEWER.app.viewer.scene.environment!==null);
     await checkbox('background').check(); captures['neutral-background']=await capture('neutral-background'); await checkbox('background').uncheck();
     await run.page.setViewportSize({width:1100,height:680}); await run.page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     await checkbox('grid').check(); captures['resized-two-renderers']=await capture('resized-two-renderers');
     await run.page.setViewportSize({width:1280,height:720}); await run.page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))); await checkbox('grid').uncheck();
     actions.push('Native wireframe/skeleton toggles, None/Neutral environment and background controls, window resize with both renderer cameras/canvases, restored viewport.');
     await reloadNativeRobot(run); await pauseAtWalking(run.page); captures['reloaded-walking']=await capture('reloaded-walking');
     actions.push('Native App.view of the pinned local model URL calls Viewer.clear, GLTFLoader and validator; a new loaded scene and Walking pose verified. The initial native file input is removed by App.createViewer, so reload does not claim a second file-input UI action.');
    }
    await run.page.screenshot({path:path.join(run.out,'native-ui.png')});
    await run.close(); assert.deepEqual(run.errors,[]); assert(!run.requests.some(request=>request.blocked),'Unmirrored external network request');
    record.status='passed';routeData.set(routeName,captures);
    await run.save('result.json',{status:'passed',mode:options.mode,route:routeName,runtimeSha:run.metadata.runtimeSha,performanceEvidence:false,checks,actions});await saveSummary();
   } catch(error) {record.status='failed';record.error=run.redact(error.stack||error);await run.save('result.json',record);throw error;} finally {await run.close();}
  }
  const pairs=[['original-r176','external-r176',true,'packaging parity'],['external-r176','pure-r186',false,'upstream version migration'],['pure-r186','prepared-js-r186',true,'candidate JS equivalence'],['pure-r186','prepared-wasm-r186',true,'candidate Wasm equivalence']];
  for(const [reference,actual,strict,purpose]of pairs){if(!routeData.has(reference)||!routeData.has(actual))continue;
   const a=routeData.get(reference),b=routeData.get(actual);assert.deepEqual(Object.keys(a),Object.keys(b));
   for(const name of Object.keys(a)){const comparison=compareViewerSnapshots(a[name],b[name],{strict:false});summary.comparisons.push({reference,actual,case:name,purpose,requiredEqual:strict,...comparison});}
  }
  await saveSummary();assert(summary.comparisons.every(row=>!row.requiredEqual||row.equal),'Cross-route fixed image/numerical equivalence failed; comparisons retained');
  for(const file of summary.tooling.files)assert.equal(hash(await fs.readFile(path.join(toolingRoot,file.file))),file.sha256,'Oracle tool changed during run');
  assert.equal(hash(await fs.readFile(robotFile)),summary.asset.sha256,'Robot asset changed during run');
  summary.inputIntegrityUnchanged=true;summary.status='passed';return summary;
 }catch(error){summary.status='failed';summary.error=String(error.message).split(apps).join('<apps>').split(prepared).join('<prepared>').split(out).join('<output>');throw error;}finally{await saveSummary();}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length<5)throw Error('Usage: node scripts/apps/viewer-check.mjs APPS_ROOT PREPARED_VIEWER NEW_OUTPUT [mode=smoke|full] [routes=...] [runtimeRoot=...] [runtimeSha=...]');
 const result=await checkViewer(process.argv[2],process.argv[3],process.argv[4],optionsFrom(process.argv.slice(5)));
 console.log(JSON.stringify({status:result.status,mode:result.mode,routes:result.routes.length,comparisons:result.comparisons.length,performanceEvidence:false}));
}
