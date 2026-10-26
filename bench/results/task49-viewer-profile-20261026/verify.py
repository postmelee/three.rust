"""Independent, standard-library audit of archived native Viewer profiles.

No browser, JS analyzer or original checkout execution. Profile arithmetic,
source-byte identity, exact map points, phase and fixed oracles are recomputed.
AST function ownership/names and heuristic subsystem labels are not independently
re-parsed; their recorded provenance and arithmetic are checked explicitly.
"""
from pathlib import Path
import argparse, collections, gzip, hashlib, json, math, posixpath, re, struct

APP='b5ee5dafe27f953ae1b55f42b5fa3697fef08683'
RUNTIME='85e2c5d500edb0b92ea4ecb997087fded3fed45b'
CASES=['robot-static','robot-walking','robot-high-resolution','robot-walking-grid-off']
ENGINES=['pure-r186','prepared-js-r186','prepared-wasm-r186']
MAX=100_000_000
MAP_CACHE={}
def H(b):return hashlib.sha256(b).hexdigest()
def near(a,b):assert math.isfinite(a) and math.isfinite(b) and abs(a-b)<=max(1e-7,abs(b)*1e-11),(a,b)
def safe(p):assert isinstance(p,str) and p and posixpath.normpath(p)==p and not p.startswith('/') and '..' not in p.split('/') and '\\' not in p
def Q(values,p):
    a=sorted(values);x=(len(a)-1)*p;i=math.floor(x);return a[i]+(a[math.ceil(x)]-a[i])*(x-i)
def compact(value):return json.dumps(value,separators=(',',':'),ensure_ascii=False).encode()

class Archive:
    def __init__(self,root):
        self.root=root.resolve(strict=True);self.index=json.loads((self.root/'archive-index.json').read_text());self.files={};self.blobs={}
        assert self.index['format']==1 and json.loads((self.root/'build-status.json').read_text())['status']=='complete'
        for row in self.index['files']:
            p=row['logicalPath'];safe(p);safe(row['sourcePath']);assert p not in self.files
            assert row['blob']=='blobs/'+row['publicSha256']+'.gz';safe(row['blob'])
            if row['blob'] not in self.blobs:
                stored=(self.root/row['blob']).read_bytes();assert len(stored)<MAX and len(stored)==row['storedBytes'] and H(stored)==row['storedSha256']
                decoded=gzip.decompress(stored);assert len(decoded)<MAX;self.blobs[row['blob']]=decoded
            decoded=self.blobs[row['blob']];assert len(decoded)==row['publicBytes'] and H(decoded)==row['publicSha256']
            if not row['normalizations']:assert row['decodedSourceSha256']==row['publicSha256']
            else:assert p.endswith(('.json','.json.gz','.cpuprofile','.cpuprofile.gz')),'Normalization outside metadata'
            self.files[p]=row
        assert {p.name for p in (self.root/'blobs').iterdir()}=={posixpath.basename(x) for x in self.blobs}
        for item in self.index['inputs']:assert sum(p.startswith(item['label']+'/') for p in self.files)==item['files'],'Missing logical file'
        support=json.loads((self.root/'support-index.json').read_text())
        for row in support['records']:
            safe(row['file']);b=(self.root/row['file']).read_bytes();assert len(b)==row['bytes'] and H(b)==row['sha256']
    def B(self,p):return self.blobs[self.files[p]['blob']]
    def J(self,p):return json.loads(self.B(p))
    def exists(self,p):return p in self.files

