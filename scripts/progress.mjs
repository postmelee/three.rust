import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const data=JSON.parse(readFileSync('docs/progress.json'));
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const colors={measured:'#125d47',planned:'#45546a',blocked:'#914c13',retained:'#45546a'};
const height=174+data.rows.length*52;
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="${height}" viewBox="0 0 1120 ${height}" role="img" aria-labelledby="title description">\n<title id="title">${esc(data.title)}</title>\n<desc id="description">Only eligible transforms are ported. Correctness is bounded; no general performance gain is established. Other CPU stages remain in JavaScript and hardware validation is outstanding.</desc>\n<rect width="1120" height="${height}" rx="14" fill="#f5f7fb"/>\n<g font-family="Arial, sans-serif" fill="#17243a">\n<text x="24" y="38" font-size="24" font-weight="bold">${esc(data.title)}</text>\n<text x="24" y="65" font-size="15">${esc(data.scope)}</text>\n<rect x="16" y="88" width="1088" height="36" rx="5" fill="#dfe7f2"/>\n`;
for(const [x,t] of [[28,'SUBSYSTEM'],[320,'IMPLEMENTATION'],[580,'VERIFICATION'],[840,'PRODUCT PERFORMANCE']])svg+=`<text x="${x}" y="111" font-size="13" font-weight="bold">${t}</text>\n`;
for(const [i,r] of data.rows.entries()){const y=151+i*52;svg+=`<circle cx="29" cy="${y-5}" r="5" fill="${colors[r.state]}"/>\n`;for(const [x,t] of [[44,r.area],[320,r.implementation],[580,r.verification],[840,r.performance]])svg+=`<text x="${x}" y="${y}" font-size="14">${esc(t)}</text>\n`;svg+=`<path d="M24 ${y+17}H1096" stroke="#dfe7f2"/>\n`;}
svg+=`<text x="24" y="${height-18}" font-size="13">M0–M2: bounded experiment measured • Broad Rust ownership: planned • No full compatibility or speedup claim</text>\n</g>\n</svg>\n`;
const out='docs/assets/progress.svg';
if(process.argv.includes('--check')){if(readFileSync(out,'utf8')!==svg)throw Error('Progress SVG is stale; run npm run docs:generate');}
else {mkdirSync('docs/assets',{recursive:true});writeFileSync(out,svg);}
