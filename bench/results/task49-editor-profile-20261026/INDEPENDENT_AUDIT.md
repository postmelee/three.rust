# Task 49 Editor profile independent raw audit

Independent Python audit completed on 2026-10-26. Only local recorded files were read; no browser, build, profiler or application test was run. Raw input files were unchanged. The archive-local `verify.py` independently repeats raw accounting, source binding, native windows and fixed-pose parity without original checkouts. `independent-audit.json` retains the completed local historical cross-check; `task46-setup-fingerprint.json` records its bounded setup reference.

## Result

Raw capture structure, source bytes, sample accounting, native state/counters and fixed-image/numeric evidence passed the independent checks described below. This verifies diagnostic evidence integrity; it does not qualify a stable speedup, whole-browser CPU reduction, FPS or GPU result.

- Tooling: `489736e4549083a199babfeea0d6104cf2d45904`; candidate: `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb`.
- Editor: `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`; Viewer remains the unchanged original `b5ee5dafe27f953ae1b55f42b5fa3697fef08683` and is not a candidate result.
- Full: 9 completed profiles, 685,735 samples, 6 oracle pages / 12 fixed poses, zero recorded capture/serving errors. Smoke: 3 profiles, 38,164 samples, 6 oracle pages / 12 poses; smoke is not performance evidence.
- Both manifests record equal clean source states before/after and AC power; all 11 capture-tool hashes per manifest independently match the exact committed Git blobs. All inspected setup GPU records identify hardware ANGLE Metal / Apple M4 Pro, not SwiftShader.
- Chrome 155.0.8059.86, headed, isolated clock, page DPR1, renderer DPR1, 1280×720 page and 930×378 canvas; scene shadows and native autosave remain enabled.

**Analysis-001 subsystem categories are invalid.** The separate code review found that the candidate URL prefix `__rthree` accidentally matched the automation classifier. This audit uses its per-node self/inclusive sums and source-coverage arithmetic only, not its categories, active percentages or cost ranking. The raw profile samples and exact source binding remain valid. Corrected analysis-002 is now included and its raw self/inclusive/coverage arithmetic also passes archive-local verify.py; retain analysis-001 as failed derived evidence.

## Independent raw accounting

For every full and smoke profile, Python independently validates the profile tree and sample node references, sums integer-microsecond timeDeltas by leaf, propagates inclusive values through the tree, and checks the root equals the sample total. These independently computed per-node self times/hits, inclusive times and source-coverage totals match the available analysis-001 records within floating-point accumulation tolerance. No samples or long gaps were removed.

| Route | Round | Samples | Weighted sample ms | p50 / p95 / p99 gap, µs | Maximum gap, µs | Native render passes in endpoint window |
|---|---:|---:|---:|---|---:|---:|
| original | 0 | 75,943 | 12124.602 | 155 / 177 / 213 | 123,543 | 5,776 |
| prepared-js | 0 | 76,311 | 12134.099 | 155 / 173 / 206 | 132,787 | 5,776 |
| prepared-wasm | 0 | 76,377 | 12131.615 | 155 / 173 / 207 | 130,456 | 5,780 |
| prepared-js | 1 | 76,377 | 12139.177 | 155 / 172 / 204 | 134,410 | 5,780 |
| prepared-wasm | 1 | 76,338 | 12133.912 | 155 / 173 / 205 | 131,780 | 5,776 |
| original | 1 | 75,911 | 12126.254 | 156 / 178 / 215 | 123,367 | 5,776 |
| prepared-wasm | 2 | 76,262 | 12132.392 | 155 / 173 / 208 | 129,738 | 5,780 |
| original | 2 | 75,875 | 12126.535 | 156 / 178 / 214 | 124,282 | 5,776 |
| prepared-js | 2 | 76,341 | 12130.112 | 155 / 173 / 205 | 128,624 | 5,780 |

Actual median sample gaps are 155–156µs despite a requested 100µs interval. Maximum gaps are 123–134ms. All nine maximum gaps are the first sample, attributed to `(program)`. They are retained and individually located in the JSON audit; timeDelta weighting attributes elapsed gaps to a sample and is not a measurement of on-CPU cycles. Neither weighted totals nor their route differences are primary callback CPU measurements.

## Source identity and coverage

