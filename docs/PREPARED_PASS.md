# Prepared main-pass experiment

C3 extends the optional C2 facade through retained topology, visibility, ordering
and per-draw matrices. Select `rthree/prepared` for Rust or `rthree/prepared-js` for
the same design in JS. This is a bounded experiment; the default `rthree` entry is
unchanged. Selecting it does not establish a full Three.js replacement. See the
[measured full-path result and regressions](PREPARED_REPORT.md).

```js
import * as THREE from 'rthree/prepared';
await THREE.init();
const scene = new THREE.Scene();
const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
scene.add(mesh);
// Use ordinary properties, hierarchy methods and renderer.render(scene, camera).
// Retire the scene with THREE.release(scene), plus normal resource disposal.
```

## Boundary

| Stage | C3 behavior |
|---|---|
| Public objects, TRS and hierarchy methods | JS identities and synchronous controls; writes queue dirty records |
| Topology | Retained numeric parent/slot/generation plan in Rust; structural changes rebuild it once |
| Transform evaluation | Persistent f64 matrices; unchanged topology creates no per-node JS command list |
| Observation | C2 stable proxy arrays; revisions materialize only observed matrices; direct reads stay lazy |
| Main-pass evaluation | Native inherited visibility/layers/group order, transformed-sphere culling, default opaque/transparent ordering, model-view and inverse-transpose normal matrices |
| Renderer consumption | Compact visible-resource and draw lists; existing WebGL resource updates, materials/shaders and final uploads; replaced JS projection/sort/matrix calculations skipped |
| Shadows | Existing JS shadow renderer; main-pass numerical/image interaction is tested separately |

Prepared routes check a public matrix's native revision on its first observation
after a successful transform evaluation. Later reads in that evaluation epoch
reuse the verified JS snapshot. Retained, local and selective evaluation all
invalidate this observation guard; manual writes remain tracked, and reads before
an update retain the existing stale-value semantics. Cached array identities,
release/reacquisition and memory growth keep the same contract. This policy is
identical in the JS and Wasm routes and does not imply a measured frame speedup.

The JS control has the same state layout, arithmetic and sorting keys. Both still
perform dirty synchronization, shared geometry/material checks, visible resource
updates, draw-list handoff and final matrix copies in JS. Uniform caches use a pinned private read barrier;
only the normal Float32 upload arrays reach WebGL. Transform evaluation and pass
evaluation are separate calls around the required scene/camera callback boundary;
intermediate world matrices remain in native state. Native topology reflects
public JS hierarchy commands; this is not sole authority over arbitrary JS objects.

## Supported path and fallback

The prepared main path covers ordinary `Mesh` objects with a single material,
non-morph BufferGeometry, Scene/Group/Object3D ancestors, ordinary lights and a
single perspective/orthographic WebGL camera per call. Opaque and transparent
materials, visibility/layers, group/render order, mutable bounds, standard draw
ranges, negative/nonuniform scales and singular normal matrices are covered.
Separate successive cameras are supported; a single ArrayCamera pass is not.
A camera parented into the scene prevents the retained whole-scene plan: upstream
traversal preserves its inverse-matrix post-update. Keep this fallback in timings.

| Condition | Behavior |
|---|---|
| Custom object render/shadow callbacks, custom culling, material onBeforeRender or attribute upload callbacks | Entire main pass uses upstream projection/sort/matrix path |
| Material arrays, transmission, skinned/instanced/batched meshes, morph geometry, lines/points/sprites/LOD, node materials, XR or overrideMaterial | Upstream main pass; eligible transforms can still use C2/C3 |
| Non-null pivot, custom transform dispatch, replaced matrix/element arrays or layer objects | General C2/upstream update path with documented fallback |
| Scene auto-update disabled or manual world-array writes | Import pending public matrix writes without evaluating dirty TRS before rendering |
| Changes during shadow/render callbacks | Invalidate prepared per-draw matrix consumption; retain upstream callback order |

`add`, `remove` and `attach` invalidate after the hierarchy mutation and before its
synchronous events. Direct edits/reordering of `children` or assignment to `parent`
are outside the cached-topology contract; use hierarchy methods. Reflection,
structured cloning of proxy arrays, deletion/redefinition of tracked descriptors,
side-effectful accessors, custom math/geometry routines and global prototype changes
remain excluded. Arbitrary subclass behavior and every addon are not verified.

The [C2 contract](PERSISTENT_FACADE.md) still governs identity, lazy/forced reads,
initialization, core/addon resolution and memory growth. Release preserves public
snapshots and dirty flags. Plans/slots are retired; linear memory and monotonic
handle tombstones retain their high-water allocation. Lifecycle qualification is
not implied by bounded release tests.

Dirty queues hold weak record references, so abandoned detached objects do not
stay alive solely because they have pending input/metadata. A forced-GC regression
test checks native slot retirement. This does not guarantee when browser GC runs;
explicit release is still the deterministic lifecycle operation.

## Diagnostics and verification

- `topologyBuilds`: full topology rebuilds, not per-frame updates.
- `dirtyRecords`: records synchronized by the retained path.
- `operationBytes`: command-buffer writes; unchanged whole-scene updates add none,
  but camera/general selective operations still contribute.
- `preparedInputBytes`: plan metadata, changed geometry/material records and camera
  payload stores. Allocation zeroing/internal native traffic are excluded.
- `preparedWasmCalls`, `preparedPasses`, `preparedDraws`: actual pass evaluation/work.
  Transform `wasmCalls` remains separate; `abiCalls` includes both and setup exports.
- `preparedMatrixBytes` / `preparedMatrixReads`: final 25-value per-draw copies.
  C2 `materializedBytes` separately counts local/world snapshots; neither is GPU
  transfer telemetry.
- Instrumented `prepareMs` includes preparation/resource/list handoff;
  `prepareKernelMs` is its native/JS evaluator subset. `preparedReadMs` times final
  copies. Do not add nested timings or mix them into primary results.

Run `npm run test:prepared` for the state/upstream/pass and real-browser oracles.
The versioned [hook hashes](prepared-source.json) guard WebGL integration;
[ADR 0007](adr/0007-prepared-main-pass.md) and the
[experiment plan](../mydocs/plans/task_m5_40.md) define scope and decision thresholds.
Physical-hardware results, representative-app profiles, other browser engines,
context recovery and product qualification remain outstanding.

The arithmetic and ordering follow pinned Three.js r186 Matrix4, Matrix3, Sphere,
Frustum and WebGLRenderLists semantics. The native and matched JS implementations
retain that provenance; the [Three.js MIT notice](../vendor/three-examples/LICENSE)
ships with the local package. Source extraction hashes cover these math files in
[progress-source.json](progress-source.json); renderer hook hashes are listed above.
