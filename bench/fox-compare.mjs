import { readFileSync, writeFileSync } from "node:fs";
const dir = process.argv[2];
if (!dir) throw Error("Usage: node bench/fox-compare.mjs SESSION");
const read = (p) => JSON.parse(readFileSync(`${dir}/${p}/summary.json`)),
  before = read("aa-before"),
  after = read("aa-after"),
  main = read("main");
const median = (a) => {
  a = [...a].sort((x, y) => x - y);
  return a.length % 2
    ? a[(a.length - 1) / 2]
    : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
};
const decisions = [];
for (const scenario of [...new Set(main.groups.map((g) => g.scenario))]) {
  const values = (s) =>
      s.rows
        .filter((r) => r.scenario === scenario && r.variant === "original")
        .map((r) => r.metrics.cpu.p50),
    a = values(before),
    b = values(after),
    ma = median(a),
    mb = median(b),
    mad = (x) => median(x.map((v) => Math.abs(v - median(x)))) / median(x),
    drift = ma > 0 ? Math.abs(mb / ma - 1) : Infinity,
    noise = Math.max(0.05, 2 * drift, 2 * mad(a), 2 * mad(b));
  for (const variant of ["owned-js", "owned-wasm"]) {
    const g = main.groups.find(
        (g) => g.scenario === scenario && g.variant === variant,
      ),
      ref = main.groups.find(
        (g) => g.scenario === scenario && g.variant === "original",
      ),
      gain = 1 - g.metrics.cpu.p50.median / ref.metrics.cpu.p50.median;
    decisions.push({
      scenario,
      variant,
      aaBeforeP50: a,
      aaAfterP50: b,
      relativeDrift: drift,
      requiredGain: noise,
      observedGain: gain,
      absoluteSavingMs: ref.metrics.cpu.p50.median - g.metrics.cpu.p50.median,
      aboveNoise: gain > noise,
      tail95Ratio: g.metrics.cpu.p95.median / ref.metrics.cpu.p95.median,
      interval95Ratio:
        g.metrics.frameInterval.p95.median /
        ref.metrics.frameInterval.p95.median,
    });
  }
}
writeFileSync(
  `${dir}/comparison.json`,
  JSON.stringify(
    {
      rule: "Gain > max(5%, twice absolute before/after original p50 drift, twice relative within-session MAD). Timer-resolution and all workload/tail gates still require human interpretation. Single machine with uncontrolled background work.",
      decisions,
    },
    null,
    2,
  ) + "\n",
);
console.table(decisions);
