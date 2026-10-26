# Independent audit: Task #49 single-node Editor timing

The evidence supports declining adoption of this tested Editor path: neither candidate delivers the declared savings, and all continuous candidate CPU quantiles exceed the observed regression budget. A/A failures separately prevent a stable effect-size estimate or causal attribution. No product qualification, independent Rust advantage, ownership promotion or FPS improvement is established. This audit checks recorded work and arithmetic; it is not a new browser run.

## Capture and conditions

The exact pins, timestamps and payload hashes are listed in [README.md](README.md). Candidate `85e2c5d500edb0b92ea4ecb997087fded3fed45b` applies the matched single-node preparation change. The captured tool is `e9b736a47f48bc2512476f8966d285d0153419f7`; the committed native-editor-e3-v1 protocol retains Task #46 setup/settings. The prepared app source SHA is `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`; the unchanged companion Viewer source pin is `b5ee5dafe27f953ae1b55f42b5fa3697fef08683` but Viewer is not timed here. Every actual source/build/lock/served-overlay hash is retained in each suite's manifest and adaptation inventories. This verifier consumes those captured bytes; it does not rebuild engines.

MacBook Pro Mac16,8, Apple M4 Pro (12 CPU cores, 16 GPU cores), 24 GB, macOS 26.5.2 build 25F84; Node v24.15.0. Chrome 155.0.8059.86 at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. Actual WebGL backend is ANGLE Metal / Apple M4 Pro, not SwiftShader. The archived default launch arguments include a SwiftShader-enable flag; actual verified context/backend determines the hardware classification. Internal display: physical 3024×1964, logical 1512×982 at 120Hz. AC before/after and `powermode 0`; capture invoked under `caffeinate -di`. Thermal queries report no recorded warnings, which is not continuous thermal telemetry. The desktop is shared; before/after environment and focus checks do not prove exclusive OS scheduling throughout every callback.

CSS viewport 1280×720 and page DPR1; native canvas 930×378; timeline content 306/outer 307; native root-selected Walking with 1024 shadow map. Standard renderer DPR1, high-resolution control renderer DPR2 with unchanged CSS layout/page DPR; GPU-bound status is not assumed. Shadow/no-shadow retain required native callbacks and interactions. Native unselected timeline playback remains excluded for the source-proven reason preserved in the manifest: deselection clears the selected object's clips/action. Historical discovery failures remain in Task #46; neither new suite failed.

One headed Chrome process, fresh context/page per oracle and run. Full continuous matrix: four rotated route orders (original A, matched JS, original B, Wasm), 600 warmup/1200 measured pairs, plus original pre/post bookends for each of three cases. Idle: four rotated rounds, 120 warmup/240 measured pairs. At observed 120Hz, 1200 samples span roughly 10 seconds, not 20 seconds. No profiler, screenshots, GPU queries or stage timers enter a primary callback window. Smoke uses 10 warmup/30 samples and is only a tool check.

The boundary sums disjoint native Viewport.animate and Animation.updateTime synchronous bodies. CPU values include their synchronous JS/Wasm work and paid public reads; other callbacks, async completion, browser rendering and GPU work are outside this boundary. Envelope/observer overhead is uncalibrated. Native playback uses real time, so phase progression is validated per run without pretending that frames across routes have identical animation times.

## Raw reconstruction and correctness

Full: 70 runs, 68,640 measured pairs, 102,960 complete pairs including warmup, 140 retained arming callback rows, zero capture errors. All 54 continuous phase validations pass; maximum phase error is 4.390932062392494e-14 seconds against the 1e-9-second tolerance. All 16 idle windows preserve zero renderer-frame and candidate counter deltas. Smoke: 22 runs/660 measured pairs/880 pairs including warmup/44 arming rows; maximum phase error 1.304512053934559e-15 seconds. Arming data is retained separately according to the predeclared first-timestamp rule; no fast or unstable run is excluded.

Each suite has 24 passed oracle pages and 42 fixed poses. Original comparisons including seven reference self-comparisons total 283,692 numerical values; the 35 non-self comparisons total 236,410 values. The 21 independent instrumented/off overlay comparisons total 141,846 values. Numerical maximum error is zero; recorded pixel digests and PNG bytes agree. These fixed-pose checks validate bounded observer parity and scene state, not frame-matched dynamic poses or whole-browser correctness. The separately archived native UI/gizmo/focus/undo checks remain required.

