import {cpSync,readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import ts from 'typescript';
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
s="import { batchUpdate, trackFacadeObject, facadeLocal, facadeSelective, invalidatePrepared } from '../../../packages/rthree/runtime.js';\n"+s;
// Invalidate after committed hierarchy mutation and before synchronous events.
for(const needle of ['this.children.push( object );','this.children.splice( index, 1 );'])s=s.replaceAll(needle,needle+'\n\t\t\tinvalidatePrepared();');
writeFileSync('work/build/src/core/Object3D.js',s);
const preparedSources=JSON.parse(readFileSync('docs/prepared-source.json'));
for(const [file,hash] of Object.entries(preparedSources.sha256))if(createHash('sha256').update(readFileSync('node_modules/three/src/'+file)).digest('hex')!==hash)throw Error('Prepared hook hash mismatch: '+file);
let renderer=readFileSync('node_modules/three/src/renderers/WebGLRenderer.js','utf8');
const replacements=[
 ['projectObject( scene, camera, 0, _this.sortObjects );', 'const preparedList = prepareScene( scene, camera, _this, currentRenderList, currentRenderState, objects, _frustum, _projScreenMatrix, _opaqueSort, _transparentSort, { Object3D: RthreeObject3D, Mesh: RthreeMesh, Material: RthreeMaterial, BufferAttribute: RthreeBufferAttribute }, xr.isPresenting || _nodesHandler !== null || camera.isArrayCamera );\n\t\t\tif ( ! preparedList ) projectObject( scene, camera, 0, _this.sortObjects );'],
 ['if ( _this.sortObjects === true ) {','if ( _this.sortObjects === true && ! preparedList ) {'],
 ['object.modelViewMatrix.multiplyMatrices( camera.matrixWorldInverse, object.matrixWorld );\n\t\t\tobject.normalMatrix.getNormalMatrix( object.modelViewMatrix );','if ( ! consumePreparedMatrices( object, camera ) ) {\n\t\t\t\tobject.modelViewMatrix.multiplyMatrices( camera.matrixWorldInverse, object.matrixWorld );\n\t\t\t\tobject.normalMatrix.getNormalMatrix( object.modelViewMatrix );\n\t\t\t}']
];
for(const [needle,replacement] of replacements){if(renderer.split(needle).length!==2)throw Error('Prepared renderer hook mismatch: '+needle);renderer=renderer.replace(needle,replacement);}
renderer="import { prepareScene, consumePreparedMatrices } from '../../../packages/rthree/runtime.js';\nimport { Object3D as RthreeObject3D } from '../core/Object3D.js';\nimport { Mesh as RthreeMesh } from '../objects/Mesh.js';\nimport { Material as RthreeMaterial } from '../materials/Material.js';\nimport { BufferAttribute as RthreeBufferAttribute } from '../core/BufferAttribute.js';\n"+renderer;
writeFileSync('work/build/src/renderers/WebGLRenderer.js',renderer);
// Uniform caches and Float32 upload arrays consume snapshots privately. Unlike
// overridable math calls, these local helpers cannot expose the backing array.
let uniforms=readFileSync('node_modules/three/src/renderers/webgl/WebGLUniforms.js','utf8');
if(uniforms.split('const elements = v.elements;').length!==4)throw Error('Uniform read hook mismatch');
uniforms=uniforms.replaceAll('const elements = v.elements;','const elements = preparedUploadElements( v );');
writeFileSync('work/build/src/renderers/webgl/WebGLUniforms.js',"import { preparedUploadElements } from '../../../../packages/rthree/runtime.js';\n"+uniforms);

// Read-only math inputs synchronize once, then read a plain snapshot. Destinations
// keep their public tracked array so mutations cannot bypass the dirty barrier.
const inventory=JSON.parse(readFileSync('docs/progress-source.json'));
if(inventory.upstream.version!=='0.186.1')throw Error('Math hook upstream mismatch');
const readonly={Matrix4:new Set(['clone','determinant','determinantAffine','getMaxScaleOnAxis','decompose','equals','toArray']),Matrix3:new Set(['clone','determinant','equals','toArray'])};
for(const name of ['Matrix4','Matrix3','Vector3','Vector4']){
 const file=`math/${name}.js`,original=readFileSync(`node_modules/three/src/${file}`,'utf8');
 if(createHash('sha256').update(original).digest('hex')!==inventory.upstream.hashes[file])throw Error(`Math hook hash mismatch: ${file}`);
 const ast=ts.createSourceFile(file,original,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),edits=[];
 function visit(node,method){
  if(ts.isMethodDeclaration(node))method=node.name.getText(ast);
  if(ts.isPropertyAccessExpression(node)&&node.name.text==='elements'){
   const input=ts.isIdentifier(node.expression)&&['m','a','b','matrix'].includes(node.expression.text);
   const self=node.expression.kind===ts.SyntaxKind.ThisKeyword&&readonly[name]?.has(method);
   // An argument can reach an overridden method (for example Vector3.fromArray).
   // Keep the public proxy there; a private backing array must never escape.
   const argument=ts.isCallExpression(node.parent)||ts.isNewExpression(node.parent);
   if((input||self)&&!argument)edits.push([node.getStart(ast),node.end,`matrixElements( ${node.expression.getText(ast)} )`]);
  }
  ts.forEachChild(node,child=>visit(child,method));
 }
 visit(ast);if(!edits.length)throw Error(`No read barriers found in ${file}`);
 let patched=original;for(const [start,end,replacement] of edits.sort((a,b)=>b[0]-a[0]))patched=patched.slice(0,start)+replacement+patched.slice(end);
 writeFileSync(`work/build/src/${file}`,"import { matrixElements } from '../../../packages/rthree/runtime.js';\n"+patched);
}
await build({entryPoints:['work/build/src/Three.js'],bundle:true,format:'esm',target:'es2022',outfile:`${pkg}/core.js`,minify:false,legalComments:'eof',plugins:[{name:'one-runtime',setup(b){b.onResolve({filter:/runtime\.js$/},()=>({path:'./runtime.js',external:true}));}}]});
cpSync('node_modules/three/examples/jsm',`${pkg}/addons`,{recursive:true});
cpSync('node_modules/@types/three/examples/jsm',`${pkg}/addons`,{recursive:true});
function rewrite(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const path=dir+'/'+e.name;if(e.isDirectory())rewrite(path);else if((e.name.endsWith('.js')||e.name.endsWith('.d.ts'))){let s=readFileSync(path,'utf8');const rel='../'.repeat(path.slice(pkg.length+1).split('/').length-1)+'index.js';s=s.replace(/from ['"]three['"]/g,`from '${rel}'`);writeFileSync(path,s);}}}rewrite(`${pkg}/addons`);
cpSync('node_modules/@types/three/LICENSE',`${pkg}/THREE-TYPES-LICENSE`);
cpSync('LICENSE',`${pkg}/LICENSE`);cpSync('node_modules/three/LICENSE',`${pkg}/THREE-LICENSE`);
execFileSync('cargo',['build','--release','--locked','--target','wasm32-unknown-unknown'],{stdio:'inherit'});
cpSync('target/wasm32-unknown-unknown/release/rthree_scene_core.wasm',`${pkg}/scene_core.wasm`);
console.log('Built local ESM package with one core and Rust Wasm');
