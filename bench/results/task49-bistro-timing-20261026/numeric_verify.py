"""Independent prospective Bistro engine timing audit. Python standard library only.
No browser, JavaScript analyzer, capture mutation or historical-archive modification.
Run only after captures and profiling stop. A failed check creates failure evidence.
"""
from pathlib import Path
import argparse, gzip, hashlib, importlib.util, json, math, posixpath, struct, sys
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('bistro_numeric', Path(__file__).with_name('analyze.py'))
v = importlib.util.module_from_spec(spec); spec.loader.exec_module(v)
TOOL = EXPECTED_BROWSER = EXPECTED_GPU = None
MAX = 100_000_000

def H(value): return hashlib.sha256(value).hexdigest()
def public_error(error, args):
    value = str(error)
    for source in [args.capture,args.protocol,args.zip_manifest,args.out,Path.home()]:
        value = value.replace(str(source), '<local-path>').replace(str(source.resolve()), '<local-path>')
    return value
def safe(value):
    assert isinstance(value, str) and value and not value.startswith('/') and chr(92) not in value
    assert posixpath.normpath(value) == value and '..' not in value.split('/')
    return value

class Capture:
    def __init__(self, root):
        self.root = root.resolve(strict=True)
        self.files = {}
    def target(self, relative):
        relative = safe(relative)
        if relative.startswith('capture/'): relative = relative[len('capture/'):]
        target = self.root / safe(relative)
        if not target.exists(): target = Path(str(target) + '.gz')
        assert not target.is_symlink() and target.resolve().is_relative_to(self.root)
        return target
    def B(self, relative):
        target = self.target(relative)
        stored = target.read_bytes(); assert len(stored) < MAX
        data = gzip.decompress(stored) if target.suffix == '.gz' else stored
        assert len(data) < MAX
        row = dict(path=str(target.relative_to(self.root)), bytes=len(stored), sha256=H(stored), decodedBytes=len(data), decodedSha256=H(data))
        prior = self.files.get(row['path']); assert prior is None or prior == row, 'Input changed while auditing'
        self.files[row['path']] = row
        return data
    def J(self, relative): return json.loads(self.B(relative))
    def exists(self, relative): return self.target(relative).exists()
    def finish(self):
        for row in self.files.values():
            data = (self.root / row['path']).read_bytes()
            assert len(data) == row['bytes'] and H(data) == row['sha256'], 'Input changed after audit read'
        return sorted(self.files.values(), key=lambda row: row['path'])

