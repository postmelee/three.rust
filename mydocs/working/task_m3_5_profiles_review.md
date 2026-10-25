# Task #5: PR #43 review — 2026-10-26

Reviewed head: 7142d3334280db6b4bf4b33105c84ac48d4605af. Correctness CI [40069465879](https://github.com/postmelee/three.rust/actions/runs/40069465879) passed on that head. The correction below requires its own CI. No merge is performed.

## Findings and corrections

- **P2, captured source validation:** profile-analyze.mjs previously parsed whichever prepared source files were present, without checking the capture's served-files/network hashes. Rebuilding Viewer or changing a source file could silently attribute old offsets to new functions. The analyzer now rejects changed, missing and uncaptured source bytes before symbol attribution. Unknown/unresolved profile URLs remain unresolved; document-directory URLs are not parsed as scripts.
- **Description correction:** classification uses fixed-priority regular expressions over the complete ancestry and source URLs, not the nearest matching ancestor. The report now states the implemented method. Buckets remain heuristic; the original estimates are preserved.

No P0/P1 issue was found in the reviewed capture/analysis paths. This is a bounded review, not independent recapture or performance qualification. E1 timed intervals include automation as disclosed; wrapper means are nested diagnostics and GL counters are argument volume. Original source and engine files are unchanged.

## Verification

All 113 archive payload hashes and all 148 currently prepared served-file hashes match. The new source-verifier test covers exact bytes, post-verification mutation, uncaptured files, changed mirrored resources and missing files. All 16 infrastructure tests and docs:check pass. Reanalysis of all 16 existing profiles in fresh work/app-profiles-review-20261026-002 produces a byte-identical summary to work/app-profiles-analysis-002. The first review reanalysis rejected a document-directory URL; that failed output remains in work/app-profiles-review-20261026-001. The corrected resolver preserves the previous unresolved treatment for these URLs.

The original raw archive, capture SHA 855012966a136dca89a16b162d9dce805cb0bece and analyzer SHA ab833bb7d65d59857a0e52af99bb6a743d5d66ee remain historical authorities. No profile or timing result is replaced by this tooling correction.

## Next execution order

1. Reproduce the unchanged research baseline 9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7 on a fresh physical-Mac checkout with the isolated full protocol and original/matched-JS before/after A/A.
2. Examine absolute CPU tails, frame intervals and A/A drift before interpreting a gain. Repeat-day and second-device claims require actual additional runs.
3. Develop a separately pinned renderer/palette/public-read candidate with matched JS, synchronous-read/callback oracles and original-app rendering parity. Small mixer costs alone do not justify another animation kernel. Do not compare the cloud C3 result directly with this baseline or silently replace its source.
