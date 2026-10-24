# C3: prepared main-pass results

**C3 remains slower than original Three.js in all five measured scenes.**
For 10,000 cubes, CPU p50 is **17.87 ms original / 47.76 ms C2 Wasm / 37.78 ms
C3 Wasm**. C3 removes about 21% of C2's cost, but still takes about 2.1 times
original CPU time in this shared-cloud test. This is a completed negative
experiment, not a new acceleration or replacement claim.

The optional `rthree/prepared` retains topology and evaluates transforms → sphere
visibility → default ordering → draw matrices in Rust. The pinned WebGL renderer
consumes its results. Public JS inputs, resources, shaders, shadows and unsupported
passes retain the [documented behavior](PREPARED_PASS.md). Default `rthree` is unchanged.

## Complete rendering path

Milliseconds; arithmetic median of six run-level CPU p50 values. Updates, reads,
synchronization, allocation, prepared output copies and renderer return are inside
the timer. It is elapsed application CPU-path time, including possible driver waits,
not GPU completion. All paths render the same work.

| Scene | Original | Compatibility JS | C2 JS | C2 Wasm | C3 JS | C3 Wasm |
|---|---:|---:|---:|---:|---:|---:|
| 2,000 interactive cubes | 2.88 | 3.17 | 8.84 | 8.02 | 7.52 | 6.62 |
| One Soldier; fallback | 0.77 | 0.85 | 1.43 | 1.57 | 1.63 | 1.57 |
| Shader control | 0.11 | 0.11 | 0.14 | 0.16 | 0.20 | 0.16 |
| Eight static cubes | 0.28 | 0.29 | 0.34 | 0.42 | 0.45 | 0.45 |
| 10,000 cubes / 1,000 groups | 17.87 | 17.16 | 47.90 | 47.76 | 42.73 | 37.78 |

The hierarchy is an enlarged/animated adaptation, not an original-size example.
The Soldier main pass explicitly falls back; it does not measure a native skinning
port. Source pins, original adaptations and asset rights remain in
[fixture provenance](../fixtures/README.md).

| Scene | Original p95 / p99 | C3 JS p95 / p99 | C3 Wasm p95 / p99 | C3 faster than original, p50 / p95 pairs |
|---|---:|---:|---:|---:|
| 2,000 interactive cubes | 4.56 / 7.54 | 9.02 / 24.88 | 14.96 / 24.59 | 0/6 / 0/6 |
| One Soldier; fallback | 1.71 / 3.51 | 2.48 / 3.20 | 2.79 / 3.81 | 0/6 / 1/6 |
| Shader control | 0.19 / 0.30 | 0.29 / 0.76 | 0.26 / 0.29 | 0/6 / 1/6 |
| Eight static cubes | 0.61 / 0.92 | 1.06 / 1.86 | 1.14 / 2.08 | 0/6 / 0/6 |
| 10,000 cubes / 1,000 groups | 34.17 / 54.96 | 63.26 / 95.59 | 58.44 / 70.83 | 0/6 / 0/6 |

The [raw summary](../bench/results/prepared-c3-20261024/corrected/render/summary.json)
also retains per-run ranges, each p50/p95/p99, rAF intervals and exact paired
changes. The separate [decision data](../bench/results/prepared-c3-20261024/corrected/render/decision.json.gz)
checks relative and absolute thresholds. No FPS improvement is claimed.

## Boundary costs and regressions

The separate no-render experiment has 1,000 objects. `sparse` writes ten positions
or reads one world-matrix element per tick; `dense/all` writes all positions and
reads all 16 world elements of every object. These are tick costs, not frame gains.

| Writes / reads | Original p50 | C2 Wasm p50 | C3 JS p50 | C3 Wasm p50 |
|---|---:|---:|---:|---:|
| static-none | 0.08 | 0.59 | 0.09 | 0.05 |
| sparse-none | 0.08 | 0.62 | 0.09 | 0.05 |
| dense-none | 0.08 | 0.91 | 0.86 | 0.80 |
| sparse-sparse | 0.07 | 0.52 | 0.09 | 0.05 |
| dense-all | 0.10 | 4.58 | 4.95 | 5.45 |

Low-read retained updates remove much of C2's per-frame JS command rebuilding.
Dense input and especially cached-array reads still impose large compatibility
costs. A smaller boundary cost does not establish a complete-path gain. All negative
cases and tails remain in the archive; no favorable case replaced a control.

