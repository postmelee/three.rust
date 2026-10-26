# Viewer callback timing evidence — Task #49

The finite engine and migration matrices completed, and independent raw/source/oracle verification passed. **All four engine original A/A screens and both migration original A/A screens failed.** These observations do not establish a qualified speedup, a Rust advantage, FPS improvement or new ownership progress.

The [independent audit](INDEPENDENT_AUDIT.md) contains complete CPU p50/p95/p99, Viewer/GUI components, rAF and callback-start intervals, absolute/relative comparisons, A/A and matched-JS repeat counts, preserved version differences and limitations. [audit.json](audit.json) retains the per-run derivations. Engine and migration sessions must stay separate: pure-r186 Walking/grid-off p50 changed from 0.472500 ms to 0.990000 ms between them; the cause remains unresolved.

## Exact identity and conditions

| Item | Recorded identity / condition |
| --- | --- |
| Runtime | `85e2c5d500edb0b92ea4ecb997087fded3fed45b` |
| Capture tooling | `42121c8ff9bc4e83a65991072a03d9514ce5823c` |
| Viewer upstream | `b5ee5dafe27f953ae1b55f42b5fa3697fef08683` (MIT) |
| Three versions | Engine comparison 0.186.1; separate migration original/external 0.176.0 → pure 0.186.1 |
| Robot fixture source | Editor `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`; RobotExpressive 463,988 bytes, SHA-256 `047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319` (CC0) |
| Engine protocol SHA-256 | `8cd25f2342e855d6ade425302b7da159b15f3f2acf2ad51ffaac77d3d2dab28d` |
| Migration protocol SHA-256 | `696888f5b6f01b76c213d4286d580f6f0c3be7eb72ecd5d7cd2327d9c9805ef3` |
| Prepared native manifest SHA-256 | `954c67cb23bc135213eb4085a014f5669bb202b016b06634cbe400944373571e` |
| Prepared timing manifest SHA-256 | `d1b3760063f6e370c5a0ab03b98026063851fe91ddb6ea5434531d42ebf36c82` |
| Bundled-r176 timing manifest SHA-256 | `7a5311c3c9e898f7c1fb7fb943990fdc3e32a48e6e5f95296dbbd8f8560519d1` |
| Prepared build | Node v24.15.0 / Vite 6.4.2; fixed source/package/lock/dependency inventories, original and adapted files, full patches and outputs preserved |
| Host | Apple M4 Pro, 12 logical CPU cores, 24 GiB memory; macOS 26.5.2 build 25F84 |
| Actual Chrome | `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, 155.0.8059.86; headed, one process with sequential fresh contexts per session |
| GPU | ANGLE Metal / Apple M4 Pro on both renderers; not SwiftShader |
| Power/display | AC before/after, power mode 0; internal 3024×1964 physical / 1512×982 logical display at reported 120 Hz |
| Page/quality | CSS viewport 1280×720, page DPR1; renderer DPR1 except higher-resolution DPR2; original cameras, lighting, native grids and GUI preserved |
| Full settings | Four balanced rounds, 600 warmup / 1,200 measured groups, four 300-group blocks per run; K=4 native callbacks |
| Smoke settings | One round, 10 warmup / 30 measured groups, 10-group blocks; tooling evidence only |

Runtime/tool/Viewer sources were clean and unchanged before and after each session. Browser argv, GPU attributes, power/thermal/display snapshots, exact preparation and protocol bytes are retained in each logical capture. The timing tool uses existing hashed runtime build files; this archive does not independently rebuild or certify their source correspondence. It contains no profiler samples and does not combine profile weights with primary timing.

Full engine capture: 2026-10-26T05:06:56.484Z–05:26:05.250Z, 72 runs / 86,400 measured groups. Full migration: 05:29:14.697Z–05:38:43.797Z, 36 runs / 43,200 groups. The separate smoke sessions preserve 24 / 12 runs respectively. All original captures and failed archive-verifier attempts are retained.

## Execution and reproduction

The following are the **executed command shapes, with equivalent option ordering**. Absolute local paths are represented by variables; shell argument ordering was not separately captured verbatim. `APPS_ROOT` contains the pinned prepared Viewer; `RUNTIME_ROOT` is the clean runtime above. `NATIVE_PREPARED`, `TIMING_PREPARED` and `BUNDLED_TIMING_PREPARED` correspond to the exact manifests above. Run the frozen tool commit in its own clean checkout and use a new result directory each time. `contents=` was not supplied: the default pinned Robot fixture was used.

```sh
caffeinate -di node scripts/apps/viewer-timing.mjs "$APPS_ROOT" "$NATIVE_PREPARED" work/task49-viewer-robot-timing-smoke-001 runtimeRoot="$RUNTIME_ROOT" runtimeSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b mode=smoke group=engine protocol=mydocs/plans/task_m6_49_viewer_protocol_robot-timing.json timingPrepared="$TIMING_PREPARED"
caffeinate -di node scripts/apps/viewer-timing.mjs "$APPS_ROOT" "$NATIVE_PREPARED" work/task49-viewer-robot-timing-full-001 runtimeRoot="$RUNTIME_ROOT" runtimeSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b mode=full group=engine protocol=mydocs/plans/task_m6_49_viewer_protocol_robot-timing.json timingPrepared="$TIMING_PREPARED"
caffeinate -di node scripts/apps/viewer-timing.mjs "$APPS_ROOT" "$NATIVE_PREPARED" work/task49-viewer-migration-timing-smoke-001 runtimeRoot="$RUNTIME_ROOT" runtimeSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b mode=smoke group=migration protocol=mydocs/plans/task_m6_49_viewer_protocol_migration-timing.json timingPrepared="$TIMING_PREPARED" timingOriginal="$BUNDLED_TIMING_PREPARED"
caffeinate -di node scripts/apps/viewer-timing.mjs "$APPS_ROOT" "$NATIVE_PREPARED" work/task49-viewer-migration-timing-full-001 runtimeRoot="$RUNTIME_ROOT" runtimeSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b mode=full group=migration protocol=mydocs/plans/task_m6_49_viewer_protocol_migration-timing.json timingPrepared="$TIMING_PREPARED" timingOriginal="$BUNDLED_TIMING_PREPARED"
```

CPU here is synchronous callback elapsed duration measured with performance.now(), not thread CPU time or cycles. The callback envelope includes Viewer.animate plus all native GUI listening callbacks; it excludes asynchronous browser/compositor/GPU work. Measurements and profiling/compilation/offline analysis were separated. Native mixer time follows actual rAF arrival; dynamic phases are not artificially frame-matched. Instrumentation overhead is uncalibrated.

## Lossless archive and offline audit

[archive-index.json](archive-index.json) maps every logical file to its content-addressed blob, original source path relative to the repository, original/decoded-source/public/stored SHA-256, byte sizes and field-specific normalization notes. All 7,522 logical files are preserved in 935 blobs, totaling 27,306,606 unique stored bytes. The largest blob is 1,054,343 bytes. Deduplication changes storage only; it does not select measurements. Eight runner power-output strings had battery instance IDs redacted; numeric tokens, types, values, signs and ordering remain unchanged. Raw source, patch and image bytes are unchanged.

The archive includes all arming/warmup/measured callbacks, incomplete/unavailable fields, per-run measurements, source/served inventories, actual JS/Wasm sources, preparation trees/patches/maps, browser/GPU/environment, numerical/image oracles and licensing. Exact native pages and instrumented pages remain distinguishable. Original-r176→pure-r186 numerical/image/layout differences are retained under the prospective non-strict migration comparison; native-versus-instrumented checks remain strict for each route.

After all browser captures end, from the repository root:

```sh
ARCHIVE=bench/results/task49-viewer-timing-20261026
python3 "$ARCHIVE/verify.py"
python3 "$ARCHIVE/test_analyze.py"
python3 "$ARCHIVE/test_verify.py"
# Optional: a fresh destination restores the normalized public logical tree.
python3 "$ARCHIVE/verify.py" --extract "$FRESH_RESTORED_DIRECTORY"
```

The verifier independently reconstructs raw groups, per-run quantiles, phase/render/counter work, complete balanced order, original A/A, independent JS/Wasm repeat screens, direct migration contrasts and adoption budgets. It checks source/preparation hashes and full adaptation patches, strict numerical/semantic oracles, PNG bytes/dimensions, recorded pixel hashes and exact import-map changes. It does not recreate WebGL readback or prove CPU cycles/whole-frame acceleration. The full raw audit, 18 synthetic numeric tests and 11 privacy/storage/oracle mutation tests passed; the small extraction test passed. A full extraction is optional and was not needed for the hash/numeric audit.

To build a fresh equivalent archive from the preserved source captures (the three preparation roots are explicitly pinned in `archive.py`):

```sh
python3 "$ARCHIVE/archive.py" --root "$REPOSITORY_ROOT" --out "$FRESH_ARCHIVE" --verifier "$ARCHIVE/verify.py" \
  --suite engine-smoke=work/task49-viewer-robot-timing-smoke-001 \
  --suite engine-full=work/task49-viewer-robot-timing-full-001 \
  --suite migration-smoke=work/task49-viewer-migration-timing-smoke-001 \
  --suite migration-full=work/task49-viewer-migration-timing-full-001
