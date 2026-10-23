# Task #31 stage 4: Preserve the requested simple presentation

The requester clarified that the existing progress.html diagram, ordinary HTML tables, Definitions and evidence and history should stay. The intermediate card-style readiness overview was removed before any public deployment.

The final generator keeps the original heading/diagram and source-summary tables, adds a brief goal link and a normal HTML goal/evidence table, and retains Definitions and evidence. README keeps its existing visible source map and uses a Markdown goal table. Both goal tables come from the same inventory; no new SVG, CSS, dashboard widget or interaction is introduced.

`npm run docs:check` and `npm run test:progress` passed after the correction: two source tests, seven Python tests and both desktop/mobile views. Screenshot inspection confirms the original top composition. The source map, source data, history ledger, history chart and history.html are byte-for-byte unchanged versus parent 8918f7e. Committed-artifact verification is recorded in the final publication update.

This refinement changes presentation only; the prospective adoption goals remain. The user's correction authorizes this stage and publication. No engine or performance acceptance changed.
