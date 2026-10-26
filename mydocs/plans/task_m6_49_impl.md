# Task #49 implementation plan

Task plan: [task_m6_49.md](task_m6_49.md)
GitHub Issue: [#49](https://github.com/postmelee/three.rust/issues/49)
Milestone: M6

## Stage Overview

| Stage | Title | Main output | Verification |
|---|---|---|---|
| 1 | Native candidate attribution | Shared E3 setup, profile runner/analyzer, source maps and raw profiles | Source/phase/oracle checks, repeated hardware captures, attribution audit |
| 2 | One justified optimization | Matched JS/Wasm boundary change and cost-selection record | Affected semantic, browser and full-path diagnostic controls |
| 3 | Viewer and larger content | Preserved r176, pure r186 and candidate routes, licensed content contracts | Identity, native controls, fixed images/numerics and observed headroom |
| 4 | App comparison | Frozen scenario/protocol, complete fresh run matrix | A/A, CPU tails, intervals, coverage, independent raw analysis |
| 5 | Adoption decision | Per-app verdict, reports, issues, reviewed PR | Locked tests, exact-head CI, merge-tree verification |

## Document Location Check

| Artifact | Planned location | Actual target | Match |
|---|---|---|---|
| App integration and performance guidance | docs/ | Existing affected references plus new task-specific public evidence report | OK |
| Selection and source research | mydocs/tech/ | task_m6_49_* | OK |
| Plans, stage and final reports | mydocs/{plans,working,report}/ | task_m6_49_* | OK |
| Raw evidence | Fresh bench/results directories | task49-* directories, original local work/ captures retained | OK |

## Stage 1 — native candidate attribution

### Artifacts and changes

- Extract unchanged native Editor scenario setup/state/oracle helpers from `scripts/apps/timing.mjs` where needed. Preserve old default behavior and historical candidate gate; new captures use a dedicated runner.
- Add a candidate profile runner and source-aware analyzer. Use exact served bytes for app overlays and candidate modules; preserve CDP script IDs, URLs, line/column, hashes and raw CPU profiles. Wasm function indices use a verified binary map or stay unresolved.
- E3 root-selected Walking with 1024 shadow map, CSS viewport 1280x720, page DPR1, renderer DPR1, timeline content306/outer307, native callbacks/signals/autosave and required passes retained. Initial runtime remains exact `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb`.
- Full attribution: three route-balanced repeats of original / prepared-js / prepared-wasm, fresh context per run in one headed Chrome, 600 native warmup frames, 12-second CPU profile at requested 100us sampling interval. Save actual elapsed duration, observed sample gaps, source coverage and before/after native state. Smoke: one repeat, 60 warmup frames and 2 seconds; never primary evidence.
- Profiles carry no primary timing claim. Use fixed-pose numerical/image oracles before capture and run source/observer parity checks. Separate profiler-on/off diagnostics may evaluate overhead but cannot silently enter primary tables.
- A diagnostic scenario or repeated capture added after a failure receives a new path and explicit reason; no best-run selection.

### Verification

Meaningful source mismatch/unknown/URL mapping and profile accounting tests, `npm run test:infra`, `npm run docs:check`, fixed-state oracle comparisons, actual GPU preflight, AC/environment metadata and independent attribution review. Complete install/build/tests before the profile windows. Retain all partial failures.

Commit tools before real capture, then archive/report in `Task #49 Stage 1: ...` commits. Tool-only preparatory commits do not claim the stage complete.

## Stage 2 — measured optimization

Record the selected consumer cost, competing alternatives, invalidation contract and changed source paths in a research note before editing runtime. Preserve direct writes/array aliases, force updates, hierarchy, callbacks between passes and exact skin/morph bounds. Apply the same algorithm to JS/Wasm; do not present removing JS bridge overhead as a Rust arithmetic gain. Appropriate locked native/JS/browser/prepared/compatibility tests precede a frozen runtime SHA. Source and report commits stay separate from profile instrumentation.

## Stage 3 — Viewer and real content

- Preserve the pinned r176 source/build/lock and original small scene.
- Add controlled pure r186.1, candidate JS and candidate Wasm routes, with pinned loader/decoder/environment assets and one core identity. Candidate image/numeric equality compares against pure r186; r176 migration differences are recorded separately.
- Preserve both renderers, GUI playback/clip/morph/speed, camera/orbit/dolly, materials/environment and loader functionality. Startup init precedes application module evaluation without losing DOMContentLoaded behavior.
- Inspect at least three plausible real-content candidates, retain license/source/size/feature selection and rejection evidence, and run selected importable contents in the two apps. Record actual cost and GPU/CPU/unsupported classification; node/vertex count is only a prior. Do not replicate models to inflate work.
- Static source/license research may run while Stage 1/2 preparation proceeds. Heavy builds and all browser windows are sequential with root-controlled capture scheduling.

## Stage 4 — complete-path comparisons

Freeze exact app/candidate/tool/source/asset hashes and a per-app scenario table before full capture. Reuse declared native setup, include original duplicated A/A and algorithm-matched JS, balanced orders and original bookends. Initial target is four balanced rounds, 600 warmup and 1200 measured native callback pairs for continuous cases, retaining Task #46 run/block A/A rules. Different content or Viewer boundaries need explicit pre-capture specifications and equivalence checks; do not silently reuse a timer with incomplete coverage.

Run a short correctness/tool smoke first. Primary windows exclude profile, screenshot, GPU query, build or concurrent heavy work. Save raw/warmup/arming pairs, absolute CPU p50/p95/p99, frame intervals, coverage and all failures. Apply adoption-v1 and preserve unstable/inconclusive outcomes. An additional day or device is complete only when actually run.

## Stage 5 — decision, review and integration

Publish per-app adopt/reject/inconclusive verdict with migration, fallback, headroom, profiler limitations and unperformed gates. Audit raw hashes, sampling and timing arithmetic independently. Update #4/#5/#12/#13 without closing broad gates. Run appropriate locked correctness/build/browser/package/doc checks, publish a reviewed PR, require exact-head CI success and compare merged tree to tested head. Preserve original captures/checkouts needed for reproduction.

## Stage Dependencies and Decisions

The approved finite continuation covers this sequence. Profile results may reorder the optimization hypotheses; a larger product/compatibility tradeoff is a separate decision. Do not start primary comparisons before candidate correctness and protocol pins are established. Negative evidence can complete an investigation without qualifying a product or justifying a default backend.
