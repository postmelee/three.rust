# Task #40 stage 2 — renderer consumption and observable correctness

Issue: [#40](https://github.com/postmelee/three.rust/issues/40).
Plan: [task_m5_40](../plans/task_m5_40.md).

## Result

The prepared ordinary-Mesh main pass now feeds compact resource/draw lists and
per-draw matrices into the pinned renderer. A private uniform read barrier avoids
proxy reads inside the matrix uniform cache; WebGL receives its normal Float32
upload arrays. The matched JS normal kernel uses direct stores without a temporary
array per draw. Public objects/arrays retain the declared C2 observation contract.

## Verification

- `npm run build`, `npm test`: native (14), legacy differential (9), types pass.
- `npm run test:prepared`: each prepared mode passes eight inherited facade and
  four retained-state cases; the 90-node/24-frame upstream pass oracle passes.
- Browser prepared checks: original A/A, C2 Wasm and both C3 modes pass 12 exact
  image/numeric checkpoints plus nested render, exception recovery and attribute
  upload callback cases. Raw numerical traces, pixel hashes and proof counters are
  retained in `work/c3-source2-prepared` for the final archive.
- The poison-guard render executes one prepared pass and consumes 16 draw matrices;
  C3 Wasm records two transform calls and one prepared call. Topology rebuilds are
  zero; a camera selective update still writes 28 command bytes. Replaced JS
  culling/compose/model-view/normal work throws if called.
- `npm run test:compatibility`: all eight routes pass Node/browser cases, two-camera
  pixels and callback counts. Final-source five-fixture comparisons for original
  A/A and both prepared routes pass (15 comparisons). The preceding source1 tree
  also passed all eight routes on all five fixtures (40 comparisons).

Correctness was run on the staged tree before this commit, with source hashes and
dirty-tree status preserved. These are correctness checks, not primary timings.
Package, legacy owned/pipeline, timing-policy, demo and delivery checks continue
in stage 3. Demo checks now exercise both prepared selectors and pause behavior.

## Preservation and limits

Existing engine entries and prior evidence remain. The first source1 timing-policy
attempt failed because the separately fetched Fox asset was missing; the failure
log is retained. `node scripts/fetch-fox.mjs` verified the pinned asset before retry.
No assertion or clock gate was relaxed. Shared-cloud SwiftShader has no hardware
performance meaning. Final measurements use a clean committed source and the
predeclared six-route/five-scene protocol; no favorable results have been selected.

Public contract/source provenance stays in `docs/`, task records in `mydocs/` as
planned. Continue under the requester's C3 authorization; main merge is separate.

## Stage 2.1 — lifetime correction after the first freeze

Review during the first clean-source experiment found that strong dirty-record
queues could retain a native slot after a detached public object was collected.
The new forced-GC regression reproduced two live slots instead of one on source
7710808. Both input and metadata queues now hold weak record references. The same
test passes for JS and Wasm; native/differential, legacy facade, full C3 and contract
checks also pass on the correction. Browser/package/demo rechecks precede timing.

The first experiment was explicitly stopped before editing runtime: 36 boundary
runs completed and 40 render runs were saved, but the render series is incomplete.
All files and its original running manifest remain intact under the first-attempt
archive; a separate interruption record explains SIGTERM and the regression test.
These results are superseded, never pooled with the corrected candidate. The new
source uses fresh directories and the unchanged predeclared protocol/thresholds.
No timing assertion was relaxed or unfavorable sample removed.
