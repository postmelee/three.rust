# Mac hardware validation of the explicit owned pipeline

Baseline: PR #27, e66e067844b75559bea251a7bd381d42210ab3ce. This report covers the new physical-Mac experiment, separate from historical SwiftShader results. The complete measurement tables and issue coverage are filled only from completed run manifests.

## Hardware and scope

Apple M4 Pro MacBook Pro (Mac16,8), 12 CPU cores (8 performance/4 efficiency), 16 GPU cores, 24 GiB. macOS 26.5.2 (25F84), Chrome 155.0.8059.86, WebGL2 via `ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Pro, Unspecified Version)`. The installed Chrome executable is `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. Rust 1.90.0 release Wasm, Three.js 0.186.1, Playwright 1.56.1, Node 24.15.0. Apple GPU driver version is tied to the recorded OS build.

The preflight began on battery; the requester connected AC before the completed synthetic run and real-asset measurements. The requester cannot guarantee absence of other heavy desktop activity. This is a physical GPU observation on a shared interactive desktop, not a dedicated thermally controlled workstation. No independent display scanout latency, GPU temperature, power use or battery-life conclusion is available. Observed ~8.3 ms rAF cadence motivates 1200 warmup / 3600 samples for the real-asset protocol; actual intervals/durations remain authoritative.

## Compatibility discovery

The pinned [Fox fixture](../fixtures/fox/README.md) retains licensed geometry/material/texture and all three clips, with explicit deterministic input migration. At zero total action weight, two joints expose q versus -q in raw pose snapshots between upstream PropertyMixer and owned evaluation. Both represent the same rotation; world matrices and palettes match. The first failing component-wise check is preserved. Rotation comparisons now account for antipodal representation while reporting raw sign differences. This is not raw quaternion-component identity or general AnimationMixer compatibility.

## Reproduction

See [CI.md](CI.md#physical-mac-validation), `scripts/mac-validation.sh`, and the source/hash manifests in [the raw archive](../bench/results/mac-20261023). Use a fresh output path. Ordinary CI checks software-renderer correctness; a local or self-hosted physical Mac supplies Metal measurements. No runner registration, merging or npm publication is part of this change.
