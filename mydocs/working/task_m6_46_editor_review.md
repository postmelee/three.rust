# Task #46 independent Editor evidence review

The independent audit passed without a raw-data or summary mismatch. It recalculated all 70 runs from timestamped callback rows and checked all 24 oracle pages (42 frozen-pose records). The frozen-pose numerical outputs have zero observed error; both raw-pixel hashes and saved PNG bytes match the original references. This is separate from the native dynamic playback checks, not proof that dynamic poses were frame-matched across routes.

Tooling: `a1aad46f2bf8d74176b2b5e2836cbdd1ff34678a`. Candidate: `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb`. Editor: `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`. Source integrity remained unchanged and every run's close-time error list was empty. Full details and raw-input hashes are in [`task_m6_46_editor_audit.json`](task_m6_46_editor_audit.json).

## Independently recomputed observations

Cells are the median of independent balanced-run CPU p50 / p95 / p99, in milliseconds. Original has eight balanced runs per condition; each candidate has four. Bookends affect drift checks but are excluded from these engine medians.

| Condition | Original | Matched JS | Rust-Wasm |
| --- | --- | --- | --- |
| Root-selected, shadow | 1.3300 / 1.5450 / 1.6326 | 2.9425 / 3.2150 / 3.3350 | 2.9800 / 3.2500 / 3.3876 |
| Root-selected, no shadow | 1.2625 / 1.4676 / 1.5601 | 2.7850 / 3.0276 / 3.1350 | 2.8275 / 3.0900 / 3.2200 |
| Root-selected, higher raster load | 1.3425 / 1.5451 / 1.6350 | 2.9500 / 3.2150 / 3.3526 | 2.9750 / 3.2375 / 3.3600 |
| Static idle | 0.0150 / 0.0300 / 0.0380 | 0.0150 / 0.0276 / 0.0456 | 0.0150 / 0.0275 / 0.0365 |

Observed Wasm-minus-original p50 differences are +1.6500, +1.5650 and +1.6325 ms for the three continuous conditions. Wasm-minus-matched-JS p50 differences are +0.0375, +0.0425 and +0.0250 ms. These are observations; the smaller JS/Wasm differences do not establish a stable language effect.

| Original A/A screen, including bookends | Run-median failures | Runs with failing blocks | Failing blocks |
| --- | --- | --- | --- |
| Shadow | 0/10 | 2/10 | 3/40 |
| No shadow | 0/10 | 4/10 | 5/40 |
| Higher raster load | 1/10 | 3/10 | 5/40 |
| Idle | 0/8 | 0/8 | 0/32 |

All continuous A/A screens fail their predeclared block requirement. All balanced candidate blocks pass their own-run screen, but that does not repair the original A/A failures. Preserve the failed original runs and bookend blocks. Do not publish stable relative-performance percentages. Idle costs are close to the observed 0.005 ms clock increment and must remain absolute observations.

All 54 continuous windows independently satisfy pair completeness, non-overlap, finite values, advancing viewport mixer time and consistent repeating Walking phase. Maximum independent circular phase error is below 6e-14 seconds against a 1e-9 second tolerance. Each measured window has 1,200 pairs, about 10 seconds at the observed cadence, and a renderer frame-counter increase of 4,800. All 16 idle windows have zero renderer frame advancement and zero render notifications. No sampled focus, visibility, resize or autosave event was found.

Every continuous candidate window has `preparedPasses=0`, `preparedWasmCalls=0`, `preparedMatrixReads=0`, and `preparedFallbacks=4800`. The Wasm route nevertheless performs actual facade/update work: 162,000 Wasm calls with shadow or higher raster load, and 159,600 without shadow. Both candidate routes materialize 246,000 matrices with shadow and 243,600 without shadow. Every idle counter delta is zero. These counts demonstrate active fallback/update/materialization work; they do not allocate CPU time to Proxy access, guards, copies or renderer submission.

Median-run rAF p50 remains about 8.33 ms across routes. Continuous p95 is approximately 9.91–10.10 ms and p99 approximately 10.305–10.325 ms. Callback-start interval quantiles are retained separately in the audit. No FPS improvement or GPU timing conclusion follows from these CPU measurements.

## Verified conditions and limits

The before/after records agree: MacBook Pro `Mac16,8`, Apple M4 Pro, 12 CPU cores, 16 GPU cores, 24 GB memory, macOS 26.5.2 build 25F84, Node v24.15.0, and Chrome 155.0.8059.86 at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. Both power snapshots report AC power and `powermode 0`; no thermal or performance warning was recorded. The internal screen reports 3024×1964 physical pixels, 1512×982 logical resolution at 120 Hz.

Every run reports Apple M4 Pro ANGLE Metal. Chrome's command line permits SwiftShader fallback, but the observed WebGL backend is hardware Metal. Page viewport is 1280×720 with page DPR1. The selected-scene canvas is 930×378 CSS pixels; the higher raster condition changes only renderer pixel ratio to 2, producing 1860×756 drawing-buffer pixels. Native timeline content/border-box heights are 306/307 pixels. The light's shadow map stays 1024×1024; no-shadow changes its castShadow flag. Skins, morphs, 14 clips, exact bounds, helpers and native timeline playback remain present.

The evidence supports a finite negative adoption verdict for this candidate on this preserved native Editor path: higher observed callback CPU, no demonstrated Wasm advantage over matched JS, and no prepared renderer passes. It does not reject persistent Rust ownership in general, qualify stable performance percentages, identify the exact cause of the overhead, establish a GPU-bound app, or replace a whole-browser CPU/FPS study. Candidate-specific sampling can remain a separate follow-up. The unavailable native unselected-plus-timeline scenario remains explicitly excluded; failed smoke attempts must remain preserved.

## Reproduction

Run `python3 mydocs/working/task_m6_46_editor_audit.py RAW_CAPTURE_DIR NEW_OUTPUT.json` on the preserved full capture. The script independently recomputes all 70 run summaries, the 24 oracle pages / 42 fixed poses and condition/work metadata. The public JSON normalizes only two battery identifier strings; its note and original environment-file hashes preserve that distinction. Existing raw-input digests and numerical results are unchanged. Choose an output outside the capture directory; the audit never overwrites source data.
