import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import http from 'node:http';
import { createViewerDenyProxy, installViewerRemoteGuard } from '../scripts/apps/viewer-transport-guard.mjs';
import { viewerContentOptions } from '../scripts/apps/viewer-content-check.mjs';

test('deny-only proxy rejects HTTP and CONNECT without forwarding', async () => {
 await assert.rejects(createViewerDenyProxy('https://example.test'), /loopback/);
 const proxy = await createViewerDenyProxy('http://127.0.0.1:33117');
 try {
  assert.equal(proxy.args[1], '--proxy-bypass-list=<-loopback>;http://127.0.0.1:33117');
  const url = new URL(proxy.args[0].slice('--proxy-server='.length));
  const status = await new Promise((resolve, reject) => {
   const req = http.request({ hostname: url.hostname, port: url.port, path: 'http://never-connect.invalid/file' }, r => { r.resume(); r.on('end', () => resolve(r.statusCode)); }); req.on('error', reject); req.end();
  });
  assert.equal(status, 403);
  const tunnelStatus = await new Promise((resolve, reject) => {
   const req = http.request({ hostname: url.hostname, port: url.port, path: 'never-connect.invalid:443', method: 'CONNECT' });
   req.on('connect', (r, socket) => { socket.destroy(); resolve(r.statusCode); }); req.on('error', reject); req.end();
  });
  assert.equal(tunnelStatus, 403); assert.equal(proxy.blocked.length, 2);
 } finally { await proxy.close(); }
});

test('CDP guard pauses only HTTPS, pins disabled cache and retains exact fulfilled bytes', async () => {
 const session = new EventEmitter(), calls = []; session.send = async (method, args) => { calls.push({ method, args }); }; session.detach = async () => {};
 const run = { errors: [], redact: x => x, mirrorNetwork: async route => {
  if (route.request().url() === 'https://allowed.invalid/asset') await route.fulfill({ body: Buffer.from([0, 1, 255]), contentType: 'application/octet-stream', headers: { 'access-control-allow-origin': '*' } }); else await route.abort();
 } };
 const guard = await installViewerRemoteGuard({ newCDPSession: async () => session }, {}, run);
 assert.deepEqual(calls.find(c => c.method === 'Fetch.enable').args, { patterns: [{ urlPattern: 'https://*', requestStage: 'Request' }] });
 assert.deepEqual(calls.find(c => c.method === 'Network.setCacheDisabled').args, { cacheDisabled: true });
 session.emit('Fetch.requestPaused', { requestId: '1', request: { url: 'https://allowed.invalid/asset', method: 'GET' } });
 session.emit('Fetch.requestPaused', { requestId: '2', request: { url: 'https://blocked.invalid/asset', method: 'GET' } });
 await guard.close();
 assert.equal(calls.find(c => c.method === 'Fetch.fulfillRequest').args.body, 'AAH/');
 assert.equal(calls.find(c => c.method === 'Fetch.failRequest').args.requestId, '2');
 assert.equal(guard.events.length, 2); assert.deepEqual(run.errors, []);
});

test('network experiment is explicitly scoped and existing default remains unchanged', () => {
 const args = ['content=beautiful-game', 'contentRoot=/fixture', 'routes=original-r176'];
 assert.equal(viewerContentOptions(args).networkDiagnostic, undefined);
 for (const mode of ['proxy-playwright', 'proxy-cdp-remote']) assert.equal(viewerContentOptions([...args, 'networkDiagnostic=' + mode]).networkDiagnostic, mode);
 assert.throws(() => viewerContentOptions([...args, 'networkDiagnostic=none']));
 assert.throws(() => viewerContentOptions(['content=bistro', 'contentRoot=/fixture', 'routes=original-r176', 'networkDiagnostic=proxy-cdp-remote']));
});

test('stalled mirror cleanup is bounded and detaches its session', async () => {
 const session = new EventEmitter(); session.send = async () => {}; let detached = false; session.detach = async () => { detached = true; };
 const run = { errors: [], redact: x => x, mirrorNetwork: () => new Promise(() => {}) };
 const guard = await installViewerRemoteGuard({ newCDPSession: async () => session }, {}, run, { cleanupTimeoutMs: 10 });
 session.emit('Fetch.requestPaused', { requestId: 'hung', request: { url: 'https://allowed.invalid/asset', method: 'GET' } });
 await assert.rejects(guard.close(), /cleanup timed out/); assert(detached); assert.equal(session.listenerCount('Fetch.requestPaused'), 0); await guard.close();
});
