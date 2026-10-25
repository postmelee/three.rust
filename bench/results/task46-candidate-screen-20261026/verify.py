"""Verify published payloads and independently reconstruct the recorded screen.

Run with Python 3 from any directory. --write-audit refreshes this derived audit,
never the captured evidence. No browser, source checkout or external dependency.
"""
from pathlib import Path
import gzip,hashlib,json,math,statistics,sys
ROOT=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
index=json.loads((ROOT/'archive-index.json').read_text())

def decoded(path):
 p=ROOT/path
 if not p.exists():p=Path(str(p)+'.gz')
 data=p.read_bytes()
 return gzip.decompress(data) if p.suffix=='.gz' else data

def read(path):return json.loads(decoded(path))
def near(x,y):assert math.isfinite(x) and math.isfinite(y) and abs(x-y)<1e-9,(x,y)
def quantile(values,p):
 a=sorted(values);i=(len(a)-1)*p;lo=math.floor(i);hi=math.ceil(i)
 return a[lo]+(a[hi]-a[lo])*(i-lo)
def stats(values):return {**{k:quantile(values,p) for k,p in [('p50',.5),('p95',.95),('p99',.99)]},'mean':sum(values)/len(values),'min':min(values),'max':max(values)}
def draw(d):return {k:d[k] for k in ['calls','triangles','points','lines']}
def boundary(p):
 assert p['visibility']=='visible' and p['focused'] and p['dpr']==1
 assert (p['width'],p['height'])==(640,360)
def hardware(env):
 assert 'ANGLE Metal Renderer: Apple M4 Pro' in env['renderer']
 assert (env['width'],env['height'],env['dpr'])==(640,360,1)

for entry in index['files']:
 p=ROOT/entry['path'];b=p.read_bytes();assert sha(b)==entry['sha256'],str(p)
 data=gzip.decompress(b) if entry['gzip'] else b
 assert sha(data)==entry['decodedSha256'] and len(data)==entry['decodedBytes'],str(p)
 if '.json' in p.suffixes:json.loads(data)
 if p.suffix=='.png':assert entry['sourceSha256']==sha(b)
 if not entry['normalizations']:assert entry['sourceDecodedSha256']==sha(data)

