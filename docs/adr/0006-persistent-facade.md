# ADR 0006: an opt-in persistent transform facade

Status: accepted for the finite C2 experiment, before implementation and measurement.
Baseline: C1 at 7637881; upstream three 0.186.1.

## Evidence and choice

The legacy bridge scans public TRS and both matrices and copies both results back
on every update. The [boundary investigation](0005-wide-engine-investigation.md)
identified materialization as a cost to test. C1 fixes observable stale/forced
reads, cached identity, overrides and event order; a command-only API cannot stand
in for those behaviors.

Add separate `rthree/facade` and `rthree/facade-js` routes. Rust (or an equivalent JS
arena control) owns evaluated local/world matrices across updates. Instance scalar
setters mark dirty inputs; one ordered operation batch evaluates selected nodes.
Stable array proxies expose results only when read. They are snapshots of the last
evaluation, not implicit requests to refresh dirty world state. The public objects,
TRS inputs, hierarchy and ordinary animation remain JS-owned.

All three update methods need hooks: updateMatrix, updateMatrixWorld and
updateWorldMatrix. Retain the pinned WebGL renderer, materials and shaders, and
measure its actual array reads. Replaced arrays retain exact caller identity and
use the upstream path; custom update overrides keep upstream dispatch. No global
prototype patch or double evaluation is allowed on the supported path.

## Alternatives and boundaries

| Alternative | Decision |
|---|---|
| Eager import/export of every matrix | Retain only as the legacy comparison; does not test selective reads |
| Replace arrays with Wasm memory views | Reject: cached aliases break on growth and public arrays change type |
| Per-scalar Wasm calls | Reject: setters only mark local dirty state |
| General transparent Proxy compatibility | Reject as a claim: reflective descriptors and structured cloning need explicit limits |
| Rewrite animation and renderer in this unit | Defer to measured C3 scope; keep this change reviewable and attributable |

Node generations and release guards prevent stale operation handles. Public
references survive release and re-registration. Traversal and operation construction
remain in JS, so this is bounded derived-state authority, not the whole scene core.
Array interception, topology collection and read barriers can cost more than the
math saved. Compare the same design in JS, retain regressions, and keep the default
engine unchanged. Hardware and application qualification remain separate gates.
