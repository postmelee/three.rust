import { chromium } from "playwright";
import { serve } from "../scripts/server.mjs";
import { browserPath } from "../scripts/browser-path.mjs";
import { configuration, hardwareRenderer } from "./config.mjs";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const opt = {};
for (const a of process.argv.slice(2)) {
  const i = a.indexOf("=");
  if (i < 1) throw Error("Expected key=value");
  const k = a.slice(0, i);
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
    ].includes(k)
  )
    throw Error(`Invalid option ${k}`);
  opt[k] = a.slice(i + 1);
}
const cfg = configuration([
  `mode=${opt.mode || "hardware"}`,
  `headless=${opt.headless || "false"}`,
  `repeats=${opt.repeats || 6}`,
  `warmup=${opt.warmup || 600}`,
  `samples=${opt.samples || 1800}`,
]);
// The actual page viewport, independent of the legacy M0 defaults.
cfg.viewport = { width: 640, height: 540 };
const variants = (opt.variants || "original,owned-js,owned-wasm").split(","),
  cases = (opt.cases || "animated-1,animated-16,static-1").split(","),
  stage = opt.stage || "render",
  out = opt.out;
if (
  !out ||
  existsSync(out) ||
  new Set(variants).size !== variants.length ||
  variants.some((v) => !["original", "owned-js", "owned-wasm"].includes(v)) ||
  new Set(cases).size !== cases.length ||
  cases.some((c) => !["animated-1", "animated-16", "static-1"].includes(c)) ||
  !["render", "diagnostic"].includes(stage)
)
  throw Error("Invalid experiment or existing output");
mkdirSync(out, { recursive: true });
execFileSync(process.execPath, [
  "scripts/runner-environment.mjs",
  `${out}/environment-before`,
]);
const paths = [
  "fixtures/fox/index.html",
  "fixtures/fox/replay.mjs",
  "fixtures/fox/descriptor.mjs",
  "fixtures/fox/provenance.json",
  "fixtures/fox/LICENSE.md",
  "work/assets/Fox.glb",
  "bench/fox.mjs",
  "bench/config.mjs",
  "scripts/browser-path.mjs",
  "scripts/server.mjs",
  "package-lock.json",
  "rust-toolchain.toml",
  "node_modules/three/build/three.module.js",
  "node_modules/three/build/three.core.js",
  "node_modules/three/examples/jsm/loaders/GLTFLoader.js",
  "node_modules/three/examples/jsm/utils/SkeletonUtils.js",
  "crates/scene-core/src/owned.rs",
  ...[
    "owned",
    "owned-layout",
    "owned-js",
    "owned-wasm",
    "owned-renderer",
    "owned-state",
  ].map((n) => `packages/rthree/${n}.js`),
  "packages/rthree/scene_core.wasm",
];
const hash = (p) => createHash("sha256").update(readFileSync(p)).digest("hex"),
  manifest = {
    status: "running",
    classification:
      stage === "render"
        ? cfg.repeats < 5 || cfg.warmup < 1200 || cfg.samples < 3600
          ? "Smoke/short diagnostic only; not a performance conclusion"
          : `${cfg.hardware ? "Hardware" : "Software-renderer"} fixed-frame real-asset experiment; explicit API; no automatic product verdict`
        : "Separate instrumented copy/read diagnostic",
    startedAt: new Date().toISOString(),
    sourceCommit: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
    dirty: !!execFileSync("git", ["status", "--porcelain"]).length,
    hashes: Object.fromEntries(paths.map((p) => [p, hash(p)])),
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
    renderTarget: {
      width: 640,
      height: 480,
      dpr: 1,
      antialias: false,
      shadows: false,
      preserveDrawingBuffer: true,
    },
    runs: [],
    executablePath: browserPath(),
    backgroundWork:
      "Requester cannot guarantee absence of other heavy work; no process names collected. Retain all samples; qualify with A/A.",
    cache:
      "Fresh page/context per run; shared browser/code/OS caches; startup is not cold-cache.",
  };
const save = () =>
  writeFileSync(
    `${out}/manifest.json`,
    JSON.stringify(manifest, null, 2) + "\n",
  );
save();
const server = await serve();
let browser;
const permutations = [
  [0, 1, 2],
  [2, 1, 0],
  [1, 2, 0],
  [0, 2, 1],
  [2, 0, 1],
  [1, 0, 2],
];
try {
  browser = await chromium.launch({
    executablePath: browserPath(),
    headless: cfg.headless,
    args: cfg.args,
  });
  manifest.browser = browser.version();
  const cdp = await browser.newBrowserCDPSession();
  manifest.gpuSystem = (await cdp.send("SystemInfo.getInfo")).gpu;
  save();
  for (let repeat = 0; repeat < cfg.repeats; repeat++) {
    const order =
      variants.length === 3
        ? permutations[repeat % 6].map((i) => variants[i])
        : variants;
    for (const scenario of repeat % 2 ? [...cases].reverse() : cases)
      for (const variant of order) {
        manifest.activeRun = { repeat, scenario, variant };
        save();
        const page = await browser.newPage({
            viewport: cfg.viewport,
            deviceScaleFactor: 1,
          }),
          errors = [];
        page.on("pageerror", (e) => errors.push(String(e)));
        const start = performance.now(),
          [kind, count] = scenario.split("-");
        await page.goto(
          `http://127.0.0.1:4173/fixtures/fox/index.html?manual&count=${count}&variant=${variant}${kind === "static" ? "&static" : ""}`,
        );
        await page.waitForFunction(() => !!window.__fox);
        await page.bringToFront();
        const startupMs = performance.now() - start,
          gpu = await page.evaluate(() => window.__fox.gpu);
        if (cfg.hardware) hardwareRenderer(gpu.renderer);
        const data = await page.evaluate((c) => window.__fox.measure(c), {
          warmup: cfg.warmup,
          samples: cfg.samples,
          mode: stage,
        });
        const name = `${stage}-${scenario}-${variant}-${repeat}.json`;
        writeFileSync(
          `${out}/${name}`,
          JSON.stringify(
            { repeat, scenario, variant, order, startupMs, errors, ...data },
            null,
            2,
          ) + "\n",
        );
        manifest.runs.push(name);
        delete manifest.activeRun;
        save();
        if (
          errors.length ||
          data.invalid.length ||
          data.raw.length !== cfg.samples ||
          data.draws !== Number(count) ||
          (variant === "owned-wasm" && !data.diagnostics.wasmCalls)
        )
          throw Error(`Invalid run ${name}`);
        await page.close();
        console.log(name);
      }
  }
  for (const p of paths)
    if (hash(p) !== manifest.hashes[p])
      throw Error(`Measured input changed: ${p}`);
  manifest.status = "complete";
} catch (e) {
  manifest.status = "failed";
  manifest.error = String(e);
  throw e;
} finally {
  manifest.finishedAt = new Date().toISOString();
  save();
  if (browser) await browser.close();
  server.close();
  execFileSync(process.execPath, [
    "scripts/runner-environment.mjs",
    `${out}/environment-after`,
  ]);
}
