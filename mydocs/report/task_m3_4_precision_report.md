# Task #4: Mac precision preparation and application screening report

Related issues: #3 and #5. Milestone: M3. Date: 2026-10-23, Asia/Seoul.

**The Mac hardware and correctness gates pass. Quiet precision measurements and application CPU profiles were not run.** Concurrent desktop load did not satisfy the quiet-session prerequisite; this delivery covers preparation, correctness and source research. Smoke is not performance evidence. Existing README performance claims, roadmap gates and historical data remain unchanged.

## Source and remote state

| Item | Exact revision / state |
|---|---|
| Research baseline | 9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7 |
| Actual short smoke | 1ed9cb37de1ea5e3c31b3b6732cbedfc67a936bf; dirty=false |
| Remote main observed | b5a0fc335f7eb21e5a47115417786f576af165e3; distinct from research baseline |
| Source/tooling relation | Port selection/navigation and collision rejection only; engine/fixture/lockfile/toolchain diff empty |
| Wasm SHA-256 | edfe1c9ae78e2e4ea76db9515fb17e4ae91a8231fb097dd30388147b3f75fcec |
| Branch | codex/mac-precision-profile-20261023, separate managed worktree |

The primary checkout stayed on main without file edits. The research baseline belongs to open draft PR #33, stacked on #32/#30, and is not silently replaced by main or #35. Exact-head remote correctness succeeded for #30 (39928816084), #32 (39932674025), #33 (39949132733) and #35 (39956531672). The [remote snapshot](../../bench/results/mac-preparation-20261023/remote-state.json) records heads and bases. No PR was merged and no issue gate was closed.

Install/build/native/differential checks and initial synthetic validation used the research source. Later Fox/facade tests used the port change matching the tooling commit. Tests do not embed their own source SHA; the archive records their execution context and source relation. The smoke manifest independently embeds the complete clean commit and per-input hashes, all rechecked after execution. The [tooling diff](../../bench/results/mac-preparation-20261023/tooling-adaptation.patch) contains the complete baseline-to-tooling adaptation; app sources were only inspected and were not adapted or built.

## Environment and measurement conditions

| Field | Observation |
|---|---|
| Host | MacBook Pro Mac16,8; Apple M4 Pro, 12 CPU cores (8 performance / 4 efficiency), 16 GPU cores; 24 GB |
| OS | macOS 26.5.2, build 25F84; Apple GPU driver supplied with OS |
| Browser executable | /Applications/Google Chrome.app/Contents/MacOS/Google Chrome |
| Actual browser | Chrome 155.0.8059.86 |
| WebGL | WebGL2; ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Pro, Unspecified Version) |
| Preflight | Headed, visible; browser screen 1280x720, devicePixelRatio=1; Color LCD internal/main/online |
| Display limit | Physical pixel resolution/refresh policy not exposed in the allowlisted system report. Observed preflight rAF median about 8.3 ms; this is browser scheduling, not measured scanout or guaranteed physical 120 Hz. |
| Power | AC connected and charging; powermode/lowpowermode zero observations; settings were not changed. No OS thermal/performance warning recorded; temperatures unknown. |
| Runtime/build | Node v24.15.0; npm 11.12.1; rustc/cargo 1.90.0; release Wasm; original lockfiles |
| Fox | 640x540 viewport, 640x480 drawing target, DPR1, no antialias/shadows, preserveDrawingBuffer=true; original settings retained |
| Timing policy | Smoke isolated via identical COOP/COEP for all variants; all pages isolated=true; minimum positive clock increment approximately 0.005 ms. Ordinary preflight increment about 0.1 ms. |
| Workload | One animated Fox, 16-Fox scale-up, one static Fox; same renderer/assets/replay; 1 repeat, 10 warmup and 30 samples per case/path |
| Background | Other active work observed; no quiet timing qualification. No other process was stopped. |

GPU timer-query extension was available, but no new GPU performance query experiment was run. The separate negative test observed actual SwiftShader and rejected it as hardware. Initial owned synthetic correctness used hardware with **headless=true**; headed Fox and facade checks supply separate visible-window correctness evidence. Software policy checks in test:timing are explicitly not hardware results.

## Verification actually executed

| Check | Result and practical limit |
|---|---|
| npm ci; npm run fixtures; npm run build; npm test | Passed: locked install, pinned fixtures, release Wasm, 8 native Rust tests, 9 upstream differential tests and strict TypeScript. Differential maximum matrix error 0. |
| npm run test:owned on hardware | Source audit, 8 JS owned tests and 14 animated/static browser cases passed. Exact pixels and palettes; second camera, reads and JS bypass/guard checks. Hardware headless, before port adaptation. |
| Fox unsupported cases | 13 explicit rejections passed on headed hardware after port isolation. |
| Fox images/numerics | 3 cases × 4 paths (original twice, owned JS, owned Wasm) × 11 checkpoints = 132. Pixel difference 0, changed channels 0; largest normalized numeric difference 4.440892098500626e-16. Quaternion signs normalized for equivalent rotations; raw sign differences retained. Wasm counters and poisoned-JS recomputation gates passed. |
| Facade images/numerics | 5 scenes × original/original/JS/Wasm/packed-JS. All 20 comparison rows: exact pixels and matrices. Includes small static and shader controls; this is the separate M2 API experiment. |
| Hardware guard | Actual SwiftShader rejected; no software result classified as physical GPU. |
| Isolated smoke | 9 complete runs, 270 raw samples, no invalid flags; no source hash changes. Full-protocol classification remains false/short. |
| npm run test:timing | 2 passed. Ordinary/isolated policy, full interaction cycle and main/diagnostic numerical/pixel equivalence, using software correctness mode. |
| npm run test:infra | 15 passed, including actual port/header behavior, invalid port and bind-conflict rejection. |
| npm run docs:check | Passed; historical README performance table, source inventory, roadmap and English/generated docs checks unchanged. |
| Visual QA | Inspected the one-Fox blend checkpoint and 16-Fox Wasm camera checkpoint; model remains visible and nonblank. Pixel/numeric checks cover all stored checkpoints. |

