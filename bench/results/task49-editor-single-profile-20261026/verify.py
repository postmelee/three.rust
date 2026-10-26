from pathlib import Path
import json,hashlib,math,collections,statistics,struct,zlib,re
# Independent standard-library verification of content-addressed Task49 evidence.
# No browser, live JS analyzer, original checkouts or third-party Python modules.
import argparse,gzip,posixpath
_ap=argparse.ArgumentParser(description=__doc__)
_ap.add_argument('--archive',type=Path,default=Path(__file__).resolve().parent)
_ap.add_argument('--out',type=Path,help='Optional fresh JSON audit path; existing files are never overwritten')
_args=_ap.parse_args()
_ARCHIVE=_args.archive.resolve(strict=True)
_INDEX=json.loads((_ARCHIVE/'archive-index.json').read_text())
assert _INDEX['format']==1
assert json.loads((_ARCHIVE/'build-status.json').read_text())['status']=='complete'
_FILES={x['logicalPath']:x for x in _INDEX['files']}
assert len(_FILES)==len(_INDEX['files'])
_BLOBS={};_STORED={}
for _item in _INDEX['files']:
 _logical=_item['logicalPath'];assert posixpath.normpath(_logical)==_logical and not _logical.startswith('/') and not _logical.startswith('../')
 _blob='blobs/'+_item['publicSha256']+'.gz';assert _item['blob']==_blob
 if _blob not in _BLOBS:
  _path=(_ARCHIVE/_blob).resolve(strict=True);assert _path.is_relative_to(_ARCHIVE)
  _stored=_path.read_bytes();assert len(_stored)<100_000_000
  _STORED[_blob]=(hashlib.sha256(_stored).hexdigest(),len(_stored))
  _BLOBS[_blob]=gzip.decompress(_stored)
 assert _STORED[_blob]==(_item['storedSha256'],_item['storedBytes'])
 _public=_BLOBS[_blob];assert len(_public)==_item['publicBytes'] and hashlib.sha256(_public).hexdigest()==_item['publicSha256']
assert sorted(p.name for p in (_ARCHIVE/'blobs').iterdir())==sorted(posixpath.basename(p) for p in _BLOBS)
class V:
 def __init__(self,logical=''):self.logical=posixpath.normpath(logical) if logical else ''
 def __truediv__(self,other):return V(posixpath.join(self.logical,str(other)))
 def read_bytes(self):
  item=_FILES[self.logical];data=_BLOBS[item['blob']]
  return gzip.compress(data,mtime=0) if item['sourceGzip'] else data
 def read_text(self):return self.read_bytes().decode('utf-8')
 def exists(self):return self.logical in _FILES
 def resolve(self):return self
 def is_relative_to(self,parent):return self.logical.startswith(parent.logical.rstrip('/')+'/')
 def __str__(self):return self.logical

BASE=V()
OUT=_args.out
def J(p): return json.loads(p.read_text())
def H(b): return hashlib.sha256(b).hexdigest()
def near(a,b): assert abs(a-b)<=max(1e-7,abs(b)*1e-11),(a,b)
def q(v,p):
 a=sorted(v);x=(len(a)-1)*p;i=int(x);return a[i]+(a[math.ceil(x)]-a[i])*(x-i)
def wasm_names(b):
 assert b[:8]==b'\0asm\1\0\0\0'
 def uint(i):
  v=s=0
  while True:
   x=b[i];i+=1;v|=(x&127)<<s;s+=7
   if x<128:return v,i
 def string(i):
  n,i=uint(i);return b[i:i+n].decode(),i+n
 i=8;names={};exports={};count=0
 while i<len(b):
  sid=b[i];n,i=uint(i+1);end=i+n
  if sid==0:
   name,t=string(i)
   if name=='name':
    while t<end:
     sub=b[t];n,t=uint(t+1);stop=t+n
     if sub==1:
      nn,t=uint(t)
      for _ in range(nn): idx,t=uint(t);name,t=string(t);names[idx]=name
     t=stop
  elif sid==7:
   nn,t=uint(i)
   for _ in range(nn):
    name,t=string(t);kind=b[t];idx,t=uint(t+1)
    if kind==0:exports.setdefault(idx,[]).append(name)
  elif sid==10:count,_=uint(i)
  i=end
 return names,exports,count

