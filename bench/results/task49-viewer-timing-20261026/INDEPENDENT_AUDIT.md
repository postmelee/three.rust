# Independent Viewer timing audit — 2026-10-26

**The raw, source and oracle audit passed; the performance qualification did not.** All four engine original A/A screens and both migration original A/A screens failed. The observed candidate callback costs do not establish an adoptable advantage. The precise effect sizes and cause of the instability remain unresolved.

The engine session and migration session are independent experiments. In particular, pure-r186 Walking/grid-off CPU p50 was 0.472500 ms in the engine session and 0.990000 ms in the migration session. This unresolved regime change must not be pooled, subtracted into a migration or Rust effect, or explained as OS/JIT behavior without further evidence.

## Scope and method

Timing sums disjoint synchronous Viewer.animate and all three native dat.gui.updateDisplays bodies sharing a rAF timestamp. K=4 is frozen, including Lighting 1, Animation 14 and Morph Targets 9 ordered controllers. The GUI bodies, complete native animation/render work, public matrix reads and synchronous renderer handoff remain inside the measured boundary. Browser/compositor/GPU and asynchronous work are outside it; instrumentation overhead is uncalibrated. Native playback phases are not matched frame by frame across routes. CPU savings alone cannot establish FPS gains.

Each full run retains 600 warmup and 1,200 measured groups, plus its first arming group. Statistics interpolate at (n−1)q, then take the median of independent balanced-run quantiles: eight original runs, four JS/external and four Wasm/pure-r186 runs per case. Original bookends are used for A/A, not added to the balanced cost aggregate. Component quantiles need not add to the total quantile; the total is computed from the actual per-group sum. No fast, slow or unstable run is excluded.

## Completed capture accounting

| Suite | Runs | Measured groups | Including warmup | Arming rows | Oracle pages / poses | PNG files |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| engine-smoke | 24 | 720 | 960 | 96 | 24 / 42 | 84 |
| engine-full | 72 | 86,400 | 129,600 | 288 | 24 / 42 | 84 |
| migration-smoke | 12 | 360 | 480 | 48 | 12 / 18 | 36 |
| migration-full | 36 | 43,200 | 64,800 | 144 | 12 / 18 | 36 |

The two full groups retain 108 runs, 129,600 measured groups, 194,400 complete warmup/measured groups (777,600 ordinary callback rows) and 432 arming rows. Smoke is separate tooling evidence. The four original captures have no capture errors and unchanged clean sources; no failed primary run was removed.

## Original A/A and independent route-repeat screens

Original run medians are compared with the median of all ten original runs including bookends. Each block median is compared with its own run median using the shared tolerance max(5% × original scene median, 8 × largest original clock increment). Own-run block stability is separately computed from that run’s own median/clock. The four-repeat JS/Wasm screen uses that route’s own median/clock; it is not dedicated JS A/A or pre/post bookend calibration.

| Group / case / route | Run failures / runs | Block failures / blocks | Tolerance ms | Pass |
| --- | ---: | ---: | ---: | --- |
| engine / robot-static / original A/A | 1 / 10 | 4 / 40 | 0.040000 | False |
| engine / robot-static / prepared-js-r186 | 0 / 4 | 1 / 16 | 0.040000 | False |
| engine / robot-static / prepared-wasm-r186 | 0 / 4 | 4 / 16 | 0.040000 | False |
| engine / robot-walking / original A/A | 0 / 10 | 9 / 40 | 0.040000 | False |
| engine / robot-walking / prepared-js-r186 | 0 / 4 | 1 / 16 | 0.042062 | False |
| engine / robot-walking / prepared-wasm-r186 | 0 / 4 | 0 / 16 | 0.041625 | True |
| engine / robot-high-resolution / original A/A | 2 / 10 | 3 / 40 | 0.040000 | False |
| engine / robot-high-resolution / prepared-js-r186 | 0 / 4 | 5 / 16 | 0.041125 | False |
| engine / robot-high-resolution / prepared-wasm-r186 | 0 / 4 | 2 / 16 | 0.042375 | False |
| engine / robot-walking-grid-off / original A/A | 5 / 10 | 14 / 40 | 0.040000 | False |
| engine / robot-walking-grid-off / prepared-js-r186 | 4 / 4 | 6 / 16 | 0.040875 | False |
| engine / robot-walking-grid-off / prepared-wasm-r186 | 1 / 4 | 0 / 16 | 0.040250 | False |
| migration / robot-static / original A/A | 5 / 10 | 17 / 40 | 0.040000 | False |
| migration / robot-walking-grid-off / original A/A | 2 / 10 | 6 / 40 | 0.051625 | False |

