import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
const dir = process.argv[2];
if (!dir) throw Error("Usage: node bench/fox-report.mjs DIRECTORY");
const read = (p) =>
    JSON.parse(
      existsSync(`${dir}/${p}`)
        ? readFileSync(`${dir}/${p}`)
        : gunzipSync(readFileSync(`${dir}/${p}.gz`)),
    ),
  m = read("manifest.json");
assert.equal(m.status, "complete");
assert.equal(
  m.runs.length,
  m.options.repeats * m.options.cases.length * m.options.variants.length,
);
assert.equal(new Set(m.runs).size, m.runs.length);
const q = (a, p) => {
    assert(a.length && a.every(Number.isFinite));
    a = [...a].sort((a, b) => a - b);
    const x = (a.length - 1) * p;
    return a[Math.floor(x)] + (a[Math.ceil(x)] - a[Math.floor(x)]) * (x % 1);
  },
  stats = (a) => ({
    p50: q(a, 0.5),
    p95: q(a, 0.95),
    p99: q(a, 0.99),
    mean: a.reduce((a, b) => a + b, 0) / a.length,
    min: Math.min(...a),
    max: Math.max(...a),
  });
const rows = m.runs.map((file) => {
  const r = read(file);
  assert.equal(r.raw.length, m.options.samples);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.invalid, []);
  const metrics = {};
  for (const k of Object.keys(r.raw[0]).filter(
    (k) => !["start", "raf"].includes(k),
  ))
    metrics[k] = stats(r.raw.map((x) => x[k]));
  metrics.frameInterval = stats(
    r.raw.slice(1).map((x, i) => x.start - r.raw[i].start),
  );
  metrics.rafInterval = stats(
    r.raw.slice(1).map((x, i) => x.raf - r.raw[i].raf),
  );
  return {
    file,
    ...(r.clock ? { clock: r.clock } : {}),
    scenario: r.scenario,
    variant: r.variant,
    repeat: r.repeat,
    metrics,
    startupMs: r.startupMs,
    startup: r.startup,
    durationMs: r.durationMs,
    draws: r.draws,
    triangles: r.triangles,
    readCount: r.readCount,
    diagnostics: r.diagnostics,
  };
});
const groups = [];
for (const scenario of m.options.cases)
  for (const variant of m.options.variants) {
    const r = rows.filter(
      (r) => r.scenario === scenario && r.variant === variant,
    );
    assert.equal(r.length, m.options.repeats);
    const metrics = {};
    for (const k of Object.keys(r[0].metrics))
      metrics[k] = Object.fromEntries(
        ["p50", "p95", "p99", "mean"].map((p) => [
          p,
          {
            median: q(
              r.map((r) => r.metrics[k][p]),
              0.5,
            ),
            range: [
              Math.min(...r.map((r) => r.metrics[k][p])),
              Math.max(...r.map((r) => r.metrics[k][p])),
            ],
          },
        ]),
      );
    groups.push({
      scenario,
      variant,
      metrics,
      startup: Object.fromEntries(
        Object.keys(r[0].startup).map((k) => [
          k,
          stats(r.map((r) => r.startup[k])),
        ]),
      ),
      navigationToReady: stats(r.map((r) => r.startupMs)),
      durationMs: stats(r.map((r) => r.durationMs)),
    });
  }
const parity = [];
for (const scenario of m.options.cases) {
  const r = rows.filter((r) => r.scenario === scenario);
  assert.equal(new Set(r.map((r) => r.draws)).size, 1);
  assert.equal(new Set(r.map((r) => r.triangles)).size, 1);
  assert.equal(new Set(r.map((r) => r.readCount)).size, 1);
  parity.push({
    scenario,
    draws: r[0].draws,
    triangles: r[0].triangles,
    reads: r[0].readCount,
  });
}
const ratios = [];
for (const scenario of m.options.cases)
  for (const baseline of ["original", "owned-js"])
    if (m.options.variants.includes(baseline))
      for (const variant of m.options.variants.filter((v) => v !== baseline)) {
        const pairs = [];
        for (let i = 0; i < m.options.repeats; i++) {
          const find = (v) =>
            rows.find(
              (r) =>
                r.scenario === scenario && r.variant === v && r.repeat === i,
            );
          const a = find(baseline).metrics.cpu.p50,
            b = find(variant).metrics.cpu.p50;
          if (a > 0) pairs.push(b / a);
        }
        ratios.push({
          scenario,
          baseline,
          variant,
          ratios: pairs,
          median: pairs.length ? q(pairs, 0.5) : null,
        });
      }
const result = {
  method:
    "Linear per-run quantiles; median/range of run quantiles; repeat-paired ratios. No pooled-frame confidence claims or outlier deletion. Startup uses shared browser caches.",
  groups,
  parity,
  ratios,
  rows,
};
writeFileSync(`${dir}/summary.json`, JSON.stringify(result, null, 2) + "\n");
console.table(
  groups.map((g) => ({
    scenario: g.scenario,
    variant: g.variant,
    p50: g.metrics.cpu.p50.median,
    p95: g.metrics.cpu.p95.median,
    p99: g.metrics.cpu.p99.median,
    interval95: g.metrics.frameInterval.p95.median,
  })),
);
