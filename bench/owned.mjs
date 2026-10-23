import { browserPath } from '../scripts/browser-path.mjs';
import { chromium } from "playwright";
import { serve } from "../scripts/server.mjs";
import { configuration, hardwareRenderer } from "./config.mjs";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import os from "node:os";
const opt = {};
for (const arg of process.argv.slice(2)) {
  const i = arg.indexOf("=");
  if (i < 1) throw Error("Expected key=value");
  const k = arg.slice(0, i);
  if (
    k in opt ||
    ![
      "out",
      "cases",
      "variants",
      "repeats",
      "warmup",
      "samples",
      "stage",
      "mode",
      "headless",
      "angle",
    ].includes(k)
  )
    throw Error(`Invalid option ${k}`);
  opt[k] = arg.slice(i + 1);
}
const cfg = configuration([
  `repeats=${opt.repeats || 5}`,
  `warmup=${opt.warmup || 60}`,
  `samples=${opt.samples || 120}`,
  "engines=original",
  ...["mode", "headless", "angle"]
    .filter((k) => k in opt)
    .map((k) => `${k}=${opt[k]}`),
]);
cfg.viewport = { width: 640, height: 540 };
const variants = (
    opt.variants || "original,js,wasm,packed-js,owned-js,owned-wasm"
  ).split(","),
  cases = (opt.cases || "animated-1,animated-64,static-1").split(","),
  stage = opt.stage || "render";
if (
  !["render", "cpu", "diagnostic"].includes(stage) ||
  new Set(variants).size !== variants.length ||
  variants.some(
    (v) =>
      ![
        "original",
        "js",
        "wasm",
        "packed-js",
        "owned-js",
        "owned-wasm",
      ].includes(v),
  ) ||
  new Set(cases).size !== cases.length ||
  cases.some((c) => !/^(animated|static)-(1|16|64)$/.test(c))
)
  throw Error("Invalid comparison");
const out = opt.out || "work/owned-main";
if (existsSync(out)) throw Error("Choose a fresh output directory");
mkdirSync(out, { recursive: true });
const paths = [
  "fixtures/owned/index.html",
  "fixtures/owned/descriptor.mjs",
  "fixtures/pipeline/rig.mjs",
  "fixtures/pipeline/source-audit.json",
  "bench/owned.mjs",
  "package-lock.json",
  "packages/rthree/core.js",
  "packages/rthree/runtime.js",
  "packages/rthree/owned.js",
  "packages/rthree/owned-layout.js",
  "packages/rthree/owned-js.js",
  "packages/rthree/owned-wasm.js",
  "packages/rthree/owned-renderer.js",
  "packages/rthree/owned-state.js",
  "crates/scene-core/src/owned.rs",
  "packages/rthree/scene_core.wasm",
];
const read = (p) => {
  try {
    return readFileSync(p, "utf8").trim();
  } catch {
    return null;
  }
};
const manifest = {
  classification:
    stage === "render"
      ? cfg.repeats < 5 || cfg.warmup < 60 || cfg.samples < 120
        ? "Smoke/short diagnostic only; not a performance conclusion"
        : "Repeated complete render-path CPU experiment; explicit ownership API, not import-only or hardware speedup"
      : "Separate owned CPU/boundary diagnostic, not main-path timing",
  status: "running",
  startedAt: new Date().toISOString(),
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
  dirty: !!execFileSync("git", ["status", "--porcelain"]).length,
  fileHashes: Object.fromEntries(
    paths.map((p) => [
      p,
      createHash("sha256").update(readFileSync(p)).digest("hex"),
    ]),
  ),
  options: {
    repeats: cfg.repeats,
    warmup: cfg.warmup,
    samples: cfg.samples,
    hardware: cfg.hardware,
    headless: cfg.headless,
    args: cfg.args,
    viewport: cfg.viewport,
    variants,
    cases,
    stage,
  },
  renderTarget: { width: 640, height: 480, devicePixelRatio: 1 },
  host: {
    platform: os.platform(),
    release: os.release(),
    cpus: os.cpus().map((c) => c.model),
    memory: os.totalmem(),
    cpuQuota: read("/sys/fs/cgroup/cpu.max"),
    memoryLimit: read("/sys/fs/cgroup/memory.max"),
    gpuDeviceDirectory: existsSync("/dev/dri"),
    node: process.version,
  },
  runs: [],
};
const save = () =>
  writeFileSync(
    `${out}/manifest.json`,
    JSON.stringify(manifest, null, 2) + "\n",
  );
save();
const server = await serve();
let browser;
try {
  browser = await chromium.launch({
    executablePath: browserPath(),
    headless: cfg.headless,
    args: cfg.args,
  });
  manifest.browser = browser.version();
  manifest.executablePath = browserPath();
  for (let repeat = 0; repeat < cfg.repeats; repeat++) {
    const order = [
      ...variants.slice(repeat % variants.length),
      ...variants.slice(0, repeat % variants.length),
    ];
    for (const scenario of repeat % 2 ? [...cases].reverse() : cases)
      for (const variant of order) {
        const count = Number(scenario.split("-")[1]),
          page = await browser.newPage({
            viewport: cfg.viewport,
            deviceScaleFactor: 1,
          }),
          errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        const engine = ["js", "wasm", "packed-js"].includes(variant)
          ? variant
          : "original";
        const start = performance.now();
        await page.goto(
          `http://127.0.0.1:4173/fixtures/owned/index.html?manual&count=${count}&bones=24&variant=${variant}&engine=${engine}${scenario.startsWith("static") ? "&static" : ""}`,
        );
        await page.waitForFunction(() => !!window.__owned);
        await page.bringToFront();
        const startupMs = performance.now() - start,
          gpu = await page.evaluate(() => window.__owned.gpu);
        if (cfg.hardware) hardwareRenderer(gpu.renderer);
        const data = await page.evaluate((c) => window.__owned.measure(c), {
          mode: stage,
          warmup: cfg.warmup,
          samples: cfg.samples,
        });
        if (
          errors.length ||
          data.raw.length !== cfg.samples ||
          data.raw.some((x) => !Number.isFinite(x.cpu) || x.cpu < 0)
        )
          throw Error("Incomplete/error run: " + errors.join("\n"));
        if (stage === "render" && data.draws !== count)
          throw Error("Draw count mismatch");
        if (variant === "owned-wasm" && !data.diagnostics.wasmCalls)
          throw Error("Wasm did not execute");
        const name = `${stage}-${scenario}-${variant}-${repeat}.json`;
        writeFileSync(
          `${out}/${name}`,
          JSON.stringify(
            { repeat, scenario, variant, count, startupMs, ...data },
            null,
            2,
          ) + "\n",
        );
        manifest.runs.push(name);
        save();
        await page.close();
        console.log(name);
      }
  }
  manifest.status = "complete";
} catch (error) {
  manifest.status = "failed";
  manifest.error = String(error);
  throw error;
} finally {
  manifest.finishedAt = new Date().toISOString();
  save();
  if (browser) await browser.close();
  server.close();
}
