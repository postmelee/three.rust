# Task 49 Stage 1 independent read-only review

Review date: 2026-10-26. Scope: candidate profile driver, shared Editor setup extraction, source capture/resolution, offline analyzer and three related test files. Files were under active implementation; findings refer to the inspected code and must be rechecked after the implementer's changes. This is not a browser smoke result. No source edits, builds, browser launches or test runs were performed by this reviewer.

## Findings sent to the implementer

1. **P2 — Failed endpoint validation can discard raw observation evidence.** In candidate-profile.mjs, the complete cpuprofile is saved before post-profile observation, which is correct. But profile-observations.json is only saved after constructing an object whose `validation` expression calls validateProfileWindow. If focus, autosave, phase or counters fail validation, the raw before/after endpoints are not saved. observationWindow similarly validates before returning, so before-window.json or after-window.json is absent on failure. Persist endpoint observations first, then persist success/error validation and rethrow as appropriate. Retain the failure's exact values, not only its assertion message.

2. **P2 — Warmup can remain pending after interruption if rAF stops.** `page.evaluate(warmNativeFrames, ...)` is awaited without an operation timeout or interruption race. The signal handler wakes delay only, so SIGINT/SIGTERM during a stalled native-rAF warmup may not reach finalization/close. Bound page evaluations and race interruption while keeping raw evidence and cleanup. This is a failure/stop-handling issue, not a request to change native frame scheduling.

These observations were delivered immediately; the implementation owner may already be fixing them. Recheck actual final source before marking resolved.

## Positive checks

- Compared extracted setup and oracleCapture bodies against the previous committed timing.mjs text using an offline string comparison. Both were exact after removing `export` and the new default layout parameter. Native file load, selection, timeline resize/play, precise Box3 bounds, shadow settings, autosave settling, hardware preflight and image/numeric oracle behavior remain intact.
- The sampled interval is Profiler.start → delay → Profiler.stop, with no page evaluation, Debugger, source lookup, forced replay, renderer wrapper or nested stage timers inside that explicit interval. The passive collector is attached but run() is not called; the continuous route does not attach the idle sceneRendered listener. Event listeners and diagnostics exist and should remain disclosed as uncalibrated overhead.
- Oracle-only pass-shape wrapping is restored in finally and occurs on separate oracle pages after fixed-image comparisons. It does not modify sampled renderer paths. Exclusion reporting correctly says sufficient source conditions, not an observed first rejection.
- Raw complete profiles are persisted before the post-profile browser query. Partial profiles are attempted after interruption/errors while profiling. Fresh output creation refuses overwrites.
- Served and debugger source bytes have SHA256-addressed archives. The current resolver also cross-checks serving/network evidence, binds script IDs to exact source bytes, keeps mismatched/unknown code unresolved, and maps Wasm indices only after exact served-binary identity. It does not invent symbols from byte offsets.
- JS classification uses source identity plus AST ranges. Exclusive and context buckets account each sample once, while inclusive costs explicitly overlap. Raw function names and call frames remain preserved. TimeDelta weighting, large gaps, GC/idle/unresolved samples and a separate sensitivity view are retained rather than deleted.
- Native endpoint validation checks focus/visibility, viewport, autosave, action/mixer advancement and backend/native work. Its limited endpoint scope is explicitly described. It is not per-frame phase proof or whole-browser CPU timing.

## Limits to retain in the stage report

- Real Chrome/CDP scriptParsed timing, inline offset behavior, Wasm bytecode availability and symbol coverage are not established by mocks or this review. Run the planned smoke before a full profile, and preserve unresolved coverage if CDP omits data.
- Reusing setup source establishes construction equivalence, but only actual fixed-image/numeric oracles verify the final runtime/module graph. Six oracle pages with two poses each are a finite subset, not complete Editor compatibility.
- The before/after unprofiled windows currently observe cadence/counters, not callback CPU duration; they cannot quantify or subtract profiler overhead. Requested 100us sampling is not proof of the delivered interval or on-CPU cycles.
- Sampling is endpoint-validated native E3 shadow behavior only. No primary quantiles, A/A qualification, FPS or GPU-performance claim follows. The unresolved Task 46 A/A problem remains separate.
- Dynamic source requests are archived by the local server; their I/O is not globally disabled during sampling. Expected setup resources should already be loaded, and any observed late requests should be disclosed or investigated rather than claiming a hard no-I/O guarantee.

## Source snapshot

