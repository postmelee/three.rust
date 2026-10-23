import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { validateClock } from './timing.mjs';

export function evidence(manifest, summary, comparison, legacyClock = null) {
  assert.equal(manifest.status, 'complete');
  assert.equal(manifest.options.stage, 'render', 'Diagnostics are not main evidence');
  const rows = summary.rows;
  assert.equal(rows.length, manifest.runs.length, 'Missing summary rows');
  const modern = !!manifest.timing;
  const clockSource = modern ? 'Every measured page before warmup' : 'Explicit legacy external preflight (not every page)';
  let resolution;
  if (modern) {
    for (const row of rows) validateClock(row.clock ?? {}, manifest.timing);
    resolution = Math.max(...rows.map(r => r.clock.minPositiveDeltaMs));
  } else {
    assert(legacyClock > 0 && Number.isFinite(legacyClock), 'Supply explicit legacy clock evidence');
    resolution = legacyClock;
  }
  const full = manifest.options.repeats >= 5 && manifest.options.warmup >= 1200 && manifest.options.samples >= 3600;
  const comparisons = [];
  for (const scenario of manifest.options.cases) {
    for (const [baseline, variant] of [['original', 'owned-js'], ['original', 'owned-wasm'], ['owned-js', 'owned-wasm']]) {
      const a = summary.groups.find(g => g.scenario === scenario && g.variant === baseline);
      const b = summary.groups.find(g => g.scenario === scenario && g.variant === variant);
      assert(a && b, 'All three paths required');
      const pairs = summary.ratios.find(r => r.scenario === scenario && r.baseline === baseline && r.variant === variant);
      assert(pairs && pairs.ratios.every(Number.isFinite), 'Missing repeat pairs');
      const completePairs = pairs.ratios.length === manifest.options.repeats;
      const saving = a.metrics.cpu.p50.median - b.metrics.cpu.p50.median;
      const aa = (baseline === 'original' ? comparison.decisions : comparison.matchedJsDecisions)?.find(d => d.scenario === scenario && d.variant === variant);
      if (baseline === 'original') assert(aa, 'Missing original A/A decision');
      comparisons.push({
        scenario, baseline, variant,
        baselineP50Ms: a.metrics.cpu.p50.median, candidateP50Ms: b.metrics.cpu.p50.median,
        savingMs: saving, observedReduction: 1 - b.metrics.cpu.p50.median / a.metrics.cpu.p50.median,
        exceedsObservedClockIncrement: saving > resolution,
        allRepeatPairsFaster: completePairs && pairs.ratios.every(r => r < 1),
        omittedZeroBaselinePairs: manifest.options.repeats - pairs.ratios.length,
        repeatRatios: pairs.ratios,
        aboveOriginalRelativeNoise: baseline === 'original' ? aa?.aboveNoise ?? null : null,
        aboveBaselineRelativeNoise: aa?.aboveNoise ?? null,
        cpuP95Within5Percent: b.metrics.cpu.p95.median <= a.metrics.cpu.p95.median * 1.05,
        cpuP99Within5Percent: b.metrics.cpu.p99.median <= a.metrics.cpu.p99.median * 1.05,
        intervalP95Within5Percent: b.metrics.frameInterval.p95.median <= a.metrics.frameInterval.p95.median * 1.05,
        limitation: baseline === 'owned-js' && !aa ? 'No matched-JS A/A calibration; original A/A cannot establish Rust-specific significance' : 'Baseline A/A screens relative drift only; not statistical significance',
      });
    }
  }
  return {
    sourceCommit: manifest.sourceCommit, hardware: manifest.options.hardware,
    timing: manifest.timing ?? {mode: 'legacy-unrecorded'}, clockSource,
    conservativeObservedIncrementMs: resolution, fullProtocol: full,
    verdict: 'Diagnostic screens only; no automatic product, FPS or Rust-specific acceptance',
    comparisons,
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [dir, output, legacyPath] = process.argv.slice(2);
  if (!dir || !output || existsSync(output)) throw Error('Usage: node bench/fox-evidence.mjs SESSION NEW_OUTPUT [LEGACY_PREFLIGHT_JSON]');
  const read = p => JSON.parse(readFileSync(p));
  const result = evidence(read(`${dir}/main/manifest.json`), read(`${dir}/main/summary.json`), read(`${dir}/comparison.json`), legacyPath ? read(legacyPath).webgl.timerResolutionMs : null);
  writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.table(result.comparisons.map(({scenario, baseline, variant, savingMs, exceedsObservedClockIncrement, allRepeatPairsFaster}) => ({scenario, baseline, variant, savingMs, exceedsObservedClockIncrement, allRepeatPairsFaster})));
}
