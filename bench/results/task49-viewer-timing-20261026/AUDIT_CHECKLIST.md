# Viewer timing independent audit checklist — source preparation

Status: preparation only. The Python source parsed successfully and 18 pure synthetic unit/mutation tests passed against the frozen robot/migration protocol schemas. No real timing result, raw-capture audit pass, archive hash verification, stability result or adoption decision is claimed. Run raw audits only after the capture owner releases the quiet measurement window. The prospective source is [the decision appendix](../../../mydocs/plans/task_m6_49_viewer_decision.md); the driver and analyzer remain separate from this Python reconstruction.

## Freeze and inventory before auditing

- Receive every smoke/full/failed/interrupted output directory and the complete actual invocation list from the capture owner. Do not discover only directories whose status is successful. Preserve the original work outputs unchanged.
- Pin actual complete tool SHA and candidate `85e2c5d500edb0b92ea4ecb997087fded3fed45b`; Viewer `b5ee5dafe27f953ae1b55f42b5fa3697fef08683`; protocol JSON exact bytes; runtime/bundle/decoder/source-map/asset/native and instrumented preparation hashes. The prior profile protocol is not a timing protocol.
- Require clean unchanged candidate/tool/Viewer, prepared manifest bytes and runtime files before/after; hardware Chrome/ANGLE, AC and declared display/page/quality. Preserve unknown/missing observations. Source equality is not independent source-to-binary certification.
- Full engine matrix has four frozen cases, 18 runs per case: 72 runs and 86,400 measured groups / 129,600 groups including warmup. Separate migration matrix has two cases and 36 runs: 43,200 measured / 64,800 including warmup. These are expectations, not results. Four callbacks per complete group imply 777,600 ordinary raw callback rows across both full matrices; count retained arming rows separately rather than assuming four per run.
- Validate exact original-A / JS-or-external / original-B / Wasm-or-r186 balanced route/round order and before/after bookends. No duplicate, missing or relabeled run may yield a complete verdict. Smoke has its own fixed settings and never becomes primary evidence.

## Raw callback reconstruction (`analyze.py`)

- Nine columns: kind, rAF timestamp, start, end, mixer time, action time, duration, main frame, axes frame. Distinguish null unavailable GUI fields from zero. Require finite timing/phase values and safe frame counters as appropriate.
- Freeze K=4 with Viewer.animate plus the native Lighting/Animation/Morph Targets GUI bodies. Match exact ordered folder/controller lists to the committed case and setup; counts are 1/14/9. A callback count change cannot relax the clock floor.
- Reconstruct complete timestamp groups from actual rows, rejecting repeated/noncontiguous timestamps, duplicate or missing kinds and overlapping intervals. CPU is the sum of disjoint durations; separately reconstruct Viewer and GUI CPU. Do not time a synthetic outer wrapper or omit native GUI loops.
- Preserve the first timestamp's possibly incomplete arming group, all warmup groups and all failed rows. Only the predeclared warmup/arming policy excludes samples from statistics. Missing data is never silently filled or interpreted as zero.
- Check every complete group, including warmup: one main render; one axes render when grid on, zero when grid off; native mixer advancement equals rAF delta; selected action follows modulo its frozen duration. Static playback has no active action but may still advance its existing native mixer.
- Check before/after measured endpoints against boundary rows and state: visible/focused/isolated, page DPR1, declared revision/backend, exact GUI/action/controller/layout/quality, native grid-off hidden/zero-size axes retained, no sample-phase activity events, expected renderer-frame deltas and finite nonnegative counters. Actual Wasm calls must be observable on the Wasm route.
- Independently rebuild per-run CPU/animate/GUI, rAF/callback-start/arrival quantiles using interpolation at `(n−1)q`, and contiguous block results. Compare with `measured-groups.json`, per-run summary and manifest result. Independently compare aggregate medians/changes/A/A with `analysis.json`; do not import the JS analyzer.

## Stability and policy arithmetic

