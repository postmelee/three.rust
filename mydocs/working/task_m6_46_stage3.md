# Task #46 Stage 3: whole-path candidate screen

GitHub Issue: [#46](https://github.com/postmelee/three.rust/issues/46)  
Implementation plan: [`task_m6_46_impl.md`](../plans/task_m6_46_impl.md#stage-3a-prospective-whole-path-screening-matrix)  
Stage: 3

## Stage Purpose

Test whether the C3 prepared renderer and the matrix-read epoch guard improve the complete existing fixture path while preserving work, pixels and numerical output. The 144-run screen completed, and correctness/runtime checks passed. **All four contemporaneous original A/A groups failed the predeclared reproducibility screen.** The epoch Wasm CPU p50 was higher than Three.js in every tested scene. This is a completed negative/unstable screen; it qualifies no speedup, FPS gain, default choice or ownership promotion.

## Artifacts

| File | Change Summary |
|---|---|
| `bench/results/task46-candidate-screen-20261026/` | 277 copied payloads: all 144 full runs, 24 smoke runs, 24 separate correctness captures/PNGs in each suite, manifests, analysis, host metadata, server records and MIT notice; archive index plus derived audit/verifier. |
| `bench/candidate-screen.mjs` | Previously committed capture driver; exact capture hash below. This report/archive does not modify it. |
| `mydocs/working/task_m6_46_stage3.md` | Conditions, full results, negative verdict, preservation and next-stage limits. |

## Body Change Scope / Lossless Preservation

Runtime C3 is `ce21ffcf355534a8cf32eb4c9f7e43d6a86509b5`; runtime epoch is `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb`. Both are separate clean checkouts. The full capture's clean tooling is `cadc5edd694b3aa778dd049251d15e5f6dd75c87`; smoke tooling is `c7e6c25413f4731cd16f8a1bafa8b07510e10b78`. Driver SHA-256 at both is `f0f7b1c3afb5153707df6ee8632aef30f29ff99ddecfe0b1d604cb11db465d69`. Final source verification passed.

The manifests pin every relevant runtime/build/tool input. Original Three.js is 0.186.1 (upstream `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`), Rust toolchain is pinned to 1.90.0, and Node is 24.15.0. Both runtime roots have identical recorded lockfiles, native math, generated fixtures, browser loop, Three.js and Wasm bytes; among the recorded runtime files, only `packages/rthree/facade-state.js` differs. Wasm SHA-256 is `95f7aa7a807bd0bd4c9b45f0a855d2305c262cf5b7fef35a2d9dd9dfa889cdd9`. Capture used existing built artifacts; the driver verifies their hashes and does not itself rebuild or certify source-to-binary correspondence.

All 86,400 full timed rows and 240 smoke rows remain. Each suite retains 24 complete fixed-state snapshots and PNGs from separate correctness pages; no timed page is advanced for a post-hoc image. Public copies retain every failed screen, fast/slow run, row, counter and error. `archive-index.json` records original source-byte, source-decoded, public-decoded and stored-payload hashes. Gzip is lossless after normalizing only absolute checkout/profile paths and a battery identifier in six metadata files. Numeric JSON values were recursively checked against the untouched local originals. No original capture, runtime or historical result was overwritten.

### Environment and timing boundary

The full capture ran 2026-10-25T22:19:31.665Z–22:40:17.061Z (2026-10-26 local date). Chrome 155.0.8059.86, executable `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, headed, WebGL2 ANGLE Metal Apple M4 Pro. Hardware: Apple M4 Pro, 12 CPU cores (8P/4E), 16 GPU cores, 24 GiB RAM; macOS 26.5.2 build 25F84, Darwin 25.5.0. Full-capture before/after host records show AC power, battery 100%, power mode 0, no recorded thermal/performance warning, and 3024×1964 physical / 1512×982 logical internal display at reported 120 Hz. This records display configuration, not measured scanout. The smoke's older host collector omitted resolution keys; do not project later records backward as proof.

All timed and correctness boundaries were visible/focused, 640×360, DPR 1, with hardware Metal reported. The isolated clock's minimum observed increment was approximately 0.005 ms. Actual launch arguments and browser GPU metadata remain in manifests; the presence of `--enable-unsafe-swiftshader` as a permission flag does not make the selected hardware renderer SwiftShader. No profiler, tracing, GPU timer query or stage timings ran in the measured loop. No concurrent build/profile task was launched by this workflow. Boundary observations do not establish perfect host exclusivity or rule out an intervening focus event; temperature, per-core frequency and scheduler state were not measured.

CPU measures the historical fixture loop from animation/update through renderer return, including public reads and synchronous submission. Row bridge-counter collection occurs after that CPU interval. Frame interval is the difference between rAF timestamps, including the first measured row after warmup; it is not callback-start interval, display latency, presentation time or an FPS guarantee. This differs from the Stage 2 Fox callback-interval metric. GPU execution duration is unavailable.

### Protocol and controls

Four scenes × six routes × six balanced Williams-order rounds; each route appears once in each position. Routes are identical upstream `original-A`/`original-B`, C3-JS/C3-Wasm and epoch-JS/epoch-Wasm. Each fresh context/page uses 240 warmup frames and 600 recorded frames; only one page is measured at a time. Per-run linearly interpolated quantiles are summarized by median across six runs, never by treating pooled frames as independent repetitions.

Cubes preserves the 2,000-mesh normal fixture, rotating camera and center-pointer raycast. Hierarchy is an explicitly scaled 10,000-cube / 1,000-group control: its original nonrecursive raycast sees groups and produces no mesh hits, so it is not an equivalent raycast load or an application result. Small is an 8-cube static control. Shader is the upstream Monjori/Mic GPU-oriented control; GPU dominance is not established. These are seeded deterministic fixture adaptations described in `fixtures/README.md`, not unmodified real-app timing. No Soldier asset was used.

For each scene, all 12 original-A/B run p50 values must fall within max(5% of their median, four maximum original clock increments). Each contiguous 120-frame original block must also fall within that same absolute tolerance of its own run p50. Separate per-route blocks use max(5% of their own run p50, four own clock increments). This is an engineering screen, not statistical significance.

### A/A and block results

| Scene | A/A tolerance ms | Failed runs / 12 | Failed original blocks / 60 | A/A result |
|---|---:|---:|---:|---|
| cubes | 0.07600 | 6 | 12 | Fail |
| hierarchy | 0.33719 | 8 | 7 | Fail |
| small | 0.02000 | 3 | 13 | Fail |
| shader | 0.02000 | 1 | 20 | Fail |

In total, 18 of 48 original run checks and 52 of 240 original block checks failed. Across all routes, 160 of 720 own-run block checks failed. Full per-run ranges, block p50s and the original-specific tolerance flags remain in `full/analysis.json`. No exclusion or retrospective redefinition makes this matrix stable.

### CPU and rAF interval observations

Milliseconds, median of six per-run quantiles. Every row is an observation under failed A/A stability.

| Scene | Route | CPU p50 | CPU p95 | CPU p99 | rAF interval p50 | rAF interval p95 | rAF interval p99 |
|---|---|---:|---:|---:|---:|---:|---:|
| cubes | original-A | 1.53250 | 2.02750 | 2.28785 | 8.33000 | 9.24500 | 9.30752 |
| cubes | original-B | 1.50750 | 1.94263 | 2.27512 | 8.33250 | 9.23288 | 9.32000 |
| cubes | C3-JS | 3.66250 | 4.28775 | 4.48257 | 8.33500 | 9.25275 | 9.32002 |
| cubes | C3-Wasm | 3.75250 | 4.34000 | 4.63778 | 8.33500 | 9.13537 | 9.27510 |
| cubes | epoch-JS | 3.74000 | 4.34763 | 4.55270 | 8.33500 | 9.26538 | 9.31752 |
| cubes | epoch-Wasm | 3.59875 | 4.20012 | 4.51555 | 8.33375 | 9.13787 | 9.27753 |
| hierarchy | original-A | 6.81750 | 7.61775 | 7.93017 | 8.33500 | 9.06538 | 9.30002 |
| hierarchy | original-B | 6.68750 | 7.52788 | 8.26807 | 8.33500 | 9.23762 | 9.31253 |
| hierarchy | C3-JS | 14.00500 | 15.27887 | 16.62448 | 16.66000 | 17.87575 | 18.13005 |
| hierarchy | C3-Wasm | 13.47375 | 14.58562 | 15.35297 | 16.20750 | 17.56500 | 17.62253 |
| hierarchy | epoch-JS | 14.46875 | 15.53375 | 16.28555 | 16.66000 | 17.50513 | 17.61002 |
| hierarchy | epoch-Wasm | 14.05000 | 15.02013 | 15.45343 | 16.42625 | 17.49850 | 17.61750 |
| small | original-A | 0.14750 | 0.26275 | 0.34508 | 8.33500 | 9.24562 | 9.31000 |
| small | original-B | 0.15250 | 0.26513 | 0.33513 | 8.33000 | 9.24025 | 9.31252 |
| small | C3-JS | 0.22250 | 0.46000 | 0.55005 | 8.33250 | 9.20025 | 9.29510 |
| small | C3-Wasm | 0.23250 | 0.47250 | 0.57260 | 8.33500 | 9.27025 | 9.31755 |
| small | epoch-JS | 0.23000 | 0.42263 | 0.55502 | 8.33500 | 9.17275 | 9.32002 |
| small | epoch-Wasm | 0.21750 | 0.39262 | 0.49012 | 8.33500 | 9.24762 | 9.31503 |
| shader | original-A | 0.06500 | 0.13512 | 0.18260 | 8.33375 | 9.14525 | 9.30255 |
| shader | original-B | 0.05750 | 0.10250 | 0.12763 | 8.33500 | 9.27512 | 9.32500 |
| shader | C3-JS | 0.11750 | 0.21500 | 0.27260 | 8.33375 | 9.19025 | 9.31250 |
| shader | C3-Wasm | 0.12000 | 0.21250 | 0.26750 | 8.33250 | 9.11075 | 9.29002 |
| shader | epoch-JS | 0.11875 | 0.20750 | 0.27265 | 8.33000 | 9.26750 | 9.32000 |
| shader | epoch-Wasm | 0.12500 | 0.22000 | 0.28257 | 8.33250 | 9.27263 | 9.30753 |

Absolute/relative CPU savings below use baseline minus candidate; negative means higher observed cost. C3→epoch isolates the guard revision within the same execution architecture. Epoch-JS→epoch-Wasm distinguishes native execution from the matched JS route; it does not explain the full difference from Three.js. None of these differences is qualified as a stable improvement.

| Scene | Baseline → candidate | p50 saving ms | p50 % | p95 saving ms | p95 % | p99 saving ms | p99 % |
|---|---|---:|---:|---:|---:|---:|---:|
| cubes | original-A → epoch-JS | -2.20750 | -144.05 | -2.32013 | -114.43 | -2.26485 | -98.99 |
| cubes | original-A → epoch-Wasm | -2.06625 | -134.83 | -2.17263 | -107.16 | -2.22770 | -97.37 |
| cubes | C3-JS → epoch-JS | -0.07750 | -2.12 | -0.05988 | -1.40 | -0.07013 | -1.56 |
| cubes | C3-Wasm → epoch-Wasm | +0.15375 | +4.10 | +0.13988 | +3.22 | +0.12222 | +2.64 |
| cubes | epoch-JS → epoch-Wasm | +0.14125 | +3.78 | +0.14750 | +3.39 | +0.03715 | +0.82 |
| hierarchy | original-A → epoch-JS | -7.65125 | -112.23 | -7.91600 | -103.92 | -8.35537 | -105.36 |
| hierarchy | original-A → epoch-Wasm | -7.23250 | -106.09 | -7.40238 | -97.17 | -7.52325 | -94.87 |
| hierarchy | C3-JS → epoch-JS | -0.46375 | -3.31 | -0.25488 | -1.67 | +0.33893 | +2.04 |
| hierarchy | C3-Wasm → epoch-Wasm | -0.57625 | -4.28 | -0.43450 | -2.98 | -0.10045 | -0.65 |
| hierarchy | epoch-JS → epoch-Wasm | +0.41875 | +2.89 | +0.51362 | +3.31 | +0.83212 | +5.11 |
| small | original-A → epoch-JS | -0.08250 | -55.93 | -0.15988 | -60.85 | -0.20995 | -60.84 |
| small | original-A → epoch-Wasm | -0.07000 | -47.46 | -0.12988 | -49.43 | -0.14505 | -42.03 |
| small | C3-JS → epoch-JS | -0.00750 | -3.37 | +0.03737 | +8.12 | -0.00497 | -0.90 |
| small | C3-Wasm → epoch-Wasm | +0.01500 | +6.45 | +0.07988 | +16.90 | +0.08248 | +14.40 |
| small | epoch-JS → epoch-Wasm | +0.01250 | +5.43 | +0.03000 | +7.10 | +0.06490 | +11.69 |
| shader | original-A → epoch-JS | -0.05375 | -82.69 | -0.07238 | -53.56 | -0.09005 | -49.32 |
| shader | original-A → epoch-Wasm | -0.06000 | -92.31 | -0.08488 | -62.81 | -0.09998 | -54.75 |
| shader | C3-JS → epoch-JS | -0.00125 | -1.06 | +0.00750 | +3.49 | -0.00005 | -0.02 |
| shader | C3-Wasm → epoch-Wasm | -0.00500 | -4.17 | -0.00750 | -3.53 | -0.01508 | -5.64 |
| shader | epoch-JS → epoch-Wasm | -0.00625 | -5.26 | -0.01250 | -6.02 | -0.00992 | -3.64 |

The epoch-Wasm hierarchy rAF interval p50 was 16.42625 ms versus original-A 8.33500 ms; this is an observed interval regression, not an established presentation-rate estimate. Static and shader CPU work is very short relative to the clock/scheduling context, and unfavorable control outcomes remain visible. `full/analysis.json` retains all 28 comparisons, per-repeat pairs and route ranges. Apparent gains within a candidate family do not offset the observed upstream gap or solve instability.

## Verification Results

Capture invocations used the following recorded options, with separate pinned runtime roots (`$C3`, `$EPOCH`) and clean tooling. These existing output names are historical; choose fresh directories for a repeat. Browser argv is retained independently in each manifest.

```sh
node bench/candidate-screen.mjs c3="$C3" epoch="$EPOCH" out=work/task46-candidate-smoke-001 repeats=1 warmup=5 samples=10
node bench/candidate-screen.mjs c3="$C3" epoch="$EPOCH" out=work/task46-candidate-screen-001 repeats=6 warmup=240 samples=600
python3 bench/results/task46-candidate-screen-20261026/verify.py
```

The capture driver completed with empty error/request-failure records and source verification passed. The offline verifier independently recomputed all per-run quantiles, group medians, deltas and stability checks from archived rows. Result: 277 payload hashes verified, 144 full / 24 smoke runs, 86,400 / 240 frames, 24 correctness captures per suite. Each suite compares 20 candidate/A/A image pairs and 1,041,280 matrix values with exact pixel/PNG equality and zero maximum absolute matrix error; numerical tolerance is 1e-10 + 1e-12 × abs(reference). Draw/triangle/point/line work is identical across routes at each correctness state and at the common final timed tick.

All 96 full candidate runs exercise prepared work on every measured row and have zero prepared fallback in these ordinary fixtures. All 48 full Wasm runs show native prepared execution; first-row counters include warmup, and each of the remaining 599 row intervals advances exactly one prepared/native pass. Original rows have no candidate diagnostics. These coverage checks do not prove complete product ownership. The verifier confirms the negative A/A result; it does not fail merely because the experiment is negative.

## Residual Risks

- A/A instability remains unresolved. No causal claim about OS scheduling, CPU power or JIT is justified by these data.
- This screen is one date, one Mac, one browser/backend, and four fixture scenes. Other-date replication and qualified hardware whole-frame advantage remain incomplete.
- Full application animation/selection/timeline paths, skinned/morph fallback, callbacks and asynchronous UI work are outside these fixtures.
- No GPU duration, scanout latency or complete public-API compatibility is established. CPU improvements alone would not establish FPS gains.

## Impact on Next Stage

Keep C3/epoch as research candidates and proceed to the actual Editor compatibility/cost verdict with a new declared protocol. Preserve the native skinned/morph route, public matrix reads, selection/bounds, renderer submission and independent timeline callback costs. Measure the full outer operations before choosing another engine optimization. This report changes no README performance claim or ownership level.

## Approval Request

The task requester already authorized completion of the short-term goal and successive stages. Stage 3 artifacts and verification are submitted for review; the authorized next step is the separately recorded Editor verdict, carrying forward this negative screen without performance qualification.
