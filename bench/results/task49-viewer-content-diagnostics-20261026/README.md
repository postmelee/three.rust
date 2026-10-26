# Original-content failures and transport diagnostics — Task #49

This archive preserves thirteen selected earlier Viewer attempts without changing their recorded outcomes. Independent evidence verification passed. **It is not an application performance result or a resolved transport fix.** Subsequent five-route content gates and profiles belong to separate evidence bundles.

The [independent audit](INDEPENDENT_AUDIT.md) lists every original status and source SHA, retained request failures, fixed-pose observations, header/cache checks and limitations. [audit.json](audit.json) contains the derivations. There are 19 native route records: three passed and sixteen failed. The separate BIN probe and two-mode network guard are not scene or candidate qualification.

The proxy-Playwright original Chess condition passed in attempt001 and failed in attempt002. Both proxy+remote-CDP original-r176 attempts in this bundle passed. This is bounded diagnostic evidence: neither the proxy nor CDP is established as a universal remedy, and the Chromium/Playwright cancellation mechanism remains unresolved. Complete cached/caller-visible payloads do not erase `ERR_ABORTED` or change historical strict failures into passes.

## Source identity and scope

- Viewer: `b5ee5dafe27f953ae1b55f42b5fa3697fef08683`, original Three.js 0.176.0 with separate external-r176, pure-r186 and candidate routes where actually captured.
- Candidate when supplied: `85e2c5d500edb0b92ea4ecb997087fded3fed45b`, Three.js 0.186.1. Original/external r176 metadata correctly records no runtime Git identity.
- Initial five-route gates: tool `fbeb5b2a327e5ebd5eb5eebbaa09a453c5b1bdd4`.
- Passive CDP follow-ups: `3d7453d5a509ac93212a31fd1cc2678e89d77c2b`.
- One-file transport probe: `42121c8ff9bc4e83a65991072a03d9514ce5823c`.
- Default/content-length framing pair: `ecf353ed9cfecdf7a0d2070ef7d84b769053b352`.
- Browser guard and proxy diagnostic pairs: `6e9e857748ec0c5380430026b7c24ca8bf6726f3`.

Every actual result's source/helper identity is preserved separately. The browser guard JSON lacks its own tool SHA. [guard-invocation.json](guard-invocation.json) explicitly distinguishes the capture owner's recorded clean-checkout invocation from fields absent in that JSON; the exact committed test source and stdout are preserved. No field was backfilled into original evidence.

The archive retains actual headed Chrome 155.0.8059.86 environments, browser paths, viewport/DPR, Apple M4 Pro / ANGLE Metal contexts when created, and unchanged source inventories. These correctness diagnostics include `isolated:false`; primary timing's isolation requirements are not imposed retrospectively. No CPU, frame-interval, power-controlled timing or GPU throughput claim follows. The single-BIN probe creates no app scene.

## Asset provenance and licenses

Original asset payloads are intentionally not duplicated:

| Content | Exact source | Original referenced payloads | License |
| --- | --- | ---: | --- |
| Bistro Exterior | `qian-o/GLTF-Assets@816a1d6533c55787b3fabc9b75660c0d0c57ebc6` | 407 files / 546,272,742 bytes | CC-BY-4.0; Amazon Lumberyard / NVIDIA ORCA, conversion by qian-o |
| A Beautiful Game | `KhronosGroup/glTF-Sample-Assets@8f492390ddc7a2ae221a1369ef560589cf8c70fb` | 35 files / 29,805,749 bytes | CC-BY-4.0; Moeen and Mujtaba Sayed / SideFX, ASWF / MaterialX, glTF conversion by Ed Mackey |

Pinned fetch manifests are indexed under `asset-provenance/`; exact upstream notices are also visible under [notices/](notices/). Their original encoding and bytes are preserved. Viewer and Three.js MIT notices remain included. See the earlier [content acquisition archive](../task49-content-preparation-20261026/README.md) for retrieval and validator evidence.

The native cached ABeautifulGame.bin observation is 10,829,440 bytes with SHA-256 `727eea28752b2b0c35cad89e726f0bc6a1800c3fa8696867ccf3d0c39933f5fb`. Verification compares recorded cache/caller digests with the pinned manifest. It does not independently rehash browser buffers absent from the archive. Executed JavaScript/Wasm source blobs are retained and are distinct from omitted original scene assets.

## What was verified

- Every original file from all thirteen selected output trees, captured source hashes and exact HTML transformations; thirty helper/test sources are bound to captured hashes or the explicitly documented guard source commit.
- Saved fixed-pose repeats: 20 pairs, 916,476 ordered numerical comparisons, maximum absolute difference zero and identical paired PNG bytes. The full bundle contains 110 PNG files. Partial fixed-pose equality does not override an overall route failure.
- Available authored node/parent/primitive and material-image/UV semantics under each capture's schema. Older Chess association-index failures remain failures and are not interpreted as proof of missing authored pieces/images; later semantics are a separate contract.
- Before/after-close CDP prefixes, known content versus all request failures, native request events, framing headers, pinned cached-BIN checksums and the separate probe's request/terminal/callback timing arithmetic. Unknown/unmatched navigation failures remain unresolved.
- Four exact-payload single-file trials, each with one request and one `loadingFinished` terminal; two browser guard modes with two permitted payloads, three denied targets and no unexpected connection.

