# Task #31 final report

GitHub Issue: [#31](https://github.com/postmelee/three.rust/issues/31). Milestone M6.

## Work Summary
Four stages define what makes three.rust useful as a replacement and orient Status toward that outcome. The user authorized the goal/status work. This is prospective product policy and presentation; no engine implementation, benchmark or milestone is newly completed.

## Changed Files and Impact Area

| Area | Change |
|---|---|
| docs/PRODUCT_GOALS.md, ADR 0004 | Useful accelerator, application replacement and broader adoption; six evidence gates and v1 budgets |
| docs/PROJECT_PLAN.md, PERFORMANCE.md, PROGRESS.md | Reconcile goals with the implemented experiment and its limits |
| docs/product-goals.json, tools/progress.py | Declared reviewed status inventory; deterministic plain goal and evidence tables |
| README and generated HTML | Keep the original map/tables/definitions/history; add plain goal tables, no new card UI |
| Progress/status tests | Reject unsubstantiated qualification metadata; check gate table and existing source/history behavior |

## Document Location Verification
All public policy remains in docs/ with the decision in docs/adr/ and the overview in README. The inventory and generated image use planned docs/ locations. Task records remain in mydocs/. No runtime/API documentation moved or historical data rewritten.

## Quantitative Before/After Comparison

| Measure | Before | After |
|---|---|---|
| Status context | Computation/state map | Same map plus six declared replacement gates in plain tables |
| Qualified adoption gates | Not defined | Zero; four Early evidence, two Not yet |
| Source inventory | 1,515 callable definitions / 115 fields | Unchanged |
| Explicit history observations | Three | Unchanged |
| Prospective app performance budget | Workload-specific policy only | v1 targets: >=20% and >=1 ms p50/p95 vs Three.js; >=10% and >=0.5 ms before recommending Rust over matched JS |

The budgets are future design targets, not observed improvements or universal guarantees. Existing Fox savings remain 0.25 ms and do not meet the new absolute application gate. Current evidence is not retroactively qualified. Accelerator and replacement migration contracts remain distinct.

## Verification Results

| Criterion | Result |
|---|---|
| Goal/state traceability | Invalid states, duplicate gates, missing evidence and unsupported qualification metadata reject |
| Reproducible generation | docs:check passes, measured README table remains unchanged |
| History preservation | Source/map/chart/ledger diff is empty; history HTML is also unchanged after the requester refinement |
| Actual user-facing rendering | Desktop/mobile progress checks and screenshot review pass |
| Deployable artifact | Committed Pages build/subpath/history links tested at both widths |

[Stage 1](../working/task_m6_31_stage1.md), [stage 2](../working/task_m6_31_stage2.md), [stage 3](../working/task_m6_31_stage3.md) and [stage 4](../working/task_m6_31_stage4.md) record methods and limits. Two source tests, seven progress Python tests, one status-site Python test and both browser suites passed. No new engine or hardware run was needed for this scope. Remote CI at publication is separate from these completed local checks.

## Residual Risks and Follow-up Work
M3 must select realistic independent applications and profile them before new scope. M4 freezes the workload, contract, baseline/noise and budget version. M5 optimizes a justified contiguous ownership boundary. M6 evaluates all adoption gates; M7/M8 expansion remains conditional. The matched JS backend may remain the rational choice if Rust does not add useful benefit. App-level compatibility cannot be inferred from passing a finite animation fixture.

Review budgets as prospective product choices, not industry standards. Any changed thresholds need rationale and a new profile before qualification; preserve failures. No overall completion percentage, automatic Rust default, full ecosystem compatibility, new release or main deployment is asserted.

## Publication and Review
Publish the authorized codex/adoption-goals branch as a stacked draft against codex/performance-evidence (PR #30). Parent review/merge and this PR's main integration are separate. Leave issue #31 and broader product issues open through review/merge; update #14 with the new acceptance-policy reference without checking off its work.

## Requester presentation refinement
After seeing the intermediate card preview, the requester asked to preserve the original simple HTML. The final change removes that new SVG and its styling, restores the existing top diagram and visible README source map, retains source summary tables and Definitions and evidence, and adds only plain goal tables and short links/explanations. The earlier stage-2/3 screenshot reports describe the superseded preview. No new public deployment occurred during either preview.
