# Task #49 independent cost selection review

## Scope and evidence identity

This records the selected Stage 2 boundary before runtime edits. It is not an implemented optimization or a performance qualification. The integrated source review selects the single-node preparation specialization below; the other hypotheses remain deferred.

- Capture tool: `489736e4549083a199babfeea0d6104cf2d45904`.
- Corrected analyzer: `ade53795b4880612b38d66c342bc4c7208ad21b0`.
- Candidate runtime: `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb`.
- Raw profiles: `work/task49-editor-profile-full-001`, nine captures, three rotated repetitions of original / prepared-js / prepared-wasm.
- Valid analysis: `work/task49-editor-profile-full-analysis-002`.
- Analysis 001 remains an invalid category attempt: candidate URLs matched an automation heuristic. Exact source resolution and raw exclusive function costs were unaffected, but use analysis 002 for reporting.
- Scenario: native Editor E3, root selected, Walking, 1024 shadow, required editor passes and callbacks preserved. Each profile follows 600 warmup frames and requests 12 seconds at 100 microseconds.

## Recommendation: specialize one-node facade operation preparation

Implement a narrow synchronous fast path for local updates and selective `updateWorldMatrix(false, false, force)` calls in `packages/rthree/facade-state.js`. Reuse the existing single-operation arena, validation, upload and JS/Wasm computation. Avoid constructing the generic node array, operation-object array, index Map, traversal closures and temporary operation array for the one selected node. Leave ancestor/descendant traversal, persistent scene plans, renderer submission, skinning, public element proxies and application code unchanged.

This is a lower-risk first boundary than a new skinning cache. It addresses verified native work: pinned `Box3.expandByObject` calls `object.updateWorldMatrix(false, false)` for every visited object, while `Viewport.animate` first calls `selected.updateWorldMatrix(false, true)` and then the precise selection bounds scan. The repeated calls are required behavior; the proposal reduces their preparation rather than skipping an update.

Apply the same operation algorithm to JS and Wasm. This is bridge/preparation reduction, not evidence of faster Rust arithmetic or expanded prepared-renderer ownership. Native E3 currently uses the renderer fallback; a successful optimization does not change that status.

## Verified exclusive sample costs

The following values are the median of three per-run sums of exclusive `selfMs`, grouped by exact verified source file and function label. They are milliseconds of sampled CPU weight over approximately 12 seconds, not callback duration or frame time. Inclusive costs are not added. JS and Wasm labels were matched explicitly to the original counterpart; generated underscore prefixes were not treated as new algorithms.

| Function | Original | Prepared JS | Prepared Wasm |
|---|---:|---:|---:|
| SkinnedMesh.applyBoneTransform | 220.938 | 585.447 | 584.914 |
| Box3.expandByObject | 99.577 | 315.170 | 315.589 |
| Matrix4.multiplyMatrices | 78.114 | 200.873 | 202.056 |
| Mesh.getVertexPosition | 84.227 | 122.458 | 144.310 |
| Skeleton.update | 81.007 | 113.215 | 111.772 |
| Viewport.render | 57.055 | 82.111 | 83.636 |
| facadeUpdate | n/a | 283.660 | 280.360 |
| facadeUpdate under Box3.expandByObject ancestors | n/a | 161.016 | 158.527 |

The last row is a subset of facadeUpdate, identified by walking each sampled node's parent chain, never additional cost. All three prepared-JS subset values are 152.518 / 162.222 / 161.016 ms; Wasm values are 159.377 / 157.570 / 158.527 ms. Approximately 57% of facadeUpdate self sample weight is below the bounds traversal. Source semantics establish the one-node selective call there; the profile does not prove how much of this self time belongs to allocations, property reads, uploads, or inlined computation. Do not present the entire 159–161 ms as recoverable allocation cost.

Total active sampled weight per capture is approximately 1.63–1.65 seconds original, 3.94–4.00 seconds JS, and 3.99–4.11 seconds Wasm. Resolved Wasm functions consume approximately 24.6–28.5 ms; unresolved Wasm is separate. These data do not support optimizing Rust arithmetic first. They also do not establish a speedup ceiling for an unimplemented fast path.

## Source-verified path and proposed code boundary

- Pinned Editor `editor/editor/js/Viewport.js:878–879`: selected subtree world update followed by precise bounds on every animated selected frame.
- Three r186.1 `src/math/Box3.js:303–379`: one-node selective update per visited object; precise vertex loop retains `getVertexPosition`, world transform, `expandByPoint`, and child recursion.
- Candidate `packages/rthree/core.js:14158`: `applyBoneTransform` reads skin index/weight and calculates bone-world times inverse for each nonzero influence. This is unchanged by the proposed fast path.
- Candidate `packages/rthree/runtime.js:35–36`: local/selective helpers normalize booleans and delegate to facadeUpdate.
- Candidate `packages/rthree/facade-state.js:169–227`: generic collection and operation packing currently occurs for single-node selective calls. A local request ignores parent selection; a selective request enters the new path only with neither parents nor children selected. Descendant requests must remain on the existing path, even for an apparently childless object, to avoid broadening the initial change.

