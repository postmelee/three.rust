# Original application correctness preparation — 2026-10-24

Read the [report](../../../mydocs/report/task_m3_5_reproduction_report.md) and [plan](../../../mydocs/plans/task_m3_5_reproduction.md).

- Final run: `correctness/`, clean tooling SHA `acea74519b6bde1cb981ed2282a6c2b6ad15b0eb`, 20 checks, six exact image/numeric reload A/A pairs.
- Upstream-only preparation. No CPU profiles, frame samples, timing A/A or engine performance claim.
- `environment.json`: allowlisted physical host/power/display metadata. Final browser/GPU conditions are in `correctness/`.
- `inputs.json`, `resources.json`, `correctness/served-files.json`: sources, dependency/resource hashes and the 148 exercised local files.
- `correctness/viewer-validator.json`: unchanged upstream asset has 752 weight-normalization errors and four skin warnings. Runtime loader-normalized weights are checked separately. A passed reproduction check does not make the asset spec-conformant.
- `development-failures/`: failed or intermediate development records and the stale selection-helper image pair. `logs/` contains executed setup/smoke/check outputs; local checkout paths were replaced with `<checkout>`. Intermediate driver state was uncommitted and is not claimed to be the final clean SHA.
- `licenses/`: original source/asset/runtime notices, including RobotExpressive CC0 attribution. No original model binary, private prompt, session settings, process list or user identity is included.
- E2 scene exports embed model geometry and remain local. `local-only-scenes.json` records hashes and regeneration paths; E1 procedural scene exports are included.
- Browser screenshot UI timers are native application widgets, not measured performance evidence. All app data snapshots are fixed-state diagnostics.

The checked runtime resources are available in the ignored local setup directory. Hash-pinned setup rejects content changes; it does not silently refresh dependencies. Other optional resources and interactions remain unqualified as detailed in the report.
