"""Independent archived Viewer timing audit. Python 3.10+, standard library.
No live browser or JavaScript analyzer. Verifies stored hashes, source manifests,
fixed-state oracles, raw callback groups, phase/counters, quantiles and stability.
Run only after all captures finish. Use --out FRESH_JSON to preserve the result.
"""
from pathlib import Path
import argparse, gzip, hashlib, importlib.util, json, math, posixpath, struct, sys
sys.dont_write_bytecode = True
spec=importlib.util.spec_from_file_location('numeric_audit',Path(__file__).with_name('analyze.py'))
v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
TOOL='42121c8ff9bc4e83a65991072a03d9514ce5823c'
SUITES=['engine-smoke','engine-full','migration-smoke','migration-full']
MAX=100_000_000

def H(b):return hashlib.sha256(b).hexdigest()
def safe(p):
    assert isinstance(p,str) and p and not p.startswith('/') and '\\' not in p
    assert posixpath.normpath(p)==p and '..' not in p.split('/')
    return p

class Archive:
    def __init__(self,root):
        self.root=root.resolve(strict=True);self.index=json.loads((root/'archive-index.json').read_text());self.files={};self.blobs={}
        assert self.index['format']==2 and json.loads((root/'build-status.json').read_text())['status']=='complete'
        for r in self.index['files']:
            p=safe(r['path']);safe(r['sourcePath']);assert p not in self.files
            assert r['storage']=='blobs/'+r['sha256']+('.gz' if r['gzip'] else '.bin')
            f=root/safe(r['storage']);assert not f.is_symlink() and f.resolve().is_relative_to(root.resolve())
            if r['storage'] not in self.blobs:
                b=f.read_bytes();assert len(b)<MAX and H(b)==r['sha256'] and len(b)==r['storedBytes']
                d=gzip.decompress(b) if r['gzip'] else b;assert len(d)<MAX;self.blobs[r['storage']]=d
            d=self.blobs[r['storage']];assert H(d)==r['decodedSha256'] and len(d)==r['decodedBytes']
            if not r['normalizations']:assert r['sourceDecodedSha256']==r['decodedSha256']
            else:assert p.endswith(('.json','.json.gz'))
            self.files[p]=r
        assert {p.name for p in (root/'blobs').iterdir()}=={Path(p).name for p in self.blobs}
        for row in self.index['sourceSuites']:
            assert sum(p.startswith(row['label']+'/') for p in self.files)==row['fileCount']
        derived=root/'derived-files.json'
        if derived.exists():
            for row in json.loads(derived.read_text())['files']:
                file=root/safe(row['file']);assert not file.is_symlink()
                b=file.read_bytes();assert H(b)==row['sha256'] and len(b)==row['bytes'],'Derived support file changed: '+row['file']
    def entry(self,p):
        safe(p);return self.files[p if p in self.files else p+'.gz']
    def B(self,p):return self.blobs[self.entry(p)['storage']]
    def J(self,p):return json.loads(self.B(p))
    def exists(self,p):return p in self.files or p+'.gz' in self.files
    def extract(self,destination):
        assert not destination.exists(),'Refusing extraction overwrite'
        destination.mkdir(parents=True,exist_ok=False)
        for row in self.index['files']:
            name=row['path']
            if row['gzip'] and not row['sourceGzip']:name=name.removesuffix('.gz')
            target=destination/safe(name);target.parent.mkdir(parents=True,exist_ok=True)
            data=self.B(row['path'])
            if row['sourceGzip']:data=gzip.compress(data,mtime=0)
            with target.open('xb') as output:output.write(data)



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
        gpu=A.J(run+'/gpu-'+name+'.json');assert 'Apple M4 Pro' in gpu['renderer'] and 'Metal' in gpu['renderer'] and 'SwiftShader' not in gpu['renderer']
    env=A.J(run+'/environment.json');assert env['headed'] and env['isolated'] and env['viewport']=={'width':1280,'height':720} and env['dpr']==1
    assert env['route']==entry['engine'] and env['browser']=='155.0.8059.86'
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