Engine original A/A failures total 8/40 runs and 30/160 blocks; migration failures total 7/20 runs and 23/80 blocks. All four matched-JS repeat screens fail. Only the Walking/grid-on Wasm repeat screen passes; this does not repair the failed original or JS screen. Complete per-run and per-block checks, own-run stability and migration route repeat checks are preserved in [audit.json](audit.json).

## Absolute callback CPU

All cells below are p50 / p95 / p99 in milliseconds, medians of balanced-run quantiles. Full ranges and raw group durations remain in the audit and indexed payloads.

| Session / case | Route | Total CPU ms | Viewer.animate ms | GUI sum ms |
| --- | --- | ---: | ---: | ---: |
| engine / robot-static | pure-r186 | 0.457500 / 0.687625 / 1.290075 | 0.410000 / 0.632500 / 1.170075 | 0.045000 / 0.075000 / 0.132500 |
| engine / robot-static | prepared-js-r186 | 0.785000 / 1.072625 / 1.690150 | 0.742500 / 1.017500 / 1.610075 | 0.040000 / 0.062500 / 0.082500 |
| engine / robot-static | prepared-wasm-r186 | 0.775000 / 1.067500 / 1.640200 | 0.732500 / 1.012750 / 1.575150 | 0.040000 / 0.062500 / 0.082500 |
| engine / robot-walking | pure-r186 | 0.475000 / 0.722625 / 1.327650 | 0.427500 / 0.660125 / 1.215175 | 0.045000 / 0.077500 / 0.125025 |
| engine / robot-walking | prepared-js-r186 | 0.841250 / 1.147500 / 2.210175 | 0.792500 / 1.090000 / 2.132625 | 0.045000 / 0.067500 / 0.097525 |
| engine / robot-walking | prepared-wasm-r186 | 0.832500 / 1.087500 / 1.262625 | 0.786250 / 1.032625 / 1.207650 | 0.042500 / 0.065000 / 0.082500 |
| engine / robot-high-resolution | pure-r186 | 0.482500 / 0.695000 / 1.150500 | 0.435000 / 0.640000 / 1.045175 | 0.045000 / 0.075000 / 0.117500 |
| engine / robot-high-resolution | prepared-js-r186 | 0.822500 / 1.117625 / 2.115075 | 0.777500 / 1.067500 / 1.975550 | 0.045000 / 0.065000 / 0.095000 |
| engine / robot-high-resolution | prepared-wasm-r186 | 0.847500 / 1.115125 / 1.352850 | 0.800000 / 1.057875 / 1.297750 | 0.045000 / 0.065000 / 0.087525 |
| engine / robot-walking-grid-off | pure-r186 | 0.472500 / 0.907625 / 1.265075 | 0.425000 / 0.775250 / 1.137500 | 0.047500 / 0.127750 / 0.165025 |
| engine / robot-walking-grid-off | prepared-js-r186 | 0.817500 / 1.605000 / 2.247775 | 0.772500 / 1.507875 / 2.117675 | 0.045000 / 0.100000 / 0.145050 |
| engine / robot-walking-grid-off | prepared-wasm-r186 | 0.805000 / 1.107625 / 2.175075 | 0.758750 / 1.050250 / 2.077550 | 0.045000 / 0.070000 / 0.117500 |
| migration / robot-static | original-r176 | 0.610000 / 1.465250 / 1.572650 | 0.558750 / 1.325000 / 1.437500 | 0.057500 / 0.150000 / 0.177500 |
| migration / robot-static | external-r176 | 0.670000 / 1.347500 / 1.435050 | 0.607500 / 1.202625 / 1.300025 | 0.062500 / 0.142625 / 0.165000 |
| migration / robot-static | pure-r186 | 0.682500 / 1.305000 / 1.407600 | 0.616250 / 1.170000 / 1.265075 | 0.070000 / 0.140000 / 0.162525 |
| migration / robot-walking-grid-off | original-r176 | 1.045000 / 1.327625 / 1.422575 | 0.931250 / 1.185000 / 1.275050 | 0.105000 / 0.150000 / 0.180000 |
| migration / robot-walking-grid-off | external-r176 | 0.983750 / 1.287500 / 1.387550 | 0.878750 / 1.142500 / 1.240125 | 0.107500 / 0.155000 / 0.175050 |
| migration / robot-walking-grid-off | pure-r186 | 0.990000 / 1.267500 / 1.355075 | 0.872500 / 1.117750 / 1.202525 | 0.107500 / 0.155000 / 0.185025 |

