# Task #49 real-content source preparation

This archive preserves source metadata, original notices and acquisition hashes for the real-content shortlist. It is not a hardware timing, import-correctness or adoption result.

- [Research and selection boundaries](../../../mydocs/tech/task_m6_49_content.md).
- Tokyo: full original 4,133,072-byte GLB, pinned to Three.js commit `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`, SHA256 `8375c2aa6808e28ad1cb9c0d43e1513f57ffd7865244bf66bbbd5bb0e907e06d`, CC-BY-4.0 / glenatron (Glen Fox). Preserve embedded extras and the pinned example attribution.
- Bistro Exterior: unchanged authored scene at `qian-o/GLTF-Assets@816a1d6533c55787b3fabc9b75660c0d0c57ebc6`, 407 referenced payloads / 546,272,742 bytes. `bistro-fetch-manifest.json` records every actual URL, payload SHA256, Git blob hash and the LFS pointer. Amazon Lumberyard/ORCA and glTF conversion attribution remain in `notices/`; CC-BY-4.0. No additional HDRI was downloaded.
- A Beautiful Game was subsequently downloaded unchanged: 35 payloads / 29,805,749 bytes; exact source and hashes are in `beautiful-game-fetch-manifest.json`. No app measurement has been run.

The original large payloads stay in fresh ignored local directories; this repository retains their retrieval identity and license records. Textures are only those actually referenced by the original glTF. No models were duplicated and no materials, clips or geometry were removed. Loader/decoder and app adaptations require separate checks.

`initial-acquisition.json` preserves hashes of the Tokyo payload/example and notices, plus failed notice path/name/UTF-8 display attempts. A failed display decode did not change the original license bytes. The notice bundle contains exact upstream response bytes, losslessly gzip-compressed; its manifest records decoded/stored hashes and original encodings. No whitespace or license text was altered to satisfy source formatting checks.

## Structural validation before app use

| Asset | Validator errors | Remaining evidence boundary |
|---|---:|---|
| Bistro Exterior | 0 | KTX2 unsupported by validator; 405 image-format warnings and 1 unsupported-extension info remain |
| Littlest Tokyo | 2,195 | Actual duplicate animation times and forbidden stride fields; native compatibility stress only, not conformant-content qualification |
| A Beautiful Game | 0 | 15 generated-tangent-space warnings, 32 target hints; app image/interaction validation still required |

All use the prepared Viewer’s pinned Khronos validator 2.0.0-dev.3.10, without suppressed messages and without truncation. `validation-index.json` preserves original/stored hashes for losslessly compressed reports and the independent Tokyo float32 audit. [Asset validation](../../../mydocs/tech/task_m6_49_asset_validation.md) and [chess preparation](../../../mydocs/tech/task_m6_49_chess_preparation.md) distinguish source defects, validator coverage gaps and future application checks. Validator elapsed time is not app CPU cost.
