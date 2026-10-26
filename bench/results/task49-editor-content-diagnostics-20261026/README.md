# Native Editor content diagnostics — Task #49

This evidence bundle preserves original native ZIP import failures and separately labeled follow-up diagnoses. It contains no primary performance measurement. A failed route remains failed; a diagnostic pass cannot replace an uninstrumented correctness gate.

## Initial observations

| Capture | Recorded result | Scope |
| --- | --- | --- |
| Chess correctness 001 | Passed, original only | Native import, asScene=false, selected imported root, focus, original material/texture relationships, zero-render native idle and two fixed snapshots |
| Chess correctness 002 | Failed at prepared-JS cross-route image comparison | Original passed again; JS had matching source relationships and within-page snapshots, but a different camera and image; Wasm was not reached |
| Bistro correctness 001 | Failed, original only | Twelve native `ERR_BLOB_OUT_OF_MEMORY` requests and an action-start timeout; no candidate or profile qualification |

These initial captures used clean tooling `d1def5a2b1845cb0a398bdb5d2528d0fbee69929`, with immutable candidate `85e2c5d500edb0b92ea4ecb997087fded3fed45b` supplied to the harness. Original Editor continues to execute its original Three.js 0.186.1 sources; a candidate identity in setup metadata does not mean the original route uses the candidate runtime. Editor is pinned at `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`.

The original Chess pages from attempts 001 and 002 match exactly: all 602,640 pixels and all 2,174 numeric values. The JS page differs at 91,610 pixels (15.20144696667994%), 274,520 RGB channels, maximum delta 255/255. Alpha is identical. Exactly eleven numeric values differ, all in the saved camera matrixWorld block; the 2,142 scene values and sixteen projection values match. Camera position and quaternion differ at the saved setup endpoint, after root selection, native focus, settling and autosave waiting. The initial captures have no camera checkpoint immediately after import, so the divergence time remains unknown. The fixed images therefore do not compare equal camera states. Endpoint evidence does not identify when or why orientation changed, or establish a Rust arithmetic or material-renderer bug.

The native idle observation renders zero frames on both original and JS. Its per-render denominator is null, not zero-cost CPU evidence. Import/setup costs lie outside that observation. The initial source contract retains 49 original mesh instances, fifteen materials, 71 material texture slots and 33 decoded image definitions, with no animation clips and no artificial content replication.

Bistro's native Blob request failures are distinct from the Viewer's earlier HTTP cancellation failures. The observed error does not identify a GPU allocation failure or prove permanent incompatibility. Source inspection separately found that the initial setup clicked an already-selected first animation label, toggling it off before play. That tooling defect can explain a missing action but does not erase independent texture failures. Later tooling and resource diagnoses require separate source pins and output directories.

## Input and source preservation

Both apps use the unchanged original ZIP containers from the earlier [Viewer native-content archive](../task49-native-content-correctness-20261026/README.md). The menu attempts use the original File→Import. The separately labeled native-input attempts enter its unchanged change handler. Both retain native fflate decode, the original GLTFLoader and asScene=false AddObjectCommand. No native feature, texture, material, authored instance or animation is removed to make a gate pass.

- Chess source: `KhronosGroup/glTF-Sample-Assets@8f492390ddc7a2ae221a1369ef560589cf8c70fb`; ZIP SHA-256 `3c4d6428af22f7e093a70a9bb0ee68266818f13c11559513eb8131c6afee2461`.
- Bistro source: `qian-o/GLTF-Assets@816a1d6533c55787b3fabc9b75660c0d0c57ebc6`; ZIP SHA-256 `f1a2bcf7049544081bb3a09586ef8802532a59ca1536029a72cb6ab03ba71141`.

Exact preparation and fetch manifests, CC-BY-4.0 notices, Three.js/Editor MIT notice and embedded source notices are preserved. Chess attribution: Moeen Sayed and Mujtaba Sayed / SideFX; ASWF / MaterialX Project (2020); conversion Ed Mackey (2022). Bistro attribution: Amazon Lumberyard / NVIDIA ORCA; conversion qian-o. Huge ZIPs, binary buffers and original texture payloads are not copied into this bundle. The prior independent ZIP stream/entry verification is retained and linked; absent payloads are not rehashed by the offline archive verifier.

