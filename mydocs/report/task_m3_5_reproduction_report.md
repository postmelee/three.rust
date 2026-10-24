# Task #5: original application reproduction and correctness preparation

Date: 2026-10-24. Related: #3/#4/#5, PR #36. **Preparation completed within the bounded checks below. No primary timings, CPU profiles, Rust comparison, timing A/A or performance qualification were executed.** Issue #5 remains open.

## Work summary and immutable inputs

| Input | Pin |
|---|---|
| Research engine baseline, unchanged | `9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7` |
| Preparation branch base | `e30133cdb147d0433bc99e01678f14205089975b` |
| Clean tooling SHA actually executed for final correctness | `acea74519b6bde1cb981ed2282a6c2b6ad15b0eb` |
| [glTF Viewer](https://github.com/donmccurdy/three-gltf-viewer/tree/b5ee5dafe27f953ae1b55f42b5fa3697fef08683) | `b5ee5dafe27f953ae1b55f42b5fa3697fef08683`, original Three.js **0.176.0**, MIT |
| [Three.js Editor](https://github.com/mrdoob/three.js/tree/9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8/editor) | `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`, Three.js **0.186.1**, MIT |
| RobotExpressive GLB | SHA-256 `047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319`, 463,988 bytes, CC0 1.0; Tomas Laulhe / Don McCurdy attribution retained |

Both upstream Git working trees remained clean. No engine or application source patch was made. Viewer uses its original Yarn v1 lock and Vite production build; Editor uses its checked-in browser modules. The locked setup succeeded with Node 24.15.0, npm 11.12.1, Yarn 1.22.22 and Playwright 1.56.1. Vite's existing large-chunk warning is retained; the bundle was not optimized or altered.

[Inputs and lock/build hashes](../../bench/results/app-preparation-20261024/inputs.json), [15 pinned resources](../../scripts/apps/resources.json), [148 actually served local file hashes](../../bench/results/app-preparation-20261024/correctness/served-files.json), and [licenses](../../bench/results/app-preparation-20261024/licenses) close the exercised resource path. Original CDN import URLs remain in the source; browser routing supplies hash-verified identical files. Google Fonts CSS is frozen by content hash, including its font URLs; a changed remote response fails setup instead of silently updating. These are runtime mirroring changes, not engine substitutions.

## Conditions

- Apple M4 Pro, 12 logical CPU cores, 16 GPU cores, 24 GiB RAM; macOS 26.5.2 (25F84).
- Chrome **155.0.8059.86**, `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; headed, Playwright defaults, no forced software GPU or custom ANGLE selection.
- Actual WebGL2 renderer: **ANGLE Metal Renderer: Apple M4 Pro**. Software/unknown renderers fail the driver. Both apps have antialias enabled and DPR 1.
- Browser viewport 1280×720; Viewer drawing buffer 1280×656, Editor 930×648 because its native panels remain visible. Compare engines within an app, not these different canvas areas across apps.
- Viewer neutral environment / original tone mapping; Editor native Solid viewport mode, WebGL PCF raster shadows, 1024×1024 authored directional shadow map. UI, helpers, secondary passes and native render-loop behavior remain.
- Built-in display reports 3024×1964 physical pixels and 1512×982 logical mode at 120 Hz. No independent scanout measurement.
- **Battery power**, power mode 0, uncontrolled desktop activity. These are correctness conditions, not eligible primary timing conditions. No power/display settings or unrelated processes were changed.

## Verification results

[Final raw result](../../bench/results/app-preparation-20261024/correctness/result.json): **20 checks passed**, including six independent reload image/numeric A/A comparisons. A/A here means fixed-state correctness, not timing stability. No tolerance was relaxed: all six numeric arrays and RGBA pixel hashes match exactly.

| Scenario / checkpoint | Executed check | Result |
|---|---|---|
| V1 original Viewer | Native file input; Dance off / Walking on; speed 0.5 → 0 → 1; manual Angry change with Walking stopped; pointer orbit/dolly | Pass; 14 clips, four runtime skinned meshes using the asset's two skins, three morph primitives retained |
| V1 static manual morph | Explicit stopped-clip reference | Exact A/A, 7,833 numeric values |
| V1 Walking | Explicit diagnostic pose at 0.75 s, mixer stopped in time, controls reset | Exact A/A, 7,833 values |
| E1 original Editor | Authored two cubes, ground and lights through AddObjectCommand; actual pointer picking and Shift selection | Pass |
| E1 transforms / history | Native SetPositionCommand and SetRotationCommand, undo/redo, synchronous objectChanged world reads, stable vector/array identity | Pass; this tests commands, not gizmo pointer dragging |
| E1 small/static reference | Deselected authored scene | Exact A/A, 284 values |
| E1 idle | Observe sceneRendered notifications across 12 rAF callbacks | Zero renders; no CPU or frame interval sampling |
| E2 original Editor | Native loader + import dialog, Walking playback, selected SkinnedMesh and precise bounds | Pass |
| E2 selected animation + shadows | Explicit 0.75 s pose, allow native selection helper to refresh | Exact A/A, 7,833 values |
| E2 shadow-disabled / hidden controls | Toggle native light castShadow or model visible; each differs from the shadowed reference | Both exact A/A, 7,833 values each |
| Both original loaders | 1,108 skin-weight vertices across four unique runtime geometries, two reloads per app | Maximum loaded weight-sum error **4.470348358154297e-8** (declared guard 2e-7) |

Reviewed the final V1/E1/E2 UI images visually. The GPU-oriented raster/shadow fixture is prepared, but has **not** been shown to be GPU-bound. No high-resolution GPU stress test was performed.

## Failures and original behavior retained

1. **Asset conformance is not passed.** Viewer’s pinned glTF Validator reports **752 `ACCESSOR_WEIGHTS_NON_NORMALIZED` errors**, two `NODE_SKINNED_MESH_NON_ROOT` warnings and two `NODE_SKINNED_MESH_LOCAL_TRANSFORMS` warnings. [Complete validator report](../../bench/results/app-preparation-20261024/correctness/viewer-validator.json). Both original GLTFLoaders call `normalizeSkinWeights()` for skinned meshes, explaining the checked normalized runtime output. The GLB was not repaired. This asset must be described as an original loader-behavior fixture, not a spec-conformant asset qualification fixture.
2. **Animated selection has a frame boundary.** An immediate screenshot after setting the fixed pose retained an older selection box even though object/bone numeric outputs already matched. [Failed image pair and bounds](../../bench/results/app-preparation-20261024/development-failures). Letting the unmodified native viewport refresh the helper fixed the A/A mismatch. Do not hide helper work or drop this behavior in a candidate.
3. **Morph tracks and UI writes can conflict.** All 14 clips include weight tracks. A persistent manual morph reference must stop the clip; starting playback restores animation authority. dat.gui `.listen()` also replaces textbox contents each rAF, so the exact automated manual input uses one atomic DOM value/change event. This is documented input-driving adaptation, not a guarantee about arbitrary typed text timing.
4. Preparation failures were retained: local cloning from earlier partial/sparse copies produced missing Git blobs; fresh remote checkouts fixed that. Initial Vite asset serving, ambiguous canvas selection, missing webfont mirroring and an unhandled native import dialog were corrected in tooling. Development attempts 001–005 had evolving uncommitted drivers; only final 006 is attributed to the clean tooling SHA above.

## Native versus diagnostic boundary

Application source adaptation diff: **empty**. Preparation scripts drive normal app UI/API entrypoints and author test scenes. They also mirror remote bytes, reset only the isolated test-origin storage, observe renderer creation through an existing signal, and force a fixed animation time for deterministic screenshots. Those fixed-pose captures are **adapted diagnostic inputs**, not native wall-clock interaction traces. Existing app timing widgets remain visible in screenshots; their displayed values are not benchmark samples or results.

E1 procedural scene JSON is archived. E2 exports embed model geometry and remain local; their hashes are in [local-only-scenes.json](../../bench/results/app-preparation-20261024/local-only-scenes.json). Re-running the driver regenerates them. No GLB or complete third-party checkout is republished. Public screenshots preserve the CC0 attribution notice.

## Reproduction commands

Run at the exact tooling SHA, with the required Node/Yarn versions and installed Chrome. Fresh directory names are mandatory for every inspection/check output.

```sh
npm ci
node scripts/apps/prepare.mjs work/app-reproduction-new
node scripts/apps/inspect.mjs work/app-reproduction-new work/app-native-new
node scripts/apps/check.mjs work/app-reproduction-new work/app-correctness-new
```

The executed final command was:

```sh
node scripts/apps/check.mjs work/app-reproduction-002 work/app-correctness-006
```

The setup runs `yarn install --frozen-lockfile --non-interactive` and `yarn build` only for Viewer. Editor requires no dependency installation for this browser entry. All browser sessions are isolated and closed after checks. `RTHREE_CHROME` can select another executable, but a new browser is a new validation condition. The driver contains no profiler or primary performance sampler.

## Scope and next validation boundary

- Full native gizmo drag, focus, timeline and light-GUI replay are still unautomated. The corresponding application features remain present; command/API exercise is not described as complete UI interaction coverage.
- Optional EXR environments, non-glTF formats, compressed-asset decoding, path tracing, WebGPU, Safari/Firefox and mobile are not exercised. Decoder bytes are pinned, not decoder correctness-certified. Offline closure applies only to the executed paths; unknown remote requests fail.
- No r176→r186 migration or C2/C3 engine injection was done. Viewer needs an explicit version adaptation and its own oracle before comparing a candidate built for r186. New candidates require full source SHA and separate outputs.
- No CPU cost ranking, fraction, absolute milliseconds, speedup, FPS improvement, timing A/A drift or repeat-day qualification is available. Small/static and raster-shadow controls are prepared, not performance-qualified.
- Subsequent profiling and primary timing are separate execution units. They require a quiet AC-powered session, fixed browser/quality, completed native input replay, and review of the known malformed-asset baseline. Profile the originals before selecting an additional Rust boundary; keep instrumentation out of primary timings.

The implementation-relevant findings are synchronous animated bounds, animation-owned morph writes, loader-time normalization, and renderer/helper/shadow work that must survive replacement. These are compatibility obligations and profiling questions, not measured bottleneck rankings.

## Changed files and document location

Tooling lives only under `scripts/apps`; raw evidence under `bench/results/app-preparation-20261024`; the plan, stage record and report remain under `mydocs` as approved research artifacts. This matches the [location judgment](../plans/task_m3_5_reproduction.md). Existing engine sources, README claims, progress, issues' completion status and all historical result directories are unchanged. No integration, deployment or npm publication is included.