Each callback window's raw reconstruction is checked against measured-pairs JSON and recorded summaries; every quantile below is a median of run quantiles for balanced routes (eight original A/B runs, four JS and four Wasm). Bookends participate in A/A but not effect medians. Values are milliseconds, rounded for display; `audit.json` retains full arithmetic. A sample quantile is linearly interpolated at `(n−1)q`; medians of per-run quantiles are not pooled-frame quantiles. Run ranges are descriptive, not confidence intervals.

## CPU observations

| Scenario | Route | CPU p50 / p95 / p99 (ms) | Balanced p50 range (ms) |
| --- | --- | --- | --- |
| Shadow | Three.js | 1.33000 / 1.60262 / 1.71757 | 0.89000–1.40250 |
| Shadow | Matched JS | 2.70125 / 3.02750 / 3.15755 | 2.43500–2.82000 |
| Shadow | Rust/Wasm | 2.72500 / 3.03750 / 3.17257 | 2.64500–2.88500 |
| No shadow | Three.js | 1.14000 / 1.33750 / 1.44253 | 1.04250–1.17500 |
| No shadow | Matched JS | 2.74000 / 2.97513 / 3.06005 | 2.68500–2.75500 |
| No shadow | Rust/Wasm | 2.77000 / 3.03750 / 3.13255 | 2.72250–2.86500 |
| Higher resolution | Three.js | 1.29125 / 1.52000 / 1.62752 | 1.21500–1.30500 |
| Higher resolution | Matched JS | 2.93875 / 3.19750 / 3.30260 | 2.89500–2.97000 |
| Higher resolution | Rust/Wasm | 2.96750 / 3.23013 / 3.35750 | 2.96000–2.98000 |
| Idle | Three.js | 0.01500 / 0.03000 / 0.04055 | 0.01500–0.01500 |
| Idle | Matched JS | 0.01500 / 0.03000 / 0.04000 | 0.01500–0.01500 |
| Idle | Rust/Wasm | 0.01500 / 0.03000 / 0.03903 | 0.01500–0.01500 |

## Absolute and relative differences

Positive changes mean more CPU. Comparisons against original Three.js include the candidate facade/structure; Wasm versus matched JS isolates the observed backend difference within that structure. Neither comparison is a qualified effect estimate because continuous A/A fails. Idle percentages are suppressed near the timer floor.

| Scenario | Comparison | Δ p50 / p95 / p99 (ms) | Δ p50 / p95 / p99 (%) |
| --- | --- | --- | --- |
| Shadow | JS − Three.js | +1.37125 / +1.42487 / +1.43998 | +103.10150 / +88.90882 / +83.83768 |
| Shadow | Wasm − Three.js | +1.39500 / +1.43488 / +1.45500 | +104.88722 / +89.53280 / +84.71246 |
| Shadow | Wasm − matched JS | +0.02375 / +0.01000 / +0.01503 | +0.87922 / +0.33031 / +0.47584 |
| No shadow | JS − Three.js | +1.60000 / +1.63763 / +1.61752 | +140.35088 / +122.43925 / +112.13150 |
| No shadow | Wasm − Three.js | +1.63000 / +1.70000 / +1.69002 | +142.98246 / +127.10281 / +117.15741 |
| No shadow | Wasm − matched JS | +0.03000 / +0.06237 / +0.07250 | +1.09489 / +2.09655 / +2.36924 |
| Higher resolution | JS − Three.js | +1.64750 / +1.67750 / +1.67508 | +127.58955 / +110.36184 / +102.92161 |
| Higher resolution | Wasm − Three.js | +1.67625 / +1.71013 / +1.72998 | +129.81607 / +112.50822 / +106.29483 |
| Higher resolution | Wasm − matched JS | +0.02875 / +0.03263 / +0.05490 | +0.97831 / +1.02033 / +1.66233 |
| Idle | JS − Three.js | +0.00000 / +0.00000 / -0.00055 | suppressed at clock floor |
| Idle | Wasm − Three.js | +0.00000 / +0.00000 / -0.00152 | suppressed at clock floor |
| Idle | Wasm − matched JS | +0.00000 / +0.00000 / -0.00097 | suppressed at clock floor |

