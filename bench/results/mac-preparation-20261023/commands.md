# Executed commands and deferred experiments

Run from the repository root, in a separate codex/ checkout. Logs are in checks/. Existing result directories were not reused. Shell redirection is omitted here for readability; original stdout/stderr was preserved in the corresponding checks/*.txt file.

## Executed on research source 9527a042ed1134e73ab9cfe8b3ee75f4aac6d2a7

```sh
npm ci
npm run fixtures
npm run build
npm test
node scripts/fetch-fox.mjs
node scripts/mac-preflight.mjs work/mac-preparation-001/preflight
RTHREE_BROWSER_MODE=hardware RTHREE_OWNED_RESULTS_DIR=work/mac-preparation-001/synthetic-correctness npm run test:owned
# This synthetic check's default RTHREE_HEADLESS=true is explicit in the report.
RTHREE_BROWSER_MODE=hardware RTHREE_FOX_REJECTION_DIR=work/mac-preparation-001/fox-rejections node tests/fox-rejections.mjs
RTHREE_BROWSER_MODE=hardware RTHREE_FOX_REJECTION_DIR=work/mac-preparation-002/fox-rejections node tests/fox-rejections.mjs
```

The last two commands failed because 4173 was occupied. They produced error logs, not accepted results. No other service was stopped. The initial local copy lacked the research commit; fetching the exact SHA preceded managed-worktree creation. Original primary checkout files were preserved.

## Executed with the separate configurable-port adaptation

The final content of these scripts matches 1ed9cb37de1ea5e3c31b3b6732cbedfc67a936bf. Fox correctness/rejection ran while assembling that tooling commit; the short smoke itself ran on the clean committed SHA recorded in its manifest.

```sh
node --test tests/server-port.mjs
RTHREE_PORT=4383 RTHREE_BROWSER_MODE=hardware RTHREE_FOX_REJECTION_DIR=work/mac-preparation-003/fox-rejections node tests/fox-rejections.mjs
RTHREE_PORT=4383 RTHREE_BROWSER_MODE=hardware RTHREE_FOX_RESULTS_DIR=work/mac-preparation-003/fox-correctness node tests/fox-browser.mjs
npm run test:infra
npm run test:gpu-guard
RTHREE_PORT=4383 node bench/fox.mjs mode=hardware headless=false timing=isolated repeats=1 warmup=10 samples=30 out=work/mac-fox-smoke-001
RTHREE_PORT=4383 RTHREE_BROWSER_MODE=hardware RTHREE_HEADLESS=false RTHREE_RESULTS_DIR=work/mac-preparation-003/facade-correctness npm run test:browser
npm run test:timing
npm run docs:check
git diff --check
```

Smoke recorded 9 runs and 270 raw frames, no invalid flags. Its 10/30 sample settings are only a tooling check. test:gpu-guard and test:timing intentionally use SwiftShader and remain software correctness evidence. Other browser commands ran sequentially after listener isolation. No full performance session ran concurrently with builds, tests or profiling because no full session was started.

Sources were cloned with `git clone --filter=blob:none --no-checkout`, narrow sparse checkouts and `git checkout --detach <full SHA>` for glTF Viewer, Editor and Online3DViewer. Their exact source and selected-file hashes are in apps/provenance.json. The fixed RobotExpressive GLB and its license note were fetched with curl from the exact pinned raw GitHub URLs; structure was parsed from the GLB JSON chunk. No model binary is committed. No external app dependency install/build or profile was run.

## Deferred: not executed

```sh
# Requires a quiet AC-powered foreground session with stable browser/display:
# Fresh checkout of the exact candidate; complete setup/checks first.
RTHREE_PORT=4383 RTHREE_TIMING_MODE=isolated caffeinate -di \
  bash scripts/mac-validation.sh work/mac-precision-001
```

Ordinary-policy full session, second-day repeat, second-device/browser/mobile checks, complete app builds/UI smoke/input capture, app CPU profiles, GPU queries and cold-cache/startup/memory/thermal experiments are unperformed. For a later cloud engine, use its actual full SHA and a new candidate-specific result directory. The original five-phase timing protocol/noise rule has not been replaced by this archive.
