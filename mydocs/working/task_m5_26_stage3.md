# Task #26 — Stage 3: Rust ownership and renderer consumption

Implemented a dependency-free f64 Rust domain, bounded raw ABI and shared Wasm
instance wrapper. Persistent action clocks, TRS/base/hierarchy/world state and
Float32 palettes stay in Rust. The JS control uses matching layout/algorithms.
A separate package export and strict types expose explicit commands/reads/lifetime.

The r186 adapter consumes prepared padded palettes through dedicated presentation
meshes. It retains renderer/material/shader code and does not create authoritative
JS Bones. Opaque depth-writing materials and an infinite conservative sphere with
a fixed sort center avoid unexpected CPU skinning during render-list sorting.
Transparent sorting, CPU bounds/raycast and mixer event compatibility are excluded.
This constraint came from an initial browser failure and is explicit in the contract.

Passed: 8 Rust tests, fmt/clippy; 9 existing upstream differential tests; 8 owned
Node tests (including seeded multi-track interpolation/blend comparisons, invalid
atomic commands, forced reads, release/stale handles, memory growth and module
failure/retry); strict types and fresh tarball consumer. Browser verification covers
14 original A/A/facade/bridge/packed/owned JS/owned Wasm views across animated and
static controls, exact pixels, numeric palettes, root commands, a second camera,
repeated renders, callback reads/mutation/reentrancy rejection and exception recovery.
Throwing upstream AnimationMixer/Bone/Skeleton guards prove replaced JS work absent.
The static nonblank check counts foreground pixels rather than assuming many colors.

Raw browser summaries/screenshots and measured source hashes are preserved in
bench/results/owned-validation-20261023. This is correctness evidence, not hardware
performance. Next: committed benchmark harness, repeated complete-path measurements,
read/copy diagnostics, package/demo/CI/progress integration and final report.
