import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),bundle=resolve(process.argv[2]||'dist/demo');
assert.ok(existsSync(bundle+'/packages/rthree/scene_core.wasm'));
assert.ok(!existsSync(bundle+'/work')); // No downloaded model or build scratch tree is shipped.
process.env.RTHREE_DEMO_RESULTS_DIR=resolve('work/bundle-validation');
assert.ok(existsSync(bundle+'/docs/progress.html'));
process.env.RTHREE_PROGRESS_RESULTS_DIR=resolve('work/bundle-progress');
process.env.RTHREE_PIPELINE_RESULTS_DIR=resolve('work/bundle-pipeline');
process.env.RTHREE_OWNED_RESULTS_DIR=resolve('work/bundle-owned');
process.chdir(bundle);
try{await import('./demo.mjs');await import('./progress.mjs');await import('./pipeline-browser.mjs');await import('./owned-browser.mjs');}finally{process.chdir(root);}
