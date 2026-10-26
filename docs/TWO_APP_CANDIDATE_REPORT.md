# Two-app candidate investigation — Task #49

**Decline the tested candidate in Editor and Viewer, including the intact Bistro Viewer workload.** The tested Editor Robot/E3 candidate preserves its bounded correctness contract but does not demonstrate a useful CPU advantage. All three continuous original A/A groups fail their prospective stability rule, and observed candidate CPU costs exceed the original. The single-node preparation experiment has not established a performance benefit and is excluded from the final runtime, whose separate native app correctness checks pass. These results qualify neither a Three.js replacement nor a Rust default, and they make no FPS claim.

This is the Task #49 follow-up to the [historical Mac screen](MAC_APP_SCREEN.md). It preserves earlier datasets and their exact commits. Acceptance remains [adoption-v1](PRODUCT_GOALS.md); missing evidence does not pass. The finite app/content decisions and runtime disposition are recorded below; publication and CI are tracked in the [final task report](../mydocs/report/task_m6_49_report.md).

## Current decisions

| Scope | Evidence-backed status | Disposition or limit |
| --- | --- | --- |
| Native Editor Robot/E3, candidate85 | Bounded image/numeric/native-control correctness passed; completed CPU screen is unfavorable and fails continuous A/A. Do not adopt this tested path for performance on current evidence. | Final runtime excludes the unproven specialization; separate native correctness passes |
| `updateSingle` specialization | Semantic tests passed; diagnostic profiles establish no useful reduction. The timing screen measures the complete candidate path, not the specialization's isolated causal effect. | Excluded from integration; tests, immutable experiment and evidence preserved; no new-runtime speed claim |
| glTF Viewer Robot | Bounded interaction correctness passed; full callback/migration captures and independent audits are complete. No useful complete-path benefit is supported, and all original A/A screens fail. | Decline this tested path; do not infer a stable effect size or FPS change |
| Larger public content | Bistro Viewer has original covered callback p50 7.9075 ms, but no candidate advantage and failed original A/A. Editor Bistro import fails; Chess has bounded functional coverage and retained image/chooser uncertainty. | Decline the measured Bistro candidate; keep CPU/GPU limitation and broader compatibility unqualified |
| Product adoption | Not qualified; no ownership/progress promotion | Broader compatibility, useful CPU-heavy scenarios, startup/memory, sustained interaction, different devices/browser engines/days |

The historical research baseline `9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7` remains separate from `main` and from these app candidates. Its preserved Mac results are not recomputed, relabeled or replaced by this investigation.

## Immutable Editor evidence

| Record | Exact identity |
| --- | --- |
| Earlier candidate | `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb` |
| Single-node candidate | `85e2c5d500edb0b92ea4ecb997087fded3fed45b` |
| New Editor profile and timing tooling | `e9b736a47f48bc2512476f8966d285d0153419f7` |
| Original Editor / Three.js 0.186.1 | `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8` |
| Committed Editor protocol SHA-256 | `740288d46cbb0c783a536cc45363ddeef25a134c7f14b5eea25be91b47f1dad3` |
| RobotExpressive asset SHA-256 | `047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319` |

[Stage 1](../mydocs/working/task_m6_49_stage1.md) records the earlier candidate's native attribution and corrected source-aware analysis. [Stage 2](../mydocs/working/task_m6_49_stage2.md) records the selected change, locked installation/build/tests, independent review and new candidate correctness. The protocol and every served source/build/overlay hash are preserved with each capture; these measurements are not relabeled with the current `main` SHA.

| Evidence | Preserved scope |
| --- | --- |
| [Earlier native candidate profiles](../bench/results/task49-editor-profile-20261026/README.md) | Original/JS/Wasm diagnostic captures; initial invalid subsystem-classification attempt and corrected analysis remain separate |
| [Single-node candidate profiles](../bench/results/task49-editor-single-profile-20261026/README.md) | Nine full profiles / 684,661 samples plus three smoke profiles; exact source and Wasm attribution, original/observer oracles and old/new work comparison |
| [Single-node Editor correctness](../bench/results/task49-editor-single-correctness-20261026/README.md) | Six original/JS/Wasm check/UI datasets; 162 route-local checks; 72 cross-route comparisons |
| [Single-node Editor timing](../bench/results/task49-editor-single-timing-20261026/README.md) | Full 70-run screen / 68,640 measured callback pairs, plus separate 22-run smoke; complete warmup, arming, A/A, source, environment and oracle evidence |

The timing archive retains all 2,690 logical payloads in 530 shared content-addressed blobs. Deduplication changes storage only; original/public/stored hashes and complete logical paths remain. No fast, unstable or unfavorable run was selected out. Only explicit environment identifier strings were normalized; numerical evidence and source/image bytes remain unchanged. Each archive documents independent verification and reproducible commands.

## Conditions and measured boundary

