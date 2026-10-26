import assert from 'node:assert/strict';
import { VIEWER_GROUPS, VIEWER_CAPTURE_SETTINGS } from './viewer-timing-protocol.mjs';

export function quantile(values, p) {
 assert(values.length && values.every(Number.isFinite)); const sorted = [...values].sort((a, b) => a - b), at = (sorted.length - 1) * p, low = Math.floor(at);
 return sorted[low] + (sorted[Math.ceil(at)] - sorted[low]) * (at - low);
}
const stats = values => ({ p50: quantile(values, .5), p95: quantile(values, .95), p99: quantile(values, .99), mean: values.reduce((a, b) => a + b, 0) / values.length, min: Math.min(...values), max: Math.max(...values) });
export function analyzeViewerTiming(raw, scenario, clock, { mode, blockSize }) {
 assert.equal(raw.failure, null, raw.failure ?? 'Capture failed');
 assert.deepEqual(raw.columns, ['kind', 'rafTimestampMs', 'startMs', 'endMs', 'mixerTimeSeconds', 'actionTimeSeconds', 'clipDurationSeconds', 'mainFrame', 'axesFrame']); assert.equal(raw.rows.length % 9, 0);
 const count = raw.kinds.length; assert(count >= 1); assert(Number.isFinite(clock.minPositiveDeltaMs) && clock.minPositiveDeltaMs > 0);
 if (scenario.guiLoops) assert.deepEqual(raw.kinds.slice(1).map(item => ({ path: item.folder, controllers: item.controllers })), scenario.guiLoops);
 const byRaf = new Map();
 for (let i = 0; i < raw.rows.length; i += 9) {
  const [kind, raf, start, end, mixer, action, duration, mainFrame, axesFrame] = raw.rows.slice(i, i + 9);
  assert([kind, raf, start, end].every(Number.isFinite)); assert(Number.isInteger(kind) && kind >= 0 && kind < count); assert(end >= start);
  if (kind > 0) assert([mixer, action, duration, mainFrame, axesFrame].every(value => value === null));
  else { assert(Number.isSafeInteger(mainFrame) && Number.isSafeInteger(axesFrame)); if (mixer !== null) assert(Number.isFinite(mixer)); if (scenario.playback !== 'static') assert(Number.isFinite(action) && duration > 0); else assert(action === null && duration === null); }
  if (!byRaf.has(raf)) byRaf.set(raf, []); byRaf.get(raf).push({ kind, raf, start, end, mixer, action, duration, mainFrame, axesFrame });
 }
 const groups = [...byRaf.values()].sort((a, b) => a[0].raf - b[0].raf).map(rows => {
  assert.equal(rows.length, count, 'Incomplete Viewer/GUI callback group'); assert.equal(new Set(rows.map(row => row.kind)).size, count);
  rows.sort((a, b) => a.start - b.start); for (let i = 1; i < rows.length; i++) assert(rows[i - 1].end <= rows[i].start, 'Overlapping Viewer/GUI callback intervals');
  const animate = rows.find(row => row.kind === 0), cpu = rows.reduce((total, row) => total + (row.end - row.start), 0);
  return { raf: animate.raf, start: rows[0].start, cpu, animateCpu: animate.end - animate.start, guiCpu: cpu - (animate.end - animate.start), ...Object.fromEntries(['mixer', 'action', 'duration', 'mainFrame', 'axesFrame'].map(key => [key, animate[key]])) };
 });
 assert.equal(groups.length, raw.warmup + raw.samples); assert.equal(raw.pairs, groups.length);
 const measured = groups.slice(raw.warmup); assert.equal(measured.length, raw.samples); assert(measured.length > 1);
 for (let i = 1; i < groups.length; i++) {
  const a = groups[i - 1], b = groups[i]; assert(b.raf > a.raf); assert.equal(b.mainFrame - a.mainFrame, 1); assert.equal(b.axesFrame - a.axesFrame, scenario.grid ? 1 : 0);
  if (a.mixer !== null) {
   assert(Number.isFinite(b.mixer) && b.mixer > a.mixer, 'Native mixer did not advance');
   assert(Math.abs(b.mixer - a.mixer - (b.raf - a.raf) / 1000) <= Math.max(1e-9, 128 * Number.EPSILON * Math.max(1, Math.abs(b.mixer))), 'Native mixer delta does not match rAF delta');
  } else assert.equal(b.mixer, null);
  if (scenario.playback !== 'static') {
   assert.equal(b.duration, a.duration); assert.equal(b.duration, raw.before.action.duration);
   assert(a.action >= 0 && a.action < a.duration && b.action >= 0 && b.action < b.duration);
   const expected = (a.action + b.mixer - a.mixer) % a.duration, distance = Math.abs(b.action - expected);
   assert(Math.min(distance, a.duration - distance) <= Math.max(1e-9, 128 * Number.EPSILON * Math.max(1, Math.abs(b.mixer))), 'Walking phase does not match native mixer');
  }
 }
 const cpu = stats(measured.map(row => row.cpu)), floor = 2 * count * clock.minPositiveDeltaMs, blocks = [];
 assert(Number.isSafeInteger(blockSize) && blockSize > 0); if (mode === 'full') assert.equal(raw.samples % blockSize, 0);
 for (let start = 0; start < measured.length; start += blockSize) { const rows = measured.slice(start, start + blockSize), values = stats(rows.map(row => row.cpu)); blocks.push({ start, samples: rows.length, ...values, stable: Math.abs(values.p50 - cpu.p50) <= Math.max(.05 * cpu.p50, floor) }); }
 return { samples: measured.length, callbackCount: count, guiLoops: raw.kinds.slice(1), cpu, animateCpu: stats(measured.map(row => row.animateCpu)), guiCpu: stats(measured.map(row => row.guiCpu)),
  rafIntervals: stats(measured.slice(1).map((row, i) => row.raf - measured[i].raf)), callbackStartIntervals: stats(measured.slice(1).map((row, i) => row.start - measured[i].start)),
  arrivalDelay: stats(measured.map(row => row.start - row.raf)), blocks, blockStable: blocks.every(block => block.stable), observedClockIncrement: clock.minPositiveDeltaMs, quantizationFloorMs: floor,
  phaseCoverage: { nativeWallClock: true, frameMatchedAcrossRoutes: false, mixerStart: measured[0].mixer, mixerEnd: measured.at(-1).mixer, actionStart: measured[0].action, actionEnd: measured.at(-1).action, duration: measured[0].duration }, measuredGroups: measured };
}
export function summarizeViewerTiming(manifest) {
 const { group, cases, configuration } = manifest, baseline = VIEWER_GROUPS[group][0].engine, engines = [...new Set(VIEWER_GROUPS[group].map(route => route.engine))];
 assert(Number.isSafeInteger(configuration.rounds) && configuration.rounds > 0);
 for (const [key, value] of Object.entries(VIEWER_CAPTURE_SETTINGS.timing[configuration.mode] ?? {})) assert.equal(configuration[key], value, 'Summary differs from fixed timing settings: ' + key);
 assert(['full', 'smoke'].includes(configuration.mode));
 assert(manifest.runs.every(run => run.status === 'captured'), 'Incomplete or failed capture cannot yield a full A/A verdict');
 assert.equal(manifest.runs.length, cases.length * (configuration.rounds * 4 + 2), 'Run matrix is incomplete');
 const result = { qualification: false, mode: configuration.mode, group, baseline, scope: configuration.scope, scenarios: [],
  migration: group === 'migration' ? 'r176 packaging and r176-to-r186 migration only; never combine with candidate engine effects.' : null };
 for (const scenario of cases) {
  const runs = manifest.runs.filter(run => run.scenario === scenario.id && run.status === 'captured'), balanced = runs.filter(run => run.purpose === 'balanced'), originals = runs.filter(run => run.engine === baseline);
  assert.equal(runs.length, configuration.rounds * 4 + 2); assert.equal(balanced.length, configuration.rounds * 4);
  for (let round = 0; round < configuration.rounds; round++) for (const route of VIEWER_GROUPS[group]) assert.equal(balanced.filter(run => run.round === round && run.label === route.label && run.engine === route.engine).length, 1, 'Missing or duplicate route/round');
  for (const purpose of ['bookend-before', 'bookend-after']) assert.equal(runs.filter(run => run.purpose === purpose && run.engine === baseline).length, 1, 'Missing baseline bookend');
  const callbackCount = runs[0].result.callbackCount; assert(Number.isSafeInteger(callbackCount) && callbackCount > 0);
  assert.equal(callbackCount, scenario.guiLoops.length + 1, 'Callback count differs from frozen native case');
  for (const run of runs) {
   assert.equal(run.result.samples, configuration.samples); assert.equal(run.result.callbackCount, callbackCount); assert.deepEqual(run.result.guiLoops, runs[0].result.guiLoops, 'GUI scope changed across routes');
   assert(Number.isFinite(run.result.observedClockIncrement) && run.result.observedClockIncrement > 0);
   assert.equal(run.result.quantizationFloorMs, 2 * callbackCount * run.result.observedClockIncrement, 'Quantization floor differs from frozen callback count and observed clock');
  }
  assert(originals.length > 0); const median = quantile(originals.map(run => run.result.cpu.p50), .5), floor = Math.max(...originals.map(run => run.result.quantizationFloorMs)), tolerance = Math.max(.05 * median, floor);
  const checks = originals.map(run => ({ directory: run.directory, purpose: run.purpose, cpu: run.result.cpu, withinTolerance: Math.abs(run.result.cpu.p50 - median) <= tolerance, blocksWithinSceneTolerance: run.result.blocks.every(block => Math.abs(block.p50 - run.result.cpu.p50) <= tolerance) }));
  const summaries = {};
  for (const engine of engines) {
   const subset = balanced.filter(run => run.engine === engine); assert(subset.length);
   const medians = field => Object.fromEntries(['p50', 'p95', 'p99'].map(q => [q, quantile(subset.map(run => run.result[field][q]), .5)]));
   summaries[engine] = { independentRuns: subset.length, medianRunCpu: medians('cpu'), medianRunAnimateCpu: medians('animateCpu'), medianRunGuiCpu: medians('guiCpu'), medianRunRafIntervals: medians('rafIntervals'), medianRunCallbackStartIntervals: medians('callbackStartIntervals'), blockStable: subset.every(run => run.result.blockStable) };
  }
  const delta = (a, b) => Object.fromEntries(['p50', 'p95', 'p99'].map(q => [q, { absoluteMs: a[q] - b[q], relativeChangePercent: b[q] > floor ? 100 * (a[q] - b[q]) / b[q] : null }]));
  result.scenarios.push({ scenario: scenario.id, engines: summaries, versusBaseline: Object.fromEntries(engines.filter(engine => engine !== baseline).map(engine => [engine, delta(summaries[engine].medianRunCpu, summaries[baseline].medianRunCpu)])),
   wasmVersusMatchedJS: group === 'engine' ? delta(summaries['prepared-wasm-r186'].medianRunCpu, summaries['prepared-js-r186'].medianRunCpu) : null,
   aa: { allOriginalMedian: median, includesBookendsInTolerance: true, quantizationFloorMs: floor, toleranceMs: tolerance, checks, passes: configuration.mode === 'full' && checks.every(check => check.withinTolerance && check.blocksWithinSceneTolerance) },
   interpretation: 'Observed declared synchronous callback bodies only. A/A failure precludes a stable speedup claim; GPU/compositor/asynchronous work and collector cost are outside this CPU boundary. CPU savings are not an FPS claim.' });
 }
 return result;
}
