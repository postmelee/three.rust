# Mac hardware validation of the explicit owned pipeline

Baseline: PR #27, e66e067844b75559bea251a7bd381d42210ab3ce. Measured real-asset source: d9fa780fce9ad8bf49d1ba1c0c8f5a78222aed1f, clean checkout throughout the full phases. This experiment supplies physical Apple GPU evidence for the finite explicit API; it does not establish import-only or general product acceleration.

## Finding

The 16-rig workload shows a useful CPU reduction for explicit ownership on this Mac: median run p50 is 0.45 ms upstream, 0.25 ms owned JS and 0.20 ms owned Wasm. Both owned paths beat upstream in all six repeat pairs. Most of the observed gain is already present in JavaScript. The extra 0.05 ms Wasm saving over matched JS is smaller than the approximately 0.1 ms clock quantum; its paired ratio ranges from 0.40 to 1.50, including a regression. This does **not** establish a useful independent Rust advantage.

The original-size animated Fox has no demonstrated gain: both owned paths have 0.15 ms p50 versus 0.10 ms upstream, while the small original A/A baseline drifts by 50%. Static p50 does not improve. Frame cadence is essentially unchanged. Therefore this supplies bounded hardware evidence and identifies remaining gates; it does not qualify a general product speedup or complete M5. A second quiet-day/hardware session is required before stronger inference.

## Hardware and method

Apple M4 Pro MacBook Pro (Mac16,8), 12 CPU cores (8 performance/4 efficiency), 16 GPU cores, 24 GiB; macOS 26.5.2 build 25F84. Chrome 155.0.8059.86 reports WebGL2 through `ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Pro, Unspecified Version)`. Rust 1.90.0 release Wasm, Three.js 0.186.1, Playwright 1.56.1, Node 24.15.0. Driver version is tied to macOS. The existing user-provided Mac was used; no paid GPU service or persistent Actions runner was provisioned.

Preflight began on battery; the requester then connected AC. The requester cannot guarantee absence of other heavy desktop activity. The full experiment used temporary `caffeinate -di` and no concurrent local build/test; light status reads and remote CI observation continued. Power/thermal reports are captured before/after each phase. No independent scanout latency, instantaneous GPU temperature, power or battery-life conclusion is available.

All paths use the same pinned licensed Fox geometry, material, texture and three clips, same opaque WebGL renderer, 640×480 canvas, DPR1, antialias off, preserved drawing buffer, lighting and no shadows. Original-size Fox is the primary real asset; 16 Foxes is a scalability workload with equal conservative bounds and partial edge clipping. Static-one retains the read cadence. This is a new deterministic application, not an unmodified upstream example or a general GLTF importer.

The 600-tick replay includes walk, pause, explicit weight blending, run, stop/rest and restart Survey, root movement, camera orbit, and one full synchronous snapshot every 60 ticks. Fixed 1/60 simulation increments intentionally keep equal work across variants: at observed ~120 Hz, simulation advances faster than wall time. Wall-clock UX timing is not validated by this throughput replay. Stop is a zero-weight/seek/pause recipe, not complete AnimationAction.stop identity/event semantics.

Full protocol: five original A/A repeats before and after; six main repeats using every permutation of the three paths; case order reverses on alternate repeats. Each run has 1200 warmup and 3600 sampled frames, approximately 10/30 seconds at the measured cadence. The input resets after warmup. Main: 54 runs / 194,400 samples; A/A: 30 runs / 108,000 samples; separate diagnostics: 45 runs / 5,400 samples (60 warmup, 120 samples). Fresh pages/contexts use a shared browser per phase. All raw tails are retained. Exact durations are in the run summaries.

## Main render-path CPU

Milliseconds; each cell is the median of per-run quantiles. CPU is elapsed main-thread time from input/update start through renderer return, including commands, validation, evaluation, snapshots, output copying and submission. It is not GPU completion or OS on-CPU cycles. The clock resolution is approximately 0.1 ms; interpolation and even-repeat medians do not create finer measurement accuracy.

| Scenario | Path | CPU p50 | CPU p95 | CPU p99 | Interval p95 | Interval p99 |
|---|---|---|---|---|---|---|
| animated-1 | original | 0.100 | 0.350 | 0.401 | 9.250 | 9.400 |
| animated-1 | owned-js | 0.150 | 0.350 | 0.400 | 9.300 | 9.400 |
| animated-1 | owned-wasm | 0.150 | 0.350 | 0.400 | 9.300 | 9.400 |
| animated-16 | original | 0.450 | 1.250 | 1.550 | 9.200 | 9.400 |
| animated-16 | owned-js | 0.250 | 0.650 | 0.750 | 9.300 | 9.400 |
| animated-16 | owned-wasm | 0.200 | 0.500 | 0.700 | 9.300 | 9.400 |
| static-1 | original | 0.100 | 0.300 | 0.300 | 9.300 | 9.400 |
| static-1 | owned-js | 0.100 | 0.200 | 0.200 | 9.300 | 9.400 |
| static-1 | owned-wasm | 0.100 | 0.200 | 0.300 | 9.300 | 9.400 |

