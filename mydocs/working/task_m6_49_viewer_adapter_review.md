# Viewer adapter preparation review

This is Node/build evidence for Task #49 Stage 3, not browser correctness or performance evidence. No original Viewer source, original dist, engine source, Editor tool, shared server or package/lockfile was modified by this adapter work.

## Route and source contract

`viewer-adapter.mjs`, `viewer-prepare.mjs` and `viewer-browser.mjs` preserve Viewer upstream `b5ee5dafe27f953ae1b55f42b5fa3697fef08683`. The original r176 dist remains available as `original-r176`. A single externalized application bundle serves `external-r176`, `pure-r186`, `prepared-js-r186` and `prepared-wasm-r186`; only its HTML import map and selected server runtime tree differ. Candidate comparisons must use pure r186 as the reference. Original versus externalized r176 establishes packaging parity; r176 versus r186 remains migration evidence.

The original Viewer package.json/yarn.lock and locked non-Three dependencies are unchanged. Vite 6.4.2 externalizes both `three` and every `three/*` specifier before resolving the core/addons; the selected runtime is independently pinned to 0.176.0 or 0.186.1. This avoids rewriting the original lockfile to select browser engines. Candidate routes require a full clean runtime SHA and existing build hashes. Generated candidate addon bytes must equal upstream r186 bytes except the existing reviewed bare-three-to-relative-index import rewrite.

The source overlays have full SHA guards and unique literal anchors. They replace the app entry with a shared bootstrap, await init before dynamic app evaluation, replace the final DOMContentLoaded callback with a readyState-aware once guard, and pin the decoder base to the server's selected runtime namespace. The original Viewer controls, validators, both renderers, all loader imports and environment choices remain present. Remote HDR environment options remain unqualified until their external resources are prepared. The server supports explicitly allowlisted, hash-verified content mounts for native `App.view(modelURL, ...)` without altering assets.

## Executed checks and preserved iterations

- The first Node unit run passed 9/10 tests. The failure was a macOS temporary-path alias (`/var` versus real `/private/var`) in the safe-file resolver, not an app/build failure. Root canonicalization fixed it. The final unit run passed **11/11**, covering delayed initialization, loading/already-ready documents, exactly-once startup, initialization failure, route/core import maps, source/anchor mismatch rejection, externalization, traversal/symlink escape and source-map content preservation.
- `work/task49-viewer-external-001` was a **successful first Vite build**, not a failure. `work/task49-viewer-external-002` was a fresh successful build after adding explicit source-map and tooling provenance. Both preserve the original r176 source/dist. Their executable JS and CSS outputs are identical. No result directory was overwritten.
- Vite transformed 28 modules. The app chunk contains 18 source modules; the bootstrap chunk contains three build modules. Neither bundles `node_modules/three`; both retain external core references and the app retains its nine addon imports. The preserved output manifest includes source, adaptation patches, module/build inputs, original dist, generated outputs and tooling hashes.
- Node HTTP checks used original-r176 and external-r176 without launching a browser. HTML import-map policy, core/loader/decoder resource hashes and a mounted chess JSON hash were verified. An unlisted content request was rejected as intended.
- `work/task49-viewer-server-node-003` passed five integration checks. It preserves **three expected failure cases**: bad content hash before listening, a newly created test content file changed after server startup (rejected at request and final integrity check), and a copied manifest with a wrong original-source hash. Existing upstream files were never mutated. These are guard tests, not failed application loads.

Commands used the original prepared apps root as `APPS_ROOT`:

```sh
node --test tests/viewer-adapter.mjs
node --check scripts/apps/viewer-prepare.mjs
node scripts/apps/viewer-prepare.mjs APPS_ROOT work/task49-viewer-external-001
node scripts/apps/viewer-prepare.mjs APPS_ROOT work/task49-viewer-external-002
node tests/viewer-server.mjs APPS_ROOT work/task49-viewer-external-002 work/task49-viewer-server-node-003
```

## Source-map invariants

Only source path labels are normalized for public evidence. `mappings`, `names`, `sourcesContent` and every other non-path field remain unchanged; the generator checks this before writing. The manifest retains raw/served map SHA-256, source count, mappings hash, source-body hash and a shared non-path payload hash.

| Map | Source count | mappings SHA-256 | sourcesContent SHA-256 |
| --- | ---: | --- | --- |
| `app-DCiaOplT.js.map` | 18 | `d2b4b2cc2e8a1bbbd3e8cde4d8fde6d3f2b68807051efa8d3c4ee1a7ccdb363d` | `afb00ade2fe9110e998b7a9d47bed1fa06303e41ae355e1142b9b4468e0635ca` |
| `index-C3mYsQHq.js.map` | 1 | `107bfc668410bf8d77082874e381802db2aedcd6d549e1122c0a01b4f2d37bce` | `ec974b2f8b0f7ff579520d8d245a6613274ad7b12b148d50ff78dc155ca8c840` |

## Remaining browser gates

Actual module startup, both-canvas GPU operation, single selected-core object identity, r176 packaging parity, r186 migration differences and candidate strict image/numerical equivalence remain browser gates. The pending correctness driver preserves Robot native controls and fixed poses, distinguishes native interaction from diagnostic pose freezing, checks both canvases and does not collect performance samples. Clean chess/Bistro import and Tokyo's explicitly nonconforming compatibility stress remain separate content checks. No profile or timing qualification follows from this preparation.

## Integrated preparation additions

Optional timing preparation now creates a separate bundled r176 control and a shared externalized timing bundle. Hash-guarded envelopes retain the complete native Viewer.animate and dat.gui.updateDisplays bodies. `manifest.warnings` retains Rollup warning code/message/location/frame with public source paths, and default warning output remains enabled. Guarded optional init missing-export warnings on bundled r176 are retained; no warning suppression or bootstrap behavior change was introduced. The final pre-freeze Node check passed 19 adapter/oracle/content unit tests and five separate transport integration checks. New raw outputs use `task49-viewer-node-004` and `task49-viewer-server-node-004`.
