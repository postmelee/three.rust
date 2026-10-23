import {cpSync,readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const pkg='packages/rthree';mkdirSync('work/build',{recursive:true});
const source='node_modules/three/src/core/Object3D.js';const p=JSON.parse(readFileSync('fixtures/provenance.json'));const expected=p.files.find(f=>f.path===source).sha256;
if(createHash('sha256').update(readFileSync(source)).digest('hex')!==expected)throw Error('Upstream hook version/hash mismatch');
cpSync('node_modules/three/src','work/build/src',{recursive:true});
let s=readFileSync(source,'utf8');
const hooks=[
 ['this.pivot = null;', '\n\t\ttrackFacadeObject( this );'],
 ['updateMatrix() {','\n\t\tif ( facadeLocal( this, Object3D.prototype ) ) return;'],
 ['updateMatrixWorld( force ) {','\n\t\tif ( batchUpdate( this, force, Object3D.prototype.updateMatrixWorld, Object3D.prototype.updateMatrix, Object3D.prototype.updateWorldMatrix ) ) return;'],
 ['updateWorldMatrix( updateParents, updateChildren, force = false ) {','\n\t\tif ( facadeSelective( this, updateParents, updateChildren, force, Object3D.prototype ) ) return;']
];
for(const [needle,hook] of hooks){if(s.split(needle).length!==2)throw Error(`Unexpected hook count: ${needle}`);s=s.replace(needle,needle+hook);}
s="import { batchUpdate, trackFacadeObject, facadeLocal, facadeSelective } from '../../../packages/rthree/runtime.js';\n"+s;
writeFileSync('work/build/src/core/Object3D.js',s);
await build({entryPoints:['work/build/src/Three.js'],bundle:true,format:'esm',target:'es2022',outfile:`${pkg}/core.js`,minify:false,legalComments:'eof',plugins:[{name:'one-runtime',setup(b){b.onResolve({filter:/runtime\.js$/},()=>({path:'./runtime.js',external:true}));}}]});
cpSync('node_modules/three/examples/jsm',`${pkg}/addons`,{recursive:true});
cpSync('node_modules/@types/three/examples/jsm',`${pkg}/addons`,{recursive:true});
function rewrite(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const path=dir+'/'+e.name;if(e.isDirectory())rewrite(path);else if((e.name.endsWith('.js')||e.name.endsWith('.d.ts'))){let s=readFileSync(path,'utf8');const rel='../'.repeat(path.slice(pkg.length+1).split('/').length-1)+'index.js';s=s.replace(/from ['"]three['"]/g,`from '${rel}'`);writeFileSync(path,s);}}}rewrite(`${pkg}/addons`);
cpSync('node_modules/@types/three/LICENSE',`${pkg}/THREE-TYPES-LICENSE`);
cpSync('LICENSE',`${pkg}/LICENSE`);cpSync('node_modules/three/LICENSE',`${pkg}/THREE-LICENSE`);
execFileSync('cargo',['build','--release','--locked','--target','wasm32-unknown-unknown'],{stdio:'inherit'});
cpSync('target/wasm32-unknown-unknown/release/rthree_scene_core.wasm',`${pkg}/scene_core.wasm`);
console.log('Built local ESM package with one core and Rust Wasm');
