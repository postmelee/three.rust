# Task #49 profiler time-order source pins

Read-only primary-source evidence for the CDP sample-order investigation. This directory contains no application captures or transformed performance results. Existing strict analysis failures remain unchanged.

The official Chromium DEPS at `804d6b05f089b27af8342622a36558c49401a1d4` pins DevTools `a7b389bcb341f6e5e1bfa107992d3c327db75736` and V8 `712e1808de2d7416f1276d0deb1ee4ac978132b8`. The Chromium commit identifies version `155.0.8059.86`; the V8 commit and version header both identify `15.5.35.25`. This is the dependency source chain for the supplied browser revision, not a binary-reproducibility verification.

`manifest.json` records each official Gitiles URL, HTTP status, UTC retrieval timestamp, decoded file size and SHA-256, wire SHA-256, and transfer encoding. Files fetched with `format=TEXT` contain the decoded upstream source bytes. Commit JSON preserves its Gitiles anti-XSSI prefix. Failed requests have no downloaded file/hash; an earlier failed old-path row and a successful new-path row can use the same local filename.

The actual model is in `front_end/models/cpu_profile/`; the former `front_end/core/sdk/` paths return 404 at the actual pin. Historical `9a696c4e723caa3c7e1f78886da353f1f06a79b0` source is retained only as the originally requested reference. Gitiles model-history requests returned 429; no introduction commit was established.

Relevant evidence:

- `v8-test-cpu-profiler.cc:899` documents slight ordering differences from asynchronous deopt sampling and uses restricted conditions for its chronological assertion.
- `devtools-CPUProfileDataModel.ts:138` reconstructs timestamps; line 258 sorts timestamps and sample IDs together. Later normalization and missing-sample repair are separate transformations.
- `v8-js_protocol.pdl:900` defines integer microsecond deltas, and `v8-profiler-agent-impl.cc:111` serializes consecutive timestamp differences.
- `v8-cpu-profiler.cc:257` and `v8-profile-generator.cc:655` show queue processing and sample append behavior. These sources do not diagnose any individual captured delta.

License files are retained as `chromium-LICENSE`, `devtools-LICENSE`, `historical-devtools-LICENSE`, and `v8-LICENSE`. Downloaded code retains copyright and BSD-style source notices; the V8 test also retains its embedded terms. None of the externally maintained libraries listed in V8's license was copied. Preserve these files and notices if redistributing the source evidence.

This review supports a separately labeled counts-only analysis and a prospectively specified paired-order diagnostic. It does not authorize retroactively changing the declared strict gate, dropping/clamping deltas, claiming a speedup, or qualifying a candidate.
