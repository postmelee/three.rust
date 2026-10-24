# Task #5: native application UI correctness completion

Date: 2026-10-24. Related: #3/#4/#5, draft PR #41. The bounded UI preparation passed **40 checks**, including **four exact image/numeric reload A/A comparisons**. No primary timings, timing A/A, CPU profiles, engine injection or performance claims were produced. Issue #5 remains open.

## Inputs and conditions

- Final executed tooling SHA, clean tree: `87f39caa835599f56937e0035502c3f2904cd44b`. New driver: `scripts/apps/ui.mjs`.
- Editor: `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`, Three.js 0.186.1, original checked-in browser modules, MIT.
- Viewer: `b5ee5dafe27f953ae1b55f42b5fa3697fef08683`, Three.js 0.176.0, MIT. Its previous checks remain in the [initial report](task_m3_5_reproduction_report.md); this continuation exercises the Editor's outstanding UI. Both original app source trees remain clean.
- RobotExpressive GLB: SHA-256 `047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319`; CC0 1.0, Tomas Laulhe / Don McCurdy. Same 14 clips, skins and morph data retained.
- Research engine baseline remains `9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7`; it is not the engine used by these original-app correctness tests. No C2/C3 candidate was run.
- Node 24.15.0, Playwright 1.56.1, installed headed Chrome **155.0.8059.86** at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; actual WebGL2 **ANGLE Metal Renderer: Apple M4 Pro**. Software/unknown renderers are rejected.
- macOS 26.5.2 (25F84), M4 Pro 12 logical CPU cores / 16 GPU cores / 24 GiB RAM; **AC power**, power mode 0 at this final run. Desktop activity was uncontrolled. No power/display/process changes were made by the driver.
- Built-in display: 3024×1964 physical, 1512×982 logical at reported 120 Hz; scanout not independently measured. Browser viewport 1280×720, DPR 1. Editor canvas 930×648 before timeline expansion, 930×378 afterward; this resize is part of native UI behavior.
- Native Solid viewport, antialias on, tone-mapping value 7, exposure 1, sRGB, shadow map enabled/type 1. Quality fields are archived and compared. App UI, helpers and native render loops remain enabled.

[Raw results](../../bench/results/app-ui-preparation-20261024/correctness/result.json), [conditions](../../bench/results/app-ui-preparation-20261024/correctness/hardware.json), [browser/tooling](../../bench/results/app-ui-preparation-20261024/correctness/environment.json), and [144 served-file hashes](../../bench/results/app-ui-preparation-20261024/correctness/served-files.json) are preserved. No page errors, HTTP errors or unknown external requests occurred in the final run.

## Executed native interaction checks

Every interaction below ran twice after clearing only the isolated test origin and opening the original Editor again.

| Interaction | Verified behavior |
|---|---|
| Single-object gizmos | Actual pointer drag: translate X, rotate Z, scale X. Native history entry added on pointer release; Meta+Z restores all saved transforms/matrices exactly; Meta+Shift+Z restores the drag result exactly. |
| Multi-selection | Shift-click two outliner entries; actual X translation changes both while preserving relative spacing. Group undo/redo restores both objects. |
| Synchronous reads | `objectChanged` callbacks during pointer/history actions expose root-cube world translations matching their local positions; raw event observations retained. |
| Focus | Keyboard F and outliner double-click change camera position, preserve object transforms and emit the native focus signal. |
| Light sidebar | Intensity 1.5, cast-shadow off/on, visibility off/on update original light properties. These property checks do not alone prove a visible shadow change; separate raster-shadow references remain in the initial report. |
| Import and timeline layout | File → Import → native file chooser → original import dialog; imported model has 14 clips. Drag the native panel resizer to reveal tracks. |
| Playback | Walking selection does not autoplay; Play advances action time; Pause freezes it across two rAF callbacks; Play resumes. Time Scale 0.5 → 1 updates the original mixer. |
| Scrubbing | Pointer drag within an expanded quaternion track row to 25% and 75% of the timeline. Native action becomes paused at the corresponding time (declared time guard 0.01 s); pose arrays and rendered pixels differ between these two positions. |
| Stop/restart and clip switch | Stop resets time to zero and stops the action; Play restarts. Selecting Idle stops/reset Walking without autoplay; Idle then plays and pauses through the toolbar. |

