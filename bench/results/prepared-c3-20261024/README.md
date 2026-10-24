# C3 prepared main-pass evidence

C3 is a completed negative experiment: it reduces C2's hierarchy cost but remains
slower than original Three.js. Read the [full report](../../../docs/PREPARED_REPORT.md)
and [bounded API contract](../../../docs/PREPARED_PASS.md).

| Directory | Source | Meaning |
|---|---|---|
| `initial/` | 771080873b1f329ee91df895ec1afff87b4b2b63 | Superseded 36-run boundary series and 40 incomplete rendering runs; interruption record explains the lifetime defect and SIGTERM |
| `corrected/boundary` | 066ddbaa3d538e95126a46c9203b550613bf3d3d | Complete primary: six routes, six repeats, five cases; 40 warmup / 100 samples |
| `corrected/render` | Same corrected source | Complete primary: six routes, five scenes, six repeats; 30 warmup / 90 samples; equal final rendered work verified |
| `corrected/*-diagnostic` | Same corrected source | Separate instrumented runs; never pooled with primary timing |
| `corrected/profile` | Same corrected source | Separate 1 ms browser sampling; 22 warmup / 30 measured hierarchy frames |
| `validation/` | Recorded staged/source1/source2/source3 trees | Numerical/image, installed-package/type, native, lifetime, contract, demo and legacy checks; original metadata preserved |

The initial render manifest remains `running` because termination interrupted its
process. It is **incomplete**, not performance evidence; see `initial/interruption.json`.
No raw file was rewritten to make it appear complete. Red/green lifetime logs
preserve the native-slot leak reproduction and correction. The first source1
Fox timing-policy failure was a missing separately fetched fixture; its log and
subsequent passing source2 check remain. No test threshold was relaxed.

`validation/candidate-source-check.json` verifies that the staged final correctness
source/binary hashes match the clean measured candidate. Full source2 legacy
owned/pipeline/timing/bundle checks precede the C3-only weak-queue correction;
source3 repeats the affected native/differential/facade/C3/contract/scene/package/demo
checks. Final delivery/status validation is recorded separately in the task report.

JSON/profile compression is lossless gzip with fixed gzip timestamps. Manifests
and primary summaries remain readable. `source-file-hashes.json` hashes original
uncompressed input files; `checksums.json` hashes archived bytes. Soldier assets
and screenshots are excluded because separate redistribution rights are not
verified; numerical comparisons and original screenshot hashes remain. Other
synthetic/source-licensed fixture images are included.

Reproduce the recorded candidate using the commands in the report, with fresh
output directories. Recheck archived primary summaries and derived diagnostics:

```sh
node bench/facade-summary.mjs bench/results/prepared-c3-20261024/corrected/boundary
node bench/facade-summary.mjs bench/results/prepared-c3-20261024/corrected/render
python3 bench/prepared-decision.py bench/results/prepared-c3-20261024/corrected/render
python3 bench/prepared-diagnostics.py bench/results/prepared-c3-20261024/corrected/render-diagnostic bench/results/prepared-c3-20261024/corrected/profile
```

Shared Xeon CPU and SwiftShader only; no physical desktop GPU/FPS evidence, product
qualification, cold-start or full memory-lifecycle qualification follows.
