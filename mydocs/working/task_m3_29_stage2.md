# Task #29 stage 2: Evidence and public performance explanation

Issue: #29; implementation plan: [task_m3_29_impl.md](../plans/task_m3_29_impl.md).

## Stage Purpose
Make the existing bounded benefit understandable and prevent a sub-resolution Rust/JS difference from becoming a product claim.

## Artifacts
README and docs/PERFORMANCE.md give conditions, milliseconds, controls, unchanged FPS, startup and explicit API costs. scripts/performance-summary.mjs generates the README table from the original Mac summary; docs-check enforces it. bench/fox-evidence.mjs reports clock/repeat/noise/tail screens separately, including matched-JS A/A when supplied.

## Body Change Scope / Lossless Preservation
No historical Mac file changed. No new Rust implementation or speedup is attributed to this task. Added matched-JS phases and full-cycle diagnostics apply only to future runs. Missing/duplicate repeat identities and incompatible phases fail closed; old comparison output remains identical.

## Verification Results
`node --test tests/fox-analysis.mjs`: eight tests passed, including legacy exact reproduction, mixed policies, source/browser/work mismatch, incomplete phases, intentionally drifting matched JS and unresolved historical Rust benefit. `npm run docs:check` passed the generated table and English checks. Archived command evidence is in bench/results/timing-validation-20261023/checks.

## Residual Risks
Screens are not statistical confidence or product acceptance. New physical hardware measurements remain required.

## Impact on Next Stage / Authorization
Proceed with the already authorized integrated verification and draft publication. Keep original data and broad milestone gates open.
