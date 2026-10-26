# Task 49 Editor candidate protocol independent review

Read-only review on 2026-10-26 of editor-candidate-protocol.mjs, its tests, the committed-protocol proposal and the narrow timing/profile driver diffs. No tests, captures, browser or builds were executed by this reviewer. The implementation owner reports four protocol tests and 77 infrastructure tests passing; runtime smoke remains separate.

## Verdict

No blocking correctness or evidence-integrity regression was found in the inspected diff. Historical invocations without protocol= remain pinned to `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb`. The new candidate is explicitly `85e2c5d500edb0b92ea4ecb997087fded3fed45b`, accepted only through the frozen task protocol, with separate profile/timing output prefixes. This authorizes the declared candidate selection, not a change in the measurement contract or a performance claim.

## Checks

1. **Historical default remains exact.** The no-protocol branch chooses the historical constant and rejects an explicitly different SHA. Both drivers consume the resolved SHA; neither retains a second unchecked CLI path to openRun. Runtime HEAD/cleanliness checks still bind candidateRoot to that resolved full SHA.
2. **Protocol source is committed and constrained.** The resolver realpaths the file, restricts its resolved repository-relative location to the task-plan naming pattern, and requires exact byte equality to HEAD:file. The manifest records the protocol bytes' SHA256, complete parsed value and verification-time tooling SHA. Requested candidateSha, when supplied, must match the protocol.
3. **Dedicated outputs and freshness remain separate checks.** The protocol requires different profile and timing prefixes; each driver rejects the other route's actual declared namespace. Existing mkdir with recursive:false still rejects any reused result directory. The inspected prefixes are `task49-editor-single-profile-` and `task49-editor-single-timing-`; neither is a historical Task46 namespace.
4. **Declared modes remain frozen.** Protocol settings deep-equal the current profile and timing parameter contract. Driver configuration checks ensure those declared scalar values agree at execution: profile repeats/warmup/seconds/sampling/pre-post windows; timing rounds/active warmup/samples/idle counts. The JSON pins the original Editor and adoption-v1 policy and rejects the historical candidate as a new-protocol candidate.
5. **Capture bodies and current fixed conditions are unchanged.** The inspected driver diffs add only argument resolution, validation, protocol evidence and integrity-file lists, plus an accurate deferred-work label. Native setup, source overlays, route ordering, A/A bookends, callback/sample boundaries, scene cases, viewport/quality, oracles, profiler start/stop and analysis loops are unchanged. Existing source and environment finalization remains in place.
6. **Protocol participates in integrity checking.** Both tool inventories include the helper and the exact protocol file, and their existing finalization rehashes them. Changing the protocol or helper during capture fails source integrity rather than silently producing a result under the old metadata.
7. **Tests are meaningful for the narrow guard.** The four tests exercise historical refusal of a new SHA, wrong source/policy/settings/output/requested SHA, full and smoke scalar drift, exact committed-byte acceptance and rejection after a whitespace change, and an unapproved path. This review inspected these tests but did not rerun them.

## Scope and limitations

This helper is deliberately not a complete generic protocol schema. Viewport/DPR, scene-case arrays, native setup, A/A formula and callback code are currently fixed in unchanged, hashed source. validateEditorProtocolConfiguration checks the scalar keys declared in settings, not every field of the full runner configuration. Future changes to those other conditions still require a separately reviewed contract/source diff; the presence of this helper alone must not be described as automatic validation of every possible timing-policy edit.

Protocol rejection occurs before capture setup; malformed/uncommitted arguments do not create a measurement attempt. Once capture begins, the existing fresh-output manifests and failed-run preservation remain responsible for its evidence. The protocol does not build artifacts or certify source-to-build correspondence, hardware quietness, A/A stability, or candidate correctness. The immutable candidate worktree and final committed tooling must still pass the planned source/artifact, hardware and oracle checks before primary comparisons.

The timing manifest removes the deferred `new optimization implementation` label only when a new protocol is resolved; the historical no-protocol 6990 default retains its prior label. The capture body is unchanged. The execution plan uses a separately committed, clean tooling worktree, keeping concurrent Viewer preparation files outside the capture dirty-state gate, and writes to fresh result directories with no concurrent heavy work. These are planned execution conditions, not capture results.

No new engine source or rendering semantics are introduced by this diff. A source-only review cannot establish successful real Chrome initialization or a speedup; those remain the next explicit verification steps.

## Reviewed snapshots

- `scripts/apps/editor-candidate-protocol.mjs`: `0336c37624cf67b740a2651181ec3f8bfe9d86e38c0e50f7013ebfdfd34a679c`
- `scripts/apps/timing.mjs`: `165143bdb1cf08d8a9f55300ab38f91545ea43903283ef9b6e136be64f2eb9f8`
- `scripts/apps/candidate-profile.mjs`: `5a8f824a5920138e74cde36296965dc810bf26d9937235e643459c7bbaed94a5`
- `tests/editor-candidate-protocol.mjs`: `45788779a59cf5600fa4f452d66a86b78272d98d856fbd5ef76491787f4bf452`
- `mydocs/plans/task_m6_49_editor_protocol.json`: `740288d46cbb0c783a536cc45363ddeef25a134c7f14b5eea25be91b47f1dad3`

Integration verification: four protocol regressions and the integrated 77-test infrastructure suite passed. These checks do not replace the new runtime app oracles or full capture.
