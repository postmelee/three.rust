# Owned animation pipeline: experiment result

The finite pipeline now keeps clips, action clocks/weights, hierarchy, poses, world
transforms and final Float32 bone palettes in persistent Rust/Wasm state. It feeds
the retained Three.js WebGL renderer without repeating upstream animation, Bone
world transforms or Skeleton palette multiplication in JavaScript. The same-layout
JS implementation separates architecture changes from a language/backend change.

**Verdict:** a useful CPU signal in the scaled synthetic workload; no desktop GPU,
FPS or general application speedup established. This is an explicit command/read API,
not import-only AnimationMixer compatibility or completion of M5/M6. Read the
[finite contract](OWNED_ANIMATION.md) and [pre-port ADR](adr/0003-owned-animation-experiment.md).

A later [physical Mac and licensed Fox validation](MAC_HARDWARE_REPORT.md) adds Apple Metal evidence with pre/post A/A and real-asset replay. The measurements below remain the original synthetic software-renderer session; do not combine their numbers or scope with the Mac dataset.

## Main-path measurements

Each cell is the median of six per-run quantiles in milliseconds. Linear quantiles
are calculated within each run; all samples and outliers are retained. CPU timing
includes application animation, final output copying and WebGLRenderer return. It
is not GPU completion or total presentation latency. `original` uses upstream;
`js`, `wasm`, `packed-js` are the existing compatibility/transform controls;
`owned-js` and `owned-wasm` use the new explicit domain.

| Scenario | Path | CPU p50 | CPU p95 | CPU p99 | Frame interval p50 |
|---|---|---:|---:|---:|---:|
| animated-1 | original | 0.200 | 0.300 | 0.531 | 16.70 |
| animated-1 | js | 0.200 | 0.300 | 0.400 | 16.70 |
| animated-1 | wasm | 0.200 | 0.300 | 0.400 | 16.70 |
| animated-1 | packed-js | 0.200 | 0.353 | 0.431 | 16.70 |
| animated-1 | owned-js | 0.200 | 0.403 | 0.781 | 16.70 |
| animated-1 | owned-wasm | 0.200 | 0.303 | 0.621 | 16.70 |
| animated-64 | original | 1.750 | 2.907 | 5.461 | 20.10 |
| animated-64 | js | 2.050 | 3.550 | 4.253 | 20.75 |
| animated-64 | wasm | 2.150 | 3.762 | 5.955 | 20.30 |
| animated-64 | packed-js | 2.250 | 3.257 | 4.984 | 19.85 |
| animated-64 | owned-js | 1.550 | 2.010 | 3.431 | 19.85 |
| animated-64 | owned-wasm | 1.050 | 1.200 | 2.272 | 19.85 |
| static-1 | original | 0.200 | 0.707 | 1.496 | 16.70 |
| static-1 | js | 0.200 | 0.300 | 0.531 | 16.70 |
| static-1 | wasm | 0.200 | 0.615 | 1.543 | 16.70 |
| static-1 | packed-js | 0.200 | 0.652 | 1.034 | 16.70 |
| static-1 | owned-js | 0.100 | 0.303 | 0.840 | 16.70 |
| static-1 | owned-wasm | 0.100 | 0.350 | 0.641 | 16.70 |

At 64 rigs, owned Wasm has a median-of-run-medians of 1.05 ms versus original
1.75 ms and owned JS 1.55 ms (40% and 32% lower respectively in this session).
Those ratios of summary medians differ from paired-repeat ratios: median paired
Wasm/original is 0.540 (range 0.364–0.846); Wasm/owned-JS is 0.592 (0.467–1.000).
Wasm was lower than original in all six pairs, lower than matched JS in five and
tied at the timer's resolution in one. This supports further investigation; it
is not a confidence interval or a clean causal estimate on a shared machine.

