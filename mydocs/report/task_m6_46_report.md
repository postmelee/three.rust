# Task #46 final report: first real-application performance verdict

GitHub Issue: [#46](https://github.com/postmelee/three.rust/issues/46)  
Milestone: M6 — Product performance and release decision

## Work Summary

- Target Issue: #46; five stages, including separate Stage 4 correctness and timing units.
- Purpose: integrate reviewed dependencies, investigate baseline instability and evaluate a feature-preserving candidate in one real application.
- Outcome: **the finite investigation is complete with a negative/unstable first-app verdict. Do not adopt the current candidate as a faster default.** Stable baseline A/A was not established. Both candidate routes cost more than upstream in the tested native Editor callback path, and all three continuous app A/A groups failed.
- This closes no broad hardware, representative-profile, compatibility, ownership or replacement-performance gate. Those remain in #4, #5, #12 and #13.

The canonical public interpretation, full source pins, conditions, reproduction commands and limitations are in [MAC_APP_SCREEN.md](../../docs/MAC_APP_SCREEN.md). Runtime candidate is `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb`; native Editor timing tooling is `a1aad46f2bf8d74176b2b5e2836cbdd1ff34678a`. The historical baseline stays `9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7`, and pre-guard C3 stays `ce21ffcf355534a8cf32eb4c9f7e43d6a86509b5`. Do not substitute the publication head or current main for these measurement pins.

## Changed Files and Impact Area

| Path | Change Summary | Impact Area |
|---|---|---|
| `bench/aa-lifecycle.mjs`, `bench/candidate-screen.mjs` | Pinned historical-lifecycle and balanced complete-fixture screens, failure retention | Measurement tooling, separate from engine implementation |
| `scripts/apps/candidate-browser.mjs`, `check.mjs`, `ui.mjs` | Candidate-aware Editor serving, exact source overlays, explicit pre-module initialization and preserved original behavior | App integration/compatibility evidence |
| `scripts/apps/timing*.mjs`, `tests/editor-timing*.mjs` | Native callback pairing, phase validation, original/overlay oracles, A/A and raw data | Bounded animation/timeline CPU measurement |
| `scripts/runner-environment.mjs`, `tests/candidate-evidence.mjs`, `package.json` | Current display keys, post-observation failure preservation, regression tests | Metadata and test infrastructure |
| `bench/results/task46-*` | Integration, A/A, fixtures, Editor correctness and timing archives with hashes/verifiers | Raw evidence; failed and unfavorable results retained |
| `docs/MAC_APP_SCREEN.md` and small existing docs updates | Current findings, initialization caveat and evidence links | Public report/navigation; root README performance table and progress inventory unchanged |
| `mydocs/plans`, `working`, `report`, `orders` | Plans, stage records, independent audits, code review and task state | Research/workflow evidence |

The Stage 1 integration already merged the reviewed historical engine/app/evidence stack through PR #47. Later commits in this publication add tools, tests and evidence; they do not change the frozen engine or remove app features to obtain a gain.

## Document Location Verification

| File | Planned Location | Actual Location | Result | Evidence |
|---|---|---|---|---|
| Public measurement report and affected guidance | `docs/` | `docs/MAC_APP_SCREEN.md`, existing CI/performance/compatibility/index pages | OK | [Task plan location judgment](../plans/task_m6_46.md#document-location-judgment), established docs guide |
| Task reports and independent review | `mydocs/working`, `mydocs/report` | Existing task locations | OK | Stage links below; no historical report moved |
| Raw measurements | Fresh `bench/results` directories | Separate Task 46 archives | OK | Source/public/stored hashes and independent verification |

No requester-specific prompts or personal session settings are published. Original local captures and immutable runtime checkouts remain preserved.

## Quantitative Before/After Comparison

These are route comparisons under failed stability screens, not an implementation improvement claim. Native Editor values are medians of balanced-run CPU p50s; original has eight runs per condition and each candidate four.

| Native Editor condition | Original Three.js | Matched JS | Rust-Wasm | Observed Wasm cost increase vs original |
|---|---:|---:|---:|---:|
| Root selected, shadow | 1.3300 ms | 2.9425 ms | 2.9800 ms | +1.6500 ms |
| Root selected, no shadow | 1.2625 ms | 2.7850 ms | 2.8275 ms | +1.5650 ms |
| Root selected, higher raster load | 1.3425 ms | 2.9500 ms | 2.9750 ms | +1.6325 ms |
| Static idle, zero rendering | 0.0150 ms | 0.0150 ms | 0.0150 ms | No meaningful relative comparison |

Wasm-minus-matched-JS p50 differences were +0.0375, +0.0425 and +0.0250 ms in the continuous conditions. They establish no stable independent language effect. Every continuous candidate window used four fallback render passes per callback pair and **zero prepared passes**. Actual Wasm facade calls and public matrix materializations were nonzero. The candidate did not exercise an active C3 prepared renderer on this required-feature app path.

| Evidence unit | Completed contribution | Remaining qualification |
|---|---|---|
| Historical A/A | 27 full diagnostic runs / 97,200 frames; all nine lifecycle groups failed | Cause and a stable exact-baseline condition unresolved |
| C3/epoch complete fixtures | 144 runs / 86,400 frames; 24 fixed-state captures passed; all four original A/A groups failed | No useful hardware gain or accepted guard speedup |
| Editor interaction correctness | 162 route-local checks; 149,328 numeric comparisons and 32 fixed-image pairs exact | One bounded Editor integration; Viewer candidate and broad API/lifecycle coverage absent |
| Editor native timing | 54 continuous + 16 idle runs / 68,640 measured callback pairs; 24 oracle pages / 42 fixed poses | 1/30 continuous original run checks and 13/120 blocks failed; all three continuous A/A groups fail |

CPU p95/p99, absolute and relative route differences, frame intervals and every failure remain in the stage reports and raw analyses. Approximately 8.33 ms median rAF intervals do not establish display latency or an FPS improvement. The callback timer excludes browser/GPU/async work and is not OS on-CPU time. Total instrumentation overhead was not calibrated.

## Verification Results

| Acceptance Criterion | Result |
|---|---|
| Preserve and integrate reviewed dependencies | OK — PR #47 merged; tested head and merged tree are identical; historical ancestry/raw records retained |
| Investigate exact baseline and freeze stronger stability checks | Investigation complete, stable condition unresolved — every diagnostic condition retained; follow-up remains #4 |
| Compare original/pre-guard/epoch complete paths | OK — fixed SHAs, identical relevant native/fixture bytes, hardware correctness and all 144 runs retained; negative/unstable result |
| Preserve required behavior in one real app | OK within stated scope — native gizmo, focus, camera, undo/redo and timeline behavior; initialization failure corrected; all required fallback retained |
| Deliver a first-app performance verdict | OK, negative — complete declared callback-cost screen; no faster-default or Rust-benefit claim |
| Preserve failures, sources, licenses and raw data | OK — smoke/startup failures, raw/warmup/arming data and metadata normalization documented in archives |
| Tool correctness and review | 42 infrastructure tests passed; post-query preservation defect resolved in `68b262fb31cb73cd47a910b57a809075ef315c65`; independent raw recalculations match |
| Broad adoption and replacement goals | Not met — ownership/progress and generated README performance claims unchanged |

### Stage Verification Results

- Stage 1: [integration review](../working/task_m6_46_integration_review.md), [reference inventory](../working/task_m6_46_integration_refs.json). Combined build/tests/package/browser/compatibility checks passed. Exact-head CI [40235510548](https://github.com/postmelee/three.rust/actions/runs/40235510548) passed on `23a9096441b093d4e198547d44e819b9a3138a9c`; merge `fa4eead58d19720420a886fdbc898c0b9ebde321` has the same tree. Finite integrated issues #29/#31/#34/#38/#40 were closed; broader tracks remain open.
- Stage 2: [historical lifecycle report](../working/task_m6_46_stage2.md); archive verifier checks all preserved payloads and recomputes the failed stability screens.
- Stage 3: [fixture report](../working/task_m6_46_stage3.md); full and smoke image/numeric/counter checks pass, with negative timing outcomes preserved.
- Stage 4A: [Editor correctness report](../working/task_m6_46_stage4a.md); six canonical datasets plus earlier attempts; independent cross-route comparison passed.
- Stage 4B: [Editor timing report](../working/task_m6_46_stage4b.md), [independent review](../working/task_m6_46_editor_review.md), [audit JSON](../working/task_m6_46_editor_audit.json). All 70 raw runs independently recomputed; native phase consistency, fixed images/numerics, real Wasm work and idle suppression checked.
- Stage 5: this report and the canonical public report reconcile the negative evidence and remaining issues. [Code review](../working/task_m6_46_code_review.md) records the resolved preservation finding. Publication is gated on the final PR head's CI; the PR retains that live CI outcome rather than relabeling the historical integration run as evidence for a later head.

## Residual Risks and Follow-up Work

### Residual Risks

- Stable baseline and app A/A qualification remain unresolved. Do not attribute instability to JIT, scheduler or power without new evidence, or publish precise percentages as established language effects.
- Both apps are independently pinned originals, but only the Editor candidate has been integrated here. Viewer r176 migration, arbitrary content, WebGPU/path tracing, context loss and long-running lifecycle behavior remain unverified.
- Current candidate sampling profiles were not run. Materialization counts do not reveal Proxy/guard/copy/renderer CPU shares. Native E3 playback and historical harness-started E2 profiles are different conditions.
- This is one Mac/session. No other-date, second-device/browser, GPU elapsed-time, frame-presentation or full-browser-CPU qualification follows. Native wall-clock phases are not matched frame by frame.
- The CC0 Robot asset retains known validator errors; native loader normalization is checked separately. Source and dependency licenses remain attached.
- The already returned raw-data fix protects future page-query failures; no old measurement was rerun or reattributed to the fixed tooling.

### Follow-up Candidates

Use the existing open tracks rather than create duplicate broad issues:

1. #4: investigate and establish a reproducible comparison condition, retaining all A/A regimes and using fresh output paths.
2. #5: obtain candidate attribution in the same native E3 setup before selecting an optimization. Keep renderer/palette reuse, exact bounds/public-matrix consumption, then remaining UI work as investigation priorities. Start any reuse change with a matched-JS control and explicit invalidation/callback semantics. Do not bypass unsupported content or substitute approximate bounds.
3. #12/#13: retain cross-device/browser, second-app, lifecycle and broader compatibility gates. New engine candidates require a full immutable SHA, dedicated validation path and correctness before cost measurement.

## Approval Request to Task Requester

The finite continuation already authorizes evidence publication, issue updates and reviewed merges. Proceed with the reviewed PR and exact-head CI gate; no broader performance acceptance or default-engine change is implied by merging this negative evidence.
