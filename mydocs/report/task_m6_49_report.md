# Task #49 final report — two-app candidate decision

GitHub Issue: [#49](https://github.com/postmelee/three.rust/issues/49)
Milestone: M6 — Product performance and release decision

## Work Summary

The five-stage investigation declines adoption of the measured candidate in native Three.js Editor and glTF Viewer, including intact Bistro content. It supplies source-bound attribution, one tested optimization experiment, preserved original/version controls, full raw comparisons and explicit failure boundaries. No useful complete-path or independent Rust performance benefit is established. The unproven single-node specialization is excluded from integration; its history and semantic tests remain. This completes a finite research decision, not the long-term Three.js replacement objective.

## Changed Files and Impact Area

| Path | Change Summary | Impact Area |
| --- | --- | --- |
| `scripts/apps/` and targeted `tests/` | Native setup, Viewer adapter, timing/profile/source accounting, content/transport gates and interrupted-capture classification | Reproducible application investigation |
| `tests/facade.mjs` | Five retained semantic cases from the single-node experiment | Force/alias/hierarchy/public-read regression protection |
| `bench/results/task49-*/` | Exact sources, original failures, profiles, raw callback samples, independent audits and notices | Evidence preservation; no large source asset redistribution |
| `docs/TWO_APP_CANDIDATE_REPORT.md` and affected references | Bounded adoption decision, compatibility gaps, measured boundaries and next costs | Public evidence and contract guidance |
| `mydocs/{plans,tech,working,report,orders}/` | Approved scope, prospective protocols, rejected alternatives and stage/final records | Task traceability |

The final runtime has no net source change from the integration base. The 33-line experimental specialization exists in immutable runtime85 and is explicitly removed before final correctness. There is no default engine change, npm publication, README speed claim or ownership/progress promotion.

## Document Location Verification

| Artifact | Planned Location | Actual Location | Result | Evidence |
| --- | --- | --- | --- | --- |
| Public app report and compatibility/performance guidance | `docs/` | `docs/` | OK | [Approved location judgment](../plans/task_m6_49.md#document-location-judgment) |
| Source/content research | `mydocs/tech/` | `mydocs/tech/task_m6_49_*` | OK | Same plan and Stage 1–3 records |
| Plans, stages and final report | `mydocs/{plans,working,report}/` | Same | OK | Five linked stages below |
| Immutable raw evidence and audits | Fresh `bench/results/task49-*` | Same | OK | Archive indexes and original/public/stored hashes |

## Quantitative Before/After Comparison

These are descriptive medians of balanced run p50 values under failed original A/A, not stable causal effect estimates. Different scenarios and callback boundaries are not pooled.

| Native workload | Three.js, ms | Matched JS, ms | Rust-Wasm, ms | Decision |
| --- | ---: | ---: | ---: | --- |
| Editor Robot Walking with shadows | 1.33000 | 2.70125 | 2.72500 | Decline candidate; continuous original stability fails |
| Viewer Robot Walking/grid | 0.47500 | 0.84125 | 0.83250 | Decline candidate; no useful absolute advantage |
| Viewer intact Bistro/default first clip | 7.90750 | 15.52625 | 16.14000 | Decline candidate; original A/A and Wasm repeat stability fail |

Bistro Wasm-minus-Three.js p50 is descriptively +8.23250 ms (+104.11%); Wasm-minus-matched-JS is +0.61375 ms (+3.95%). This is covered synchronous elapsed callback cost, potentially including driver waits, not measured CPU cycles or a proof of CPU-bound behavior. No FPS claim follows. Full p50/p95/p99, absolute/relative deltas, interval distributions, original bookends, block screens and controls are in the [public report](../../docs/TWO_APP_CANDIDATE_REPORT.md) and linked independent audits.

There are 196 full primary runs across the separately declared Editor, Viewer engine/migration and Bistro matrices, totaling 219,840 measured callback pairs/groups. Smoke remains tooling evidence. Every run is retained; no best-run selection or threshold relaxation occurs. Candidate runtime is `85e2c5d500edb0b92ea4ecb997087fded3fed45b`; historical9527, earlier6990, capture/preparation tool SHAs and final correctness96 remain distinct.

## Verification Results

| Acceptance Criterion | Result |
| --- | --- |
| Native candidate attribution | OK within declared scope: Editor source-aware weighted analysis; Viewer Robot attribution; Bistro strict weighted failures and separate counts-only method retained. Missing source/UI coverage is not zero cost. |
| One justified improvement | OK as a rejected experiment: selected preparation specialization tested against matched JS; no useful benefit demonstrated, excluded from final runtime; five semantic tests retained. |
| Independent Viewer and version control | OK within finite contract: preserved original r176, externalized r176, pure r186.1 and same-version JS/Wasm; strict required image/numeric/native-control checks pass. |
| Additional intact content | OK as an investigation: exact licenses/source/resources for Bistro, Chess and rejected nonconforming Tokyo; intact Bistro provides larger observed elapsed work. Editor texture failures and Chess uncertainty remain; no synthetic duplication or CPU-bound claim. |
| Both-app bounded decision | OK: decline measured candidate in both apps, with complete A/A/regression/unsupported records; exact effect size and broader qualification remain inconclusive. |
| Final runtime correctness | OK: locked build/native/JS/software/browser/package checks; fresh runtime96 headed native app checks and independent image/numeric audits. |
| Publication and CI | Local verification/review complete. Exact-head CI, issue reconciliation, merge and tested-tree equality are required and recorded in the PR integration record after publication. They are not claimed by this pre-publication report. |

The [Stage 5 record](../working/task_m6_49_stage5.md) lists executed commands and [final integration archive](../../bench/results/task49-final-integration-20261026/README.md) preserves logs, first failures and source identities. Final tooling infra passes 177/177 tests; the completeness fix has 38 targeted tests. Runtime96 Editor audit verifies 162 local checks / 149,328 numerical values / 32 cross-route image comparisons; Viewer verifies 55 A/A and 33 strict cross comparisons. Both audits independently decode 268 PNGs in total. Software/SwiftShader tests are distinguished from actual Mac Metal native-app checks.

Independent source review identified and resolved one P2 completion bug: missing planned runs or failed final source/AC gates could appear complete. Both analysis CLIs now retain useful per-run data while failing the incomplete overall capture. Existing captures and original analysis outputs are unchanged. The initial missing-Fox timing timeout, sandbox loopback failure, archival failures, profile failures, image mismatches and imports remain traceable; successful later checks do not erase them.

### Stage Verification Results

- [Stage 1](../working/task_m6_49_stage1.md): exact native candidate attribution, retained first classification failure and corrected source-bound analysis.
- [Stage 2](../working/task_m6_49_stage2.md): one matched JS/Wasm preparation experiment, semantics, new-SHA correctness and diagnostic result.
- [Stage 3](../working/task_m6_49_stage3.md): native Viewer integration and intact licensed content investigation with explicit unsupported/unstable outcomes.
- [Stage 4](../working/task_m6_49_stage4.md): complete primary matrices, independent raw arithmetic/source/oracle archives, failed stability and negative decisions.
- [Stage 5](../working/task_m6_49_stage5.md): runtime disposition, final native correctness, reviewed tool fix, publication and preservation gates.

## Residual Risks and Follow-up Work

### Residual Risks

Original A/A remains unstable; candidate render windows use fallback with paid public-matrix materialization. No stable Three.js advantage, independent Rust advantage, GPU/FPS improvement, startup/memory or sustained-use result is established. Bistro Editor has twelve texture Blob failures, Chess retains image/chooser/camera uncertainty, and negative CDP intervals keep weighted-profile failures. One Mac/Chrome/date cannot establish broader compatibility or product acceptance. Final runtime96 has correctness evidence but no primary performance measurement.

### Follow-up Candidates

Keep #4 open for prospective calibration of timing regimes without selecting favorable runs. Update #5 toward renderer state/submission, facade operation preparation and exact public-matrix consumers in Bistro, and exact bounds/skinning consumers in Editor. Retain renderer/palette reuse as a hypothesis subject to invalidation and material/callback semantics; low kernel observations do not justify a Rust-kernel rewrite first. UI follows measured evidence, not an unconditional ranking. #12/#13 retain broader hardware/browser, startup/memory, lifecycle, addons and content gates. Any new engine candidate needs an immutable SHA and fresh dedicated correctness/timing paths.

## Approval / Publication Contract

The existing finite-task authorization covers publication, reviewed merge and issue reconciliation. Publish a draft for exact-head CI, make it ready only after required checks pass, compare the merge tree to the tested head, then close #49. Broader issues remain open. Preserve the original checkout, historical research branches and raw-bearing worktrees; cleanup only unneeded publication artifacts. This report contains reusable project procedure and evidence, not personal session instructions.
