# ADR 0002 — Broad ownership is the engine hypothesis

Status: roadmap decision; next port selection pending M3 profiles and M4 review.
Date: 2026-10-22. Preserves ADR 0001 and all historical measurements.

## Context

The initial discussion, now supplied and read, targets a Rust scene evaluation
engine: persistent scene/animation state, transforms, bone palettes, visibility,
LOD, per-pass render lists and upload preparation. It recommends a coherent
animation-to-palette slice, a renderer input boundary, and validating reusable
implementations before building new code. It does not supply our own measurements.

M2 instead tests a narrow conservative facade: public JS properties are authoritative
and results are copied back. In the enlarged hierarchy diagnostic, synchronization
plus materialization averaged about 4.76 ms/frame versus 1.15 ms for the Rust-call
stage. Main full-path measurements regressed. These cloud/software-renderer results
neither validate nor disprove the full ownership hypothesis.

## Decision

Make broad state ownership the main M4–M5 hypothesis. M3 establishes hardware
baselines and workload profiles. M4 selects a complete useful pipeline, validates
reuse/license/build options, defines authoritative state, commands, read barriers,
callbacks, precision and renderer consumption, then fixes budgets before porting.
Build an equivalent optimized JS pipeline to separate structural and language gains.

Keep import-compatible facade and explicit-ownership APIs distinct. Do not discard
direct writes, identity or synchronous semantics silently. Keep renderer/materials
initially where practical; compare adapter and existing Rust renderer strategies
rather than assuming either is cheapest. Later M7 expands to full scene evaluation;
M8 evaluates residual backend costs. Neither is automatically authorized by a kernel win.

## Alternatives

- One-to-one translation: rejected as a performance or completion metric.
- Endless transform bridge tuning: rejected as the main direction; retain a bounded
  JS-matched control experiment.
- Immediate animation port: deferred until fresh workload costs support selection.
- Immediate full renderer rewrite: deferred pending reuse and integration assessment.
- Rejecting Rust based on M2: unsupported; M2 does not test broad ownership.

## Consequences

The first useful fast path may require an explicit API. If it wins while the
compatibility facade loses, report both and the migration burden. Prepared outputs
must replace actual JS renderer work, not precede the same work again. Multi-pass
rendering, custom callbacks and arbitrary JS property animation require explicit
contracts. A reproducible negative verdict can stop or narrow expansion.

No engine code or new hardware performance result accompanies this decision.
