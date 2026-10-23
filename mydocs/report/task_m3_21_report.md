# Task #21 — Final implementation report

Issue: [#21](https://github.com/postmelee/three.rust/issues/21) · Milestone: M3

## Work summary

Three stages replace coarse task tiles with source-derived computation and authority
inventories, simplify README and publish genuine progress history, and prepare the
animation → object/bone transforms → palette experiment. No new engine port is
claimed. Main integration is explicitly authorized, including prerequisite PRs.

## Changed files and impact

| Area | Artifacts and behavior |
|---|---|
| Public status | README, docs/PROGRESS, progress/history HTML/JSON/SVG, AST/Python generators |
| Pipeline preparation | docs/PIPELINE_PREPARATION, source audit, asset-free rig, seven semantic oracles and image/palette comparisons |
| Diagnostics | Separate CPU/full-render harness and summaries; raw environment/samples with regressions retained |
| Delivery | CI checks, portable fixture/history bundle, main-only roadmap sync, issue #21 and linked next work |

## Document location verification

Public contracts, counting rules and reports remain in docs/; generated graphics
in docs/assets; workload in fixtures/pipeline; raw evidence in new
bench/results/preparation-* directories. Workflow plans/reports remain in mydocs/.
These match the approved [location judgment](../plans/task_m3_21.md). Existing
historical raw files and engine implementation are unchanged.

## Quantitative before/after

| Metric | Before | After |
|---|---|---|
| Status units | 29 curated capabilities + 12 evidence gates | 1,515 actual callable definitions + 115 declared state fields |
| Rust computation/authority distinction | Shared green implementation/evidence color | One conditional amber route; zero green authoritative fields |
| Progress history | None | Two genuine observations; incompatible schemes explicitly separated |
| Pipeline preparation | Leading hypothesis | Audited source path, provisional contract, runnable rig/oracle/diagnostics |
| Preparation samples | None | Corrected 1,080 CPU + 720 render samples; preliminary 1,080 samples preserved separately |
| New Rust animation implementation | None | None; deliberately outside this task |

Counts do not measure work, speed, full API coverage or a one-to-one Rust translation.
The changed denominator is not a porting gain.

## Verification results

- [Stage 1](../working/task_m3_21_stage1.md): source/hash/count/history checks,
  2 AST + 5 Python tests, desktop/mobile page/history rendering passed.
- [Stage 2](../working/task_m3_21_stage2.md): 7 upstream semantic tests and A/A plus
  A/B/C/D actual render/palette comparisons passed; raw diagnostics captured.
- [Stage 3](../working/task_m3_21_stage3.md): existing Rust/differential/type and
  five-scene browser regression checks passed; package, demo, exported fixture,
  hardware rejection, actionlint, English/freshness and preservation checks passed.

Remote prerequisites #1/#20 are merged and implemented issues #2/#19 closed.
At report publication the new branch CI was in progress, not passed. The final PR
records final-head correctness, main merge SHA and post-merge workflow outcome;
those checks are required before declaring the complete task done.

## Findings, residual risks and follow-up

The CPU-only 64-rig diagnostic averages about 0.667 ms original versus 1.040 ms
current Wasm bridge. Full render medians at 16 rigs are around 1.0–1.1 ms with
uneven noisy tails. SwiftShader/shared CPU and coarse timers cannot establish a
hardware speedup or engine ranking. Raw unfavorable results are retained.

Keep intermediate animation/pose/world state in the proposed owned domain, expose
final palettes and explicit reads, and first build the same domain in optimized JS.
Callback dispatch precedes property binding apply; texture palette buffers can be
replaced/padded; the renderer has a private skeleton-update cache. These constraints
are now executable preparation inputs, not promises of future compatibility.

#3/#4 hardware qualification/baseline, #5 representative profiles, #15 reusable-engine
source/build review, and #7/#8 accepted target/compatibility decisions remain open.
#9 is the matched owned-JS experiment before #10/#11 Rust and renderer integration.
The preparation is ready to run; these wider acceptance gates are not completed by
this task. No npm publication, paid runner or public Pages deployment occurred.

## Authorization and publication

The requester's latest instruction explicitly authorizes verified main integration.
No extra approval is required for the recorded work. The board's publication entry
means implementation/local verification is done; remote acceptance is confirmed in
the PR and issue before closing the complete task.
