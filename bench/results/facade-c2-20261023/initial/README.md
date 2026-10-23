# Initial C2 candidate: retained regression

Source: b1b8790bbcdb26d2dca39c29fcc85441c5265a69. Shared Linux CPU / Chromium 154 /
SwiftShader. The six-repeat primary boundary and rendered experiments are complete;
their manifests, raw JSON (gzip) and per-run summaries remain unchanged.

The facade failed the performance objective: hierarchy CPU p50 was 16.64 ms for
original, 172.61 ms for matched facade JS and 169.23 ms for facade Wasm. Every paired
facade-Wasm/original comparison regressed, including small/static and shader controls.
Correctness passed. This is evidence about this implementation, not all possible
Rust facades or physical GPU performance.

`boundary` and `render` are primary runs. `*-diagnostic` contain instrumented runs;
`profile` contains a separate 1 ms sampling profile and its exact diagnostic script.
`smoke` is the earlier short dirty-tree diagnostic, not performance evidence.
`contract-*`, `scenes`, `checks` and `package` preserve final clean-source checks.
`environment.json` records the directly inspected device exposure and browser.
The profile manifest records clean tracked sources; an untracked summary script
existed but did not change the engine. The root report will compare the corrected
candidate without discarding this failure.

Recompute primary summaries from compressed raw files:

```sh
node bench/facade-summary.mjs bench/results/facade-c2-20261023/initial/boundary
node bench/facade-summary.mjs bench/results/facade-c2-20261023/initial/render
```
