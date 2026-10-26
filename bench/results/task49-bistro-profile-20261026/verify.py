"""Independent offline Bistro capture, strict-failure and secondary-count audit.
No browser, JavaScript analyzer, source repair, synthetic replacement or filtering.
"""
from pathlib import Path
from collections import Counter,defaultdict
import argparse,gzip,hashlib,importlib.util,json,math,re,sys
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parent

def module(name):
 spec=importlib.util.spec_from_file_location(name,ROOT/(name+'.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
p=module('profile_audit');c=module('counts_audit');png=module('png');builder=module('archive');content=module('content_audit')
H=p.H
CAPTURES=['smoke-ac-failure','smoke','engine-full','migration-full'];VIRTUAL=Path('/archive')

def raw_profile(data):
 profile=json.loads(data);nodes={r['id']:r for r in profile['nodes']};assert len(nodes)==len(profile['nodes']) and nodes;parents={}
 for row in nodes.values():
  for child in row.get('children',[]):assert child in nodes and child not in parents;parents[child]=row['id']
 roots=set(nodes)-set(parents);assert len(roots)==1;seen=set();stack=list(roots)
 while stack:
  node=stack.pop();assert node not in seen;seen.add(node);stack+=nodes[node].get('children',[])
 assert set(nodes)==seen;ids=profile['samples'];deltas=profile['timeDeltas'];assert ids and len(ids)==len(deltas) and all(x in nodes for x in ids) and all(type(x) in (int,float) and math.isfinite(x) for x in deltas)
 return profile,nodes,parents,{'sha256':H(data),'samples':len(ids),'nodes':len(nodes),'negativeIntervals':[{'sampleIndex':i,'nodeId':ids[i],'rawTimeDelta':d} for i,d in enumerate(deltas) if d<0],'zeroIntervals':sum(d==0 for d in deltas),'scope':'Structural/raw timestamp inventory only; no time-weight qualification.'}

def compare(a,b):
 differences=[];maximum=0;failures=0;assert len(a['numeric'])==len(b['numeric'])
 for x,y in zip(a['numeric'],b['numeric']):
  assert math.isfinite(x) and math.isfinite(y);maximum=max(maximum,abs(x-y));failures+=abs(x-y)>1e-10+1e-12*abs(x)
 if failures:differences.append({'field':'numeric','count':failures,'maxAbsoluteDifference':maximum})
 for field in ['objects','clips','state','actions']:
  if a[field]!=b[field]:differences.append({'field':field})
 for name in ['main','axes']:
  for field in ['width','height','pixelSha256','quality','work']:
   if a['renderers'][name][field]!=b['renderers'][name][field]:differences.append({'field':name+'.'+field})
 layout=a['captureLayout']==b['captureLayout']
 if not layout:differences.append({'field':'captureLayout'})
 return {'equal':not differences,'differences':differences,'maxAbsoluteDifference':maximum,'numericValues':len(a['numeric']),'layoutEqual':layout}

def source_inventory(A,run):
 rows=A.J(run+'/captured-sources.json');served={x['file']:x for x in A.J(run+'/served-files.json')};remote={x['url']:x for x in A.J(run+'/network.json') if x.get('mirrored')}
 for r in rows:
  b=A.B(run+'/'+r['file']);assert H(b)==r['sha256'] and len(b)==r['bytes'];pin=served.get(r['label']) if r['url'].startswith('<origin>/') else remote.get(r['url']);assert pin and pin['sha256']==H(b)
 ad=A.J(run+'/adaptation.json');assert ad['appPin']==p.APP and (not ad['instrumentation'] or ad['instrumentation']=='none')
 for version in ['original','served']:
  b=A.B(run+'/index.'+version+'.html');assert H(b)==ad['index'][version+'Sha256']
 if not ad['externalized']:assert A.B(run+'/index.original.html')==A.B(run+'/index.served.html')
 assert A.J(run+'/integrity.json')['unchanged'] and A.J(run+'/errors.json')==[]
 for name in ['main','axes']:
  gpu=A.J(run+'/gpu-'+name+'.json');assert 'Apple M4 Pro' in gpu['renderer'] and 'Metal' in gpu['renderer'] and 'SwiftShader' not in gpu['renderer']
 for file in ['content-transport-preflight.json','content-transport-before-close.json','content-transport.json']:
  t=A.J(run+'/'+file);assert t['strict'] and not t['failures'] and not t['consoleErrors'] and not t['mountedRequests'];assert t['input']==A.J(run+'/input.json')
 data=A.J(run+'/input.json');assert not data['assetBytesChanged'] and data['kind']=='native-file-input ZIP' and data['zip']['sha256']=='f1a2bcf7049544081bb3a09586ef8802532a59ca1536029a72cb6ab03ba71141'
 readiness=A.J(run+'/content-readiness.json');assert readiness['contextsLost']==[False,False] and len(readiness['clips'])==13 and all(x['ready'] for x in readiness['textures']);assert len(set(x['imageIndex'] for x in readiness['textures']))==405
 return {'capturedSourceFiles':len(rows),'debuggerSourceInventoryAvailable':A.exists(run+'/profile-scripts.json'),'sourceMapInventoryAvailable':A.exists(run+'/source-map-capture.json'),'strictContentTransportPass':True,'decodedImageDefinitions':405,'authoredClips':13}

def oracles(A,label,m):
 result=[];reference={};native={};scenario=m['cases'][0];decoded=0
 for entry in m['oracles']:
  assert entry['status']=='passed';run=label+'/'+entry['directory'];source=source_inventory(A,run);rows=[]
  for i,pose in enumerate([.25,.75]):
   name='oracle-'+str(pose);current=A.J(run+'/'+name+'.json');key=pose
   if key not in reference:assert entry['engine']==('pure-r186' if m['group']=='engine' else 'original-r176') and not entry['observed'];reference[key]=current
   delta=compare(reference[key],current);record=entry['referenceComparisons'][i]
   for k,v in delta.items():assert record[k]==v,(k,record[k],v)
   strict=m['group']=='engine' or entry['engine']!='pure-r186';assert record['strict']==strict
   if strict:assert delta['equal']
   if entry['observed']:
    d=compare(native[(entry['engine'],pose)],current);assert d['equal'];rec=entry['instrumentationComparisons'][i]
    for k,v in d.items():assert rec[k]==v
   else:native[(entry['engine'],pose)]=current
   for renderer in ['main','axes']:
    file=run+'/'+name+'-'+renderer+'.png';r=current['renderers'][renderer]
    if A.exists(file):w,h,top,bottom=png.png_rgba(A.B(file));assert (w,h)==(r['width'],r['height']) and H(bottom)==r['pixelSha256'];decoded+=1
    else:assert renderer=='axes' and not scenario['grid'] and r['width']*r['height']==0 and r['imageUnavailable']
   rows.append({'pose':pose,'strictReferenceEquality':strict,**delta})
  result.append({'engine':entry['engine'],'observer':entry['observed'],'source':source,'poses':rows})
 return result,decoded

def counts(A,label,count_label,weighted_label):
 summary=A.J(count_label+'/summary.json');weighted=A.J(weighted_label+'/summary.json');manifest=A.J(label+'/manifest.json');assert summary['method']=='counts-only-secondary' and not summary['performanceQualification'];assert summary['historicalWeightedIntegrity']=='unchanged' and summary['historicalWeightedGate']['verdictUnchanged'];assert summary['historicalWeightedGate']['summarySha256']==H(A.B(weighted_label+'/summary.json'));assert summary['historicalWeightedGate']['status']==weighted['status'] and summary['historicalWeightedGate']['failedRuns']==len(weighted['analysisFailures'])
 for tool in [summary['analysisTool'],weighted['analysisTool']]:
  assert not tool['dirty']
  for f,h in tool['hashes'].items():assert H(A.B('tool-sources/'+tool['sha']+'/'+f))==h
 proof=manifest['preparedManifestFiles']['native'];prepared_bytes=A.B(label+'/'+proof['file']);assert H(prepared_bytes)==proof['sha256'];prepared=json.loads(prepared_bytes)
 def read(path):return A.B(path.relative_to(VIRTUAL).as_posix())
 c.read=read;c.load=lambda path:json.loads(read(path));c.map_cache={}
 lookup={(r['scenario'],r['round'],r['engine']):r for r in summary['runs']};results=[]
 for entry in manifest['runs']:
  key=(entry['scenario'],entry['round'],entry['engine']);row=lookup.get(key)
  if entry['status']!='captured':assert row is None;continue
  assert row;run=label+'/'+entry['directory'];b=A.B(run+'/profile.cpuprofile');raw,nodes,parents,inventory=raw_profile(b);report=A.J(count_label+'/'+row['file']);assert report['rawProfile']['sha256']==H(b) and report['rawProfile']['integrity']=='unchanged';assert report['sampleNodeIds']==raw['samples'];assert [n['id'] for n in report['nodes']]==[n['id'] for n in raw['nodes']]
  records={n['id']:n for n in report['nodes']};own=Counter(raw['samples']);inclusive=Counter();cats=Counter();contexts=Counter();coverage=Counter()
  for node,n in records.items():
   assert 'selfMs' not in n and 'inclusiveMs' not in n;assert n['callFrame']==nodes[node]['callFrame'] and n['parentId']==parents.get(node) and n['selfHits']==own[node] and n['children']==nodes[node].get('children',[]);assert n['category']==c.category(n);trail=[];cursor=node
   while cursor is not None:assert cursor not in trail;trail.append(cursor);inclusive[cursor]+=own[node];cursor=parents.get(cursor)
   context=next((c.work_category(records[x]['label'],(records[x].get('source') or {}).get('file','')) for x in trail if records[x]['sourceStatus']=='verified-js' and c.work_category(records[x]['label'],(records[x].get('source') or {}).get('file',''))),'unresolved context');assert n['contextCategory']==context;cats[n['category']]+=own[node];contexts[context]+=own[node];coverage[n['sourceStatus']]+=own[node]
  for node,n in records.items():assert type(n['selfHits']) is int and type(n['inclusiveHits']) is int and n['inclusiveHits']==inclusive[node]
  for values,key in [(cats,'buckets'),(contexts,'contextBuckets'),(coverage,'sourceCoverage')]:assert {k:v for k,v in values.items() if v}==c.plain(report[key]) and row[key]==report[key] and sum(values.values())==len(raw['samples'])
  assert report['rawTiming']['negativeEntries']==inventory['negativeIntervals'] and report['rawTiming']['negativeCount']==len(inventory['negativeIntervals']) and report['rawTiming']['zeroCount']==inventory['zeroIntervals'];assert row['rawTiming']==report['rawTiming'];assert report['totalHits']==row['totalHits']==len(raw['samples'])
  excluded=['idle','program/native-unresolved','root'];assert report['activeDenominatorExcludes']==row['activeDenominatorExcludes']==excluded;assert report['activeHits']==row['activeHits']==len(raw['samples'])-sum(cats[x] for x in excluded)
  for k in ['inputSamples','exclusiveNodeHits','categoryHits','contextHits','sourceCoverageHits','rootInclusiveHits']:assert report['accounting'][k]==len(raw['samples'])
  assert report['accounting']['allSamplesAccounted'] and report['rawTiming']['minimumDelta']==min(raw['timeDeltas']) and report['rawTiming']['maximumDelta']==max(raw['timeDeltas']);assert report['rawTiming']['startTime']==raw['startTime'] and report['rawTiming']['endTime']==raw['endTime'] and report['rawTiming']['timeDeltaCount']==len(raw['samples'])
  previous=report['historicalWeightedRun'];failure_bytes=A.B(weighted_label+'/'+previous['file']);failure=json.loads(failure_bytes);assert H(failure_bytes)==previous['sha256'] and previous['rawProfileSha256']==H(b);assert previous['status']=='analysis-failed' and failure['status']=='analysis-failed' and not failure['candidateQualification'] and failure['rawProfile']['sha256']==H(b);assert 'Invalid sample timeDelta' in failure['error']['message'] and inventory['negativeIntervals']
  source=c.source_audit(VIRTUAL/run,report,prepared,proof);results.append({'engine':entry['engine'],'round':entry['round'],'sequence':entry['sequence'],'samples':len(raw['samples']),'negativeIntervals':len(inventory['negativeIntervals']),'sourceAudit':source,'rawProfileSha256':H(b),'exclusiveCounts':c.plain(report['buckets']),'contextCounts':c.plain(report['contextBuckets']),'sourceCounts':c.plain(report['sourceCoverage'])})
 assert len(results)==len(summary['runs']);return {'status':summary['status'],'strictWeightedStatus':weighted['status'],'weightedFailures':len(weighted['analysisFailures']),'unprocessed':summary['unprocessed'],'runs':results,'scope':'Integer observation counts only; no sampled milliseconds or route-speed ranking.'}

def ledger(A,label):
 audit=A.J(label+'/audit.json');assert audit['status']=='pass';by_source={r['sourcePath']:r for r in A.files.values()};rows=audit['inputFiles']
 for r in rows:
  archived=by_source[r['file']];assert archived['sourceSha256']==r['sha256'] and archived['sourceBytes']==r['bytes']
 if A.exists(label+'/support-files.json'):
  support=A.J(label+'/support-files.json')
  for r in support['files']:
   record=A.files[label+'/'+r['file']];assert record['sourceSha256']==r['sha256'] and record['sourceBytes']==r['bytes']
 return {'status':audit['status'],'inputHashesBound':len(rows),'auditSha256':H(A.B(label+'/audit.json'))}

def verify(root):
 support_file=root/'derived-files.json'
 if support_file.exists():
  support=json.loads(support_file.read_text());actual={str(f.relative_to(root)) for f in root.rglob('*') if f.is_file() and 'blobs' not in f.relative_to(root).parts and f.name!='derived-files.json'};assert actual=={x['file'] for x in support['files']}
  for r in support['files']:
   p.safe(r['file']);data=(root/r['file']).read_bytes();assert H(data)==r['sha256'] and len(data)==r['bytes']
 A=p.Archive(root);capture_results=[];all_profiles=[];pngs=0;numeric=0
 assert [x['label'] for x in A.index['inputs']]==builder.NAMES
 for label in CAPTURES:
  m=A.J(label+'/manifest.json');assert m['sourceIntegrity']=='passed' and m['candidateSha']==p.RUNTIME;assert m['sourceBefore']==m['sourceAfter'] and all(not x['dirty'] for x in m['sourceBefore'].values());assert m['sourceBefore']['viewer']['sha']==p.APP and m['sourceBefore']['candidate']['sha']==p.RUNTIME
  for f,h in m['toolHashes'].items():assert H(A.B('tool-sources/'+m['sourceBefore']['tooling']['sha']+'/'+f))==h
  config=m['configuration'];assert m['config']==config and config['isolated'] and config['profiling'] and not config['gpuQueriesInWindow'] and config['pageDpr']==1 and config['networkDiagnostic']=='playwright' and config['strictContent'];assert config['samplingIntervalUs']==100 and config['prePostObservationSeconds']==2
  if label=='smoke-ac-failure':
   assert m['status']=='failed' and m['oracles']==[] and m['runs']==[] and any('AC power' in e for e in m['errors']);capture_results.append({'label':label,'status':m['status'],'oracleEntries':0,'profileEntries':0,'errors':m['errors'],'environmentGate':'AC preflight failed before browser capture'});continue
  for when in ['Before','After']:
   proof=m['environment'+when];assert proof['verifiedAC'];env=A.J(label+'/'+proof['file']);assert 'AC Power' in env['power']['output']
  assert m['browser']['executablePath']=='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';assert m['browser']['version']['product']=='Chrome/155.0.8059.86';assert m['browser']['systemInfo']['gpu']['auxAttributes']['displayType']=='ANGLE_METAL'
  expected=next(x for x in m['assets'] if x['id']=='bistro')['expected'];scenario=m['cases'][0];assert len(m['cases'])==1 and scenario['id']=='bistro-native-first-clip' and scenario['nativeDefaultClip'] and scenario['clipTargetCount']==1 and scenario['pixelRatio']==1 and not scenario['grid']
  if m['protocol']:
   proof=m['protocol'];assert H(A.B('protocols/'+Path(proof['file']).name))==proof['sha256'];assert config['warmupFrames']==600 and config['seconds']==12 and config['repeats']==3
  else:assert config['warmupFrames']==60 and config['seconds']==2 and config['repeats']==1
  pairs,count=oracles(A,label,m);pngs+=count;numeric+=sum(x['numericValues'] for r in pairs for x in r['poses'])
  for entry in [*m['oracles'],*m['runs']]:
   path=label+'/'+entry['directory'];r=content.readiness(expected,A.J(path+'/content-readiness.json'));assert not r['issues'],r['issues']
  runs=[]
  for entry in m['runs']:
   path=label+'/'+entry['directory'];source=source_inventory(A,path);raw,nodes,parents,inv=raw_profile(A.B(path+'/profile.cpuprofile'));row={'engine':entry['engine'],'sequence':entry['sequence'],'round':entry['round'],'status':entry['status'],'raw':inv,'source':source}
   pm=A.J(path+'/profile-manifest.json');assert pm['candidateSha']==p.RUNTIME and pm['toolSha']==m['sourceBefore']['tooling']['sha'];assert pm['engine']==entry['engine'] and pm['scenario']==scenario
   if entry['status']=='captured':
    row['windows']={f:p.window(A.J(path+'/'+f+'.json'),scenario,entry['engine']) for f in ['before-window','profile-observations','after-window']};assert source['debuggerSourceInventoryAvailable'] and source['sourceMapInventoryAvailable'];p.source_audit(A,path)
   else:
    assert label=='migration-full' and entry['engine']=='external-r176';after=A.J(path+'/after-window.json');assert 'Viewer activity changed' in after['validationError']['message'] if isinstance(after['validationError'],dict) else 'Viewer activity changed' in after['validationError'];assert len(after['after']['activity'])>len(after['before']['activity']);assert not source['debuggerSourceInventoryAvailable'] and not source['sourceMapInventoryAvailable'];row['exclusion']='Failed after-window activity gate; raw sample inventory only. Debugger source and source-map inventories absent; no attribution reconstructed.'
   runs.append(row);all_profiles.append(row)
  capture_results.append({'label':label,'status':m['status'],'toolSha':m['sourceBefore']['tooling']['sha'],'configuration':config,'oracleEntries':len(pairs),'oracles':pairs,'profileEntries':len(runs),'runs':runs,'errors':m['errors'],'browser':m['browser']['version']['product'],'GPU':'Apple M4 Pro / ANGLE Metal','environmentBefore':m['environmentBefore'],'environmentAfter':m['environmentAfter']})
 smoke=A.J('smoke-partial-weighted/analysis-attempt.json');assert smoke['status']=='failed' and smoke['exitCode']==1 and not smoke['summaryProduced'] and not A.exists('smoke-partial-weighted/summary.json');sm=A.J('smoke/manifest.json');sr=sm['runs'][0];weighted=p.audit_profile(A,'smoke','smoke/'+sr['directory'],'smoke-partial-weighted/'+smoke['retainedPartialOutput'])
 for source,h in A.J('smoke-partial-weighted/smoke-input-audit.json')['inputSha256'].items():assert next(x for x in A.files.values() if x['sourcePath']==source)['sourceSha256']==h
 engine=counts(A,'engine-full','engine-counts','engine-strict');migration=counts(A,'migration-full','migration-counts','migration-strict');assert len(engine['runs'])==9 and sum(x['samples'] for x in engine['runs'])==803950 and sum(x['negativeIntervals'] for x in engine['runs'])==75;assert len(migration['runs'])==1 and migration['runs'][0]['samples']==102477 and migration['status']=='incomplete-capture'
 independent={label:ledger(A,label) for label in ['engine-count-audit','migration-count-audit']}
 assert len(all_profiles)==14 and len(capture_results)==4 and sum(x['oracleEntries'] for x in capture_results)==18
 return {'status':'pass','scope':'Offline identity, failure preservation, fixed image/numeric oracles, raw profile structure and secondary observation-count audit; not a performance qualification.','runtimeIdentity':p.RUNTIME,'viewerIdentity':p.APP,'logicalFiles':len(A.files),'uniqueBlobs':len(A.blobs),'originalCaptureDirectories':4,'rawProfiles':len(all_profiles),'retainedCapturedProfiles':sum(x['status']=='captured' for x in all_profiles),'failedRawProfiles':sum(x['status']!='captured' for x in all_profiles),'rawSamples':sum(x['raw']['samples'] for x in all_profiles),'decodedPNGs':pngs,'fixedPoseNumericValues':numeric,'captures':capture_results,'smokePartialWeighted':weighted,'engineSecondaryCounts':engine,'migrationSecondaryCounts':migration,'independentAudits':independent,'limits':['Full weighted engine analysis fails all nine profiles and remains failed.','Migration is incomplete; one original count report and one excluded external raw profile do not form a route comparison.','The smoke weighted pure report is a tooling check, not an outcome selected for comparison.','Secondary counts do not measure time, speed, FPS, GPU cost or headroom.','AST function ownership labels are recorded analyzer output; byte binding and exact map positions are independently verified, not reparsed with a second AST implementation.','Huge ZIP and source asset bytes are excluded. Their recorded identities and prior ZIP audit are included; this verifier does not reacquire them.']}

if __name__=='__main__':
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('archive',nargs='?',type=Path,default=ROOT);ap.add_argument('--output',type=Path);args=ap.parse_args();result=verify(args.archive)
 if args.output:
  with args.output.open('x') as f:json.dump(result,f,indent=2);f.write('\n')
 print(json.dumps({k:result[k] for k in ['status','logicalFiles','uniqueBlobs','rawProfiles','rawSamples','decodedPNGs','fixedPoseNumericValues']}))
