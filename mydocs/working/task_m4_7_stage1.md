# Task #7 stage 1 — source audit and diagnostic

Read AGENTS and existing product/architecture/benchmark/setup documents. Reused open
issue #7 (M4), with #8/#15/#16 as related work; no duplicate umbrella issue. Applied
the task-start procedure with the requester's codex-branch and ongoing authorization
precedence. Separate worktree based on #32, preserving other working trees.

Audited pinned r186 render traversal, shadow traversal, ordering, callback matrix
computation, batched mesh, ordinary array state, action events and the owned ABI.
Inspected pinned wgpu browser submission, glam SIMD and wasm-bindgen-rayon setup.
No candidate source was copied or dependency added. External sources are architectural
evidence only, not reproduced performance or newly verified reusable builds.

Committed the diagnostic before measurement. The first sandbox invocation failed
at process policy; the first executable attempt exposed an inert-document MIME
error before any samples. Fixed to a small HTML fixture and committed 6c6486c.
Both limitations are recorded in the archive. Built unchanged runtime successfully.
