"""Offline Editor native-content evidence audit; no browser, asset download or timing."""
from pathlib import Path
import argparse,gzip,hashlib,importlib.util,json,math,re,sys
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('storage',ROOT/'storage.py');s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
spec=importlib.util.spec_from_file_location('png_codec',ROOT/'png.py');png=importlib.util.module_from_spec(spec);spec.loader.exec_module(png)
H=lambda b:hashlib.sha256(b).hexdigest()
EDITOR='9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8';RUNTIME='85e2c5d500edb0b92ea4ecb997087fded3fed45b'

def numeric(a,b):
 assert len(a)==len(b);diff=[]
 for i,(x,y) in enumerate(zip(a,b)):
  assert math.isfinite(x) and math.isfinite(y)
  if abs(x-y)>1e-10+1e-12*abs(y):diff.append({'index':i,'reference':x,'actual':y,'delta':y-x})
 return diff

def compare(a,b):
 fields=[k for k in ['pixelSha256','width','height','objects','history','selectedRoot'] if a[k]!=b[k]];changes=numeric(a['numeric'],b['numeric'])
 return {'equal':not fields and not changes,'differentFields':fields,'numericValues':len(a['numeric']),'numericDifferences':changes,'maximumAbsoluteDifference':max([abs(x-y) for x,y in zip(a['numeric'],b['numeric'])],default=0)}

def readiness(expected,actual):
 issues=[]
 def eq(x,y,label):
  if x!=y:issues.append(label)
 eq(actual['contextLost'],False,'contextLost');eq(actual['selectedRoot'],True,'selectedRoot');eq(actual['meshInstances'],expected['primitiveInstances'],'primitiveInstances');eq(actual['skinnedMeshes'],expected['skinnedNodes'],'skinnedNodes');eq(actual['morphMeshes'],expected['morphNodes'],'morphNodes')
 nodes={x['name']:x for x in actual['nodes']};eq(len(nodes),len(actual['nodes']),'uniqueNames');eq(set(nodes),{x['name'] for x in expected['nodeRecords']},'nodeNames');mnames={x['index']:x['name'] for x in expected['materialNames']}
 for want in expected['nodeRecords']:
  got=nodes.get(want['name'])
  if got is None:continue
  for k in ['parentName','childNames']:eq(got[k],want[k],want['name']+'.'+k)
  if not want['animated']:
   for k in ['matrix'] if want['matrix'] else ['translation','rotation','scale']:
    if numeric(got[k],want[k]):issues.append(want['name']+'.'+k)
  eq(len(got['primitives']),len(want['primitives']),want['name']+'.primitives')
  for g,e in zip(got['primitives'],want['primitives']):
   eq(g['materialName'],mnames[e['materialIndex']],'primitiveMaterial');eq(g['indexCount'],e['indexCount'],'primitiveIndices')
   for k,v in e['attributes'].items():eq(g['attributes'].get(k),v,'primitiveAttribute.'+k)
 eq(sorted(set(x['index'] for x in actual['materials'])),expected['materialIndices'],'materialIndices');materials={m['index']:m for m in expected['materials']}
 for got in actual['materials']:
  want=materials.get(got['index'])
  if want is None:issues.append('unknownMaterial');continue
  for k in ['transmission','thickness','attenuationDistance','attenuationColor','specularIntensity','specularColor']:eq(got[k],want[k],'material.'+k)
  eq([x['slot'] for x in got['textureSlots']],[x['slot'] for x in want['textureSlots']],'materialSlots');slots={x['slot']:x for x in got['textureSlots']}
  for e in want['textureSlots']:
   g=slots.get(e['slot'])
   if g is None:continue
   for k in ['imageIndex','sampler','texCoord','offset','scale','rotation','flipY','colorTransfer']:eq(g[k],e[k],'texture.'+k)
 eq(all(x['ready'] for x in actual['textures']),True,'textureReadiness');eq(sorted(set(x['imageIndex'] for x in actual['textures'])),expected['imageIndices'],'imageIndices');eq(all(math.isfinite(x['duration']) and x['duration']>0 for x in actual['clips']),True,'clipDurations');eq([{'name':x['name'],'tracks':x['tracks']} for x in actual['clips']],[{'name':x['name'],'tracks':x['tracks']} for x in expected['editorAnimations']],'clips')
 return {'issues':issues,'nodes':len(actual['nodes']),'materialInstances':len(actual['materials']),'sourceMaterials':len(expected['materials']),'materialSlots':sum(len(m['textureSlots']) for m in actual['materials']),'decodedImages':len(set(x['imageIndex'] for x in actual['textures'] if x['ready'])),'clips':len(actual['clips']),'sourceRelationshipsPassed':not issues}

