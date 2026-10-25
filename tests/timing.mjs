import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serve } from '../scripts/server.mjs';
import { browserPath } from '../scripts/browser-path.mjs';
import { observeClock, timingPolicy, validateClock } from '../bench/timing.mjs';

test('invalid timing policy and missing/stalled clock reject', () => {
  assert.throws(() => timingPolicy('fast'), /Invalid/);
  assert.throws(() => validateClock({crossOriginIsolated: false, minPositiveDeltaMs: 0}, timingPolicy()), /clock/);
  assert.throws(() => validateClock({crossOriginIsolated: false, minPositiveDeltaMs: .1}, timingPolicy('isolated')), /isolation/);
});

test('browser observes requested isolation; diagnostic split preserves Fox outputs', async () => {
  const browser = await chromium.launch({executablePath: browserPath(), headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const ordinary = new Map();
  try {
    for (const mode of ['ordinary', 'isolated']) {
      const server = await serve(0, {isolated: mode === 'isolated'});
      const origin = `http://127.0.0.1:${server.address().port}`;
      try {
        for (const variant of ['original', 'owned-js', 'owned-wasm']) {
          const page = await browser.newPage();
          const errors = [];
          page.on('pageerror', e => errors.push(String(e)));
          const response = await page.goto(`${origin}/fixtures/fox/index.html?manual&count=1&variant=${variant}`);
          assert.equal(response.headers()['cross-origin-embedder-policy'], mode === 'isolated' ? 'require-corp' : undefined);
          await page.waitForFunction(() => !!window.__fox);
          validateClock(await page.evaluate(observeClock), timingPolicy(mode));
          // Includes pause, blend, stop and restart; diagnostic extra reads must not alter state.
          const results = await page.evaluate(async () => {
            const a = await window.__fox.measure({warmup: 0, samples: 600, mode:'render'});
            const b = await window.__fox.measure({warmup: 0, samples: 600, mode:'diagnostic'});
            const image = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(window.__fox.pixels()))));
            return {image, a: a.final, b: b.final, invalid: [...a.invalid, ...b.invalid], buckets: Object.keys(b.raw[0])};
          });
          if (mode === 'ordinary') ordinary.set(variant, results);
          else assert.deepEqual(results, ordinary.get(variant), 'Isolation changed numeric/pixel results');
          assert.deepEqual(results.a, results.b);
          assert.deepEqual(results.invalid, []);
          assert(results.buckets.includes('inputCommands'));
          assert(results.buckets.includes('evaluate'));
          assert.deepEqual(errors, []);
          await page.close();
        }
      } finally { await new Promise(resolve => server.close(resolve)); }
    }
  } finally { await browser.close(); }
});
