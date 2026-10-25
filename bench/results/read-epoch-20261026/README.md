# Evaluation-epoch observation correctness, 2026-10-26

Candidate engine commit `7769caea20d4fc3ab757863fed00ff30e085d50f`; hardware verification at clean `40ec9385ee79290e45904ce3298c741e91a78341` adds only the explicit hardware test mode. Parent C3: `ce21ffcf355534a8cf32eb4c9f7e43d6a86509b5`.

See [the report](../../../mydocs/report/task_m5_40_read_epoch_report.md). This is correctness and a deterministic redundant-access check, not an application benchmark. Initial failure is in `checks/before-test.txt`; patched results in `checks/after-wasm.txt` and `checks/after-js.txt`. `prepared-hardware/` preserves all 60 image checkpoints and numerical/draw/callback evidence; `contract-browser/` preserves all eight routes and two camera passes. No image tolerances were weakened.

Large JSON payloads are gzip-compressed; decode a copy when inspecting them. `archive-index.json` contains payload, decoded and original source hashes; only local home/checkout paths were normalized. The index excludes this guide and itself. Verify with the same Python loop used by the baseline archive, changing its root to `bench/results/read-epoch-20261026`.
