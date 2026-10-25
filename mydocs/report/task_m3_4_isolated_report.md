# Task #4: isolated physical-Mac baseline capture

## Verdict

The prescribed full protocol completed on hardware at the unchanged research source `9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7`. Correctness passed, but stable Rust-specific speedup remains unqualified: matched-JS A/A contains a sustained faster regime in two of five after-runs. The pre-existing median/MAD screen does not detect it. Keep the original rule and all raw samples; do not promote a favorable screen to acceptance.

In the main 16-rig window, original Three.js / matched JS / Rust-Wasm CPU p50 was 1.070 / 0.565 / 0.470 ms. Thus 0.505 ms (47.20%) of the original-to-Rust difference was already obtained by the JS ownership/algorithm restructuring; the incremental Rust observation was 0.095 ms (16.81% versus JS). Original-to-Rust was 0.600 ms (56.07%). These are observed window differences, not stable causal estimates, FPS gains, or actual-application results. The 16-rig absolute reduction is also below the 1 ms adoption gate. The one-rig incremental difference was only 0.00875 ms (3.76%), and static Rust was 0.00750 ms (7.89%) slower than matched JS.

## Source, build and environment

- Source above, tracked tree clean for all ten run manifests; separate checkout and branch `codex/mac-precision-20261026`. Main was not substituted. Lockfiles and Rust 1.90.0 were used; Node 24.15.0; release Wasm. Per-suite manifests contain source, asset and generated binary SHA-256 hashes.
- Apple M4 Pro: 12 CPU cores (8 performance, 4 efficiency), 16 GPU cores, 24 GiB RAM. macOS 26.5.2 (25F84), Darwin 25.5.
- Actual executable `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, version 155.0.8059.86. Headed WebGL2, ANGLE Metal Apple M4 Pro. Hardware preflight passed; SwiftShader negative guard passed. Software rendering was not counted as hardware.
- AC connected, battery 100%, power mode 0. Built-in display: 3024×1964 pixels, 1512×982 logical, 120 Hz. No thermal/performance warnings were reported; instantaneous temperatures, clocks and CPU scheduling were not measured.
- Fox viewport 640×540, drawing canvas 640×480, DPR 1, antialias off, shadows off, preserveDrawingBuffer on. All primary/A/A pages cross-origin isolated, observed timer increment approximately 0.005 ms. Ordinary-clock synthetic/M2 controls remain separate.
- Fresh browser contexts/pages per run; shared browser/OS/code caches, not cold-start measurements. No agent build or profile overlapped primary timing. Other desktop activity was not independently controlled; absence of heavy activity is not proof of a stable execution regime.
- Capture UTC 2026-10-25 17:57:03.878 to 19:37:15.409 (2026-10-26 02:57–04:37 KST); main 18:27:51.838–19:04:07.626 UTC.

## Reproduction and completeness

Read `docs/CI.md` at the captured SHA. Commands actually executed:

```sh
npm ci
npm run fixtures
npm run build
npm test
node scripts/fetch-fox.mjs
npm run test:timing
node scripts/mac-preflight.mjs work/mac-preflight-20261026-001
# Hardware correctness checks were run separately before the smoke and full protocol.
node bench/fox.mjs mode=hardware headless=false timing=isolated repeats=1 warmup=10 samples=30 out=work/mac-fox-smoke-20261026-002
RTHREE_TIMING_MODE=isolated caffeinate -di bash scripts/mac-validation.sh work/mac-precision-20261026-001
```

Use fresh output names on repetition. Full protocol exited 0. The [archive](../../bench/results/mac-isolated-20261026/README.md) preserves 264 runs / 499,500 samples: 54 synthetic ×600; 114 Fox main/A/A ×3600; 45 diagnostic ×600; 32 controls ×600; 16 shader-4k ×600; 3 GPU-query ×300. The 114 primary/A/A runs comprise 54 balanced main runs and four sets of 15 A/A runs. Main uses six variant permutations and 1200 warmup frames. Diagnostic reads every frame; main pays a snapshot read every 60 ticks. Do not pool these suites. Smoke is excluded from every result below.

Native tests, JS differential and TypeScript checks passed. Synthetic image/numeric checks passed for 14 route/scenario results. Fox passed 132 checkpoints with zero changed pixel channels and maximum numerical error 4.440892098500626e-16. Quaternion-sign information is retained. All 13 unsupported Fox cases rejected as intended. Preflight and negative software-renderer guard passed.

An initial standalone owned-check attempt failed with EADDRINUSE on port 4173 before browser validation; native checks had passed. The failure record is retained. A subsequent explicit bind probe and a fresh `002` correctness run passed, as did the full protocol. The collision cause is unknown; no external process was terminated or failed record overwritten.

## Main CPU and frame intervals

All entries are milliseconds: median of per-run quantiles, with linearly interpolated within-run quantiles. Intervals are consecutive measured callback start times, not display latency. Raw samples, per-run quantiles and ranges remain in the archive.

| Scene | Route | CPU p50 | CPU p95 | CPU p99 | Interval p50 | Interval p95 | Interval p99 |
|---|---|---:|---:|---:|---:|---:|---:|
| animated-1 | original | 0.23500 | 0.34000 | 0.42250 | 8.32000 | 10.13750 | 10.39500 |
| animated-1 | owned-js | 0.23250 | 0.33750 | 0.40500 | 8.32250 | 10.14775 | 10.38005 |
| animated-1 | owned-wasm | 0.22375 | 0.32750 | 0.38000 | 8.32250 | 10.16500 | 10.36515 |
| animated-16 | original | 1.07000 | 1.42500 | 2.23505 | 8.31000 | 10.12750 | 10.40000 |
| animated-16 | owned-js | 0.56500 | 0.78750 | 0.94505 | 8.32000 | 10.14025 | 10.37505 |
| animated-16 | owned-wasm | 0.47000 | 0.66500 | 0.78003 | 8.32000 | 10.12250 | 10.39010 |
| static-1 | original | 0.19000 | 0.28500 | 0.38000 | 8.32000 | 10.15000 | 10.39250 |
| static-1 | owned-js | 0.09500 | 0.16000 | 0.21750 | 8.32500 | 10.14775 | 10.37260 |
| static-1 | owned-wasm | 0.10250 | 0.16500 | 0.21750 | 8.32000 | 10.14500 | 10.38755 |

Frame intervals stay near 8.32 ms. CPU reductions do not establish higher FPS.

## A/A audit and unresolved stability

| Scene | Original before → after median | Matched-JS before → after median |
|---|---:|---:|
| animated-1 | 0.240 → 0.235 | 0.230 → 0.225 |
| animated-16 | 1.075 → 1.060 | 0.555 → 0.560 |
| static-1 | 0.190 → 0.190 | 0.100 → 0.105 |

The original rule is gain greater than max(5%, twice absolute relative median drift, twice relative within-session MAD), with separate workload/clock/tail interpretation. Its nominal animated-16 matched-JS threshold is 5%, below the observed 16.81%. However, the five matched-JS after-run p50s are **0.285, 0.270, 0.560, 0.560, 0.565 ms**. Median drift of 0.90% masks the two faster runs. The single-rig after values are 0.135, 0.170, 0.235, 0.235, 0.225; static values are 0.060, 0.065, 0.110, 0.105, 0.110. These are retained, not discarded as outliers.

A post-capture audit of all 16 animated-16 JS runs across before/main/after found identical final numeric-state SHA-256 `66bf91cfebee391cff177d462e6400b0bb173f5b6c2c3d0eda0efba836c62976`, 60 paid reads, 16 draws, 9216 triangles, 3600 timed steps and 64,650,240 command bytes per run. Invalid arrays were empty; clock increment was consistent. Six contiguous 600-frame blocks within each fast run remain faster, so this is not a single timer outlier. This audit does not identify the cause: browser tiering, CPU scheduling and other state remain hypotheses. The existing computed screen is preserved as historical output; stable Rust qualification is withheld.

## Diagnostics and controls

Separate diagnostic animated-16 mean stage medians (original / JS / Wasm, ms) were input commands 0.01363 / 0.10928 / 0.11501; evaluation 0.11553 / 0.20382 / 0.11314; copy 0.38656 / 0.01781 / 0.01903; reads 0.88866 / 0.05716 / 0.05917; render 0.48497 / 0.25151 / 0.24608. These instrumented paths include extra reads and repeated upstream work; they are not an additive decomposition of primary frames. The reduction in original copy/read work primarily motivates ownership restructuring; the Wasm evaluation difference alone cannot establish product value.

Ordinary-clock small static controls had p50/p95/p99 0.3/0.5/0.6 ms on all four routes. Shader controls at 640×360 had p50 0.1 ms; original/JS p95 0.2 versus Wasm/packed-JS 0.3 ms. At 4K all routes had 0.2/0.3/0.4 ms CPU quantiles. Coarse timing and no dedicated A/A preclude small-difference claims. Separate 4K GPU queries returned 897 available and 3 pending samples: run GPU p50 values 3.147083, 3.148499, 3.152 ms, p95 3.874124–3.937541 and p99 3.990708–4.050499. Pending queries are not zero. This is a GPU-oriented control, not Fox GPU time or proof that the whole scene is GPU-bound.

## Next priority and remaining gates

1. Diagnose and reproduce the A/A execution regimes with the exact baseline, keeping the existing protocol as a reference. Predeclare an additional distribution/block stability check before any new qualifying session; do not tune exclusions to this result.
2. Use original-app PR #43 to target public matrix observation and renderer delivery. Its Viewer/Editor captures are distinct from Fox and from primary timing. Small mixer costs favor reducing observation/submission overhead before adding animation kernels. Preserve native UI, picking, focus, gizmo, timeline, camera and shadows.
3. Validate each new engine at its own complete SHA with upstream and matched-JS routes, paid synchronization/materialization, dedicated hardware correctness and whole-path timing. A mechanism improvement is not an actual-app speedup.

A second identical session on another date, a second hardware device, actual-application candidate timing, and FPS/end-to-end latency qualification are not completed. Prior ordinary-clock captures are not interchangeable with this isolated protocol. No README performance claim, ownership count or milestone acceptance changes follow from this capture. Issues #3/#4/#5 remain open.