The architecture-only comparison is less consistent: owned-JS/original paired
ratios range 0.556–1.308, median 0.959. Reducing public binding/object work and
keeping buffers persistent changes the contract as well as the data layout. Do
not attribute all original-to-Wasm differences to Rust. The matched JS/Wasm
comparison is closer, but JIT/compiler/libm/backend differences remain.

Unfavorable results are retained. The old Wasm transform bridge is 2.15 ms versus
1.75 ms original at 64 rigs. At one animated rig, owned JS CPU p95/p99 is
0.403/0.781 ms versus original 0.300/0.531 ms; owned Wasm p99 is 0.622 ms.
These exceed the predeclared 5% reporting threshold and are not hidden. Small
0.1–0.2 ms median differences are near the observed 0.1 ms timer granularity;
static savings in both owned backends reflect reuse of unchanged outputs, not
proof of a useful Rust advantage. Static owned Wasm executes once during setup,
then does no per-frame animation step.

Frame intervals do not show a matching FPS gain: 64-rig medians are 20.10 ms
original and 19.85 ms for both owned paths. Median per-run interval p99 is worse
for owned Wasm (54.47 ms) than original (48.43 ms). One owned-Wasm run has interval
p99 289.18 ms, and its CPU p99 is 8.278 ms. Original CPU p99 spans 3.186–19.444 ms
across runs. Shared CPU scheduling and software rasterization create substantial
noise; neither trimming tails nor claiming a refresh-rate improvement is justified.

## Boundary and separate diagnostic

The 64-rig Wasm run uploads a 24,560-byte descriptor once and one 20,480-byte
initial action batch. Across 60 warmup + 120 measured frames it records 180 steps
and 181 command/step Wasm exports. Per animated tick, final useful palette copies
are 98,304 bytes and root copies 8,192 bytes. There is no JS bone-object scan,
intermediate pose/world readback or snapshot in this main application. The final
texture allocation is 147,456 bytes due to padding; renderer/driver uploads are
not reduced to the useful-copy byte count. The same WebGL shader work remains.

In separate five-repeat diagnostics (30 warmup + 60 samples), 64-rig owned JS
pipeline evaluation p50 is 0.6 ms and Wasm 0.3 ms. Explicit full snapshots cost
0.3 ms for both and copy 431,104 bytes per read. Output-copy p50 rounds to zero;
that means below timer resolution, not free. Full read-heavy diagnostic CPU p50
is 0.9 ms JS / 0.6 ms Wasm: readback can consume as much time as the Rust evaluation.
Counters include warmup, and export counts exclude initialization/pointer queries.

Original diagnostic `evaluate` measures animation only (p50 0.4 ms), while its
`copy` bucket performs world transforms plus palette computation (0.2 ms).
Its snapshot returns ordinary JS palette arrays; owned snapshots copy additional
pose/world/root/action buffers as typed arrays. These read payloads and bucket
boundaries are different. Original read/total diagnostic numbers are preserved
but must not be used as an equivalent-product comparison. Owned JS/Wasm diagnostic
payloads are matched. Timing instrumentation itself is absent from the main run.

Navigation-to-ready startup medians at 64 rigs are 297.3 ms original, 306.0 ms
owned JS and 303.9 ms owned Wasm. These include fixture conversion and loading in
new pages of one running browser; they are not cold-cache/first-install startup
or network bandwidth measurements. Startup and frame CPU time are separate costs.

## Protocol, provenance and reproducibility

- Main: 108 runs, six variants × three cases × six repeats; 60 warmup and 120
  samples each (12,960 measured frames), 2026-10-23 03:22:00–03:29:25 UTC.
  Variant order rotates so each appears once in every position; case order
  reverses on alternate repeats. One Chromium process, a new page per run.
- Synthetic workload: 24 bones per rig, two normal-blended clips, 1 or 64 rigs,
  plus one non-animated control; fixed 1/60 simulation increments. Same geometry,
  camera, renderer, material/shader and draw count; 640×480 canvas, DPR 1.
  It is a new synthetic fixture, not an unmodified public Three.js example.
