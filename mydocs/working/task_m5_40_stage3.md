# Task #40 stage 3 — complete-path comparison

Issue: [#40](https://github.com/postmelee/three.rust/issues/40).
Candidate: `066ddbaa3d538e95126a46c9203b550613bf3d3d`; baseline C2
`10be41f79f6a8b894b9170eb32f00f131f188247`. Cloud owns this source unit.

All affected source3 native/differential/types, legacy facade, C3, eight-route
contract, five-fixture images, installed package and demo checks passed. Source2
also passed the unchanged owned/pipeline/timing-policy and complete portable bundle
suite. The C3-only queue correction is verified by its red/green forced-GC test.
Correctness hashes are reconciled with the clean measured source in the archive.

Executed the unchanged plan: 36 primary boundary runs / 18,000 ticks, 180 primary
render runs / 16,200 frames; six routes and all five scenes. Diagnostic runs and
CPU sampling followed separately. No builds/tests/profiling ran during primary
measurement. All final manifests are complete and clean; original and candidate
final render-work counts match. Earlier interrupted results remain separate.

Hierarchy CPU p50: original 17.87 ms, C2 Wasm 47.76 ms, C3 JS 42.73 ms, C3 Wasm
37.78 ms. C3 improves C2 but loses to original in every p50 pair for every scene.
Neither experimental performance screen passes. Small/static tails and fallback
regressions remain. See [report](../../docs/PREPARED_REPORT.md) and
[archive](../../bench/results/prepared-c3-20261024/).

The prepared path reduces rebuilt commands from 308,140 to 84 bytes per hierarchy
transition; it also adds final draw-matrix output copies. Instrumented synchronization,
observation, handoff and renderer costs remain material. Do not infer a full-path
speedup from lower bytes or native evaluator timings. A sampling profile is diagnostic,
not an exact decomposition. Physical GPU and real-app gates remain open.

Continue to documentation/progress and stacked draft publication under the C3
instruction. Default entry, main, existing PRs and local source ownership stay intact.
