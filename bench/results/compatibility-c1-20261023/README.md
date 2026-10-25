# C1 compatibility correctness evidence

This archive records correctness, not a performance benchmark. No hardware-GPU or
new Rust ownership result is claimed.

| Check | Result |
|---|---|
| Semantic contract | 16 cases × 4 routes × 2 environments = 128 scenario executions |
| Differential traces | 48 candidate/original comparisons in Node and 48 in Chromium |
| Render contract | Two cameras per route; callback order/matrices and six candidate frame images match original pixels exactly |
| Wasm proof | Eligible identity case has positive Wasm calls; JS routes have none; all retained arenas released |
| Package | Fresh tarball init/retry/concurrency, mixed-mode rejection, addon identity, NodeNext/Bundler and one-core bundle pass |

The final Node/browser contract runs used clean commit
`5193dbebad1372b4c4f85e7b0d065f15f86a7bb5`, Node 24.19.0 and Chromium 154.0.8037.57
on managed Linux. Chromium reported ANGLE Vulkan SwiftShader; no physical-GPU
qualification applies. There is no warmup/sample performance series in this archive.

`node/` and `browser/` preserve manifests, complete per-route traces (JSON gzip),
summaries and browser PNGs. `checksums.json` hashes the evidence files. Manifests
pin source, generated core, Wasm and harness hashes plus actual dirty-state flags.
The separate package check ran during stage 2 at 1671a51 with uncommitted candidate
test changes; its original metadata is retained, not relabeled as a clean run.
`legacy-browser.json.gz` preserves the additional five-scene run: 25 pages,
20 A/A or candidate comparisons, exact pixels and the callback check. It exercises
the unchanged existing renderer/engine rather than a new Rust subsystem.

From the recorded clean commit, install/build using docs/CLOUD_SETUP.md, then run:

```sh
RTHREE_CONTRACT_RESULTS_DIR=work/c1-final/node \
RTHREE_CONTRACT_BROWSER_RESULTS_DIR=work/c1-final/browser npm run test:compatibility
npm run test:package
```

Use fresh paths if results already exist. Decompress a raw trace with
`gzip -dc browser/wasm.json.gz`. Expected finite-number tolerances and exclusions
are in [the contract](../../../docs/FACADE_CONTRACT.md). Existing wider browser,
native and lifetime checks are reported separately in the task report.
