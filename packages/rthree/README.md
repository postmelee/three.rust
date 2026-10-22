# rthree 0.1.0-alpha.0

Local research package. Based on Three.js 0.186.1. Only eligible Object3D
`updateMatrixWorld` subtree composition/propagation is ported to Rust/Wasm.
Existing WebGL renderer, math API, animation, skeleton palette, materials and
shaders remain JavaScript/GPU. This is **not** a complete Three.js Rust port.

```js
import * as THREE from 'rthree';
await THREE.init(); // fetch/compile Wasm; failures reject, no silent fallback
const scene = new THREE.Scene();
const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshNormalMaterial());
scene.add(mesh);
// Existing properties and methods remain synchronous after init.
scene.updateMatrixWorld(true);
console.log(THREE.diagnostics());
// When retiring the scene (also dispose renderer/geometries/materials normally):
THREE.release(scene);
```

Use `rthree/js` for the unaccelerated compatibility core, `rthree/packed-js` for
the experimental same-layout JS control. Select one mode per module graph;
reload to switch. Init accepts `{wasmURL}` or `{wasmBytes}` for custom hosts/Node.
Bundlers must emit `scene_core.wasm` beside the package runtime or supply its URL.
No top-level await in the package. ESM only; CommonJS require is unsupported.

Tested addon paths include `rthree/addons/loaders/GLTFLoader.js`,
`controls/OrbitControls.js`, `lights/SunLight.js`, `utils/SkeletonUtils.js` and
`utils/BufferGeometryUtils.js`. `rthree/examples/jsm/*` is an alias to the same
files. Root and these addon modules use one bundled core. External libraries
importing `three` must alias it to the selected rthree entry; avoid a second core.
WebGPU/TSL and addons requiring them are unsupported. Broad exports do not
imply broad verification. TypeScript uses @types/three 0.186.0; runtime baseline
is three 0.186.1. Type checking is not a full API parity guarantee.

Custom updateMatrix/updateMatrixWorld overrides, cameras and SkinnedMesh
retain original dispatch; eligible descendants may batch. updateWorldMatrix,
getWorldPosition and other synchronous read/update APIs remain upstream JS.
Direct TRS/pivot/matrix writes are scanned at batch boundaries; no Proxy and
no immediate Wasm getter per scalar. Existing stale matrix reads stay stale.
Matrix4 and elements array identities are preserved. Cyclic/invalid manually
edited children graphs, arbitrary accessor side effects, global prototype
monkey patches, changing the engine after initialization, other Three versions
and private/deep imports are unsupported. release() frees associated arenas;
FinalizationRegistry is only best-effort. Linear memory does not shrink.

Cloud benchmark results include regressions; do not use kernel timings as
product speed claims. See repository docs/REPORT.md and docs/COMPATIBILITY.md.
Both project MIT and upstream THREE-LICENSE notices are included.
