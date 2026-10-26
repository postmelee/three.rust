"""Independent content/transport evidence audit; no browser or asset downloads.
Checks archived bytes and recorded observations. It does not reproduce browser IO
or digest absent native ArrayBuffers and does not turn failed gates into passes.
"""
from pathlib import Path
import argparse,collections,gzip,hashlib,importlib.util,json,math,posixpath,re,struct,sys
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('archive_builder',Path(__file__).with_name('archive.py'));builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
H=lambda b:hashlib.sha256(b).hexdigest()
RUNTIME='85e2c5d500edb0b92ea4ecb997087fded3fed45b';VIEWER='b5ee5dafe27f953ae1b55f42b5fa3697fef08683'
def safe(p):return builder.safe(p)
def near(a,b):assert isinstance(a,(int,float)) and isinstance(b,(int,float)) and math.isfinite(a) and math.isfinite(b) and abs(a-b)<=1e-8+1e-12*abs(b),(a,b)
class Archive:
    def __init__(self,root):
        self.root=root;self.index=json.loads((root/'archive-index.json').read_text());self.rows={};self.blobs={}
        assert self.index['format']==1 and json.loads((root/'build-status.json').read_text())['status']=='complete'
        for e in self.index['files']:
            p=safe(e['path']);safe(e['sourcePath']);assert p not in self.rows;assert e['blob']=='blobs/'+e['decodedSha256']+'.gz'
            file=root/safe(e['blob']);assert not file.is_symlink() and file.resolve().is_relative_to(root.resolve())
            if e['blob'] not in self.blobs:
                z=file.read_bytes();assert len(z)<builder.MAX and H(z)==e['storedSha256'] and len(z)==e['storedBytes'];b=gzip.decompress(z);assert len(b)<builder.MAX;self.blobs[e['blob']]=b
            b=self.blobs[e['blob']];assert H(b)==e['decodedSha256'] and len(b)==e['decodedBytes']
            if not e['normalizations']:assert e['decodedSourceSha256']==e['decodedSha256']
            if p.startswith('notices/'):
                visible=(root/p).read_bytes();assert H(visible)==(e['sourceSha256'] if e['sourceGzip'] else e['decodedSha256'])
            self.rows[p]=e
        assert set(p.name for p in (root/'blobs').iterdir())=={Path(x).name for x in self.blobs}
        assert [x['label'] for x in self.index['inputs']]==builder.NAMES
        for item in self.index['inputs']:assert sum(p.startswith(item['label']+'/') for p in self.rows)==item['files']
        if (root/'derived-files.json').exists():
            for row in json.loads((root/'derived-files.json').read_text())['files']:
                p=root/safe(row['file']);assert not p.is_symlink();b=p.read_bytes();assert len(b)==row['bytes'] and H(b)==row['sha256'],'Support file changed: '+row['file']
    def B(self,p):return self.blobs[self.rows[safe(p)]['blob']]
    def J(self,p):return json.loads(self.B(p))
    def exists(self,p):return p in self.rows
    def extract(self,out):
        assert not out.exists();out.mkdir(parents=True)
        for p,row in self.rows.items():
            f=out/safe(p);f.parent.mkdir(parents=True,exist_ok=True);b=self.B(p)
            with f.open('xb') as stream:stream.write(gzip.compress(b,mtime=0) if row['sourceGzip'] else b)

def snapshot_difference(a,b):
    differences=[];maximum=0
    if len(a['numeric'])!=len(b['numeric']):differences.append('numericLength')
    bad=0
    for x,y in zip(a['numeric'],b['numeric']):
        assert math.isfinite(x) and math.isfinite(y);delta=abs(x-y);maximum=max(maximum,delta)
        if delta>1e-10+1e-12*abs(x):bad+=1
    if bad:differences.append('numeric')
    for key in ['objects','clips','state','actions']:
        if a[key]!=b[key]:differences.append(key)
    for name in ['main','axes']:
        for key in ['width','height','pixelSha256','quality','work']:
            if a['renderers'][name][key]!=b['renderers'][name][key]:differences.append(name+'.'+key)
    return {'equal':not differences,'differences':differences,'numericValues':len(a['numeric']),'numericFailures':bad,'maximumAbsoluteDifference':maximum}

