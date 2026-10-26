# Task #49 Stage 1 — native Editor candidate attribution

GitHub Issue: [#49](https://github.com/postmelee/three.rust/issues/49)
Implementation plan: [task_m6_49_impl.md](../plans/task_m6_49_impl.md)
Stage: 1

## Stage Purpose

Identify costs in the same native Editor E3 root-selected Walking/shadow scenario used by Task #46 before changing the engine. These are diagnostic profiles, not primary CPU quantiles, A/A qualification, whole-browser CPU or FPS measurements.

## Artifacts

| Artifact | Result |
|---|---|
| `scripts/apps/editor-scenario.mjs` | Unchanged shared native setup and fixed-pose oracle extracted from the historical timing driver |
| `scripts/apps/candidate-profile*.mjs` | Dedicated native profiler, source capture/resolution, accounting and offline analysis |
| `tests/candidate-profile*.mjs` | Source mismatch, accounting, classifier, failure preservation and bounded-operation regressions |
| `bench/results/task49-editor-profile-20261026/` | Reconstructable raw smoke/full captures, exact served/debugger bytes, fixed-pose evidence, both analysis attempts and independent audit |
| `mydocs/working/task_m6_49_profile_review.md` | Tool source review and resolved findings; this report adds runtime findings |

## Body Change Scope / Lossless Preservation

No engine source changed in this stage. The existing native Editor scene, callbacks, UI, autosave, shadow passes and render loop remain present. The profile runner does not replay a synthetic loop. Source/observer oracles use separate pages. No timing overlay, renderer wrapper, Debugger source lookup or GPU query runs in the sample window. Source capture on resource requests remains possible and is disclosed; the profile does not claim a hard no-I/O condition.

The capture tool is `489736e4549083a199babfeea0d6104cf2d45904`; the measured runtime is `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb`. The Editor source is `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8` (Three.js 0.186.1). All three source states were clean and identical before/after. The unchanged Viewer pin `b5ee5dafe27f953ae1b55f42b5fa3697fef08683` is recorded for workspace integrity, not as a Viewer candidate result.

Full and smoke analysis-001 incorrectly classified verified candidate URLs containing `__rthree_candidate__` as automation. Those derived category tables are invalid and retained. Commit `ade53795b4880612b38d66c342bc4c7208ad21b0` restricts observer classification to actual observer evidence and adds the actual-prefix regression. Analysis-002 reuses every original sample and records its analyzer SHA separately. This correction did not require or replace a browser capture.

## Verification Results

Executed preparation and checks:

```bash
npm ci
npm run fixtures
npm run build
npm test
node scripts/fetch-fox.mjs
npm run test:infra
npm run docs:check
```

Locked installation/build/native and JS tests passed. Infrastructure verification after the classifier fix passed 67/67 tests; adding six archive integrity regressions brings the integrated suite to 73/73. Syntax and whitespace checks passed. Fresh core/runtime/facade/Wasm artifacts and locks matched the immutable measured runtime; no new engine build was silently substituted.

Capture commands (use the exact clean source checkouts and a fresh output directory):

```bash
caffeinate -di node scripts/apps/candidate-profile.mjs "$APPS_ROOT"   work/task49-editor-profile-smoke-001 mode=smoke   candidateRoot="$EPOCH_ROOT" candidateSha=6990fd92f61a031c8c2ba7a8282cfb63684e6dfb
caffeinate -di node scripts/apps/candidate-profile.mjs "$APPS_ROOT"   work/task49-editor-profile-full-001 mode=full   candidateRoot="$EPOCH_ROOT" candidateSha=6990fd92f61a031c8c2ba7a8282cfb63684e6dfb
node scripts/apps/candidate-profile-analyze.mjs   work/task49-editor-profile-full-001 work/task49-editor-profile-full-analysis-002
node scripts/apps/candidate-profile-analyze.mjs   work/task49-editor-profile-smoke-001 work/task49-editor-profile-smoke-analysis-002
```

`APPS_ROOT` contains the pinned original Editor/Viewer and mirrored resources; `EPOCH_ROOT` contains the exact clean 6990fd9 runtime build. Local outputs were never overwritten. Smoke is a tool check only. Full capture ran 2026-10-26 02:08:37–02:12:58 UTC, with three rotated orders of original / prepared-JS / prepared-Wasm, 600 native warmup frames, and a requested 12-second/100µs profile per route. Nine full profiles contain 685,735 samples; three smoke profiles contain 38,164. All captures completed without recorded page/serving errors.

Hardware: MacBook Pro Mac16,8, Apple M4 Pro (12 CPU / 16 GPU cores), 24 GB; macOS 26.5.2 build 25F84; Chrome 155.0.8059.86 at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; actual WebGL backend ANGLE Metal / Apple M4 Pro, not SwiftShader. Chrome arguments are archived, including its default SwiftShader-enable flag; actual context/backend verification determines the hardware classification. AC before/after, `powermode 0`, `caffeinate -di`; internal panel 3024×1964, logical 1512×982 at 120Hz. Page 1280×720, DPR1; canvas 930×378 and renderer DPR1; timeline outer/content 307/306; shadow map 1024. No concurrent build/download/test/profile was scheduled by this task during capture. This is a shared desktop, not an exclusive OS laboratory.

Six oracle pages per capture (three routes × observer off/on), each at two fixed poses, matched original images and all 7,833 finite numeric values exactly. Independent Python decoding reproduced raw-pixel SHA values and confirmed equality with the historical Task46 original setup/poses. Native endpoint checks passed visibility/focus, playback/action phase, quality, autosave and backend state. Independent audit verified 1,854 source/debug payload hashes, raw sample-tree/self/inclusive accounting, tool Git blobs and paid-work counters.

Corrected exclusive-category ranges across three full profiles per candidate (percent of active sampled elapsed weight; this denominator excludes idle/program and is not whole-browser CPU):

| Category | Matched JS | Wasm |
|---|---:|---:|
| Bounds/picking/skinned public consumers | 27.2–27.5% | 27.4–28.1% |
| Transform/math | 16.4–17.0% | 16.1–16.6% |
| Facade operation preparation | 13.8–14.1% | 13.6–14.3% |
| Matrix materialization/proxy | 3.5–3.6% | 2.4–2.5% |
| JS or verified Wasm kernel | 0.7–0.8% | 0.6–0.7% |
| UI/callback | 1.5–1.6% | 1.4–1.6% |

These exclusive categories do not assign unresolved native DOM work to the UI bucket. For example, `getBoundingClientRect` appears under the verified `Animation.updateTime` caller. The separate, non-additive nearest-caller context view includes that cost (4.5–4.9% of active candidate weight), so 1.4–1.6% is not the total UI cost. It remains smaller than the bounds and operation-preparation candidates.

All four native submissions per frame use fallback; prepared passes remain zero. The candidate performs 205 paid matrix materializations / 26,240 bytes per frame, and the Wasm route performs 135 calls per frame. Counters do not time each getter or measure GPU uploads. Exact bounds/skinning is a substantial consumer, while repeated generic single-node operation preparation is a smaller, directly identifiable and narrowly changeable cost. Profiles support investigating that preparation boundary before additional Rust arithmetic or UI optimization. They do not predict a saving or establish a primary regression magnitude.

## Residual Risks

- Actual median sampling gaps were 155–156µs; p99 gaps were 204–215µs. Each full profile retains a 123–134ms initial `(program)` gap. Weighted samples are elapsed-gap attribution, not on-CPU cycles. Inclusive ancestors overlap and are not additive.
- Native/unavailable scripts and Wasm transition stubs remain unresolved. Function category labels are heuristics over verified source identities; source verification does not make a label exact.
- Profiler and passive-observer overhead is uncalibrated. Before/after cadence near 120Hz cannot calibrate callback CPU overhead; no overhead is subtracted.
- Endpoint phase checks do not establish every intervening pose. Fixed poses are finite compatibility evidence, not complete Editor correctness.
- Historical Task46 A/A instability remains unresolved. No main timing, second day/device/browser, product adoption or ownership progress is claimed here.
- Larger assets have provenance/validator preparation only; no new content runtime or Viewer candidate qualification follows from Stage 1.

## Impact on Next Stage

The [cost-selection record](../tech/task_m6_49_cost_selection.md) selects single-node facade preparation before runtime edits, records its unchanged API/invalidation contract and competing alternatives, and requires the same algorithm in JS and Wasm with the generic fallback retained. Exact Float64 palette reuse remains a later hypothesis with a larger invalidation/callback surface. The optimization must be evaluated with separate full-path measurements, preserving unfavorable results and the existing adoption-v1 thresholds. Viewer integration proceeds in a separate tooling area with preserved r176 and pure-r186 controls.

## Continuation

Stage 2 is within the approved Task #49 sequence. This report establishes the attribution evidence and limits; it does not approve a default engine switch or lower the product adoption gates.
