// Separate asynchronous GPU-query diagnostics; never substitute CPU/FPS timing.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
const dir = process.argv[2];
if (!dir) throw Error("Usage: node bench/gpu-summary.mjs DIRECTORY");
const read = (name) => JSON.parse(readFileSync(`${dir}/${name}`));
const manifest = read("manifest.json");
assert.equal(manifest.status, "complete");
assert.equal(manifest.gpuQuery, true);
assert.equal(
  manifest.runs.length,
  manifest.repeats * manifest.scenarios.length * manifest.engines.length,
);
assert.equal(new Set(manifest.runs).size, manifest.runs.length);
const q = (values, p) => {
  if (!values.length) return null;
  values = [...values].sort((a, b) => a - b);
  return values[Math.floor((values.length - 1) * p)];
};
const rows = manifest.runs.map((file) => {
  const run = read(file),
    statuses = {};
  assert.equal(run.rows.length, manifest.samples);
  const values = [];
  for (const row of run.rows) {
    statuses[row.gpuStatus] = (statuses[row.gpuStatus] || 0) + 1;
    if (row.gpuStatus === "available") {
      assert(Number.isFinite(row.gpuMs) && row.gpuMs >= 0);
      values.push(row.gpuMs);
    } else assert.equal(row.gpuMs, null);
  }
  return {
    file,
    scenario: run.scenario,
    engine: run.engine,
    rep: run.rep,
    statuses,
    gpuMs: { p50: q(values, 0.5), p95: q(values, 0.95), p99: q(values, 0.99) },
    env: run.env,
  };
});
writeFileSync(
  `${dir}/gpu-summary.json`,
  JSON.stringify(
    {
      method:
        "Per-run nearest-rank (floor index) quantiles of available asynchronous query ranges only. Missing/disjoint/pending values stay null in raw data. Separate instrumented workload; not Fox GPU time or display latency.",
      rows,
    },
    null,
    2,
  ) + "\n",
);
console.table(
  rows.map(({ file, gpuMs, statuses }) => ({ file, ...gpuMs, ...statuses })),
);
