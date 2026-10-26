# Task #49 Viewer candidate integration pre-audit

Read-only source inspection completed on 2026-10-26. This memo proposes the minimum next scope; it is not browser correctness evidence, a profile, a timing result, or an engine implementation. No app source, lockfile, generated build or repository file was changed. No download, install, build or browser was run.

## Recommendation

Prepare a separate, immutable Viewer reproduction with four clearly named headline routes: original-r176, pure-r186.1, prepared-JS-r186.1 and prepared-Wasm-r186.1. Preserve the existing r176 checkout and dist. Build one shared externalized app bundle for the three r186 routes, then select core/addons through a recorded import map and initialize before loading the app. Retain a temporary externalized-r176 bridge route to check the packaging/bootstrap adaptation against the original r176 bundle. Do not optimize the engine in this integration task.

The candidate effect is pure-r186.1 versus prepared-JS/prepared-Wasm; the incremental Rust effect is prepared-JS versus prepared-Wasm. Original-r176 versus pure-r186.1 includes upstream version changes and, unless the r176 externalized control is retained for timing, build/packaging changes. It must not be called a Rust effect. Route names should encode revision and engine rather than overloading `original`.

## Existing reproducible inputs

- Viewer upstream: `donmccurdy/three-gltf-viewer`, SHA `b5ee5dafe27f953ae1b55f42b5fa3697fef08683`. Tracked source is currently clean; app version is 1.5.1.
- Existing package.json SHA256: `8e0511ce95d18896009272fb95da6ea8bb0ec720ffc93df5f9712d5c93d94153`.
- Existing yarn.lock SHA256: `0de5cea95be0d2ea2530c4d05edeab221b878bb2d8a134b5e429005667922b1a`.
- `package.json` requests `three: ^0.176.0`; yarn.lock and installed package resolve exactly 0.176.0. Yarn is 1.22.22; the prepared-input manifest records Node v24.15.0. Vite resolves to 6.4.2. The upstream project has no Vite config file.
- The repository's installed upstream package is exactly Three.js 0.186.1. Reuse the new task's clean, locked package rather than the Editor r186 build as a substitute for the exact npm 0.186.1 comparison.
- Previous immutable engine candidate: `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb`. A new task must explicitly choose and record its actual full engine SHA and built-artifact hashes; this memo does not implicitly move that pin to main.
- RobotExpressive GLB: SHA256 `047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319`; preserve its existing CC0 notice. Viewer and Three.js MIT notices, plus decoder/third-party notices, must accompany adapted distributions.

## Concrete change surface

| Location | Observed behavior | Minimal adaptation |
|---|---|---|
| Viewer `package.json`, `yarn.lock` | Three is bundled from 0.176.0 by `vite build`; unrelated UI/validator packages are locked. | Preserve originals. In a separate generated reproduction, pin only Three to exact 0.186.1 and generate/check the corresponding lock change. Keep Vite/UI/validator versions unchanged. Archive original/adapted package and lock bytes, diff and actual resolution. |
| Viewer `index.html` | Deferred module entry is `src/app.js`; no import map. | Shared r186 bootstrap/import-map response overlay with exact source hashes. Build to a new output directory, never the preserved dist. |
| New Vite build configuration / generator | The original output contains bundled core/addons; an HTML import map cannot replace already bundled code. | Externalize both `three` and all `three/...` imports (`id === 'three' || id.startsWith('three/')`), preserving native JSX/vhtml compilation and all non-Three dependencies. Build a single app bundle used byte-identically by the three r186 routes. Inspect the output graph to prove core/addons were not bundled. |
| `src/app.js`, `src/viewer.js`, `src/validator.js`, `src/components/footer.jsx` | All import bare `three`; app exposes `window.THREE`; footer uses REVISION. | All must resolve to the selected route's same core. No selective replacement limited to `viewer.js` or WebGLRenderer. Preserve footer/validator behavior. |
| App bootstrapping | app.js registers a DOMContentLoaded listener. Viewer is statically imported; its module creates a LoadingManager, DRACO/KTX2 loaders and changes Cache.enabled. | Await selected candidate init before dynamically importing the app. Also use a hash-guarded, exactly-once ready-state startup guard, shared by pure-r186 and both candidates, because dynamic import after async initialization may miss DOMContentLoaded. Do not synthesize that browser event. Test both delayed Wasm initialization and page-ready startup. |
| `scripts/apps/candidate-browser.mjs` | Engine selection explicitly rejects Viewer candidate routes; overlay edits only Editor HTML; /assets maps to old Viewer dist; network mirror normalizes only r176.x. | Add an explicit Viewer route/manifest or a separate Viewer helper. Do not merely relax the option rejection. Require all new app/engine/build/decoder pins; serve route-specific bundle/core/addons/wasm; retain existing Editor behavior and clean-root/hash finalization. |
| `scripts/apps/check.mjs` | Viewer checks only main renderer/canvas; candidate diagnostics are read/asserted only for Editor. | New Viewer correctness driver or bounded extension: capture both canvases, both camera/scene states, revision/core identity and native candidate counters; compare across routes independently of same-route repeat checks. |

