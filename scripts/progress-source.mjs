import ts from 'typescript';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root='node_modules/three/src';
const scope=['animation','cameras','core','math','objects','renderers/webgl','renderers/WebGLRenderer.js'];
const stateFiles=new Set(['core/Object3D.js','animation/AnimationAction.js','animation/AnimationMixer.js','animation/PropertyBinding.js','animation/PropertyMixer.js','math/Interpolant.js','objects/Skeleton.js','objects/SkinnedMesh.js']);
const sha=s=>createHash('sha256').update(s).digest('hex');
function files(p){if(p.endsWith('.js'))return [p];return readdirSync(root+'/'+p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(p+'/'+e.name):e.name.endsWith('.js')?[p+'/'+e.name]:[]);}
export function extract(text,file,includeState=false){
 const sf=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),functions=[],fields=[];const used=new Map(),fieldIds=new Set();
 const location=n=>sf.getLineAndCharacterOfPosition(n.getStart(sf)).line+1;
 function visit(node,owners=[]){
  if(ts.isClassDeclaration(node)||ts.isClassExpression(node)){
   const name=node.name?.text||'AnonymousClass';
   for(const member of node.members){
    if(includeState){
     const add=(field,n)=>{const id=`${file}::${name}.${field}`;if(!fieldIds.has(id)){fieldIds.add(id);fields.push({id,name:`${name}.${field}`,line:location(n),path:file,kind:'declared-field'});}};
     const scan=n=>{
      if(ts.isBinaryExpression(n)&&n.operatorToken.kind===ts.SyntaxKind.EqualsToken&&ts.isPropertyAccessExpression(n.left)&&n.left.expression.kind===ts.SyntaxKind.ThisKeyword)add(n.left.name.text,n);
      if(ts.isCallExpression(n)&&n.arguments[0]?.kind===ts.SyntaxKind.ThisKeyword){
       const callee=n.expression.getText(sf);
       if(callee==='Object.defineProperty'&&ts.isStringLiteral(n.arguments[1]))add(n.arguments[1].text,n);
       if(callee==='Object.defineProperties'&&ts.isObjectLiteralExpression(n.arguments[1]))for(const prop of n.arguments[1].properties)if(prop.name)add(prop.name.getText(sf).replace(/^['"]|['"]$/g,''),prop);
      }
      // An ordinary nested function has its own this. Arrow functions inherit it.
      if(n!==member&&(ts.isFunctionExpression(n)||ts.isFunctionDeclaration(n)||ts.isClassDeclaration(n)))return;
      ts.forEachChild(n,scan);
     };scan(member);
    }
    visit(member,[...owners,name]);
   }return;
  }
  let name,kind;
  if(ts.isMethodDeclaration(node)||ts.isGetAccessorDeclaration(node)||ts.isSetAccessorDeclaration(node)){name=node.name?.getText(sf);kind=ts.isMethodDeclaration(node)?'method':ts.isGetAccessorDeclaration(node)?'getter':'setter';}
  else if(ts.isFunctionDeclaration(node)&&node.name){name=node.name.text;kind='function';}
  else if(ts.isFunctionExpression(node)||ts.isArrowFunction(node)){
   const parent=node.parent;
   if(ts.isVariableDeclaration(parent)&&ts.isIdentifier(parent.name))name=parent.name.text;
   else if(ts.isBinaryExpression(parent)&&parent.operatorToken.kind===ts.SyntaxKind.EqualsToken){const lhs=parent.left;if(ts.isPropertyAccessExpression(lhs)&&lhs.expression.kind===ts.SyntaxKind.ThisKeyword)name=lhs.name.text;}
   if(name)kind='assigned-function';
  }
  let next=owners;
  if(name){const full=[...owners,name].join('.'),base=`${file}::${full}${kind==='getter'||kind==='setter'?':'+kind:''}`;const n=(used.get(base)||0)+1;used.set(base,n);functions.push({id:base+(n>1?'#'+n:''),name:full,line:location(node),path:file,kind});next=[...owners,name];}
  ts.forEachChild(node,n=>visit(n,next));
 }
 visit(sf);return {functions,fields};
}
export function collect(){
 const version=JSON.parse(readFileSync('node_modules/three/package.json')).version;if(version!=='0.186.1')throw Error('Source inventory requires three@0.186.1');
 const hashes={},functionGroups=[],stateGroups=[];
 for(const file of scope.flatMap(files).sort()){
  const text=readFileSync(root+'/'+file,'utf8');hashes[file]=sha(text);const x=extract(text,file,stateFiles.has(file));const id=file.replace(/[^a-zA-Z0-9]/g,'-'),name=path.basename(file,'.js');
  if(x.functions.length)functionGroups.push({id,name,path:file,items:x.functions});
  if(x.fields.length)stateGroups.push({id:'state-'+id,name,path:file,items:x.fields});
 }
 return {schemaVersion:3,upstream:{version,commit:'9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8',scope,stateFiles:[...stateFiles].sort(),hashes},functions:functionGroups,state:stateGroups};
}
if(process.argv[1]===new URL(import.meta.url).pathname){const data=collect(),text=JSON.stringify(data,null,2)+'\n',file='docs/progress-source.json';if(process.argv.includes('--check')){if(readFileSync(file,'utf8')!==text)throw Error('Stale source inventory; run npm run docs:generate');}else writeFileSync(file,text);console.log(`Source inventory: ${data.functions.reduce((n,g)=>n+g.items.length,0)} callable definitions, ${data.state.reduce((n,g)=>n+g.items.length,0)} declared state fields`);}
