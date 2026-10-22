# Clean install and cloud setup

Start from this branch in a new checkout; do not reuse generated package files.
Dependencies: Linux/macOS/Windows with Node 22+ (observed 24.19.0), npm, curl,
Rust/rustup 1.90.0 including wasm32-unknown-unknown, and Chromium. This work used
Linux Chromium 154.0.8037.57; CI downloads the browser matching Playwright
1.56.1. A different browser is a new environment, not the same performance run.

```sh
git clone https://github.com/postmelee/three.rust.git
cd three.rust
git checkout codex/ownership-roadmap
rustup toolchain install 1.90.0 --profile minimal --component rustfmt,clippy
rustup target add wasm32-unknown-unknown --toolchain 1.90.0
npm ci
npm run fixtures
npm run build
npm test
```

`npm run fixtures` downloads only the pinned Soldier asset (SHA-256 checked)
and regenerates deterministic example adaptations. It requires GitHub raw
access. Asset remains under ignored work/ and is not in the npm tarball. npm ci
requires registry.npmjs.org. Rust components require static.rust-lang.org.
The Rust crate has **no external crate dependencies**. Network failures are
reported, not silently replaced with old project files.

Browser choice:

```sh
npx playwright install --with-deps chromium
export CHROMIUM="$(node --input-type=module -e 'import {chromium} from "playwright"; console.log(chromium.executablePath())')"
npm run test:browser
npm run test:package
npm run bench:smoke
```

Alternatively `CHROMIUM=/usr/bin/chromium` uses an installed system browser.
Smoke is 5 warm-up + 10 sampled frames and **not** a performance conclusion.
`npm run bench:full` performs the longer predeclared cloud experiment, not
foreground hardware validation. The scripts use headless SwiftShader explicitly
for reproducible cloud correctness. New measurements go to ignored work/ paths;
explicitly choose another output directory when repeating a convenience script. Do not interpret them as GPU acceleration.

For this managed cloud instance only, provisioned tools are available through
`source /workspace/.cloud-setup/env.sh`. This is an environment-specific optional
convenience, not a dependency of the repository. Proxy, trust, access and
credentials must come from the environment, never committed into scripts.
The default execution sandbox blocked rustup process signaling and networking;
network-enabled execution succeeded. No proxy bypass was used.

Local package (no registry publication):

```sh
npm pack --workspace=rthree --pack-destination=work
# In a separate application's directory:
npm install /absolute/path/to/three.rust/work/rthree-0.1.0-alpha.0.tgz
```

An actual fresh /tmp consumer test performs this installation, tests failed
initialization/retry, checks root/addon identity, type checks with NodeNext and
bundles with esbuild. It proves no runtime `three` dependency is required for
the tested addon paths. Native ESM imports need an import map in plain browsers;
package exports alone are interpreted by Node/bundlers, not browser URL loaders.

Run the local demo with `npm run dev`, open http://127.0.0.1:4173. In a cloud
session forward port 4173 using the environment's port-forwarding UI. No public
hosting deployment is implied. Choose A/B/C/D and a scene; Pause stops the loop.
For manual hardware frame timings use the benchmark command below instead of
the live demo counter.

## Real desktop GPU follow-up

First record GPU model/driver, OS, CPU, browser version, display refresh rate,
power mode, viewport/DPR and whether Chrome reports hardware acceleration.
Close background CPU/GPU work and use a stable power/thermal state. On Linux
check `lspci -nnk`, `/dev/dri`, `glxinfo -B` and chrome://gpu; on Windows/macOS
record the platform GPU driver/system report and chrome://gpu. These commands
were not run on a real hardware GPU during this cloud task.

```sh
CHROMIUM=/path/to/chrome node bench/run.mjs mode=hardware \
  engines=original,js,wasm,packed-js repeats=7 warmup=600 samples=1800 \
  out=work/my-desktop-001
node bench/analyze.mjs work/my-desktop-001
```

Choose a fresh output directory for each run; existing manifests cannot be overwritten.
For the Actions protocol and artifact delivery, see [CI.md](CI.md).

Hardware mode defaults to 1920×1080 DPR1 (override with width=640 height=360
for the exact cloud viewport); cloud mode remains 640×360. Hardware mode runs headed, does not force SwiftShader and rejects a detected
SwiftShader/llvmpipe/software renderer. The fixed 600/1800 frame workload is
approximately 10/30 seconds at 60Hz, longer when slower; report actual intervals
and duration. It keeps equal simulation tick ranges/work per engine. Do not
claim a literal time-budget protocol at a different refresh rate. For literal
10s/30s sampling, first calibrate fixed frame counts at the test device and
record the resulting method rather than changing work silently between engines.

A separate attribution run can enable `timings=true gpu=true` with a new output
directory. This enables bridge stage timing and asynchronous GPU queries;
never pool those samples into the uninstrumented product table. Queries use
EXT_disjoint_timer_query_webgl2, poll later, record disjoint/pending/unavailable,
and never call gl.finish. Software-renderer GPU query durations remain software
work on the shared host CPU, not physical GPU execution.

Cold-cache startup, browser profile isolation, memory/GC and long thermal runs
need a dedicated hardware protocol. Current startup numbers are page navigation
to ready with cache-control no-store; the process/code caches are not fully cold.
Current heap values are browser estimates; Wasm memory is its linear-buffer size,
not total Rust live allocations. Do not sum these as a process memory total.

## Clean-checkout evidence

The GitHub Actions job at
https://github.com/postmelee/three.rust/actions/runs/39760603177 passed the full
install/build/native/differential/type/browser/package/smoke sequence on a clean
Ubuntu 24.04 runner for commit 26af42f. This is independent of the pre-provisioned
local cloud dependency cache. Evidence is in bench/results/validation/ci.json.
The first ubuntu-latest run failed before tests because it selected Ubuntu 26.04,
which Playwright 1.56.1 does not support; the supported runner is now pinned.
