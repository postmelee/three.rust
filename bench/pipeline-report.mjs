import {readFileSync,writeFileSync} from 'node:fs';import path from 'node:path';
export function summarize(dir){
 const m=JSON.parse(readFileSync(path.join(dir,'manifest.json')));if(m.status!=='complete')throw Error('Incomplete diagnostic');
 const o=m.options,expected=o.counts.length*o.engines.length*o.repeats;
 if(m.runs.length!==expected||new Set(m.runs).size!==expected)throw Error('Missing or duplicate runs');
 const groups={};const q=(a,p)=>[...a].sort((a,b)=>a-b)[Math.floor((a.length-1)*p)];
 for(const f of m.runs){const r=JSON.parse(readFileSync(path.join(dir,f)));if(r.raw.length!==o.samples||r.raw.some(s=>!Number.isFinite(s.cpu)))throw Error('Invalid samples');const k=`${r.mode}/${r.count}/${r.engine}`;(groups[k]??=[]).push(r);}
 return {classification:m.classification,note:'Descriptive diagnostics only; pooled tails and median of run medians; no confidence interval or speedup verdict',groups:Object.fromEntries(Object.entries(groups).map(([k,rs])=>{if(rs.length!==o.repeats||new Set(rs.map(r=>r.repeat)).size!==o.repeats)throw Error('Missing repeats');const keys=Object.keys(rs[0].raw[0]).filter(k=>k!=='start');return [k,{runs:rs.length,samplesPerRun:o.samples,volumes:rs[0].volumes,gpu:rs[0].gpu,metrics:Object.fromEntries([...keys,'interval'].map(key=>{const runs=rs.map(r=>key==='interval'?r.raw.slice(1).map((s,i)=>s.start-r.raw[i].start):r.raw.map(s=>s[key]));const a=runs.flat();return [key,{meanMs:a.reduce((a,b)=>a+b,0)/a.length,p50Ms:q(a,.5),p95Ms:q(a,.95),p99Ms:q(a,.99),medianRunP50Ms:q(runs.map(a=>q(a,.5)),.5)}];}))}];}))};
}
if(process.argv[1]===new URL(import.meta.url).pathname){for(const dir of process.argv.slice(2)){const s=summarize(dir);writeFileSync(path.join(dir,'summary.json'),JSON.stringify(s,null,2)+'\n');console.log(dir,JSON.stringify(s));}}
