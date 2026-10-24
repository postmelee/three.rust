# Task #5: original application reproduction and correctness preparation

Related: #3, #4, #5; preparation continuation of PR #36. Base: e30133cdb147d0433bc99e01678f14205089975b. Research engine pin remains 9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7.

## Purpose and scope
Prepare the two screened original applications for later CPU investigation. Preserve upstream versions, GUI, animation/morph features, editor commands and WebGL raster rendering. Build and exercise native applications; archive source/dependency/asset hashes, input actions, snapshots and failures. No engine changes, primary timings, CPU profiles or performance claims are part of this unit.

## Design and verification
1. Retrieve immutable source checkouts; install the viewer with its Yarn v1 frozen lock; use the Editor's checked-in browser build. Capture third-party runtime modules with hashes and licenses; retain exact source files.
2. Run original-app browser smoke at 1280x720, DPR 1 with installed Chrome on hardware. Prepare V1 animation/morph/camera, E1 selection/transform/history, E2 animated selection/shadows/camera fixtures. Separate native UI exercise from explicit fixed-pose diagnostic inputs.
3. Capture numeric and image references, compare independent fixed-state A/A reloads where reproducible, retain failed attempts, archive commands and open limitations. Do not infer candidate compatibility from an upstream-only oracle. Further timings/profiles are a separate execution unit.

## Document location judgment
| Artifact | Classification / audience | Location | Alternative | Reason |
|---|---|---|---|---|
| Reproduction driver | Test tooling / contributors | scripts/apps | engine source | Independent from cloud engine work |
| Preparation report | Task evidence / reviewers | mydocs/report/task_m3_5_reproduction_report.md | docs | Bounded research, not a product contract |
| Raw results | Experiment evidence / reviewers | bench/results/app-preparation-20261024 | docs/assets | Existing evidence convention |
| Downloaded apps/assets | Reproducible third-party inputs | ignored work | committed fixtures | Preserve originals and avoid republishing large assets |

## Risks and acceptance
Viewer remains r176, Editor r186: these are separate baselines. Original A/A validates repeatability only; future candidate testing needs its own SHA and adaptation diff. Never drop morphs/skins to fit a narrower engine. External optional assets and untested interactions must remain explicitly incomplete. Preserve every run directory; unknown external requests fail closed in the offline correctness driver.

## UI completion continuation
Extend the bounded original-app preparation with pointer-driven translate/rotate/scale and multi-selection gizmos, keyboard undo/redo and focus, native file import, timeline panel resize/clip selection/play/pause/stop/scrub/time-scale, and light/visibility sidebar controls. Fixture authoring may use existing commands; actions under test must enter through the original DOM. Read-only inspection of pinned controls may locate visible gizmo hit targets and observe state; do not call internal action handlers or replace application code. Capture pointer traces, synchronous observations, image/numeric checkpoints, fresh-context repeats and failures in a new archive. Existing preparation evidence remains immutable. New tooling remains in scripts/apps and the continuation report in mydocs/report. No profiling or primary performance sampling is part of this continuation.
