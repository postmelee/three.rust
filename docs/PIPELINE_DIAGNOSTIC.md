# Pipeline preparation: cloud diagnostic observation

This is a small preparation diagnostic, not M5, not hardware performance evidence,
and not a product speedup verdict. No Rust engine code changed. The current Wasm
path still bridges JS-owned transforms; animation and palettes execute in JS.

## Protocol and provenance

- CPU-only: 1/16/64 rigs × original/current Wasm × 3 repeats = 18 runs, 30 warmup
  and 60 measured ticks each (1,080 samples). Stages are disjoint; no renderer call.
- Full render: 1/16 rigs × A/B/C/D × 3 repeats = 24 runs, 10 warmup and 30 measured
  frames each (720 samples). Animate plus normal renderer.render, no pre-update.
- 24 bones per rig, two quaternion clips, 1/60 simulated seconds per tick; shared
  cylinder geometry/material; no external assets. Actual viewport 640×540, canvas
  640×480, DPR 1. Counts/engine order reverse on alternate repetitions. This is
  not randomization or the longer hardware protocol.
- Linux 6.18.55, five visible Xeon Platinum 8573C logical CPUs, four-CPU cgroup quota,
  16 GiB cgroup memory cap; Node 24.19.0, Chromium 154.0.8037.57. No /dev/dri.
  WebGL reports ANGLE Vulkan SwiftShader Device (Subzero), SwiftShader driver.
- Raw timestamps, source SHA-256, exact options and environment are in each manifest.
  The working tree was dirty while measuring; source parent and measured file hashes
  are recorded. Final committed harness/fixture hashes match the corrected datasets.
- An earlier CPU diagnostic is also retained, with an explicitly documented unused
  viewport-metadata error and its original runner source; it was rerun, not edited.

[CPU raw data](../bench/results/preparation-cpu-viewport-20261023) · [Full-render raw data](../bench/results/preparation-render-20261023) · [Preliminary dataset correction](../bench/results/preparation-cpu-20261023/README.md)

## CPU-only stages

Numbers below are pooled means in milliseconds; individual readings have roughly
0.1 ms granularity here. Means of small quantized readings are descriptive, not
precise sub-millisecond latency estimates. The JSON also keeps p50/p95/p99 and
median run p50; small-workload p50 can be zero and must not be used for ratios.

| Rigs | Engine | Animation mean | Transforms mean | Palette mean | Total mean | Total p95 / p99 |
|---|---|---:|---:|---:|---:|---:|
| 1 | original | 0.024 | 0.012 | 0.004 | 0.041 | 0.1 / 0.1 |
| 1 | wasm | 0.021 | 0.031 | 0.002 | 0.054 | 0.1 / 0.2 |
| 16 | original | 0.119 | 0.037 | 0.021 | 0.178 | 0.3 / 0.3 |
| 16 | wasm | 0.129 | 0.112 | 0.027 | 0.268 | 0.4 / 0.6 |
| 64 | original | 0.431 | 0.132 | 0.104 | 0.667 | 0.8 / 0.9 |
| 64 | wasm | 0.499 | 0.434 | 0.106 | 1.040 | 1.3 / 1.5 |

At 64 rigs the original combined CPU pipeline averages about 0.67 ms, of which
animation is about 0.43 ms. The current transform bridge costs more, not less,
for this workload. This supports testing a larger consecutive ownership boundary;
it does **not** establish that Rust will improve the final product. Even removing
this entire original pipeline would save less than 1 ms in this CPU-only workload.
A real application with larger useful costs is needed to justify the complexity.

## Full render path

CPU p50 is the median of run p50s. Tails are pooled descriptive quantiles, not
run-level confidence intervals. All outliers are retained.

| Rigs | Engine | CPU p50 | CPU p95 | CPU p99 | Interval p50 | Interval p95 |
|---|---|---:|---:|---:|---:|---:|
| 1 | original | 0.2 | 0.7 | 1.1 | 16.6 | 17.1 |
| 1 | js | 0.2 | 0.3 | 0.5 | 16.6 | 17.0 |
| 1 | wasm | 0.2 | 0.5 | 1.9 | 16.7 | 18.8 |
| 1 | packed-js | 0.3 | 0.9 | 1.2 | 16.7 | 17.2 |
| 16 | original | 1.0 | 4.1 | 15.9 | 16.7 | 74.0 |
| 16 | js | 1.1 | 3.0 | 4.0 | 16.7 | 17.8 |
| 16 | wasm | 1.0 | 3.4 | 5.3 | 16.7 | 17.0 |
| 16 | packed-js | 1.1 | 2.0 | 2.9 | 16.7 | 33.9 |

The 16-rig medians cluster around 1.0–1.1 ms, with large uneven tails and software
rendering/host scheduling interference. Neither a product improvement nor reliable
engine ranking follows. The roughly 16.7 ms median rAF interval is a scheduling
constraint, not the workload's measured CPU cost or a general browser FPS ceiling.
GPU shader time is not measured by these CPU intervals.

## Boundary volume and next decision

At 64 × 24 bones, useful final palettes are **98,304 bytes/frame**; merely reading
all bone world matrices as f64 would be **196,608 bytes/frame**, before local pose
or metadata synchronization. A renderer texture may pad palettes beyond useful
bytes; both lengths are recorded. Shared immutable clip inputs are 4,800 bytes,
while action/pose state is per rig. These are buffer sizes, not measured bandwidth
or proof that copies are free. Runtime diagnostic counters include construction
and warmup and must not be divided by sampled frames as if they were steady state.

The next candidate should keep action state, intermediate poses and world matrices
in one domain and expose final buffers plus explicit read barriers. First compare
an optimized JS implementation with the same domain; then Rust isolates the
language effect. The [preparation contract](PIPELINE_PREPARATION.md) specifies
source dispatch, callback ordering, palette lifetime and the actual renderer bypass.
Hardware A/A baselines, representative animated assets, reuse/build review and the
final target ADR remain open. This result does not close #4, #5, #7 or #15.

Reproduce summaries with `node bench/pipeline-report.mjs <cpu-dir> <render-dir>`.
A failed/incomplete manifest or missing repeats is rejected by the summarizer.
No timing samples are trimmed and no unsupported confidence interval is reported.
