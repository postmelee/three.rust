"""Independently verify/reconstruct the finite Viewer correctness evidence.

Uses only Python's standard library. Does not execute archived code, browser or
Wasm. PNG container bytes/dimensions are checked; GPU pixel hashes remain capture
evidence, not independently reconstructed WebGL readPixels outputs.
"""
from pathlib import Path
import argparse, gzip, hashlib, json, math, struct, re

APP = 'b5ee5dafe27f953ae1b55f42b5fa3697fef08683'
RUNTIME = '85e2c5d500edb0b92ea4ecb997087fded3fed45b'
OLD = '6990fd92f61a031c8c2ba7a8282cfb63684e6dfb'
TOOL = 'e9b736a47f48bc2512476f8966d285d0153419f7'
CASES = ['manual-morph','fixed-play-all','fixed-history-manual-morph','walking-grid-off','walking-grid-on','walking-grid-off-again','helpers-wireframe','environment-none','neutral-background','resized-two-renderers','reloaded-walking']
ROUTES = ['original-r176','external-r176','pure-r186','prepared-js-r186','prepared-wasm-r186']
def sha(data): return hashlib.sha256(data).hexdigest()
def safe(path):
    p = Path(path); assert not p.is_absolute() and '..' not in p.parts and p.as_posix() == path
    return p
def privacy(decoded, logical):
    private=re.compile(r'/Users/|/(?:private/)?(?:var/folders|tmp)/|\(id=\d+\)')
    uuid=re.compile(r'(?i)\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b')
    system=re.compile(r'(?i)^(?:hostname|computer.?name|serial.?number|hardware.?uuid|battery.?id)$')
    def walk(value):
        if isinstance(value,str):assert not private.search(value) and not uuid.search(value)
        elif isinstance(value,list):
            for child in value:walk(child)
        elif isinstance(value,dict):
            for key,child in value.items():
                assert not uuid.search(key)
                assert not system.fullmatch(key) or child in ['',None,'<redacted>']
                walk(child)
    if logical.endswith('.json'):walk(json.loads(decoded))
    if not logical.endswith(('.png','.ico','.wasm')) and not decoded.startswith(b'\x00asm'):
        text=decoded.decode('utf-8');assert not private.search(text)
        if not logical.endswith(('.bin','.js','.mjs','.map','.patch','.original','.adapted')):
            text=text.replace('https://user-images.githubusercontent.com/1848368/31580352-b7354096-b101-11e7-86d7-f07677835812.png','')
            assert not uuid.search(text)
def compare(a,b):
    differences=[]
    if len(a['numeric']) != len(b['numeric']): differences.append({'field':'numericLength','reference':len(a['numeric']),'actual':len(b['numeric'])})
    deltas=[abs(x-y) for x,y in zip(a['numeric'],b['numeric'])]
    assert all(math.isfinite(x) for x in a['numeric']+b['numeric'])
    maxdiff=max(deltas, default=0); failures=sum(d>1e-10+1e-12*abs(x) for x,d in zip(a['numeric'],deltas))
    if failures: differences.append({'field':'numeric','count':failures,'maxAbsoluteDifference':maxdiff})
    for field in ['objects','clips','state','actions']:
        if a.get(field)!=b.get(field):differences.append({'field':field})
    for name in ['main','axes']:
        for field in ['width','height','pixelSha256','quality','work']:
            if a['renderers'][name][field]!=b['renderers'][name][field]:differences.append({'field':name+'.'+field})
    return {'equal':not differences,'differences':differences,'maxAbsoluteDifference':maxdiff,'numericValues':len(a['numeric'])}
