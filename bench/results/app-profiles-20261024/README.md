# Original application CPU profiles — 2026-10-24

Capture tool SHA: `855012966a136dca89a16b162d9dce805cb0bece` (clean).
Final analyzer SHA: `ab833bb7d65d59857a0e52af99bb6a743d5d66ee`.

16 hardware sampling profiles: two original apps, eight native/authored/control scenarios, two reloads each. These are instrumented diagnostics, not primary timings or a Rust comparison. The [report](../../../mydocs/report/task_m3_5_profiles_report.md) defines conditions, attribution, findings and limitations.

`raw` preserves profiles, observation windows, per-call boundary arrays, WebGL argument counts, fixed-pose wrapper oracles, screenshots, traces, source/resource hashes and environment. CPU profiles are losslessly gzip-compressed; profile-compression.json records their original byte sizes and SHA-256. Local work/app-profiles-001 retains the original uncompressed files. `analysis` contains reproducible exclusive/inclusive call trees, source-position symbol indexes and sampling-gap sensitivity. `development` preserves the input-driving failure and smoke summaries; dirty development HEADs are not exact tooling attribution. Published logs replace only the local checkout path with <checkout>.

Original app/asset pins and third-party notices are in the [preparation archive](../app-preparation-20261024). RobotExpressive screenshots: Tomas Laulhe / Don McCurdy, CC0 1.0. Its 752 validator errors and four warnings remain unresolved. The research engine baseline is unchanged and was not substituted into either app.

SHA256SUMS.json covers every other payload. Do not modify this archive to analyze it: copy raw/ to a fresh work directory, decompress the .cpuprofile.gz files there, then run scripts/apps/profile-analyze.mjs with that directory, the pinned prepared apps and a new analysis output directory.
