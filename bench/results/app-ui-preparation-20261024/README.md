# Native UI correctness evidence — 2026-10-24

Final clean tooling SHA: `87f39caa835599f56937e0035502c3f2904cd44b`.
Executed: `node scripts/apps/ui.mjs work/app-reproduction-002 work/app-ui-003`.
40 passing checks, including four exact RGBA/numeric reload A/A checkpoints. This is correctness, not timing A/A or profiling.

The `correctness` directory contains the final results, actual pointer coordinates, transform/history states, synchronous event reads, screenshots, numeric arrays, served-file hashes and environment. `development-failures/ui-001` preserves the first failed scrub and screenshot; its header-row click selected another clip. `development-runs/ui-002` preserves the passing intermediate summary before final guards. These development drivers were uncommitted; their HEAD is not an exact source attribution. Original local outputs remain untouched; only checkout paths in published log text are replaced with `<checkout>`.

Application and asset pins/licenses remain in the [initial archive](../app-preparation-20261024). RobotExpressive imagery: Tomas Laulhe / Don McCurdy, CC0 1.0. Upstream source adaptation diff is empty. The original asset's 752 weight errors and four warnings are still unresolved; runtime loader normalization was previously checked, not reclassified as asset conformance.

See the [UI report](../../../mydocs/report/task_m3_5_ui_report.md) for coverage, commands and limitations. SHA256SUMS.json covers every other payload in this directory.
