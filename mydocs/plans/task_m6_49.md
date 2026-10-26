# Task #49: attributable costs and a two-app candidate decision

GitHub Issue: [#49](https://github.com/postmelee/three.rust/issues/49)  
Milestone: M6 — Product performance and release decision

## Purpose

Explain the current candidate's complete-path overhead in native Editor, implement one evidence-selected improvement, and decide its bounded adoption in Editor and glTF Viewer. Investigate real higher-CPU public content in addition to the existing small Robot scene. A negative or inconclusive decision is valid; an unsupported path must remain visible.

## Background

Task #46 and PR #48 retain exact source pins, failed A/A conditions and negative native Editor costs. All timed candidate render passes fell back. Counters measure paid materialization, not CPU attribution. Original profiles used a different Editor playback/selection setup and cannot attribute the E3 candidate regression. Viewer still bundles r176; candidate is r186.1.

References: `docs/PROJECT_PLAN.md`, `COMPATIBILITY.md`, `BENCHMARKS.md`, `CLOUD_SETUP.md`, `ARCHITECTURE.md`, `PRODUCT_GOALS.md`, `MAC_APP_SCREEN.md`, and #4/#5/#12/#13. Historical baseline `9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7` and epoch candidate `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb` remain immutable. Integration base is `a5742d9a641eb73b65d2b04ef8d99f21877f84c8`.

## Scope

### Included

- Native E3 root-selected Walking/shadow original, matched-JS and Wasm profiles with exact served-source attribution and instrumentation oracles.
- Evidence-selected optimization, same algorithm/layout in JS, synchronous reads and invalidation/callback tests.
- Original r176 Viewer preservation, pure r186.1 migration control and same-version JS/Wasm integration with one core identity.
- Real publicly licensed higher-CPU contents, exact version/license/asset pins, feature contracts and observed cost classifications. Do not infer CPU-bound status from node/vertex counts alone.
- Fresh sequential hardware measurements with correctness, A/A, tails, controls, source hashes and failures.
- Bounded per-app adoption decision, public report, review, exact-head CI and PR integration; existing broad issue reconciliation.

### Excluded

- Rewriting historical datasets, lowering adoption-v1 after seeing results, deleting native features, global prototype patches, new GPU backend, npm publication or broad release claims.
- Model duplication to manufacture app eligibility; approximate bounds as an equivalent control; counting every native render pass as redundant.
- Treating one Mac/day/browser as complete G1–G6 qualification.

## Design Direction

1. Reuse the Task #46 native setup; distinguish the earlier harness-driven E2 workload. Profile tooling remains separate from engine changes and primary timing.
2. Match served URL, byte hash and source location. Preserve missing/unknown/self/inclusive samples and Wasm function mapping evidence. Nested inclusive costs are not additive.
3. Renderer/palette reuse, exact bounds/public-matrix consumption and UI are hypotheses, reordered by profiles. Start the optimization with a cost/contract decision before source implementation.
4. Preserve r176 Viewer. Compare candidate engines against pure r186.1 to separate engine effect from version effect. Preserve decoders, environments, auxiliary renderer, GUI, animation, morphs and controls.
5. Preserve complete app workloads and select additional contents before comparing candidate gains. Keep low-headroom, static and high-raster controls and rejected assets.
6. New engine/tool candidates require full committed SHAs and dedicated output paths. Build, profiling, correctness and primary timing run sequentially; no concurrent heavy work during captures.

## Document Location Judgment

Existing `docs/README.md` establishes `docs/` as the public documentation root.

| File | Classification | Audience | Selected location | Alternative | Reason |
|---|---|---|---|---|---|
| New candidate/app report and affected compatibility/architecture/protocol references | Public evidence/contracts | Users and contributors | `docs/` | `mydocs/manual/` | Preserve official documentation convention; manuals are workflow policy |
| Plans, stage/final reports | Task records | Maintainers | `mydocs/plans`, `working`, `report` | `docs/` | Issue-specific execution evidence |
| Content/source and cost-selection research | Exploratory research | Maintainers | `mydocs/tech/task_m6_49_*` | `docs/` | Preserve alternatives without promoting unverified contracts |
| Raw captures and reproducible source overlays | Measurement evidence | Reviewers | Fresh `bench/results/task49-*` | Existing datasets | Separate exact pins and failures; no overwrite |

The selected locations and bounded implementation follow the approved continuation. Personal/session directives are not repository artifacts.

## Expected Changed Files

New/modified: `scripts/apps` shared native setup/profile/source verifier, Viewer reproduction/adaptation tools; bounded `packages/rthree` / `scripts/build.mjs` / `crates` changes only if selected by evidence; meaningful `tests`; fresh `bench/results/task49-*`; public app/evidence references. Root README claims/progress require verified evidence and are not advanced by preparation.

Task artifacts: `mydocs/orders/20261026.md`, `task_m6_49.md`, `_impl.md`, `_stage{N}.md`, `_report.md` and dated source/cost research with the same task prefix.

## Tentative Stages

1. **Native candidate attribution:** shared scenario, source checks, profile smoke/oracles and repeated hardware profiles; cost/coverage diagnosis.
2. **Measured optimization:** select one cost boundary, matched JS/Wasm implementation and semantic/regression verification; freeze candidate.
3. **Second app and larger content:** Viewer version controls, candidate integration, real-content provenance and feature/oracle checks. Read-only research can precede Stage 2; implementation and captures remain separately attributed.
4. **Complete-path screen:** predeclared per-app scenarios, controls, A/A/CPU tails/frame intervals with fresh candidate pins; negative/inconclusive outcomes retained.
5. **Decision and integration:** public/raw evidence audit, independent review, issue reconciliation, exact-head CI, reviewed PR merge and preservation-aware cleanup.

## Verification Plan

- Source/overlay and sampling accounting tests; fixed image/numeric parity before profiles; clean committed tooling/candidate checks; actual Metal GPU and AC observations.
- Optimization tests for direct/aliased writes, force updates, hierarchy, callbacks, multiple passes/cameras, skeleton/morph/bounds, memory growth/release as affected by the change.
- Viewer core identity and loader/decoder pins, native animation/morph/camera/material/environment controls and original-version delta records.
- Predeclare useful CPU boundaries and stability/noise rules before full timing. Keep profiler data separate. Apply adoption-v1 as written; no portfolio average hides failed scenarios.
- Appropriate locked build/native/JS/browser/package tests and docs checks; raw-data independent audit; no broad acceptance from smoke or source inventories.
- Clean publication tree, `git diff --check`, exact-head CI and merge-tree verification.

## Risks

- Current fallback and Proxy/materialization overhead may dominate and require a compatibility-sensitive boundary; profiles must discriminate before choosing a fix.
- r176→r186 visual/API changes can confound candidate effects. Use a pure version control and keep original version.
- Additional content may prove GPU-heavy, too small, unsupported or ambiguously licensed; preserve rejection and select from real workloads without artificial inflation.
- A/A may remain unstable. Report an inconclusive effect size and bounded correctness/coverage decision instead of a speed claim.

## Approval

The finite continuation covers the stages, issue updates, implementation, review and integration. New product-scope decisions or incompatible tradeoffs require a separate decision; routine verification and evidence-led ranking remain within scope.
