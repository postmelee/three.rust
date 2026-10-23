#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v node
command -v npm
command -v cargo
command -v rustup
node --version
npm --version
cargo --version
rustup target add wasm32-unknown-unknown --toolchain 1.90.0
npm ci
cargo fetch --locked
npm run fixtures
npm run build
printf '%s\n' 'Build ready. CHROMIUM=/path/to/chromium npm run test:browser'
