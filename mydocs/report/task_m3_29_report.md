# Task #29 final report

GitHub Issue: [#29](https://github.com/postmelee/three.rust/issues/29). Milestone: M3.

## Work Summary
Three stages implement finer optional timing, more useful cost attribution and accessible, traceable performance reporting. The requester authorized continuation and public improvement explanations. Draft PR #30 targets main after merged #27/#28; no engine subsystem expansion or new hardware result is claimed.

## Changed Files and Impact Area

| Area | Change | Impact |
|---|---|---|
| bench/timing.mjs, fox runner/report/compare/evidence | Per-page clocks, policy guards, matched-JS A/A and conservative diagnostic screens | Future measurement and interpretation |
| server and Fox replay | Opt-in isolation; separate diagnostic input and evaluation | Default hosting unchanged, main work preserved |
| Mac wrapper | Two baseline families; complete diagnostic replay cycle | More complete, longer future hardware protocol |
| README, docs/PERFORMANCE.md, docs/CI.md | User-facing conditions and reproduction | No universal or import-only speed claim |
| tests, workflow, summary generator | Clock/output tests, invalid-phase guards, checked table | Automated correctness, not hardware benchmarking |

## Document Location Verification

| File | Planned | Actual | Result |
|---|---|---|---|
| Public guide | docs/PERFORMANCE.md, README | Same | OK |
| CI protocol clarification | Existing docs/CI.md | Same public docs root | OK |
| Work records | mydocs/ | Same | OK |
| Validation evidence | bench/results/timing-validation-20261023 | Same | OK |

## Quantitative Before/After Comparison

| Measurement capability | Before | After |
|---|---|---|
| Fox clock evidence | One external preflight | Every page, observed isolation/increment |
| Baseline A/A families | Original only | Original and matched JS |
| Diagnostic buckets | Inputs plus evaluation combined | Inputs/commands separate from evaluation |
| Future diagnostic cycle | 120 sampled ticks | Complete 600-tick replay |
| User-facing performance table | No concise hardware table | Generated/checkable 3-scene table |

Existing Mac 16-Fox CPU p50 is 0.45/0.25/0.20 ms original/owned JS/owned Wasm. About 56% reduction versus original is bounded to that scene/device/API; extra Rust benefit, FPS improvement and general replacement performance remain unproven. These are unchanged historical results, not improvements caused by this task.

## Verification Results

| Acceptance criterion | Result |
|---|---|
| Identical rendering and numerical state | 132 Fox checkpoints; exact pixels; 13 unsupported cases reject |
| Hosting/diagnostic mode parity | Both modes, three backends, full 600-tick cycle; exact numeric/pixel-digest parity |
| Comparison correctness | 13 infrastructure tests including eight Fox analysis tests; legacy comparison unchanged |
| Actual tool execution | 42 short cloud runs / 252 samples, all complete with clean measured source |
| Honest public explanation | Generated table, English checks and docs validation pass |
| Preserved evidence | 229 historical archived hashes verified; no old files changed |

Stage records: [1](../working/task_m3_29_stage1.md), [2](../working/task_m3_29_stage2.md), [3](../working/task_m3_29_stage3.md). Logs and raw results: [validation archive](../../bench/results/timing-validation-20261023/README.md). Final-head remote CI is reported on PR #30, not assumed complete here.

## Residual Risks and Follow-up Work
A quiet physical-Mac rerun remains outstanding: no attached Mac execution capability was available. The new full protocol takes longer because matched-JS A/A adds 30 full runs. Observe real duration, power and background work. Cross-origin isolation may constrain real-site embedding and is optional; all compared Fox paths must use the same policy. Screens do not provide significance or automatic product acceptance. A second session/device, broader assets, memory/GC and Fox GPU time remain open.

Use the new complete diagnostics to rank command overhead, computation, copies, reads and renderer cost before selecting another port. Any command/layout improvement must also be applied to the matched JS reference. Do not expand into visibility/render lists or literal whole-engine translation solely to increase coverage.

## Publication and Review
Commit/push and draft publication are authorized by the requester and completed through PR #30. Review and merge remain separate; no new permission pause is introduced and no broader issue is closed. The finite tooling/documentation scope is locally verified; hardware acceptance is not marked complete.