## Decision and remaining cost

Both predeclared experimental screens fail. Original wins all six p50 pairs in
every scene. C3 improves the hierarchy over C2 in all six p50 pairs, but only five
p95 pairs. Compared with matched C3 JS, its hierarchy group-median p50 saves
4.95 ms (11.6%), while p95 saves 4.83 ms (7.6%); only five pairs favor Rust at
either quantile. That does not establish the required repeatable Rust advantage.

Control regressions above max(5%, 0.2 ms), versus original:

| Control | C3 extra CPU p50 | C3 extra CPU p95 | Budget exceeded |
|---|---:|---:|---|
| Interactive cubes | 3.74 ms | 10.41 ms | p50 and p95 |
| Soldier fallback | 0.81 ms | 1.08 ms | p50 and p95 |
| Eight static cubes | 0.16 ms | 0.53 ms | p95 |
| Shader control | 0.05 ms | 0.07 ms | Neither; still no gain |

The separate hierarchy diagnostic shows the intended boundary change:

| Work per measured transition | C2 Wasm | C3 Wasm |
|---|---:|---:|
| Rebuilt JS command bytes | 308,140 | 84 |
| Transform input bytes | 112,632 | 112,632 |
| Public local/world snapshot bytes | 1,280,384 | 355,018 |
| Prepared input bytes / final draw-matrix bytes | 0 / 0 | 472 / 554,116 |
| Topology rebuilds | 0 | 0 |
| Transform calls / prepared calls | 4 / 0 | 4 / 1 |

C3 retains the scene plan; the 84 bytes are general selective/camera operations.
It still copies approximately 2,771 visible objects' draw matrices. Additional
matrix output replaces computations, so fewer snapshot bytes alone are not a
product improvement.

| Instrumented C3 mean per transition | Time |
|---|---:|
| Transform synchronization | 2.88 ms |
| Transform evaluator | 1.55 ms |
| Public matrix snapshot reads | 2.32 ms |
| Pass preparation and JS handoff, including evaluator | 7.47 ms |
| Pass evaluator (nested in preceding row) | 1.75 ms |
| Final per-draw matrix copies | 3.76 ms |

These are 19 differences between 20 separately instrumented samples. They are not
an additive decomposition of the primary p50. Setters, resource/material checks,
renderer dispatch and driver waits are not fully isolated. The separate sampling
profile retains `setProgram`, `renderObjects`, facade getters/materialization and
`refreshPassInputs` among its visible costs, alongside actual `prepared_pass` Wasm
samples. [Diagnostic counters](../bench/results/prepared-c3-20261024/corrected/render-diagnostic/summary.json)
and complete profiles are preserved; sampled durations include idle and native waits.

**Next:** keep C3 optional and obtain the outstanding original real-app profiles
and same-device candidate comparison. A finite follow-up should first test the
cost of cached-array observation and dirty material/geometry tracking, with the
same change in JS. Use application profiles to select the next native stages.
Defer R1 SIMD, workers and a full backend rewrite as the default next move; each
needs evidence that its affected cost is large enough. If per-draw submission
remains dominant on hardware, compare a bounded prepared/batched consumer with
existing Three.js instancing/batching and a matched JS control before choosing B1.
No additional optimization or hardware timing is claimed by this report.

## Verification and provenance

- Candidate: `066ddbaa3d538e95126a46c9203b550613bf3d3d`; Three.js 0.186.1, Rust 1.90.0, release Wasm.
- Native 14 tests, legacy differential/types, facade and eight-route contract pass.
  Both C3 modes pass 13 state/facade cases each plus the upstream 90-node/24-frame
  culling/order/matrix oracle. Installed ESM/addon identity/NodeNext/Bundler and demo
  route/pause checks pass.
- Original A/A, C2 Wasm and both C3 modes match exact pixels/numerics in 12 main,
  second-camera, shadow and fallback checkpoints, plus nested render, exception
  recovery and attribute-upload callback checks. Five public-example adaptations
  also match original pixels/numerics. These are finite same-browser checks.
- Poison guards prove replaced JS calculations are skipped. The probe records one
  native prepared call, two transform calls, 16 consumed draw matrices, zero topology
  rebuilds and 28 command bytes for the separate camera operation. WebGL receives
  normal Float32 uniform upload arrays, never private backing storage.
