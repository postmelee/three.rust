import {readFileSync,writeFileSync} from 'node:fs';
const dir='bench/results/m2-full';const a=JSON.parse(readFileSync(`${dir}/analysis.json`)),m=JSON.parse(readFileSync(`${dir}/manifest.json`));
const fmt=x=>x.toFixed(2),names={cubes:'Original-size cubes',skinning:'Original-size Soldier',shader:'Shader control',small:'Small static variant',hierarchy:'Enlarged hierarchy variant'};
let table='| Scene | A original p50 | B JS p50 | C Wasm p50 | D packed JS p50 | Paired C/A change (95% bootstrap) |\n|---|---:|---:|---:|---:|---|\n';
for(const s of m.scenarios){const rows=m.engines.map(e=>a.table.find(x=>x.scenario===s&&x.engine===e));const c=a.comparisons.find(x=>x.scenario===s&&x.engine==='wasm').relativeP50Percent;table+=`| ${names[s]} | ${rows.map(r=>fmt(r.cpuP50)).join(' | ')} | ${fmt(c.median)}% [${fmt(c.lo)}, ${fmt(c.hi)}] |\n`;}
const body=`# M0–M2 experiment report

2026-10-22. **The Rust port and real renderer integration work, but this environment
did not establish a general whole-frame performance improvement.** Every scenario
and repeat, including regressions, is preserved. The experiment covers Object3D
transform subtrees, not a complete Rust Three.js engine, full compatibility, or
physical desktop GPU/FPS improvement. This English edition preserves the original
measurement values and limitations; it is not a new performance run.

## Baseline and experimental decision

An independent checkout and codex/independent-m0-m2 branch started at bootstrap
98f59c5, preserving existing workspace files. No previous implementation, ADR or
measurement was used. M0 commit c458d73 recorded public sources, fresh profiles and
rejected alternatives in an ADR before M1/M2 implementation.

npm three@0.186.1 and annotated tag r186 resolve to commit 9b4a2ac…. Original
examples, SHA-256s, adaptations and licenses are recorded under fixtures/. The
primary fixture was the original-size interactive cubes example. One Soldier,
Monjori shader, eight static cubes, and a 10,000-cube/1,000-group hierarchy variant
were retained. The enlarged variant is not an original-example result: its
nonrecursive raycast sees groups, changing picking work. All A/B/C/D modes use
the same adaptation.

In M0 original cubes, average transform update cost was about 0.187 ms of 2.913 ms
total. Even eliminating it entirely implies about a 6.4% theoretical CPU saving
before bridge cost. The bootstrap 20% ambition was therefore already unlikely
for this slice. Small measured skinning/animation costs, raycast specificity and
renderer-replacement confounds motivated a bounded transform ownership experiment.

## Main measurement

Measured implementation commit: ${m.commit}. The manifest records actual JS/Wasm
and lockfile hashes. ${m.repeats} repeats × ${m.scenarios.length} scenes × ${m.engines.length} engines = ${m.runs.length} runs;
each has ${m.warmup} warm-up frames + ${m.samples} sampled frames, totaling ${a.sampleCount.toLocaleString('en-US')} samples.
Engine starting order rotates; pages run sequentially in a shared browser process.
All modes use 640×360, DPR 1, seed 42 and identical simulation tick ranges.
No image capture, V8 sampling, GPU query or bridge stage timers run in this dataset.

CPU units below are milliseconds: first calculate each run's p50, then take the
median across runs. Changes pair C/A within each repeat before aggregation, so they
can differ from the ratio of table medians. Positive means **slower**. Seven-run
bootstrap intervals are exploratory; 25,200 adjacent frames are not independent
experimental repetitions.

${table}

All p50/p95/p99 and interval p95 values are in [the detailed table](../bench/results/m2-full/table.md).
Per-run statistics and paired distributions are in [analysis.json](../bench/results/m2-full/analysis.json);
[raw frames](../bench/results/m2-full/) retain slow samples. Final-frame draw calls,
triangles and program counts were checked for equality across A/B/C/D.

D performs JS arithmetic inside C's scan/buffer/materialization path. A C-over-D
win only describes this particular implementation, not product improvement over A.
D is not claimed to be the best achievable JS engine. B/A includes bundling, hook
branches, JIT effects and cloud noise. Values near 0.1 ms in small scenes are
strongly affected by timer granularity; ratios are correspondingly limited.

## Implementation and correctness

Rust retains an f64 pose/parent/local/world/flag arena. One batch computes local
matrices and parent-child world propagation without calling JS Three.js math.
Public JS objects and arrays stay in place: direct changes are scanned, then
results are written into the same arrays. Scanning, copies, allocation and
materialization remain in complete-path timing. Camera, SkinnedMesh and custom
overrides retain original dispatch; eligible descendants can batch.
updateWorldMatrix, synchronous read helpers, AnimationMixer, skeleton palettes,
WebGL rendering, materials and shaders remain in JS/GPU paths.

- Five native Rust and nine upstream differential tests passed; maximum observed
  matrix absolute error was zero. The path uses f64, not an f32/SIMD approximation.
- Tests cover direct TRS/matrix writes, pivot, negative/nonuniform scale, manual
  matrices, world-auto/force, reparent/attach/remove, stale and synchronous reads,
  clone, overrides, animation loop/finished events, bone palettes and arena growth/release.
- Supported batches pass with JS compose/multiply changed to throw, while exported
  Rust counters increase: the computation is actually replaced.
- Fixed 12-tick A/A and A/B/C/D captures for all five scenes matched every pixel.
  Separate callback/multiple-render tests passed. [Images and numerical results](../bench/results/correctness/results.json)
  retain the scope of this evidence.
- An isolated /tmp tarball consumer verified ESM, failed init/retry, root/addon
  identity, no runtime three dependency, NodeNext types and one esbuild core.
  No npm publication occurred.
- [Clean-checkout CI](https://github.com/postmelee/three.rust/actions/runs/39760603177)
  passed. The initial Ubuntu 26.04/Playwright install failure was resolved by
  pinning Ubuntu 24.04; [CI evidence](../bench/results/validation/ci.json) records it.

These are fixture/test-specific results, not the entire upstream suite or every
addon. [Compatibility](COMPATIBILITY.md) specifies tolerances and IEEE signed-zero/
NaN limitations. Rust owns persistent storage, not authoritative public properties.

## Environment and interpretation limits

Intel Xeon Platinum 8573C VM, five visible vCPUs, quota equivalent to four CPUs,
16 GiB limit, Chromium 154.0.8037.57. No DRM/NVIDIA GPU device was exposed. The
observed renderer was ANGLE Vulkan SwiftShader Device (Subzero), sharing CPU
resources with JS/Wasm. This is not a physical GPU result.

The CPU timer measures main-thread wall time from application update through
renderer return and stats update. It is neither GPU completion nor OS on-CPU
cycles; preemption and driver backpressure can contribute. CPU and rAF intervals
are not interchangeable. No general mobile 30fps ceiling, FPS gain or energy
improvement is inferred.

This is a fixed-frame cloud protocol. The originally proposed foreground hardware
10s/30s protocol, Safari/Firefox/mobile, fully cold-cache startup, long GC/memory/
thermal/power runs, XR/context loss and all addons remain unverified. Heap and
linear-memory observations are not total process memory; startup return is not
first compositor presentation. Separate diagnostics are not pooled into main data.

## Reproduction and next decision

Follow [clean installation and hardware commands](CLOUD_SETUP.md).

\`\`\`sh
npm ci
npm run fixtures
npm run build
npm test
npm run test:browser
npm run test:package
npm run bench:full
node bench/summarize.mjs bench/results/m2-full
node bench/analyze.mjs bench/results/m2-full
\`\`\`

Do not recommend a general import replacement as a performance optimization from
these results. The [revised plan](PROJECT_PLAN.md) distinguishes a bounded bridge
control from the broader Rust-owned pipeline hypothesis, with fresh hardware
profiles, reuse assessment, explicit API contracts and an optimized JS control.
Any opt-in ownership API outcome must remain separate from facade compatibility.

After the original final package rebuild, all main-run core.js, Wasm, runtime,
packed bridge, browser harness and lockfile hashes still matched
[runtime-artifact-match.json](../bench/results/validation/runtime-artifact-match.json).
The subsequent original changes concerned docs, license packaging, hardware
viewport options and test output paths. A→C demo switching, Wasm execution and
Pause passed [separate validation](../bench/results/validation/demo.json).
Later infrastructure changes have their own commits; this historical dataset is
not silently relabeled as measuring those changes.
`;
writeFileSync('docs/REPORT.md',body);