def source_audit(A,label,entry,manifest):
    run=label+'/'+entry['directory'];ad=A.J(run+'/adaptation.json')
    assert ad['appPin']==v.VIEWER and ad['route']==entry['engine']
    assert ad['runtimeSha']==(None if entry['engine'] in ['original-r176','external-r176'] else v.CANDIDATE)
    assert ad['tooling']['sha']==TOOL and not ad['tooling']['dirty']
    assert A.J(run+'/errors.json')==[] and A.J(run+'/integrity.json')=={'unchanged':True,'error':None}
    network=A.J(run+'/network.json');assert not any(x.get('blocked') for x in network)
    used={x['file']:x for x in A.J(run+'/used-files.json')};served={x['file']:x for x in A.J(run+'/served-files.json')}
    original=A.B(run+'/index.original.html');current=A.B(run+'/index.served.html')
    assert H(original)==ad['index']['originalSha256'] and len(original)==ad['index']['originalBytes']
    assert H(current)==ad['index']['servedSha256'] and len(current)==ad['index']['servedBytes']
    expected=original
    if ad['externalized']:
        imports={'three':'/__viewer_candidate__/prepared-'+('wasm' if 'wasm' in entry['engine'] else 'js')+'.js','three/addons/':'/__viewer_candidate__/addons/'} if entry['engine'].startswith('prepared-') else {'three':'/__viewer_runtime__/build/three.module.js','three/addons/':'/__viewer_runtime__/examples/jsm/'}
        # Public candidate entry names are verified from served import-map bytes,
        # then restricted to the route's expected prepared entry below.
        text=current.decode();marker='<script type="importmap">';start=text.index(marker)+len(marker);end=text.index('</script>',start)
        captured=json.loads(text[start:end]);assert set(captured)=={'imports'} and set(captured['imports'])=={'three','three/addons/'}
        if entry['engine'].startswith('prepared-'):
            expected_entry='prepared.js' if 'wasm' in entry['engine'] else 'prepared-js.js'
            imports['three']='/__viewer_candidate__/'+expected_entry
        assert captured=={'imports':imports}
        injection='<head>\n\t<script type="importmap">'+json.dumps(captured,separators=(',',':'))+'</script>'
        assert original.count(b'<head>')==1;expected=original.replace(b'<head>',injection.encode())
    assert current==expected
    prepared=None
    if ad['preparationManifestSha256'] is not None:
        matches=[x for x in manifest['preparedManifestFiles'].values() if x['sha256']==ad['preparationManifestSha256']]
        assert len(matches)==1;proof=matches[0];b=A.B(label+'/'+proof['file']);assert H(b)==proof['sha256'] and len(b)==proof['bytes'];prepared=json.loads(b)
        assert prepared['viewerPin']==v.VIEWER and prepared['status']=='prepared' and prepared['outputs']==ad['appBundleOutputs']
        assert prepared['integrity']['originalSourcesAndDistUnchanged'] and prepared['integrity']['capturedInputsUnchanged']
        assert prepared['instrumentation']==ad['instrumentation']
        for row in prepared['outputs']:
            key='prepared/'+row['file'];assert key in used and used[key]['sha256']==row['sha256'] and used[key]['bytes']==row['bytes']
    urls=set();checks=0
    mirrors={x['url']:x for x in network if x.get('mirrored')}
    for row in A.J(run+'/captured-sources.json'):
        safe(row['file']);b=A.B(run+'/'+row['file']);assert H(b)==row['sha256'] and len(b)==row['bytes'];assert row['url'] not in urls;urls.add(row['url']);checks+=1
        record=served.get(row['label']) if row['url'].startswith('<origin>/') else mirrors.get(row['url'])
        assert record and record['sha256']==row['sha256'] and record['bytes']==row['bytes']
    for name in ['main','axes']:
        gpu=A.J(run+'/gpu-'+name+'.json');assert EXPECTED_GPU in gpu['renderer'] and not any(word in gpu['renderer'].lower() for word in ['swiftshader', 'llvmpipe', 'software'])
    env=A.J(run+'/environment.json');assert env['headed'] and env['isolated'] and env['viewport']=={'width':1280,'height':720} and env['dpr']==1
    assert env['route']==entry['engine'] and env['browser']==EXPECTED_BROWSER
    return {'directory':entry['directory'],'capturedSourceByteChecks':checks,'usedInventoryEntries':len(used),'servedInventoryEntries':len(served),'htmlImportMapExact':True,'preparedManifestVerified':prepared is not None}


def compare_oracle(reference,actual,strict):
    differences=[];maximum=0;failures=0
    if len(reference['numeric'])!=len(actual['numeric']):differences.append({'field':'numericLength','reference':len(reference['numeric']),'actual':len(actual['numeric'])})
    for a,b in zip(reference['numeric'],actual['numeric']):
        assert v.finite(a) and v.finite(b);delta=abs(a-b);maximum=max(maximum,delta)
        if delta>1e-10+1e-12*abs(a):failures+=1
    if failures:differences.append({'field':'numeric','count':failures,'maxAbsoluteDifference':maximum})
    for key in ['objects','clips','state','actions']:
        if reference[key]!=actual[key]:differences.append({'field':key})
    for name in ['main','axes']:
        for key in ['width','height','pixelSha256','quality','work']:
            if reference['renderers'][name][key]!=actual['renderers'][name][key]:differences.append({'field':name+'.'+key})
    layout=reference['captureLayout']==actual['captureLayout']
    if not layout:differences.append({'field':'captureLayout'})
    if strict:assert not differences,differences
    return {'strict':strict,'equal':not differences,'differences':differences,'maxAbsoluteDifference':maximum,'numericValues':len(reference['numeric']),'layoutEqual':layout}


