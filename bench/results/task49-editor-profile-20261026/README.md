# Task #49: native Editor candidate profiles, 2026-10-26

**This is diagnostic attribution evidence, not a primary performance result.** The full capture preserves nine profiles across original Three.js, prepared JS and prepared Wasm, using the same native E3 shadow scenario as Task #46. Both candidates continue to use renderer fallback on every active pass. No stable speedup, ownership advancement, whole-browser CPU reduction or FPS gain is qualified.

The [Stage 1 report](../../../mydocs/working/task_m6_49_stage1.md) records the interpretation and next cost-selection decision. The [independent raw audit](INDEPENDENT_AUDIT.md) documents source binding, sample accounting, finite correctness and limits.

| Logical directory | Preserved result | Runs | Samples | Interpretation |
|---|---|---:|---:|---|
| `smoke/` | Original capture | 3 | 38,164 | Tool smoke only |
| `full/` | Original capture | 9 | 685,735 | Separate diagnostic CPU sampling |
| `smoke-analysis-001/` | First derived analysis | 3 | 38,164 | **Invalid subsystem buckets**, retained |
| `full-analysis-001/` | First derived analysis | 9 | 685,735 | **Invalid subsystem buckets**, retained |
| `smoke-analysis-002/` | Corrected derived analysis | 3 | 38,164 | URL classifier correction |
| `full-analysis-002/` | Corrected derived analysis | 9 | 685,735 | URL classifier correction |

Raw capture tooling is `489736e4549083a199babfeea0d6104cf2d45904`; corrected analysis tooling is `ade53795b4880612b38d66c342bc4c7208ad21b0`. The unchanged engine candidate is `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb`, and the pinned Editor is `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`. The original Viewer remains unchanged and is not a Viewer candidate result.

The first classifier mistakenly interpreted the `__rthree` candidate URL prefix as automation. Its source bytes, profiles, per-node self/inclusive arithmetic and source coverage remain usable; do not quote its subsystem buckets or use them for cost selection. Analysis-002 reuses exactly the same captures with the corrected classifier. No new profile was substituted for an unfavorable run.

Both captures retained six oracle pages with two fixed poses per page. Each pose has 7,833 finite numerical values; all non-reference comparisons have zero numerical error and identical PNG/pixel hashes. The original reference PNGs were independently decoded to confirm the recorded WebGL pixel SHA. The setup and two original poses also match the preserved Task #46 shadow evidence. Every candidate observation window records four fallback submissions per native frame, zero prepared passes, 205 paid matrix materializations and 26,240 materialized bytes per native frame; Wasm records 135 native calls per frame. Counts are not CPU durations or GPU-upload measurements.

Chrome 155.0.8059.86 ran headed on hardware ANGLE Metal / Apple M4 Pro with AC power before/after and clean unchanged source pins. Full profiles use three rotated route orders, 600 native warmup frames and approximately 12.13-second profiles at a requested 100µs sampling interval. Actual gap medians are 155–156µs. The 123–134ms maximum gaps are each profile's first `(program)` sample and remain preserved. Sampler/passive-observer overhead is uncalibrated. Endpoint phase/state checks do not establish per-frame pose parity or primary CPU quantiles; before/after cadence cannot calibrate overhead near a display scheduling ceiling.

## Storage and privacy

`archive-index.json` maps **3,172 logical files to 361 content-addressed gzip blobs**, storing 7,707,515 compressed bytes. Every original file is represented, including full profiles, all source/debug byte captures, oracle PNG/JSON, setup/environment, manifests, errors, original/served HTML, complete patches and all four analysis attempts. Deduplication changes storage only. `blobs/<public-sha256>.gz` is named by its uncompressed public bytes.

Every record contains original byte SHA/size, decoded original SHA, public byte SHA/size, stored gzip SHA/size and normalization notes. Four environment metadata files normalize only the battery instance identifier string. Original local inputs are untouched. Numeric, boolean and null values and their JSON paths are recursively checked and fingerprinted; structural changes fail. Executed source, source overlays/patches, PNGs and Wasm bytes are unchanged. Additional home/profile/temp paths are normalized only by the documented metadata policy; unexpected UUID or hostname/serial fields fail for explicit review instead of silently changing scene identifiers. No such additional field required normalization in this archive.

The builder rechecks every source hash and complete source listing after archival. Files and decompressed inputs are bounded below 100,000,000 bytes. The public verifier checks every blob, hashes and logical mapping; `--source-root` also rechecks original sources and numeric invariance. Extraction writes normalized public copies to a fresh directory, never over an original capture.

`verify.py`, `independent-audit.json`, `INDEPENDENT_AUDIT.md`, `task46-setup-fingerprint.json`, `verification.json`, this README and the notices are derived review/support files outside the copied-payload index. `derived-files.json` records their hashes. The independent verifier re-derives raw sample totals, every node's self/inclusive values, source/script bindings, Wasm-name resolution, phase/counter ratios and oracle pixels/numerics without calling the live JS analyzer. It compares arithmetic/coverage against corrected analysis-002; it does not duplicate the heuristic subsystem classifier. The recorded historical fixed-pose cross-check remains in `independent-audit.json`.

## Reproduction

Build the archive only after both captures and all analyses are terminal. These input names identify the preserved attempts; use a fresh output path.

```sh
node scripts/apps/archive-candidate-profile.mjs build \
  --root "$TOOL_ROOT" --out "$FRESH_ARCHIVE" \
  --input smoke=work/task49-editor-profile-smoke-001 \
  --input full=work/task49-editor-profile-full-001 \
  --input smoke-analysis-001=work/task49-editor-profile-smoke-analysis-001 \
  --invalid smoke-analysis-001 \
  --input full-analysis-001=work/task49-editor-profile-full-analysis-001 \
  --invalid full-analysis-001 \
  --input smoke-analysis-002=work/task49-editor-profile-smoke-analysis-002 \
  --input full-analysis-002=work/task49-editor-profile-full-analysis-002

node scripts/apps/archive-candidate-profile.mjs verify \
  --out bench/results/task49-editor-profile-20261026
python3 bench/results/task49-editor-profile-20261026/verify.py
node --test tests/archive-candidate-profile.mjs
```

To audit the untouched local sources too, add `--source-root "$TOOL_ROOT"` to `verify`. To materialize the complete logical tree, add `--extract "$FRESH_PUBLIC_COPY"`. The builder produces raw/index/status files; preserve this review/support bundle separately when regenerating it. The tests cover exact primitive/structure invariance, deduplication, invalid-analysis retention, fresh destinations, incomplete captures, unexpected privacy data, corrupt blobs, changed source/numeric data and path/symlink escape rejection.

Three.js/Editor source retains its MIT notice and RobotExpressive retains its existing CC0 attribution. See [notices](licenses/). Compressed source modules preserve embedded third-party notices. The asset's earlier weight-conformance limitation remains; this archive does not claim a clean asset-validator result. Viewer integration, further engine optimization, A/A qualification, additional dates/devices and primary comparisons remain separate work.
