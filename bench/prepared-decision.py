"""C3 predeclared decision from a complete six-repeat rendering summary."""
from pathlib import Path
import json,statistics,sys
base=Path(sys.argv[1]); manifest=json.loads((base/'manifest.json').read_text()); assert manifest['status']=='complete' and not manifest['sourceTreeDirty'] and not manifest['config']['timings'] and manifest['config']['repeats']==6
d=json.loads((base/'summary.json').read_text()); assert d['commit']==manifest['commit'] and d['config']==manifest['config'] and not manifest['config']['profile']
rows={(r['scenario'],r['engine']):r for r in d['rows']}
comparison=[]
for scene in d['config']['scenarios']:
 c=rows[scene,'prepared-wasm']
 for engine in ['original','facade-wasm','prepared-js']:
  a=rows[scene,engine]; entry={'scene':scene,'control':engine,'candidate':'prepared-wasm','metrics':{}}
  for key in ['p50','p95','p99']:
   pairs=[x['cpu'][key]-y['cpu'][key] for x,y in zip(a['runs'],c['runs'])]
   entry['metrics'][key]={'controlMs':a['cpu'][key],'candidateMs':c['cpu'][key],'savedMs':a['cpu'][key]-c['cpu'][key],'savedPercent':100*(1-c['cpu'][key]/a['cpu'][key]),'fasterPairs':sum(v>0 for v in pairs),'pairedSavedMs':pairs,'pairedMedianSavedMs':statistics.median(pairs),'regressionBudgetMs':max(.2,.05*a['cpu'][key]),'overRegressionBudget':c['cpu'][key]-a['cpu'][key]>max(.2,.05*a['cpu'][key])}
  comparison.append(entry)
h={e['control']:e for e in comparison if e['scene']=='hierarchy'}
def gate(control,percent,absolute):
 return all(h[control]['metrics'][k]['savedPercent']>=percent and h[control]['metrics'][k]['savedMs']>=absolute and h[control]['metrics'][k]['fasterPairs']==6 for k in ['p50','p95'])
report={'candidate':d['commit'],'kind':'cloud experimental decision only; not application/hardware qualification','hierarchyUsefulCloudScreen':gate('original',20,1),'hierarchyIndependentRustScreen':gate('prepared-js',10,.5),'consistencyInterpretation':'Conservative: all six paired runs faster at each screened quantile; all exact pair differences retained. No post-hoc confidence or population inference.','comparison':comparison}
print(json.dumps(report,indent=2))