## Frame-interval observations

rAF timestamp intervals and callback-start intervals are separately retained. Neither is display latency, GPU duration or a claim of FPS improvement. The observed interval tails stay within the numerical adoption-v1 regression allowance; this does not rescue the CPU or stability gates.

| Scenario | Route | rAF p50 / p95 / p99 (ms) | Callback-start p50 / p95 / p99 (ms) |
| --- | --- | --- | --- |
| Shadow | Three.js | 8.33000 / 10.07650 / 10.31255 | 8.33000 / 10.11400 / 10.37010 |
| Shadow | Matched JS | 8.33000 / 10.03350 / 10.30755 | 8.32500 / 10.11300 / 10.33760 |
| Shadow | Rust/Wasm | 8.33000 / 10.07225 / 10.30750 | 8.32500 / 10.11375 / 10.32040 |
| No shadow | Three.js | 8.33000 / 10.14500 / 10.31750 | 8.32500 / 10.19150 / 10.37750 |
| No shadow | Matched JS | 8.33000 / 10.00000 / 10.31250 | 8.33000 / 10.09575 / 10.35250 |
| No shadow | Rust/Wasm | 8.33000 / 9.98025 / 10.31000 | 8.33000 / 10.04050 / 10.33505 |
| Higher resolution | Three.js | 8.33000 / 9.98500 / 10.31000 | 8.33000 / 10.10000 / 10.35755 |
| Higher resolution | Matched JS | 8.33500 / 9.98775 / 10.30750 | 8.33000 / 10.08275 / 10.34510 |
| Higher resolution | Rust/Wasm | 8.33000 / 9.99000 / 10.31500 | 8.33250 / 10.07250 / 10.35760 |
| Idle | Three.js | 8.33250 / 10.05875 / 10.31000 | 8.34500 / 10.17400 / 10.32500 |
| Idle | Matched JS | 8.33250 / 9.82300 / 10.17075 | 8.34000 / 9.87575 / 10.28965 |
| Idle | Rust/Wasm | 8.33500 / 10.11875 / 10.32250 | 8.33500 / 10.09325 / 10.29610 |

## Prospective stability

Original run medians are compared with the median of all original runs, including both bookends. The shared scene tolerance is `max(5% × scene original median, 4 × scene clock increment)`, where the scene clock increment is the maximum of the original runs' observed minimum positive clock increments. Each original block median is compared with its own run's median using that shared scene tolerance. Separately, own-run block stability compares each block with its own run's median using `max(5% × that run's median, 4 × that run's clock increment)`. All four consecutive 300-pair continuous blocks and 60-pair idle blocks are preserved. The reported original block failures use the predeclared shared scene tolerance; the all-route own-block failures use each run's own tolerance.

| Scenario | Tolerance (ms) | Original run failures | Original block failures | All-route own-block failures | A/A |
| --- | --- | --- | --- | --- | --- |
| Shadow | 0.066625 | 3/10 | 14/40 | 16/72 | FAIL |
| No shadow | 0.057000 | 1/10 | 3/40 | 4/72 | FAIL |
| Higher resolution | 0.064563 | 1/10 | 0/40 | 0/72 | FAIL |
| Idle | 0.020000 | 0/8 | 0/32 | 0/64 | pass |

There are 5/30 continuous original run failures and 17/120 original block failures. Every continuous case therefore fails A/A; idle passes but is an auxiliary near-floor control. All route runs and all negative outcomes remain. The cause of instability is unresolved: this archive does not attribute it to OS scheduling, JIT, CPU frequency or the engine. Earlier baseline A/A instability is not considered fixed by this run.

## Adoption-v1 screen and interpretation

