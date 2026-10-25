# Physical Mac validation

Use this protocol for the existing explicit-owned Fox pipeline on a real Apple GPU.
It measures a fixed experiment, not general Three.js replacement readiness.
[CI overview](CI.md) · [Results](MAC_HARDWARE_REPORT.md) · [Interpretation](PERFORMANCE.md)

## Run

From a clean checkout with the locked toolchain and dependencies:

```sh
npm ci
npm run fixtures
npm run build
npm test
node scripts/fetch-fox.mjs
bash scripts/mac-validation.sh work/mac-session-NEW
```

Choose a fresh output directory. Use AC power and a quiet desktop; finish unrelated
builds/tests before timing. `caffeinate -di` can prevent sleep. The wrapper runs its
own correctness phases before the comparisons and preserves failures.

| Setting | Rule |
|---|---|
| Browser | `CHROMIUM` override, then installed Chrome/Chromium on macOS, then Playwright. Invalid explicit paths fail; record the resolved path/version |
| GPU | Verify browser WebGL renderer and OS/Metal information. Reject software rendering for hardware claims |
| Timing policy | Default `ordinary`; use `RTHREE_TIMING_MODE=isolated` for the precision experiment. All Fox phases must use the same policy |
| Isolation | Fox pages record actual isolation and clock increments. The engine does not require isolation; real external assets may need CORS/CORP |
| Machine | Keep OS/browser/display/power settings fixed. Record background activity and repeat on a separate quiet day |
| Outputs | New paths for every attempt; retain failed/partial manifests and verify source hashes after measurement |

For exact ordinary/isolated commands and evidence interpretation, see the
[next physical Mac run](PERFORMANCE.md#next-physical-mac-run).

## What the wrapper runs

| Phase | Work |
|---|---|
| Preflight | macOS build, CPU/GPU/Metal, power, available display metadata, browser/CDP GPU data, actual WebGL renderer and rAF intervals |
| Correctness | Synthetic owned and Fox numerical/image/bypass checks before timing |
| Calibration | Five repeats of original A/A and matched-JS A/A before and after main |
| Main Fox comparison | Six balanced permutations of original / owned JS / owned Wasm; original-size, 16-rig and static-one cases |
| Boundary diagnostic | Five separate repeats; input/command, evaluation, preparation/copy, read and render buckets |
| Controls | Separate legacy M2 small/static/shader paths, 3840×2160 shader control and original-only asynchronous GPU queries |

Fox main/calibration runs use 1200 warmup and 3600 measured frames. Diagnostics use
600 warmup and 600 samples. Inputs reset after warmup; variants receive the same
work. At the previously observed ~120 Hz cadence, 1200/3600 is approximately 10/30
seconds, not a guaranteed duration. Keep per-run distributions and A/A drift.

## What the numbers mean

| Measurement | Includes / limit |
|---|---|
| Main CPU timer | Input/validation, commands, animation/transforms/palettes, presentation copies, requested snapshots once per 60 ticks and renderer return |
| Separate diagnostic | Extra instrumentation and reads; may repeat upstream traversal. Do not subtract its buckets from uninstrumented main quantiles |
| Startup | Navigation, loading, conversion, initialization and shader/first-draw readiness; shared browser caches, not cold-start certification |
| GPU controls | Separate shader queries retain unavailable/disjoint/pending status; they do not measure Fox GPU time |
| Display | Observed rAF cadence is not independently measured scanout latency or proof of an FPS gain |
| Host metadata | Allowlisted fields exclude serial/UUID/UDID. Apple driver follows OS build; unavailable refresh/temperature values remain unknown |

Legacy controls and initial preflight use ordinary timing even when Fox is isolated;
keep their datasets separate. The old Mac report predates the input/evaluate split.
Cloud software rendering checks correctness only. The existing GPU Actions workflow
measures the legacy M2 workload; this local wrapper does not register a runner or
change that workflow's default-branch restriction.

The historical Mac report records its executed component commands. The current
precision/matched-JS wrapper has not yet supplied a new physical-Mac result. A
passing smoke, preflight or artifact build alone does not qualify product speed.

The separately pinned [Mac candidate/application screen](MAC_APP_SCREEN.md)
records exact-9527 lifecycle diagnostics, C3/epoch fixture comparison, Editor
candidate correctness and a completed native Editor callback-cost screen.
Failed continuous A/A screens remain public. These separate experiments do not
qualify the current Fox wrapper, an app speed advantage or a new baseline.
