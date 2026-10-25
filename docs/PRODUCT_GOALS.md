# What would make three.rust worth adopting?

**Destination:** a Three.js application can move to `rthree` with little application
change, retain its visible behavior and ecosystem integrations, and gain enough
performance headroom to justify the migration and operational costs. Rust is an
implementation choice; translated functions and Rust-owned bytes are not the
product outcome. Keeping the existing renderer is compatible with this goal.

The current stage is a research prototype. The 16-Fox result is encouraging
engineering evidence, not replacement qualification. Its 0.25 ms saving does not
meet the prospective 1 ms application budget below, and it requires an explicit
API change. Neither observation invalidates the experiment.

## Two useful releases on the way to that destination

| Level | What an application receives | What we may claim |
|---|---|---|
| Useful accelerator | An explicit owned domain for a declared workload; documented commands/reads and migration diff | Faster supported application path, with its migration and feature limits |
| Application replacement | The same declared applications run with import, explicit initialization and package/asset resolution changes; application logic and behavior stay intact | A replacement for that tested application cohort and supported Three.js version |
| Broader adoption | More independent applications, features, browsers and versions pass the same gates | A larger published support matrix; never automatic compatibility with every addon/API |

The useful accelerator is a valid first product, but does not satisfy the ultimate
low-migration replacement goal. Application replacement does not require porting
all Three.js code to Rust. An unmodified JS subsystem can remain if it preserves
behavior and does not defeat the measured benefit. Unsupported domains must reject
or use a documented, measured fallback without silently dropping work.

## Prospective qualification profile v1

These are **design targets for future qualification**, chosen before the next
product experiment. They are not current results, statistical significance tests,
or promises about all devices. Freeze workload definitions, quality, hardware,
browser, noise rules and budgets before measurement. Revise a target only with a
published rationale and a new profile version; do not move it after seeing a loss.

| Gate | Target and acceptance evidence |
|---|---|
| G1 — Useful application speed | On each declared CPU-heavy target scenario, reduce application-to-render-return CPU **p50 and p95 by at least 20% and at least 1 ms** versus pinned Three.js. Include input, synchronization, copying, reads and submission. Use at least three realistic interaction scenarios from at least two independent applications, with at least two asset families. At least one must come from an existing application rather than a benchmark built to suit the engine. Select workloads with an observed CPU bottleneck, normally at least 5 ms/frame, without artificial inflation just to pass. Preserve controls and every failing case; no portfolio average may hide a failure. |
| G2 — Justified Rust default | Compare identical layout/algorithms in optimized JS. To make Wasm the recommended backend for the target cohort, aim for a further **10% and 0.5 ms reduction in p50 and p95**, above baseline-specific A/A noise and observed clock increments, on those same scenarios. Include boundary/startup/read costs. If this fails, keep Wasm experimental, narrow its recommended scope, or choose the measured JS design. An architecture win must not be sold as a language win. |
| G3 — Affordable migration | Accelerator release: publish complete before/after app diffs, changed integration code, unsupported features and required command/read boundaries. Replacement release: those same apps need only imports, explicit preparation and package/asset resolution changes; no rewriting application logic or asset pipeline, no private renderer fork in each app. Validate actual consumer installs, TypeScript, one core identity and the addons those apps use. |
| G4 — Equivalent behavior | Freeze each app's feature contract before optimization. Differential and image tests cover its animation controls/events, hierarchy/direct writes, synchronous reads, picking, callbacks, cameras, shadows/materials and other features actually used. Preserve visual quality, visibility policy, interaction sequence and work. No disabling features in the original app merely to fit the port. Unsupported and untested behavior stays explicit. |
| G5 — Bounded total cost | On small/static/GPU-heavy controls and target tails, CPU regressions must stay within **max(5%, 0.2 ms)** at p50/p95/p99; p95/p99 frame-interval regressions within **max(5%, 0.2 ms)**, with A/A noise assessed separately. Initial v1 budgets: at most **50 ms extra p95 time to first useful interaction**, **1 MiB extra compressed transfer**, and **max(10%, 16 MiB) extra steady/peak application memory**, using fixed cache/network conditions and comparable memory accounting. Include 30-minute interaction and repeated acquire/release checks for retained-growth bugs. Missing measurements do not pass. |
| G6 — Reproducible, supportable release | Qualify on at least two real desktop hardware classes (Apple and a non-Apple desktop) and two supported browser engines, with at least two sessions on different days per declared configuration. Keep renderer/driver/browser identity, balanced repeats, baseline-specific A/A, raw data and all regressions. Publish the tested version/API/addon matrix, clean-install checks, reproducible package/builds, lifecycle/error contracts and an upstream-update policy. Software-renderer CI is correctness evidence only. |

