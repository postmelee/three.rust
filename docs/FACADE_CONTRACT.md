# Observable compatibility contract

Scope: C1, pinned **three 0.186.1 / r186**, declarations **@types/three 0.186.0**.
The tests below characterize six routes, including the bounded
[C2 persistent transform facade](PERSISTENT_FACADE.md). They do not qualify an application.
See [current compatibility](COMPATIBILITY.md) and the separate [owned API](OWNED_ANIMATION.md).

## API tiers

| Tier | Authority and behavior | Current status |
|---|---|---|
| Ordinary original / compatibility JS | Three.js objects, methods, events and state | Reference and control |
| Ordinary Wasm transform bridge | JS properties authoritative; Rust batches eligible transforms; public matrices updated in place | Implemented; same application operations in the contract suite |
| Explicit owned rig | Rust or matched JS owns descriptor/action/pose/world/palette; commands and paid snapshots | Implemented finite API; not ordinary AnimationMixer compatibility |
| Persistent transform facade (C2) | JS public inputs; persistent evaluated Rust matrices and stable proxy snapshots | Implemented opt-in subset; passes this contract and [dirty/read/lifecycle tests](../tests/facade-worker.mjs) |

## Executable matrix

Each ID identifies a scenario in [cases.mjs](../tests/compatibility/cases.mjs).
Every scenario asserts independent expectations on the upstream route before its
trace is compared with compatibility JS, Wasm, packed JS and both C2 routes. Ordinary animation, events and palette
methods below still execute upstream JS, even when transforms use Rust.

| ID | Required observable behavior | Existing Wasm route |
|---|---|---|
| `identity` | Cached TRS, matrix and elements references survive updates; position assignment throws in strict mode | Public JS objects; batched transforms |
| `rotation-coupling` | Euler/quaternion changes synchronize immediately across six Euler orders | JS coupling |
| `lazy-and-forced-reads` | Direct world read may be stale; getWorldPosition updates ancestors/target, not siblings | JS read method; eligible update batches |
| `manual-matrix-and-force` | Direct array writes, manual matrices, world-auto flag and force obey upstream; replacement elements retained | Batched transforms |
| `external-parent` | updateMatrixWorld uses existing parent world; updateWorldMatrix(true, ...) requests ancestor updates | Mixed batch/JS paths |
| `pivot` | Direct r186 pivot edits participate in composition | Batched transforms |
| `hierarchy-events` | Detach/add changes and child/parent events occur synchronously in upstream order | JS hierarchy/events |
| `attach` | World transform retained during reparenting with supported uniform scales | JS method |
| `listener-mutation-and-reentrancy` | Listener list copied per dispatch; duplicate listener suppressed; nested dispatch synchronous | JS dispatch |
| `exception-partial-state` | User exception propagates synchronously; earlier mutations remain and later traversal is skipped | JS fallback for custom update |
| `custom-update-dispatch` | Overrides and their side effects execute; no silent bypass | Tested fallback |
| `clone-and-resource-identity` | Clone separates transforms/userData, shares geometry/material; dispose emits an event without detaching or killing the object | JS methods |
| `animation-event-observation` | Action identity and loop/finished timing preserved; event observes previous bound pose before this update applies new values | JS mixer/action/binding |
| `arbitrary-property-animation` | Generic JS property binding and original-value restoration remain observable | JS binding; not owned-rig support |
| `skeleton-palette-lifecycle` | Palette consumes existing bone worlds; regular update retains array; computeBoneTexture replaces it; dispose clears texture | JS skeleton |
| `camera-and-skinned-overrides` | Camera inverse and attached bind inverse retain post-update semantics | JS override; eligible descendants may batch |

The browser [render contract](../tests/compatibility/render.mjs) adds two cameras,
callback arguments/identity, writes followed by synchronous reads, model-view
preparation between object/material callbacks and exact same-device pixels.

Other required gates reuse existing tests rather than treating this matrix as exhaustive:

