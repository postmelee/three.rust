# Detailed engine investigation — Task #7

Dated research from 2026-10-23, retained from commit 9527a04. This is investigation
evidence, not an implemented API contract. [Current direction](../../docs/RUST_ENGINE_STRATEGY.md)
and [ADR 0005](../../docs/adr/0005-wide-engine-investigation.md) are the public entry points.

# A Rust engine behind the Three.js interface

## Recommendation

Investigate a replacement **CPU scene engine**, with an experimental path all the
way to prepared render passes. Keep Three.js-compatible public objects as a facade;
do not reproduce its internal class graph in Rust. A full Rust renderer is a valid
alternative to test, not a prerequisite or an established speed improvement.

The next architectural experiment should be larger than the current Fox adapter:

```text
Application: Object3D / AnimationMixer / renderer.render / reads / callbacks
                               |
JS compatibility facade: stable identities, ordered writes, synchronous barriers
                               |
Rust-owned persistent scene:
  clips/actions -> poses -> hierarchy/world transforms -> skin palettes
  -> bounds/visibility/LOD -> per-camera/pass lists -> dirty upload spans
                               |
Prepared pass data + resource handles + explicit callback barriers
                               |
Versioned WebGL consumer initially; compare a Rust backend if needed
                               |
Browser graphics API -> GPU
```

This is the proposed destination. Today only the finite explicit animation-to-palette
domain exists. General compatible animation, bounds, lists and the prepared-pass
consumer in this diagram are **not implemented**. See [ADR 0005](../../docs/adr/0005-wide-engine-investigation.md).

We should not require the small Fox experiment to qualify as a product before
testing whether a larger ownership boundary works. Exploratory implementation and
real-app profiling can proceed together. Product qualification remains gated by
[adoption-v1](../../docs/PRODUCT_GOALS.md); broader experiments do not change its thresholds.

## What the current evidence establishes

The physical M4 Pro experiment found 0.45 / 0.25 / 0.20 ms CPU p50 for Three.js /
owned JS / owned Wasm at 16 animated Foxes. Most gain is already in the JS design;
the extra 0.05 ms is below the old clock increment. Smaller cases do not establish
a benefit. This is evidence for changing ownership, not proof of Rust's independent
value or an argument that a larger Rust core cannot work. [Full report](../../docs/MAC_HARDWARE_REPORT.md).

The new [boundary diagnostic](../../bench/results/ownership-boundary-20261023/README.md)
varies retained state, batched/fragmented commands and full reads with equivalent
final numerical state. It uses the existing engine, shared cloud CPU and no renderer.
Its block timings locate experimental pressure points; they are not app benchmarks.
At 64 synthetic rigs × 96 bones, retained-state block-average tick medians were
2.4809 ms JS and 1.2341 ms Wasm; requesting all state each tick raised Wasm to
2.2027 ms. This supports testing compute-heavy retained domains and selective reads.
It does not establish new app performance, and no engine optimization was made.

## What the source actually does

