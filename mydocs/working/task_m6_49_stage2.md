# Task #49 Stage 2 — single-node preparation experiment

GitHub Issue: [#49](https://github.com/postmelee/three.rust/issues/49)
Implementation plan: [task_m6_49_impl.md](../plans/task_m6_49_impl.md)
Stage: 2

## Stage Purpose

Test one narrow, measured preparation cost while preserving the same JS/Wasm computation, public matrix reads, native app work and compatibility gates. Correctness passed. Repeated diagnostic profiles did not establish a useful improvement, so the change remains an experimental candidate pending the separate complete-path comparison.

## Artifacts

| Artifact | Result |
|---|---|
| `packages/rthree/facade-state.js` | Single selected node preparation without the generic collection arrays, Map or operation objects; shared evaluators unchanged |
| `tests/facade-worker.mjs` | Shared JS/Wasm semantic cases for flags, force, public reads, fallback, growth and reuse |
| `mydocs/working/task_m6_49_single_node_review.md` | Independent source review and integrated verification record |
| `mydocs/plans/task_m6_49_editor_protocol.json` | Separate immutable candidate/protocol; no change to historical measurement pins |
| `scripts/apps/editor-candidate-protocol.mjs` and runner integration | Exact committed protocol, candidate and output-prefix guards |
| `bench/results/task49-editor-single-profile-20261026/` | All new profiles, source bindings, numerical/image oracles, independent old/new comparison and archive verification |
| `bench/results/task49-editor-single-correctness-20261026/` | Six native correctness/UI captures and independent cross-route audit |
| `mydocs/tech/task_m6_49_single_node_profile.md` | Unfavorable diagnostic result and adoption boundary |

## Body Change Scope / Lossless Preservation

Runtime commit `85e2c5d500edb0b92ea4ecb997087fded3fed45b` changes only `facade-state.js` among served runtime files. Core, runtime and Wasm bytes equal the preceding `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb` candidate. The specialization retains eligibility, registration/reservation, external parent elements read order, upload, operation fields, force and auto-update flags, evaluator validation, materialization epochs and accounting. It adds no bound approximation, cache, skipped update, public API or Rust arithmetic change. Source review does not prove that every removed source construction caused an actual heap allocation.

The old runtime and all historical data remain intact. The new runtime and validation tooling have independent clean checkouts. Capture tooling is `e9b736a47f48bc2512476f8966d285d0153419f7`; Editor is `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`. Runtime, tooling, app and served-file hashes are recorded separately. Tool preparation commits precede capture; this stage report bundles the subsequently obtained evidence, not a retrospective assertion that captures existed at source freeze.

## Verification Results

Executed with the locked dependencies and specified Rust toolchain:

```bash
npm ci
npm run fixtures
npm run build
npm test
node scripts/fetch-fox.mjs
npm run test:compatibility
npm run test:prepared
npm run docs:check
npm run test:infra
```

The new runtime checkout independently completed installation, fixtures, build, test and Fox acquisition. Integrated compatibility and prepared suites passed. Facade workers passed 13/13 per JS/Wasm backend; prepared state passed 19 with one intentional GC-related skip for JS, and 20/20 for Wasm. Native Rust tests, differential JS tests and TypeScript checks passed. Browser gates preserve two cameras, callbacks, public matrices, pixels, nested passes, exception cleanup and upload behavior. Infrastructure passed 77/77 after the protocol guard; the later helper-attribution change passed its 13 targeted tests. The manually cyclic parent defensive test was suggested in review but was not run or added; unchanged invalid-command fields were inspected only.

Diagnostic capture and analysis commands, using fresh output directories:

```bash
caffeinate -di node scripts/apps/candidate-profile.mjs "$APPS_ROOT" work/task49-editor-single-profile-smoke-001 mode=smoke candidateRoot="$SINGLE_ROOT" candidateSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b protocol=mydocs/plans/task_m6_49_editor_protocol.json
caffeinate -di node scripts/apps/candidate-profile.mjs "$APPS_ROOT" work/task49-editor-single-profile-full-001 mode=full candidateRoot="$SINGLE_ROOT" candidateSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b protocol=mydocs/plans/task_m6_49_editor_protocol.json
node scripts/apps/candidate-profile-analyze.mjs work/task49-editor-single-profile-full-001 work/task49-editor-single-profile-full-analysis-001
node scripts/apps/candidate-profile-analyze.mjs work/task49-editor-single-profile-smoke-001 work/task49-editor-single-profile-smoke-analysis-001
```

Nine full profiles retain 684,661 samples; three smoke profiles retain 38,037. All captures and fixed-pose gates passed. Hardware remained actual ANGLE Metal / Apple M4 Pro, headed Chrome 155.0.8059.86, AC power, with the same native E3 scene and declared screen/quality settings. Independent comparison matched 93,996 ordered numerical values and all twelve old/new full oracle poses and images. Paid work remains four fallback passes, zero prepared passes, 205 matrix materializations / 26,240 bytes and 135 Wasm calls per native frame. The `updateSingle` samples are kept in operation preparation and combined with `facadeUpdate`; extracting a helper is not counted as a saving. The original control also moved between captures, so elapsed sample weights do not establish a regression or a gain.

Native app commands were run for each of `original`, `prepared-js` and `prepared-wasm`, each with a fresh check/UI path:

```bash
node scripts/apps/check.mjs "$APPS_ROOT" "$FRESH_CHECK" app=editor engine="$ROUTE" candidateRoot="$SINGLE_ROOT" candidateSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b
node scripts/apps/ui.mjs "$APPS_ROOT" "$FRESH_UI" app=editor engine="$ROUTE" candidateRoot="$SINGLE_ROOT" candidateSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b
```

All 162 route-local checks passed. Independent cross-route verification passed 72 comparisons: 32 exact images and 40 semantic records, containing 149,328 ordered numeric values with zero observed difference. Coverage includes picking, pointer gizmo translate/rotate/scale, history/undo/redo, multi-selection, focus, synchronous matrix reads, visibility, light/shadow and native timeline controls. Only the existing four bounded native `paused.time` exceptions remain; fixed scrub poses are strict. Six clean source/integrity records and all raw payloads are retained. Generated public scene UUIDs are preserved exactly and are not mistaken for private machine identifiers or used as equality oracles.

The integration owner also reran both published archive verifiers and the four correctness-archive preservation/privacy tests after the separate primary capture finished. All passed:

```bash
python3 bench/results/task49-editor-single-profile-20261026/verify.py
python3 bench/results/task49-editor-single-correctness-20261026/verify.py
python3 bench/results/task49-editor-single-correctness-20261026/test_build.py
```

## Residual Risks

- Profiles are elapsed-gap sampled attribution, not primary CPU quantiles, on-CPU cycles, GPU time or FPS. Profiler overhead is uncalibrated.
- No clear diagnostic improvement was found. Correctness alone does not justify adopting the specialization or switching an app to Rust.
- Finite native tests do not establish complete compatibility. Side-effectful/reentrant exotic getters retain existing exclusions.
- Original RobotExpressive source conformance warnings/errors remain; runtime normalized-weight checks do not repair or qualify its source.
- Primary timing, A/A, two-app decisions, larger-content runtime coverage and broader hardware/date/browser/lifecycle gates remain separate.

## Impact on Next Stage

Carry both immutable candidates and unfavorable evidence into Stage 4. If complete-path costs do not justify the new specialization, preserve its commit and data as a rejected experiment rather than claiming a verified improvement. Viewer migration controls and larger-content imports remain Stage 3 work. Exact bounds/palette consumers remain a stronger remaining cost hypothesis than kernel arithmetic; UI costs must include native DOM work and separate callback loops.

## Continuation

Stages 3–5 are within the approved finite Task #49 sequence. This report records the completed correctness and diagnostic experiment; it does not authorize a default backend change or relax adoption-v1.