def oracle_audit(A,label,manifest):
    cases={x['id']:x for x in manifest['cases']};references={};natives={};results=[];images=0;numeric=0;overlays=0
    routes=list(dict.fromkeys(x['engine'] for x in manifest['routes']));expected=[(s['id'],e,observed) for s in manifest['cases'] for e in routes for observed in [False,True]]
    assert [(e['scenario'],e['engine'],e['observed']) for e in manifest['oracles']]==expected
    for entry in manifest['oracles']:
        assert entry['status']=='passed';scenario=cases[entry['scenario']];base=label+'/'+entry['directory'];poses=[0] if scenario['playback']=='static' else [.25,.75];records=[]
        for i,pose in enumerate(poses):
            snapshot=A.J(base+f'/oracle-{pose}.json');key=(scenario['id'],pose);nativekey=(scenario['id'],entry['engine'],pose)
            assert snapshot['identityFailures']==[] and snapshot['controlsCameraIdentity'] and snapshot['axesCameraUpIdentity']
            if key not in references:references[key]=(snapshot,base)
            ref,refdir=references[key];strict=manifest['group']=='engine' or entry['engine']!='pure-r186'
            comparison=compare_oracle(ref,snapshot,strict);v.same(comparison,entry['referenceComparisons'][i]);numeric+=len(ref['numeric'])
            pairs=[(ref,refdir,strict)]
            if entry['observed']:
                native,nd=natives[nativekey];oc=compare_oracle(native,snapshot,True);v.same(oc,entry['instrumentationComparisons'][i]);pairs.append((native,nd,True));overlays+=1
            else:natives[nativekey]=(snapshot,base)
            for name in ['main','axes']:
                file=base+f'/oracle-{pose}-{name}.png';renderer=snapshot['renderers'][name]
                if A.exists(file):
                    b=A.B(file);assert b[:8]==b'\x89PNG\r\n\x1a\n' and b[12:16]==b'IHDR';assert struct.unpack('>II',b[16:24])==(renderer['width'],renderer['height']);images+=1
                    for other,od,required in pairs:
                        if required:assert b==A.B(od+f'/oracle-{pose}-{name}.png')
                else:assert name=='axes' and not scenario['grid'] and renderer['width']*renderer['height']==0 and renderer['imageUnavailable']
            records.append({'pose':pose,'reference':comparison,'instrumentationExact':entry['observed']})
        results.append({'scenario':entry['scenario'],'engine':entry['engine'],'observed':entry['observed'],'poses':records})
    return {'pages':len(results),'poses':sum(len(r['poses']) for r in results),'imageFiles':images,'referenceNumericValues':numeric,'nativeOverlayPoseComparisons':overlays,'records':results}


def near(actual, expected):
    assert len(actual) == len(expected)
    assert all(v.finite(a) and v.finite(b) and abs(a-b) <= 1e-10 + 1e-12*abs(b) for a,b in zip(actual,expected))


def readiness(expected, observed):
    """Independently check retained source-contract relationships, not image sizes alone."""
    assert observed['contextsLost'] == [False, False]
    names = [row['name'] for row in expected['nodeRecords']]
    assert len(set(names)) == len(names) and all(names)
    assert sorted(row['name'] for row in observed['nodeRecords']) == sorted(names)
    actual_nodes = {row['name']: row for row in observed['nodeRecords']}
    for source in expected['nodeRecords']:
        actual = actual_nodes[source['name']]
        for key in ['parentName', 'childNames', 'meshIndex']: assert actual[key] == source[key]
        assert len(actual['primitives']) == len(source['primitives'])
        for primitive in source['primitives']:
            rows = [row for row in actual['primitives'] if row['primitiveIndex'] == primitive['primitiveIndex']]
            assert len(rows) == 1
            got = rows[0]
            for key in ['materialIndex', 'indexCount']: assert got[key] == primitive[key]
            for key,value in primitive['attributes'].items(): assert got['attributes'][key] == value
        if not source['animated']:
            if source['matrix'] is not None: near(actual['matrix'], source['matrix'])
            else:
                for key in ['translation', 'rotation', 'scale']: near(actual[key], source[key])
    assert sorted(set(row['index'] for row in observed['materials'])) == expected['materialIndices']
    assert sorted(set(row['imageIndex'] for row in observed['textures'])) == expected['imageIndices']
    assert all(row['ready'] is True and row['width'] > 0 and row['height'] > 0 for row in observed['textures'])
    assert [{'name':row['name'],'tracks':row['tracks']} for row in observed['clips']] == [{'name':row['nativeName'],'tracks':row['channels']} for row in expected['animations']]
    for source in expected['materials']:
        for actual in [row for row in observed['materials'] if row['index'] == source['index']]:
            assert [row['slot'] for row in actual['textureSlots']] == [row['slot'] for row in source['textureSlots']]
            for wanted in source['textureSlots']:
                got = next(row for row in actual['textureSlots'] if row['slot'] == wanted['slot'])
                for key in ['imageIndex','imageURI','sampler','texCoord','offset','scale','rotation','flipY','colorTransfer']: assert got[key] == wanted[key]
            for key in ['transmission', 'thickness']: assert actual[key] == source[key]
            if source['hasVolume']:
                for key in ['attenuationDistance','attenuationColor']: assert actual[key] == source[key]
            if source['hasSpecular']:
                for key in ['specularIntensity','specularColor']: assert actual[key] == source[key]
    return {'nodes':len(names),'materials':len(expected['materialIndices']),'attachedImages':len(expected['imageIndices']),'authoredClips':len(expected['animations'])}


