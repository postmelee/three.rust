# Task #19 — Standalone progress page and image

Issue: [#19](https://github.com/postmelee/three.rust/issues/19)
Parent: [#2](https://github.com/postmelee/three.rust/issues/2)
Milestone: M3
Branch: codex/ownership-roadmap (active batch refinement explicitly requested)

## Plan and document location

The requester supplied the exact AnyPS5 presentation reference. Replace the
initial status-only SVG with a dark grouped tile map and a separate simple HTML
table generated alongside JSON by tools/progress.py. Keep public outputs and
counting rules in docs/, source inventory in docs/progress-inventory.json, task
records in mydocs/. This follows the existing approved documentation root.

## Implementation and acceptance

Use a small, explicit capability inventory with evidence references. Counts are
within that inventory only, not all Three.js symbols, lines, work estimates or
speedup. JS forwarding/retained shaders never count as Rust implementation.
Separate evidence states from implementation. Generate deterministic JSON/HTML/SVG
using Python standard library; preserve npm commands as wrappers. Add freshness,
count/escaping tests and browser desktop/mobile inspection. Include the page in
the portable artifact. No engine behavior change or public site deployment.

## Verification

python3 -m unittest discover -s tests -p test_progress.py
npm run docs:check
npm run test:progress
npm run bundle:demo (fresh output)
git diff --check

## Authorization

The current explicit request authorizes this refinement and its verification.
No separate stage approval is inferred. A report and stacked draft PR accompany
parent #2; keep both issues open until requester approval or merge.
