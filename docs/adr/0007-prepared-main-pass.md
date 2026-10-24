# ADR 0007 — persistent topology and a prepared main pass

Status: selected for a bounded C3 experiment, before implementation/measurement.

C2 retained evaluated matrices but rebuilt JS traversal/operation lists and exposed
many intermediate reads. Its corrected hierarchy p50 was 37.01 ms against original
15.13 ms in cloud SwiftShader. Local real-app CPU profiles are still outstanding.

Keep a persistent numeric topology and dirty inputs, then evaluate consecutive
transform/visibility/order/per-draw-matrix stages in Rust. A matched JS engine uses
the same layout and precision. An optional pinned WebGL hook consumes those outputs
with existing shaders, materials and GPU resource updates. No wrapper delegates
native calculations to JS and no replacement step is recomputed for validation in
the timed path.

Start with ordinary Mesh main passes; preserve public snapshots and synchronous
partial operations. Rebuild topology on observed structural changes, not every
unchanged frame. Explicitly fall back for unsupported object/geometry/material,
callback, custom ordering or pass behavior. Retain shadow calculations in JS and
test interaction with the main pass; this does not port a shadow backend.

Rejected for this unit: 1:1 translation (does not fix the boundary), SIMD/workers
before amortizing preparation, a fresh GPU backend before useful CPU evidence, and
silently disabling unsupported visual/interactivity features. Borrow no claimed
third-party speedups. Existing source/license assessment remains background only.

The [task plan](../../mydocs/plans/task_m5_40.md) fixes thresholds, controls and
verification. A cloud result cannot qualify a real application or hardware GPU/FPS
improvement. Publish unfavorable results and keep all existing default routes.
