# Bistro native Viewer profile evidence — 2026-10-26

This is a diagnostic archive for the unchanged authored Bistro content loaded through the pinned Viewer's native file input, SimpleDropzone ZIP handling and `App.load`. It preserves a failed AC preflight, the subsequent smoke run, complete engine-group raw profiling, incomplete migration-group raw profiling, their strict analysis failures and secondary observation-count audits. It does not qualify a candidate, establish CPU p50/p95/p99, rank route speed, measure GPU cost or claim an FPS improvement.

The runtime identity supplied to the harness is `85e2c5d500edb0b92ea4ecb997087fded3fed45b`. The upstream Viewer is `b5ee5dafe27f953ae1b55f42b5fa3697fef08683`. Original-r176 executes the upstream bundled Three.js 0.176.0; external-r176 is a distinct same-version externalization control. The engine group compares pure Three.js 0.186.1 with the matched JavaScript and Rust-Wasm facade routes. Merely passing a runtime identity to the original route does not make that original application execute the candidate.

## Preserved attempts

| Logical prefix | Original work directory suffix | Result and limitation |
|---|---|---|
| `smoke-ac-failure` | `viewer-bistro-zip-profile-smoke-001` | AC preflight failed; zero oracles and profiles. |
| `smoke` | `viewer-bistro-zip-profile-smoke-002` | Six oracle entries and three raw profiles; smoke only. |
| `smoke-partial-weighted` | `viewer-bistro-zip-profile-smoke-analysis-001` | Old strict analyzer wrote the pure route report, rejected a negative JS interval and stopped before Wasm; no summary was produced. The surviving pure report is not selected evidence for a route comparison. |
| `engine-full` | `viewer-bistro-zip-engine-profile-full-001` | Six oracle entries and nine complete raw captures across three routes and rotated rounds. |
| `engine-strict` | `viewer-bistro-zip-engine-profile-full-analysis-001` | All nine weighted analyses fail on raw negative intervals; zero valid weighted reports. |
| `engine-counts` | `viewer-bistro-zip-engine-count-analysis-001` | Nine secondary count reports, 803,950 observations; the 75 negative intervals and original ordering remain unchanged. |
| `engine-count-audit` | `viewer-bistro-count-audit-001` | Independent Python count/source audit, including its two earlier schema/label implementation failures and retained attempt sources/logs. |
| `profile-validity` | `viewer-bistro-profile-validity-001` | Retained diagnostic JSON. Its generating script was not retained; this is explicitly not a separately reproducible program. Raw intervals are independently inventoried by this archive's verifier. |
| `migration-full` | `viewer-bistro-zip-migration-profile-full-001` | Six oracle entries pass. Original-r176 sequence 1 captured; external-r176 sequence 2 saved a raw profile but failed its after-window activity gate. Remaining seven scheduled profiles were not attempted. |
| `migration-strict` | `viewer-bistro-zip-migration-profile-analysis-001` | Original-r176 weighted analysis fails; external-r176 is not analyzed, and the migration capture stays incomplete. |
| `migration-counts` | `viewer-bistro-zip-migration-count-analysis-001` | Only original-r176 is source-bound: 102,477 observations. External-r176 is excluded. No migration comparison is available. |
| `migration-count-audit` | `viewer-bistro-migration-audit-001` | Independent original count audit plus excluded external raw structural inventory (95,025 observations); retained initial audit-code schema failure. |

Every suffix above is preceded by `work/task49-`. Every regular file in these twelve original directories is retained, with a source-file hash and exact file count. The build rechecks both source hashes and directory listings. The original directories and their status records are not modified.

## Conditions, source versions and correctness

Capture tooling is pinned independently from the candidate: smoke `d1def5a2b1845cb0a398bdb5d2528d0fbee69929`, engine full `7d4b24062466b15960fcf3e444fae99003c81f70`, migration full `b33cbb8d7cef1c92fdf475c9e12d830eb1ff7cd1`. Strict engine analysis uses `63be1aa120546fa5517ee75cd8247e8a995351d5`; counts and migration analysis use `b33cbb8d7cef1c92fdf475c9e12d830eb1ff7cd1`. Captures and analyzers record clean source state. Exact files from every recorded `toolHashes` / `analysisTool.hashes` inventory are archived under `tool-sources/<full-sha>/`, checked against `git show` bytes. The independent Python audit scripts and their provenance are preserved separately.

