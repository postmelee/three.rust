import test from 'node:test';import assert from 'node:assert/strict';import {browserPath} from '../scripts/browser-path.mjs';
test('explicit browser override remains authoritative, including invalid path',()=>{assert.equal(browserPath({CHROMIUM:'/missing/requested-browser'},'darwin'),'/missing/requested-browser');});
test('platform fallback produces executable path without Linux assumption on Mac',()=>{const p=browserPath({},'darwin');assert(p.startsWith('/'));assert.notEqual(p,'/usr/bin/chromium');});
