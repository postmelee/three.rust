# Task #46: Editor candidate correctness, 2026-10-26

**Original, prepared-JS and prepared-Wasm passed the retained Editor correctness/UI scenarios. This archive contains no app performance result.** The independent cross-route audit compares 149,328 ordered numeric values with zero difference, 32 fixed-image pairs with identical PNG bytes/pixel digests, and 40 semantic records. All 162 route-local checks passed in the canonical six runs.

See the [Stage 4A report](../../../mydocs/working/task_m6_46_stage4a.md) for exact source/tool pins, bootstrap correction, fallback scope, licensing and remaining work. Candidate runtime is `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb`; upstream Editor is `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`. Original UI used clean tooling `c7e6c25413f4731cd16f8a1bafa8b07510e10b78`; the other five canonical sets used clean `cadc5edd694b3aa778dd049251d15e5f6dd75c87`. The original HTML response did not change across these tooling versions.

`canonical/` contains check/UI runs for each route. `attempts/` retains four earlier runs: original-check with a dirty tooling tree, two passing JS runs before the bootstrap correction, and the initial Wasm startup failure. None is silently replaced or used instead of the clean canonical records. All original output directories remain untouched.

All raw JSON, network/served-file inventories, source/adaptation hashes, original and served entry HTML, adaptation diffs, complete scene exports, fixed canvas PNGs and full UI screenshots are retained. JSON gzip copies are lossless; a resolver can add `.gz` to a logical `.json` filename. `archive-index.json` covers 399 copied payloads and identifies untouched source, decoded and archive bytes separately. No app payload required privacy normalization; the archive includes no requester session instructions. `audit.json`, this guide and `verify.py` are derived review files.

Four native `paused.time` field pairs are explicitly excluded from exact equality because the play/pause interaction is driven by wall-clock waiting and a UI click. Every value is retained and checked within the clip duration with paused=true/running=false; fixed 0.25/0.75 scrub poses and other timeline semantics are compared. Random UUIDs and complete scene JSON are preserved but are not equality oracles. Full UI screenshots are contextual evidence, not the fixed-canvas pixel oracle.

The upstream Three.js MIT notice and RobotExpressive CC0 notice are in `licenses/`. Scene exports include the unchanged CC0 RobotExpressive-derived geometry. The model's known upstream weight-conformance issue remains documented; runtime loader-normalized weights are checked separately. Do not infer that the asset passed its validator.

```sh
python3 bench/results/task46-editor-correctness-20261026/verify.py
```

This standard-library verifier checks every payload hash, clean/candidate/app pins and GPU boundaries, repeats the cross-route numeric/object/quality and interaction comparison, and verifies the four explicit wall-clock exceptions and all earlier attempts. No browser, profiling or timing runs are performed.
