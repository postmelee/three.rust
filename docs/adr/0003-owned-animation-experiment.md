# ADR 0003: bounded owned animation-to-palette experiment

Status: accepted for Task #26's experimental implementation only; M4 hardware target
acceptance and M6 product verdict remain open. Written before new engine code.

## Evidence and decision

Task #21's recorded 64-rig CPU diagnostic averages 0.431 ms animation, 0.132 ms
transforms and 0.104 ms palettes upstream, versus 1.040 ms total for the current
Wasm bridge. Final useful palettes are 98,304 bytes per tick; all intermediate
world matrices alone would be 196,608 bytes. These shared-cloud measurements
justify a finite ownership experiment, not a desktop speedup prediction.

Fresh candidate revisions compile for wasm32 as recorded in
[the reuse audit](../../bench/results/owned-reuse-20261023/README.md). Candidate
renderer/scene/precision/event contracts are not interchangeable with this bounded
r186 comparison. Keep WebGL/materials/shaders, use our existing f64 math semantics,
and build a descriptor-based CPU domain. Do not copy candidate code or claim that
its full browser path was tested. Reuse acceptance #15 stays open.

Keep immutable clips plus persistent action times/weights, base/local poses,
parent indices, root/world matrices and Float32 palettes in one domain. Evaluate
clocks → interpolation → blending → transforms → palettes per tick. Transfer only
commands and final render buffers; materialize intermediate poses on explicit reads.
First implement equivalent typed-array JS, then Rust with the same arithmetic/order.

## Bounded contract and alternatives

The [owned API contract](../OWNED_ANIMATION.md) fixes finite supported semantics.
It is a separate opt-in API, not an AnimationMixer replacement or import-only win.
Ordinary rthree objects and their fallback/callback behavior remain unchanged.

Rejected for this experiment: scalar Wasm math calls (boundary overhead), expanding
the public transform scanner alone (observed regressions), moving WebGL/shaders
(confounds CPU ownership), copying a full existing Rust scene/renderer (different
binding and backend contracts), and pretending events can be deferred compatibly.
Visibility/render lists remain candidates for later representative profiles.

## Predeclared protocol and decision limits

Compare original, existing compatibility paths where applicable, owned JS and owned
Wasm using identical rigs, clips, renderer, pixels, simulation ticks and draw counts.
Main runs: at least 5 repeats, 60 warmup and 120 sample frames, small and scaled
rig counts; rotate engine order and keep all tails. CPU-only and boundary/read
attribution are separate diagnostics. Record exact source hashes and software GPU.
Use per-run p50/p95/p99, run-level summaries and frame intervals, not kernel FPS.

No cloud result accepts a hardware product gain. For a provisional CPU signal,
require a useful absolute cost above timer granularity, consistency across repeats,
and whole-path gains over both original and matched JS. A greater-than-5% small
control regression must be reported, not hidden. Hardware acceptance will require
qualified A/A noise (meaningful gain above max(5%, twice A/A variability)), repeated
sessions and the existing M6 criteria. Stop expansion or narrow the contract when
copy/read costs consume the gain. A negative result still completes this experiment.

## Sequencing clarification

Earlier plans gated all implementation on hardware target acceptance. The current
request resumes cloud development; this bounded prototype now supplies evidence
for that decision while #3–#5, #7 and #15 retain their broader exit gates. It does
not mark M3/M4/M5 complete. No paid runner or publication is implied.
