# three.rust

An independent experiment in moving Three.js CPU engine work into persistent
Rust/WebAssembly state while keeping a bounded JavaScript API. The local ESM
package is named **rthree** (name availability unverified; not published).

**Implemented:** a version-checked Three.js r186 source hook sends eligible
Object3D transform subtrees to an f64 Rust arena. The original JS composition
and parent-matrix calculation are skipped for that batch. Public objects and
matrix arrays keep their identity. The existing WebGL renderer, materials,
shaders, animation and skeleton palettes are retained. This is not a complete
Three.js port or a promise that changing an import speeds up a site.

**Evidence:** fresh M0 public-example profiles and target ADR were committed
before implementation. Native Rust, upstream differential, real browser
image/numeric and isolated package installation tests are included. Cloud
results include regressions and are not hardware desktop GPU/FPS evidence.
See [the report](docs/REPORT.md), [compatibility](docs/COMPATIBILITY.md),
[protocol](docs/BENCHMARKS.md) and [revised milestones](docs/PROJECT_PLAN.md).

```sh
npm ci
npm run fixtures
npm run build        # requires Rust 1.90.0 + wasm32-unknown-unknown
npm test
CHROMIUM=/usr/bin/chromium npm run test:browser
npm run test:package
npm run dev          # http://127.0.0.1:4173
```

[Clean install and real hardware measurement](docs/CLOUD_SETUP.md) includes
browser setup, exact commands and known omissions. `npm run bench:smoke` is a
short diagnostic. `npm run bench:full` runs the seven-repeat cloud protocol.

```js
import * as THREE from 'rthree';
await THREE.init();
const scene = new THREE.Scene();
const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshNormalMaterial());
scene.add(mesh);
mesh.position.x = 2;
scene.updateMatrixWorld(true); // synchronous after init
console.log(THREE.diagnostics());
// Later, when retiring the scene:
THREE.release(scene);
```

A original, B `rthree/js`, C `rthree`, and D `rthree/packed-js` use the same
application source through module resolution. Addons exported under
`rthree/addons/*` and `rthree/examples/jsm/*` share one core; third-party `three`
imports need an alias. Explicit Wasm initialization is an extra integration
step. WebGPU/TSL, CommonJS and untested ecosystem compatibility are not promised.

Repository layout: `crates/scene-core` (Rust), `packages/rthree` (bridge/API),
`scripts/build.mjs` (hash-checked fork/build), `fixtures` (fixed public examples),
`tests`, `bench/results` (raw evidence), `demo` and `.github/workflows`.
MIT for project code; upstream notice retained in vendor/three-examples/LICENSE
and generated packages. Downloaded Soldier asset is not relicensed/repackaged.