def content_audit(A, entry, manifest, protocol):
    base = 'capture/' + safe(entry['directory'])
    declared = next(asset for asset in protocol['assets'] if asset['id'] == 'bistro')
    asset = next(asset for asset in manifest['assets'] if asset['id'] == 'bistro')
    for key in ['entry','files','source','input']: assert asset[key] == declared[key]
    assert A.J(base+'/input.json') == declared['input']
    expected = asset['expected']
    for suffix in ['preflight', 'before-close', '']:
        evidence = A.J(base+'/content-transport'+('-'+suffix if suffix else '')+'.json')
        assert evidence['strict'] is True and evidence['input'] == declared['input']
        assert evidence['failures'] == evidence['consoleErrors'] == evidence['mountedRequests'] == []
    source_contract = readiness(expected, A.J(base+'/content-readiness.json'))
    initial = A.J(base+'/native-initial-playback.json')
    case = manifest['cases'][0]
    assert initial['clips'][0]['name'] == case['clip']
    assert [row['name'] for row in initial['clips'] if row['running']] == [case['clip']]
    assert [key for key,value in initial['state'].items() if value] == [case['clip']]
    assert initial['clips'][0]['duration'] == case['clipDuration']
    assert v.finite(initial['clips'][0]['time']) and 0 <= initial['clips'][0]['time'] < case['clipDuration']
    assert initial['clips'][0]['weight'] == 1
    assert [row['name'] for row in initial['clips']] == [row['nativeName'] for row in expected['animations']]
    return dict(directory=entry['directory'], sourceContract=source_contract, nativeFirstClipAutoplay=True, strictTransportIncludingClose=True)


def validate_preparations(A, manifest, expected_hashes):
    assert set(manifest['preparedManifests']) == set(manifest['preparedManifestFiles']) == {'native','timing'}
    rows = []
    for kind, expected in expected_hashes.items():
        proof = manifest['preparedManifestFiles'][kind]
        data = A.B('capture/'+safe(proof['file']))
        assert H(data) == proof['sha256'] == manifest['preparedManifests'][kind] == expected
        assert len(data) == proof['bytes']
        value = json.loads(data)
        assert value['status'] == 'prepared' and value['viewerPin'] == v.VIEWER
        assert value['externalized'] is True
        assert value['instrumentation'] == (None if kind == 'native' else 'timing')
        assert value['integrity'] == {'originalSourcesAndDistUnchanged':True,'capturedInputsUnchanged':True}
        assert not value['errors']
        rows.append(dict(kind=kind,sha256=expected,outputs=len(value['outputs']),warnings=value['warnings']))
    return rows


