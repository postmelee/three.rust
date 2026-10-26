"""Verify every archive payload and independently repeat the Editor cross-route audit.
Python 3 standard library only; no application/browser or original work directories.
Native play/pause wall-clock time is bounded and preserved, not an equality oracle.
"""
from pathlib import Path
import gzip,hashlib,json,math,argparse,posixpath
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--archive',type=Path,default=Path(__file__).resolve().parent)
parser.add_argument('--out',type=Path,help='Optional fresh audit JSON path; otherwise verify saved audit.json')
args=parser.parse_args()
ROOT=args.archive.resolve(strict=True)
index=json.loads((ROOT/'archive-index.json').read_text())
entries={e['path']:e for e in index['files']}
def actual(p):return p if p.exists() else Path(str(p)+'.gz')
def decoded(p):
 p=actual(p);b=p.read_bytes();return gzip.decompress(b) if p.suffix=='.gz' else b
def read(p):return json.loads(decoded(p))
def sha(p):return entries[str(actual(p).relative_to(ROOT))]['sourceSha256']
assert json.loads((ROOT/'build-status.json').read_text())['status']=='complete'
assert len(entries)==len(index['files'])
for e in index['files']:
 assert posixpath.normpath(e['path'])==e['path'] and not e['path'].startswith(('/', '../'))
 p=(ROOT/e['path']).resolve(strict=True);assert p.is_relative_to(ROOT);b=p.read_bytes();assert len(b)==e['storedBytes'] and len(b)<100_000_000 and hashlib.sha256(b).hexdigest()==e['sha256']
 d=decoded(p);assert len(d)==e['decodedBytes'] and len(d)<100_000_000 and hashlib.sha256(d).hexdigest()==e['decodedSha256'];assert not e['normalizations']
 assert e['sourceDecodedSha256']==e['decodedSha256']
 if not e['normalizations']:assert e['sourceDecodedSha256']==e['decodedSha256']
 if '.json' in p.suffixes:json.loads(d)
 if p.suffix=='.png':assert e['sourceSha256']==e['sha256']
rows=[];datasets={};comparisons=[];exceptions=[]
for route in ['original','js','wasm']:
 for suite in ['check','ui']:
  p=ROOT/'canonical'/f'{route}-{suite}'
  r=read(p/'result.json');e=read(p/'environment.json');i=read(p/'integrity.json');errs=read(p/'errors.json')
  assert r['status']=='passed' and i['unchanged'] and not errs and not e['toolingDirty']
  assert e['engine']=={'original':'original','js':'prepared-js','wasm':'prepared-wasm'}[route]
  assert e['toolingSha']=='e9b736a47f48bc2512476f8966d285d0153419f7'
  assert e['helperSha256']=='f3be9be2879d397d51cf159e021f5f25cd0d058e552a8f4a7d3e9c48590232c7'
  assert len(r['checks'])==({'check':14,'ui':40}[suite]) and (suite=='ui' or all(c['pass'] for c in r['checks']))
  assert e['browser']=='155.0.8059.86' and e['headed'] and e['viewport']=={'width':1280,'height':720} and e['dpr']==1
  g=read(p/('editor-gpu.json' if suite=='check' else 'gpu.json'));assert 'ANGLE Metal Renderer: Apple M4 Pro' in g['renderer']
  assert (g['width'],g['height'],g['dpr'])==(930,648,1)
  ad=read(p/'adaptation.json');assert ad['appSources']['editor']=='9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8'
  assert e['candidateSha']=='85e2c5d500edb0b92ea4ecb997087fded3fed45b'
  assert ad['candidate']['sha']==e['candidateSha'] and not ad['candidate']['dirty']
  for version in ['original','served']:
   entry=decoded(p/f'editor-index.{version}.html');assert hashlib.sha256(entry).hexdigest()==ad['editor'][version+'Sha256'] and len(entry)==ad['editor'][version+'Bytes']
  if route=='original':assert ad['editor']['originalSha256']==ad['editor']['servedSha256'] and not ad['editor']['edits']
  datasets[(route,suite)]=p
  originalPath=str(Path(entries[str(actual(p/'result.json').relative_to(ROOT))]['sourcePath']).parent)
  rows.append({'route':route,'suite':suite,'path':originalPath,'toolingSha':e['toolingSha'],'toolingDirty':e['toolingDirty'],'helperSha256':e['helperSha256'],'candidateSha':e['candidateSha'],'browser':e['browser'],'checksPassed':len(r['checks']),'integrityUnchanged':True,'errors':errs,'environmentSha256':sha(p/'environment.json'),'resultSha256':sha(p/'result.json'),'adaptationSha256':sha(p/'adaptation.json')})

