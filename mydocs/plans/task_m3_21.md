# Task #21 — Ownership status and pipeline preparation

Issue: [#21](https://github.com/postmelee/three.rust/issues/21)
Milestone: M3
Branch: codex/ownership-status-preparation
Start: 2026-10-23, Asia/Seoul

## Purpose and authorization

The requester explicitly asked to replace the coarse progress representation,
make Rust's continuous computation/state ownership visible, simplify README,
provide real progress history, integrate into main, and finish preparation before
the animation → transforms → palette attempt. This authorizes the implementation,
verification and main integration as a batch, including prerequisite PRs #1/#20.
It supersedes the adoption-only no-merge limit. It does not authorize a new Rust
animation port, paid GPU provisioning, invented evidence or npm publication.

## Design and document locations

| Artifact | Location | Reason |
|---|---|---|
| Short product introduction/status | README.md | Public entry point |
| Counting definitions, source inventory, history HTML/Markdown/JSON/SVG | docs/ | Existing approved public-document root; GitHub-renderable history link |
| Generator/extractor | tools/, scripts/ | Reproducible source analysis, no decorative fake cells |
| Pipeline contract/protocol/ADR | docs/, docs/adr/ | Durable implementation preparation and measured constraints |
| Workload/oracle and diagnostics | fixtures/pipeline, bench/pipeline*, tests/, bench/results/preparation-* | Executable preparation; historical data preserved |
| Plans/reports | mydocs/ | Hyper-Waterfall work records |

The coarse six-of-29 count cannot be expanded into hundreds of completed cells.
Extract real callable definitions and constructor state declarations from pinned
source. Conditional Rust computation does not imply Rust authority. Show the
present JS → Rust → JS boundary and the intended persistent Rust pipeline.
History preserves real observations and records incompatible counting schemes
separately; no backfilled progress line or fake historical snapshots.

## Stages

1. Source-derived status, distinct ownership legend, compact README and generated
   history. Verify source hashes, definitions, generator integrity and responsive
   browser rendering.
2. Prepare the next candidate: upstream call/data-flow audit, explicit provisional
   ownership/read/write/fallback contract, repeatable animation workloads and
   semantic oracle, diagnostic cost/volume capture and concrete go/no-go gates.
   Physical-GPU acceptance stays open if unavailable; preparation must explain
   exactly what can run next and what cannot yet be concluded.
3. Full local/CI verification, final report, reviewable PR and authorized integration
   of dependency branches plus this work into main. Verify actual main SHA/checks;
   close only implemented issues after merge. Keep historical branches/evidence.

## Verification

- Deterministic source inventory, source pin/hash checks and one tile per item.
- Generator/history unit tests, docs freshness/English checks, desktop/mobile UI.
- Upstream semantic oracle and deterministic workload rendering/profile diagnostics.
- Existing Rust/differential/type/browser/package/demo/bundle CI, actionlint.
- Empty historical bench/results diff (new preparation files are allowed).
- Exact merge heads, remote main state, CI and issue state verification.

## Risks and scope boundaries

Source definition counts measure a declared inventory, not work, compatibility or
speed. State field counts need careful ownership semantics; a Rust cache is not
authority. The candidate remains provisional until profiling and reuse decisions
satisfy the recorded gates. Main integration does not establish hardware speedup.
Public HTML can be served/exported; GitHub-renderable history works without
claiming a hosted Pages deployment.
