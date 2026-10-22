# three.rust — revised milestones

Updated 2026-10-22. The goal is honest browser product performance evidence for
Rust-owned persistent CPU engine state, while preserving a bounded JS API.
The original bootstrap architecture was a hypothesis. New measurements and
ADR 0001 chose transform subtrees; animation, skeleton, culling and render lists
remain future candidates, not completed work.

| Milestone | Implemented scope / evidence |
|---|---|
| M0 | Fresh fixed upstream examples/source hashes, five-repeat profiling, A/A noise check, V8 sampling, source/reuse review, target-selection ADR committed as c458d73 before port implementation |
| M1 | Local ESM package, A original / B JS compatibility / C Wasm / D packed-JS, explicit init, one core/addon graph, NodeNext + packed consumer verification, executable demo |
| M2 | Persistent Rust f64 transform arena, actual Object3D/WebGL integration, original JS math bypass proof, native + upstream differential + browser image/numeric checks, repeat-controlled measurements and preserved regressions |
| M3 (not started) | Decide from full frame evidence whether to reduce bridge scans, move broader CPU ownership, or stop expansion. Do not expand merely because a kernel is faster |
| Hardware validation (outstanding) | Foreground desktop GPU, longer duration, browser cross-checks, mobile, startup cache control and memory/GC instrumentation |

Read docs/REPORT.md for actual results and outstanding checks. M0–M2 completion
means the bounded experiment is implemented and measured, not that the 20%
product speedup hypothesis succeeded or Three.js compatibility is complete.

Long-term candidates: animation/property binding, object/bone transforms,
visibility, list sorting, upload buffers. The GPU shader workload remains.
Small/static, GPU-oriented and unfavorable variants must continue in the suite.
No publication to npm or unverified package-name availability claim.