def png_pixels(p):
 b=p.read_bytes();assert b[:8]==b'\x89PNG\r\n\x1a\n';i=8;data=b''
 while i<len(b):
  n=struct.unpack('>I',b[i:i+4])[0];typ=b[i+4:i+8];d=b[i+8:i+8+n];i+=n+12
  if typ==b'IHDR':w,h,depth,color,comp,filt,inter=struct.unpack('>IIBBBBB',d);assert (depth,color,comp,filt,inter)==(8,6,0,0,0)
  elif typ==b'IDAT':data+=d
 raw=zlib.decompress(data);stride=w*4;last=bytearray(stride);rows=[];at=0
 for y in range(h):
  f=raw[at];at+=1;row=bytearray(raw[at:at+stride]);at+=stride
  for x in range(stride):
   a=row[x-4] if x>=4 else 0;c=last[x-4] if x>=4 else 0;bb=last[x]
   if f==1:val=a
   elif f==2:val=bb
   elif f==3:val=(a+bb)//2
   elif f==4:
    pp=a+bb-c;pa,pb,pc=abs(pp-a),abs(pp-bb),abs(pp-c);val=a if pa<=pb and pa<=pc else bb if pb<=pc else c
   else:assert f==0;val=0
   row[x]=(row[x]+val)%256
  rows.append(bytes(row));last=row
 return H(b''.join(reversed(rows)))

def source_audit(run):
 sources=J(run/'captured-sources.json');scripts=J(run/'profile-scripts.json')
 served={x['file']:x['sha256'] for x in J(run/'served-files.json')};network={x['url']:x['sha256'] for x in J(run/'network.json') if x.get('mirrored')}
 byurl={};wasms={};verified=0;bytecount=0
 def read(rec):
  p=(run/rec['file']).resolve();assert p.is_relative_to(run.resolve());b=p.read_bytes();assert H(b)==rec['sha256'] and len(b)==rec['bytes'];return b
 for s in sources:
  b=read(s);assert s['sha256']==(served.get(s['label']) if s['url'].startswith('<origin>/') else network.get(s['url']));byurl[s['url']]=(s,b);verified+=1;bytecount+=len(b)
  if s['label'].endswith('.wasm'):wasms[s['sha256']]=wasm_names(b)
 result={};unavailable=[]
 for s in scripts:
  if 'cleanupError' in s:raise AssertionError(s)
  if 'file' not in s:result[s['scriptId']]=('unresolved-script-unavailable',None);unavailable.append(s['scriptId']);continue
  b=read(s);verified+=1;bytecount+=len(b)
  if s['kind']=='wasm':
   assert s['sha256'] in wasms;result[s['scriptId']]=('wasm',wasms[s['sha256']]);continue
  meta=s['parsed'];pair=byurl.get(meta['url'])
  if pair is None:result[s['scriptId']]=('unresolved-script-not-served',None);continue
  src,servedbytes=pair
  if src['label'].endswith('.html'):
   lines=servedbytes.decode().splitlines(keepends=True)
   def pos(line,col):return sum(len(x) for x in lines[:line])+len(lines[line].encode('utf-16-le')[:col*2].decode('utf-16-le'))
   assert servedbytes.decode()[pos(meta['startLine'],meta['startColumn']):pos(meta['endLine'],meta['endColumn'])]==b.decode()
  else:assert b==servedbytes
  result[s['scriptId']]=('verified-js',src['label'])
 return result,{'payloadHashChecks':verified,'bytesHashed':bytecount,'servedSources':len(sources),'unavailableScriptIds':unavailable}

