# Task #23 — Published HTML progress history

Issue: [#23](https://github.com/postmelee/three.rust/issues/23) · M3
Branch: codex/published-history

## Purpose and authorization

The requester's latest refinement asks the README history link to open rendered
HTML like AnyPS5's history page. The continuing main-integration instruction covers
this change and a public static project-status deployment. It does not authorize
bypassing repository administration or exposing private data.

## Document locations

Keep public counting/deployment instructions and generated HTML/SVG/JSON in docs/,
Python generation in tools/, static artifact building in scripts/, browser/unit
checks in tests/, and the deploy workflow in .github/workflows/. Keep task records
in mydocs/. This follows the existing approved documentation root.

## Implementation and verification plan

1. Add independently implemented two-panel history charts: actual observations,
   separate scales, solid computation/authority series, dashed declared totals,
   hover/keyboard values, date table and raw JSON. Legacy schema remains separate;
   one observation is a point, not a manufactured trend. Verify generator tests,
   deterministic output and desktop/mobile behavior.
2. Build a minimal subpath-safe Pages artifact, verify it in a browser, add trusted
   main deployment and public README URLs. Initial Pages activation needs admin
   settings access; if absent, prepare/test all artifacts before asking for that
   one concrete maintainer action. Do not claim a live site before a successful
   deployment and public fetch.
3. Publish a reviewable PR, verify applicable CI, integrate under the continuing
   request, and verify the web links. Preserve the completed #21 engine/data work.

Source reference: AnyPS5 history presentation, observed 2026-10-23. Use its behavior
as a design reference; do not copy GPL implementation code. This project's ledger
uses reviewed observations, not retroactive guesses from old branches.