def preparation_audit(A):
    records=[]
    for kind in ['native','timing','timingOriginal']:
        base='preparation/'+kind;m=A.J(base+'/manifest.json');changes={x['file']:x for x in m['adaptations']}
        checks=0
        for row in m['outputs']:
            b=A.B(base+'/'+row['file']);assert H(b)==row['sha256'] and len(b)==row['bytes'];checks+=1
        for row in m['adaptations']:
            prefix=base+'/'+row['patch'].removesuffix('.patch');before=A.B(prefix+'.original');after=A.B(prefix+'.adapted')
            assert H(before)==row['originalSha256'] and len(before)==row['originalBytes']
            assert H(after)==row['servedSha256'] and len(after)==row['servedBytes']
            old=before.decode().removesuffix('\n').split('\n');new=after.decode().removesuffix('\n').split('\n')
            patch='\n'.join(['--- a/'+row['file'],'+++ b/'+row['file'],f'@@ -1,{len(old)} +1,{len(new)} @@',*['-'+x for x in old],*['+'+x for x in new],''])
            assert A.B(base+'/'+row['patch'])==patch.encode();checks+=3
            if row['file']=='node_modules/dat.gui/build/dat.gui.module.js':
                assert row.get('kind')=='native GUI callback timing envelope; source file not changed'
                original=next(x for x in m['buildInputs'] if x['file']=='viewer/'+row['file']);assert original['sha256']==H(before)
            else:assert A.B(base+'/source/'+row['file'])==after
        input_checks=0
        for row in m['buildInputs']:
            if row['file'].startswith('adapted/'):
                b=A.B(base+'/source/'+row['file'].removeprefix('adapted/'));assert H(b)==row['sha256'] and len(b)==row['bytes'];input_checks+=1
        records.append({'kind':kind,'manifestSha256':H(A.B(base+'/manifest.json')),'outputAndPatchByteChecks':checks,'adaptedBuildInputChecks':input_checks,'adaptations':len(changes),'thirdPartyInputInventoryRetained':True})
    return records


def verify(root):
    A=Archive(root);result={'status':'verified','qualification':False,'logicalFiles':len(A.files),'physicalBlobs':len(A.blobs),'captures':[],'preparation':preparation_audit(A)}
    saved=v.read
    try:
        v.read=lambda root,relative:A.J(str(root)+'/'+relative)
        for label in SUITES:
            m=A.J(label+'/manifest.json');numeric=v.audit_capture(label,TOOL)
            protocol=A.B('protocols/'+Path(m['protocol']['file']).name);assert H(protocol)==m['protocol']['sha256'] and json.loads(protocol)==m['protocol']['protocol']
            assert m['protocol']['verifiedAtToolSha']==TOOL
            environments={}
            for phase in ['before','after']:
                e=A.J(label+'/environment-'+phase+'/runner.json');assert 'AC Power' in e['power']['output'];environments[phase]=e
            for key,proof in m['preparedManifestFiles'].items():
                b=A.B(label+'/'+proof['file']);assert H(b)==proof['sha256']==m['preparedManifests'][key] and len(b)==proof['bytes']
            sources=[source_audit(A,label,entry,m) for entry in [*m['runs'],*m['oracles']]]
            result['captures'].append({'label':label,'startedAt':m['startedAt'],'finishedAt':m['finishedAt'],'numeric':numeric,'oracles':oracle_audit(A,label,m),'sources':sources})
    finally:v.read=saved
    result['limitations']=['All six original A/A screens failed: descriptive observations, no qualified speedup or FPS claim.','Engine and migration sessions are separate. Their changed pure-r186 regime is unresolved; do not pool or subtract across them.','Callback timing covers disjoint Viewer.animate and three native GUI callbacks, not whole-browser CPU, GPU time, or frame completion. Timing instrumentation overhead is uncalibrated.','PNG bytes/dimensions and stored raw-pixel SHA equality are checked; this verifier does not recreate WebGL readPixels.','Native oracle pages retain source inventories and exact HTML; captureSources is disabled there. Timed pages retain served JavaScript/Wasm bytes. Existing build hashes are evidence, not an independent rebuild certification.','Dedicated matched-JS A/A, startup/memory/long interaction, broader content/behavior and cross-device/day qualification remain unperformed.']
    return result

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--archive',type=Path,default=Path(__file__).resolve().parent);p.add_argument('--out',type=Path);p.add_argument('--extract',type=Path);args=p.parse_args();r=verify(args.archive)
    if args.extract:Archive(args.archive).extract(args.extract)
    if args.out:
        with args.out.open('x') as f:json.dump(r,f,indent=2,allow_nan=False);f.write('\n')
    print(json.dumps({'status':r['status'],'qualification':False,'logicalFiles':r['logicalFiles'],'physicalBlobs':r['physicalBlobs'],'captures':[{'label':x['label'],'runs':x['numeric']['capturedRuns'],'groups':x['numeric']['measuredGroups'],'oraclePages':x['oracles']['pages'],'oraclePoses':x['oracles']['poses']} for x in r['captures']]}))
