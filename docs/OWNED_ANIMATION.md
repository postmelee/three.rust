# Explicit owned animation experiment

This is a finite experimental API, separate from ordinary Three.js/rthree object
and AnimationMixer semantics. Await `createOwnedAnimation(descriptor, options)`
before use. Select `js` or `wasm` explicitly; Wasm fetch/compilation failures reject.
The API accepts numeric descriptors, not existing identity-bearing Bone/Action objects.

## Supported domain

A fixed number of rigs share a skeleton/clip definition. Every node has a preceding
parent index (-1 means the instance root), base position/quaternion/scale and inverse
bind matrix. Each rig has its own root matrix, hierarchy, base/local/world pose and
one action per clip. Clips have positive finite duration and unique node/property
tracks with strictly increasing Float32 key times and Float32 values. Position and
scale use linear interpolation; quaternion uses r186's shortest-path slerp. Normal
weighted blending follows clip order, normalizes sums over one and blends unused
weight with the base pose. Computation is f64; palette output is Float32.

Repeat playback wraps at duration, including reverse playback. Once playback clamps
at either endpoint and pauses. No finite repetition count or ping-pong in this slice.
A base-pose command changes the rest contribution; it is not a direct Three.js
property write. Reparent accepts only earlier node indices, so cycles/forward parents
are rejected. No node insertion/removal; create another domain for structural resizing.

## Commands, reads and lifetime

`commands(array)` validates a complete batch (at most 256 commands) before mutation.
Supported commands configure an action, change weight, seek, pause, change a root
matrix, set a base pose or reparent. `step(dt)` advances the owned pipeline once;
`step(0)` forces evaluation without advancing clocks. `snapshot()` synchronously
flushes pending commands and returns copies of pose/world/root/action/palette buffers.
Snapshots cannot mutate authority. Reads and palette copies are counted and timed
separately in diagnostic runs, and included when applications request them in frames.

Handles are monotonic and released handles never alias new domains. `dispose()` is
idempotent; subsequent operations throw. Wasm views are recreated after memory growth.
No per-bone JS object scan or intermediate JS matrix materialization occurs per tick.
Command validation metadata is not a second authoritative animation state.

## Renderer boundary and exclusions

The adapter uses the supplied Three.js namespace, retained WebGL materials/shaders,
and dedicated presentation SkinnedMeshes with prepared palettes. Their skeletons
have no ordinary Bone objects. Do not use them for CPU raycasting, automatic bounds,
SkeletonHelper or scene animation; these are unsupported, not stale Bone APIs.
Only opaque, depth-tested/depth-writing materials are accepted. A conservative
infinite sphere with a fixed geometry-center sort point avoids implicit CPU skinning
for renderer depth sorting. Transparent/transmissive sorting and automatic animated
bounds are not supported. Skin attributes must stay immutable while the adapter lives.
Root presentation matrices and final padded palette buffers are copied as required;
Skeleton.update consumes prepared data without doing bone matrix multiplications.
No global prototype changes. Ordinary Three.js scenes are unaffected.

Renderer callbacks may read snapshots. Commands/steps/disposal during a render are
rejected to avoid mid-frame mixed state; a finally block releases the guard even if
a callback throws. Multiple renders without a tick reuse output buffers. External
transformed scene parents, shared skeletons and implicit renderer-side animation are
outside this adapter. Use a root scene and explicit root commands.

Unsupported descriptors/options throw before acquiring state: arbitrary property
paths, additive/cubic/discrete tracks, morph/material animation, event listeners,
crossfade schedules, warping, manual local matrices, pivot semantics and arbitrary
hierarchy edits. Weight commands can express externally scheduled normal blends,
but are not claimed to implement AnimationAction.crossFadeTo. The ordinary facade
retains upstream synchronous events and direct mutation. No silent fallback inside
this explicit API; choose the ordinary facade for unsupported semantics.

The finite contract was committed before implementation. The [experiment report](OWNED_REPORT.md)
records implemented coverage and measurements; hardware acceptance remains open.


## Usage and buffer layout

```js
import * as THREE from 'rthree/js';
import {createOwnedAnimation, createOwnedRenderer} from 'rthree/owned';

const domain = await createOwnedAnimation(descriptor, {backend: 'wasm'});
domain.commands([{type: 'action', rig: 0, clip: 0, weight: 1}]);
const output = createOwnedRenderer(THREE, domain, {scene, geometry, material});
function frame(dt) {
  domain.step(dt);
  output.render(renderer, camera);
}
const pose = domain.snapshot(); // synchronous copy; count this cost when used
output.dispose();
domain.dispose(); // geometry/material/renderer remain the caller's responsibility
```

`descriptor` has `parents`, `basePose` (10 numbers per node: xyz, quaternion xyzw,
scale xyz), `inverseBind` (16 column-major numbers per node), `roots` (one 16-number
matrix per rig), and `clips` (`duration`, `tracks`). Tracks specify numeric `node`,
`property` (position/quaternion/scale), `times`, and flattened `values`. Float32
conversion occurs before validation of key ordering and quaternion normalization.
The converter in fixtures/owned/descriptor.mjs is a synthetic benchmark input helper,
not a GLTF or arbitrary AnimationClip importer.

Snapshots are rig-major: pose has 10 values per node; world has 16 per node; roots
has 16 per rig; palette has 16 Float32 values per node, excluding texture padding;
actions has five values per rig/clip: time, weight, timeScale, paused (0/1), once
(0/1). A configure-action command resets omitted fields to time 0, weight 1,
timeScale 1, unpaused repeat. Weight/seek/pause commands change only their own field.
Root matrices are affine/invertible. Counts are bounded (512 nodes, 256 rigs,
32 clips, 10,000 keys per track); descriptors above 16 million numbers reject.
Use finite, well-conditioned numeric data; overflow/extreme conditioning is not a
supported equivalence claim. Released-handle registry tombstones grow with lifetime
creation count, and Wasm memory does not shrink. Large churn remains a follow-up.

Local demo: `/fixtures/owned/index.html?variant=owned-wasm` with `npm run dev`.
Variants: original, js, wasm, packed-js, owned-js, owned-wasm. For the compatibility
variants also set `engine=js`, `engine=wasm` or `engine=packed-js`; owned variants use
the original namespace in this comparison. `static` selects the non-animated control.

```sh
npm run build
npm run test:owned
node bench/owned.mjs repeats=6 out=work/owned-main-001
node bench/owned-report.mjs work/owned-main-001
node bench/owned.mjs stage=diagnostic variants=original,owned-js,owned-wasm \
  cases=animated-1,animated-64 repeats=5 warmup=30 samples=60 out=work/owned-diag-001
```

Main timing includes application tick, output copying and renderer return. It omits
explicit pose snapshots because that application does not request them; the separate
diagnostic charges snapshot reads. Initial fixture conversion and compilation are
startup costs, recorded as navigation-to-ready, not cold-cache or portable bandwidth
claims. Hardware mode uses the existing qualified-runner protocol; cloud software
GPU results cannot accept a desktop speedup. See the experiment report for results.
