# Rust engine direction

Status: research direction under [ADR 0005](adr/0005-wide-engine-investigation.md).
A finite explicit animation-to-palette domain exists. A compatible full CPU engine,
prepared-pass consumer, SIMD/worker variants and replacement renderer remain work.

## Target boundary

```text
Three.js-compatible objects and calls
  -> stable JS facade: identity, ordered writes, synchronous reads and callbacks
  -> persistent Rust: animation -> transforms -> visibility -> sorting -> buffers
  -> prepared-pass consumer -> browser graphics API -> GPU
```

The facade must preserve observable behavior, not just names and signatures.
Current `rthree/owned` is an explicit API; it does not replace ordinary AnimationMixer
semantics through an import change.

## Implementation order

| Unit | Required result |
|---|---|
| Compatible facade | Defined object/array identity, mutation authority and synchronous read/event semantics; upstream differential tests |
| Wider Rust evaluation | Prepared transforms, bounds/visibility, ordering and upload spans; renderer skips the replaced JS calculations |
| Rust-specific experiments | Scalar/SIMD and later worker comparisons with matching JS algorithms, layout, precision and complete boundary costs |
| Backend decision | Compare a finite Rust renderer only if measured residual costs justify it; evaluate WebGL/WebGPU changes separately |

Finite wider experiments may proceed alongside real-app profiling. They do not need
Fox to qualify as a replacement first. Product acceptance still uses the unchanged
[adoption goals](PRODUCT_GOALS.md); the [project plan](PROJECT_PLAN.md) defines milestones.

## Evidence and limits

- [Physical Mac](MAC_HARDWARE_REPORT.md): 16 Foxes showed 0.45 / 0.25 / 0.20 ms CPU
  p50 for Three.js / owned JS / owned Wasm. Independent useful Rust benefit remains
  unproven; small cases did not establish improvement.
- [Cloud boundary diagnostic](../bench/results/ownership-boundary-20261023/README.md):
  retained synthetic 64 × 96 rig evaluation was 2.4809 ms JS / 1.2341 ms Wasm;
  batched commands plus full snapshots raised Wasm to 2.2027 ms. These are
  block-average CPU ticks with no rendering, not frame percentiles or app speedup.
- Full Rust rendering still invokes browser GPU APIs. Language changes do not remove
  shader work. Existing Three.js instancing/batching must be included as controls.
- SIMD precision, worker scheduling, synchronous barriers, startup, memory and
  unsupported fallbacks need their own correctness and cost evidence.

The [detailed research](../mydocs/tech/task_m4_7_engine-research.md) retains source
analysis, alternatives and the explanatory cost model. [Source pins and hashes](ownership-source-audit.json)
remain public. Neither document claims the proposed engine is implemented.