The verifier independently reapplies the observed numerical portions of [adoption-v1](../../../docs/PRODUCT_GOALS.md). G1 requires at least 20% and 1ms CPU p50/p95 savings versus original; G2 requires at least 10% and 0.5ms versus matched JS above the relevant stability envelope. Neither is observed in any continuous case. Original CPU p50 is only 1.14–1.33ms, below the normal 5ms CPU-heavy cohort target; this capture cannot fill the missing larger-content/multi-app headroom evidence.

For G5, continuous CPU p50/p95/p99 regressions exceed `max(5%, 0.2ms)` for both candidates. Every observed rAF/callback-start p95/p99 remains within its numerical allowance. Idle CPU stays within its floor-dominated budget; no idle speedup is inferred. Startup, transferred bytes, retained memory, 30-minute sustained interaction, another date/hardware class/browser engine and broad compatibility gates were not measured by this callback screen.

The finite run distributions give a practical reason to decline this path while the exact effect estimate remains inconclusive: even the fastest balanced candidate run's CPU quantile exceeds the slowest balanced original's corresponding quantile, as shown below. These descriptive differences are neither confidence intervals nor a replacement for A/A, and they do not establish universal backend performance.

| Scenario | Route | Fastest candidate − slowest original p50 / p95 / p99 (ms) |
| --- | --- | --- |
| Shadow | Matched JS | +1.03250 / +0.82000 / +0.72500 |
| Shadow | Rust/Wasm | +1.24250 / +1.02500 / +0.93995 |
| No shadow | Matched JS | +1.51000 / +1.51500 / +1.50995 |
| No shadow | Rust/Wasm | +1.54750 / +1.57000 / +1.55495 |
| Higher resolution | Matched JS | +1.59000 / +1.63500 / +1.60000 |
| Higher resolution | Rust/Wasm | +1.65500 / +1.65500 / +1.63495 |

## Work, fallback and paid-read coverage

All continuous candidate windows record **zero prepared passes and four fallback passes per native callback pair**. Prepared matrix reads and prepared Wasm calls are zero. Shadow and higher-resolution windows perform 205 public matrix materializations and 26,240 materialized bytes per measured pair; no-shadow performs 203 and 25,984 bytes. Wasm calls are 135 per shadow/high-resolution pair and 133 per no-shadow pair; matched JS records zero Wasm calls. Each continuous pair increments renderer.info.render.frame by four (retained native main/auxiliary work), while idle renders zero. These rates are independently recomputed from before/after deltas for every run.

The counters prove finite paid read/fallback work on this route. They do not count every scalar proxy read, every consumer, all native/browser allocation, or GPU transfer. Bytes describe the recorded materialization counter, not network bytes or retained memory. Prepared ownership is not promoted when every native renderer path falls back. The separate source-attributed profiles can guide the next cost target; profiler costs and historical 6990→85 observations are not inserted into this primary timing table.

## Reproduction and verification

Use the pinned tooling checkout with its lockfile/toolchain and built candidate checkout. `APPS_ROOT` points to the prepared, pinned app repositories; `SINGLE_ROOT` points to the exact candidate 85 checkout. Replace output suffixes with fresh directories for a repeat. The following are the captured invocation shape with local paths normalized; clean pin and protocol checks are enforced before capture:

```sh
caffeinate -di node scripts/apps/timing.mjs "$APPS_ROOT" work/task49-editor-single-timing-smoke-001 mode=smoke candidateRoot="$SINGLE_ROOT" candidateSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b protocol=mydocs/plans/task_m6_49_editor_protocol.json
caffeinate -di node scripts/apps/timing.mjs "$APPS_ROOT" work/task49-editor-single-timing-full-001 mode=full candidateRoot="$SINGLE_ROOT" candidateSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b protocol=mydocs/plans/task_m6_49_editor_protocol.json
```

After capture, the independent verifier hashes every copied payload, reconstructs raw rows, validates counts/order/phase/quantiles/A/A/oracles/source patches, and compares its fresh audit to `audit.json`. Seven mutation checks, four normalization-policy checks and five storage resolver checks pass. [README.md](README.md) gives the four offline verification commands and archival procedure. Original local evidence is untouched. Only explicit environment battery ID strings are normalized; complete original-source/decoded-source/public/stored SHA-256 mappings retain provenance. No engine, captured source, historical result or declared performance gate was edited by this audit.
