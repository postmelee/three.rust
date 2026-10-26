# Task #49: CDP sample ordering and secondary attribution

## Research background

The native Bistro full engine capture completed six correctness oracle pages and nine profiles, but every profile fails the predeclared nonnegative `timeDeltas` analysis gate. The raw inventory records 75 negative intervals among 803,950 samples, with minima from −1 to −4 microseconds across all three routes. The preceding smoke also has one negative interval. Captures, failed analysis outputs, and the strict gate remain unchanged.

## Research questions

- Does the captured Chrome version's official source support nonchronological sample order?
- Can the data support useful secondary investigation without changing the existing time-weighting method or candidate qualification?
- What would a separately specified chronological diagnostic need to disclose?

## Research targets

| Target | Verified identity and reason |
| --- | --- |
| Chrome/Chromium | Recorded revision `804d6b05f089b27af8342622a36558c49401a1d4`; official commit identifies `155.0.8059.86` |
| Chromium DEPS | Pins the exact DevTools and V8 revisions below |
| DevTools | `a7b389bcb341f6e5e1bfa107992d3c327db75736`; inspect its CPU profile consumer |
| V8 | `712e1808de2d7416f1276d0deb1ee4ac978132b8`; commit and version header both identify `15.5.35.25` |
| Historical DevTools reference | `9a696c4e723caa3c7e1f78886da353f1f06a79b0`; comparison only, not the actual browser pin |

