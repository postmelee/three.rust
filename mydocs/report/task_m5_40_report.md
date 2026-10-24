# Task #40 final report — C3 prepared main pass

Issue: [#40](https://github.com/postmelee/three.rust/issues/40). Milestone: M5.
Source owner: cloud; branch `codex/prepared-pass`; stacked draft base
`codex/persistent-facade`. Baseline: 10be41f79f6a8b894b9170eb32f00f131f188247.
Measured candidate: **066ddbaa3d538e95126a46c9203b550613bf3d3d**.

## Outcome

C3 is implemented and verified for its finite ordinary-Mesh main-pass scope.
Persistent topology and dirty input/revision state connect native transforms,
visibility, ordering and per-draw matrices to the pinned WebGL consumer. Replaced
JS work is skipped. Both matched JS and Rust routes are optional.

**The performance hypothesis fails its current screens.** In the same cloud
hierarchy comparison, original/C2 Wasm/C3 JS/C3 Wasm CPU p50 is
17.87 / 47.76 / 42.73 / 37.78 ms. C3 reduces C2 cost but loses to original in all
six p50 pairs for all five scenes. It does not qualify a product gate or hardware
gain. Complete results and regressions are in [the report](../../docs/PREPARED_REPORT.md).

## Scope and document locations

| Area | Delivered | Location judgment |
|---|---|---|
| Native and matched computation | Retained plans, versioned transform state, bounded pass evaluator | `crates/`, `packages/` as planned |
| Renderer/package | Hash-guarded consumer and uniform read barrier, two optional entries, demo/types/addons | Source/build/test paths as planned |
| Correctness and evidence | State/upstream/image/bypass/lifetime checks; raw primary/diagnostic/profile data | `tests/`, `bench/` as planned |
| Public references | Contract, results, setup, architecture, strategy and progress | `docs/` as planned |
| Task memory | Plan, stage records, final report and daily board | `mydocs/` as planned; no personal session prompts |

## Acceptance evidence

| Criterion | Result |
|---|---|
| Retained topology; no per-node unchanged-frame JS commands | PASS: state tests and diagnostics; general camera/selective commands remain |
| Observable behavior, lifetime and force | PASS within declared subset: native 14; inherited/new C3 13 per mode; eight-route Node/browser contract; forced-GC red/green regression |
| Native execution and actual renderer bypass | PASS: prepared calls and draw consumption plus throwing JS guards; upstream ordered-list/matrix oracle |
| Cameras/shadows/callbacks/fallback | PASS: 12 checkpoints plus nested rendering, exception recovery and upload callbacks; exact same-browser pixels/numerics; shadow work remains JS |
| Package and delivery | PASS: clean tarball install, Node ESM/init/retry/addon identity, NodeNext/Bundler/esbuild; demo route/pause and fresh delivery/site checks |
| Repeated comparisons | PASS as experiment execution: 180 render runs / 16,200 samples and 36 boundary runs / 18,000 ticks, separate diagnostics/profiles, controls and failures retained |
| Useful performance/replacement | NOT QUALIFIED: both C3 screens fail; no real-app/hardware acceptance |
| Docs and scoped progress | PASS: English references, links, source/unit/browser generation checks; 7 scoped computations / 15 derived-state mappings; no product-gate upgrade |
| Remote correctness CI | PASS on measured runtime 066ddba: [run 40061193843](https://github.com/postmelee/three.rust/actions/runs/40061193843) |

Stage records: [1](../working/task_m5_40_stage1.md),
[2 / lifetime correction](../working/task_m5_40_stage2.md),
[3](../working/task_m5_40_stage3.md), [4](../working/task_m5_40_stage4.md).
[Archive](../../bench/results/prepared-c3-20261024/) includes verification source
reconciliation and checksums. Current documentation/delivery checks are additional
to runtime CI; final reporting-head CI is tracked separately in GitHub.

## Limits and next work

- Public JS inputs/hierarchy, materials/resources, shadows and unsupported objects
  retain JS behavior. Direct child-array mutation, arbitrary reflection/prototypes,
  full addons, ordinary native animation/skinning, XR and complete renderer support
  are not delivered. Native handle metadata/linear memory retain a high-water mark.
- Dense input/cached-array reads, dirty material/geometry checks, final copies and
  per-draw renderer work need further cost experiments. Do not choose SIMD/workers
  or a complete renderer rewrite solely from the native kernel or port counts.
- Preserve local PR #36 and its baseline. Original real-app profiles, quiet A/A and
  same-device candidate validation remain local work; no local session was created
  or physical GPU measurement performed in this task. Use public reproduction
  commands and the immutable candidate, with workload/quality unchanged.
- M7/M8 and the broader #7/#9–#11/#16/#17 gates stay open. No npm publication,
  main merge or Pages deployment is part of this task.

Publish the stacked draft under the requester's existing C3 authorization. Leave
the issue open for review/integration; a completed negative experiment is not a
performance-qualified release.
