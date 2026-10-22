# Task #2 — Ownership roadmap and delivery infrastructure

GitHub Issue: [#2](https://github.com/postmelee/three.rust/issues/2)
Milestone: M3 — Evidence and project infrastructure

## Purpose

Restore the distinction between a broad Rust-owned CPU pipeline hypothesis and
the measured M2 transform bridge. Install the requested workflow, make public
status understandable, and make correctness and hardware experiments executable
through GitHub Actions without inventing performance success.

## Background

PR #1 implements and measures M0–M2. The public JS state remains authoritative;
the persistent Rust arena alone does not remove scanning/materialization. The
task requester now explicitly authorizes Hyper-Waterfall adoption, English
documents, a progress visual, GitHub milestones/issues and CI/CD configuration.
The linked initial ChatGPT thread cannot be read: read_thread is unavailable;
the share page exposes its title but no body, and direct HTTP returns 403.
The requester's stated broad-ownership intent and current repository evidence
are available. No content is attributed to the unread thread.

## Scope

Included: pinned framework adoption; English report/generators; evidence-linked
progress map; ownership roadmap and GitHub tasks; correctness CI, GPU workflow
configuration, portable demo/package artifacts and reproducibility guidance.

Excluded: new engine ports, paid infrastructure, cloud account changes, npm
publication, PR merging, or claims of physical GPU validation.

## Design Direction

- Preserve M0–M2 historical evidence and bounded compatibility.
- Make M3 measurement infrastructure, M4 ownership contract, M5 integrated
  pipeline implementation and M6 product verdict separate gates.
- Preserve a same-algorithm JS control and ordinary Three.js baseline.
- Hardware workflow rejects software/unknown renderers and runs only after
  explicit runner configuration; ordinary PR CI remains software correctness.
- Use codex/ownership-roadmap and a draft stacked PR against the existing M0–M2
  branch. The task requester previously required codex/ branches and draft PRs.

## Document Location Judgment

| Files | Classification | Audience | Selected location | Alternative | Reason |
|---|---|---|---|---|---|
| Plan, architecture, CI guide, report | Public project docs | Contributors/users | Existing docs/ | mydocs/tech | Stable project contract and evidence belong together |
| Ownership decision | Public ADR | Contributors | Existing docs/adr/ | mydocs/working | Durable architectural rationale |
| Progress data and rendered visual | Public status | Users | docs/progress.json, docs/assets/ | Remote badge service | Reviewable versioned states without network dependency |
| Task plan/reports | Work artifacts | Maintainers/agents | mydocs/ | docs/ | Framework work-memory separation |

This confirms the existing docs/ root for this subsequent product-doc task;
the preceding adoption-only commit did not select or relocate project docs.

## Expected Changed Files

docs/{PROJECT_PLAN,REPORT,ARCHITECTURE,CI}.md, docs/adr/, docs/roadmap.json,
docs/progress.json, docs/assets/, README.md, bench/{report,diagnostics,run}.mjs,
scripts/, tests/, package.json, .github/workflows/, mydocs/ task artifacts.

## Tentative Stages

1. Roadmap, English evidence report and progress visual.
2. Correctness, GPU measurement guard and artifact delivery automation.
3. GitHub milestone synchronization, remote verification and final report.

## Verification Plan

Validate generated docs/visuals and source evidence; test benchmark configuration
and hardware guards; run existing Rust/differential/types/browser/package/demo
checks; smoke only for harness validation; verify remote CI and actual issue
milestone associations. Do not repeat the historical full performance run when
engine code is unchanged. Preserve all historical raw files.

## Risks

Unread original chat; no exposed hardware GPU; hosted T4 requires paid org setup;
public self-hosted execution must not accept arbitrary unreviewed PR code;
milestone API is absent in the connector and requires repository Actions.

## Authorization

The latest user message explicitly instructs judgment followed by these three
workstreams and GitHub task creation. It follows the concrete adoption review
already presented in this conversation. Treat this batch as authorized; do not
invent separate retrospective approvals. Future engine implementation and
changes to scope retain normal Hyper-Waterfall decision gates. The framework
payload was installed first in f43cd58 and tracked immediately afterward by #2.
