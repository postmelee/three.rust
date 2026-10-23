# Task #26 — Owned animation pipeline experiment

Issue: [#26](https://github.com/postmelee/three.rust/issues/26) · M5

## Purpose, authorization and scope

The requester asks to resume planned porting. Continue through finite contract,
matched JS, Rust implementation, renderer tests, measurements and PR under that
instruction. Keep codex/ naming and English artifacts. Do not infer physical GPU
availability or mark the broader M3/M4/M6 evidence gates complete.

Build an explicit ownership API for immutable rig/clip descriptors, persistent
normal-blended TRS animation, repeat and clamped-once clocks, world transforms and
Float32 palettes. Commands and snapshots are explicit. This does not replace the
ordinary AnimationMixer API or acquire existing mutable Bone objects silently.
Use the same algorithms/state in optimized JS and Rust, then compare both to
upstream Three.js. Reject unsupported inputs instead of silently changing semantics.

## Design and document location judgment

Public contract/experiment findings belong in docs/, the pre-port decision in
docs/adr/, pinned reuse/build evidence and raw measurements in new bench/results/
directories. Implementation belongs in crates/scene-core and packages/rthree;
standalone workload in fixtures/owned; checks in tests/ and scripts/; workflow in
.github/workflows. Plans/reports remain in mydocs/. These extend the established
locations rather than moving historical evidence or adding public process clutter.

## Stages and verification

1. Fresh source/build reuse audit; finite contract, measured cost model and
   experimental ADR committed before engine changes. Hardware acceptance remains
   open; this prototype supplies evidence for selecting a larger boundary.
2. Matched owned JS pipeline and upstream numeric oracle; validate input/commands,
   interpolation/blending/looping, hierarchy, snapshots and lifecycle.
3. Equivalent persistent Rust kernel/ABI, types and WebGL palette consumer; test
   Rust, randomized upstream/JS differential, memory growth and stale handles,
   rejection semantics, real browser images and replaced-work bypass.
4. Repeated CPU/full-render comparisons with raw metadata, copy/read attribution,
   controls and honest report; CI/package/demo/progress integration and PR.

## Risks and boundaries

No claim of full mixer/events/addon compatibility, general speedup or one-to-one
translation. No paid runner or npm publication. Float64 computation and Float32
track inputs/palettes match the pinned upstream baseline. Unknown semantics fail
before state mutation. Hardware and representative real-asset acceptance remain
separate from this bounded synthetic experiment. Preserve old engine paths/data.
