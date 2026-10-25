# Task #4: precision-validation preparation

Related issue: #5. Milestone: M3. Research code pin: `9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7`.

## Purpose and scope
Reproduce the existing physical-Mac setup and correctness gates before any new performance conclusion. Preserve original checkout, historical samples, renderer, workload, quality, lockfiles and Rust toolchain. Use a separate `codex/` worktree. Engine/API work belongs to a separate implementation stream.

## Stages
1. Read pinned protocol, inspect PR/CI state, install/build/test and collect allowlisted hardware evidence.
2. Resolve only validation-tool blockers in a separate commit, then hardware image/numeric/bypass/rejection checks and a short isolated smoke.
3. Archive observations and source hashes, research independent applications and publish a draft report. Main timing and app CPU profiles require a quiet session; those stages remain unperformed in this delivery.

## Tooling adjustment
The fixed localhost port conflicts with an unrelated service. Support `RTHREE_PORT` consistently in active server consumers, retaining 4173 by default; fail explicitly on invalid ports/collisions. No source-port calculation or input changes. Verify binding, navigation origin, headers, negative cases, infrastructure tests and actual Fox rendering. Record the complete tooling commit separately from the research pin.

## Document location judgment
| Artifact | Classification/audience | Selected path | Alternative | Reason |
|---|---|---|---|---|
| Preparation evidence | Reproduction archive; contributors | bench/results/mac-preparation-20261023 | docs/assets | Existing raw-evidence convention; no new public performance policy |
| App screening | Technical research; contributors | mydocs/tech/task_m3_5_apps.md | docs | Candidates and unmeasured hypotheses, not an accepted application contract |
| Plan/report | Issue work artifacts | mydocs/plans and mydocs/report | docs | Scoped experiment record |

## Acceptance and limits
Require actual Apple/Metal preflight; reject SwiftShader as hardware; compare A/A and upstream/matched-JS/Wasm numeric and image outputs with existing tolerances. Preserve failed invocations, report no new A/A/performance verdict without the full quiet protocol. Do not infer FPS, CPU shares or Rust benefit from correctness or smoke. No second-day, cold-cache, mobile or second-device completion claim.

The existing noise rule and five-phase full protocol remain unchanged. A future session must run the exact candidate SHA in a fresh path, with 1200/3600 fixed frames, five pre/post original and matched-JS repeats, six balanced main permutations, separated diagnostics and controls. Review p50/p95/p99 and absolute milliseconds; do not pool per-frame samples as independent repeats.