def source_audit(A,base,route,sha):
    ad=A.J(base+'/adaptation.json');assert ad['appPin']==VIEWER and ad['route']==route and ad['tooling']['sha']==sha and not ad['tooling']['dirty']
    assert ad['runtimeSha']==(None if route.endswith('r176') else RUNTIME)
    original=A.B(base+'/index.original.html');served=A.B(base+'/index.served.html');assert H(original)==ad['index']['originalSha256'] and H(served)==ad['index']['servedSha256']
    if not ad['externalized']:assert original==served
    else:
        if route.startswith('prepared-'):imports={'three':'/__viewer_candidate__/'+('prepared.js' if 'wasm' in route else 'prepared-js.js'),'three/addons/':'/__viewer_candidate__/addons/'}
        else:imports={'three':'/__viewer_runtime__/build/three.module.js','three/addons/':'/__viewer_runtime__/examples/jsm/'}
        injection='<head>\n\t<script type="importmap">'+json.dumps({'imports':imports},separators=(',',':'))+'</script>'
        assert original.count(b'<head>')==1 and original.replace(b'<head>',injection.encode())==served
    for row in ad['tooling']['files']:
        b=A.B('tool-sources/'+sha+'/'+row['file'].removeprefix('tooling/'));assert H(b)==row['sha256'] and len(b)==row['bytes']
    sources=A.J(base+'/captured-sources.json');sf={x['file']:x for x in A.J(base+'/served-files.json')};network=A.J(base+'/network.json');mirrors={x['url']:x for x in network if x.get('mirrored')};seen=set()
    for row in sources:
        assert row['url'] not in seen;seen.add(row['url']);b=A.B(base+'/'+safe(row['file']));assert H(b)==row['sha256'] and len(b)==row['bytes']
        ref=sf.get(row['label']) if row['url'].startswith('<origin>/') else mirrors.get(row['url']);assert ref and ref['sha256']==H(b) and ref['bytes']==len(b)
    integrity=A.J(base+'/integrity.json');assert integrity['unchanged'] and integrity['error'] is None
    environment=A.J(base+'/environment.json');assert environment['headed'] and environment['route']==route
    assert isinstance(environment['isolated'],bool)  # Correctness diagnostics are not isolated primary timing.
    contexts={}
    for name in ['main','axes']:
        if A.exists(base+'/gpu-'+name+'.json'):
            gpu=A.J(base+'/gpu-'+name+'.json');assert 'Apple M4 Pro' in gpu['renderer'] and 'Metal' in gpu['renderer'] and 'SwiftShader' not in gpu['renderer'];contexts[name]=gpu
    return {'capturedSources':len(sources),'helperFiles':len(ad['tooling']['files']),'htmlExact':True,'integrity':integrity,'browserEnvironment':environment,'gpuContexts':contexts,'helperErrors':A.J(base+'/errors.json'),'blockedRequests':[x for x in network if x.get('blocked')]}

