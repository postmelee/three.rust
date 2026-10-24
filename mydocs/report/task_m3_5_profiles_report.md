# Task #5: original application CPU profiling

Date: 2026-10-24. Related: #3/#4/#5, preparation PR #41. **Sixteen original-app profiles and 32 transparent-wrapper image/numeric oracles passed. Primary timings and Rust comparisons were not run.** The evidence favors investigating renderer preparation and repeated palette/public-read work before an animation-only port. This is a bounded diagnostic ranking, not an acceleration claim or completion of #5.

## Provenance and environment

| Input | Exact version |
|---|---|
| Clean capture tooling actually executed | `855012966a136dca89a16b162d9dce805cb0bece` |
| Final analyzer, including post-capture gap sensitivity | `ab833bb7d65d59857a0e52af99bb6a743d5d66ee` |
| Preparation parent | `f339a46c006be788d885fb7c3bff2fcbff72d758` |
| Original glTF Viewer | `b5ee5dafe27f953ae1b55f42b5fa3697fef08683`, Three.js 0.176.0, MIT |
| Original Three.js Editor | `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`, Three.js 0.186.1, MIT |
| RobotExpressive GLB | SHA-256 `047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319`, CC0 1.0, Tomas Laulhe / Don McCurdy |
| Research engine baseline, not used as an app replacement here | `9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7` |