def native_window(before,after,animated,engine):
 for row in [before,after]:
  assert row['visibility']=='visible' and row['focused'] and row['isolated'] and row['dpr']==1 and row['pixelRatio']==1 and row['selectedRoot'] and not row['contextLost'] and row['autosave'];assert row['savingStarted']==row['savingFinished']
  if engine=='original':assert row['diagnostics'] is None
  else:assert row['diagnostics']['backend']==engine and row['diagnostics']['wasmActive']==(engine=='prepared-wasm')
 for k in ['width','height','cssWidth','cssHeight','pixelRatio','quality','camera','activity','savingStarted','savingFinished']:assert after[k]==before[k]
 assert after['at']>before['at'];frames=after['render']['frame']-before['render']['frame'];advance=after['mixerTime']-before['mixerTime']
 if animated:
  assert frames>0 and advance>0
  for row in [before,after]:assert row['actionsInUse']==1 and row['action']['running'] and not row['action']['paused'] and row['action']['enabled'] and row['action']['timeScale']==1 and row['mixerTimeScale']==1
  assert before['action']['name']==after['action']['name'] and before['action']['duration']==after['action']['duration'];duration=before['action']['duration'];distance=abs(after['action']['time']-((before['action']['time']+advance)%duration));assert min(distance,duration-distance)<=max(1e-9,128*2.220446049250313e-16*max(1,after['mixerTime']))
 else:
  assert frames==0 and advance==0
  for row in [before,after]:assert row['actionsInUse']==0 and row['action'] is None
 keys=['wasmCalls','preparedPasses','preparedWasmCalls','preparedFallbacks','matrixReads','preparedMatrixReads','materializedBytes'];counters={k:after['diagnostics'][k]-before['diagnostics'][k] for k in keys} if before['diagnostics'] is not None else None
 if counters is not None:assert all(math.isfinite(v) and v>=0 for v in counters.values())
 return {'renderPasses':frames,'mixerAdvanceSeconds':advance,'elapsedMs':after['at']-before['at'],'counters':counters,'perRenderFrameDenominator':frames or None}