def compare(a,b,path='',skip=()):
 out={'numericValues':0,'maxAbsoluteDifference':0.0,'failures':[],'excluded':[]}
 def walk(x,y,where):
  if where in skip:
   assert isinstance(x,(float,int)) and isinstance(y,(float,int)) and math.isfinite(x) and math.isfinite(y)
   out['excluded'].append({'path':where,'original':x,'candidate':y,'reason':'Native play/pause time is wall-clock driven (wait until >0.05s then click); fixed scrub poses and pause/stop semantics are compared separately.'});return
  if isinstance(x,bool) or isinstance(y,bool):
   if type(x)!=type(y) or x!=y:out['failures'].append({'path':where,'original':x,'candidate':y})
  elif isinstance(x,(int,float)) and isinstance(y,(int,float)):
   out['numericValues']+=1;delta=abs(x-y);out['maxAbsoluteDifference']=max(out['maxAbsoluteDifference'],delta)
   if not math.isfinite(x) or not math.isfinite(y) or delta>1e-10+1e-12*abs(x):out['failures'].append({'path':where,'original':x,'candidate':y,'difference':delta})
  elif isinstance(x,dict) and isinstance(y,dict):
   if set(x)!=set(y):out['failures'].append({'path':where,'originalKeys':list(x),'candidateKeys':list(y)});return
   for k in x:walk(x[k],y[k],where+'.'+k if where else k)
  elif isinstance(x,list) and isinstance(y,list):
   if len(x)!=len(y):out['failures'].append({'path':where,'originalLength':len(x),'candidateLength':len(y)});return
   for i,(u,v) in enumerate(zip(x,y)):walk(u,v,f'{where}[{i}]')
  elif type(x)!=type(y) or x!=y:out['failures'].append({'path':where,'original':x,'candidate':y})
 walk(a,b,path);out['passed']=not out['failures'];return out


for route in ['js','wasm']:
 for suite in ['check','ui']:
  original=datasets[('original',suite)];candidate=datasets[(route,suite)]
  for file in sorted(original.glob('*.json*')):
   name=file.name.removesuffix('.gz');a=read(file)
   image=isinstance(a,dict) and 'pixelSha256' in a and 'numeric' in a
   semantic=(suite=='check' and name.startswith(('E1-history-','E2-bounds-','E2-shape-','editor-loaded-weights-'))) or (suite=='ui' and name.startswith(('translate-','rotate-','scale-','static-events-','timeline-state-')))
   if not image and not semantic:continue
   b=read(candidate/name)
   metadata={'route':route,'suite':suite,'file':name,'kind':'fixed-image-numeric' if image else 'interaction-semantic','originalSourceSha256':sha(file),'candidateSourceSha256':sha(candidate/name)}
   if image:
    x={k:v for k,v in a.items() if k!='diagnostics'};y={k:v for k,v in b.items() if k!='diagnostics'}
    metadata['imageExact']=a['pixelSha256']==b['pixelSha256'];metadata['imageSha256']=a['pixelSha256'];metadata['numericLength']=len(a['numeric'])
    metadata['originalPngSha256']=sha(original/name.replace('.json','.png'));metadata['candidatePngSha256']=sha(candidate/name.replace('.json','.png'))
    assert metadata['imageExact'] and metadata['originalPngSha256']==metadata['candidatePngSha256']
    metadata['candidateDiagnostics']=b.get('diagnostics');c=compare(x,y)
   else:
    skip=('paused.time',) if name.startswith('timeline-state-') else ();c=compare(a,b,skip=skip)
    if skip:
     for d in [a,b]:assert d['paused']['paused'] and not d['paused']['running'] and .05<d['paused']['time']<d['paused']['duration']
   metadata.update(c);comparisons.append(metadata)
   for exception in c['excluded']:exceptions.append({'route':route,'suite':suite,'file':name,**exception})
attempts=[]
for p in sorted((ROOT/'attempts').iterdir()) if (ROOT/'attempts').exists() else []:
 r=read(p/'result.json');e=read(p/'environment.json')
 originalPath=str(Path(entries[str(actual(p/'result.json').relative_to(ROOT))]['sourcePath']).parent)
 attempts.append({'path':originalPath,'status':r['status'],'error':r.get('error'),'toolingSha':e['toolingSha'],'toolingDirty':e['toolingDirty'],'helperSha256':e['helperSha256'],'resultSha256':sha(p/'result.json'),'errors':read(p/'errors.json')})
assert attempts==[], 'Unexpected attempts require an explicit audit extension'
summary={'status':'passed' if all(c['passed'] for c in comparisons) else 'failed',
 'scope':'Cross-route Editor correctness audit. No full scene JSON or random UUID equality; no timing or performance qualification.',
 'numericTolerance':{'absolute':1e-10,'relative':1e-12,'formula':'abs(candidate-original) <= absolute + relative*abs(original)'},
 'pending':[],'earlierAttempts':attempts,'failedDatasets':[],'datasets':rows,'comparisons':comparisons,'wallClockExceptions':exceptions,
 'counts':{'datasets':len(rows),'comparisons':len(comparisons),'imageComparisons':sum(c['kind']=='fixed-image-numeric' for c in comparisons),'semanticComparisons':sum(c['kind']=='interaction-semantic' for c in comparisons),'numericValues':sum(c['numericValues'] for c in comparisons),'failures':sum(len(c['failures']) for c in comparisons),'maxAbsoluteDifference':max(c['maxAbsoluteDifference'] for c in comparisons)}}
if args.out:
 with args.out.open('x') as f:f.write(json.dumps(summary,indent=2)+'\n')
else:assert summary==read(ROOT/'audit.json'),'Published audit differs from independent recomputation'
assert summary['counts']=={'datasets':6,'comparisons':72,'imageComparisons':32,'semanticComparisons':40,'numericValues':149328,'failures':0,'maxAbsoluteDifference':0.0}
assert len(exceptions)==4
print(json.dumps({'status':'verified','payloads':len(entries),'routeLocalChecks':sum(r['checksPassed'] for r in rows),'counts':summary['counts'],'wallClockEqualityExceptions':len(exceptions),'preservedEarlierAttempts':len(attempts)},indent=2))
