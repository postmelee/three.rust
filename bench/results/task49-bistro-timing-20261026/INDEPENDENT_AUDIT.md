# Bistro native ZIP primary timing — independent audit

Independent audit status: **verified**, with **performance qualification false**. The capture and arithmetic are valid; the original A/A and Wasm repeat screens failed. These observations do not establish a stable speedup, causal regression, FPS improvement, or CPU/GPU-bound classification. No version-migration session is included.

- Runtime: `85e2c5d500edb0b92ea4ecb997087fded3fed45b`.
- Tool: `58b7cdce62ab15f1507dd76255840f406cee6287`.
- Protocol SHA-256: `be967daa44d52689f9f82dbabe7f9e9d107abc3447bdda5ce1f5e1cae36a2651`.
- Chrome: `155.0.8059.86`; hardware renderer contains `ANGLE Metal Renderer: Apple M4 Pro`. AC/source checks passed before and after.
- One native first authored clip, grid off, DPR1. K3: Viewer.animate plus Lighting and Animation GUI loops (1 and 13 listening controllers). Native scene preserves 1,297 nodes, 132 materials, 405 attached images and 13 authored clips.

## Evidence integrity

All 18 runs completed. The independent audit reconstructed 21,600 measured groups, 32,400 groups including warmup, and 54 retained arming rows. It checked 6 native/timed oracle pages, 12 fixed poses, 24 PNG files, 548 captured-source byte records and 1,094 unique input files with unchanged before/after hashes. ZIP evidence preserves 407 original files plus 2 notices and one provenance entry. The raw warmup and sample activity gates both passed; no rows were dropped. Maximum observed phase arithmetic error was below 1.5e-14 seconds.

## Covered synchronous callback cost

Values are medians of the balanced run quantiles, in milliseconds. CPU refers to the declared synchronous body durations; GPU/compositor/asynchronous work and collector bookkeeping are outside this boundary.

| Route | Independent balanced runs | CPU p50 | CPU p95 | CPU p99 | Animate p50 | GUI p50 |
|---|---:|---:|---:|---:|---:|---:|
| pure-r186 | 8 | 7.907500 | 9.182625 | 9.945500 | 7.885000 | 0.020000 |
| prepared-js-r186 | 4 | 15.526250 | 17.041125 | 18.168475 | 15.510000 | 0.015000 |
| prepared-wasm-r186 | 4 | 16.140000 | 17.838125 | 18.432800 | 16.123750 | 0.015000 |

The original baseline p50 was at least 5 ms in every balanced/bookend run: range 7.515–8.570 ms, balanced median 7.9075 ms. This satisfies the observed covered-workload threshold for a larger real scene; it does not prove that the application is CPU-bound or that this entire duration is removable.

| Contrast | p50 change ms (%) | p95 change ms (%) | p99 change ms (%) |
|---|---:|---:|---:|
| prepared-js-r186 | +7.618750 (+96.348%) | +7.858500 (+85.580%) | +8.222975 (+82.680%) |
| prepared-wasm-r186 | +8.232500 (+104.110%) | +8.655500 (+94.260%) | +8.487300 (+85.338%) |
| Wasm versus matched JS | +0.613750 (+3.953%) | +0.797000 (+4.677%) | +0.264325 (+1.455%) |

These are descriptive observations. Baseline A/A failure prevents treating the contrast as a stable effect size. The current candidate has no demonstrated benefit supporting adoption.

## Stability and product thresholds

| Screen | Failed runs | Failed blocks | Pass |
|---|---:|---:|---|
| Original A/A including bookends | 2 | 0 | false |
| Matched-JS balanced repeats | 0 | 0 | true |
| Wasm balanced repeats | 1 | 0 | false |

Original A/A failed runs 013 and 015, both balanced pure-r186-A. Its tolerance was 0.395375 ms, including the observed K3 clock floor of approximately 0.03 ms. Wasm failed run 007; its route-specific tolerance was 0.807 ms. Matched JS passed its four-repeat screen, which is not dedicated JS A/A with pre/post bookends.

- G1 observed 20% and 1 ms savings thresholds: both JS and Wasm fail p50/p95.
- G2 observed 10% and 0.5 ms Wasm savings thresholds versus matched JS: fail p50/p95. Wasm was descriptively slower; its repeat screen also failed.
- G5 observed CPU regression budgets: both candidates fail p50/p95/p99. rAF and callback-start p95/p99 budgets are within their numerical allowances, but baseline instability remains separate and prevents a qualified cadence-improvement claim.

## Intervals and paid work

| Route | rAF p50/p95/p99 ms | Callback-start p50/p95/p99 ms |
|---|---|---|
| pure-r186 | 8.335000 / 25.000000 / 25.716400 | 8.372500 / 25.123500 / 26.953050 |
| prepared-js-r186 | 16.665000 / 18.235000 / 24.990150 | 15.715000 / 17.252500 / 18.466050 |
| prepared-wasm-r186 | 16.665000 / 20.898250 / 25.046850 | 16.327500 / 18.052750 / 18.725700 |

Every measured candidate main frame paid one prepared fallback, zero prepared passes, 1,595 public matrix reads and 204,160 materialized bytes. Wasm paid 7 Wasm calls per measured group; JS paid zero. These are endpoint counter rates, not stage CPU attribution. Do not multiply prior counts-only profiler shares by these timing durations to invent CPU milliseconds.

Both candidates have larger median body cost and a roughly 16.665 ms median rAF interval versus the original 8.335 ms. Lower candidate p95 intervals in this run do not demonstrate higher FPS or lower display/input latency.

## Finite disposition

Do not adopt the current runtime-85 prepared path for this Bistro scenario on the available evidence. Record the complete valid capture and negative descriptive costs while leaving stable performance comparison **inconclusive** because original A/A failed. Keep all failures and controls; do not retry merely to obtain a pass. Native features were retained. Exact CPU/GPU bottleneck classification, dedicated matched-JS A/A, transfer/memory/long-interaction checks and other-device/day replication remain unperformed.

The weighted profiler failures remain failures. This independently measured primary callback evidence neither repairs those profiles nor converts sample counts into CPU time.
