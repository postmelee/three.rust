# Task #8 — C1 observable compatibility contract

Issue: https://github.com/postmelee/three.rust/issues/8
Milestone: M4 — Rust ownership and compatibility contract

## Purpose and authorization

The requester explicitly authorized continuing cloud work while the local session
owns Mac measurements and application profiling. Implement C1 from the reviewed
execution sequence: an executable observable contract before widening Rust state
authority. This authorizes the planned implementation, checks and draft PR; personal
session instructions stay in chat. Issue #8 remains open for broader acceptance.

## Baseline and scope

Use separate codex/facade-contract checkout at 15ae9d3, stacked on documentation
PR #35. Preserve all existing worktrees and hardware results. The local measurement
baseline remains 9527a04; this task does not modify it or require a new Mac run.

Included: reusable upstream semantic scenarios, independent original/JS/Wasm/packed-JS
execution, Node and real-browser validation, explicit support/fallback/rejection
matrix, future C2 authority/barrier rules, CI and evidence artifacts. If the oracle
exposes an existing supported-path defect, fix it with a focused regression case.

Excluded: new animation/render ownership, performance claims, SIMD/workers, wholesale
renderer changes, main merges, npm publication and personal local-session prompts.

## Design

Observable identity, stale versus forced reads, hierarchy event order, listener
mutation/exceptions, animation event timing, skeleton buffers and lifecycle are
contract requirements. Assert independent expected behavior in the upstream run,
then compare candidate traces. Separate module graphs prevent backend mixing.
Record exact source hashes/version. Keep unsupported behaviors explicit rather than
changing expectations to make a future Rust facade pass. A passed existing JS path
is not evidence of new Rust authority.

## Document location judgment

| Artifact | Audience / status | Location | Alternative | Reason |
|---|---|---|---|---|
| Compatibility matrix and future facade requirements | Contributors/users; scoped public contract | docs/FACADE_CONTRACT.md with existing compatibility entry link | mydocs/tech | Implementation and application migration need one stable reference |
| Executable semantic cases and comparison runners | Contributors; regression tests | tests/ | docs/ | Tests execute the contract against pinned upstream |
| Plans/stage/report | Workers/reviewers; task record | mydocs/ | docs/ | Keep execution history out of product references |

## Stages and checks

1. Inspect pinned upstream and implement portable assertion/trace cases plus isolated
   Node comparison. Run all four modes; verify actual Wasm calls on eligible cases.
2. Run the same semantic cases in Chromium, exercise renderer callbacks and package
   boundaries, publish the contract matrix and connect CI artifacts.
3. Run relevant native/differential/type/package/browser checks, docs freshness and
   link checks; publish evidence/report and stacked draft PR. Update issue status
   only for supplied criteria, without advancing source ownership/product gates.

## Risks

Raw array aliases cannot be intercepted by an ordinary accessor after they escape.
Callbacks can observe partial state or throw; a compatible facade must not silently
adopt the explicit-owned API's atomic-command rules. Upstream array identity may
legitimately change during texture allocation. Cloud browser correctness supplies
no physical GPU or application-performance qualification.