summary={'status':'verified','payloads':len(index['files']),'sourceToPublicNumericEquality':index['sourceToPublicNumericEquality'],'suites':[]}
for suite,expectedRuns,expectedSamples,tool in [('full',144,600,'cadc5edd694b3aa778dd049251d15e5f6dd75c87'),('smoke',24,10,'c7e6c25413f4731cd16f8a1bafa8b07510e10b78')]:
 m=read(suite+'/manifest.json');a=read(suite+'/analysis.json');cfg=m['configuration']
 assert m['status']=='complete' and m['finalSourceVerification']=='passed' and not m['errors']
 assert m['tooling']['commit']==tool and not m['tooling']['sourceTreeDirty']
 assert m['tooling']['fileSha256']=='f0f7b1c3afb5153707df6ee8632aef30f29ff99ddecfe0b1d604cb11db465d69'
 assert len(m['runs'])==expectedRuns and cfg['samples']==expectedSamples
 assert not cfg['headless'] and cfg['isolated'] and not cfg['profile'] and not cfg['gpuQueries'] and not cfg['stageTimings']
 assert m['runtime']['c3']['commit']=='ce21ffcf355534a8cf32eb4c9f7e43d6a86509b5'
 assert m['runtime']['epoch']['commit']=='6990fd92f61a031c8c2ba7a8282cfb63684e6dfb'
 assert all(not m['runtime'][r]['sourceTreeDirty'] for r in ['c3','epoch'])
 for f in m['parityFiles']:assert m['runtime']['c3']['hashes'][f]==m['runtime']['epoch']['hashes'][f]
 if suite=='full':
  for route in m['routes']:assert sorted(order.index(route['label']) for order in m['orders'])==list(range(6))
 runs=[];preparedRuns=0;wasmRuns=0
 for file in m['runs']:
  r=read(suite+'/'+file);rows=r['rows'];assert len(rows)==expectedSamples and not r['errors'] and not r['requestFailures']
  assert r['toolCommit']==tool and r['sourceCommit']==m['runtime'][r['runtime']]['commit']
  assert r['clock']['crossOriginIsolated'] and r['clock']['minPositiveDeltaMs']>0
  hardware(r['env']);boundary(r['before']);boundary(r['after'])
  assert r['before']['tick'] is None and r['after']['tick']==cfg['warmup']+expectedSamples-1
  assert [row['tick'] for row in rows]==list(range(cfg['warmup'],cfg['warmup']+expectedSamples))
  assert all(row['gpuMs'] is None and row['gpuStatus']=='not-requested' for row in rows)
  original=r['engine']=='original'
  if original:assert all('bridge' not in row for row in rows)
  else:
   preparedRuns+=1;native=r['engine']=='prepared-wasm';wasmRuns+=int(native)
   assert rows[0]['bridge']['preparedPasses']-r['beforeDiagnostics']['preparedPasses']==cfg['warmup']+1
   if native:assert rows[0]['bridge']['preparedWasmCalls']-r['beforeDiagnostics']['preparedWasmCalls']==cfg['warmup']+1
   for i,row in enumerate(rows):
    d=row['bridge'];assert d['preparedPasses']>0 and d['preparedFallbacks']==0
    assert d['wasmActive']==native
    if native:assert d['wasmCalls']>0 and d['preparedWasmCalls']>0
    else:assert d['preparedWasmCalls']==0
    if i:
     before=rows[i-1]['bridge'];assert d['preparedPasses']-before['preparedPasses']==1
     if native:assert d['preparedWasmCalls']-before['preparedWasmCalls']==1 and d['wasmCalls']>before['wasmCalls']
  cpu=stats([row['cpu'] for row in rows]);raf=stats([row['interval'] for row in rows]);record=next(t for t in a['runs'] if t['file']==file)
  for key in cpu:near(cpu[key],record['cpu'][key]);near(raf[key],record['rafInterval'][key])
  for j,block in enumerate(record['blocks']):
   vals=[row['cpu'] for row in rows[j*120:(j+1)*120]];near(quantile(vals,.5),block['p50']);assert block['count']==len(vals)
   tol=max(cpu['p50']*.05,4*r['clock']['minPositiveDeltaMs']);near(tol,record['blockToleranceMs'])
   assert block['withinTolerance']==(abs(block['p50']-cpu['p50'])<=tol)
  assert record['blockScreenPassed']==all(b['withinTolerance'] for b in record['blocks'])
  runs.append({'file':file,'route':r['route'],'scene':r['scenario'],'repeat':r['repeat'],'cpu':cpu,'raf':raf,'draw':draw(r['info']),'clock':r['clock']['minPositiveDeltaMs'],'blocks':record['blocks']})
 for scene in cfg['scenes']:
  rs=[r for r in runs if r['scene']==scene];assert all(r['draw']==rs[0]['draw'] for r in rs)
 for group in a['groups']:
  rs=[r for r in runs if r['scene']==group['scenario'] and r['route']==group['route']]
  assert len(rs)==group['runCount']
  for metric,key in [('cpu','cpu'),('raf','rafInterval')]:
   for q in ['p50','p95','p99','mean']:near(quantile([r[metric][q] for r in rs],.5),group['medianOfRunQuantiles'][key][q])
  assert group['p50Range']==[min(r['cpu']['p50'] for r in rs),max(r['cpu']['p50'] for r in rs)]
 for comparison in a['comparisons']:
  ga=next(g for g in a['groups'] if g['scenario']==comparison['scenario'] and g['route']==comparison['baseline'])
  gb=next(g for g in a['groups'] if g['scenario']==comparison['scenario'] and g['route']==comparison['candidate'])
  for q,v in comparison['quantiles'].items():
   x=ga['medianOfRunQuantiles']['cpu'][q];y=gb['medianOfRunQuantiles']['cpu'][q]
   near(v['baselineMs'],x);near(v['candidateMs'],y);near(v['savingMs'],x-y);near(v['reductionFraction'],(x-y)/x)
 aa=[]
 for group in a['aa']:
  rs=[r for r in runs if r['scene']==group['scenario'] and r['route'].startswith('original-')]
  middle=quantile([r['cpu']['p50'] for r in rs],.5);tolerance=max(middle*.05,4*max(r['clock'] for r in rs));near(middle,group['medianP50']);near(tolerance,group['toleranceMs'])
  runFail=sum(abs(r['cpu']['p50']-middle)>tolerance for r in rs)
  blockFail=sum(abs(b['p50']-r['cpu']['p50'])>tolerance for r in rs for b in r['blocks'])
  assert group['passed']==(runFail==0 and blockFail==0)
  for recorded,r in zip(group['runs'],rs):
   assert recorded['file']==r['file']
   assert recorded['withinAcrossRunTolerance']==(abs(r['cpu']['p50']-middle)<=tolerance)
   for b in recorded['blocks']:assert b['withinOriginalAaTolerance']==(abs(b['p50']-r['cpu']['p50'])<=tolerance)
  aa.append({'scene':group['scenario'],'runCount':len(rs),'failedRuns':runFail,'blockCount':sum(len(r['blocks']) for r in rs),'failedBlocks':blockFail,'toleranceMs':tolerance,'passed':group['passed']})
 refs={};numericCompared=0
 for item in m['correctness']:
  c=read(suite+'/'+item['file']);s=c['snapshot'];hardware(c['env']);boundary(c['stateBefore']);boundary(c['stateAfter'])
  assert not c['errors'] and not c['requestFailures'] and c['tick']==11 and c['snapshotAddsRender']
  assert c['before']['frame']==12 and c['after']['frame']==13
  assert len(s['pixels'])==640*360*4 and sha(bytes(s['pixels']))==s['pixelSha256']==item['pixelSha256']
  assert all(math.isfinite(v) for v in s['matrices'])
  key=c['scenario'];png=decoded(suite+'/'+item['image'])
  if key not in refs:assert c['route']=='original-A';refs[key]=(c,png)
  else:
   ref,refpng=refs[key];assert s['pixels']==ref['snapshot']['pixels'] and png==refpng
   assert draw(c['before'])==draw(ref['before']) and draw(c['after'])==draw(ref['after'])
   assert len(s['matrices'])==len(ref['snapshot']['matrices'])
   errors=[abs(x-y) for x,y in zip(s['matrices'],ref['snapshot']['matrices'])]
   assert all(e<=1e-10+1e-12*abs(y) for e,y in zip(errors,ref['snapshot']['matrices']))
   near(max(errors),item['maxAbsoluteMatrixError']);numericCompared+=len(errors)
  assert item['maxAbsoluteMatrixError']==0
 assert len(m['correctness'])==24
 result={'suite':suite,'runs':len(runs),'timedFrames':len(runs)*expectedSamples,'preparedRuns':preparedRuns,'wasmRuns':wasmRuns,'correctnessCaptures':24,'fixedImageComparisons':20,'matrixValuesCompared':numericCompared,'maxAbsoluteMatrixError':0,'allFixedImagesByteIdenticalToOriginalA':True,'allTimedFinalDrawCountsEqualPerScene':True,'allVisibleFocusedHardwareBoundaries':True,'aa':aa,'routeBlocks':{'count':sum(len(r['blocks']) for r in runs),'failed':sum(not b['withinTolerance'] for r in runs for b in r['blocks'])},'captureErrors':0,'startedAt':m['startedAt'],'finishedAt':m['finishedAt']}
 if suite=='full':assert sum(g['failedRuns'] for g in aa)==18 and sum(g['failedBlocks'] for g in aa)==52 and all(not g['passed'] for g in aa)
 summary['suites'].append(result)
if '--write-audit' in sys.argv:(ROOT/'audit.json').write_text(json.dumps(summary,indent=2)+'\n')
else:assert read('audit.json')==summary
print(json.dumps(summary,indent=2))
