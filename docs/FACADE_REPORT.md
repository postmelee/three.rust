# C2 result: persistent matrices, no Three.js speedup

**The corrected facade remains slower than original Three.js in these cloud tests.**
Keep it opt-in. The implemented state boundary and correctness tests are useful
engineering results; they do not qualify an application replacement.

| Candidate | Source | Hierarchy CPU p50: original / facade JS / facade Wasm |
|---|---|---|
| Initial facade | `b1b8790bbcdb26d2dca39c29fcc85441c5265a69` | 16.64 / 172.61 / 169.23 ms |
| Corrected internal reads | `dabcd69d3c30a9560d36ffc9a52862ef329892d8` | 15.13 / 51.63 / 37.01 ms |

These are separate six-repeat series, each with its own controls. The correction
removes much of the initial regression, but the final Rust route still uses about
2.45 times the original's CPU time. It loses to original in all six paired p50
comparisons for each measured workload. Matched JS is the same facade design, not
the best possible JS implementation. Its slower result is not a product win.

## What changed and what passed

| Boundary | Result |
|---|---|
| Persistent evaluated local/world matrices | Native indexed slots, generations and ordered batches; unchanged local composition reused |
| Ordinary public controls | Tracked TRS/flag writes, synchronous coupling, stable objects and lazy array snapshots |
| Update methods | Eligible updateMatrix/updateMatrixWorld/updateWorldMatrix execute Rust; throwing upstream compose/multiply probes confirm displaced work is skipped |
| Aliases and fallback | Direct writes, force, growth/release/re-registration, caller-owned arrays and override/callback behavior tested |
| Internal consumers | Pinned read-only math synchronizes once, then uses the backing array; mutation targets and overridable calls retain public tracked arrays |
| Rust / Node | 11 native tests, 16 facade checks, nine legacy differentials; existing eight owned checks also pass |
| Semantic contract | 16 cases × six routes × Node/Chromium = 192 executions, 160 candidate/reference trace comparisons |
| Actual rendering | Two-camera callback/matrix/exact-pixel checks; five fixture scenes, 35 pages and 30 A/A or candidate numeric/image comparisons |
| Installed package | Default and both facade entries: init/retry, addon identity, NodeNext/Bundler types, single-core bundling |

Ordinary animation, skeleton palette evaluation, topology selection, culling,
sorting, renderer and shaders remain JS/GPU. Only evaluated transform state and
its eligible calculations have new authority. Reflection, proxy cloning and
other exclusions remain in the [API contract](PERSISTENT_FACADE.md).

## Environment and protocol

| Item | Recorded conditions |
|---|---|
| Machine | Shared cloud Linux; Intel Xeon Platinum 8573C; five exposed logical CPUs |
| GPU exposure | No `/dev/dri` or PCI display device exposed; no physical GPU qualification |
| Browser | Chromium 154.0.8037.57, headless ANGLE Vulkan SwiftShader |
| Viewport / clock | 640 × 360, DPR 1, isolated origin; observed minimum clock increment 0.005 ms |
| Primary boundary series | Six engines × six repeats; five 1,000-node cases; 40 warmup + 100 sampled ticks per case |
| Primary rendered series | Six engines × six repeats × three scenes; 30 warmup + 90 sampled rAF frames |
| Ordering | Rotated engine order; one page/run at a time; clean committed sources; no concurrent build/test during timing |
| Separate diagnostics | One repeat; boundary 20/30 warmup/samples, rendering 10/20; an additional 1 ms CPU sampling profile after timing |

CPU is main-thread wall elapsed time, including preemption/driver backpressure,
not on-CPU cycles or GPU completion. Quantiles use sample index floor((n−1)q),
then the arithmetic median across run quantiles. Raw p50/p95/p99, per-run ranges,
paired differences, clock records, frame intervals and failed/short attempts are
retained. No pooled-frame confidence or hardware/FPS claim is made.

The hierarchy is the declared 10,000-cube / 1,000-animated-group adaptation; its
nonrecursive raycast does not hit grouped meshes. Small is an eight-cube static
variant. Shader is the upstream Monjori adaptation; hardware GPU dominance is not
established here. See [source, license and adaptation details](../fixtures/README.md).

## Corrected full-render CPU results

Milliseconds; medians of six runs' quantiles. Draw/program/primitive counts and
object populations at the final fixed tick match across the six routes.