def readiness(expected,observed):
    # Keep version-dependent observations explicit. Early captures used association
    # indices; later captures additionally preserve original node names/relations.
    issues=[]
    check=lambda ok,label:issues.append(label) if not ok else None
    check(observed['contextsLost']==[False,False],'contextsLost')
    for key,field in [('materialIndices','index'),('imageIndices','imageIndex')]:
        rows=observed['materials'] if key=='materialIndices' else observed['textures'];actual=sorted(set(x[field] for x in rows));check(actual==expected[key],key)
    check(all(x['ready'] for x in observed['textures']),'decodedTextureReadiness')
    clips=[{'name':x['name'],'tracks':x['tracks']} for x in observed['clips']];want=[{'name':x['nativeName'],'tracks':x['channels']} for x in expected['animations']];check(clips==want,'authoredClips')
    counts={'sourceNodes':expected['nodes'],'observedNodeAssociationIndices':len(observed['nodeIndices']),'materials':len(set(x['index'] for x in observed['materials'])),'decodedImageDefinitions':len(set(x['imageIndex'] for x in observed['textures'])),'clips':len(observed['clips'])}
    if 'nodeRecords' in expected and 'nodeRecords' in observed:
        actual={x['name']:x for x in observed['nodeRecords']};check(len(actual)==len(observed['nodeRecords']),'duplicateNodeName');check(set(actual)=={x['name'] for x in expected['nodeRecords']},'nodeNames')
        for row in expected['nodeRecords']:
            got=actual.get(row['name'])
            if got is None:continue
            for key in ['parentName','childNames','meshIndex','primitives']:check(got[key]==row[key],'node.'+row['name']+'.'+key)
            if not row['animated']:
                keys=['matrix'] if row['matrix'] else ['translation','rotation','scale']
                for key in keys:
                    if len(got[key])!=len(row[key]) or any(not math.isfinite(x) or abs(x-y)>1e-10+1e-12*abs(y) for x,y in zip(got[key],row[key])):issues.append('node.'+row['name']+'.'+key)
        for row in expected['materials']:
            for got in [x for x in observed['materials'] if x['index']==row['index']]:
                check([x['slot'] for x in got['textureSlots']]==[x['slot'] for x in row['textureSlots']],'materialSlots')
                for wanted in row['textureSlots']:
                    matches=[x for x in got['textureSlots'] if x['slot']==wanted['slot']]
                    if not matches:continue
                    for key in ['imageIndex','imageURI','sampler','texCoord','offset','scale','rotation','flipY','colorTransfer']:check(matches[0][key]==wanted[key],'texture.'+key)
                for key in ['transmission','thickness']:check(got[key]==row[key],'material.'+key)
                if row['hasVolume']:
                    for key in ['attenuationDistance','attenuationColor']:check(got[key]==row[key],'material.'+key)
                if row['hasSpecular']:
                    for key in ['specularIntensity','specularColor']:check(got[key]==row[key],'material.'+key)
        counts['originalNameInstances']=len(actual)
    else:
        counts['originalNameInstanceAudit']='Unavailable in this older capture schema; association IDs are not unique node/material-image identity.'
        counts['oldNodeAssociationMismatch']=observed['nodeIndices']!=expected['nodeIndices']
        counts['oldTextureAssociationMismatch']=sorted(set(x['index'] for x in observed['textures']))!=expected['textureIndices']
    return {'issues':issues,'counts':counts}

def network_audit(A,base):
    before_path=base+'/cdp-network-before-close.json';after_path=base+'/cdp-network-after-close.json'
    if not A.exists(before_path):return {'available':False,'reason':'No passive CDP snapshot in this source revision; native event evidence retained.'}
    before=A.J(before_path)['events'];after=A.J(after_path)['events'];assert after[:len(before)]==before
    byid=collections.defaultdict(list)
    for row in before:
        if 'requestId' in row:byid[row['requestId']].append(row)
    failures=[x for x in before if x['event']=='Network.loadingFailed'];late=[x for x in after[len(before):] if x['event']=='Network.loadingFailed']
    requests={key:next((x for x in rows if x['event']=='Network.requestWillBeSent'),None) for key,rows in byid.items()}
    content_failures=[]
    for event in failures:
        req=requests[event['requestId']];url=req['request']['url'] if req else None
        if url and '/__viewer_content__/' in url:content_failures.append({'url':url,'error':event['errorText'],'canceled':event['canceled'],'timestamp':event['timestamp'],'phaseAtReceipt':event['phaseAtReceipt'],'requestId':event['requestId']})
    return {'available':True,'beforeCloseEvents':len(before),'afterCloseEvents':len(after),'beforeCloseLoadingFailed':len(failures),'afterCloseAdditionalLoadingFailed':len(late),'contentFailures':content_failures,'allBeforeCloseFailures':failures}

def framing(A,base,content,record,events):
    if not A.exists(base+'/content-response-framing.json'):return None
    rows=A.J(base+'/content-response-framing.json');files={x['file']:x for x in content['files']};c=A.J(base.rsplit('/',1)[0]+'/result.json')['transportDiagnostic']['contentLength'];raw=A.J(base+'/cdp-network-before-close.json')['events'];response={r['requestId']:r for r in raw if r['event']=='Network.responseReceived'}
    for row in rows:
        item=files[row['file']];r=response[row['requestId']];assert row['headers']==r['response']['headers'] and row['status']==r['response']['status'];assert row['expectedBytes']==item['bytes'];h=row['headers'];matched=row['status']==200 and ((h.get('content-length')==str(item['bytes']) and 'transfer-encoding' not in h) if c else ('content-length' not in h and h.get('transfer-encoding')=='chunked'));assert row['matched']==matched
    expected={'framing':'content-length' if c else 'default-chunked','responses':len(rows),'uniqueOriginalResources':len(set(r['file'] for r in rows)),'allMatched':bool(rows) and all(r['matched'] for r in rows)};assert expected==record['transportHeaders'];assert expected['uniqueOriginalResources']==len(files)
    return expected

