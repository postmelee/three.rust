# Task #49: single-node candidate native Editor timing screen

**The complete 70-run screen is preserved, but all three continuous original A/A groups fail the prospective stability rule.** In this capture both candidate routes cost more CPU than Three.js, and Wasm shows no independent saving over matched JS. Decline adoption of this tested Editor path on current evidence. The precise effect size remains unqualified; this is not a general verdict on Rust or a demonstrated FPS change.

[INDEPENDENT_AUDIT.md](INDEPENDENT_AUDIT.md) contains the raw-derived CPU and interval tails, absolute/relative comparisons, A/A, adoption-v1 budget observations, conditions and limits. [audit.json](audit.json) retains all per-run/block arithmetic, original bookends, range and per-round comparisons. The prior [Task #46 screen](../task46-editor-timing-20261026/README.md) remains unchanged; cross-session deltas are not a controlled estimate of this optimization.

| Suite | Status | Runs | Measured pairs | Pairs including warmup | Retained arming rows | Oracle pages / fixed poses |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `smoke/` | Completed tooling check; not performance evidence | 22 | 660 | 880 | 44 | 24 / 42 |
| `full/` | Completed unqualified screen: 54 continuous + 16 idle | 70 | 68,640 | 102,960 | 140 | 24 / 42 |

Candidate: `85e2c5d500edb0b92ea4ecb997087fded3fed45b`. Capture/tooling: `e9b736a47f48bc2512476f8966d285d0153419f7`. Original Editor: `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`. Protocol bytes: [candidate-protocol.json](candidate-protocol.json), SHA-256 `740288d46cbb0c783a536cc45363ddeef25a134c7f14b5eea25be91b47f1dad3`. Full capture: 2026-10-26T03:35:48.726Z–03:57:26.324Z; smoke: 03:29:43.061Z–03:34:56.020Z. Both completed without capture errors, with clean unchanged pins and verified AC before/after. This is one Mac, date and browser.

The synchronous CPU boundary is the sum of disjoint native Viewport.animate and Animation.updateTime bodies. It excludes collection bookkeeping, other/vendor tasks, asynchronous storage completion, paint/compositor and GPU work. Instrumentation overhead is uncalibrated. Native wall-clock playback is preserved; dynamic poses are not frame-matched. Callback intervals are not presented as whole-browser CPU, GPU timing or display FPS.

The index preserves 2,690 complete payloads (864 smoke, 1,824 full, two notices), with 530 shared content-addressed blobs totaling 10,736,200 unique stored bytes (44,176,644 bytes over logical entries); largest payload is 353,954 stored bytes. All manifests, errors, warmup/measured/arming callbacks, measured pairs, source/overlay inventories and patches, oracle states/PNGs, browser/environment records remain. Six metadata payloads needed only battery-instance string normalization in named power-output fields. Numeric tokens and parsed types/values/signs are unchanged. Original source, decoded source, normalized public and stored hashes are separate. The index SHA-256 is `f41ef3b87bcc32a929a8672035b30166e025ff369c558997559ca7e656500897`. The index maps every logical path to its exact blob, including the gzip flag. Use the verifier resolver to read logical paths; blob paths are not the capture directory layout. Stored bytes were copied without recompression; [storage-conversion.json](storage-conversion.json) records exact ordered-entry and byte equality to the retained local first archive.

```sh
python3 bench/results/task49-editor-single-timing-20261026/verify.py
python3 bench/results/task49-editor-single-timing-20261026/test-verifier.py
python3 bench/results/task49-editor-single-timing-20261026/test-archive.py
python3 bench/results/task49-editor-single-timing-20261026/test-storage.py
```

The Python standard-library verifier independently reconstructs every callback pair; verifies CPU/component/interval/arrival quantiles, phase progression, balanced orders, four blocks, A/A, counters, complete source-overlay patches and fixed-state image/numerical oracles; and checks agreement with captured summaries. It imports no live JS analyzer. Seven mutation tests require rejection of frozen playback, duration changes, stalled mixer, missing/duplicate/overlapping callbacks and altered measured CPU. Four focused privacy tests enforce field-scoped normalization, numeric-sign preservation and rejection of unexpected private identifiers/paths. Five focused storage checks confirm logical alias/gzip resolution and reject path traversal or digest/path mismatch. Derived support and report hashes are in `derived-files.json`, outside the copied-payload index.

To rebuild an archive from completed captures, use a fresh output and list every attempted suite explicitly. The supplied archive builder copies raw evidence and verifier; copy the protocol/test support from this directory before running the verifier with `--write-audit`. Never run archive hashing/compression concurrently with timing.

```sh
python3 bench/results/task49-editor-single-timing-20261026/archive.py \
  --root "$SOURCE_TOOLING_ROOT" --out "$FRESH_ARCHIVE" \
  --verifier bench/results/task49-editor-single-timing-20261026/verify.py \
  --suite smoke=work/task49-editor-single-timing-smoke-001 \
  --suite full=work/task49-editor-single-timing-full-001
```

Three.js MIT and RobotExpressive CC0 notices remain in `licenses/`. RobotExpressive attribution is Tomas Laulhe / Don McCurdy; its known upstream weight-conformance limitation is unchanged. No scene feature was removed to manufacture prepared-render coverage.
