// Synthetic CPU diagnostic, not an unchanged upstream example.
// Uses pinned Three.js public animation and skinning APIs; no third-party asset.
export function createRig(THREE,{count=16,bones=24}={}) {
 if(!Number.isInteger(count)||count<1||count>256||!Number.isInteger(bones)||bones<2||bones>128)throw Error('Invalid rig dimensions');
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x17202a);
 const camera=new THREE.PerspectiveCamera(45,4/3,.1,200);const side=Math.ceil(Math.sqrt(count));
 camera.position.set(side*.45,bones*.13+side*.3,side*1.4+5);camera.lookAt(0,bones*.07,0);
 scene.add(new THREE.HemisphereLight(0xffffff,0x404050,3));
 const height=(bones-1)*.15,geometry=new THREE.CylinderGeometry(.11,.16,height,6,bones*2);geometry.translate(0,height/2,0);
 const indices=[],weights=[];for(let i=0;i<geometry.attributes.position.count;i++){
  const y=Math.max(0,Math.min(bones-1,geometry.attributes.position.getY(i)/.15));const b=Math.min(bones-2,Math.floor(y)),w=y-b;
  indices.push(b,b+1,0,0);weights.push(1-w,w,0,0);
 }
 geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
 const material=new THREE.MeshStandardMaterial({color:0x62bbd3,roughness:.8});
 const clips=[0,1].map(phase=>new THREE.AnimationClip(`pose${phase}`,2,Array.from({length:bones},(_,j)=>{
  const values=[];for(const t of [0,.5,1,1.5,2]){const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.sin(t*Math.PI+j*.3+phase)*.075);values.push(...q.toArray());}
  return new THREE.QuaternionKeyframeTrack(`bone${j}.quaternion`,[0,.5,1,1.5,2],values);
 })));
 const mixers=[],skeletons=[],meshes=[];
 for(let actor=0;actor<count;actor++){
  const chain=Array.from({length:bones},(_,i)=>{const b=new THREE.Bone();b.name=`bone${i}`;b.position.y=i?.15:0;return b;});
  for(let i=1;i<bones;i++)chain[i-1].add(chain[i]);
  const mesh=new THREE.SkinnedMesh(geometry,material);mesh.add(chain[0]);const skeleton=new THREE.Skeleton(chain);mesh.bind(skeleton);
  mesh.position.set((actor%side-(side-1)/2)*.7,0,(Math.floor(actor/side)-(side-1)/2)*.7);mesh.frustumCulled=false;scene.add(mesh);
  const mixer=new THREE.AnimationMixer(mesh);clips.forEach((clip,i)=>mixer.clipAction(clip).setEffectiveWeight(i?.25:.75).play());
  mixers.push(mixer);skeletons.push(skeleton);meshes.push(mesh);
 }
 return {scene,camera,mixers,skeletons,meshes,clips,count,bones,
  animate(dt=1/60){for(const m of mixers)m.update(dt);},
  snapshot(){return skeletons.flatMap(s=>Array.from(s.boneMatrices.slice(0,bones*16)));},
  volumes(){let nodes=0;scene.traverse(()=>nodes++);return {characters:count,bones:count*bones,sceneNodes:nodes,activeTracks:count*bones*2,clipBytes:clips.reduce((a,c)=>a+c.tracks.reduce((n,t)=>n+t.times.byteLength+t.values.byteLength,0),0),usefulPaletteBytes:count*bones*16*4,allocatedPaletteBytes:skeletons.reduce((n,s)=>n+s.boneMatrices.byteLength,0),allWorldMatrixReadBytes:count*bones*16*8};}
 };
}
