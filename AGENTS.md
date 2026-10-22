# three.rust development contract

Read docs/PROJECT_PLAN.md, docs/COMPATIBILITY.md, docs/BENCHMARKS.md and docs/CLOUD_SETUP.md before implementation. The latest user priority is desktop-first public Three.js examples, not mandatory giraffe integration.

## Architecture

- Preserve the tested Three.js JavaScript API while moving persistent scene data and bulk CPU computation into Rust/Wasm.
- External JS objects need not mirror Rust class layouts. Keep small scalar math in JS unless measurement justifies a boundary crossing.
- Start with one measured subsystem and an actual browser renderer integration. A Rust-to-JS Three.js binding or standalone math microbenchmark is not the requested port.
- Three.js 0.186.1 is the initial comparison pin. Keep the same renderer/backend, assets, camera, quality and work on both sides.
- Avoid global prototype monkey patches and duplicated computation. Document any version-specific integration hook and fallback.

## Evidence

- Complete M0 measurement and write a target-selection ADR before choosing the Rust port.
- Preserve raw samples, environment metadata, upstream source hashes, adaptation diffs and reproduction commands.
- Include small/static and GPU-heavy controls and unfavorable results. Distinguish object API, opt-in batch API and kernels.
- Include JS/Wasm synchronization, copying and result materialization in product timing.
- Cloud software-renderer measurements are not real desktop GPU performance. Label unavailable GPU data and hardware validation honestly.
- Never fabricate metrics or claim a milestone merely because a file exists. Correctness includes hierarchy semantics, synchronous reads, explicit force updates and numerical outputs.
- Preserve third-party license notices. Do not copy giraffe photographs or uncertain-license models into this repository.

## Workflow

- Use codex/ branch names for implementation. Keep package and toolchain versions reproducible with lockfiles.
- Provide install/build/test/benchmark commands and CI using those commands.
- Do not publish to npm automatically; package-name availability is unverified. A local installable rthree alpha and GitHub implementation are in scope.
- Report commands actually executed and unresolved limitations. When a network or environment capability is unavailable, preserve completed work and identify the exact blocker.
