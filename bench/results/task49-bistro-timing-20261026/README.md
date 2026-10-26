# Bistro native ZIP callback timing — Task #49

The six-run smoke and eighteen-run full Bistro captures completed, and the independent raw/source/oracle audit passed. **Original A/A failed two runs and the Wasm repeat screen failed one run.** The matched-JS repeat screen passed, but it is not a dedicated matched-JS A/A with bookends. The current runtime-85 candidate is not supported for adoption in this scenario, and stable effect size remains inconclusive.

The [independent report](INDEPENDENT_AUDIT.md) preserves CPU p50/p95/p99, callback and rAF intervals, absolute/relative contrasts, thresholds and limitations. Full balanced-run median CPU p50 was 7.9075 ms for pure Three.js, 15.52625 ms for matched JS and 16.14 ms for Rust-Wasm. These are descriptive synchronous callback costs; the A/A failure prevents a stable causal speedup/regression claim. They establish an observed larger covered CPU workload, not CPU/GPU-bound classification or removable headroom. The prior weighted-profile failures remain failed and are not converted into milliseconds using these timing data.

## Frozen comparison and boundary

The engine comparison uses immutable runtime `85e2c5d500edb0b92ea4ecb997087fded3fed45b` and Viewer `b5ee5dafe27f953ae1b55f42b5fa3697fef08683`, with pure Three.js 0.186.1, the matched JavaScript route and the Rust-Wasm route. Capture tooling is `58b7cdce62ab15f1507dd76255840f406cee6287`. The native and timing preparation trees were created by preparation tooling `96b0b4c0e7d55c22c1f2c22955356b9822e67d22`; their manifests, exact source patches and output bytes are retained. No r176 migration is part of this timing matrix.

The frozen protocol SHA-256 is `be967daa44d52689f9f82dbabe7f9e9d107abc3447bdda5ce1f5e1cae36a2651`. Both captures retain six native/timed oracle entries; smoke completed six runs and full completed eighteen. The full audit accounts for 21,600 measured groups, 32,400 groups including warmup and 54 arming rows. Its callback count is **K=3**: Viewer.animate, the Lighting GUI body and the Animation GUI body. The archived protocol fixes the actual warmup, sample count, rounds, blocks, first authored animation and adoption gates. Smoke tests the tool only. A complete full capture is still subject to baseline A/A, repeat/block stability, quantization and all prospective budget checks.

Reported callback CPU denotes synchronous elapsed time measured with performance.now(), not thread CPU cycles. The boundary excludes asynchronous loading, browser/compositor/GPU work and collector bookkeeping. Native timestamps and mixer phase remain tied to actual frame arrivals; different route runs are not forced to render identical native playback times. Callback timing does not establish whole-frame FPS acceleration.

Bistro is loaded through the original native file input, SimpleDropzone ZIP and App.load. Its original 13 clips and source materials/images remain, while the unchanged default starts the first authored clip only. This content does not imply all clips are active. The archive retains File/Blob source identities, native initial playback, strict transport evidence through closing, source readiness and fixed numeric/image oracles. Zero mounted HTTP requests is expected for native ZIP input and does not mean zero asset work.

## Raw preservation and source evidence

Every explicitly listed capture and independent-audit directory is retained in full. Smoke audit001 failed because the first independent auditor incorrectly equated 407 original resources with 410 ZIP entries; audit002 correctly accounts for two notices and one provenance entry and passes. The failed auditor source and failure record remain alongside the corrected source and successful result. Validation logs from both attempts are retained. A failed attempt is evidence: its status, partial callbacks, source inventory and error are not discarded or repaired. Native oracle pages and instrumented timing pages are labeled separately. The independent raw auditor verifies callback groups, disjoint body sums, phases, render/counter deltas, quantiles, order, A/A and repeat gates. It additionally rejects activity in both warmup and sample, a stricter prospective gate than the capture CLI's sample-only check; no row is removed to satisfy it.

`archive-index.json` uses the prior timing archive's format 2: logical paths map to deterministic gzip blobs and carry original/public/stored hashes and sizes. Deduplication affects storage only. The builder rechecks all original hashes and directory listings after copying and refuses an existing destination. Raw numeric tokens, unavailable values, array order, UUIDs, source bytes and images stay unchanged. Only the documented battery/serial environment strings and reviewed home components in error metadata or audit tracebacks may be normalized. Original and public hashes remain separate.