The Editor full timing capture ran 2026-10-26T03:35:48.726Z–03:57:26.324Z on one MacBook Pro Mac16,8: Apple M4 Pro, 12 CPU / 16 GPU cores, 24 GB, macOS 26.5.2 build 25F84, Node 24.15.0. Headed Chrome 155.0.8059.86 ran from `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. Actual context/backend records report ANGLE Metal / Apple M4 Pro; a default SwiftShader-enable launch flag is not treated as use of SwiftShader. AC and `powermode 0` were recorded before/after. Internal display settings were 3024×1964 physical / 1512×982 logical at 120 Hz. These records do not establish exclusive OS scheduling or measured display scanout.

Native Editor E3 preserves root-selected Walking, precise bounds, helpers, timeline/signals, autosave and required renderer work. CSS viewport is 1280×720, page DPR1, native canvas 930×378, timeline content/outer height 306/307 and shadow map 1024. The three continuous cases use shadows, no shadows, and renderer DPR2 with otherwise unchanged layout/quality. The last is a higher-raster control, not a proven GPU-bound scene. Idle is a separate auxiliary control. Unsupported native unselected timeline playback is documented and was not manufactured by bypassing Editor selection/signals.

The full matrix uses four rotated original-A / matched-JS / original-B / Wasm orders and original pre/post bookends. Continuous windows have 600 warmup and 1200 measured pairs; idle has 120/240. At the observed cadence, 1200 samples span approximately ten seconds. One headed browser serves fresh contexts/pages per run. Profiling is separate from primary timing; no screenshots, GPU queries, build or stage timers enter the measured callback windows.

The CPU boundary is the sum of disjoint synchronous **Viewport.animate + Animation.updateTime** bodies. It includes their synchronous submission and JS/Wasm materialization, but excludes bookkeeping, other/vendor tasks, asynchronous storage completion, browser paint/compositor and GPU work. Instrumentation overhead is uncalibrated. Native playback remains wall-clock driven; dynamic poses are not frame-matched between routes. rAF and callback-start intervals are cadence observations, not display latency or proof of FPS changes.

## Editor CPU and stability result

The table shows medians of balanced per-run CPU p50 values. Positive differences mean more CPU. Original A/B supply eight runs per case; each candidate supplies four. Original bookends enter stability checks but not these effect medians. All differences are descriptive observations under failed A/A, not qualified effect estimates.

| Case | Three.js p50, ms | Matched JS p50, ms | Wasm p50, ms | Wasm − Three.js | Wasm − matched JS |
| --- | ---: | ---: | ---: | ---: | ---: |
| Shadow | 1.33000 | 2.70125 | 2.72500 | +1.39500 ms / +104.89% | +0.02375 ms / +0.88% |
| No shadow | 1.14000 | 2.74000 | 2.77000 | +1.63000 ms / +142.98% | +0.03000 ms / +1.09% |
| Higher resolution | 1.29125 | 2.93875 | 2.96750 | +1.67625 ms / +129.82% | +0.02875 ms / +0.98% |
| Idle | 0.01500 | 0.01500 | 0.01500 | Approximately zero; near timer floor | Approximately zero; near timer floor |

The [independent timing audit](../bench/results/task49-editor-single-timing-20261026/INDEPENDENT_AUDIT.md) supplies every p50/p95/p99 CPU and interval figure, absolute/relative comparisons, run ranges, per-round observations and independently recomputed adoption-v1 budgets. No historical cross-session difference is presented as the specialization's improvement or regression.

| Case | Original run failures | Original block failures | Original A/A |
| --- | ---: | ---: | --- |
| Shadow | 3/10 | 14/40 | Fail |
| No shadow | 1/10 | 3/40 | Fail |
| Higher resolution | 1/10 | 0/40 | Fail |
| Idle | 0/8 | 0/32 | Pass; auxiliary near-floor control |

Original run medians use the median of all original runs, including bookends, as their center. The shared scene tolerance is `max(5% × scene original median, 4 × scene clock increment)`; the scene increment is the largest observed minimum clock increment among original runs. Each block is centered on its own run median using this shared tolerance. Separate own-run block checks use that run's own 5%/clock tolerance. The original continuous totals are 5/30 run failures and 17/120 block failures. Their cause remains unresolved; no OS/JIT/power explanation is asserted.

The observed G1 savings versus Three.js and G2 independent Wasm savings versus matched JS are absent. Continuous candidate CPU p50/p95/p99 also exceed the observed G5 regression budget. Interval p95/p99 remain within their numerical allowance; this does not repair the CPU or stability gates. Even the fastest balanced candidate quantiles exceed the slowest balanced original quantiles, but those finite ranges are not confidence intervals. The evidence supports declining this tested Editor path while keeping the precise effect estimate unqualified.

Original p50 is only 1.14–1.33 ms, below adoption-v1's normal 5 ms CPU-heavy cohort target. This small scene cannot substitute for the missing larger-content headroom investigation. Startup/transfer, memory, 30-minute interaction and additional hardware/browser/day gates are not passed by these timing records.

## Correctness and retained work

The native check/UI audit compared 149,328 ordered numerical values, 32 image pairs and 40 semantic records across the three routes, with zero observed numerical difference and identical images. It covers picking, gizmo translate/rotate/scale, history/undo/redo, multi-selection, focus, synchronous matrix reads, visibility, shadows and timeline controls. Four native paused-clock comparisons retain the previously declared bounded exception; fixed scrub poses are strict. Generated scene UUIDs are preserved but are not equality oracles.

Each timing suite also passes 24 oracle pages / 42 fixed poses with exact image and zero-error numerical checks, including instrumented/off parity. All 54 full continuous phase validations pass; all 16 idle windows preserve zero rendering/counter activity. These finite checks do not establish complete Three.js compatibility or make native dynamic frames identical between routes.

Every continuous candidate window records **zero prepared renderer passes and four fallbacks per native callback pair**. Shadow/higher-resolution pairs perform 205 paid matrix materializations / 26,240 materialized bytes, with 135 Wasm calls; no-shadow performs 203 / 25,984 bytes and 133 calls. Matched JS makes no Wasm calls. The recorded materialization bytes are neither network traffic nor retained memory, and the counters do not measure every scalar proxy access or consumer. The experiment does not advance prepared-renderer ownership.

## Single-node preparation experiment

The source change specializes preparation of one local/selective update. It removes explicit generic collection constructions while retaining the same eligibility, public parent read, upload, operation fields, JS/Wasm evaluator, force/flag semantics and output materialization. It adds no cache, approximate bound, skipped renderer pass or Rust arithmetic change. Its semantic and app correctness tests passed; source-level removal of arrays/Maps alone does not establish allocation or CPU savings.

The [diagnostic result](../mydocs/tech/task_m6_49_single_node_profile.md) combines `facadeUpdate` and `updateSingle` exclusive samples **per run before taking medians**. Both remain in the operation-preparation category; moving work to a helper is not counted as elimination. Operation-preparation median sampled weights were 546.626→549.889 ms for JS and 548.097→598.624 ms for Wasm. Combined facade-function weights were 283.660→288.882 and 280.360→304.598 ms. Original active sampled weight also moved, from 1640.510 to 1741.649 ms.

Those values are elapsed-gap weights from separate approximately 12-second profiles, with uncalibrated overhead and different native frame counts. They establish no useful reduction, but cannot establish a causal patch regression. The new timing screen compares the complete candidate against original/matched JS; it does not isolate candidate6990 versus candidate85 in one balanced experiment. The proposed integration excludes only its 33 runtime lines in commit `c4781c79819ce1a3a279fba240851a03de5bc381`, retaining all 107 added semantic-test lines. The restored runtime source matches baseline6990; no useful benefit justifies maintaining the extra implementation path. This is not a proven regression fix or an unmeasured speedup claim. Frozen validation `96b0b4c0e7d55c22c1f2c22955356b9822e67d22` adds a separate native UI chooser rejection-handling fix; its new correctness checks and artifacts are recorded separately from runtime85 measurements.

The larger remaining Editor consumer is exact bounds/skinning and public-matrix consumption. Any follow-up must preserve precise geometry, morph/skin inputs, force/override behavior, callbacks and invalidation; renderer Float32 palettes are not automatically an exact substitute for the current computation. Profile data does not justify suppressing native UI features or rewriting Rust kernels first.

## Viewer integration and diagnostic attribution

The independent app is `donmccurdy/three-gltf-viewer` 1.5.1 at `b5ee5dafe27f953ae1b55f42b5fa3697fef08683`. Preserve its original bundled Three.js 0.176.0 distribution and lockfile. The four other routes share one externalized app bundle: external-r176, pure-r186.1, prepared-JS-r186.1 and prepared-Wasm-r186.1. Root/addon imports resolve to one selected core. The reviewed app adaptation awaits optional Wasm initialization before module evaluation, preserves ready-state startup, and uses the pinned local decoder base. It does not remove native controls, renderers, animation, morph targets, materials or loader features.

The [Viewer correctness archive](../bench/results/task49-viewer-correctness-20261026/README.md) retains all attempts, including failed reload/history gates and the separately corrected fixed-history protocol. Final five-route checks cover eleven native states with repeated fixed captures: clips/speed/play-all, morphs, orbit/dolly/pan and outside release, reset, grid/axes rendering, helpers/wireframe, Neutral/None environment, resize and reload. The final 33 required cross-route comparisons match exactly; eleven r176-to-r186 comparisons are separate migration observations. RoomEnvironment's version-dependent geometry and emissive panels remain unchanged. External Venice/Footprint HDR options remain available but unqualified; Robot alone does not validate compressed-asset decoding. Correctness004 used dirty tooling at Git base `e9b736a47f48bc2512476f8966d285d0153419f7`; its exact ten-file snapshot and four independently matched capture-critical hashes are retained.

[Repeated Viewer profiles](../bench/results/task49-viewer-profile-20261026/README.md) use runtime85. Full capture and analysis used clean tool `3d7453d5a509ac93212a31fd1cc2678e89d77c2b`; the separate smoke capture and analysis used clean tool `fbeb5b2a327e5ebd5eb5eebbaa09a453c5b1bdd4`. Thirty-six full profiles contain 2,728,100 samples, with 24 native/observer oracle pages. Twelve smoke profiles are stored separately and are not performance evidence. Each of four cases—static/grid-on, Walking/grid-on, Walking/DPR2/grid-on and Walking/grid-off—has three rotated route repeats, 600 warmup frames and approximately twelve seconds of sampling. The actual backend is hardware ANGLE Metal, with AC and unchanged source checks before/after.

All repeated candidate windows have zero prepared-pass deltas. Grid-on requires two renderer fallbacks, 68 paid matrix materializations / 8,704 bytes and 22 actual Wasm facade calls per main frame. Grid-off requires one fallback, 62 paid matrix materializations / 7,936 bytes and 15 Wasm calls. These are endpoint deltas per main renderer frame; the profiled observation brackets CDP start/stop and is wider than the exact sampled interval. Startup cumulative prepared counters are not evidence of prepared work during the sampled window. Matched JS has no Wasm calls.

The verified-source classifier places facade operation preparation at approximately 16.5–19.1% median per-run share of active sampled weight across three repeats. Active weighting excludes idle, program/native-unresolved and root pseudo-frames; the share is not a fraction of wall time. Verified Wasm functions account for only about 7–8 ms of sampled weight per twelve-second profile, while median preparation weights range about 149–171 ms. Neither is per-frame CPU or an additive upper bound on recoverable savings. Both candidate paths have higher active sampled weight than pure r186, but primary timing must decide their complete callback cost. The limited exact source-map resolution yields zero *verified dat.gui-family* self weight; this is a coverage limitation, not zero GUI cost. All unresolved/native/generated weights remain available.

The [prospective Viewer decision appendix](../mydocs/plans/task_m6_49_viewer_decision.md) fixes four engine scenarios (72 full runs) and two separate migration controls (36 full runs) before primary results. The covered boundary includes native `Viewer.animate` plus all three native dat.gui rAF bodies, with K=4 and an eight-clock-increment quantization floor. Original A/A, matched-JS repeat/block diagnostics and the separate conditional JS calibration requirement remain distinct. The [independent primary archive](../bench/results/task49-viewer-timing-20261026/README.md) now preserves all 108 full runs and 36 smoke runs, including source/preparation/overlay bytes and every callback row. Full engine capture ran 2026-10-26T05:06:56.484Z–05:26:05.250Z; the separate migration capture ran 05:29:14.697Z–05:38:43.797Z. Both used clean tool `42121c8ff9bc4e83a65991072a03d9514ce5823c` and runtime85. Independent source/oracle/raw arithmetic checks passed. All six original A/A screens failed.

## Viewer Robot primary decision

Decline adoption of the tested candidate for these Viewer scenarios: no useful same-version G1 advantage or independent Rust G2 advantage is established. The formal effect estimate remains inconclusive because original stability failed; this is not a causal proof that Rust or the single-node patch produces the observed excess.

The boundary sums synchronous `Viewer.animate` and the three frozen native GUI listening bodies at each rAF timestamp. CPU here means `performance.now()` elapsed callback duration, not thread CPU cycles or all browser work. Full runs retain 600 warmup and 1,200 measured groups plus arming rows. Four balanced rounds supply eight pure-r186, four matched-JS and four Wasm runs per case; original bookends enter only stability. The archive includes p50/p95/p99 component, total and interval tables, full ranges and absolute/relative comparisons. Component quantiles are not added together.

| Case | Pure r186 p50, ms | Matched JS p50, ms | Wasm p50, ms | Wasm − pure r186 | Wasm − matched JS |
| --- | ---: | ---: | ---: | ---: | ---: |
| Static/grid-on | 0.45750 | 0.78500 | 0.77500 | +0.31750 ms / +69.40% | −0.01000 ms / −1.27% |
| Walking/grid-on | 0.47500 | 0.84125 | 0.83250 | +0.35750 ms / +75.26% | −0.00875 ms / −1.04% |
| Walking/DPR2/grid-on | 0.48250 | 0.82250 | 0.84750 | +0.36500 ms / +75.65% | +0.02500 ms / +3.04% |
| Walking/grid-off | 0.47250 | 0.81750 | 0.80500 | +0.33250 ms / +70.37% | −0.01250 ms / −1.53% |

These are descriptive medians of balanced per-run p50s under failed A/A. G1 requires both 20% and 1 ms saving at p50/p95; G2 requires both 10% and 0.5 ms versus matched JS with its own stability evidence. Neither target passes. The apparent grid-off Wasm p95 saving versus JS is 0.497375 ms, below the absolute threshold, and the JS repeat screen fails. It is not grounds for a Rust recommendation or a relaxed target.

| Session / original case | Run failures | Block failures | A/A |
| --- | ---: | ---: | --- |
| Engine static/grid-on | 1/10 | 4/40 | Fail |
| Engine Walking/grid-on | 0/10 | 9/40 | Fail |
| Engine higher resolution | 2/10 | 3/40 | Fail |
| Engine Walking/grid-off | 5/10 | 14/40 | Fail |
| Migration static/grid-on | 5/10 | 17/40 | Fail |
| Migration Walking/grid-off | 2/10 | 6/40 | Fail |

Run centers use all ten original medians; block centers use their own run median. The shared scene tolerance is `max(5% × original scene median, 8 × largest observed original clock increment)`. All four matched-JS repeat/block screens also fail; these four-repeat screens are distinct from the unperformed dedicated JS A/A/bookend calibration. The one passing Wasm repeat screen does not repair the other baselines.

The G5 CPU allowances are exceeded at p50/p95 for both candidates in all engine cases; p99 passes only for Wasm Walking/grid-on. Exact raw arithmetic puts grid-off Wasm p95 approximately 2.98e-9 ms above its 0.2 ms allowance; this boundary rounding sensitivity is not a meaningful causal regression claim. rAF/callback interval tails remain within the numerical allowance, with rAF p50 around 8.33 ms. No FPS, GPU or presentation-latency improvement follows.

Migration is a separate experiment. Static original-r176/external-r176/pure-r186 p50 values are 0.61000/0.67000/0.68250 ms; Walking/grid-off values are 1.04500/0.98375/0.99000 ms. Packaging and version differences are preserved, including non-strict version image/layout/numerical changes. Pure-r186 Walking/grid-off itself changes from 0.47250 ms in the engine session to 0.99000 ms in the migration session. Its cause is unresolved. These sessions must not be pooled or subtracted to invent a Rust or version effect.

All full/smoke native-versus-instrumented oracles pass; migration r176-to-r186 comparisons remain explicitly non-strict. Candidate measured windows have zero prepared passes. Per-group averages from endpoint deltas retain grid-on two fallbacks, 68 paid matrix materializations / 8,704 bytes and 22 Wasm calls, or grid-off one fallback, 62 materializations / 7,936 bytes and 15 calls. These are window averages, not counters recorded on each callback row. Unfavorable complete-path cost, low original CPU headroom and missing adoption gates support declining this path while the larger-content investigation remains separate.

## Larger-content investigation

Original licensed files and notices are preserved locally with pinned download manifests; assets are not replicated or simplified to manufacture CPU load. [Content preparation](../bench/results/task49-content-preparation-20261026/README.md) records sources, files and validation. Node/vertex counts are selection priors, not evidence that a scene is CPU-bound.

| Content | Source pin and retained scope | Current limitation |
| --- | --- | --- |
| Bistro Exterior | `qian-o/GLTF-Assets@816a1d6533c55787b3fabc9b75660c0d0c57ebc6`; CC-BY-4.0 Amazon Lumberyard/ORCA plus conversion notices; 407 original files, 546,272,742 bytes, 1,297 nodes, 1,591 primitive instances, 405 KTX2 images and thirteen authored wind clips | All five Viewer native ZIP routes and required packaging/same-version fixed-image/numeric comparisons pass. Earlier strict HTTP failures remain. Viewer primary timing observes original callback p50 7.9075 ms, above the 5 ms cohort threshold, with failed A/A and no candidate advantage. Original Editor fails twelve texture imports |
| A Beautiful Game | `KhronosGroup/glTF-Sample-Assets@8f492390ddc7a2ae221a1369ef560589cf8c70fb`; CC-BY-4.0 SideFX/ASWF-MaterialX/conversion notices; 35 files, 29,805,749 bytes, 49 authored mesh instances, 33 JPEG images and transmission/volume materials | All five Viewer native ZIP route-local gates pass, but the cross-route image gate fails by four pixels. Fresh pure-r186 pages reproduce both hashes, so candidate causality is unestablished. Editor native-file-input correctness passes all three routes; OS chooser reliability and CPU headroom remain unqualified |
| Littlest Tokyo | Pinned Three.js asset, CC-BY-4.0 Glen Fox; 214 nodes, 71 mesh nodes, one 32-joint skin used by eight mesh nodes, and one 96-channel TRS clip | Validator reports 2,195 errors, including repeated timestamps/strides. Nonconforming stress input only; not a clean qualification asset, and not repaired here |

The source-association gate initially conflated internal GLTFLoader association indices with authored node/texture instances. The [preserved correction](../mydocs/working/task_m6_49_viewer_content_review.md) checks actual named node relationships, primitive/material/attribute counts and every material image/sampler/UV/transfer slot. It permits only source-equivalent aliases; missing features still fail. All initial failures remain. Bistro's default view also shows bright surface speckling in both original r176 and pure r186; source normal-map warnings are retained but do not establish its cause. Candidate image equality is not visual-fidelity certification.

The two transport diagnostics localize cancellation events to original FileLoader requests during initial load, before validator requests. A separate clean-tool `42121c8ff9bc4e83a65991072a03d9514ce5823c` probe reads the unchanged Chess BIN with native fetch and original FileLoader in four fresh-query trials. All four return 10,829,440 bytes with SHA-256 `727eea28752b2b0c35cad89e726f0bc6a1800c3fa8696867ccf3d0c39933f5fb` and completed network events. The whole-app cancellation is therefore not reproduced by a single sequential file read. This does not clear the failed full-app gates or establish a browser mechanism. Response-framing and interception diagnostics did not establish a reliable whole-app HTTP remedy. The separate supported native ZIP input now passes the five-route Bistro gate. Chess retains a strict cross-page image-stability failure reproduced by pure-r186 controls; no image tolerance is relaxed. See the [content review](../mydocs/working/task_m6_49_viewer_content_review.md) for exact ZIP/tool pins and retained failures. The later profile evidence below remains separate from these transport and image findings.

Both larger assets retain transmission materials, which the current prepared renderer explicitly excludes. Do not delete those materials to activate prepared coverage. Actual window counters and later complete-path costs must determine the bounded decision; a source eligibility check alone is not a performance result.

## Larger-content Editor outcome

The [Editor content archive](../bench/results/task49-editor-content-diagnostics-20261026/README.md) retains eight attempts and fifteen route records: ten pass, four fail and one remains `preparing` after an unhandled chooser timeout. It contains 2,513 logical files in 371 blobs, eleven fixed A/A pairs, 23,914 numerical comparisons and 22 PNGs verified against stored readPixels bytes. The original incomplete record remains incomplete; a separate execution sidecar reports terminal exit and subsequent process inspection without inventing missing cleanup or source-integrity evidence.

Chess initially produced different camera orientations in original and JS pages: 91,610 pixels and eleven camera-world-matrix values differed while all 2,142 scene values, projection, source/material relationships and quality matched. The saved setup endpoint, after selection and native focus, has different camera orientations; the divergence time remains unknown. Native focus preserves direction. Later optional camera/pointer diagnosis passed all three routes, with additional public matrix reads that can themselves materialize state. It does not establish why the original failure happened. A following diagnosis-off run passed original/JS but failed the Wasm OS chooser before import.

Clean tool `48f7a196ea635c50005f63376fdbffc02253bc2f` then passed original/JS/Wasm Chess correctness using the original hidden native file input's change handler, unchanged ZIP loader/dialog, AddObjectCommand, selection and focus. This is explicitly `input=native-file-input`, not a successful menu/OS chooser test. Images and ordered numerical state match; native static idle performs no render or mixer update. It is functional coverage, not a CPU-load measurement or proof that the initial camera cause was fixed.

Bistro failed in the original Editor twice, including that distinct native-input route. Both preserve twelve `ERR_BLOB_OUT_OF_MEMORY` texture requests. The second attempt’s saved readiness record has 393 of 405 expected image definitions ready; its strict readiness gate stops before playback. No degraded-texture scene is profiled. An independent first-clip harness error was repaired: native Editor already selects its first clip, so an extra label click deselected it. Browser playback after that repair remains unexercised for Bistro because texture readiness fails first. The original loader and ZIP library were not patched; the ZIP decoder copies stored entries, so a claim that every texture Blob wraps the entire ZIP is unsupported.

Classify Editor Bistro as unsupported under these recorded native import conditions, Chess as bounded functional coverage with unresolved chooser/camera diagnostics, and neither as a qualified high-CPU candidate. No large-content Editor primary timing or profile was run.

## Bistro Viewer diagnostic outcome

The first smoke attempt stopped at AC preflight before oracles or sampling. After AC was observed, the second smoke captured six oracles and three profiles using clean tool `d1def5a2b1845cb0a398bdb5d2528d0fbee69929`. Full engine capture used clean `7d4b24062466b15960fcf3e444fae99003c81f70`, runtime85 and the committed protocol SHA-256 `a3013f54fd18f846fa747cabfa897e2440de54903333b25de0fa8c6c8e6e5843`. It completed six oracles and nine profiles: three rotated repeats, 600 warmup frames, twelve seconds at requested 100µs sampling, and separate two-second observations. Native grid-off/DPR1, transmission materials, KTX2 textures and the first authored lantern clip remain. Lighting and Animation GUI loops retain one and thirteen listening controllers; no extra clips are activated to manufacture CPU load.

The [complete Bistro diagnostic archive](../bench/results/task49-bistro-profile-20261026/README.md) retains 1,990 logical files in 495 blobs, all fourteen raw profiles including incomplete attempts, 72 verified PNGs and 2,683,260 fixed numerical values. Three offline verifier runs, thirteen mutation tests and independent source/document review pass; evidence verification does not change the failed measurement outcomes.

All nine full profiles fail the predeclared time-weighted analyzer: 75 signed negative intervals occur among 803,950 raw samples, with a minimum of −4µs. The smoke JS profile also retains one −1µs interval. No intervals are clamped, discarded, reordered or silently assigned zero weight. The strict failures and partial smoke analysis remain. Official pinned [V8/CDP/DevTools source research](../mydocs/tech/task_m6_49_profile_time_order.md) shows that slightly out-of-order profile samples can be legitimate and that DevTools applies a different model. It does not establish the individual cause here or validate this experiment's declared incoming-gap weighting.

A separately named counts-only method, clean tool `b33cbb8d7cef1c92fdf475c9e12d830eb1ff7cd1`, retains every raw sample ID in its original order and counts each once. Independent Python verification reconciles all 803,950 exclusive/inclusive/category/context observations, source/debugger/served bytes, Wasm names/exports, 412 immutable input hashes and the existing nine strict failures. Counts are not CPU time, throughput, cycles or percentiles and cannot qualify adoption-v1 headroom or a speed comparison. AST labels were reviewed rather than independently reparsed; zero exact app-bundle source-map positions means zero Viewer/dat.gui family counts cannot establish zero UI work.

Median per-run shares of all observations place the nearest recognized renderer preparation/submission context at 45.35%/47.00%/45.86% for pure/JS/Wasm. Candidate facade operation-preparation leaves account for 9.70%/9.17%; matched-JS/verified-Wasm kernel leaves account for 0.51%/0.32%. Context and leaf shares overlap and must not be added. Raw totals differ across routes and are not a speed ranking. Prominent verified leaves include binding-state checks, program parameter/setup work, projectObject, renderObjects and renderBufferDirect. Native-looking unresolved names are not independently verified native costs.

Per main-renderer frame, endpoint counter deltas show one fallback, zero prepared passes/reads, **1,595 paid matrix materializations / 204,160 bytes**, and seven Wasm facade calls or zero for JS. Main draw state stays at 3,128 calls / 5,651,762 triangles. Endpoint windows are wider than exact sampling; materialized bytes are not retained memory or network traffic. This evidence prioritizes renderer state/submission and facade/public-matrix preparation for a future concrete change. It does not establish CPU-versus-GPU limitation, reusable prepared coverage, or useful savings. The separate [prospective callback screen](../mydocs/plans/task_m6_49_bistro_decision.md) below measures native elapsed callback headroom under its own image/numeric/A/A gates. The migration control is incomplete: six oracle pages pass, original-r176 round 0 is captured, and external-r176 round 0 saves its raw profile but fails the subsequent two-second observation because a keydown event appears. The failed post-window and unfinished source capture remain; no nine-run version comparison is claimed. Input activity is observed, but its source is not inferred. No replacement run was selected.

## Bistro Viewer primary decision

Decline the measured candidate for this intact authored workload. The independently verified full capture completed 2026-10-26T13:05:49.699Z–13:25:54.140Z at clean tool `58b7cdce62ab15f1507dd76255840f406cee6287`, runtime85, protocol SHA-256 `be967daa44d52689f9f82dbabe7f9e9d107abc3447bdda5ce1f5e1cae36a2651`. Native and timing preparations were produced by separate clean tool `96b0b4c0e7d55c22c1f2c22955356b9822e67d22`; their manifest hashes are `9f5c12a3f2e861f97f46eddd248f4f93aca7418652ed3c2fe9ecec128258a241` and `d47d942f06cba5994133c19085376ac58d5e8b74525000609aa856fe77db7ac0`. Preparation source identity is not the measured runtime identity.

The screen retains 18 runs, 21,600 measured groups, 32,400 including warmup and 54 arming rows. Each group contains K=3: native Viewer.animate plus Lighting and Animation GUI bodies. Four balanced rounds and pure-r186 pre/post bookends use 600 warmup/1200 measured groups and 300-group blocks. Native grid-off/DPR1, the first authored clip and all original material/texture work remain. The six-run smoke is separate tooling evidence. Six native/timed oracle pages compare twelve fixed poses, 894,420 ordered reference values and exact images, with zero observed numeric difference. Both smoke and full retain clean source/AC, strict ZIP/readiness/transport gates and no warmup/sample activity.

The [primary archive](../bench/results/task49-bistro-timing-20261026/README.md) preserves raw callback bodies, preparation/source bytes, environment, images and independent recomputation. The first independent smoke audit incorrectly equated 407 source asset files with 410 ZIP entries; its failure and source are retained. The corrected audit includes two notices and one provenance entry without changing any capture or input. The independent full audit verifies 1,094 unchanged input files. Evidence verification passes; performance qualification remains false.

| Route | CPU p50, ms | CPU p95, ms | CPU p99, ms |
| --- | ---: | ---: | ---: |
| Pure Three.js r186.1 | 7.90750 | 9.182625 | 9.945500 |
| Matched JS | 15.52625 | 17.041125 | 18.168475 |
| Rust-Wasm | 16.14000 | 17.838125 | 18.432800 |

These are medians of balanced per-run quantiles, not pooled frames. Wasm minus pure is +8.23250 ms / +104.11% at p50 and +8.65550 ms / +94.26% at p95; Wasm minus matched JS is +0.61375 ms / +3.95% and +0.79700 ms / +4.68%. They are descriptive observations under failed original/Wasm stability, not stable causal effects or an isolated effect of the single-node specialization. All original run p50s are at least 7.515 ms: this is a real larger **covered elapsed-callback** workload, not replicated Fox or a claim that the scene is CPU-bound. Driver stalls can contribute to elapsed render submission; GPU/CPU-time separation was not measured.

Original A/A uses `max(5% × 7.9075 ms, 6 × clock increment)`, yielding approximately 0.395375 ms. It fails **2/10 run medians**, while all **40/40 within-run blocks** pass. Matched-JS repeat/block checks pass (0/4 run and 0/16 block failures); Wasm fails one of four runs and no blocks. Matched-JS repeats remain distinct from unperformed dedicated JS A/A. The observed G1 and G2 savings are absent, and both candidates exceed G5 CPU p50/p95/p99 allowances. Original A/A failure keeps the precise performance comparison inconclusive; it does not supply adoption evidence or justify a rerun selected for stability.

| Route | rAF interval p50 / p95 / p99, ms | Callback-start interval p50 / p95 / p99, ms |
| --- | --- | --- |
| Pure r186.1 | 8.335 / 25.000 / 25.7164 | 8.3725 / 25.1235 / 26.95305 |
| Matched JS | 16.665 / 18.235 / 24.99015 | 15.715 / 17.2525 / 18.46605 |
| Rust-Wasm | 16.665 / 20.89825 / 25.04685 | 16.3275 / 18.05275 / 18.72570 |

Cadence distributions differ: a worse median can coexist with a lower tail quantile. Interval tails remain within their numerical G5 allowance versus pure r186, but neither this fact nor CPU timing establishes display FPS, input latency or improved frame pacing. All raw distributions and failed stability checks remain. No migration-session costs are subtracted from this engine matrix.

For every measured candidate window, endpoint deltas average zero prepared passes/reads, one fallback and 1,595 paid public matrix materializations / 204,160 materialized bytes per main-renderer frame. Wasm averages seven facade calls per frame; JS averages zero. These are window averages, not individually observed frame counters. Combined two-GUI-body p50 is approximately 0.020 ms for pure and 0.015 ms for both candidates; this is the frozen GUI-body scope, not all UI/browser work. It supplies no reason to prioritize a UI rewrite in this Bistro case. Retain renderer state/submission, facade operation preparation and exact public-matrix consumption as the next investigation; keep exact bounds/skinning prominent for Editor. Never multiply counts-only profile shares by these primary milliseconds to invent a subsystem time budget.

## Final runtime and native application verification

Clean validation SHA `96b0b4c0e7d55c22c1f2c22955356b9822e67d22` excludes the unproven specialization and retains five semantic regression tests. Its facade source SHA-256 is `d759cdae29dac35b7e30711c16810dbad968625e461cdf5940cb0dc4388af12b`; the 80,290-byte Wasm SHA-256 is `95f7aa7a807bd0bd4c9b45f0a855d2305c262cf5b7fef35a2d9dd9dfa889cdd9`. The final source matches the earlier generic runtime path, but these correctness checks are new observations, not relabeled historical measurements. No primary timing was performed on runtime96.

The [final integration archive](../bench/results/task49-final-integration-20261026/README.md) preserves separate native Editor check/UI captures for original, JS and Wasm, and five-route Viewer full checks. Actual headed Chrome/Metal, AC and source-integrity gates passed before/after. The independent Editor audit passes 162 route-local checks, 24 within-route fixed A/A pairs, 32 cross-route images, 40 cross-route semantic records and 149,328 numerical values with zero strict error. Four narrowly bounded paused-clock exceptions remain; fixed scrubs are strict. Native gizmos, focus, picking, history, light controls and timeline behavior remain exercised.

The independent Viewer audit passes 55 within-route A/A and all 33 required packaging/candidate comparisons across eleven states, validating 220 PNGs against their recorded readPixels hashes. Eleven upstream r176-to-r186 comparisons remain non-strict migration evidence: all eleven main images differ and nine have numeric differences, maximum `0.00006866455078125`. Version differences are not assigned to Rust. Editor audit SHA-256 is `3f420fda6a21818da9762eda0256a831cd96e0fbad07c98ce9977f76fc99c04a`; Viewer audit is `fb2efcfbe37d431a532247aaffb84271d582f89c906c68a1337df01b754c0992`.

These Robot/native-state checks do not clear the retained larger-content failures, certify all dynamic states or establish final-runtime performance. General headless/software browser regressions are recorded separately and are not Metal performance evidence. An initial timing test failed before the pinned Fox asset was available; the failure remains and the subsequent asset-backed rerun passes.

## Licenses and remaining qualification

Three.js Editor and glTF Viewer retain their upstream MIT notices. The Editor RobotExpressive asset is CC0 1.0, credited to Tomas Laulhe / Don McCurdy; the archived notices and source bytes remain. Its known upstream 752 weight-normalization errors and four skin-node warnings are not erased by the loader's separate runtime weight normalization. Additional-content licenses and notices are pinned; the bounded runtime/headroom decisions and unsupported paths are recorded above.

One Mac/date/browser and finite app oracles cannot satisfy all adoption-v1 gates. The finite decision is to withhold candidate adoption in both apps, retaining failed/inconclusive and unsupported scenarios. No new default backend, expanded ownership percentage or broad replacement claim follows. Exact publication-head CI and merge-tree equality are integration gates; the PR records their observed outcome separately from the immutable capture SHAs.
