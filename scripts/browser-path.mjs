import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
// Explicit override is authoritative: an invalid override must not silently fall back.
export function browserPath(env = process.env, platform = process.platform) {
  if (env.CHROMIUM) return env.CHROMIUM;
  const candidates = platform === 'darwin'
    ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium']
    : platform === 'win32' ? [] : ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'];
  return candidates.find(existsSync) || chromium.executablePath();
}
