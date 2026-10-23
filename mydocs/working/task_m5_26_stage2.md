# Task #26 — Stage 2: matched owned JavaScript reference

Added a descriptor/command ABI validator, independent typed-array animation core,
explicit create/command/step/snapshot/dispose facade and fixture-only descriptor
conversion. The core retains action/pose/hierarchy/world/palette state. It does not
call Three.js animation or math. Snapshot arrays are copies; failed command batches
are atomic; unsupported fields and track/loop modes reject before mutation.

`node --test tests/owned.mjs` passed four tests, including 12 seeded randomized
multi-property clip cases compared with actual three@0.186.1, 100-tick playback/
reparent/root comparisons, forced reads, invalid input, snapshots and release.
Quaternion and world/palette tolerance is 2e-6 absolute/relative. Rust creation and
renderer integration are next; no Wasm or browser result is claimed at this stage.