| Scene | Engine | p50 | p95 | p99 |
|---|---|---:|---:|---:|
| Hierarchy | Original | 15.128 | 31.013 | 49.048 |
| Hierarchy | Compatibility JS | 16.620 | 31.393 | 36.718 |
| Hierarchy | Legacy Wasm | 21.378 | 38.775 | 61.355 |
| Hierarchy | Legacy packed JS | 23.968 | 38.570 | 44.110 |
| Hierarchy | Facade JS | 51.625 | 69.630 | 106.255 |
| Hierarchy | Facade Wasm | 37.010 | 58.735 | 87.255 |
| Small/static | Original | 0.298 | 0.668 | 1.660 |
| Small/static | Compatibility JS | 0.313 | 0.578 | 1.103 |
| Small/static | Legacy Wasm | 0.298 | 0.528 | 0.968 |
| Small/static | Legacy packed JS | 0.288 | 0.578 | 1.030 |
| Small/static | Facade JS | 0.353 | 0.773 | 1.518 |
| Small/static | Facade Wasm | 0.375 | 0.830 | 1.413 |
| Shader | Original | 0.100 | 0.208 | 0.500 |
| Shader | Compatibility JS | 0.118 | 0.193 | 0.275 |
| Shader | Legacy Wasm | 0.140 | 0.250 | 0.485 |
| Shader | Legacy packed JS | 0.138 | 0.438 | 3.593 |
| Shader | Facade JS | 0.155 | 0.268 | 0.598 |
| Shader | Facade Wasm | 0.145 | 0.330 | 2.220 |

The facade Wasm hierarchy beats its matched JS route in five of six paired p50
comparisons, but still loses to original and the legacy bridge. Shared-cloud noise
and different code paths prevent assigning the entire difference to native kernel
time. No application or independent-Rust qualification gate advances.

## Boundary costs and the correction

Boundary-only p50, ms; no renderer. Each case has 1,000 nodes plus a root. Sparse
writes touch ten nodes; sparse reads observe one world matrix; all reads visit all
16 world-matrix elements on every node. Full six-route tails are in the raw summary.

| Writes / reads | Original | Legacy Wasm | Facade JS | Facade Wasm |
|---|---:|---:|---:|---:|
| None / none | 0.065 | 0.240 | 0.568 | 0.563 |
| Sparse / none | 0.060 | 0.233 | 0.590 | 0.530 |
| Dense / none | 0.055 | 0.245 | 0.935 | 0.860 |
| Sparse / sparse | 0.055 | 0.193 | 0.520 | 0.483 |
| Dense / all | 0.090 | 0.223 | 4.460 | 4.408 |

Zero output copying is real in no-read cases; it does not mean a zero-cost boundary.
The facade still builds a 28,028-byte operation list and walks the selected objects
each tick. Direct application loops over proxy elements remain costly after the
internal-consumer correction. Do not generalize this failure to every facade design.

| Hierarchy diagnostic, average per frame | Legacy Wasm | Facade Wasm |
|---|---:|---:|
| Input payload written | 16,000 B | 112,632 B |
| Operation records | 0 B | 308,140 B |
| Matrix materialization | 2,816,512 B | 1,280,384 B |

C2 uploads all 14 components of a dirty TRS record; legacy scans everything but
stores only different values. Fewer scans/copies can coexist with more input payload
and much greater JS bookkeeping. Instrumented native kernel time is about 0.90 ms
per hierarchy frame; that diagnostic is not subtracted from primary quantiles.
`readMs` measures snapshot copies, not all proxy/getter or consumer costs.

Initial CPU sampling concentrates in frustum/matrix consumers and proxy getters.
After the read correction, tree collection and facade preparation remain prominent.
The intermediate dbad72e correction also exposed a backing array through an
overridden Vector3.fromArray; it was rejected before full timing, fixed and covered
by a regression test. Its partial verification outputs were not relabeled complete.

## Decision and next work

1. Keep the facade opt-in; do not replace the default or advertise acceleration.
2. For C3, budget persistent topology/dirty commands and prepared renderer consumption
   together. Avoid reconstructing every operation and observing public matrices for
   every draw. Preserve C1 callback, override and synchronous-read requirements.
3. Select the next contiguous CPU stages using original real-application profiles
   from the local work, then test a matched JS implementation and native integration.
   Artificial facade overhead is not evidence of the original application's bottleneck.
4. Defer SIMD/workers/backend expansion until a complete path has useful headroom.
   Repeat physical-hardware validation on an immutable candidate; this cloud series
   supplies neither desktop GPU performance nor startup/memory/release qualification.

[Raw results and reproduction](../bench/results/facade-c2-20261023/README.md) ·
[API and commands](PERSISTENT_FACADE.md) · [ADR](adr/0006-persistent-facade.md)
