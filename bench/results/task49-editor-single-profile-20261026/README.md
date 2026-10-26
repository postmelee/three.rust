# Task #49: single-node candidate Editor profiles, 2026-10-26

This archive preserves the first native Editor profiles of the single-node preparation fast path. It verifies diagnostic evidence and finite correctness; it does not establish a stable primary CPU reduction, FPS gain or ownership advancement. Every active candidate submission still uses renderer fallback.

| Logical directory | Preserved result | Runs | Samples |
|---|---|---:|---:|
| `smoke/` | Tool smoke capture | 3 | 38,037 |
| `full/` | Diagnostic CPU capture | 9 | 684,661 |
| `smoke-analysis-001/` | Valid source-aware analysis | 3 | 38,037 |
| `full-analysis-001/` | Valid source-aware analysis | 9 | 684,661 |

There is no invalid analysis in this archive. The [earlier candidate archive](../task49-editor-profile-20261026/README.md) separately retains its first invalid subsystem classification and corrected analysis-002. New `updateSingle` frames remain classified as `facade operation preparation`; a function rename is not counted as eliminated preparation work.

## Exact pins and conditions

- Candidate: `85e2c5d500edb0b92ea4ecb997087fded3fed45b`.
- Capture and analysis tooling: `e9b736a47f48bc2512476f8966d285d0153419f7`.
- Editor: `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`.
- Preserved comparison candidate: `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb`.
- Committed protocol: [candidate-protocol.json](candidate-protocol.json), SHA256 `740288d46cbb0c783a536cc45363ddeef25a134c7f14b5eea25be91b47f1dad3`.
- Full capture UTC: 2026-10-26T02:57:25.447Z through 2026-10-26T03:01:48.468Z.

Chrome 155.0.8059.86 ran headed from `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, on macOS 26.5.2 build 25F84, hardware ANGLE Metal / Apple M4 Pro. AC power, power mode 0, and clean unchanged source pins are recorded before and after. Actual Chrome arguments and full display/power metadata are preserved. The presence of an unsafe-SwiftShader launch flag is not treated as evidence of its use: the recorded renderer is hardware Metal.

The E3 root-selected native Walking scenario keeps shadows, native autosave, page DPR1 and renderer DPR1. The page is 1280×720 and the app canvas 930×378, with the same Task46 camera, framing, four skins, three morph meshes, fourteen clips and 7,214 vertices. Full profiles use three rotated route orders, 600 native warmup frames, a requested 12-second sample window, requested 100µs interval and separate two-second observations before and after. Heavy timing overlays, boundary wrappers, GPU queries and Debugger source retrieval are disabled during sampling. The profiler and passive observer remain active, with uncalibrated overhead.

[INDEPENDENT_AUDIT.md](INDEPENDENT_AUDIT.md) records raw accounting, source binding, sample gaps, finite correctness and limits. The [before/after comparison](comparison.json) verifies identical configuration/orders, twelve fixed poses with 93,996 ordered numerical values and identical PNG bytes, plus unchanged per-frame fallback/materialization/call ratios. Sample windows differ in wall time and frame count; these records are not a frame-matched primary comparison.

## Storage and privacy

`archive-index.json` maps 3,154 logical files to 347 content-addressed gzip blobs, storing 6,143,434 compressed bytes. Every raw capture and analysis file is represented, including all samples, source/debug bytes, oracle PNG/JSON, environment, browser arguments, manifests, errors, overlays and patches. Deduplication changes storage only. The blob name is the SHA256 of its uncompressed public bytes.

Every logical record separately retains original, decoded-original, public and stored-gzip hashes and byte counts. Four environment metadata files normalize only the battery instance identifier string; original local files remain untouched. Numeric, boolean and null values and their JSON paths pass recursive equality and fingerprint checks. Executed source, source patches, PNGs and Wasm bytes are unchanged. Unexpected UUID or hostname/serial fields fail closed for review; no such additional field required normalization. Files and decompressed inputs are bounded below 100,000,000 bytes.

The builder rechecks original hashes and complete listings after archival. The Node verifier checks every payload and can recheck original sources. `verify.py` independently derives weighted sample/node accounting, source/script bindings, Wasm names, phase/counter ratios and oracle pixels/numerics; it compares arithmetic and source coverage against valid analysis-001 without importing the JS analyzer. `compare.py` compares the two immutable public archives and explicitly checks the new `updateSingle` category. The broader subsystem classifier remains heuristic.

The README, audit, Python verifiers, protocol, setup fingerprint, notices and derived JSON are support files outside the payload index; `derived-files.json` records their hashes. The index SHA256 is `08ed998fe02d6c6a7c2e3b875f1ed07124a4423ebcebdc0472bf547970d15261`.

## Reproduction

Use the exact committed capture tool and candidate, prepared pinned apps, a quiet hardware session and a fresh dedicated output. Capture reproduction has this form:

```sh
caffeinate -di node scripts/apps/candidate-profile.mjs "$APPS_ROOT" \
  "$FRESH_OUT/task49-editor-single-profile-full-001" mode=full \
  candidateRoot="$CANDIDATE_ROOT" \
  candidateSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b \
  protocol=mydocs/plans/task_m6_49_editor_protocol.json
```

The smoke uses `mode=smoke` and its own fresh `task49-editor-single-profile-smoke-001` output. The committed protocol pins both profiles and future timing; it does not make this profile a timing qualification. Build the archive only after captures and analyses are terminal:

```sh
node scripts/apps/archive-candidate-profile.mjs build \
  --root "$TOOL_ROOT" --out "$FRESH_ARCHIVE" \
  --input smoke=work/task49-editor-single-profile-smoke-001 \
  --input full=work/task49-editor-single-profile-full-001 \
  --input smoke-analysis-001=work/task49-editor-single-profile-smoke-analysis-001 \
  --input full-analysis-001=work/task49-editor-single-profile-full-analysis-001

node scripts/apps/archive-candidate-profile.mjs verify \
  --out bench/results/task49-editor-single-profile-20261026
python3 bench/results/task49-editor-single-profile-20261026/verify.py
python3 bench/results/task49-editor-single-profile-20261026/compare.py
```

Add `--source-root "$TOOL_ROOT"` to the Node verifier to recheck untouched originals. Add `--extract "$FRESH_PUBLIC_COPY"` to materialize the complete normalized logical tree. Python tools accept `--out "$FRESH_JSON"` for new audit outputs and never overwrite an existing output. `compare.py` uses the sibling baseline archive by default, or accepts `--baseline`. The archive builder produces raw/index/status files; preserve this support bundle separately when regenerating it.

[MIT and RobotExpressive CC0 notices](licenses/) are retained, including embedded third-party source notices. The earlier asset weight-conformance limitation is unchanged. This archive supplies no Viewer candidate result, A/A stability resolution, additional-day replication or primary-performance qualification.
