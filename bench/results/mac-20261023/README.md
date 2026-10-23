# Physical Mac evidence archive — 2026-10-23

Read [the hardware report](../../../docs/MAC_HARDWARE_REPORT.md) for interpretation and limitations. This archive includes unfavorable and failed runs. It is not a general performance certification.

## Provenance and navigation

- Baseline: PR #27, `e66e067844b75559bea251a7bd381d42210ab3ce`.
- Stage 1 source: `0b9cbbf` preserves Mac runner changes and synthetic evidence. Synthetic manifests record the earlier planning commit plus dirty source; the changed measured files were committed in Stage 1. Their hashes are authoritative.
- Full Fox measured source: `d9fa780fce9ad8bf49d1ba1c0c8f5a78222aed1f`, clean for all four full phases. Their hashes, browser and render target match. Full phase manifests preserve historical metadata: unused inherited M0 `options.viewport` says 1920×1080, but source hardcodes a 640×540 page and the actual canvas/renderTarget is 640×480. The final runner fixes metadata only; fixture/engine files are unchanged.
- `adaptation.patch`: baseline-to-measured-source changes for the Fox fixture, correctness oracle, Mac discovery/preflight and owned browser runner. `post-measurement.patch`: subsequent runner metadata, analysis, wrapper and test changes. Historical raw manifests are not rewritten.
- `environment`, `environment-ac`, `preflight-ac`, per-phase `environment-before/after`: allowlisted host facts, actual Apple Metal WebGL backend, observed rAF/clock granularity, AC and thermal reports. Initial environment was battery-powered; full timing followed the requester's AC connection. Desktop background load is uncontrolled.
- `synthetic-correctness`: 14 hardware views, exact pixels and bypass/callback guards. `synthetic-baseline`: failed execution-context attempt with 11 completed runs. `synthetic-baseline-02`: complete 54-run / 32,400-frame reproduction; short, no timing A/A.
- `fox-correctness`: initial component-wise quaternion failure. `fox-correctness-02`: 132 exact-image checkpoints, raw sign differences and rotation-aware numeric results. `fox-rejections`: 13 unsupported cases fail closed.
- `fox-smoke`, `fox-smoke-final`: six runs × ten samples each; execution checks only. The first smoke's generic classification is not a main-result label. The final smoke verifies the corrected options/viewport metadata with unchanged fixture/engine hashes.
- `aa-before`, `aa-after`: 15 original runs / 54,000 samples each. `main`: 54 balanced runs / 194,400 samples. Each has 1200 warmup / 3600 sampled frames, fixed simulation replay, one snapshot every 60 ticks. `comparison.json` contains all drift/noise inputs; its relative-rule boolean is not product acceptance.
- `diagnostic`: 45 separately instrumented runs / 5,400 samples, 60 warmup / 120 samples, evaluate/copy/read/render buckets. Upstream preparation/read/render can repeat ordinary traversal; diagnostic totals are not an additive decomposition of main.
- `controls`: 32 M2 facade small/static and shader runs at 640×360. `shader-4k`: 16 shader runs at 3840×2160. These are separate from owned Fox, with four rotated orders, 120 warmup / 600 samples, no timing A/A.
- `gpu-diagnostic`, `gpu-4k`: separate original-only asynchronous shader GPU queries, three repeats / 900 samples at each resolution. Each has 897 available and three pending-at-end ranges. Missing values stay null. These are not Fox GPU timings.
- `checks`: executed check/analysis logs, including preserved failures. `commands.txt`: actual commands and distinctions from the wrapper. `ci-source.json`: successful 27-step Linux correctness job on the exact measured Fox source, [run 39910823229](https://github.com/postmelee/three.rust/actions/runs/39910823229). Linux software rendering validates correctness, not Mac speed.

## License and screenshots

Fox model by PixelMannen (CC0), rigging/animation by tomkranis and glTF conversion by AsoboStudio/scurest (CC BY 4.0), pinned to the Khronos source revision. See [full provenance/attribution](../../../fixtures/fox/README.md) and the [preserved license](../../../fixtures/fox/LICENSE.md). Fox images here are derived renders with changed scene arrangement, lighting and camera; attribution applies to these images. The binary asset is not committed; the checksum-verified download is reproducible.

## Raw data and reanalysis

Each Fox `render-*.json.gz` / `diagnostic-*.json.gz` is lossless gzip. Its phase's `archive-integrity.json` maps logical filename to archived filename and SHA-256 of the original, uncompressed bytes. Manifests retain logical `.json` filenames. Summaries and controls remain readable JSON; no samples are trimmed or winsorized.

```sh
node bench/fox-report.mjs bench/results/mac-20261023/main
node bench/fox-report.mjs bench/results/mac-20261023/diagnostic
node bench/fox-compare.mjs bench/results/mac-20261023
node bench/analyze.mjs bench/results/mac-20261023/controls
node bench/analyze.mjs bench/results/mac-20261023/shader-4k
node bench/gpu-summary.mjs bench/results/mac-20261023/gpu-4k
# Inspect one raw frame stream:
gzip -dc bench/results/mac-20261023/main/render-animated-16-owned-wasm-0.json.gz
```

Fox summaries use linear per-run quantiles, then median/range across runs and repeat-paired ratios. Legacy M2 controls and GPU query summaries retain floor-index quantiles. The ~0.1 ms clock quantum limits the interpretation of interpolated values. Adjacent frames are not independent trials; no pooled-frame confidence interval is used.

To rerun on another qualified Mac, follow [CI.md](../../../docs/CI.md#physical-mac-validation). Use a fresh output directory, retain environment changes, and inspect actual WebGL GPU identity; no automatic fallback from a failed hardware guard is accepted.
