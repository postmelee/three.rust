# Task #8 stage 1 — portable semantic oracle

Added 16 independently asserted upstream scenarios with stable traces, isolated
original/JS/Wasm/packed-JS Node execution and source-hashed result manifests.
The eligible identity scenario proves Wasm calls; each route releases its arenas.

Node verification passed all 16 upstream expectations and 48 candidate trace
comparisons. The early dispose expectation was corrected after inspecting r186:
Object3D.dispose exists, dispatches an event, retains hierarchy and does not dispose
shared resources. This was an oracle-authoring assumption, not an engine defect.

Observed constraints for C2: stale direct reads, synchronous hierarchy/animation
events, partial state after callback exceptions and legitimate palette replacement
must survive wider ownership. No runtime, raw performance evidence or source
ownership inventory changed. The cloud continuation instruction authorizes the
next browser/package verification stage; no personal session brief is published.
