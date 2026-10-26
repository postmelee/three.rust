# Task #49: native Viewer correctness and preparation, 2026-10-26

The final finite Viewer correctness run (`correctness-004`) passed 55 within-route fixed-state checks and 33 required cross-route comparisons across five routes. Required comparisons had zero numerical difference and identical fixed PNG bytes. Eleven additional r176-to-r186 migration comparisons retain their numerical/image differences; they are not engine-equivalence gates. This archive contains no timing or profiling result.

| Evidence | Outcome and scope |
|---|---|
| `smoke-001` | Original r176, externalized r176 and pure r186; three fixed grid states. Pure r186 used historical runtime `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb`. |
| `smoke-002` | Pure r186, prepared JS and prepared Wasm; three fixed grid states, six required comparisons passed. |
| `correctness-001` | Failed at reload: the initial native file input had been removed by `App.createViewer()`. Eight completed original-route cases and the timeout are retained. |
| `correctness-002` | Failed three required manual-morph comparisons after uncontrolled native playback history. Packaging maximum absolute difference was `0.04818498133183624`; JS was `0.15274070525489236`; Wasm was `81.44153834957696`. These are retained failures, not discarded outliers. Their complete cause is unresolved. |
| `correctness-003` | Fresh native reload before the manual-morph oracle passed nine cases per route and 27 required comparisons. This did not establish equivalence after the earlier uncontrolled play-all history. |
| `correctness-004` | Adds explicit matched mixer-history play-all and stopped/manual-morph cases. Eleven cases per route, 44 cross-route comparisons, 33 required equality comparisons passed. |

The final cases are manual morph, fixed play-all, fixed history followed by manual morph, Walking with grid off/on/off, wireframe/skeleton helpers, environment None, Neutral background, resized main/axes renderers and native reload. The route records also preserve native animation GUI actions, speed changes, pointer orbit/dolly/pan/reset, validation, bootstrap and renderer/object identity checks. The reload uses native `App.view()` with the unchanged local model, loader, clear and validator paths; it does not claim a second file-input UI interaction. Explicit fixed mixer state is an oracle adaptation, not continuous native playback measurement. External EXR environment choices and larger content were not exercised here.

## Exact inputs and boundaries

The app is `donmccurdy/three-gltf-viewer@b5ee5dafe27f953ae1b55f42b5fa3697fef08683`. Its original Three.js `0.176.0` bundle is preserved. One externalized app bundle is shared by external r176, pure Three.js `0.186.1`, prepared JS and prepared Wasm. The candidate runtime for smoke002 and correctness001–004 is `85e2c5d500edb0b92ea4ecb997087fded3fed45b`; original/external r176 correctly record no rthree runtime SHA. RobotExpressive is unchanged, 463,988 bytes, SHA256 `047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319`, CC0. Original asset bytes are not duplicated in this archive; source pin, resource hash, validator outputs and notices remain available.

