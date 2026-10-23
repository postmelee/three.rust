# Task #3 Stage 1: Mac qualification and synthetic reproduction

## Scope and changes
Started from PR #27 head e66e067844b75559bea251a7bd381d42210ab3ce in the app-managed separate worktree on codex/mac-hardware-validation. The primary checkout remains on main and unchanged. Added shared installed-Chrome/CHROMIUM browser resolution and allowlisted macOS environment collection. No engine mathematics or renderer implementation changed.

## Verification and evidence
- `npm ci`, Rust 1.90.0 installation/wasm32 target, `npm run fixtures`, `npm run build`: passed.
- `npm test`: 8 native Rust and 9 Node differential tests, strict TypeScript passed.
- `RTHREE_BROWSER_MODE=hardware RTHREE_HEADLESS=false npm run test:owned`: 8 owned Node tests and 14 browser views passed, exact pixels, numeric tolerance, callbacks and poisoned upstream recomputation checks.
- `npm run test:gpu-guard`: actual SwiftShader rejected.
- Hardware: Apple M4 Pro, 12 CPU / 16 GPU cores, 24 GiB, macOS 26.5.2 build 25F84. Chrome 155.0.8059.86 reports ANGLE Metal Renderer: Apple M4 Pro.
- Synthetic run 02: 6 repeats × 3 scenarios × 3 paths × 600 samples = 54 runs / 32,400 frames, 120 warmup per run, 640×480 DPR1. Original/owned JS/owned Wasm CPU p50 at 64 rigs: 1.05 / 0.75 / 0.60 ms (median of run quantiles). Small/static results approach clock granularity; static p95 regressions retained.

Evidence: bench/results/mac-20261023/checks, synthetic-correctness, environment, environment-ac, synthetic-baseline-02. Source/binary hashes and actual browser/backend are in each run manifest.

## Failure and limits
First synthetic timing run failed after 11 completed runs with `Execution context was destroyed, most likely because of a navigation`. It is retained as synthetic-baseline, status failed, excluded from complete-run summaries. The cause is not established. The runner now brings each page to the foreground before measuring; no retry or deletion of slow runs. The completed synthetic run is a short reproduction, without its own bracketing timing A/A; it does not accept a product claim.

Initial preflight was on battery; the requester then connected AC power and stated background heavy work cannot be excluded. Real-asset runs will record before/after power conditions and A/A variability. Physical display scanout, thermals and power consumption are not independently measured. Observed ~8.3 ms rAF cadence motivates the real-asset 1200/3600-frame calibration.

## Next stage and authorization
Proceed to fail-closed Fox conversion and checkpoint correctness under the user's explicit implementation-through-draft-PR request. Broader #3–#5 and #7–#11 acceptance remains separate.
