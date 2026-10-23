# M0–M2 experiment report

2026-10-22. **The Rust port and real renderer integration work, but this environment
did not establish a general whole-frame performance improvement.** Every scenario
and repeat, including regressions, is preserved. The experiment covers Object3D
transform subtrees, not a complete Rust Three.js engine, full compatibility, or
physical desktop GPU/FPS improvement. This English edition preserves the original
measurement values and limitations; it is not a new performance run.

## Baseline and experimental decision

An independent checkout and codex/independent-m0-m2 branch started at bootstrap
98f59c5, preserving existing workspace files. No previous implementation, ADR or
measurement was used. M0 commit c458d73 recorded public sources, fresh profiles and
rejected alternatives in an ADR before M1/M2 implementation.

npm three@0.186.1 and annotated tag r186 resolve to commit 9b4a2ac…. Original
examples, SHA-256s, adaptations and licenses are recorded under fixtures/. The
primary fixture was the original-size interactive cubes example. One Soldier,
Monjori shader, eight static cubes, and a 10,000-cube/1,000-group hierarchy variant
were retained. The enlarged variant is not an original-example result: its
nonrecursive raycast sees groups, changing picking work. All A/B/C/D modes use
the same adaptation.

In M0 original cubes, average transform update cost was about 0.187 ms of 2.913 ms
total. Even eliminating it entirely implies about a 6.4% theoretical CPU saving
before bridge cost. The bootstrap 20% ambition was therefore already unlikely
for this slice. Small measured skinning/animation costs, raycast specificity and
renderer-replacement confounds motivated a bounded transform ownership experiment.

## Main measurement

Measured implementation commit: 9c12cba5d884d605debaba97002252b66f274f5f. The manifest records actual JS/Wasm
and lockfile hashes. 7 repeats × 5 scenes × 4 engines = 140 runs;
each has 60 warm-up frames + 180 sampled frames, totaling 25,200 samples.
Engine starting order rotates; pages run sequentially in a shared browser process.
All modes use 640×360, DPR 1, seed 42 and identical simulation tick ranges.
No image capture, V8 sampling, GPU query or bridge stage timers run in this dataset.

CPU units below are milliseconds: first calculate each run's p50, then take the
median across runs. Changes pair C/A within each repeat before aggregation, so they
can differ from the ratio of table medians. Positive means **slower**. Seven-run
bootstrap intervals are exploratory; 25,200 adjacent frames are not independent
experimental repetitions.

| Scene | A original p50 | B JS p50 | C Wasm p50 | D packed JS p50 | Paired C/A change (95% bootstrap) |
|---|---:|---:|---:|---:|---|
| Original-size cubes | 2.20 | 1.80 | 2.30 | 3.70 | 16.67% [-3.57, 35.29] |
| Original-size Soldier | 0.70 | 0.70 | 0.70 | 0.70 | 0.00% [-14.29, 12.50] |
| Shader control | 0.10 | 0.10 | 0.10 | 0.10 | 0.00% [0.00, 0.00] |
| Small static variant | 0.30 | 0.30 | 0.30 | 0.30 | 0.00% [0.00, 0.00] |
| Enlarged hierarchy variant | 16.50 | 16.60 | 20.80 | 19.90 | 25.73% [20.89, 34.13] |


All p50/p95/p99 and interval p95 values are in [the detailed table](../bench/results/m2-full/table.md).
Per-run statistics and paired distributions are in [analysis.json](../bench/results/m2-full/analysis.json);
[raw frames](../bench/results/m2-full/) retain slow samples. Final-frame draw calls,
triangles and program counts were checked for equality across A/B/C/D.

D performs JS arithmetic inside C's scan/buffer/materialization path. A C-over-D
win only describes this particular implementation, not product improvement over A.
D is not claimed to be the best achievable JS engine. B/A includes bundling, hook
branches, JIT effects and cloud noise. Values near 0.1 ms in small scenes are
strongly affected by timer granularity; ratios are correspondingly limited.

## Implementation and correctness

Rust retains an f64 pose/parent/local/world/flag arena. One batch computes local
matrices and parent-child world propagation without calling JS Three.js math.
Public JS objects and arrays stay in place: direct changes are scanned, then
results are written into the same arrays. Scanning, copies, allocation and
materialization remain in complete-path timing. Camera, SkinnedMesh and custom
overrides retain original dispatch; eligible descendants can batch.
updateWorldMatrix, synchronous read helpers, AnimationMixer, skeleton palettes,
WebGL rendering, materials and shaders remain in JS/GPU paths.

- Five native Rust and nine upstream differential tests passed; maximum observed
  matrix absolute error was zero. The path uses f64, not an f32/SIMD approximation.
- Tests cover direct TRS/matrix writes, pivot, negative/nonuniform scale, manual
  matrices, world-auto/force, reparent/attach/remove, stale and synchronous reads,
  clone, overrides, animation loop/finished events, bone palettes and arena growth/release.
- Supported batches pass with JS compose/multiply changed to throw, while exported
  Rust counters increase: the computation is actually replaced.
- Fixed 12-tick A/A and A/B/C/D captures for all five scenes matched every pixel.
  Separate callback/multiple-render tests passed. [Images and numerical results](../bench/results/correctness/results.json)
  retain the scope of this evidence.
- An isolated /tmp tarball consumer verified ESM, failed init/retry, root/addon
  identity, no runtime three dependency, NodeNext types and one esbuild core.
  No npm publication occurred.