- Recompute original baseline p50 center from all ten original balanced/bookend runs. Shared scene tolerance is `max(5% × center, 2*K × largest original clock increment)`. Original run centers are the scene median; each block's center is its own run median. Report all run/block failures.
- Recompute own-run block tolerance separately using that run's median/clock. Do not confuse this with the shared original scene tolerance or require all blocks to lie near the global scene center.
- Independently screen the four matched-JS repeats and four Wasm repeats using each route's own median, largest clock increment, and 5%/8-increment tolerance. The JS screen is not dedicated JS A/A or pre/post bookend calibration. A possible G2 threshold pass still requires the prospective extra calibration before a Rust recommendation.
- Summarize medians of balanced run p50/p95/p99, not pooled independent frames. Retain descriptive ranges and CPU/component/interval tails. Suppress relative percentages below the relevant baseline clock floor; never suppress absolute observations.
- Compute JS and Wasm versus pure-r186, and Wasm versus matched JS separately. Derive direct pure-r186 minus external-r176 packaging-controlled version contrast in the migration matrix as well as existing original-r176 contrasts. Migration evidence cannot be subtracted into a Rust gain.
- Independently calculate observed G1 (20% and 1 ms), G2 (10% and 0.5 ms) and G5 CPU/interval budgets (max 5%, 0.2 ms), preserving each scenario. Target cases are Walking/grid-on and Walking/grid-off; static and higher-resolution are controls. Stability is separate from the product budgets, not added to the regression allowance.
- Report observed thresholds without automatic qualification. Invalid or unstable comparisons remain inconclusive. A stable target missing G1 rejects that path; a stable G5 failure rejects its affected scope. A finite pass leaves missing startup/transfer/memory/lifecycle, asset/scenario and hardware/browser/day gates open.

## Verification status and separate checks after capture

1. **Bounded synthetic tests completed:** 18 tests cover the rejection of missing/duplicate/overlapping callbacks, shifted GUI folder/list, wrong callback count, frame skip/extra axes pass, stalled mixer, frozen/wrong-duration action, altered measured CPU, missing/failed/reordered route or bookend, wrong baseline/block center and clock-floor misuse. Valid static, grid-off, higher-resolution and all route endpoints pass. Native morph controllers intentionally repeat the property names 0/1/2 across meshes; the exact ordered 9-entry list is checked without requiring unique names. These tests do not use real captured rows or establish application correctness.
2. **Oracles:** independently compare original/native against instrumented per route and fixed pose, exact source identity, numerical ordering with `atol=1e-10 + rtol=1e-12*abs(reference)`, declared semantic fields and actual PNG bytes/pixel digests. Preserve grid-off axes image-unavailable reason. Candidate effects require strict pure-r186 parity. r176→pure-r186 migration differences are expected to remain non-strict evidence, never silently changed into candidate equivalence or an oracle failure.
3. **Source/instrumentation chain:** verify native and timing preparation bytes, exact overlay patches and source/build/asset inventories; ensure timing wrappers retain whole Viewer.animate and every dat.gui.updateDisplays loop with no application feature removal. Verify all captured source/network/manifest files, including errors. Native/observed source distinction remains explicit.
4. **Archive:** content-addressed lossless gzip or preserved compressed bytes, with every logical file's original/decoded-original/public/stored hashes and sizes. Preserve all raw/arming/warmup/measured records, failed attempts, setup/GPU/browser/environment, oracle images, scripts/maps/patches and notices. Bound each stored and decoded file below 100 MB. Deduplicate storage only; retain path/order/count provenance. Verify full source listings and source hashes after archival.
5. **Privacy:** normalize only approved environment/private-path metadata fields with separate original/public hashes and exact numeric token/type/value/sign preservation. Review hostname/serial/battery/profile paths. Executed source/source maps and public scene UUIDs are not arbitrary personal metadata to rewrite; unexpected fields must receive explicit review. Keep license and asset provenance.
6. **Review artifact:** exact dates/pins/invocations, complete counts, per-case CPU/interval tables, A/A and JS/Wasm stability, phase/render/counter coverage, migration contrasts, all failures and unperformed gates. State synchronous callback boundary, uncalibrated envelope overhead and no FPS claim. Cross-check every displayed figure against the independent output before publication.

## Planned offline invocation

After capture is terminal and quiet restrictions are released, use a new audit output. `CAPTURE` must be a full raw logical tree; a future archive resolver may supply the same payloads through its index. `FULL_TOOL_SHA` is the actual frozen timing tool, not the earlier profiling tool.

```sh
python3 bench/results/task49-viewer-timing-20261026/analyze.py "$CAPTURE" \
  --expected-tool "$FULL_TOOL_SHA" --out "$FRESH_AUDIT_JSON"
```

This command does not archive, launch a browser, profile, build, remove or rewrite any capture. Numeric validation does not replace the separate provenance, oracle and privacy verifiers above. Do not label this preparation as an executed verification.

The pure tests can be repeated without a browser, outside an active measurement window:

```sh
python3 bench/results/task49-viewer-timing-20261026/test_analyze.py
```

The default test input is the committed protocol JSON under `mydocs/plans`; `--protocol-root` accepts an explicit directory when testing a copied support bundle. No timing raw data or proprietary/private fixture is required.
