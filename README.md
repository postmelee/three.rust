# three.rust

An experimental Rust/WebAssembly scene engine with a Three.js-style JavaScript interface.
The goal is to keep **scene state, animation, object/bone transforms and bone
palettes inside one persistent Rust pipeline**, then pass final buffers to the
renderer. The local JavaScript package is `rthree`.

[Build & run](docs/CLOUD_SETUP.md) · [Compatibility](docs/COMPATIBILITY.md) ·
[Architecture](docs/ARCHITECTURE.md) · [Roadmap](docs/PROJECT_PLAN.md) ·
[Benchmarks](docs/OWNED_REPORT.md) · [Owned animation API](docs/OWNED_ANIMATION.md) · [Contributing](AGENTS.md)

## Status

[![Computation and persistent state ownership](docs/assets/progress.svg)](https://postmelee.github.io/three.rust/progress.html)

[Progress history](https://postmelee.github.io/three.rust/history.html) · [Detailed inventory](https://postmelee.github.io/three.rust/progress.html)

\* Cells represent known callable definitions and state declarations in the
[selected Three.js r186 sources](docs/PROGRESS.md), not all Three.js features
or equal amounts of work. The inventory grows as the supported scope grows.

The compatibility facade batches eligible transforms in Rust while JS retains
public state. The separate [owned rig API](docs/OWNED_ANIMATION.md) keeps bounded
animation, object/bone transforms and bone palettes in Rust across frames.
It requires explicit commands and reads; it is not import-only AnimationMixer
compatibility. Whole-frame hardware acceleration remains unproven.

## Usage

Build and install the local package using the [setup guide](docs/CLOUD_SETUP.md).
It is not published to npm.

```js
import * as THREE from 'rthree';

await THREE.init();
const scene = new THREE.Scene();
scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshNormalMaterial()));
scene.updateMatrixWorld(true);
// When retiring the scene:
THREE.release(scene);
```

## Compatibility

The implemented path retains Three.js r186's WebGL renderer, materials and
shaders. Public object identity and synchronous methods are preserved within
the tested subset; Wasm requires explicit initialization. Addons must resolve
to the same core. Custom transform overrides use the documented JS fallback.
WebGPU/TSL and complete addon/ecosystem compatibility are not supported claims.
See the [compatibility contract](docs/COMPATIBILITY.md).

## License

MIT for project code. Three.js notices are retained. Downloaded example assets
have separate provenance and redistribution constraints; see [fixtures](fixtures/README.md).
