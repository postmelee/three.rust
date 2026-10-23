// Synthetic browser CPU diagnostic. No rendering, rAF, assets or product verdict.
import { chromium } from 'playwright';
import { serve } from '../scripts/server.mjs';
import { browserPath } from '../scripts/browser-path.mjs';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';

const out = process.argv[2];
if (!out || process.argv.length !== 3 || existsSync(out))
  throw Error('Usage: node bench/ownership-boundary.mjs <fresh-output-directory>');
mkdirSync(out, { recursive: true });
const config = { repeats: 8, warmupTicks: 128, blocks: 24, ticksPerBlock: 16,
  shapes: [[1, 24], [16, 24], [64, 24], [64, 96]],
  modes: ['retained', 'batch', 'fragmented', 'snapshot'], backends: ['js', 'wasm'] };
const paths = ['bench/ownership-boundary.mjs', 'bench/timing.mjs', 'scripts/server.mjs',
  'scripts/browser-path.mjs', 'package-lock.json', 'fixtures/owned/descriptor.mjs',
  'fixtures/pipeline/rig.mjs', 'node_modules/three/build/three.module.js',
  'node_modules/three/build/three.core.js', 'packages/rthree/scene_core.wasm',
  ...['owned', 'owned-layout', 'owned-js', 'owned-wasm', 'owned-state', 'owned-renderer']
    .map(n => `packages/rthree/${n}.js`), 'crates/scene-core/src/owned.rs'];
const manifest = {
  classification: 'Repeated synthetic CPU boundary diagnostic; block-average tick costs, not frame percentiles or application speedup',
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD']).toString().trim(),
  dirty: !!execFileSync('git', ['status', '--porcelain']).length,
  startedAt: new Date().toISOString(), status: 'running', config,
  host: { platform: os.platform(), release: os.release(), cpu: os.cpus()[0]?.model,
    logicalCPUs: os.cpus().length, memory: os.totalmem(), node: process.version,
    gpuDeviceDirectory: existsSync('/dev/dri') },
  fileHashes: Object.fromEntries(paths.map(p => [p, createHash('sha256').update(readFileSync(p)).digest('hex')])),
  runs: [],
};
const save = () => writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
save();
const server = await serve(0, { isolated: true });
let browser;
try {
  browser = await chromium.launch({ executablePath: browserPath(), headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  manifest.browser = browser.version();
  manifest.executablePath = browserPath();
  const variants = config.backends.flatMap(backend => config.modes.map(mode => ({ backend, mode })));
  for (let repeat = 0; repeat < config.repeats; repeat++) {
    const order = [...variants.slice(repeat), ...variants.slice(0, repeat)];
    for (const [count, bones] of repeat % 2 ? [...config.shapes].reverse() : config.shapes) {
      for (const variant of order) {
        const page = await browser.newPage(), errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        // An inert same-origin document avoids starting any demo loop.
        await page.goto(`http://127.0.0.1:${server.address().port}/LICENSE`);
        const result = await page.evaluate(async cfg => {
          const THREE = await import('/node_modules/three/build/three.module.js');
          const { createRig } = await import('/fixtures/pipeline/rig.mjs');
          const { descriptorFromRig, initialActions } = await import('/fixtures/owned/descriptor.mjs');
          const { createOwnedAnimation } = await import('/packages/rthree/owned.js');
          const { observeClock, validateClock, timingPolicy } = await import('/bench/timing.mjs');
          const clock = observeClock(); validateClock(clock, timingPolicy('isolated'));
          const rig = createRig(THREE, cfg), descriptor = descriptorFromRig(rig);
          // No GL context is created; dispose fixture resources before timing.
          rig.meshes[0].geometry.dispose(); rig.meshes[0].material.dispose();
          const domain = await createOwnedAnimation(descriptor, { backend: cfg.backend });
          domain.commands(initialActions(descriptor));
          const commands = descriptor.roots.map((_, rig) => ({ type: 'weight', rig, clip: 0, value: 0.75 }));
          const singles = commands.map(command => [command]);
          let observed = 0;
          function tick() {
            if (cfg.mode === 'batch' || cfg.mode === 'snapshot') domain.commands(commands);
            if (cfg.mode === 'fragmented') for (const command of singles) domain.commands(command);
            domain.step(1 / 60);
            if (cfg.mode === 'snapshot') observed += domain.snapshot().palette[0];
          }
          for (let i = 0; i < cfg.warmupTicks; i++) tick();
          const before = domain.diagnostics(), rawBlockMs = [];
          for (let b = 0; b < cfg.blocks; b++) {
            const start = performance.now();
            for (let i = 0; i < cfg.ticksPerBlock; i++) tick();
            rawBlockMs.push(performance.now() - start);
          }
          const after = domain.diagnostics(), snapshot = domain.snapshot();
          const delta = Object.fromEntries(['steps', 'wasmCalls', 'commandBatches', 'commandBytes', 'readBytes']
            .map(k => [k, after[k] - before[k]]));
          const ticks = cfg.blocks * cfg.ticksPerBlock;
          const batches = cfg.mode === 'retained' ? 0 : cfg.mode === 'fragmented' ? cfg.count : 1;
          if (delta.steps !== ticks || delta.commandBatches !== ticks * batches ||
              delta.wasmCalls !== (cfg.backend === 'wasm' ? ticks * (1 + batches) : 0) ||
              delta.commandBytes !== (cfg.mode === 'retained' ? 0 : ticks * cfg.count * 160))
            throw Error('Unexpected batch/byte/execution counts');
          const snapshotBytes = Object.values(snapshot).reduce((n, a) => n + a.byteLength, 0);
          if (delta.readBytes !== (cfg.mode === 'snapshot' ? ticks * snapshotBytes : 0))
            throw Error('Unexpected read bytes');
          // Same final logical state for every mode; independent JS oracle outside timing.
          const oracle = await createOwnedAnimation(descriptor, { backend: 'js' });
          oracle.commands(initialActions(descriptor));
          for (let i = 0; i < cfg.warmupTicks + ticks; i++) oracle.step(1 / 60);
          const expected = oracle.snapshot(), maxErrors = {};
          for (const key of Object.keys(snapshot)) {
            let max = 0;
            for (let i = 0; i < snapshot[key].length; i++) {
              const d = Math.abs(snapshot[key][i] - expected[key][i]);
              if (!Number.isFinite(d)) throw Error('Non-finite result');
              max = Math.max(max, d);
            }
            maxErrors[key] = max;
            if (max > (key === 'palette' ? 1e-6 : 1e-10)) throw Error(`Mismatch: ${key} ${max}`);
          }
          domain.dispose(); oracle.dispose();
          return { clock, rawBlockMs, delta, maxErrors, observed,
            linearMemoryBytes: after.wasmMemoryBytes, snapshotBytes };
        }, { ...config, count, bones, ...variant });
        if (errors.length || result.rawBlockMs.some(t => !Number.isFinite(t) || t <= 0))
          throw Error(`Invalid run: ${errors}`);
        const name = `${count}-${bones}-${variant.backend}-${variant.mode}-${repeat}.json`;
        writeFileSync(`${out}/${name}`, JSON.stringify({ repeat, count, bones, ...variant, ...result }, null, 2) + '\n');
        manifest.runs.push(name); save(); await page.close();
      }
    }
    console.log(`repeat ${repeat + 1}/${config.repeats} complete`);
  }
  manifest.status = 'complete';
} catch (error) {
  manifest.status = 'failed'; manifest.error = String(error); throw error;
} finally {
  manifest.finishedAt = new Date().toISOString(); save();
  if (browser) await browser.close(); server.close();
}
