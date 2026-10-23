# Task #3 Stage 2: licensed Fox migration and hardware correctness

## Artifacts and scope
Added the pinned Khronos Fox asset manifest, untouched upstream license and explicit attribution; a checksum-verified local fetch keeps the GLB out of Git/npm. Added a finite fail-closed conversion plus deterministic play, pause, externally scheduled normal blending, stop/rest/restart, root translation, camera orbit and full synchronous snapshot reads. Upstream/owned JS/owned Wasm use identical asset, camera, renderer/materials and render quality. No engine contract expansion or port change.

## Verification
- `RTHREE_BROWSER_MODE=hardware RTHREE_FOX_RESULTS_DIR=work/mac/fox-correctness-02 node tests/fox-browser.mjs`: 132 checkpoints, all exact pixels. Whole world/palette/root/action/camera outputs match; maximum world difference 4.44e-16. All 1/16/static scenarios pass; poisoned upstream animation/Bone/palette work stays bypassed.
- `RTHREE_BROWSER_MODE=hardware RTHREE_FOX_REJECTION_DIR=work/mac/fox-rejections node tests/fox-rejections.mjs`: 13 actual asset/API unsupported cases reject.
- Fox runner smoke: six runs × ten samples, warmup five, completed and analyzed with matched draws/triangles/reads. This is runner validation only; the initial smoke's generic classification is not a main result.
- `npm run docs:check`, `npm run test:infra`: passed; 5 infrastructure checks. New scripts parse. Formatting used pinned Prettier 3.6.2, without changing runtime dependency versions.
- Visually inspected one-rig blend and 16-rig captures; Fox textures/material and articulation are visible. Scaled rigs use equal conservative bounds and include partial viewport clipping at the nearest edge; all 16 draws execute in every path.

Evidence: bench/results/mac-20261023/fox-correctness-02, fox-rejections, fox-smoke, preflight-ac and checks.

## Preserved failure and compatibility limit
The first Fox check failed at the stop phase because component-wise quaternion equality rejects q versus -q. Investigation showed exactly equal world/palette/action output and two antipodal joint rotations per rig. The test now compares rotations modulo sign, retaining raw component deltas/sign counts. Raw snapshots therefore do not promise Three.js quaternion-sign continuity. The failed result remains in fox-correctness. No pixel tolerance was enlarged; final pixels are exactly equal despite the predeclared sparse-edge allowance.

## Next stage
The user authorized measurement through draft PR submission. Source/binary hashes will be frozen for original A/A before, six balanced permutations and A/A after, then separate copy/read diagnostics. Full timing uses 1200/3600 fixed frames calibrated for observed 120 Hz. Background work cannot be excluded; no automatic performance acceptance follows from passing correctness.
