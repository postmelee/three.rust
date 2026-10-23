import { chromium } from "playwright";
import { browserPath } from "./browser-path.mjs";
import { hardwareRenderer } from "../bench/config.mjs";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
const out = process.argv[2];
if (!out || existsSync(out)) throw Error("Choose a fresh output directory");
mkdirSync(out, { recursive: true });
execFileSync(process.execPath, ["scripts/runner-environment.mjs", out]);
let browser;
const result = {
  startedAt: new Date().toISOString(),
  path: browserPath(),
  headless: false,
};
try {
  browser = await chromium.launch({
    executablePath: browserPath(),
    headless: false,
  });
  result.browser = browser.version();
  const page = await browser.newPage();
  await page.bringToFront();
  result.webgl = await page.evaluate(async () => {
    const c = document.createElement("canvas"),
      g = c.getContext("webgl2");
    if (!g) throw Error("WebGL2 unavailable");
    const e = g.getExtension("WEBGL_debug_renderer_info"),
      samples = [];
    for (let i = 0; i < 61; i++)
      samples.push(await new Promise(requestAnimationFrame));
    let resolution = Infinity,
      previous = performance.now();
    for (let i = 0; i < 100000; i++) {
      const now = performance.now();
      if (now > previous) resolution = Math.min(resolution, now - previous);
      previous = now;
    }
    return {
      renderer: e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : null,
      vendor: e ? g.getParameter(e.UNMASKED_VENDOR_WEBGL) : null,
      version: g.getParameter(g.VERSION),
      visibility: document.visibilityState,
      screen: {
        width: screen.width,
        height: screen.height,
        dpr: devicePixelRatio,
      },
      rafIntervals: samples.slice(1).map((x, i) => x - samples[i]),
      timerResolutionMs: Number.isFinite(resolution) ? resolution : null,
      gpuTimerQuery: !!g.getExtension("EXT_disjoint_timer_query_webgl2"),
    };
  });
  hardwareRenderer(result.webgl.renderer);
  const cdp = await browser.newBrowserCDPSession();
  result.systemGpu = (await cdp.send("SystemInfo.getInfo")).gpu;
  result.status = "hardware-confirmed";
  console.log(result.webgl.renderer);
} catch (e) {
  result.status = "failed";
  result.error = String(e);
  throw e;
} finally {
  result.finishedAt = new Date().toISOString();
  writeFileSync(`${out}/browser.json`, JSON.stringify(result, null, 2) + "\n");
  if (browser) await browser.close();
}
