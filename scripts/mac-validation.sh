#!/usr/bin/env bash
set -euo pipefail
# Run from repository root. Each invocation must have a new output directory.
out=${1:?Usage: bash scripts/mac-validation.sh work/mac-session-NEW}
if [[ -e "$out" ]]; then echo "Choose a fresh output directory" >&2; exit 1; fi
mkdir -p "$out/checks"
node scripts/fetch-fox.mjs
node scripts/mac-preflight.mjs "$out/preflight"
RTHREE_BROWSER_MODE=hardware RTHREE_HEADLESS=false RTHREE_OWNED_RESULTS_DIR="$out/synthetic-correctness" npm run test:owned > "$out/checks/synthetic.txt" 2>&1
npm run test:gpu-guard > "$out/checks/gpu-guard.txt" 2>&1
node bench/owned.mjs mode=hardware headless=false variants=original,owned-js,owned-wasm repeats=6 warmup=120 samples=600 out="$out/synthetic"
node bench/owned-report.mjs "$out/synthetic"
RTHREE_BROWSER_MODE=hardware RTHREE_FOX_REJECTION_DIR="$out/fox-rejections" node tests/fox-rejections.mjs > "$out/checks/fox-rejections.txt" 2>&1
RTHREE_BROWSER_MODE=hardware RTHREE_FOX_RESULTS_DIR="$out/fox-correctness" node tests/fox-browser.mjs > "$out/checks/fox.txt" 2>&1
# 1200/3600 targets ~10/30 seconds at the observed 120 Hz; record actual duration.
for phase in aa-before main aa-after; do
  if [[ "$phase" == main ]]; then variants=original,owned-js,owned-wasm; repeats=6; else variants=original; repeats=5; fi
  node bench/fox.mjs mode=hardware headless=false variants="$variants" repeats="$repeats" warmup=1200 samples=3600 out="$out/$phase"
  node bench/fox-report.mjs "$out/$phase"
done
node bench/fox.mjs mode=hardware headless=false stage=diagnostic repeats=5 warmup=60 samples=120 out="$out/diagnostic"
node bench/fox-report.mjs "$out/diagnostic"
node bench/fox-compare.mjs "$out"
# Existing M2 facade controls are separate from the explicit-owned Fox comparison.
node bench/run.mjs mode=hardware headless=false scenarios=shader,small engines=original,js,wasm,packed-js repeats=4 warmup=120 samples=600 width=640 height=360 out="$out/controls"
node bench/analyze.mjs "$out/controls"
node bench/run.mjs mode=hardware headless=false scenarios=shader engines=original,js,wasm,packed-js repeats=4 warmup=120 samples=600 width=3840 height=2160 out="$out/shader-4k"
node bench/analyze.mjs "$out/shader-4k"
node bench/run.mjs mode=hardware headless=false scenarios=shader engines=original repeats=3 warmup=120 samples=300 width=3840 height=2160 gpu=true out="$out/gpu-4k"
node bench/gpu-summary.mjs "$out/gpu-4k"
