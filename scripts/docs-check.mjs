import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
execFileSync(process.execPath,['scripts/performance-summary.mjs','--check'],{stdio:'inherit'});
const r=JSON.parse(readFileSync('docs/roadmap.json'));
assert.equal(r.schemaVersion,1);
const keys=new Set(r.tasks.map(t=>t.key)),milestones=new Set(r.milestones.map(m=>m.key));
assert.equal(keys.size,r.tasks.length);assert.equal(new Set(r.tasks.map(t=>t.issue)).size,r.tasks.length);
const done=new Set(),active=new Set();
function visit(key){assert(keys.has(key),`Missing dependency ${key}`);assert(!active.has(key),`Dependency cycle: ${key}`);if(done.has(key))return;active.add(key);const t=r.tasks.find(t=>t.key===key);assert(milestones.has(t.milestone));assert(Number.isInteger(t.issue)&&t.issue>0);t.dependsOn.forEach(visit);active.delete(key);done.add(key);}
r.tasks.forEach(t=>visit(t.key));
execFileSync(process.execPath,['scripts/progress.mjs','--check'],{stdio:'inherit'});
// Public project Markdown must follow the English rule. Framework payload is pinned separately.
const paths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','README.md','docs','mydocs/plans','mydocs/working','mydocs/report']).toString().trim().split('\n').filter(p=>p.endsWith('.md'));
for(const path of paths){const s=readFileSync(path,'utf8');assert(!/[\uAC00-\uD7A3]/u.test(s),`Non-English prose in ${path}`);}
for(const path of ['docs/CI.md','docs/PROJECT_PLAN.md','docs/INITIAL_DISCUSSION.md'])assert(existsSync(path));
console.log(`Roadmap: ${r.milestones.length} milestones, ${r.tasks.length} unique issues, acyclic dependencies; English documentation and progress generation checked`);
