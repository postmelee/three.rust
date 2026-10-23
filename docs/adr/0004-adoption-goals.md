# ADR 0004: Track adoption readiness, not source translation, as the destination

Status: Accepted as a prospective planning policy; no qualification granted.
Task: #31. Profile: adoption-v1, 2026-10-23. Builds on ADRs 0002 and 0003.

## Context
The requester distinguishes the existing 16-Fox CPU saving from the ultimate
usefulness of replacing Three.js. The first physical-Mac result supports bounded
ownership, while most gain exists in matched JS and the additional Wasm difference
is below the captured clock increment. The source map correctly explains ownership
but cannot answer whether an application should migrate.

## Decision
Use [PRODUCT_GOALS](../PRODUCT_GOALS.md) as the public adoption contract. Keep an
explicit accelerator and an import/init/config-only application replacement as
distinct release levels. Require useful absolute and relative whole-path savings,
a justified backend choice, a reviewed migration/behavior contract, bounded total
cost and replicated hardware/browser evidence. The initial 20%/1 ms original and
10%/0.5 ms matched-JS targets are prospective product choices, not measured facts.
Record their fixed workload and noise context before qualification; version any
later budget changes with rationale.

README Status connects the existing ownership map to six declared adoption gates,
each with current evidence, next requirement and an honest status. Use plain HTML
and Markdown tables. Preserve the existing diagram, source tables, Definitions and
evidence section and history; do not introduce a card dashboard. Do not create a percentage of product completion,
retroactively reinterpret history, or qualify a gate from an existing file alone.

## Alternatives and consequences
A 100% Rust translation target would reward code volume without proving useful
latency, migration or maintenance outcomes. A kernel/FPS-only target can hide copies,
reads, refresh limits and operational regressions. A percentage-only threshold can
promote a tiny sub-millisecond win; an absolute-only target can mask a negligible
fraction of a very heavy frame. The combined targets prevent both misleading cases.

Full ecosystem parity before any release would delay learning; an explicit limited
accelerator can be useful earlier, but must never be labeled an import-only replacement.
If matched JS wins after costs, do not force a Rust default for architectural purity.
A narrower support claim or a backend change is a valid outcome.

This decision changes documentation/status and future acceptance priorities. It does
not expand engine semantics, claim a new benchmark, or mark M3–M8 complete. The current
Fox case cannot meet the new absolute application gate; preserve it as prior evidence.
