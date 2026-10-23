# Task #3 Stage 3: physical-Mac evidence and bounded conclusions

GitHub Issue: [#3](https://github.com/postmelee/three.rust/issues/3)
Implementation plan: [task_m3_3_impl.md](../plans/task_m3_3_impl.md)
Stage: 3

## Stage Purpose

Complete the declared before/after A/A and balanced real-asset measurement on the Apple M4 Pro, preserve raw evidence and regressions, and publish a reviewable follow-up to PR #27.

## Artifacts

| File | Change Summary |
|---|---|
| `docs/MAC_HARDWARE_REPORT.md` | Actual host/backend, CPU quantiles/intervals, initialization/copy/read costs, noise decisions, compatibility gaps and issue coverage |
| `bench/results/mac-20261023` | Full raw phases, separate controls/GPU queries, hashes, environment, preserved failures, source CI and adaptation patches |
| `bench/fox.mjs`, `bench/fox-compare.mjs` | Correct relevant viewport/options metadata; reject comparisons of mismatched source/browser/target/work |
| `bench/gpu-summary.mjs`, `tests/fox-analysis.mjs` | Preserve query statuses; reject invalid cross-phase comparisons |
| `scripts/mac-validation.sh`, `docs/CI.md` | Complete reproducible Mac protocol including separate static/GPU-oriented controls |
| `docs/OWNED_ANIMATION.md`, `docs/OWNED_REPORT.md` | Explicit raw quaternion sign limitation; link historical cloud evidence to distinct Mac report |

## Body Change Scope / Lossless Preservation

No Rust/owned algorithm or renderer adapter changed from the measured source d9fa780. The full four-phase run used clean, identical measured hashes. Final runner changes correct metadata only; old raw manifests are kept unchanged. Full Fox frames are gzip-compressed with original-byte hashes; all failed runs and unfavorable tails remain available. The primary checkout is preserved.

## Verification Results

Commands and logs: [archive](../../bench/results/mac-20261023/README.md).

- Five original repeats before/after, six balanced main permutations: 84 full render runs, 302,400 sampled frames. All phases complete, hardware Apple Metal, draw/triangle/read parity and source/binary hashes match.
- Separate boundary/read diagnostic: 45 runs / 5,400 samples. Separate facade controls: 48 runs / 28,800 samples. Two GPU-query resolutions: six runs / 1,800 samples, 1,794 valid and six pending; no imputation.
- Source CI on d9fa780: all 27 steps passed in run 39910823229, including native/differential/types, new Fox and old browser/package/demo checks.
- Final metadata smoke: six hardware runs, 10 samples each, complete; correct 640×540 page / 640×480 canvas metadata, unchanged fixture and engine hashes.
- `npm run docs:check`: passed. `npm run test:infra`: 10 passed, including captured-data positive and four mismatched-phase negative checks. `npm run test:browser-path`: 2 passed. New JavaScript and wrapper syntax checks passed.
- Statistics recomputed directly from committed compressed main/diagnostic frames; 229 archived original-byte hashes verified after reanalysis. No raw sample changes.

## Residual Risks

The scaled owned architecture has a CPU signal, but its independent Wasm increment is below clock granularity and has a paired regression. The one-Fox p50 is unfavorable; A/A drift is 50% there. Wasm initialization is slower. Background activity is uncontrolled. GPU/query controls are separate from Fox and have no A/A. Raw quaternion sign continuity and broader Three.js contracts remain unsupported. No M5 completion or general/FPS speedup claim.

## Impact on Next Stage

Publish the draft against `codex/owned-animation-pipeline`, which remains at e66e067. Do not merge or close #3–#5/#7–#11. Final-head remote CI belongs to the PR; measured-source CI is already archived.

## Approval Request

The requester explicitly authorized the complete implementation, measurement, commit, push and draft PR in the original request. Proceed under that authorization. Review/merge and broader product acceptance remain separate.