def verify(archive, restore=None):
    archive=archive.resolve(strict=True); index=json.loads((archive/'archive-index.json').read_text()); files=index['files']; payloads={}; blobs={}
    if (archive/'derived-files.json').exists():
        for row in json.loads((archive/'derived-files.json').read_text())['files']:
            data=(archive/safe(row['path'])).read_bytes();assert len(data)==row['bytes'] and sha(data)==row['sha256'],'Support file hash changed'
    assert len({x['path'] for x in files})==len(files)
    if restore:
        assert not restore.exists(),'Restore destination must be fresh'
        restore.mkdir(parents=True)
    for row in files:
        safe(row['path']);safe(row['sourcePath']);safe(row['blob'])
        assert row['blob']==f'blobs/{row["decodedSha256"]}.gz'
        if row['blob'] not in blobs:
            data=(archive/row['blob']).read_bytes();assert len(data)==row['storedBytes'] and sha(data)==row['storedSha256']
            decoded=gzip.decompress(data);assert len(decoded)==row['decodedBytes'] and sha(decoded)==row['decodedSha256'];blobs[row['blob']]=decoded
        decoded=blobs[row['blob']]
        assert len(decoded)==row['decodedBytes'] and sha(decoded)==row['decodedSha256']
        if not row['normalizations']:assert row['sourceBytes']==len(decoded) and row['sourceSha256']==sha(decoded)
        else:
            assert row['path'].endswith('.log') or row['path'].endswith('/server-command.json')
            assert all(x['kind']=='local-command-or-log-path' and x['replacement'] in ['<apps-root>','<tool-root>'] and x['occurrences']>0 for x in row['normalizations'])
        payloads[row['path']]=decoded
        privacy(decoded,row['path'])
        if restore:
            p=restore/safe(row['path']);p.parent.mkdir(parents=True,exist_ok=True)
            with p.open('xb') as f:f.write(decoded)
    assert {p.relative_to(archive).as_posix() for p in (archive/'blobs').iterdir()}==set(blobs),'Unindexed or missing blobs'
    for tree in index['sourceTrees']:
        actual=sorted(p[len(tree['path'])+1:] for p in payloads if p.startswith(tree['path']+'/'))
        assert actual==tree['files'],'Missing logical source files'
    def raw(path):return payloads[path]
    def js(path):return json.loads(raw(path))
    audits=[]; total_within=0; total_cross=0; total_numeric=0; png_checks=0; source_checks=0
    for name in index['scope']['captures']:
        prefix='work/task49-viewer-'+name; result=js(prefix+'/result.json')
        assert result['appPin']==APP and result['runtimeSha']==(OLD if name=='smoke-001' else RUNTIME)
        assert result['performanceEvidence'] is False and result['tooling']['sha']==TOOL and result['tooling']['dirty'] is True
        assert result['asset']['sha256']=='047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319'
        within=[]
        for route in result['routes']:
            base=prefix+'/'+route['route'];env=js(base+'/environment.json');adapt=js(base+'/adaptation.json')
            route_runtime=None if route['route'].endswith('r176') else result['runtimeSha']
            assert env['runtimeSha']==route_runtime and env['headed'] is True
            assert env['browser']=='155.0.8059.86' and env['dpr']==1 and env['isolated'] is False
            assert env['viewport']=={'width':1280,'height':720}
            assert adapt['appPin']==APP and adapt['runtimeSha']==route_runtime
            assert js(base+'/integrity.json')['unchanged'] is True
            if route['status']=='passed':assert js(base+'/errors.json')==[]
            for renderer in ['main','axes']:
                gpu=js(base+'/gpu-'+renderer+'.json');assert 'Apple M4 Pro' in gpu['renderer'] and 'Metal' in gpu['renderer'] and 'SwiftShader' not in gpu['renderer']
            for source in js(base+'/captured-sources.json'):
                data=raw(base+'/'+source['file']); assert sha(data)==source['sha256'] and len(data)==source['bytes'];source_checks+=1
            for check in route['checks']:
                case=check['name'];a=js(base+'/'+case+'-0.json');b=js(base+'/'+case+'-1.json');comparison=compare(a,b)
                assert comparison['equal'] and check['withinRouteExactImagesAndNumerics'] is True
                for sample_index,sample in enumerate([a,b]):
                    assert sample['identityFailures']==[] and sample['axesCameraUpIdentity'] is True and sample['controlsCameraIdentity'] is True
                    for renderer in ['main','axes']:
                        png=raw(base+'/'+case+f'-{sample_index}-'+renderer+'.png')
                        assert png.startswith(b'\x89PNG\r\n\x1a\n') and png[12:16]==b'IHDR'
                        assert struct.unpack('>II',png[16:24])==(sample['renderers'][renderer]['width'],sample['renderers'][renderer]['height']);png_checks+=1
                for renderer in ['main','axes']:assert raw(base+'/'+case+'-0-'+renderer+'.png')==raw(base+'/'+case+'-1-'+renderer+'.png')
                within.append({'route':route['route'],'case':case,'numericValues':comparison['numericValues'],'maximumAbsoluteDifference':comparison['maxAbsoluteDifference']});total_numeric+=comparison['numericValues'];total_within+=1
        recomputed=[]
        for expected in result['comparisons']:
            reference=prefix+'/'+expected['reference']+'/'+expected['case'];actual=prefix+'/'+expected['actual']+'/'+expected['case']
            a=js(reference+'-0.json');b=js(actual+'-0.json');comparison=compare(a,b)
            assert all(expected[k]==comparison[k] for k in comparison),'Saved cross-route result disagrees with raw evidence'
            if comparison['equal']:
                for renderer in ['main','axes']:assert raw(reference+'-0-'+renderer+'.png')==raw(actual+'-0-'+renderer+'.png')
            recomputed.append({k:expected[k] for k in ['reference','actual','case','purpose','requiredEqual']}|comparison)
            total_cross+=1;total_numeric+=comparison['numericValues']
        required=[x for x in recomputed if x['requiredEqual']];failed=[x for x in required if not x['equal']]
        if name=='correctness-001':assert result['status']=='failed' and 'setInputFiles' in result['error'] and len(result['routes'])==1
        elif name=='correctness-002':assert result['status']=='failed' and len(failed)==3
        else:assert result['status']=='passed' and not failed and result['inputIntegrityUnchanged'] is True
        audits.append({'capture':name,'status':result['status'],'runtimeSha':result['runtimeSha'],'routeChecks':within,'comparisons':recomputed,'requiredComparisons':len(required),'requiredFailures':failed})
    final=audits[-1];assert final['capture']=='correctness-004' and len(final['routeChecks'])==55 and len(final['comparisons'])==44 and final['requiredComparisons']==33
    final_result=js('work/task49-viewer-correctness-004/result.json');assert [x['route'] for x in final_result['routes']]==ROUTES
    for route in final_result['routes']:assert [x['name'] for x in route['checks']]==CASES
    preparations=[]
    for n in ['001','002']:
        prefix='work/task49-viewer-external-'+n;manifest=js(prefix+'/manifest.json');assert manifest['status']=='prepared' and manifest['viewerPin']==APP
        for output in manifest['outputs']:
            data=raw(prefix+'/'+output['file']);assert sha(data)==output['sha256'] and len(data)==output['bytes']
        preparations.append(manifest)
    executable=[x['file'] for x in preparations[0]['outputs'] if x['file'].endswith(('.js','.css'))]
    for file in executable:assert raw('work/task49-viewer-external-001/'+file)==raw('work/task49-viewer-external-002/'+file)
    for proof in preparations[1]['sourceMaps']:
        mapping=js('work/task49-viewer-external-002/'+proof['file'])
        assert sha(mapping['mappings'].encode())==proof['mappingsSha256'] and proof['nonPathPayloadUnchanged'] is True
        assert sha(json.dumps(mapping['sourcesContent'],separators=(',',':'),ensure_ascii=False).encode())==proof['sourcesContentSha256']
    snapshot=js('work/task49-viewer-tools-004/manifest.json');assert snapshot['runtimeSha']==RUNTIME and snapshot['toolingGitStateAtCapture']=={'sha':TOOL,'dirty':True}
    actual_tool_hashes={}
    for row in snapshot['files']:
        data=raw('work/task49-viewer-tools-004/'+row['file']);assert sha(data)==row['sha256'] and len(data)==row['bytes'];actual_tool_hashes[row['file']]=sha(data)
    for row in final_result['tooling']['files']:assert actual_tool_hashes[row['file']]==row['sha256']
    for route in ROUTES:
        adapt=js('work/task49-viewer-correctness-004/'+route+'/adaptation.json')
        for row in adapt['tooling']['files']:
            file=row['file'].removeprefix('tooling/');assert actual_tool_hashes[file]==row['sha256']
        assert js('work/task49-viewer-correctness-004/'+route+'/environment.json')['helperSha256']==actual_tool_hashes['scripts/apps/viewer-browser.mjs']
    for n in ['003','004']:
        report=js('work/task49-viewer-server-node-'+n+'/summary.json');assert report['browserExecuted'] is False and len(report['checks'])==5 and all(x['pass'] for x in report['checks'])
    return {'format':1,'status':'passed','logicalFiles':len(files),'physicalBlobs':len(blobs),'normalizedFiles':[x['path'] for x in files if x['normalizations']],'captures':audits,'independentWithinRouteComparisons':total_within,'independentCrossRouteComparisons':total_cross,'orderedNumericValuesCompared':total_numeric,'pngContainersAndDimensionsChecked':png_checks,'executedSourceHashChecks':source_checks,'preparationExecutableParity':executable,'snapshot004FilesVerified':len(snapshot['files']),'finalRequiredComparisons':33,'finalRequiredMaximumAbsoluteDifference':max(x['maxAbsoluteDifference'] for x in final['comparisons'] if x['requiredEqual']),'limits':['Finite fixed-state correctness, not a continuous timing/profiling or full compatibility claim.','002 uncontrolled-history differences remain failures; subsequent matched history does not establish their complete cause.','GPU pixel hashes are preserved; cross-route PNG byte equality and container dimensions are independently checked.','Capture used dirty tools; exact 004 snapshot verified. Earlier historical tool hashes are retained without claiming complete executable tool snapshots.','Runtime/source/transport provenance and all failed raw records are retained; power and performance stability are not qualified by this archive.']}
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--archive',type=Path,default=Path(__file__).parent);p.add_argument('--out',type=Path);p.add_argument('--restore',type=Path);a=p.parse_args();result=verify(a.archive,a.restore)
    if a.out:
        with a.out.open('x') as f:f.write(json.dumps(result,indent=2)+'\n')
    else:assert result==json.loads((a.archive/'audit.json').read_text()),'Saved audit differs'
    print(json.dumps({k:v for k,v in result.items() if k not in ['captures','limits','normalizedFiles']}))
