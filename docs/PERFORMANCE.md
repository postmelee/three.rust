# Performance: what improves today?

The explicit owned-animation prototype reduces CPU work in the measured
many-character scene. It is not yet a generally faster, import-compatible
replacement for Three.js. The [README table](../README.md#how-much-faster-is-it)
is generated directly from the preserved hardware summary with
`npm run docs:performance`; CI checks that it stays in sync.

## The useful result

On an Apple M4 Pro MacBook Pro, the 16-Fox replay took **0.45 ms in Three.js,
0.25 ms in the matched JavaScript design, and 0.20 ms in Rust/Wasm** per typical
frame. The Rust path saved 0.25 ms (about 56%) versus Three.js in this test.
The slower-frame CPU p95 was 1.25 / 0.65 / 0.50 ms respectively. Each figure is
the median of six independent run quantiles, not a pooled-frame statistic.

This creates CPU headroom; it does not mean 56% more FPS. All paths already fit
comfortably within the observed approximately 8.3 ms frame interval, and cadence
stayed essentially unchanged. GPU completion is outside this CPU timer.

The common design avoids ordinary per-object animation/bone processing and keeps
consecutive work together: **action clocks → animation blending → object/bone
transforms → final bone matrix buffers**. Rust owns the persistent state on its
path. The matched JS path keeps the same layout and algorithms so we can separate
this design improvement from the effect of changing language. Its 0.25 ms result
shows that much of the benefit does not require Rust. The remaining 0.05 ms group
median difference is below the old clock's approximately 0.1 ms increment and
some repeat pairs favor JS. A useful independent Rust advantage is not established.

## Conditions and costs

- Physical Apple M4 Pro, macOS 26.5.2, Chrome 155.0.8059.86, Metal-backed WebGL2;
  Three.js 0.186.1. One device/session with uncontrolled background desktop work.
- Licensed Fox asset: 24 joints, three clips; 16 copies is a scale-up variant,
  not the original-size case. Fixed play/pause/manual blend/stop/root/camera replay,
  one full synchronous read every 60 ticks. Equal work at fixed simulation ticks,
  not wall-clock interaction latency.
- Same renderer, opaque material, texture, lighting, 640×480 DPR1, no antialiasing
  or shadows; same conservative bounds, no culling. Some scaled characters reach
  the image edges. No feature may be silently dropped to reproduce a gain.
- Six balanced orders; 1200 warmup + 3600 sampled frames per run, original-only
  A/A before and after. Application inputs, validation, Wasm calls, reads, copying
  and renderer return are all inside the main CPU timer.
- One animated character measured 0.10 ms upstream versus 0.15 ms in both owned
  paths. The clock is coarse and its original A/A drifted 50%; this is an
  unfavorable observation, not a reliable universal 50% slowdown. Static p50
  stayed at 0.10 ms. GPU-oriented shader controls showed no CPU-port benefit.
- Wasm domain initialization took approximately 6.6–6.7 ms versus 2.6–2.8 ms for
  owned JS. These are local shared-cache observations, not cold-start results.

This requires the [explicit owned API](OWNED_ANIMATION.md) and application changes.
The README's ordinary `rthree` import example uses a different transform facade;
it does **not** enable this animation speedup. Automatic crossfade/events, arbitrary
Bone identity/direct edits, additive/cubic/morph animation and CPU animated
bounds/raycast remain outside this prototype. See [the full Mac report](MAC_HARDWARE_REPORT.md)
for numerical/image correctness, unfavorable tails and raw evidence.

## Next physical Mac run

We are resolving the current Rust-versus-JS difference before choosing another
port. The new optional isolation mode may expose finer browser timers; it records
the actual increment rather than assuming precision. This changes the hosting
policy for every Fox path equally. It is a measurement condition, not an engine
requirement or an engine optimization. Do not compare a new isolated result with
an old ordinary result as if only the engine changed. Cross-origin resources may
need CORS/CORP on real sites; this local fixture uses same-origin assets.

Use a fresh checkout of the same committed revision, AC power, stable display and
power settings, a quiet desktop and a fresh output directory. Complete builds and
tests before timing. Keep browser/OS versions fixed and repeat on a separate quiet
day. Do not run correctness or builds concurrently with performance measurement.

```sh
npm ci
npm run fixtures
npm run build
npm test
node scripts/fetch-fox.mjs
npm run test:timing
RTHREE_TIMING_MODE=isolated caffeinate -di bash scripts/mac-validation.sh work/mac-precision-001
# A separate ordinary session is needed to study the hosting-policy effect:
RTHREE_TIMING_MODE=ordinary caffeinate -di bash scripts/mac-validation.sh work/mac-ordinary-001
```

Each session writes `comparison.json` (original A/A drift) and `evidence.json`
(clock, repeat-pair, CPU-tail and interval screens). The latter compares both
upstream and matched JS. Screens do not automatically certify product performance;
original A/A alone does not calibrate matched-JS noise. The updated wrapper also
brackets main with five-repeat matched-JS A/A phases. A fuller Rust verdict still
needs these new hardware measurements, repeated sessions and representative assets.
The initial browser preflight and separate legacy controls use ordinary timing;
Fox's own per-page clock records describe its actual measurement policy.

Separate diagnostic runs now split **input construction/command validation and
delivery**, **evaluation**, **presentation copy**, **paid snapshot**, and **render**.
The new evaluation bucket is not comparable to the historical combined bucket.
Diagnostics request extra reads and may repeat upstream traversal; do not subtract
their costs from uninstrumented main timings or call them pure Rust kernel times.
Zeros near clock resolution do not mean free work.

After a quiet run, rank these residual costs. If commands dominate, reduce redundant
updates with identical changes in the JS control. If evaluation dominates, optimize
its hot loops and data layout with upstream differential tests. Expand into bounds,
visibility and render-list preparation only when actual profiles justify a larger
contiguous Rust boundary. Literal 1:1 translation is useful for semantic comparison,
not a speed guarantee. Report absolute milliseconds and regressions along with any
percentage improvement; a new kernel win alone is not a user-facing improvement.

No new physical-Mac timing run was executed for this tooling change. Cloud tests
validate the measurement path and correctness, not desktop performance.
