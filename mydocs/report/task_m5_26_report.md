# Task #26 — Final report

GitHub Issue: [#26](https://github.com/postmelee/three.rust/issues/26)

Milestone: M5 (finite experimental contribution; milestone remains open)

## Work Summary

Four implementation stages deliver persistent animation → object/bone transforms
→ Float32 palettes in Rust/Wasm, an algorithm/layout-matched JS backend and an
explicit command/read API. The retained WebGL renderer consumes prepared outputs.
The current continuation instruction authorized implementation and verification;
the earlier draft-PR preference and codex/ branch naming override generic workflow
examples. Historical M0–M2 evidence remains unchanged.

## Changed Files and Impact Area

| Path | Change | Impact |
|---|---|---|
| crates/scene-core/src/owned.rs | Persistent rig state, interpolation/blending/clocks/world/palette, bounded ABI | Actual Rust CPU ownership |
| packages/rthree/owned*.js, owned.d.ts | Descriptor validation, matched JS, Wasm lifetime, presentation adapter and public types | Separate explicit API; ordinary facade retained |
| fixtures/owned, tests/owned*, tests/package.mjs | Synthetic rendered workload, upstream/randomized/ABI/browser/package tests | Finite correctness and replaced-work proof |
| bench/owned*.mjs, bench/results/owned-* | Repeated comparison, separate read/copy diagnostic, raw archives and summaries | Reproducible cloud CPU evidence |
| docs/, tools/progress.py, demo/, .github/workflows/ci.yml | Contract/ADR/report, scoped ownership map, demo and CI artifact integration | Accurate public scope and local delivery |

## Document Location Verification

| Artifact | Planned location | Actual location | Result |
|---|---|---|---|
| Public contract/report/roadmap | docs/ | docs/OWNED_ANIMATION.md, OWNED_REPORT.md, PROJECT_PLAN.md | Matches task plan |
| Pre-port decision | docs/adr/ | docs/adr/0003-owned-animation-experiment.md | Committed before engine code |
| Raw evidence | bench/results/ | New owned-* directories | Historical data preserved |
| Work records | mydocs/ | plans/, working/, report/ | Matches existing convention |

## Quantitative Before/After Comparison

| Metric | Before | This finite increment |
|---|---|---|
| Animation/pose authority | Public JS mixer/Bones | Persistent explicit owned domain, command/snapshot boundary |
| 64-rig main CPU p50 (median across six runs) | Original 1.75 ms; old Wasm bridge 2.15 ms | Owned JS 1.55 ms; owned Wasm 1.05 ms |
| 64-rig frame interval p50 | Original 20.10 ms | Owned JS/Wasm 19.85 ms; no accepted FPS gain |
| Known source mappings | 1 scoped computation / 0 owned fields | 3 scoped computations / 12 logical owned fields; not whole methods or global API coverage |
| New raw experiments | None | 108 main runs / 12,960 frames; 30 diagnostic runs / 1,800 frames; separate smokes |

See the public report for paired ratios, all controls, tails and timer quantization.
Readback and architecture changes are not counted as language-only gains.

## Verification Results

| Acceptance criterion | Result and evidence |
|---|---|
| Pre-port scope/reuse/cost decision | ADR 0003 committed at 9966693 before JS/Rust; three pinned candidates compile for wasm32, logs archived; no candidate browser claim |
| Persistent matched backends | 8 Rust tests and fmt/clippy; 8 owned Node tests including seeded upstream differential, command atomicity, forced reads, stale handles, memory growth and Wasm failure/retry |
| Existing compatibility | 9 upstream differential tests, strict types, 25 original/facade/bridge/packed browser views across five scenes and callback checks |
| Rendered owned equivalence and bypass | 14 animated/static views with exact pixels and 2e-6 palette tolerance; roots/second camera/callback guards; poisoned JS computations and actual Wasm counters |
| Repeated evidence | Complete source-pinned main/diagnostic manifests and all samples; no filtering of regressions; reproducible run-level summarizer |
| Installable API | Fresh tarball consumer, strict exported types, core/addon identity, actual owned Wasm execution and bundled consumer |
| Public documents/status | Generation/freshness, 21 acyclic roadmap tasks, source extraction/Python and desktop/mobile checks, public-site subpath checks, actionlint |

Portable bundle completion and final local verification logs are preserved in
bench/results/owned-delivery-20261023. Remote CI is tracked on the draft PR; local
verification is not a substitute for a successful remote workflow.

### Stage Verification Results

- [Stage 1](../working/task_m5_26_stage1.md): fresh source/build audit and finite ADR.
- [Stage 2](../working/task_m5_26_stage2.md): matched JS and upstream oracle.
- [Stage 3](../working/task_m5_26_stage3.md): Rust, package and real renderer checks.
- [Stage 4](../working/task_m5_26_stage4.md): raw measurements, honest analysis and delivery.

## Residual Risks and Follow-up Work

No physical GPU, qualified timing A/A sessions, independent real-asset application
benchmark, candidate engine browser comparison or hardware product acceptance was
performed. Small-scene tail regressions and shared-host outliers remain in the data.
Unsupported events, additive/cubic tracks, arbitrary bindings, transparent sorting,
CPU skinning/raycast/bounds and ordinary object identity migration remain explicit.
Monotonic handle tombstones and Wasm memory high-water retention need churn testing.

Issues #3–#5 retain hardware/representative-profile work. #7–#11 and #15 retain their
broader selection, compatibility, pipeline and reuse gates; this prototype does not
close them or declare M3/M4/M5/M6 complete. The next useful work is representative
asset/interaction/readback profiling on a qualified dedicated desktop, followed by
a decision about expanding this same boundary. No paid provisioning is implied.

## Review and publication

Publish the requested draft PR on codex/owned-animation-pipeline for review. This
report requests review of the finite contract, boundary and evidence; it does not
self-approve main integration, close #26 or publish to npm. Public Pages remain at
the current main revision until a later reviewed merge/deployment.