| Boundary | Executable evidence |
|---|---|
| Wasm actually runs; replaced eligible JS math skipped | [differential tests](../tests/differential.mjs), contract per-case call counters |
| Cross-arena memory growth, release/recreate, stable public arrays | differential tests; [owned lifetime tests](../tests/owned.mjs) for the separate API |
| Missing init, rejected init/retry, concurrent init, mixed-mode rejection | [fresh installed package test](../tests/package.mjs) |
| One core/addon identity, both addon prefixes, isolated package resolution | fresh installed package test, differential GLTFLoader/SkeletonUtils tests |
| TypeScript NodeNext and Bundler resolution | fresh installed package test and [consumer source](../tests/types.ts) |
| Broader images/shadows and current renderer behavior | [existing browser test](../tests/browser.mjs); not an exhaustive renderer audit |

## C2 authority and observation rules

1. Keep each public object's identity stable. A field is Rust-owned only when Rust
   produces authoritative evaluated state; copying JS values into an arena is a cache.
   Pending user writes and evaluated state need explicit ordering and versioning.
2. Direct local writes are immediately readable. Preserve Euler/quaternion coupling.
   A cached raw array cannot acquire an invisible read barrier: reconcile escaped
   array writes at the required operation and materialize results into existing
   aliases when upstream does. Include scans/copies in timing. Do not replace arrays
   with detached Wasm views or assume a Proxy is observationally equivalent.
3. Preserve upstream laziness. Direct matrixWorld access does not itself request a
   world update. Forced methods obey ancestor/child/auto flags; do not refresh unrelated
   objects simply because the Rust implementation can update the whole scene.
4. Hierarchy mutation and callbacks expose intermediate state. Flush only the work
   due before an observation, invoke JS synchronously, then reconcile callback writes
   before continuing. Do not defer events to the frame end or make all operations
   transactional: thrown callbacks can leave partially changed state upstream.
5. Preserve state ownership across fallback. Unsupported custom updates/bindings need
   a tested JS domain transition before continuing, or explicit rejection before
   acquisition. Never run the complete pose in both JS and Rust. Ordinary animation
   events are not supplied by the finite owned API's command transaction semantics.
6. Wasm memory growth must not detach public aliases. Explicit release invalidates
   internal handles without conflating it with Object3D.dispose: r186 objects remain
   attached and usable after disposal. Shared geometry/materials have separate lives.
7. Eligibility and exclusions must be available before an application opts in. C2
   acceptance needs new authority, growth, invalidation, fallback and bypass tests;
   passing the unchanged routes here alone cannot establish it.

## Rejected, fallback and unverified scope

Current init failure rejects rather than silently selecting JS. Custom update
methods use the tested upstream traversal fallback. Side-effectful property
accessors, global prototype replacement, invalid cyclic manually edited children,
mixed engine graphs, CJS, arbitrary deep imports and WebGPU/TSL remain outside the
declared contract. Tested attach uses uniform parent scale; nonuniform attach/lookAt
limitations are inherited. Arbitrary animation bindings remain JS, while the explicit
owned API rejects bindings outside its descriptor contract.

Comparisons use finite numbers with atol 1e-10 / rtol 1e-12, not bitwise quaternion
sign, signed-zero or NaN guarantees. The typed-array matrix replacement probe is a
runtime case, not a promise that upstream declaration tuples accept every array type.
Firefox/Safari, cross-device pixels, every addon, arbitrary event-driven application
and broad resource/context-loss lifecycle remain unverified by this suite.

## Reproduce and interpret

After [clean installation](CLOUD_SETUP.md), fixtures and build:

```sh
npm run test:compatibility
npm run test:facade
npm test
npm run test:package
npm run test:browser
```

Contract artifacts default to `work/compatibility-node` and
`work/compatibility-browser`; use fresh `RTHREE_CONTRACT_RESULTS_DIR` and
`RTHREE_CONTRACT_BROWSER_RESULTS_DIR` paths on repeats. Manifests contain commit,
dirty-state and source/Wasm hashes; JSON preserves traces, call counts and failures.
CI uploads these with correctness artifacts. Browser mode follows the existing
hardware guard; default cloud SwiftShader proves correctness only. No timing or
product-readiness increment follows from these tests.

[Recorded C1 validation](../bench/results/compatibility-c1-20261023/README.md)
preserves the clean-commit traces, images and limitations.
