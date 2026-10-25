# Physical Mac candidate and application screen

This report covers the 2026-10-26 follow-up to the historical Fox result and the first prepared-engine Editor integration. **A stable hardware performance advantage is not established.** Historical-baseline lifecycle diagnostics and all four candidate-fixture A/A groups failed their prospective stability screens. The tested Editor interactions preserve images and numerical behavior. The completed native Editor callback-cost screen observed higher candidate CPU cost in all three continuous conditions, whose original A/A screens also failed. No FPS claim, ownership level or adoption gate advances from this evidence.

The [confirmed integration review](../mydocs/working/task_m6_46_integration_review.md) records PR [#47](https://github.com/postmelee/three.rust/pull/47), tested head `23a9096441b093d4e198547d44e819b9a3138a9c` and merge `fa4eead58d19720420a886fdbc898c0b9ebde321`. Integration preserves the research histories; it does not replace their immutable measurement SHAs with `main`.

## Evidence and pins

| Experiment | Runtime/source pin | Executed tooling and result |
|---|---|---|
| Historical Fox stability diagnostic | `9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7` | `9ce1301888777f11a85aff0c7a117ab7b19ec0e3`; longer-warmup condition `2894e7f39545ba2430c7f212a82990455daee466`. All nine full lifecycle groups failed stability. |
| Complete fixture path | C3 `ce21ffcf355534a8cf32eb4c9f7e43d6a86509b5`; epoch guard `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb` | Full tooling `cadc5edd694b3aa778dd049251d15e5f6dd75c87`; smoke `c7e6c25413f4731cd16f8a1bafa8b07510e10b78`. All four original A/A groups failed. |
| Editor candidate correctness | Editor `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`; candidate `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb` | Five canonical sets use `cadc5edd694b3aa778dd049251d15e5f6dd75c87`; unchanged-original UI uses `c7e6c25413f4731cd16f8a1bafa8b07510e10b78`. Bounded correctness passed. |
| Native Editor callback-cost screen | Editor and candidate pins above | Tooling `a1aad46f2bf8d74176b2b5e2836cbdd1ff34678a`; 54 continuous + 16 idle runs, 68,640 measured callback pairs. All three continuous original A/A screens failed. |
| Earlier original-app profiles | Viewer `b5ee5dafe27f953ae1b55f42b5fa3697fef08683`; Editor `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8` | Capture `855012966a136dca89a16b162d9dce805cb0bece`; analyzer `ab833bb7d65d59857a0e52af99bb6a743d5d66ee`. Original-engine diagnosis only. |

Each capture retains file/build hashes in addition to Git pins. C3 and epoch have identical recorded original Three.js, fixture, browser-loop and native/Wasm bytes; only `packages/rthree/facade-state.js` differs among their recorded runtime files. Wasm SHA-256 is `95f7aa7a807bd0bd4c9b45f0a855d2305c262cf5b7fef35a2d9dd9dfa889cdd9`. The drivers use existing built artifacts and verify their hashes; they do not independently certify source-to-binary correspondence. Lockfiles and Rust 1.90.0 remain pinned.

The [Stage 2 report](../mydocs/working/task_m6_46_stage2.md), [Stage 3 report](../mydocs/working/task_m6_46_stage3.md), [Stage 4A report](../mydocs/working/task_m6_46_stage4a.md) and [Stage 4B report](../mydocs/working/task_m6_46_stage4b.md) contain full commands, source/tool hashes, per-run results and limitations. This page summarizes their conclusions without duplicating the large tables.

## Physical conditions and measurement boundaries

The full fixture screen used Apple M4 Pro (12 CPU cores, 16 GPU cores, 24 GiB), macOS 26.5.2 build 25F84, Node 24.15.0 and headed Chrome 155.0.8059.86 at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. Page and browser GPU records report WebGL2 ANGLE Metal Apple M4 Pro. SwiftShader is not treated as hardware.

Full-capture host records before and after show AC power, battery 100%, power mode 0, no recorded thermal/performance warning, and 3024×1964 physical / 1512×982 logical display at reported 120 Hz. A reported refresh setting is not measured scanout. Fixture pages used 640×360, DPR 1, cross-origin isolation and an observed minimum clock increment around 0.005 ms. No profile, tracing, GPU query or build ran in the primary window. Focus/visibility were checked at boundaries; these checks do not prove perfect host exclusivity or continuous focus. Temperature, per-core frequency and scheduler state were not measured.

Editor correctness used 1280×720, DPR 1, with a recorded 930×648 canvas and retained native quality. Its helper did not capture a per-session power/thermal/display record or full Chrome command line. Do not infer those conditions from the later fixture screen. These are correctness captures, not quiet timing sessions.

The fixture CPU timer covers application animation/update through renderer return, including public observation and synchronous submission. Per-row bridge counters are read after that interval. Its frame interval uses rAF timestamps, whereas the Fox diagnostic reports callback-start intervals. Neither metric measures GPU completion, display latency or an FPS improvement. CPU samples are main-thread elapsed time, not OS on-CPU cycles.

## Negative and unstable results

The historical-baseline diagnostic retained 27 full calls / 97,200 frames plus three smoke calls. Persistent-page, new-page and new-browser conditions all reproduced instability; increasing warmup from 1,200 to 4,800 frames did not establish a stable condition. Nine of 27 run checks and 36 of 162 block checks failed. The cause remains unresolved; there is no evidence-based attribution to JIT, OS scheduling or power management. This does not retroactively replace or qualify the [earlier precision capture](../mydocs/report/task_m3_4_precision_report.md).

The candidate screen retained 144 full runs / 86,400 frames and a separate 24-run / 240-frame smoke. Four scenes, six route labels and six balanced orders used 240 warmup and 600 sampled frames per full run. Original-A and original-B are identical upstream routes. All 48 fixed-state correctness captures across full/smoke passed exact image and zero-error matrix comparison. In the full screen, 18 of 48 original run checks and 52 of 240 original block checks failed; 160 of 720 route-local block checks failed. Every run and block remains public.

Observed CPU p50 below is the median of six per-run p50 values, in milliseconds. Cost change is epoch-Wasm minus the named baseline: positive means slower. Percentages divide that cost change by the corresponding baseline. These are unqualified observations under failed A/A, including the small controls near timer/scheduling limits.

| Scene | Three.js | Epoch JS | Epoch Wasm | Wasm cost change vs Three.js | Wasm cost change vs matched JS |
|---|---:|---:|---:|---:|---:|
| 2,000 cubes | 1.53250 | 3.74000 | 3.59875 | +2.06625 ms / +134.83% | −0.14125 ms / −3.78% |
| Scaled hierarchy | 6.81750 | 14.46875 | 14.05000 | +7.23250 ms / +106.09% | −0.41875 ms / −2.89% |
| Small static | 0.14750 | 0.23000 | 0.21750 | +0.07000 ms / +47.46% | −0.01250 ms / −5.43% |
| Shader control | 0.06500 | 0.11875 | 0.12500 | +0.06000 ms / +92.31% | +0.00625 ms / +5.26% |

The matched-JS column separates the language/backend effect from the complete architectural difference versus Three.js. It establishes no independent Rust advantage. C3-versus-epoch changes, CPU p95/p99, frame intervals, paired runs and all stability flags are in the [full Stage 3 results](../mydocs/working/task_m6_46_stage3.md#cpu-and-raf-interval-observations). For example, hierarchy rAF p50 was 16.42625 ms for epoch-Wasm versus 8.33500 ms for original-A; retain this unfavorable interval observation without interpreting it as measured presentation rate.

The hierarchy is an explicit 10,000-cube/1,000-group scale variant whose nonrecursive raycast returns no mesh hits. It is not an equivalent picking workload or an application result. Small is an 8-cube static variant. The Monjori/Mic shader is GPU-oriented, not proven GPU-bound. These [adapted fixtures](../fixtures/README.md) do not substitute for actual apps.

## Two application requirements and coverage

| Application | Required behavior and source license | Current boundary |
|---|---|---|
| glTF Viewer, pinned above; original Three.js 0.176.0 | MIT; one original RobotExpressive, 14 clips, skins/morphs, GUI clip/speed/morph controls, pause/resume, orbit/dolly, materials/environment and the native continuous render loop | Original preparation and profiling exist. No r176→r186 candidate migration or candidate equivalence is established. |
| Three.js Editor r186 / Three.js 0.186.1 | MIT; picking/shift-selection, translate/rotate/scale, undo/redo, focus/camera, timeline/clip controls, precise animated bounds, raster shadows, helpers and synchronous signals/reads | Original, prepared-JS and prepared-Wasm passed the bounded correctness suite. Main-scene skinned/morph work and other unsupported passes retain fallback. The native animation/timeline callback-cost screen completed with higher observed candidate costs and failed continuous A/A stability. |

The shared RobotExpressive asset is CC0 1.0, credited to Tomas Laulhe and Don McCurdy; SHA-256 `047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319`. Original source, asset and dependency notices remain in the [preparation provenance](../bench/results/mac-preparation-20261023/apps/provenance.json) and [correctness archive licenses](../bench/results/task46-editor-correctness-20261026/licenses/). Its known 752 weight-normalization validator errors and four skin-node warnings remain. The native loader's normalized runtime weights pass separately; the asset is not relabeled validator-conformant. Complete scene exports include CC0-derived geometry.

Editor canonical runs passed 162 route-local checks. The cross-route audit compared 149,328 ordered numeric values, 32 fixed-image pairs and 40 semantic records with zero numerical difference and identical PNG bytes/pixel digests. Object order, visibility, quality, bounds and history match. Four native `paused.time` field pairs use explicit finite/range/pause-state checks because UI click timing varies; fixed 0.25/0.75 timeline poses and all other fields remain exact oracles. Random UUIDs and entire scene exports are preserved but are not equality oracles.

The first Wasm Editor attempt failed because module-level `camera.lookAt()` ran before initialization. The corrected response overlay awaits initialization before dynamically importing eleven original app/addon entries. App modules remain unchanged, but this explicit bootstrap adaptation is required in addition to import resolution. The failed attempt, passing earlier JS attempts and a dirty-tooling original attempt remain archived separately from the six clean canonical datasets. Preparation checkpoints include positive Wasm/prepared counters, and fallback/materialization counters remain visible; those counts do not prove native animation or whole-frame ownership. WebGPU, path tracing and arbitrary content remain outside this comparison.

## Original profiling and investigation priorities

The [16 original-app profiles](../mydocs/report/task_m3_5_profiles_report.md) favor renderer preparation/reuse over an animation-only port in these small scenes. They were collected under uncontrolled/high system load, with sparse active samples, long sampling gaps and uncalibrated profiler overhead. Their percentages are sampled active-category shares, not complete browser CPU fractions or a basis for an Amdahl speedup claim. Boundary means and GL typed-array argument volumes remain diagnostic rather than product timing or measured DMA.

The next investigation order is:

1. Renderer/palette reuse across preparation, main and shadow passes, including program/material work and upload preparation. Preserve invalidation for ticks, skeletons, geometry, cameras, shadows and callbacks; compare the same algorithm in JS.
2. Exact bounds and public-matrix consumption, including skin/morph vertex reads, forced updates and synchronous observation. Approximate bounds or omitted passes are not equivalent replacements.
3. Remaining Editor UI refresh/statistics work, preserving signal order, history and synchronous observable values.

## Native Editor callback-cost result

The [Stage 4B protocol](../mydocs/plans/task_m6_46_impl.md#stage-4b-prospective-editor-callback-cost-screen) completed at tooling `a1aad46f2bf8d74176b2b5e2836cbdd1ff34678a`, from 2026-10-25T23:12:03.337Z to 23:33:41.654Z (2026-10-26 local date). It sums disjoint `Viewport.animate` and `Animation.updateTime` callback bodies: **covered animation-and-timeline synchronous CPU**, not entire-page CPU. This includes native mixer work, selected exact bounds, paid public reads, renderer submission, synchronous signals and timeline updates. Browser paint/compositor/GPU work, asynchronous storage, other unmeasured tasks and collection bookkeeping remain outside. Image/numeric oracles establish preserved behavior, not zero-overhead instrumentation; total instrumentation overhead was not calibrated. Native wall-clock poses are not frame-matched across routes; per-run action/mixer progression and clip-cycle coverage are retained.

The same physical machine, Chrome/Metal backend and display configuration described above were recorded before/after, with AC power and power mode 0. The Editor page was 1280×720 at page DPR 1, with a 307px outer / 306px content timeline panel and 930×378 CSS canvas in continuous conditions. The high-resolution control changes only renderer pixel ratio to 2 (1860×756 drawing buffer); standard scenes use 930×378. Idle retains the collapsed timeline and 930×648 canvas. Antialiasing, sRGB output, tone mapping 7 / exposure 1, renderer shadow type 1 and default WebGL shading are recorded; the light uses a 1024×1024 shadow map. No profiler, GPU query, build or workflow-owned heavy computation ran in primary windows. Boundary power records and occasional process observations do not prove perfect desktop exclusivity or measure per-core scheduling/temperature.

All 24 unmodified/overlay oracle pages passed before timing. The full series used four balanced rounds, duplicated original routes and explicit original bookends: 54 continuous runs, each 600 warmup+1200 sampled callback pairs; 16 auxiliary idle runs, each 120+240. All 68,640 measured pairs remain, plus warmup and arming records. Continuous phase validation proves observed mixer/action progression and loop consistency; all idle windows retained zero renderer-frame advancement and zero render notifications. Every continuous candidate window recorded zero prepared passes, zero prepared-Wasm calls and zero prepared-matrix reads, with 4,800 fallback passes over 1,200 pairs: all four native render passes retained fallback. This is a negative observation of the facade/native route under required app features, not a measurement of an active C3 prepared renderer. The Wasm facade did run: 135 calls per pair with shadows or high resolution, 133 without shadows. Both candidate backends recorded 205 public matrix materializations / 26,240 bytes per pair with shadows, 203 / 25,984 bytes without. These counters count paid materialization, not every Proxy get, epoch check or WeakMap lookup; they do not attribute CPU time to any of those operations.

Milliseconds below are medians of per-run p50s. Original has eight balanced runs per condition; each candidate has four. Bookends affect A/A checks but not these engine summaries. Positive cost change means slower; percentages are **unqualified observations**, not certified regression sizes or speedup claims.

| Native condition | Three.js | Matched JS | Rust-Wasm | Wasm cost change vs Three.js | Wasm cost change vs matched JS |
|---|---:|---:|---:|---:|---:|
| Root selected, shadows | 1.3300 | 2.9425 | 2.9800 | +1.6500 ms / +124.06% | +0.0375 ms / +1.27% |
| Root selected, no shadows | 1.2625 | 2.7850 | 2.8275 | +1.5650 ms / +123.96% | +0.0425 ms / +1.53% |
| Root selected, higher resolution | 1.3425 | 2.9500 | 2.9750 | +1.6325 ms / +121.60% | +0.0250 ms / +0.85% |
| E1 idle (no rendering) | 0.0150 | 0.0150 | 0.0150 | 0 ms; relative comparison omitted | 0 ms; relative comparison omitted |

All three continuous original A/A groups failed. The shadow/no-shadow original run medians passed their between-run tolerance, but three internal blocks failed with shadows and five without shadows; higher-resolution retained five failed blocks and a faster original repeat outside its tolerance. In total, one of 30 original run checks and 13 of 120 original block checks failed. The [Stage 4B report](../mydocs/working/task_m6_46_stage4b.md) provides every failed run/block, CPU p95/p99, intervals, absolute/relative deltas, counters and per-run ranges. The shadow CPU p95/p99 was 1.5450/1.6326 ms original, 3.2150/3.3350 ms matched JS and 3.2500/3.3876 ms Wasm. Continuous rAF median intervals remained approximately 8.33 ms across routes. This is no FPS or GPU-time result. The timer-floor-sized idle A/A pass is not an app speed qualification.

**Decision: do not adopt this candidate as a faster default or claim an independent Rust benefit.** Both candidate routes paid substantially more covered CPU than upstream in this bounded screen; changing only the backend did not demonstrate a useful gain. The precise percentage and causal breakdown remain unqualified. Retain the implementation as an optional experiment and investigate the complete consumer path before expanding it.

Native E3 conditions select the complete model root and retain Walking, timeline and exact whole-model bounds. Native deselection stops the selected timeline action, so unselected native playback is explicitly unsupported by this workflow. The historical E2 profile fixture started the mixer action through its harness; it does not prove that native timeline playback survives deselection. E1 edit-handler timing and candidate sampled attribution remain unperformed; native gizmo/history/focus correctness is covered separately. The proposed renderer/palette → exact bounds/public-matrix consumption → UI order remains an investigation order, not a measured attribution of this candidate's regression. A separate matched-JS experiment and invalidation tests must precede any Rust-benefit claim.

Two pre-timing smoke failures remain: a 1px native timeline border invalidated the original layout assertion, and the proposed unselected condition removed Walking. Neither attempt reached timing. Corrected smoke-003 passed 24 oracles and 22 short runs (660 pairs); it is tooling evidence only. Different-day repetitions, cross-device/browser qualification, candidate sampling profiles, GPU elapsed time and an independent Viewer candidate integration remain incomplete.

## Reproduction and audit

Use separate clean checkouts at the pins above; do not substitute current `main` for a historical runtime. Use locked installation, `npm run fixtures`, `npm run build` and `npm test` before capture. The original Viewer preparation additionally requires Yarn 1.22.22 with its frozen lockfile; `scripts/apps/prepare.mjs` checks sources and resource hashes. Keep builds, correctness, profiling and timing sequential and choose new output paths for every attempt.

```sh
# Verify committed evidence without launching a browser.
node bench/results/task46-aa-lifecycle-20261026/verify.mjs
python3 bench/results/task46-candidate-screen-20261026/verify.py
python3 bench/results/task46-editor-correctness-20261026/verify.py

# Reproduce the declared fixture screen with the recorded tooling pin.
node bench/candidate-screen.mjs c3="$C3" epoch="$EPOCH" \
  out=work/candidate-screen-NEW repeats=6 warmup=240 samples=600

# Prepare the two original applications and check the Editor candidate.
node scripts/apps/prepare.mjs work/app-reproduction-NEW
node scripts/apps/check.mjs work/app-reproduction-NEW work/editor-check-NEW \
  engine=prepared-wasm app=editor candidateRoot="$EPOCH" \
  candidateSha=6990fd92f61a031c8c2ba7a8282cfb63684e6dfb
node scripts/apps/ui.mjs work/app-reproduction-NEW work/editor-ui-NEW \
  engine=prepared-wasm app=editor candidateRoot="$EPOCH" \
  candidateSha=6990fd92f61a031c8c2ba7a8282cfb63684e6dfb
```

The stage reports specify the matching original/JS commands, exact historical options and distinct profile/primary protocols. The completed Stage 4B invocation used `caffeinate -di node scripts/apps/timing.mjs "$APPS" work/task46-editor-timing-screen-001 mode=full candidateRoot="$EPOCH" candidateSha=6990fd92f61a031c8c2ba7a8282cfb63684e6dfb` at tooling `a1aad46f2bf8d74176b2b5e2836cbdd1ff34678a`. Choose a fresh output path when reproducing it. The same command with `mode=smoke` is not performance evidence.

The [lifecycle](../bench/results/task46-aa-lifecycle-20261026/README.md), [candidate](../bench/results/task46-candidate-screen-20261026/README.md), [Editor correctness](../bench/results/task46-editor-correctness-20261026/README.md) and [Editor timing](../bench/results/task46-editor-timing-20261026/README.md) archives retain raw samples, numerical states, images, failures, source/tool hashes and original/public byte hashes. Gzip is lossless after documented metadata-only privacy normalization; local originals were not overwritten. No fast run, failed stability block, unsupported path or unfavorable control was removed to improve the verdict.
