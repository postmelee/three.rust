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
rustup target add wasm32-unknown-unknown

if [[ -f package-lock.json ]]; then
  npm ci
  if [[ -x node_modules/.bin/playwright ]]; then
    node_modules/.bin/playwright install --with-deps chromium
  fi
fi
if [[ -f Cargo.lock ]]; then
  cargo fetch --locked
fi
printf '%s\n' 'three.rust toolchain setup complete; use repository build/test commands after M1 manifests are added.'
