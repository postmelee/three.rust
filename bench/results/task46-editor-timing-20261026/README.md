# Task #46: native Editor callback cost screen, 2026-10-26

**The full 70-run screen completed, but all three continuous original A/A groups failed their prospective stability rule.** The tested Wasm callback CPU is higher than both original Three.js and matched JS. Every continuous candidate window records zero prepared renderer passes and retained fallback, while the facade still performs actual native updates and paid matrix materialization. No stable effect size, independent Rust advantage, whole-browser CPU or FPS gain is qualified.

The [Stage 4B report](../../../mydocs/working/task_m6_46_stage4b.md) gives exact conditions, all CPU/interval tails, absolute/relative arithmetic, phase/work checks, failure corrections and limits.

| Suite | Meaning | Timed runs | Measured pairs | Complete pairs incl. warmup | Arming callback rows | Fixed poses |
|---|---|---:|---:|---:|---:|---:|
| `smoke-001/` | Failed native timeline border-box assertion; no timed run | 0 | 0 | 0 | 0 | 0 |
| `smoke-002/` | Failed unsupported native unselected playback setup; no timed run | 0 | 0 | 0 | 0 | 12 |
| `smoke-003/` | Completed tooling smoke, not performance evidence | 22 | 660 | 880 | 44 | 42 |
| `full/` | Completed unqualified screen: 54 continuous + 16 idle runs | 70 | 68640 | 102960 | 140 | 42 |

Full/final-smoke tooling is `a1aad46f2bf8d74176b2b5e2836cbdd1ff34678a`; candidate is `6990fd92f61a031c8c2ba7a8282cfb63684e6dfb`; original Editor is `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`. Earlier attempts retain their own tooling pins. The full capture ran 2026-10-25T23:12:03.337Z–23:33:41.654Z. Sources remained clean/unchanged and AC power was verified before/after. All per-session source, overlay and artifact hashes remain in the manifest and adaptation inventories.

The timer covers the sum of disjoint native Viewport.animate and Animation.updateTime synchronous bodies. It excludes collection bookkeeping, other/vendor tasks, asynchronous storage completion and browser paint/compositor/GPU work. It is not whole-browser CPU or FPS. Native real-time playback is preserved and not frame-matched across routes. The first arming timestamp is retained separately by the prospective policy; all warmup, measured, failed and unavailable data remain.

`archive-index.json` covers 2,826 copied payloads: complete manifests/errors, raw callbacks and measured pairs, summaries, all oracle states/PNGs, original/served source and full patches, network/file inventories, environment/browser metadata and MIT/CC0 notices. Source bytes, decoded source bytes, normalized public bytes and stored bytes have separate SHA-256 hashes. Twelve metadata files needed only path/profile/battery identifier string normalization; all numerical JSON was recursively checked unchanged. Gzip is lossless after those named transformations. Logical `.json` paths may resolve to `.json.gz`; decompress a copy or use the verifier resolver. No source output was overwritten or selected out.

`audit.json`, `verify.py`, `test-verifier.py`, `verifier-mutation-checks.json`, `archive.py`, `build-status.json`, this guide are derived review artifacts, outside the copied-payload index. `archive.py` documents reproducible archival from explicitly listed completed source suites into a fresh directory; it never launches a browser or modifies source captures.

```sh
python3 bench/results/task46-editor-timing-20261026/verify.py
python3 bench/results/task46-editor-timing-20261026/test-verifier.py
```

The standard-library verifier independently rebuilds every native callback pair and checks measured rows, CPU/component/interval/arrival quantiles, action phase progression, blocks, A/A, balanced medians, absolute/relative changes, fallback/read counters, source-overlay transformations, complete patches and fixed-state image/numerical equality. It imports no live JS analyzer. Seven mutation tests require rejection of frozen playback, changed duration, stalled mixer, missing/duplicate/overlapping callbacks and changed measured CPU. Failed captures remain hash-verified and explicitly incomplete; their absent timing is never fabricated.

Full data: 1/30 continuous original run medians and 13/120 original blocks failed. All 54 continuous native phase validations pass, and all 16 idle windows preserve zero rendering. The 42 original-oracle comparisons include seven reference self-comparisons; genuine non-self comparisons are 35 fixed poses / 236,410 numerical values, plus 21 separate overlay parity pairs / 141,846 values. Every fixed pixel digest/PNG and numerical state agrees. These checks do not make the dynamic poses frame-matched or qualify a speedup.

RobotExpressive retains its CC0 attribution (Tomas Laulhe / Don McCurdy) and known upstream weight-conformance limitation; Three.js sources retain MIT. Notices are in `licenses/`. No feature was removed to force prepared-render coverage, and no new engine optimization is claimed.
