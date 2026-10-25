# Task #29 stage 3: Integrated verification

Issue: #29; implementation plan: [task_m3_29_impl.md](../plans/task_m3_29_impl.md).

## Stage Purpose
Verify clock-policy behavior, unchanged replay output and report execution without claiming new hardware performance.

## Artifacts
[Archived validation](../../bench/results/timing-validation-20261023/README.md) contains raw smoke frames, environment, clock metadata, logs, numeric checks and historical reanalysis. Final code input for smoke: 1080c215904be39aa988265479e8a964f950ad6f, clean.

## Body Change Scope / Lossless Preservation
42 short software-renderer runs are distinct from hardware evidence. Historical Mac data is unchanged; 229 archived hashes independently verified. New archive stores compressed run bytes losslessly with stored-file hashes.

## Verification Results
- Pinned npm install, release Wasm build, checksum-verified Fox download succeeded in the permitted execution environment.
- `npm run test:fox`: 13 rejection checks and 132 numeric/image checkpoints passed; all pixels exact.
- `npm run test:timing`: two tests passed, including all three backends, both hosting modes, complete 600-tick main/diagnostic state equality and cross-mode pixel hashes.
- `npm run test:infra`: 13 tests passed; `npm run docs:check` and shell syntax passed.
- Nine ordinary + nine isolated runs, 21 calibration runs and three diagnostic runs completed; all had 3 warmup/6 samples. Five-phase comparison/evidence execution passed and `fullProtocol` is false.
- Observed minimum clock increments: ~0.1 ms ordinary, ~0.005 ms isolated on this cloud browser; not a performance result.

## Residual Risks
A new hardware run was not possible in this session. CI is tracked on draft PR #30 separately from completed local checks; do not infer final-head CI success from these logs.

## Impact on Next Stage / Authorization
The authorized finite implementation is ready for review. Actual Mac sessions and profile-led optimization remain #4/#5/#7 follow-ups. No automatic merge or milestone closure.