def caches(A,base,content,record):
    if not A.exists(base+'/native-cache-checksums.json'):return None
    rows=A.J(base+'/native-cache-checksums.json');assert rows==record['nativeCacheChecksums'];files={x['file']:x for x in content['files']}
    for row in rows:
        pin=files[row['file']];assert row['expectedBytes']==pin['bytes'] and row['expectedSha256']==pin['sha256']
        if row['status']=='hashed':assert row['matchesExpected']==(row['byteLength']==pin['bytes'] and row['sha256']==pin['sha256']);assert row['present'] and row['type']=='ArrayBuffer'
        else:assert row['status']=='unavailable' and row['matchesExpected'] is None
    return rows

def probe(A,label,result):
    base=label+'/original-r176';raw=A.J(base+'/cdp-network-before-close.json')['events'];observations=[];assert len(result['trials'])==4
    assert [x['method'] for x in result['trials']]==['native-fetch','file-loader','file-loader','native-fetch']
    for trial,saved in zip(result['trials'],result['observations']):
        payload=result['payload'];body=trial.get('body',{});good=body.get('status')=='fulfilled' and body.get('byteLength')==payload['bytes'] and body.get('sha256')==payload['sha256']
        requests=[x for x in raw if x['event']=='Network.requestWillBeSent' and x['request']['url']==trial['url']]
        terminal=[x for request in requests for x in raw if x.get('requestId')==request['requestId'] and x['event'] in ['Network.loadingFinished','Network.loadingFailed']]
        canceled=[x for x in terminal if x['event']=='Network.loadingFailed'];strict=good and len(requests)==1 and len(terminal)==1 and terminal[0]['event']=='Network.loadingFinished'
        assert saved['id']==trial['id'] and saved['method']==trial['method'] and saved['url']==trial['url']
        assert saved['bodyIntegrityMatch']==good and saved['strictTransportPass']==strict and saved['requestCount']==len(requests) and saved['terminalCount']==len(terminal) and saved['canceledEvents']==canceled
        for request,observed in zip(requests,saved['requests']):
            assert observed['request']==request;matching=[x for x in raw if x.get('requestId')==request['requestId'] and x['event']!='Network.requestWillBeSent'];assert observed['events']==matching
            endings=[x for x in matching if x['event'] in ['Network.loadingFinished','Network.loadingFailed']]
            for event,latency in zip(endings,observed['terminalRelativeToCallback']):
                expected=(event['timestamp']-request['timestamp']-((body['timeOrigin']+body['callback']['now'])/1000-request['wallTime']))*1000
                near(latency['latencyMs'],expected);assert latency['event']==event['event']
        if good:
            assert body['startNow']<=body['callback']['now']<=body['digestFinishedNow']<=body['endNow'];assert body['callback']['byteLength']==payload['bytes']
        pair=A.J(base+'/'+trial['id']+'.json');assert pair=={'trial':trial,'observation':saved}
        observations.append({'id':trial['id'],'bodyIntegrityMatch':good,'strictTransportPass':strict,'requests':len(requests),'terminals':len(terminal),'canceled':len(canceled),'bodyStatus':body.get('status'),'latenciesMs':[x['latencyMs'] for y in saved['requests'] for x in y['terminalRelativeToCallback']]})
    after=A.J(base+'/native-events-after-close.json');assert result['bodyVerificationPass']==all(x['bodyIntegrityMatch'] for x in observations)
    expected=all(x['strictTransportPass'] for x in observations) and not after['requestFailed'] and not result['helperErrors'] and result['status']=='collected';assert result['strictTransportPass']==expected
    assert result['applicationCorrectnessVerdict'] is False and result['existingFailedGatesUnchanged'] is True
    return {'observations':observations,'bodyVerificationPass':result['bodyVerificationPass'],'strictTransportPass':expected,'network':network_audit(A,base),'source':source_audit(A,base,'original-r176',result['tooling']['sha'])}

