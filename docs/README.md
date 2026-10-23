# Documentation

three.rust is a research prototype. Start with the current contract and measured
results; historical experiments describe their recorded scope and commit.

## Start here

| Question | Read |
|---|---|
| How do I build and run it? | [Clean installation](CLOUD_SETUP.md) |
| What API works today? | [Compatibility](COMPATIBILITY.md), [explicit owned animation](OWNED_ANIMATION.md) |
| What does the persistent facade support? | [C2 API and boundaries](PERSISTENT_FACADE.md), [observable contract](FACADE_CONTRACT.md) |
| What runs in Rust? | [Current architecture](ARCHITECTURE.md), [ownership map and definitions](PROGRESS.md) |
| How fast is it, and under which conditions? | [Performance summary](PERFORMANCE.md), [C2 regression report](FACADE_REPORT.md), [physical Mac report](MAC_HARDWARE_REPORT.md) |
| What must it achieve to replace Three.js? | [Product goals](PRODUCT_GOALS.md), [milestones](PROJECT_PLAN.md) |
| What is the next architecture experiment? | [Rust engine direction](RUST_ENGINE_STRATEGY.md), [ADR 0005](adr/0005-wide-engine-investigation.md) |
| How do I test, measure or publish status? | [CI entry point](CI.md), [Mac](CI_MAC.md), [GPU runner](CI_GPU.md), [Pages](CI_PAGES.md) |

## Historical evidence

| Record | Scope |
|---|---|
| [M0–M2 report](REPORT.md) | Original transform-bridge experiment, including regressions |
| [Owned pipeline report](OWNED_REPORT.md) | Finite synthetic animation-to-palette experiment |
| [Mac report](MAC_HARDWARE_REPORT.md) | One physical Mac/Fox session; limited generalization |
| [Pipeline preparation](PIPELINE_PREPARATION.md) and [diagnostic](PIPELINE_DIAGNOSTIC.md) | Earlier preparation; not current implementation status |
| [Related work](RELATED_WORK.md) | Initial review with a link to the later build audit |
| [Initial requirements](INITIAL_DISCUSSION.md) | Intent and historical provenance |
| [Decision records](adr/) | Decisions in context; later records may supersede earlier scope |

Raw measurements remain in [bench/results](../bench/results/). Public performance
claims must link to their conditions, limitations and raw evidence.

## Where documentation belongs

| Content | Canonical location |
|---|---|
| Current setup, API, compatibility, architecture, roadmap and public measurement reports | `docs/` |
| Formal decisions and concise rationale | `docs/adr/` |
| Exploratory source analysis, alternatives and dated research | `mydocs/tech/` |
| Issue plans, stage records and final task reports | `mydocs/plans/`, `mydocs/working/`, `mydocs/report/` |
| Troubleshooting process and recurrence prevention | `mydocs/troubleshootings/` |

This follows the [Hyper-Waterfall location rules](../mydocs/manual/document_structure_guide.md).
Task coordination lives in the [execution plan](../mydocs/plans/task_m3_34_execution.md)
and does not establish new public API or performance claims. All tracked directories,
including `mydocs/`, are public. Requester-specific session prompts and model/UI
instructions stay in chat unless publication is explicitly requested.

## Editing and verified-unit updates

- Begin a current reference with its purpose, applicable API/version and present status.
- Use tables for support/comparisons, numbered steps for procedures and fenced code
  for runnable commands. Split by reader task; avoid arbitrary file-size targets.
- Keep essential limitations and numerical conditions visible. Use `<details>` only
  for optional explanation. Give each fact one authoritative home and link to it.
- Keep dated experiments intact. Mark historical scope and link to current guidance;
  do not rewrite old results or move public evidence out of reach.
- In each verified implementation PR, update the affected API/compatibility/architecture
  references and evidence links. Remove obsolete provisional wording only when the
  implementation supports the replacement wording.
- Update ownership claims only when code and tests prove the stated scope. Use the
  existing [generator/history procedure](PROGRESS.md#generation-and-history). A plan,
  issue, passing smoke or cloud timing does not qualify a product gate.
- Keep the existing progress HTML, diagrams, tables and Definitions and evidence.
  A docs-only change creates no new ownership observation or performance claim.
- Write repository documents and work artifacts in English. Conversation with the
  requester remains Korean. Check links, retained entry points and `npm run docs:check`.
