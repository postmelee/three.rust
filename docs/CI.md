# Verification, artifacts and GPU experiments

Use this page to choose the appropriate procedure. Correctness CI, CPU diagnostics
and physical-GPU measurements provide different evidence.

| Task | Procedure |
|---|---|
| Automatic correctness and portable artifacts | [Checks below](#ordinary-correctness-ci-and-delivery) |
| GPU runner configuration and legacy A/B/C/D timing | [GPU protocol](CI_GPU.md) |
| Current owned-pipeline experiment on a physical Mac | [Mac protocol](CI_MAC.md) |
| Progress Pages and roadmap automation | [Publication](CI_PAGES.md) |

## Ordinary correctness CI and delivery

`.github/workflows/ci.yml` runs on pushes and pull requests, with read-only
repository permissions. It pins Node 22, Rust 1.90.0, Three.js 0.186.1 and
Playwright 1.56.1 through the toolchain and lockfiles. It builds Wasm and runs
Rust, upstream differential, TypeScript, browser image/numerical, package,
demo, standalone progress-page and infrastructure checks. Python 3.10+ generates
the progress HTML/JSON/SVG without external dependencies. Chromium uses SwiftShader deliberately here.
A negative test reads the actual SwiftShader WebGL renderer and proves that the
hardware guard rejects it. Ten-sample smoke timings are diagnostic only.

Successful runs deliver `portable-demo-and-local-package`: a local-installable
npm tarball and a built demo with licenses. Download the artifact, extract it,
then run `npm start` inside `demo/` and open http://127.0.0.1:4173. Node 22+ is
required; Rust and npm install are not needed. The separately licensed Soldier
asset is excluded; run `npm run fetch-assets` there before using that scene.
Other scenes work offline. This delivery does not publish npm, deploy a public
site, or merge changes. Generated build outputs stay out of Git.

The C1 `npm run test:compatibility` suite runs 16 semantic scenarios in isolated
Node processes and Chromium pages for original/JS/Wasm/packed-JS, plus two-camera
callback and pixel comparisons. Its source-hashed traces and images are uploaded
from `work/compatibility-node` and `work/compatibility-browser`. See the
[contract matrix](FACADE_CONTRACT.md). These are correctness checks, not new Rust
ownership or performance evidence.

## Hardware runner setup

See [runner choices, configuration and qualification](CI_GPU.md#hardware-runner-setup).

## Measurement protocol and interpretation

See [legacy A/B/C/D protocol](CI_GPU.md#measurement-protocol-and-interpretation).
For owned Fox use the [Mac protocol](CI_MAC.md), which has separate controls and counts.

## Roadmap synchronization

See [milestone and issue automation](CI_PAGES.md#roadmap-synchronization).

## Pipeline preparation checks

Correctness CI runs `npm run test:pipeline`: pinned source hashes, seven upstream
semantic oracles, and A/A plus A/B/C/D rig palette/image comparisons. Screenshots
and numeric summaries are in the correctness artifact. The portable demo includes
`/fixtures/pipeline/index.html`; no model download is needed for this synthetic rig.
The [preparation protocol](PIPELINE_PREPARATION.md) documents separate CPU-only and
full-render diagnostics. CI correctness does not certify their performance.

## Public status site

See [Pages deployment and artifact verification](CI_PAGES.md#public-status-site).

## Owned animation experiment

CI additionally runs `npm run test:owned` (upstream/JS/Wasm differential tests,
raw Wasm lifetime and growth checks, real-browser palette/image comparisons and
replaced-work bypass guards). `work/owned-validation` preserves browser evidence;
`work/owned-smoke` is a six-run short smoke, not a performance baseline. The portable
demo includes `/fixtures/owned/index.html`; the bundle test executes its image and
numeric checks from the extracted artifact without a Rust build or model download.

For a qualified hardware runner, repeat the owned experiment independently:

```sh
RTHREE_BROWSER_MODE=hardware RTHREE_HEADLESS=false npm run test:owned
node bench/owned.mjs mode=hardware headless=false repeats=6 warmup=120 samples=600 \
  out=work/owned-hardware-001
node bench/owned-report.mjs work/owned-hardware-001
```

Use the existing environment preflight, fixed browser/driver/display, before/after
original-only A/A sessions and a predeclared noise rule. The existing GPU workflow
still measures the M2 workload; it does not yet schedule the new owned workload.
Do not mix these datasets or infer a hardware result from correctness CI. Hardware
registration, real-asset profiles and M5/M6 acceptance remain outstanding.

## Physical Mac validation

See the [complete local Mac procedure](CI_MAC.md) and [historical Mac results](MAC_HARDWARE_REPORT.md).
