# Cloud and local execution plan

Task: [#34](https://github.com/postmelee/three.rust/issues/34). Direction: [ADR 0005](../../docs/adr/0005-wide-engine-investigation.md).
Status: D0, the finite [C1 contract/oracle](../../docs/FACADE_CONTRACT.md) and
[C2 transform facade](../../docs/PERSISTENT_FACADE.md) are delivered for review.
C2 retains evaluated matrices but regresses against original Three.js in cloud
experiments. The finite [C3 prepared main pass](../../docs/PREPARED_PASS.md), tracked
in #40, is implemented and measured; [its verdict](../../docs/PREPARED_REPORT.md)
does not establish hardware qualification. R1/R2/B1 remain conditional.

## Ownership and sequence

Cloud owns the first implementation PRs, deterministic correctness and integration.
Local Mac owns physical GPU qualification, quiet timing, real-app profiling and
same-device validation. Either environment can develop code, but each unit has one
source-writing owner. Transfer that ownership explicitly before changing it.

```text
D0 documentation foundation
  -> C1 observable compatibility contract -> C2 bounded compatible Rust facade
  -> C3a wider CPU evaluation -> C3b actual prepared-pass renderer consumption
  -> R1 SIMD comparison -> R2 workers when justified -> B1 backend decision

L0 current Mac baseline + real-app profiles runs alongside C1/C2
L1 validates each candidate SHA after its cloud correctness gate
```

A negative hardware result is a completed experiment, not a qualified product gain.
L0 is not a reason to block contract tests, but its real-app findings must inform
C3 scope and later optimization. R2 and B1 have explicit proceed/defer decisions.
No full M7/M8 acceptance is inferred from these finite M4/M5 experiments.

## Verified implementation units

| Unit / existing issues | Cloud implementation and checks | Local Mac work | Exit evidence and documentation |
|---|---|---|---|
| D0 — #34 | Current/historical doc separation, stable entry links, handoff and progress rules | Review the shared measurement protocol and baseline | Docs/link checks; no ownership or product-state change |
| C1 — #8, #7 | Freeze bounded observable contract and upstream oracles: TRS writes, Euler/quaternion coupling, cached object/array aliases, hierarchy/force flags, synchronous reads, events/callbacks/exceptions, initialization and addon identity | Exercise supported interaction/read patterns; return real-app requirements | Contract matrix with supported/fallback/rejected cases and executable oracles. Update compatibility/design docs; no new Rust mapping yet |
| C2 — #38, contributing to #8–#11 | Implement stable wrappers/handles and ordered writes into an actual Rust-owned domain; selective read/materialization, memory growth/release, explicit fallback. Matched JS reference, native/differential/type/fresh-install/browser tests | Run same-device image/numeric tests and no-read/sparse-read/all-read/callback controls; diagnose facade costs | Same application source with engine resolution changes for the declared subset; synchronous behavior and cached identities pass. Count real Rust calls and displaced JS. Update API, migration example and scoped source/ownership evidence |
| C3a — #40, contributing to #7, #9, #10, #16 | Extend persistent evaluation through conservative bounds, visibility, exact ordering, model-view/normal matrices and dirty spans; numerical/list oracle with matched JS | Identify real scene/pass populations, picking/edit/read demand and baseline cost fractions | CPU-stage correctness and cost report, clearly labeled as not yet end-to-end renderer benefit; narrow unsupported cases explicitly |
| C3b — #40, contributing to #11, #17 | Consume prepared data in pinned WebGL without repeating replaced traversal/math/list work. Add second camera and shadow pass; callback/resource/disposal guards; same shader/material/quality | Complete-path timing and images with identical visual work, negative controls and input replay | Rust executed and replaced JS skipped; multi-pass correctness and full-path report. Update current architecture, renderer contract and scoped map together |
| R1 — #10, #12 | Compare existing scalar Rust with verified SIMD instructions, first at equivalent f64 precision where possible; match algorithm/layout JS. Keep f32 a separate experiment | Compare release builds on the same Mac, including facade/copies/render/startup; preserve scalar regressions | Emitted-code evidence plus numerical and complete-path results. State SIMD support/precision limits; no claim from kernel-only timing |
| R2 — #10, #12, #13 | If enough independent CPU work exists, prototype workers, shared memory, scheduling/join and deterministic ordering; matched JS-worker control | Isolation/resource/browser compatibility, input latency, read barriers, energy/thermal and lifecycle observations where measurable | Explicit proceed/defer verdict. No hidden stale frame, changed sync API or ignored callback; thread count and costs recorded |
| B1 — #15, #18 | Use residual profiles to compare a finite Rust WebGL consumer or separate WebGPU backend; review reuse/licenses. Do not automatically rewrite all Three.js | Same quality/assets/work and GPU/backend evidence; compare optimized upstream WebGL/WebGPU as appropriate | ADR with proceed/narrow/defer choice. If code is justified, create a finite implementation issue/PR; no full renderer commitment without this evidence |

For C2, methods and properties are both part of compatibility. A command-only API
is an explicit accelerator, not completion of C2. Ordinary `matrix.elements` writes,
cached arrays and event timing need measured solutions; unhandled cases must reject
or enter an explicit tested fallback before partial ownership changes. Preserve
upstream lazy versus forced reads. A wrapper must not compute the same pose twice.

## Local work packages

| Package | Start condition | Deliverable |
|---|---|---|
| L0a — #3/#4: current hardware baseline | Immutable initial code pin below and [Mac protocol](../../docs/CI_MAC.md) available | GPU/browser preflight, correctness, smoke, full original/matched-JS A/A and three-path Fox comparison, raw tails and failed attempts |
| L0b — #5: real-app cohort | Can start with source/license inspection while cloud develops C1/C2; do not profile during full timing | Candidate table, source/asset pins and rights, required features/interactions, original CPU/GPU/read/callback profiles; retain rejected and GPU-heavy/static controls |
| L1 — #12/#13: candidate validation | Cloud supplies a clean candidate SHA, passing relevant checks, exact API scope and run commands | Candidate/baseline evidence under matching conditions, numerical/images, regression and lifecycle results, explicit hardware/software classification |

L0b must work toward adoption-v1's two independent applications and three interaction
scenarios, not merely more copies of Fox. No actual application cohort is selected
by this plan. Publish source/feature/license review before selecting or adapting
apps. Do not disable required shadows, transparency, picking, events or visual quality
to fit the prototype. Ask for missing private app access only if it becomes necessary.

## Baselines and cross-session coordination

At preparation: main is `b5a0fc335f7eb21e5a47115417786f576af165e3`.
Open stack: #30 (`8918f7e`) -> #32 (`fa64d49`) -> #33 (`9527a04`) -> this docs PR.
This is a recorded snapshot, not a claim those PRs remain open forever. Recheck
live PR/CI state when beginning work. Integration/review is separate from measurement.

Initial L0 code baseline: **`9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7`**.
It includes the precision/matched-JS tooling from #30 and the unchanged owned engine.
It is a prerelease research baseline, not main. The #34 docs changes do not alter
that engine. Do not silently use a newer main or an old implementation branch.

- Use `codex/` branches in separate worktrees/checkouts; preserve existing files.
- Cloud owns core/API/renderer/tests and generated ownership inventories initially.
  Local owns unique new measurement archives, local reports and cohort research.
- Local must not patch the benchmark/engine halfway through a comparison. If a fix
  is required, record the failure, make a separate reviewed commit and restart in a
  fresh directory. Never mix sources or cherry-pick unexplained old results.
- Run builds/tests/profiling before or after full timing, never concurrently on the
  measurement Mac. Source/JIT/browser/policy/workload changes define a new condition.
- One maintainer integrates evidence-backed README/ownership/product-state updates
  after the candidate report is reviewed. Local reports alone do not alter gates.
- If local becomes an implementation owner, record the unit, exact baseline, branch
  and files transferred in its issue first. Cloud stops writing that unit.

## Handoff required for every candidate

Include this table in the owning issue or a linked task stage report:

| Field | Required content |
|---|---|
| Unit and owner | Unit ID, issue, source-writing owner, branch and PR |
| Baseline and candidate | Full immutable SHAs; API/backend/precision differences |
| Contract | Supported features, fallback/rejections and required app workload |
| Completed checks | Exact commands, outcomes and evidence paths; missing checks explicit |
| Run recipe | Build flags, Wasm hash, asset pins, browser/timing policy, viewport/workload, fresh output paths |
| Decision | Relative/absolute gain and regression budgets before timing; do not move goals afterward |
| Return evidence | Raw samples/manifests, environment, copies/reads/calls, images/numerics, failures, report and checksums |
| State update | Proposed doc/ownership/gate change and the specific supporting evidence |

Full-path decisions retain CPU p50/p95/p99, frame intervals and separate diagnostics;
CPU time is not GPU completion or FPS. Compare original Three.js, the compatible
JS route where applicable, Rust and an algorithm/layout-matched JS control. Name
explicit-owned variants separately. At least two hardware classes/browser engines
and independent sessions are still required for broader qualification; one Mac
cannot close those gates. Keep product budgets in [PRODUCT_GOALS](../../docs/PRODUCT_GOALS.md).

## Documentation and progress at each unit

1. Before implementation: freeze the contract/oracle and scope in the owning issue
   and plan; label proposed behavior explicitly.
2. After correctness: update affected public API/compatibility/architecture pages
   in the implementation PR. Retain restrictions still true. Record scope-specific
   evidence in `docs/progress-inventory.json` only when Rust execution/authority is
   proved. Never invent a source mapping to make the chart greener.
3. Commit the implementation/evidence, then generate/check status. If a new reviewed
   ownership observation is justified, use the real implementation SHA with
   `python3 tools/progress.py --record FULL_IMPLEMENTATION_COMMIT_SHA` and verify
   generation again. A documentation or measurement-only change needs no ownership
   history point. Do not hand-edit generated HTML/JSON/SVG.
4. After hardware analysis: publish public results with conditions, failures and raw
   links. Update README performance claims only if supported by the appropriate
   complete-path evidence. A local synthetic win does not qualify product status.
5. Run `npm run docs:check`; when inventory/generator output changes also run
   `npm run test:progress` and the status artifact checks. Preserve the existing
   simple HTML and Definitions and evidence. Close only the finite verified task;
   broad issue/milestone gates remain open until their own criteria pass.

## Next units

C2 is implemented and measured in #38; its [negative result](../../docs/FACADE_REPORT.md)
keeps the default route unchanged. C3 jointly budgets persistent topology/dirty
work and prepared-output consumption in #40. Use its full-path verdict and the
still-outstanding original real-app profiles before choosing R1 or broader stages;
facade-induced overhead alone is not an application profile. Neither finite
experiment closes the broader #8–#11 or M7 gates.
Local L0a/L0b use the shared measurement protocol and immutable baseline above;
their actual execution and results are tracked separately.
Personal session prompts are delivered in chat. No local session has been created
or hardware experiment executed by writing this plan.
