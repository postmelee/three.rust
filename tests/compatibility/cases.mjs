// Authored contract probes against pinned three@0.186.1; no Node/browser dependencies.
// Every route runs the same application operations and independent expectations.
function fail(message) { throw new Error(message); }
export const check = {
  ok(value, message = 'expected true') { if (!value) fail(message); },
  equal(actual, expected, message = 'identity/value') {
    if (!Object.is(actual, expected)) fail(`${message}: ${actual} !== ${expected}`);
  },
  deep(actual, expected, message = 'structure') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${message}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  },
  near(actual, expected, message = 'number') {
    if (!Number.isFinite(actual) || Math.abs(actual - expected) > 1e-10 + 1e-12 * Math.abs(expected)) fail(`${message}: ${actual} != ${expected}`);
  },
  throws(fn, expected) {
    let error;
    try { fn(); } catch (caught) { error = caught; }
    if (!error || (expected && error !== expected)) fail('expected synchronous exception');
    return error.name;
  }
};

const xyz = object => object.matrixWorld.elements.slice(12, 15);
export const cases = [
  { id: 'identity', run(T, node) {
    const o = node(), p = o.position, q = o.quaternion, r = o.rotation;
    const m = o.matrix, w = o.matrixWorld, me = m.elements, we = w.elements;
    const descriptor = Object.getOwnPropertyDescriptor(o, 'position');
    check.deep([descriptor.writable, descriptor.enumerable, descriptor.configurable], [false, true, true]);
    check.equal(check.throws(() => { o.position = new T.Vector3(); }), 'TypeError');
    p.x = 3; o.rotation.y = .4; o.updateMatrixWorld(true);
    for (const [a, b] of [[o.position,p],[o.rotation,r],[o.quaternion,q],[o.matrix,m],[o.matrixWorld,w],[m.elements,me],[w.elements,we]]) check.equal(a,b);
    check.near(we[12],3);
    return { position: p.toArray(), matrix: [...we], stable: true };
  } },
  { id: 'rotation-coupling', run(T, node) {
    const o = node(), trace = [];
    for (const order of ['XYZ','YXZ','ZXY','ZYX','YZX','XZY']) {
      o.rotation.set(.2,.3,.4,order);
      const expected = new T.Quaternion().setFromEuler(new T.Euler(.2,.3,.4,order));
      expected.toArray().forEach((v,i) => check.near(o.quaternion.toArray()[i],v));
      o.quaternion.setFromAxisAngle(new T.Vector3(0,1,0),.6);
      check.near(o.rotation.y,.6); check.equal(o.rotation.order,order);
      trace.push([order,...o.rotation.toArray().slice(0,3),...o.quaternion.toArray()]);
    }
    return trace;
  } },
  { id: 'lazy-and-forced-reads', run(T, node) {
    const root=node(), child=node(), sibling=node(); root.add(child,sibling);
    root.position.x=1; child.position.x=2; sibling.position.x=5;
    root.updateMatrixWorld(); const alias=child.matrixWorld.elements;
    root.position.x=10; child.position.x=4;
    check.equal(alias[12],3); check.equal(sibling.matrixWorld.elements[12],6);
    const target=new T.Vector3(); check.equal(child.getWorldPosition(target),target);
    check.equal(target.x,14); check.equal(alias[12],14);
    check.equal(sibling.matrixWorld.elements[12],6, 'forced child read must not refresh sibling');
    const beforeSibling=xyz(sibling); root.updateWorldMatrix(false,true);
    check.equal(sibling.matrixWorld.elements[12],15);
    return { read:target.toArray(), beforeSibling, afterSibling:xyz(sibling) };
  } },
  { id: 'manual-matrix-and-force', run(T, node) {
    const root=node(), child=node(); root.add(child);
    root.matrixAutoUpdate=false; child.matrixAutoUpdate=false;
    root.matrix.makeTranslation(2,0,0); child.matrix.makeTranslation(3,0,0);
    root.updateMatrixWorld(true); const alias=child.matrix.elements;
    alias[12]=8; root.updateMatrixWorld(); check.equal(child.matrixWorld.elements[12],5);
    child.matrixWorldNeedsUpdate=true; root.updateMatrixWorld(); check.equal(child.matrixWorld.elements[12],10);
    child.matrixWorldAutoUpdate=false; child.matrixWorld.elements[12]=44;
    child.matrixWorldNeedsUpdate=true; root.updateMatrixWorld(true);
    check.equal(child.matrixWorld.elements[12],44); check.equal(child.matrixWorldNeedsUpdate,false);
    child.matrixWorldAutoUpdate=true; child.updateWorldMatrix(false,false,true);
    check.equal(child.matrixWorld.elements[12],10);
    const replacement=Float64Array.from(alias); child.matrix.elements=replacement;
    replacement[12]=11; child.updateMatrixWorld(true); check.equal(child.matrix.elements,replacement);
    check.equal(child.matrixWorld.elements[12],13);
    return { local:[...replacement], world:[...child.matrixWorld.elements], oldAlias:alias[12] };
  } },
  { id: 'external-parent', run(T, node) {
    const parent=node(), child=node(); parent.add(child); parent.position.x=2; child.position.x=3;
    parent.updateMatrixWorld(); parent.position.x=9;
    child.updateMatrixWorld(true); check.equal(child.matrixWorld.elements[12],5);
    const stale=xyz(child); child.updateWorldMatrix(true,false);
    check.equal(child.matrixWorld.elements[12],12);
    return { stale, refreshed:xyz(child) };
  } },
  { id: 'pivot', run(T, node) {
    const o=node(); o.position.set(4,5,6); o.scale.set(2,3,4); o.pivot=new T.Vector3(1,2,3);
    o.updateMatrixWorld(); check.deep(xyz(o),[3,1,-3]);
    const pivot=o.pivot; pivot.x=2; o.updateMatrixWorld(); check.equal(o.pivot,pivot);
    check.deep(xyz(o),[2,1,-3]); return [...o.matrix.elements];
  } },
  { id: 'hierarchy-events', run(T, node) {
    const a=node(), b=node(), child=node(); a.name='a'; b.name='b'; child.name='child';
    a.add(child); const children=a.children, events=[];
    const record=(where,event)=>events.push([where,event.type,child.parent?.name??null,a.children.includes(child),b.children.includes(child),event.target=== (where==='child'?child:where==='a'?a:b)]);
    child.addEventListener('removed',e=>record('child',e)); child.addEventListener('added',e=>record('child',e));
    a.addEventListener('childremoved',e=>{check.equal(e.child,child);record('a',e);});
    b.addEventListener('childadded',e=>{check.equal(e.child,child);record('b',e);});
    check.equal(b.add(child),b); check.equal(a.children,children);
    check.deep(events,[['child','removed',null,false,false,true],['a','childremoved',null,false,false,true],['child','added','b',false,true,true],['b','childadded','b',false,true,true]]);
    child.removeFromParent(); check.equal(child.parent,null); return events;
  } },
  { id: 'attach', run(T, node) {
    const root=node(), a=node(), b=node(), child=node(); root.add(a,b); a.add(child);
    a.position.x=3; a.scale.setScalar(2); b.position.x=-4; child.position.x=1;
    root.updateMatrixWorld(); const world=child.matrixWorld.clone(), events=[];
    child.addEventListener('added',()=>events.push([child.parent===b,...child.position.toArray()]));
    b.attach(child); check.equal(child.parent,b);
    child.matrixWorld.elements.forEach((v,i)=>check.near(v,world.elements[i]));
    check.near(child.position.x,9); check.equal(events[0][0],true);
    return { world:[...child.matrixWorld.elements], local:child.position.toArray(), events };
  } },
  { id: 'listener-mutation-and-reentrancy', run(T, node) {
    const o=node(), events=[];
    function later(){events.push('later');}
    function second(){events.push('second');}
    function first(e){check.equal(this,o);check.equal(e.target,o);events.push('first');o.removeEventListener('tick',second);o.addEventListener('tick',later);}
    o.addEventListener('tick',first);o.addEventListener('tick',second);o.addEventListener('tick',first);
    const event={type:'tick'};o.dispatchEvent(event);check.equal(event.target,null);
    o.dispatchEvent(event);check.deep(events,['first','second','first','later']);
    let depth=0; o.addEventListener('nested',()=>{events.push(`depth-${depth}`);if(depth++===0)o.dispatchEvent({type:'nested'});});
    o.dispatchEvent({type:'nested'});check.deep(events.slice(-2),['depth-0','depth-1']);return events;
  } },
  { id: 'exception-partial-state', run(T, node) {
    const parent=node(), child=node(), error=new Error('user callback'); let parentEvent=false;
    child.addEventListener('added',()=>{child.position.x=7;throw error;});
    parent.addEventListener('childadded',()=>{parentEvent=true;});
    check.throws(()=>parent.add(child),error);
    check.equal(child.parent,parent);check.ok(parent.children.includes(child));check.equal(child.position.x,7);check.equal(parentEvent,false);
    const root=node(), first=node(), last=node();root.add(first,last);first.position.x=2;last.position.x=9;
    first.updateMatrix=function(){this.position.x++;throw error;};
    check.throws(()=>root.updateMatrixWorld(),error);check.equal(first.position.x,3);check.equal(last.matrixWorld.elements[12],0);
    return { hierarchyCommitted:true, parentEvent, mutation:first.position.x, unvisited:xyz(last) };
  } },
  { id: 'custom-update-dispatch', run(T, node) {
    const calls=[];
    class Custom extends T.Object3D {
      updateMatrix(){calls.push('local');this.position.y++;super.updateMatrix();}
      updateMatrixWorld(force){calls.push(['world',force??null]);super.updateMatrixWorld(force);}
    }
    const root=node(), custom=node(Custom);root.add(custom);root.updateMatrixWorld(true);root.updateMatrixWorld(false);
    check.equal(custom.position.y,2);check.deep(calls,[['world',true],'local',['world',true],'local']);
    return { calls, world:[...custom.matrixWorld.elements] };
  } },
  { id: 'clone-and-resource-identity', run(T, node) {
    const geometry=new T.BoxGeometry(),material=new T.MeshBasicMaterial(), mesh=node(T.Mesh);
    mesh.geometry=geometry;mesh.material=material;mesh.position.x=4;mesh.userData={nested:{value:1}};
    const clone=node(null,mesh.clone());check.ok(clone!==mesh);check.ok(clone.position!==mesh.position);
    check.ok(clone.matrix.elements!==mesh.matrix.elements);check.equal(clone.geometry,geometry);check.equal(clone.material,material);
    clone.userData.nested.value=3;check.equal(mesh.userData.nested.value,1);
    const parent=node();parent.add(mesh);let objects=0,resources=0;
    mesh.addEventListener('dispose',()=>objects++);
    geometry.addEventListener('dispose',()=>resources++);material.addEventListener('dispose',()=>resources++);
    mesh.dispose();check.equal(objects,1);check.equal(resources,0);check.equal(mesh.parent,parent);
    mesh.position.x=8;mesh.updateMatrixWorld();check.equal(mesh.matrixWorld.elements[12],8);
    geometry.dispose();material.dispose();check.equal(resources,2);
    return { independentObjects:true,sharedResources:true,sourceUserData:mesh.userData,objects,resources,reusableAfterDispose:xyz(mesh) };
  } },
  { id: 'animation-event-observation', run(T, node) {
    const root=node(), bone=node(T.Bone);bone.name='bone';root.add(bone);
    const clip=new T.AnimationClip('move',1,[new T.VectorKeyframeTrack('bone.position',[0,1],[0,0,0,10,0,0])]);
    const mixer=new T.AnimationMixer(root),action=mixer.clipAction(clip),events=[];
    check.equal(mixer.clipAction(clip),action);action.setLoop(T.LoopRepeat,2);action.clampWhenFinished=true;
    for(const type of ['loop','finished'])mixer.addEventListener(type,e=>{check.equal(e.action,action);events.push([type,mixer.time,action.time,bone.position.x]);});
    action.play();mixer.update(.75);check.near(bone.position.x,7.5);
    mixer.update(.5);check.near(bone.position.x,2.5);
    mixer.update(1);check.near(bone.position.x,10);
    check.deep(events.map(e=>[e[0],e[3]]),[['loop',7.5],['finished',2.5]]);
    check.equal(action.paused,true);action.stop();check.near(bone.position.x,0);
    mixer.uncacheAction(clip);check.ok(mixer.clipAction(clip)!==action);
    return { events, restored:bone.position.x };
  } },
  { id: 'arbitrary-property-animation', run(T, node) {
    const root=node();root.userData.weight=3;
    const mixer=new T.AnimationMixer(root),clip=new T.AnimationClip('property',1,[new T.NumberKeyframeTrack('.userData[weight]',[0,1],[3,7])]);
    const action=mixer.clipAction(clip).play();mixer.update(.5);check.near(root.userData.weight,5);
    action.stop();check.near(root.userData.weight,3);return { restored:root.userData.weight };
  } },
  { id: 'skeleton-palette-lifecycle', run(T, node) {
    const bone=node(T.Bone);bone.updateMatrixWorld();const skeleton=new T.Skeleton([bone]);
    const palette=skeleton.boneMatrices;check.ok(palette instanceof Float32Array);
    bone.position.x=3;skeleton.update();check.equal(palette[12],0,'palette consumes existing world matrices');
    bone.updateMatrixWorld();check.equal(palette[12],0);skeleton.update();check.equal(palette[12],3);check.equal(skeleton.boneMatrices,palette);
    skeleton.computeBoneTexture();check.ok(skeleton.boneMatrices!==palette);
    const texture=skeleton.boneTexture;check.equal(texture.image.data,skeleton.boneMatrices);
    const before=texture.version;skeleton.update();check.equal(texture.version,before+1);
    let disposed=0;texture.addEventListener('dispose',()=>disposed++);skeleton.dispose();
    check.equal(disposed,1);check.equal(skeleton.boneTexture,null);
    return { oldPalette:[...palette], textureAllocated:true, disposed };
  } },
  { id: 'camera-and-skinned-overrides', run(T, node) {
    const camera=node(T.PerspectiveCamera),mesh=node(T.SkinnedMesh);
    camera.position.set(2,3,4);camera.updateMatrixWorld(true);
    const identity=camera.matrixWorld.clone().multiply(camera.matrixWorldInverse);
    identity.elements.forEach((v,i)=>check.near(v,i%5===0?1:0));
    mesh.position.x=5;mesh.updateMatrixWorld(true);check.near(mesh.bindMatrixInverse.elements[12],-5);
    return { inverse:[...camera.matrixWorldInverse.elements], bind:[...mesh.bindMatrixInverse.elements] };
  } }
];

export function runSemantics(T) {
  check.equal(T.REVISION,'186','upstream revision');
  const results=[];
  for(const scenario of cases){
    const roots=[];
    const node=(Type=T.Object3D,instance)=>{const o=instance??new Type();roots.push(o);return o;};
    const before=T.diagnostics?.();
    try { results.push({id:scenario.id,passed:true,trace:scenario.run(T,node),wasmCalls:(T.diagnostics?.().wasmCalls??0)-(before?.wasmCalls??0)}); }
    catch(error){ results.push({id:scenario.id,passed:false,error:error.stack??String(error)}); }
    finally { for(const o of roots)T.release?.(o); }
  }
  return results;
}

export function compareTrace(actual, expected, path='trace') {
  if(typeof expected==='number'){check.near(actual,expected,path);return;}
  if(expected===null||typeof expected!=='object'){check.equal(actual,expected,path);return;}
  check.equal(Array.isArray(actual),Array.isArray(expected),path);
  check.deep(Object.keys(actual),Object.keys(expected),`${path} keys`);
  for(const key of Object.keys(expected))compareTrace(actual[key],expected[key],`${path}.${key}`);
}