def guard(result):
    assert [r['mode'] for r in result['results']]==['proxy-playwright','proxy-cdp-remote'];expected=b'Pinned transport guard test payload\n'*1000
    rows=[]
    for record in result['results']:
        assert record['expectedHash']==H(expected) and record['passed'] and record['unexpectedConnections']==0
        trials=record['trials'];assert len(trials)==5
        for trial in trials[:2]:assert trial['status']==200 and trial['bytes']==len(expected) and trial['sha256']==H(expected)
        assert all(x['failed'] for x in trials[2:]);assert trials[1]['url']=='https://allowed.invalid/payload' and trials[2]['url']=='https://blocked.invalid/payload' and trials[3]['url']=='http://blocked.invalid/payload'
        origin=trials[0]['url'].removesuffix('/payload');assert origin.startswith('http://127.0.0.1:') and trials[4]['url'].startswith('http://127.0.0.1:') and not trials[4]['url'].startswith(origin+'/')
        assert record['proxyArgs'][1]=='--proxy-bypass-list=<-loopback>;'+origin
        assert all(x['action']=='denied-without-forwarding' for x in record['proxyBlocked'])
        assert all(x['url'].startswith('https://') for x in record['guardEvents'])
        if record['mode']=='proxy-cdp-remote':assert any(x['url']==trials[4]['url'] for x in record['proxyBlocked'])
        rows.append({'mode':record['mode'],'passed':True,'allowedPayloadBytes':len(expected),'allowedPayloadSha256':H(expected),'blockedTrials':3,'unexpectedConnections':0})
    return {'recordedResultHasToolSha':False,'ownerReportedExecutionToolSha':builder.GUARD_TOOL,'scope':'Owner recorded clean checkout invocation, separate from a tool SHA absent in result.json. Exact committed browser-test source retained.','results':rows}

def audit_gate(A,label,result):
    content=A.J(label+'/content.json');source=content['source'];assert result['source']==source and result['inputIntegrityUnchanged']
    manifest_name='bistro-fetch-manifest.json' if result['content']=='bistro' else 'beautiful-game-fetch-manifest.json';fb=A.B('asset-provenance/'+manifest_name);fetch=json.loads(fb)
    assert H(fb)==source['fetchManifestSha256'];is_bistro=result['content']=='bistro'
    assert fetch['pin' if is_bistro else 'sourcePin']==source['pin'];files={x['uri' if is_bistro else 'localPath']:x for x in fetch['files']}
    assert len(content['files'])==source['files'] and sum(x['bytes'] for x in content['files'])==source['bytes']
    for row in content['files']:
        pin=files[row['file']];assert row['sha256']==pin['sha256'] and row['bytes']==pin['bytes']
    routes=[]
    for record in result['routes']:
        route=record['route'];base=label+'/'+route;assert A.J(base+'/result.json')==record;provenance=source_audit(A,base,route,result['tooling']['sha'])
        native=A.J(base+'/native-events.json');assert isinstance(native['failed'],list)
        states={}
        for name in ['native-loaded','native-final','native-reloaded-fixed-history','partial-native-state']:
            if A.exists(base+'/'+name+'.json'):
                observed=A.J(base+'/'+name+'.json');states[name]=readiness(content['expected'],observed)
                if record['status']=='passed':assert not states[name]['issues'],states[name]
        pairs=[]
        for file in sorted(p for p in A.rows if p.startswith(base+'/authored-') and p.endswith('-0.json')):
            first=A.J(file);second=A.J(file.removesuffix('-0.json')+'-1.json');difference=snapshot_difference(first,second);assert difference['equal'],(file,difference)
            for name in ['main','axes']:
                a=A.B(file.removesuffix('.json')+'-'+name+'.png');b=A.B(file.removesuffix('-0.json')+'-1-'+name+'.png');assert a==b and a[:8]==b'\x89PNG\r\n\x1a\n';assert struct.unpack('>II',a[16:24])==(first['renderers'][name]['width'],first['renderers'][name]['height'])
            pairs.append({'case':Path(file).name.removesuffix('-0.json'),**difference,'pngPairEquality':True})
        if record['status']=='passed':assert not native['failed'] and not native['dialogs'] and not native['contextLoss'] and not native['crashes'] and not any(x['type']=='error' for x in native['console']);assert not provenance['helperErrors'] and not provenance['blockedRequests'];assert pairs
        net=network_audit(A,base);cache=caches(A,base,content,record);headers=framing(A,base,content,record,native)
        guard_record=A.J(base+'/network-guard.json') if A.exists(base+'/network-guard.json') else None
        if guard_record:
            assert guard_record['mode']==result['transportDiagnostic']['networkMode'];assert all(x['action']=='denied-without-forwarding' for x in guard_record['proxyBlocked']);assert all(x['url'].startswith('https://') for x in guard_record['remotePauses'])
            if guard_record['mode']=='proxy-playwright':assert guard_record['remotePauses']==[]
        if A.exists(base+'/live-animation.json'):
            live=A.J(base+'/live-animation.json')
            for key in ['autoplay','playAll']:
                row=live[key];assert row['afterTime']>row['beforeTime'] and row['renderFrameDelta']>2 and row['changedValues']>0
            assert all(x['running'] and x['weight']>0 for x in live['playAll']['actions'])
        routes.append({'route':route,'recordedStatus':record['status'],'source':provenance,'stateChecks':states,'fixedPairs':pairs,'nativeRequestFailed':native['failed'],'nativeConsoleErrors':[x for x in native['console'] if x['type']=='error'],'contextsLost':native['contextLoss'],'crashes':native['crashes'],'network':net,'nativeCacheChecksumObservations':cache,'framing':headers,'guardMode':guard_record['mode'] if guard_record else None,'recordedError':record.get('error'),'strictGatePreserved':True})
    assert result['status']==('passed' if all(x['status']=='passed' for x in result['routes']) and all(not x['requiredEqual'] or x['equal'] for x in result['comparisons']) else 'failed')
    return {'content':result['content'],'assetSource':source,'routes':routes,'sourceAssetsCopied':False}

