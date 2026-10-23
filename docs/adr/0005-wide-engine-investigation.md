# ADR 0005: test a wider Rust engine behind a compatible facade

Status: accepted research direction; implementation and product acceptance pending.

## Context

The requester explicitly asks to investigate more aggressively, including a complete
Rust rewrite behind public Three.js compatibility. The finite Fox ownership result
does not prove independent Rust value. Its small absolute cost also cannot rule out
benefit from a much wider CPU engine. Requiring that slice to qualify as a replacement
before any larger experiment would test the wrong hypothesis.

## Decision

Treat the full persistent CPU scene engine as the architectural destination under
investigation. Prototype a compatible identity/mutation/read facade and a prepared
render-pass boundary, retaining internal state through animation, transforms,
visibility, ordering and upload preparation. Test a finite wider boundary before
M6 release qualification; keep M7/M8 product acceptance gated. Profile real apps in
parallel as a workstream, not a claim that a local Mac session exists here.

Retain pinned WebGL materials/shaders initially for a controlled comparison, but
permit a finite Rust backend comparison when residual costs or adapter semantics
justify it. Do not commit to a one-to-one whole-repository translation. SIMD, workers,
precision changes and GPU-compute/backend changes are individually attributed axes.

Public compatibility includes identity, direct writes, synchronous reads, callbacks,
addons and package/type resolution, not just function names. Unsupported behavior
must be visible; algorithm/layout gains are compared with equivalent JS. Preserve
adoption-v1, old data and the simple Status presentation.

## Alternatives

- Keep optimizing only the current transform/rig bridge: useful control, too narrow
  to answer the engine hypothesis.
- Translate every Three.js class into Rust: retains much of the object layout and
  can add interop at every method; very large compatibility cost without a cost model.
- Replace WebGL with wgpu immediately: changes backend and shaders together with
  CPU language; not an interpretable language comparison.
- Drop compatibility and expose only explicit commands: technically simpler and
  remains a useful accelerator, but does not meet the requested replacement goal.

## Evidence and consequences

[Research and source audit](../RUST_ENGINE_STRATEGY.md) document exact code paths,
the new CPU boundary diagnostic, budgets, alternatives and experiment order. The
diagnostic is no-rendering synthetic cloud work, not a product acceptance test.
No new engine subsystem is implemented by this ADR. #7/#8/#15 remain open; #16/#17
remain future delivery gates. Future changes require the existing correctness,
performance and compatibility evidence before claiming replacement readiness.
