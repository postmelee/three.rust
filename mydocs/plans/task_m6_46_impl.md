# Task #46 implementation and experiment plan

## Stage 1: integration

Preserve all three reviewed research heads through merge commits. Keep facade/prepared resolution, configurable server ports, browser candidate/bypass coverage and prepared demo pause coverage together. Run locked build, native/differential/types, infra/docs, facade/prepared/compatibility/package and browser/demo at nondefault port 4189. The original source/asset archives remain unchanged. Record old PR base/head/CI before retargeting; main integration requires combined exact-head CI and an expected-head merge. Broad issues do not close with integration.

## Stage 2A: prospective A/A lifecycle diagnostic

Purpose: distinguish within-page state from page/context/browser lifetime, without changing the exact historical engine or scene. This is a diagnostic, not adoption qualification.

- Runtime reference: clean checkout at 9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7, locked install and Rust 1.90.0 release build; record generated binary/source hashes. Driver lives on the new tooling commit, whose SHA and file hash are recorded separately.
- Hardware Chrome, headed, same 640×540 viewport/640×480 drawing canvas, DPR1, isolated timing; no profile/trace/GPU query during these calls.
- Scene animated-16, owned-js first; warmup1200, samples3600, fixed historical tick/reset/read behavior.
- Three lifecycle conditions: same-page (a persistent page), new-page (fresh context/page in a persistent browser), new-browser (fresh process/context/page). Three rounds rotate their order: same-page/new-page/new-browser; new-page/new-browser/same-page; new-browser/same-page/new-page. Separate browser processes for the two persistent conditions prevent accidental shared-page contamination. Only one page measures at a time; bring it to front and record focus/visibility.
- Capture original raw return unchanged, start/end focus/visibility/DPR/dimensions, actual GPU/browser argv, CDP task duration/heap snapshots outside timing where available, lifecycle IDs and source/tooling pins. Preserve capture failures. Collect no personal process names or unrelated browser contents.
- Analyze each run CPU p50/p95/p99, callback/rAF intervals and callback-arrival delay; six contiguous600-frame blocks and all final-state/work counters. Never pool frames as independent runs.
- New diagnostic stability screen: every run CPU p50 must stay within max(5% of the condition's median run p50, four observed clock increments) of that median; every600-frame block p50 must stay within the same absolute tolerance of its own run p50. All runs remain, whether this screen passes or fails. Report tails/ranges independently; this is an engineering reproducibility screen, not statistical significance or a retroactive qualification of #45.
- If regimes recur, test original under the implicated lifecycle; if no lifecycle separates them, test longer warmup4800 as a separately labeled condition. Trace/JIT diagnosis, if needed, uses another capture and cannot qualify primary timing. A missing environment metric is unavailable, not zero.

## Stage 3/4 activation

Freeze the candidate render matrix and app feature/cost contract in a separate plan addition after Stage2 evidence and original-app feasibility inspection. First run upstream differential/images, then compare whole paths. Do not port a new subsystem merely because a boundary-only counter improved. Product gates stay unchanged. A declared unsupported path or inadequate realistic CPU headroom must have concrete evidence and an explicit verdict.

## Stage 3A: prospective whole-path screening matrix

The first lifecycle experiment reproduced within-run regime changes in both historical original and JS routes. Longer warmup is a separate diagnostic; it does not silently qualify the older dataset. The candidate screening below has its own original A/A and block checks. If these fail, report only observed costs/regressions and keep qualification open.

- Runtime roots remain clean: original C3 ce21ffcf355534a8cf32eb4c9f7e43d6a86509b5 and epoch guard 6990fd92f61a031c8c2ba7a8282cfb63684e6dfb. Tooling has its own SHA/hash. Assert identical original Three.js, fixture, bench/browser and Wasm binary hashes across roots; native math is unchanged by the guard.
- Six route labels: original-A, original-B (identical upstream route as contemporaneous A/A), C3-JS, C3-Wasm, epoch-JS, epoch-Wasm. Use old root for C3 and new root for epoch/upstream. Six balanced Williams orders: [0,1,5,2,4,3] with each element increased by round modulo6. Each label occupies each position once.
- Four predeclared scenes: cubes (normal 2,000-object fixture), hierarchy (explicit scaled control), small and shader. Preserve viewport640x360, DPR1 and fixture quality. These are existing fixtures, not actual application replacement evidence. Six rounds, warmup240 and samples600 per run. Shorter values are smoke only.
- Before timing, run twelve fixed steps in separate pages and compare complete pixels, matrices (atol1e-10 + rtol1e-12), draws/triangles and actual prepared/Wasm counters. Runtime files must hash-match through capture. Post-timing snapshots, if retained, are outside timer and use fresh correctness pages or the same final tick across routes; they must not silently shift the timed tick range.
- One headed hardware browser, fresh context/page per timed run, focus/visibility/GPU/isolated clock checked. No profiler, GPU queries or stage timings during primary windows. Historical bench/browser.run measures animate through renderer return including normal public observation costs and retains per-frame bridge counters.
- Preserve all raw rows, source/tooling hashes, environment and error records; compute per-run CPU p50/p95/p99 and frame intervals, then median across runs. A/A: compare all twelve original run p50s per scene, requiring each within max(5% of their median, four clock increments); inspect each contiguous120-frame block against its run p50 using the same tolerance. Report all route block distributions and tails. This screen is reproducibility only, not statistical significance.
- No product qualification from this screening. Retain absolute and relative deltas versus upstream, old C3 and matched JS. Proceed to the first actual-app correctness/cost verdict even if the candidate is slower; do not expand a new native subsystem to hide the negative result. Any later qualifying matrix must have its own predeclared protocol.

## Stage 4A preparation: Editor candidate compatibility

Prepare the first candidate path using the pinned Three.js Editor at 9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8 (r186), preserving its source checkout. Serve a hash-guarded response overlay that changes only the WebGL comparison's `three`/`three/addons/` import resolution and explicit initialization before Editor construction. Keep WebGPU/path-tracer source present and classify those backends as outside this comparison. Preserve original, prepared-JS and prepared-Wasm routes with a single core/addon identity.

Use the existing licensed RobotExpressive setup/required native interactions as the initial correctness fixture. Include static geometry, selected/unselected animation, picking, translate/rotate/scale, undo/redo, focus, timeline/clip controls, camera and shadows as supported by existing original-app oracles. Record fallback and actual prepared/native counters; do not drop skinned/morph features to force a prepared pass. Tokyo is a licensed additional candidate (skins retained); large Bistro source/resource/license scope is recorded separately before any download. App timing parameters and full outer-operation boundaries will be frozen after the compatibility and headroom check. A renderer-only measurement cannot stand in for the full Editor update or interaction.

## Optimization decision order

Use the original-app profile evidence to investigate renderer/palette reuse first, then exact bounds and public-matrix consumption, then remaining UI refresh work. This is a cost-based hypothesis, not an approved shortcut or a claimed gain. Measure full outer operations; preserve animation, skins/morphs, selection, shadows, synchronous reads and callbacks. Candidate fallback and measurement stability must be reported before attributing improvements. Reuse requires valid invalidation across ticks, skeletons, cameras, shadow passes and geometry edits; bounds must retain the original precise semantics. No mixed-pass renderer rewrite or approximate bounds is implied by this order.

## Stage 4A bootstrap correction

The first prepared-Wasm Editor attempt failed before construction: Editor.js evaluates its default camera lookAt at module scope before the HTML module body can call init(). Preserve that failure. The adaptation now awaits the candidate initialization before dynamically importing all eleven app/addon entry dependencies in their declared order. Source, modules, features and runtime remain unchanged; only the explicit asynchronous bootstrap boundary moves ahead of module evaluation. Recheck JS and Wasm routes and compare fixed poses/interactions with the original. This is an integration correction, not an engine performance change.

The original app's Animation.updateTime has a separate rAF loop; any later primary timing must include or explicitly bound that UI work in addition to Viewport.animate. Model-root selection with native Walking and timeline controls is a realistic additional scenario with exact full-model bounds, not a replicated workload. Final timing parameters remain to be declared before capture.

## Stage 4B: prospective Editor callback cost screen

This protocol is frozen before capture. The separate tooling implementation is verified before the hardware smoke and full screen. It is an engineering feasibility screen, not a product qualification protocol.

### Fixed scope and primary boundaries

Use the pinned Editor at `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`, the existing RobotExpressive asset and E1/E2 authoring choices, and candidate `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb`. Record the actual clean runtime SHA and generated artifact hashes again. Three routes are original, prepared-JS, and prepared-Wasm. Preserve skins, morphs, precise bounds, native timeline controls, helpers, lights, shadows, callbacks, and autosave. Retain all failures and fallback counters.

The continuous primary metric is **covered Editor animation-and-timeline synchronous CPU**, with these two disjoint native callback boundaries:

1. `Viewport.js: animate`: function entry through the return from `updatePT()`, including the function epilogue. This includes timer/mixer updates, selected-object world updates and precise bounds, `morphTargetsUpdated`, main/grid/helper/view-helper rendering, and synchronous `sceneRendered` UI callbacks.
2. `Animation.js: updateTime`: function entry through its final `requestAnimationFrame(updateTime)` scheduling call. This includes timeline text, `getBoundingClientRect()`, and playhead updates when a clip is selected.

Accept the native rAF timestamp as an otherwise-unused parameter in each function. Store separate raw rows keyed by that timestamp. Pair exactly one callback of each kind per timestamp, verify that their intervals do not overlap, and add their durations for the primary per-frame series. Retain unmatched/duplicate rows as errors; do not silently drop them. The initial direct `updateTime()` constructor call has no rAF timestamp and is setup only. Finish the window only after the last timestamp's pair is complete.

Call this covered callback CPU, not entire browser CPU, display latency, or FPS. Browser paint/compositor/GPU work, asynchronous IndexedDB completion, other vendor tasks, and measurement bookkeeping are outside it. Report callback-start intervals, rAF-timestamp intervals, and callback-arrival delay separately. Keep native real-time `Timer`/mixer advancement unchanged. Record clip duration, loop count and pose-time range outside each sample window; compare full cycles and disclose differing phase coverage rather than pretending every route rendered an identical pose each frame.

### Native activity audit

The pinned Editor-owned source has the following scheduling sites:

| Site | Activation and treatment |
| --- | --- |
| `Viewport.js` setAnimationLoop | Continuous native update loop; primary boundary above. Idle callbacks remain idle. |
| `Animation.js` updateTime rAF | Independent continuous timeline loop; primary boundary above, including its inactive branch. |
| `Menubar.Render.js` animate rAF | Separate realistic-render export window only. Do not invoke this feature in the WebGL comparison; assert one page and no export window. Keep its code present. |
| `editor/index.html` saveState | Autosave defaults to true. Mutation signals debounce 1000 ms, then savingStarted, then a 100 ms serialization/IndexedDB submission callback. Preserve it. Await setup settling before warmup; record savingStarted/savingFinished activity during capture. These signals mark submission, not completed IndexedDB work. |
| `Sidebar.Project.Resources.js` refreshUIDelayed | 100 ms debounce after graph/geometry/material changes; synchronous selection listeners run inside the measured input or animation callbacks when applicable. Setup changes settle before capture. Deferred refresh during edit scenarios remains enabled and is reported outside handler CPU. |
| `Script.js` change timer | Triggered by a focused CodeMirror script edit. Do not enter the script editor in these scenarios; do not delete or disable it. |
| `Storage.js` IndexedDB callbacks | Startup/load and autosave completion callbacks; not part of either rAF function. Record unresolved activity and reject a continuous window with an unexpected setup save, or retain it as a separately labeled contaminated attempt. |

No app-owned `setInterval`, `requestIdleCallback`, or additional active viewport rAF chain was found in the inspected native Editor modules. Vendor/browser timers were not live-audited in this read-only pass, so an entire-page CPU claim would still be unsupported. Optional CDP cumulative task/script/layout metrics may be read before/after a window as supporting diagnostics; they are not substitutes for the declared callback boundaries and must not activate a profiler.

### Four continuous conditions

Use the same camera, CSS viewport 1280x720, timeline panel height, lighting, materials and quality within a condition across routes. Resolve UI dimensions once, record them, and fail on later changes. Select Walking and press native Play through the existing timeline UI. Keep the original real-time animation behavior.

| Condition | Setup and purpose |
| --- | --- |
| E3-root-selected-shadow | Select the imported Robot model root, select Walking, play, retain raster shadows. This naturally exercises whole-model precise bounds plus active timeline UI without adding replicas. |
| E3-unselected-shadow | Deselect the object, then select Walking in the timeline and press Play. `selectClip` does not select the object. Assert `editor.selected === null` and that Walking runs with an active timeline; deselecting after Play would stop the clip and is invalid. Same camera/panel/shadows as E3-root-selected. |
| E3-root-selected-no-shadow | Same root-selected scene and timeline, with the existing Key light's `castShadow` disabled, as in the correctness control. Keep the renderer and other settings unchanged. |
| E3-root-selected-high-resolution | Same root-selected shadow scene, CSS layout and page DPR1; change only `renderer.setPixelRatio(2)` on every route, matching the historical raster control. Label it a higher raster-load control, not proven GPU-bound. Record page DPR, renderer pixel ratio and drawing-buffer dimensions and reject any fallback/quality downgrade. If this condition cannot run unchanged, retain its failure rather than substitute a smaller scene. |

Use existing E2 selected-SkinnedMesh evidence as a separate historical/preparation reference. Do not relabel it E3: root selection increases the precise-bounds workload and activates the timeline. The shadow and selection contrasts change multiple coupled costs; primary deltas alone cannot establish palette or bounds attribution.

### Static/edit control

Retain the existing E1 two-cube/ground/light scene. An idle window must show no `sceneRendered` events after setup, while both native rAF chains continue; never force continuous rendering to make it measurable. Collect a bounded idle series and report absolute timer-floor-sized costs without impressive relative percentages.

For the first edit cost screen, reuse the verified native gizmo interaction. Hash-guard complete TransformControls `onPointerHover`, `onPointerMove`, and `onPointerUp` bodies, including early returns, with the same instrumentation on original and candidate addons. Record hover, move, and release/history rows separately. They include synchronous objectChanged, bounds, rendering and sidebar work reached by that handler; they are **gizmo handler CPU**, not complete browser input latency. Do not add nested renderer timings to these rows. Pointer-down, EditorControls' disabled listener, other compatibility mouse listeners, asynchronous autosave and browser event-dispatch overhead are outside this minimal boundary and must be listed.

Use actual pointer events, not a forced render loop. Locate the visible handle before measurement using the existing UI oracle. Preserve all transforms, history, focus and timeline checks from the three-route correctness suite. Camera, picking/focus, gizmo/history and animation/timeline already provide more than three native interaction scenarios; they need not all become new timed subsystems for the first verdict.

### Recommended prospective run schedule

For a bounded, explicitly unqualified cost screen: four balanced rounds; warmup600 paired rAF frames and samples1200 paired frames per continuous condition. Use four labels `[original-A, prepared-JS, prepared-Wasm, original-B]` where A/B are independent reloads of identical original code. Williams order seed `[0,1,3,2]`, increased modulo4 each round, balances label positions. Each candidate has four independent run summaries; original has eight, not 9600 statistically independent frames. At 60 Hz, a run is approximately 10 s warmup plus 20 s capture; report actual wall duration and observed refresh cadence.

Add one independent original run before and after each condition's balanced block for explicit bookend A/A. Keep these two rows as drift checks, separately from balanced engine summaries. The four-condition matrix has 72 runs; expected capture/warmup wall time is about36 minutes at60Hz, plus loading and correctness gates. This is preferable to silently shortening a run after inspecting results. A larger adoption study would need a separate protocol.

For E1 idle, use the same four balanced orders (16 runs) and label them auxiliary screens: warmup120 callback pairs, samples240 callback pairs, with no render notifications or renderer frame advancement. E1 edit-handler timing is deferred to a separately frozen diagnostic; the existing full UI correctness gate retains native gizmo, focus, picking, undo/redo and timeline checks. These settings must be frozen with the driver rather than tuned after output is seen.

Use one headed Chrome process and a fresh context/page per run. Bring the current page forward and record focus, visibility, browser version/path, GPU/ANGLE, display/DPR/canvas size, power state, timing mode and clock probe. Build/profile/other heavy work stays outside all primary windows. Original, JS and Wasm receive identical source instrumentation and collection code. Preallocate row storage; timestamp at native entry/exit and append outside the CPU interval. No screenshots, readPixels, traversal, JSON serialization, subsystem timers, profiler, GPU query, heap inspection or diagnostic reset occurs inside a primary window. Snapshot runtime counters before/after the window; expected main-scene fallback is a result, not a test failure or a reason to remove features.

Analyze CPU p50/p95/p99 and intervals per run, then summarize runs; retain raw timestamped rows. Use four contiguous300-frame blocks per continuous run. Require original balanced/bookend p50s within `max(5% of their median, 4 * observed clock increment)` and each block p50 within that tolerance of its own run p50. Report candidate block stability too. Failure keeps the data and permits only observed-cost/regression statements, not a stable speedup claim. Do not pool frames to manufacture confidence.

### Isolation and instrumentation parity gates

The current correctness helper is non-isolated. Add an explicit optional isolated mode for this driver, applying `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` to local responses. Mirrored cross-origin resources need both the existing CORS response and `Cross-Origin-Resource-Policy: cross-origin`; classic script/font/worker loads must be checked rather than assuming CORS alone fixes COEP. Assert `crossOriginIsolated === true` and validate a bounded clock probe before warmup. Preserve ordinary correctness mode as the default.

Before timing, validate all three routes' unmodified-versus-timing-overlay oracles. At identical frozen clip times and UI state, compare canvas pixels, full numerical outputs, hierarchy/selection/history, renderer quality and backend/counters. Compare each route against its uninstrumented version and against the accepted original reference. Retain screenshots but do not demand byte-identical dynamic DOM render-duration text. Validate original app and candidate source/build hashes before/after; archive every original and served file hash plus exact adaptation diff. Reject a missing anchor or altered source before serving it. Generated candidate addon import rewrites are allowed only after proving that their canonicalized body equals the pinned upstream body; instrumentation must not patch the original checkout.

Confirmed original source SHA256 values:

| Source | SHA256 |
| --- | --- |
| editor/js/Viewport.js | `597f323c2b9c8c7e6f87bc92192baf5ecd940edb9533198b0c8dcbdcf706e196` |
| editor/js/Animation.js | `1d47972dd3b92c1c28a44f0699b6b0e770a5cfcddc8959db87f2d9ef4d982983` |
| editor/js/EditorControls.js | `a20fd28bedbafdcd43df55f40a890c0adae3a0fcd03e51adc116c107a6ad2d02` |
| examples/jsm/controls/TransformControls.js | `151befe25bb0d68626f9a6b033625b7b0cf6848e39ba71623b7bed8e3df565d6` |
| editor/js/Sidebar.Settings.Shortcuts.js | `60c2baee4416138d5784b9f5507fb8fc72677a480006bc75abf1d7addcbcd435` |
| editor/js/Sidebar.Project.Resources.js | `a76d0cf0c9721bc55867e62aaefc3fc82ee1fee002de78ca893cb407ec8ee6bf` |
| editor/index.html | `1e186dca4fd7f15d3fea1f137406e250786b5fcd2451cf8677c65a77946aad36` |

The two continuous instrumentation anchors are unique named functions: `function animate() {` in Viewport.js and `function updateTime() {` in Animation.js. Their existing terminal calls are respectively `updatePT();` before `function initPT()` and `requestAnimationFrame( updateTime );` before `function onObjectSelected`. Use source-aware body locations plus full-file hash guards; do not match arbitrary braces with an unguarded regex. Keep original exception/return semantics with a finally epilogue. Recording failures must not be mistaken for zero CPU.

### Minimal driver structure and verdict

One new driver can reuse candidate-browser for pinning, secure serving, external resource mirrors, failure preservation and hardware preflight, with explicit response-overlay and isolation options. Its responsibilities are: freeze/record configuration; run unmodified/overlay parity checks; construct the native E3/E1 scenes and interactions; wait for setup saves/loads; perform warmup; collect paired native callback rows; capture post-window counters/state; close and verify integrity; summarize balanced runs and A/A. Reuse a shared browser without sharing contexts; do not create or close an unrelated user browser. The helper currently launches a browser per openRun, so reuse needs an explicit caller-owned-browser option or a dedicated driver session API, not an undocumented lifecycle change.

Report improvements versus original separately from the Wasm effect versus matched prepared-JS. Expected fallback does not imply zero Rust transform work: record actual backend, Wasm calls, prepared passes/fallbacks and before/after counts. CPU savings do not establish FPS improvement. If the native app has inadequate headroom, the candidate regresses, or stability fails, that is an acceptable first-app verdict.

Optimization order remains renderer/palette reuse, then exact bounds/public-matrix consumption, then remaining UI refresh. Use separate diagnostic captures for attribution. Reuse must respect frame/tick, skeleton, geometry, camera, shadow and callback invalidation; preserve exact bounds. This plan authorizes neither approximate bounds nor a mixed-pass renderer rewrite.

### Tooling verification and invocation

Run `node --check` on the three changed app modules, `node --test tests/editor-timing.mjs`, `npm run test:infra`, and `npm run docs:check`. The collector tests exercise partial arming, missing/duplicate/invalid callbacks, abort preservation, activity snapshots and original exception propagation. Use the source-aware original-versus-overlay hardware oracle before timing. Full capture requires clean source/tooling and verified AC power before and after; unavailable power is not a successful full-environment check.

```sh
node scripts/apps/timing.mjs "$APP_ROOT" work/task46-editor-timing-smoke-001 mode=smoke candidateRoot="$CANDIDATE_ROOT" candidateSha=6990fd92f61a031c8c2ba7a8282cfb63684e6dfb
caffeinate -di node scripts/apps/timing.mjs "$APP_ROOT" work/task46-editor-timing-screen-001 mode=full candidateRoot="$CANDIDATE_ROOT" candidateSha=6990fd92f61a031c8c2ba7a8282cfb63684e6dfb
```

Use a fresh output path for every attempt. These are prospective commands until the capture report records execution. Source and timing-tool commits remain distinct from the frozen engine candidate.
