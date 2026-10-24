# Task #40 implementation plan

Implement the approved finite C3 unit in four stages from [the plan](task_m5_40.md).

- Extend C2 only under prepared mode: cached validated root topology, dirty record
  queue, native retained operations and per-matrix revision barriers. General
  synchronous partial calls keep their existing selection semantics.
- Build a persistent prepared-pass record layout and f64 evaluator in Rust and JS.
  Preserve visibility/layers, group/material/depth ordering, conservative upstream
  sphere rules and matrix arithmetic. Validate all indices before mutation.
- Hash-guard WebGLRenderer integration. Feed prepared visible draw records into
  existing resources/materials/shaders; skip native-replaced project/sort/matrix
  work. Detect unsupported contracts and use upstream rendering explicitly.
- Test full C1 on both modes, targeted native/JS/upstream state and pass oracles,
  cached references, topology/callback fallback, multi-camera/shadow numeric and
  images, installed package/types and runnable demo. Extend CI with bounded smoke.
- Commit verified runtime, run fresh primary/diagnostic experiments, preserve
  failed attempts, then update concise public scope/results and progress together.

Commands: cargo test/fmt/clippy, npm test, test:facade, test:compatibility,
test:prepared (new), test:browser, test:package, test:progress, docs:check and
delivery tests. Full timing uses the plan's counts and separate fresh output paths.
Existing scoped baseline tests remain required, not replaced by a new microbench.
