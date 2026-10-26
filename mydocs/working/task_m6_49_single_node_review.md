# Task 49 single-node facade fast-path independent review

Read-only review on 2026-10-26. Reviewed the proposed patch, cost-selection note, applied facade-state.js/facade-worker.mjs diff, existing generic implementation and JS/prepared/Rust validation paths. No source was edited and no engine tests, build or browser was run by this reviewer; the implementation owner is running those checks.

## Verdict and findings

No consequential correctness regression was found in the inspected change. It specializes the preparation of an already selected one-node operation; it does not add a new eligibility, dirty-state, traversal, caching or renderer policy. This is a source-review conclusion, not performance qualification. The exact runtime still needs the planned test/browser/app correctness gates and fresh complete-path comparison.

One useful defensive test was requested from the implementation owner: directly assign parent=self, exercise local and one-node selective requests, require the existing evaluator rejection and no successful operation accounting, restore parent before cleanup, then retry successfully. Such a test locks the old invalid-command guard; it does not expand supported hierarchy semantics. Static inspection confirms the guard is preserved today. Its eventual execution status should be appended separately.

## Equivalence checks

| Concern | Source-level comparison |
|---|---|
| Entry and scope | enabled check, prepared mutationEpoch increment and config.api readiness remain in facadeUpdate before the new branch. The branch is only local or updateWorldMatrix with neither parents nor children selected. Descendant/ancestor traversal and prepared root plans remain in the generic path. |
| Eligibility and fallback | updateSingle invokes the same eligible predicate before register/reserve. Local checks the same local override identity; selective checks the same method identity. Replaced/exotic matrices and method overrides keep the previous fallback and fallbackRoots behavior. |
| Allocation and registration | The same record is registered and reserve(nextSlot-1,1) runs before obtaining parent inputs. Slot/generation allocation, released-slot reuse and allocation failure paths are shared. |
| Unselected parent | method=local never reads parent matrix.elements. Selective reads the last evaluated external parent's public elements, in indices0–15 order, without updating that parent. In a one-node index, `!index.has(external)` is exactly `external !== root`. The public access is deliberately retained. |
| Parent identity timing | Generic `index.has(o.parent) ? records.get(o.parent) : undefined` and specialized `root.parent === root ? records.get(root.parent) : undefined` read parent in the same position before upload. For the one selected root these expressions select the same record. |
| Memory views and reads | view() is obtained after the external elements property read and refreshed after the16-element copy in both implementations. register/reserve view refresh and cross-operation growth behavior are unchanged. No new matrix backing array escapes. |
| Upload and private operation buffer | upload is unchanged. The new code obtains arena.ops and writes it only after the existing public reads and upload complete. No new global scratch operation is retained across those callbacks. The generic command-array allocation and Map/collection closures are removed. |
| Exact command | [root slot, root generation, selected parent slot or0, parent generation or0, local?0:force?1:0, inherited0, local?1:0] equals the generic one-entry command, including invalid self-parent identity. |
| Validation and compute | JS invokes the same evaluateFacade/evaluateVersions and Wasm invokes the same facade_update/facade_update_versions with count1. JS and Rust reject id==parent before changing evaluated outputs. Prepared JS delegates validation to evaluateFacade. No arithmetic, force/auto semantics or Rust kernel changes are introduced. |
| Postprocessing | observationEpoch increments only after successful evaluation, as before. The same output-mask bits invalidate local/world materialization. matrixWorldNeedsUpdate receives the same packed flag before r.flags=false, preserving prepared setter/dirty-queue behavior. |
| Counters | Successful batches+1, nodes+1, operationBytes+28 and Wasm calls/nodes+1 match count1 in the generic path. Parent upload128 bytes, node upload/scanned bytes, ABI allocation/validation calls and matrix materializations use the same existing functions. Failure before evaluation does not increment successful-call counters or observationEpoch. |
| Timing counters | The same sync/kernel/post-sync accounting is retained. The fast path legitimately changes allocation/preparation work; these diagnostics do not prove user-visible speedup or a Rust arithmetic advantage. |

## Tests inspected

The applied worker additions cover all16 auto/worldAuto/dirty/force combinations, dirty but unselected parent and child, local compose with pivot and disabled automatic updates, manual local/world values, retained element aliases, replaced-array/method-override fallback, arena growth, release/reuse and parent numeric read order. The parent test also throws at index7, checks no successful evaluation accounting and preserved prior world value, retries normally, and verifies local compose does not read parent elements. The same worker is used by facade and prepared JS/Wasm modes.

The implementation owner reported facade-JS and facade-Wasm13/13 passing at the first applied-diff review; prepared checks were still in progress. This reviewer did not independently execute those tests. Record final execution results from the owner, including any later defensive test, before candidate publication.

## Reentrancy and remaining limits

The optimization does not claim support for arbitrary side-effectful public getters or user-triggered reentrant arena release/growth. Those remain existing contract exclusions in [PERSISTENT_FACADE.md](../../docs/PERSISTENT_FACADE.md) and [PREPARED_PASS.md](../../docs/PREPARED_PASS.md). Both old and new code can encounter public parent element reads before computation; the copy/view-refresh order is unchanged. The normal internal materialization callback and allocation-before-view paths are preserved, and the new operation buffer is not packed until after upload. The new code does not introduce an additional callback between operation packing and evaluator entry.

Growth tests establish aliases across separate operations, not arbitrary memory growth in the middle of an exotic parent getter. This review does not turn that unsupported case into a compatibility promise. No new cache, skipped force call, coalesced update, approximate bound, removed skin/morph feature or reduced renderer submission was found.

The profile supports investigating this preparation boundary but does not isolate all facadeUpdate self weight as allocations. Root/camera/skin subclasses, custom overrides and later plan updates must continue to pass the existing broad suites. Any performance result must compare exact old/new SHA, preserve the same native app, include original and matched JS controls, and retain unsuccessful outcomes and A/A instability.

## Reviewed file snapshots

- `packages/rthree/facade-state.js`: `87e251fe1f40bb182cdea62092c58f3d622bccc40a4e77daaa728f1dec0066a2`
- `tests/facade-worker.mjs`: `d171c8108c0ad1d988868d3bdf49ef4e67be2c46328ae38d3b7c36824e9d78f2`
- `mydocs/tech/task_m6_49_cost_selection.md`: `2daa8bca950d58db910c9263f5fd643b1daaa326bc45355a5ac8b99627497a46`

## Integrated verification before runtime freeze

The integration owner rebuilt the package with the pinned toolchain and ran `npm test`, `npm run test:compatibility`, `npm run test:prepared` and `npm run docs:check` sequentially. All passed. The compatibility suite includes 16 original semantic cases and seven candidate traces plus browser two-camera, callback, matrix and exact-pixel checks. Prepared browser verification passes twelve main/camera/shadow/fallback checkpoints plus nested render, exception and upload checks for original (two variants), facade-Wasm, prepared-JS and prepared-Wasm. The implementation owner separately ran both facade workers and prepared state/pass workers. The JS-only GC-related skip remains intentional; the Wasm counterpart passes.

The native app oracles and new primary measurements are still pending at this source freeze. The defensive manually cyclic parent test was suggested but is not claimed executed; its invalid-command fields are unchanged by static review. No new hierarchy support or performance result is claimed.