The archive preserves all failed attempts and partial/unavailable records. No retries replace earlier evidence. The complete original raw data remains in its fresh local output directories.

## Public archive and offline reproduction

[archive-index.json](archive-index.json) maps 845 logical files to 371 content-addressed gzip blobs: 808 original output files, thirty committed tool sources, two asset fetch manifests and five notices. Unique stored payload size is 8,988,202 bytes; the largest blob is 440,803 bytes. Duplicate storage is shared without dropping any logical file.

Each logical file records original, decoded-original, normalized-public and stored SHA-256 plus byte sizes. Thirteen metadata files needed either an explicit error-path normalization or a browser-generated nonce redaction in a denied time-service query URL. Numeric tokens/types/values/signs, field ordering, source and image bytes, request IDs, timestamps and failed statuses remain unchanged. Public scene/CDP identifiers are preserved. [derived-files.json](derived-files.json) binds support artifacts and logs; logs use `.txt` so repository `*.log` rules cannot silently omit them.

From the repository root, after browser measurements finish:

```sh
ARCHIVE=bench/results/task49-viewer-content-diagnostics-20261026
python3 "$ARCHIVE/verify.py"
python3 "$ARCHIVE/test_verify.py"
# Optional: restore the public logical tree to a fresh directory.
python3 "$ARCHIVE/verify.py" --extract "$FRESH_RESTORED_DIRECTORY"
```

To rebuild from the unchanged thirteen local output trees and the recorded Git objects:

```sh
python3 "$ARCHIVE/archive.py" --root "$REPOSITORY_ROOT" --out "$FRESH_ARCHIVE"
cp "$ARCHIVE/archive.py" "$ARCHIVE/verify.py" "$FRESH_ARCHIVE/"
python3 "$FRESH_ARCHIVE/verify.py" --out "$FRESH_AUDIT_JSON"
python3 "$ARCHIVE/render_report.py" "$FRESH_AUDIT_JSON" "$FRESH_REPORT_MARKDOWN"
```

The builder has an explicit fixed input list, refuses an existing destination and copies no source asset directory. It rechecks original file hashes and complete file listings after copying; failures leave status and partial-index evidence. Scripts require only Python 3.10+ and local Git objects. They do not launch Chrome, build the engine, download assets or modify captures.

The final independent audit and fifteen pure unit/mutation tests passed. A full archive extraction is optional; the bounded extraction/overwrite test passed, while all decoded blob bytes were already hash-checked without materializing a second large tree. Verification logs preserve two corrected verifier assumptions: differing Bistro/Chess fetch-manifest field names, and correctness windows' actual isolation setting. Those corrections changed neither raw output nor gate status. [verification-attempts.json](verification-attempts.json) records the sequence.

## Browser reproduction templates

The original command-line argument order was not captured in each result. These are equivalent reproduction templates; use the exact tool SHA associated with the desired attempt, its pinned native preparation, original asset root, and a new output directory. The preserved result/source establishes actual selected routes and diagnostic options; do not run a later tool under an earlier label.

```sh
node scripts/apps/viewer-content-check.mjs "$APPS_ROOT" "$NATIVE_PREPARED" "$NEW_OUT" content=bistro contentRoot="$BISTRO_ROOT" runtimeRoot="$RUNTIME_ROOT" runtimeSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b
node scripts/apps/viewer-content-check.mjs "$APPS_ROOT" "$NATIVE_PREPARED" "$NEW_OUT" content=beautiful-game contentRoot="$CHESS_ROOT" runtimeRoot="$RUNTIME_ROOT" runtimeSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b
# Original-route passive transport follow-up, using its own frozen source:
node scripts/apps/viewer-content-check.mjs "$APPS_ROOT" "$NATIVE_PREPARED" "$NEW_OUT" content=beautiful-game contentRoot="$CHESS_ROOT" routes=original-r176
node scripts/apps/viewer-transport-probe.mjs "$APPS_ROOT" "$NATIVE_PREPARED" "$CHESS_ROOT" "$NEW_OUT"
# Each framing/guard condition requires a separate fresh run.
node scripts/apps/viewer-content-check.mjs "$APPS_ROOT" "$NATIVE_PREPARED" "$NEW_OUT" content=beautiful-game contentRoot="$CHESS_ROOT" routes=original-r176 diagnosticContentLength=false
node scripts/apps/viewer-content-check.mjs "$APPS_ROOT" "$NATIVE_PREPARED" "$NEW_OUT" content=beautiful-game contentRoot="$CHESS_ROOT" routes=original-r176 diagnosticContentLength=true
node tests/viewer-transport-guard-browser.mjs "$NEW_OUT"
node scripts/apps/viewer-content-check.mjs "$APPS_ROOT" "$NATIVE_PREPARED" "$NEW_OUT" content=beautiful-game contentRoot="$CHESS_ROOT" routes=original-r176 networkDiagnostic=proxy-playwright
node scripts/apps/viewer-content-check.mjs "$APPS_ROOT" "$NATIVE_PREPARED" "$NEW_OUT" content=beautiful-game contentRoot="$CHESS_ROOT" routes=original-r176 networkDiagnostic=proxy-cdp-remote
```

These original-route diagnoses do not qualify large-scene candidate correctness or performance. Stable measurement, lifecycle/memory, broader app behavior and cross-hardware/browser/date gates remain open.