Chrome `155.0.8059.86` ran headed from `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, with hardware ANGLE Metal / Apple M4 Pro, CSS page 1280×720, DPR1 and the existing non-isolated correctness clock environment. The browser was owned separately per route. Main/axes context attributes, framebuffer dimensions and per-case quality/work are retained. These records do not qualify AC power, macOS version, quiet-environment stability or primary performance.

These captures used dirty tools at Git base `e9b736a47f48bc2512476f8966d285d0153419f7`; a clean Git SHA is not asserted. The ten-file `tools-004` snapshot is retained exactly. Its four capture-critical files are independently matched to recorded adaptation/environment/result hashes: `viewer-adapter.mjs`, `viewer-browser.mjs`, `viewer-check.mjs` and `viewer-oracle.mjs`. Other snapshot files remain evidence with their stated provenance. Earlier attempts retain their recorded tool hashes; this archive does not claim complete executable tool snapshots for each earlier attempt.

Both `external-001` and `external-002` preparations are retained. Their executable app/bootstrap JavaScript and CSS bytes are identical. The second preparation added tool/source-map provenance; map path labels were normalized during preparation with unchanged mappings, sourcesContent and other non-path payload. The archive makes no further changes to those prepared map bytes. Original app/source/dist hashes, source/adaptation patches, lockfile, all captured executed JS/Wasm, prepared source maps and transport inventories are preserved.

## Independent audit and preservation

The [audit](audit.json) recomputes 171 within-route and 128 cross-route comparisons over all six attempts, including 2,426,168 ordered numeric values. It verifies 684 fixed PNG containers/dimensions, within-route and equal cross-route PNG bytes, 415 captured executed-source hashes, source/tool pins, hardware boundaries and prepared executable parity. Its numerical tolerance is the existing `abs(actual-reference) <= 1e-10 + 1e-12*abs(reference)`; it additionally compares object/clip/state/action and renderer quality/work fields. No tolerance was relaxed. GPU readPixels hashes are retained as capture evidence; the verifier does not recreate WebGL execution from PNGs. Render-frame counters, diagnostics, wall-clock interaction history and contextual UI screenshots are preserved but are not forced equal across runs.

`archive-index.json` maps all 2,056 logical files to 646 content-addressed gzip blobs (14,982,974 stored blob bytes; 176,543,206 input bytes). Deduplication changes physical storage only. Every selected raw JSON, fixed PNG, contextual UI image, failed result, network/served/used inventory, source/map and adaptation is addressable and restorable. Original source and decoded/public/stored hashes and byte lengths are separate. Source listings and hashes were rechecked after archival. No earlier capture or archive was overwritten.

Three command/log files required local path normalization. Only the exact known app/tool root strings were replaced, preserving all other bytes and numeric tokens. The index records each replacement and original hash. Executable source, source maps, images and numerical snapshots are byte-identical to their inputs. Unexpected private paths/system identity fields/JSON UUIDs fail closed. No scene UUID replacement or blanket UUID permission was needed; only the pinned upstream README screenshot URL is explicitly permitted as a public UUID-shaped URL. The builder's source node_modules symlink exclusion is explicit: original lockfiles, package metadata, executed dependency sources and dependency licenses are retained rather than copying an installation tree.

Node transport checks 001–004 and selected Node/setup logs are preserved, including expected rejected-request/hash-mutation cases, the initial timing-collector syntax failure, and the incorrect argumentless server-test invocation before the corrected infra run. These preparation failures are separate from application correctness. Later external003/timing preparations and larger-content captures belong to subsequent evidence and are explicitly outside this input set. Dependency notices include the Viewer MIT license in each prepared source tree, actual bundled dependency notices/package metadata, original Three.js and RobotExpressive notices. They are reachable through the logical index and restored paths.

## Reproduction

The archive verifier uses only Python's standard library and never executes archived code. An existing archive and restore target are never overwritten.

```sh
python3 bench/results/task49-viewer-correctness-20261026/verify.py
python3 bench/results/task49-viewer-correctness-20261026/test_archive.py
python3 bench/results/task49-viewer-correctness-20261026/verify.py \
  --restore "$FRESH_RESTORED_DIRECTORY"
python3 bench/results/task49-viewer-correctness-20261026/build.py \
  --root "$TOOL_ROOT" --apps "$PINNED_APPS_ROOT" --out "$FRESH_ARCHIVE"
python3 bench/results/task49-viewer-correctness-20261026/verify.py \
  --archive "$FRESH_ARCHIVE" --out "$FRESH_AUDIT_JSON"
```

Builder/verifier/tests/README/audit are support files, with hashes in `derived-files.json`. Six bounded helper regression tests cover exact numeric-byte preservation, metadata-only replacement, private executable/map rejection, UUID boundaries, restore path safety and action/render comparison sensitivity. Building reconstructs payload/index/status; preserve these support files separately.

To repeat the browser correctness gate, restore the `tools-004` source snapshot into a separate tooling checkout, reproduce the locked app preparation and use a fresh output with the preserved helper command shape:

```sh
node scripts/apps/viewer-prepare.mjs "$PINNED_APPS_ROOT" "$FRESH_PREPARED_ROOT"
node scripts/apps/viewer-check.mjs "$PINNED_APPS_ROOT" "$FRESH_PREPARED_ROOT" \
  "$FRESH_CHECK_ROOT" runtimeRoot="$EXACT_BUILT_RUNTIME_ROOT" \
  runtimeSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b mode=full
```

Keep the original app package/yarn.lock, runtime package/Cargo locks and pinned Rust toolchain. The exact prior dirty capture can be inspected through its source/hash evidence; a fresh correctness run must record its own full tool/runtime SHA and hashes. Passing this finite suite does not establish complete Three.js compatibility, prepared-path adoption, whole-frame acceleration or a Rust-specific performance advantage.