The exact dependency match was obtained from [Chromium DEPS](https://chromium.googlesource.com/chromium/src/+/804d6b05f089b27af8342622a36558c49401a1d4/DEPS), the [Chromium commit](https://chromium.googlesource.com/chromium/src/+/804d6b05f089b27af8342622a36558c49401a1d4), and the [V8 version header](https://chromium.googlesource.com/v8/v8/+/712e1808de2d7416f1276d0deb1ee4ac978132b8/include/v8-version.h). This establishes the published source chain for the supplied browser revision; no independent rebuild or binary-to-source verification was performed.

## Findings

### Ordering is a known producer/consumer consideration

The exact [V8 ordering test](https://chromium.googlesource.com/v8/v8/+/712e1808de2d7416f1276d0deb1ee4ac978132b8/test/cctest/test-cpu-profiler.cc#899) acknowledges “slight out-of-order samples” from asynchronous deopt sampling. It disables TurboFan and Maglev before asserting chronological order and avoids combining a native sample helper with sampling-thread samples. This is direct evidence of known ordering behavior. It does **not** establish the cause of any individual Bistro delta.

The [protocol definition](https://chromium.googlesource.com/v8/v8/+/712e1808de2d7416f1276d0deb1ee4ac978132b8/include/js_protocol.pdl#900) uses integer microsecond deltas, with the first relative to profile start, and specifies no nonnegative minimum. The [inspector serializer](https://chromium.googlesource.com/v8/v8/+/712e1808de2d7416f1276d0deb1ee4ac978132b8/src/inspector/v8-profiler-agent-impl.cc#111) emits consecutive timestamp differences into `Array<int>` without sorting. Integer representation alone does not validate every possible negative value.

The [queue processor](https://chromium.googlesource.com/v8/v8/+/712e1808de2d7416f1276d0deb1ee4ac978132b8/src/profiler/cpu-profiler.cc#257) handles a matching VM sample before the sampling queue, rather than merging queues by timestamp. The [profile append path](https://chromium.googlesource.com/v8/v8/+/712e1808de2d7416f1276d0deb1ee4ac978132b8/src/profiler/profile-generator.cc#655) checks the profile start bound but not order against the previous sample. These mechanisms are compatible with the documented behavior, not a capture-specific diagnosis.

### Official sorting is more specific than accepting arbitrary time weights

The actual [DevTools model](https://chromium.googlesource.com/devtools/devtools-frontend/+/a7b389bcb341f6e5e1bfa107992d3c327db75736/front_end/models/cpu_profile/CPUProfileDataModel.ts) reconstructs timestamps, sorts timestamp/sample-ID pairs together, normalizes timestamps, and repairs selected missing samples. Its current path is `front_end/models/cpu_profile/`; the historical `core/sdk/` path returns 404 at this pin.

These operations have different effects. Paired sorting preserves observations. Normalization appends an estimated terminal interval and changes model endpoints. Missing-sample repair can replace an isolated `(program)` observation; tree translation can fold native nodes. Node self time uses hit counts multiplied by an average interval, while frame traversal uses timestamp boundaries. The complete model is therefore not equivalent to the project's incoming-delta weighting. No negative-delta fixture was identified in the downloaded model unit test; upstream tests were not run.

The [historical model](https://chromium.googlesource.com/devtools/devtools-frontend/+/9a696c4e723caa3c7e1f78886da353f1f06a79b0/front_end/core/sdk/CPUProfileDataModel.ts) has the same broad processing sequence. The exact current pin removes the need to infer behavior from that older source. Official model-history requests returned HTTP 429; no introduction commit was established.

### Existing strict failures remain valid

The existing analyzer requires every delta to be finite and nonnegative, then assigns its milliseconds to the sample ID at that index. Negative values fail that declared method. Their presence does not alone demonstrate corrupt CDP data, and the route-wide occurrence does not demonstrate a candidate-specific regression. Small magnitudes do not justify silently changing the gate.

## Decisions

Proceed with a separately labeled **counts-only secondary analysis**. Count raw sample IDs and retain source verification, exclusive leaf categories, inclusive ancestor counts, unresolved observations, complete denominators, and per-run results. Inclusive ancestors overlap. Do not substitute node `hitCount` fields for observed sample occurrences or convert counts into milliseconds. Keep the strict failure linkage and `candidateQualification: false`.

Counts and shares of sampled observations can identify call stacks for investigation. They are not on-CPU cycles, exact execution time, callback quantiles, GPU time, or FPS. Different sample totals between routes do not establish a speedup. No interval sorting, clamping, dropping, or replacement is part of this selected analysis.

## Non-decisions / deferred items

- The cause of each negative interval, including whether it involved deoptimization, remains unproven.
- A sorted-timestamp diagnostic is not implemented or substituted for the failed method. It would require a separate protocol/version, new output directory, retained raw hashes, input integrity checks, a bijective paired permutation, deterministic tie handling, and explicit endpoint/interval ownership rules.
- A future diagnostic must distinguish the complete official DevTools model from a method that adopts only its paired sorting. The latter must not claim official-model equivalence. Any missing-sample replacement, native-node folding, inferred terminal duration, or omitted boundary gap must be disclosed.
- Neither counts-only analysis nor retrospective sorted reanalysis qualifies candidate adoption or replaces the separate primary measurement gates. Migration profiling collection is deferred while the selected secondary analysis is prepared.

## Implementation impact

Keep the strict analyzer and previously preserved failures. Add a separate tool and output format for counts-only findings, with no fabricated zero time values or implied time-based comparison. Require independent validation of source/category accounting and unchanged raw bytes. Use its repeated-run findings to select the next investigation, not to assert that the experimental runtime is faster.

## References and retained source evidence

The [public source bundle](../../bench/results/task49-profiler-sourcepins-20261026/README.md) preserves the original `work/sourcepins/task49-profiler-time-order-001/` bytes. Its manifest records exact URLs, UTC retrieval times, HTTP outcomes, decoded sizes/SHA-256, and wire SHA-256 for 19 successful downloads totaling 661,596 bytes. It also retains the two old-path 404 and two history-request 429 outcomes. The source files and their Chromium, DevTools, historical DevTools, and V8 license files preserve upstream copyright and BSD-style notices; no externally maintained V8 library was copied.

Key decoded SHA-256 values:

- Chromium DEPS: `23ef1ed90785da130901961e4f4179b4fc10adac957eee5622d7e67fe4b82ec5`
- Actual DevTools model: `710dfae00238647201fe3243c133641e3a0930dada500f46cc85e1527c14a82b`
- Exact V8 ordering test: `a74f367793f8cff9de8d1367d6ffb91558cc764d3087c46d4fb60647bdcb0059`

The existing raw validity inventory is `work/task49-viewer-bistro-profile-validity-001/audit.json`. This source review executed no browser run, build, upstream test, sample transformation, or new performance analysis.