## Correctness contract

1. Preserve the existing enabled/readiness check before mutation, prepared mutation epoch behavior, supported-object eligibility and override fallback. An unsupported object must return false before evaluation exactly as today.
2. Preserve local-only behavior, selective explicit force, matrixAutoUpdate, matrixWorldAutoUpdate, matrixWorldNeedsUpdate and generation checks. Do not skip calls merely because inputs seem unchanged.
3. Preserve the unselected parent's last evaluated world matrix. Dirty parent inputs must not cause an implicit ancestor update. Keep the current parent element-read behavior in this first patch; changing public consumption barriers simultaneously would confound the boundary and complicate accessor semantics.
4. Preserve direct matrix writes, retained public `elements` aliases, replaced arrays, exotic descriptors, object lifetime/slot reuse, arena growth and memory-view refresh behavior. The private operation buffer must not escape through public objects.
5. Preserve existing upload flags and order, the exact seven operation fields, the existing JS evaluator or Wasm export, observationEpoch invalidation, output matrix-valid flags, matrixWorldNeedsUpdate assignment and diagnostic accounting.
6. Do not keep a globally shared mutable scratch operation across user getters or nested calls. Directly pack the private arena operation only after existing public reads/eligibility and upload steps; preserve existing reentrancy assumptions rather than making them weaker.
7. No changes to render count, animation advancement, skin/morph inputs, exact bounds, material callbacks or UI signals.

## Verification before an immutable candidate

Add focused differential tests that exercise the optimized route against original Three.js and both matched backends, with counters proving the new route was exercised. Cover local update and selective update with force on/off; dirty unselected parent; all matrix flag combinations; manual local/world writes and retained aliases before/after evaluation; replaced array/overridden update fallback; slot release/reuse and arena growth. Check diagnostics and numerical output. Existing facade, prepared state, compatibility and browser suites remain necessary.

Keep the exact prior runtime and measured evidence. Re-run the fixed native Editor oracles and app interaction checks before any primary comparison. Subsequent timing, not this sampled profile, decides whether the boundary has value. A modest result or no useful effect is an acceptable investigation outcome; do not optimize the benchmark scenario by removing required work.

## Alternatives deferred

- **Exact Float64 palette reuse during precise skin bounds:** the largest conceptual CPU-consumer opportunity remains per-vertex skinning. However, the existing public path can observe overridden methods/attribute reads, direct matrix and inverse writes, changed skeleton membership and caller-visible callbacks. Renderer `skeleton.boneMatrices` is Float32 and is not an exact replacement for the current Float64 matrix product. A safe private, bounded, callback-free exact scan needs explicit eligibility and invalidation design and matched JS/Wasm implementations. Do not introduce a frame-number cache or reuse palette solely because the renderer used that skeleton earlier. This is the leading follow-up if single-node preparation is insufficient, not ruled out by these data.
- **Removing the second bounds-related update:** rejected. Source comments and public semantics require current world state; collapsing calls without a full override/force/hierarchy proof changes behavior.
- **Renderer/palette reuse across passes:** deferred. The source and counters establish required editor/helper/shadow work and fallback, but inclusive renderer wrappers do not isolate duplicated palette preparation. A cache would need callback-boundary invalidation and exact value checks. Current attribution makes bounds and facade preparation the more direct initial consumer.
- **Matrix proxy read optimization alone:** deferred. Its exclusive category is only about 2.4–3.6% of active sampled weight and the internal read barrier already exists. It does not explain the much larger applyBoneTransform/Box3 self differences.
- **UI refresh suppression or app modifications:** rejected for this engine step. Verified UI is a small exclusive share, but native DOM work is separate: `getBoundingClientRect` is unresolved native code below the verified `Animation.updateTime` caller. The non-additive context view includes this cost (4.5–4.9% of active candidate weight), so the exclusive UI bucket alone is not total UI cost. Required native behavior must remain.
- **Rust math/kernel rewrite:** deferred. Resolved Wasm and matched-JS kernels are each below 1% of active sampled weight in this scenario.

## Interpretation limits

The profile captures active sampled JavaScript/Wasm stacks under profiler overhead, not whole-browser CPU, primary callback CPU, GPU time or FPS. Source-verified function self-cost differences alone cannot establish a JIT, inlining, proxy or cache cause. Candidate bundles and original bundles have different function-layout/inlining opportunities; attribution is a target-selection aid. Observer/profiler overhead is uncalibrated, and before/after cadence is not an overhead calibration. The recommendation is intentionally narrow so subsequent exact-head correctness and complete-path timing can test it without changing scene work.
