# Task #46: whole-path candidate screen, 2026-10-26

**All four original A/A groups failed the prospective reproducibility screen. No performance advantage is qualified.** Capture, source parity and fixed-state correctness checks passed. The epoch Wasm route had higher observed CPU p50 than upstream Three.js in all four scenes; retain the negative results and every fast/slow run.

See the [Stage 3 report](../../../mydocs/working/task_m6_46_stage3.md) for source pins, environment, CPU tails, rAF intervals, absolute/relative deltas, controls and limitations. `full/` retains all 144 runs / 86,400 frames, and `smoke/` retains all 24 short runs / 240 frames. Each suite additionally retains all 24 separate fixed-state correctness captures and PNGs. Smoke is a tooling check, not a partial substitute for the full matrix.

- C3 runtime: `ce21ffcf355534a8cf32eb4c9f7e43d6a86509b5`.
- Epoch runtime: `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb`.
- Full tooling: `cadc5edd694b3aa778dd049251d15e5f6dd75c87`; smoke tooling: `c7e6c25413f4731cd16f8a1bafa8b07510e10b78`.
- Driver SHA-256 at both pins: `f0f7b1c3afb5153707df6ee8632aef30f29ff99ddecfe0b1d604cb11db465d69`.

The manifests pin generated fixtures, runtime sources, Wasm, package locks, toolchain, original Three.js and tooling dependencies. Full capture UTC: 2026-10-25T22:19:31.665Z–22:40:17.061Z (2026-10-26 local date). Runtime checkouts and tooling were clean at capture; source verification passed after capture.

`archive-index.json` identifies untouched local source bytes, source decoded bytes, normalized public decoded bytes and stored payloads with separate SHA-256 hashes. Gzip is lossless after explicit metadata normalization. Paths in manifests retain their original logical filenames; where a `.json` payload is stored as `.json.gz`, decompress a copy or use the verifier's resolver. All source numerical JSON values were compared recursively during archival. Only six metadata files needed normalization of checkout/profile paths or the battery instance identifier. Every sample, timestamp, counter, error and image remains; no original output was overwritten.

The index covers 277 copied payloads, including the upstream MIT notice in `licenses/LICENSE`. `README.md`, `audit.json` and `verify.py` are derived review files. These fixtures are adapted deterministic replays of the pinned MIT Three.js examples; the hierarchy and small controls are explicitly modified scenes. The shader retains upstream Monjori/Mic attribution. No Soldier asset is included or used here.

Verify all payload hashes and independently recompute per-run quantiles, group medians, comparisons, A/A and block checks, source/work parity, hardware/focus boundaries, complete pixel/matrix equality and prepared/native execution coverage:

```sh
python3 bench/results/task46-candidate-screen-20261026/verify.py
```

The verifier uses the Python standard library and no browser. `audit.json` records the independently verified counts. It does not reinterpret a failed screen as a performance qualification.
