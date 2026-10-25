# Task #46 Stage 4A: Editor candidate correctness

GitHub Issue: [#46](https://github.com/postmelee/three.rust/issues/46)  
Implementation plan: [`task_m6_46_impl.md`](../plans/task_m6_46_impl.md#stage-4a-preparation-editor-candidate-compatibility)  
Stage: 4A correctness preparation

## Stage Purpose

Establish a preserved-feature candidate route in the real Three.js Editor before measuring full application operations. Original, prepared-JS and prepared-Wasm passed 14 check assertions and 40 UI assertions each. The separate cross-route audit passed 149,328 ordered numerical comparisons, 32 fixed-image pairs and 40 semantic records. **This establishes the bounded tested behavior, not an app performance advantage, complete compatibility or native ownership of animation.**

## Artifacts

| File | Change Summary |
|---|---|
| `bench/results/task46-editor-correctness-20261026/` | 399 copied payloads from six canonical runs and four earlier attempts; all raw state, images, scene exports, errors, inventories, original/served entry HTML and adaptation patches; MIT/CC0 notices, hash index and independent verifier. |
| `scripts/apps/candidate-browser.mjs`, `check.mjs`, `ui.mjs` | Previously committed candidate-aware correctness tools and bootstrap correction. This report/archive does not modify the tools. |
| `mydocs/working/task_m6_46_stage4a.md` | Correctness result, source/initialization boundaries, fallback scope, failure retention and timing handoff. |

## Body Change Scope / Lossless Preservation

The Editor source is pinned at `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8` (r186 / Three.js 0.186.1). Candidate runtime is the clean `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb`. The second app, glTF Viewer at `b5ee5dafe27f953ae1b55f42b5fa3697fef08683`, remains the original bundled engine and is not replaced or claimed as validated by this Editor run.

Candidate responses change the Editor entry's `three`/`three/addons/` resolution to one candidate core/addon identity and perform explicit initialization before dynamically importing the original app entries. App source files and assets remain unchanged. Original and served HTML, all replacement statements and complete adaptation diffs are public. WebGPU and path-tracer sources remain present but are outside this WebGL comparison. Each run's served-file/network inventory and integrity record are retained.

The canonical original UI run used clean tooling `c7e6c25413f4731cd16f8a1bafa8b07510e10b78`, helper SHA-256 `78dc0499a873019fda07d8004721ce18bf7515b6199a912a1ca080d908c92c95`. The other five canonical sets used clean tooling `cadc5edd694b3aa778dd049251d15e5f6dd75c87`, helper SHA-256 `cb4c490650b3ca2a8c0860e744a892bee102383d5a153ae41698fed209ad0cc6`. The original HTML response is unchanged at both helper versions, SHA-256 `1e186dca4fd7f15d3fea1f137406e250786b5fcd2451cf8677c65a77946aad36`; original UI therefore remains a valid comparison source. Candidate manifests pin all built facade/native artifacts, lockfiles and Rust toolchain. The helper uses existing builds and records hashes; it does not build or independently certify their source-to-binary correspondence. Wasm SHA-256 is `95f7aa7a807bd0bd4c9b45f0a855d2305c262cf5b7fef35a2d9dd9dfa889cdd9`.

| Canonical raw directory | Route / suite | Passed assertions | Tool SHA prefix |
|---|---|---:|---|
| `work/task46-editor-original-check-002` | Original / checks | 14 | `cadc5ed` |
| `work/task46-editor-original-ui-001` | Original / UI | 40 | `c7e6c25` |
| `work/task46-editor-js-check-002` | Prepared JS / checks | 14 | `cadc5ed` |
| `work/task46-editor-js-ui-002` | Prepared JS / UI | 40 | `cadc5ed` |
| `work/task46-editor-wasm-check-002` | Prepared Wasm / checks | 14 | `cadc5ed` |
| `work/task46-editor-wasm-ui-001` | Prepared Wasm / UI | 40 | `cadc5ed` |

### Startup failure and correction

The initial Wasm attempt failed before Editor construction with `rthree: await init() before updating objects`, then timed out after 20 seconds. `Editor.js` evaluates a default camera `lookAt()` at module scope; static imports execute before the entry module body can await initialization. Moving only `await THREE.init()` before `new Editor()` was insufficient.

Tooling correction `cadc5edd694b3aa778dd049251d15e5f6dd75c87` initializes the candidate first and then dynamically imports all eleven original app/addon entry dependencies in their declared order. This is an explicit integration requirement; the route is not an unchanged import-only substitution. No runtime engine or original app module was edited. Original/JS/Wasm checks and JS/Wasm UI were rerun after the correction. The original route's response did not change.

Four earlier runs are preserved in `attempts/`: original-check-001 passed 14 with toolingDirty=true (new A/A archive files were present; a clean original-check-002 replaced it as the canonical comparison); JS-check-001 and JS-ui-001 passed using the earlier helper; Wasm-check-001 failed startup. All failed/dirty records remain with exact hashes and original status, and are not counted as canonical success.

### Asset, environment and behavior scope

RobotExpressive is the original CC0 model by Tomas Laulhe with Don McCurdy's morph-target additions: 463,988 bytes, SHA-256 `047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319`. The archive preserves its CC0 notice and Three.js MIT notice. Complete scene exports retain the CC0-derived geometry and random UUIDs; those exports are evidence, not a cross-engine byte-equality oracle. The known upstream validator result remains 752 nonnormalized-weight errors and four skin-node warnings. All routes independently confirm loader-normalized weights over 1,108 vertices / four geometries, maximum sum error 4.470348358154297e-8. This does not turn the source asset into a validator-conformant asset.

Chrome 155.0.8059.86 was launched from `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, headed at 1280×720, DPR 1; the fixed Editor canvas is 930×648 with WebGL ANGLE Metal Apple M4 Pro. Actual GPU/context attributes, quality fields and source pins are retained. These are correctness sessions, not quiet-condition timing sessions: no per-session host power/thermal/display or full Chrome command-line record was captured by this helper. Do not infer those conditions from the later fixture screen. No profiles, frame timings or timers were collected here.

The tests retain four skinned meshes, three morph-bearing meshes and 14 clips; native loader/playback, selected bounds, shadows, hide/show and exact fixed poses remain. E1 covers small static geometry, picking/shift-selection, transform commands, synchronous reads, undo/redo and idle render suppression. UI covers actual translate/rotate/scale gizmo pointer input, group translation, keyboard undo/redo, focus, camera interaction, light/shadow controls, clip controls, native play/pause/stop and fixed timeline scrub poses. The capture fixtures and fixed-pose controls are documented adaptations; native input checks are distinct from fixed-state oracles.

### Independent cross-route comparison

Each candidate is compared against the canonical original for both repeats. The audit covers 32 fixed-image records (16 JS, 16 Wasm), 40 semantic records (20 JS, 20 Wasm), and 149,328 ordered numeric values with tolerance abs(candidate-original) ≤ 1e-10 + 1e-12 × abs(original). Maximum absolute difference is zero. Fixed PNG bytes and stored RGBA digests are identical, as are captured object order/type/visibility/shadow fields and quality. History, transform/undo/redo, selection, exact bounds, loaded weights and timeline semantics match.

Four `timeline-state-*.json` field pairs, `paused.time`, are explicitly outside exact equality: native playback waits until time > 0.05 seconds before a UI pause click, so wall-clock time varies. Every original/candidate value remains public; each is finite, within (0.05, clip duration), paused=true and running=false. All other fields and the fixed 0.25/0.75 scrub images/numerics are compared. This exception is not a dropped failing frame or performance outlier. Full UI screenshots may include transient UI state and are retained for context, not substituted for the fixed-canvas oracle.

### Prepared/native coverage and fallbacks

Cumulative per-page checkpoints demonstrate real candidate work and paid public-matrix materialization, but are not per-frame timing or ownership fractions:

| Checkpoint, repeat 0 | Prepared passes JS/Wasm | Prepared draws JS/Wasm | Fallbacks JS/Wasm | Matrix reads JS/Wasm | Materialized bytes JS/Wasm | Wasm calls | Wasm nodes | Native prepared calls |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| E1 small static | 135 / 135 | 201 / 201 | 171 / 171 | 1953 / 1953 | 249984 / 249984 | 1670 | 6395 | 135 |
| E2 animated selected shadow | 97 / 97 | 84 / 84 | 177 / 177 | 3741 / 3741 | 478848 / 478848 | 2154 | 8639 | 97 |

Skinned/morph and other unsupported renderer/helper paths retain their fallback instead of being removed to force an all-prepared result. Native counters establish that Wasm ran; they do not establish that animation, skinning or the entire rendered frame is Rust-owned. Public matrix-read and render-transfer costs need full-operation timing with these semantics preserved.

## Verification Results

The six canonical invocations used these options, with `$APPS` the pinned prepared-app directory and `$EPOCH` the clean candidate checkout. Choose fresh output names for reproduction. Run the original UI command at its recorded tooling pin to reproduce its exact helper; all other canonical commands use `cadc5edd694b3aa778dd049251d15e5f6dd75c87`.

```sh
node scripts/apps/check.mjs "$APPS" work/task46-editor-original-check-002 engine=original app=editor
node scripts/apps/ui.mjs "$APPS" work/task46-editor-original-ui-001 engine=original app=editor
node scripts/apps/check.mjs "$APPS" work/task46-editor-js-check-002 engine=prepared-js app=editor candidateRoot="$EPOCH" candidateSha=6990fd92f61a031c8c2ba7a8282cfb63684e6dfb
node scripts/apps/ui.mjs "$APPS" work/task46-editor-js-ui-002 engine=prepared-js app=editor candidateRoot="$EPOCH" candidateSha=6990fd92f61a031c8c2ba7a8282cfb63684e6dfb
node scripts/apps/check.mjs "$APPS" work/task46-editor-wasm-check-002 engine=prepared-wasm app=editor candidateRoot="$EPOCH" candidateSha=6990fd92f61a031c8c2ba7a8282cfb63684e6dfb
node scripts/apps/ui.mjs "$APPS" work/task46-editor-wasm-ui-001 engine=prepared-wasm app=editor candidateRoot="$EPOCH" candidateSha=6990fd92f61a031c8c2ba7a8282cfb63684e6dfb
python3 bench/results/task46-editor-correctness-20261026/verify.py
```

Result: six canonical datasets passed, 162 route-local assertions, integrity unchanged and no page errors; archive verifier checked all 399 copied payloads and independently reproduced 72 cross-route comparisons / 149,328 numeric values / 32 identical image pairs / 40 semantic records / zero differences, plus four explicit wall-clock exceptions. Earlier failed and dirty attempts remain distinct. The archive preserves all raw files, adds original/source-decoded/public-decoded/stored hashes and lossless gzip copies, and overwrites no local capture. No payload needed personal-path normalization.

## Residual Risks

- This is bounded compatibility with the tested Editor interactions. The independent Viewer candidate route, WebGPU/path tracing, arbitrary user content and complete Three.js API remain unverified.
- Native execution coexists with fallback. Correctness does not establish whole-frame ownership or performance.
- Source asset validator errors remain. The runtime loader's weight normalization is verified without modifying the asset.
- Different-date repetition, quiet-condition app timing, app A/A stability and candidate profiles are not completed by this report. Original profiles remain separate historical evidence.
- The Editor's `Animation.updateTime` has a separate rAF loop. Timing only `Viewport.animate` would omit timeline UI work; a later protocol must include or explicitly bound it.

## Impact on Next Stage

Proceed with a prospective full-outer-operation Editor timing protocol that retains native animation, skinned/morph fallback, selected exact bounds, public reads, renderer submission, callbacks and timeline work, with its own A/A and block checks. Keep instrumentation overhead and empty-sampler controls explicit. The Stage 3 fixture instability remains an unresolved qualification barrier; it does not invalidate these separately verified correctness results. Do not raise C3 ownership or README performance claims.

## Approval Request

The task requester already authorized completion of the short-term goal and successive stages. These Stage 4A correctness artifacts are submitted for review; app timing must use its separately frozen protocol and clean tooling before capture.
