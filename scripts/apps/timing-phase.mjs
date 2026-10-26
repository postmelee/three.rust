// Pure continuous-playback validator; no browser state, clocks or row mutation.
// Contract: one native mixer.update per Viewport callback; a forward, unit-speed
// repeating action with immutable duration; Animation.updateTime only reads it.
// Input is measured pairs in observed rAF order, augmented during grouping with
// timelineMixerTime: timeline.mixerTime. No cross-callback order is assumed.
// The collector's existing finite/nonoverlap/pair validation remains required.
export function validateNativePlayback(pairs, { expectedDuration } = {}) {
 const check = (condition, message) => { if (!condition) throw Error('Native playback: ' + message); };
 check(Array.isArray(pairs) && pairs.length >= 2, 'at least two measured pairs are required');
 check(Number.isFinite(expectedDuration) && expectedDuration > 0, 'expected duration must be positive and finite');
 const magnitude = Math.max(1, expectedDuration, ...pairs.flatMap(row => [Math.abs(row.mixerTime), Math.abs(row.timelineMixerTime)]));
 const tolerance = Math.max(1e-9, 128 * Number.EPSILON * magnitude);
 check(Number.isFinite(tolerance) && tolerance < expectedDuration / 4, 'phase resolution is insufficient');
 const wrap = value => ((value % expectedDuration) + expectedDuration) % expectedDuration;
 const phaseError = (actual, expected) => {
  const distance = Math.abs(actual - expected);
  return Math.min(distance, expectedDuration - distance);
 };
 let changedPhases = 0, wraps = 0, repeatedTimelineObservations = 0, maxPhaseError = 0;
 const first = pairs[0];
 for (let i = 0; i < pairs.length; i++) {
  const row = pairs[i], previous = pairs[i - 1];
  check([row.raf, row.mixerTime, row.timelineMixerTime, row.actionTime].every(Number.isFinite), `nonfinite phase at pair ${i}`);
  check(row.clipDuration === expectedDuration, `clip duration changed at pair ${i}`);
  check(row.actionTime >= 0 && row.actionTime < expectedDuration, `action phase is outside repeating range at pair ${i}`);
  if (previous) {
   check(row.raf > previous.raf, `rAF did not advance at pair ${i}`);
   check(row.mixerTime > previous.mixerTime, `viewport mixer time did not advance at pair ${i}`);
   check(row.timelineMixerTime >= previous.timelineMixerTime, `timeline mixer time moved backwards at pair ${i}`);
   if (row.timelineMixerTime === previous.timelineMixerTime) {
    repeatedTimelineObservations++;
   }
  }
  const anchoredExpected = wrap(first.actionTime + row.timelineMixerTime - first.timelineMixerTime);
  const anchoredError = phaseError(row.actionTime, anchoredExpected);
  maxPhaseError = Math.max(maxPhaseError, anchoredError);
  check(anchoredError <= tolerance, `action phase diverged from timeline mixer at pair ${i}`);
  if (previous) {
   const expected = wrap(previous.actionTime + row.timelineMixerTime - previous.timelineMixerTime);
   const stepError = phaseError(row.actionTime, expected);
   maxPhaseError = Math.max(maxPhaseError, stepError);
   check(stepError <= tolerance, `action step diverged from timeline mixer at pair ${i}`);
   if (phaseError(row.actionTime, previous.actionTime) > tolerance) changedPhases++;
   if (row.actionTime < previous.actionTime - tolerance) wraps++;
  }
 }
 const last = pairs.at(-1);
 check(last.timelineMixerTime > first.timelineMixerTime, 'timeline mixer did not progress over measured rows');
 check(changedPhases > 0, 'no observable action phase progression; whole-loop aliasing cannot establish playback');
 return {
  checkedPairs: pairs.length, checkedTransitions: pairs.length - 1,
  durationSeconds: expectedDuration, toleranceSeconds: tolerance, maxPhaseErrorSeconds: maxPhaseError,
  viewportAdvanceSeconds: last.mixerTime - first.mixerTime,
  timelineAdvanceSeconds: last.timelineMixerTime - first.timelineMixerTime,
  observedPhaseChanges: changedPhases, observedWraps: wraps,
  repeatedTimelineObservations,
  scope: 'Observed native callback phase consistency for unit-speed repeating playback; does not establish pose, render or whole-frame correctness.'
 };
}
