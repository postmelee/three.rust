# Fresh reuse build audit

Fetched 2026-10-23; exact fresh checkout revisions are in pins.json. Rust 1.90.0,
wasm32-unknown-unknown, Linux cloud; no implementation copied or candidate timing
claim used. Commands exited 0:

- WAMR3D engine/: `cargo check --locked --target wasm32-unknown-unknown -p wamr-core`.
- threers/: `cargo check --locked --target wasm32-unknown-unknown --lib -p threers`.
- three-rs/: `cargo check --locked --target wasm32-unknown-unknown --lib -p three-rs`.

Logs retain compiler output. These are compilation checks, not browser runs or
complete candidate test suites. Browser build entry points inspected: WAMR3D
engine/bindings/build.mjs, threers web/package.json + shim, three-rs web/build.sh.
No candidate browser/performance validation is claimed; issue #15 stays open.

WAMR3D's wamr-core Cargo manifest declares MIT, but the checkout has no root LICENSE
text. Its transform interface includes f32 inputs and a separate engine/renderer.
Do not redistribute its code until the license text is resolved. threers and
three-rs include MIT texts. threers' older scene-facing mixer uses f32 clocks/scene
values and an internal r165-style mixer; direct adoption changes our precision and
scene API. three-rs has f64 animation, arena handles and queued mixer events; source
animation/animation_action.rs explicitly documents draining events after update,
which differs from upstream synchronous event listeners. Reusing the whole crate
also brings its scene/binding and wgpu renderer dependencies. It remains a useful
future integration candidate, not a rejected performance competitor.

For the finite experiment, retain r186 materials/WebGL and independently implement
one descriptor-based CPU domain. This isolates ownership/layout/language without
claiming that a fresh whole engine is preferable. Broader reuse, browser parity and
renderer strategy acceptance remain open. Historical three-rs/three and issue 19339
observations remain in docs/RELATED_WORK.md; they are not new build evidence.
