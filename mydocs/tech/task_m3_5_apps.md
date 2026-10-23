# Task #5: independent application source screening

Research date: 2026-10-23. **Source and asset inspection only. No application build, interaction replay, CPU profile, cost percentage or performance qualification was executed.** This separates candidate preparation from measured bottlenecks. Exact file hashes are in [provenance.json](../../bench/results/mac-preparation-20261023/apps/provenance.json).

## Pinned applications and rejected alternative

| Application | Full source SHA | Original runtime and license | Decision |
|---|---|---|---|
| [glTF Viewer](https://github.com/donmccurdy/three-gltf-viewer/tree/b5ee5dafe27f953ae1b55f42b5fa3697fef08683) | b5ee5dafe27f953ae1b55f42b5fa3697fef08683 | Three.js 0.176.0 from yarn.lock; MIT, Don McCurdy | Animation/morph playback candidate. Preserve its actual runtime; migration to 0.186.1 is a separate adapted variant requiring correctness. |
| [Three.js Editor r186](https://github.com/mrdoob/three.js/tree/9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8/editor) | 9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8 | Three.js 0.186.1; MIT, three.js authors | Independent editor application: selection, undo, transform controls, animation, camera, precise bounds, raster shadows. |
| [Online3DViewer](https://github.com/kovacsv/Online3DViewer/tree/d025663dcdd101527e87971d9ae2cf16f02949b4) | d025663dcdd101527e87971d9ae2cf16f02949b4 | Three.js 0.176.0 in npm lock; MIT, Viktor Kovacs | Inspected alternative for on-demand CAD/picking. Source viewer has no scene shadow-map path; CSS shadows do not qualify. Defer as a third application rather than substituting it for the shadow/editor scenario. |

These are distinct applications and source roots, not multiplied Fox fixtures. glTF Viewer and Editor share upstream Three.js implementation, as expected; that shared dependency does not provide independent hardware evidence. Candidate acceptance still requires original-app smoke and visual/behavior review.

## Asset and original/adapted boundaries

Use the [pinned RobotExpressive](https://github.com/mrdoob/three.js/tree/9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8/examples/models/gltf/RobotExpressive) for animation screening. Its pinned README identifies Tomas Laulhe's model as CC0-1.0 and credits Don McCurdy's morph/conversion/material modifications. The GLB is downloaded only into ignored work/, never republished here; preserve the license note and URL. SHA-256: `047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319` (463,988 bytes).

Parsed structure: 74 nodes, two skins of 43 joints sharing 43 distinct joint nodes, 14 clips and three morph primitives on Head (`Angry`, `Surprised`, `Sad`). These are asset facts, not runtime profile results. The current Fox conversion/owned contract cannot silently omit extra skins, morphs or arbitrary identities. Removing morphs to use it would be a different, reduced scene.

An all-skin Float32 palette output would occupy 5,504 bytes/frame; a full 74-node f64 world-matrix snapshot would occupy 9,472 bytes. These are hypothetical layout volumes, not observed copies, GPU uploads or live allocation costs. Reuse shared-joint calculation; count actual transferred dirty ranges in a future implementation.

Editor interaction scenes are authored through normal application commands. Preserve an untouched application checkout and save the authored scene JSON/input log separately. A procedural cube/plane/light test scene is an application interaction fixture, not an original shipped example or representative complex production asset. Do not hide this distinction in reports. No online deployment was assumed to match these source commits.

## Three proposed interaction scenarios

All remain **unexecuted**. Use one application at a time, native original source first, 1280x720 viewport and DPR1 as a declared diagnostic condition; record actual canvas dimensions and preserve application UI, antialias, tone mapping, lights, materials and secondary passes. Primary timing and instrumented profiling are separate future sessions. An existing continuous rAF loop in glTF Viewer must remain; Editor's on-demand idle rendering must remain.

| ID | Application and input | Features and checkpoints that must survive | Read/callback obligations |
|---|---|---|---|
| V1 | glTF Viewer, one RobotExpressive: initial Dance, disable Dance/enable Walking, speed 0.5, pause/resume through playback speed, Angry slider, orbit/dolly | Both skins, all clips available, morph GUI, texture/materials, original environment, camera framing and stats. Native GUI clip toggles retain their actual play/stop behavior; do not replace them with a crossfade. | Mixer writes observable before render; control callbacks and morph influence identity; load-time updateMatrixWorld and Box3 framing; optional skeleton/grid remains available. |
| E1 | Editor: create cube/ground/light scene, pointer select and shift-select, gizmo translate/rotate, undo/redo, focus, deselect and idle | Real hit object and order, selection group pivot, transform handles, history, precise bounds/helpers, camera. Save pointer coordinates, scene JSON and expected selected UUID/transform at checkpoints before profiling. | Selection signals are synchronous; objectChanged listeners observe the updated pose; direct matrixWorld reads and identity remain valid; idle does not render continuously. |
| E2 | Editor: load RobotExpressive, enable existing WebGL raster shadows and receiving ground, play Walking, select animated mesh, orbit/zoom and alter light/visibility | Skin/morph geometry, shadow pass/PCF map settings, receiving surface, animation selection bounds, transparency/order, helpers and camera. Unmodified app source plus authored scene; no pathtracer or WebGPU substitution. | Per-animation selected.updateWorldMatrix(false,true) and precise Box3.setFromObject(...,true); picking/skinned CPU reads; callback order; renderer/main/shadow must consume the same pose. |

Before replay freeze, record exact action ticks, pointer traces, scene JSON, browser quality, shadow dimensions and original screenshots. A future fixed-tick replay that changes dt is an **adapted diagnostic scene**; retain its diff from native wall-clock UI interaction. Native behavior must be checked first. No deterministic replay has yet been implemented or accepted.

## CPU investigation map, with no measured ranking

| Cost | Source observation | Future attribution and acceptance |
|---|---|---|
| Animation/binding | Viewer.animate calls controls, stats, mixer.update then render; GUI can write morph arrays. Editor updates mixer and dispatches morphTargetsUpdated. | V8 CPU profile first; distinct animation/property-binding self time and descendants; record clips/channels and callback counts. Preserve morph and same update order. |
| Transforms/palettes | WebGLRenderer updates scene; WebGLObjects invokes skeleton update. Editor additionally forces current selected-object transforms. | Nested traversal labels are not additive. Use sampled call trees plus separate renderer boundaries; count passes and unchanged versus dirty state. |
| Bounds/picking/reads | Editor Selector traverses visible scene/helpers, intersects objects, builds precise selection box and reads world positions. Animated selection performs precise Box3 work every update. | Prioritize measurement of selected versus unselected animation and click/gizmo latency. Count vertices/triangles and synchronous read bytes; preserve hit identity and ordering. |
| Visibility/sorting | Renderer projectObject and per-pass render lists; Editor scene/helper rendering and shadows add work. | Attribute culling/projectObject, opaque/transparent sort and shadow traversal separately. Do not remove existing culling, helper pass or transparency. |
| Upload preparation | WebGLObjects/WebGLAttributes prepare geometry; palette/texture/uniform preparation occurs under render submission. | Separate CPU buffer preparation and driver submission from asynchronous GPU elapsed time. Count actual changed bytes; preparation is not GPU completion. |
| Submission/UI/callbacks | Viewer stats/GUI and optional axes renderer; Editor objectChanged, selection and render signals. | Main timer includes all application commands, reads and renderer return. Instrumentation runs separately; retain app UI and callbacks. |

The highest-priority **measurement question**, not a selected Rust port, is whether Editor's animated precise bounds/picking cost outweighs animation evaluation. It can force per-vertex CPU work and synchronous pose access absent from the Fox experiment. Compare bounds/picking, visibility/list preparation, animation and upload candidates before choosing a boundary. No measured useful CPU fraction or maximum whole-frame speedup is available.

For measured removable fraction f and candidate speedup s, a future upper bound is `1 / ((1-f) + f/s)` before added bridge/read/materialization costs. Do not fill f using source size, function counts or smoke. Report raw profiles, sampling interval, profiling overhead A/A, exclusive and inclusive attribution, rejected candidates and absolute ms with run-level uncertainty.

## Controls and reproducibility preparation

Retain small static application scenes, Editor idle state, native animated one-character state and separate GPU-heavy raster/shadow scenes. Existing facade small/shader/4K controls belong to a different API experiment; they cannot replace application controls. Higher-resolution or multiplied scenes are explicit variants. Future primary timing disables tracing and GPU queries; profiling and asynchronous GPU queries use new paths.

Retrieve exact sources with git clone then `git checkout --detach <full SHA>`. glTF Viewer uses its original Yarn v1 lock (`yarn install --frozen-lockfile`, then `yarn build`); do not generate an npm lock or run deploy. Editor's original browser entry is editor/index.html with pinned local Three.js. It also references three-gpu-pathtracer 0.0.23, three-mesh-bvh 0.7.4 and Draco encoder 1.5.7 on jsDelivr: archive and hash these resources before a reproducible offline runtime build; do not silently stub/remove imports. Loader decoders/environment assets require independent URL/hash/license capture even if a particular uncompressed asset does not exercise them.

Application dependency installation/build, third-party CDN mirroring, native UI smoke, interaction logs, numerical/image reference capture and CPU profiles are still outstanding. The glTF Viewer source is r176; an r186 adapter/engine evaluation needs its own versioned diff and path. No application CPU savings, FPS improvement, Rust-specific advantage or milestone completion follows from this screening.