Validated 1,854 source/debug payload records across the 12 full/smoke runs, hashing 129,527,638 bytes. Each archived source matches its declared SHA256/size and independent serving or mirrored-network manifest. Debugger JS bytes match the served source (or exact inline HTML slice). Wasm debugger bytecode matches an archived served module; an independent Wasm custom-name/export parser verifies exact named/indexed frames. Unknown native scripts and transition stubs are retained unresolved. No local app checkout is used to invent a missing profiler script binding.

| Full route, three runs summed | Verified JS sampled ms | Verified Wasm sampled ms | Unresolved Wasm sampled ms | Native/unavailable-script sampled ms |
|---|---:|---:|---:|---:|
| original | 4100.562 | 0.000 | 0.000 | 32276.829 |
| prepared-js | 11040.043 | 0.000 | 0.000 | 25363.345 |
| prepared-wasm | 11154.994 | 79.406 | 7.143 | 25156.376 |

The unresolved Wasm frames are `js-to-wasm:ii:i` and `js-to-wasm:iii:i`, whose transition names do not identify a Rust module function. Native/unavailable scripts also include idle/program/GC and other native frames; their elapsed weight must not be described as missing app JavaScript or excluded silently. Source verification establishes origin, while subsystem labels remain a separate heuristic classification.

## Native scenario and correctness

- Every run and oracle setup matches the preserved Task46 E3-root-selected-shadow fingerprint: 4 skins, 3 morph meshes, 14 clips, 7,214 vertices, camera [5,3.5,7], exact framing target, shadow map 1024, timeline outer/content 307/306 and identical canvas/quality settings.
- Compared the two new original fixed poses directly with the two Task46 original-unmodified poses. Ordered numeric arrays, objects, passes, selection, history, quality, timeline, raw-pixel SHA and PNG bytes are exactly equal. Only one historical setup plus two JSON/PNG pairs were read; no old timing samples were rescanned.
- For each capture, all 12 poses contain 7,833 finite numbers. All five non-reference pages × two poses match the original reference with max absolute numeric error 0 (78,330 non-self comparisons per capture). Both reference PNGs were independently decoded with Python/zlib, scanline filters reversed and rows inverted, reproducing the recorded WebGL raw-pixel hashes. Every other PNG is byte-identical to its reference.
- Oracle pass shapes preserve four submissions with (calls, triangles, lines) of (39,6476,0), (2,0,76), (20,224,223), (9,72,0). Each candidate submission records one fallback and zero prepared passes; main skin/morph and helper-line exclusions remain represented.
- Warmup and all three observation-window types were independently checked for focused/visible state, unchanged viewport/quality, no new recorded activity or autosave transition, selected native Walking action, correct backend, positive native render work and consistent mixer/action phase. Maximum full endpoint phase error is below 4.85e-14 seconds. This is endpoint validation, not per-frame pose equivalence.

## Paid reads and fallback

All candidate windows satisfy the same ratios as Task46: four render submissions per native frame, all four use fallback; preparedPasses, preparedWasmCalls and preparedMatrixReads remain zero. Per native frame, matrixReads=205 and materializedBytes=26,240. prepared-Wasm performs 135 recorded native calls per native frame; prepared-JS performs 0. Full sampled-window endpoint brackets contain 1,444–1,445 native frames, with candidate matrixReads 296,020–296,225 and materializedBytes 37,890,560–37,916,800. Wasm native calls are 194,940–195,075 per bracket. These endpoint windows are slightly wider than Profiler.start/stop.

The matrix counter records paid materialization, not every public getter/cache hit. It is not a timer, memory-bandwidth measurement or GPU-upload counter. Verified Rust sample weight is small in these profiles, but neither that fact nor fallback counts alone predict an optimization saving. The corrected JS consumer ranking and separate app evidence are needed before selecting the next change.

## Limits

- Sampler/passive-observer overhead is uncalibrated; before/after cadence cannot calibrate it, especially near a 120 Hz scheduling ceiling. No sampler overhead is subtracted.
- Only the native Editor shadow E3 scenario is profiled here. There is no Viewer candidate result, no no-shadow/high-resolution timing qualification and no fresh A/A stability resolution.
- Profiles cover a page main-thread diagnostic sampler, including unresolved native/idle categories; they do not represent whole-browser CPU, compositor/GPU work or displayed FPS.
- Actual full run duration is about 12.13 s per profile. Sampling gaps and unresolved sources limit precision. The three route orders are rotated, but this does not repair historical A/A instability.
- Fixed poses validate finite correctness and source/feature preservation. Endpoint playback checks cannot prove every intervening pose or event path.
- No evidence in this audit changes the prior negative/unstable adoption verdict or authorizes ownership/progress promotion.
