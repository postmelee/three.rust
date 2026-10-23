# Task #2 — Implementation plan

Task plan: [task_m3_2.md](task_m3_2.md)
GitHub Issue: [#2](https://github.com/postmelee/three.rust/issues/2)
Milestone: M3

## Stage Overview

| Stage | Output | Verification |
|---|---|---|
| 1 | Ownership plan/ADR, English report, generated progress SVG, task definitions | JSON/schema checks, deterministic regeneration, git diff --check |
| 2 | GPU guard/harness configuration, correctness CI, artifact packaging, roadmap sync workflow | Unit tests for guards/sync, existing engine tests, browser tests, software rejection, bundle server smoke |
| 3 | Remote milestones/issues, CI evidence, stage/final reports and draft PR | Actual remote API state and workflow results; clean git status |

## Document Location Check

All public artifacts stay under README.md and existing docs/; work records stay
under mydocs/. The historical bench/results trees are immutable for this task.

## Stage 1

Define M3–M8 (expanded after reading the supplied original discussion), dependencies, measurable acceptance criteria, migration/API tracks
and stop/pivot gates. Translate prose in report generators and output. Generate
an SVG from explicit states rather than a fabricated total port percentage.
Check regenerated report numbers against preserved JSON.

Verification: npm run docs:check; git diff --check.
Commit: Task #2 Stage 1: define ownership roadmap and English evidence status.

## Stage 2

Add GPU execution options without forced software flags in hardware mode,
fail-closed renderer validation, fresh artifact paths, bounded workflow inputs,
trusted runner controls, read-only CI permissions, and downloadable portable
demo/local package. Add idempotent milestone synchronization with issues:write
only in its explicit job. No npm or hosted site publishing.

Verification: npm run test:infra; npm run build; npm test; npm run test:browser;
npm run test:package; npm run test:demo; npm run bench:smoke;
npm run bundle:demo; git diff --check.
Commit: Task #2 Stage 2: automate guarded hardware experiments and delivery.

## Stage 3

Push the codex/ branch; confirm roadmap sync created/associated milestones and
issues; inspect fresh CI logs. Record hardware execution as outstanding. Write
stage/final reports, update the daily board and create/update the stacked draft
PR with SHA-pinned work-document links.

Verification: remote workflow success and issue milestone state; git diff --check;
git status --short. Fix failures within scope and preserve their explanation.
Commit: Task #2 Stage 3 + final report: record infrastructure verification.

## Dependencies and authorization

Stages execute in the listed order within the explicitly authorized batch in
task_m3_2.md. Future Rust pipeline implementation is not part of this batch.