def window_audit(raw,engine):
 b=raw['before'];a=raw['after']
 for s in [b,a]:
  assert s['visibility']=='visible' and s['focused'] and s['crossOriginIsolated'] and s['autosave']
  assert s['dpr']==s['rendererPixelRatio']==1 and s['savingStarted']==s['savingFinished']
  assert s['selected']=='RobotExpressive.glb';x=s['action'];assert x['name']=='Walking' and x['enabled'] and x['running'] and not x['paused'] and x['mixerTimeScale']==1
  if engine=='original':assert s['diagnostics'] is None
  else:assert s['diagnostics']['backend']==engine and s['diagnostics']['wasmActive']==(engine=='prepared-wasm')
 for key in ['width','height','cssWidth','cssHeight','rendererPixelRatio','dpr','quality','activity','savingStarted','savingFinished']:assert a[key]==b[key],key
 duration=b['action']['duration'];assert duration==a['action']['duration'];delta=a['mixerTime']-b['mixerTime'];assert delta>0 and a['at']>b['at']
 err=abs(a['action']['time']-(b['action']['time']+delta)%duration);err=min(err,duration-err);assert err<=max(1e-9,128*2.220446049250313e-16*max(1,abs(a['mixerTime'])))
 passes=a['renderInfo']['frame']-b['renderInfo']['frame'];assert passes>0
 counters=None
 if engine!='original':
  keys=['wasmCalls','preparedPasses','preparedWasmCalls','preparedFallbacks','matrixReads','preparedMatrixReads','materializedBytes']
  counters={k:a['diagnostics'][k]-b['diagnostics'][k] for k in keys};assert all(x>=0 for x in counters.values())
  assert counters['preparedPasses']==counters['preparedWasmCalls']==counters['preparedMatrixReads']==0
  assert counters['preparedFallbacks']==passes and passes%4==0
  frames=passes//4;assert counters['matrixReads']==205*frames and counters['materializedBytes']==26240*frames
  assert counters['wasmCalls']==(135*frames if engine=='prepared-wasm' else 0)
 saved=raw['validation'];near(saved['phaseErrorSeconds'],err);near(saved['mixerAdvanceSeconds'],delta);assert saved['renderPasses']==passes and saved['counters']==counters
 return {'elapsedMs':a['at']-b['at'],'mixerAdvanceSeconds':delta,'renderPasses':passes,'nativeFrames':passes/4,'phaseErrorSeconds':err,'counters':counters}