## Frame-arrival intervals

These intervals are rAF/callback arrivals, not presentation completion or GPU timing. All cells are p50 / p95 / p99 milliseconds.

| Session / case | Route | rAF timestamp interval ms | Callback-start interval ms |
| --- | --- | ---: | ---: |
| engine / robot-static | pure-r186 | 8.335000 / 9.998250 / 10.317500 | 8.330000 / 10.086500 / 10.352700 |
| engine / robot-static | prepared-js-r186 | 8.335000 / 10.055500 / 10.320000 | 8.330000 / 10.122500 / 10.365050 |
| engine / robot-static | prepared-wasm-r186 | 8.335000 / 10.147500 / 10.320000 | 8.330000 / 10.170000 / 10.372550 |
| engine / robot-walking | pure-r186 | 8.335000 / 10.013250 / 10.322550 | 8.330000 / 10.115500 / 10.370000 |
| engine / robot-walking | prepared-js-r186 | 8.332500 / 10.097750 / 10.317500 | 8.330000 / 10.167750 / 10.372550 |
| engine / robot-walking | prepared-wasm-r186 | 8.335000 / 10.220250 / 10.325000 | 8.330000 / 10.225500 / 10.365050 |
| engine / robot-high-resolution | pure-r186 | 8.330000 / 10.057750 / 10.317500 | 8.330000 / 10.156000 / 10.365050 |
| engine / robot-high-resolution | prepared-js-r186 | 8.330000 / 9.990000 / 10.312500 | 8.330000 / 10.072500 / 10.350100 |
| engine / robot-high-resolution | prepared-wasm-r186 | 8.335000 / 10.010500 / 10.325000 | 8.330000 / 10.100750 / 10.360050 |
| engine / robot-walking-grid-off | pure-r186 | 8.335000 / 10.046750 / 10.317500 | 8.330000 / 10.105500 / 10.377550 |
| engine / robot-walking-grid-off | prepared-js-r186 | 8.332500 / 10.131000 / 10.322500 | 8.327500 / 10.230500 / 10.405100 |
| engine / robot-walking-grid-off | prepared-wasm-r186 | 8.330000 / 10.240500 / 10.320050 | 8.325000 / 10.260250 / 10.392550 |
| migration / robot-static | original-r176 | 8.335000 / 10.013000 / 10.317500 | 8.315000 / 10.220750 / 10.507950 |
| migration / robot-static | external-r176 | 8.330000 / 10.051750 / 10.312550 | 8.317500 / 10.183250 / 10.475200 |
| migration / robot-static | pure-r186 | 8.330000 / 10.127750 / 10.325000 | 8.315000 / 10.230000 / 10.465100 |
| migration / robot-walking-grid-off | original-r176 | 8.330000 / 10.177750 / 10.315050 | 8.317500 / 10.226250 / 10.450200 |
| migration / robot-walking-grid-off | external-r176 | 8.330000 / 10.065000 / 10.320000 | 8.317500 / 10.188250 / 10.445200 |
| migration / robot-walking-grid-off | pure-r186 | 8.330000 / 10.010000 / 10.312550 | 8.320000 / 10.180250 / 10.445100 |

## Absolute and relative differences

Each cell is p50 / p95 / p99 change in milliseconds (relative percent). Positive means more callback time. Comparisons are confined to their own session. These descriptive differences are not qualified speedup/regression estimates.

