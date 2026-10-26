import http from 'node:http';

export const VIEWER_NETWORK_DIAGNOSTICS = ['playwright', 'proxy-playwright', 'proxy-cdp-remote'];

// A local deny-only proxy never resolves, connects, or forwards a destination.
// Only the exact experiment HTTP origin bypasses it. This is a diagnostic
// browser configuration, not a change to application or asset source.
export async function createViewerDenyProxy(origin) {
 const url = new URL(origin);
 if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.pathname !== '/' || url.search || url.hash) throw Error('Expected exact loopback HTTP origin');
 const blocked = [];
 const server = http.createServer((request, response) => {
  blocked.push({ method: request.method, url: request.url, action: 'denied-without-forwarding' });
  response.writeHead(403, { 'content-type': 'text/plain', 'connection': 'close' }); response.end('External network disabled');
 });
 server.on('connect', (request, socket) => {
  blocked.push({ method: 'CONNECT', url: request.url, action: 'denied-without-forwarding' });
  socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
 });
 await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
 let closed = false;
 return { blocked, args: [`--proxy-server=http://127.0.0.1:${server.address().port}`, `--proxy-bypass-list=<-loopback>;${url.origin}`], async close() {
  if (closed) return; closed = true;
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
 } };
}

// Mirror the same exact allowlist through CDP, leaving HTTP localhost requests
// unpaused. Unknown HTTPS is rejected here; all other destinations face the
// deny-only proxy. This page-only diagnostic is used with service workers off.
export async function installViewerRemoteGuard(context, page, run, { cleanupTimeoutMs = 5000 } = {}) {
 const session = await context.newCDPSession(page), pending = new Set(), events = [];
 const listener = event => {
  const operation = (async () => {
   const { requestId, request } = event;
   events.push({ requestId, url: request.url, method: request.method });
   if (!request.url.startsWith('https://')) throw Error('Remote guard unexpectedly paused a non-HTTPS request');
   await run.mirrorNetwork({ request: () => ({ url: () => request.url }),
    abort: () => session.send('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }),
    continue: () => { throw Error('Remote guard must never forward a request'); },
    fulfill: value => session.send('Fetch.fulfillRequest', { requestId, responseCode: 200,
     responseHeaders: Object.entries({ 'content-type': value.contentType, ...value.headers }).map(([name, value]) => ({ name, value: String(value) })),
     body: Buffer.from(value.body).toString('base64') }) });
  })().catch(async error => {
   run.errors.push(run.redact('Remote guard: ' + error.message));
   await session.send('Fetch.failRequest', { requestId: event.requestId, errorReason: 'BlockedByClient' }).catch(() => {});
  });
  pending.add(operation); operation.finally(() => pending.delete(operation));
 };
 session.on('Fetch.requestPaused', listener);
 await session.send('Network.enable');
 await session.send('Network.setCacheDisabled', { cacheDisabled: true });
 await session.send('Fetch.enable', { patterns: [{ urlPattern: 'https://*', requestStage: 'Request' }] });
 let closed = false;
 return { events, async close() {
  if (closed) return; closed = true; let timer;
  try { await Promise.race([Promise.allSettled([...pending]), new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Remote guard cleanup timed out')), cleanupTimeoutMs); })]); }
  finally { clearTimeout(timer); session.off('Fetch.requestPaused', listener); await session.detach().catch(() => {}); }
 } };
}
