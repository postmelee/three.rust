# Task #31 stage 1: Adoption policy

Issue #31; M6. Implementation plan: [task_m6_31_impl.md](../plans/task_m6_31_impl.md).

## Purpose and artifacts
PRODUCT_GOALS.md and ADR 0004 define the ultimate low-migration application replacement, a useful explicit accelerator before it, and a versioned prospective qualification profile. PROJECT_PLAN.md links the gates and corrects the now-outdated statement that no finite animation target has been measured. Existing milestones and historical decisions are retained.

## Decisions and verification
The profile combines relative and absolute p50/p95 savings (20%/1 ms vs Three.js; 10%/0.5 ms for recommending Rust vs matched JS), realistic independent applications, migration/behavior contracts, bounded regressions/startup/download/memory, and replicated hardware/browser evidence. These are initial product budgets, not industry standards or current measurement claims. Manual consistency review confirmed that the existing Fox result is not qualified retroactively. The gate inventory starts with four Early evidence and two Not yet entries, no Qualified entries.

## Scope and residual risk
No engine code, measurement archive or issue completion changed. Hardware cohort selection and acceptance remain future work. Explicit migration is useful earlier but cannot satisfy the replacement tier. If matched JS is the useful backend, record that decision rather than forcing Wasm as default.

## Next stage / authorization
The requester authorized goal-oriented README Status. Generate the same overview from the reviewed gate inventory while retaining detailed source ownership and its history.