A package bump alone is insufficient: it would produce another self-contained Three bundle and obscure candidate imports. An alias of only the bare `three` specifier is also insufficient: addon paths and relative candidate addon imports must have a single core identity. The externalized r176 control verifies that the shared bootstrap/build format does not itself remove required behavior; if later used for performance attribution it needs its own measured samples, not just image parity.

## Version bridge: actual differences found locally

No missing Viewer import name or direct removed Viewer method was found in this inspection. The used WebGL2 capability check, WebGLRenderer API, PMREMGenerator.compileEquirectangularShader/fromScene, OrbitControls methods, GLTFLoader decoder setters and synchronous KTX2Loader.detectSupport(renderer) remain present. That is a static compatibility finding, not proof that no runtime migration is needed.

Important changes that prevent treating r176 and r186 as identical implementations:

1. **Default Neutral environment changes.** RoomEnvironment in r186 sets `position.y = -3.5` and changes its light-panel material from MeshBasicMaterial with scaled color to an emissive-only MeshLambertMaterial. Viewer generates this environment with PMREMGenerator during construction. Record r176-to-r186 images/quality deltas; do not weaken candidate-versus-r186 image acceptance or remove Neutral lighting to hide them.
2. **OrbitControls moves active pointermove/pointerup listeners from the canvas to ownerDocument**, adds disconnect cleanup and optional cursor behavior. Native drag/release outside canvas, reset, pan/zoom and auto-rotate need UI checks. Do not replace these with direct camera mutation when claiming native interaction coverage.
3. **SkinnedMesh.applyBoneTransform changes its implementation to Vector4-based handling while retaining Vector3 support.** Viewer uses Box3.setFromObject after updateMatrixWorld to frame the loaded content. Preserve that call and record bounds/camera outputs separately across the version bridge. Candidate-versus-r186 bounds remain a strict numerical oracle.
4. GLTFLoader, DRACOLoader, KTX2Loader and EXRLoader changed substantially. Do not mix r176 loaders with an r186 core. Meshopt decoder bytes also changed. The removed WebGL.isWebGLAvailable/getWebGLErrorMessage methods are not used by this Viewer; its isWebGL2Available call remains valid. No shim is justified for those removed methods.
5. r186 loaders add default URLs based on import.meta.url for Draco/Basis resources. Viewer explicitly sets the decoder paths, which remains supported; WebGL KTX2 detectSupport still stays synchronous. The WebGPU async support changes are outside this WebGL comparison.

## Decoder and network resolution

Viewer sets `THREE_PATH = https://unpkg.com/three@0.${REVISION}.x`, then the Draco glTF and Basis transcoder paths. Existing resource mirrors accept only r176.x normalized to 0.176.0. A route at REVISION 186 will request an unrecognized URL unless the resource policy changes.

Prefer exact local, version-labeled decoder routes for all three r186 paths, with a small common source/response overlay that replaces only the path base. Alternatively preserve the app URL and mirror `three@0.186.x` only to the exact locked `three@0.186.1` resources. Record the requested URL, selected exact version, decoded bytes and SHA256; never fetch a floating .x URL during a capture. Preserve original r176 mapping.

The five existing Draco/Basis resource files are byte-identical between the inspected installed r176 and r186.1 packages:

| File | SHA256 |
|---|---|
| draco/gltf/draco_decoder.js | `8625489da79a805f4f2a7d511c3e52d8b4085608a9d2a4d5f4f9de5db0aea04f` |
| draco/gltf/draco_decoder.wasm | `a680d927bed9cb864ddbd63521868891af2bfbe755092761b4837487618df8ac` |
| draco/gltf/draco_wasm_wrapper.js | `8bb2952d2ba7d67e1414f8df819410cb0434a666be53f671fff75f68843d76f6` |
| basis/basis_transcoder.js | `8478b5b6d6b74e7d3082b89f6417321d8d1dc0307f2b30d4484bb11b441696a1` |
| basis/basis_transcoder.wasm | `6cf17dc889352c42e9acf8897107978d127005fe3386c36a0e3845e27967630a` |

No download is needed for those bytes. Meshopt changes from r176 SHA256 `01f48524f4bac6141eaba07e94cc36e7ee56f311796fa6117c159842941b0468` to r186.1 `d428e73a000057c6c94bfcedc3412d0c2dc14ca8800e88553aab05113ad2bf19`; serve the correct addon from the selected tree. Hash all transitive addon files and any worker-fetched files, not only the initial import URLs.

RobotExpressive does not establish Draco/KTX2/Meshopt decode correctness. Keep decoder integration enabled, but mark compressed asset coverage unverified until small licensed fixtures exercise actual decode workers and loaded geometry/textures. The existing original-app mirror lacks the external Venice/Footprint EXR files listed in environments.js. Preserve those UI options; do not claim their successful network/EXR behavior without pinned licensed resource preparation. Initial bounded checks can explicitly cover Neutral/None and record external HDR environments as unverified.

