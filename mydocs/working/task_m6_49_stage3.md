# Task #49 Stage 3 — Viewer and authored-content investigation

GitHub Issue: [#49](https://github.com/postmelee/three.rust/issues/49)
Implementation plan: [task_m6_49_impl.md](../plans/task_m6_49_impl.md)
Stage: 3
Status: **finite app/content attribution complete; broader compatibility and performance unqualified**

## Stage Purpose

Establish a second independent native application with reproducible original/version-control/candidate routes, preserved required behavior and source-aware CPU attribution. Investigate intact authored content as a second asset family without repeating models or removing features to manufacture a favorable workload. Robot Viewer correctness and diagnostic profiling are complete within their declared scope. Larger-content transport/readiness outcomes and bounded diagnostic classifications are recorded below. The incomplete migration attempt and complete independent archive review are retained. Stage 4 separately evaluates the additional prospective Bistro callback boundary; none of these Stage 3 findings qualify application adoption.

## Artifacts and Current Boundaries

| Artifact | Recorded result |
|---|---|
| `scripts/apps/viewer-adapter.mjs`, `viewer-prepare.mjs`, `viewer-browser.mjs` | Five explicit routes, shared externalized app bundle, exactly-once ready-state startup after initialization, pinned decoder/core/addon resolution and fresh-output/source-integrity guards |
| `viewer-oracle.mjs`, `viewer-check.mjs` | Dual-renderer, native UI, action/history, numerical/image and same-core identity checks; original failures retained |
| `bench/results/task49-viewer-correctness-20261026/` | Smoke001/002, correctness001–004, preparation001/002, exact tool snapshot004 and Node evidence; independent comparison and lossless archive audit passed |
| `viewer-profile.mjs`, `viewer-profile-analyze.mjs`, `viewer-profile-source-maps.mjs` | Uninstrumented native sampling, exact executed-source/Wasm binding, conservative prepared-map attribution and explicit unresolved coverage |
| `bench/results/task49-viewer-profile-20261026/` | Twelve smoke and thirty-six full profiles, their analyses and fixed oracles; staging and publication-path independent audits passed; Git-tracked support coverage was checked separately |
| `mydocs/plans/task_m6_49_viewer_protocol_robot-profile.json` | Committed diagnostic profile contract, distinct from primary timing bundle/protocol pins |
| `mydocs/plans/task_m6_49_viewer_decision.md` | Prospective bounded primary matrix, baseline-specific stability screens and unchanged adoption-v1 decision rules; no primary result claimed |
| `bench/results/task49-content-preparation-20261026/` | Three-content source/variant/license audit, acquisition hashes, original notices and unsuppressed source-validator findings |
| `viewer-content.mjs`, `viewer-content-check.mjs` and content/network review notes | Full-content allowlists and native feature/readiness contracts; failed HTTP attempts, native ZIP gates and explicit cross-page image limits |

The approved document locations remain `mydocs/tech/` for selection/source research, `mydocs/working/` for this stage record and `bench/results/` for public raw evidence. Product guidance and final adoption claims remain separate reviewed documentation. Historical input checkouts, runtime commits, original distributions and raw attempts are preserved.

## Integration Scope and Exact Inputs

Viewer is `donmccurdy/three-gltf-viewer@b5ee5dafe27f953ae1b55f42b5fa3697fef08683`. Its original source, Three.js `0.176.0`, Yarn lock and native generated distribution remain unchanged. Vite resolves to `6.4.2`. The five routes are original-r176, external-r176, pure-r186, prepared-js-r186 and prepared-wasm-r186. The externalized app bundle is common to the latter four routes; route-specific package/import resolution selects one core and its matching addons. Candidate effects compare against exact Three.js `0.186.1`, not the original r176 bundle. Original-versus-external r176 is packaging evidence; r176-versus-r186 is migration evidence.

The runtime is `85e2c5d500edb0b92ea4ecb997087fded3fed45b`, the frozen Stage 2 single-node candidate. Viewer integration does not add another engine optimization. Native loaders, validator, materials, GUI, stats, camera controls, main renderer and axes renderer remain. Shared adaptations handle initialization before dependent application modules, a ready-state-safe exactly-once app start, and pinned decoder base resolution. They do not synthesize DOMContentLoaded or patch global Three.js prototypes.

RobotExpressive remains the existing CC0 asset, 463,988 bytes, SHA256 `047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319`. Its source-validator findings remain visible. Runtime normalized weights and finite equality checks are not a source-asset repair.

Preparation outputs 001 and 002 have identical executable app/bootstrap JavaScript and CSS. Output 002 adds tool/source-map provenance, changing only recorded map source-path labels while preserving mappings, sourcesContent and all non-path payload. Preparation003 used for later clean profiles/content work retains the same two executable JavaScript files and CSS. Optional timing builds are distinct from native profile bundles; their browser parity is a separate gate rather than assumed from successful compilation.

## Completed Robot Correctness Evidence

Correctness004 passed all five routes and eleven fixed cases per route, each captured twice. It records 44 cross-route comparisons: eleven r176 packaging, eleven r176/r186 migration and twenty-two candidate comparisons. All **33 required packaging/candidate comparisons have zero numerical difference and identical fixed PNG bytes**. Migration differences remain separately recorded. The numeric policy stays `abs(actual-reference) <= 1e-10 + 1e-12*abs(reference)`.

Coverage includes manual morph, fixed play-all, matched-history stop/manual-morph, Walking with grid off/on/off, helpers/wireframe, None environment, Neutral background, resized dual-renderer layout and native reload. Native controls also exercise Dance/Walking selection, speed 0.5/0/1 with observed progress, play-all/stop, orbit, pointer release outside the canvas, subsequent button-free motion, wheel dolly, right-button pan and reset. Fixed poses are explicit correctness adaptations; natural wall-clock phases are not claimed equal across routes. Reload uses native `App.view()` after the initial file input has been removed, retaining clear/loader/validator behavior without claiming a second file-input operation.

Earlier attempts remain part of the result:

- **001 failed** because the harness tried to reuse the removed initial file input. Its completed cases and timeout remain.
- **002 failed** required manual-morph comparisons after uncontrolled play-all/stop history. The Wasm maximum absolute difference was `81.44153834957696`; packaging and matched-JS also differed. A common oracle state had not been established. The complete cause is unresolved, and the result is not excused as proven phase noise.
- **003 passed** a fresh-reload manual-morph oracle, which did not reproduce the earlier history.
- **004 passed** the added explicit matched mixer-history cases and all prior cases. No tolerance was relaxed and no asset was repaired.

The 004 capture used dirty tooling at Git base `e9b736a47f48bc2512476f8966d285d0153419f7`. It is not a clean primary capture. The exact ten-file tool snapshot remains, with four capture-critical files independently matched to the recorded hashes. The public correctness archive preserves 2,056 logical files in 646 blobs. Independent verification recomputed 171 within-route and 128 cross-route comparisons over all attempts, including 2,426,168 ordered numeric values, 684 PNG containers/dimensions and 415 executed-source hash bindings. Six archive-helper tests passed. All failures, actions, identities, source/network inventories and original-versus-public hashes are retained.

## Completed Native Robot Attribution

The smoke capture and analysis used clean tool `fbeb5b2a327e5ebd5eb5eebbaa09a453c5b1bdd4`; the full capture and analysis used clean tool `3d7453d5a509ac93212a31fd1cc2678e89d77c2b`. The runtime and app pins above stayed unchanged. Headed Chrome `155.0.8059.86` observed hardware ANGLE Metal / Apple M4 Pro, with AC/source-integrity checks before and after. Exact macOS, display, browser arguments, power and thermal metadata are retained in the archive.

The four cases are static/grid-on, Walking/grid-on, Walking/grid-on at renderer DPR2, and Walking with the native grid-off behavior. Page DPR1 and CSS 1280×720 remain fixed. Each full case has three rotated pure-r186/JS/Wasm repeats, 600 native warmup frames, requested twelve-second sampling at 100µs and separate two-second observations before/after. The app bundle is uninstrumented. Debugger/source retrieval and map acquisition occur after the sample window. Native GUI callbacks remain active, with uncalibrated profiler/passive-observer overhead.

All twelve smoke profiles (150,204 samples) and thirty-six full profiles (2,728,100 samples) completed; each capture has twenty-four native/observer fixed oracle sessions. The independent audit matched profile sample/tree/self/inclusive arithmetic, source/script/Wasm bindings, exact map positions/provenance, phase/window deltas and fixed numerical/action/render/layout/PNG evidence. The final publication-path rerun passed Node source-root verification, independent Python verification, seven tests and all 48 support hashes. A separate Git coverage audit found 34 ignored logs/license records across this and the Editor correctness archive; their original bytes were explicitly included in commit `ecf353ed9cfecdf7a0d2070ef7d84b769053b352`. An initial audit-helper error on a valid `parsed: null` CDP record is retained; it was repaired with a dedicated regression, and all seven audit tests subsequently passed. Capture and analysis bytes were not changed.

Diagnostic sampled weights are unfavorable to the candidate and do not establish a useful improvement. Every full repeat and all four endpoint windows retain zero prepared-pass deltas. Per main frame, grid-on has two renderer fallbacks, 68 paid matrix materializations (`matrixReads`) / 8,704 materialized bytes and 22 actual Wasm facade calls; grid-off has one fallback, 62 paid matrix materializations / 7,936 bytes and 15 Wasm calls. The counters are endpoint deltas per main renderer frame; the profiled observation brackets CDP start/stop and is wider than the exact sampled interval. Matched JS has zero Wasm calls; prepared-Wasm calls are zero on both shapes. Startup cumulative prepared counters are not steady-window adoption evidence.

The exact source-map audit retains 54 mapped profile nodes and 820 generated-node fallbacks without an exact segment across full runs. Zero self weight in the narrowly verified dat.gui family does **not** establish zero GUI cost. Generated/native/unresolved coverage and overlapping inclusive scopes remain explicit. These elapsed-gap sampled weights are not primary per-frame CPU quantiles, cycles, GPU timing, FPS or a proof of GPU limitation at higher resolution.

## Authored-Content Contracts and Retained Failures

Three independent source candidates were inspected without synthetic duplication. Exact variants, source metadata, notices, resource identities and validation reports are in the [content preparation archive](../../bench/results/task49-content-preparation-20261026/README.md) and [selection note](../tech/task_m6_49_content.md).

| Content | Frozen source / license | Current evidence boundary |
|---|---|---|
| Littlest Tokyo | Three.js `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`; 4,133,072-byte GLB; Glen Fox/glenatron, CC-BY-4.0 | Intact source and structural audit retained. 2,195 validator errors include duplicate animation times and forbidden stride fields. Compatibility stress only; no conformant-content qualification or completed app/headroom claim. |
| Bistro Exterior | `qian-o/GLTF-Assets@816a1d6533c55787b3fabc9b75660c0d0c57ebc6`; 407 referenced payloads / 546,272,742 bytes; Amazon Lumberyard/ORCA and conversion credits, CC-BY-4.0 | Source validator has zero errors but unsupported KTX2 coverage/warnings remain. All five Viewer native ZIP routes and required same-version comparisons pass; failed HTTP attempts remain. Original Editor native ZIP import records twelve texture Blob failures. CPU-ms headroom is unqualified; the later counts-only Viewer diagnosis is described below. |
| A Beautiful Game | `KhronosGroup/glTF-Sample-Assets@8f492390ddc7a2ae221a1369ef560589cf8c70fb`; 35 payloads / 29,805,749 bytes; original/MaterialX/Ed Mackey attribution, CC-BY-4.0 | Source validator has zero errors with tangent/target warnings. Initial native gate failed on overly strict internal association-index assumptions and also retained an aborted BIN request. Corrected source relationships and five Viewer ZIP route-local gates pass. Exact cross-route images fail by four pixels reproduced by fresh pure pages. Editor preserves an unresolved camera-state mismatch and OS chooser failures; its separate native-file-input three-route correctness passes. No headroom profile is claimed. |

All source geometry, materials, textures, authored clips and hierarchy remain. Bistro keeps transmission/specular content and thirteen authored wind clips; its native first-clip candidate is `1. Lantern_Wind_21|Take 001|BaseLayer`, duration `130.7916717529297` seconds, three TRS tracks on its authored target. Native play-all is functional coverage, not an implicit expanded primary workload. Chess keeps all authored piece instances, transparency/volume behavior, 43 texture definitions and their 33 source images; it has no authored clips. No synthetic animation or duplicated boards were added.

The failed Bistro001 attempt completed initial import, 405 decoded material images, thirteen clips, native autoplay/play-all, fresh reload and fixed poses in all five routes before each route's strict `net::ERR_ABORTED` gate failure. The earlier raw events lacked request IDs/timestamps sufficient to attribute the cancellation. The native `THREE.Cache` setting and repeated validator fetches are source facts, not a demonstrated cause. Independently comparing already completed fixed snapshots produced useful bounded equality evidence but did not convert the transport failure into a pass. Observed bright speckling in both original and r186 images also prevents treating route equality as visual-fidelity certification; no causal normal-map explanation or silent material correction is asserted.

Chess001 retained an aborted BIN request even without reload. Its internal parser association-number equality was not a valid object-preservation contract: r176 can share association objects for cloned mesh instances, and loaders can alias equivalent image/sampler textures. The corrected gate checks actual authored instances, hierarchy, primitives/material slots, attributes/index counts, static transforms, full image readiness, UV/sampler/transform and linear/sRGB transfer semantics. Raw association numbers and color-space identifiers remain. Neither meshes nor texture maps are removed to make that contract pass.

Passive request-ID/initiator/timestamp/status/cache/completion/cancellation diagnostics were prepared without overriding request/cache policy or fetching response bodies through CDP. The strict failure gate remains. The combined adapter/oracle/content/network tests passed 22/22 after the contract correction; later results are preserved in the [native content archive](../../bench/results/task49-native-content-correctness-20261026/README.md). The distinct native ZIP workflow passes Bistro in Viewer. Chess retains cross-page pure-r186 image instability; no candidate cause is established. Selected-content diagnosis is described below; strict weighted failures and unresolved headroom remain explicit.

## Additional native Editor checks

Clean tool `d1def5a2b1845cb0a398bdb5d2528d0fbee69929` and runtime85 preserve native ZIP File→Import (`asScene=false`), imported-root selection/focus and static idle. Chess correctness001 passes original-only; correctness002 repeats the exact original image and all 2,174 numerical values, then fails the JS cross-route gate. An independent audit finds 91,610 changed pixels (15.2014% of 602,640) and eleven changed camera-world-matrix values. All 2,142 scene values, projection matrix, source relationships, history and quality agree. The saved native-import endpoint follows selection, native focus and settling; it already has different directions, but the divergence time is unknown. Native focus does not set the quaternion. No candidate cause or input cause is established. Wasm was not reached in this failed attempt.

Original Editor Bistro correctness001 retains twelve `net::ERR_BLOB_OUT_OF_MEMORY` texture requests, 24 console errors and a later first-clip playback timeout. Source review found an independent harness error: native Editor already selects the first clip, so clicking its label again toggles it off. Tool `0fef6601aea862d156ea5e3104b506fd747c055d` removes that extra click, checks the native automatic selection, and validates loader/source readiness immediately after import. Its optional focus diagnosis records setup checkpoints and pointer/camera-change events without modifying native controls or render/mixer behavior. Extra matrix observations are explicitly diagnostic, not unobserved-path correctness or performance evidence. These changes do not erase the original texture failures.

The first prospective Viewer Bistro profile smoke stopped at AC-power preflight before any oracle or sample. It is retained separately. A power-condition failure is neither an application regression nor a performance observation. The later engine profile-specific oracles pass, but all nine strict weighted analyses fail; the separate counts-only diagnostic follows.

## Completed larger-content diagnostic boundaries

The [eight-attempt Editor archive](../../bench/results/task49-editor-content-diagnostics-20261026/README.md) preserves 15 route records (10 passed, 4 failed, 1 incomplete preparing), 11 fixed A/A pairs, 23,914 numerical comparisons, 22 PNG/readPixels checks and 33 focus checkpoints. Two offline verification runs, thirteen mutation tests and independent source/document review pass. Original incomplete focus-diagnostic001 remains `preparing`; its execution-owner sidecar does not invent missing finalization evidence.

Focus-diagnostic002 passes original/JS/Wasm under clean tool `500880cd21d5c7ce0ecd63d0d32d16dca55e10c7`, but its extra public matrix observations are diagnostic. The subsequent diagnosis-off correctness003 passes original/JS and fails Wasm before import at the OS chooser. Clean `48f7a196ea635c50005f63376fdbffc02253bc2f` then passes all three Chess routes through the original hidden native file-input change handler, loader/dialog, AddObjectCommand, selection/focus and static idle. This distinct input route does not validate the OS chooser or resolve the earlier camera cause. Under the same input route original Editor Bistro again fails twelve Blob texture requests, with only 393/405 images ready; strict readiness stops before timeline playback. No large-content Editor profile or primary timing was performed. The first-clip harness correction is unit/source verified but Bistro playback after the correction is unexercised.

Viewer Bistro engine full captures six fixed native/observer oracles and nine repeated uninstrumented profiles. Exact tool is `7d4b24062466b15960fcf3e444fae99003c81f70`, runtime85, committed protocol SHA-256 `a3013f54fd18f846fa747cabfa897e2440de54903333b25de0fa8c6c8e6e5843`. Three rotated repeats use 600 warmup frames and twelve-second sampling at 100µs, with native grid-off/DPR1, all source features, first authored lantern clip and two GUI loops (1/13 controllers). All nine strict weighted analyses fail: 75 negative signed intervals among 803,950 samples, minimum −4µs. Smoke retains one additional −1µs interval. Strict raw/analysis failures are never converted into passes.

The separately versioned counts-only analyzer at clean `b33cbb8d7cef1c92fdf475c9e12d830eb1ff7cd1` retains all original sample IDs/order and counts each occurrence once without time weighting. The independent Python audit verifies node/tree/category/context integer accounting, unchanged 412 input hashes, served/debugger/source bytes, Wasm name/export binding and linkage to all nine strict failures. It has no CPU-ms/quantile fields; context and leaf totals overlap. No exact app-bundle source-map positions resolve, so UI-family zero is missing attribution, not zero UI cost. AST-derived labels are reviewed rather than independently reparsed.

Repeated observations prioritize renderer state/submission and facade operation/public-matrix preparation. Median shares of all observations for renderer context are 45.35%/47.00%/45.86% (pure/JS/Wasm); preparation leaves are 9.70%/9.17% for candidates and kernel leaves only 0.51%/0.32%. These are not CPU-time shares or a route-speed comparison. Each candidate window retains one fallback, zero prepared passes/reads and 1,595 paid materializations / 204,160 bytes per main frame, with seven Wasm calls (JS zero). Recorded draw state is 3,128 calls / 5,651,762 triangles. No GPU-time or adoption-v1 ≥5ms CPU-headroom classification follows.

Official pinned [profile-ordering research](../tech/task_m6_49_profile_time_order.md) shows negative deltas alone do not imply corrupt CDP data, but does not clear the declared strict method or establish the individual cause. The selected counts-only method is supplementary. No sorted-timestamp replacement was implemented. The separate migration capture stops after six passing oracles, one captured original-r176 profile and one external-r176 raw profile. The latter fails its post-profile observation because a keydown appears; source capture is unfinished. This partial result is retained without a complete nine-run version comparison or a replacement run.

Chess grid-off profile is not run in this finite investigation. Its existing grid-on pure-page instability remains unqualified, and a different grid setting would neither repair that failure nor isolate the single-node specialization. Robot static/high-raster controls and intact Bistro observations remain available. Future changed scenarios require their own prospective protocol and correctness gate.

## Verification and Reproduction Record

Use the exact recorded tooling/runtime/preparation pins and fresh destinations. The completed Robot checks and profiles used these command shapes; full commands and raw evidence belong to their linked archives:

```sh
node scripts/apps/viewer-check.mjs "$APPS_ROOT" "$PREPARED_ROOT" "$FRESH_CHECK_ROOT" \
  mode=full runtimeRoot="$RUNTIME_ROOT" runtimeSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b
caffeinate -di node scripts/apps/viewer-profile.mjs "$APPS_ROOT" "$NATIVE_PREPARED_ROOT" \
  "$FRESH_OUT/task49-viewer-robot-profile-full-001" mode=full group=engine \
  runtimeRoot="$RUNTIME_ROOT" runtimeSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b \
  protocol=mydocs/plans/task_m6_49_viewer_protocol_robot-profile.json
node scripts/apps/viewer-profile-analyze.mjs "$CAPTURE_ROOT" "$FRESH_ANALYSIS_ROOT"
```

The full profile archive wrapper verified all original source bytes, and its independent Python audit passed in a fresh staging archive before publication-path copying. The publication-path verification subsequently passed with the scope recorded above; Git inclusion is a separate check from validating files present locally. No new build, test, asset acquisition or measurement was performed while drafting this stage record.

## Stage Boundary and Next-Stage Impact

- The finite transport/readiness investigation is complete with retained failures, not universal acceptance. Viewer Bistro native ZIP passes; Editor Bistro fails twelve textures; Chess Viewer image A/A and Editor chooser/camera diagnostics remain explicitly unresolved.
- The [Bistro profile archive](../../bench/results/task49-bistro-profile-20261026/README.md) preserves all twelve source directories, 1,990 logical files in 495 blobs and 536 physical files. It verifies fourteen raw profiles / 1,051,779 samples, 72 PNGs and 2,683,260 fixed numerical values. The engine nine and migration original one alone receive source-bound counts; external raw is structural inventory only. Three offline verifier runs, thirteen mutation tests and independent source/document review pass. Index SHA-256 is `f43ba38e8b2ae67430a78407d40d7a0720e1b114014e4bf1c756c4fbb642cb7d`; audit is `8eb656093e78a2e735dd817b438ff2094baaf9e108e63f4dcb055ded79e95b39`. Eleven metadata files normalize battery IDs or diagnostic home paths only, retaining original/public hashes and numerical/source evidence.
- Original migration r176 has 102,477 source-bound counted observations, with sixteen signed negative intervals and its retained strict failure. External r176 retains 95,025 raw observations but no completed source capture after its post-window keydown failure. Seven planned profiles were not attempted. No repeated migration comparison is available.
- Counts-only diagnosis does not determine CPU-ms headroom or CPU/GPU limitation. Stage 4's separately committed Bistro callback screen addresses the covered elapsed-time question without repairing or replacing CDP failures.
- Stage 5 retains final runtime correctness, publication/CI and preservation-aware cleanup. Broad external EXR, arbitrary compressed content, lifecycle/startup/memory, second-day/device/browser and complete compatibility gates remain open.

The finite Stage 3 investigation is complete with unsupported and inconclusive outcomes preserved. The approved continuation covers the next stage and final reporting; it adds no approval dependency. No original asset, native feature or acceptance threshold was altered to obtain a favorable verdict.