The 16-rig per-run p50 ranges are 0.40–1.00 ms upstream, 0.20–0.50 ms owned JS and 0.20–0.30 ms owned Wasm. Repeat-paired median ratios are 0.607 JS/upstream, 0.500 Wasm/upstream and 0.833 Wasm/JS; these differ from ratios of group medians. All observed outliers remain included.

Run-level ranges and repeat-paired ratios are in [main/summary.json](../bench/results/mac-20261023/main/summary.json). Adjacent frames are not treated as independent trials, and no pooled-frame significance claim is made.

## A/A and predeclared noise rule

A gain must exceed max(5%, twice the absolute pre/post original p50 drift, twice relative within-session median absolute deviation), and have useful absolute size above clock granularity. Tail and frame-interval regressions remain separate gates.

| Scenario | Path | A/A drift | Required gain | Observed gain | Saving ms | Above relative noise only |
|---|---|---|---|---|---|---|
| animated-1 | owned-js | 50.000% | 100.000% | -50.000% | -0.050 | False |
| animated-1 | owned-wasm | 50.000% | 100.000% | -50.000% | -0.050 | False |
| animated-16 | owned-js | 0.000% | 5.000% | 44.444% | 0.200 | True |
| animated-16 | owned-wasm | 0.000% | 5.000% | 55.556% | 0.250 | True |
| static-1 | owned-js | 0.000% | 5.000% | 0.000% | 0.000 | False |
| static-1 | owned-wasm | 0.000% | 5.000% | 0.000% | 0.000 | False |

The last column is not product acceptance: timer quantization, small-scene/tail regressions, shared desktop activity and the single-device scope still apply. See [comparison.json](../bench/results/mac-20261023/comparison.json) for every A/A p50 and decision input.

## Separate boundary/read diagnostic

These instrumented runs are not pooled with main timings. Evaluation includes input/command work. Owned preparation copies final root/palette buffers; upstream preparation performs world/palette evaluation. Upstream read includes an explicit synchronous force barrier, and the diagnostic renderer may repeat ordinary traversal; consequently its bucket totals are not a decomposition to subtract from main or a matched kernel comparison. The owned JS/Wasm payload/layout pair is matched. Values rounded to zero are below clock resolution, not free.

| Scenario | Path | Evaluate p50 | Prepare/copy p50 | Read p50 | Read p95 | Render p50 |
|---|---|---|---|---|---|---|
| animated-1 | original | 0.000 | 0.000 | 0.100 | 0.200 | 0.100 |
| animated-1 | owned-js | 0.100 | 0.000 | 0.000 | 0.100 | 0.100 |
| animated-1 | owned-wasm | 0.100 | 0.000 | 0.000 | 0.100 | 0.100 |
| animated-16 | original | 0.100 | 0.200 | 0.600 | 0.900 | 0.400 |
| animated-16 | owned-js | 0.200 | 0.000 | 0.000 | 0.100 | 0.100 |
| animated-16 | owned-wasm | 0.200 | 0.000 | 0.000 | 0.100 | 0.100 |
| static-1 | original | 0.000 | 0.000 | 0.100 | 0.200 | 0.200 |
| static-1 | owned-js | 0.000 | 0.000 | 0.000 | 0.100 | 0.100 |
| static-1 | owned-wasm | 0.000 | 0.000 | 0.000 | 0.100 | 0.100 |

## Copy and read volume

For `main/render-animated-16-owned-wasm-0.json.gz`, subtracting pre-measurement counters from final counters gives 3,600 command batches/steps, 7,200 counted command/step Wasm exports, 64,650,240 command bytes, 88,473,600 palette-copy bytes, 7,372,800 root-copy bytes, and 6,504,960 copied snapshot bytes across 60 reads. Pointer acquisition/initialization exports are outside the counted command/step calls. The matched JS implementation uses the same payload/layout and presentation copies; upstream returns ordinary copied arrays, owned returns copied typed arrays.

Useful final palette output is 24,576 bytes/frame and root matrices 2,048 bytes/frame at 16 rigs. Each complete snapshot copies 108,416 bytes (6,776 for one rig). The renderer's padded palette allocation is 36,864 bytes; that is a texture storage size, not a measured GPU transfer counter. Main CPU includes the replay-requested reads and all per-frame preparation. The static owned case reuses an unchanged revision after initial presentation; its result is reuse evidence, not a per-frame Rust compute saving. Reported Wasm memory capacity is not total live/process/GPU memory or GC attribution.

