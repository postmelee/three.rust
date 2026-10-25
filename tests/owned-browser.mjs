import { browserPath } from '../scripts/browser-path.mjs';
import { chromium } from "playwright";
import { serve, serverOrigin } from "../scripts/server.mjs";
import { configuration, hardwareRenderer } from "../bench/config.mjs";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const out = process.env.RTHREE_OWNED_RESULTS_DIR || "work/owned-validation";
mkdirSync(out, { recursive: true });
const hardware = process.env.RTHREE_BROWSER_MODE === "hardware",
  cfg = configuration(
    hardware
      ? [
          "mode=hardware",
          `headless=${process.env.RTHREE_HEADLESS || "true"}`,
          ...(process.env.RTHREE_ANGLE_BACKEND
            ? [`angle=${process.env.RTHREE_ANGLE_BACKEND}`]
            : []),
        ]
      : [],
  );
const server = await serve();
let browser, reference;
const results = [];
try {
  browser = await chromium.launch({
    executablePath: browserPath(),
    headless: cfg.headless,
    args: cfg.args,
  });
  for (const scenario of [
    { name: "animated", count: 2, bones: 8, steps: 40 },
    { name: "static", count: 1, bones: 24, steps: 1 },
  ]) {
    reference = undefined;
    let alternate;
    for (const [i, variant] of [
      "original",
      "original",
      "js",
      "wasm",
      "packed-js",
      "owned-js",
      "owned-wasm",
    ].entries()) {
      const page = await browser.newPage({
          viewport: { width: 640, height: 540 },
        }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const engine = ["js", "wasm", "packed-js"].includes(variant)
        ? variant
        : "original";
      await page.goto(
        `${serverOrigin}/fixtures/owned/index.html?manual&count=${scenario.count}&bones=${scenario.bones}&variant=${variant}&engine=${engine}${scenario.name === "static" ? "&static" : ""}`,
      );
      await page.waitForFunction(() => !!window.__owned);
      const result = await page.evaluate(() => {
        const p = window.__owned;
        for (let j = 0; j < 37; j++) p.frame();
        if (p.domain) p.poison();
        for (let j = 0; j < 3; j++) p.frame();
        p.draw();
        return {
          palette: p.palette(),
          pixels: p.pixels(),
          draws: p.renderer.info.render.calls,
          gpu: p.gpu,
          diagnostics: p.domain?.diagnostics(),
          adapter: p.adapter?.diagnostics(),
        };
      });
      if (hardware) hardwareRenderer(result.gpu.renderer);
      assert.deepEqual(errors, []);
      assert.equal(result.draws, scenario.count);
      let maxPalette = 0,
        maxPixel = 0;
      if (reference) {
        for (let j = 0; j < result.palette.length; j++)
          maxPalette = Math.max(
            maxPalette,
            Math.abs(result.palette[j] - reference.palette[j]),
          );
        for (let j = 0; j < result.pixels.length; j++)
          maxPixel = Math.max(
            maxPixel,
            Math.abs(result.pixels[j] - reference.pixels[j]),
          );
        assert(maxPalette < 2e-6);
        assert.equal(maxPixel, 0);
      } else reference = result;
      let foreground = 0;
      for (let p = 0; p < result.pixels.length; p += 4)
        if (
          result.pixels[p] !== result.pixels[0] ||
          result.pixels[p + 1] !== result.pixels[1] ||
          result.pixels[p + 2] !== result.pixels[2]
        )
          foreground++;
      assert(foreground > 100, "visible foreground required");
      if (result.adapter) {
        assert.equal(result.adapter.ordinaryBones, 0);
        assert.equal(result.diagnostics.steps, scenario.steps);
        assert.equal(
          result.diagnostics.paletteBytes,
          scenario.steps * scenario.count * scenario.bones * 16 * 4,
        );
        if (variant === "owned-wasm")
          assert(result.diagnostics.wasmCalls >= scenario.steps);
        const checks = await page.evaluate(() => {
          const p = window.__owned;
          let reads = 0,
            rejected = 0;
          p.adapter.onBeforeRender(() => {
            p.domain.snapshot();
            reads++;
            try {
              p.domain.step(0.1);
            } catch {
              rejected++;
            }
            try {
              p.domain.commands([]);
            } catch {
              rejected++;
            }
            try {
              p.draw();
            } catch {
              rejected++;
            }
            try {
              p.domain.dispose();
            } catch {
              rejected++;
            }
          });
          const prior = p.domain.diagnostics().paletteBytes;
          p.draw();
          p.draw();
          const after = p.domain.diagnostics().paletteBytes;
          p.adapter.onBeforeRender(() => {
            throw Error("callback sentinel");
          });
          let caught = false;
          try {
            p.draw();
          } catch (e) {
            caught = e.message === "callback sentinel";
          }
          p.adapter.onBeforeRender(() => {});
          p.domain.step(0);
          p.draw();
          return { reads, rejected, prior, after, caught };
        });
        assert.equal(checks.reads, scenario.count * 2);
        assert.equal(checks.rejected, scenario.count * 8);
        assert.equal(checks.prior, checks.after);
        assert(checks.caught);
      }
      const view = await page.evaluate(() => {
        const p = window.__owned;
        p.translateRoot(0.13);
        const camera = p.camera.clone();
        camera.position.x += 0.2;
        p.draw(camera);
        return { pixels: p.pixels(), palette: p.palette() };
      });
      let maxViewPixel = 0;
      if (alternate) {
        for (let j = 0; j < view.pixels.length; j++)
          maxViewPixel = Math.max(
            maxViewPixel,
            Math.abs(view.pixels[j] - alternate.pixels[j]),
          );
        assert.equal(maxViewPixel, 0);
        for (let j = 0; j < view.palette.length; j++)
          assert(Math.abs(view.palette[j] - alternate.palette[j]) < 2e-6);
      } else alternate = view;
      await page.evaluate(() => window.__owned.draw());
      await page
        .locator("canvas")
        .screenshot({ path: `${out}/${scenario.name}-${variant}-${i}.png` });
      results.push({
        variant,
        scenario: scenario.name,
        maxViewPixel,
        maxPalette,
        maxPixel,
        draws: result.draws,
        gpu: result.gpu,
        diagnostics: result.diagnostics,
        adapter: result.adapter,
      });
      await page.close();
      console.log("owned browser", variant, "passed");
    }
  }
  writeFileSync(
    `${out}/results.json`,
    JSON.stringify(
      {
        method:
          "Animated and static controls, 40 fixed frames, root writes and second camera; original A/A and original facade/bridge/packed/owned JS/owned Wasm; exact pixels; throwing JS bypass guards; callback mutation/reentrancy guards",
        results,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  if (browser) await browser.close();
  server.close();
}
