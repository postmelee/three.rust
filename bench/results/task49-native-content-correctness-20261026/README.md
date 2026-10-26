# Native content correctness and cross-page controls — Task #49

This archive preserves five completed Viewer captures, unchanged native ZIP preparation, and two offline Chess image audits. **Bistro passed its required same-version correctness comparisons. Chess's strict cross-route image gate failed, and fresh pure Three.js pages reproduce both images. No candidate-induced image regression or performance advantage is established.** The failed transport and image records remain failed.

## Captured outcomes

| Capture | Tool SHA | Recorded outcome |
| --- | --- | --- |
| Chess, guarded HTTP, five routes | `5d1f3bc42d1b78d1fa1b1ada84bbe5d0150c6b11` | Failed: original-r176 and Wasm passed locally; external-r176, pure-r186 and JS failed strict request completion |
| Chess, native ZIP, five routes | `d8cef95bcc906b7e20a248c3f8b3193fcffdfcbd` | All five route-local gates passed; required pure→JS/Wasm exact main-image comparisons failed |
| Chess, fresh pure-r186 ZIP page 001 | same `d8cef95…` full SHA above | Passed locally; exactly reproduced the initial JS/Wasm image |
| Chess, fresh pure-r186 ZIP page 002 | same `d8cef95…` full SHA above | Passed locally; exactly reproduced the initial pure-r186 image |
| Bistro, native ZIP, five routes | same `d8cef95…` full SHA above | Passed: all five local gates and all nine required cross-route checks |

Runtime: `85e2c5d500edb0b92ea4ecb997087fded3fed45b`. Pinned Viewer: `b5ee5dafe27f953ae1b55f42b5fa3697fef08683`. Original and externalized Three.js 0.176.0 remain distinct from pure/candidate 0.186.1. Every capture records clean tooling plus exact helper and executed source hashes. The archive contains 17 route records (14 local passes and three failures), 22 exact within-page fixed-pose repeat pairs, 777,762 ordered numerical comparisons, 20 cross-route records, and 88 PNGs independently decoded and matched to their saved bottom-up WebGL `readPixels` SHA-256. Partial fixed-pose equality does not override a strict failed route.

The retained environments are headed Chrome 155.0.8059.86 on Apple M4 Pro / ANGLE Metal, with actual executable, dimensions, DPR and hardware preflight recorded per route. Correctness uses `isolated:false`; these are not isolated CPU measurements. No throughput, frame-rate, energy or CPU-headroom claim follows.

## Chess baseline instability

The initial pure/candidate difference is four of 839,680 main-canvas pixels, eight RGB channels, maximum absolute channel delta 13/255. Alpha and axes images are equal. The JS and Wasm images are identical, and all saved numeric/object/material/texture-slot contracts agree. Two independent fresh pure-r186 pages reproduce the two images exactly, including the four-pixel pattern. Thus this evidence does not identify candidate causality, Rust arithmetic, PMREM, transmission or a specific renderer boundary as the cause.

Both original and follow-up image-audit files remain unchanged under the logical `image-diagnostics/` paths. The earlier audit's proposed fresh-page control is chronological history; the later audit records its actual execution. No tolerance was relaxed, unfavorable image selected away, or failed gate relabeled. A different scene setting or profile scenario requires its own declared oracle; these controls do not automatically qualify it.

## Native ZIP workflow and provenance

The ZIP is a container for **unchanged authored files**, not a scene conversion. Viewer receives it through its original file input → SimpleDropzone / zip-js → App.load → App.view. The native GLTFLoader, validator, material/texture handling, animation and both renderers remain in place. File/Blob input legitimately makes zero mounted scene HTTP requests; the reports do not fabricate HTTP payload coverage. This distinct supported workflow does not resolve the earlier HTTP cancellation failures.

| Content | Original source pin | Original referenced files | Native stored ZIP |
| --- | --- | ---: | --- |
| A Beautiful Game | `KhronosGroup/glTF-Sample-Assets@8f492390ddc7a2ae221a1369ef560589cf8c70fb` | 35 / 29,805,749 bytes | 37 entries / 29,815,683 bytes; SHA-256 `3c4d6428af22f7e093a70a9bb0ee68266818f13c11559513eb8131c6afee2461` |
| Bistro Exterior | `qian-o/GLTF-Assets@816a1d6533c55787b3fabc9b75660c0d0c57ebc6` | 407 / 546,272,742 bytes | 410 entries / 546,368,051 bytes; SHA-256 `f1a2bcf7049544081bb3a09586ef8802532a59ca1536029a72cb6ab03ba71141` |

Additional entries are exact upstream notices and provenance only. Original scene files, binary buffers, textures and large ZIP payloads are intentionally absent from this public bundle. The builder independently streamed each local archive SHA and every ZIP entry and checked stored method, paths, deterministic DOS timestamp, exact manifest byte/hash records and source file inventory. [zip-input-audit.json](zip-input-audit.json) preserves that local verification. Offline readers can verify the records and source pins; absent asset payloads cannot be rehashed from this archive alone.

Successful preparation manifests remain truthfully attributed to dirty base `5d1f3bc42d1b78d1fa1b1ada84bbe5d0150c6b11` plus helper SHA-256 `ab5520850005172b28ee2353d44e3f29b4504eb29b7480888607cb13ff6fb55a`, whose exact bytes match the later clean `d8cef95…` helper. No clean provenance was backfilled. The first Chess preparation failed before ZIP creation because a broad notice filter also selected an excluded asset's notice. Its manifest, exception and failed command remain. The failed helper's exact snapshot was not retained, only its recorded hash; the corrected helper and successful input verification are retained separately.

