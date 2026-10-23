# Task #7 — broader Rust engine investigation

Issue: https://github.com/postmelee/three.rust/issues/7
Milestone: M4. Three finite stages completed; the umbrella issue stays open.

## Outcome

Recommend testing a complete CPU scene engine behind a compatible JS facade,
including prepared render passes. Permit finite wider experiments before the small
Fox slice meets replacement gates. Keep actual adoption thresholds and broader
delivery acceptance unchanged. Full Rust WebGL/WebGPU implementations are explicit
alternatives to compare when residual costs justify them, not presumed wins.

The report addresses source ownership, SIMD, threads, GPU alternatives, browser
interop, stable identities, arbitrary writes, cached arrays, event/callback timing,
selective reads, memory growth, addon identity, initialization and type resolution.
See docs/RUST_ENGINE_STRATEGY.md, docs/ownership-source-audit.json and ADR 0005.

## Experiment and results

New runnable browser CPU driver and analyzer use unchanged owned implementations.
256 runs; 8 repeats; 4 shapes; 4 demands; 2 backends; 98,304 measured ticks in 6,144
blocks. At 64 rigs × 96 bones, median block-average tick costs were 2.4809 ms matched
JS and 1.2341 ms Wasm for retained state; full snapshots raised Wasm to 2.2027 ms.
These are no-rendering shared-cloud kernel/boundary observations, not real-app CPU
frame percentiles or new software improvements. No desktop GPU/FPS claim follows.
All final output values matched exactly in the finite fixtures. Old Mac data remains
unchanged; no prior result was retroactively qualified.

## Verification

| Criterion | Executed check | Result |
|---|---|---|
| Reproducible binary/input | npm run build; clean driver commit and source SHA-256 checks | Passed; measured 6c6486c |
| Numerical and boundary behavior | Driver assertions across 256 runs | Exact matched-JS final arrays; expected steps/calls/bytes |
| Raw result integrity | 262 payload hashes; regenerate report | Passed; derived outputs byte-identical |
| Documentation and preservation | npm run docs:check; git diff --check | Passed; original progress/history and README unchanged |
| Diagnostic syntax | node --check on driver/analyzer | Passed |

Early process-policy and inert-document failures occurred before samples and are
recorded in the archive. No results were discarded from a completed run.

## Limitations and follow-up

Only a single shared cloud session, tight loops and fixed warmup; no A/A convergence
study, physical-Mac rerun, real-app portfolio, image changes, SIMD, workers or new
backend execution. Whole-path app timings and semantic compatibility are still
needed. Existing native/browser correctness suites were not repeated for unchanged
runtime code. The finite driver's JS oracle does not replace upstream tests.

Next implementation: facade write/read/identity proof and prepared-pass slice with
displacement counters; profile actual applications in the same research stage.
Treat JS algorithm/layout gains separately from Rust/SIMD/worker benefits. Report
failures and explicit fallback incidence. Do not close #7/#8/#15/#16/#17 from this
research alone. Published as a stacked draft on #32; remote CI, review and main
integration are not counted as completed by local verification.
