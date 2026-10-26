# Task #49 final integration correctness archive

This archive preserves the finite RobotExpressive/static Editor and Viewer
correctness validation of tool and runtime
`96b0b4c0e7d55c22c1f2c22955356b9822e67d22`. It is separate from the earlier
runtime `85e2c5d500edb0b92ea4ecb997087fded3fed45b` profiling and timing records.
No final-runtime CPU speed, FPS improvement, full API compatibility or general
large-content qualification follows from these correctness results.

The Editor is pinned to `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8` and the Viewer
to `b5ee5dafe27f953ae1b55f42b5fa3697fef08683`. The unchanged RobotExpressive asset
is SHA-256 `047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319`.
Original source/asset notices are retained in `licenses/`.

The native application captures use headed Chrome `155.0.8059.86` at
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, a 1280×720 browser
viewport, DPR 1, and the hardware `ANGLE Metal Renderer: Apple M4 Pro` backend.
The captured runner metadata retains macOS, hardware, display and power output;
AC power and a clean, unchanged final96 source/artifact identity passed before
and after the seven native app commands. Separate software/browser test logs
must not be read as hardware GPU performance evidence.

## Correctness and retained differences

Editor: original, prepared JS and prepared Wasm each pass both `check` and `ui`.
The independent audit replays six datasets, 162 route-local checks, 32 cross-route
image comparisons and 40 interaction-semantic comparisons, covering 149,328
numeric values with zero difference. Forty-eight PNGs decode to their recorded
WebGL pixel hashes. Four native play/pause elapsed-time values remain explicitly
excluded from equality because clicking pause follows real playback; fixed
scrub poses and pause/stop semantics remain checked. Scenarios include pointer
selection, transform history and synchronous reads, idle render suppression,
selected animated bounds, shadows and visibility, gizmo translation/rotation/
scale, native focus, light controls and timeline scrub/play/pause/stop. Earlier
check-only action descriptions retain their original limitations; the separate
`ui` datasets supply the finite UI evidence.

Viewer: original bundled r176, externalized r176, pure r186, prepared JS r186 and
prepared Wasm r186 each pass eleven fixed cases, with 55 within-route A/A checks in total.
Both main and axes renderers are retained; all 220 PNGs independently decode to
the recorded bottom-up pixel hashes. All 44 cross-route comparisons are replayed.
The three required-equal pairs pass eleven comparisons each with zero numeric
difference. The separate r176→r186 comparison is non-strict: all eleven cases
retain main-image differences and nine retain numeric differences, with maximum
absolute difference `0.00006866455078125`. These upstream-version differences
are not candidate JS/Wasm differences and are not changed into strict passes.
Scenarios include native load, first-clip playback and animation controls,
manual morphs with matched action history, orbit/pan/dolly/reset, grid and axes,
helpers/wireframe, environment/background controls, two-renderer resize and
native reload. Fixed poses are correctness adaptations, not elapsed-time samples.

RobotExpressive retains its known upstream validation errors (752 nonnormalized
weight errors and four skin-node warnings); runtime loader normalization is
checked separately. Existing Chess image/chooser failures, Bistro import
failures, weighted-profile failures, incomplete migration profiles and timing
stability/gate failures remain in their earlier archives. This pass does not
resolve or replace those records.

## Build, software and tooling checks

All supplied final96 build/test logs are retained, including `npm ci`, fixtures,
build, Rust tests/fmt/clippy, prepared/compatibility/browser/package/demo checks,
and the final eleven-command software/package suite. The initial `test:timing`
exit 1 is preserved alongside its later passing run. Passing reruns do not erase
failed attempts. The packaged local npm tarball is retained; no npm publication
was performed by this archive process.

