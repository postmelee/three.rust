# Task #3: Mac hardware qualification and owned real-asset validation

GitHub Issue: #3; related acceptance gates #4, #5, #7–#11. Milestone: M3.

## Purpose and background
Validate PR #27 at e66e067844b75559bea251a7bd381d42210ab3ce on the requester's physical Mac. Preserve the primary checkout and all historical cloud evidence. The requester explicitly authorized implementation, verification, commits, push and a draft PR in this thread; this is the scope authorization for the stages below.

## Scope and design
Qualify native Chrome/WebGL hardware, reproduce synthetic correctness and timing, then add a pinned licensed real skinned asset with deterministic play/pause/blend/root/camera/read inputs. Compare upstream, layout-matched owned JS and owned Wasm using the retained renderer. Do not expand the engine contract or silently omit unsupported asset features. Report limitations, raw unfavorable samples and issue coverage. No merging, issue closing, npm publishing or paid infrastructure.

## Document location judgment
| Artifact | Audience/classification | Selected path | Alternative | Reason |
|---|---|---|---|---|
| Hardware report and reproduction | Contributors; measured experiment | docs/MAC_HARDWARE_REPORT.md and docs/CI.md | mydocs/tech | Follows existing OWNED_REPORT/CI public evidence conventions requested by the user |
| Task records | Internal work | mydocs/plans, working, report, orders | docs | Issue-specific progress, not API policy |
| Raw evidence | Reproducers | bench/results/mac-20261023 | docs/assets | Existing benchmark archive convention |

## Stages and verification
1. Mac browser resolution/environment capture, clean install/build, synthetic numeric/image checks, software rejection, synthetic hardware baseline.
2. Audited real-asset conversion and replay, upstream/JS/Wasm numeric and image oracle, fail-closed unsupported-feature checks.
3. Pre/post original A/A, balanced order, repeated main and separate copy/read/init diagnostics; run-level summaries and report; commit/push stacked draft PR.

## Predeclared protocol
Use a fresh foreground Chrome process and one page at a time, native hardware, identical 640×480 DPR1 canvas. Main synthetic reproduction: 6 repeats, 120 warmup/600 samples (fixed-frame baseline, shorter than full product protocol). Real asset: 6 repeats with all six permutations of three variants, 600 warmup/1800 samples; 5 original-only repeats before and after. Replay uses fixed 1/60 simulation ticks and resets measurement to the same sequence after warming. Include static-one control and scaled rigs separately. Preserve all intervals and run durations. Separate diagnostics use 5 repeats, 60 warmup/120 samples, and explicitly charge reads in main when replay requests them.

Noise rule fixed before measurement: meaningful CPU gain must exceed max(5%, twice the absolute pre/post original median drift, twice the within-session relative median absolute deviation), with useful absolute magnitude above timer resolution. Report >5% static/tail regressions; no hardware product acceptance if A/A fails or screen/numeric work differs. These are single-device sessions, not general hardware certification.

## Risks
Timer quantization, background desktop work, display scheduling and uncontrolled thermals can defeat inference. Asset bind transforms, non-bone nodes and track ordering must be mapped without altering visuals. Unsupported events, additive/cubic/morph/material animation, crossfade scheduling, CPU bounds/raycast and ordinary Bone identity remain explicit exclusions.

## Calibration recorded before real-asset timing
The synthetic hardware run observed median 8.3 ms rAF intervals (approximately 120 Hz). The real-asset main and A/A phases therefore use 1200 warmup / 3600 samples to target approximately 10/30 seconds at this cadence, fixed identically across variants. Actual duration is authoritative; adaptive display or scheduling changes are not a fixed-duration guarantee. Six 600-tick input cycles are measured. Synthetic reproduction retains its predeclared 120/600 protocol and is explicitly short. The requester connected AC power and cannot guarantee absence of background heavy work; noise gates and limitations remain mandatory.
