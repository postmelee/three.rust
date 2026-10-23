# Local Mac Codex session brief

Copy this brief into a new local Codex session attached to the intended Mac repository.
Requested UI configuration: **GPT-6 Astra, reasoning effort High**. Select these in
Codex before starting; a prompt cannot change or verify the runtime model. If the
requested configuration is unavailable, report it without pretending it was selected.
Repository artifacts are English; communicate with the requester in Korean.

## Assignment

Continue three.rust's cloud/local plan, initially **L0a/L0b** under issues #3/#4/#5.
Your initial responsibility is physical-Mac validation and real-app profiling, not
concurrent edits to the cloud-owned core. Read AGENTS.md and the execution plan in
issue #34's task branch `codex/docs-handoff` (the PR number is separate).
The execution plan is `mydocs/plans/task_m3_34_execution.md`. Follow Hyper-Waterfall
using the requester's existing authorization to perform this assigned work.

Deliver two separate results:

1. A quiet physical-Mac repeat of the existing precision/matched-JS comparison,
   with raw data and a bounded verdict. This is not a new engine optimization.
2. A proposed real-app cohort and original Three.js profiles, preserving features,
   assets/quality and interaction requirements. Fox copies alone are not the cohort.

Do not claim a second hardware class, another browser engine or a future-day run
has happened. If a later session is required, record it as outstanding.

## Checkout and baseline

Preserve any existing work. Start in a new directory or clean separate worktree.
Initial code pin: **9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7**. This includes PRs #30/#32/#33
research/tooling while main was b5a0fc3. Recheck current PR/CI state, but do not silently
change this baseline. If a newer candidate is assigned, use its explicit full SHA.

Example from a chosen parent directory; select another new name if it already exists:

```sh
git clone https://github.com/postmelee/three.rust.git three-rust-mac-validation
cd three-rust-mac-validation
git fetch origin
git switch --create codex/mac-baseline-20261023 9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7
git show origin/codex/docs-handoff:mydocs/plans/task_m3_34_execution.md
git status --short
git rev-parse HEAD
```

Read the brief/plan from the published docs branch or its pinned PR link; the initial
measurement commit predates these documents. Use the established issue/task workflow
for local notes. If task-only commits are made before timing, record the actual clean
HEAD and verify engine/fixture/harness hashes against the assigned code baseline.
All timing phases must use one actual clean measurement SHA. Do not reset unrelated
files to force a clean tree. Never import abandoned implementations or delete data.

## Setup and first hardware check

Use the repository's locked dependencies and Rust 1.90.0 toolchain/wasm target.
Read docs/CLOUD_SETUP.md and the current docs/CI_MAC.md on the docs branch; at the
initial code pin its content is still in docs/CI.md#physical-mac-validation.

```sh
npm ci
npm run fixtures
npm run build
npm test
node scripts/fetch-fox.mjs
```

Resolve an installed Chrome/Chromium explicitly or inspect the repository resolver.
Set CHROMIUM to an existing executable only; record its actual path/version. Do not
update Chrome, OS or dependencies between compared phases. Do not use SwiftShader
for a physical-GPU performance claim.

```sh
node scripts/mac-preflight.mjs work/mac-preflight-001
RTHREE_BROWSER_MODE=hardware RTHREE_HEADLESS=false RTHREE_OWNED_RESULTS_DIR=work/mac-owned-check-001 npm run test:owned
RTHREE_BROWSER_MODE=hardware RTHREE_FOX_RESULTS_DIR=work/mac-fox-check-001 node tests/fox-browser.mjs
npm run test:timing
node bench/fox.mjs mode=hardware headless=false timing=isolated repeats=1 warmup=10 samples=30 out=work/mac-fox-smoke-001
```

These paths must not exist before their command. The smoke is only a tooling check.
If hardware preflight, images, numeric comparisons or page isolation fail, diagnose
and retain the failure; do not proceed with an invalid performance comparison.
Verify Apple GPU/ANGLE Metal from browser metadata and OS/GPU information, not just
the computer's model. Record display settings/rAF separately, power mode, AC state
and observable background load. Unknown temperatures/driver fields stay unknown.
Preflight allowlists metadata; do not publish device serials or personal data.