| Session / case | Contrast (actual minus reference) | CPU Δms (Δ%) |
| --- | --- | ---: |
| engine / robot-static | prepared-js-r186 − pure-r186 | 0.327500 (+71.58%) / 0.385000 (+55.99%) / 0.400075 (+31.01%) |
| engine / robot-static | prepared-wasm-r186 − pure-r186 | 0.317500 (+69.40%) / 0.379875 (+55.24%) / 0.350125 (+27.14%) |
| engine / robot-static | prepared-wasm-r186 − prepared-js-r186 | -0.010000 (-1.27%) / -0.005125 (-0.48%) / -0.049950 (-2.96%) |
| engine / robot-walking | prepared-js-r186 − pure-r186 | 0.366250 (+77.11%) / 0.424875 (+58.80%) / 0.882525 (+66.47%) |
| engine / robot-walking | prepared-wasm-r186 − pure-r186 | 0.357500 (+75.26%) / 0.364875 (+50.49%) / -0.065025 (-4.90%) |
| engine / robot-walking | prepared-wasm-r186 − prepared-js-r186 | -0.008750 (-1.04%) / -0.060000 (-5.23%) / -0.947550 (-42.87%) |
| engine / robot-high-resolution | prepared-js-r186 − pure-r186 | 0.340000 (+70.47%) / 0.422625 (+60.81%) / 0.964575 (+83.84%) |
| engine / robot-high-resolution | prepared-wasm-r186 − pure-r186 | 0.365000 (+75.65%) / 0.420125 (+60.45%) / 0.202350 (+17.59%) |
| engine / robot-high-resolution | prepared-wasm-r186 − prepared-js-r186 | 0.025000 (+3.04%) / -0.002500 (-0.22%) / -0.762225 (-36.04%) |
| engine / robot-walking-grid-off | prepared-js-r186 − pure-r186 | 0.345000 (+73.02%) / 0.697375 (+76.84%) / 0.982700 (+77.68%) |
| engine / robot-walking-grid-off | prepared-wasm-r186 − pure-r186 | 0.332500 (+70.37%) / 0.200000 (+22.04%) / 0.910000 (+71.93%) |
| engine / robot-walking-grid-off | prepared-wasm-r186 − prepared-js-r186 | -0.012500 (-1.53%) / -0.497375 (-30.99%) / -0.072700 (-3.23%) |
| migration / robot-static | external-r176 − original-r176 | 0.060000 (+9.84%) / -0.117750 (-8.04%) / -0.137600 (-8.75%) |
| migration / robot-static | pure-r186 − original-r176 | 0.072500 (+11.89%) / -0.160250 (-10.94%) / -0.165050 (-10.50%) |
| migration / robot-static | pure-r186 − external-r176 | 0.012500 (+1.87%) / -0.042500 (-3.15%) / -0.027450 (-1.91%) |
| migration / robot-walking-grid-off | external-r176 − original-r176 | -0.061250 (-5.86%) / -0.040125 (-3.02%) / -0.035025 (-2.46%) |
| migration / robot-walking-grid-off | pure-r186 − original-r176 | -0.055000 (-5.26%) / -0.060125 (-4.53%) / -0.067500 (-4.74%) |
| migration / robot-walking-grid-off | pure-r186 − external-r176 | 0.006250 (+0.64%) / -0.020000 (-1.55%) / -0.032475 (-2.34%) |

The direct external-r176→pure-r186 contrast controls externalized packaging within the migration session. It is still unstable and has finite version-related correctness differences. It is not a correction to apply to the separate engine experiment.

## Prospective adoption arithmetic

Walking/grid-on and Walking/grid-off are the target scenarios; static and higher resolution are controls. No target meets G1 (20% and 1 ms saving at p50 and p95 versus pure-r186), and none meets G2 (10% and 0.5 ms versus matched JS). In particular the grid-off Wasm p95 saving versus JS is 0.4973749954253437 ms, below 0.5 ms, with a failed JS repeat screen. No dedicated JS calibration or Rust advantage is established.

| Case | Route | G5 CPU p50 / p95 / p99 observed budget passes | rAF p95 / p99 | Callback start p95 / p99 |
| --- | --- | --- | --- | --- |
| robot-static | prepared-js-r186 | False / False / False | True / True | True / True |
| robot-static | prepared-wasm-r186 | False / False / False | True / True | True / True |
| robot-walking | prepared-js-r186 | False / False / False | True / True | True / True |
| robot-walking | prepared-wasm-r186 | False / False / True | True / True | True / True |
| robot-high-resolution | prepared-js-r186 | False / False / False | True / True | True / True |
| robot-high-resolution | prepared-wasm-r186 | False / False / False | True / True | True / True |
| robot-walking-grid-off | prepared-js-r186 | False / False / False | True / True | True / True |
| robot-walking-grid-off | prepared-wasm-r186 | False / False / False | True / True | True / True |

