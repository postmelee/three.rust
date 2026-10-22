import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),bundle=resolve('dist/demo');
assert.ok(existsSync(bundle+'/packages/rthree/scene_core.wasm'));
assert.ok(!existsSync(bundle+'/work')); // No downloaded model or build scratch tree is shipped.
process.env.RTHREE_DEMO_RESULTS_DIR=resolve('work/bundle-validation');
process.chdir(bundle);
try{await import('./demo.mjs');}finally{process.chdir(root);}
