# Task #46 Stage 4B: native Editor callback cost screen

GitHub Issue: [#46](https://github.com/postmelee/three.rust/issues/46)  
Implementation plan: [`task_m6_46_impl.md`](../plans/task_m6_46_impl.md#stage-4b-prospective-editor-callback-cost-screen)  
Stage: 4B

## Stage Purpose

The declared native Editor screen completed all 70 runs and 24 correctness oracle pages with no capture errors. **All three continuous original A/A groups failed the prospective stability screen.** The Wasm route had higher observed covered callback CPU than original Three.js and matched JS in every continuous condition. No prepared renderer pass executed during any continuous candidate window; the preserved feature path used fallback plus actual facade/native transform work.

This supports a finite negative adoption verdict for this candidate on this Editor path: no demonstrated app advantage or independent Wasm benefit, with an explicit prepared-pass coverage gap. It does not reject persistent Rust ownership in general or establish stable slowdown percentages, whole-browser CPU, input latency, GPU time or FPS. The idle control passed its absolute stability screen at timer-floor-sized cost. No engine optimization, ownership promotion or default-route change is included.

## Artifacts

| File | Change Summary |
|---|---|
| `bench/results/task46-editor-timing-20261026/` | All 2,826 copied payloads from two failed smokes, completed smoke and full screen, plus derived audits, reproducible archive/verifier scripts, mutation checks. |
| `scripts/apps/timing.mjs`, `timing-overlay.mjs`, `timing-phase.mjs`, candidate response helper | Previously committed timing/phase tooling. Its capture SHA and hashes are below; this archive/report does not modify it. |
| `mydocs/working/task_m6_46_stage4b.md` | Conditions, complete observations, scope/fallback limits, retained failures and next-step verdict. |

## Body Change Scope / Lossless Preservation

Full and final smoke tooling: clean `a1aad46f2bf8d74176b2b5e2836cbdd1ff34678a`. Candidate runtime: clean `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb`. Editor: unchanged `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8` (Three.js 0.186.1). Original Viewer remains pinned to `b5ee5dafe27f953ae1b55f42b5fa3697fef08683`; it was not replaced or timed by this Editor screen. Before/after source states match, and every session's integrity record is unchanged.

| Capture input | SHA-256 |
|---|---|
| `scripts/apps/timing.mjs` | `b87d8a377dc65bb397db43abe466dd3a28d8adc3249a9c0f065d412e1711f0cf` |
| `scripts/apps/timing-overlay.mjs` | `6a977c4b7e89a0eb8dee040a65f34bb77cb8ede6b9463e003d70d519798344fc` |
| `scripts/apps/timing-phase.mjs` | `f6561ad02a0e8b470cfd0a271cef6cde2337f635a4bfbef2bac19b1ad5c9c1af` |
| Serialized collector | `2eafbf006c4ea3c3c58a68d2d1ff4beebb8be7d3ff3aae0212b881e82aa432a4` |
| Original `Viewport.js` | `597f323c2b9c8c7e6f87bc92192baf5ecd940edb9533198b0c8dcbdcf706e196` |
| Original `Animation.js` | `1d47972dd3b92c1c28a44f0699b6b0e770a5cfcddc8959db87f2d9ef4d982983` |
| Candidate Wasm | `95f7aa7a807bd0bd4c9b45f0a855d2305c262cf5b7fef35a2d9dd9dfa889cdd9` |

The manifest pins the other helper, resource, lockfile and environment-collector hashes. Candidate adaptation inventories retain built-artifact hashes. Locked builds and Rust 1.90.0 were prepared before capture; the timing helper uses existing artifacts and does not independently certify their source-to-binary correspondence. The explicit initialization-before-module-evaluation correction remains required, as recorded in [Stage 4A](task_m6_46_stage4a.md).

All original/served entry files, timing source overlays, full patches, request/served-file inventories, fixed-state PNGs/numerics, callback rows, warmup, arming rows, measured pairs, summaries, failure/error records and host/browser metadata are retained. `archive-index.json` gives untouched source-byte, source-decoded, normalized public-decoded and stored-payload hashes. The builder recursively checks numerical invariance and rechecks every original source hash/file list after copying. Only 12 metadata payloads require path/profile/battery-identifier string normalization; all numeric JSON values, timestamps, arrays, counters and unavailable nulls remain. Gzip is lossless after these named transformations. No original result or failed attempt was overwritten.

The archive preserves Three.js MIT and RobotExpressive CC0 notices. RobotExpressive SHA-256 is `047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319`; attribution is Tomas Laulhe / Don McCurdy. The known 752 nonnormalized-weight validator errors and four skin-node warnings remain; Stage 4A verifies native loader normalization without reclassifying the asset as conformant. Skins, morphs and all 14 clips remain available.

### Conditions and covered CPU

Full capture UTC: **2026-10-25T23:12:03.337Z–23:33:41.654Z** (2026-10-26 local date). Chrome 155.0.8059.86, executable `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, headed; actual WebGL2 ANGLE Metal Apple M4 Pro. macOS 26.5.2 build 25F84, Darwin 25.5.0; Apple M4 Pro with 12 CPU cores (8P/4E), 16 GPU cores, 24 GiB RAM; Node 24.15.0. Before/after host records show AC power, battery 100%, power mode 0, no recorded thermal/performance warning, and 3024×1964 physical / 1512×982 logical display at reported 120 Hz. Scanout, temperature and per-core frequency were not measured. The manifest's generic display-metadata limitation does not erase the actual recorded display keys; absence of unrelated workload remains unproven by those host snapshots.

CSS viewport is 1280×720, page DPR 1. Native timeline content is 306px high, border box 307px; the normal selected-scene canvas is 930×378. Higher raster load changes only renderer pixel ratio to 2, producing 1860×756; page DPR/CSS layout and the 1024×1024 shadow map stay fixed. No-shadow changes only the key light's castShadow flag. The higher-resolution condition is not demonstrated GPU-bound. Original quality, antialias, materials, helpers, whole-model precise bounds, skins/morphs, native timeline and autosave remain.

The isolated browser clock's observed minimum increment is approximately 0.005 ms. Browser/CDP GPU/argv records distinguish the actual hardware backend from the permission flag `--enable-unsafe-swiftshader`. One controlled browser process uses fresh contexts/pages sequentially; only one page is measured at a time. Build/profile work was kept outside primary windows. No profiler, tracing, GPU query, heap inspection, screenshot, readPixels, scene traversal, diagnostic reset or JSON serialization runs inside them. Capture verifies focus/visibility/layout at boundaries and retains activity events; none occurred in sampled windows. These guards do not prove complete host exclusivity.

The primary per-pair CPU adds two disjoint synchronous callback bodies: `Viewport.animate` through `updatePT()`/epilogue, including animation, selected exact bounds, render passes and synchronous signal/UI work; and `Animation.updateTime` through its final rAF scheduling call, including timeline layout/text/playhead work. The collector records after each timed body. **This is covered animation-and-timeline callback CPU, not whole-browser CPU.** Measurement bookkeeping, other/vendor tasks, deferred UI outside these callbacks, asynchronous IndexedDB completion, browser paint/compositor and GPU work are excluded. Native autosave remains enabled and setup saves settle before capture; save signals describe submission, not IndexedDB completion. Instrumentation CPU overhead was not independently calibrated, so small differences are especially limited.

### Protocol, retained attempts and native workflow correction

Three continuous conditions retain native Walking on the complete selected Robot model root: with shadows, without shadows, and higher raster load. Four balanced Williams rounds rotate original-A / prepared-JS / prepared-Wasm / original-B; every label occupies each position once. Each condition also has an original-only before and after bookend. Full continuous runs use warmup 600 and 1,200 measured pairs; at the observed approximately 120 Hz these are about 5 and 10 seconds. E1 idle uses warmup 120 / samples 240 and retains no rendering; both rAF chains continue. Bookends influence the A/A tolerance and remain separate from balanced engine medians.

| Attempt | Exact tooling SHA | Oracle pages passed / failed | Completed timed runs | Measured pairs | Result |
|---|---|---:|---:|---:|---|
| smoke-001 | `8ab6874ee3087da0d0d88e5e0fd07b7ed026f83f` | 0 / 1 | 0 | 0 | Native timeline border-box expectation 306px failed against actual 307px. |
| smoke-002 | `1881908125e16ba3f68887a1cf13d92f2f8f753e` | 6 / 1 | 0 | 0 | Native deselection removes the selected action/Walking timeline. |
| smoke-003 | `a1aad46f2bf8d74176b2b5e2836cbdd1ff34678a` | 24 / 0 | 22 | 660 | Tool smoke completed; not performance evidence. |
| full | `a1aad46f2bf8d74176b2b5e2836cbdd1ff34678a` | 24 / 0 | 70 | 68,640 | Complete unqualified screen; all continuous A/A groups failed. |

The first smoke's fix records content and outer-box heights without changing the native resize gesture. The second failure establishes that unselected native timeline playback is unavailable for the pinned Editor: selecting null stops/clears the action and clips. That condition was explicitly excluded before any timed run. No forced mixer action, stale handler, bypassed signal or reduced bounds substituted for it. Historical E2 profile playback was harness-started and is not relabeled as this native E3 workflow. The fixed three-condition protocol, remaining quality, run lengths and balanced orders were frozen before the successful smoke/full captures.

The full dataset contains 54 continuous runs / 64,800 measured pairs and 16 idle runs / 3,840 measured pairs. Including 34,320 warmup pairs, it retains 102,960 complete pairs / 205,920 callback rows, plus 140 separate arming rows. Final smoke retains 880 pairs / 1,760 callback rows including warmup, plus 44 arming rows. The first observed native rAF timestamp is prospectively retained but excluded from paired analysis because arming may occur between its callbacks. No measured row or stability outlier was removed. Both failed smokes retain all available setup/partial-oracle evidence; they have no timed callback samples to invent.

## Verification Results

The independent Python verifier does not import the JS capture analyzer. It groups archived native callbacks by rAF timestamp, requires exactly one finite viewport/timeline row and nonoverlapping intervals, removes only the declared warmup, and independently recomputes measured pairs, CPU/interval/arrival quantiles, phase consistency, blocks, balanced medians, deltas and A/A. It also verifies every copied payload hash, source/tool/AC checks, overlay transformations/full patches, image/numeric oracles, activity constraints, idle work and counter deltas. All 2,826 payloads pass. Seven verifier mutation checks reject frozen action, changed duration, stalled mixer, missing/duplicate/overlapping callbacks and altered measured CPU.

### Fixed-state and dynamic correctness

Full and completed smoke each have 24 oracle pages and 42 fixed poses. The original comparison list contains 42 records including seven baseline self-comparisons; the non-self comparison is **35 pose pairs / 236,410 ordered numerical values**. Separate overlay-versus-unmodified checks cover 21 pose pairs / 141,846 values. All fixed images/PNG bytes, numerical arrays, object order/visibility, pass work, selection/history, timeline and quality agree, with maximum numerical error zero (tolerance 1e-10 + 1e-12 × abs(reference)). These are fixed-state oracles, not proof of identical dynamic poses in every timed frame.

All 54 full continuous windows independently validate native playback across 64,746 measured transitions. Each has 1,199 observable phase changes, zero repeated timeline mixer observations and 10–11 observed wraps of the 0.9583333134651184-second Walking clip. Viewport mixer time strictly advances; timeline mixer time never decreases and action phase follows its own mixer clock both incrementally and from the initial anchor. Maximum phase error is below 6e-14 seconds against 1e-9 tolerance. Viewport advance per measured window is 9.989875–9.993690 seconds. Native clocks remain wall-clock driven, so phase coverage differs slightly across routes; no frame-matched replay is claimed.

Each continuous window advances renderer frame counter by 4,800, and all 16 idle windows have zero renderer advancement/render notifications. Sampled focus, visibility, resize and autosave activity arrays are empty. App and runtime sources remain unchanged; no unknown external requests or close-time errors are recorded.

### A/A, blocks and bookends

A/A uses all original balanced runs plus the two bookends, with tolerance max(5% of their median p50, four maximum observed original clock increments). Every original run p50 and every contiguous 300-pair block p50 must pass; idle uses four 60-pair blocks. Own-run candidate block checks use their own run p50 and clock floor. All balanced candidate blocks pass that own-run check, which does not repair original A/A failures.

| Condition | Tolerance ms | Failed original run p50s | Failed original blocks | Failed own-run blocks, all routes | A/A |
|---|---:|---:|---:|---:|---|
| Root + shadow | 0.06663 | 0/10 | 3/40 | 3/72 | Fail |
| Root, no shadow | 0.06287 | 0/10 | 5/40 | 5/72 | Fail |
| Root, higher raster load | 0.06712 | 1/10 | 5/40 | 5/72 | Fail |
| Static idle | 0.02000 | 0/8 | 0/32 | 0/64 | Pass (auxiliary) |

Continuous totals: one failed original run median out of 30, and 13 failed original blocks out of 120. Small aggregate drift alone does not satisfy the block rule. No cause is assigned to JIT, OS scheduling or power management.

| Condition | Original pre p50 ms | Original post p50 ms | Post − pre ms | Drift % |
|---|---:|---:|---:|---:|
| Root + shadow | 1.38000 | 1.34000 | -0.04000 | -2.90 |
| Root, no shadow | 1.25500 | 1.24500 | -0.01000 | -0.80 |
| Root, higher raster load | 1.36000 | 1.33500 | -0.02500 | -1.84 |

### CPU costs and tails

Cells are **p50 / p95 / p99 in milliseconds**, each the median of independent balanced-run quantiles. Original has eight runs per condition; each candidate has four. No frame pooling or statistical-confidence claim is used. Component quantiles need not sum to the covered-pair quantile. Every continuous number is an observation under failed A/A.

| Condition | Route (runs) | Covered CPU | Viewport callback | Timeline callback |
|---|---|---:|---:|---:|
| Root + shadow | Three.js (8) | 1.33000 / 1.54500 / 1.63260 | 1.21500 / 1.41763 / 1.50005 | 0.11500 / 0.15500 / 0.18503 |
| Root + shadow | Matched JS (4) | 2.94250 / 3.21500 / 3.33500 | 2.84250 / 3.10513 / 3.22252 | 0.09750 / 0.13750 / 0.17502 |
| Root + shadow | Rust-Wasm (4) | 2.98000 / 3.25000 / 3.38758 | 2.88000 / 3.14513 / 3.27253 | 0.09500 / 0.14000 / 0.17003 |
| Root, no shadow | Three.js (8) | 1.26250 / 1.46763 / 1.56005 | 1.14000 / 1.33000 / 1.42503 | 0.11500 / 0.16000 / 0.19000 |
| Root, no shadow | Matched JS (4) | 2.78500 / 3.02763 / 3.13503 | 2.68625 / 2.92512 / 3.03253 | 0.09750 / 0.14250 / 0.17000 |
| Root, no shadow | Rust-Wasm (4) | 2.82750 / 3.09000 / 3.22002 | 2.72250 / 2.98513 / 3.10505 | 0.09625 / 0.14250 / 0.18000 |
| Root, higher raster load | Three.js (8) | 1.34250 / 1.54512 / 1.63503 | 1.22250 / 1.41263 / 1.50755 | 0.11500 / 0.15500 / 0.19755 |
| Root, higher raster load | Matched JS (4) | 2.95000 / 3.21500 / 3.35255 | 2.85000 / 3.11250 / 3.23250 | 0.09500 / 0.14250 / 0.17503 |
| Root, higher raster load | Rust-Wasm (4) | 2.97500 / 3.23750 / 3.36000 | 2.87500 / 3.13000 / 3.24508 | 0.09500 / 0.14000 / 0.17250 |
| Static idle | Three.js (8) | 0.01500 / 0.03000 / 0.03805 | 0.00500 / 0.01000 / 0.01500 | 0.01000 / 0.02000 / 0.02903 |
| Static idle | Matched JS (4) | 0.01500 / 0.02763 / 0.04555 | 0.00500 / 0.01000 / 0.01805 | 0.01000 / 0.02000 / 0.03000 |
| Static idle | Rust-Wasm (4) | 0.01500 / 0.02750 / 0.03653 | 0.00500 / 0.01000 / 0.01153 | 0.01000 / 0.02000 / 0.02903 |

Absolute/relative **cost changes**, candidate minus baseline, follow below; positive means higher observed cost. Percentages are descriptive arithmetic from the retained observations, not stable effect estimates. Wasm versus matched JS isolates the backend comparison within the common structure; it is separate from the entire candidate architecture versus Three.js. Idle percentages remain unavailable under the prospective floor rule.

| Condition | Comparison | p50 change ms / % | p95 change ms / % | p99 change ms / % |
|---|---|---:|---:|---:|
| Root + shadow | JS − Three.js | +1.61250 / +121.24% | +1.67000 / +108.09% | +1.70240 / +104.28% |
| Root + shadow | Wasm − Three.js | +1.65000 / +124.06% | +1.70500 / +110.36% | +1.75498 / +107.50% |
| Root + shadow | Wasm − matched JS | +0.03750 / +1.27% | +0.03500 / +1.09% | +0.05258 / +1.58% |
| Root, no shadow | JS − Three.js | +1.52250 / +120.59% | +1.56000 / +106.29% | +1.57498 / +100.96% |
| Root, no shadow | Wasm − Three.js | +1.56500 / +123.96% | +1.62238 / +110.54% | +1.65997 / +106.41% |
| Root, no shadow | Wasm − matched JS | +0.04250 / +1.53% | +0.06237 / +2.06% | +0.08500 / +2.71% |
| Root, higher raster load | JS − Three.js | +1.60750 / +119.74% | +1.66988 / +108.07% | +1.71753 / +105.05% |
| Root, higher raster load | Wasm − Three.js | +1.63250 / +121.60% | +1.69238 / +109.53% | +1.72497 / +105.50% |
| Root, higher raster load | Wasm − matched JS | +0.02500 / +0.85% | +0.02250 / +0.70% | +0.00745 / +0.22% |
| Static idle | JS − Three.js | +0.00000 / n/a | -0.00237 / n/a | +0.00750 / n/a |
| Static idle | Wasm − Three.js | +0.00000 / n/a | -0.00250 / n/a | -0.00152 / n/a |
| Static idle | Wasm − matched JS | +0.00000 / n/a | -0.00013 / n/a | -0.00903 / n/a |

All retained balanced candidate p50 ranges lie above the corresponding original range in these three continuous conditions. That unfavorable observation supports declining this candidate for this path; the failed stability gate still prevents a qualified effect size or general performance conclusion. The smaller JS/Wasm gaps are not a stable Rust language effect. Idle p50 is 0.015 ms in every engine and near the observed clock increment; its favorable-looking tail differences are not useful acceleration evidence.

### Intervals and callback arrival

Cells are median-run **p50 / p95 / p99 milliseconds**. rAF interval, earliest callback-start interval and arrival delay (earliest start minus rAF timestamp) are separate metrics. They do not measure GPU completion, display scanout, input latency or FPS.

| Condition | Route | rAF timestamp interval | Callback-start interval | Callback-arrival delay |
|---|---|---:|---:|---:|
| Root + shadow | Three.js | 8.33000 / 10.10000 / 10.32000 | 8.32500 / 10.19325 / 10.39505 | 0.36000 / 0.48250 / 0.59505 |
| Root + shadow | Matched JS | 8.33000 / 9.90650 / 10.30500 | 8.32500 / 9.93825 / 10.30515 | 0.33000 / 0.42750 / 0.51760 |
| Root + shadow | Rust-Wasm | 8.33000 / 10.01500 / 10.31500 | 8.33000 / 10.08875 / 10.33750 | 0.33000 / 0.42763 / 0.52255 |
| Root, no shadow | Three.js | 8.33500 / 9.99025 / 10.31750 | 8.32500 / 10.14550 / 10.39510 | 0.36250 / 0.49000 / 0.58503 |
| Root, no shadow | Matched JS | 8.33000 / 10.10050 / 10.31755 | 8.32500 / 10.15025 / 10.37280 | 0.33250 / 0.42250 / 0.51502 |
| Root, no shadow | Rust-Wasm | 8.33000 / 9.98025 / 10.31500 | 8.33000 / 10.06575 / 10.36010 | 0.33250 / 0.42750 / 0.49507 |
| Root, higher raster load | Three.js | 8.33000 / 9.98025 / 10.32500 | 8.32250 / 10.07825 / 10.38000 | 0.36500 / 0.48250 / 0.59755 |
| Root, higher raster load | Matched JS | 8.33000 / 9.99250 / 10.32000 | 8.33250 / 10.09525 / 10.36015 | 0.32000 / 0.42250 / 0.48753 |
| Root, higher raster load | Rust-Wasm | 8.33000 / 9.92825 / 10.32005 | 8.32750 / 9.98975 / 10.34530 | 0.32750 / 0.42500 / 0.52500 |
| Static idle | Three.js | 8.33000 / 10.05600 / 10.31405 | 8.34500 / 10.26550 / 10.35395 | 0.24500 / 3.45650 / 3.79592 |
| Static idle | Matched JS | 8.33000 / 10.09425 / 10.31215 | 8.34250 / 10.31625 / 10.38585 | 0.24000 / 3.62925 / 3.88275 |
| Static idle | Rust-Wasm | 8.33500 / 9.79850 / 10.16550 | 8.33750 / 10.13725 / 10.34930 | 0.23875 / 2.91150 / 3.66753 |

The median rAF cadence remains approximately 8.33 ms. Idle arrival tails remain visible even though measured callback CPU is small. This separation is why CPU savings, had they existed, would not by themselves establish FPS improvement.

### Actual native work, fallback and paid materialization

Every continuous candidate run records **zero prepared passes, zero prepared Wasm passes and zero prepared draw-matrix reads**. Each records 4,800 fallback counter increments, four per measured callback pair. This is preserved unsupported-path behavior, not an all-prepared scene. Wasm still executes ordinary facade/update work inside the measured callbacks.

The following counters are identical across the four balanced runs in each listed route/condition. Both shadow and higher-raster conditions have the same counter totals. Values are per 1,200 measured pairs; parentheses give the exact arithmetic per pair.

| Condition / route | Wasm calls | Fallback increments | Materialized matrices (`matrixReads`) | Materialized bytes |
|---|---:|---:|---:|---:|
| Shadow or higher raster / JS | 0 | 4800 (4) | 246000 (205) | 31488000 (26240) |
| Shadow or higher raster / Wasm | 162000 (135) | 4800 (4) | 246000 (205) | 31488000 (26240) |
| No shadow / JS | 0 | 4800 (4) | 243600 (203) | 31180800 (25984) |
| No shadow / Wasm | 159600 (133) | 4800 (4) | 243600 (203) | 31180800 (25984) |
| Static idle / JS or Wasm, 240 pairs | 0 | 0 | 0 | 0 |

`matrixReads` increments on a 128-byte local/world matrix materialization, not on every public getter or cached element access. `preparedMatrixReads` separately counts final draw-output copies and is zero here. Byte counts describe instrumentation-recorded materialization, not measured memory bandwidth, driver copies or GPU upload volume. They demonstrate a remaining paid boundary and original-renderer fallback, but they do not split CPU time into Proxy access, epoch guards, copying, bounds, palette work or renderer submission. Subtracting these counts from total time cannot predict a safe optimization saving. The scene remains feature-preserving; the profile-informed next investigation must measure those consumers separately.

### Commands and offline verification

The executed invocations use the pinned prepared app root and clean candidate. For smoke-001, only the underlying Node invocation is recorded here because its process wrapper is not retained in the command record. Smoke-002, smoke-003 and the full capture used the shown `caffeinate -di` wrapper. These output names are retained historical directories and must not be reused:

```sh
node scripts/apps/timing.mjs "$APP_ROOT" work/task46-editor-timing-smoke-001 mode=smoke candidateRoot="$CANDIDATE_ROOT" candidateSha=6990fd92f61a031c8c2ba7a8282cfb63684e6dfb
caffeinate -di node scripts/apps/timing.mjs "$APP_ROOT" work/task46-editor-timing-smoke-002 mode=smoke candidateRoot="$CANDIDATE_ROOT" candidateSha=6990fd92f61a031c8c2ba7a8282cfb63684e6dfb
caffeinate -di node scripts/apps/timing.mjs "$APP_ROOT" work/task46-editor-timing-smoke-003 mode=smoke candidateRoot="$CANDIDATE_ROOT" candidateSha=6990fd92f61a031c8c2ba7a8282cfb63684e6dfb
caffeinate -di node scripts/apps/timing.mjs "$APP_ROOT" work/task46-editor-timing-screen-001 mode=full candidateRoot="$CANDIDATE_ROOT" candidateSha=6990fd92f61a031c8c2ba7a8282cfb63684e6dfb
python3 bench/results/task46-editor-timing-20261026/verify.py
python3 bench/results/task46-editor-timing-20261026/test-verifier.py
```

Each smoke's exact tooling SHA is in the attempt table. Full and smoke-003 source/power finalization passed. Archive scripts parsed successfully; the archive verifier and seven mutation checks passed against the retained data. The verifier confirms the negative stability result without treating a valid negative experiment as a code-verification failure.

## Residual Risks

- Exact-baseline Fox and this continuous app A/A remain unstable; no causal diagnosis or qualified hardware advantage is established. There is no different-date replication.
- The measured scope is two synchronous native callbacks, with uncalibrated instrumentation overhead and browser/asynchronous exclusions. It does not establish whole-page CPU, frame presentation, GPU bottlenecks or battery effects.
- Dynamic native poses are not frame-matched across routes. Fixed-state oracles and phase progression are complementary, finite checks rather than complete dynamic correctness.
- This candidate's prepared renderer executes no pass in the measured app path. Wasm facade work/materialization still occurs; complete native ownership, arbitrary app content and full Three.js API remain unproven.
- Viewer migration, other hardware/browsers, complete interaction/clip coverage and the deferred native gizmo-handler cost screen remain outstanding. Native unselected timeline playback stays explicitly unavailable for this Editor.

## Impact on Next Stage

Keep this candidate as a research result; do not promote it as an app replacement/default or raise ownership/progress/performance claims. The finite outcome is negative/unsupported for prepared-render acceleration on the preserved native Editor path, with additional instability limiting precise effect sizes. A future candidate needs its own exact SHA, fresh correctness and timing path, and a separately declared scope.

Renderer/palette reuse remains the first profile-informed investigation, followed by exact bounds/public-matrix consumption and UI refresh. Preserve per-tick/skeleton/geometry/camera/shadow/callback invalidation, exact bounds, synchronous signals and identities. Apply an algorithm change to matched JS before attributing benefit to Rust. No approximate-bounds shortcut, mixed-pass renderer rewrite or new engine optimization was performed in this stage; candidate-specific profiling and any implementation remain separate work.

## Approval Request

The requested finite continuation authorized these stages. The completed screen and negative adoption/coverage verdict are submitted for evidence review and issue/PR reconciliation. Substantial engine-architecture choices should use these complete-path costs and compatibility gaps; a documentation update must not turn them into a qualified speedup.
