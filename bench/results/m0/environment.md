# Observed cloud environment

2026-10-22. Linux KVM guest, Intel Xeon Platinum 8573C, 5 visible vCPUs,
cgroup CPU quota 400000/100000 (4 CPU equivalents), 16 GiB memory limit.
No /dev/dri or /dev/nvidia* device present. Chromium 154.0.8037.57 reports
ANGLE Vulkan SwiftShader Device (Subzero), SwiftShader driver. Software GPU
work competes for the shared CPU. Headless desktop-size viewport 640×360,
DPR 1, no mobile throttling. No real desktop GPU or display refresh measurement.

Rust 1.90.0 and wasm32 target were provisioned under /workspace/.cloud-setup;
only toolchain binaries/cache are reused, never previous project code/results.
Node/npm/browser versions and launch flags are saved by each manifest.

Network policy file: restricted HTTP host allowlist includes github.com,
raw.githubusercontent.com, registry.npmjs.org and Rust/crates distribution.
VPN configured=false. Environment status reported observations_current=true
but policy state=unknown, no ready secret/outbound identity bindings. Default
command sandbox could not connect to proxy:8080; approved network-enabled
commands succeeded. No direct proxy bypass or credential inspection was used.

New repository initialized in /workspace/work/three-rust-independent. Only
bootstrap 98f59c5… fetched from the existing local repository, then the identical
commit independently fetched from GitHub. Existing working files untouched.
No previous implementation branch, ADR or measurements were read.
