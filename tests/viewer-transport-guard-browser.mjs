import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { createViewerDenyProxy, installViewerRemoteGuard } from '../scripts/apps/viewer-transport-guard.mjs';

const out = path.resolve(process.argv[2]); await fs.mkdir(out, { recursive: false });
const bytes = Buffer.from('Pinned transport guard test payload\n'.repeat(1000));
const expectedHash = crypto.createHash('sha256').update(bytes).digest('hex');
const local = http.createServer((request, response) => { response.writeHead(200, { 'content-type': request.url === '/' ? 'text/html' : 'application/octet-stream', 'cache-control': 'no-store' }); response.end(request.url === '/' ? '<!doctype html><title>Guard test</title>' : bytes); });
let unexpectedConnections = 0;
const other = http.createServer((request, response) => { unexpectedConnections++; response.end('Must never be reached'); });
const listen = server => new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
await listen(local); await listen(other);
const origin = 'http://127.0.0.1:' + local.address().port, otherOrigin = 'http://127.0.0.1:' + other.address().port;
const results = [];
try {
 for (const mode of ['proxy-playwright', 'proxy-cdp-remote']) {
  const proxy = await createViewerDenyProxy(origin); let browser, guard;
  const run = { errors: [], redact: x => x, requests: [], async mirrorNetwork(route) {
   const url = route.request().url(); this.requests.push(url);
   if (url.startsWith(origin + '/')) return route.continue();
   if (url === 'https://allowed.invalid/payload') return route.fulfill({ body: bytes, contentType: 'application/octet-stream', headers: { 'access-control-allow-origin': '*' } });
   return route.abort();
  } };
  try {
   browser = await chromium.launch({ executablePath: process.env.RTHREE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: false, args: proxy.args });
   const context = await browser.newContext({ serviceWorkers: 'block' });
   if (mode === 'proxy-playwright') await context.route('**/*', route => run.mirrorNetwork(route));
   const page = await context.newPage();
   if (mode === 'proxy-cdp-remote') guard = await installViewerRemoteGuard(context, page, run);
   await page.goto(origin);
   const trials = await page.evaluate(async ({ origin, otherOrigin }) => {
    const rows = [];
    for (const url of [origin + '/payload', 'https://allowed.invalid/payload', 'https://blocked.invalid/payload', 'http://blocked.invalid/payload', otherOrigin + '/payload']) {
     try { const response = await fetch(url); const body = await response.arrayBuffer(); const digest = await crypto.subtle.digest('SHA-256', body); rows.push({ url, status: response.status, bytes: body.byteLength, sha256: [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('') }); }
     catch (error) { rows.push({ url, failed: true, error: error.message }); }
    }
    return rows;
   }, { origin, otherOrigin });
   for (const trial of trials.slice(0, 2)) { assert.equal(trial.status, 200); assert.equal(trial.bytes, bytes.length); assert.equal(trial.sha256, expectedHash); }
   assert(trials.slice(2).every(trial => trial.failed)); assert.equal(unexpectedConnections, 0); assert.deepEqual(run.errors, []);
   if (guard) { assert(guard.events.every(row => row.url.startsWith('https://'))); assert(!run.requests.some(url => url.startsWith(origin))); assert(proxy.blocked.some(row => row.url.startsWith(otherOrigin))); }
   results.push({ mode, passed: true, browser: browser.version(), proxyArgs: proxy.args, expectedHash, trials, guardEvents: guard?.events ?? [], proxyBlocked: proxy.blocked, unexpectedConnections });
  } finally { await guard?.close(); await browser?.close(); await proxy.close(); }
 }
} finally {
 local.closeAllConnections(); other.closeAllConnections(); await Promise.all([new Promise(resolve => local.close(resolve)), new Promise(resolve => other.close(resolve))]);
 await fs.writeFile(path.join(out, 'result.json'), JSON.stringify({ kind: 'Transport guard verification; no application performance evidence', results }, null, 2) + '\n');
}
console.log(JSON.stringify({ passed: results.length, unexpectedConnections }));
