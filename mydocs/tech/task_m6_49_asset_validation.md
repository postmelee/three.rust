# Bistro and Littlest Tokyo structural validation

Date: 2026-10-26. Assets were read without modification. No browser, renderer, build, or application timing was run. This review supplements `three-rust-next-content-research.md`; its earlier shortlist is not a conformance claim.

## Verdict

**Bistro:** no errors in the validator's supported checks, including the actual external buffer, but KTX2 remains outside this validator's coverage. **Tokyo:** strict glTF conformance fails on real source data, independently confirmed. Preserve the failures. Do not silently repair the pinned asset or call it a conformant model because the official Three.js example renders it.

| Asset | Errors | Warnings | Infos | Truncated | Main qualification |
| --- | ---: | ---: | ---: | --- | --- |
| BistroExterior.gltf | 0 | 405 | 1 | false | `KHR_texture_basisu` unsupported; 405 KTX2 image formats not recognized |
| LittlestTokyo.glb | 2,195 | 8 | 157 | false | Duplicate animation times and forbidden stride declarations; Draco unsupported separately |

The tool was the already installed official Khronos `gltf-validator` **2.0.0-dev.3.10**, Node **v24.15.0**. No issue codes were ignored or severity-overridden. `maxIssues=10000`; neither report was truncated. The external-resource callback reads only real paths contained in the local asset directory. Full raw reports preserve the tool's supported-extension list, input hashes, URI pointers and messages.

## Bistro extension handling

The actual unmodified file declares **three** `extensionsUsed`: `KHR_materials_specular`, `KHR_texture_basisu`, and `KHR_materials_transmission`. The apparent missing transmission declaration came from a truncated metadata preview, not the asset. No declaration repair is needed.

The r186.1 GLTFLoader registers `GLTFMaterialsTransmissionExtension` unconditionally. During parsing it instantiates registered plugin callbacks before examining `extensionsUsed`; `getMaterialExtension()` directly reads `materialDef.extensions[extensionName]`. The transmission plugin selects MeshPhysicalMaterial and copies `transmissionFactor`/texture parameters when present. Thus its built-in material handling is not gated by membership in `extensionsUsed`, although a missing declaration would still be a conformance issue. In this asset the declaration is present, and the six positive-transmission materials must remain unchanged. Relevant source regions: constructor registration, parser plugin instantiation, `getMaterialExtension()`, and `GLTFMaterialsTransmissionExtension` in `three/examples/jsm/loaders/GLTFLoader.js`.

Bistro JSON input SHA-256: `696a47147466697bc0f94bb6ef7deb0d403c60993da1c8157c9b03e7c1445ef2` (2,830,929 bytes). Its validation callback read **406 external resources / 543,441,813 bytes**, covering the actual bin and all 405 referenced textures. The validator produced 405 `IMAGE_UNRECOGNIZED_FORMAT` warnings and one `UNSUPPORTED_EXTENSION` info identifying `KHR_texture_basisu`. It does not validate KTX2 compressed texture content. Successful KTX2 transcode, material appearance, normal-map orientation and renderer behavior remain app correctness checks. Do not summarize this as an unrestricted validator pass.

## Tokyo source defects and coverage limits

Tokyo input SHA-256 remains `8375c2aa6808e28ad1cb9c0d43e1513f57ffd7865244bf66bbbd5bb0e907e06d` (4,133,072 bytes), matching the pinned original.

- **2,098 errors:** `ACCESSOR_ANIMATION_INPUT_NON_INCREASING`. Independent decoding of the GLB BIN float32 values using accessor/bufferView offsets found exactly **2,098 equal adjacent timestamps**, across **71 of 96** input accessors/samplers, and **zero decreasing timestamps**. Example: sampler 2 has `0.1666666716337204` at both the previous element and index 6. These inputs are not Draco-compressed geometry and the errors are not caused by the unsupported Draco extension.
- **96 errors:** `ANIMATION_SAMPLER_ACCESSOR_WITH_BYTESTRIDE`, on each sampler's output accessor. The byteStride fields are present in the original buffer views.
- **1 error:** `SKIN_IBM_ACCESSOR_WITH_BYTESTRIDE`; the skin's inverse-bind-matrix buffer view has `byteStride=64`.
- **8 warnings:** `NODE_SKINNED_MESH_NON_ROOT`. The pinned model's hierarchy must be preserved when comparing app behavior.
- **157 infos:** one unsupported `KHR_draco_mesh_compression`, 71 unused mesh tangents, 14 empty nodes and 71 unused objects. The unsupported Draco extension means this validator does not certify the decoded compressed geometry.

Three.js KeyframeTrack's own ordering validation rejects `previous > current`, allowing equal timestamps. This explains why native playback may be possible, but is not proof of exact interpolation behavior, correctness or performance in either app. Retain Tokyo only with the explicit label **upstream nonconforming asset / native Three.js compatibility case**, and pass app-specific load, pose, timeline and skinning oracles before profiling it. If the next gate requires strict glTF conformance, this candidate cannot pass unchanged; select a different clean animated asset or scope a separately hashed conversion and its behavior review. Never remove duplicate keys or stride fields silently in the original.

## Artifacts and reproduction

- `task49-bistro-validator-001.json`: complete Bistro report and input/resource metadata.
- `task49-tokyo-validator-001.json`: complete Tokyo report and input metadata.
- `task49-tokyo-animation-structural-audit.json`: independent float32 input audit, per-accessor counts and examples, output stride and inverse-bind-matrix stride evidence.
- `task49-validate-content.cjs`: reusable validation runner; SHA-256 `f33614984f77ad0755bc619accfd3de7ba5d1424a45923d59bb50cdb2719688e`.

Commands executed followed this interface, once for each named asset, with the existing local validator package and a fresh output file:

```sh
node task49-validate-content.cjs VALIDATOR_PACKAGE BistroExterior.gltf task49-bistro-validator-001.json
node task49-validate-content.cjs VALIDATOR_PACKAGE LittlestTokyo.glb task49-tokyo-validator-001.json
```

Validator runtime hashes: `index.js` SHA-256 `78deff9ea85743e86461c2d14fae76e7fc3ca0432e652f62948066b55fa16f0d`; `gltf_validator.dart.js` SHA-256 `b73a7b2d455ac217567725138b46d826a13d7d1bb0c88c15f7c571bfb349298c`. The package comes from the already prepared pinned Viewer dependency installation; the report does not claim it is the newest validator release.

Raw reports contain validator execution duration only as diagnostic metadata. That duration is not an application CPU measurement. No source, model, texture, animation, engine or repository file was modified by this audit.
