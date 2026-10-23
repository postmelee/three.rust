# Computation and ownership progress

![Current ownership map](assets/progress.svg)

[Progress history](HISTORY.md) · [Raw inventory](progress.json) ·
[Standalone page](progress.html) · [Source selection](progress-source.json)

The upper band shows the present boundary and the intended Rust-owned pipeline.
The dashed target is planned, not implemented. Computation and state ownership
are independent: the current Rust arena is a cache of authoritative JS values.

## Units and legend

| Color | Meaning |
|---|---|
| Gray | JavaScript execution or JavaScript-owned state |
| Amber | Conditional Rust batch computation; authoritative state remains JS |
| Blue | A callable's computation is implemented in Rust within its declared contract |
| Green | A declared state field is authoritative and persistent in Rust |

The left map has one tile per named callable definition in the selected Three.js
source files. The right map has one tile per statically declared state field in
selected scene/animation classes. These are different denominators, not equal
work estimates. Neither map is a percentage of all Three.js or proof of speedup.
Some public metadata, controls and callbacks may intentionally remain in JS.

`Object3D.updateMatrixWorld` is the sole amber route today. Its eligible subtree
uses Rust composition/propagation; custom dispatch and other paths retain JS.
`Matrix4.compose` is not marked ported globally just because similar arithmetic
exists in Rust. No state field is green: public JS values are still scanned and
matrices materialized. Renderer/shader work is not counted as removed by a CPU port.

## Source extraction

`scripts/progress-source.mjs` parses three@0.186.1 with the locked TypeScript
parser. It inventories named function declarations, class methods/accessors,
variable-assigned functions and `this.method = function` definitions under
animation, cameras, core, math, objects, renderers/webgl and WebGLRenderer.js.
Constructors, anonymous callbacks, inherited duplicates, imported code and addon
sources are excluded. Nested named helpers count independently; source identity
includes path, qualified name, kind where needed and duplicate ordinal.

State extraction covers Object3D, AnimationAction, AnimationMixer, PropertyBinding,
PropertyMixer, Interpolant, Skeleton and SkinnedMesh. It collects unique literal
`this.field = ...`, Object.defineProperty and Object.defineProperties declarations
in those classes, including initialization helpers. It does not infer dynamic
computed property names, inherited fields or arbitrary runtime object structure.
Ordinary nested functions have their own this and are excluded from field collection.

Each item records a pinned upstream path and source line. Every scanned file has
a SHA-256 in progress-source.json. CI regenerates from the clean pinned dependency
and fails on drift. Explicit reviewed overrides in progress-inventory.json add
Rust execution/ownership claims and evidence links; absence means JS. AST parsing
establishes declarations, not correctness or semantic completeness.

## Generation and history

```sh
npm ci
npm run docs:generate
npm run docs:check
npm run test:progress
```

The npm generator first refreshes the source extraction, then runs
`python3 tools/progress.py` (Python 3.10+, standard library only). After an actual
reviewed observation, record the **implementation commit being observed**:

```sh
python3 tools/progress.py --record FULL_IMPLEMENTATION_COMMIT_SHA
```

Ordinary generation never fabricates a new observation or alters history.
The original 6/29 capability and 7/12 evidence counts are retained as schema 2.
The source-derived schema 3 observation uses the same unchanged engine, with a
new denominator. History does not join these into a misleading progress curve.
There is currently one observation per scheme; no trend can be inferred.

Open `/docs/progress.html` or `/docs/history.html` with `npm run dev`. The pages
also ship in the portable demo. GitHub renders HISTORY.md directly, so the README
history link works on main without a Pages deployment. The HTML pages use no
external assets or scripts. `sourceRef` now targets main.

Presentation reference: [AnyPS5](https://boykopovar.github.io/AnyPS5/progress.html).
Its function/instruction units inspired the fine-grained report; no AnyPS5 code
or artwork is copied. This project's generator and source extraction are independent.
