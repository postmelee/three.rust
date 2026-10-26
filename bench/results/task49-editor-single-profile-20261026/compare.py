"""Compare preserved 6990 and 85 Editor profile evidence; no timing inference."""
from pathlib import Path
import argparse,json,gzip,hashlib,collections
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--archive',type=Path,default=Path(__file__).resolve().parent)
p.add_argument('--baseline',type=Path,default=Path(__file__).resolve().parent.parent/'task49-editor-profile-20261026')
p.add_argument('--out',type=Path,help='Optional fresh JSON path')
a=p.parse_args()
def sha(b):return hashlib.sha256(b).hexdigest()
class Archive:
 def __init__(self,path):
  self.root=path.resolve(strict=True);self.index=json.loads((self.root/'archive-index.json').read_text());self.files={f['logicalPath']:f for f in self.index['files']};self.cache={}
 def data(self,name):
  f=self.files[name];key=f['blob']
  assert key=='blobs/'+f['publicSha256']+'.gz'
  if key not in self.cache:
   b=(self.root/key).read_bytes();assert sha(b)==f['storedSha256'] and len(b)==f['storedBytes'];self.cache[key]=gzip.decompress(b)
  b=self.cache[key];assert sha(b)==f['publicSha256'] and len(b)==f['publicBytes'];return b
 def j(self,name):return json.loads(self.data(name))
old,new=Archive(a.baseline),Archive(a.archive)
oldm,newm=old.j('full/manifest.json'),new.j('full/manifest.json')
assert oldm['candidateSha']=='6990fd92f61a031c8c2ba7a8282cfb63684e6dfb'
assert newm['candidateSha']=='85e2c5d500edb0b92ea4ecb997087fded3fed45b'
assert oldm['sourceBefore']['tooling']['sha']=='489736e4549083a199babfeea0d6104cf2d45904'
assert newm['sourceBefore']['tooling']['sha']=='e9b736a47f48bc2512476f8966d285d0153419f7'
for key in ['config','orders']:assert oldm[key]==newm[key]
def fingerprint(s):
 return {k:s[k] for k in ['scenario','sceneSetup','layout']}|{'quality':s['environment']['quality'],'geometry':{k:s['environment'][k] for k in ['width','height','cssWidth','cssHeight','dpr','rendererPixelRatio']}}
ref=fingerprint(old.j('full/runs/0-original/setup.json'))
result={'status':'verified','baselineIndexSha256':sha((old.root/'archive-index.json').read_bytes()),'candidateIndexSha256':sha((new.root/'archive-index.json').read_bytes()),'beforeCandidateSha':oldm['candidateSha'],'afterCandidateSha':newm['candidateSha'],'beforeCaptureToolSha':oldm['sourceBefore']['tooling']['sha'],'afterCaptureToolSha':newm['sourceBefore']['tooling']['sha'],'sameConfigurationAndOrders':True,'oraclePairs':[],'runs':[],'moduleHashes':{},'limits':['Diagnostic captures only, with uncalibrated overhead and separate wall-clock windows. No primary CPU, FPS or stable improvement inference.','Old valid attribution is analysis002; new valid attribution is analysis001. updateSingle retains the operation-preparation category.','Unresolved native/Wasm frames and all samples remain retained.']}
for e in oldm['oracles']:
 d=e['directory'];assert fingerprint(old.j('full/'+d+'/setup.json'))==fingerprint(new.j('full/'+d+'/setup.json'))==ref
 for t in [.25,.75]:
  x,y=old.j(f'full/{d}/pose-{t}.json'),new.j(f'full/{d}/pose-{t}.json')
  for k in ['numeric','objects','passes','width','height','selected','history','quality','timeline','pixelSha256']:assert x[k]==y[k],(d,t,k)
  assert old.data(f'full/{d}/pose-{t}.png')==new.data(f'full/{d}/pose-{t}.png')
  result['oraclePairs'].append({'engine':e['engine'],'observer':e['observer'],'time':t,'numericValues':len(x['numeric']),'maxAbsoluteError':0,'pixelSha256':x['pixelSha256'],'pngSha256':sha(new.data(f'full/{d}/pose-{t}.png'))})
for e in oldm['runs']:
 d=e['directory'];assert fingerprint(old.j('full/'+d+'/setup.json'))==fingerprint(new.j('full/'+d+'/setup.json'))==ref
 row={'engine':e['engine'],'round':e['round']}
 for key,arc in [('before',old),('after',new)]:
  o=arc.j('full/'+d+'/profile-observations.json');x,y=o['before'],o['after'];frames=(y['renderInfo']['frame']-x['renderInfo']['frame'])/4
  counts=None
  if x['diagnostics']:
   counts={k:(y['diagnostics'][k]-x['diagnostics'][k])/frames for k in ['preparedPasses','preparedFallbacks','preparedWasmCalls','matrixReads','preparedMatrixReads','materializedBytes','wasmCalls']}
   assert counts=={'preparedPasses':0,'preparedFallbacks':4,'preparedWasmCalls':0,'matrixReads':205,'preparedMatrixReads':0,'materializedBytes':26240,'wasmCalls':135 if e['engine']=='prepared-wasm' else 0}
  raw=arc.j('full/'+d+'/profile.cpuprofile')
  row[key]={'rawProfileSha256':sha(arc.data('full/'+d+'/profile.cpuprofile')),'samples':len(raw['samples']),'durationMs':(raw['endTime']-raw['startTime'])/1000,'nativeFramesInEndpointWindow':frames,'perFrameCounters':counts,'phaseErrorSeconds':o['validation']['phaseErrorSeconds']}
 assert row['before']['perFrameCounters']==row['after']['perFrameCounters'];result['runs'].append(row)
for key,arc in [('before',old),('after',new)]:
 files=arc.j('full/runs/0-prepared-wasm/captured-sources.json');labels=['candidate/packages/rthree/core.js','candidate/packages/rthree/facade-state.js','candidate/packages/rthree/scene_core.wasm']
 result['moduleHashes'][key]={f['label']:f['sha256'] for f in files if f['label'] in labels};assert len(result['moduleHashes'][key])==3
assert result['moduleHashes']['before']['candidate/packages/rthree/facade-state.js']!=result['moduleHashes']['after']['candidate/packages/rthree/facade-state.js']
classification=[]
for e in newm['runs']:
 analysis=new.j(f'full-analysis-001/{e["round"]}-{e["engine"]}.json');nodes=[n for n in analysis['exclusive'] if n['label']=='updateSingle' and n.get('source',{}).get('file')=='candidate/packages/rthree/facade-state.js']
 if e['engine']!='original':assert nodes and all(n['category']=='facade operation preparation' for n in nodes)
 classification.append({'engine':e['engine'],'round':e['round'],'updateSingleNodes':len(nodes),'categories':sorted(set(n['category'] for n in nodes))})
result['updateSingleClassification']=classification
if a.out:
 with a.out.open('x') as f:json.dump(result,f,indent=2);f.write('\n')
print(json.dumps({'status':'verified','oraclePairs':len(result['oraclePairs']),'numericComparisons':sum(x['numericValues'] for x in result['oraclePairs']),'runPairs':len(result['runs']),'newCandidate':newm['candidateSha']}))
