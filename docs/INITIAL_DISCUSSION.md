# Initial project requirements

The initial discussion established these goals:

- Keep persistent state and consecutive CPU work in Rust/Wasm.
- Preserve a documented Three.js-compatible public interface; internal storage may differ.
- Include synchronization, copying, reads and real rendering in performance claims.
- Separate algorithm/layout improvements from language, precision and backend changes.
- Keep unfavorable results and verify third-party performance claims independently.

See the [current plan](PROJECT_PLAN.md), [compatibility](COMPATIBILITY.md) and
[engine direction](RUST_ENGINE_STRATEGY.md) for the present scope.
The [dated reconciliation and provenance](../mydocs/tech/20261022_initial-discussion.md)
is retained as historical task context. It is not current implementation status.
