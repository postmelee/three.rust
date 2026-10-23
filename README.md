# three.rust

An experimental Rust/WebAssembly scene engine with a Three.js-style JavaScript interface.
The goal is to keep **scene state, animation, object/bone transforms and bone
palettes inside one persistent Rust pipeline**, then pass final buffers to the
renderer. The local JavaScript package is `rthree`.

[Documentation](docs/README.md) · [Build & run](docs/CLOUD_SETUP.md) · [Compatibility](docs/COMPATIBILITY.md) ·
[Architecture](docs/ARCHITECTURE.md) · [Roadmap](docs/PROJECT_PLAN.md) ·
[Performance](docs/PERFORMANCE.md) · [Owned animation API](docs/OWNED_ANIMATION.md) · [Contributing](AGENTS.md)

## Status

The goal is a useful Three.js replacement: little application change, preserved
behavior and worthwhile performance headroom. **Current stage: research prototype.**

[![Computation and persistent state ownership](docs/assets/progress.svg)](https://postmelee.github.io/three.rust/progress.html)

[Progress history](https://postmelee.github.io/three.rust/history.html) · [Detailed status](https://postmelee.github.io/three.rust/progress.html)

Cells represent known callable definitions and state declarations in the
[selected Three.js r186 sources](docs/PROGRESS.md), not all Three.js features or
product completion. History tracks these implementation counts.

An explicit accelerator is the first release target; application replacement then
requires only import, preparation and resolution changes. These are **future
qualification targets**, not measured promises. Early evidence does not mean a
gate is met; no gate is qualified yet.

<!-- adoption-goals:start -->
| Product gate | Target | Current status |
|---|---|---|
| Useful app-level speed | 20% and 1 ms less CPU time at p50 and p95 | Early evidence |
| A reason to choose Rust | 10% and 0.5 ms beyond the matched JS design | Not yet |
| Low migration cost | Import, preparation and resolution changes only | Early evidence |
| Preserved app behavior | Same features, interaction and visual quality | Early evidence |
| Bounded total cost | Control, startup, download and memory budgets | Not yet |
| Repeatable supported release | Two hardware classes and browser engines | Early evidence |
<!-- adoption-goals:end -->

[Product goals and acceptance rules](docs/PRODUCT_GOALS.md) explain the application
cohort, API tiers, budgets and evidence required for qualification.

## How much faster is it?

**In one Mac test, 16 animated characters used about 56% less CPU time per frame.**
This is an early result for the explicit owned-animation API, not a claim that
replacing the import makes every Three.js application faster.

<!-- performance-table:start -->
| Scene | Three.js | Same design in JS | Rust/Wasm | Observed CPU result vs Three.js |
|---|---:|---:|---:|---|
| 16 animated Fox characters | 0.45 ms | 0.25 ms | 0.20 ms | About 56% less CPU time (0.25 ms saved) |
| 1 animated Fox character | 0.10 ms | 0.15 ms | 0.15 ms | No demonstrated gain; owned paths measured higher |
| 1 static Fox character | 0.10 ms | 0.10 ms | 0.10 ms | No demonstrated gain |
<!-- performance-table:end -->

Measured on an **Apple M4 Pro / Chrome 155 / Three.js 0.186.1**, with a real Fox
asset, animation controls and periodic synchronous reads, at 640×480. Values are
medians of six runs' typical frame CPU times (p50), including updates, copying and
renderer submission. **FPS did not improve**: frame intervals stayed near 8.3 ms.

Most of the gain also appears in the same design written in JavaScript. Rust's
extra 0.05 ms saving is below the test's approximately 0.1 ms clock resolution,
so a distinct Rust advantage is still unproven. Small scenes showed no gain;
shader-heavy controls also showed no CPU benefit. Wasm initialization cost more.
See [conditions, limitations and reproduction](docs/PERFORMANCE.md).

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
