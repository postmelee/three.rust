import {chromium} from 'playwright';
import {serve} from '../scripts/server.mjs';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const out=process.env.RTHREE_PROGRESS_RESULTS_DIR||'work/progress-validation';mkdirSync(out,{recursive:true});
const data=JSON.parse(readFileSync('docs/progress.json'));
const server=await serve();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const results=[];
try{for(const [name,width,height] of [['desktop',1280,1100],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/docs/progress.html');
 await page.waitForFunction(()=>document.querySelector('img').complete&&document.querySelector('img').naturalWidth>0);
 for(const key of ['cpu','evidence'])assert.deepEqual(await page.locator(`#${key} tfoot td`).allTextContents(),[String(data[key].done),String(data[key].total)]);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#transforms summary').click();assert.equal(await page.locator('#transforms li').count(),6);
 assert.deepEqual(errors,[]);await page.screenshot({path:`${out}/${name}.png`,fullPage:true});results.push({name,width,passed:true,checks:['standalone page served locally','SVG loaded','totals match JSON','no horizontal overflow','expandable evidence items']});await page.close();
}writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log('Progress desktop/mobile standalone page passed');}finally{await browser.close();server.close();}