Profile-completeness analyzer verification belongs to separate tool commit
`7600d911bebac638605da993d38639617f04b964`. Its three changed analyzer sources,
changed test and related test sources, four syntax logs and 38-test log are
retained separately. They do not redefine the final96 capture SHA. Publication
check attempt 001 failed when the sandbox denied a loopback listener (`EPERM`);
docs checking was not reached. Attempt 002 permitted that listener and passed
177 infrastructure tests and docs checking. This environmental failure remains
visible and is not relabeled a source correctness failure.

## Storage, source and privacy

`archive-index.json` maps every logical file to a losslessly compressed,
content-addressed blob. It separates original file SHA/length, original decoded
SHA, public decoded SHA/length and stored gzip SHA/length. `build-status.json`
records rechecked original bytes, file inventories and the exact dependency-link
inventory. Deduplication changes storage only; no numeric value, image byte,
source asset, native UUID, comparison, error result or source-order array is
rewritten. Build logs and the clean source record support source/artifact
provenance; the verifier does not independently rebuild the Rust compiler output.

The full native Viewer preparation and adaptation diffs are retained. Its sole
`source/node_modules` symlink is checked against the pinned Viewer dependency
checkout, recorded by original target-string SHA/length and public alias, and
never traversed. Manifest-listed dependency input files, package/lock files and
notices are retained separately. Additional original Editor served sources and
candidate artifacts are verified against capture inventories. No large Chess or
Bistro assets/ZIPs are copied. Existing native capture source payloads remain
complete.

Private home components are normalized only in explicit command/error/path
metadata or selected build/test logs. Battery instance IDs are normalized only
inside the before/after power-output metadata. The local execution driver uses
`<repository>`, `<final-checkout>` and `<pinned-apps>` aliases; replace those with
actual checkout paths before using it. Driver original/public hashes remain
separate. The identified status-site temporary root in `software-suite/08.log` is
normalized to `<temporary-path>/site`, with its line shape and original file hash
checked; the suffix and `2 real daily points` remain unchanged. The exact allowed
normalization notes appear on each affected index row. Public Git source snapshots are the original committed bytes, including
any generic public test path literals; no session-specific text is added.

Archive build attempt 001 stopped at the status-test temporary path privacy
guard after 884 payloads. Its partial 441-file tree was moved byte-identically
to a separate local failure directory; the original builder, traceback, status,
partial index and before/after move inventory are retained in this archive. The
verifier binds every partial payload/blob to its identical final payload. This
archive-only failure does not change a capture or software-test result. Attempt
002 used a fresh output directory after the narrow privacy fix.

The two independent audit directories include the executed auditor, PNG decoder,
synthetic tests, test/syntax output, commands and input inventories. Their first
attempts passed. `verify.py` runs the exact archived auditor with a storage-only
adapter, checks its full report against the retained report, decodes the 268 fixed-oracle
PNGs,
and checks source/entry adaptation/preparation/build identities. All 297 native
capture PNG files are preserved and byte-hashed; the other 29 diagnostic/UI
screenshots have no fixed readPixels equality oracle and are not claimed as
additional image comparisons. Candidate runtime
artifact bytes are also matched to the retained local npm tarball, without
extracting archive members into the filesystem. `derived-files.json`
checks every visible support file; all indexed blobs and unexpected blobs are
checked separately.

## Reproduce the offline verification

From this directory, with Python 3.10+:

```sh
python3 -B verify.py
python3 -B test_archive.py -v
```

An optional fresh extraction restores **public decoded bytes** under logical
paths. Inputs that were already gzip-compressed may be recompressed, so extraction
does not promise their original gzip headers/compressed byte stream. Original
compression hashes remain in the index.

```sh
python3 -B verify.py --extract /path/to/new/extracted-directory
```

`archive.py --help` documents rebuilding from explicitly named frozen local
inputs. Building requires a new output directory. Original run commands are in
`execution/commands.json` (through the archive reader/extractor) and the aliased
`execution-driver/run.py`. Do not rerun captures into existing result directories.
The archive verifier does not run those commands or make a new performance claim.