## Initialization

Milliseconds, median per phase metric over six runs. Navigation-to-ready and in-page components have different boundaries and must not be added together. Asset parsing/loading and descriptor audit/conversion are common fixture work. Domain init includes upstream clone/mixer setup or owned acquisition (including Wasm fetch/compile/init). Shader readiness includes compileAsync and first draw. These are local-server/shared-cache observations, not cold-cache, download-bandwidth or first-install claims.

| Scenario | Path | Nav-ready | Asset | Conversion | Domain init | Shader/first draw |
|---|---|---|---|---|---|---|
| animated-1 | original | 92.148 | 23.800 | 0.700 | 0.900 | 18.500 |
| animated-1 | owned-js | 87.500 | 20.950 | 0.650 | 2.550 | 17.800 |
| animated-1 | owned-wasm | 94.301 | 23.750 | 0.600 | 6.600 | 18.050 |
| animated-16 | original | 90.131 | 19.900 | 0.600 | 3.600 | 19.650 |
| animated-16 | owned-js | 91.350 | 23.850 | 0.650 | 2.750 | 18.550 |
| animated-16 | owned-wasm | 94.755 | 21.950 | 0.600 | 6.700 | 19.200 |
| static-1 | original | 88.343 | 23.450 | 0.600 | 1.000 | 17.700 |
| static-1 | owned-js | 86.172 | 21.150 | 0.600 | 2.600 | 17.850 |
| static-1 | owned-wasm | 93.839 | 21.000 | 0.600 | 6.550 | 17.550 |

Wasm domain initialization is slower here: approximately 6.6–6.7 ms versus 2.6–2.8 ms for owned JS. Warm steady-state observations do not erase this startup cost.

## Correctness and compatibility limits

The synthetic Mac oracle passed 14 views and exact pixels, with callback/second-camera guards and poisoned upstream recomputation. Fox passed 132 checkpoints across 1/16/static rigs: exact pixels everywhere, maximum world-matrix error 4.44e-16. Actual unsupported material, binding, track and API options reject in 13 tests. Wasm counters prove native execution; actual SwiftShader is rejected by the hardware guard.

The first Fox test failed component-wise pose equality at the stop phase. Two joints per rig used q versus -q: r186 PropertyMixer retains an accumulator hemisphere, while owned evaluation restores its descriptor quaternion. World/palette/action outputs were equal. Tests now compare rotations modulo sign and record raw differences; the failed check is preserved. Raw quaternion-component sign continuity is **not** compatible. Events, automatic crossfade/warping, additive/cubic/morph/material tracks, ordinary Bone/Action identity, transparent sorting, CPU animated bounds/raycast and general hierarchy migration remain unsupported. See [the fixture contract and attribution](../fixtures/fox/README.md).

The first synthetic timing attempt lost its browser execution context after 11 runs and remains archived as failed. A fresh full synthetic reproduction completed 54 runs / 32,400 frames. At 64 synthetic rigs, original/owned JS/owned Wasm CPU p50 was 1.05/0.75/0.60 ms; small/static cases remain near resolution, including static p95 regressions. This short synthetic reproduction has no separate bracketing timing A/A and is not the real-asset product verdict.

## Small/static and GPU-oriented controls

The existing M2 object/facade controls are separate from owned Fox. Four rotated repeats per engine, 120 warmup/600 samples, retain the original `bench/analyze.mjs` floor-index quantile estimator (not the Fox linear estimator). At 640×360, the eight-cube small/static CPU p50 is 0.10/0.20/0.20/0.10 ms for original/JS/Wasm/packed-JS. Their p95 values are 0.20/0.40/0.60/0.50 ms. These unfavorable facade tails are preserved; this is not an owned API result.

The shader's 640×360 CPU p50 is 0.10 ms for all four paths. At 3840×2160 it remains 0.10 ms for all, with CPU p95 0.30/0.20/0.20/0.20 ms and interval p95 9.00/8.90/9.00/8.90 ms. Draw/triangle work matches. No CPU-port benefit is demonstrated for this GPU-oriented workload.

Separate original-only GPU query runs use three repeats, 120 warmup/300 samples: 897 available ranges and three pending-at-end values at each resolution, zero disjoint values. The 4K per-run GPU p50 is 1.423/1.536/2.624 ms and p95 is 3.366/2.963/4.409 ms; at 640×360 the corresponding p50 is 0.141/0.142/0.143 ms. This confirms substantially larger GPU work at 4K but not display saturation or an FPS improvement. Large between-run/tail variation is retained. GPU results are asynchronous elapsed GL ranges with instrumentation, not uninstrumented Fox GPU time. Controls have no separate timing A/A and are supporting diagnostics only. See [controls/table.md](../bench/results/mac-20261023/controls/table.md), [shader-4k/table.md](../bench/results/mac-20261023/shader-4k/table.md) and [gpu-4k/gpu-summary.json](../bench/results/mac-20261023/gpu-4k/gpu-summary.json).