def wasm_symbols(b):
    assert b[:8]==b'\0asm\1\0\0\0'
    def uint(i):
        n=s=0
        for _ in range(10):
            assert i<len(b);v=b[i];i+=1;n|=(v&127)<<s;s+=7
            if v<128:return n,i
        raise AssertionError('Overlong Wasm integer')
    def string(i):n,i=uint(i);assert i+n<=len(b);return b[i:i+n].decode(),i+n
    def limits(i):
        flag,i=uint(i);_,i=uint(i)
        if flag&1:_,i=uint(i)
        return i
    i=8;names={};exports=collections.defaultdict(list);imports=0;defined=0
    while i<len(b):
        kind=b[i];size,i=uint(i+1);end=i+size;assert end<=len(b)
        if kind==0:
            name,t=string(i)
            if name=='name':
                while t<end:
                    sub=b[t];size,t=uint(t+1);stop=t+size;assert stop<=end
                    if sub==1:
                        count,t=uint(t)
                        for _ in range(count):idx,t=uint(t);name,t=string(t);assert idx not in names;names[idx]=name
                    t=stop
        elif kind==2:
            count,t=uint(i)
            for _ in range(count):
                _,t=string(t);_,t=string(t);tag=b[t];t+=1
                if tag==0:_,t=uint(t);imports+=1
                elif tag==1:t=limits(t+1)
                elif tag==2:t=limits(t)
                elif tag==3:t+=2
                elif tag==4:_,t=uint(t);_,t=uint(t)
                else:raise AssertionError('Unsupported Wasm import')
        elif kind==7:
            count,t=uint(i)
            for _ in range(count):
                name,t=string(t);tag=b[t];idx,t=uint(t+1)
                if tag==0:exports[idx].append(name)
        elif kind==10:defined,_=uint(i)
        i=end
    count=imports+defined;assert all(0<=x<count for x in set(names)|set(exports));return names,exports,count

def source_audit(A,run):
    served={x['file']:x['sha256'] for x in A.J(run+'/served-files.json')};network={x['url']:x['sha256'] for x in A.J(run+'/network.json') if x.get('mirrored')}
    sources=A.J(run+'/captured-sources.json');scripts=A.J(run+'/profile-scripts.json');byurl={};wasms={};bound={};checks=0
    def read(row):
        safe(row['file']);b=A.B(run+'/'+row['file']);assert H(b)==row['sha256'] and len(b)==row['bytes'];return b
    for row in sources:
        b=read(row);assert row['url'] not in byurl;byurl[row['url']]=(row,b);checks+=1
        assert row['sha256']==(served.get(row['label']) if row['url'].startswith('<origin>/') else network.get(row['url']))
        if b.startswith(b'\0asm'):wasms[H(b)]=wasm_symbols(b)
    for row in scripts:
        assert 'cleanupError' not in row
        if 'file' not in row:bound[row['scriptId']]=('unresolved-script-unavailable',None);continue
        b=read(row);checks+=1
        if row['kind']=='wasm':assert H(b) in wasms;bound[row['scriptId']]=('wasm',(*wasms[H(b)],H(b)));continue
        parsed=row['parsed'];pair=byurl.get(parsed['url'])
        if pair is None:bound[row['scriptId']]=('unresolved-script-not-served',None);continue
        source,text=pair
        if source['label'].endswith('.html'):
            lines=text.decode().splitlines(keepends=True)
            def position(line,col):return sum(len(x) for x in lines[:line])+len(lines[line].encode('utf-16-le')[:col*2].decode('utf-16-le'))
            assert text.decode()[position(parsed['startLine'],parsed['startColumn']):position(parsed['endLine'],parsed['endColumn'])]==b.decode()
        else:assert b==text
        bound[row['scriptId']]=('verified-js',source|{'scriptSha256':row['sha256']})
    return bound,byurl,scripts,{'payloadHashChecks':checks,'servedSources':len(sources),'scripts':len(scripts)}