Every selected capture output, failed error, pre/post-close event record, source blob, adaptation and PNG remains indexed. Source/privacy normalization is restricted to explicit private path strings; numeric/image/source bytes, counters, timestamps, public scene/Blob identifiers and recorded status remain unchanged. No requester-specific prompt is a repository artifact.

## Verification boundary

The offline verifier checks content-addressed storage, exact committed helper sources, served-source hashes, HTML adaptation, recorded source relationships, fixed-pose repeats, candidate-versus-original comparisons when actually completed, and before/after-close event prefixes. It independently decodes PNG CRC/filter bytes and verifies the vertical flip against saved WebGL readPixels hashes. Failed attempts may have a pre-close native-events snapshot; the separate full post-close tail is always preserved and never filtered into a pass.

Captured source bytes are checked against their own recorded byte length and digest. Local served-file inventory additionally records byte lengths; mirrored remote records in this Editor helper contain a digest without a length. Verification checks the recorded digest and does not invent a missing mirrored-byte field. The initial verifier assumption that every mirror row had a byte count failed and was corrected without modifying any source record.

The preserved independent image audit depends only on named decoder AST definitions from the earlier Viewer A/A audit; the exact dependency source and its hash are included. The archive's standalone verifier repeats the core pixel/numeric conclusions without requiring Pillow or NumPy.

No whole-frame gain, CPU-headroom classification, GPU bottleneck, Rust effect, lifecycle qualification or candidate adoption follows from this correctness evidence.

## Incomplete focus diagnosis

`chess-focus-diagnostic-001` used clean tool `0fef6601aea862d156ea5e3104b506fd747c055d` and stopped before import with an unhandled `filechooser` wait timeout. Its native result remains `preparing`; it contains only the original route and three early setup checkpoints. No fixed oracle, performance sample, final source inventory, close-event tail or completed integrity gate is backfilled.

The separate execution-owner record reports terminal exit 1 and the observed timeout. Its later read-only finding that no headed automation Chrome process remained does not retroactively certify cleanup or absent integrity evidence. This sidecar is explicitly distinct from native capture output. The reason the native chooser operation did not complete remains undetermined in that attempt.

Focus diagnosis adds passive input/signal observations and setup checkpoints, including public matrix reads. Those reads can materialize lazy candidate values. A pass with this optional instrumentation must therefore remain distinct from a fresh uninstrumented correctness gate. No native callback, control, render loop or mixer implementation is replaced by this observation tool.

## Completed follow-ups and limits

| Capture | Tool SHA | Recorded result |
| --- | --- | --- |
| Focus diagnosis 002 | `500880cd21d5c7ce0ecd63d0d32d16dca55e10c7` | All three routes passed; ten instrumented setup checkpoints per route |
| Chess correctness 003 | `500880cd21d5c7ce0ecd63d0d32d16dca55e10c7` | Original and JS passed without focus observation; Wasm failed at the native chooser operation before import; failure was caught and final source/cleanup evidence retained |
| Chess native-input correctness 001 | `48f7a196ea635c50005f63376fdbffc02253bc2f` | Original, JS and Wasm passed with the unchanged native input/change handler; focus diagnosis disabled |
| Bistro native-input correctness 001 | `48f7a196ea635c50005f63376fdbffc02253bc2f` | Original failed early on twelve native Blob out-of-memory requests; strict rejection retained |

The initial camera divergence remains unresolved. Focus-observed equality alone does not establish its cause or fix. The later uninstrumented menu attempt establishes original/JS parity but does not establish Wasm menu/chooser coverage. The separate native-input path submits the exact ZIP to the pinned Menubar.File hidden `<input type=file multiple>` and its unchanged original change handler. It preserves the native import dialog, asScene=false, AddObjectCommand, source features, root selection and focus. **It does not exercise the menu click or OS chooser.** The explicit input metadata and hidden-element shape are preserved and independently verified.

The second Bistro attempt retains 1,297 original source nodes, 132 material instances and all thirteen clips, but only 393 decoded image definitions rather than the declared 405. Missing texture slots and image definitions are independently visible in its saved source-readiness record. The twelve failed Blob requests remain errors; geometry/clip presence does not make the scene complete. Early loader/readiness checks now expose that failure before a misleading animation timeout. Neither textures nor quality were reduced, and no candidate run or profile was accepted for this failed Editor import.

