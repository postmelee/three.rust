import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const archive = "bench/results/mac-20261023";
for (const [label, mutation, error] of [
  ["accept matching captured phases", () => {}, null],
  ["reject mixed clock policies", m => { m.timing = {mode: "isolated", probeVersion: 1}; }, "Different timing policies"],
  [
    "reject a different measured source",
    (m) => {
      m.hashes["fixtures/fox/replay.mjs"] = "changed";
    },
    "Different measured source hashes",
  ],
  [
    "reject a browser update",
    (m) => {
      m.browser = "changed";
    },
    "Different browser versions",
  ],
  [
    "reject different work",
    (m) => {
      m.options.samples++;
    },
    "Different samples",
  ],
  [
    "reject incomplete phases",
    (m) => {
      m.status = "failed";
    },
    "Incomplete phase",
  ],
])
  test(label, () => {
    const dir = mkdtempSync(join(tmpdir(), "fox-analysis-"));
    try {
      for (const phase of ["aa-before", "main", "aa-after"]) {
        mkdirSync(join(dir, phase));
        for (const file of ["manifest.json", "summary.json"])
          copyFileSync(`${archive}/${phase}/${file}`, join(dir, phase, file));
      }
      const path = join(dir, "aa-after", "manifest.json"),
        manifest = JSON.parse(readFileSync(path));
      mutation(manifest);
      writeFileSync(path, JSON.stringify(manifest));
      const result = spawnSync(
        process.execPath,
        ["bench/fox-compare.mjs", dir],
        { encoding: "utf8" },
      );
      if (error) {
        assert.notEqual(result.status, 0);
        assert(result.stderr.includes(error), result.stderr);
      } else {
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(
          JSON.parse(readFileSync(join(dir, "comparison.json"))),
          JSON.parse(readFileSync(`${archive}/comparison.json`)),
        );
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

const { evidence } = await import('../bench/fox-evidence.mjs');
const load = p => JSON.parse(readFileSync(`${archive}/${p}`));
test('historical evidence separates ownership improvement from unresolved Rust benefit', () => {
  const args = [load('main/manifest.json'), load('main/summary.json'), load('comparison.json')];
  assert.throws(() => evidence(...args), /explicit legacy clock/);
  const report = evidence(...args, load('preflight-ac/browser.json').webgl.timerResolutionMs);
  const find = baseline => report.comparisons.find(r => r.scenario === 'animated-16' && r.baseline === baseline && r.variant === 'owned-wasm');
  assert.equal(find('original').exceedsObservedClockIncrement, true);
  assert.equal(find('original').allRepeatPairsFaster, true);
  assert.equal(find('owned-js').exceedsObservedClockIncrement, false);
  assert.equal(find('owned-js').allRepeatPairsFaster, false);
  assert.equal(find('owned-js').aboveOriginalRelativeNoise, null);
  args[0].timing = {mode:'isolated', probeVersion:1};
  assert.throws(() => evidence(...args), /isolation/);
});

test('matched-JS A/A is used separately and incomplete calibration rejects', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fox-js-aa-'));
  try {
    for (const phase of ['aa-before', 'main', 'aa-after', 'aa-js-before', 'aa-js-after']) {
      const source = phase.replace('aa-js-', 'aa-');
      mkdirSync(join(dir, phase));
      const m = load(`${source}/manifest.json`), s = load(`${source}/summary.json`);
      if (phase.includes('js')) {
        m.options.variants = ['owned-js'];
        for (const row of s.rows) row.variant = 'owned-js';
        for (const group of s.groups) group.variant = 'owned-js';
        // Intentionally drift the matched control after main; original A/A stays fixed.
        if (phase.endsWith('after')) for (const row of s.rows) row.metrics.cpu.p50 *= 2;
      }
      writeFileSync(join(dir, phase, 'manifest.json'), JSON.stringify(m));
      writeFileSync(join(dir, phase, 'summary.json'), JSON.stringify(s));
    }
    const run = () => spawnSync(process.execPath, ['bench/fox-compare.mjs', dir], {encoding:'utf8'});
    const ok = run();
    assert.equal(ok.status, 0, ok.stderr);
    const comparison = JSON.parse(readFileSync(join(dir, 'comparison.json')));
    const decision = comparison.matchedJsDecisions.find(d => d.scenario === 'animated-16');
    assert(decision.requiredGain > 1);
    assert.equal(decision.aboveNoise, false);
    const report = evidence(load('main/manifest.json'), load('main/summary.json'), comparison, .1);
    assert.equal(report.comparisons.find(r => r.scenario === 'animated-16' && r.baseline === 'owned-js').aboveBaselineRelativeNoise, false);
    rmSync(join(dir, 'aa-js-after'), {recursive:true});
    const bad = run();
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr, /Incomplete matched-JS/);
  } finally { rmSync(dir, {recursive:true, force:true}); }
});