- A forced-GC regression exposed strong dirty queues retaining abandoned native
  slots. Weak record queues fix it in both modes. Source 7710808's completed boundary
  series and 40 interrupted render runs are preserved under `initial/`, excluded
  from this verdict. The earlier missing-Fox setup failure and its pinned fetch/retry
  are retained too. No failed assertion was relaxed.

[Evidence archive](../bench/results/prepared-c3-20261024/) contains raw data,
environment, correctness traces, image hashes, checks, profiles and checksums.
Correctness manifests honestly record pre-commit staged trees; source/binary hashes
are checked against this clean measured candidate. Soldier images/assets are not
redistributed because separate asset rights remain unverified; numeric comparisons
and image hashes are retained. Synthetic prepared-pass images are included.

## Protocol and reproduction

Linux, shared Xeon Platinum 8573C (five logical CPUs), Chromium 154.0.8037.57,
640×360 DPR1, headless SwiftShader. `/dev/dri` is absent and no PCI display device is
exposed. Pages are cross-origin isolated; the observed minimum clock increment
was about 0.005 ms. Renderer/clock data is recorded for each run. Software graphics
also use host CPU, so these results do not predict physical desktop GPU performance.

Six engine orders rotate over six repeats. Rendering: 30 warmup + 90 samples,
five scenes × six routes = 180 runs / 16,200 samples. Boundary: 40 + 100,
36 runs × five cases = 18,000 sampled ticks. Per-run quantiles use
`floor((n - 1) * q)`; the table takes their arithmetic median. No pooled confidence
claim. No concurrent builds, tests or profiles during primary timing. Shared host
activity, short warmup, one session and the absence of a separate quiet A/A series
limit generalization. Hardware runs need longer warmup, A/A and independent days.

Instrumented runs are separate: boundary 20/30, rendering 10/20, one repeat each.
A separate 1 ms CPU sampling profile uses 22 warmup and 30 measured hierarchy
frames. Diagnostic samples cannot be subtracted from primary quantiles or called
unbiased kernel times. Cold startup, full memory/GC churn, physical GPU durations,
other browsers, real-app adoption and context recovery are not qualified here.

From a clean checkout of the candidate, follow [setup](CLOUD_SETUP.md), then use
fresh output paths:

```sh
node bench/facade.mjs suite=boundary repeats=6 warmup=40 samples=100 engines=original,js,facade-js,facade-wasm,prepared-js,prepared-wasm out=work/c3-boundary-new
node bench/facade.mjs suite=render scenarios=cubes,skinning,shader,small,hierarchy repeats=6 warmup=30 samples=90 engines=original,js,facade-js,facade-wasm,prepared-js,prepared-wasm out=work/c3-render-new
node bench/facade-summary.mjs work/c3-boundary-new > work/c3-boundary-new/summary.json
node bench/facade-summary.mjs work/c3-render-new > work/c3-render-new/summary.json
node bench/facade.mjs suite=boundary repeats=1 warmup=20 samples=30 timings=true engines=original,js,facade-js,facade-wasm,prepared-js,prepared-wasm out=work/c3-boundary-diagnostic-new
node bench/facade.mjs suite=render repeats=1 warmup=10 samples=20 timings=true engines=original,js,facade-js,facade-wasm,prepared-js,prepared-wasm out=work/c3-render-diagnostic-new
node bench/facade-profile.mjs work/c3-profile-new original,prepared-js,prepared-wasm
python3 bench/prepared-decision.py work/c3-render-new
python3 bench/prepared-diagnostics.py work/c3-render-diagnostic-new work/c3-profile-new
```

For a dedicated desktop use `mode=hardware`, the actual Chrome path in `CHROMIUM`,
longer predeclared warmup/samples and the same viewport/quality for every route.
Hardware mode rejects recognized software renderers. Follow the [physical protocol](CI_MAC.md)
for A/A, quiet conditions and environment records; do not compare a new hardware
run against this cloud baseline as a language-only effect.

The [predeclared plan](../mydocs/plans/task_m5_40.md) requires 20% and 1 ms at p50/p95
versus original, and 10% and 0.5 ms over matched JS for a useful independent Rust
result. This report interprets consistent pairs conservatively as all six faster
at both quantiles. Control regressions above max(5%, 0.2 ms) are retained explicitly.
These experiment screens do not qualify any [product gate](PRODUCT_GOALS.md).
