import test from 'node:test';
import assert from 'node:assert/strict';
import { validateNativePlayback } from '../scripts/apps/timing-phase.mjs';

const duration = 1;
const wrap = value => ((value % duration) + duration) % duration;
function fixture(order = [true, true, true, true], times = [1, 1.2, 1.4, 1.6], offset = .15) {
 return times.map((mixerTime, i) => {
  const timelineMixerTime = order[i] ? mixerTime : (times[i - 1] ?? .8);
  return { raf: 100 + i * 16, mixerTime, timelineMixerTime, actionTime: wrap(timelineMixerTime + offset), clipDuration: duration, viewportFirst: order[i] };
 });
}
const validate = rows => validateNativePlayback(rows, { expectedDuration: duration });

test('accepts both stable native callback orders without mixing same-frame clocks', () => {
 for (const order of [[true, true, true, true], [false, false, false, false]]) {
  const rows = fixture(order); const report = validate(rows);
  assert.equal(report.checkedPairs, 4); assert(report.viewportAdvanceSeconds > 0); assert(report.timelineAdvanceSeconds > 0);
  assert.equal(report.repeatedTimelineObservations, 0);
 }
});

test('allows the one repeated timeline observation implied by a legitimate order switch', () => {
 const report = validate(fixture([true, false, true, false]));
 assert.equal(report.repeatedTimelineObservations, 2);
});

test('allows ordinary wrap and a long gap spanning multiple complete loops', () => {
 const report = validate(fixture([true, true, true, true], [1, 1.8, 4.9, 5.1]));
 assert(report.observedWraps > 0); assert(report.maxPhaseErrorSeconds < report.toleranceSeconds);
});

test('rejects frozen viewport time even when action metadata still says running', () => {
 const rows = fixture(); rows[2].mixerTime = rows[1].mixerTime;
 assert.throws(() => validate(rows), /viewport mixer time did not advance/);
});

test('rejects a fully frozen timeline clock and backwards timeline mixer time', () => {
 let rows = fixture(); rows.forEach(row => { row.timelineMixerTime = rows[0].timelineMixerTime; row.actionTime = rows[0].actionTime; });
 assert.throws(() => validate(rows), /timeline mixer did not progress/);
 rows = fixture(); rows[1].timelineMixerTime = rows[0].timelineMixerTime - .1;
 assert.throws(() => validate(rows), /moved backwards/);
});

test('rejects a frozen action and an action advancing at the wrong effective speed', () => {
 const frozen = fixture(); frozen.forEach(row => { row.actionTime = frozen[0].actionTime; });
 assert.throws(() => validate(frozen), /action phase diverged/);
 const slow = fixture(); slow.forEach(row => { row.actionTime = wrap(slow[0].actionTime + .5 * (row.timelineMixerTime - slow[0].timelineMixerTime)); });
 assert.throws(() => validate(slow), /action phase diverged/);
});

test('rejects duration changes, nonfinite phases, and out-of-range action time', () => {
 for (const value of [2, NaN, Infinity]) {
  const rows = fixture(); rows[2].clipDuration = value;
  assert.throws(() => validate(rows), /clip duration changed/);
 }
 const rows = fixture(); rows[2].actionTime = NaN;
 assert.throws(() => validate(rows), /nonfinite phase/);
 rows[2].actionTime = duration;
 assert.throws(() => validate(rows), /outside repeating range/);
});

test('rejects duplicate rAF timestamps', () => {
 const rows = fixture(); rows[2].raf = rows[1].raf;
 assert.throws(() => validate(rows), /rAF did not advance/);
});

test('anchored phase comparison prevents cumulative sub-tolerance drift', () => {
 const times = Array.from({ length: 40 }, (_, i) => 1 + i * .01);
 const rows = fixture(times.map(() => true), times);
 rows.forEach((row, i) => { row.actionTime = wrap(row.actionTime + i * 1e-10); });
 assert.throws(() => validate(rows), /action phase diverged/);
});

test('constant observed phase at complete-loop intervals is inconclusive, not proof of playback', () => {
 const rows = fixture([true, true, true], [1, 2, 3]);
 assert.throws(() => validate(rows), /no observable action phase progression/);
});

test('neither success nor rejection mutates the caller raw rows', () => {
 for (const invalid of [false, true]) {
  const rows = fixture(); if (invalid) rows[2].clipDuration = 2;
  const before = JSON.stringify(rows); rows.forEach(Object.freeze); Object.freeze(rows);
  if (invalid) assert.throws(() => validate(rows)); else validate(rows);
  assert.equal(JSON.stringify(rows), before);
 }
});
