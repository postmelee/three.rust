# Task #46 Stage 2: A/A lifecycle stability investigation

## Result

The planned lifecycle diagnostic completed and its runtime, workload and boundary-environment checks passed. **All nine full-diagnostic lifecycle groups failed the predeclared stability screen.** There were 9 failing run-level checks out of 27 and 36 failing 600-frame block checks out of 162. Increasing warmup from 1200 to 4800 frames did not establish a stable condition. Root cause remains unresolved; no qualifying performance advantage is inferred.

This is a completed negative experiment, not a code-correctness failure. It does not retroactively change or discard any result from PR #45. No lifecycle, fast run, slow run or block is removed. Original and JS sessions were sequential separate experiments; their numbers below must not be treated as a balanced JS-versus-Three.js performance comparison.

## Pins and scope

- Issue: [#46](https://github.com/postmelee/three.rust/issues/46); execution follows [Stage 2A plan](../plans/task_m6_46_impl.md#stage-2a-prospective-aa-lifecycle-diagnostic).
- Runtime and scene: clean `9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7`. No historical engine, scene or timing-loop changes were made.
- Tooling: clean `9ce1301888777f11a85aff0c7a117ab7b19ec0e3` for smoke/JS/original; clean `2894e7f39545ba2430c7f212a82990455daee466` for longer warmup. Driver `bench/aa-lifecycle.mjs` is byte-identical at both pins: SHA-256 `dfeb147682833a78ae42e391e32f46346729217b8b26cd207d0f01489ea207e6`. Manifests pin dependency/plan hashes and all runtime/asset/build inputs separately.
- Scene: historical animated-16 Fox, fixed tick/reset/read policy; 640×540 viewport, 640×480 canvas, DPR1, same materials/quality and isolated timing.
- Three lifecycle conditions: persistent same-page; fresh context/page in a separate persistent browser; new browser for each run. Three rounds rotate the order. Only one page executes its measured call at a time.
- The archive preserves 27 full diagnostic runs × 3600 frames = 97,200 frames, plus three separate smoke runs × 120 frames = 360 frames. Smoke uses only one run per condition and a partial block; its computed pass is structurally insufficient for stability or product evidence.

## Environment and instrumentation

Chrome 155.0.8059.86, executable `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, headed, WebGL2 ANGLE Metal Apple M4 Pro. Hardware was Apple M4 Pro, 12 CPU cores (8P/4E), 16 GPU cores and 24 GiB RAM; macOS 26.5.2 build 25F84, Darwin 25.5.0; Node 24.15.0. Allowlisted pre/post host records show AC power, battery 100%, power mode 0 and no recorded thermal/performance warnings. The recorded display was 3024×1964 physical / 1512×982 logical at reported 120Hz; scanout was not independently measured. Temperature, per-core frequency and scheduling were not measured.

All 60 before/after boundaries across the 30 full/smoke calls were visible and focused, with the expected viewport/canvas/DPR and cross-origin isolation. Every measured call returned an empty invalid array and no page errors; the historical visibility-change guard remained active during each call. Boundary focus checks do not prove there was no focus transition between boundaries. Observed minimum clock increments were approximately 0.005ms; this is not a measurement-accuracy guarantee.

Actual launch arguments are retained. They include Playwright's background-throttling controls and `--enable-unsafe-swiftshader`; that permission flag does not show SwiftShader was selected. The page renderer and browser GPU metadata independently report Metal/Apple hardware, not a software renderer.

CDP Performance counters were enabled uniformly. Task duration/heap and this launched browser's process CPU snapshots were collected outside the frame timers, around the full `measure()` call, **including warmup**. They are diagnostic context, not a per-frame CPU decomposition or uncontaminated primary timing. No CPU sampler, tracing or GPU timer query ran during capture. The snapshot boundaries and lifecycle IDs remain in each raw record. Broad host exclusivity is not established by these observations.

## Prospective rule and results

For each lifecycle condition, tolerance is max(5% of the median of its three run p50 values, four maximum observed clock increments). Every run p50 must be within that tolerance of the condition median. Every contiguous 600-frame block p50 must be within the same absolute tolerance of its own run p50. Tails and ranges remain separate. This is an engineering reproducibility screen, not statistical significance.

Milliseconds; p50 values are listed in round order. Failed checks are retained individually in each suite's summary.

| Variant / warmup | Lifecycle | Run p50 values | Tolerance | Failed run checks /3 | Failed block checks /18 |
|---|---|---|---:|---:|---:|
| owned-js / 1200 | same-page | 0.54000, 0.51000, 0.52000 | 0.02600 | 0 | 5 |
| owned-js / 1200 | new-page | 0.54000, 0.53500, 0.51000 | 0.02675 | 0 | 1 |
| owned-js / 1200 | new-browser | 0.51500, 0.37750, 0.53000 | 0.02575 | 1 | 7 |
| original / 1200 | same-page | 0.64500, 0.93500, 0.92500 | 0.04625 | 1 | 4 |
| original / 1200 | new-page | 1.01000, 0.95750, 0.95000 | 0.04788 | 1 | 1 |
| original / 1200 | new-browser | 1.00000, 1.00000, 0.99500 | 0.05000 | 0 | 5 |
| owned-js / 4800 | same-page | 0.59250, 0.67000, 0.21000 | 0.02963 | 2 | 3 |
| owned-js / 4800 | new-page | 0.59500, 0.54000, 0.21000 | 0.02700 | 2 | 3 |
| owned-js / 4800 | new-browser | 0.60500, 0.65750, 0.27000 | 0.03025 | 2 | 7 |

The warmup 4800 session still has large run-level differences: same-page 0.5925/0.6700/0.2100ms; new-page 0.5950/0.5400/0.2100ms; new-browser 0.6050/0.6575/0.2700ms. This rules out claiming that the tested longer warmup alone solved the observed instability. It does not identify JIT, CPU scheduling, OS power management or another cause.

Per-run tails below remain observations under an unstable environment. `Interval` is the measured callback-start interval; `Arrival` is callback start minus the rAF timestamp, not input or display latency.

| Suite | Round / lifecycle | CPU p50 | CPU p95 | CPU p99 | Interval p50 | Interval p95 | Interval p99 | Arrival p50 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| js | 0 / same-page | 0.54000 | 0.74525 | 0.93005 | 8.32500 | 10.11500 | 10.37520 | 0.28000 |
| js | 0 / new-page | 0.54000 | 0.76000 | 0.89005 | 8.32000 | 10.10500 | 10.35510 | 0.24500 |
| js | 0 / new-browser | 0.51500 | 0.73000 | 0.86500 | 8.32500 | 10.14500 | 10.38010 | 0.24000 |
| js | 1 / new-page | 0.53500 | 0.73500 | 0.89000 | 8.32000 | 10.14500 | 10.38500 | 0.28500 |
| js | 1 / new-browser | 0.37750 | 0.66000 | 0.75505 | 8.32000 | 10.20500 | 10.39510 | 0.13500 |
| js | 1 / same-page | 0.51000 | 0.68500 | 0.81500 | 8.32000 | 9.29000 | 9.41000 | 0.23000 |
| js | 2 / new-browser | 0.53000 | 0.74500 | 0.88000 | 8.32000 | 9.27500 | 9.41000 | 0.27500 |
| js | 2 / same-page | 0.52000 | 0.79500 | 0.96000 | 8.32500 | 9.27500 | 9.35010 | 0.24000 |
| js | 2 / new-page | 0.51000 | 0.67525 | 0.79500 | 8.32500 | 9.29000 | 9.43010 | 0.23500 |
| original | 0 / same-page | 0.64500 | 1.35500 | 1.57000 | 8.31000 | 10.19050 | 10.44510 | 0.11500 |
| original | 0 / new-page | 1.01000 | 1.35500 | 2.15525 | 8.31000 | 10.12500 | 10.38000 | 0.27000 |
| original | 0 / new-browser | 1.00000 | 1.36000 | 2.23530 | 8.31500 | 10.08500 | 10.40020 | 0.26000 |
| original | 1 / new-page | 0.95750 | 1.42500 | 2.00515 | 8.26500 | 10.19050 | 10.51510 | 0.22000 |
| original | 1 / new-browser | 1.00000 | 1.35500 | 2.14530 | 8.31500 | 10.12000 | 10.40010 | 0.26500 |
| original | 1 / same-page | 0.93500 | 1.38500 | 1.98515 | 8.27000 | 10.19000 | 10.50500 | 0.21500 |
| original | 2 / new-browser | 0.99500 | 1.40500 | 2.24055 | 8.31500 | 10.14000 | 10.38010 | 0.22500 |
| original | 2 / same-page | 0.92500 | 1.39025 | 2.29015 | 8.27500 | 10.22050 | 10.52010 | 0.22000 |
| original | 2 / new-page | 0.95000 | 1.36500 | 1.67805 | 8.28500 | 10.15000 | 10.44520 | 0.23000 |
| js-long-warmup | 0 / same-page | 0.59250 | 0.87000 | 1.00500 | 8.32000 | 9.32500 | 9.43000 | 0.20000 |
| js-long-warmup | 0 / new-page | 0.59500 | 0.87000 | 1.04500 | 8.32000 | 9.32550 | 9.44010 | 0.21000 |
| js-long-warmup | 0 / new-browser | 0.60500 | 0.88000 | 1.00505 | 8.32500 | 9.32500 | 9.46010 | 0.20500 |
| js-long-warmup | 1 / new-page | 0.54000 | 0.88025 | 1.01000 | 8.32000 | 9.25500 | 9.34500 | 0.19500 |
| js-long-warmup | 1 / new-browser | 0.65750 | 0.96500 | 1.05505 | 8.32000 | 9.26500 | 9.35500 | 0.24000 |
| js-long-warmup | 1 / same-page | 0.67000 | 0.97000 | 1.07000 | 8.32000 | 9.28000 | 9.36500 | 0.24500 |
| js-long-warmup | 2 / new-browser | 0.27000 | 0.80000 | 0.96505 | 8.32500 | 9.26500 | 9.33500 | 0.14000 |
| js-long-warmup | 2 / same-page | 0.21000 | 0.33500 | 0.58000 | 8.33000 | 9.28000 | 9.32510 | 0.13500 |
| js-long-warmup | 2 / new-page | 0.21000 | 0.34500 | 0.61500 | 8.33000 | 9.17000 | 9.32000 | 0.13500 |

## Work and data verification

All full runs finished with exactly identical numerical state across original and owned-JS routes and across both warmup lengths: SHA-256 `cd07e642b45c319d37f8293f059a983e60fa60a96cb1bf7a498f3bd747a90ccf` of the driver-serialized final state. Every full run had 3600 samples, 16 final draws, 9216 triangles and 60 paid snapshot reads. Owned-JS diagnostic deltas record 3600 steps/revisions/command batches; full summaries retain command, read, palette and root byte deltas. Adapter consumption delta equals 16×(warmup+samples), accounting for retained counters in same-page runs rather than mistaking cumulative counters for extra work. These counters and the final-state oracle support equal replay work; they are not a complete per-frame pixel oracle or GPU-execution proof.

All copied raw arrays, final numeric states, diagnostic counters, adapter values, draw/read counts, duration values and invalid arrays were compared against untouched local originals. The archive contains every run, including fast regimes and all failing stability checks. CDP task/heap and process CPU observations were available at both boundaries of every full and smoke call; their named scopes and raw values remain inspectable.

The [archive](../../bench/results/task46-aa-lifecycle-20261026/README.md) provides source-byte, normalized decoded-byte and gzip-payload hashes. Public-copy normalization is limited to checkout/home/ephemeral browser-profile paths and a battery instance identifier; no measured numeric values or timestamps are changed. Original local captures remain in their fresh output directories.

## Commands and evidence

These four driver invocations were captured, using the clean historical reference checkout and corresponding clean tooling commit above. Substitute a local path for `$REFERENCE`; choose fresh output directories when repeating.

```sh
node bench/aa-lifecycle.mjs reference="$REFERENCE" out=work/aa-lifecycle-smoke-001 variant=owned-js rounds=1 warmup=10 samples=120
node bench/aa-lifecycle.mjs reference="$REFERENCE" out=work/aa-lifecycle-js-001 variant=owned-js rounds=3 warmup=1200 samples=3600
node bench/aa-lifecycle.mjs reference="$REFERENCE" out=work/aa-lifecycle-original-001 variant=original rounds=3 warmup=1200 samples=3600
node bench/aa-lifecycle.mjs reference="$REFERENCE" out=work/aa-lifecycle-js-long-warmup-001 variant=owned-js rounds=3 warmup=4800 samples=3600
node bench/results/task46-aa-lifecycle-20261026/verify.mjs
```

Capture UTC ranges:

| Suite | Start | Finish |
|---|---|---|
| smoke | 2026-10-25T21:26:55.920Z | 2026-10-25T21:27:04.786Z |
| js | 2026-10-25T21:27:39.154Z | 2026-10-25T21:34:01.089Z |
| original | 2026-10-25T21:36:01.520Z | 2026-10-25T21:42:21.254Z |
| js-long-warmup | 2026-10-25T21:47:32.060Z | 2026-10-25T21:58:10.096Z |

## Impact on subsequent stages

No tested lifecycle or longer warmup yielded a stable qualifying condition. Stage 3 may perform its separately declared correctness and whole-path **screening** with contemporaneous original A/A and block checks; it must preserve an unstable or negative verdict. Stage 4 can establish actual-app compatibility, fallback coverage and realistic CPU headroom without promoting unstable timings to an adoption claim.

The source of the execution regimes remains unresolved. Per-core/OS/JIT traces, repeated-date sessions, another device/browser engine and a qualifying stable candidate/application comparison are unperformed. Further mechanism tracing must use a separate diagnostic capture. The finite investigation does not close the broader hardware/product acceptance issues, lower product thresholds or justify a new native subsystem by itself.