## Issue acceptance coverage

These are bounded contributions, not issue closures or full milestone completion.

| Issue | Evidence supplied by this change | Remaining gate |
|---|---|---|
| #3 Hardware runner | Physical Apple M4 Pro CPU/GPU/macOS/Chrome inventory, actual Metal WebGL backend, foreground correctness, actual software-renderer rejection, reproduction scripts | No persistent self-hosted Actions runner registered; display scanout/refresh and GPU thermals not independently measured; one interactive machine |
| #4 Repeated hardware baselines | Synthetic reproduction; Fox original/owned JS/owned Wasm with before/after A/A, all six orders, raw frames and run summaries; fixed source/binary hashes and workload parity | This is the explicit-owned three-path matrix, not complete product A/B/C/D qualification; no second-day or second-hardware-class session; background desktop activity uncontrolled |
| #5 Representative profiling | Licensed pinned real Fox, three clips and replay/read demand, normal/scaled/static controls, separate 4K GPU-oriented control and query ranges, separate evaluation/preparation/copy/read/render costs | One small real asset, no broad workload ranking or complete visibility/sorting/upload CPU profile; scaled Fox is not normal product size |
| #7 Pipeline/cost budget | Hardware costs and command/output/read byte volumes for ADR 0003's already selected finite pipeline; predeclared noise rule | Does not select a broader engine pipeline or accept a new hardware product budget; candidate-engine browser/reuse comparison remains separate |
| #8 Authority/read contract | Hardware synchronous snapshots, force evaluation and synthetic callback guards; unsupported feature rejection; raw quaternion-sign gap explicitly discovered | Ordinary Bone/AnimationAction identity, arbitrary direct writes, events, transparent sorting and general hierarchy migration remain unsupported |
| #9 Matched JS reference | Same existing layout/algorithm now feeds identical real-asset geometry/material, inputs and snapshots; exact images and numerical rotation equivalence | Explicit migration and finite linear-TRS subset only; no claim of optimal JS across arbitrary applications |
| #10 Persistent Rust | Existing native/differential/lifetime tests pass; release Wasm counters and byte accounting on real asset; replaced upstream computation poisoned in correctness | No new Rust domain expansion; general selected-product acceptance and churn/high-water memory investigation remain open |
| #11 Renderer boundary | Same r186 WebGL/material/shader work, draw/triangle parity, exact captures, requested read/copy costs, callback and multi-camera guards on physical GPU | No transparent/transmissive pipeline, CPU skinning/raycast/bounds or arbitrary renderer callbacks/parents; general product/browser coverage incomplete |

## Evidence and reproduction

[Raw archive](../bench/results/mac-20261023/README.md), [source CI](https://github.com/postmelee/three.rust/actions/runs/39910823229), [Mac protocol](CI.md#physical-mac-validation). Fox frames are gzip-compressed losslessly with SHA-256 of original bytes in archive-integrity.json; the report reader accepts .json.gz transparently. The model binary remains an ignored checksum-verified download. Attribution applies to derived screenshots as well as the asset.

```sh
npm ci
npm run fixtures
npm run build
npm test
node scripts/fetch-fox.mjs
bash scripts/mac-validation.sh work/mac-session-NEW
# Recompute committed statistics without running browsers:
node bench/fox-report.mjs bench/results/mac-20261023/main
node bench/fox-report.mjs bench/results/mac-20261023/diagnostic
node bench/fox-compare.mjs bench/results/mac-20261023
```

The exact executed commands, source/asset/binary hashes, environment, failed runs and adaptation diff accompany the archive. Full Fox manifests at d9fa780 retain an unused inherited M0 `options.viewport` of 1920×1080 plus unrelated engine/scenario/output defaults; the measured runner actually hardcodes a 640×540 browser viewport and its fixture uses the recorded 640×480 renderTarget. These raw manifests are deliberately not rewritten. The final runner records only relevant options and the actual 640×540 viewport, and labels short runs as smoke. This post-measurement metadata cleanup changes no replay/engine behavior. The final comparison reader also rejects mismatched phase source hashes, browser, target, sample count or warmup. General browser/mobile compatibility, an independently repeated second-day/hardware session, GPU time for Fox, GC attribution and complete live/process/GPU memory accounting remain unmeasured. No FPS, power or general application gain is inferred from CPU timing alone.
