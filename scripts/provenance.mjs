import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const sha=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
const files=readdirSync('fixtures/original').map(f=>'fixtures/original/'+f);
files.push('node_modules/three/src/core/Object3D.js','node_modules/three/src/renderers/WebGLRenderer.js','node_modules/three/src/renderers/webgl/WebGLRenderLists.js','node_modules/three/src/animation/AnimationMixer.js','node_modules/three/src/objects/Skeleton.js','work/three-upstream/examples/models/gltf/Soldier.glb');
writeFileSync('fixtures/provenance.json',JSON.stringify({repository:'https://github.com/mrdoob/three.js',tag:'r186',tagObject:'48dd7be01263658aad497fd72e09d1e4c6213461',commit:'9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8',npmVersion:'0.186.1',npmIntegrity:JSON.parse(readFileSync('work/three-metadata.json')).dist.integrity,files:files.map(path=>({path,sha256:sha(path)}))},null,2));
