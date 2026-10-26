# Task #49 Viewer native-feature preparation review

This is a correctness and integration result, not a performance measurement. The original Viewer checkout and assets remain unchanged.

## Inputs and route separation

- Viewer source: `donmccurdy/three-gltf-viewer@b5ee5dafe27f953ae1b55f42b5fa3697fef08683`.
- Original package/runtime: Three.js `0.176.0`, locked Vite `6.4.2` and the original Yarn lock.
- r186 control/candidate source: `85e2c5d500edb0b92ea4ecb997087fded3fed45b`, clean. This source provides locked Three.js `0.186.1` and the built matched-JS/Wasm candidates.
- RobotExpressive: `463,988` bytes, SHA-256 `047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319`.
- Native original r176 distribution, shared externalized r176, shared externalized pure r186, matched JS, and matched Wasm are five distinct routes. r176 packaging parity and r176-to-r186 migration are separate comparisons. Only the r186 control is the candidate correctness reference.

The shared application bundle preserves native loaders, UI, materials, animation, validator, OrbitControls, main renderer and axes renderer. Its reviewed source adaptations are ready-state-safe exactly-once startup after candidate initialization, runtime decoder base selection, and package/import-map selection. External modules are not individually replaced at the call site. Generated candidate addons are checked against their corresponding upstream sources with only the reviewed single-core import rewrite allowed.

## Completed gate

`work/task49-viewer-correctness-004/result.json` reports all five routes passing 11 fixed cases, each captured twice for within-route image/numerical A/A. There are 44 cross-route case comparisons: 11 r176 packaging comparisons, 11 upstream-version migration records, and 22 candidate comparisons. The 33 packaging/candidate comparisons require equality; upstream-version differences are retained, not charged to Rust. Candidate fixed-image and numerical differences are zero in the required comparisons.

The 11 cases are manual morph, fixed play-all, fixed-history manual morph, Walking with grid off/on/off, helpers/wireframe, environment None, Neutral background, resized dual-renderer layout, and native reload. Native interactions additionally cover Dance/Walking selection, playback speeds 0.5/0/1 with observed progress, play-all and stop controls, morph change, orbit, pointer release outside the canvas, subsequent button-free motion, wheel dolly, right-button pan, camera reset, and the application reload path.

Matched mixer-history diagnostics retain the native GUI play-all/stop behavior: source reload, GUI speed zero, diagnostic mixer reset, GUI play-all, fixed mixer time 0.75, then every clip disabled through its GUI control and Angry morph set to 0.65. Images, numerical outputs, action times, weights and scheduled/running states are compared. These diagnostic poses do not claim natural wall-clock phase equality. The separate natural UI playback checks remain present.

The hardware guard observed `ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Pro, Unspecified Version)` for the browser canvases. Same-core class identity, startup exactly once, candidate backend identity and actual Wasm activity are checked. Native validator output, loader-normalized skin-weight checks, request/error logs, served hashes and source integrity are retained. An inspected pure-r186 Walking/grid image shows the Robot and grid rendered plausibly; this visual inspection is additional to exact image comparison.

## Failed attempts retained

- `task49-viewer-correctness-001`: a tooling reload attempted the initial file-input element after native `App.createViewer()` had removed it. The corrected reload uses the native `App.view(localURL, '', new Map())` path, then waits for a different loaded content object and validator report. It does not claim a second file-input UI operation.
- `task49-viewer-correctness-002`: an uncontrolled natural play-all/stop history was used for the following manual-morph oracle. The original-versus-external-r176 and both candidates differed. The Wasm maximum absolute numerical difference was `81.4415383496`; this result remains preserved. The observation shows that the original oracle did not establish a common state. It does not, by itself, prove that all differences were phase effects or excuse candidate behavior.
- `task49-viewer-correctness-003`: a fresh native reload before the simple manual-morph oracle passed, but did not exercise the same play-all history.
- `task49-viewer-correctness-004`: the added explicit matched-history cases passed alongside all existing cases. This is the bounded correction evidence; no tolerance was relaxed and no source asset was repaired.

## Reproduction and provenance

The successful command was equivalent to:

```sh
node scripts/apps/viewer-check.mjs "$APPS_ROOT" \
  work/task49-viewer-external-002 work/task49-viewer-correctness-004 \
  mode=full runtimeRoot="$RUNTIME_ROOT" \
  runtimeSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b
```

The capture tooling Git base was `e9b736a47f48bc2512476f8966d285d0153419f7` with uncommitted tools; it is not presented as a clean-tool primary capture. The exact tool files and hashes were retained before adding optional timing preparation support in `work/task49-viewer-tools-004`. Four core files match the hashes recorded by capture 004. In particular, `viewer-check.mjs` was SHA-256 `d13758f2fe49cf04e5a09e3acafc9c40bf35a9b3bb8037a1fcd7c421992ba745`, and `viewer-oracle.mjs` was `8089fc8bd58ed720bdead1eb51a061eeb38d12a08d32e7d913d8a5d307ad10fa`.

Preparation/source-map provenance and Node transport guards are described separately in the adapter preparation review. The source-map normalization retains mappings, sourcesContent and every non-path field, changing only source path labels. The first preparation output `task49-viewer-external-001` succeeded; output 002 added provenance checks and retained identical executable application bytes.

## Remaining gates

- Large authored-content native imports and full texture/material readiness have not yet run at the time of this review.
- Instrumented Viewer/dat.gui timing bundles have been prepared, but their browser uninstrumented-versus-instrumented parity gate has not yet run. The separate bundled r176 timing control emits Rollup missing-export warnings for the guarded optional `THREE.init` access; these warnings require transparent retention and runtime startup verification, not silent suppression.
- External EXR environment choices remain available but were not selected. Robot's upstream validator findings remain in the raw output.
- No claim is made about stable CPU improvement, FPS, complete compatibility, or suitability of larger content based only on source node counts.
