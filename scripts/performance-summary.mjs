// Generate only the measured table, never an automatic product-speed claim.
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const dir = 'bench/results/mac-20261023/main';
const manifest = JSON.parse(readFileSync(`${dir}/manifest.json`));
const summary = JSON.parse(readFileSync(`${dir}/summary.json`));
assert.equal(manifest.status, 'complete');
assert.equal(manifest.sourceCommit, 'd9fa780fce9ad8bf49d1ba1c0c8f5a78222aed1f');
const scenarios = [['animated-16', '16 animated Fox characters'], ['animated-1', '1 animated Fox character'], ['static-1', '1 static Fox character']];
const lines = ['| Scene | Three.js | Same design in JS | Rust/Wasm | Observed CPU result vs Three.js |', '|---|---:|---:|---:|---|'];
for (const [scenario, label] of scenarios) {
  const values = ['original', 'owned-js', 'owned-wasm'].map(variant => {
    const g = summary.groups.find(g => g.scenario === scenario && g.variant === variant);
    assert(g);
    return g.metrics.cpu.p50.median;
  });
  const reduction = Math.round((1 - values[2] / values[0]) * 100);
  const result = scenario === 'animated-16' ? `About ${reduction}% less CPU time (${(values[0] - values[2]).toFixed(2)} ms saved)` : scenario === 'animated-1' ? 'No demonstrated gain; owned paths measured higher' : 'No demonstrated gain';
  lines.push(`| ${label} | ${values.map(v => `${v.toFixed(2)} ms`).join(' | ')} | ${result} |`);
}
const start = '<!-- performance-table:start -->', end = '<!-- performance-table:end -->';
const path = 'README.md', current = readFileSync(path, 'utf8');
assert(current.includes(start) && current.includes(end));
const expected = current.slice(0, current.indexOf(start) + start.length) + '\n' + lines.join('\n') + '\n' + current.slice(current.indexOf(end));
if (process.argv.includes('--check')) assert.equal(current, expected, 'Run npm run docs:performance');
else writeFileSync(path, expected);
console.log('README performance table matches archived physical-Mac measurements');