| File | SHA256 at review completion |
|---|---|
| `scripts/apps/candidate-profile.mjs` | `c393b3836df4fad5ee9dd3bf06502af99ca0a2f9ee9d9117b1dd1c6c861b74ca` |
| `scripts/apps/candidate-profile-session.mjs` | `c17902576fb5cf6261579a5025c1f64d19d38a481b27a3ab89dc193a8972d27f` |
| `scripts/apps/candidate-profile-sources.mjs` | `032e73e3c1c75c9c40a3fc220fec7b28d34aafdaf70d10c89aaf3c7d3a3aa542` |
| `scripts/apps/candidate-profile-analysis.mjs` | `54f0a03056dfb191098c3ffcbb27d7ceed06baee70bd81a8681046735d0fb614` |
| `scripts/apps/candidate-profile-analyze.mjs` | `2d387e15108418ece5587f048236cb68e8b7f03bb8b9e60314ec6b9109548d15` |
| `scripts/apps/editor-scenario.mjs` | `a55000eb72b30cfd0deab1915c5e36991f26a563cb8a3c67e9afce4065f980af` |
| `scripts/apps/candidate-browser.mjs` | `f3be9be2879d397d51cf159e021f5f25cd0d058e552a8f4a7d3e9c48590232c7` |
| `scripts/apps/timing.mjs` | `e4a110317da7ea8c46f941238e0971fe12b297993ccd7b933bf529487c0e8687` |
| `tests/candidate-profile-analysis.mjs` | `8d233fe828ac149131b5239eecd44ad3e6c7e28cbe25d8b90bfe27bd9749ec60` |
| `tests/candidate-profile-session.mjs` | `08235c52f64a5a67b6f1bf61dc270cef6bec59e6ae55ec112d77c0671e388321` |
| `tests/candidate-profile-sources.mjs` | `92421f63824c3319f6b40cc6dee0b503fbaff957adf2dfd786a0ded67abf5a76` |

## Targeted recheck after implementation freeze

Read-only recheck on 2026-10-26: both independently raised P2 findings are resolved in the inspected source.

- **Endpoint retention resolved:** preserveObservation writes the raw object before validation, writes validationError with the original endpoints on failure, and rethrows. The profile driver now uses it for warmup, before/after observation windows and profile observations. Observation windows also save their initial endpoint before waiting, and profile-observations.json is initialized with its before endpoint before Profiler.start. The complete profile remains saved before any post-profile snapshot. The new actual-helper test checks retained before/after values plus the semantic failure text.
- **Warmup interruption resolved:** boundedOperation races the page operation with a timer and AbortSignal and removes the timer/listener in finally. The driver aborts its controller on SIGINT/SIGTERM, bounds warmup at 60 seconds and endpoint evaluations at 10 seconds. This allows driver finalization to close a page even if its own pending rAF promise never resolves. The new test covers timeout, an in-flight abort, an already aborted signal and successful completion. No native rAF scheduler or app update body is changed.
- **Additional classifier correction reviewed:** scalar.get/trackFacadeObject accessors now have a separate scalar/input/flag category; only verified materialize/readFacadeElements/trackedMatrix qualified labels enter the matrix materialization/proxy category. Generic get/set labels remain facade other. The new regression test covers scalar, flags, tracked matrix get/set and unqualified accessors; this avoids assigning ordinary scalar access to matrix copying.

No remaining blocker was found in this targeted source review. The implementation owner reports 24 unit tests passed; this reviewer read the tests but did not rerun them. Actual Chrome smoke, CDP source coverage, native phase checks and interruption cleanup are still runtime verification responsibilities, not established by this source review. The previous scope/overhead limits remain in force.

| File | SHA256 at targeted recheck |
|---|---|
| `scripts/apps/candidate-profile.mjs` | `fed983f3e69e5e32da43ecf7482b4939ba7fb5ad77b073aadb101c60ab89a0c8` |
| `scripts/apps/candidate-profile-session.mjs` | `3618288e5590f7f7585ccccc1b91e2876224c6815da732223d36879b017aba43` |
| `scripts/apps/candidate-profile-analysis.mjs` | `80206bf889b993438946bdda47e26e1c1ccc23b284fb241d16c1ab9ac64ae416` |
| `scripts/apps/candidate-profile-sources.mjs` | `032e73e3c1c75c9c40a3fc220fec7b28d34aafdaf70d10c89aaf3c7d3a3aa542` |
| `tests/candidate-profile-session.mjs` | `1d2389feb4c2e8decd8bb2d1d667f13502ba5a73204f399429f68b73754a11bf` |
| `tests/candidate-profile-analysis.mjs` | `25917694bf79a491799fe37141965a1fdcd50e8d440b97c6cb1e75924a90f204` |
| `tests/candidate-profile-sources.mjs` | `92421f63824c3319f6b40cc6dee0b503fbaff957adf2dfd786a0ded67abf5a76` |

## Root verification before hardware smoke

The integrated infrastructure suite was independently rerun after the fixes: 66/66 tests passed, including 24 candidate-profile tests. Node syntax checks, documentation checks and `git diff --check` passed. Locked `npm ci`, fixtures, build, `npm test` and pinned Fox fetch also completed before profiling. Fresh build core/runtime/facade/Wasm and lock hashes equal the immutable epoch candidate; no engine changes enter this tooling commit. Hardware smoke remains the next verification step.
