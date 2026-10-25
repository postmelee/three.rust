# Task #46 implementation and experiment plan

## Stage 1: integration

Preserve all three reviewed research heads through merge commits. Keep facade/prepared resolution, configurable server ports, browser candidate/bypass coverage and prepared demo pause coverage together. Run locked build, native/differential/types, infra/docs, facade/prepared/compatibility/package and browser/demo at nondefault port 4189. The original source/asset archives remain unchanged. Record old PR base/head/CI before retargeting; main integration requires combined exact-head CI and an expected-head merge. Broad issues do not close with integration.

## Stage 2A: prospective A/A lifecycle diagnostic

Purpose: distinguish within-page state from page/context/browser lifetime, without changing the exact historical engine or scene. This is a diagnostic, not adoption qualification.

- Runtime reference: clean checkout at 9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7, locked install and Rust 1.90.0 release build; record generated binary/source hashes. Driver lives on the new tooling commit, whose SHA and file hash are recorded separately.
- Hardware Chrome, headed, same 640×540 viewport/640×480 drawing canvas, DPR1, isolated timing; no profile/trace/GPU query during these calls.
- Scene animated-16, owned-js first; warmup1200, samples3600, fixed historical tick/reset/read behavior.
- Three lifecycle conditions: same-page (a persistent page), new-page (fresh context/page in a persistent browser), new-browser (fresh process/context/page). Three rounds rotate their order: same-page/new-page/new-browser; new-page/new-browser/same-page; new-browser/same-page/new-page. Separate browser processes for the two persistent conditions prevent accidental shared-page contamination. Only one page measures at a time; bring it to front and record focus/visibility.
- Capture original raw return unchanged, start/end focus/visibility/DPR/dimensions, actual GPU/browser argv, CDP task duration/heap snapshots outside timing where available, lifecycle IDs and source/tooling pins. Preserve capture failures. Collect no personal process names or unrelated browser contents.
- Analyze each run CPU p50/p95/p99, callback/rAF intervals and callback-arrival delay; six contiguous600-frame blocks and all final-state/work counters. Never pool frames as independent runs.
- New diagnostic stability screen: every run CPU p50 must stay within max(5% of the condition's median run p50, four observed clock increments) of that median; every600-frame block p50 must stay within the same absolute tolerance of its own run p50. All runs remain, whether this screen passes or fails. Report tails/ranges independently; this is an engineering reproducibility screen, not statistical significance or a retroactive qualification of #45.
- If regimes recur, test original under the implicated lifecycle; if no lifecycle separates them, test longer warmup4800 as a separately labeled condition. Trace/JIT diagnosis, if needed, uses another capture and cannot qualify primary timing. A missing environment metric is unavailable, not zero.

## Stage 3/4 activation

Freeze the candidate render matrix and app feature/cost contract in a separate plan addition after Stage2 evidence and original-app feasibility inspection. First run upstream differential/images, then compare whole paths. Do not port a new subsystem merely because a boundary-only counter improved. Product gates stay unchanged. A declared unsupported path or inadequate realistic CPU headroom must have concrete evidence and an explicit verdict.