Preparation CI [run 40066043963](https://github.com/postmelee/three.rust/actions/runs/40066043963) succeeded on the full preparation SHA. Existing native UI/image/numeric checks are in the [preparation](task_m3_5_reproduction_report.md) and [UI](task_m3_5_ui_report.md) reports. Both pinned upstream source trees remain clean. No source migration, engine injection or upstream application patch was made.

The existing locked preparation was reused: Node 24.15.0, Playwright 1.56.1, original Viewer Yarn 1.22.22 frozen dependencies and Vite production bundle, Editor checked-in browser modules. Chrome **155.0.8059.86**, `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, headed, actual WebGL2 **ANGLE Metal Renderer: Apple M4 Pro**. macOS 26.5.2 (25F84), 12 logical CPU cores, 16 GPU cores, 24 GiB RAM. AC power and power mode 0 before/after; pmset reported no recorded thermal/performance warning, which is not a temperature or thermal-stability measurement.

Browser viewport 1280×720, page DPR 1; Viewer buffer 1280×656, normal Editor buffer 930×648. Native materials, tone mapping, antialias, GUI, controls, helpers and loops remain. Editor has PCF shadows, 1024×1024 map; the explicitly adapted high-resolution control uses renderer pixel ratio 2 (1860×1296 buffer) and a 2048×2048 shadow map. The OS display remains 3024×1964 physical / 1512×982 logical at reported 120 Hz, not independently measured scanout.

**External activity was uncontrolled and system load was high:** 1-minute load 9.21 before and 9.00 after. No agent build or analysis ran during sequential captures. The page was visible and focused at each recorded boundary, and shader-program counts were unchanged across before/profile/after windows. These observations do not make this a quiet performance qualification session.

## Scenarios and protocol

| Scenario | Original behavior / authored variant |
|---|---|
| V1-play | Original Viewer, one RobotExpressive, native GUI disables Dance and enables Walking; native wall-clock playback and GUI remain |
| V1-paused | Same asset/app, native playbackSpeed = 0; the existing continuous render loop remains active |
| E1-edit | Original Editor, two cubes/ground/directional/ambient fixture; repeated outliner selection, actual viewport picking, X gizmo drag, Meta+Z and F focus |
| E1-idle | Same small authored scene, deselected; no forced continuous rendering |
| E2-selected | Original Editor + authored ground/lights/shadows, Walking, one selected 256-vertex SkinnedMesh; native precise selection bounds/helpers remain |
| E2-unselected | Same animation/shadows, selection removed; selection helper work also changes, so it is not a single-function timing subtraction |
| E2-no-shadow | Unselected E2, only directional castShadow disabled |
| E2-highres | Unselected E2, renderer pixel ratio 2 and shadow map 2048; GPU-oriented, not demonstrated GPU-bound |

All original animation data remain available: 14 clips, four runtime SkinnedMeshes, three morph primitives, two skeleton instances of 43 bones. V1 has 19 meshes; E2 adds the ground for 20. The Editor fixtures are authored test scenes in an actual app, not a claim about a complex production project. E1 uses a 20×20 ground and the profile driver's camera/light settings; this is recorded setup, not the exact earlier UI screenshot fixture. Profiles do not add a new Fox replication experiment.

Each scenario runs twice from a fresh origin reload, second repeat in reverse scenario order. Each has two seconds warmup (plus one E1 input warmup cycle), two seconds unprofiled observation, approximately 12 seconds V8 sampling, two seconds unprofiled observation, then **separate** three-second instance-boundary and two-second WebGL-counter runs. E1 finishes its last input cycle, so its sampled window is slightly longer. App playback stays wall-clock based, not fixed simulation ticks. Pointer steps and keyboard actions are archived; paused, idle and high-resolution variants are explicit.

Sampler requested 1,000 microseconds; observed median intervals were **1,258–1,265 microseconds**, with maximum gaps up to 126.637 ms. CPU profiles cover roughly 12.02–12.35 s each. The [sampling audit](../../bench/results/app-profiles-20261024/sampling-audit.json) preserves actual values.

## Attribution method and limits

The [raw archive](../../bench/results/app-profiles-20261024/raw) retains complete V8 call trees, samples and timeDeltas (lossless gzip with original SHA-256), boundary arrays, API counters, screenshots and observations. [Analysis](../../bench/results/app-profiles-20261024/analysis/summary.json) weights each sampled leaf by its timeDelta once. Inclusive ancestor values overlap and must not be added. Buckets follow the nearest applicable pipeline ancestry with explicit source positions; raw functions remain inspectable. The minified Viewer bundle retains unresolved names; its symbol index uses structural method/class signatures without rebuilding the app.

Percentages below use sampled activity **excluding `(idle)` and unresolved `(program)`** as the denominator; GC, automation and unknown JS remain. They are not fractions of wall time, OS CPU cycles or total browser CPU, and do not include GPU-process/compositor work. Active samples were only 335–694 for the animated/edit cases and 25–26 for idle, despite thousands of total samples. Periodic sampling, scheduling and source attribution limit precision.

The final analyzer additionally reports unweighted sample shares and post-hoc sensitivity excluding intervals >5 ms. The broad ordering survives; individual selected-scene bounds/palette shares still vary substantially. Long gaps mostly fall in idle/program; excluding gaps does not establish a quiet environment. The short before/after observation windows show broadly stable native render-pass cadence and zero Editor-idle passes, but **do not calibrate CPU profiler overhead**, particularly when display cadence is capped. They are not the primary timing A/A protocol.

Instance diagnostics wrap original renderer.render, renderBufferDirect, mixer.update, root updateMatrixWorld, skeleton.update, selected updateWorldMatrix, selectionBox.box.setFromObject and selected original signal dispatches. They preserve arguments, receiver, return and throw behavior and restore original descriptors. No global prototype, property getter or engine handler is replaced. E1's selected-object method hook stays on the initially selected cube; it is not a count of all public reads. Native events, nested rendering and callback work remain included.

Boundary elapsed means use the browser timer (roughly 0.1 ms quantization visible in raw samples). Many individual calls round to zero; cumulative means are rough diagnostics, not product p50/p95/p99. WebGL counters run separately and count typed-array **argument volume**, not DMA, driver copies or GPU completion. Counter activation/observation are asynchronous, so normalized per-cycle volumes are approximate. Fixed-pose, scene-only wrapper oracles run after profiles; all 32 compare exact RGBA hashes and numerical arrays. They do not claim cross-run animated image equality or validate GPU timing.

## Findings

### 1. Renderer preparation dominates animation evaluation in these small real-asset scenes

These are ranges across the two runs, not confidence intervals. Exclusive sampled categories below are disjoint under the declared heuristic; the combined renderer column includes preparation/submission, shadow and renderer-residual buckets.

| Scenario | Combined renderer categories | Animation/binding | Other notable category |
|---|---:|---:|---|
| V1-play | 55.2–59.2% | 2.4–2.8% | 21.8–26.8% unresolved/other; Stats/GUI canvas work is visible in the call tree |
| V1-paused | 53.7–58.2% | 0.6–1.6% | Native rendering and palette uploads continue |
| E1-edit | 21.8–22.6% | No sampled animation work | UI/callback 39.9–40.4%; automation 10.0–14.1%, retained |
| E2-selected | 54.1–65.4% | 1.4–1.8% | Bounds/picking/public-read consumers 6.6–14.5%; precise share unstable |
| E2-unselected | 61.2–65.2% | 1.6–1.8% | Skeleton/palette 12.3–14.2%; visibility/sort 6.0–8.4% |
| E2-no-shadow | 59.9–59.9% | 1.6–2.9% | Skeleton/palette 9.3–10.0%; visibility/sort 8.7–9.9% |
| E2-highres | 62.6–65.1% | 1.5–1.8% | No GPU elapsed query; no GPU bottleneck conclusion |

Small idle has no observed render/GL calls and very few active samples; percentage ranking there would be misleading. The source/profile hot paths include WebGLPrograms.getParameters, WebGLRenderer.getProgram/setProgram, renderBufferDirect, uniform preparation, native GL calls, helper updates and UI statistics. In the pinned Viewer bundle, sampled names `w`, `E`, `Hr` and `Fc` correspond by inspected bodies to program parameters, program-cache keys, getProgram and setProgram. Their exact offsets and raw names remain in the source-indexed profile; no guessed name is silently substituted.

Separate boundary means support the broad ordering:

| Scenario / boundary | Observed diagnostic mean |
|---|---:|
| V1-play renderer.render, one main call per mixer update | 0.350–0.371 ms/call |
| V1-play mixer.update | 0.020–0.021 ms/call |
| V1-paused renderer.render | 0.333–0.346 ms/call |
| E2-selected renderer.render total / mixer-update count, all four native passes | 0.640–0.719 ms/update |
| E2-selected mixer.update | 0.019–0.020 ms/call |
| E2-selected precise selectionBox.setFromObject | 0.088–0.090 ms/call |
| E2-unselected renderer total / mixer-update count | 0.723–0.770 ms/update |
| E1-edit synchronous objectChanged dispatch | 0.626–0.639 ms/dispatch, including listeners and nested rendering |

Do not subtract selected/unselected rows to claim a speedup: helpers differ and scheduling/JIT/instrumentation vary. Shadow-disabled renderer means themselves range 0.549–0.749 ms/update, an unfavorable indication that fine absolute ranking is not stable enough here. Nested renderer, skeleton, transforms and draw-preparation rows are not additive.

### 2. Palette recomputation repeats across main-list and shadow work

Instance counts are consistent in both repeats: E2 with shadows invokes **four skeleton.update calls per mixer update**; shadow-disabled E2 invokes **two**. There are two skeleton instances, each with 43 bones. Raw sampled stacks show both projectObject → WebGLObjects.update → Skeleton.update and WebGLShadowMap.renderObject → WebGLObjects.update → Skeleton.update.

The pinned renderer [build](https://github.com/mrdoob/three.js/blob/9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8/build/three.module.js) explains the calls: WebGLObjects caches by info.render.frame; projectObject prepares objects before the frame counter increments, while shadowMap.render prepares them after it increments. The native renderer also renders scene, grid, helpers and view helper separately. Source hashes/line locations are in [source-audit.json](../../bench/results/app-profiles-20261024/source-audit.json).

Derived from measured invocation counts and the source loop, this means 172 bone-world matrix consumptions / 11,008 bytes of f32 palette writes per mixer update with shadows, versus 86 / 5,504 without. These count only the palette loop, not all public matrix reads, JS object footprint or measured memory bandwidth. Separate palette boundary totals are about 0.092–0.099 ms/update in unselected E2 with shadows. This is a concrete reuse candidate; it is not a measured optimization saving. A pose-version cache must invalidate for forced updates and mutations/callbacks between passes, rather than simply skipping the second call.

### 3. Public matrix consumption and renderer handoff must remain part of the engine contract

| Consumer | Observed / source-supported obligation | Cost interpretation |
|---|---|---|
| Selected animation bounds | Viewport updates selected world matrices then exact Box3.setFromObject(...,true); 256 selected vertices in this fixture | One bounds call per mixer update, 0.088–0.090 ms; includes per-vertex skinning/morph/world application, not just reading a matrix |
| CPU skinning | SkinnedMesh.applyBoneTransform reads bone.matrixWorld and inverses for nonzero weights; bounds also applies object.matrixWorld | Synchronous pose access must work before render; a GPU-only palette does not automatically satisfy it |
| Render-object setup | modelViewMatrix = camera.matrixWorldInverse × object.matrixWorld; normalMatrix follows; onBeforeRender/material callbacks remain | Matrix computation and public-value consumption happen inside the renderer; no standalone getter cost was measured |
| Matrix uniform submission | setValueM4 reads .elements, checks its cache, copies into a reusable f32 array and calls uniformMatrix4fv | Viewer play ~26 calls / 1,664 argument bytes per native cycle; unselected shadowed Editor ~65 / 4.1 KiB, approximate |
| Palette texture handoff | Two padded 16×16 RGBA f32 palette textures | About two texSubImage2D calls / 8 KiB typed-array argument volume per cycle in Viewer and E2, including paused Viewer |
| Geometry/helper updates | E2 also records bufferSubData; samples include WebGLAttributes.updateBuffer | About five calls / 5,040 array-argument bytes per cycle; allocation/copy/GPU execution is not isolated by this counter |

The no-shadow control reduces draw preparation (about 56 → 37 GL draws/cycle and ~65 → 43 mat4 uniform calls in unselected E2). The asset/morph data remain. Renderer-side cache comparisons, material program setup, helpers and GL submission are still substantial, even if Rust produces matrices or palettes cheaply. A prepared-output contract should count duplicate traversal/materialization and downstream consumption, not only kernel time.

Direct `.matrixWorld.elements` reads are ordinary fields in these original apps. There is no Wasm bridge, getter barrier or snapshot charge to measure here. The results justify testing those costs in a separately pinned candidate; they do not establish that a Rust facade is faster or that eliminating every observed read is possible. Do not infer an Amdahl whole-frame speedup from the incomplete sampled denominator.

### 4. Editing is also a UI/callback problem

The actual picking/drag/undo/focus loop samples native signal listeners, outliner/sidebar refresh, Viewport.Info traversal and number formatting. The objectChanged boundary includes all synchronous listeners, bounds work and nested rendering; its ~0.63 ms mean is not an independent renderer cost to add. Replacing transforms alone leaves this path. Presentation-only DOM refresh batching is worth investigating, but observable synchronous signals, history and public reads must preserve their order and values.

## Priority and rejected shortcuts

1. **Renderer preparation/reuse boundary:** audit per-pose palette reuse across list/shadow passes, repeated program/material preparation, helper work and dirty uploads. Start with a matched JS change and explicit invalidation/callback semantics before attributing a benefit to Rust. Existing C3 results are a separate dataset and were not retested here.
2. **Synchronous read consumers:** design exact bounds/skinned-vertex access and world/palette snapshots alongside renderer outputs. Preserve explicit force updates, morphs, identities, callback order and all passes. Batch where a measured consumer accepts it; avoid per-element boundary crossings.
3. **Editor UI work:** identify DOM/statistics refresh work that can be reduced while leaving synchronous API observations intact.

Animation-only porting is low priority for this cohort: mixer boundaries are small in absolute milliseconds. Pure transform microbenchmarks, visibility/sort-only selection and GPU shader rewrites are not justified by these profiles. Visibility/sort is present, but precise sorting alone is not isolated. The high-resolution control does not prove GPU limitation. Paused Viewer remains a useful unfavorable control: native rendering/palette work continues.

## Failures, reproducibility and remaining gates

Development smoke 001 failed because viewport picking overlapped the existing selected gizmo. The driver now selects the other object first and then performs actual viewport picking; no original app handler was patched. Smoke 002–004 verified interactions, idle/high-resolution/shadow controls and wrapper oracles. Their dirty HEAD metadata is not exact source attribution. All failure records remain; the full final run passed without page errors, unknown remote requests or nonfinite matrices. Final screenshots were visually reviewed.

RobotExpressive still has the prior **752 nonnormalized-weight validator errors and four warnings**. Native loader normalization was checked in preparation; this remains a loader-behavior fixture, not a conformant-asset qualification. App imports, source and all 148 served file hashes are archived. The capture did not re-run root Rust tests or rebuild original apps; preparation CI passed and these changes only add diagnostic tooling. No original feature or license was removed.

Commands actually executed for final capture and analysis:

```sh
node scripts/apps/profile.mjs work/app-reproduction-002 work/app-profiles-001
node scripts/apps/profile-analyze.mjs work/app-profiles-001 work/app-reproduction-002 work/app-profiles-analysis-001
node scripts/apps/profile-analyze.mjs work/app-profiles-001 work/app-reproduction-002 work/app-profiles-analysis-002
npm run docs:check
```

Use capture SHA for profiling, analyzer SHA for the sensitivity output, installed Chrome and the pinned preparation from PR #41. Every output directory must be new. Profile arguments are `cases=... seconds=12 repeats=2`; short smoke outputs are not final evidence. Checksum and accounting audits also verified all 16 profiles, 32 wrapper oracles, stable recorded program counts/focus and source cleanliness. Raw profile gzip files decompress to their recorded original hashes.

Still unperformed: quiet primary CPU p50/p95/p99 and frame-interval measurements, timing A/A drift, profiler CPU-overhead calibration, GPU elapsed/process traces, repeated-day runs, full browser coverage, complex production scenes, all clips/interaction combinations, Viewer r176→r186 adaptation, matched-JS/Rust candidates and complete synchronous read accounting. The preparation UI tests cover more interactions than the profiled loops; timeline scrubbing, rotation/scale, and every camera/light manipulation were not profiled here. A new candidate requires its full SHA, dedicated validation path, correctness and complete application-to-render-return cost. No main merge, performance claim, progress promotion, issue closure or npm publication is included.