Bistro preserves 13 authored wind clips and 405 KTX2 images; live native autoplay/play-all checks are distinct from fixed-pose diagnostics. Chess preserves its original 49 mesh instances, 15 materials and 33 images with authored transmission/volume semantics. The native validator's warnings and limited KTX2 capability remain visible. Exact route agreement does not certify the original asset's visual fidelity.

Original CC-BY-4.0 notices are preserved under [notices/](notices/). A Beautiful Game attribution: Moeen Sayed and Mujtaba Sayed / SideFX; ASWF / MaterialX Project (2020); glTF conversion Ed Mackey (2022). Bistro: Amazon Lumberyard / NVIDIA ORCA; conversion qian-o. Viewer and Three.js MIT notices, pinned Editor license, and the native fflate source/license header are retained. See [content preparation](../task49-content-preparation-20261026/README.md) and the retained [Viewer dependency notices](../task49-viewer-profile-20261026/licenses/viewer/) for upstream records.

## Archive and verification

[archive-index.json](archive-index.json) maps 918 logical files to 352 gzip blobs, with 10,412,735 unique stored bytes (largest 441,844 bytes). It contains every file from each selected capture, 15 committed helper sources, preparation manifests/logs, original notices, and the two unmodified offline image audits. Duplicate content shares storage without dropping logical files.

Each entry records source, decoded-source, public and stored SHA-256 and sizes. Eleven files require only explicit metadata-string normalization: home components in paths, one failed preparation stack log, or browser-generated nonce query values in denied time-service URLs. Numeric values/tokens, timestamps, scene/CDP IDs, source bytes, PNG bytes, errors and failed dispositions are preserved. Original raw outputs remain in their fresh local directories. No private prompt or session instruction is included.

The offline verifier recomputes source/HTML hashes, recorded node/material/texture readiness, all fixed/cross-route comparisons, strict status arithmetic, before/after-close network prefixes and PNG CRC/filter/readPixels hashes. It separately confirms the two pure-page images exactly match the initial two image classes. It does not rerun browser behavior or infer unobserved GPU state. [audit.json](audit.json) contains the detailed audit.

```sh
ARCHIVE=bench/results/task49-native-content-correctness-20261026
python3 "$ARCHIVE/verify.py"
python3 "$ARCHIVE/test_verify.py"
# Optional fresh extraction of every public logical file.
python3 "$ARCHIVE/verify.py" --extract "$FRESH_OUTPUT"
```

The builder requires unchanged local captures, original prepared ZIPs, pinned app checkout and Git objects. It refuses an existing destination and never launches a browser or writes input captures:

```sh
python3 "$ARCHIVE/archive.py" --root "$REPOSITORY_ROOT" --out "$FRESH_ARCHIVE"
cp "$ARCHIVE/archive.py" "$ARCHIVE/protocol_audit.py" "$ARCHIVE/verify.py" "$FRESH_ARCHIVE/"
python3 "$FRESH_ARCHIVE/verify.py" --out "$FRESH_AUDIT_JSON"
```

`protocol_audit.py` retains the earlier offline source/readiness/network checker; this archive's `verify.py` adds native ZIP, cross-route and full PNG validation. [verification-attempts.json](verification-attempts.json) distinguishes builder/verifier failures from application failures. Support files and test logs are bound by [derived-files.json](derived-files.json).

## Browser reproduction templates

Use each attempt's exact full tool SHA, pinned native preparation, immutable runtime, original content root, unchanged ZIP preparation, and a fresh output path. These are equivalent command templates, not a claim that original argument ordering was captured.

```sh
# d8cef95bcc906b7e20a248c3f8b3193fcffdfcbd: all five routes by default.
node scripts/apps/viewer-content-check.mjs "$APPS_ROOT" "$NATIVE_PREPARED" "$NEW_OUT" content=beautiful-game contentRoot="$CHESS_ROOT" zipPrepared="$CHESS_ZIP_PREPARED" runtimeRoot="$RUNTIME_ROOT" runtimeSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b
node scripts/apps/viewer-content-check.mjs "$APPS_ROOT" "$NATIVE_PREPARED" "$NEW_OUT" content=bistro contentRoot="$BISTRO_ROOT" zipPrepared="$BISTRO_ZIP_PREPARED" runtimeRoot="$RUNTIME_ROOT" runtimeSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b
# Each fresh pure control uses a separate output and a new native page/process.
node scripts/apps/viewer-content-check.mjs "$APPS_ROOT" "$NATIVE_PREPARED" "$NEW_OUT" content=beautiful-game contentRoot="$CHESS_ROOT" zipPrepared="$CHESS_ZIP_PREPARED" routes=pure-r186 runtimeRoot="$RUNTIME_ROOT" runtimeSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b
# 5d1f3bc42d1b78d1fa1b1ada84bbe5d0150c6b11: failed five-route HTTP guard condition.
node scripts/apps/viewer-content-check.mjs "$APPS_ROOT" "$NATIVE_PREPARED" "$NEW_OUT" content=beautiful-game contentRoot="$CHESS_ROOT" networkDiagnostic=proxy-cdp-remote runtimeRoot="$RUNTIME_ROOT" runtimeSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b
```

Editor native checks, subsequent profile-specific oracles, larger-content CPU attribution, lifecycle/memory and cross-hardware/date coverage are outside this finite bundle. They require their own evidence and cannot be inferred from these Viewer correctness passes.