def verify_capture(args, A):
    global TOOL, EXPECTED_BROWSER, EXPECTED_GPU
    TOOL, EXPECTED_BROWSER, EXPECTED_GPU = args.expected_tool, args.expected_browser, args.expected_gpu
    assert args.expected_runtime == v.CANDIDATE, 'This prospective comparison keeps immutable runtime 85'
    protocol_bytes = args.protocol.read_bytes()
    assert H(protocol_bytes) == args.expected_protocol_sha256
    protocol = json.loads(protocol_bytes)
    manifest = A.J('capture/manifest.json')
    assert manifest['protocol']['sha256'] == H(protocol_bytes)
    assert manifest['protocol']['protocol'] == protocol and manifest['protocol']['verifiedAtToolSha'] == TOOL
    assert protocol['contract'] == 'native-viewer-callbacks-v1' and protocol['adoptionPolicy'] == 'adoption-v1'
    assert protocol['boundary'] == 'Viewer.animate plus every frozen native dat.gui.updateDisplays rAF body'
    assert protocol['quantizationFloor'] == '2 * frozenCallbackCount * minPositiveDeltaMs'
    assert protocol['transport'] == {'network':'playwright','strictContent':True,'browser':'one-process-sequential-fresh-contexts','input':'native-file-input ZIP'}
    assert args.capture.name.startswith(protocol['outputPrefixes']['timing']['engine'])
    assert protocol['outputPrefixes']['timing']['engine'] != protocol['outputPrefixes'].get('profile',{}).get('engine')
    expected_hashes = {'native':args.expected_native_manifest_sha256,'timing':args.expected_timing_manifest_sha256}
    for key,value in expected_hashes.items(): assert protocol['preparedManifests'][key] == value
    preparations = validate_preparations(A, manifest, expected_hashes)
    assert manifest['sourceBefore'] == manifest['sourceAfter']
    assert manifest['inputIntegrityBefore'] == manifest['inputIntegrityAfter']
    inputs = manifest['inputIntegrityBefore']; assert len(inputs) == 1 and inputs[0]['id'] == 'bistro'
    declared = next(asset for asset in protocol['assets'] if asset['id']=='bistro')
    assert inputs[0]['input'] == declared['input'] and declared['input']['assetBytesChanged'] is False
    zip_bytes = args.zip_manifest.read_bytes();zip_manifest = json.loads(zip_bytes)
    assert H(zip_bytes) == declared['input']['preparationManifestSha256']
    assert zip_manifest['status'] == 'prepared' and zip_manifest['assetBytesChanged'] is False and zip_manifest['sourceIntegrityUnchanged'] is True
    assert zip_manifest['content'] == 'bistro' and zip_manifest['entry'] == declared['entry'] and zip_manifest['files'] == declared['files']
    for key in ['file','bytes','sha256']: assert zip_manifest['zip'][key] == declared['input']['zip'][key]
    entries = {row['name']:row for row in zip_manifest['verifiedEntries']}
    assert len(entries) == len(zip_manifest['verifiedEntries'])
    assert inputs[0]['verifiedOriginalFiles'] == len(declared['files'])
    assert inputs[0]['verifiedZipEntries'] == len(entries) == len(declared['files'])+len(zip_manifest['notices'])+1
    expected_names = {row['file'] for row in declared['files']} | {row['zipPath'] for row in zip_manifest['notices']} | {'__notices__/provenance.json'}
    assert set(entries) == expected_names
    for row in declared['files']:
        assert entries[row['file']] == {'name':row['file'],'bytes':row['bytes'],'sha256':row['sha256']}
    for row in zip_manifest['notices']:
        assert entries[row['zipPath']] == {'name':row['zipPath'],'bytes':row['originalBytes'],'sha256':row['originalSHA256']}
    for phase in ['before','after']:
        proof = manifest['environment'+phase.title()]
        assert proof['verifiedAC'] is True
        environment = A.J('capture/'+safe(proof['file']))
        assert environment['power']['available'] is True and 'AC Power' in environment['power']['output']
    original_read = v.read
    try:
        v.read = lambda _root, relative: A.J('capture/'+safe(relative))
        numeric = v.audit_capture(Path('capture'), TOOL, protocol)
    finally: v.read = original_read
    assert numeric['status'] == 'numeric-audit-complete', 'Partial evidence cannot pass this completed capture audit'
    assert numeric['expectedRuns'] == (18 if numeric['mode']=='full' else 6)
    assert len(manifest['oracles']) == 6
    sources, contents = [], []
    for entry in [*manifest['oracles'], *manifest['runs']]:
        sources.append(source_audit(A,'capture',entry,manifest))
        contents.append(content_audit(A,entry,manifest,protocol))
    oracles = oracle_audit(A,'capture',manifest)
    assert oracles['pages'] == 6 and oracles['poses'] == 12 and oracles['nativeOverlayPoseComparisons'] == 6
    assert args.protocol.read_bytes() == protocol_bytes, 'Expected protocol changed during audit'
    assert args.zip_manifest.read_bytes() == zip_bytes, 'Pinned ZIP manifest changed during audit'
    return dict(status='verified',performanceQualification=False,versionMigrationIncluded=False,numeric=numeric,
                metadata=dict(runtimeSha=args.expected_runtime,toolingSha=TOOL,protocolSha256=H(protocol_bytes),browser=EXPECTED_BROWSER,gpuRendererSubstring=EXPECTED_GPU),
                preparations=preparations,zipPreparation=dict(manifestSha256=H(zip_bytes),originalFiles=len(declared['files']),notices=len(zip_manifest['notices']),verifiedEntries=len(entries)),oracles=oracles,sources=sources,content=contents,
                additionalOfflineGate='Reject any raw.activity event in warmup or sample; the capture CLI checks sample only. No raw row is dropped or rewritten.',
                limitations=['A verified audit confirms evidence arithmetic and retained contracts, not a qualified speedup or an FPS result.',
                             'Runtime 85 and same-version engine comparison only; no r176/r186 migration is measured here.',
                             'K3 covers Viewer.animate plus Lighting and Animation GUI bodies. GPU/compositor/asynchronous work and collector bookkeeping remain outside the boundary.',
                             'Four matched-JS repetitions are not dedicated JS A/A with pre/post bookends; a Rust recommendation needs the prospective additional calibration.',
                             'PNG bytes/dimensions and stored pixel hashes are compared; WebGL readPixels is not replayed offline.',
                             'Retained served source bytes and manifests are hashed; original external ZIP/assets are not re-read or re-decoded by this verifier. Full source/asset archive and independent rebuild audits are separate.',
                             'Smoke is tool validation only. Warmup/sample activity and original/JS/Wasm repeat/block stability are separate mandatory checks; invalid or unstable captures remain invalid or inconclusive.'])


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('capture',type=Path);parser.add_argument('--protocol',type=Path,required=True);parser.add_argument('--zip-manifest',type=Path,required=True)
    for name in ['expected-tool','expected-runtime','expected-protocol-sha256','expected-native-manifest-sha256','expected-timing-manifest-sha256','expected-browser','expected-gpu']:
        parser.add_argument('--'+name,required=True)
    parser.add_argument('--out',type=Path,required=True);args=parser.parse_args()
    for name in ['expected_tool','expected_runtime','expected_protocol_sha256','expected_native_manifest_sha256','expected_timing_manifest_sha256']:
        value=getattr(args,name);length=40 if name in ['expected_tool','expected_runtime'] else 64
        assert len(value)==length and all(c in '0123456789abcdef' for c in value),name
    assert args.expected_browser and args.expected_gpu
    assert not args.out.exists(),'Use a fresh audit output directory'
    args.out.mkdir(parents=True,exist_ok=False)
    audit_sources=[]
    for name in ['analyze.py','verify.py','test_audit.py','README.md']:
        data=(Path(__file__).parent/name).read_bytes()
        with (args.out/name).open('xb') as output:output.write(data)
        audit_sources.append(dict(file=name,bytes=len(data),sha256=H(data)))
    with (args.out/'audit-sources.json').open('x') as output:json.dump(audit_sources,output,indent=2);output.write('\n')
    A=Capture(args.capture);result=None
    try:
        result=verify_capture(args,A)
    except Exception as error:
        result=dict(status='failed',performanceQualification=False,errorType=type(error).__name__,error=public_error(error,args))
    finally:
        try: inputs=A.finish()
        except Exception as error:
            inputs=sorted(A.files.values(),key=lambda row:row['path']);result=dict(status='failed',performanceQualification=False,errorType=type(error).__name__,error=public_error(error,args))
        with (args.out/'input-hashes.json').open('x') as output: json.dump(inputs,output,indent=2,allow_nan=False);output.write('\n')
        with (args.out/'audit.json').open('x') as output: json.dump(result,output,indent=2,allow_nan=False);output.write('\n')
    print(json.dumps({'status':result['status'],'performanceQualification':False,'inputFiles':len(inputs)}))
    return 0 if result['status']=='verified' else 1


if __name__=='__main__': sys.exit(main())