# The builder emits payloads/index and verifier. Copy these analysis support files
# beside it, then verify without using the captured JavaScript analyzer.
cp "$ARCHIVE/analyze.py" "$FRESH_ARCHIVE/analyze.py"
python3 "$FRESH_ARCHIVE/verify.py" --out "$FRESH_AUDIT_JSON"
python3 "$ARCHIVE/render_report.py" "$FRESH_AUDIT_JSON" "$FRESH_REPORT_MARKDOWN"
```

The builder refuses existing destinations, rechecks all original hashes and listings after copying, and leaves a failure status/partial index if archival fails. [verification-attempts.json](verification-attempts.json) and [verification-logs/](verification-logs/) preserve the initial listing-order assertion and the two corrected verifier assumptions. These were offline tooling failures, not discarded capture attempts; the source data and performance criteria did not change. Logs use `.txt` to avoid repository log-ignore rules.

## Licenses and missing qualification

Viewer and Three.js MIT notices and the RobotExpressive CC0 notice are preserved under [licenses/](licenses/). The original Robot asset retains its upstream validator findings (752 weight-normalization errors and four skin warnings); runtime normalization does not repair or replace the original file. The original app/dependency preparation and additional correctness evidence remain in [Viewer correctness](../task49-viewer-correctness-20261026/README.md) and [Viewer profile evidence](../task49-viewer-profile-20261026/README.md).

A stable original baseline, dedicated matched-JS A/A, larger CPU-heavy workloads, startup/transfer/memory, long interaction, additional features and cross-hardware/browser/day validation remain open. Neither the finite unsuccessful adoption screen nor successful raw verification establishes complete Three.js replacement compatibility.
