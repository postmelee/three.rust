import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const dir = process.argv[2];
if (!dir) throw Error('Usage: node bench/ownership-boundary-report.mjs <results>');
const read = p => JSON.parse(readFileSync(`${dir}/${p}`));
const manifest = read('manifest.json'), c = manifest.config;
assert.equal(manifest.status, 'complete');
assert.equal(new Set(manifest.runs).size, manifest.runs.length);
assert.equal(manifest.runs.length, c.repeats * c.shapes.length * c.modes.length * c.backends.length);
const quantile = (values, p) => {
  const a = [...values].sort((x, y) => x - y), k = (a.length - 1) * p, i = Math.floor(k);
  return a[i] + (a[Math.ceil(k)] - a[i]) * (k - i);
};
const runs = manifest.runs.map(read), summary = [];
for (const r of runs) {
  assert.equal(r.rawBlockMs.length, c.blocks);
  assert(r.clock.crossOriginIsolated && r.clock.minPositiveDeltaMs > 0);
  assert(r.rawBlockMs.every(v => Number.isFinite(v) && v > 0));
  assert(Object.entries(r.maxErrors).every(([k, v]) => Number.isFinite(v) && v <= (k === 'palette' ? 1e-6 : 1e-10)));
}
for (const [count, bones] of c.shapes) for (const mode of c.modes) for (const backend of c.backends) {
  const group = runs.filter(r => r.count === count && r.bones === bones && r.mode === mode && r.backend === backend);
  assert.equal(group.length, c.repeats);
  assert.deepEqual(group.map(r => r.repeat).sort((a,b) => a-b), Array.from({length:c.repeats}, (_, i) => i));
  const medians = group.map(r => quantile(r.rawBlockMs, .5) / c.ticksPerBlock);
  summary.push({ count, bones, mode, backend,
    medianBlockAverageTickMs: quantile(medians, .5),
    minRunMedianMs: Math.min(...medians), maxRunMedianMs: Math.max(...medians),
    perRunMediansMs: medians,
    countersPerTick: Object.fromEntries(Object.entries(group[0].delta).map(([k,v]) => [k, v / (c.blocks * c.ticksPerBlock)])),
    maxErrors: Object.fromEntries(Object.keys(group[0].maxErrors).map(k => [k, Math.max(...group.map(r => r.maxErrors[k]))])),
  });
}
writeFileSync(`${dir}/summary.json`, JSON.stringify({
  meaning: 'Median across run medians of 16-tick block averages. Not frame percentiles, independent tick samples or an application benchmark.',
  sourceCommit: manifest.sourceCommit, rows: summary,
}, null, 2) + '\n');
const lines = ['# CPU boundary diagnostic', '',
  'Milliseconds per tick, derived from block averages. No rendering; no frame-tail or product claim.', '',
  '| Rigs × bones | Boundary demand | JS | Wasm | Wasm run-median range |',
  '|---|---|---:|---:|---:|'];
for (const [count, bones] of c.shapes) for (const mode of c.modes) {
  const a = summary.find(r => r.count === count && r.bones === bones && r.mode === mode && r.backend === 'js');
  const b = summary.find(r => r.count === count && r.bones === bones && r.mode === mode && r.backend === 'wasm');
  const f = n => n.toFixed(4);
  lines.push(`| ${count} × ${bones} | ${mode} | ${f(a.medianBlockAverageTickMs)} | ${f(b.medianBlockAverageTickMs)} | ${f(b.minRunMedianMs)}–${f(b.maxRunMedianMs)} |`);
}
writeFileSync(`${dir}/table.md`, lines.join('\n') + '\n');
console.log(lines.join('\n'));
