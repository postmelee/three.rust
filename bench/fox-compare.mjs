import { validateClock } from "./timing.mjs";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const dir = process.argv[2];
if (!dir) throw Error("Usage: node bench/fox-compare.mjs SESSION");
const read = (p) => JSON.parse(readFileSync(`${dir}/${p}/summary.json`)),
  before = read("aa-before"),
  after = read("aa-after"),
  main = read("main");
const jsBefore = existsSync(`${dir}/aa-js-before`),
  jsAfter = existsSync(`${dir}/aa-js-after`);
assert.equal(jsBefore, jsAfter, "Incomplete matched-JS A/A phases");
const phases = ["aa-before", "main", "aa-after", ...(jsBefore ? ["aa-js-before", "aa-js-after"] : [])];
const manifests = phases.map((p) =>
  JSON.parse(readFileSync(`${dir}/${p}/manifest.json`)),
);
for (const manifest of manifests) {
  assert.deepEqual(manifest.timing ?? null, manifests[1].timing ?? null, "Different timing policies");
  assert.equal(manifest.status, "complete", "Incomplete phase");
  assert.deepEqual(
    manifest.hashes,
    manifests[1].hashes,
    "Different measured source hashes",
  );
  assert.equal(
    manifest.browser,
    manifests[1].browser,
    "Different browser versions",
  );
  assert.deepEqual(
    manifest.renderTarget,
    manifests[1].renderTarget,
    "Different render targets",
  );
  for (const key of ["samples", "warmup", "hardware", "headless", "cases"])
    assert.deepEqual(
      manifest.options[key],
      manifests[1].options[key],
      `Different ${key}`,
    );
}
const increments = [];
for (let i = 0; i < phases.length; i++) {
  const m = manifests[i], s = read(phases[i]);
  const variants = phases[i] === "main" ? ["original", "owned-js", "owned-wasm"] : [phases[i].includes("js") ? "owned-js" : "original"];
  assert.deepEqual([...m.options.variants].sort(), [...variants].sort(), "Unexpected phase variants");
  assert.equal(m.options.stage, "render", "Diagnostics are not main evidence");
  assert.equal(s.rows.length, m.options.repeats * m.options.cases.length * variants.length, "Incomplete summary rows");
  for (const scenario of m.options.cases) for (const variant of variants) {
    const rows = s.rows.filter(r => r.scenario === scenario && r.variant === variant);
    assert.equal(rows.length, m.options.repeats, "Incomplete scenario repeats");
    assert.deepEqual(rows.map(r => r.repeat).sort((a,b) => a-b), Array.from({length:m.options.repeats}, (_,i) => i), "Duplicate/missing repeat");
    assert(rows.every(r => Number.isFinite(r.metrics.cpu.p50) && r.metrics.cpu.p50 >= 0), "Invalid CPU summary");
  }
  if (m.timing) for (const row of s.rows) {
    validateClock(row.clock ?? {}, m.timing);
    increments.push(row.clock.minPositiveDeltaMs);
  }
}
const median = (a) => {
  a = [...a].sort((x, y) => x - y);
  return a.length % 2
    ? a[(a.length - 1) / 2]
    : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
};
function compare(before, after, baseline, variants) {
  const decisions = [];
  for (const scenario of [...new Set(main.groups.map((g) => g.scenario))]) {
    const values = (s) =>
        s.rows
          .filter((r) => r.scenario === scenario && r.variant === baseline)
          .map((r) => r.metrics.cpu.p50),
      a = values(before),
      b = values(after),
      ma = median(a),
      mb = median(b),
      mad = (x) => median(x.map((v) => Math.abs(v - median(x)))) / median(x),
      drift = ma > 0 ? Math.abs(mb / ma - 1) : Infinity,
      noise = Math.max(0.05, 2 * drift, 2 * mad(a), 2 * mad(b));
    for (const variant of variants) {
      const g = main.groups.find(
          (g) => g.scenario === scenario && g.variant === variant,
        ),
        ref = main.groups.find(
          (g) => g.scenario === scenario && g.variant === baseline,
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
  return decisions;
}
const decisions = compare(before, after, "original", ["owned-js", "owned-wasm"]);
const matchedJsDecisions = jsBefore ? compare(read("aa-js-before"), read("aa-js-after"), "owned-js", ["owned-wasm"]) : null;
writeFileSync(
  `${dir}/comparison.json`,
  JSON.stringify(
    {
      rule: "Gain > max(5%, twice absolute before/after original p50 drift, twice relative within-session MAD). Timer-resolution and all workload/tail gates still require human interpretation. Single machine with uncontrolled background work.",
      decisions,
      ...(matchedJsDecisions ? { matchedJsDecisions, matchedJsRule: "Same relative-noise rule using matched-JS A/A, not original A/A" } : {}),
      ...(increments.length ? { clockResolutionMs: Math.max(...increments) } : {}),
    },
    null,
    2,
  ) + "\n",
);
console.table(decisions);
