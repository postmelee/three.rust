# Physical Mac isolated baseline, 2026-10-26

Captured source: `9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7`, clean. This archive is a completed finite capture, **not a stable Rust advantage or product acceptance**. Matched-JS A/A has two distinct run regimes that the original median/MAD screen misses. Read [the report](../../../mydocs/report/task_m3_4_isolated_report.md) before interpreting `aboveNoise` fields.

`protocol/` retains all 264 timed runs and 499,500 samples, image/numeric checks, failures, manifests and generated summaries. `smoke/` is tooling validation only. `session/aa-regime-audit.json` retains the post-capture workload/clock/block audit. No samples or fast A/A runs were removed. Large JSON payloads use lossless gzip; `bench/fox-report.mjs` reads either representation. Decompress a copy to its original `.json` filename for other scripts. Keep the originals.

`archive-index.json` records every payload hash, its decoded hash and original local source hash. Only explanatory metadata and local paths were normalized. In particular, the old harness inserted a fixed personal-session background-work sentence; the published copy replaces that stale sentence with a neutral limitation. This changes no observations or timings. Original local captures remain untouched. The source hashes therefore differ from decoded hashes only where the index explicitly lists a normalization. The index covers payloads, not this guide or the index itself.

Verify from the repository root:

```python
import gzip, hashlib, json
from pathlib import Path
root = Path("bench/results/mac-isolated-20261026")
for item in json.loads((root / "archive-index.json").read_text())["files"]:
    data = (root / item["path"]).read_bytes()
    assert hashlib.sha256(data).hexdigest() == item["sha256"]
    decoded = gzip.decompress(data) if item["gzip"] else data
    assert hashlib.sha256(decoded).hexdigest() == item["decodedSha256"]
```
