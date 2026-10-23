import {chromium} from 'playwright';
import {serve} from '../scripts/server.mjs';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const out=process.env.RTHREE_PROGRESS_RESULTS_DIR||'work/progress-validation';mkdirSync(out,{recursive:true});
const data=JSON.parse(readFileSync('docs/progress.json'));
const server=await serve();let browser;const results=[];
try{browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 for(const [name,width,height] of [['desktop',1280,1000],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/docs/progress.html');
  assert.equal(await page.locator('rect[data-item]').count(),data.functions.total+data.state.total);
  for(const key of ['functions','state'])assert.equal(await page.locator(`#${key} tfoot td`).last().textContent(),String(data[key].total));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${out}/${name}.png`});
  await page.locator('#state-state-core-Object3D-js summary').click();assert((await page.locator('#state-state-core-Object3D-js li').count())>20);
  await page.goto('http://127.0.0.1:4173/docs/history.html');assert(await page.locator('body').textContent().then(x=>x.includes('not comparable')));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  assert.equal(await page.locator('[data-role=history-chart] [data-panel]').count(),2);
  await page.locator('[data-detail]').first().focus();assert.match(await page.locator('#history-detail').textContent(),/conditional Rust 1\/1515/);
  assert.equal(await page.locator('#history-table tbody tr').count(),1);
  await page.screenshot({path:`${out}/${name}-history.png`,fullPage:true});results.push({name,width,passed:true,checks:['actual source tile count','totals match JSON','no overflow','field evidence expands','history distinguishes schemas']});await page.close();
 }
 writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log('Progress and history desktop/mobile checks passed');
}finally{if(browser)await browser.close();server.close();}
