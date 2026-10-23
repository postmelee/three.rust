# ADR 0001 — bounded Object3D transform batches, retain WebGL

Status: selected from fresh M0 evidence, committed **before implementation**.
Date: 2026-10-22. Base: 98f59c5a86a3ae35d6f17dadf17b4d22f49addb0.

## Evidence and hypothesis

The bootstrap plan is a list of goals/hypotheses, not proof of architecture or
performance. We independently pinned npm three@0.186.1 to 9b4a2ac… (r186
annotated tag dereferences to that commit), read actual Object3D,
WebGLRenderer, WebGLObjects, AnimationMixer, Skeleton and render-list sources.
See fixtures/provenance.json, fixtures/README.md, RELATED_WORK.md.

M0 ran five independent reloaded A/A runs per scenario, each 30 warm-up + 120
sample frames. Fixed 640×360 DPR1, deterministic input. Raw frame samples and
browser/environment metadata: bench/results/m0-profile. Ten-sample runs in
m0-smoke are diagnostics only. A separate uninstrumented cubes A/A comparison
and V8 .cpuprofile capture are saved under m0-unprofiled and m0. Timed scene
update is inclusive; render includes transforms/skeleton. Do not add nested
times. Timer quantization makes sub-0.1ms attribution approximate.

Median across runs of within-run means (ms), before any Rust implementation:

| Scene | full CPU | scene transforms | animation | skeleton | raycast |
|---|---:|---:|---:|---:|---:|
| original-size cubes (2,000) | 2.913 | .187 | 0 | 0 | .238 |
| one Soldier | 1.015 | .047 | .079 | .012 | 0 |
| shader control | .153 | .014 | 0 | 0 | 0 |
| small static variant | .339 | .007 | 0 | 0 | .018 |
| 10,000-cube hierarchy variant | 18.152 | 2.328 | 0 | 0 | .008 |

Cubes CPU p50 ranged 2.5–2.8ms between runs; hierarchy p50 13.5–16.2ms.
Software GPU and CPU scheduling cause material noise. These are exploratory
CPU measurements, not hardware GPU/FPS results. EXT timer availability is
recorded; GPU pass durations are not measured. The original skinning frame
interval is much larger than measured JS CPU: this is not evidence that moving
animation to Rust fixes frame delivery.

## Decision

Port local matrix composition (including r186 pivot) and parent/world
propagation for eligible Object3D subtrees into an f64 Rust persistent arena.
A version-checked source hook at updateMatrixWorld replaces, rather than
precedes, the original JS compose/multiply loop. Keep upstream WebGLRenderer,
materials, shaders, sorting, culling and animation. Public JS Object3D,
Vector3, Quaternion, Matrix4 and matrix.elements identities stay intact.

The Rust arena retains parent indices, TRS/pivot, local/world matrices and flags
across calls. One synchronous batch computes a subtree. A conservative JS
scan synchronizes direct property/array changes at each update boundary;
copying and materializing public arrays are included in product timings.
Hierarchy order is reconciled each call. An explicit release API frees arenas;
GC cleanup is best-effort. No per-vector Wasm calls. Rust does not call JS math.

Custom updateMatrix/updateMatrixWorld overrides and camera/SkinnedMesh
post-update behavior require original JS dispatch. Ineligible roots fall back
and may recursively batch eligible descendant subtrees. updateWorldMatrix and
its synchronous read callers retain upstream JS initially; a later render batch
must ingest those matrices. This is a documented mixed implementation, not
complete transform API acceleration. Preserve forced/manual matrix flags,
reparenting and callbacks by differential tests. Do not globally patch prototypes.

A — upstream build; B — same version source fork with hook disabled;
C — source fork with Rust arena; D — identical bridge/layout with JS batch math.
D separates packing/traversal effects from language effects. Explicit async
init prepares C before otherwise synchronous app code; no silent init fallback.
A single vendored core backs root and rewritten addon imports. Unknown external
addons/direct paths can still introduce another core; require aliases and test.

## Expected ceiling and rejected alternatives

Even infinitely fast transforms remove only about 6.4% of original cubes CPU,
before bridge cost (and about 12.8% of the enlarged variant). A 2× kernel would
save about half that. The bootstrap 20% whole-frame goal is therefore unlikely
on this primary fixture. The reason to build M2 is to measure ownership/boundary
cost honestly, not to present a selected kernel speedup as product success.

- Scalar Vector3/Matrix4 Wasm wrappers: boundary frequency, no scene ownership.
- AnimationMixer first: one-model .079ms mean plus blending/event/property-binding
  compatibility cost; too little measured leverage for first vertical slice.
- Skeleton palette only: .012ms mean, tiny work and copies; defer.
- Raycast: .238ms in cubes but scene-specific picking/triangle semantics; BVH/data
  structure changes would dominate language attribution. Not first slice.
- Culling/render-list sort: larger renderer aggregate is NOT evidence these
  internals dominate; invasive render closure rewrite requires finer evidence.
- Own renderer/wgpu: changes backend/shader quality and loses controlled A/B.
- Always disable matrixAutoUpdate or precompute both JS+Rust: violates observable
  flags/force behavior or duplicates the work; rejected.

## Predeclared M2 protocol and boundaries

All five fixtures remain in results regardless of regressions. Run A/B/C and
D in rotated order across seven independent reloads; 60 warm-up + 180 samples
per run. This fixed-frame cloud experiment replaces the bootstrap time-budget
protocol only for this environment; **10s warm-up + 30s ×7 foreground hardware
validation remains outstanding**. Save p50/p95/p99 per run, intervals, drawing
work, initialization, memory, path counters and separate diagnostic bridge
stage times. No screenshots/readPixels/V8 sampling in timed runs. Correctness
captures use fixed ticks and A/A calibration. Primary claim: full CPU versus A;
kernel, D and enlarged scene results are separate.

No claimed memory/startup budget was empirically justified in M0. Record them
without retroactively inventing pass thresholds. Explicitly report missing
hardware, browsers, full upstream suite, cold-cache and GPU-query validation.

## M0 cross-check before commit

Uninstrumented cubes A/A p50 median was 2.7ms, with range 1.8–2.8ms.
This spread exceeds likely transform savings; wrapper overhead cannot be
resolved cleanly from cloud noise. V8 100µs sampling profiles (120 frames after
30 warm frames) are retained separately with function self-sample summaries.
Idle/GPU-related waiting and renderer functions remain in profiles; do not
normalize those away to claim a whole-frame transform dominance.
