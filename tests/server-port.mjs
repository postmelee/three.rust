import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { serve } from '../scripts/server.mjs';

test('an explicit isolated server uses its own port and rejects collisions', async () => {
  const server = await serve(0, {isolated: true});
  const port = server.address().port;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/package.json`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cross-origin-embedder-policy'), 'require-corp');
    assert.equal((await response.json()).name, 'three-rust-research');
    await assert.rejects(serve(port), {code: 'EADDRINUSE'});
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('RTHREE_PORT selects both the default listener and navigation origin', () => {
  const code = `const {serve,serverOrigin}=await import('./scripts/server.mjs');const s=await serve();console.log(JSON.stringify({origin:serverOrigin,port:s.address().port}));s.close();`;
  const result = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], {env: {...process.env, RTHREE_PORT: '4384'}, encoding: 'utf8'}));
  assert.deepEqual(result, {origin:'http://127.0.0.1:4384',port:4384});
  const invalid = spawnSync(process.execPath, ['--input-type=module', '-e', code], {env: {...process.env, RTHREE_PORT:'0'},encoding:'utf8'});
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /Invalid RTHREE_PORT/);
});
