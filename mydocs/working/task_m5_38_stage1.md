# Task #38 stage 1 — persistent evaluated transform state

Implemented generation-checked indexed native operations, the same f64 JS evaluator,
tracked instance inputs, stable lazy matrix-array snapshots and guarded constructor/
update hooks. Both optional package routes retain the core/addon identity. Default
legacy behavior remains available. No ordinary animation/renderer port is claimed.

Verified: 11 native tests, 12 focused facade checks (six per route), nine existing
differential tests, C1's 16 cases across six Node and six Chromium routes, and two
camera callback/numeric/exact-pixel comparisons. Installed tarball consumers passed
init retry, addon identity, Wasm execution, NodeNext/Bundler types and one-core
bundling for the default and both facade entries. Clippy and infrastructure checks
passed. New boundary smoke (one repeat, three warmup/five samples) passed numerical
comparisons; it is not a performance result. The broader five-scene image run is
tracked in stage 2, not inferred from these tests.

Tests prove zero output copying without matrix observation, a single 128-byte
copy on first observed matrix, dirty-only TRS input, retained references across
growth/release, and skipped upstream compose/multiply. Reflection and structured
cloning of proxies are explicit limits. JS still constructs the operation list.

C1's remote correctness job 39960759361 was confirmed successful. Local PR #36's
port fix supports explicit serve(0), so the new ephemeral-port runner can coexist;
no Mac engine/evidence files were changed. Subsequent repeated measurements must
use a clean committed source, with build/tests outside the timing intervals.
