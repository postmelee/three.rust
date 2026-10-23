# Persistent transform facade

The optional C2 facade keeps evaluated local/world matrices in Rust across calls.
It accepts ordinary Three.js property writes and update methods within the scope
below. It does not port ordinary animation, visibility, render lists or the renderer.
The default `rthree` route remains the earlier eager transform bridge.

[Measured result](FACADE_REPORT.md): the facade currently regresses against original
Three.js in the cloud controls. Select it for evaluation, not an assumed speedup.

```js
import * as THREE from 'rthree/facade'; // matched design: rthree/facade-js
await THREE.init();
const scene = new THREE.Scene();
const object = new THREE.Object3D();
scene.add(object);
const cached = object.matrixWorld.elements;
object.position.x = 3;                 // JS write; no Wasm call
scene.updateMatrixWorld();             // one eligible batch
console.log(cached[12]);               // materialize this evaluated matrix only
THREE.release(scene);                 // references survive; later updates re-register
```

Select one entry per module graph. Alias third-party `three` imports to the same
entry and addon prefixes to the same package addon tree. The regular `init`, explicit
Wasm URL/bytes, error/retry, ESM and TypeScript rules still apply. No npm publication
is implied. The local demo includes both facade choices.

## Authority and work

| State or operation | Owner / behavior |
|---|---|
| Public Object3D, TRS, Euler/quaternion coupling, hierarchy and events | JS; setters mark dirty input without entering Wasm |
| Evaluated local/world matrices | Persistent Rust f64 state on the eligible Wasm route; same indexed arena in the JS control |
| `updateMatrix`, `updateMatrixWorld`, `updateWorldMatrix` | Ordered batch with upstream ancestor/child/force selection; displaced JS transform math skipped |
| Public matrix snapshots | Stable Matrix4 and proxy-array identities; first read after evaluation copies 16 values; repeated reads reuse the snapshot |
| Direct stale reads | Return the last evaluation, even when TRS is dirty; no implicit world update |
| Traversal, selection and operation list | JS on every call; not Rust-owned scene topology |
| Ordinary AnimationMixer, Skeleton and renderer | Existing JS; renderer reads public snapshots and pays their interception/materialization cost |

Pinned Matrix3/Matrix4/Vector3/Vector4 read-only consumers use a private read barrier:
materialize once, then read the backing array inside the operation. Public arrays
remain proxies; matrix destinations retain tracked writes. This avoids repeated
per-element interception in frustum/model-view math without porting that math to
Rust. The build checks each upstream source hash and selects read sites by syntax.

Initial registration uploads inputs and matrices. Subsequent calls upload changed
TRS/flags and user-edited matrices, not every cached output. Non-null pivots are
conservatively scanned because the application can share their Vector3. Unchanged
local composition is reused; world updates retain the force/auto semantics. This
same optimization exists in the JS control and must not be attributed to Rust.

Each operation has a slot and generation. The native evaluator validates the
complete buffer before modifying state. Released slots can be reused with new
generations. Public arrays are never Wasm views; memory growth cannot detach them.
`release` materializes pending snapshots and retires registered descendants. Retire
previously detached subtrees separately. GC cleanup is best effort; Wasm high-water
memory and arena-handle tombstones do not shrink.

## Bounded compatibility

| Case | Behavior |
|---|---|
| Ordinary TRS writes, six Euler orders, manual matrix element writes | Tracked and tested; same synchronous public values |
| Cached element arrays, slice/iteration, indexed reads/writes | Stable proxies created at Object3D construction; `Array.isArray` remains true |
| Assigning a caller-owned array/typed array to `elements` | Preserve the exact assigned reference; permanently use JS fallback for that object |
| Replacing Matrix4 objects, custom Object3D update overrides | Upstream dispatch/fallback; camera and SkinnedMesh post-update work retained |
| Callbacks, reentrancy and partial state after exceptions | Upstream order; eligible nested updates can batch |
| `Object3D.dispose()` | Upstream event; distinct from `release`, neither destroys public identity |
| Reflective equivalence | Not promised: tracked scalar and elements descriptors are accessors; elements are proxies |
| `structuredClone(matrix.elements)` | Unsupported for proxy arrays; explicitly snapshot with `Array.from(...)` first |
| Redefining/deleting tracked scalar descriptors, side-effectful accessors, custom Matrix4 math, prototype monkey patches | Outside the supported contract; do not assume transparent fallback |

Matrix-array define/delete/freeze operations leave the optimized route before
subsequent evaluation. Broad arbitrary Proxy/reflection compatibility, invalid
cyclic hierarchy edits, every addon, resource/context loss and Firefox/Safari
remain unverified. This is an opt-in experiment, not a drop-in replacement claim.

## Verification and measurement

```sh
npm run fixtures && npm run build
npm test
npm run test:facade
npm run test:compatibility
npm run test:browser
npm run test:package
node bench/facade.mjs suite=boundary repeats=6 warmup=40 samples=100 engines=original,js,wasm,packed-js,facade-js,facade-wasm out=work/facade-boundary
node bench/facade.mjs suite=render scenarios=hierarchy,small,shader repeats=6 warmup=30 samples=90 engines=original,js,wasm,packed-js,facade-js,facade-wasm out=work/facade-render
```

Use fresh directories. The benchmark runs one browser page at a time, rotates engine
order by repetition, records source hashes and observed clock precision, and uses
an isolated origin. Boundary runs contain no renderer; render runs preserve the
fixture work and report frame CPU separately from rAF intervals. Run `timings=true`
in a separate diagnostic directory, never mix those samples into primary timing.
`uploadedBytes` counts input/matrix payload stores (including parent-presence flags,
excluding allocator zeroing and internal dirty/generation bookkeeping);
`operationBytes` counts command records;
`materializedBytes` counts observed output copies. `abiCalls` includes native memory
setup and evaluation exports; `wasmCalls` counts only evaluation batches. Topology
collection and proxy interception remain paid even when copied bytes are zero.
`scannedBytes` in C2 counts TRS payload reads, not all eligibility/topology access or
memory traffic. `readMs` covers snapshot copying, not every proxy access.

Default browser mode deliberately uses cloud SwiftShader. Physical GPU qualification
requires the [hardware protocol](CI_GPU.md); CPU or kernel wins alone are not product
speedups. The [observable contract](FACADE_CONTRACT.md), [design decision](adr/0006-persistent-facade.md)
and implementation-specific tests define the supplied evidence.
