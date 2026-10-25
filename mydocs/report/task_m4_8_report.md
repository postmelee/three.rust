# Task #8 — C1 observable compatibility contract

Issue: https://github.com/postmelee/three.rust/issues/8. Milestone: M4.
Three finite C1 stages delivered; broader issue acceptance and merge remain open.

## Result

The next Rust facade now has executable requirements for observable identity,
direct writes, lazy/forced reads, hierarchy/events, exceptions, animation callbacks,
skeleton buffers and disposal. The same application operations run against pinned
upstream and three existing candidate routes in isolated Node/browser graphs.

| Area | Delivery / evidence |
|---|---|
| Public contract | [Matrix and C2 rules](../../docs/FACADE_CONTRACT.md); docs/ location matches the plan |
| Regression suite | 16 scenarios per route/environment; 128 executions and 96 differential comparisons |
| Rendering | Two-camera callback/matrix/pixel oracle plus existing five-scene regression suite |
| Packaging | Concurrent init/retry and mixed-mode rejection; NodeNext and Bundler consumer resolution |
| Reproducibility | [Raw archive](../../bench/results/compatibility-c1-20261023/README.md), clean candidate/source hashes, traces, images and checksums |
| CI | Contract command and artifacts wired into correctness workflow |
| Progress | Behavioral baseline documented; zero new Rust ownership mappings or product qualifications |

All checks in [stage 3](../working/task_m4_8_stage3.md) passed locally. Existing
Rust/runtime code and measured performance claims are unchanged. The parent docs
PR #35 passed remote CI run 39956531672; this task's final-head CI/review is tracked
in its own draft PR. No main merge is included.

## Constraints discovered and next unit

- Direct world reads can remain stale while a forced read updates only the required
  ancestors/target. Cached arrays need explicit reconciliation, not a hidden getter.
- Animation callbacks can see the preceding pose. Hierarchy callbacks can throw
  after mutations are committed; universal atomic batching would change behavior.
- r186 Object3D.dispose keeps the object attached/usable and leaves shared resources
  alone. Skeleton texture allocation can legitimately replace the palette array.
- Type declarations allow a nullable palette; the consumer narrows it explicitly.

C2 must implement stable identities, ordered mutation and selective materialization
over actual Rust authority, with matched JS and new fallback/lifetime/bypass tests.
Custom or unsupported domains need an explicit tested transition/rejection. C1's
passing inherited JS paths do not prove that C2 exists. Hardware profiling and app
selection continue separately; SwiftShader correctness is not speed evidence.
