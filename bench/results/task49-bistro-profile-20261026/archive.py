"""Archive only the Bistro native profile captures, strict failures, secondary counts and audits.
Python 3.10+ standard library. No browser, downloads, build, or scene asset copy.
Usage: python3 archive.py --root REPO --out FRESH_DIRECTORY
"""
from pathlib import Path
import argparse,gzip,hashlib,json,re,struct,subprocess,zipfile
INPUTS=[
 ('smoke-ac-failure','work/task49-viewer-bistro-zip-profile-smoke-001','capture'),
 ('smoke','work/task49-viewer-bistro-zip-profile-smoke-002','capture'),
 ('smoke-partial-weighted','work/task49-viewer-bistro-zip-profile-smoke-analysis-001','partial-analysis'),
 ('engine-full','work/task49-viewer-bistro-zip-engine-profile-full-001','capture'),
 ('engine-strict','work/task49-viewer-bistro-zip-engine-profile-full-analysis-001','analysis'),
 ('engine-counts','work/task49-viewer-bistro-zip-engine-count-analysis-001','analysis'),
 ('engine-count-audit','work/task49-viewer-bistro-count-audit-001','audit'),
 ('profile-validity','work/task49-viewer-bistro-profile-validity-001','audit'),
 ('migration-full','work/task49-viewer-bistro-zip-migration-profile-full-001','capture'),
 ('migration-strict','work/task49-viewer-bistro-zip-migration-profile-analysis-001','analysis'),
 ('migration-counts','work/task49-viewer-bistro-zip-migration-count-analysis-001','analysis'),
 ('migration-count-audit','work/task49-viewer-bistro-migration-audit-001','audit')
]
NAMES=[x[0] for x in INPUTS]
GUARD_TOOL='6e9e857748ec0c5380430026b7c24ca8bf6726f3'
MAX=100_000_000
PRIVATE=re.compile(r'/Users/|/(?:private/)?(?:var/folders|tmp)/')
UUID=re.compile(r'(?i)\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b')
def H(b):return hashlib.sha256(b).hexdigest()
def safe(p):assert isinstance(p,str) and p and not Path(p).is_absolute() and '..' not in Path(p).parts and str(Path(p))==p and '\\' not in p;return p

def public_json(text,relative):
    original=json.loads(text);changes={};notes=set()
    def string(value,where):
        result=value
        if where and where[-1]=='url' and 'proxyBlocked' in where and result.startswith('http://clients2.google.com/time/1/current?'):
            result,n=re.subn(r'([?&]cup2(?:key|hreq)=)[^&]*',r'\1<browser-nonce>',result)
            if n:notes.add('Browser-generated time-service nonce redacted only in denied proxy URL query fields; destination/method/denial preserved')
        if PRIVATE.search(result):
            approved=bool(where and (str(where[-1]).lower() in ['error','stack','message','url','path','file','filename','executablepath'] or 'arguments' in where or 'command' in where))
            assert approved,'Unexpected private path field requires review: '+str(where)
            result=re.sub(r'/Users/[^/\s"\\]+','<home>',result)
            result=re.sub(r'/(?:private/)?(?:var/folders|tmp)/[^\s"\\)]+','<temporary-path>',result)
            notes.add('Private path normalized only in an explicit error/path/browser-argument metadata field')
        assert not PRIVATE.search(result)
        if re.search(r'\(id=\d+\)',result):
            assert 'power' in where and where[-1]=='output','Unexpected battery ID location'
            result=re.sub(r'\(id=\d+\)','(id=<redacted>)',result);notes.add('Battery instance ID string normalized in runner power output only')
        # Scene/CDP identifiers are public operation evidence, not machine IDs.
        if where and str(where[-1]).lower() in ['hostname','computername','hardwareuuid','batteryid','serialnumber','serial_num']:
            assert value in ['',None,'<redacted>'],'Unexpected system identity field'
        return result
    def inspect(value,where=()):
        if isinstance(value,str):
            changed=string(value,where)
            if changed!=value:changes[value]=changed
        elif isinstance(value,dict):
            for k,x in value.items():
                if re.fullmatch(r'(?i)(?:host.?name|computer.?name|hardware.?uuid|battery.?id|serial(?:number|_num|_number)?)',k):
                    assert x in [None,'','<redacted>'],'Unexpected system identity metadata'
                inspect(x,where+(k,))
        elif isinstance(value,list):
            for i,x in enumerate(value):inspect(x,where+(i,))
    inspect(original);public=text
    for before,after in changes.items():
        token=json.dumps(before,ensure_ascii=False);assert token in public;public=public.replace(token,json.dumps(after,ensure_ascii=False))
    def invariant(a,b,where=()):
        assert type(a) is type(b)
        if isinstance(a,str):assert b==string(a,where)
        elif isinstance(a,dict):
            assert list(a)==list(b)
            for k in a:invariant(a[k],b[k],where+(k,))
        elif isinstance(a,list):
            assert len(a)==len(b)
            for i,(x,y) in enumerate(zip(a,b)):invariant(x,y,where+(i,))
        elif isinstance(a,float):assert struct.pack('>d',a)==struct.pack('>d',b)
        else:assert a==b
    invariant(original,json.loads(public));return public.encode(),sorted(notes)

