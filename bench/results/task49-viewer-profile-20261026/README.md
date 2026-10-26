# Task #49: native Viewer profiles, 2026-10-26

This archive preserves four native Robot scenarios on pure Three.js r186, prepared JS and prepared Wasm. All twelve smoke and thirty-six full profiles completed with their fixed correctness/observer gates. These are diagnostic sampled weights, not primary callback CPU measurements, FPS results or adoption qualification.

| Logical suite | Runs | Samples | Capture / analysis tool |
|---|---:|---:|---|
| `smoke/` and `smoke-analysis-001/` | 12 | 150,204 | `fbeb5b2a327e5ebd5eb5eebbaa09a453c5b1bdd4` |
| `full/` and `full-analysis-001/` | 36 | 2,728,100 | `3d7453d5a509ac93212a31fd1cc2678e89d77c2b` |

Candidate runtime is `85e2c5d500edb0b92ea4ecb997087fded3fed45b`; Viewer is `b5ee5dafe27f953ae1b55f42b5fa3697fef08683`. Clean unchanged source and AC power were verified before/after. Chrome 155.0.8059.86 ran headed with hardware ANGLE Metal / Apple M4 Pro. Full capture lasted 2026-10-26T04:42:34.775Z through 04:55:57.735Z. Exact Chrome path/arguments, macOS, display, power/thermal metadata, app/candidate/tool/source hashes and prepared bundle bytes/provenance are retained.

The four cases are static/grid-on, Walking/grid-on, Walking/grid-on at renderer DPR2, and Walking with the native grid-off behavior. Page DPR1 and CSS 1280×720 remain fixed. Main/axes behavior, controls, stats, animation, quality and all three native dat.gui listening loops remain. Each full case has three rotated route repeats, 600 native warmup frames, requested 12-second CPU sampling at 100µs, and separate two-second unprofiled observations before/after. Profiles use the uninstrumented app bundle and passive observer; there is no callback timing overlay or Debugger/source retrieval during sampling. The observer and profiler have uncalibrated overhead.

## Bounded observations

Median active sampled weight over each approximately 12-second profile window is below. Active weighting excludes idle, program/native-unresolved and root pseudo-frames; this is neither per-frame CPU nor an end-user latency measure. These unfavorable candidate observations remain evidence for the separate primary comparison.

| Scenario | Pure r186, ms | Prepared JS, ms | Prepared Wasm, ms |
|---|---:|---:|---:|
| Static, grid on | 518.478 | 884.457 | 893.925 |
| Walking, grid on | 543.322 | 906.160 | 929.331 |
| Walking, DPR2, grid on | 540.711 | 905.156 | 911.817 |
| Walking, grid off | 456.712 | 816.553 | 828.503 |

All repeats and all endpoint windows have **zero prepared-pass deltas**. Grid-on records two renderer fallbacks, 68 public matrix reads and 8,704 materialized bytes per main frame; grid-off records one fallback, 62 reads and 7,936 bytes. Actual Wasm facade calls are 22 and 15 per main frame respectively; prepared-Wasm calls are zero. Startup cumulative prepared counters are not window adoption evidence. The observed workload uses facade state while retaining renderer fallback.

Candidate facade operation preparation remains approximately 16.5–19.1% of active sampled weight by the existing source-aware classifier. These buckets are heuristic after byte/source verification and do not show how much of a function's self weight is removable allocation or arithmetic. Verified dat.gui source-family self weight is zero because conservative exact mapping coverage is limited; this must not be described as zero GUI cost. The full analysis retains 54 exactly mapped profile nodes and 820 generated-node fallbacks without an exact source-map segment. Native/no-script frames and generated attribution remain explicit. Higher resolution alone does not establish GPU limitation.

## Audit, preservation and limits

The [independent audit](INDEPENDENT_AUDIT.md) and [machine-readable result](independent-audit.json) verify raw profile tree/sample/self/inclusive arithmetic, source/CDP/Wasm bindings, exact map points and input/provenance chains, phase/counter deltas and twenty-four fixed oracle sessions per capture. The raw node weights and gaps match the saved analysis. Fixed numeric/action/render/layout outputs and available PNG bytes match across native/observer and engine routes. Natural playback is not frame-matched across routes. Endpoint counters cover CDP start/stop and are wider than the exact sample interval.

All 4,852 logical capture/analysis files are mapped by `archive-index.json` to 649 gzip blobs, storing 12,896,176 bytes. Physical deduplication changes no logical evidence. Every returned sample, source/map/debug payload, oracle PNG/numeric record, failure/error array, network/served inventory, environment and source provenance is retained. Four environment metadata files normalize battery instance strings only; original/decoded/public/stored hashes and numerical fingerprints remain separate. Executed source, source maps, patches and PNG/Wasm bytes are unchanged. Source hashes and complete listings were rechecked. No capture was overwritten, repaired or rerun for archival.

The protocol under `protocols/`, reviewed dependency/Viewer/Three.js/RobotExpressive notices under `licenses/`, and `support-index.json` are additional support evidence. Original asset payloads are not duplicated. An initial verifier's `parsed: null` handling error was preserved, fixed and covered by the seven passing pure tests; it did not affect capture or analysis bytes. Archival command logs have their own explicit path normalization records. `derived-files.json` identifies remaining support hashes separately.

The independent verifier does not reimplement the JavaScript AST parser or prove heuristic subsystem attribution. Inclusive ancestors overlap and must not be summed. Profiler cadence observations do not calibrate CPU overhead. This archive supplies no primary A/A resolution, migration timing result, second asset family, different-device/day replication or product-gate pass.

## Reproduction

The [audit procedure](INDEPENDENT_AUDIT.md) gives fresh archive build/verification/extraction commands. To validate the published evidence:

```sh
node bench/results/task49-viewer-profile-20261026/archive.mjs verify \
  --out bench/results/task49-viewer-profile-20261026
python3 -B bench/results/task49-viewer-profile-20261026/verify.py
python3 -B bench/results/task49-viewer-profile-20261026/test_verify.py
```

To repeat the full diagnostic capture, use the exact clean capture tool/runtime SHA, locked builds, pinned native preparation and a fresh dedicated output in a quiet hardware session:

```sh
caffeinate -di node scripts/apps/viewer-profile.mjs "$APPS_ROOT" "$NATIVE_PREPARED_ROOT" \
  "$FRESH_OUT/task49-viewer-robot-profile-full-001" \
  runtimeRoot="$EXACT_BUILT_RUNTIME_ROOT" \
  runtimeSha=85e2c5d500edb0b92ea4ecb997087fded3fed45b mode=full group=engine \
  protocol=mydocs/plans/task_m6_49_viewer_protocol_robot-profile.json
node scripts/apps/viewer-profile-analyze.mjs "$CAPTURE_ROOT" "$FRESH_ANALYSIS_OUT"
```

The protocol pins diagnostic profiles only; its native preparation hash is not a full timing-bundle pin. Future primary measurements require their own precommitted protocol and exact tool/runtime hashes.
