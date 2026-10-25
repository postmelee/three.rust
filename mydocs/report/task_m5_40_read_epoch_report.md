# Task #40: reuse verified public matrix snapshots

## Result and scope

Prepared-facade matrices now check their native revision once after a transform evaluation, then reuse the verified JS snapshot for subsequent reads in that evaluation epoch. The previous implementation consulted native memory on every element read even after copying all 16 elements. The deterministic regression probe reports 192 unnecessary memory-buffer accesses on the old implementation and zero repeated accesses on the candidate; the first read after a new evaluation still pays the required check and observes the updated value.

This reduces an identified bridge mechanism, not a measured application frame time. Proxy dispatch, first observation/materialization, public callbacks, prepared-pass output and renderer submission still cost CPU. The original C3 negative performance verdict remains in force until a complete-path comparison. No new Rust ownership unit, FPS claim or README performance claim is added.

## Exact changes and source

- Parent C3: `ce21ffcf355534a8cf32eb4c9f7e43d6a86509b5`.
- Plan: `73c34bcab8babc34fefd36622f7efab8fcba1246`.
- Engine and regression tests: `7769caea20d4fc3ab757863fed00ff30e085d50f`.
- Separate hardware correctness tooling: `40ec9385ee79290e45904ce3298c741e91a78341` (clean verification source).
- Built Wasm SHA-256: `95f7aa7a807bd0bd4c9b45f0a855d2305c262cf5b7fef35a2d9dd9dfa889cdd9`; facade-state SHA-256 `d759cdae29dac35b7e30711c16810dbad968625e461cdf5940cb0dc4388af12b`.

`packages/rthree/facade-state.js` advances a conservative module-local observation epoch after successful general/local/selective or retained transform evaluation. Each materialized matrix remembers the epoch in which its native revision was checked. The same policy applies to prepared JS and Wasm; native math, public array identities and C2/default routes retain their behavior. There is no production prototype patch. A temporary WebAssembly.Memory getter probe exists only inside a test and is restored in `finally`.

The hardware test runner now accepts explicit `RTHREE_BROWSER_MODE=hardware`, records the actual renderer for every route and rejects software rendering. Default CI behavior retains software correctness checks. This tooling change is a separate commit from the engine change.

## Verification and preserved evidence

Locked setup ran `npm ci`, `npm run fixtures`, `npm run build` using Rust 1.90.0 and Node 24.15.0. The added Wasm regression first failed against unmodified C3 (192 !== 0), then passed after the change. Both prepared routes also passed differential alias checks covering retained/local/selective evaluation, stale reads, manual local/world matrices, forced updates, release/reacquisition and growth from another root. The full suite further covers topology/events, dirty queues, fallback, overridden consumers and random partial updates.

Commands actually executed:

```sh
npm test
npm run test:facade
RTHREE_BROWSER_MODE=hardware RTHREE_PREPARED_RESULTS_DIR=work/read-epoch-hardware-001 npm run test:prepared
RTHREE_BROWSER_MODE=hardware RTHREE_CONTRACT_RESULTS_DIR=work/read-epoch-contract-node-001 RTHREE_CONTRACT_BROWSER_RESULTS_DIR=work/read-epoch-contract-browser-001 npm run test:compatibility
npm run test:package
npm run docs:check
```

All passed. Native: 14 tests; differential: 9 tests and TypeScript check. Prepared workers: JS 14 passed plus one inapplicable native-access test skipped; Wasm 15 passed. Randomized upstream pass/list/depth/matrix oracle passed. Hardware prepared renderer: original twice, C2 Wasm, prepared JS and prepared Wasm, each with 12 exact-image/numerical/draw checkpoints, plus nested render, callback exception, upload callback and bypass guards. Compatibility: 16 semantic cases and eight browser routes with two camera passes and exact pixels. Fresh package consumer and bundler checks passed.

Actual browser: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, 155.0.8059.86, headed. All five prepared routes recorded ANGLE Metal Apple M4 Pro; compatibility independently recorded hardware use. Host was the M4 Pro/macOS 26.5.2 machine used for the isolated baseline, after that protocol finished. These are correctness captures, so their elapsed test durations are not performance measurements. Raw evidence and source/binary hashes are in [the archive](../../bench/results/read-epoch-20261026/README.md).

## Relation to original apps and next work

PR #43 profiles the pinned original Viewer and Three.js Editor. Their renderer and synchronous bounds/UI work motivates observation and delivery work; they do not execute this candidate. This change does not fix all public-field proxy overhead or duplicate skeleton updates, and prepared C3's bounded mesh path does not establish complete animated-app compatibility.

Next, resolve the isolated baseline's matched-JS A/A regime instability, then predeclare and run a dedicated exact-candidate comparison with upstream and matched JS. Include public reads, uploads, callbacks and renderer delivery in whole-path timing. Candidate integration into both original apps, preservation of every required animation/edit/picking interaction, complete-path timing, repeated-day/device validation and FPS claims remain unperformed. Keep unsupported paths explicit and do not substitute larger Fox clones for actual applications.