def build(root,out):
    assert not out.exists(),'Fresh archive required';out.mkdir(parents=True);rows=[];sources={};listings={};cache={};inputs=[];support=[]
    write=lambda p,x:(out/p).write_text(json.dumps(x,indent=2)+'\n')
    status={'status':'building','inputs':inputs};write('build-status.json',status)
    def add(data,logical,source,source_gzip=False,visible=False):
        safe(logical);safe(source);assert len(data)<MAX;decoded=gzip.decompress(data) if source_gzip else data;assert len(decoded)<MAX;notes=[]
        try:txt=decoded.decode()
        except UnicodeDecodeError:public=decoded
        else:
            if re.search(r'\.(?:json|cpuprofile)(?:\.gz)?$',logical):public,notes=public_json(txt,logical)
            elif logical.startswith(('engine-count-audit/','migration-count-audit/')) and logical.endswith('.log'):
                public=re.sub(r'/Users/[^/\s"\\]+','<home>',txt).encode()
                if public!=decoded:notes.append('Private home component normalized only in an independent audit traceback log; exception, numeric text and path suffix preserved')
                assert not PRIVATE.search(public.decode())
            else:assert not PRIVATE.search(txt),'Unreviewed private text: '+logical;public=decoded
        digest=H(public);blob='blobs/'+digest+'.gz'
        if digest not in cache:cache[digest]=gzip.compress(public,compresslevel=9,mtime=0);(out/'blobs').mkdir(exist_ok=True);(out/blob).write_bytes(cache[digest])
        stored=cache[digest];assert not any(r['logicalPath']==logical for r in rows)
        rows.append({'logicalPath':logical,'sourcePath':source,'sourceSha256':H(data),'decodedSourceSha256':H(decoded),'publicSha256':digest,'storedSha256':H(stored),'sourceBytes':len(data),'publicBytes':len(public),'storedBytes':len(stored),'sourceGzip':source_gzip,'blob':blob,'normalizations':notes})
        if visible:
            f=out/logical;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(public);support.append({'file':logical,'bytes':len(public),'sha256':digest,'sourceSha256':H(data)})
    def copy(p,logical,visible=False):
        assert p.is_file() and not p.is_symlink();b=p.read_bytes();add(b,logical,str(p.relative_to(root)),p.suffix=='.gz',visible);sources[p]=H(b)
    try:
        tooling={};protocols={}
        for label,relative,kind in INPUTS:
            folder=root/relative
            if kind=='capture':
                m=json.loads((folder/'manifest.json').read_text());assert m['status'] in ['capture-complete-attribution-pending','failed'] and m['finishedAt'];assert m['sourceIntegrity']=='passed' and not m['sourceBefore']['tooling']['dirty'];sha=m['sourceBefore']['tooling']['sha'];status_value=m['status']
                for f,h in m['toolHashes'].items():tooling[(sha,f)]=h
                if m['protocol']:protocols[(sha,m['protocol']['file'])]=m['protocol']['sha256']
            elif kind=='analysis':
                m=json.loads((folder/'summary.json').read_text());assert m['status'] in ['analysis-complete','incomplete-invalid-profiles','incomplete-capture'];assert isinstance(m['runs'],list) and isinstance(m['analysisFailures'],list) and not m['analysisTool']['dirty'];status_value=m['status'];sha=m['analysisTool']['sha']
                for f,h in m['analysisTool']['hashes'].items():tooling[(sha,f)]=h
            elif kind=='partial-analysis':
                assert not (folder/'summary.json').exists();m=json.loads((folder/'analysis-attempt.json').read_text());status_value='partial-analysis-without-summary';sha=None
                for f in folder.glob('*.json'):
                    record=json.loads(f.read_text());tool=record.get('analysisTool',{})
                    if tool.get('hashes'):
                        assert not tool['dirty'];sha=tool['sha']
                        for file,h in tool['hashes'].items():tooling[(sha,file)]=h
            else:m=json.loads((folder/'audit.json').read_text());status_value=m.get('status','derived-audit');sha=None
            files=sorted(f for f in folder.rglob('*') if f.is_file());assert not any(f.is_symlink() for f in folder.rglob('*'));listings[folder]=[str(f.relative_to(folder)) for f in files]
            inputs.append({'label':label,'sourcePath':relative,'kind':kind,'recordedStatus':status_value,'recordedToolSha':sha,'files':len(files),'performanceQualification':False})
            for f in files:copy(f,label+'/'+str(f.relative_to(folder)))
        for (sha,f),h in sorted(tooling.items()):
            assert re.fullmatch('[a-f0-9]{40}',sha);safe(f);b=subprocess.run(['git','show',sha+':'+f],cwd=root,check=True,stdout=subprocess.PIPE).stdout;assert H(b)==h;add(b,'tool-sources/'+sha+'/'+f,'git/'+sha+'/'+f)
        for (sha,f),h in sorted(protocols.items()):
            b=subprocess.run(['git','show',sha+':'+f],cwd=root,check=True,stdout=subprocess.PIPE).stdout;assert H(b)==h;target='protocols/'+Path(f).name
            if not (out/target).exists():add(b,target,'git/'+sha+'/'+f,visible=True)
        prep=root/'bench/results/task49-content-preparation-20261026';copy(prep/'bistro-fetch-manifest.json','asset-provenance/bistro-fetch-manifest.json')
        for name in ['bistro-conversion-LICENSE.txt.gz','bistro-conversion-README.md.gz']:copy(prep/'notices'/name,'licenses/'+name.removesuffix('.gz'),True)
        copy(root/'work/task49-editor-bistro-zip-001/manifest.json','asset-provenance/bistro-zip-preparation.json')
        copy(root/'bench/results/task49-native-content-correctness-20261026/zip-input-audit.json','asset-provenance/prior-zip-input-audit.json')
        for f in sorted((root/'bench/results/task49-viewer-profile-20261026/licenses').rglob('*')):
            if f.is_file():copy(f,'licenses/'+str(f.relative_to(root/'bench/results/task49-viewer-profile-20261026/licenses')),True)
        for p,h in sources.items():assert H(p.read_bytes())==h,'Raw input changed during archival'
        for p,listing in listings.items():assert sorted(str(f.relative_to(p)) for f in p.rglob('*') if f.is_file())==listing
        write('archive-index.json',{'format':1,'kind':'Task49 Bistro profile captures, failures and secondary counts; no primary performance qualification','inputs':inputs,'files':rows,'policy':'Every selected original file preserved. Failed weighted profiles are never repaired. Huge source assets and ZIP payloads excluded. Only explicit metadata battery IDs or approved traceback home components normalized; source/image/numeric bytes, public scene/Blob IDs and original statuses remain unchanged.'})
        write('support-index.json',{'records':support});status.update(status='complete',logicalFiles=len(rows),uniqueBlobs=len(cache),storedBytes=sum(map(len,cache.values())),normalizedFiles=sum(bool(e['normalizations']) for e in rows),sourceHashesRechecked=True,sourceListingsUnchanged=True);write('build-status.json',status);print(json.dumps(status|{'inputs':len(inputs)}))
    except BaseException as e:
        status.update(status='failed',errorType=type(e).__name__,error=str(e).replace(str(root),'<repository>'),copiedFiles=len(rows));write('build-status.json',status);write('partial-index.json',{'files':rows});raise

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args();build(a.root.resolve(strict=True),a.out.resolve())
