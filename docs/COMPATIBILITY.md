# Compatibility

Runtime reference **three 0.186.1**, matching r186 commit 9b4a2ac…;
declarations **@types/three 0.186.0**, independently checked on npm.
This replaces the bootstrap's proposed promises with the implemented boundary.
The [observable contract](FACADE_CONTRACT.md) adds executable identity, mutation,
read/event and lifecycle requirements. The table below describes the default legacy
bridge. The optional [persistent facade](PERSISTENT_FACADE.md) adds lazy proxy arrays
and Rust evaluation of all three transform-update methods, with separate restrictions.
[C3 prepared entries](PREPARED_PASS.md) retain topology and evaluate ordinary-Mesh
main-pass visibility, ordering and draw matrices in Rust or matched JS. Unsupported
passes use the upstream path. The table below is not a claim about these optional
entries; their contracts and measured costs are separate.

| Path/API | Implementation and verification |
|---|---|
| Object3D.updateMatrixWorld | Rust f64 local composition + world propagation for eligible subtrees; randomized upstream differential tests |
| TRS, quaternion/Euler, r186 pivot, direct matrix.elements | Ordinary upstream JS public objects, conservative batch scan; manual matrices, auto/world-auto flags and force tested |
| Matrix4/Vector3/object identity | Preserved within rthree; arrays are materialized in place; no wrapping Proxy |
| updateWorldMatrix/getWorldPosition/lookAt/attach | Original JS implementation; synchronous semantics compared to upstream. Not Rust accelerated |
| Camera and SkinnedMesh overrides | Original JS dispatch/post-update retained; eligible children may use Rust |
| Custom updateMatrix/updateMatrixWorld overrides | Detected by function identity, original traversal retained; tested subclass side effects |
| AnimationMixer, skeleton palette | JS maintained; event/pose differential test; Soldier rendering/shadows compared, no claimed Rust animation port |
| WebGL renderer/materials/shaders | Upstream unchanged; five deterministic scene image comparisons plus multi-render callbacks |
| Root/addons identity | One bundled core, addon imports rewritten to that exact root; GLTFLoader/SkeletonUtils tested in Node and GLTF/SunLight in browser |
| TypeScript | NodeNext and Bundler strict consumers with GLTFLoader/OrbitControls imports; not full API declaration audit |
| ESM/local install | Actual npm pack + isolated consumer install, Node import, esbuild single core verified |
| JS compatibility / packed JS | `rthree/js` disables hook; `rthree/packed-js` uses same bridge/layout, independently JS arithmetic |

Use `await init()` before constructing application objects that call any update
(e.g. camera.lookAt). Existing methods stay synchronous after init. Failed Wasm
fetch/compile rejects; no silent JS fallback. `{wasmBytes}` works in Node and
`{wasmURL}` controls deployment. The package itself does not use top-level await.
A mixed graph importing JS and Wasm modes is unsupported: select once per graph,
reload to change. Calling init concurrently is supported; failure can be retried.

A import change alone cannot repair third-party internal `three` imports,
direct `node_modules/three/build/...` URLs, or duplicate package versions.
Alias both `three` and `rthree` to the same entry and both addon prefixes to the
same addon tree. Bundlers must copy `.wasm` or pass the emitted URL explicitly.
Generated package addon imports are relative, so they do not create a second
runtime Three dependency in a clean consumer. The unrelated original Three in
A/B oracle tests is intentionally isolated and should not be mixed into an app.

Unsupported: CommonJS, WebGPU/TSL and addons depending on those entry points,
arbitrary deep imports, invalid cyclic manually edited children arrays,
side-effectful property getters/setters, global prototype replacement, mutable
module internals, multiple engine modes in one module graph. A prototype override
may evade the identity guard; it is not a guaranteed fallback. Unverified:
XR, React Three Fiber, SSR/hydration, context loss/restoration, compressed GLTF
extensions, multi-material/transmission edge cases, every addon, Firefox/Safari,
real mobile and hardware GPUs. No full upstream test suite completion claim.

Rust owns persistent f64 arena storage, not authoritative JS properties.
Each update reconciles hierarchy and scans public values. No JS compose/multiply
is executed for a supported batch; a test makes either operation throw to prove
this. All scan, copy, allocation and result materialization overhead is included
in frame timing. Public arrays are not direct views of Wasm memory. Typed views
are recreated after memory growth. Call release(root) when retiring a tree;
FinalizationRegistry is best-effort and Wasm linear memory does not shrink.
Handles never reuse a freed ID (stale handles cannot alias new arenas); tombstone
registry storage grows with lifetime arena count. Large-scale lifetime churn is
not optimized in this alpha.

Hosting also needs a CSP that permits WebAssembly compilation (typically
`script-src 'wasm-unsafe-eval'` under the site's policy) and fetch/CORS permission
for a separately hosted Wasm URL. CSP/offline/base-path combinations were not
exhaustively tested. No SharedArrayBuffer or threading is used, so the engine
does not itself require COOP/COEP isolation. Numeric comparisons use f64 with
absolute/relative tolerances, not a promise of bitwise IEEE equivalence for
NaN payloads or signed zero. Scalar synchronization uses JS numeric equality:
a change from +0 to -0 alone is not transferred, so sign-sensitive reciprocal
observations are outside the supported numeric contract.


## Separate explicit owned-rig API

Task #26 adds `rthree/owned` with descriptor acquisition, batched commands, persistent
animation/pose/world/palette authority and paid snapshots. It does not change the
ordinary AnimationMixer/Skeleton rows above. The finite [contract](OWNED_ANIMATION.md)
rejects unsupported bindings/events/tracks rather than silently altering them.
Its renderer adapter uses dedicated presentation meshes, the supplied core identity,
opaque materials and prepared palettes. Read/copy, startup, application migration
and lifecycle costs remain part of its evaluation; this is not full compatibility.
