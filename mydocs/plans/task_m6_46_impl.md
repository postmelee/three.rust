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