def fingerprint(s):return {k:s[k] for k in ['scenario','sceneSetup','layout']}|{'quality':s['environment']['quality'],'geometry':{k:s['environment'][k] for k in ['width','height','cssWidth','cssHeight','dpr','rendererPixelRatio']}}
oldfinger=json.loads((_ARCHIVE/'task46-setup-fingerprint.json').read_text())
report={'status':'auditing','scope':'Independent Python raw audit; no browser/build/test; New-candidate analysis001 includes updateSingle in operation preparation; no invalid analysis is included here.','historicalSetupFingerprint':oldfinger,'captures':[]}
for label in ['smoke','full']:
 root=BASE/label;manifest=J(root/'manifest.json');assert manifest['status']=='capture-complete-attribution-pending' and manifest['errors']==[] and manifest['sourceBefore']==manifest['sourceAfter'] and manifest['sourceIntegrity']=='passed'
 assert manifest['sourceBefore']['tooling']['sha']=='e9b736a47f48bc2512476f8966d285d0153419f7';assert all(not s['dirty'] for s in manifest['sourceBefore'].values())
 assert manifest['candidateSha']=='85e2c5d500edb0b92ea4ecb997087fded3fed45b' and manifest['sourceBefore']['candidate']['sha']==manifest['candidateSha']
 assert manifest['sourceBefore']['editor']['sha']=='9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8'
 protocol=(_ARCHIVE/'candidate-protocol.json').read_bytes();assert H(protocol)==manifest['protocol']['sha256'] and json.loads(protocol)==manifest['protocol']['protocol']
 assert manifest['protocol']['verifiedAtToolSha']==manifest['sourceBefore']['tooling']['sha'] and manifest['protocol']['protocol']['candidateSha']==manifest['candidateSha']
 for stage in ['before','after']:assert 'AC Power' in J(root/f'environment-{stage}/runner.json')['power']['output']
 capture={'label':label,'manifestSha256':H((root/'manifest.json').read_bytes()),'toolSha':manifest['sourceBefore']['tooling']['sha'],'candidateSha':manifest['candidateSha'],'startedAt':manifest['startedAt'],'finishedAt':manifest['finishedAt'],'runs':[],'oracles':[]}
 for entry in manifest['runs']:
  assert entry['status']=='captured';run=root/entry['directory'];assert J(run/'errors.json')==[] and J(run/'integrity.json')['unchanged'];assert not any(x.get('blocked') for x in J(run/'network.json'))
  setup=J(run/'setup.json');assert fingerprint(setup)==oldfinger;assert 'Apple M4 Pro' in setup['hardware']['renderer'] and 'SwiftShader' not in setup['hardware']['renderer']
  p=J(run/'profile.cpuprofile');assert len(p['samples'])==len(p['timeDeltas'])>0;assert all(math.isfinite(x) and x>=0 for x in p['timeDeltas'])
  nodes={x['id']:x for x in p['nodes']};assert len(nodes)==len(p['nodes']);parents={}
  for node in nodes.values():
   for child in node.get('children',[]):assert child in nodes and child not in parents;parents[child]=node['id']
  roots=set(nodes)-set(parents);assert len(roots)==1
  selfus=collections.Counter();hits=collections.Counter()
  for node,delta in zip(p['samples'],p['timeDeltas']):assert node in nodes;selfus[node]+=delta;hits[node]+=1
  total=sum(selfus.values());assert total==sum(p['timeDeltas']);inclusive=collections.Counter(selfus)
  order=[];todo=list(roots)
  while todo:
   node=todo.pop();order.append(node);todo+=nodes[node].get('children',[])
  assert len(order)==len(nodes)
  for node in reversed(order):
   if node in parents:inclusive[parents[node]]+=inclusive[node]
  assert inclusive[next(iter(roots))]==total
  sources,srcaudit=source_audit(run);coverage=collections.defaultdict(lambda:{'sampledUs':0,'samples':0});wasm_unresolved=set();special=collections.Counter()
  for node,us in selfus.items():
   f=nodes[node]['callFrame'];status,extra=sources.get(f['scriptId'],('unresolved-script-id',None))
   if status=='wasm':
    names,exports,count=extra;raw=f['functionName'];match=re.fullmatch(r'wasm-function\[(\d+)\]',raw)
    indices=([int(match[1])] if match and int(match[1])<count else [i for i in set(names)|set(exports) if names.get(i)==raw or raw in exports.get(i,[])])
    status='verified-wasm' if len(indices)==1 else 'unresolved-wasm-function'
    if status!='verified-wasm':wasm_unresolved.add(raw)
   coverage[status]['sampledUs']+=us;coverage[status]['samples']+=hits[node]
   if f['functionName'] in ['(idle)','(program)','(garbage collector)','(root)']:special[f['functionName']]+=us
  analysis=BASE/f'{label}-analysis-001/{entry["round"]}-{entry["engine"]}.json'
  if analysis.exists():
   an=J(analysis);assert len(p['samples'])==an['samples'];near(an['weightedMs'],total/1000)
   for item in an['exclusive']:near(item['selfMs'],selfus[item['id']]/1000);assert item['hits']==hits[item['id']]
   for item in an['inclusive']:near(item['inclusiveMs'],inclusive[item['id']]/1000)
   for status,val in coverage.items():near(an['sourceCoverage'][status]['sampledMs'],val['sampledUs']/1000);assert an['sourceCoverage'][status]['samples']==val['samples']
  windows={f:window_audit(J(run/f'{f}.json'),entry['engine']) for f in ['warmup','before-window','profile-observations','after-window']}
  row={'engine':entry['engine'],'round':entry['round'],'rawProfileSha256':H((run/'profile.cpuprofile').read_bytes()),'samples':len(p['samples']),'nodes':len(nodes),'durationMs':(p['endTime']-p['startTime'])/1000,'weightedMs':total/1000,'gapUs':{k:q(p['timeDeltas'],v) for k,v in [('p50',.5),('p95',.95),('p99',.99)]}|{'min':min(p['timeDeltas']),'max':max(p['timeDeltas'])},'coverage':dict(coverage),'nativePseudoFrameUs':dict(special),'unresolvedWasmNames':sorted(wasm_unresolved),'sourceAudit':srcaudit,'windows':windows,'historicalSetupMatches':True,'analysis001SelfInclusiveCoverageMatched':analysis.exists()}
  maxgap=p['timeDeltas'].index(max(p['timeDeltas']));row['maximumGapSample']={'index':maxgap,'nodeId':p['samples'][maxgap],'functionName':nodes[p['samples'][maxgap]]['callFrame']['functionName']}
  capture['runs'].append(row)
 reference={str(t):J(root/f'oracles/original-native/pose-{t}.json') for t in [.25,.75]};refpng={str(t):H((root/f'oracles/original-native/pose-{t}.png').read_bytes()) for t in [.25,.75]}
 for entry in manifest['oracles']:
  run=root/entry['directory'];assert entry['status']=='passed' and J(run/'errors.json')==[] and J(run/'integrity.json')['unchanged'];assert fingerprint(J(run/'setup.json'))==oldfinger
  results=[]
  for t in [.25,.75]:
   cur=J(run/f'pose-{t}.json');ref=reference[str(t)];assert len(cur['numeric'])==7833
   for a,b in zip(cur['numeric'],ref['numeric']):assert math.isfinite(a) and math.isfinite(b) and abs(a-b)<=1e-10+1e-12*abs(b)
   for key in ['objects','passes','width','height','selected','history','quality','timeline','pixelSha256']:assert cur[key]==ref[key],key
   png=run/f'pose-{t}.png';assert H(png.read_bytes())==refpng[str(t)]
   # Decode only each original PNG once; identical encoded bytes establish all others.
   if entry['engine']=='original' and not entry['observer']:assert png_pixels(png)==cur['pixelSha256']
   results.append({'time':t,'numericValues':len(cur['numeric']),'maxAbsoluteError':max(abs(a-b) for a,b in zip(cur['numeric'],ref['numeric'])),'pixelSha256':cur['pixelSha256'],'pngSha256':H(png.read_bytes())})
  shape=J(run/'fixed-pose-pass-shape.json');assert shape['restored'] and len(shape['passes'])==4
  for item in shape['passes']:
   if entry['engine']=='original':assert item['candidateCounters'] is None
   else:assert item['candidateCounters']['preparedPasses']==item['candidateCounters']['preparedWasmCalls']==0 and item['candidateCounters']['preparedFallbacks']==1
  capture['oracles'].append({'engine':entry['engine'],'observer':entry['observer'],'poses':results,'passCount':4,'passDraws':[{k:v for k,v in x['draw'].items() if k!='frame'} for x in shape['passes']]})
 report['captures'].append(capture)
report['status']='verified';report['historicalReferenceRead']='The archived Task46 setup fingerprint is compared with every capture setup; the preserved 6990-to-85 fixed-pose comparison is separately reproducible with compare.py and recorded in comparison.json. This verifier does not reread Task46 images.'
if OUT is not None:
 with OUT.open('x') as stream:stream.write(json.dumps(report,indent=2)+'\n')
for c in report['captures']:
 print(c['label'],'runs',len(c['runs']),'samples',sum(x['samples'] for x in c['runs']),'oracles',len(c['oracles']),'phaseMax',max(w['phaseErrorSeconds'] for x in c['runs'] for w in x['windows'].values()))
print('Archive raw verification passed; optional audit:',str(OUT) if OUT else 'not written')
