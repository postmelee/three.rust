# Task #38 — C2 persistent transform facade

Issue: [#38](https://github.com/postmelee/three.rust/issues/38). Milestone: M5.
Four recorded stages, including the measured correction and final evidence stage.

## Work summary

Optional facade JS/Wasm entries now preserve evaluated local/world matrices in
persistent indexed state. Public input tracking, lazy stable array snapshots and
ordered updates have executable compatibility and fallback tests. This is a finite
state-boundary implementation, **not a speedup over Three.js**. Keep it opt-in.

## Changed files and impact

| Area | Delivered behavior |
|---|---|
| crates/scene-core/src/facade.rs | Validated batched updates, persistent slots and generation/lifetime guards |
| packages/rthree facade state/kernel/entries | Tracked writes, selective reads, matched JS control and explicit initialization |
| scripts/build.mjs | Pinned constructor/update hooks and bounded read-only matrix consumer integration |
| tests/, bench/ and CI | Six-route semantics, real renderer comparisons, package checks and separate timing/diagnostics |
| docs/ and README | Public contract, negative performance report, scoped progress/history and next decision |

The [plan's location judgment](../plans/task_m5_38.md#document-location-judgment)
is met: public contracts/evidence are in docs/, raw executable evidence in bench/,
and task records in mydocs/. No personal local-session instruction is included.

## Quantitative result

| Measure | Initial candidate | Corrected candidate |
|---|---:|---:|
| Hierarchy original CPU p50 | 16.64 ms | 15.13 ms |
| Hierarchy matched facade JS CPU p50 | 172.61 ms | 51.63 ms |
| Hierarchy facade Wasm CPU p50 | 169.23 ms | 37.01 ms |
| Repeated evidence per candidate | 18,000 boundary samples + 9,720 rendered frames | Same protocol, independent series |

Cloud/SwiftShader elapsed CPU time, median of six runs' quantiles. The corrected
facade still loses to original on every measured scene's six paired p50 runs.
Full tails, controls, source hashes and limitations are in the
[public report](../../docs/FACADE_REPORT.md) and
[archive](../../bench/results/facade-c2-20261023/README.md).

## Acceptance verification

| Criterion | Result |
|---|---|
| Persistent native and matched JS transitions | Pass: 11 native tests and 16 focused facade checks |
| Observable C1 behavior | Pass: 16 cases × six routes × two environments, including callbacks and exceptions |
| Actual execution and displaced work | Pass: Wasm counters, throwing JS compose/multiply guards, zero output copy on no-read updates |
| Browser renderer integration | Pass: two-camera oracle plus five scenes / 35 pages with exact image and numeric comparisons |
| Repeated unfavorable evidence | Pass: initial and corrected full series retained, diagnostic profiles separate |
| Packaging and delivery | Pass: isolated install/types/addons, demo/status bundles and browser delivery checks |
| Documentation and scoped progress | Pass: generated-content, English, link and desktop/mobile checks; no product gate advanced |

Stage records: [1](../working/task_m5_38_stage1.md),
[2](../working/task_m5_38_stage2.md), [3](../working/task_m5_38_stage3.md),
[4](../working/task_m5_38_stage4.md).
Runtime candidate CI [39973619061](https://github.com/postmelee/three.rust/actions/runs/39973619061)
passes on dabcd69. The later reporting head is tracked separately in the draft PR.

## Remaining work and review scope

- Ordinary inputs/topology, animation, skeleton palettes and render preparation
  still involve JS. C2 owns only the declared evaluated matrix state.
- Full JS traversal and command rebuilding remain expensive; public proxy reads
  retain measurable cost. Reflection, cloning and custom override limits apply.
- C3 should combine persistent topology/dirty commands with prepared consumers.
  Select additional stages from original real-application profiles, then compare
  algorithm-matched JS and Rust through the complete path.
- Physical-Mac profiling remains separate; no new hardware result, application
  qualification, startup/memory budget or general Rust advantage is established.

Publish a stacked draft PR against codex/facade-contract under the requester's
continuation authorization. Review should focus on public alias behavior, retained
state/lifecycle, source-hook guards and the negative verdict. Keep #38 open until
review/merge; this contribution does not complete umbrella issues #8–#11.