The audit pins Three.js 0.186.1 / r186 commit
[`9b4a2ac`](https://github.com/mrdoob/three.js/tree/9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8).
[Source hashes and external pins](../../docs/ownership-source-audit.json) make these observations
reviewable. Line numbers refer to that source, not a moving main branch.

| Observed source | Cost or semantic consequence | Candidate change |
|---|---|---|
| `owned-layout.js:114` allocates a 20-f64 record per command, including small weight changes | 160 bytes per command plus JS validation; Rust validates ABI input again | Reusable command storage and compact typed opcodes; preserve ordered/atomic validation and compare matched JS |
| `owned.js` owns one domain, but `snapshot()` copies all five buffers | Requesting one piece of state currently materializes the whole domain | Selective stable-object read barriers and field/range reads, charged to the requesting call |
| `owned-renderer.js` copies roots/palettes into presentation meshes and dirties textures | One avoided JS bone pass still leaves output copies and full palette upload decisions | Internal Wasm-backed views with lifetime guards, padded output layout and dirty ranges; browser GPU upload still costs |
| `WebGLRenderer.js:1709` recursively projects objects, then sorts lists | Normal `render(scene,camera)` cannot consume an arbitrary Rust list without doing this work again | Version/hash-checked prepared-pass entry point that actually bypasses traversal/list construction |
| `WebGLRenderer.js:2155` invokes object callback, computes model-view/normal matrices, then material callback | Precomputing everything before callbacks can change behavior | Explicit callback boundaries and version checks; preserve callback order and exceptions |
| `WebGLShadowMap.js:518` onward traverses and tests shadow objects separately | A main-camera list is not a complete frame | Separate camera/light/pass visibility and lists; keep depth/distance materials and shadow behavior |
| `WebGLRenderLists.js` uses group/render/material/variant/depth/id keys | A generic Rust sort may change deterministic ordering | Exact key and tie semantics, transparent ordering and custom-sort fallback |
| `BatchedMesh.js:1523` builds visibility/sort/multi-draw data; `InstancedMesh` already exists | Batching is not uniquely available to Rust | Include upstream best-practice batching and matched JS controls; never compare only with a deliberately unbatched baseline |

This audit identifies work, not its fraction of a representative application's
frame. Camera/pass count, visible population, changes and synchronous read demand
determine whether moving it is worthwhile. The current renderer also reuses lists
and caches resources: it is incorrect to assume every JS frame allocates everything.

## Where Rust can add value

| Mechanism | Plausible benefit | What must be compared or preserved |
|---|---|---|
| Contiguous persistent storage, stable handles, dirty dependency graph | Less object chasing, allocation and repeated traversal; smaller working set | Matched typed-array JS can obtain much of this; Rust allocations are not automatically absent |
| Wasm SIMD over many independent objects/bones/bounds | Explicit vector work unavailable as equivalent ordinary JS instructions | Scalar Rust versus SIMD Rust, same precision/algorithm, emitted SIMD verification and full-path timing |
| Parallel jobs over independent rigs/subtrees/pass work | Spread sufficiently large CPU work across cores | JS workers control, scheduling/join costs, deterministic order, race/lifetime safety and main-thread read barriers |
| Fused evaluation and renderer preparation | Keep intermediate poses/matrices/lists out of JS | No duplicate JS traversal; actual final output/copy/submission included |
| Better spatial/animation algorithms | Fewer tests, dirty updates, shared immutable clip data, cached key intervals | Apply to JS too; exact-time/weight sharing only where semantics match; do not silently quantize animation |
| GPU animation/culling/indirect work | Avoid CPU work and repeated uploads for large GPU-friendly workloads | Independent backend/algorithm experiment; GPU cost, latency and synchronous CPU queries; compare upstream WebGPU too |

SIMD is a serious next experiment, not a compiler-language guarantee. The current
engine evaluates in f64 and outputs f32 palettes. Wasm SIMD has f64 lanes as well
as f32 lanes; evaluate f64 SIMD first where possible. A faster f32 path changes the
precision contract and needs separate error, large-coordinate, deep-hierarchy and
image tests. [glam's pinned README](https://github.com/bitshifter/glam-rs/blob/f0396ebdb5ce214fef80cfef03899de9b752bc54/README.md)
describes `+simd128` and explicitly says its Wasm SIMD performance was not benchmarked.
It is a reuse candidate, not speed evidence for this project. No dependency is added.

Threads are not free web-native Rust threads. The inspected
[wasm-bindgen-rayon setup](https://github.com/RReverser/wasm-bindgen-rayon/blob/4eea1fa55a965ad516ef9f9e9449704c7eac91c5/README.md)
uses Workers, shared memory, isolation headers, asynchronous pool initialization and
a pinned nightly/build-std setup. These are that adapter's requirements, not a claim
that every worker solution needs nightly. Isolation affects third-party resources
and deployment. Main-thread synchronous APIs cannot simply become async worker
messages; use a synchronous path/barrier or an explicitly different API. Do not
hide one-frame staleness, busy-wait joins or dropped callbacks as an optimization.

## Public-call compatibility includes observable objects

Keeping names and signatures is necessary but insufficient. For example:

```js
const p = mesh.position;
const elements = mesh.matrixWorld.elements;
mesh.position.x = 2;
mixer.update(dt);             // actions/events/bound values have defined order
mesh.updateMatrixWorld(true);
console.log(p === mesh.position, elements[12]);
renderer.render(scene, camera);
```

Rust may store handles and packed arrays internally. The facade must still preserve
the supported observation sequence, references and mutations. The target design is:

| Public behavior | Proposed contract / unresolved work |
|---|---|
| Objects and aliases | Stable JS wrappers indexed by generation-checked handles; preserve supported prototype/`instanceof`, `is*` flags, `uuid`, `.parent`/`.children` and clone/serialization semantics. Avoid duplicating an authoritative scene in both runtimes |
| `position.x`, `.set()`, Euler/quaternion coupling | Mutations are visible synchronously to JS aliases and recorded as ordered changes. Methods batch writes. Measure accessor/property-descriptor differences; replacing ordinary fields with accessors is observable |
| `matrix.elements[i]`, cached arrays | Ordinary Array writes cannot be detected by a mere version field. Options are compatible tracked arrays/proxies, scanning only exposed mutable buffers, or a slower fallback. Array type/identity/descriptor semantics need tests. No claim that all arbitrary writes are free |
| Reads | Distinguish upstream lazy/stale values from methods that force an update. Flush the required dependency closure at the same semantic point. Do not make previously stale reads eagerly fresh. Selective materialization must preserve cached aliases |
| `AnimationMixer.update` | Results visible at the appropriate synchronous return. Loop/finished callbacks can run before property bindings are applied; a post-frame event queue is not equivalent. Resume evaluation around actual callback barriers, including mutation and exceptions |
| Hierarchy, force and disposal | Ordered add/remove/attach, parent dependencies and force flags; generation-safe IDs, detachment and event ordering. Reusing a freed slot must not revive an old JS wrapper |
| Render callbacks/custom sort | Preserve r186 order and mutations, including exceptions, nested renders and multiple cameras. Isolate unsupported domains explicitly; do not silently disable callbacks or re-cull differently |
| Wasm views | Keep views internal unless lifetime is part of the API. Growth can invalidate old non-shared-memory views; recreate internal views or reserve bounded arenas. A cached public Array cannot silently become a detached TypedArray |
| Addons/types/packages | One exported core identity for root and addon imports. Test real GLTFLoader/controls/SkeletonUtils consumers and NodeNext/bundler/browser resolution. Declarations cannot promise unimplemented runtime behavior |
| Initialization | Explicit asynchronous preparation before compatible synchronous constructors/methods. Async constructors or async replacements of sync methods are a separate migration contract |

Begin with a documented fast domain and observable synchronous semantics. Fall back
at an explicit object/domain boundary where needed, rather than calculating the
same state twice. Report fallback incidence and timing in each workload. Keep the
explicit accelerator available while the compatible facade grows.

## Should the renderer also be rewritten?

Compare three strategies rather than treating the existing renderer as permanent:

| Strategy | Why test it | Main risk |
|---|---|---|
| Rust evaluation + narrow prepared-pass consumer in pinned Three.js WebGL | Removes CPU traversal/preparation while retaining shader/material behavior and an image oracle | Adapter maintenance; callbacks and shadows require real integration, not just `renderBufferDirect()` in a loop |
| Rust evaluation + Rust WebGL resource/submission layer | Removes JS material/resource/cache work when that work is materially expensive | GLSL variants, texture formats, color management, render targets, shadows, context loss and disposal must be reproduced |
| Rust/wgpu WebGPU backend | New backend design, buffer organization, bundles/compute where useful; potential native reuse | Different backend/quality/features and async setup confound language comparison; browser support and shader/custom-material compatibility |

In the pinned [wgpu browser backend](https://github.com/gfx-rs/wgpu/blob/63e505290e82708a53b53eb8a16aec731683be63/wgpu/src/backend/webgpu.rs),
`write_buffer` (2872), `submit` (2990), and `draw` (3861) call browser WebGPU bindings.
Rust does not gain direct native-driver access in a normal browser Wasm module.
A prepared Rust list is data, not a native browser GPUCommandBuffer. Reducing API
calls through valid instancing/batching/bundles may help; translating every existing
GL call to a Wasm import may hurt. GPU shader work remains on the same GPU.

The prior [reuse audit](../../bench/results/owned-reuse-20261023/README.md) compiled
three candidate Rust projects but did not qualify their full browser compatibility
or speed. It remains useful source/build evidence, not proof that adopting a whole
candidate engine is cheaper. WAMR3D license uncertainty still blocks copying its
code. This investigation imports none of their implementations and makes no new
candidate-build claim.

## Opportunity budget

For a first-order CPU budget, let `T` be baseline CPU time, `f` the fraction replaced,
`s` the speedup of that work, and `B` the **net additional** facade/sync/submission
cost after accounting for removed copies. Then `Tnew = T × (1 - f + f/s) + B`.
Avoid double-counting boundary costs already in the baseline. This is an explanatory
model; callbacks, caches and concurrency require measurement.

Illustrative assumptions, **not predictions or measured results**:

| Baseline | Replaced fraction | Replaced work speed | Extra boundary | New CPU | Saving |
|---|---|---|---|---|---|
| 8 ms | 10% | 4× | 0.4 ms | 7.8 ms | 0.2 ms / 2.5% |
| 8 ms | 60% | 2× | 0.4 ms | 6.0 ms | 2.0 ms / 25% |
| 8 ms | 60% | 4× | 0.4 ms | 4.8 ms | 3.2 ms / 40% |

This is why widening the boundary can matter more than translating additional
math methods. Conversely, a shader-bound frame may show no display-rate improvement
even with substantial CPU savings. FPS is not the reciprocal of these CPU numbers.

## Concrete investigation sequence

1. **Prototype a compatible facade and cost model now (#7/#8).** Stable wrappers,
   tracked TRS writes, selective synchronous reads, cached matrix alias behavior,
   ordered event/callback boundaries. Measure no-read, sparse-read, all-read and
   per-object callback workloads. Preserve the current explicit path as a control.
2. **Build a prepared-pass experimental slice (#7, informing #16).** Start with
   dynamic opaque meshes: persistent transforms, conservative bounds, frustum
   tests, exact opaque ordering, model-view/normal matrices and dirty upload spans.
   Consume that plan in the pinned renderer without running the displaced JS work.
   Add a second camera and a shadow pass before claiming a general frame pipeline.
   This finite experiment may start before M6 release qualification; it does not
   complete M7. Unsupported features must be rejected or use an explicit measured
   fallback. Transparent/transmissive paths remain a separate contract.
3. **Exploit Rust directly inside this domain.** Compare scalar f64 and verified
   SIMD builds, then jobs over sufficiently large independent domains. Compare
   matched JS layout/algorithm and JS workers. Keep f32/GPU-compute variants separate.
4. **Run real-app profiles alongside these prototypes (#5).** Animation-rich
   character interaction plus a spatially dense viewer/configurator with picking,
   edits, cameras and shadows. Select licensed existing applications after source
   inspection; these categories are not an accepted cohort yet. Include static,
   read-heavy, callback-heavy and GPU-heavy negative controls and upstream batching.
5. **Use a measured backend decision (#15/#17).** If residual renderer/resource
   work or adapter copy cost prevents a useful result, implement the same finite
   pass with Rust WebGL and assess WebGPU separately. Retain identical quality,
   required features and equivalent optimized upstream alternatives.

Before each implementation, freeze its feature scope, numerical oracle and budget.
Record complete-path p50/p95/p99, frame intervals, command/copy/read/callback costs,
startup/download/memory/lifecycle, and actual displacement counters. Profiles with
instrumentation are separate from product timings. The unchanged adoption gates
still decide whether the result is useful to users.

## Decision limits

We recommend expanding the **experiment**, not declaring a winning architecture.
No new application, desktop GPU, SIMD, worker or complete-renderer performance result
is supplied here. A successful full CPU engine can remain partly JS at the public
and browser boundaries. One-to-one translation is useful selectively as a correctness
reference; it is not the default architecture or a measure of replacement readiness.
