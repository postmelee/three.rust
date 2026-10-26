# Task #49 Stage 4 — complete-path application comparison

GitHub Issue: [#49](https://github.com/postmelee/three.rust/issues/49)
Implementation plan: [task_m6_49_impl.md](../plans/task_m6_49_impl.md)
Stage: 4
Status: **finite primary captures, public archives and independent audits complete; performance unqualified**

## Stage Purpose

Compare the frozen candidate's complete declared native callback paths against upstream Three.js and matched JS, preserving behavior, quality, raw samples, A/A controls and failures. Distinguish architecture effects, the incremental Wasm effect, and Viewer packaging/version migration. Apply the prospective adoption-v1 budgets without changing them after observing costs.

The Editor matrix and both separate Viewer matrices are complete. Independent raw/source/oracle/archive audits passed. All continuous Editor and all Viewer original A/A screens failed, so precise effect sizes remain unqualified. This report records completed finite evidence; it does not establish adoption, resolve the baseline regime, or replace final integration review.

## Artifacts

| File or capture | Change Summary / Current Status |
| --- | --- |
| `mydocs/plans/task_m6_49_editor_protocol.json` | Frozen Editor candidate and native callback settings; used by completed smoke/full captures |
| `bench/results/task49-editor-single-timing-20261026/` | Completed Editor raw evidence, independent arithmetic, preservation/privacy/storage checks and complete CPU/interval tables |
| `mydocs/plans/task_m6_49_viewer_decision.md` | Prospective four-case engine/two-case migration matrix; original A/A, matched-JS repeat screen and adoption-v1 decision rules |
| `mydocs/plans/task_m6_49_viewer_protocol_robot-timing.json` | Committed native/instrumented source, asset and K=4 controller pins for four engine cases |
| `mydocs/plans/task_m6_49_viewer_protocol_migration-timing.json` | Committed separate two-case migration protocol, including original-r176 instrumented packaging control |
| `work/task49-viewer-robot-timing-smoke-001` | Independently verified 24 oracle pages / 42 poses and 24 runs / 720 measured groups |
| `work/task49-viewer-robot-timing-full-001` | Independently verified 72 runs / 86,400 measured groups; all four original A/A screens fail |
| `work/task49-viewer-migration-timing-{smoke,full}-001` | Independently verified 12 smoke / 36 full runs; both full original A/A screens fail |
| `bench/results/task49-viewer-timing-20261026/` | Complete lossless archive, independent raw/source/oracle checks, 18 numeric and 11 privacy/storage/oracle tests |
| `docs/TWO_APP_CANDIDATE_REPORT.md` | Integration owner reconciles the final two-app findings, content failures and runtime disposition |

## Body Change Scope / Lossless Preservation

The measured runtime is `85e2c5d500edb0b92ea4ecb997087fded3fed45b`. The earlier `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb` candidate, historical baseline `9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7`, all prior raw data and source commits remain intact. These app matrices do not isolate a causal old-versus-new effect for `updateSingle`; profile attribution and primary callback timing remain separate.

Editor capture tooling was `e9b736a47f48bc2512476f8966d285d0153419f7`, with Editor `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8` / Three.js 0.186.1. All four Viewer smoke/full engine/migration captures use tooling `42121c8ff9bc4e83a65991072a03d9514ce5823c` and Viewer `b5ee5dafe27f953ae1b55f42b5fa3697fef08683`. The engine and migration matrices were captured in distinct sessions at this same exact tooling pin. Native/instrumented prepared manifests, protocol bytes and source/build hashes remain separate from runtime Git identity.

The Editor archive preserves 2,690 logical payloads in 530 shared content-addressed blobs: 10,736,200 unique stored bytes, with unchanged original/public/stored hash mappings and logical ordering. Original, warmup, arming, measured, unstable and unavailable records are all retained. Six metadata payloads required battery-instance string normalization in explicit power-output fields; numeric tokens/types/values/signs were verified unchanged. The index SHA-256 is `f41ef3b87bcc32a929a8672035b30166e025ff369c558997559ca7e656500897`. Deduplication copied stored bytes without recompression or sample selection. The initial local archive and original work captures remain untouched.

Viewer preservation completed with 7,522 logical files in 935 content-addressed blobs, 27,306,606 unique stored bytes and a 1,054,343-byte maximum blob. The index SHA-256 is `821a66a03bea084219f4c29e006207b8d3a21e27fe6a95353d7b3aa84bed70cc`; independent audit SHA-256 is `3a27432d294efdd879239de313df9ce7c0c22ce4568c4f3a5664360d9c7590ef`. All four raw capture trees, three preparation trees, complete source patches/maps, protocols, images, errors, environment and MIT/CC0 notices are retained. Eight explicit runner power strings required battery-instance redaction; all numeric tokens/types/values/signs/key order were unchanged. Public-copy byte equality and full verification passed.

The initial archive attempt rejected a Path-component versus string-order listing check; file membership/hashes were unchanged, and a fresh archive was built after correcting the check. Two independent verifier attempts exposed incorrect assumptions about dat.gui's build-time source transform and null runtime metadata on both r176 routes. Their logs and the failed builder's partial index/status are retained. These were offline tooling failures, not discarded capture runs. No source measurement or prospective acceptance rule changed.

## Verification Results

### Completed Editor capture and independent audit

Executed capture invocations, with local checkout paths represented by variables:

```bash
caffeinate -di node scripts/apps/timing.mjs "$APPS_ROOT" work/task49-editor-single-timing-smoke-001 mode=smoke candidateRoot="$SINGLE_ROOT" candidateSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b protocol=mydocs/plans/task_m6_49_editor_protocol.json
caffeinate -di node scripts/apps/timing.mjs "$APPS_ROOT" work/task49-editor-single-timing-full-001 mode=full candidateRoot="$SINGLE_ROOT" candidateSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b protocol=mydocs/plans/task_m6_49_editor_protocol.json
```

- Full capture completed at 2026-10-26T03:57:26.324Z, retaining **70 runs: 54 continuous and 16 idle; 68,640 measured pairs; 102,960 complete pairs including warmup; 140 arming rows**. Smoke separately retains 22 runs / 660 measured pairs. Capture errors are empty; clean source identity and AC before/after passed.
- Each suite passed 24 oracle pages / 42 fixed poses. The independent audit observed zero numerical difference and exact pixel/PNG parity, including native-versus-instrumented comparisons. All full continuous phase checks passed, and all idle windows retained zero rendering/counter activity. Separate Stage 2 native interaction coverage remains unchanged.
- Host conditions were Apple M4 Pro, macOS 26.5.2 build 25F84, headed Chrome 155.0.8059.86, actual ANGLE Metal / Apple M4 Pro, AC power mode 0 and reported internal 120 Hz display. Browser launch path, arguments, source/quality settings and the boundary limitations are in the [archive](../../bench/results/task49-editor-single-timing-20261026/README.md).
- The CPU boundary is the sum of disjoint synchronous Viewport.animate and Animation.updateTime bodies. Dynamic phases are not frame-matched; envelope/collector overhead is uncalibrated. Browser paint/compositor/GPU and other asynchronous work are outside this CPU boundary.

Independent offline commands passed:

```bash
python3 bench/results/task49-editor-single-timing-20261026/verify.py
python3 bench/results/task49-editor-single-timing-20261026/test-verifier.py
python3 bench/results/task49-editor-single-timing-20261026/test-archive.py
python3 bench/results/task49-editor-single-timing-20261026/test-storage.py
```

The standard-library verifier independently reconstructs all callback pairs, quantiles, phase/frame work, original bookends, blocks/A/A, comparisons, source patches and oracles. Seven mutation cases, four privacy-preservation tests and five storage-resolution tests passed. Full public-copy verification and byte-preserving storage conversion checks passed. These data-integrity results do not make the performance screen pass.

All three continuous Editor original A/A groups failed: shadow **3/10 runs and 14/40 blocks**, no-shadow **1/10 and 3/40**, higher-resolution **1/10 and 0/40**. The total is **5/30 original run failures and 17/120 original block failures**. Idle passed its auxiliary near-floor screen. Original run centers use all-original median including bookends; block centers use each block's own run median with the shared scene tolerance. Own-run block stability is separately calculated using that run's own median/clock.

Observed balanced CPU p50 medians in milliseconds are:

| Editor case | Three.js | Matched JS | Wasm |
| --- | ---: | ---: | ---: |
| Shadow | 1.33000 | 2.70125 | 2.72500 |
| No shadow | 1.14000 | 2.74000 | 2.77000 |
| Higher resolution | 1.29125 | 2.93875 | 2.96750 |
| Idle | 0.01500 | 0.01500 | 0.01500 |

All CPU p50/p95/p99, rAF/callback-start intervals, absolute and relative differences, complete ranges and adoption-v1 arithmetic are in the [independent audit](../../bench/results/task49-editor-single-timing-20261026/INDEPENDENT_AUDIT.md). Observed G1/G2 savings are absent and candidate continuous CPU tails exceed the G5 numerical allowance. Exact effect sizes remain unqualified because A/A fails. The result supports declining this tested Editor path on current evidence, without attributing its cost to `updateSingle`, JIT or OS scheduling. Every continuous candidate pair still has zero prepared passes and four fallbacks; no ownership level or FPS claim advances.

### Completed Viewer engine and separate migration audits

The [decision appendix](../plans/task_m6_49_viewer_decision.md) and exact native/instrumented protocols were fixed before primary timing. Engine full completed at **2026-10-26T05:26:05.250Z** with **72 runs / 86,400 measured groups / 129,600 including warmup / 288 arming rows**. Migration full completed at **05:38:43.797Z** with **36 runs / 43,200 measured / 64,800 including warmup / 144 arming rows**. Together these are 108 full runs, 129,600 measured groups and 777,600 ordinary raw callback rows, plus 432 arming rows. Engine smoke separately has 24 runs / 720 measured groups; migration smoke has 12 / 360. All four captures have empty errors, passed source integrity and AC before/after.

Each group contains K=4: complete native Viewer.animate plus Lighting/Animation/Morph Targets GUI callbacks with frozen ordered 1/14/9 controller lists. All callbacks are disjoint and included. The full cases preserve static/grid-on, Walking/grid-on, Walking/DPR2 and Walking/grid-off; migration covers static and Walking/grid-off separately. Grid-off retains its native hidden axes context and zero axes rendering. Static Viewer continues rendering and is distinct from the Editor render-free idle control.

Original A/A uses `max(5% × all-original p50 median, 8 × largest original clock increment)`, with blocks centered on their own run medians. Engine failures are static **1/10 runs, 4/40 blocks**, Walking **0/10, 9/40**, higher resolution **2/10, 3/40**, and grid-off **5/10, 14/40**: all four groups fail (8/40 runs and 30/160 blocks overall). Migration static fails **5/10 and 17/40**; grid-off fails **2/10 and 6/40**. All four matched-JS repeat screens fail; only the Walking/grid-on Wasm repeat screen passes. Four balanced JS repeats are not dedicated JS A/A/bookend calibration.

Observed balanced callback CPU p50 medians are descriptive milliseconds:

| Engine-session case | Pure r186 | Matched JS | Wasm |
| --- | ---: | ---: | ---: |
| Static | 0.45750 | 0.78500 | 0.77500 |
| Walking | 0.47500 | 0.84125 | 0.83250 |
| Higher resolution | 0.48250 | 0.82250 | 0.84750 |
| Walking, grid off | 0.47250 | 0.81750 | 0.80500 |

| Migration-session case | Original bundled r176 | External r176 | Pure r186 |
| --- | ---: | ---: | ---: |
| Static | 0.61000 | 0.67000 | 0.68250 |
| Walking, grid off | 1.04500 | 0.98375 | 0.99000 |

**The pure-r186 grid-off regime changed between sessions (0.47250 versus 0.99000 ms). Its cause is unresolved. Never pool these sessions, subtract migration costs from engine observations, or infer a Rust/migration/OS/JIT cause.** The [independent report](../../bench/results/task49-viewer-timing-20261026/INDEPENDENT_AUDIT.md) contains every CPU/GUI/animate p50/p95/p99, rAF and callback-start interval, absolute/relative contrast, complete A/A counts and direct external-r176→pure-r186 comparisons. No exact effect is qualified.

No target achieves G1 (20% and 1 ms versus pure r186) or G2 (10% and 0.5 ms versus matched JS). G5 observed CPU budgets often fail; all measured interval tails stay within their arithmetic allowance. Noise was not added to product budgets. The unstable baseline keeps formal inference inconclusive, while the finite absence of a useful advantage supports declining adoption of this tested path. The grid-off Wasm p95 increase over pure r186 is 0.20000000298023224 ms: its exact threshold failure is preserved without portraying the tiny boundary excess as a meaningful causal regression.

All raw groups, including warmup, pass native phase/frame/state/controller checks. Maximum full phase residual is 1.7763568394002505e-15 seconds. Both candidate routes record zero prepared passes/calls. Grid-on per-group averages across each measured window are 2 fallbacks, 68 paid matrix materializations (matrixReads) and 8,704 materialized bytes, with 22 Wasm calls on the Wasm route; grid-off averages 1 fallback, 62 materializations, 7,936 bytes and 15 Wasm calls. These are endpoint counter deltas divided by 1,200 groups, not counters sampled in each raw callback row. These are paid inside the native callback boundary; they do not promote ownership.

Each engine suite verifies 24 oracle pages / 42 poses / 341,880 ordered reference values, error 0 and equal strict images/semantics. Each migration suite verifies 12 pages / 18 poses / 145,944 values. All native-versus-instrumented comparisons are strict and pass, as does original-r176 versus external-r176. The predeclared non-strict pure-r186 migration comparison preserves image/layout/numerical differences, up to 8.145756254407388e-06. Full archives preserve 84 engine and 36 migration PNG files. PNG bytes/dimensions and stored raw-pixel hashes are checked; offline verification does not recreate WebGL readback.

Executed capture command shapes (all four under `caffeinate -di node`, equivalent option ordering, default Robot content) and exact source/preparation/build pins are recorded in the [archive README](../../bench/results/task49-viewer-timing-20261026/README.md). Executed independent commands passed:

```bash
python3 bench/results/task49-viewer-timing-20261026/verify.py
python3 bench/results/task49-viewer-timing-20261026/test_analyze.py
python3 bench/results/task49-viewer-timing-20261026/test_verify.py
```

The 18 numeric tests cover raw group/phase/frame/order/stability/contrast mutations; the 11 additional tests cover source-storage/hash/count/path, restoration overwrite, metadata invariance, strict oracle and non-strict migration behavior. Full raw verification reconstructs every measured group and checks stored summaries independently of the JavaScript analyzer. Source/preparation bytes, exact HTML transformation, complete adaptation patches, GPU/environment and all original captures are separately verified. Successful evidence verification does not turn the negative stability outcome into a performance pass.

## Residual Risks

- Editor original A/A remains unstable; no precise effect-size, CPU-language advantage, FPS benefit or resolved cause is established.
- All six Viewer original A/A screens fail, matched-JS calibration is incomplete and the cross-session pure-r186 regime remains unresolved. Source/oracle parity does not resolve that performance uncertainty.
- Both callback boundaries exclude asynchronous/browser/GPU work, with uncalibrated instrumentation overhead and native wall-clock phases that differ between routes.
- The small Robot scene does not establish the normally 5 ms CPU-heavy target cohort. Larger-content unsupported/failing imports and runtime limitations remain separate evidence, not silently replaced primary scenarios.
- Four matched-JS Viewer repeats do not supply dedicated JS A/A calibration. Missing first-use/transfer/memory, 30-minute lifecycle and additional hardware/browser/day evidence remains open.
- RobotExpressive's source conformance findings and upstream MIT/CC0 notices are preserved. Successful bounded runtime oracles do not repair the original asset or establish complete API compatibility.
- `updateSingle` has no demonstrated useful benefit. Commit `c4781c79819ce1a3a279fba240851a03de5bc381` excludes the 33-line specialization while retaining five semantic tests; final validation uses `96b0b4c0e7d55c22c1f2c22955356b9822e67d22`. Stage 5 records its separate correctness evidence. This runtime cannot inherit candidate85 measurements by relabeling.

## Impact on Next Stage

Stage 5 must inherit the complete negative Editor evidence and each independently verified, unstable Viewer engine/migration result. Do not average scenarios to hide a loss, lower adoption-v1 thresholds, omit failed attempts or promote preparation into product progress. The final report must distinguish a finite rejected/inconclusive investigation from unfinished broader product gates.

The finite two-app timing matrices, archival and independent validation are complete. Before final publication, reconcile the broader-content failures and runtime disposition and run final integration checks. The public report and issue updates must use exact final validation and experimental SHAs separately. The observed callback path is not recommended for adoption; the broader product question remains open.

## Approval / Continuation Status

The approved finite Task #49 continuation already covers the remaining verification and final decision. This report adds no new approval request. The finite captures and independent audits are complete; the integration owner records the stage commit after review and remains responsible for final runtime disposition, exact-head CI and publication.

## Prospective intact Bistro extension — completed

The independent [Bistro decision appendix](../plans/task_m6_49_bistro_decision.md) and dedicated protocol add one intact authored-content engine case under runtime85. The negative CDP timeDeltas reject the existing profile-weighting method, not the separate callback timer. Six new native/timed oracle pages and smoke precede 18 full balanced/bookend runs, 600/1200 groups, K=3 and a six-clock-increment floor. The incomplete Bistro migration profile stays separate, and no primary version-migration matrix is added. Full capture completed with all 18 runs and retained negative stability/performance outcomes below.

The Bistro full capture ran **2026-10-26T13:05:49.699Z–13:25:54.140Z**, clean tool `58b7cdce62ab15f1507dd76255840f406cee6287`, immutable runtime85 and protocol SHA-256 `be967daa44d52689f9f82dbabe7f9e9d107abc3447bdda5ce1f5e1cae36a2651`. Clean preparation tool `96b0b4c0e7d55c22c1f2c22955356b9822e67d22` generated the separately pinned native/timing bundles. These identities are distinct. Independent Python analysis verifies 18 full runs / 21,600 measured K3 groups / 32,400 including warmup / 54 arming rows, six oracle pages / twelve fixed poses / 894,420 reference numeric values, exact images, immutable 1,094 inputs, strict ZIP/source/readiness/AC and no warmup or sample activity. The six-run smoke remains separate tooling evidence. The failed first smoke audit's 407-versus-410 ZIP-entry assumption remains alongside its corrected second audit; no raw file changed.

| Route | Median run CPU p50 / p95 / p99, ms |
| --- | --- |
| Pure r186.1 | 7.90750 / 9.182625 / 9.945500 |
| Matched JS | 15.52625 / 17.041125 / 18.168475 |
| Rust-Wasm | 16.14000 / 17.838125 / 18.432800 |

Original A/A fails 2/10 run medians and 0/40 blocks under T≈0.395375 ms, with a six-clock-increment floor≈0.03 ms. JS repeat checks pass (0/4 runs, 0/16 blocks); Wasm fails 1/4 runs and 0/16 blocks. Exact causal effect sizes remain inconclusive. Descriptive Wasm-minus-pure p50 is +8.23250 ms / +104.11%, and Wasm-minus-JS p50 is +0.61375 ms / +3.95%; no G1/G2 savings appear. Both candidate CPU p50/p95/p99 exceed the observed G5 budget. Separate interval tails remain within their numerical allowance, despite median rAF interval changing from about 8.335 to 16.665 ms. No display-FPS, input-latency or stable frame-pacing claim follows.

Every original run p50 is ≥7.515 ms, confirming a larger intact covered elapsed-callback workload than the small Robot controls. It does not establish CPU-bound versus GPU-bound behavior: driver stalls may be inside synchronous submission time. For every measured candidate window, endpoint deltas average zero prepared passes/reads, one fallback, 1,595 paid materializations / 204,160 bytes and seven Wasm facade calls (JS zero) per main-renderer frame. These are window averages, not individually observed frame counters. Combined two-GUI-body p50 remains 0.020 ms pure / 0.015 ms candidates within its declared narrow scope. Do not derive subsystem milliseconds by multiplying the earlier counts-only shares by primary CPU.

The bounded decision is to decline adopting this measured Bistro candidate as well as the previously measured Editor/Viewer Robot paths; stable exact performance comparison and broad qualification remain unestablished. The [public application report](../../docs/TWO_APP_CANDIDATE_REPORT.md#bistro-viewer-primary-decision) and [Bistro primary archive](../../bench/results/task49-bistro-timing-20261026/README.md) retain the full quantiles/intervals/ranges, absolute and relative differences, phase/counter checks and limitations. The final archive verifies 1,911 logical files in 462 blobs, 510 physical files, 48 PNGs and 1,788,840 numerical values across smoke/full; sixteen storage/privacy tests pass. Both archival-only failures and their partial indexes/hash-preserving moves remain. Index SHA-256 is `d70f357d8b31acbed24fe0232fcfc1599388aeb3255cbaa4b006ef508152ae5b`; final audit is `0579b330b0d01f0899a268f8905409599641dcb97425b0395d63dc25a2c8c543`. New-SHA correctness and exact-head CI remain Stage 5 responsibilities.
