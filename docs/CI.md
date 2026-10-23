# Verification, artifacts and GPU experiments

The workflows implement infrastructure; they do not establish a hardware speedup.
The M0–M2 datasets remain software-renderer CPU experiments. [Issue #3](https://github.com/postmelee/three.rust/issues/3)
tracks runner qualification; #4 tracks the first accepted hardware baseline.

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

## Hardware runner setup

GitHub Actions can orchestrate physical GPU benchmarks. Standard `ubuntu-latest`
runners do not provide the needed dedicated GPU. Options are:

- A dedicated self-hosted Linux x64 machine with a physical GPU, stable driver,
  non-root runner account and browser system dependencies installed. Register
  the labels `self-hosted`, `linux`, `x64`, `rthree-gpu`. Prefer an isolated
  machine with controlled power/thermal state and no concurrent workloads.
- A separately configured GitHub GPU larger runner. GitHub currently documents
  NVIDIA T4 hardware and paid Team/Enterprise organization availability. Moving
  or funding this personal repository is a separate decision. A cloud T4 is
  useful repeatable server evidence, not a consumer desktop or display proxy.

References: [larger runners](https://docs.github.com/en/actions/using-github-hosted-runners/using-larger-runners/about-larger-runners),
[runner specifications](https://docs.github.com/en/actions/reference/runners/larger-runners),
[self-hosted runners](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/about-self-hosted-runners).
Check current availability and pricing before provisioning; this change provisions nothing.

Install required Linux libraries with `npx playwright install-deps chromium`
during trusted machine setup. The workflow installs the pinned browser, not
system packages through sudo. Configure repository Actions variables:

| Variable | Meaning |
|---|---|
| `GPU_BENCHMARK_ENABLED=true` | Explicitly enable the otherwise disabled hardware job |
| `GPU_SELF_HOSTED_LABELS` | Optional JSON string array; defaults to the labels above |
| `GPU_HOSTED_LABEL` | Required configured Linux GPU larger-runner label for the `github-gpu` choice |
| `GPU_ANGLE_BACKEND` | Optional `gl`, `vulkan`, `d3d11` or `metal`; use only a verified backend supported by the runner OS (this workflow targets Linux) |
| `GPU_BENCHMARK_SCHEDULE_ENABLED=true` | Opt in to weekly full self-hosted runs; disabled by default |

The workflow runs **only the default branch**, by manual dispatch or explicitly
enabled schedule. It never executes pull-request code on the GPU runner.
Use a dedicated runner group/ephemeral machine and repository restrictions for
public repositories. Changing this restriction requires a separate security
review. While these changes remain in a draft branch, the hardware workflow
cannot be manually selected as a default-branch workflow. Merging and runner
registration remain outstanding, not silently completed by this task.

Dispatch `hardware browser benchmark` with `smoke` first. Default headless mode
avoids a display requirement, but its frame intervals describe browser
scheduling, not physical presentation. For headed mode supply a working display
and record refresh rate; Xvfb is not a physical display. Run correctness on the
actual GPU before timing. The initial same-device image gate requires exact
A/A and A/B/C/D pixels; a failing hardware gate requires investigation and an
explicit justified tolerance decision, not automatic acceptance.

`nvidia-smi` alone is insufficient: Chromium may fall back to SwiftShader.
The preflight records driver tools, CPU/OS, cgroup limits and browser renderer.
Hardware mode rejects SwiftShader, llvmpipe and other known software renderers,
missing renderer information and unknown/masked names. Recognized GPU names
are a conservative heuristic, not independent proof of physical execution;
review driver/backend metadata during qualification. No forced software flags
are used in hardware mode. A failed run preserves its manifest and error.

## Measurement protocol and interpretation

Full workflow runs collect an original-only A/A baseline before and after the
comparison (4 repetitions each), and 8 A/B/C/D repetitions with rotated engine
order (each engine appears twice in every position). Every scene/run uses 120
warmup and 600 measured frames at 1920×1080, DPR 1. Smoke uses 1 repetition,
5 warmup and 10 samples. These are fixed-frame experiments, not fixed-duration
steady-state claims. Actual duration is recorded. Primary timing disables
profiling and GPU queries; collect those in separate diagnostic experiments.

A = original Three.js, B = JS compatibility, C = Rust/Wasm, D = packed JS.
Keep viewport, quality, assets, simulation ticks, browser, backend and hardware
identical. Compare per-run CPU p50/p95/p99 and frame intervals; preserve complete
raw samples and regressions. `analysis.json` checks draw-work parity and actual
Wasm execution. Bootstrap intervals across runs are exploratory, especially
for small/quantized costs. Fewer than three valid run pairs receive no interval;
zero reference quantiles are omitted from ratios and counted explicitly.
A/A raw datasets expose drift; this workflow does
not yet automatically certify a noise threshold or a product performance gate.
Before accepting #4, predeclare an A/A noise rule, repeat sessions and examine
thermal/clock drift. An eight-run artifact alone does not complete #4.

Use a stable desktop workstation as the primary product reference and at least
one second hardware class before generalizing. Cloud shared CPUs and cloud GPUs
are useful separate environments; do not pool them with desktop measurements.
GPU shader time is not removed by moving CPU work to Rust. Frame CPU time is
not total frame latency, and rAF/vsync can conceal FPS changes.

Local commands after the normal [clean setup](CLOUD_SETUP.md):

```sh
npm run docs:check
npm run test:infra
npm run test:gpu-guard
node scripts/runner-environment.mjs work/local-gpu-001
CHROMIUM=/path/to/pinned/chromium node bench/run.mjs mode=hardware headless=false \
  repeats=8 warmup=120 samples=600 engines=original,js,wasm,packed-js \
  out=work/local-gpu-001/abcd
node bench/analyze.mjs work/local-gpu-001/abcd
npm run bundle:demo
npm run test:bundle
```

Choose a **new output directory for every experiment**. The runner refuses to
overwrite any existing manifest, including failed ones. Convenience scripts
write to `work/bench-smoke`, `work/bench-full` and `work/bench-diagnostic`; use an
explicit `out=...` command for subsequent runs. Historical `bench/results/` data
is not an output target for new experiments. The unchanged `bench:analyze`
command reproduces the historical report; pass a new path directly to analyze
new data. Browser tests should likewise use `RTHREE_RESULTS_DIR=work/...`.

## Roadmap synchronization

`docs/roadmap.json` is the versioned milestone/task specification. The
`roadmap synchronization` workflow uses a job with `issues:write` to create
missing milestones and associate **existing, explicitly marked issues**. It
never closes issues, overwrites bodies or infers implementation completion.
It runs on relevant pushes to main or trusted manual dispatch. The temporary
adoption-branch trigger has been removed for integration.
Tests cover idempotency and refusal to adopt unrelated issues. The workflow
uploads its verified associations. Issue/PR completion remains governed by
Hyper-Waterfall and task requester approval; milestone progress is not a
percentage of the Three.js codebase translated.

## Pipeline preparation checks

Correctness CI runs `npm run test:pipeline`: pinned source hashes, seven upstream
semantic oracles, and A/A plus A/B/C/D rig palette/image comparisons. Screenshots
and numeric summaries are in the correctness artifact. The portable demo includes
`/fixtures/pipeline/index.html`; no model download is needed for this synthetic rig.
The [preparation protocol](PIPELINE_PREPARATION.md) documents separate CPU-only and
full-render diagnostics. CI correctness does not certify their performance.

## Public status site

`.github/workflows/pages.yml` builds an allowlisted status site on main pushes or
trusted manual dispatch: progress HTML/JSON/SVG, interactive history HTML/JSON/SVG,
an index and build provenance. Full first-parent history supplies the last committed
schema-3 inventory per UTC day. No engine binary, model, environment dump or private
file is published. Correctness CI checks the artifact at the `/three.rust/` subpath
on desktop/mobile. The main build verifies generated-file freshness before uploading.

A repository administrator must first set **Settings → Pages → Build and deployment
→ Source: GitHub Actions**. Initial activation requires repository administration
permission, which ordinary content/PR connectors and GITHUB_TOKEN do not provide.
The deploy job uses only `pages:write` and `id-token:write`, the `github-pages`
environment and official configure/upload/deploy actions. PR code cannot deploy.
If activation is missing, the deployment fails visibly; enable it and rerun the
failed job. A successful artifact build alone is not proof of a live website.

Published URLs after successful deployment:

- https://postmelee.github.io/three.rust/progress.html
- https://postmelee.github.io/three.rust/history.html
- https://postmelee.github.io/three.rust/history.json

This status-site deployment is separate from the portable engine demo and npm
publication. Its history records implementation claims, not benchmark speedups.