def decode_points(mapping):
    alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';source=line=column=name=0;points={}
    for generated_line,row in enumerate(mapping.split(';')):
        generated_column=0
        if not row:continue
        for segment in row.split(','):
            assert segment;fields=[];at=0
            while at<len(segment):
                value=shift=0
                while True:
                    assert at<len(segment) and shift<=30;digit=alphabet.index(segment[at]);at+=1;value+=(digit&31)*(2**shift);shift+=5
                    if not digit&32:break
                fields.append((-1 if value&1 else 1)*(value//2))
            assert len(fields) in [1,4,5] and fields[0]>=0;generated_column+=fields[0]
            point=None
            if len(fields)>1:
                source+=fields[1];line+=fields[2];column+=fields[3];assert min(source,line,column)>=0
                if len(fields)==5:name+=fields[4]
                point=(source,line,column)
            points.setdefault((generated_line,generated_column),[]).append(point)
    return points

def source_maps(A,root,run,byurl,scripts):
    manifest=A.J(root+'/manifest.json');proof=manifest['preparedManifestFiles']['native'];pbytes=A.B(root+'/'+proof['file'])
    assert len(pbytes)==proof['bytes'] and H(pbytes)==proof['sha256']==manifest['preparedManifests']['native']
    prepared=json.loads(pbytes);adapt=A.J(run+'/adaptation.json');assert adapt['preparationManifestSha256']==H(pbytes) and adapt['appBundleOutputs']==prepared['outputs']
    assert prepared['viewerPin']==APP and prepared['status']=='prepared' and prepared.get('instrumentation') in [None,'none']
    assert prepared['integrity']['originalSourcesAndDistUnchanged'] and prepared['integrity']['capturedInputsUnchanged']
    outputs={x['file']:x for x in prepared['outputs']};proofs={x['file']:x for x in prepared['sourceMaps']};inputs={x['file']:x for x in prepared['buildInputs']};originals={x['file']:x for x in prepared['sources']};changes={x['file']:x for x in prepared['adaptations']};maps={}
    for script in scripts:
        parsed=script.get('parsed') or {};pair=byurl.get(parsed.get('url'))
        if not pair or not pair[0]['label'].startswith('prepared/dist/') or not pair[0]['label'].endswith('.js') or not parsed.get('sourceMapURL'):continue
        generated,binary=pair;relative=posixpath.normpath(posixpath.join(posixpath.dirname(parsed['url'].removeprefix('<origin>')),parsed['sourceMapURL']))
        row,bytes_=byurl['<origin>'+relative];assert row['label']=='prepared/dist'+relative
        cache_key=(proof['sha256'],generated['sha256'],row['sha256'],parsed.get('startLine',0),parsed.get('startColumn',0))
        if cache_key in MAP_CACHE:maps[script['scriptId']]=MAP_CACHE[cache_key];continue
        gfile=generated['label'].removeprefix('prepared/');mfile=row['label'].removeprefix('prepared/');m=json.loads(bytes_);evidence=proofs[mfile]
        for file,b in [(gfile,binary),(mfile,bytes_)]:assert outputs[file]['sha256']==H(b) and outputs[file]['bytes']==len(b)
        assert m['version']==3 and not m.get('sourceRoot') and 'sections' not in m and m['file']==posixpath.basename(gfile)
        assert evidence['nonPathPayloadUnchanged'] and evidence['servedSha256']==H(bytes_)
        assert H(m['mappings'].encode())==evidence['mappingsSha256'] and H(compact(m['sourcesContent']))==evidence['sourcesContentSha256']
        assert H(compact(m|{'sources':[]}))==evidence['unchangedNonPathPayloadSha256'] and len(m['sources'])==evidence['sourceCount']
        chains={}
        for index,file in enumerate(m['sources']):
            text=m['sourcesContent'][index];item=inputs.get(file)
            if file.startswith('<virtual>/') or text is None or not item:continue
            b=text.encode();digest=H(b)
            if item['sha256']!=digest or item['bytes']!=len(b):continue
            upstream=None
            if file.startswith('adapted/'):
                rel=file.removeprefix('adapted/');original=originals.get('viewer/'+rel);change=changes.get(rel)
                if change:
                    assert original and original['sha256']==change['originalSha256'] and original['bytes']==change['originalBytes'] and digest==change['servedSha256'] and len(b)==change['servedBytes'];upstream=original['sha256']
                elif rel=='viewer-bootstrap.js':assert prepared['bootstrap']['sha256']==digest and prepared['bootstrap']['bytes']==len(b)
                else:assert original and original['sha256']==digest and original['bytes']==len(b);upstream=original['sha256']
            else:assert file.startswith('viewer/')
            chains[index]={'file':file,'sha256':digest,'upstream':upstream}
        maps[script['scriptId']]={'points':decode_points(m['mappings']),'sources':chains,'generatedSha256':H(binary),'mapSha256':H(bytes_),'generatedFile':gfile,'startLine':parsed.get('startLine',0),'startColumn':parsed.get('startColumn',0)}
        MAP_CACHE[cache_key]=maps[script['scriptId']]
    return maps

def mapped_node(node,maps):
    source=node.get('source') or {};mapping=source.get('mapping')
    if not mapping:return False
    frame=node['callFrame'];proof=maps[frame['scriptId']];line=frame['lineNumber']-proof['startLine'];column=frame['columnNumber']-(proof['startColumn'] if line==0 else 0)
    assert mapping['method']=='exact-generated-segment-to-verified-input-AST'
    for field in ['generatedSha256','mapSha256','generatedFile']:assert mapping[field]==proof[field]
    assert source['generated']['sha256']==proof['generatedSha256'] and source['generated']['file']=='prepared/'+proof['generatedFile']
    assert (mapping['generatedLine'],mapping['generatedColumn'])==(line,column)
    points=proof['points'][(line,column)];assert len(points)==1 and points[0] is not None
    index,original_line,original_column=points[0];bound=proof['sources'][index]
    assert source['file']==bound['file'] and source['sha256']==bound['sha256'] and source['line']==original_line and source['column']==original_column
    return True

def window(raw,scenario,engine):
    before=raw['before'];after=raw['after'];assert before and after
    for sample in [before,after]:
        assert sample['visibility']=='visible' and sample['focused'] and sample['crossOriginIsolated'] and sample['dpr']==1 and sample['revision']=='186'
        assert sample['state']['grid']==scenario['grid'] and sample['state']['playbackSpeed']==1 and sample['controls']['autoRotate'] is False
        assert len(sample['guiLoops'])==3 and [len(x['controllers']) for x in sample['guiLoops']]==[1,14,9]
        if scenario.get('guiLoops'):assert sample['guiLoops']==scenario['guiLoops']
        for name,renderer in sample['renderers'].items():
            assert renderer['pixelRatio']==scenario['pixelRatio']
            if name=='main' or scenario['grid']:assert renderer['width']==math.floor(renderer['cssWidth']*scenario['pixelRatio']) and renderer['height']==math.floor(renderer['cssHeight']*scenario['pixelRatio']) and renderer['cssWidth']>0 and renderer['cssHeight']>0
        if engine=='pure-r186':assert sample['diagnostics'] is None
        else:assert sample['diagnostics']['backend']==engine.removesuffix('-r186') and sample['diagnostics']['wasmActive']==(engine=='prepared-wasm-r186')
    assert after['at']>before['at'] and after['activity']==before['activity'] and after['state']==before['state'] and after['guiLoops']==before['guiLoops']
    for name in ['main','axes']:
        for key in ['width','height','cssWidth','cssHeight','pixelRatio','layout','quality']:assert before['renderers'][name][key]==after['renderers'][name][key]
    frames=after['renderers']['main']['frame']-before['renderers']['main']['frame'];axes=after['renderers']['axes']['frame']-before['renderers']['axes']['frame'];assert frames>0 and axes==(frames if scenario['grid'] else 0)
    delta=None if before['mixerTime'] is None else after['mixerTime']-before['mixerTime'];error=None
    if delta is None:assert after['mixerTime'] is None
    else:assert delta>0 and before['mixerTimeScale']==after['mixerTimeScale']==1
    if scenario['playback']=='static':assert before['action'] is None and after['action'] is None
    else:
        b=before['action'];a=after['action'];duration=b['duration'];assert duration>0 and a['duration']==duration and a['name']==b['name'] and a['name'].endswith('. Walking')
        for action in [a,b]:assert action['running'] and action['enabled'] and not action['paused'] and action['timeScale']==1 and 0<=action['time']<duration
        error=abs(a['time']-(b['time']+delta)%duration);error=min(error,duration-error);assert error<=max(1e-9,128*2.220446049250313e-16*max(1,abs(after['mixerTime'])))
    keys=['wasmCalls','preparedPasses','preparedWasmCalls','preparedFallbacks','matrixReads','preparedMatrixReads','materializedBytes']
    counters=None if before['diagnostics'] is None else {k:after['diagnostics'][k]-before['diagnostics'][k] for k in keys}
    if counters:
        assert all(math.isfinite(x) and x>=0 for x in counters.values())
        if engine=='prepared-wasm-r186':assert counters['wasmCalls']>0 or counters['preparedWasmCalls']>0
    expected=raw['validation'];assert expected['mainFrames']==frames and expected['axesFrames']==axes and expected['counters']==counters
    if delta is None:assert expected['mixerAdvance'] is None
    else:near(expected['mixerAdvance'],delta)
    return {'mainFrames':frames,'axesFrames':axes,'elapsedMs':after['at']-before['at'],'mixerAdvance':delta,'phaseErrorSeconds':error,'counters':counters,'countersPerMainFrame':None if counters is None else {k:v/frames for k,v in counters.items()}}

def profile_accounting(profile):
    nodes={x['id']:x for x in profile['nodes']};assert nodes and len(nodes)==len(profile['nodes']);parents={}
    for node in nodes.values():
        for child in node.get('children',[]):assert child in nodes and child not in parents;parents[child]=node['id']
    roots=set(nodes)-set(parents);assert len(roots)==1;order=[];todo=list(roots);seen=set()
    while todo:
        node=todo.pop();assert node not in seen;seen.add(node);order.append(node);todo+=nodes[node].get('children',[])
    assert len(order)==len(nodes)
    samples=profile['samples'];deltas=profile['timeDeltas'];assert samples and len(samples)==len(deltas) and all(math.isfinite(x) and x>=0 for x in deltas)
    own=collections.Counter();hits=collections.Counter()
    for node,delta in zip(samples,deltas):assert node in nodes;own[node]+=delta;hits[node]+=1
    inclusive=collections.Counter(own);inclusive_hits=collections.Counter(hits)
    for node in reversed(order):
        if node in parents:inclusive[parents[node]]+=inclusive[node];inclusive_hits[parents[node]]+=inclusive_hits[node]
    assert inclusive[next(iter(roots))]==sum(deltas)
    return nodes,own,hits,inclusive,inclusive_hits

def audit_profile(A,root,run,analysis):
    profile=A.J(run+'/profile.cpuprofile');nodes,own,hits,inclusive,inclusive_hits=profile_accounting(profile)
    bound,byurl,scripts,source_report=source_audit(A,run);maps=source_maps(A,root,run,byurl,scripts)
    an=A.J(analysis);assert len(profile['samples'])==an['samples'];near(an['weightedMs'],sum(profile['timeDeltas'])/1000)
    near(an['durationMs'],(profile['endTime']-profile['startTime'])/1000);near(an['durationMinusWeightedMs'],an['durationMs']-an['weightedMs'])
    records={x['id']:x for x in an['exclusive']};assert set(records)==set(nodes)
    coverage=collections.defaultdict(lambda:{'sampledUs':0,'samples':0});families=collections.Counter();mapped=0
    for node,record in records.items():
        near(record['selfMs'],own[node]/1000);near(record['inclusiveMs'],inclusive[node]/1000);assert record['hits']==hits[node] and record['inclusiveHits']==inclusive_hits[node]
        assert record['callFrame']==nodes[node]['callFrame'];frame=record['callFrame'];status,evidence=bound.get(frame['scriptId'],('unresolved-script-id',None))
        if status=='wasm':
            names,exports,count,module_hash=evidence;match=re.fullmatch(r'wasm-function\[(\d+)\]',frame['functionName'])
            indices=[int(match[1])] if match and int(match[1])<count else [i for i in set(names)|set(exports) if names.get(i)==frame['functionName'] or frame['functionName'] in exports.get(i,[])]
            status='verified-wasm' if len(indices)==1 else 'unresolved-wasm-function'
            if status=='verified-wasm':
                idx=indices[0];expected_label=names.get(idx) or (exports[idx][0] if exports.get(idx) else f'wasm-function[{idx}]')
                assert record['wasm']['resolved'] and record['wasm']['functionIndex']==idx and record['wasm']['moduleSha256']==module_hash
                assert record['wasm']['label']==expected_label and record['wasm']['name']==names.get(idx) and record['wasm']['exports']==exports.get(idx,[])
        assert record['sourceStatus']==status
        if mapped_node(record,maps):mapped+=1
        elif status=='verified-js':assert record['source']['file']==evidence['label'] and record['source']['sha256']==evidence['scriptSha256']
        if status=='verified-js':
            file=record['source']['file'];family='dat.gui verified source' if re.search(r'(?:^|/)dat\.gui/',file) else 'Viewer app verified source' if re.match(r'^(?:adapted|viewer)/src/',file) else 'other verified JavaScript';families[family]+=own[node]/1000
        if hits[node]:coverage[status]['sampledUs']+=own[node];coverage[status]['samples']+=hits[node]
    assert len(an['inclusive'])==len(nodes)
    for row in an['inclusive']:near(row['inclusiveMs'],inclusive[row['id']]/1000);assert row['inclusiveHits']==inclusive_hits[row['id']]
    assert set(coverage)==set(an['sourceCoverage'])
    for key,value in coverage.items():near(value['sampledUs']/1000,an['sourceCoverage'][key]['sampledMs']);assert value['samples']==an['sourceCoverage'][key]['samples']
    for key,value in families.items():near(value,an['verifiedSourceFamilies'][key])
    # Recompute all category/context arithmetic without treating the semantic
    # classifier labels or overlapping ancestors as independent measured costs.
    for field,key in [('buckets','category'),('contextBuckets','contextCategory')]:
        table=collections.defaultdict(lambda:{'us':0,'samples':0})
        for node,delta in zip(profile['samples'],profile['timeDeltas']):item=table[records[node][key]];item['us']+=delta;item['samples']+=1
        assert set(table)==set(an[field])
        for name,item in table.items():near(item['us']/1000,an[field][name]['sampledMs']);assert item['samples']==an[field][name]['samples']
    for raw,category in [('(idle)','idle'),('(program)','program/native-unresolved'),('(root)','root'),('(garbage collector)','GC')]:
        for node in records.values():
            if node['callFrame']['functionName']==raw:assert node['category']==category
    active=an['weightedMs']-sum(an['buckets'].get(k,{}).get('sampledMs',0) for k in ['idle','program/native-unresolved','root']);near(active,an['activeMs'])
    gaps={name:Q(profile['timeDeltas'],p) for name,p in [('p50',.5),('p95',.95),('p99',.99)]}|{'min':min(profile['timeDeltas']),'max':max(profile['timeDeltas'])}
    for key,value in gaps.items():near(value,an['sampleGapsUs'][key])
    long=[{'sample':i,'nodeId':node,'timeDeltaUs':delta,'category':records[node]['category']} for i,(node,delta) in enumerate(zip(profile['samples'],profile['timeDeltas'])) if delta>5000]
    assert an['sensitivity']['shortGapMaximumUs']==5000 and an['sensitivity']['longGaps']==long
    return {'samples':len(profile['samples']),'nodes':len(nodes),'rawProfileSha256':H(A.B(run+'/profile.cpuprofile')),'weightedMs':sum(profile['timeDeltas'])/1000,'durationMs':an['durationMs'],'activeMs':active,'sampleGapsUs':gaps,'longGapsOver5000us':len(long),'sourceCoverage':dict(coverage),'verifiedSourceFamiliesMs':dict(families),'mappedNodePositionsChecked':mapped,'verifiedPreparedMaps':len(maps),'sourceAudit':source_report}

def compare_oracle(reference,actual):
    assert len(reference['numeric'])==len(actual['numeric']);maximum=0
    for a,b in zip(reference['numeric'],actual['numeric']):
        assert math.isfinite(a) and math.isfinite(b);delta=abs(a-b);assert delta<=1e-10+1e-12*abs(a);maximum=max(maximum,delta)
    for field in ['objects','clips','state','actions','captureLayout']:assert reference[field]==actual[field],field
    for name in ['main','axes']:
        for field in ['width','height','pixelSha256','quality','work']:assert reference['renderers'][name][field]==actual['renderers'][name][field],(name,field)
    assert actual['identityFailures']==[] and actual['axesCameraUpIdentity'] and actual['controlsCameraIdentity']
    return {'numericValues':len(reference['numeric']),'maximumAbsoluteDifference':maximum}

def audit_oracles(A,root,manifest):
    reference={};result=[]
    for entry in manifest['oracles']:
        if entry['status']!='passed':result.append({'scenario':entry['scenario'],'engine':entry['engine'],'status':entry['status'],'retainedFailure':True});continue
        scenario=next(x for x in manifest['cases'] if x['id']==entry['scenario']);base=root+'/'+entry['directory'];assert A.J(base+'/errors.json')==[] and A.J(base+'/integrity.json')['unchanged']
        poses=[0] if scenario['playback']=='static' else [.25,.75];rows=[]
        for pose in poses:
            file=base+'/oracle-'+str(pose)+'.json';snapshot=A.J(file);key=(entry['scenario'],pose)
            if key not in reference:assert entry['engine']=='pure-r186' and not entry['observed'];reference[key]=(snapshot,base)
            ref,refbase=reference[key];comparison=compare_oracle(ref,snapshot)
            for name in ['main','axes']:
                png=base+'/oracle-'+str(pose)+'-'+name+'.png';rp=refbase+'/oracle-'+str(pose)+'-'+name+'.png'
                if A.exists(png):
                    b=A.B(png);assert b==A.B(rp) and b[:8]==b'\x89PNG\r\n\x1a\n' and b[12:16]==b'IHDR'
                    assert struct.unpack('>II',b[16:24])==(snapshot['renderers'][name]['width'],snapshot['renderers'][name]['height'])
                else:assert name=='axes' and not scenario['grid'] and snapshot['renderers'][name]['width']*snapshot['renderers'][name]['height']==0 and snapshot['renderers'][name]['imageUnavailable']
            rows.append({'pose':pose,**comparison})
        result.append({'scenario':entry['scenario'],'engine':entry['engine'],'observer':entry['observed'],'status':'passed','poses':rows})
    return result

def verify(root):
    A=Archive(root);report={'status':'verified','scope':'Independent archived native Viewer profile audit; not primary CPU timing or performance qualification.','logicalFiles':len(A.files),'physicalBlobs':len(A.blobs),'captures':[]}
    for label in ['smoke','full']:
        manifest=A.J(label+'/manifest.json');complete=manifest['status']=='capture-complete-attribution-pending';assert complete or manifest['status']=='failed';assert manifest['finishedAt']
        assert manifest['candidateSha']==RUNTIME and manifest['sourceBefore']['candidate']['sha']==RUNTIME and manifest['sourceBefore']['viewer']['sha']==APP
        if complete:
            assert manifest['errors']==[] and manifest['sourceBefore']==manifest['sourceAfter'] and manifest['sourceIntegrity']=='passed'
            assert all(not value['dirty'] for value in manifest['sourceBefore'].values())
        assert manifest['configuration']['profiling'] is True and manifest['configuration']['isolated'] is True and manifest['group']=='engine'
        assert [x['id'] for x in manifest['cases']]==CASES
        config=manifest['configuration'];assert config['samplingIntervalUs']==100 and config['prePostObservationSeconds']==2
        assert (config['repeats'],config['warmupFrames'],config['seconds'])==((1,60,2) if label=='smoke' else (3,600,12))
        expected_orders=[ENGINES[i:]+ENGINES[:i] for i in range(config['repeats'])];assert manifest['orders']==expected_orders
        if label=='full':
            protocol=manifest['protocol'];p=root/'protocols'/Path(protocol['file']).name;b=p.read_bytes();assert H(b)==protocol['sha256'] and json.loads(b)==protocol['protocol']
            assert protocol['verifiedAtToolSha']==manifest['sourceBefore']['tooling']['sha'] and protocol['protocol']['runtimeSha']==RUNTIME
        for phase in ['before','after']:
            if complete:assert 'AC Power' in A.J(label+'/environment-'+phase+'/runner.json')['power']['output']
        analysis_root=label+'-analysis-001';summary=A.J(analysis_root+'/summary.json');assert summary['captureToolSha']==manifest['sourceBefore']['tooling']['sha'] and summary['candidateSha']==RUNTIME
        analysis={(x['scenario'],x['round'],x['engine']):x for x in summary['runs']};assert len(analysis)==len(summary['runs'])
        if complete:assert not summary['unprocessed'] and len(manifest['runs'])==4*3*config['repeats'] and len(manifest['oracles'])==24
        capture={'label':label,'status':manifest['status'],'captureToolSha':manifest['sourceBefore']['tooling']['sha'],'analysisTool':summary['analysisTool'],'candidateSha':RUNTIME,'startedAt':manifest['startedAt'],'finishedAt':manifest['finishedAt'],'runs':[],'oracles':audit_oracles(A,label,manifest)}
        seen=set()
        for entry in manifest['runs']:
            key=(entry['scenario'],entry['round'],entry['engine']);assert key not in seen;seen.add(key);run=label+'/'+entry['directory']
            if entry['status']!='captured':
                partial={k:entry[k] for k in ['scenario','round','engine','status']};partial['retainedFailure']=True
                for name in ['profile.cpuprofile','partial-profile.cpuprofile']:
                    if A.exists(run+'/'+name):p=A.J(run+'/'+name);profile_accounting(p);partial[name]={'samples':len(p['samples']),'sha256':H(A.B(run+'/'+name))}
                capture['runs'].append(partial);continue
            assert A.J(run+'/errors.json')==[] and A.J(run+'/integrity.json')['unchanged'] and not any(x.get('blocked') for x in A.J(run+'/network.json'))
            scenario=next(x for x in manifest['cases'] if x['id']==entry['scenario']);pin=A.J(run+'/profile-manifest.json');assert pin['scenario']==scenario and pin['candidateSha']==RUNTIME and pin['toolSha']==manifest['sourceBefore']['tooling']['sha']
            for name in ['main','axes']:
                gpu=A.J(run+'/gpu-'+name+'.json');assert 'Apple M4 Pro' in gpu['renderer'] and 'Metal' in gpu['renderer'] and 'SwiftShader' not in gpu['renderer']
            row=analysis[key];file=analysis_root+'/'+row['file'];full_analysis=A.J(file);assert full_analysis['analysisTool']==summary['analysisTool'] and full_analysis['captureToolSha']==summary['captureToolSha']
            audit=audit_profile(A,label,run,file)
            for k in ['samples','durationMs','activeMs']:near(row[k],audit[k])
            windows={name:window(A.J(run+'/'+name+'.json'),scenario,entry['engine']) for name in ['warmup','before-window','profile-observations','after-window']}
            assert A.J(run+'/warmup.json')['frames']==config['warmupFrames'] and windows['warmup']['mainFrames']>=config['warmupFrames']
            capture['runs'].append({'scenario':entry['scenario'],'engine':entry['engine'],'round':entry['round'],'status':'captured',**audit,'windows':windows})
        assert set(analysis)=={(x['scenario'],x['round'],x['engine']) for x in manifest['runs'] if x['status']=='captured'}
        if complete:assert seen=={(scenario,round,engine) for scenario in CASES for round in range(config['repeats']) for engine in ENGINES}
        report['captures'].append(capture)
    report['limitations']=['Exclusive sampled weights are diagnostic; no primary callback quantiles, CPU cycles, GPU timing or FPS are inferred.','Endpoint counters bracket CDP start/stop and are wider than the exact profile interval; profiler/observer overhead is uncalibrated.','Fixed oracles establish finite equality, while natural playback is not frame-matched across routes.','Source-map exact positions and source-byte/provenance chains are independently checked. AST function owner/name selection and semantic bucket classification are not independently re-parsed.','PNG bytes/dimensions and preserved GPU pixel hashes are checked; this verifier does not recreate WebGL pixel readback.','Missing or failed capture evidence stays explicitly incomplete; additional devices/days and primary adoption gates are not supplied.']
    return report

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--archive',type=Path,default=Path(__file__).resolve().parent);parser.add_argument('--out',type=Path);args=parser.parse_args();result=verify(args.archive)
    if args.out:
        with args.out.open('x') as f:f.write(json.dumps(result,indent=2)+'\n')
    else:assert result==json.loads((args.archive/'independent-audit.json').read_text()),'Saved independent audit differs'
    print(json.dumps({'status':result['status'],'logicalFiles':result['logicalFiles'],'physicalBlobs':result['physicalBlobs'],'captures':[{'label':x['label'],'runs':len(x['runs']),'oracles':len(x['oracles']),'samples':sum(y.get('samples',0) for y in x['runs'])} for x in result['captures']]}))