Chrome is `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, product `Chrome/155.0.8059.86`. Recorded GPU contexts use Apple M4 Pro through ANGLE Metal; SwiftShader availability flags in the browser command line are not treated as evidence of the active backend. The root manifests and environment records retain OS, display, power mode, process, browser and command-line metadata. Successful captures have AC verified before and after; the failed initial AC attempt remains failed. DPR is 1, CSS viewport 1280 × 720, main canvas 1280 × 656, neutral environment, grid off, no profiling-window GPU queries. Both native GUI listener loops remain active: Lighting (one controller) and Animation (13 controllers).

The full protocol is archived verbatim under `protocols/`: three rounds, 600 warmup frames, 12-second profile windows, 100 μs requested sampling interval, and separate two-second pre/post observation windows. Smoke uses one round, 60 warmup frames and two seconds. These are diagnostic samples with observer overhead and native timestamps, not isolated primary timing. Boundary snapshots cover a wider interval than `Profiler.start/stop`; their materialization counters are not retained memory or transfer traffic.

Bistro's 13 authored clips, materials and 405 image definitions remain present. The unchanged native default starts only `1. Lantern_Wind_21|Take 001|BaseLayer` (130.7916717529297 seconds, one target); this does not activate every authored clip or establish a high animation workload. The archived readiness checks compare original node names, hierarchy, static transforms, material/texture associations and decoded image readiness with the source manifest. Source/readiness checks and before/after playback/GUI/window/counter validations are reproduced offline.

Each successful capture group retains native and observer fixed-pose oracles at 0.25 and 0.75. The archive verifier decodes RGBA PNGs using the Python standard library, verifies PNG CRC/filtering and matches bottom-up bytes against the recorded `readPixels` SHA. Engine routes and same-route native/observer pairs require strict numeric/image/quality equality. Migration original-r176 ↔ external-r176 is strict; r176 ↔ r186 differences are retained with `strict: false`, never silently recast as equality. These fixed-state diagnostics do not prove equivalence at every native playback time.

Bistro input is a 546,368,051-byte ZIP, SHA-256 `f1a2bcf7049544081bb3a09586ef8802532a59ca1536029a72cb6ab03ba71141`, with preparation-manifest SHA `d522db96e9d3480ef128a1291acfc734bbe85bbd8ebaa1ade22b22a985e370f7`. Native File/Blob URLs are expected. Zero mounted-content HTTP requests in the strict transport logs is consistent with this route; it does not mean no asset bytes were loaded. ZIP creation metadata, original resource hashes, notices and the prior ZIP entry audit are included, but the large ZIP and assets are not duplicated. The offline verifier checks recorded identities and does not reacquire the excluded assets.

## Strict failures and counts interpretation

The strict analyzer rejects negative raw CDP `timeDeltas`. This archive never clamps, sorts, filters, repairs, synthesizes or regenerates those data. All nine engine weighted analyses and the original migration weighted analysis remain failed. Independent integer counts preserve sample node IDs, node order, hierarchy, self/inclusive observations, exclusive buckets, nearest verified context, exact captured source bytes, Wasm function identities and exact source-map positions. Context and inclusive counts overlap; adding them to exclusive counts would double-count.

Counts are observations, not milliseconds or percentages of CPU time. Different sample totals, GC frequency, observer cadence or native pose histories are not route-speed measurements. The recorded analyzer's AST-derived function names are preserved; an independent AST implementation does not reparse them here. Category names are heuristic. Zero attributed GUI samples does not prove zero UI work, and small Wasm counts do not prove end-to-end efficiency.

The migration external raw profile is kept even though the after-window saw a keydown activity change. It has neither `profile-scripts.json` nor `source-map-capture.json`, because strict capture stopped before those steps. Its retained served bytes and raw graph do not reconstruct missing debugger evidence. It contributes no source-attributed count report or performance comparison. There is no complete three-round migration experiment and no claim that another date was repeated.

## Storage, privacy and verification

`archive-index.json` maps logical paths to deterministic gzip blobs under `blobs/<public-sha256>.gz`. Each row records original, decoded original, public and compressed SHA-256 hashes and sizes. `build-status.json` records original-listing/hash rechecks. `support-index.json` binds visible protocols and license copies. `archive-audit.json` contains independently recomputed results. `derived-files.json` binds this archive's verifier, README and audit support files; it is not a source-data replacement.

Only approved metadata is normalized in public copies: battery instance IDs inside runner power-output strings and private home path components in preserved independent-audit traceback logs. Original and public hashes are both retained. Numbers, sample order, source payloads, images, scene IDs and native Blob/CDP UUIDs remain unchanged. More general private metadata fields are explicitly guarded by the builder; unexpected locations fail archival rather than being silently omitted. The originals remain local and unmodified.

Run the offline checks from the repository root:

```sh
python3 bench/results/task49-bistro-profile-20261026/verify.py
python3 bench/results/task49-bistro-profile-20261026/test_verify.py
```

The builder is reproducible only with the original local `work/` inputs, their Git source commits and existing referenced provenance archives:

```sh
python3 bench/results/task49-bistro-profile-20261026/archive.py \
  --root . --out work/bistro-public-archive-fresh
```

It requires a fresh output path and preserves failed build status if interrupted or rejected. The public archive alone is sufficient for the offline blob, raw graph/count, recorded source/map, oracle, phase and historical-failure audits. It does not run Chrome, execute the analyzed application, reproduce hardware timing or install anything. Licenses include Viewer/Three.js/runtime dependencies, the Bistro conversion notices and the unused Robot fixture referenced in prepared manifest inventory; only Bistro is selected in these captures.
