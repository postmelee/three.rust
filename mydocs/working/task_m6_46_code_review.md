# Task #46 final code review

- Reviewed base: `fa4eead58d19720420a886fdbc898c0b9ebde321`.
- Reviewed head: `a1aad46f2bf8d74176b2b5e2836cbdd1ff34678a`.
- Checkout: `app-verdict-20261026/three.rust`; clean at review start.
- Scope: all 12 changed code/test files, including both fixture drivers, candidate serving/bootstrap, correctness/UI routing, native Editor timing/phase validation, environment capture and test registration. Bulky measurement archives and task reports were excluded.
- Method: bounded read-only source/diff review. No repository edits, browser runs, profiling, builds or test execution during this review. The reported successful full Editor run is not independently certified by this code review; the separate archive audit owns that verification.

## Finding

### P2 — Preserve a returned fixture result before the post-run page query

Location: `bench/candidate-screen.mjs:215` through `:227`.

The timing loop receives the complete `__bench.run()` result into Node, then awaits `state(p.page)` before writing the result file. If that subsequent page query fails because the page/browser closes or the execution context disappears, the already-returned raw samples are discarded. The catch path writes only a failure descriptor with `partialRowsAvailable: false`, although the complete result was available to the driver. This contradicts the intended preservation of failed-run evidence.

Save a minimal record containing the returned result immediately after `__bench.run()` resolves, before any further page operation. Then update it with the post-run state if available. Retain that raw file and reference it from the failure descriptor if a later operation fails. `bench/aa-lifecycle.mjs` already uses this ordering. A small injected post-read failure test can establish preservation without another browser measurement.

This defect does not invalidate previously completed result files. It affects future failures after sample collection and should be corrected before reusing the driver. The measured tooling SHA must remain attached to historical captures; a preservation-only fix must not relabel them.

## Checked conclusions

- No engine, renderer implementation, README or product-document changes exist in this reviewed diff. No new performance qualification is implied by integrating this tooling.
- Candidate routes pin the source SHA and reject dirty candidates; source overlays require exact hashes and unique anchors, archive original/served text and patches, and initialize Wasm before dynamic evaluation of Editor dependencies. Served inputs are hashed and rechecked.
- The candidate server binds loopback, confines resolved files and symlinks to the selected roots, disables candidate routes for original runs, and mirrors only enumerated external resources. Process launches use argument arrays. No consequential new security issue was found in the reviewed scope.
- The shared-browser path closes each fresh context without closing the caller-owned browser. Full Editor captures check tool/app/candidate integrity and power before/after, including failure cleanup.
- Editor instrumentation encloses the original synchronous callback bodies and leaves recorder/snapshot work outside the CPU boundaries. The collector retains first-rAF arming rows, rejects malformed/duplicate/missing pairs, preallocates numeric buffers, and preserves partial exports when the page remains responsive. Original callback exceptions propagate.
- Analysis checks disjoint callback intervals, expected sample counts, native playback progress and fixed-duration modulo action phase using each timeline row's own mixer clock. It does not assume a fixed relative callback order. The phase validator preserves its inputs and is covered by explicit failure and loop-wrap tests.
- A/A uses the original routes and bookends with the declared scene-wide tolerance. Failed stability checks remain visible rather than being filtered out. Quantiles and frame intervals remain separate. The unsupported unselected native timeline condition is explicitly excluded before timing, with the retained discovery failure identified.

## Interpretation and review limits

- Fixture timing includes its existing animate-through-renderer boundary; its interval field is the rAF timestamp difference. Editor timing is the sum of two synchronous callback bodies, not all browser CPU or GPU/display time. Native wall-clock poses are not frame matched between routes.
- Within-route correctness/UI A/A is labeled as such. The separate Editor oracle adds bounded cross-engine image/numeric comparisons; neither establishes general Three.js compatibility or correctness for arbitrary animation phases.
- Prepared fallback counters and actual Wasm execution must be used when interpreting the real app. A positive native-call count does not itself establish that animation, palettes, bounds or render submission are owned by Rust.
- The phase checks reject frozen and inconsistent observed clocks, but are not pose validation. Collection bookkeeping and exports are outside the declared interval. Timestamp overhead and scheduling perturbation remain uncalibrated. Long runtime stalls cannot guarantee a responsive browser for partial export.
- The helper explicitly hashes existing build artifacts without certifying their complete source-to-build correspondence. Build provenance and archived raw/environment evidence require their separate review.
- No performance verdict, archive sanitization claim, CI-success assertion or final report approval is issued by this code-only review.

No additional consequential code finding was identified in this bounded review.

## Finding resolution

The narrow preservation fix was completed within the authorized Task #46 scope. It is committed separately as `68b262fb31cb73cd47a910b57a809075ef315c65` (`Task #46: preserve returned candidate evidence before page observations`). Only `bench/candidate-screen.mjs`, `tests/candidate-evidence.mjs` and the infra-test registration in `package.json` are included. Concurrent documentation edits and every historical measurement artifact were excluded.

The actual shared persistence function writes returned timing rows with `after: null`, or correctness matrices/pixels with `stateAfter: null`, before querying the page. A successful query enriches the saved evidence. Failure descriptors now identify whether the corresponding evidence was written and name its file. This resolves the P2 post-query failure case in both paths without changing the in-browser timing boundary or relabeling historical tooling SHAs.

Validation performed for this fix:

- `node --test tests/candidate-evidence.mjs`: 4/4 passed. Tests extract the actual bounded driver helper and inject page-observation failure after JSON/gzip writes, verify successful enrichment, and verify that initial write failure does not query the page or claim available rows.
- `node --check bench/candidate-screen.mjs`: passed.
- `git diff --check -- bench/candidate-screen.mjs package.json tests/candidate-evidence.mjs`: passed before commit.
- `npm run test:infra`: initial sandbox execution passed 40/42; the existing two server-port tests failed solely because loopback listen was forbidden (`EPERM`). The authorized retry with loopback access passed 42/42, with no skipped tests.

No browser, profile or full measurement was rerun for this persistence-only fix. The original reviewed head and captured timing-tool SHAs above remain historical facts. No unresolved code finding remains from this bounded review.
