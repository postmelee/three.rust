import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createViewerCapture } from './viewer-timing-run.mjs';
import { setupViewerCapture, validateViewerWindow } from './viewer-timing-session.mjs';
import { analyzeViewerTiming, summarizeViewerTiming } from './viewer-timing-analysis.mjs';
import { boundedOperation } from './candidate-profile-session.mjs';

const capture = await createViewerCapture('timing', process.argv.slice(2));
const { manifest, configuration, routes, contents } = capture;
manifest.orders = Array.from({ length: configuration.rounds }, (_, round) => [0, 1, 3, 2].map(i => (i + round) % 4));
let sequence = 0;
async function runCase(scenario, route, round, purpose) {
 capture.check();
 const directory = `runs/${String(++sequence).padStart(3, '0')}-${scenario.id}-${purpose}-${route.label}`;
 const entry = { scenario: scenario.id, label: route.label, engine: route.engine, round, purpose, directory, status: 'running' };
 manifest.runs.push(entry); await capture.persist(); let run;
 try {
  run = await capture.open(route.engine, directory, true, false, scenario);
  const prepared = await setupViewerCapture(run, scenario, contents.find(asset => asset.id === scenario.asset));
  const counts = { warmup: configuration.warmup, samples: configuration.samples };
  let completed;
  try {
   completed = await boundedOperation(run.page.evaluate(counts => __rthreeViewerTiming.run(counts), counts), { timeoutMs: 30000 + (counts.warmup + counts.samples) * 100, signal: capture.signal, label: 'Viewer callback capture' });
  } catch (error) {
   await boundedOperation(run.page.evaluate(message => __rthreeViewerTiming.abort(message), String(error)), { timeoutMs: 5000, label: 'Abort Viewer collector' }).catch(error => { entry.abortError = capture.redact(error.message); });
   throw error;
  } finally {
   const raw = await boundedOperation(run.page.evaluate(() => __rthreeViewerTiming.export()), { timeoutMs: 5000, label: 'Export Viewer partial rows' }).catch(error => ({ exportError: capture.redact(error.message), reason: 'Page did not return its raw buffer; no partial rows are claimed retained.' }));
   await run.save('raw-callbacks.json', raw); entry.rawPreserved = !raw.exportError;
  }
  assert.equal(completed.status, 'captured', completed.error ?? 'Viewer capture did not complete');
  const raw = JSON.parse(await fs.readFile(path.join(run.out, 'raw-callbacks.json'), 'utf8'));
  const result = analyzeViewerTiming(raw, scenario, prepared.clock, configuration);
  result.windowValidation = validateViewerWindow(raw.before, raw.after, scenario, route.engine);
  assert.equal(result.windowValidation.mainFrames, configuration.samples); assert.equal(result.windowValidation.axesFrames, scenario.grid ? configuration.samples : 0);
  assert.equal(raw.activity.filter(event => event.phase === 'sample').length, 0, 'Focus/visibility/resize changed in measured rows');
  await run.save('measured-groups.json', result.measuredGroups); delete result.measuredGroups;
  await run.save('summary.json', result); entry.result = result;
  await capture.closeRun(run); entry.status = 'captured'; await capture.persist();
  console.log(`${directory}: CPU p50 ${result.cpu.p50.toFixed(6)} ms; ${result.callbackCount} native callbacks`);
 } catch (error) { entry.status = 'failed'; entry.error = capture.redact(error.stack || error); if (run) await run.save('failure.json', entry); throw error; }
 finally { if (run) await run.close(); await capture.persist(); }
}
let failure;
try {
 await capture.prepare(); manifest.status = 'capturing'; await capture.persist();
 for (const scenario of manifest.cases) {
  const baseline = routes[0].engine;
  await runCase(scenario, { engine: baseline, label: 'baseline-pre' }, null, 'bookend-before');
  for (const [round, order] of manifest.orders.entries()) for (const index of order) await runCase(scenario, routes[index], round, 'balanced');
  await runCase(scenario, { engine: baseline, label: 'baseline-post' }, null, 'bookend-after');
 }
 capture.check(); await capture.save('analysis.json', summarizeViewerTiming(manifest));
 manifest.status = configuration.mode === 'full' ? 'screen-complete-unqualified' : 'smoke-complete-not-performance-evidence';
} catch (error) { failure = error; }
finally { await capture.finish(failure); }