## Full timing

Complete builds/tests first. Use AC power, a stable display/power setup and a quiet
foreground browser; stop unrelated builds, profiling, screen recording and other
heavy work. Record unavoidable activity. Keep the same settings for all paths.

```sh
RTHREE_TIMING_MODE=isolated caffeinate -di bash scripts/mac-validation.sh work/mac-precision-001
```

The wrapper includes its own preflight, correctness, synthetic controls, original
and matched-JS A/A before/after, six balanced Fox comparisons and separate diagnostics.
It uses fixed warmup/sample counts; do not describe them as guaranteed durations.
Before/after A/A drift and per-page clock resolution must be assessed before claims.
Do not run the following ordinary-mode comparison concurrently; use it only as a
separate experiment if studying the hosting-policy effect:

```sh
RTHREE_TIMING_MODE=ordinary caffeinate -di bash scripts/mac-validation.sh work/mac-ordinary-001
```

Use fresh paths on every attempt. Preserve failed/partial manifests. Do not shorten
full runs silently or pool ordinary/isolated, GPU-diagnostic/main, or cloud/Mac samples.
Do not infer FPS from CPU savings. Original versus matched JS separates architecture
benefit; matched JS versus Wasm addresses language/backend evidence. Repeat on another
quiet day before stronger claims; report that requirement as open if not yet executed.

## Real-app profiling assignment

This work can proceed alongside cloud development, but not during full Mac timing.
Inspect public source/licensing before choosing assets. Propose at least two independent
existing applications and three interactions, covering animation-heavy interaction
and a spatially dense viewer/configurator with edits/picking/cameras/shadows. Include
small/static, read/callback-heavy and GPU-heavy controls. These are selection criteria,
not permission to invent a convenient app and call it representative.

For each candidate record: repository/commit, code and asset licenses/hashes, build
steps, original Three.js version, viewport/quality, feature contract, deterministic
input replay, synchronous read/callback frequency, CPU/GPU evidence and adaptations.
Keep unmodified upstream and any scaled variant clearly distinct. Do not disable
required features to make an unsupported accelerator fit. Use separate instrumented
profiles to rank animation/transforms/bounds/visibility/lists/uploads/submission and
boundary costs. Do not subtract diagnostic medians from main-run medians.
If the assigned baseline lacks the necessary profiling harness, prepare a separate
scoped harness PR and hand off its exact SHA before beginning a new measured series.

## Return artifacts

- Full actual source SHA and reference baseline; branch, build flags, lockfiles,
  Wasm hash and assets/browser/OS/GPU/display/power/timing metadata.
- All raw runs, A/A results, `comparison.json`, `evidence.json`, separate diagnostic
  outputs, images/numerical checks, failed attempts and archive checksums.
- Per-run CPU p50/p95/p99 and frame intervals, absolute milliseconds and ratios,
  initialization/copy/read costs, drift and unsupported/unmeasured items.
- Public bounded report under docs/ with raw links; task report in mydocs/report/;
  cohort research in mydocs/tech/. Keep files uniquely named for this session.
- Recommendation: what bottleneck to target, what regressed, what remains below
  timer/noise limits, and whether any stated acceptance gate was actually tested.

Keep raw measurements in a new `bench/results/mac-<date>-<session>/` archive only
after the run is complete and reviewed for metadata; never overwrite the old archive.
Do not commit downloaded model binaries or publish to npm. Commit/push the evidence
branch and open a draft PR against its correct baseline. Return the PR, exact SHAs,
commands/outcomes and proposed next unit in Korean. Do not close broad issues or edit
README/product/ownership claims until the integration owner reviews the evidence.

## Later candidate validation

After cloud supplies C2/C3/R1, use a new clean candidate checkout and the exact handoff
recipe. Run hardware correctness before timing, include total facade/copy/read/render
cost, and preserve upstream quality. The old Fox wrapper does not automatically
exercise a new facade or prepared-pass renderer: use the new candidate's validated
harness and do not relabel an unchanged Fox result as evidence for the new subsystem.
No engine source edits are assigned to this local session unless the unit's ownership
is explicitly transferred. No local session or measurement was created by this brief.