def source(A,base,engine,tooling):
 a=A.J(base+'/adaptation.json');e=A.J(base+'/environment.json');assert a['appSources']['editor']==EDITOR and a['engine']==engine and a['candidate']['sha']==RUNTIME and not a['candidate']['dirty'];assert e['candidateSha']==RUNTIME and e['toolingSha']==tooling['sha'] and not e['toolingDirty'] and e['engine']==engine and e['headed'] and e['isolated']
 original=A.B(base+'/editor-index.original.html');served=A.B(base+'/editor-index.served.html');meta=a['editor']
 for k,b in [('original',original),('served',served)]:assert H(b)==meta[k+'Sha256'] and len(b)==meta[k+'Bytes']
 transformed=original.decode()
 for change in meta['edits']:assert transformed.count(change['from'])==1;transformed=transformed.replace(change['from'],change['to'])
 assert transformed.encode()==served;assert A.J(base+'/source-overlays.json')==[]
 if engine=='original':assert original==served and meta['edits']==[]
 served_index={x['file']:x for x in A.J(base+'/served-files.json')};network=A.J(base+'/network.json');remote={x['url']:x for x in network if x.get('mirrored')};captured=A.J(base+'/captured-sources.json')
 for row in captured:
  b=A.B(base+'/'+row['file']);assert H(b)==row['sha256'] and len(b)==row['bytes'];ref=served_index.get(row['label']) if row['url'].startswith('<origin>/') else remote.get(row['url']);assert ref and ref['sha256']==H(b);assert 'bytes' not in ref or ref['bytes']==len(b)
 integrity=A.J(base+'/integrity.json');assert integrity['unchanged'] and integrity['error'] is None
 gpu=A.J(base+'/gpu.json') if A.exists(base+'/gpu.json') else None
 if gpu:assert 'Apple M4 Pro' in gpu['renderer'] and 'Metal' in gpu['renderer'] and 'SwiftShader' not in gpu['renderer']
 errors=A.J(base+'/errors.json');assert e['helperSha256']==tooling['files']['scripts/apps/candidate-browser.mjs']
 return {'capturedSources':len(captured),'executedSourceHashesVerified':True,'htmlTransformationVerified':True,'environment':e,'gpu':gpu,'integrity':integrity,'helperErrors':errors,'blockedRequests':[r for r in network if r.get('blocked')]}

def focus_diagnostic(A,base):
 files=[p for p in A.rows if p.startswith(base+'/focus-diagnostic-') and p.endswith('.json')];snapshots=sorted(((p,A.J(p)) for p in files),key=lambda pair:pair[1]['at']);previous=[];summary=[]
 for p,row in snapshots:
  assert not row['eventOverflow'] and row['events'][:len(previous)]==previous
  assert all(math.isfinite(x) for key,value in row['camera'].items() if isinstance(value,list) for x in value)
  assert all(event['at']<=row['at'] for event in row['events'])
  for event in row['events']:
   assert event['kind'] in ['input','native-cameraChanged-signal'];assert all(math.isfinite(x) for value in event['camera'].values() for x in value)
  summary.append({'file':p,'phase':row['phase'],'at':row['at'],'events':len(row['events']),'newEvents':row['events'][len(previous):],'camera':row['camera'],'selected':row['selected']});previous=row['events']
 return {'checkpoints':summary,'scope':'Opt-in source-side observations; public matrix reads may materialize candidate values. No causality or uninstrumented correctness verdict follows from this event audit.'}

def events(A,base):
 active=A.J(base+'/native-events.json');before=A.J(base+'/native-events-before-close.json')['events'];after=A.J(base+'/native-events-after-close.json')['events']
 for key in before:assert after[key][:len(before[key])]==before[key]
 # Failed runs can preserve native-events.json before closing. Both its prefix
 # and the dedicated post-close tail remain evidence; no event is filtered.
 for key in active:assert after[key][:len(active[key])]==active[key]
 return {'savedNativeCounts':{k:len(v) for k,v in active.items()},'savedNativeIncludesCompleteTail':active==after,'beforeCloseCounts':{k:len(v) for k,v in before.items()},'afterCloseCounts':{k:len(v) for k,v in after.items()},'requestFailed':after['requestFailed'],'consoleErrors':[r for r in after['console'] if r['type']=='error'],'dialogs':after['dialogs'],'crashes':after['crashes'],'tailEvents':{k:after[k][len(before[k]):] for k in before}}

