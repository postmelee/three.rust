# Task #46 integration review

## Scope and decision

Combine the reviewed engine, actual-app preparation/profile and exact-baseline archive histories, retaining stage commits and all historical pins. The pre-retarget PR base/head/CI inventory is [recorded here](task_m6_46_integration_refs.json). All twelve exact heads are ancestors of the integration candidate and all twelve recorded head CI runs succeeded. This is research integration, not product qualification or a new performance measurement.

## Conflict resolution and independent read review

- Preserve configurable server origin/error handling together with all facade/prepared import maps.
- Browser tests retain seven candidate routes, actual Wasm execution assertions, and the nondefault server origin.
- Demo tests retain legacy/prepared JS/prepared Wasm routes, pause behavior and the nondefault origin.
- Keep both app and engine infrastructure scripts and combine historical daily records.
- The three parents' bench/results payloads have no modifications or deletions. All 407 baseline and 116 epoch-guard payload hashes were independently checked.
- README, product-goal inventory, ownership inventory and runtime package files match epoch-guard head 6990fd92f61a031c8c2ba7a8282cfb63684e6dfb. No performance claim or qualification is promoted by the merge.

A separate read-only review of the epoch guard and actual conflict resolutions found no blocking correctness issue within this bounded scope. This is not a complete independent audit of every inherited engine subsystem.

## Local integrated verification

Locked setup: npm ci; npm run fixtures; npm run build. All commands below passed sequentially; no primary timing overlapped them. [Logs](../../bench/results/task46-integration-20261026/manifest.json) preserve actual output, normalized for checkout paths and trailing blank lines.

```sh
npm test
npm run test:infra
npm run docs:check
npm run test:facade
RTHREE_PREPARED_RESULTS_DIR=work/task46-prepared-001 npm run test:prepared
RTHREE_CONTRACT_RESULTS_DIR=work/task46-contract-001 RTHREE_CONTRACT_BROWSER_RESULTS_DIR=work/task46-contract-browser-001 npm run test:compatibility
RTHREE_PORT=4189 RTHREE_RESULTS_DIR=work/task46-browser-001 npm run test:browser
RTHREE_PORT=4189 RTHREE_DEMO_RESULTS_DIR=work/task46-demo-001 npm run test:demo
npm run test:package
```

The source conflict-resolution commits are ccc1602 (apps) and 05bf604 (archive); c75fe9d adds the prospective plan only. These integrated browser checks use the default software renderer and prove correctness, not hardware speed. Prior hardware captures stay linked to their original immutable SHAs. The complete primary and app candidate experiments remain pending under #46.

## Remote integration gate

Publish a main-target integration PR, require successful CI on its exact head, then merge with an expected-head merge commit. Preserve the original PR bases/heads before retargeting their already-contained commits to main. Confirm API merged status and ancestry rather than assuming indirect merge. Broad #3/#4/#5/#12/#13 remain open; finite implementation acceptance must be distinguished from remaining performance gates. This record precedes the remote integration and does not claim it already happened.
