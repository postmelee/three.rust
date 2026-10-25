# Task #40: amortize prepared-facade matrix observation checks

Follow-up to C3 at ce21ffcf355534a8cf32eb4c9f7e43d6a86509b5, in a separate codex/ checkout. This is a finite observation-cost improvement, not a new native subsystem or a performance qualification.

## Evidence and choice

C3 preserves public arrays through proxies but checks native per-matrix revisions on every indexed read, even after the first element already materialized the complete matrix. The C3 report records a large dense-read regression; original-app PR #43 also identifies synchronous bounds and renderer consumers. Small original-app mixer costs do not justify another animation kernel. Reject a global prototype patch, eager snapshots of all objects, silent callback deferral, and changed public array identities.

Cache the last evaluation epoch checked by each public matrix. Advance a module-local epoch after each successful retained or selective transform evaluation. During an epoch, a valid matrix can reuse its already verified JS snapshot; at the next evaluation its native revision is checked again. Manual array writes, stale reads before update, release/reacquisition, growth and unrelated-root updates must preserve existing semantics. Apply the identical observation policy to prepared JS and Wasm. Keep C2/default routes and native math unchanged.

## Stages and verification

1. Record the plan and initial C3 pin; install locked dependencies and build with Rust 1.90.0.
2. Add upstream differential tests spanning retained/selective/local updates, direct manual matrices, aliases, growth and release. A Wasm-memory access probe must fail on the unmodified implementation and show that repeated reads of a verified snapshot no longer consult native memory.
3. Implement the epoch guard, run native/differential/facade/prepared/compatibility/package tests and actual renderer callback/camera/shadow images. Run a clean-candidate diagnostic only after committing the implementation. Do not infer application speed from an isolated mechanism test.
4. Preserve source/binary hashes, initial failing regression test, results and remaining same-device complete-path/real-app gates. Publish a stacked draft on C3. No merge, progress-count promotion or README speed claim.

## Document location judgment

Extend the observation description in docs/PREPARED_PASS.md, with task plan/report under mydocs/plans and mydocs/report and fresh evidence under bench/results. These preserve the established product-contract and task-evidence roots. The existing task #40 tracks the prepared pipeline; #5 supplies original-app evidence. No personal session instructions belong in these files.
