# Task #19 — Stage 1 report

Issue: [#19](https://github.com/postmelee/three.rust/issues/19)
Plan: [task_m3_19.md](../plans/task_m3_19.md)

## Stage Purpose

Apply the requester's exact separate HTML/JSON/generated-image pattern while
keeping three.rust's capability and evidence denominators explicit.

## Artifacts

| Files | Change Summary |
|---|---|
| tools/progress.py, docs/progress-inventory.json | Independent standard-library generator and explicit capability/evidence inventory |
| docs/progress.html, docs/progress.json, docs/assets/progress.svg | Dark grouped tiles, simple tables, item details and evidence links |
| docs/PROGRESS.md, README.md | Counting rules, generation commands and local page entry |
| tests/test_progress.py, tests/progress.mjs | Counts, invalid states, escaping, geometry and desktop/mobile page checks |
| scripts/progress.mjs, scripts/bundle-demo.mjs, tests/bundle.mjs | Existing npm entry, portable page delivery and bundle validation |
| .github/workflows/ci.yml, scripts/server.mjs | Progress checks/artifacts and SVG MIME support |

## Body Change Scope / Lossless Preservation

The prior status table was replaced with the requested presentation. No historical
measurement or engine implementation changed. The image contains exactly one
tile for each declared item: 29 CPU capabilities and 12 evidence gates. Six scoped
Rust capabilities and seven evidence gates are complete; one gate records the
unfavorable performance result. No total Three.js completion percentage is given.
AnyPS5's public page, JSON and generator were inspected. No GPL implementation
code or artwork was copied; the generator uses independent recursive partitioning
and the project's own inventory. Detailed source references appear in PROGRESS.md.

## Verification Results

- Four Python unit tests passed: counts/tiles, invalid input, escaping, geometry.
- Freshness/English/roadmap checks passed; 6 milestones and 18 issue records.
- Chromium desktop 1280px and mobile 390px: image loads, totals match JSON,
  evidence details expand, no horizontal overflow; screenshots visually inspected.
- Fresh portable demo at work/task19-demo: original/Wasm switch and pause passed;
  included progress page passed the same desktop/mobile tests.
- actionlint 1.7.7 and git diff --check passed.

The managed Chromium policy blocked file:// navigation. Browser verification
therefore used the project's local HTTP server. Direct file opening is supported
by the static/no-script design but was not verified in this managed browser.

## Residual Risks

Curated states require review; file existence is not semantic proof. Capabilities
are not equal work units. The image scales down on mobile; the table and details
provide readable alternatives. There is no public Pages deployment or fabricated
historical chart. sourceRef currently points to the review branch.

## Impact on Next Stage / Authorization

The explicit refinement authorizes inclusion in parent #2. Push and verify fresh
CI plus issue #19's M3 association before the parent final report. Keep issues
open for requester review; no merge or engine expansion is included.
