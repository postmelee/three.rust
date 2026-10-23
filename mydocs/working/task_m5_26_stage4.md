# Task #26 — Stage 4: measured pipeline and delivery

The committed Stage 4.1 harness ran a balanced 108-run main comparison: six paths,
three cases, six repeats, 60 warmup/120 measured frames. Separate boundary/read
measurements contain 30 runs, five repeats, 30/60 frames. All raw samples,
manifests, summaries and both earlier smokes are preserved under bench/results/.
No failed main attempt was discarded. The later metadata-only harness cleanup
removes unused inherited M0 options; engine/timing logic is unchanged.

At 64 rigs, median-of-run CPU p50 is original 1.75 ms, owned JS 1.55 ms and owned
Wasm 1.05 ms. Paired ratios and ranges are in docs/OWNED_REPORT.md; they differ
from ratios of summary medians. Small-scene tail regressions, old bridge overhead
and worse Wasm frame-interval tails are reported. No hardware/FPS claim is made.
The separate full snapshot costs roughly the same as Rust evaluation (0.3 ms),
reinforcing explicit intermediate-read boundaries. All counter payloads and
mismatched original diagnostic buckets are documented.

Native/upstream/owned/browser/package checks passed. Source inventory/docs/status
site/infrastructure/actionlint checks passed. A separate portable bundle check
runs the owned browser suite from the assembled demo; final delivery results are
recorded in the final report. CI now includes owned differential/browser checks,
a six-run smoke and portable owned verification, with artifacts retained.

Progress marks three scoped algorithm mappings and twelve logical owned-state
mappings while leaving ordinary upstream methods/state authority unchanged.
The README links the current report and finite API without turning into a task log.
Issues #7–#11 and #15 record bounded progress and stay open. No main merge, paid
runner, npm publication or hardware acceptance is part of this draft delivery.
