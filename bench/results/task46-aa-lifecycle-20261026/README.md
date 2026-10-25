# Task #46: A/A lifecycle diagnostics, 2026-10-26

**All nine full-diagnostic lifecycle groups failed the prospective stability screen.** The capture and workload/environment checks passed; this is a completed negative diagnostic. Root cause remains unresolved, and these data do not qualify a performance advantage.

The unmodified runtime is `9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7`; the clean tooling source is `9ce1301888777f11a85aff0c7a117ab7b19ec0e3` for smoke/JS/original and `2894e7f39545ba2430c7f212a82990455daee466` for longer warmup. Both use driver SHA-256 `dfeb147682833a78ae42e391e32f46346729217b8b26cd207d0f01489ea207e6`. See the [Stage 2 report](../../../mydocs/working/task_m6_46_stage2.md) and each suite's manifest/summary.

- `js/`: nine owned-JS runs, warmup1200/samples3600.
- `original/`: nine original Three.js runs, warmup1200/samples3600.
- `js-long-warmup/`: nine owned-JS runs, warmup4800/samples3600.
- `smoke/`: three tooling checks, warmup10/samples120. Its one-run/partial-block screen is not stability evidence.

All 27 full runs / 97,200 frames and all three smoke runs / 360 frames are retained. Per-run payloads use lossless gzip after explicit metadata normalization. Decompress a copy to its original `.json` filename for readers that do not support gzip. Raw arrays, numerical states, counters and timestamps retain their original values.

`archive-index.json` gives original source-byte, public decoded-byte and compressed-payload SHA-256 hashes. Absolute checkout/home paths and ephemeral Chrome profile paths are normalized; the battery instance identifier is redacted. The complete argument list and backend selection remain available. Process CPU metadata describes only experiment-launched browser processes with type, transient numeric ID and CPU duration; it contains no unrelated process names or browser contents. No original local files were overwritten. The index covers copied payloads; `audit.json`, this guide and `verify.mjs` are derived review artifacts.

Verify the published payloads and checks:

```sh
node bench/results/task46-aa-lifecycle-20261026/verify.mjs
```

`audit.json` records the source-to-public numeric equality check performed during archival. The verifier independently checks every payload hash, counts, source/clean pins, focus/backend boundaries, raw workload metadata, final numeric equality and failed screen counts. It does not turn the diagnostic into a benchmark qualification.
