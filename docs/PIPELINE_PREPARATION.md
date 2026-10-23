# Animation → transforms → bone palette: experiment preparation

Status: runnable preparation, **not a new Rust port or an accepted M4 target ADR**.
The existing C path still evaluates animation and palettes in JS. The proposed
pipeline is promising because intermediate poses and world matrices can stay in
Rust, but the optimized JS reference must use the same ownership/layout before a
language comparison is meaningful. See [recorded diagnostics](PIPELINE_DIAGNOSTIC.md).

## Audited upstream path

Three.js 0.186.1 / [r186 commit](https://github.com/mrdoob/three.js/tree/9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8).
[Exact source hashes](../fixtures/pipeline/source-audit.json) are checked in CI.
Line references below refer to `src/` at that commit.

| Source | Observed behavior | Consequence |
|---|---|---|
| animation/AnimationMixer.js:676–705 | Update action clocks/evaluation first; apply property bindings afterward | Animation events can observe the previous bound pose |
| animation/AnimationAction.js:560,724,776,829,855 | Action update, time/loop logic and synchronous dispatch | Deferring events until after a Rust tick changes behavior; exceptions can stop before binding apply |
| animation/PropertyBinding.js and PropertyMixer.js | Dynamic object/property paths, original-value restoration, blending | Arbitrary property animation cannot silently become a fixed pose-only API |
| core/Object3D.js | Direct mutable position/quaternion/scale/matrix, hierarchy and force flags | Authority must be explicit; a cached Rust copy is insufficient |
| objects/SkinnedMesh.js | Overrides world update and updates bind inverse according to bind mode | Generic transform-only bypass cannot skip this behavior |
| objects/Skeleton.js:199–221 | bone.matrixWorld × boneInverse → Float32 palette; dirties texture | Final output can be a contiguous palette; preserve precision and dirty semantics |
| objects/Skeleton.js:243 | Allocates a padded texture buffer and replaces boneMatrices | Buffer identity, padding and lifetime need an explicit contract |
| renderers/WebGLRenderer.js:1663,1729,2696 | World update, frame counter, lazy bone texture creation | Normal render() still evaluates scene work and consumes skeleton data |
| renderers/webgl/WebGLObjects.js:7,48–56 | Private WeakMap avoids duplicate skeleton updates within a render frame | Writing a hypothetical skeleton.frame field does not bypass this path |

## Provisional ownership and boundary

One proposed owned-animation domain retains clips, action clocks/weights, binding
indices, local poses, hierarchy, world transforms, inverse bind matrices and final
palettes across frames. The JS facade retains renderer/material/texture resources,
identity-bearing public objects and application callbacks. Initial clip/rig upload
is separate from steady-state commands. No Rust-to-JS math callback is proposed.

| Boundary | Proposed rule before implementation |
|---|---|
| Create | Validate immutable clip/rig descriptors once; stable handles with generation checks; reject unsupported tracks before acquiring authority |
| Commands | Batch play/stop/weight/time/reparent/pose writes; preserve order; validate topology and external-parent dependencies |
| Tick | Advance clocks → interpolate → blend → compose/local/world → palette in one owned domain; no intermediate per-bone JS object writes in the fast path |
| Output | Final Float32 palette plus necessary mesh world matrices/dirty spans; retained WebGL materials/shaders; account for upload/copy cost |
| Read | Explicit opt-in snapshot/read barrier synchronizes requested fields and is charged to the frame; never promise free reads |
| Memory | Recreate typed views after Wasm growth, preserve declared JS array identity when materializing, track padded texture storage, generation-safe release |
| Precision | f64 evaluation/world matrices initially; preserve upstream Float32 keyframe inputs and Float32 palette outputs; f32/SIMD is a separate experiment |
| Integration | Version/hash-checked Skeleton/WebGLObjects adapter that consumes prepared palettes and actually skips JS palette multiplication; instrument both paths |

**Two API tiers are required.** The import-compatible facade keeps ordinary
synchronous properties, direct writes, forced updates, hierarchy mutation and
callback semantics. It may fall back to the existing JS path where the approved
contract cannot be maintained. The explicit ownership API can expose command/read
barriers, but it must identify its different semantics and performance separately.
Do not silently make ordinary `bone.position.x` stale, change identity or ignore a
write. An owned world can support reads, but the cost must be measured.

For the first optimized experiment, predeclare a bounded supported track set
(position/quaternion/scale on rig nodes), loop modes, interpolation, blends,
external-parent rules and callback policy. A facade action with an event listener
must retain upstream synchronous ordering or fall back **before** advancing that
action. An explicit owned API may define a different event API, but cannot label
it upstream-compatible. Reentrant changes, listener exceptions and listeners
attached after acquisition need tests; a post-tick event queue is not a substitute.

Mesh bind mode, skeleton sharing, multiple render calls/cameras, renderer callbacks,
manual matrices and changes between renders must either pass differential tests
or enter a documented fallback. The preparation oracle currently covers only the
listed cases below, not this entire acceptance contract.

## Reproducible workload and oracle

`fixtures/pipeline/rig.mjs` creates deterministic articulated cylinders with
independent 24-bone rigs and two blended quaternion clips, at 1/16/64 rig counts.
This is a **new synthetic scalability diagnostic**, not an unchanged Three.js
example and not an asset-quality proxy for real animated characters. It reuses
pinned Three.js animation/skinning APIs, shared geometry/material and one draw per
rig. No third-party model is copied. The existing pinned Soldier example remains
an independent real example/control; include real multi-character assets with
verified rights before accepting the target.

`tests/pipeline-oracle.mjs` checks synchronous finished-event reads and exceptions,
repeat/ping-pong/reverse/pause, quaternion normalization and deterministic poses,
crossfade/additive weights, hierarchy/manual matrices, Float32 palette values and
padded texture replacement. These are **upstream semantic oracles**, not evidence
that an unimplemented Rust animation path passes. Existing differential tests
continue to cover the implemented transform bridge.

`tests/pipeline-browser.mjs` compares A/A plus A original, B facade JS, C current
Wasm bridge and D current packed-JS bridge after 37 fixed ticks: exact same-device
pixels, palettes (absolute tolerance 1e-6), two visible draws and a nonblank image.
D is not yet the optimized owned-animation reference required by #9.

```sh
npm ci
npm run fixtures
npm run build
npm run test:pipeline
npm run dev
# Open http://127.0.0.1:4173/fixtures/pipeline/index.html?engine=wasm&count=16&bones=24
# Engine options: original, js, wasm, packed-js. All use the same application source.
node bench/pipeline.mjs stage=cpu engines=original,wasm counts=1,16,64 \
  repeats=3 warmup=30 samples=60 out=work/pipeline-cpu-001
node bench/pipeline.mjs stage=render engines=original,js,wasm,packed-js counts=1,16 \
  repeats=3 warmup=10 samples=30 out=work/pipeline-render-001
node bench/pipeline-report.mjs work/pipeline-cpu-001 work/pipeline-render-001
```

Use a fresh directory each time. CPU mode explicitly evaluates each stage once
without rendering. Render mode times animate + unchanged renderer.render; it does
not precompute transforms/palettes or add timing wrappers inside render. Neither
mode captures screenshots in the measured loop. Raw stage costs, total CPU time
and rAF intervals are separate. Browser/GPU, host quota, actual canvas dimensions,
source hashes, order, warmup, repeats and samples accompany every run. Diagnostic
counters are cumulative including construction and warmup, not per-frame traffic.

For hardware, first qualify a fixed workstation per [CI/GPU protocol](CI.md), run
`RTHREE_BROWSER_MODE=hardware npm run test:pipeline`, then repeat the above with
`mode=hardware headless=false repeats=8 warmup=120 samples=600`. Record driver,
clocks, thermals and A/A noise in separate sessions; the harness rejects known
software renderers. Fixed canvas is 640×480 DPR 1, viewport 640×540. Extend quality
and viewport dimensions as explicitly separate experiments. This command is a
measurement method, not a claim that hardware testing ran here.

## Ready-to-run sequence and gates

| Work item | Entry/exit evidence | Current state |
|---|---|---|
| #3/#4 GPU qualification and hardware baseline | Fixed browser/driver; A/A noise and thermal stability; matched controls | Open: no physical GPU in this cloud |
| #5 candidate profiles | Run synthetic + real skinning + existing small/GPU controls; useful stage fractions and boundary bytes | Cloud preparation captured; representative hardware selection remains open |
| #15 reuse decision | Fresh pinned source/license/build checks of candidate Rust engines; no unreproduced performance claims | Open; prior README/manifests review is not a completed build audit |
| #7/#8 target ADR + compatibility contract | Choose domain from measured fraction/cost; approve finite supported semantics and budgets | This document is provisional input, not an accepted implementation ADR |
| #9 optimized owned JS | Same domain, commands, buffers and algorithms proposed for Rust; actual renderer input boundary | Next implementation experiment after selection gates |
| #10/#11 Rust and renderer integration | Persistent authority, native/differential tests, JS bypass proof, actual images | Not started; no green state cells claimed |

Budget the opportunity as: saved JS stage time minus commands/readback/upload and
fallback cost. Use run-level A/A noise to set a minimum meaningful gain before
implementation (a candidate rule is max(5%, twice observed A/A variability));
predeclare a 5% small/static regression ceiling or revise it with a documented
reason before results. These are **proposed thresholds**, not measured acceptance
limits. Stop or narrow the experiment if boundary/materialization costs consume
its useful CPU fraction, even when the kernel is faster.

Preparation is complete when these runnable artifacts and constraints are present.
It does not make hardware evidence, reuse review, the final target ADR or the Rust
port complete. The next engineering attempt is the matched owned JS pipeline,
followed by Rust only after those selection gates are satisfied.
