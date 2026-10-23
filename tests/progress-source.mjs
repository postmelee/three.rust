import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extract,collect} from '../scripts/progress-source.mjs';
test('source inventory distinguishes declarations, callbacks, fields and this scopes',()=>{
 const x=extract(`class Example { constructor(){this.time=0; Object.defineProperties(this,{position:{value:1}});function nested(){this.wrong=1;} const arrow=()=>{this.weight=2;};} update(){this.time=1;} get value(){return 1;} set value(x){} } const named=()=>1; [1].map(x=>x);`,'sample.js',true);
 assert(x.fields.some(x=>x.name==='Example.position'));assert(x.fields.some(x=>x.name==='Example.weight'));assert(!x.fields.some(x=>x.name==='Example.wrong'));
 assert.equal(x.fields.filter(x=>x.name==='Example.time').length,1);
 assert(x.functions.some(x=>x.id==='sample.js::Example.update'));
 assert.equal(x.functions.filter(x=>x.name==='Example.value').length,2);
 assert(!x.functions.some(x=>x.name.includes('constructor')));
});
test('pinned source includes pose declarations, palette and the conditional route exactly once',()=>{
 const d=collect(),functions=d.functions.flatMap(g=>g.items),state=d.state.flatMap(g=>g.items);
 assert.equal(functions.filter(x=>x.id==='core/Object3D.js::Object3D.updateMatrixWorld').length,1);
 for(const name of ['Object3D.position','Object3D.quaternion','Object3D.scale','Skeleton.boneMatrices','AnimationMixer._actions'])assert(state.some(x=>x.name===name),name);
 assert.equal(new Set(functions.map(x=>x.id)).size,functions.length);
});