- [Clean-checkout CI](https://github.com/postmelee/three.rust/actions/runs/39760603177)
  passed. The initial Ubuntu 26.04/Playwright install failure was resolved by
  pinning Ubuntu 24.04; [CI evidence](../bench/results/validation/ci.json) records it.

These are fixture/test-specific results, not the entire upstream suite or every
addon. [Compatibility](COMPATIBILITY.md) specifies tolerances and IEEE signed-zero/
NaN limitations. Rust owns persistent storage, not authoritative public properties.

## Environment and interpretation limits

Intel Xeon Platinum 8573C VM, five visible vCPUs, quota equivalent to four CPUs,
16 GiB limit, Chromium 154.0.8037.57. No DRM/NVIDIA GPU device was exposed. The
observed renderer was ANGLE Vulkan SwiftShader Device (Subzero), sharing CPU
resources with JS/Wasm. This is not a physical GPU result.

The CPU timer measures main-thread wall time from application update through
renderer return and stats update. It is neither GPU completion nor OS on-CPU
cycles; preemption and driver backpressure can contribute. CPU and rAF intervals
are not interchangeable. No general mobile 30fps ceiling, FPS gain or energy
improvement is inferred.

This is a fixed-frame cloud protocol. The originally proposed foreground hardware
10s/30s protocol, Safari/Firefox/mobile, fully cold-cache startup, long GC/memory/
thermal/power runs, XR/context loss and all addons remain unverified. Heap and
linear-memory observations are not total process memory; startup return is not
first compositor presentation. Separate diagnostics are not pooled into main data.

## Reproduction and next decision

Follow [clean installation and hardware commands](CLOUD_SETUP.md).

```sh
npm ci
npm run fixtures
npm run build
npm test
npm run test:browser
npm run test:package
npm run bench:full
node bench/summarize.mjs bench/results/m2-full
node bench/analyze.mjs bench/results/m2-full
```

Do not recommend a general import replacement as a performance optimization from
these results. The [revised plan](PROJECT_PLAN.md) distinguishes a bounded bridge
control from the broader Rust-owned pipeline hypothesis, with fresh hardware
profiles, reuse assessment, explicit API contracts and an optimized JS control.
Any opt-in ownership API outcome must remain separate from facade compatibility.

After the original final package rebuild, all main-run core.js, Wasm, runtime,
packed bridge, browser harness and lockfile hashes still matched
[runtime-artifact-match.json](../bench/results/validation/runtime-artifact-match.json).
The subsequent original changes concerned docs, license packaging, hardware
viewport options and test output paths. A→C demo switching, Wasm execution and
Pause passed [separate validation](../bench/results/validation/demo.json).
Later infrastructure changes have their own commits; this historical dataset is
not silently relabeled as measuring those changes.

## Separate stage, GPU and startup diagnostics

These runs are separate from the primary dataset: one repeat per combination,
30 warm-up frames + 60 samples, with stage timers and GPU queries enabled. The
values below are per-frame means for successful batches, separating scan/arena
synchronization, the Rust call and public-array materialization. Instrumentation
and software-GPU query overhead mean they cannot be subtracted from main-run
quantiles.

| Scene (C) | Scan/sync ms | Rust call ms | Materialize ms | Scanned KiB/frame | Changed stores KiB/frame | Materialized KiB/frame |
|---|---:|---:|---:|---:|---:|---:|
| cubes | 0.458 | 0.178 | 0.154 | 766.4 | 0.0 | 500.5 |
| skinning | 0.047 | 0.005 | 0.005 | 26.0 | 4.1 | 17.0 |
| shader | 0.029 | 0.003 | 0.008 | 0.8 | 0.0 | 0.5 |
| small | 0.014 | 0.003 | 0.000 | 3.8 | 0.0 | 2.5 |
| hierarchy | 3.566 | 1.154 | 1.192 | 4211.7 | 15.6 | 2750.5 |

Small changed-store volume does not eliminate scanning and result writes. JS
fallback/renderer/application work is outside these columns but inside complete
frame timing. Equivalent D stage values remain in raw JSON.

GPU queries use EXT_disjoint_timer_query_webgl2 asynchronously; pending/disjoint
results are not filled in. They describe elapsed GL query ranges in SwiftShader,
not physical GPU shader time or FPS improvements. Valid counts and p50/p95 are
in the [diagnostic summary](../bench/results/m2-diagnostic/summary.json).

Startup used five fresh browser contexts per engine on the cubes scene. Process
caches are shared, so this is not a cold-start experiment. Ready means harness
readiness; first return is the first render return, not compositor presentation.

| Engine | Ready p50 ms | First render return p50 ms | Wasm fetch p50 ms | Compile/instantiate p50 ms |
|---|---:|---:|---:|---:|
| original | 306.90 | 394.80 | N/A | N/A |
| js | 307.80 | 403.00 | N/A | N/A |
| wasm | 280.30 | 381.60 | 9.20 | 1.20 |
| packed-js | 304.90 | 430.90 | N/A | N/A |

[Raw startup results](../bench/results/startup/runs.json) and an
[unforced GPU probe](../bench/results/m0/unforced-gpu-probe.json) are preserved.
The default probe also returned SwiftShader, reinforcing that this environment
did not expose hardware acceleration. This does not establish that the physical
host itself has no GPU.