def verify(root):
    A=Archive(root);report={'status':'verified','performanceEvidence':False,'logicalFiles':len(A.rows),'physicalBlobs':len(A.blobs),'attempts':[]}
    for item in A.index['inputs']:
        label=item['label'];result=A.J(label+'/result.json');row={'label':label,'recordedStatus':result.get('status'),'recordedToolSha':result.get('tooling',{}).get('sha'),'runtimeSha':result.get('runtimeSha')}
        if label=='network-guard-browser-001':row['guard']=guard(result)
        else:
            assert not result['tooling']['dirty'] and result['tooling']['sha']==item['recordedToolSha']
            if 'runtimeSha' in result:assert result['runtimeSha'] in [None,RUNTIME]
            for file in result['tooling']['files']:
                b=A.B('tool-sources/'+result['tooling']['sha']+'/'+file['file']);assert H(b)==file['sha256'] and len(b)==file['bytes']
            row['probe']=probe(A,label,result) if label=='transport-probe-001' else None
            if row['probe'] is None:row['gate']=audit_gate(A,label,result)
        report['attempts'].append(row)
    report['limitations']=['Every original gate/diagnostic disposition remains unchanged; diagnostic passes do not replace failed source gates.','Browser operation is not reproduced offline. Native BIN digest observations are checked against pinned manifests; original asset buffers are intentionally absent.','Older Chess gates used nonunique association indices; missing original-name/material-alias observations cannot be reconstructed from an older schema.','Repeated proxy-Playwright pass/fail demonstrates intermittent behavior. Proxy or CDP cancellation mechanism is unresolved; two CDP successes are bounded observations only.','Guard browser result lacks its own recorded tool SHA; the separately identified owner invocation and exact committed source are retained without inventing that field.','Before-close/after-close network records and caller-visible payload completion are distinct. Complete payload does not erase canceled/error events.','No large-scene candidate performance, whole-browser CPU, GPU throughput or FPS qualification is established.']
    return report

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--archive',type=Path,default=Path(__file__).resolve().parent);p.add_argument('--out',type=Path);p.add_argument('--extract',type=Path);args=p.parse_args();report=verify(args.archive)
    if args.out:
        with args.out.open('x') as f:json.dump(report,f,indent=2,allow_nan=False);f.write('\n')
    if args.extract:Archive(args.archive).extract(args.extract)
    print(json.dumps({'status':report['status'],'logicalFiles':report['logicalFiles'],'physicalBlobs':report['physicalBlobs'],'attempts':len(report['attempts']),'performanceEvidence':False}))
