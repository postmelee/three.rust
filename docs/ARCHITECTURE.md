# Architecture

The implemented runtime has two distinct API paths. The planned broader engine is
not yet a replacement for either path.

| Path | State authority and work | Contract |
|---|---|---|
| Compatible transform bridge | Public JS objects own mutable values; a Rust arena computes eligible transform batches | [Compatibility](COMPATIBILITY.md) |
| Explicit owned animation | Rust owns finite clips/actions, poses, hierarchy, world transforms and palettes; JS consumes final presentation data | [Owned API](OWNED_ANIMATION.md) |
| Wider compatible CPU engine | Planned facade and prepared-pass boundary through visibility/order/upload preparation | [Direction](RUST_ENGINE_STRATEGY.md) |

## Transform bridge

Public objects remain the r186 JavaScript implementation. They are the public
mutation surface. Each eligible `updateMatrixWorld` call collects the subtree in
parent-first order, synchronizes observed values into a persistent Rust arena,
executes one Wasm batch, and writes local/world results back into the same public
arrays. The method returns instead of running upstream JS compose/multiply.
The existing renderer consumes those results without a second scene transform
pass. Its view/model/normal matrix work, culling, sort, skeleton update, GPU
submission and shaders are not ported or removed.

The build verifies the exact upstream Object3D SHA-256 before applying a single
source hook. It bundles that source as one core and rewrites addon core imports
to the same package root. There are no global prototype patches in the package.
Instrumentation wrappers exist only in M0 profiling. The runtime does not import
Three or call its JS math from Rust. Wasm instantiation has no JS math imports.

Arena layout is 64 f64 slots per node: 0–9 TRS, 10–13 pivot/presence,
14 parent index, 15 auto/world-auto/needs flags, 16–31 local matrix,
32–47 world matrix, 48 propagated force, 49 has-parent. Slot zero stores the
external parent world matrix and incoming force. Parent indices precede children;
the Rust kernel validates topology before computing. Rust owns Vec storage and
retains state across frames. JS compares before stores but still scans each
field. It writes 32 result elements per node each call, preserves Array identity,
and recreates a typed view if Wasm memory grew. This is not zero-copy public API.

Contexts are weakly keyed by subtree root; ephemeral traversal arrays currently
allocate on every batch. A root with custom update methods cannot batch as one
unit; original JS traversal invokes descendants, which may individually batch.
Camera and SkinnedMesh override/post-processing therefore execute in original
order. `updateWorldMatrix` and synchronous read helpers remain JS; those results
are observed by the next batch. No hidden stale-state cache assumes the frame
boundary is the only update boundary.

`release(root)` frees arenas currently associated with that root and descendants.
If an arena-owning subtree was removed earlier, release it separately or allow
best-effort GC cleanup. Rust handle IDs are never recycled; released IDs fail
rather than alias new objects. Tombstone metadata and the Wasm high-water memory
remain. This is a research alpha, not an optimized lifetime manager.

Three controlled implementations share the source/package: B returns to original
JS immediately; C executes Rust; D executes the same packed calculation in JS.
A remains the official upstream module build. D measures this particular batched
JS implementation, not the best achievable JS engine. Every mode retains the
same public APIs and assets in the tested fixture set.

## Intended ownership boundary (not implemented)

```mermaid
flowchart LR
  JS["JS facade / application"] -->|"Changes / commands"| R["Persistent Rust scene state"]
  R --> A["Animation + transforms + bones"]
  A --> V["Visibility + per-pass render lists"]
  V --> B["Handles + dirty output buffers"]
  B --> GL["Prepared renderer adapter"]
  GL --> GPU["Browser graphics API / GPU"]
  R -->|"Specified synchronous read barrier"| JS
```

This is the long-term hypothesis, not the current architecture. It needs an
ownership contract, actual renderer bypass and a complete-path comparison with
an equivalent optimized JS pipeline. Ordinary renderer.render(scene,camera) is
not a generic prepared-list input. See PROJECT_PLAN.md and ADR 0002 for gates.
