import { chromium } from "playwright";
import { browserPath } from "../scripts/browser-path.mjs";
import { serve } from "../scripts/server.mjs";
import { hardwareRenderer, configuration } from "../bench/config.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const out = process.env.RTHREE_FOX_RESULTS_DIR || "work/fox-validation";
mkdirSync(out, { recursive: true });
const hardware = process.env.RTHREE_BROWSER_MODE === "hardware",
  cfg = configuration(hardware ? ["mode=hardware", "headless=false"] : []);
const server = await serve(),
  browser = await chromium.launch({
    executablePath: browserPath(),
    headless: cfg.headless,
    args: cfg.args,
  });
const results = [];
// Predeclared numeric tolerance: world units originate in centimeter-scale asset data.
function compare(a, b) {
  assert.equal(a.length, b.length);
  let max = 0;
  for (let i = 0; i < a.length; i++) {
    const delta = Math.abs(a[i] - b[i]);
    max = Math.max(max, delta);
    assert(
      delta <= 2e-5 + 1e-6 * Math.abs(b[i]),
      `Numeric delta ${delta} at ${i}`,
    );
  }
  return max;
}
try {
  for (const scenario of ["animated-1", "animated-16", "static-1"]) {
    const [kind, count] = scenario.split("-");
    let reference;
    for (const [v, variant] of [
      "original",
      "original",
      "owned-js",
      "owned-wasm",
    ].entries()) {
      const page = await browser.newPage({
          viewport: { width: 640, height: 540 },
          deviceScaleFactor: 1,
        }),
        errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(
        `http://127.0.0.1:4173/fixtures/fox/index.html?manual&count=${count}&variant=${variant}${kind === "static" ? "&static" : ""}`,
      );
      await page.waitForFunction(() => !!window.__fox);
      await page.bringToFront();
      const gpu = await page.evaluate(() => window.__fox.gpu);
      if (hardware) hardwareRenderer(gpu.renderer);
      if (variant !== "original")
        await page.evaluate(() => window.__fox.poison());
      const states = [];
      for (const tick of [
        1, 120, 150, 180, 240, 300, 420, 450, 480, 540, 600,
      ]) {
        const state = await page.evaluate((t) => {
          const p = window.__fox;
          while (p.tick < t) p.frame();
          p.draw();
          return {
            numeric: p.numeric(),
            pixels: p.pixels(),
            draws: p.renderer.info.render.calls,
            triangles: p.renderer.info.render.triangles,
          };
        }, tick);
        assert.equal(state.draws, Number(count));
        let numeric = {},
          maxPixel = 0,
          changed = 0,
          absolute = 0,
          quaternionSignFlips = 0,
          rawPoseMax = 0;
        if (reference) {
          const prior = reference[states.length];
          for (const k of Object.keys(state.numeric)) {
            const a = state.numeric[k].slice(),
              b = prior.numeric[k];
            if (k === "pose") {
              rawPoseMax = Math.max(...a.map((x, i) => Math.abs(x - b[i])));
              for (let i = 0; i < a.length; i += 10) {
                let dot = 0;
                for (let j = 3; j < 7; j++) dot += a[i + j] * b[i + j];
                if (dot < 0) {
                  quaternionSignFlips++;
                  for (let j = 3; j < 7; j++) a[i + j] *= -1;
                }
              }
            }
            numeric[k] = compare(a, b);
          }
          for (let i = 0; i < state.pixels.length; i++) {
            const d = Math.abs(state.pixels[i] - prior.pixels[i]);
            maxPixel = Math.max(maxPixel, d);
            changed += Number(d > 0);
            absolute += d;
          }
          assert.equal(state.triangles, prior.triangles);
          // A/A must be exact. For differing f64 arithmetic, permit only sparse raster edge differences.
          if (variant === "original") assert.equal(maxPixel, 0);
          else
            assert(
              changed / state.pixels.length < 0.001 &&
                absolute / state.pixels.length < 0.02,
              `Pixel mismatch ${maxPixel}, changed ${changed}`,
            );
        }
        results.push({
          scenario,
          variant,
          view: v,
          tick,
          numeric,
          rawPoseMax,
          quaternionSignFlips,
          maxPixel,
          changedChannels: changed,
          meanAbsolutePixel: absolute / state.pixels.length,
          draws: state.draws,
          triangles: state.triangles,
          gpu,
        });
        states.push(state);
        if ([1, 150, 240, 450, 540].includes(tick))
          await page
            .locator("canvas")
            .screenshot({
              path: `${out}/${scenario}-${variant}-${v}-${tick}.png`,
            });
      }
      if (!reference) reference = states;
      assert.deepEqual(errors, []);
      if (variant === "owned-wasm") {
        const diag = await page.evaluate(() =>
          window.__fox.domain.diagnostics(),
        );
        assert(diag.wasmCalls > 0);
      }
      await page.close();
      console.log(scenario, variant, "passed");
    }
  }
  writeFileSync(
    `${out}/results.json`,
    JSON.stringify(
      {
        status: "complete",
        browser: browser.version(),
        method:
          "11 input checkpoints; pose rotations compared modulo quaternion sign, raw sign differences retained; all world/palette/action/root elements; poisoned upstream recomputation; exact A/A; alternate paths <0.1% changed channels and <0.02 mean absolute 8-bit channel error",
        results,
      },
      null,
      2,
    ) + "\n",
  );
} catch (e) {
  writeFileSync(
    `${out}/failure.json`,
    JSON.stringify({ error: String(e), results }, null, 2),
  );
  throw e;
} finally {
  await browser.close();
  server.close();
}
