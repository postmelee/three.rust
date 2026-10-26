# Task #49: Viewer profile audit procedure

Status: independently verified. Archive construction ran after both captures and analyses were terminal and the quiet window was released. The Node verifier rechecked all original source bytes; the independent Python audit passed twelve smoke profiles / 150,204 samples and thirty-six full profiles / 2,728,100 samples, with twenty-four fixed oracle sessions in each capture. All original captures remain unchanged.

The inputs are `task49-viewer-profile-smoke-001`, its analysis-001, `task49-viewer-robot-profile-full-001` and its analysis-001. Both matrices completed with no capture errors or unprocessed analysis runs. All 4,852 logical files are retained in 649 gzip blobs. An initial independent-verifier attempt failed because a valid unavailable-script record has `parsed: null`; the verifier was repaired to retain that generated-only/unavailable state. The failed attempt log and subsequent successful audit are preserved separately. This was an audit-tool error, not a new capture or a profile-data repair. Seven pure regression tests pass, including that case.

`archive.mjs` reuses the existing lossless profile archive implementation. Every logical input file receives original/decoded/public/stored hashes. Content-addressed gzip removes physical duplication only. Metadata-string privacy normalization retains raw numerical tokens and the original source hash; executed generated JS/Wasm, source maps, patches and images remain immutable. Source-map paths were already explicitly normalized during preparation with the non-path proof retained. Unexpected private fields/UUIDs fail closed. No local asset payload or personal session instructions are added.

The wrapper also retains exact committed protocol bytes and reviewed Viewer/dependency/Three.js/RobotExpressive notices. `support-index.json` verifies these support bytes separately. The wrapper requires the repository's `scripts/apps/archive-candidate-profile.mjs`; the independent Python verifier uses only Python's standard library.

The independent audit checks:

- All logical/blob/source-map/generated-source hashes and complete indexed file counts.
- Clean capture/runtime/app identity, full protocol hashes, separate capture/analysis tool SHAs, AC observations, hardware renderer and fixed workload/route matrices.
- Profile sample membership and gap validity, rooted tree integrity, self/inclusive weights and hit counts, active-denominator and category/context arithmetic, sample gaps and retained long-gap sensitivity records.
- Served/CDP script byte bindings, verified Wasm module/function index/name identity, exact map-generated positions and prepared source/build-input/adaptation hash chains.
- Native phase advancement, main/axes coverage, visibility/focus/quality/GUI identity and raw window counters, without assuming prepared-path adoption or a fixed fallback ratio.
- Native/observer and engine fixed numerical/action/render/layout equivalence with identical available PNG bytes/dimensions; zero-size native hidden axes remain explicit rather than fabricated.

The verifier independently checks exact source-map positions and input chains. Full capture has 36 verified run/script prepared-map bindings, 54 exactly mapped profile nodes and 820 generated-node fallbacks without an exact segment. These are node counts, not sampled weights. It does not implement a second JavaScript AST parser, so AST function owner/name selection and semantic subsystem labels remain bounded analyzer interpretations. The absence of self weight in the verified dat.gui source family does not show that GUI work is free; generated/unresolved source coverage remains. Overlapping inclusive rows must not be added to self cost. The verifier does not recreate WebGL pixel readback from PNGs.

Across every full repeat and all four endpoint windows (warmup, before, profiled and after), grid-on candidates record zero prepared passes and two fallbacks per main frame; grid-off records zero prepared passes and one fallback. Grid-on public reads are 68 / 8,704 materialized bytes per main frame; grid-off is 62 / 7,936 bytes. Actual Wasm calls are 22 and 15 respectively, with zero prepared-Wasm calls; matched JS reports zero Wasm calls. These are before/after deltas, not startup cumulative counts. They establish active facade work with renderer fallback, not prepared-path adoption.

Profiles are diagnostic sampled weights, not primary callback quantiles, CPU cycles, GPU timing or FPS. Endpoint windows bracket CDP start/stop and are wider than the exact sample interval. Profiler/observer overhead is uncalibrated. Natural playback is not frame-matched across routes. A verified archive is neither a primary A/A pass nor adoption qualification.

Reproduce with fresh destinations after any active measurement quiet window, retaining command output:

```sh
node bench/results/task49-viewer-profile-20261026/archive.mjs build \
  --root "$TOOL_ROOT" --out "$FRESH_ARCHIVE"
node bench/results/task49-viewer-profile-20261026/archive.mjs verify \
  --out "$FRESH_ARCHIVE" --source-root "$TOOL_ROOT"
python3 -B bench/results/task49-viewer-profile-20261026/test_verify.py
python3 -B bench/results/task49-viewer-profile-20261026/verify.py \
  --archive "$FRESH_ARCHIVE" --out "$FRESH_AUDIT_JSON"
```

Add `--extract "$FRESH_PUBLIC_COPY"` to the Node verifier for a complete logical restoration. A previously existing destination is rejected. The builder creates payload/index/support files; keep the wrapper, verifier, tests and this explanatory support document with the final archive. Actual commands/results and the failed audit attempt are recorded in `verification-attempts.json` and `verification-logs/`; source path strings in those archival-command logs are normalized separately from capture payloads.
