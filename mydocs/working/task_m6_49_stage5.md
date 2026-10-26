# Task #49 Stage 5 — bounded decisions and integration gates

GitHub Issue: [#49](https://github.com/postmelee/three.rust/issues/49)
Implementation plan: [task_m6_49_impl.md](../plans/task_m6_49_impl.md)
Stage: 5

## Stage Purpose

Decide the tested candidate's adoption in two independent applications, retain all unfavorable and unsupported outcomes, and verify the runtime selected for integration. A completed investigation does not qualify product performance. Publication-head CI and merge-tree equality are remote gates recorded in the PR after this report's commit; neither is claimed in advance.

## Artifacts

| Artifact | Result |
| --- | --- |
| [Public application report](../../docs/TWO_APP_CANDIDATE_REPORT.md) | Decline the measured candidate in Editor and Viewer, including intact Bistro; stable exact effect sizes remain inconclusive |
| `docs/COMPATIBILITY.md`, `PERFORMANCE.md`, `MAC_APP_SCREEN.md`, `README.md` | Bound current app/content coverage and index new evidence without rewriting historical results |
| `c4781c79819ce1a3a279fba240851a03de5bc381` | Exclude the unproven 33-line single-node runtime specialization; retain 107 semantic-test lines / five targeted cases |
| `96b0b4c0e7d55c22c1f2c22955356b9822e67d22` | Frozen final-runtime validation; separate native chooser rejection-handling correction |
| `7600d911bebac638605da993d38639617f04b964` | Reviewed profile-completeness correction: validate the planned run matrix and final capture/source/AC gates while retaining valid per-run attribution |
| [Final integration archive](../../bench/results/task49-final-integration-20261026/README.md) | Native Editor/Viewer results, independent audits, build/software tests, original failures, source hashes and reproduction records |
| [Final report](../report/task_m6_49_report.md) | Acceptance, quantitative comparison, residual risks and publication contract |

## Body Change Scope / Lossless Preservation

The measured runtime remains immutable `85e2c5d500edb0b92ea4ecb997087fded3fed45b`. The final facade returns to the earlier generic source; excluding extra code is not a proven speedup or causal regression fix. Runtime96 native app checks are separate observations with no primary timing claim. Final publication changes after runtime96 affect tools, tests and evidence, not the runtime or lockfiles. Historical baseline9527, original source/distributions, candidate checkouts, all raw attempts and exact versions remain.

The source review found one P2 defect: an interrupted profile capture could omit a run entry and let the surviving subset appear complete; final capture gates were also ignored by analysis. The fix checks declared scenario × round × engine coverage, duplicate/unexpected tuples, final status, source identity and actual before/after AC records. Both weighted and counts-only CLIs retain valid raw attribution but exit nonzero for incomplete captures. Existing raw datasets and analyses remain at their original tool SHAs. Independent re-review found no remaining actionable issue in this fix or the reviewed live source scope.

## Verification Results

Clean runtime96 completed `npm ci`, `npm run fixtures`, `npm run build`, `npm test`, `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings`. Node 24.15.0 and locked Rust 1.90.0 were used. The initial infra suite passed 170 tests; final tooling at7600 passes 177 tests. The completeness fix separately passes 38 targeted tests and four syntax checks. Documentation generation checks pass without changing the README performance table or ownership progress.

Software/headless correctness commands passed: `test:facade`, `test:prepared`, `test:compatibility`, `test:browser`, `test:package`, `test:demo`, `test:browser-path`, `test:timing`, `test:owned`, `test:fox`, `test:pipeline`, `test:gpu-guard`, `test:progress`, `bundle:status`, `test:status`, `bundle:demo`, `test:bundle`, and `npm pack ./packages/rthree` to a new local output. The package was not published to npm. The initial timing test timed out before the pinned Fox asset was fetched; its log remains and the subsequent asset-backed rerun passes. A separate publication infra run failed on sandbox loopback `listen EPERM`; the unchanged-source rerun with loopback permitted passes. These failures are not silently removed or classified as engine regressions.

Actual headed Chrome/Metal native application verification on runtime96 is separate from software tests:

- Editor: all six original/JS/Wasm check/UI commands pass. Independent audit verifies 162 route-local checks, 24 fixed A/A pairs, 32 cross-route images, 40 semantic comparisons and 149,328 strict numerical values with maximum error zero; four declared bounded paused-time exceptions remain.
- Viewer: five routes × eleven states pass. Independent audit verifies 55 within-route A/A, all 33 required same-version comparisons, eleven non-strict upstream migration comparisons and 220 PNG/readPixels identities. Migration differences remain, maximum numeric difference `0.00006866455078125`.
- Combined audits decode 268 PNGs, preserve 783 capture input files unchanged and bind their helpers/preparation/runtime source. AC and source integrity pass before/after. These Robot suites do not clear larger-content failures or qualify performance.

Editor audit SHA-256: `3f420fda6a21818da9762eda0256a831cd96e0fbad07c98ce9977f76fc99c04a`.
Viewer audit SHA-256: `fb2efcfbe37d431a532247aaffb84271d582f89c906c68a1337df01b754c0992`.

The final public archive preserves 1,236 logical files in 715 blobs (17,607,966 stored bytes), with 756 physical files. Two public-only verifier runs and eighteen storage/privacy tests pass. All 297 captured PNG payloads remain byte-preserved; the 268 fixed-oracle PNGs are independently decoded/readPixels-verified, while 29 diagnostic/UI screenshots receive no extra comparison claim. Index SHA-256 is `562d6571120f4dcb4b49bccc3f148d0ad9e11624cc7b2cb32119bbba83adc11e`; audit is `7a8236eec4c62bd39c2ccc282eb153cdab24bc5d5a77644dfe991d8c3d85ff0c`. Its first archive-only attempt rejected a temporary path in a status-test log; that original attempt, partial index and hash-preserving move remain. Only the declared temporary-root field is normalized in the fresh successful archive.

Upstream notice bytes and exact historical audit-source whitespace are preserved rather than reformatted. The branch whitespace check passes outside those explicit evidence exceptions: `licenses/**` within archives and the exact preserved Bistro `counts_audit.py`, `profile_audit.py` and `numeric_verify.py` sources. Git inclusion is checked independently of local archive presence.

## Residual Risks

All continuous Editor/Robot Viewer original A/A groups fail, and Bistro original A/A and Wasm repeat checks fail. No stable Three.js or independent Rust advantage is established. Zero prepared render passes remain in measured candidate windows. Larger-content Editor import/chooser/camera and Viewer Chess image uncertainty remain; CDP negative intervals retain strict weighted failures. Native wall-clock phases, uncalibrated instrumentation, GPU work and unresolved renderer coverage limit interpretation. Second day/device/browser, long lifecycle, startup/memory and broad compatibility remain unperformed.

## Impact on Integration

Update #4/#5/#12/#13 with this finite contribution, leaving their broader acceptance gates open. Require correctness/status CI on the exact publication head, verify the merge tree against that tested head and close #49 only after merge. Retain raw-bearing and immutable input worktrees. Remove only unneeded publication artifacts; do not change the original user checkout or historical research branches. The PR's final integration comment records CI URLs, full tested/merge SHAs and tree equality without relabeling measurements.

## Approval / Continuation Status

The approved finite continuation covers publication, verified merge and preservation-aware cleanup. No additional product scope, npm release or performance qualification is included.
