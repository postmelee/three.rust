import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const paths=['animation/AnimationMixer.js','animation/AnimationAction.js','animation/PropertyBinding.js','animation/PropertyMixer.js','math/Interpolant.js','objects/Skeleton.js','objects/SkinnedMesh.js','renderers/webgl/WebGLObjects.js','renderers/WebGLRenderer.js'];
const data={version:JSON.parse(readFileSync('node_modules/three/package.json')).version,upstreamCommit:'9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8',files:paths.map(path=>({path,sha256:createHash('sha256').update(readFileSync(`node_modules/three/src/${path}`)).digest('hex')}))};
const text=JSON.stringify(data,null,2)+'\n',out='fixtures/pipeline/source-audit.json';
if(process.argv.includes('--check')){if(readFileSync(out,'utf8')!==text)throw Error('Pipeline source pin changed');}else writeFileSync(out,text);