Four fixed-state reload comparisons require **exact equality**, without image or numeric tolerance: focused static scene (128 numeric values), light-controls state (128), Walking at 25% (5,497), and Walking at 75% (5,497). Numeric values include world matrices, bone palettes, morph weights and camera matrices. Nonfinite values and blank/degenerate images fail. Browser UI screenshots were visually reviewed; their wall-clock playback poses, random object UUIDs and built-in timing widgets are not deterministic benchmark samples.

## Failure and diagnostic boundaries

Development run `app-ui-001` failed because a scrub pointer targeted a clip header. That header's native click handler selected a different clip after the drag, stopping Walking. The original application was not patched. The driver now scrolls a selected quaternion track label into view and drags its track row. The failed assertion, DOM, image and partial states remain in the [failure archive](../../bench/results/app-ui-preparation-20261024/development-failures/ui-001). Intermediate run 002 passed 36 checks; final 003 adds synchronous-read, group-spacing, nonblank/quality and clip-switch guards.

Fixture authoring uses original AddObjectCommand. A read-only raycast against the pinned TransformControls helper finds an actual visible handle hit; hover must report the intended axis before the driver presses the mouse. This private helper inspection is version-specific test instrumentation, not a product integration hook or a replacement handler. Actions under test use normal pointer, keyboard, file chooser and DOM form interactions. The driver observes original signals and dispatches sceneGraphChanged only for diagnostic captures after native actions; it does not set animation time directly. Those captures include native helper refresh and cannot be used as performance traces.

The original RobotExpressive validator result remains **752 nonnormalized-weight errors plus four skin-node warnings**. The earlier original-loader normalization result remains valid for that recorded run; this continuation does not repair or revalidate asset conformance. Preserve this loader-behavior fixture designation when designing candidate comparisons.

## Reproduction and remaining work

Use the pinned setup from the initial report and a new output directory for each run. The final command actually executed was:

```sh
node scripts/apps/ui.mjs work/app-reproduction-002 work/app-ui-003
```

For a new environment:

```sh
npm ci
node scripts/apps/prepare.mjs work/app-reproduction-new
node scripts/apps/check.mjs work/app-reproduction-new work/app-correctness-new
node scripts/apps/ui.mjs work/app-reproduction-new work/app-ui-new
```

This closes the previously listed gizmo/focus/timeline/light-GUI gap for the tested axes, scene and interactions. It is not exhaustive Editor coverage: all transform axes/spaces, nested/nonuniform parents, snapping, animated-object gizmos, keyframe editing, every clip, compressed formats, optional EXR, path tracing, WebGPU and other browsers remain untested. Viewer remains r176 and needs a separate version adaptation/oracle before an r186 engine comparison. No new engine implementation, Rust-vs-JS effect, CPU percentile, frame interval, absolute milliseconds, FPS gain or repeated-day claim follows from this work.

The next separate unit can profile the original V1/E1/E2 scenarios to attribute animation, transforms, bounds/picking, sorting, upload preparation, render submission, synchronous public matrix reads and callback costs. Keep small/static and raster-shadow controls, original/modified scenes and instrumented/uninstrumented runs distinct. Primary timings require a quiet AC-powered session, fixed settings, a precise source SHA per candidate and before/after timing A/A; profiling must run separately. The present archive is preparation evidence only.

## Changes

New UI driver and stage record are isolated in tooling commit `87f39caa835599f56937e0035502c3f2904cd44b`; this report and new evidence archive are a separate commit. Existing result directories, application/engine sources, README claims and progress remain unchanged. No issue closure, main merge, deployment or npm publication is included.
