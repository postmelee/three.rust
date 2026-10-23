# Task #38 stage 2 — initial correctness and measured regression

Clean implementation: b1b8790bbcdb26d2dca39c29fcc85441c5265a69.

Final source checks passed: 11 native tests, 12 facade checks, nine legacy
differential tests, eight owned tests, package/type/bundle checks, 192 semantic
scenario executions across Node/Chromium, two-camera callbacks and 35 rendered
fixture pages (30 A/A or candidate numeric/exact-image comparisons).

Completed primary runs: boundary 6 engines × 6 repetitions × 5 cases × 100 samples,
40 warmup ticks per case; renderer 6 engines × 6 repetitions × 3 scenes × 90 frames,
30 warmup frames. Separate diagnostic and smoke runs are archived, not pooled.
All primary/diagnostic manifests record a clean tree. This shared Xeon Linux
session exposes no GPU; Chromium 154 uses SwiftShader and a 0.005 ms observed clock.

The initial facade regresses in every paired original comparison. Hierarchy p50
is 16.64 / 172.61 / 169.23 ms for original / facade JS / facade Wasm. Small and
shader controls regress too. CPU profiling was performed afterward, separately:
frustum/matrix consumers and Proxy reads dominate sampled active time; native
kernel time does not explain the regression. Dirty-only upload and zero no-read
copy assertions pass, demonstrating that byte reduction is insufficient.

Decision before correction: keep this evidence, preserve the default engine and
add a bounded internal matrix read barrier, as recorded in ADR 0006. Read-only math
consumers may use a synchronized backing array; public aliases and writes remain
tracked. Re-run the complete comparison on the corrected immutable candidate.
This is not a port of visibility or a performance qualification.
