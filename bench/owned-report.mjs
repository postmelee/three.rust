// Analyze complete experiments without treating adjacent frames as independent trials.
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { join, basename } from "node:path";
const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw Error("Usage: node bench/owned-report.mjs DIRECTORY");
const read = (name) => JSON.parse(readFileSync(join(directory, name), "utf8"));
const manifest = read("manifest.json"),
  options = manifest.options;
assert.equal(
  manifest.status,
  "complete",
  "Incomplete experiments cannot be summarized as complete",
);
assert.equal(
  manifest.runs.length,
  options.repeats * options.cases.length * options.variants.length,
);
assert.equal(new Set(manifest.runs).size, manifest.runs.length);
const quantile = (values, q) => {
  const sorted = [...values].sort((a, b) => a - b),
    position = (sorted.length - 1) * q;
  assert.ok(sorted.length && sorted.every(Number.isFinite));
  const lo = Math.floor(position),
    hi = Math.ceil(position);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (position - lo);
};
const stats = (values) => ({
  p50: quantile(values, 0.5),
  p95: quantile(values, 0.95),
  p99: quantile(values, 0.99),
  mean: values.reduce((a, b) => a + b, 0) / values.length,
  min: Math.min(...values),
  max: Math.max(...values),
});
const runs = [],
  seen = new Set();
for (const file of manifest.runs) {
  assert.equal(basename(file), file);
  const run = read(file),
    key = `${run.scenario}/${run.variant}/${run.repeat}`;
  assert.ok(
    options.cases.includes(run.scenario) &&
      options.variants.includes(run.variant),
  );
  assert.ok(
    Number.isInteger(run.repeat) &&
      run.repeat >= 0 &&
      run.repeat < options.repeats &&
      !seen.has(key),
  );
  seen.add(key);
  assert.equal(run.raw.length, options.samples);
  const row = {
    file,
    scenario: run.scenario,
    variant: run.variant,
    repeat: run.repeat,
    startupMs: run.startupMs,
    metrics: {},
    diagnostics: run.diagnostics,
    adapter: run.adapter,
  };
  for (const metric of Object.keys(run.raw[0]).filter((k) => k !== "start")) {
    const values = run.raw.map((r) => r[metric]);
    assert.ok(values.every((x) => Number.isFinite(x) && x >= 0));
    row.metrics[metric] = stats(values);
  }
  if (run.raw.every((r) => Number.isFinite(r.start))) {
    const intervals = run.raw
      .slice(1)
      .map((r, i) => r.start - run.raw[i].start);
    assert.ok(intervals.every((x) => x >= 0));
    row.metrics.frameInterval = stats(intervals);
  }
  runs.push(row);
}
const groups = [];
for (const scenario of options.cases)
  for (const variant of options.variants) {
    const rows = runs.filter(
      (r) => r.scenario === scenario && r.variant === variant,
    );
    assert.equal(rows.length, options.repeats);
    const metrics = {};
    for (const metric of Object.keys(rows[0].metrics))
      metrics[metric] = Object.fromEntries(
        ["p50", "p95", "p99", "mean"].map((q) => [
          q,
          {
            median: quantile(
              rows.map((r) => r.metrics[metric][q]),
              0.5,
            ),
            range: [
              Math.min(...rows.map((r) => r.metrics[metric][q])),
              Math.max(...rows.map((r) => r.metrics[metric][q])),
            ],
          },
        ]),
      );
    groups.push({
      scenario,
      variant,
      metrics,
      startupMs: stats(rows.map((r) => r.startupMs)),
    });
  }
const pairedRatios = [];
for (const scenario of options.cases)
  for (const baseline of ["original", "owned-js"]) {
    if (!options.variants.includes(baseline)) continue;
    for (const variant of options.variants.filter((v) => v !== baseline)) {
      const ratios = [];
      let zeroReferences = 0;
      for (let repeat = 0; repeat < options.repeats; repeat++) {
        const find = (v) =>
          runs.find(
            (r) =>
              r.scenario === scenario && r.variant === v && r.repeat === repeat,
          ).metrics.cpu.p50;
        if (find(baseline) > 0) ratios.push(find(variant) / find(baseline));
        else zeroReferences++;
      }
      pairedRatios.push({
        scenario,
        baseline,
        variant,
        zeroReferences,
        ratios,
        median: ratios.length ? quantile(ratios, 0.5) : null,
      });
    }
  }
const result = {
  sourceCommit: manifest.sourceCommit,
  classification: manifest.classification,
  method:
    "Linear quantiles per run; median and range across run quantiles. Ratios pair repeat indices. No outlier removal, pooled-frame confidence intervals, significance or hardware speedup claim.",
  groups,
  pairedRatios,
  runs,
};
writeFileSync(
  join(directory, "summary.json"),
  JSON.stringify(result, null, 2) + "\n",
);
console.table(
  groups.map((g) => ({
    scenario: g.scenario,
    variant: g.variant,
    p50: g.metrics.cpu.p50.median.toFixed(4),
    p95: g.metrics.cpu.p95.median.toFixed(4),
    p99: g.metrics.cpu.p99.median.toFixed(4),
    interval: g.metrics.frameInterval?.p50.median.toFixed(2),
  })),
);
