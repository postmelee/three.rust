# Task #21 — Stage 3: integrated verification and delivery

Issue: [#21](https://github.com/postmelee/three.rust/issues/21)
Plan: [implementation plan](../plans/task_m3_21_impl.md)

## Purpose and artifacts

Verify the complete existing implementation plus the status/preparation artifacts,
then integrate the explicitly authorized work into main. This report is the
pre-publication record; final remote CI and merge outcomes are recorded in the PR.
README now identifies the engine as experimental. The counting guide explicitly
allows many upstream operations to map to one Rust batch without a one-to-one
internal layout requirement.

## Executed verification

| Check | Actual result |
|---|---|
| cargo fmt, clippy; npm run build; npm test | Passed: 5 Rust, 9 upstream differential, strict TypeScript |
| npm run test:infra; actionlint 1.7.7 | Passed: 5 infrastructure tests and workflow syntax |
| npm run test:progress; docs:check | Passed: 2 AST + 5 Python tests, desktop/mobile pages/history, deterministic files, English and 19-issue DAG |
| npm run test:pipeline | Passed: 7 upstream semantic oracles, five engine/repeat images and palettes |
| npm run test:browser | Passed: five existing scenes, A/A and A/B/C/D exact images/numerics, callbacks and actual Wasm counters |
| npm run test:gpu-guard | Actual SwiftShader rejected as hardware |
| npm run test:package; test:demo | Fresh tarball ESM/types/addon/core identity/init retry and demo switch/pause passed |
| Fresh work/task21-demo bundle; tests/bundle.mjs | Standalone progress/history and pipeline fixture run from exported files; original/Wasm demo passed |
| Preservation | Git compared every previously tracked bench/results file plus crates and packages/rthree against 37a8e7c: unchanged |
| Measurement source identity | Corrected CPU and render manifests' measured file hashes match current rebuilt artifacts |
| git diff --check | Passed |

No physical-GPU benchmark ran. No timing confidence interval, full compatibility,
new Rust animation implementation or completed reuse/build audit is claimed.
Screenshots and local correctness outputs are in work/task21-browser,
work/pipeline-validation, work/progress-validation and work/bundle-*; equivalent
CI outputs are configured as downloadable artifacts.

## Remote integration at publication

- PR #1 exact head 9c55b6c passed runs 39764354776/39764349364, then merged as
  ce9f6aad6a772755733fb98bdabb36fd7b169380.
- PR #20 exact head 37a8e7c passed runs 39788280495/39788092740, retargeted to main,
  then merged as 25ea65b60570ed235669f4e762ae17d223372ba6.
- Issues #2 and #19 are confirmed closed. #3–#18 remain open; #5/#7/#9 now link the
  concrete preparation and explain their still-outstanding acceptance gates.
- The executable Stage 2 push started correctness run 39885243494. It was still
  installing browser dependencies when this publication report was written; it
  is not recorded as passed. Final-head CI and main integration are remaining
  publication checks and must be verified in the PR before task completion.

## Authorization and residual risks

The requester explicitly authorized these main merges. Generic framework approval
prompts and adoption-only restrictions do not supersede that instruction. Preserve
historical branches/commits and measurements. Do not provision paid GPU capacity,
publish npm or mark future hardware/reuse/port milestones complete. Return to main
after the final merge and verify its actual workflow outcome.
