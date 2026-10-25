# Ownership-boundary CPU diagnostic — 2026-10-23

This is a repeated **synthetic browser CPU diagnostic**, with no renderer, rAF,
real asset or application. It does not replace the Mac report or qualify a product
speedup. The existing engine is unchanged; this is new observation, not a newly
implemented optimization. All favorable and unfavorable samples remain archived.

## Protocol and environment

- Clean measured source: `6c6486c5496aa2ac16360b69c98795e1e5b8ee81`.
- Linux 6.18.55, shared Intel Xeon Platinum 8573C, 5 visible logical CPUs;
  Chromium 154.0.8037.57 headless, Node 24.19.0, Rust 1.90.0 release build.
- No `/dev/dri`. Chromium was launched with the standard cloud SwiftShader flags,
  but this diagnostic creates **no graphics context** and measures no GPU work.
- Isolated local hosting; every page observed `crossOriginIsolated=true`. Minimum
  observed clock increment approximately 0.005 ms, not an accuracy guarantee.
- Eight repeats, all eight cyclic rotations of two backends × four demands.
  Reverse shape order on alternating repeats. This balances order positions, not
  all pairwise carryover effects. Fresh page per run, shared browser process.
- Shapes: 1/16/64 rigs × 24 bones, and 64 rigs × 96 bones. Two active quaternion
  clips, exactly the existing synthetic rig generator. No external asset/license.
- Each run: 128 warmup ticks; 24 timed blocks of 16 ticks. 256 runs, 6,144 raw
  block durations, 98,304 measured ticks and 32,768 warmup ticks. Oracle work occurs
  outside timing. Fixed delta 1/60; these are tight-loop ticks, not display frames.
- Setup, initialization, fixture creation and final verification are outside timing.
  Validation, command encoding/allocation, Wasm calls, evaluation and requested
  snapshots are inside timing. No separately instrumented per-stage subtraction.
- Started 11:40:11 UTC, finished 11:46:05 UTC (20:40–20:46 Asia/Seoul).

Demand modes use the same final logical state:

| Mode | Per tick |
|---|---|
| retained | Advance existing action state only; no new command |
| batch | Re-submit the unchanged first-clip weight for every rig in one batch, then advance |
| fragmented | Same valid weight commands, one call per rig, then advance |
| snapshot | Same batched commands and advance, then copy all pose/world/root/action/palette arrays |

Repeated unchanged weights deliberately isolate boundary work that a persistent
engine could avoid. This is not a representative interaction replay. Inputs are
preconstructed outside timing; API encoding/validation allocations remain inside.
Splitting valid independent commands with no intervening observers preserves this
case's result; it is not generally equivalent to atomic batches on invalid input.

## Observations

See the [complete table](table.md) and [per-run medians, errors and counters](summary.json).
Values below are median run medians of block-average tick time, **not frame p50/p95**.

| Diagnostic condition | Matched JS | Wasm |
|---|---:|---:|
| 64 × 24, retained state | 0.6168 ms | 0.3036 ms |
| 64 × 24, batch commands | 0.6438 ms | 0.3227 ms |
| 64 × 24, fragmented commands | 0.6982 ms | 0.3685 ms |
| 64 × 24, batch + full snapshot | 0.8956 ms | 0.5648 ms |
| 64 × 96, retained state | 2.4809 ms | 1.2341 ms |
| 64 × 96, batch + full snapshot | 3.4694 ms | 2.2027 ms |

The large retained-state kernel is approximately twice as fast in this Wasm build
as in the matched JS implementation on this host. Per-tick full materialization
substantially increases time in both paths; it does not eliminate this diagnostic's
Wasm advantage. At 64 × 96 it copies 1,684,480 logical bytes per snapshot. For 64 rigs,
fragmented commands use 65 command/step exports per tick versus 2 for batch and 1 for
retained, while both command modes encode 10,240 bytes per tick. These counts passed
assertions in every run. API validation, allocations and invocation overhead change
together; the timing difference is **not an isolated Wasm-call latency measurement**.

All final pose/world/root/action/palette elements matched the JS oracle exactly in
these fixtures (maximum absolute error 0). Wasm execution, expected steps, batches,
command bytes and read bytes were asserted. This does not add upstream or image
coverage; those exist separately for the current finite engine.

The one-rig `batch` and `fragmented` cases perform equivalent work yet have different
sample medians, illustrating warmup/JIT/noise limits. Warmup was fixed, not certified
as convergence; no matched A/A bracketing, second session/day, independent host,
hardware GPU, full-path render, actual application, input latency or GC/memory study
was run. Block averaging hides individual tick tails. No confidence interval or
statistical product-acceptance decision is claimed. Small values should not be used
to rank deployment choices.

## Reproduce

After the standard clean install/build:

```sh
CHROMIUM=/path/to/chromium node bench/ownership-boundary.mjs work/boundary-new
node bench/ownership-boundary-report.mjs work/boundary-new
node bench/ownership-boundary-report.mjs bench/results/ownership-boundary-20261023
```

The driver uses headless isolated hosting on a free local port, even on a desktop;
it is intentionally a CPU diagnostic. For product evidence use the separate
[hardware protocol](../../../docs/PERFORMANCE.md#next-physical-mac-run) and qualified
real-app cohort instead. Source/build inputs and the exact binary hash are recorded
in [manifest.json](manifest.json). [environment.json](environment.json) adds cgroup
limits observed afterward. `SHA256SUMS.json` hashes archive payloads other than itself.

## Attempts retained

An initial sandbox attempt failed at Node's child-process policy before a manifest
or samples were written. The first executable attempt navigated to LICENSE, served
as a download, and stopped before samples; its failed manifest is in
`attempts/inert-document-failure.json`. The driver was fixed to use an inert HTML
document, committed, then run in a new directory. Failed attempts were not pooled.
