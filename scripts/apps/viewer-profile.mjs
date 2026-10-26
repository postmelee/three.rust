import assert from 'node:assert/strict';
import { createViewerCapture } from './viewer-timing-run.mjs';
import { setupViewerCapture, viewerProfileSnapshot, warmViewerFrames, validateViewerWindow } from './viewer-timing-session.mjs';
import { boundedOperation, preserveObservation, preserveProfile } from './candidate-profile-session.mjs';
import { captureProfileScripts } from './candidate-profile-sources.mjs';

const capture = await createViewerCapture('profile', process.argv.slice(2));
const { manifest, configuration, contents, engines } = capture;
manifest.orders = Array.from({ length: configuration.repeats }, (_, round) => engines.map((_, i) => engines[(i + round) % engines.length]));
let sequence = 0;
const endpoint = page => boundedOperation(page.evaluate(viewerProfileSnapshot), { signal: capture.signal, label: 'Viewer profile endpoint' });
async function delay(ms) {
 let timer;
 try { await boundedOperation(new Promise(resolve => { timer = setTimeout(resolve, ms); }), { timeoutMs: ms + 5000, signal: capture.signal, label: 'Viewer profile delay' }); }
 finally { clearTimeout(timer); }
}
function validateObservation(raw, scenario, engine) {
 const result = validateViewerWindow(raw.before, raw.after, scenario, engine);
 assert.equal(raw.after.activity.length, raw.before.activity.length, 'Viewer activity changed during observed window'); return result;
}
async function observation(run, file, scenario, engine) {
 const raw = { before: await endpoint(run.page), after: null, scope: 'Unprofiled diagnostic cadence only; no body CPU timer' };
 await run.save(file, raw); await delay(configuration.prePostObservationSeconds * 1000); raw.after = await endpoint(run.page);
 return preserveObservation(raw, value => run.save(file, value), value => validateObservation(value, scenario, engine));
}
async function profileCase(scenario, engine, round) {
 capture.check(); const directory = `runs/${String(++sequence).padStart(3, '0')}-${scenario.id}-${round}-${engine}`;
 const entry = { sequence, scenario: scenario.id, engine, round, directory, status: 'preparing' }; manifest.runs.push(entry); await capture.persist();
 let run, cdp, profiling = false;
 try {
  run = await capture.open(engine, directory, false, true, scenario);
  const setup = await setupViewerCapture(run, scenario, contents.find(asset => asset.id === scenario.asset));
  await run.save('profile-manifest.json', { engine, scenario, origin: run.origin, candidateSha: manifest.candidateSha, toolSha: manifest.sourceBefore.tooling.sha, config: configuration });
  const warmupStarted = { before: await endpoint(run.page), after: null, status: 'pending', requestedFrames: configuration.warmupFrames, scope: 'Endpoint before warmup request; actual warmup boundaries replace this record only if returned.' };
  await run.save('warmup.json', warmupStarted); let warmup;
  try { warmup = await boundedOperation(run.page.evaluate(warmViewerFrames, configuration.warmupFrames), { timeoutMs: 60000, signal: capture.signal, label: 'Viewer native frame warmup' }); }
  catch (error) { await run.save('warmup.json', { ...warmupStarted, status: 'failed', error: capture.redact(error.message), reason: 'The native frame waiter did not return its actual before/after observations.' }); throw error; }
  await preserveObservation(warmup, value => run.save('warmup.json', value), value => validateObservation(value, scenario, engine));
  assert.equal(warmup.frames, configuration.warmupFrames); assert(warmup.after.renderers.main.frame - warmup.before.renderers.main.frame >= configuration.warmupFrames);
  await observation(run, 'before-window.json', scenario, engine);
  cdp = await run.context.newCDPSession(run.page); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: configuration.samplingIntervalUs });
  const before = await endpoint(run.page); await run.save('profile-observations.json', { before, after: null });
  const wallStart = Date.now(); await cdp.send('Profiler.start'); profiling = true; entry.status = 'sampling';
  // No page evaluations, timing overlays, Debugger, source reads or CPU timers
  // inside the sample window. Native Viewer and GUI scheduling are unchanged.
  await delay(configuration.seconds * 1000);
  const { profile } = await cdp.send('Profiler.stop'); profiling = false;
  const evidence = await preserveProfile(profile, async value => { await run.save('profile.cpuprofile', value); entry.rawProfile = 'profile.cpuprofile'; }, () => endpoint(run.page));
  const raw = { before, after: evidence.after, setup, profileDurationMs: (profile.endTime - profile.startTime) / 1000, wallElapsedIncludingCDPms: Date.now() - wallStart,
   requestedIntervalUs: configuration.samplingIntervalUs, counterScope: 'Endpoint snapshots bracket CDP start/stop and are wider than the exact sample interval.' };
  await preserveObservation(raw, value => run.save('profile-observations.json', value), value => validateObservation(value, scenario, engine));
  await cdp.send('Profiler.disable'); await observation(run, 'after-window.json', scenario, engine);
  const scripts = await captureProfileScripts(cdp, profile, run.out, run.origin);
  // Preserve separately pinned generated-bundle source maps after sampling.
  const maps = [];
  for (const name of new Set(scripts.map(record => record.parsed?.sourceMapURL).filter(Boolean))) {
   const owners = scripts.filter(record => record.parsed?.sourceMapURL === name);
   const url = new URL(name, owners[0].parsed.url.replace('<origin>', run.origin));
   const listed = run.metadata.appBundleOutputs.some(row => row.file === 'dist' + url.pathname);
   if (url.origin !== run.origin || !listed) { maps.push({ url: capture.redact(url.href.replace(run.origin, '<origin>')), unavailable: 'Not an allowlisted local prepared source map; no external request was made.' }); continue; }
   const response = await run.context.request.get(url.href); assert(response.ok(), 'Source map unavailable: ' + url.pathname);
   maps.push({ url: url.href.replace(run.origin, '<origin>'), captured: true });
  }
  await run.save('source-map-capture.json', maps);
  await cdp.detach(); cdp = null; await capture.closeRun(run); entry.status = 'captured'; entry.profileDurationMs = raw.profileDurationMs;
 } catch (error) { entry.status = 'failed'; entry.error = capture.redact(error.stack || error); throw error; }
 finally {
  if (cdp) {
   if (profiling) try { const { profile } = await cdp.send('Profiler.stop'); await run.save('partial-profile.cpuprofile', profile); entry.partialProfile = 'partial-profile.cpuprofile'; } catch (error) { entry.partialProfileUnavailable = capture.redact(error.message); }
   await cdp.send('Profiler.disable').catch(error => { entry.profilerCleanupError = capture.redact(error.message); }); await cdp.detach().catch(error => { entry.detachError = capture.redact(error.message); });
  }
  if (run) await run.close(); await capture.persist();
 }
}
let failure;
try {
 await capture.prepare(); manifest.status = 'profiling'; await capture.persist();
 for (const scenario of manifest.cases) for (const [round, order] of manifest.orders.entries()) for (const engine of order) await profileCase(scenario, engine, round);
 capture.check(); manifest.status = 'capture-complete-attribution-pending';
} catch (error) { failure = error; }
finally { await capture.finish(failure); }
