# Task #38 — C2 persistent transform facade

Issue: https://github.com/postmelee/three.rust/issues/38
Milestone: M5 — Integrated persistent CPU pipeline

The requester authorized continuing C2 in cloud while local work owns its Mac
baseline and application profiles. Start at C1 commit 7637881 in a separate
codex/persistent-facade checkout. Preserve all existing branches and raw evidence.
Publication is a stacked draft PR; main integration remains separate.

## Scope and decision

Implement optional facade-wasm and facade-js routes with persistent evaluated
local/world matrices, tracked public inputs, indexed batched operations and lazy
stable matrix-array snapshots. Keep the original routes and ordinary renderer.
Use C1's observable contract; explicit fallback must retain override and array
replacement behavior. Rust executes the calculation; JS controls/topology remain
publicly authoritative. This does not complete ordinary animation or render-list
ownership. See [ADR 0006](../../docs/adr/0006-persistent-facade.md).

## Stages

1. Native indexed arena and matched JS evaluator; constructor/update hooks and
   facade routes. Test lifecycle, dirty inputs, force, cached arrays and fallback.
2. Six-route semantic and actual browser/image checks, isolated package/types,
   displaced-JS proof and CI. Commit verified sources before measurement.
3. Repeated CPU-boundary and whole-browser experiments with original, compatible,
   matched JS and Wasm controls. Preserve raw samples and regressions. Update
   contract, scoped progress, report and draft PR together.

## Measurement decision, before results

Measure no-read, sparse-read and all-read demand; static, sparse and dense writes;
and an actual rendered scene plus small/static and GPU-heavy controls. Use balanced
engine order, explicit warmup/sample/repetition counts, p50/p95/p99 and frame
intervals. Keep diagnostic copy/call/timing instrumentation separate from primary
timing. Cloud results are CPU/software-renderer experiments, not hardware/FPS
qualification. Do not replace the default engine on the basis of this experiment.

## Document location judgment

| Material | Location | Reason |
|---|---|---|
| Design decision, public facade contract and reproducible results | docs/ and docs/adr/ | Stable contributor/application references |
| Executable oracles and measurement tools | tests/ and bench/ | Enforce the contract and preserve raw evidence |
| Plan, stage reports and work allocation | mydocs/ | Public task history, separate from product guidance |

No personal local-session prompt is published. Existing simple progress HTML,
tables and definitions remain unchanged in presentation. Only verified scoped
authority can change its evidence, never an implied percentage of replacement.
