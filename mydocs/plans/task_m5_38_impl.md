# Task #38 implementation plan

- Share the pinned f64 composition semantics; native and JS use identical indexed
  state and operation order. Validate handles, bounds and released slots.
- Track instance TRS writes without crossing into Wasm. Preserve Euler coupling.
  Keep stable Matrix4 objects and array proxies from construction, materializing
  evaluated results on observation. Public writes and forced updates are explicit
  barriers; direct reads do not implicitly evaluate dirty transforms.
- Fall back for replaced arrays/matrices and custom update dispatch. Retain
  upstream callback/exception ordering. Do not patch global prototypes.
- Cover native lifecycle, dirty-only synchronization, lazy reads, memory growth,
  release/reuse, all C1 cases, real renderer images and installed-package types.
- Commit sources; measure repeated boundary and browser paths in fresh directories.
  Archive raw data and limitations; update docs/progress/report and draft PR.
