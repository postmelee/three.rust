# Task #46: first real-application hardware performance verdict

GitHub Issue: [#46](https://github.com/postmelee/three.rust/issues/46)
Milestone: M6 — Product performance and release decision

## Purpose and background

Establish a reproducible comparison condition, measure the complete prepared-engine path, and reach the first feature-preserving real-application verdict. Existing #4/#5/#12/#13 remain broader acceptance tracks. The exact-9527 Mac capture is complete but contains sustained timing regimes. C3 is slower than original in cloud measurements; the epoch guard passes correctness but has no whole-path hardware result. Original app profiles identify useful work but do not establish product-sized CPU headroom.

## Scope

Include reviewed integration of research/evidence dependencies; focused A/A diagnostics; original/pre-change C3/epoch-guard JS/Wasm whole-path comparisons; both app requirements and a selected realistic first-app integration. Preserve all work, failures, exact SHAs and actual rendering. A concrete unsupported-path or negative architectural verdict is valid evidence; it must not masquerade as completed compatibility or a speed gain.

Exclude automatic npm publication, broad G1–G6 qualification, a general renderer rewrite, SIMD/workers without a new cost-based choice, and arbitrary workload inflation. Keep historical raw worktrees and immutable source pins. A new candidate always gets a fresh result path.

## Design direction

- Preserve stage ancestry with merge commits. Combine engine head 6990fd92f61a031c8c2ba7a8282cfb63684e6dfb, app head 3b564fb1bd3d34efb564f930da23e405471c0905 and archive head 1010048a8a81395f62ee60cc4d3aed19fe700c95 in one reviewed integration. Resolve conflicts by preserving both behaviors and run combined CI before main integration.
- Historical A/A diagnostics run against 9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7 in its preserved checkout; external diagnostic drivers must record their own hash separately. New instrumentation changes the diagnostic condition, never the old baseline.
- Run only one browser experiment at a time. No builds, profiles or other heavy agent work overlap primary timing. Diagnose before expanding timed matrices.
- Keep version/backend/precision, public aliases, forced/selective updates, callbacks, picking and visual work explicit. Apply algorithm changes to the matched JS reference as well.
- Maintain adoption-v1 targets; do not tune acceptance or exclusions after observing results.

## Document location judgment

| Files | Classification | Location and reason |
|---|---|---|
| Task plan, stage results, verdict | Research coordination/evidence | mydocs/plans, mydocs/working, mydocs/report: established task artifacts |
| Raw samples, manifests, images | Reproducible evidence | Fresh bench/results directories with hashes; local originals retained |
| Affected engine/app contract | Public integration contract | Existing docs/ pages, only when behavior changes and after reading them |
| Protocol code | Measurement tooling | bench/ and scripts/apps; separate commits from engine changes |

No personal session instructions or prompts are published. Product status and ownership counts only change with the specific gate's evidence, never merely because integration succeeds.

## Stages

1. Integrate reviewed dependencies, record original PR bases/heads/CI, resolve overlapping server/tests/boards, and verify combined CI before a merge commit to main. Update issues without closing broad gates.
2. Diagnose all-route A/A regimes with focused experiments and predeclare a usable stability screen. Preserve counterexamples; do not repeatedly run the full historical matrix without a discriminating question.
3. Measure original/C3/epoch-guard JS/Wasm whole-path hardware cost and controls at fixed SHAs. Report CPU p50/p95/p99, intervals and absolute/relative differences; separate read/renderer diagnostics.
4. Quantify original-app headroom and required-feature/fallback gaps. Select one realistic target; preserve the second app as a compatibility requirement. Integrate the candidate without dropping required features, then check correctness and complete-path performance.
5. Publish the first-app positive/negative/unsupported verdict, source/asset/binary pins, raw evidence and remaining cross-device/browser/day gates; review/merge completed units and update issue state accurately.

## Verification and risks

Stage 1: combined npm test, facade/prepared/compatibility/package/infra/docs suites and relevant browser/server tests; exact-head CI and ancestry checks. Later commands and per-experiment parameters are frozen in the implementation plan before capture. Correctness precedes timing; fresh output paths and allowlisted environment metadata are mandatory. A/A multimodality, mismatched app versions, fallback-only apps and insufficient realistic CPU headroom are first-class outcomes, not exclusions. Two original apps use different Three.js pins; changes of version require a separate adaptation/control.

## Execution decision

Proceed through the approved finite scope, with issue and PR updates at verified boundaries. Escalate substantial architecture/product choices with the supporting evidence. No repeated approval checkpoint is inferred for routine steps within this continuation.
