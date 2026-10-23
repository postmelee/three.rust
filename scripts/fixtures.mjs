import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const scenarios={cubes:'webgl_interactive_cubes',hierarchy:'webgl_interactive_cubes',small:'webgl_interactive_cubes',skinning:'webgl_animation_skinning_blending',shader:'webgl_shader'};
mkdirSync('fixtures/generated',{recursive:true});
for(const [name,file] of Object.entries(scenarios)){
 let s=readFileSync(`fixtures/original/${file}.html`,'utf8');
 s=s.replace('href="main.css"','href="/fixtures/original/main.css"').replace('../build/three.module.js','/node_modules/three/build/three.module.js').replace('"./jsm/"','"/node_modules/three/examples/jsm/"');
 s=s.replace("import * as THREE from 'three';",`import * as THREE from 'three';\nimport {install} from '/bench/browser.mjs';\nif(THREE.init) await THREE.init();\nconst seeded = (()=>{let s=42;return ()=>((s=Math.imul(1664525,s)+1013904223>>>0)/4294967296)})(); Math.random=seeded;`);
 s=s.replaceAll('renderer.setAnimationLoop( animate );','/* harness owns frame schedule */');
 s=s.replace("'models/gltf/Soldier.glb'","'/work/three-upstream/examples/models/gltf/Soldier.glb'");
 s=s.replace('let mixerUpdateDelta = timer.getDelta();','let mixerUpdateDelta = 1 / 60;');
 s=s.replace("uniforms[ 'time' ].value = performance.now() / 1000;","uniforms[ 'time' ].value = window.__tick / 60;");
 if(name==='small') s=s.replace('i < 2000','i < 8').replace('theta += 0.1','theta += 0');
 if(name==='hierarchy'){
  s=s.replace('i < 2000','i < 10000');
  s=s.replace('scene.add( object );','if (i % 10 === 0) { window.__group = new THREE.Group(); scene.add(window.__group); } window.__group.add(object);');
  s=s.replace('theta += 0.1;', 'theta += 0.1; for(const o of scene.children) if(o.isGroup) o.rotation.y += 0.003;');
 }
 const ready=name==='skinning'?'!!mixer':'!!renderer';
 s=s.replace(/\n\s*<\/script>\s*\n\s*<\/body>/,`\ninstall({THREE, name:'${name}', ready:()=>${ready}, get:()=>({scene,camera,renderer}), animate});\n</script>\n</body>`);
 writeFileSync(`fixtures/generated/${name}.html`,s);
}
