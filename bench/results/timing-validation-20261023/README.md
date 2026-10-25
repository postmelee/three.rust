# Timing-tool validation — software renderer only

Measured source: `1080c215904be39aa988265479e8a964f950ad6f`, clean for every run.
Chromium 154 on shared cloud Linux, SwiftShader. These are **correctness and smoke
checks, not speedup evidence**. The README's performance numbers still come from
the separate physical-Mac archive at `../mac-20261023`.

- `ordinary` / `isolated`: nine runs each, 1 repeat × 3 scenarios × 3 backends.
- `calibration`: 21 runs through all five phases (original and matched-JS A/A,
  main, matched-JS and original A/A). This tests report plumbing, not noise inference.
- `diagnostic`: three animated-one runs with the new input/evaluation split.
- All 42 runs: 3 warmup + 6 sampled frames = 252 sampled frames total. Existing
  manifests explicitly classify render runs as short smoke, not main evidence.
- Ordinary pages observed non-isolated clocks with ~0.1 ms minimum increments;
  isolated pages observed isolation and ~0.005 ms increments. This is a clock
  observation, not an engine speedup or a guarantee for other browsers/devices.
- `fox-correctness.json`: 132 checkpoints, exact pixels, numeric tolerance passed;
  `fox-rejections.json`: 13 unsupported cases reject. Captures remain local and
  are not duplicated here. The separate `checks/timing.txt` verifies whole-cycle
  numerical and image-digest parity between timing modes and diagnostic/main paths.
- `historical-evidence.json` is a **new analysis of old Mac data**, using its explicit
  legacy preflight clock. It does not claim per-page clocks were recorded historically.
- `integrity.json` lists SHA-256 of the 89 stored payload files. Run JSON files use
  lossless gzip; manifests keep logical `.json` filenames supported by the report reader.
  `checks/archive-integrity.txt` independently verifies 229 original Mac archive entries.

Executed smoke commands (each output directory was fresh):

```sh
node bench/fox.mjs mode=cloud headless=true timing=ordinary repeats=1 warmup=3 samples=6 out=work/task29/ordinary
node bench/fox.mjs mode=cloud headless=true timing=isolated repeats=1 warmup=3 samples=6 out=work/task29/isolated
# Same isolated settings for calibration phases: variants original / owned-js /
# original,owned-js,owned-wasm / owned-js / original, with separate phase directories.
node bench/fox-compare.mjs work/task29/calibration
node bench/fox-evidence.mjs work/task29/calibration work/task29/calibration/evidence.json
node bench/fox.mjs mode=cloud headless=true timing=isolated stage=diagnostic cases=animated-1 repeats=1 warmup=3 samples=6 out=work/task29/diagnostic
```

Every render-phase directory was summarized with `node bench/fox-report.mjs DIR`.
Asset provenance and license remain in [the Fox fixture](../../../fixtures/fox/README.md).
No new physical-Mac experiment, hardware speedup or product acceptance is asserted.
