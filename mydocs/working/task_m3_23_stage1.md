# Task #23 — Stage 1: chart-based HTML history

Issue: [#23](https://github.com/postmelee/three.rust/issues/23)
Plan: [implementation plan](../plans/task_m3_23_impl.md)

## Purpose and artifacts

The history page now uses two independently scaled SVG panels, solid Rust
computation/conditional/authority series, dashed inventory totals, hover/tap/focus
readouts and a short daily table. The earlier incompatible counting scheme is
preserved in a collapsed section. tools/progress.py generates HTML and history.svg;
no AnyPS5 implementation code was copied.

## Verification and preservation

`npm run docs:generate` and `npm run test:progress` passed: 2 extraction tests,
6 Python tests, desktop/mobile chart/page/history checks. The new chart tests
cover one real point without a fabricated line, UTC-day reduction, empty history
and refusal to connect different upstream pins. Browser focus reveals exact values;
no document overflow. The desktop screenshot was inspected. Existing engine and
raw measurements are unchanged. The portable demo now includes history.svg.

## Residual risk and next stage

There is only one comparable recorded date. The initial page therefore shows
points, not a trend. Public hosting is not yet enabled; next stage packages the
site and publishes through the normal Pages workflow. Initial Pages activation
requires a maintainer setting not exposed by the current GitHub connector.
The latest request authorizes continuation and main integration.
