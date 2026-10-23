# Task #38 stage 4 — corrected evidence and publication

Issue: [#38](https://github.com/postmelee/three.rust/issues/38). Implementation:
[task_m5_38_impl.md](../plans/task_m5_38_impl.md).

## Purpose and artifacts

Finish the measured correction from stage 3, preserve both full experiments, and
publish a bounded implementation result. The extra reporting stage follows the
initial regression and callback-alias correction; it adds no new runtime scope.

| Artifact | Change |
|---|---|
| [Evidence archive](../../bench/results/facade-c2-20261023/README.md) | Clean initial and corrected raw series, traces, images, profiles, logs and checksums |
| [Result report](../../docs/FACADE_REPORT.md) | Six-engine tables, protocol, negative verdict and next decision |
| [Facade contract](../../docs/PERSISTENT_FACADE.md) | Public behavior, explicit fallback, private-read exclusions and counters |
| Progress inventory and generated HTML/SVG/history | Five scoped callable mappings, 13 owned logical fields; no new product qualification |
| README, plan and execution index | Concise result and next boundary work; existing Mac evidence unchanged |

## Preservation

Initial `b1b8790` measurements are unchanged. Corrected evidence uses clean
`dabcd69d3c30a9560d36ffc9a52862ef329892d8`; the rejected intermediary is not
reported as a completed experiment. Public docs remain in docs/, task records in
mydocs/. Simple progress tables, definitions and visual structure are preserved.
No private session prompt or new hardware claim is published.

## Verification results

| Check | Result |
|---|---|
| Native/differential/types | 11 native and nine legacy differential tests pass; TypeScript passes |
| Focused facade suite | 16 checks pass, including overriding fromArray without leaking private storage |
| C1 oracle | 192 Node/browser executions; 160 candidate/reference trace comparisons pass |
| Browser fixtures | Five scenes / 35 pages; 30 A/A or candidate numeric and exact-pixel comparisons pass |
| Installed package | Three entries, initialization retry, addon identity and two TypeScript resolution modes pass |
| Primary measurements | Each candidate: 36 boundary runs and 108 render runs; six repeats, clean sources, complete raw samples |
| Analyzer | Both series pass completeness and equal-final-render-work checks; diagnostics remain separate |
| Documentation/progress | docs:check and test:progress pass; relative links checked; desktop/mobile status and history pass |
| Delivery | bundle:status, test:status, test:demo, bundle:demo and test:bundle pass |
| Remote runtime CI | [Run 39973619061](https://github.com/postmelee/three.rust/actions/runs/39973619061) succeeds on dabcd69 |

Commands and evidence are in the archive and public report. The documentation
publication commit has its own CI status in the draft PR; the runtime run above
must not be described as that later commit's result.

## Residual risks and next stage

Hierarchy full-path p50 is **15.13 ms original / 37.01 ms facade Wasm**, after the
initial 169.23 ms facade regression. The corrected route loses to original in all
six paired p50 runs of each measured scene. Copy reductions and a faster native
kernel do not compensate for JS traversal, record preparation and public proxies.

C3 must budget persistent topology, dirty commands and prepared renderer consumers
together, informed by original real-application profiles. Keep the default route;
physical hardware, other browser engines and broader release budgets remain open.

## Publication scope

The requester has authorized continuing this implementation unit and draft
publication. Publish on codex/persistent-facade, stacked on C1, with the final
report. Merge and broader issue closure remain separate.

Publication review corrected the new history note: the C2 observation retains the
same denominators. Historical scheme-change notes remain unchanged; future records
use neutral observation wording. Generated-content and seven Python checks pass.
