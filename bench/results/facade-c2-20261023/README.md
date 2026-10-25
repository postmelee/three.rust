# C2 persistent facade evidence

Verdict: **no speedup over original Three.js**. See the readable
[report](../../../docs/FACADE_REPORT.md) and [API contract](../../../docs/PERSISTENT_FACADE.md).

| Archive | Clean measured source | Meaning |
|---|---|---|
| [initial](initial/) | b1b8790bbcdb26d2dca39c29fcc85441c5265a69 | Complete initial series, including the large proxy-read regression |
| [corrected](corrected/) | dabcd69d3c30a9560d36ffc9a52862ef329892d8 | Corrected internal reads; still slower than original |

Each candidate has 36 primary boundary runs (five cases per run) and 108 primary
render runs. Six controls are preserved: original, compatibility JS, legacy Wasm,
legacy packed JS, matched facade JS and facade Wasm. Every primary manifest records
source/Wasm/harness hashes, clean-tree status, warmup, samples, repeats, ordering,
browser, CPU and viewport. The environment exposes no GPU; browser data identifies
SwiftShader. There is no physical-GPU or FPS claim.

`boundary` and `render` contain primary raw JSON compressed with gzip, unchanged
manifests and summaries. `*-diagnostic` are separately instrumented experiments.
`profile` contains separate browser CPU sampling, not timing evidence. `contract-*`,
`scenes`, `package` and `checks` preserve correctness traces, exact PNG comparisons,
installed-package metadata and logs. Initial `smoke` is explicitly short/dirty and
excluded from performance conclusions. `checksums.json` covers the evidence files.
The intermediate dbad72e candidate's verification was stopped for the documented
callback alias defect before its full timing commands began; it has no primary series.

After installing/building the recorded candidate, reproduce with fresh paths:

```sh
node bench/facade.mjs suite=boundary repeats=6 warmup=40 samples=100 engines=original,js,wasm,packed-js,facade-js,facade-wasm out=work/c2-boundary
node bench/facade.mjs suite=render scenarios=hierarchy,small,shader repeats=6 warmup=30 samples=90 engines=original,js,wasm,packed-js,facade-js,facade-wasm out=work/c2-render
node bench/facade.mjs suite=boundary repeats=1 warmup=20 samples=30 timings=true engines=original,js,wasm,packed-js,facade-js,facade-wasm out=work/c2-boundary-diagnostic
node bench/facade.mjs suite=render scenarios=hierarchy,small,shader repeats=1 warmup=10 samples=20 timings=true engines=original,js,wasm,packed-js,facade-js,facade-wasm out=work/c2-render-diagnostic
node bench/facade-profile.mjs work/c2-profile
node bench/facade-summary.mjs bench/results/facade-c2-20261023/corrected/boundary
node bench/facade-summary.mjs bench/results/facade-c2-20261023/corrected/render
```

The current summary tool also reads the initial compressed archive. It rejects
incomplete, short, dirty or instrumented runs and verifies final render-work counts.
Diagnostic per-frame counters use last-minus-first divided by the 19 measured
transitions; boundary counters reset immediately after warmup and divide by 30
samples. Do not subtract diagnostic means from primary quantiles.

The initial archive preserves its original summary format; re-running the current
analyzer adds the final-render-work verification flag without changing quantiles.
Core/source changes and the rejected intermediary are retained in git; no old
implementation branch or historical timing was substituted for this experiment.
