# Task #23 — Stage 2: public-site artifact and deployment

Issue: [#23](https://github.com/postmelee/three.rust/issues/23)
Plan: [implementation plan](../plans/task_m3_23_impl.md)

The site builder reads committed inventories and assets, selects the last
first-parent commit per UTC day, and omits dates without comparable schema-3
inventories. Uncommitted values cannot leak into a published snapshot. Its
allowlist contains only status pages, JSON, SVG and build provenance. README
links now target the public HTML URLs. Main-only Pages deployment uses official
Actions and narrow deployment permissions; no engine demo or npm package is published.

Passed: docs freshness/English/roadmap checks; a temporary Git-repository test
covering same-day reduction, missing days, dirty worktree exclusion, main-ref
validation and overwrite refusal; desktop/mobile browser artifact tests at the
/three.rust/ subpath; actionlint; git diff whitespace check. The screenshot was
inspected. Stage 1 additionally passed extraction and history tests.

The requester confirmed Pages was enabled in repository settings, and the
repository API now reports has_pages=true. This is activation evidence only;
actual deployment and public HTTP verification still follow main integration.
No Rust implementation, benchmark dataset or historical measurement was changed.
