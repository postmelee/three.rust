# Task #3 implementation plan

Scope authorization: the user's explicit end-to-end Mac validation request; see task_m3_3.md.

1. Resolve installed Chrome on macOS while honoring CHROMIUM. Capture allowlisted CPU/GPU/OS/power metadata without device identifiers. Build pinned toolchain; run native, owned differential and real-GPU synthetic image checks. Commit Stage 1 with evidence.
2. Pin Khronos Fox source, license and SHA-256. Load with r186 GLTFLoader, validate supported hierarchy/tracks/material/skin, convert once. Replay all actions with explicit external normal weights; reject unsupported features. Compare root/world/palette/action reads and screenshots at input checkpoints. Commit Stage 2 with evidence.
3. Execute declared pre/post A/A, six-order main and separate diagnostics. Archive raw data, exact source/binary hashes, adaptation patch, environment, commands and summaries. Report all regressions and partial issue coverage. Run regression/build checks; commit final report; push and create draft against PR #27's branch.
