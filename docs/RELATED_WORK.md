# Fresh related-work review (2026-10-22)

> Historical initial review. A later [pinned build/reuse audit](../bench/results/owned-reuse-20261023/README.md)
> adds compile attempts and limitations; neither review establishes candidate
> full-browser compatibility or performance.


This review reads pinned upstream README/manifests; no project was built or
benchmarked here. All advertised speedups and parity counts are unverified.
No implementation code from these projects is reused.

| Project / commit | Observed interface and reuse decision |
|---|---|
| [WAMR3D](https://github.com/aymen94/wamr3d/tree/c95b1fc93f9b66cb1e0103a3d3dedc26ba389f1e) | Persistent Rust scene and batched object API; explicit init and own WebGPU/WebGL renderer. Useful architectural comparison, but swapping its renderer would confound this experiment. Root LICENSE was not found at queried path: verify exact license before reuse. |
| [eugenehp/threers](https://github.com/eugenehp/threers/tree/b9ec61bd06bc7bc8aca8cd8743b8276f2107d3a7) | README uses initThreers and async WebGLRenderer.create, with wgpu. MIT. Not a synchronous WebGLRenderer substitute for our fixed existing renderer. |
| [oneilltomhq/three-rs](https://github.com/oneilltomhq/three-rs/tree/a6425ff3ac4a427fd7134a5a31fc02eacfa369eb) | Rust core + wgpu/TSL and example image testing. MIT. Image/differential methodology is relevant; renderer/TSL is outside first CPU slice. |
| [three-rs/three](https://github.com/three-rs/three/tree/6403b70f23892db2d5b14c634e404fd2afb67889) | README says abandoned due to old gfx stack; native ergonomic API inspired by Three.js. Cargo declares MIT/Apache-2.0. Not an r186 browser compatibility base. |
| [Three.js #19339](https://github.com/mrdoob/three.js/issues/19339) | Issue author explicitly proposes Rust bindings that create/manipulate objects in the browser JS engine. That solves Rust access to JS, not migration of CPU calculations into Rust. |

Decision: preserve r186 WebGL renderer/material/shader code and independently
implement the measured CPU slice. Candidate engine builds were intentionally
not attempted: the inspected integration contracts already change renderer or
API semantics outside this bounded experiment. This supersedes the bootstrap
suggestion to build one candidate. No candidate performance conclusions follow.
