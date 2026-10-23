import { chromium } from 'playwright';
import { browserPath } from '../scripts/browser-path.mjs';
import { serve, serverOrigin } from '../scripts/server.mjs';
import { configuration, hardwareRenderer } from '../bench/config.mjs';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const out=process.env.RTHREE_FOX_REJECTION_DIR||'work/fox-rejections';mkdirSync(out,{recursive:true});
const cfg=configuration(process.env.RTHREE_BROWSER_MODE==='hardware'?['mode=hardware','headless=false']:[]),server=await serve();
const browser=await chromium.launch({executablePath:browserPath(),headless:cfg.headless,args:cfg.args});
try{const page=await browser.newPage();await page.goto(`${serverOrigin}/fixtures/fox/index.html?manual&variant=original`);await page.waitForFunction(()=>window.__fox);const gpu=await page.evaluate(()=>window.__fox.gpu);if(cfg.hardware)hardwareRenderer(gpu.renderer);
const results=await page.evaluate(async()=>{
 const THREE=await import('three'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),{descriptorFromFox}=await import('./descriptor.mjs'),{createOwnedAnimation}=await import('/packages/rthree/owned.js');
 const gltf=await new GLTFLoader().loadAsync('/work/assets/Fox.glb'),roots=[new THREE.Matrix4().toArray()],errors={};
 const check=(label,mutate)=>{const undo=mutate();try{descriptorFromFox(THREE,gltf.scene,gltf.animations,roots);}catch(e){errors[label]=String(e);}finally{undo();}};
 let mesh;gltf.scene.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});
 check('transparent',()=>{mesh.material.transparent=true;return()=>mesh.material.transparent=false;});
 check('morph',()=>{mesh.morphTargetInfluences=[1];return()=>delete mesh.morphTargetInfluences;});
 check('bind-transform',()=>{mesh.bindMatrix.elements[12]=1;return()=>mesh.bindMatrix.identity();});
 check('non-joint-parent',()=>{const p=mesh.skeleton.bones[0].parent;p.position.x=1;return()=>{p.position.x=0;p.updateMatrixWorld(true);};});
 check('discrete-track',()=>{const t=gltf.animations[0].tracks[0];t.setInterpolation(THREE.InterpolateDiscrete);return()=>t.setInterpolation(THREE.InterpolateLinear);});
 check('arbitrary-binding',()=>{const t=gltf.animations[0].tracks[0],name=t.name;t.name='fox.material.opacity';return()=>t.name=name;});
 check('additive',()=>{gltf.animations[0].blendMode=THREE.AdditiveAnimationBlendMode;return()=>gltf.animations[0].blendMode=THREE.NormalAnimationBlendMode;});
 const descriptor=descriptorFromFox(THREE,gltf.scene,gltf.animations,roots).descriptor;
 for(const backend of ['js','wasm']){for(const field of ['events','crossfade','morphTargets'])try{const d=await createOwnedAnimation({...descriptor,[field]:[]},{backend});d.dispose();}catch(e){errors[backend+'-'+field]=String(e);}}
 return errors;
});assert.equal(Object.keys(results).length,13);writeFileSync(`${out}/results.json`,JSON.stringify({status:'passed',gpu,results},null,2)+'\n');console.log('13 unsupported fixture/API cases rejected');}finally{await browser.close();server.close();}