- Host: shared Intel Xeon Platinum 8573C, five visible CPUs, cgroup quota four
  CPUs / 16 GiB. No `/dev/dri`. Headless Chromium 154.0.8037.57 uses ANGLE Vulkan
  SwiftShader (Subzero); Node 24.19.0, Rust 1.90.0, Three.js 0.186.1. Exact browser
  version and host/backend strings are authoritative in the manifests.
- Main source: `1c018649efecc0b0731e3be074444953660b2827`, clean working tree.
  Diagnostic has the same measured file/binary hashes and source commit, with
  unrelated analysis/docs/bundle-check edits pending (`dirty: true`). Main and
  diagnostic inputs were not modified while either ran. A subsequent runner
  metadata cleanup removes unused inherited M0 options; timing logic is unchanged.
  In archived manifests, `cases`/`variants` describe this experiment; inherited
  `scenarios`/`engines`/`out` defaults are unused, not additional runs.
  Fixture `volumes` describes startup capacity: `activeTracks` is configured track
  capacity even in the static control, and `allocatedPaletteBytes` precedes texture
  padding. Execution counters and adapter padding metrics describe actual work.
- No concurrent local build/test was started during the main or diagnostic runs.
  Background activity on the shared host cannot be controlled. No independent
  A/A timing sessions, thermals or CPU clocks were qualified. Image A/A checks
  are correctness checks and cannot supply a timing noise threshold.

Raw archives: [main](../bench/results/owned-main-20261023/manifest.json),
[diagnostic](../bench/results/owned-diagnostic-20261023/manifest.json),
[initial smoke](../bench/results/owned-smoke-20261023/manifest.json),
[final smoke](../bench/results/owned-smoke-final-20261023/manifest.json).
The short smoke runs are not main measurements. Initial smoke predates the
classification refinement; its six ten-sample runs remain smoke regardless of
its generic manifest label. No failed main runs were discarded. Run summaries
contain per-run ranges, frame intervals, startup and counters, not just this table.

```sh
npm ci
npm run fixtures
npm run build
npm run test:owned
node bench/owned.mjs repeats=6 warmup=60 samples=120 out=work/owned-main-002
node bench/owned-report.mjs work/owned-main-002
node bench/owned.mjs stage=diagnostic variants=original,owned-js,owned-wasm \
  cases=animated-1,animated-64 repeats=5 warmup=30 samples=60 out=work/owned-diag-002
node bench/owned-report.mjs work/owned-diag-002
# Reproduce summaries of committed raw data:
node bench/owned-report.mjs bench/results/owned-main-20261023
node bench/owned-report.mjs bench/results/owned-diagnostic-20261023
```

## Correctness and next decision

Native tests, deterministic and seeded-random upstream differential tests, raw ABI
lifetime/memory-growth checks, strict types and isolated package installation pass.
Fourteen real-browser views compare A/A and all six paths for animated/static rigs;
pixels match exactly on this renderer and numeric palettes meet 2e-6 tolerances.
Root changes, a second camera, synchronous snapshots and callback mutation guards
are checked. Poisoned upstream mixer/Bone/Skeleton calculations do not execute in
the owned path, and native counters prove Wasm execution. See [browser evidence](../bench/results/owned-validation-20261023/results.json).

Next: qualify dedicated desktop hardware (#3/#4), profile representative real
assets (#5), and test this boundary with actual clip diversity, interaction and
readback demand before enlarging it. Events, additive/cubic animation, transparent
sorting, CPU skinning/raycast/bounds, general GLTF import and ordinary object API
migration remain unsupported. No new GPU-heavy application experiment was run;
historical M2 shader controls are separate data. Candidate Rust projects were
source/build-audited, not browser/performance-tested. M3/M4/M5/M6 gates remain open.
