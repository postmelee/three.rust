"""Archive only the thirteen completed Viewer content/transport attempts.
Python 3.10+ standard library. No browser, downloads, build, or scene asset copy.
Usage: python3 archive.py --root REPO --out FRESH_DIRECTORY
"""
from pathlib import Path
import argparse,gzip,hashlib,json,re,struct,subprocess
NAMES=['bistro-correctness-001','chess-correctness-001','bistro-transport-diagnostic-002','chess-transport-diagnostic-002','transport-probe-001','chess-default-framing-diagnostic-001','chess-content-length-diagnostic-001','network-guard-browser-001','chess-proxy-playwright-diagnostic-001','chess-proxy-cdp-diagnostic-001','chess-default-framing-diagnostic-002','chess-proxy-playwright-diagnostic-002','chess-proxy-cdp-diagnostic-002']
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
            approved=bool(where and (str(where[-1]).lower() in ['error','stack','message','url','path','file','filename','executablepath'] or 'arguments' in where))
            assert approved,'Unexpected private path field requires review: '+str(where)
            result=re.sub(r'/Users/[^/\s"\\]+','<home>',result)
            result=re.sub(r'/(?:private/)?(?:var/folders|tmp)/[^\s"\\)]+','<temporary-path>',result)
            notes.add('Private path normalized only in an explicit error/path/browser-argument metadata field')
        assert not PRIVATE.search(result)
        assert not re.search(r'\(id=\d+\)',result),'Unexpected battery ID'
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
    assert not out.exists(),'Fresh archive required';out.mkdir(parents=True);entries=[];sources={};listings={};cache={};inputs=[]
    write=lambda p,x:(out/p).write_text(json.dumps(x,indent=2)+'\n')
    status={'status':'building','inputs':inputs};write('build-status.json',status)
    def add(data,logical,source,source_gzip=False):
        safe(logical);safe(source);assert len(data)<MAX
        decoded=gzip.decompress(data) if source_gzip else data;assert len(decoded)<MAX;notes=[]
        try:text=decoded.decode()
        except UnicodeDecodeError:public=decoded
        else:
            if logical.endswith(('.json','.json.gz')):public,notes=public_json(text,logical)
            else:assert not PRIVATE.search(text),'Unexpected private source text';public=decoded
        digest=H(public)
        if digest not in cache:cache[digest]=gzip.compress(public,compresslevel=9,mtime=0)
        stored=cache[digest];assert len(stored)<MAX;blob='blobs/'+digest+'.gz';p=out/blob;p.parent.mkdir(exist_ok=True)
        if not p.exists():p.write_bytes(stored)
        entry={'path':logical,'sourcePath':source,'sourceSha256':H(data),'decodedSourceSha256':H(decoded),'decodedSha256':digest,'storedSha256':H(stored),'sourceBytes':len(data),'decodedBytes':len(public),'storedBytes':len(stored),'sourceGzip':source_gzip,'blob':blob,'normalizations':notes}
        assert not any(e['path']==logical for e in entries);entries.append(entry)
        if logical.startswith('notices/'):
            visible=out/logical;visible.parent.mkdir(exist_ok=True)
            visible.write_bytes(data if source_gzip else public)
    def copy(path,logical):
        assert path.is_file() and not path.is_symlink();data=path.read_bytes();add(data,logical,str(path.relative_to(root)),path.suffix=='.gz');sources[path]=H(data)
    try:
        toolfiles={}
        for name in NAMES:
            p=root/('work/task49-viewer-'+name);r=json.loads((p/'result.json').read_text())
            if name!='network-guard-browser-001':assert r['status'] in ['passed','failed','collected','incomplete'];assert r['tooling']['sha'];assert r['performanceEvidence'] is False
            files=sorted(f for f in p.rglob('*') if f.is_file());assert not any(f.is_symlink() for f in p.rglob('*'))
            listings[p]=sorted(str(f.relative_to(p)) for f in files)
            inputs.append({'label':name,'sourceDirectory':str(p.relative_to(root)),'files':len(files),'recordedStatus':r.get('status'),'recordedToolSha':r.get('tooling',{}).get('sha'),'runtimeSha':r.get('runtimeSha'),'guardToolOwnerRecord':GUARD_TOOL if name=='network-guard-browser-001' else None})
            for f in files:copy(f,name+'/'+str(f.relative_to(p)))
            if r.get('tooling'):
                for row in r['tooling']['files']:toolfiles[(r['tooling']['sha'],row['file'])]=row['sha256']
            for f in p.glob('*/adaptation.json'):
                m=json.loads(f.read_text())
                for row in m.get('tooling',{}).get('files',[]):toolfiles[(m['tooling']['sha'],row['file'].removeprefix('tooling/'))]=row['sha256']
        for sha,file in [(GUARD_TOOL,'tests/viewer-transport-guard-browser.mjs'),(GUARD_TOOL,'scripts/apps/viewer-transport-guard.mjs')]:toolfiles.setdefault((sha,file),None)
        for (sha,file),expected in sorted(toolfiles.items()):
            assert re.fullmatch('[a-f0-9]{40}',sha);safe(file)
            b=subprocess.run(['git','show',sha+':'+file],cwd=root,check=True,stdout=subprocess.PIPE).stdout
            if expected is not None:assert H(b)==expected,'Captured helper differs from committed source'
            add(b,'tool-sources/'+sha+'/'+file,'git/'+sha+'/'+file)
        prep=root/'bench/results/task49-content-preparation-20261026'
        for name in ['bistro-fetch-manifest.json','beautiful-game-fetch-manifest.json']:copy(prep/name,'asset-provenance/'+name)
        for name in ['a-beautiful-game-README.md.gz','bistro-conversion-LICENSE.txt.gz','bistro-conversion-README.md.gz']:copy(prep/'notices'/name,'notices/'+name)
        for name in ['Viewer-LICENSE','THREE-LICENSE.txt']:copy(root/'bench/results/task49-viewer-profile-20261026/licenses'/name,'notices/'+name)
        for p,h in sources.items():assert H(p.read_bytes())==h,'Source changed during archival'
        for p,names in listings.items():assert sorted(str(f.relative_to(p)) for f in p.rglob('*') if f.is_file())==names
        write('archive-index.json',{'format':1,'kind':'Task49 original-content failures and bounded transport diagnostics; not performance evidence','inputs':inputs,'files':entries,'policy':'Every selected original output file preserved with source/public/stored hashes. Scene asset payloads excluded by scope; pinned fetch manifests/notices preserved. Failed statuses unchanged. Only explicit private path or denied browser nonce metadata strings normalized with exact numeric token/type/value/sign/key-order invariance.'})
        status.update(status='complete',logicalFiles=len(entries),physicalBlobs=len(cache),sourceHashesRechecked=True,sourceListingsUnchanged=True);write('build-status.json',status)
        print(json.dumps({'status':'complete','files':len(entries),'blobs':len(cache),'normalizedFiles':sum(bool(e['normalizations']) for e in entries),'uniqueStoredBytes':sum(len(b) for b in cache.values())}))
    except BaseException as error:
        status.update(status='failed',errorType=type(error).__name__,error=str(error).replace(str(root),'<repository>'),copiedFiles=len(entries));write('build-status.json',status);write('partial-index.json',{'files':entries});raise

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=Path,required=True);p.add_argument('--out',type=Path,required=True);args=p.parse_args();build(args.root.resolve(strict=True),args.out.resolve())
