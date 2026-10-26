import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { preserveProfile, preserveObservation, boundedOperation, validateProfileWindow, capturePassShape } from '../scripts/apps/candidate-profile-session.mjs';

function state(mixerTime, at, frame) {
 return { at, crossOriginIsolated: true, visibility: 'visible', focused: true, dpr: 1, rendererPixelRatio: 1, autosave: true,
  width: 800, height: 400, cssWidth: 800, cssHeight: 400, savingStarted: 1, savingFinished: 1,
  selected: 'RobotExpressive.glb', mixerTime, action: { running: true, paused: false, enabled: true, name: 'Walking', mixerTimeScale: 1, duration: 1, time: mixerTime % 1 },
  quality: { shadows: true }, activity: [], renderInfo: { frame }, diagnostics: null };
}
test('profile is persisted before a failed post-profile query and remains byte-complete', async t => {
 const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rthree-profile-retention-')); t.after(() => fs.rm(dir, { recursive: true, force: true }));
 const file = path.join(dir, 'profile.cpuprofile'), profile = { nodes: [{ id: 1 }], samples: [1], timeDeltas: [100] }, failure = Error('page closed');
 await assert.rejects(preserveProfile(profile, value => fs.writeFile(file, JSON.stringify(value)), async () => {
  assert.deepEqual(JSON.parse(await fs.readFile(file)), profile); throw failure;
 }), error => error === failure);
 assert.deepEqual(JSON.parse(await fs.readFile(file)), profile);
});
test('actual observation helper retains both raw endpoints when semantic validation fails', async t => {
 const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rthree-profile-observation-')); t.after(() => fs.rm(dir, { recursive: true, force: true }));
 const file = path.join(dir, 'window.json'), raw = { before: state(.8, 100, 10), after: state(.8, 2500, 586) };
 await assert.rejects(preserveObservation(raw, value => fs.writeFile(file, JSON.stringify(value)), value => {
  validateProfileWindow(value.before, value.after, 'original');
 }), /Mixer did not advance/);
 const saved = JSON.parse(await fs.readFile(file)); assert.deepEqual(saved.before, raw.before); assert.deepEqual(saved.after, raw.after);
 assert.match(saved.validationError, /Mixer did not advance/);
});
test('bounded page operations reject timeout and interruption without waiting for stopped rAF', async () => {
 await assert.rejects(boundedOperation(new Promise(() => {}), { timeoutMs: 5, label: 'Warmup' }), /Warmup: timeout/);
 const controller = new AbortController();
 const pending = boundedOperation(new Promise(() => {}), { timeoutMs: 1000, signal: controller.signal, label: 'Snapshot' });
 controller.abort(); await assert.rejects(pending, /Snapshot: interrupted/);
 await assert.rejects(boundedOperation(new Promise(() => {}), { signal: controller.signal }), /interrupted/);
 assert.equal(await boundedOperation(Promise.resolve(7), { timeoutMs: 1000 }), 7);
});
test('native endpoint validation allows loop wraps and records its limited scope', () => {
 const result = validateProfileWindow(state(.8, 100, 10), state(3.2, 2500, 586), 'original');
 assert(result.phaseErrorSeconds < 1e-9); assert.equal(result.renderPasses, 576); assert.match(result.scope, /Endpoint/);
});
test('native endpoint validation rejects frozen playback, phase drift, focus and autosave disturbances', () => {
 for (const alter of [s => { s.mixerTime = .8; }, s => { s.action.time = .9; }, s => { s.activity.push({ type: 'blur' }); }, s => { s.savingStarted++; s.savingFinished++; }, s => { s.focused = false; }]) {
  const after = state(3.2, 2500, 586); alter(after); assert.throws(() => validateProfileWindow(state(.8, 100, 10), after, 'original'));
 }
});
test('oracle-only pass observation retains native passes and restores render after success or native failure', () => {
 for (const fail of [false, true]) {
  const nativeFailure = Error('native render failed'), scene = { name: 'Scene', type: 'Scene', traverse(callback) { callback({ name: 'Skin', type: 'SkinnedMesh', isSkinnedMesh: true, pivot: null, geometry: { morphAttributes: { position: [] } } }); } };
  let calls = 0;
  const original = () => { calls++; if (fail) throw nativeFailure; return 42; };
  const renderer = { render: original, info: { render: { frame: 1, calls: 1 } } };
  const context = vm.createContext({ __timingRenderer: renderer, THREE: {}, editor: { signals: { sceneGraphChanged: { dispatch() { assert.equal(renderer.render(scene, { type: 'PerspectiveCamera', coordinateSystem: 2000 }), 42); } } } } });
  const capture = vm.runInContext('(' + capturePassShape.toString() + ')', context);
  if (fail) assert.throws(capture, error => error === nativeFailure);
  else { const data = capture(); assert.equal(data.passes.length, 1); assert.equal(data.passes[0].observedExclusions[0].excludedKinds[0], 'isSkinnedMesh'); assert.equal(data.passes[0].observedExclusions[0].morphAttributes[0], 'position'); assert.equal(data.restored, true); }
  assert.equal(calls, 1); assert.equal(renderer.render, original);
 }
});
