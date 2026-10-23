# Task #8 stage 3 — integrated verification and evidence

Clean candidate: `5193dbebad1372b4c4f85e7b0d065f15f86a7bb5`.

| Check | Observed result |
|---|---|
| npm run test:compatibility | 16 cases × 4 routes in Node and Chromium; 96 candidate trace comparisons; two-camera callback/numeric/exact-pixel checks pass |
| npm test | 8 native Rust tests, 9 upstream differential tests and strict NodeNext consumer pass |
| node --test tests/owned.mjs | 8 finite owned/lifetime/growth tests pass |
| npm run test:package | Fresh tarball, init/retry/concurrency, mixed-mode guard, addon identity, NodeNext/Bundler and bundling pass |
| npm run test:browser | 25 pages across five scenes; 20 A/A or candidate image comparisons and callback mutation check pass |
| npm run docs:check | English, roadmap, README data and generated source/status consistency pass |
| Link/syntax/diff checks | Changed Markdown paths/anchors and retained CI commands pass; new runner syntax and git diff --check pass |
| Runtime/status preservation | Rust, package runtime, generated status/history/product goals and README claims unchanged from 15ae9d3 |

Raw contract manifests record the clean SHA and source/Wasm/harness hashes. The
archive preserves compressed traces, PNGs and checksums. Package metadata correctly
records its earlier stage-2 dirty test checkout. See the [archive](../../bench/results/compatibility-c1-20261023/README.md).

Cloud Chromium uses SwiftShader. No full performance benchmark, physical GPU run,
new ownership history point or application qualification was performed. Remote CI
on this task's final head remains separate from the passing local checks.
