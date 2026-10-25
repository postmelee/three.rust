# Task #31 stage 2: Goal-oriented status

Issue #31; M6. Implementation plan: [task_m6_31_impl.md](../plans/task_m6_31_impl.md).

## Purpose and artifacts
The Python generator now emits docs/assets/readiness.svg and embeds the same gate overview and evidence table in progress.html. README leads with replacement readiness and retains the source map in an expandable section. The history link remains adjacent; no overall completion percentage is calculated.

## Preservation and verification
Source inventory, 1,515 callable definitions, 115 state declarations, three historical observations and all source-map counts are unchanged. history.html receives only the shared responsive style. New validation rejects duplicate gates, missing evidence and Qualified claims without matching profile/API tier, report and implementation pin; it establishes traceability, not claim truth.

`npm run docs:check` passed. `npm run test:progress` passed two source tests, seven Python tests and desktop/mobile browser checks. Inspected actual screenshots: desktop cards are readable; mobile shows a wrapping two-column table instead of shrinking the wide image. Existing source detail and interactive history still work.

## Risks and next stage
Product readiness is a reviewed finite gate inventory, not a generated proof of universal Three.js compatibility. Validate the committed Pages artifact and publication separately. The continuation instruction already covers this verification and draft publication.
