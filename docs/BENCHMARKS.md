# Executed and reproducible benchmark protocol

The bootstrap proposal is superseded by ADR 0001 for this bounded cloud run.
Normal-size interactive cubes is the primary fixture; one Soldier and shader
are original-size public-example replays, small/hierarchy are explicit variants.
Sources, hashes, licensing and exact adaptation differences: fixtures/README.md.

A: official three@0.186.1 build. B: same r186 source bundled as local rthree,
hook disabled. C: B with persistent Rust transform batches. D: C bridge/layout
with JS arithmetic, to separate language and data movement. Same application
HTML, renderer/shaders/geometry, camera, seed, viewport, DPR and simulation tick
range. Only import resolution and explicit init differ. D is not a hand-tuned
best possible JS engine and does not establish optimal JS performance.

M0: 5 independent reloads, 30 warm + 120 sample frames per fixture, timer
attribution wrappers; 5 unprofiled cubes runs; separate V8 profiles. Full details
and initial selection numbers are fixed in the pre-implementation ADR.

M2 cloud main protocol: **7 repeats × 5 scenes × 4 engines = 140 runs**,
each 60 warm + 180 sampled frames (25,200 samples). Rotate A/B/C/D starting
engine by repeat, reload independent pages sequentially. Browser process is
shared across runs; ordering is balanced approximately, not fully randomized.
No image capture, V8 profile, bridge stage timers or GPU queries in main runs.
Raw per-frame CPU, rAF interval, counters and per-run startup/work/heap preserved.

The primary CPU timer starts before application animate() and ends after
renderer return and app stats update. It includes scan, changed-value stores,
Rust execution, JS result materialization and renderer submission. It excludes
benchmark result serialization and subsequent GPU completion. This is main-thread wall elapsed time, not OS
on-CPU cycles: preemption and driver backpressure can be included. `render` in M0
is inclusive of transforms/skeleton; nested labels must not be added together.
Stats/GUI overhead exists in the original examples and is retained in all modes.
No FPS or battery improvement is inferred from CPU timer reduction.

`bench/summarize.mjs` computes per-run p50/p95/p99 and then reports the median
of each across repeats. Do not pool frames to pretend they are independent
experiments. A paired run-level bootstrap is reported with the final analysis;
seven shared-cloud runs do not justify broad hardware claims. Small scene
times approach 0.1ms timer granularity, so ratios can be unstable/meaningless.

`bench/results/m2-smoke` is a short diagnostic, not the main result. Separate
stage/GPU diagnostics are labeled as such and kept out of product tables.
Uploaded bytes count actual changed f64 stores into arena memory; scanned bytes
represent the fixed scanned field volume, not network traffic. Materialized
bytes count 32 f64 local/world elements written per node, not DMA/GPU uploads.
The Rust arena is persistent but the bridge still allocates traversal arrays,
scans public state and writes public matrix arrays. All that cost stays visible.

See CLOUD_SETUP.md for clean installation, software/hardware modes and
longer hardware reproduction. See REPORT.md for actual evidence and omissions.

The new opt-in hardware Actions protocol is specified separately in [CI.md](CI.md).
It does not replace these historical M0–M2 settings or establish a hardware result.

The separate [C2 facade protocol](PERSISTENT_FACADE.md#verification-and-measurement)
adds dirty-only payloads, operation-buffer bytes and demand-driven matrix reads.
Its `bench/facade.mjs` runner uses ephemeral ports and records boundary-only and
actual rendered paths separately. These settings do not rewrite M0–M2 results.
