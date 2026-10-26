# Task #49: single-node candidate Editor correctness, 2026-10-26

Original Three.js, prepared JS and prepared Wasm passed all retained Editor correctness and UI scenarios. Independent cross-route comparison found zero difference in 149,328 ordered numerical values, identical PNG bytes and pixel hashes for 32 fixed-image pairs, and matching 40 semantic records. All 162 route-local checks passed. This archive contains no primary timing or profiling result.

| Route | Check suite | UI suite | Capture tool |
|---|---:|---:|---|
| original | 14 passed | 40 passed | `e9b736a47f48bc2512476f8966d285d0153419f7` |
| prepared-js | 14 passed | 40 passed | same |
| prepared-wasm | 14 passed | 40 passed | same |

Candidate runtime is `85e2c5d500edb0b92ea4ecb997087fded3fed45b`; pinned Editor is `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`. All six runs record clean tooling, unchanged source integrity, empty error arrays and helper SHA256 `f3be9be2879d397d51cf159e021f5f25cd0d058e552a8f4a7d3e9c48590232c7`. Original entry HTML is byte-identical to upstream. Candidate adaptation and module hashes are preserved; core.js and Wasm remain the previously built artifacts, while facade-state.js has SHA256 `87e251fe1f40bb182cdea62092c58f3d622bccc40a4e77daaa728f1dec0066a2`.

Chrome 155.0.8059.86 ran headed from `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, with hardware ANGLE Metal / Apple M4 Pro, a 1280×720 page, DPR1, and 930×648 initial canvas. These correctness runs use their existing non-isolated clock environment and a fresh browser per run. They are separate from the isolated native Editor profile/timing protocol. Power qualification, timing stability and performance are not inferred from these correctness runs.

## Compared behavior

The [audit](audit.json) repeats the [Task46 comparison contract](../task46-editor-correctness-20261026/README.md): fixed canvas images, ordered numeric transforms/bones/morphs, object/quality/pass metadata, history and undo/redo, exact bounds and scene shape, runtime loader-normalized weights, pointer translate/rotate/scale gizmos, multi-selection, focus, synchronous public world reads, light/shadow/visibility controls and native timeline operations. UI and programmatic checks remain distinct; the UI suite completes actions that the check suite labels as not yet replayed by that suite.

Four `paused.time` pairs retain the existing bounded exception: the UI waits for native play to advance and then clicks pause, so wall-clock positions need not be equal. All original/candidate values are retained and required to satisfy `0.05 < time < duration`, paused=true and running=false. Fixed 0.25/0.75 scrub poses, time-scale, stop/restart and clip-switch semantics remain compared. No other numeric equality exception was added. The comparison tolerance is `abs(candidate-original) <= 1e-10 + 1e-12*abs(original)`; observed differences are zero.

Full scene exports and their generated public Three.js UUIDs are preserved byte-for-byte. UUID equality and complete scene JSON equality are not correctness oracles. Full UI screenshots remain contextual evidence; fixed canvas PNGs are the image oracle. Finite correctness does not establish complete Three.js compatibility, every possible app interaction or ownership advancement.

## Preservation and privacy

`canonical/` contains the six datasets; `logs/` retains all six process logs. `archive-index.json` covers 270 payloads and 10,467,288 stored bytes, including every raw JSON, network/served-file inventory, complete scene export, source/adaptation hash, original/served HTML, patch, fixed PNG and UI screenshot. JSON is losslessly gzip-compressed; append `.gz` to resolve a logical `.json` file. No raw capture or earlier archive was overwritten. There were no failed capture attempts in this six-dataset input; earlier Task46 failures remain in the earlier archive.

No privacy normalization was needed or performed. Original and decoded/public/stored byte hashes are recorded separately; decoded bytes equal original bytes exactly, preserving every numeric token, string, UUID and negative zero. The builder allows UUIDs only in reviewed E1/E2 public scene identity/reference fields under scene/camera, and rejects unexpected UUIDs, private paths and system identity metadata. It does not weaken the separate profile archive helper's stricter UUID rule. Files are bounded below 100,000,000 bytes. Original hashes and complete source listings were rechecked after archival.

The archive-local verifier checks every payload hash, candidate/app/tool pins, entry HTML hashes, route-local completion and GPU boundaries, then independently repeats all 72 cross-route comparisons and four bounded exceptions. It uses only Python's standard library and does not execute the application or browser. README, audit, builder/verifier/tests, build status and notices are support files; `derived-files.json` records support hashes separately from copied payloads.

## Reproduction

Use a fresh destination after all six datasets are terminal. The builder includes all six route logs if present and rejects unexpected files rather than silently excluding them.

```sh
python3 bench/results/task49-editor-single-correctness-20261026/build.py \
  --root "$TOOL_ROOT" --input work/task49-editor-single-correctness-001 \
  --out "$FRESH_ARCHIVE"
python3 bench/results/task49-editor-single-correctness-20261026/verify.py \
  --archive "$FRESH_ARCHIVE" --out "$FRESH_AUDIT_JSON"
python3 bench/results/task49-editor-single-correctness-20261026/verify.py
python3 bench/results/task49-editor-single-correctness-20261026/test_build.py
```

Without `--out`, the verifier compares its recomputed result with saved `audit.json`. With `--out`, it writes only a fresh JSON destination. The builder never overwrites an archive and retains partial payload indexes on an archival error. Four bounded archive regression tests passed: public scene UUID retention, unexpected privacy rejection, exact decoded bytes/fresh destinations/failed archive preservation, and pending-capture rejection. The tests exercise only temporary files. Rebuilding produces copied payloads/index/status; preserve this support bundle separately.

The [Three.js MIT and RobotExpressive CC0 notices](licenses/) are retained. The unchanged asset's known weight-conformance failure remains; runtime normalized-weight checks do not imply that the source asset passed its validator. This evidence does not resolve A/A instability or qualify CPU/FPS performance.
