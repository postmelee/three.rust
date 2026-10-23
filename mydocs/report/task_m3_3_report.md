# Task #3 final report: Mac hardware and real-asset owned validation

GitHub Issue: [#3](https://github.com/postmelee/three.rust/issues/3)
Milestone: M3

## Work Summary

- Target Issue: #3; related #4–#5 and #7–#11.
- Milestone: M3, three stages.
- Validate PR #27 at e66e067 on physical Apple hardware, then exercise the finite owned pipeline on a licensed real skinned asset with comparable rendering and reproducible inputs.
- The separate `codex/mac-hardware-validation` worktree preserves the original local checkout. The deliverable is a stacked draft PR; no merge, issue closure or npm publication.

## Changed Files and Impact Area

| Path | Change Summary | Impact Area |
|---|---|---|
| `scripts/browser-path.mjs`, `scripts/runner-environment.mjs`, `scripts/mac-preflight.mjs` | Installed Mac Chrome resolution, allowlisted environment and actual WebGL backend | Hardware reproducibility |
| `fixtures/fox`, `scripts/fetch-fox.mjs`, `tests/fox-*.mjs` | Pinned provenance/license, finite conversion, deterministic replay, exact-image/numeric checks and unsupported rejection | Real-asset correctness and explicit contract |
| `bench/fox*.mjs`, `bench/gpu-summary.mjs`, `scripts/mac-validation.sh` | Balanced sampling, A/A guard, separate costs/controls, repeatable analysis | Measurement |
| `bench/results/mac-20261023`, `docs/MAC_HARDWARE_REPORT.md` | Raw samples and failures, hashes, interpretation and issue acceptance matrix | Evidence |
| `docs/CI.md`, `docs/OWNED_ANIMATION.md`, `docs/OWNED_REPORT.md` | Reproduction, raw quaternion limitation, historical evidence cross-reference | Documentation |
| `package.json`, `.github/workflows/ci.yml` | New path/Fox/analysis checks; software CI remains correctness-only | Regression checks |

## Document Location Verification

| File | Planned Location | Actual Location | Result | Evidence |
|---|---|---|---|---|
| Hardware report and CI reproduction | `docs/` | `docs/` | OK | Contributor evidence follows OWNED_REPORT convention in task plan |
| Contract limit/historical follow-up | Existing `docs/` | Existing `docs/` | OK | Small linked additions, no documentation relocation |
| Task records | `mydocs/plans`, `working`, `report`, `orders` | Same | OK | Three stage reports and final record |
| Raw evidence | `bench/results/mac-20261023` | Same | OK | Original-byte integrity manifests and commands |

## Quantitative Before/After Comparison

These are same-session path comparisons, not a historical version-to-version speedup. Median per-run CPU p50 in ms:

| Metric | Original | Owned JS | Owned Wasm |
|---|---|---|---|
| One animated Fox | 0.100 | 0.150 | 0.150 |
| 16 animated Foxes | 0.450 | 0.250 | 0.200 |
| One static Fox | 0.100 | 0.100 | 0.100 |
| One-Fox domain initialization | 0.900 | 2.550 | 6.600 |

Scaled ownership improves CPU on this Mac, but most benefit exists in JS. The extra 0.05 ms Wasm p50 difference is below the ~0.1 ms timer quantum; its paired ratios include regression. One-Fox A/A drift is 50%, and no useful original-size benefit is established. Frame intervals do not establish FPS gains. Full p95/p99, interval, copy/read, initialization and control results are in [the hardware report](../../docs/MAC_HARDWARE_REPORT.md).

## Verification Results

| Acceptance Criterion | Result |
|---|---|
| Preserve baseline/local work, qualify physical GPU | OK — separate worktree/branch from exact baseline; M4 Pro, macOS build, Chrome 155, ANGLE Metal captured |
| Reproduce synthetic correctness/hardware baseline first | OK — 14 views exact; complete 54-run reproduction after preserved failed attempt |
| Real licensed asset and all requested replay operations | OK within explicit subset — Fox pin/hash/license; play/pause/manual blend/stop recipe/root/camera/snapshot; 13 unsupported cases reject |
| Same visual work on original/owned JS/owned Wasm | OK — 132 checkpoints exact pixels, maximum world error 4.44e-16; raw quaternion-sign incompatibility explicitly documented |
| Repeated counterbalanced timing and A/A | OK — 84 render runs / 302,400 samples; 45 separate diagnostics; original-size/scaled/static controls; all source hashes match |
| Separate costs and preserve regressions/raw data | OK — p50/p95/p99, intervals, counters, startup and reads; 229 archive hashes verified after compressed reanalysis; failures retained |
| Reproducibility and regression checks | OK — source CI 27 steps; final infra 10 and browser resolution 2 tests; metadata smoke; docs/syntax checks |
| Related issue fulfillment | Partial by design — matrix covers #3–#5/#7–#11; no closure or full M5/M6 acceptance |

### Stage Verification Results

- [Stage 1](../working/task_m3_3_stage1.md): Mac qualification, pinned build/native checks, synthetic hardware evidence.
- [Stage 2](../working/task_m3_3_stage2.md): real asset migration, exact images/rotation equivalence, explicit rejection and preserved failure.
- [Stage 3](../working/task_m3_3_stage3.md): full phases, separate controls, lossless archive and final interpretation.

## Residual Risks and Follow-up Work

### Residual Risks

- One interactive Mac, uncontrolled background activity, coarse clock and no second-day session. Actual observed backend matters more than the availability of a local/cloud/Actions host.
- API is explicit and finite; events, automatic crossfade, arbitrary Bone identity/direct writes, raw quaternion sign continuity, CPU skinning/raycast/bounds and general glTF content are outside the accepted contract.
- Scaled rigs partly clip at the nearest edge equally in every variant. A single small model does not qualify representative workload coverage.
- Separate diagnostic upstream traversal can repeat work; buckets cannot be subtracted from main or treated as matched kernels. Fox GPU time, GC attribution and complete memory/thermal/power accounting remain unmeasured.
- Historical source manifests retain unused M0 options; report explains actual viewport and final metadata-only fix. Full script was syntax-checked; component commands were executed individually.

### Follow-up Candidates

Use the already open #3–#5/#7–#11 gates for a quiet repeated Mac/second hardware session, stable high-resolution timing, representative assets and broader authority/renderer contracts. No duplicate issue created. Persistent self-hosted runner registration remains separate.

## Approval Request to Task Requester

Original authorization covers this report, commits, push and draft PR submission. The requested draft is for review; merge, issue closure, publication and broader milestone acceptance are not performed. Final-head CI status is recorded in the PR, avoiding a report/CI commit loop.