A 60 Hz application has about 16.7 ms between frames; a 120 Hz application has
about 8.3 ms. Saving 1 ms is useful CPU headroom, but does not by itself establish
higher FPS. Where an application is visibly CPU-limited, also predeclare and
measure a user outcome such as fewer missed frame budgets or higher supported
scene density at unchanged quality and cadence. Count rAF gaps as a cadence
metric, not proven dropped display frames or input latency. GPU-limited apps may
need rendering/content changes that CPU-language conversion cannot supply.

Budgets in G5 are initial product choices, not industry standards. First-use
measurement includes Wasm download/compile/setup rather than only warmed frames.
Measure JS heap, Wasm allocation and browser/process or GPU memory with named,
comparable boundaries; do not add overlapping counters. If the required memory
measurement is unavailable, qualify a narrower claim instead of reporting a pass.

## What Status means

The [declared gate inventory](product-goals.json) drives the overview in README and
the standalone progress page. **Early evidence** means a relevant experiment
exists but the gate is not met. **Not yet** means the required evidence is absent
or insufficient. **Qualified** requires a reviewed qualification report for this
profile, a pinned implementation and its raw results. File existence validates
traceability, not truth; review remains necessary. There is no overall completion
percentage and no automatic qualification from green source tiles.

The detailed source map still answers *where computation and state live*. Its
[history](https://postmelee.github.io/three.rust/history.html) remains implementation
history; old counts are not rewritten as adoption progress. Product status changes
are reviewed in the inventory's Git history until a genuine qualification series
exists. An explicit accelerator qualification and a replacement qualification must
name their API tier separately.

## Next decisions

1. Finish the [quiet hardware comparison](PERFORMANCE.md#next-physical-mac-run) to
   distinguish Rust benefit from the matched JS design. This resolves the current
   experiment; it alone does not qualify the product portfolio.
2. Identify and pin the real application cohort and feature contracts. Profile
   representative interactions, including reads, scene edits and lifecycle work.
3. Investigate a wider CPU engine as described in [ADR 0005](adr/0005-wide-engine-investigation.md):
   a compatible facade and prepared-pass experiment through visibility, ordering
   and upload preparation. Run finite prototypes alongside real-app profiling;
   the small Fox result need not pass product gates before this research starts.
   Apply shared data-layout/algorithm improvements to JS controls too. Whole-path
   costs and required app features still decide what becomes a supported product.
4. Run G1–G6 for an explicit accelerator, then reduce migration costs and rerun
   them for application replacement. Publish a narrow, negative or backend-change
   verdict when the evidence calls for it.

## Milestone and issue mapping

M3 supplies the cohort, profiles and baselines ([#4](https://github.com/postmelee/three.rust/issues/4),
[#5](https://github.com/postmelee/three.rust/issues/5)). M4 freezes the gate profile,
API tier, cost budget and ownership contract ([#7](https://github.com/postmelee/three.rust/issues/7),
[#8](https://github.com/postmelee/three.rust/issues/8)). M5 implements and verifies
one justified pipeline. M6 evaluates G1–G6 and publishes the adoption verdict
([#12](https://github.com/postmelee/three.rust/issues/12),
[#13](https://github.com/postmelee/three.rust/issues/13),
[#14](https://github.com/postmelee/three.rust/issues/14)). M7/M8 supported delivery expands only where
that verdict and residual profiles justify it. The gate list does not close any
of these issues or replace their detailed acceptance work.
