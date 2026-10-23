# Task #8 C1 implementation plan

1. Add portable semantic scenarios with independent expectations and stable traces.
   Execute in isolated Node processes for original, JS, Wasm and packed JS. Preserve
   result artifacts and source hashes; fail on missing cases or changed observations.
2. Run those scenarios in separate Chromium pages and add a two-camera render callback
   oracle with pixel comparison. Reuse existing fresh-package/init/type/lifecycle
   tests; add only missing contract coverage. Connect the checks to correctness CI.
3. Publish the bounded matrix and C2 mutation/read rules. Verify native, differential,
   types, package, browser and docs; preserve existing source ownership and performance
   claims. Report findings and draft PR against codex/docs-handoff.
