# Task #40 stage 1 — persistent state and prepared-pass implementation

Delivered retained slot/parent/generation topology, dirty records, revision-based
matrix observations, f64 native and matched JS pass evaluators, and a pinned WebGL
consumer. The optional entries preserve existing default/C2 paths. Public scope is
in [PREPARED_PASS](../../docs/PREPARED_PASS.md); task locations match the plan.

Native checks pass (14 tests), as do both facade variants' eight inherited checks,
four new state cases each, the 24-frame/90-node upstream pass oracle, eight-route
Node semantics and isolated package/types. Actual fixture images passed during
implementation. Multi-camera/shadow/fallback image tests and throwing JS bypass
probes passed; final-source verification is recorded in the next stage.

Review fixed two boundary gaps before freezing this candidate: manual world-array
writes when scene auto-update is disabled must be imported without evaluating dirty
TRS, and release must preserve a lazily cleared public dirty flag. Native plan
cleanup now follows its owner. A test fixture's insertion order was corrected to
use actual DFS traversal for unsorted lists; no runtime comparator was changed to
match an incorrect oracle. A lint ordering issue was fixed.

The renderer uses compact native resource/draw lists. Its single-camera update can
still write a 28-byte general command; zero command reconstruction applies to the
retained whole-scene topology. No performance claim is made before measurement.
Remaining correctness/delivery checks, clean-source experiments and reporting are
authorized under the C3 continuation; merge/hardware qualification remain separate.
