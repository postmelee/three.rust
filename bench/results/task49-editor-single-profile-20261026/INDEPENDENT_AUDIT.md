# Task #49 single-node Editor profile independent audit

The archive-local Python tools independently verified raw accounting, exact source binding, native state/counters, fixed-pose output and the preserved baseline comparison. No browser, build, application test or profiler was run for this audit. Raw input files were unchanged. This result verifies diagnostic evidence integrity, not an engine performance qualification.

## Scope and identity

Capture and analysis tool `e9b736a47f48bc2512476f8966d285d0153419f7` used candidate `85e2c5d500edb0b92ea4ecb997087fded3fed45b` and Editor `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`. The committed protocol bytes match both manifests and the exact Git blob. All thirteen manifest capture-tool hashes match their exact committed Git blobs in the local provenance check. These checks read Git only; public raw/source verification needs no checkout.

Full contains nine completed profiles and 684,661 samples; smoke contains three profiles and 38,037 samples. Each capture has six oracle pages and twelve fixed poses. Both manifests record errors `[]`, source integrity passed and identical clean source states before/after. Hardware renderer, focused/visible state, AC power and native scenario settings are preserved. There is no failed or invalid analysis attempt in this archive.

## Raw accounting and gaps

For all twelve profiles, `verify.py` checks the graph and node references, sums integer-microsecond timeDeltas by leaf, propagates inclusive values and verifies the root equals the weighted sample total. Per-node self/hit/inclusive values and source-coverage totals match valid analysis-001 within floating-point accumulation tolerance. It does not reuse the JS analyzer or remove any samples.

| Route | Round | Samples | Weighted sample ms | p50 / p95 / p99 gap, µs | Maximum gap, µs | Native render passes in endpoint window |
|---|---:|---:|---:|---|---:|---:|
| original | 0 | 75,490 | 12128.698 | 156 / 180 / 229 | 127,189 | 5,776 |
| prepared-js | 0 | 76,171 | 12132.396 | 155 / 174 / 216 | 131,409 | 5,780 |
| prepared-wasm | 0 | 76,178 | 12128.852 | 155 / 175 / 215 | 127,192 | 5,780 |
| prepared-js | 1 | 76,031 | 12125.119 | 155 / 175 / 219 | 123,391 | 5,780 |
| prepared-wasm | 1 | 75,631 | 12151.547 | 155 / 179 / 226 | 148,564 | 5,784 |
| original | 1 | 76,488 | 12130.118 | 155 / 173 / 201 | 126,574 | 5,776 |
| prepared-wasm | 2 | 76,760 | 12131.379 | 154 / 172 / 198 | 126,636 | 5,780 |
| original | 2 | 76,156 | 12127.674 | 155 / 174 / 206 | 124,198 | 5,780 |
| prepared-js | 2 | 75,756 | 12137.589 | 155 / 177 / 223 | 136,799 | 5,780 |

The requested interval was 100µs; actual full medians are 154–156µs. All nine maximum gaps, 123–149ms, occur at sample index zero and are attributed to `(program)`. The JSON records each location. They remain in every total. timeDelta weighting assigns elapsed gaps to a sample and is not an on-CPU cycle measurement. Profile lengths and weighted sample time are not callback CPU p50/p95/p99.

## Source binding

The audit validates 1,850 source/debug payload records, hashing 129,515,674 bytes across full and smoke runs. Captured sources match served/network hashes; debugger JS matches the source or exact inline HTML slice. Wasm debugger bytecode matches the served module. An independent Wasm name/export parser resolves module frames and retains unresolved transition stubs.

| Full route, three runs summed | Verified JS sampled ms | Verified Wasm sampled ms | Unresolved Wasm sampled ms | Native/unavailable-script sampled ms |
|---|---:|---:|---:|---:|
| original | 4265.982 | 0.000 | 0.000 | 32120.508 |
| prepared-js | 11080.762 | 0.000 | 0.000 | 25314.342 |
| prepared-wasm | 11423.384 | 80.725 | 8.907 | 24898.762 |

The unresolved Wasm names are `js-to-wasm:ii:i` and `js-to-wasm:iii:i`. Native/unavailable script weight includes program, idle, GC and other native frames. Neither unresolved category is silently dropped or attributed to an invented source. Subsystem labels remain a separate heuristic classification. `compare.py` checks every sampled candidate `updateSingle` node from facade-state.js retains `facade operation preparation` in all six full candidate runs.

## Native state and finite correctness

Every setup matches the preserved Task46 E3 root-selected shadow fingerprint. All oracle routes, with and without the passive observer, preserve the scene, camera, framing, selection, history, timeline, quality and four render-pass shapes. Each pose contains 7,833 finite ordered values. Five non-reference pages × two poses yield 78,330 non-self comparisons per capture, all with maximum absolute error zero. PNG bytes match exactly; independent PNG decoding reconstructs the reference WebGL pixel SHA.

`compare.py` additionally compares all twelve full fixed poses between baseline candidate `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb` and the new candidate: 93,996 ordered values, all exact, with identical PNG bytes, object/pass records, selection/history, quality and timeline. Configuration and rotated run order are identical. This comparison uses the earlier public archive directly. The Task46 reference comparison remains in that earlier audit; this audit does not reread Task46 images.

Warmup, before, sampled-window endpoints and after observations preserve focus/visibility, native Walking action, backend, viewport/quality, activity and autosave state. Mixer and action phase validate with maximum full error 5.1181281435219717e-14 seconds. These are endpoint checks, not every intervening pose.

Every candidate native frame still has four render submissions, all fallback. `preparedPasses`, `preparedWasmCalls` and `preparedMatrixReads` remain zero. Paid matrix materializations are 205 reads / 26,240 bytes per native frame, with 135 native calls for Wasm and zero for JS. All ratios match the earlier candidate. Full sampled-window endpoint brackets have 1,444–1,446 native frames; candidate brackets contain 296,225–296,430 matrix reads and 37,916,800–37,943,040 materialized bytes. Wasm call totals are 195,075–195,210. Endpoint windows are slightly wider than Profiler.start/stop and vary in frame count.

The matrix counter counts paid materialization, not every getter/cache hit. It is neither a duration nor a GPU-upload counter. Preserved hashes show core.js and scene_core.wasm unchanged between candidates; facade-state.js changes from `d759cdae29dac35b7e30711c16810dbad968625e461cdf5940cb0dc4388af12b` to `87e251fe1f40bb182cdea62092c58f3d622bccc40a4e77daaa728f1dec0066a2`.

## Verification and limits

The unchanged archive builder and Node verifier passed all original/public/stored hashes, complete source listings and numeric invariance. Only four battery instance strings were normalized. `verify.py` passed raw/source/native/oracle checks; `compare.py` passed baseline settings, output, counters and classifier checks. [independent-audit.json](independent-audit.json) and [comparison.json](comparison.json) retain their reproducible outputs. [README.md](README.md) records commands, pins and storage policy.

Sampler and passive-observer overhead is uncalibrated. Before/after cadence cannot calibrate overhead near the display scheduling ceiling. Only the native Editor shadow E3 route is covered; profiles do not establish whole-browser/compositor/GPU costs or displayed FPS. Captures are separate wall-clock windows, not frame-matched primary timing. Long sample gaps and unresolved native/Wasm frames limit attribution precision. Finite fixed-pose parity does not cover every app action. Historical A/A instability, other scenarios, Viewer candidate validation and additional dates/devices remain outside this archive. No ownership or performance-progress promotion follows from this audit.
