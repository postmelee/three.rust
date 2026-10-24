# Task #5: original application CPU profiles

Continue from exact preparation head f339a46c006be788d885fb7c3bff2fcbff72d758 on a separate codex/ branch. The existing isolated checkout and pinned upstream trees are reused; no main update, source migration or engine changes are appropriate for this research pin.

## Scope and stages
1. Add a profiling-only driver and analysis tool; preserve original app code, pinned assets and native rendering loops. Record CI, conditions, scene variants and exact tool SHA.
2. Run sequential hardware V8 sampling profiles at 1,000 microseconds, two independent reloads per scenario, 12-second windows after two seconds of warmup. V1 Walking and paused Viewer; E1 editing and idle; E2 animated selected/unselected meshes with raster shadows, plus explicitly adapted high-resolution shadow control. No performance qualification or primary timing.
3. Separately collect short diagnostic renderer/mixer boundaries and WebGL submission counters using reversible instance wrappers, never global prototypes. Record before/profile/after observation windows for profiler perturbation only. Archive profiles, wrappers, screenshots, raw boundary arrays, read consumers and limitations; publish a stacked draft PR and leave #5 open.

Original application means unchanged source plus authored scenes, not untouched shipped scenes. Native playback uses wall-clock delta; interaction scripts use real input and are not deterministic simulation ticks. Original sample-only profiles precede wrapper diagnostics. Keep GPU-oriented controls labelled until actual GPU bottleneck evidence exists. Do not add GPU synchronization or gl.finish.

## Evidence and attribution
Exclusive sampled time sums once per sample. Inclusive ancestor time is not additive. Idle/program/GC and unmatched functions remain visible. Use exact function/source positions; retain minified Viewer attribution uncertainty. Renderer boundaries include transforms, visibility/sorting, upload preparation and driver submission; nested costs cannot be summed. Direct matrix fields have no observable getter boundary: report public-read consumers and source obligations, not fabricated per-read costs. Use instance-only bounds instrumentation where the original helper is accessible; record exact hook targets and restoration.

Exact RGBA/numeric checks and successful native UI replay from PR #41 are prerequisites. Recheck hardware, finite state, unknown external requests, shader warmup and scene work. Record all failed attempts, fresh output paths, source/asset/resource hashes, display/power/thermal conditions and uncontrolled external activity. Sampling percentages are diagnostic estimates, not CPU p50/p95/p99 or FPS gains. No main measurements, engine implementation, README/progress claims or issue closure.

## Document location judgment
Profiling scripts belong in scripts/apps, raw evidence in a new bench/results/app-profiles-20261024 archive, and the research report in mydocs/report/task_m3_5_profiles_report.md. These extend the established task evidence locations and avoid product documentation. Assets/checkouts stay in ignored work; public artifacts exclude private session context and local identity paths.
