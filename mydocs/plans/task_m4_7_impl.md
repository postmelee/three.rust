# Task #7 implementation plan

1. Audit pinned r186 renderer/objects, existing owned engine and upstream Rust
   browser/SIMD/worker sources. Implement a CPU-only browser boundary diagnostic
   using existing runtime code. Eight order rotations, four rig shapes, four
   boundary demands, JS/Wasm; 128 warmup ticks and 24 blocks of 16 measured ticks.
   Fixed repeated weight commands preserve the same final numerical state.
2. Commit the driver, build the unchanged runtime, execute on the shared cloud
   host, archive all block samples and check exact expected byte/call counts.
   Compare final arrays against the matched JS evaluator outside timing.
3. Write a source/evidence-based research report and ADR selecting a wider
   experimental boundary. Update the roadmap's sequencing without claiming the
   future core exists or changing qualification thresholds/progress UI. Verify
   generated docs and publish a stacked draft PR. Keep #7 open.

The requester explicitly authorized this research in the current turn. It is a
finite experiment before product acceptance, not a full-engine implementation.