G5 allows max(5%, 0.2 ms); measured noise is not added to that allowance. The grid-off Wasm p95 increase is 0.20000000298023224 ms and therefore fails the exact raw arithmetic at the 0.2 ms boundary; this tiny boundary excess is not treated as a meaningful causal regression. The failed A/A keeps formal performance inference inconclusive. The finite observations and missing useful advantage support declining adoption of this tested path, without proving that the architecture or language cannot win elsewhere. The original scenes remain below the normally 5 ms CPU-heavy cohort.

## Work, phase, correctness and source evidence

All 144 full/smoke captures retain K=4 and valid complete callback groups. Every full group advances the main renderer once; axes advance once with grid on and zero with grid off. Native mixer/rAF and modulo action-phase checks include warmup; maximum full phase residual is 1.7763568394002505e-15 seconds. Captured state remains focused, visible and isolated with fixed quality/controller layout and no sample-phase activity.

All candidate full runs record zero preparedPasses and preparedWasmCalls. Grid-on and higher-resolution groups pay 2 fallback submissions, 68 public matrix reads and 8,704 materialized bytes per group; Wasm additionally records 22 calls. Grid-off pays 1 fallback, 62 reads and 7,936 bytes; Wasm records 15 calls. These synchronous costs remain paid inside the total callback path; the counters do not establish ownership promotion or an isolated cost attribution.

Each engine suite has 24 oracle pages / 42 poses and 341,880 ordered numerical reference comparisons, with maximum error 0 and identical strict image/semantic comparisons. Each migration suite has 12 pages / 18 poses and 145,944 reference values. Native-versus-instrumented comparisons are strict for every route (21 engine and 9 migration pose pairs per suite); all pass with equal PNG bytes. Original-r176 versus external-r176 remains strict. Pure-r186 versus r176 remains deliberately non-strict: preserved differences include image, layout and numerical outputs, with maximum numerical difference 8.145756254407388e-06. This is not candidate equivalence or a silent oracle exemption. Each full suite preserves its actual 84 engine / 36 migration PNG files.

The independent verifier checks captured JS/Wasm bytes against served/network hashes, exact HTML import-map transformation, prepared-manifest/output hashes, all full-file adaptation patches and adapted build inputs. It retains original/build dependency inventories, source maps, decoder/asset hashes, source integrity and errors. Native oracle captureSources is disabled, so those pages retain inventories and exact HTML rather than duplicate every executed source body. Existing build hashes do not independently certify source-to-binary compilation. PNG bytes/dimensions and stored raw-pixel SHA equality are verified; WebGL readback is not recreated offline.

## Preservation, failures and remaining gates

The archive retains 7,522 logical files in 935 content-addressed blobs (27,306,606 unique stored bytes; largest blob 1,054,343 bytes). Every source file has original, decoded-original, normalized-public and stored hashes. Only eight explicit runner power-output strings needed battery instance-ID normalization. Exact JSON token/type/value/sign/key/order invariance was checked; source/code/image bytes are unchanged. Deduplication removes duplicate storage only. All raw arming/warmup/measured arrays, preparation files, source inventories, maps, images, failures and MIT/CC0 notices remain recoverable.

There were no capture failures in these four suites. Archive build attempt 001 rejected a Path-order versus string-order listing comparison; identical file membership/content was confirmed, the comparison was corrected, and fresh archive 002 was built. Independent verifier attempts 001/002 exposed two incorrect verifier assumptions: dat.gui is transformed during build and retains its exact patch rather than a physical adapted source file; both r176 routes have null runtime metadata. These verifier assumptions were corrected to the captured tool contract; raw data and acceptance criteria did not change. All attempt logs/status records are retained with public hashes. The final verifier and 18 numeric plus 11 privacy/storage/oracle mutation tests pass.

Unperformed gates include a stable original baseline and dedicated matched-JS A/A/bookends; startup/first use/transfer/memory; 30-minute interaction; broader CPU-heavy content/behavior; and other hardware, browsers and dates. No new engine optimization, profiler cost claim, whole-browser speedup, FPS improvement or product ownership/progress promotion follows from this archive. See [README.md](README.md) for exact pins, hardware, commands and restoration.