## Core identity and initialization invariants

Use a fresh context/page for each engine; runtime.js rejects more than one backend in a single module graph. Map pure r186 `three` to its exact three.module.js (and its one relative three.core.js), with r186 addons importing that same mapping. Candidate `three` maps to prepared-js.js or prepared.js, and candidate `three/addons/` maps to the generated candidate addons tree. Generated candidate addons import the same index.js/core.js through relative paths. Never feed upstream r186 meshes to a separate candidate renderer or let GLTFLoader construct a second core's objects.

Prove during setup that:

- window.THREE.REVISION and its package provenance match the declared route;
- loaded scene objects, bones, cameras, materials and geometry are instances of the selected core classes where applicable; renderer and axesRenderer are selected-core WebGLRenderer instances;
- loaded PointsMaterial satisfies the same `instanceof PointsMaterial` that Viewer.updateDisplay uses, and addons do not pull an extra core;
- both renderers and all loader-created transforms use the same runtime diagnostics; JS and Wasm modes cannot silently substitute one another;
- Wasm init finishes before any application/addon construction or transform update. Preserve fetch/compile failures; no silent fallback to JS;
- candidate addon bodies canonicalize to the exact r186 upstream files except the reviewed import rewrite;
- original and adapted app/bundle/core/addon/decoder bytes are hashed before and after execution.

The Viewer constructor calls RoomEnvironment (which composes instanced transforms), PMREMGenerator.fromScene, OrbitControls (whose constructor updates the camera), and later camera.lookAt/Box3. Initializing only before the first timed animation frame is too late. The existing Editor integration's explicit-init lesson applies, but Viewer also needs the DOMContentLoaded guard described above.

## Two renderers and the minimal correctness matrix

Viewer owns a main antialiased renderer and a separate alpha-enabled axes renderer. It always constructs both; Viewer.render submits the axes scene only when Grid is enabled. The axes camera follows the default camera, its `up` references the default camera's up vector, and resize updates both canvases. Grid toggle adds GridHelper/AxesHelper to the main scene; its onBeforeRender callback clears depth, and Grid-off explicitly clears the axes renderer. Preserve all of this, including callbacks and the secondary canvas.

Minimum feature-preserving checks before profiling/timing:

1. Native file input load of the pinned Robot, validator result, 14 clips, skins/morphs, hierarchy, materials, finite matrices, bone palette, exact bounds/framing and both renderer quality settings.
2. Native first-clip autoplay and animation GUI: pause/playbackSpeed 0/0.5/1, clip switch, playAll and manual morph; fixed-time snapshots distinguish deterministic comparison setup from natural playback.
3. Native orbit/pan/zoom/reset plus pointer release outside the canvas; camera selection when a pinned fixture actually contains a camera. Do not count an unavailable camera menu as tested.
4. Grid off/on/off, both canvas image/numerical outputs and resize; axes camera linkage; skeleton and wireframe helpers. Exercise at least one cross-render sequence that renders main, axes and main again to detect renderer/scene cache contamination.
5. Neutral/None lighting, background toggle, exposure/tone mapping controls, small static scene through the ordinary loader; no removal of native stats/validator/GUI or animation work to improve costs.
6. Reload/clear and another asset load to catch stale mixer/cache/material state. Record candidate diagnostics before/after each oracle segment, including fallback counts. Global counters sum both renderers; do not attribute all activity to the main scene or treat PMREM startup work as steady frame work.

For pure-r186 versus candidates require fixed-state object/quality equivalence, ordered numerical arrays using the existing atol1e-10 + rtol1e-12 policy, and raw canvas pixel equality where the existing accepted hardware oracle requires it. Inspect and retain genuine differences rather than loosening thresholds after seeing candidate output. Original-r176 versus pure-r186 is a separately labeled version bridge; known environment and upstream semantic differences need explicit records, not forced equality.

## Bounded next task and later work

The next task should end with pinned reproducible routes, build/import/decoder provenance, successful two-canvas and native-interaction correctness or a concrete retained failure, and a coverage report. Keep source adaptation/tooling in separate commits from any later engine implementation. This task should not include a speculative Rust port, an optimization justified only by boundary counters, a large asset download, or performance/progress promotion.

Only after that gate should a separate native Viewer animate-callback profile measure controls.update, stats.update, mixer.update, main render and optional axes render together, then investigate matrices, palette, bounds, visibility/sort and renderer delivery. Original callback scheduling and `prevTime`/mixer advancement must remain intact. Profiling and primary timing stay separate. An always-running Viewer animation loop is not the Editor's render-free idle control; describe static Viewer baseline costs honestly. Both candidate fallback/prepared usage and the two-renderer workload must be proven before interpreting a performance result.

Potential source changes are therefore limited to a new Viewer preparation/serve adapter, common bootstrap/build overlay and new correctness checks/fixtures. Existing engine sources remain unchanged in the preparation task. Existing Editor measurements and historical original Viewer source/dist/evidence remain untouched.
