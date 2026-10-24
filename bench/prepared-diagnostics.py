"""Separate instrumented counter means and sampled profiles; never primary timings."""
from pathlib import Path
import sys,json,gzip,collections

def read(path):
 path=Path(path)
 return json.loads(path.read_bytes() if path.exists() else gzip.decompress(Path(str(path)+'.gz').read_bytes()))

root=Path(sys.argv[1]);profile_root=Path(sys.argv[2]);m=read(root/'manifest.json')
assert m['status']=='complete' and m['config']['timings'] and not m['sourceTreeDirty']
fields=['abiCalls','wasmCalls','preparedWasmCalls','topologyBuilds','dirtyRecords','operationBytes','uploadedBytes','materializedBytes','matrixReads','preparedInputBytes','preparedMatrixBytes','preparedMatrixReads','preparedPasses','preparedDraws','preparedFallbacks','syncMs','kernelMs','readMs','prepareMs','prepareKernelMs','preparedReadMs']
results=[]
for name in m['runs']:
 run=read(root/name);rows=run['rows'];assert len(rows)>1
 if 'bridge' not in rows[0]:continue
 a,b=rows[0]['bridge'],rows[-1]['bridge'];n=len(rows)-1
 results.append({'scene':run['scenario'],'engine':run['engine'],'transitions':n,'perFrame':{k:(b.get(k,0)-a.get(k,0))/n for k in fields}})
profiles=[];pm=read(profile_root/'manifest.json');assert not pm['trackedSourceDirty'] and pm['commit']==m['commit']
for engine in pm['engines']:
 p=read(profile_root/(engine+'.cpuprofile'));nodes={x['id']:x for x in p['nodes']};counts=collections.Counter();durations=collections.Counter()
 assert len(p['samples'])==len(p['timeDeltas'])
 for sample,delta in zip(p['samples'],p['timeDeltas']):
  f=nodes[sample]['callFrame'];key=(f['functionName'],f.get('url',''));counts[key]+=1;durations[key]+=delta/1000
 entries=[{'function':k[0],'url':k[1],'samples':counts[k],'attributedMs':v} for k,v in durations.most_common()]
 profiles.append({'engine':engine,'samples':len(p['samples']),'elapsedMs':(p['endTime']-p['startTime'])/1000,'topSelf':entries[:30],'wasmSamples':sum(counts[k] for k in counts if k[1].startswith('wasm:'))})
print(json.dumps({'kind':'separate diagnostic evidence, not primary performance','candidate':m['commit'],'counterMethod':'(last - first) / measured transitions; excludes first sample. prepareKernelMs is nested inside prepareMs; do not add. Setter and general renderer costs are not fully attributed.','profilesMethod':'1 ms browser CPU sampling, 22 warmup / 30 frames. Attributed timeDeltas are sampling approximations, including idle/native waits, not exact function CPU durations.','rows':results,'profiles':profiles},indent=2))