Overall, this bundle contains eight attempts and fifteen route records: ten passed, four failed, and one incomplete `preparing` route. All eleven available within-route fixed-pose pairs match, totaling 23,914 numerical comparisons; all 22 oracle PNGs decode to their saved readPixels hashes. Five completed candidate-versus-original fixed-pose comparisons pass. The initial failed JS comparison is independently re-derived and remains separate. Thirty-three focus checkpoints preserve ordered event prefixes. Individual partial source blobs from the incomplete attempt remain content-hash checked, while their missing final source-to-URL inventory is not invented.

## Archive inventory and commands

[archive-index.json](archive-index.json) maps **2,513 logical files** to **371 gzip blobs**, with **5,937,922 unique stored bytes**; the largest blob is 1,272,407 bytes. Sixteen committed helper-source records bind the four actual tooling SHAs. Every file in all eight selected raw output trees is preserved, together with source/ZIP manifests, the unchanged independent image audit and decoder dependency, notices and the execution-owner sidecar.

Eight JSON metadata files require explicit home-path normalization. Numerical tokens/types/values, images, executed source bytes and original statuses remain unchanged. The archive builder rechecks all copied original file hashes and complete capture directory listings. This bundle contains no original ZIP, glTF binary buffer or large texture payload. The complete original raw trees remain local.

[Audit details](audit.json) record every available route, source relationship, event tail, image and numeric result. [Verification attempts](verification-attempts.json) preserve the corrected offline-verifier schema assumption separately from browser failures. Thirteen bounded mutation tests passed. An optional fresh extraction restores the logical public tree without overwriting existing directories:

```sh
ARCHIVE=bench/results/task49-editor-content-diagnostics-20261026
python3 "$ARCHIVE/verify.py"
python3 "$ARCHIVE/test_verify.py"
python3 "$ARCHIVE/verify.py" --extract "$FRESH_OUTPUT"
```

The scripts use Python 3.10+ standard libraries. To rebuild from the unchanged local captures and recorded Git objects:

```sh
python3 "$ARCHIVE/archive.py" --root "$REPOSITORY_ROOT" --out "$FRESH_ARCHIVE"
cp "$ARCHIVE/archive.py" "$ARCHIVE/storage.py" "$ARCHIVE/png.py" "$ARCHIVE/verify.py" "$FRESH_ARCHIVE/"
python3 "$FRESH_ARCHIVE/verify.py" --out "$FRESH_AUDIT_JSON"
```

Use the capture's own complete tool SHA for browser reproduction and a fresh output directory. These are equivalent command templates; original argument ordering was not separately recorded:

```sh
# Initial/ordinary menu correctness; select the exact recorded tool revision.
node scripts/apps/editor-content-check.mjs "$APPS_ROOT" "$PREPARED_ZIP_ROOT" "$NEW_OUT" candidateRoot="$RUNTIME_ROOT" candidateSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b routes=original,prepared-js,prepared-wasm
# Instrumented diagnosis, tool 500880cd21d5c7ce0ecd63d0d32d16dca55e10c7.
node scripts/apps/editor-content-check.mjs "$APPS_ROOT" "$CHESS_ZIP_PREPARED" "$NEW_OUT" candidateRoot="$RUNTIME_ROOT" candidateSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b focusDiagnostic=true
# Native hidden-input correctness, tool 48f7a196ea635c50005f63376fdbffc02253bc2f.
node scripts/apps/editor-content-check.mjs "$APPS_ROOT" "$CHESS_ZIP_PREPARED" "$NEW_OUT" candidateRoot="$RUNTIME_ROOT" candidateSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b input=native-file-input
node scripts/apps/editor-content-check.mjs "$APPS_ROOT" "$BISTRO_ZIP_PREPARED" "$NEW_OUT" candidateRoot="$RUNTIME_ROOT" candidateSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b input=native-file-input routes=original
```

A later runtime candidate requires its own exact SHA and fresh correctness evidence. This historical archive does not inherit later fixes or performance claims.
