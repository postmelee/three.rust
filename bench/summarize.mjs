import {readFileSync,writeFileSync} from 'node:fs';
const dir=process.argv[2]||'bench/results/m0-profile';const m=JSON.parse(readFileSync(`${dir}/manifest.json`));const groups={};
function q(a,p){const b=[...a].sort((x,y)=>x-y);return b[Math.floor((b.length-1)*p)]}
for(const file of m.runs){const r=JSON.parse(readFileSync(`${dir}/${file}`));const key=`${r.scenario}/${r.engine}`;const stats={rep:r.rep};for(const k of ['cpu','interval','transforms','animation','skeleton','raycast','render']){if(!(k in r.rows[0]))continue;stats[k]={p50:q(r.rows.map(x=>x[k]),.5),p95:q(r.rows.map(x=>x[k]),.95),p99:q(r.rows.map(x=>x[k]),.99)};}(groups[key]??=[]).push(stats);}
let csv='scenario,engine,runs,cpu_p50_median_ms,cpu_p50_min_ms,cpu_p50_max_ms,cpu_p95_median_ms,cpu_p99_median_ms,interval_p95_median_ms\n';
for(const [key,r] of Object.entries(groups)){const a=r.map(x=>x.cpu.p50);csv+=`${key.replace('/',',')},${r.length},${q(a,.5)},${Math.min(...a)},${Math.max(...a)},${q(r.map(x=>x.cpu.p95),.5)},${q(r.map(x=>x.cpu.p99),.5)},${q(r.map(x=>x.interval.p95),.5)}\n`;}
writeFileSync(`${dir}/summary.json`,JSON.stringify(groups,null,2));writeFileSync(`${dir}/summary.csv`,csv);console.log(csv);
