# Physical Mac preparation and correctness — 2026-10-23

**Preparation/correctness plus short tooling smoke only. No quiet main timing, timing A/A, app CPU profile or new performance verdict.** See the [report](../../../mydocs/report/task_m3_4_precision_report.md) and [application screening](../../../mydocs/tech/task_m3_5_apps.md).

Research pin: `9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7`. Actual smoke source: `1ed9cb37de1ea5e3c31b3b6732cbedfc67a936bf`, clean. The separate tooling commit adds configurable validation ports; engine, fixture, lockfile and toolchain sources are unchanged. The full adaptation is preserved in tooling-adaptation.patch. integrity.json records the rebuilt Wasm hash and rechecks every smoke source hash.

## Contents
- preflight/: allowlisted macOS/CPU/GPU/power/CDP/visible headed WebGL observations.
- checks/: install, build, tests, two preserved EADDRINUSE failures, retries, smoke and checks. timing-in-progress-snapshot.txt is an intermediate log; timing.txt is the successful final log.
- synthetic-correctness/: native Apple GPU **headless** two-scene numeric/image/bypass checks.
- fox-correctness/: headed Apple GPU 132 checkpoints and 60 screenshots; numerical and image comparisons.
- fox-rejections/: 13 unsupported-feature rejection cases on headed hardware.
- facade-correctness/: headed five-scene A/A and A/B/C/D comparisons; 20 comparison rows. Soldier-derived screenshots retained locally because redistribution was not audited; exclusions/hashes are explicit in export-notes.json.
- gpu-guard/: actual SwiftShader negative guard result, separate from hardware.
- smoke/: 9 runs × 30 raw frames, 10 warmup; isolated timer observations; original/owned-JS/owned-Wasm. These are not main-performance evidence.
- apps/: source/lock/license hashes for three apps; RobotExpressive structural facts and license. No model binary or external application source is republished.
- remote-state.json: source branches, open PR stack and successful exact-head correctness runs observed during preparation.
- export-notes.json: export-only local-path/battery-ID redactions and image exclusions; originals remain under ignored work/. Raw numeric samples are unchanged. No process inventory is published.
- SHA256SUMS: payload checksums, excluding this checksum file.

## Licenses
Fox model by PixelMannen (CC0-1.0); rigging/animation by tomkranis and glTF conversion by AsoboStudio/scurest (CC-BY-4.0), per FOX-LICENSE.md and the pinned [asset provenance](../../../fixtures/fox/provenance.json). The Fox screenshots are derived from that asset. RobotExpressive by Tomas Laulhe with Don McCurdy modifications is CC0-1.0 per apps/RobotExpressive-LICENSE.md. Three.js, glTF Viewer and Online3DViewer notices are preserved under apps/. Generated control screenshots use the pinned MIT Three.js examples. Local Soldier model and its derived screenshots are not redistributed in this archive.
