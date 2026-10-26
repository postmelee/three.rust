# Task #49 single-node preparation candidate: diagnostic result

The selected preparation specialization passed its semantic and hardware fixed-pose gates, but the repeated diagnostic profiles do not show a clear useful improvement. This is not a primary timing verdict or proof of regression. Keep the candidate experimental pending the separate app comparison; do not claim Rust arithmetic acceleration from this change.

## Identity and unchanged work

Prior runtime: `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb`. New runtime: `85e2c5d500edb0b92ea4ecb997087fded3fed45b`. Capture and analysis tools for the new run: `e9b736a47f48bc2512476f8966d285d0153419f7`. The candidate has its own clean checkout and [committed protocol](../plans/task_m6_49_editor_protocol.json). The runtime was independently installed and built with the lockfiles and specified Rust toolchain. Core/runtime/Wasm bytes equal the prior candidate; the changed runtime file is `facade-state.js`. The package script changes are infrastructure only.

The source change removes explicit generic collection arrays, operation objects, Map and traversal closures for a single local/selective operation. It retains eligibility, the public parent read, upload, exact operation fields, existing JS/Wasm evaluator, force/flags, materialization epochs and counters. Removing these source constructions does not establish how much allocation the JS implementation previously performed or how much CPU time can be recovered.

Nine new full profiles retain 684,661 samples; three new smoke profiles retain 38,037. Six fixed-pose pages in each capture passed both observer modes. Independent audit matched all 12 full poses (93,996 ordered numerical values), PNGs, quality, source bytes, sample accounting and native phase/counters against the previous capture. Each native candidate frame still has four fallback passes, zero prepared passes, 205 paid matrix materializations / 26,240 bytes and, for Wasm, 135 calls. Nothing was omitted to make the new route eligible.

Raw data and independent reproduction checks: [new candidate archive](../../bench/results/task49-editor-single-profile-20261026/README.md), [prior candidate archive](../../bench/results/task49-editor-profile-20261026/README.md).

## Observed sampled costs

These numbers are the median of three roughly 12-second profiles, in milliseconds of elapsed-gap sample weight. They are **not** per-frame CPU p50, GPU time, on-CPU cycles, FPS or a noise-qualified old/new comparison. The original control's sampled weight also moved between capture sets, and profiler overhead is uncalibrated. Do not subtract or normalize these sets into an asserted product saving.

| Runtime set | Route | Active sampled weight, ms | Operation preparation, ms | Combined facadeUpdate + updateSingle exclusive weight, ms |
|---|---|---:|---:|---:|
| epoch | original | 1640.510 | 0.000 | 0.000 |
| epoch | prepared-js | 3959.097 | 546.626 | 283.660 |
| epoch | prepared-wasm | 4018.023 | 548.097 | 280.360 |
| single | original | 1741.649 | 0.000 | 0.000 |
| single | prepared-js | 3979.677 | 549.889 | 288.882 |
| single | prepared-wasm | 4187.195 | 598.624 | 304.598 |

The new `updateSingle` function remains in the same operation-preparation category. Its exclusive samples are combined with `facadeUpdate` per run before taking the median; a lower `facadeUpdate` value alone would merely reflect extracting work to another function. Inclusive ancestor totals are not added.

The large bounds/skinning consumer remains present. Source inspection alone cannot attribute its cost to proxies, JIT choices, inlining or a specific matrix operation. The investigation still ranks exact bounds/palette consumers ahead of UI suppression or a Rust kernel rewrite; the current change tests only generic one-node preparation. No cache or approximate bound was introduced.

## Decision boundary

Retain both immutable runtime SHAs and all failed/unfavorable evidence. Complete native interaction checks and the predeclared original/matched-JS/Wasm callback comparison before deciding adoption. The existing adoption-v1 requires useful absolute and relative savings over Three.js and a separately justified Rust effect over matched JS, with A/A and regression gates. A correct narrow specialization can still fail those product gates. If timing does not justify carrying the extra implementation, preserve it as a rejected experimental candidate rather than presenting it as a verified performance improvement.
