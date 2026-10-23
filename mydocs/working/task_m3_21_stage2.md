# Task #21 — Stage 2: pipeline preparation

Issue: [#21](https://github.com/postmelee/three.rust/issues/21)
Plan: [implementation plan](../plans/task_m3_21_impl.md)

## Purpose and artifacts

Prepare the leading continuous-animation pipeline without claiming a new port.

| Artifacts | Change |
|---|---|
| docs/PIPELINE_PREPARATION.md | Audited dispatch, provisional authority/batch/read/precision/callback/renderer contract and explicit gates |
| fixtures/pipeline/, scripts/pipeline-audit.mjs | Asset-free synthetic rigs, shared application across four engines, pinned source hashes |
| tests/pipeline-oracle.mjs, tests/pipeline-browser.mjs | Seven upstream semantic oracles; deterministic real-render palette/image comparison |
| bench/pipeline*.mjs, bench/results/preparation-* | Separate CPU-only/full-render diagnostics, raw samples, environment and summaries |
| docs/PIPELINE_DIAGNOSTIC.md | Quantization, software renderer, regressions, boundary sizes and honest next decision |
| docs/roadmap.json, CI/bundle scripts | Issue #21 association, automatic checks and runnable exported fixture |

## Preservation and verification

Existing engine code and historical M0–M2 raw data are unchanged. The new workload
uses original project-generated cylinders, not an asset copied from Soldier.
It is explicitly synthetic; the original public example remains an independent
fixture. Candidate Rust engine reuse/build review remains #15, not falsely closed.

Executed `npm run test:pipeline`, `npm run docs:check`, `git diff --check`:
7 semantic tests and A/A plus A/B/C/D browser comparisons passed; exact pixels and
palette agreement, two draws, nonblank rendering, source hashes checked. A test
setup initially reset a fade by calling setEffectiveWeight after crossFadeTo;
ordering was corrected before passing, consistent with upstream behavior.

CPU diagnostic: 18 corrected runs × 60 samples, warmup 30. Full render: 24 runs ×
30 samples, warmup 10. The initial 18-run CPU diagnostic is also retained, with
its unused viewport metadata error documented and original runner source hashed.
The corrected manifest records actual viewport/canvas. All corrected measured
file hashes match the committed artifacts; no raw samples were edited or trimmed.

## Observations and residual risks

At 64 rigs, CPU-only mean is 0.667 ms upstream versus 1.040 ms current Wasm bridge.
Full render medians cluster at 1.0–1.1 ms for 16 rigs with noisy tails; no ranking
or product benefit follows. Actual renderer is SwiftShader; /dev/dri is absent.
Target selection still needs physical-GPU baselines, representative real workloads,
reuse audit and an accepted contract/ADR. Persistent ownership is not implemented.

The preparation is runnable. The next candidate implementation should first create
the equivalent owned-JS reference after selection gates, then Rust and an actual
palette-consumption bypass. Events occur before binding apply; a post-tick event
queue and a fabricated skeleton.frame flag would break upstream behavior.

## Next stage and authorization

Run remaining integrated browser/package/bundle checks and exact-head remote CI,
then integrate into main under the requester's explicit authorization. PR #1 has
already been merged at ce9f6aad6a772755733fb98bdabb36fd7b169380 after its exact-head
CI passed. PR #20 is retargeted and ready; no future gate is marked complete.
