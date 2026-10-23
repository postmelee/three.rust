# Task #7 — investigate a broader Rust engine boundary

GitHub Issue: [#7](https://github.com/postmelee/three.rust/issues/7)
Milestone: M4 — Rust ownership and compatibility contract

## Purpose and authorization
The requester asks for a more aggressive investigation, including a complete Rust
engine behind a compatible public Three.js API if worthwhile. This authorizes this
finite research, executable diagnostic and recommendation. It does not establish
that a rewrite is faster or authorize claiming new hardware evidence.

## Background
Read the current plan, compatibility, architecture, benchmark/setup and Mac report.
Main remains b5a0fc3; PRs #30/#32 are open. Use a separate codex/ownership-research
worktree stacked on #32 at fa64d49, preserving all prior data and worktrees.
Reuse the open pipeline issue #7; this increment also informs #8/#15/#16 and does
not close their broader gates.

## Scope and design
Audit actual r186 and current Rust/bridge sources. Compare a compatibility facade,
a prepared frame-plan boundary, full backend rewrite, SIMD, workers and GPU compute.
Add an isolated browser CPU diagnostic for existing owned code: retained state,
batched versus fragmented equivalent commands, and full synchronous snapshots.
Keep rendering out of this diagnostic and label it accordingly. Check numerical
agreement and record raw block timings, environment, warmup, repetition and hashes.
Do not alter runtime implementations, the public progress layout, old evidence or
qualified statuses. A complete engine implementation is outside this investigation.

## Document location judgment
Public architecture research and a prospective decision belong in docs/ and
docs/adr/, the existing approved documentation root. Raw diagnostic evidence belongs
in bench/results/; the reproducible driver in bench/. Task records stay in mydocs/.
No new documentation hierarchy or UI is needed.

## Stages
1. Source audit and runnable diagnostic; commit before measuring.
2. Execute correctness and repeated cloud CPU diagnostic; inspect boundary scaling.
3. Publish decision, experiments and roadmap sequencing; verify docs, preserve
   progress/history artifacts, push a stacked draft PR and update issue #7.

## Verification
Run existing build for an exact binary; diagnostic asserts matched command outcomes,
JS/Wasm numeric agreement and Wasm execution, records source hashes and fresh output.
Run docs:check and git diff --check. No complete-engine test suite or hardware gain
is claimed for a research-only change. Mark browser/reuse gaps explicitly.

## Risks
A microbenchmark cannot rank whole applications. Wider ownership can conflict with
immediate JS reads/callbacks and cached references. JS receives shared layout/algorithm
improvements as a control. Full renderer ownership does not bypass browser GPU APIs.
