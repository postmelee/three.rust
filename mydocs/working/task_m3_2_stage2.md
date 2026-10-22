# Task #2 — Stage 2 report

GitHub Issue: [#2](https://github.com/postmelee/three.rust/issues/2)
Implementation plan: [task_m3_2_impl.md](../plans/task_m3_2_impl.md)
Stage: 2

## Stage Purpose

Implement reproducible correctness/artifact delivery and a separately enabled
hardware experiment path, without claiming a physical-GPU result.

## Artifacts

| Files | Change Summary |
|---|---|
| .github/workflows/ci.yml | Correctness, guard/unit checks, demo bundle and local npm artifact delivery |
| .github/workflows/gpu-benchmark.yml | Default-branch opt-in GPU runs, A/A calibration, rotated A/B/C/D, driver metadata and raw artifacts |
| .github/workflows/roadmap-sync.yml, scripts/roadmap-sync.mjs | Idempotent milestone creation/assignment for marked existing issues only |
| bench/config.mjs, bench/run.mjs, bench/analyze.mjs | Validated options, software rejection, fresh outputs, failure manifests and general analysis metadata |
| scripts/runner-environment.mjs, scripts/bundle-demo.mjs | Environment provenance and portable built demo, excluding unverified asset redistribution |
| tests/{infra,gpu-guard,bundle,browser,package,demo}.mjs | Guard/sync tests, actual software rejection, hardware correctness mode and safe output paths |
| package.json, docs/{CI,CLOUD_SETUP,BENCHMARKS}.md | Reproduction commands, activation conditions, limitations and artifact usage |

## Body Change Scope / Lossless Preservation

Rust and JS engine algorithms are unchanged. Hardware correctness uses the same
numerical/image oracle with an initial exact same-device A/A and engine gate.
Historical measurements are unchanged. The package test initially wrote its new
result into the old default tracked path; that new result was retained under
work/task2-package, the historical file was restored byte-for-byte from HEAD,
and browser/demo/package defaults now write to ignored work/ paths.

## Verification Results

- Rust formatting/clippy, Wasm build and native tests: passed, 5 Rust tests.
- Upstream differential tests: 9 passed; strict TypeScript check passed.
- `npm run test:infra`: 4 passed (renderer/CLI validation and roadmap idempotency/refusal).
- Browser: all five scenes passed exact A/A and A/B/C/D pixel comparisons,
  numerical matrix comparisons and callback checks; actual Wasm counters verified.
- `npm run test:gpu-guard`: actual Chromium SwiftShader renderer rejected.
- Isolated package consumer: installation, initialization rejection/retry, ESM,
  addon identity, single-core bundle and TypeScript passed.
- Demo and portable bundle: original autostart, Wasm switch/execution and pause passed.
- Smoke: 20 runs, 5 warmup and 10 samples each; completed and analyzed as diagnostic only.
- `npm run docs:check`, actionlint 1.7.7 and `git diff --check`: passed.
- Fresh environment inventory: driver tools unavailable, 5 visible logical CPUs,
  cgroup CPU quota 4 and memory limit 16 GiB. Actual browser reports SwiftShader.

Commands were run with the managed environment's approved execution permissions.
Local browser was Chromium 154.0.8037.57; the remote clean install will use the
browser pinned by Playwright 1.56.1. These are separate environments.

## Residual Risks

No physical GPU is available or registered. GPU workflow activation, default-branch
integration and successful hardware preflight remain outstanding. Recognized
renderer strings require corroborating driver review. A/A noise acceptance is a
future baseline decision, not a green automated performance gate. Headless frame
intervals are not physical display presentation. No npm/site publication occurs.

## Impact on Next Stage

Push and inspect actual roadmap synchronization and clean-install correctness CI;
fix any remote failures and preserve the evidence in the final report.

## Approval / Authorization

Proceeding to the authorized push, remote issue/milestone synchronization and
stacked draft PR. No merge, paid provisioning or new engine implementation is implied.

## Follow-up from smoke analysis

Inspection of the smoke analyzer revealed a degenerate confidence interval for
one run. The analyzer now omits intervals with fewer than three valid pairs and
counts zero-reference-quantile omissions instead of emitting infinite ratios.
A fifth infrastructure test covers both cases and passed. This changes future
analysis behavior; historical analysis JSON remains untouched. The original
stage commit's remote correctness/artifact workflow passed in run 39785321835.
