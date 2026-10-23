# Task #29: Resolve timing limits and explain measured performance

Issue: #29; milestone M3; branch codex/performance-evidence; base b5a0fc3.
The requester explicitly said to proceed with the evidence-driven direction and publish understandable improvement conditions. This authorizes the implementation, verification and publication stages below. No new engine subsystem is selected without measurements. No automatic merge, paid infrastructure or claim of a new Mac run.

## Document location judgment
Public performance guidance belongs in docs/PERFORMANCE.md with a short README summary, following the existing docs/ report root. Detailed task records remain in mydocs/. New cloud smoke evidence belongs in bench/results/timing-validation-20261023 and must not be described as hardware improvement. Preserve all historical evidence.

## Stages
1. Opt-in COOP/COEP benchmark isolation, actual per-page clock observation, strict phase comparability; separate input/commands from evaluation only in instrumented runs. Keep default deployment unchanged and isolate all A/A/main paths consistently.
2. Reproducible user-facing table and independent Rust comparison guards; tests against historical evidence and intentionally invalid phases. README must include small/static controls and distinguish CPU time, FPS and import compatibility.
3. Browser correctness and short cloud smoke in both timing modes; archive metadata/logs, final report, commit/push and draft PR. Supply precise physical-Mac rerun commands. Hardware execution is unavailable in this session and remains outstanding.

## Decision criteria
Preserve original A/A relative-noise rule. Never accept an additional Wasm benefit if its saving is below observed clock resolution, repeat pairs include regressions, or tail/interval gates fail. Report such screens as diagnostic flags, not statistical/product acceptance. The next measured candidate must explain residual costs: command validation, evaluation, copying, paid reads and rendering. Fine clocks alone do not remove noise, and JS structure improvements must remain visible.
