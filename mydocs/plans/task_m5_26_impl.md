# Task #26 — Implementation plan

The current continuation instruction authorizes these implementation and
verification stages. See the task plan for location judgment and scope.

| Stage | Artifacts | Verification |
|---|---|---|
| 1 | Reuse evidence, ADR, public API contract | Pin/license/source/build logs; finite ABI and acceptance rules |
| 2 | JS owned core and descriptor/command validation | Upstream numeric differential, rejected input and state/read tests |
| 3 | Rust owned core, Wasm wrapper, renderer adapter | Cargo test/fmt/clippy; JS/Rust differential, growth/release, browser images and bypass |
| 4 | Workload/benchmark/package/CI/docs | Repeated raw runs, boundary costs, existing regression tests, package/types, docs freshness, PR CI |

Primary comparison: upstream vs owned JS vs owned Wasm; existing facade paths
remain separate controls. Never label explicit API gains import-only acceleration.
Use new output paths. Commit the experimental ADR before new engine code.
