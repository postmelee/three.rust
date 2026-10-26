# A Beautiful Game: pinned preparation and structural validation

Date: 2026-10-26. The exact glTF variant selected in `three-rust-next-content-research.md` was downloaded into the new `work/task49-beautiful-game-001` directory. No existing asset was changed. No build, browser, renderer, profile, or application timing was run.

## Source, license and integrity

- Source: `KhronosGroup/glTF-Sample-Assets@8f492390ddc7a2ae221a1369ef560589cf8c70fb`, directory `Models/ABeautifulGame/glTF/`.
- Root URL: [ABeautifulGame.gltf at the fixed pin](https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/8f492390ddc7a2ae221a1369ef560589cf8c70fb/Models/ABeautifulGame/glTF/ABeautifulGame.gltf).
- License and notices: [pinned README](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/8f492390ddc7a2ae221a1369ef560589cf8c70fb/Models/ABeautifulGame/README.md), CC-BY-4.0; original Moeen Sayed and Mujtaba Sayed work for SideFX, © 2020 ASWF / MaterialX Project; glTF conversion © 2022 Ed Mackey. The captured original notice is `three-rust-content-notices/a-beautiful-game-README.md`; its source and archival hash are in that directory's manifest.
- Download completed: **35 files, 29,805,749 bytes**, **zero failed attempts or retries**. All 35 file lengths and Git blob SHA-1 values match the captured GitHub metadata. SHA-256 values are recorded for every downloaded file. No GLB substitution, texture conversion, tangent generation, simplification or material/scene edit was performed.
- Dependency closure: the JSON references exactly **34 distinct external resources** (one bin and 33 JPEG textures). The referenced set plus the root JSON is exactly the 35-file manifest; no resource is missing or unreferenced.
- Root JSON: 46,214 bytes; Git blob SHA-1 `0e8b4f99820db8758f5646d573d1f82e0918da21`; SHA-256 `2e1b63ae34173c6e3251f749b1b8b97a32e92517aab2cfd4bfffd9158f4dd278`.
- Buffer: 10,829,440 bytes; Git blob SHA-1 `8308f62c8082f6c73022238b00f7a53cadd20e05`; SHA-256 `727eea28752b2b0c35cad89e726f0bc6a1800c3fa8696867ccf3d0c39933f5fb`.

`work/task49-beautiful-game-001/fetch-manifest.json` preserves the source pin, metadata hash, exact source URL, size, both hashes for each file, source-notice URL, timestamps, reference check, status and empty failure array. Asset byte totals exclude the generated manifest and separate notice/research files.

## Validator result

Official Khronos `gltf-validator` **2.0.0-dev.3.10**, already installed in the prepared Viewer environment, ran under Node **v24.15.0** with the same runner/options as Bistro and Tokyo. It read all 34 external resources, **29,759,535 bytes**, from disk. No issue filter, suppression or severity override was used. `maxIssues=10000`; **truncated=false**.

- **0 errors**.
- **15 warnings:** `MESH_PRIMITIVE_GENERATED_TANGENT_SPACE`, one per primitive. The materials need tangent space but the primitives do not provide tangents; runtime-generated tangent space may differ across implementations. This is a reason to inspect normal-map appearance in r176, upstream r186 and candidate routes. It is not evidence of a measured CPU bottleneck and does not justify changing the asset.
- **0 infos**, including no unsupported-extension notice.
- **32 hints:** `BUFFER_VIEW_TARGET_MISSING`; vertex/index buffer views omit their advisory target.

This establishes no detected structural errors within this validator's coverage, not application correctness or cross-renderer image equivalence. Viewer/Editor import, transmission/volume appearance, selection, focus, move/orbit, native idle behavior and candidate fallback must still be checked before profiling or timing. The earlier findings remain: Bistro has no detected errors but KTX2 coverage gaps; Tokyo has preserved source conformance errors and can only be labeled a native compatibility stress case.

## Reproduction and raw artifacts

The small fetch script uses only captured pinned metadata, enforces the expected 35-file/29,805,749-byte set, constructs no mutable-branch URLs, verifies Git blob hashes, records SHA-256, and requires a fresh output directory. It preserves failed attempts and any incomplete `.part` file. It does not alter a lockfile or install packages.

```sh
python3 task49-fetch-beautiful-game.py three-rust-khronos-candidate-metadata.json work/task49-beautiful-game-001
node task49-validate-content.cjs VALIDATOR_PACKAGE work/task49-beautiful-game-001/ABeautifulGame.gltf task49-beautiful-game-validator-001.json
```

The actual command used the existing prepared Viewer `node_modules/gltf-validator` directory for `VALIDATOR_PACKAGE`; reproduction must use its pinned package version or record any change. Fetch script SHA-256: `11a360a3bff16f45458bbd5bdccffac4a0f0b9e68479925584334206768f5d33`. Validation runner SHA-256: `f33614984f77ad0755bc619accfd3de7ba5d1424a45923d59bb50cdb2719688e`.

Temporary handoff files:

- `task49-fetch-beautiful-game.py`
- `task49-validate-content.cjs`
- `task49-beautiful-game-validator-001.json`
- `three-rust-khronos-candidate-metadata.json`
- `three-rust-content-notices/a-beautiful-game-README.md` and its `manifest.json`

The other assets' raw validator reports and independent Tokyo float32 audit are listed in `three-rust-content-validation-review.md`. No app performance conclusion is drawn from asset complexity, download completion or validator execution duration.