Capture helper bytes are exported from their exact Git commits and checked against recorded tool hashes. Preparation helpers are exported independently from their own manifest's tooling SHA. The native/timing preparation regular files preserve adapted source, original/adapted patches, bundles, maps, source inventories, lockfiles and warnings. Each tree also has one `source/node_modules` directory symlink to the pinned Viewer checkout. Those two exact links are not traversed: `preparation-links.json` records their original target-string hashes, byte counts and public aliases. Their eleven manifest-listed dependency build-input files, plus original package.json and yarn.lock, are copied separately and bound to the manifest hashes. A complete node_modules installation is excluded; every other symlink is rejected. The verifier checks exact full-file adaptation patches, output bytes, import maps and served JS/Wasm identities. Existing build hashes do not independently certify a reproducible rebuild.

PNG verification uses the Python standard library to validate CRCs, decompress/unfilter RGBA pixels and compare bottom-up bytes with each recorded readPixels hash. This verifies captured image bytes and comparisons, not a fresh GPU rendering. Hardware GPU and environment metadata are retained; actual ANGLE renderer strings, not browser SwiftShader availability flags, determine which backend ran.

The large Bistro ZIP and source assets are excluded. Their original resource identities, ZIP manifest/entry proof, prior ZIP audit and license notices remain. ZIP entries include the original resource files plus notice/provenance entries; those counts are not interchangeable. The offline verifier reads the pinned manifest and checks retained evidence rather than reacquiring the assets.

## Reproduction and offline checks

The first archive builder rejected the two preparation dependency-directory links. Its 327-file partial archive (17,841,813 bytes) was moved intact to a local failure directory. A second builder then mistook the historical builder source privacy-regex literal for a real private path; that 388-file partial archive (18,875,936 bytes) was also moved intact. Both before/after inventories and hashes match. Their exact builder sources, failure status, diagnostic summaries, partial indexes and move inventories are included. The final verifier binds every partial logical record and blob to the final payloads; the complete failed blob trees remain local without a second public copy. The narrow regex exception requires both the historical filename and exact reviewed source hash; real home paths remain rejected. These were archival failures, not discarded measurements. A subsequent exact file-and-directory-link listing check passed for all eleven source trees and exactly two approved links. `archive-executed.py` preserves the builder actually used for the successful payload creation; `archive.py` adds that final link-set check for future reproduction. `source-listing-audit.json` and its checker record the additional observation without altering any source payload.

Public paths and complete source identities are in the index. Local checkout roots are supplied by the operator and never embedded in public metadata. From the repository root, after all captures finish, build a fresh archive with explicit attempt/preparation/evidence inputs:

```sh
python3 "$ARCHIVE/archive.py" --root "$REPOSITORY_ROOT" --out "$FRESH_ARCHIVE" \
  --viewer-root "$PINNED_VIEWER_CHECKOUT" \
  --source-root final="$FINAL_PREPARATION_CHECKOUT" \
  --suite smoke=repository:work/task49-viewer-bistro-zip-engine-timing-smoke-001 \
  --suite full=repository:work/task49-viewer-bistro-zip-engine-timing-full-001 \
  --preparation native=final:work/task49-final-viewer-native-001 \
  --preparation timing=final:work/task49-bistro-timing-preparation-001
```

This is the executed builder command shape, with the evidence arguments abbreviated below and local paths represented by variables. Add every attempted independent audit with `--evidence label=repository:work/<directory>`; archive all failed audits alongside later attempts. The retained evidence labels are `smoke-audit-failed`, `smoke-audit-passed`, `full-audit`, `audit-validation-001`, `audit-validation-002`, `archive-build-failure` and `archive-build-failure-002`; their exact source directories are in the index. Frozen verifier/analyzer/support files are copied after payload creation and bound by `derived-files.json`.

Extraction restores decoded public content. If an original input was gzip-compressed, extraction may recompress it; the compressed byte stream need not equal the original. Original and stored compressed identities remain in the index.

Run the finalized archive offline:

```sh
python3 "$ARCHIVE/verify.py"
python3 "$ARCHIVE/test_storage.py"
# Optional, fresh normalized public extraction:
python3 "$ARCHIVE/verify.py" --extract "$FRESH_EXTRACTED_DIRECTORY"
```

Do not run archival, offline decoding, builds or profiling during primary captures. Valid raw arithmetic is distinct from a stable baseline, a qualified improvement over Three.js and a Rust-specific benefit over matched JavaScript. G1 savings, G2 Rust-over-JS savings and G5 CPU regression budgets all fail descriptively. Baseline instability remains a separate qualification failure. Dedicated matched-JS A/A, startup/transfer/memory, long interaction and cross-device/day replication are unperformed; no ownership or compatibility progress is inferred.
