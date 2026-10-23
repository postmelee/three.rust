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

import {createOwnedAnimation,createOwnedRenderer,type OwnedDescriptor,type OwnedCommand} from 'rthree/owned';
const ownedDescriptor:OwnedDescriptor={parents:[-1],basePose:[[0,0,0,0,0,0,1,1,1,1]],inverseBind:[new THREE.Matrix4().toArray()],roots:[new THREE.Matrix4().toArray()],clips:[{duration:1,tracks:[]}]};
const owned=await createOwnedAnimation(ownedDescriptor,{backend:'js'});
const ownedCommands:OwnedCommand[]=[{type:'action',rig:0,clip:0,weight:1},{type:'pause',rig:0,clip:0,value:true}];
owned.commands(ownedCommands);owned.step(0);const ownedPalette:Float32Array=owned.snapshot().palette;
const ownedAdapter=createOwnedRenderer(THREE,owned,{scene:new THREE.Scene(),geometry:new THREE.BufferGeometry(),material:new THREE.MeshStandardMaterial()});
void ownedPalette;void ownedAdapter;owned.dispose();
