import * as THREE from 'rthree';
import { GLTFLoader } from 'rthree/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'rthree/addons/controls/OrbitControls.js';
await THREE.init();
const scene: THREE.Object3D = new THREE.Scene();
const mesh = new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());
scene.add(mesh); mesh.position.x=1; scene.updateMatrixWorld(true);
mesh.getWorldPosition(new THREE.Vector3());
new GLTFLoader(); new OrbitControls(new THREE.PerspectiveCamera(),document.createElement('canvas'));
THREE.release(scene);

// Public references retain their ordinary types across synchronous operations.
const positionAlias: THREE.Vector3 = mesh.position;
const worldAlias: THREE.Matrix4 = mesh.matrixWorld;
positionAlias.x = 2;
mesh.updateWorldMatrix(true, false, true);
const worldTarget: THREE.Vector3 = mesh.getWorldPosition(new THREE.Vector3());
const skeleton = new THREE.Skeleton([new THREE.Bone()]);
if (skeleton.boneMatrices === null) throw new Error('Skeleton palette unavailable');
const paletteAlias: Float32Array = skeleton.boneMatrices;
skeleton.update(); skeleton.computeBoneTexture(); skeleton.dispose(); mesh.dispose();
void worldAlias; void worldTarget; void paletteAlias;

import {createOwnedAnimation,createOwnedRenderer,type OwnedDescriptor,type OwnedCommand} from 'rthree/owned';
const ownedDescriptor:OwnedDescriptor={parents:[-1],basePose:[[0,0,0,0,0,0,1,1,1,1]],inverseBind:[new THREE.Matrix4().toArray()],roots:[new THREE.Matrix4().toArray()],clips:[{duration:1,tracks:[]}]};
const owned=await createOwnedAnimation(ownedDescriptor,{backend:'js'});
const ownedCommands:OwnedCommand[]=[{type:'action',rig:0,clip:0,weight:1},{type:'pause',rig:0,clip:0,value:true}];
owned.commands(ownedCommands);owned.step(0);const ownedPalette:Float32Array=owned.snapshot().palette;
const ownedAdapter=createOwnedRenderer(THREE,owned,{scene:new THREE.Scene(),geometry:new THREE.BufferGeometry(),material:new THREE.MeshStandardMaterial()});
void ownedPalette;void ownedAdapter;owned.dispose();
