# Task #40 — C3 persistent topology and prepared passes

Issue: [#40](https://github.com/postmelee/three.rust/issues/40). Milestone: M5.
The requester authorized C3 in this thread. Work on codex/prepared-pass, a separate
checkout of C2 10be41f. Publish a stacked draft against codex/persistent-facade;
preserve local PR #36 and all prior sources/results. Main integration is separate.

## Purpose and scope

C2's negative result motivates eliminating per-frame JS tree/operation rebuilding
and consuming a consecutive prepared render slice. Implement persistent topology,
dirty input synchronization, transforms, sphere visibility, default ordering and
model-view/normal matrices, then connect them to pinned WebGL rendering. Keep
ordinary JS objects and an equivalent packed JS evaluator. Use optional entries.

Support a declared ordinary-Mesh main-pass subset first. Special objects, custom
callbacks/sorts, transmission, unsupported geometry and passes must explicitly use
the original renderer path. Shadow rendering may remain upstream; validate its
interaction with the prepared main pass and a second camera. Do not remove features
from a representative app to force it into the supported subset.

Local original-app profiles remain unavailable. This is the finite architecture
experiment permitted by ADR 0005, not a newly established product bottleneck or
M7/M8 completion. Ordinary animation, skinning, LOD, XR, SIMD, workers and a new
GPU backend are excluded from native expansion in this unit.

## Document location judgment

| Material | Location | Reason |
|---|---|---|
| Public contract, source-hook decision, report | docs/ and docs/adr/ | Contributor/application reference |
| Executable checks and raw results | tests/ and bench/ | Reproducible evidence |
| Plans, stage/final reports | mydocs/ | Task history; no personal session prompts |

Keep the current simple progress page. New tiles require actual native execution
and authority evidence; useful performance and replacement qualification remain
separate. Public prose is English.

## Stages and verification

1. Persistent topology/dirty synchronization and matched evaluators. Native and
   randomized observable differential tests; cached arrays, hierarchy events,
   overrides, force, release/reuse and memory growth.
2. Native/matched prepared pass and pinned WebGL consumer. Culling/order/matrix
   oracle, actual two-camera/shadow images, fallback and displaced-JS proof.
3. Package/types/demo/CI; complete legacy + new correctness checks. Commit source
   before fresh repeated whole-path experiments and separate diagnostic profiles.
4. Archive results including regressions; update public docs, scoped progress,
   final report and draft PR. No hardware claim from cloud CPU/SwiftShader.

## Predeclared decision

Compare original, C2 and prepared JS/Wasm on hierarchy, small/static and shader
controls with equal simulation/work. Before primary timing, also include original-size
interactive cubes and the one-Soldier fallback scene; this prevents a favorable
hierarchy-only interpretation. Use original, compatibility JS, C2 JS/Wasm and C3
prepared JS/Wasm (six routes). Six rotating repeats, 30 warmup/90 samples;
separate 10/20 diagnostics. Boundary tests use 40/100 and six repeats. Primary
timing excludes diagnostics and profiling; preserve run-level p50/p95/p99 and
intervals, source/binary hashes and all attempts. Fresh paths only.

An experimental useful cloud result needs at least 20% and 1 ms p50/p95 saving
versus original on a large CPU workload, consistent across paired runs. Report
regressions above max(5%, 0.2 ms) on controls. Independent Rust value needs at least
10% and 0.5 ms over the matched JS design. These are experiment decisions, not
application qualification: physical hardware, original-app profiles and all
adoption-v1 release gates still apply. Failure is evidence; do not move thresholds.

## Risks

Proxy observation costs may remain dominant. Native sorting and matrix precision
must match upstream. Callbacks can mutate or reenter rendering, and shadow passes
can overwrite per-object matrices. Prefer a tested pass fallback over silently
changing behavior. Do not duplicate replaced JS computation to make tests pass.