def verify(root):
 A=s.Archive(root);out={'status':'verified','performanceEvidence':False,'logicalFiles':len(A.rows),'physicalBlobs':len(A.blobs),'attempts':[]};decoded=[]
 for file in A.rows:
  if '/sources/' in file and file.endswith('.bin'):
   name=Path(file).stem;assert re.fullmatch('[0-9a-f]{64}',name) and H(A.B(file))==name
 for label in s.builder.NAMES:
  r=A.J(label+'/result.json');assert not r['performanceEvidence']
  if r['status'] in ['preparing','running']:
   if r.get('tooling'):
    assert not r['tooling']['dirty']
    for f,h in r['tooling']['files'].items():assert H(A.B('tool-sources/'+r['tooling']['sha']+'/'+f))==h
   incomplete=[]
   for row in r['routes']:
    base=label+'/'+row['engine'];available=[p.removeprefix(base+'/') for p in A.rows if p.startswith(base+'/')];env=A.J(base+'/environment.json') if A.exists(base+'/environment.json') else None
    if env:assert env['candidateSha']==RUNTIME and env['toolingSha']==r['tooling']['sha'] and not env['toolingDirty']
    incomplete.append({'engine':row['engine'],'recordedStatus':row['status'],'availableFiles':available,'environment':env,'finalIntegrityAvailable':A.exists(base+'/integrity.json'),'finalEventsAvailable':A.exists(base+'/native-events-after-close.json'),'focusDiagnostic':focus_diagnostic(A,base),'scope':'Incomplete capture; no gate result or absent final integrity/event evidence is fabricated.'})
   out['attempts'].append({'label':label,'recordedStatus':r['status'],'completeness':'incomplete','tooling':r.get('tooling'),'routes':incomplete,'recordedComparisons':r['comparisons']});continue
  assert not r['tooling']['dirty'];assert r['tooling']==r['toolingAfter'] and r['toolingUnchanged'] and r['preparationUnchanged'] and r['integrityUnchanged']
  for f,h in r['tooling']['files'].items():assert H(A.B('tool-sources/'+r['tooling']['sha']+'/'+f))==h
  prep='task49-editor-bistro-zip-001' if r['content']['source']['repository']=='qian-o/GLTF-Assets' else 'task49-editor-chess-zip-002';mbytes=A.B('zip-preparation/'+prep+'/manifest.json');m=json.loads(mbytes);assert H(mbytes)==r['content']['manifestSha256'] and m['source']==r['content']['source'] and m['zip']==r['content']['zip']
  routes=[]
  for row in r['routes']:
   engine=row['engine'];base=label+'/'+engine;assert A.J(base+'/result.json')==row;src=source(A,base,engine,r['tooling']);ev=events(A,base);states={};pairs=[]
   for file in ['source-readiness.json','source-readiness-after-import.json']:
    if A.exists(base+'/'+file):states[file]=readiness(m['expected'],A.J(base+'/'+file))
   if 'sourceContract' in row:
    state=states['source-readiness.json'];assert not state['issues'];assert {k:v for k,v in state.items() if k!='issues'}==row['sourceContract']
   for file in sorted(p for p in A.rows if p.startswith(base+'/pose-') and p.endswith('-repeat-0.json')):
    second=file.removesuffix('-repeat-0.json')+'-repeat-1.json';a=A.J(file);b=A.J(second);delta=compare(a,b);assert delta['equal'];assert A.B(file.removesuffix('.json')+'.png')==A.B(second.removesuffix('.json')+'.png');pairs.append({'file':file,'comparison':delta})
   if row['status']=='passed':assert ev['savedNativeIncludesCompleteTail'];assert not ev['requestFailed'] and not ev['consoleErrors'] and not ev['dialogs'] and not ev['crashes'] and not src['helperErrors'] and not src['blockedRequests'];assert pairs
   native=None
   if A.exists(base+'/native-observation.json'):
    n=A.J(base+'/native-observation.json');before=n['before'];after=n['after'];native=native_window(before,after,bool(m['expected']['editorAnimations']),engine);assert all(native[k]==row['nativeWork'][k] for k in native)
   cross=[]
   if 'originalComparisons' in row:
    for pair in pairs:
     reference=label+'/original/'+Path(pair['file']).name;delta=compare(A.J(reference),A.J(pair['file']));assert delta['equal'];cross.append({'file':Path(pair['file']).name,'reference':'original',**delta})
    assert len(cross)==len(row['originalComparisons'])
    for actual,recorded in zip(cross,row['originalComparisons']):assert recorded['equal'] and recorded['numericValues']==actual['numericValues'] and recorded['pixelSha256']==A.J(label+'/original/'+actual['file'])['pixelSha256']
   input_record=A.J(base+'/input.json') if A.exists(base+'/input.json') else None
   if input_record and input_record['kind']=='native-file-input':
    assert input_record['assetBytesChanged'] is False;assert A.J(base+'/native-input-element.json')=={'tag':'INPUT','type':'file','multiple':True,'parentTag':'FORM','formDisplay':'none'}
   routes.append({'engine':engine,'status':row['status'],'recordedError':row.get('error'),'source':src,'events':ev,'readiness':states,'fixedPairs':pairs,'nativeObservation':native,'crossComparisons':cross,'focusDiagnostic':focus_diagnostic(A,base),'input':input_record})
  assert r['status']==('passed' if all(x['status']=='passed' for x in r['routes']) else 'failed')
  out['attempts'].append({'label':label,'recordedStatus':r['status'],'tooling':r['tooling'],'routes':routes,'recordedComparisons':r['comparisons']})
 for file in sorted(p for p in A.rows if p.endswith('.png') and '/pose-' in p):
  w,h,top,bottom=png.png_rgba(A.B(file));m=A.J(file.removesuffix('.png')+'.json');assert (w,h)==(m['width'],m['height']) and H(bottom)==m['pixelSha256'];decoded.append({'file':file,'readPixelsSha256':H(bottom),'width':w,'height':h})
 out['decodedPngs']=decoded
 first='chess-correctness-001/original/pose-0-repeat-0';second='chess-correctness-002/original/pose-0-repeat-0';candidate='chess-correctness-002/prepared-js/pose-0-repeat-0'
 assert A.J(first+'.json')==A.J(second+'.json') and A.B(first+'.png')==A.B(second+'.png');diff=compare(A.J(second+'.json'),A.J(candidate+'.json'));image=png.compare_png(A.B(second+'.png'),A.B(candidate+'.png'))
 assert len(diff['numericDifferences'])==11 and all(2142<=r['index']<2158 for r in diff['numericDifferences']);assert image['changedPixels']==91610 and image['changedChannels']==274520 and image['maxAbsoluteChannelDelta']==255
 out['initialChessCrossRoute']={'originalFreshPagesExactlyEqual':True,'numericAndContract':diff,'image':image,'scope':'The preserved initial candidate view has a different camera. Equal scene numbers do not make this an equal-camera renderer comparison. Cause is not inferred from endpoints.'}
 out['limitations']=['Failed application gates remain failed; subsequent diagnoses do not rewrite them.','This audit does not execute native app interactions or assign candidate causality to an endpoint mismatch.','Bistro import texture failures and native action timeout are preserved separately; they do not qualify CPU profiling or prove permanent content incompatibility.','Large original assets and ZIP payloads are omitted. Source/preparation manifests and earlier independent ZIP verification remain bound.','No hardware performance, Rust benefit, CPU headroom, frame rate or adoption qualification follows.']
 return out

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--archive',type=Path,default=ROOT);p.add_argument('--out',type=Path);p.add_argument('--extract',type=Path);a=p.parse_args();report=verify(a.archive)
 if a.out:
  with a.out.open('x') as f:json.dump(report,f,indent=2,allow_nan=False);f.write('\n')
 if a.extract:s.Archive(a.archive).extract(a.extract)
 print(json.dumps({'status':report['status'],'logicalFiles':report['logicalFiles'],'physicalBlobs':report['physicalBlobs'],'attempts':len(report['attempts']),'decodedPngs':len(report['decodedPngs'])}))