[Raw evidence](../../bench/results/mac-preparation-20261023/README.md) includes all short smoke frame samples, clock observations, environment data, correctness results/screenshots, commands and failures. Export-only redactions are listed with before/after hashes; numeric samples are unchanged. No private process inventory or model binary was published. Soldier-derived image export is withheld pending license audit; original local images and their hashes are retained.

## Failures and regression handling

Two Fox-rejection launches failed with EADDRINUSE on 127.0.0.1:4173, including the sequential retry. Listener inspection identified another project's server. It was left running. The independently committed `RTHREE_PORT` tool fix binds 4383 and uses that same origin for navigation; default remains 4173. A real duplicate-listener test now rejects cleanly. Neither failed invocation is counted as correctness or timing evidence, and both logs are retained. Hardware/numeric tolerances were not relaxed.

No new measured timing regression or improvement can be concluded. Existing unfavorable one-Fox/static/GPU-heavy results are preserved, and the new short smoke does not replace them. No image or numerical regression was found within the tested cases. Full API behavior outside these cases is unverified.

## Performance questions still unanswered

| Required evidence | This delivery |
|---|---|
| Original A/A before/after and matched-JS A/A before/after | Not run |
| Six balanced original/owned-JS/owned-Wasm main permutations | Not run |
| Full CPU p50/p95/p99 in ms and relative difference | Not reported from smoke |
| Full frame-interval distribution and actual-duration comparison | Raw short-smoke intervals retained; no accepted main result |
| Benefit versus original Three.js | Not re-established |
| Independent Rust effect versus identical-layout JS | Not established |
| Representative real-app CPU profile / useful CPU fraction | Not run |
| Other-day repeat, second hardware class, Safari/Firefox/mobile | Not run |
| Cold-cache startup, steady thermal/power, battery or process memory | Not run |

CPU work through renderer return is distinct from GPU completion. CPU savings would not by themselves prove FPS improvement. The old report's results are not pooled with the new isolation condition.

## Application screening and next CPU question

[Source research](../tech/task_m3_5_apps.md) fixes glTF Viewer at b5ee5dafe27f953ae1b55f42b5fa3697fef08683 and Three.js Editor at 9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8, with Online3DViewer as a rejected shadow-scenario alternative. The primary candidates have distinct app state/interaction code. Three proposed scenarios cover animation/morph playback, editor selection/gizmo/undo and animated selection with camera/shadows.

RobotExpressive's two skins, 14 clips and three morph primitives expose unsupported obligations absent from Fox. Editor synchronously updates selected animation transforms and computes precise bounds, then exposes picking/selection signals. Those are priority **profiling questions**, not a measured bottleneck ranking or justification to port another subsystem. Preserve all features and compare animation, bounds/picking, visibility, sorting, upload preparation and submission. No app runtime build or interaction has yet been validated; source inspection does not complete issue #5.

## Reproduction and remaining work

Commands executed and separate planned commands are in [commands.md](../../bench/results/mac-preparation-20261023/commands.md). Run sequentially; active server consumers now accept RTHREE_PORT. Complete builds and checks before a quiet performance session. The deferred full protocol is:

```sh
# In a fresh checkout at the exact intended candidate SHA, after setup/checks:
RTHREE_PORT=4383 RTHREE_TIMING_MODE=isolated caffeinate -di \
  bash scripts/mac-validation.sh work/mac-precision-001
```

This command was **not executed**. It retains the existing 1200/3600 fixed-frame protocol, five-repeat original/matched-JS brackets, six balanced main permutations and separate diagnostics/controls. Use a fresh path and record the actual HEAD, browser and hashes. Do not silently substitute a later cloud engine; a new engine candidate requires its exact SHA and a dedicated validation directory.

App builds, full dependency/CDN/asset hash closure, native UI smoke, deterministic input logs and profile capture remain preparation gates before real-app engine comparisons. Keep traced profiles separate from primary timing. Issues #3/#4/#5 remain open; local checks do not provision a persistent CI GPU runner or satisfy representative/repeated-session acceptance.

## Document location verification

This report and source screening remain issue-specific work/research under mydocs; the raw archive follows bench/results. They match [the plan](../plans/task_m3_4_precision.md). No official API/architecture policy, README performance text or progress acceptance state was added or changed.
