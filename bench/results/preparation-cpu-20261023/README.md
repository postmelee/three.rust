# Preliminary CPU diagnostic retained for audit

This first 18-run diagnostic completed, but its manifest's `options.viewport`
retained an unused shared-config default (640×360). The actual browser viewport
was 640×540 and the fixture canvas 640×480, as the hashed harness/fixture show.
No measured samples were edited. The corrected harness explicitly records both
sizes and was rerun in `../preparation-cpu-viewport-20261023`; use that dataset
for the preparation report. The first dataset remains available to avoid silently
discarding results. Both are CPU-only, shared-cloud diagnostics, not hardware
performance evidence. The source hashes distinguish the two harness versions.
