"""Archive only the selected native Editor content correctness failures and diagnoses.
Python 3.10+ standard library. No browser, downloads, build, or scene asset copy.
Usage: python3 archive.py --root REPO --out FRESH_DIRECTORY
"""
from pathlib import Path
import argparse,gzip,hashlib,json,re,struct,subprocess,zipfile
NAMES=['chess-correctness-001','chess-correctness-002','bistro-correctness-001','chess-focus-diagnostic-001','chess-focus-diagnostic-002','chess-correctness-003','chess-native-input-correctness-001','bistro-native-input-correctness-001']
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
    assert not out.exists(),'Fresh archive required';out.mkdir(parents=True);rows=[];sources={};listings={};cache={};inputs=[]
    write=lambda p,x:(out/p).write_text(json.dumps(x,indent=2)+'\n')
    status={'status':'building','inputs':inputs};write('build-status.json',status)
    def add(data,logical,source,source_gzip=False):
        safe(logical);safe(source);assert len(data)<MAX;decoded=gzip.decompress(data) if source_gzip else data;assert len(decoded)<MAX;notes=[]
        try:txt=decoded.decode()
        except UnicodeDecodeError:public=decoded
        else:
            if logical.endswith(('.json','.json.gz')):public,notes=public_json(txt,logical)
            else:assert not PRIVATE.search(txt),'Unreviewed private text: '+logical;public=decoded
        digest=H(public);blob='blobs/'+digest+'.gz'
        if digest not in cache:cache[digest]=gzip.compress(public,compresslevel=9,mtime=0);(out/'blobs').mkdir(exist_ok=True);(out/blob).write_bytes(cache[digest])
        stored=cache[digest];assert not any(r['path']==logical for r in rows)
        rows.append({'path':logical,'sourcePath':source,'sourceSha256':H(data),'decodedSourceSha256':H(decoded),'decodedSha256':digest,'storedSha256':H(stored),'sourceBytes':len(data),'decodedBytes':len(public),'storedBytes':len(stored),'sourceGzip':source_gzip,'blob':blob,'normalizations':notes})
        if logical.startswith('notices/'):
            f=out/logical;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(data if source_gzip else public)
    def copy(p,logical):
        assert p.is_file() and not p.is_symlink();b=p.read_bytes();add(b,logical,str(p.relative_to(root)),p.suffix=='.gz');sources[p]=H(b)
    try:
        tooling={}
        for label in NAMES:
            folder=root/'work'/('task49-editor-'+label);r=json.loads((folder/'result.json').read_text());assert r['status'] in ['passed','failed','preparing','running'] and not r['performanceEvidence'];assert not r.get('tooling',{}).get('dirty',False)
            files=sorted(f for f in folder.rglob('*') if f.is_file());assert not any(f.is_symlink() for f in folder.rglob('*'));listings[folder]=[str(f.relative_to(folder)) for f in files]
            inputs.append({'label':label,'sourceDirectory':str(folder.relative_to(root)),'recordedStatus':r['status'],'recordedToolSha':r.get('tooling',{}).get('sha'),'files':len(files)})
            for f in files:copy(f,label+'/'+str(f.relative_to(folder)))
            for f,h in r.get('tooling',{}).get('files',{}).items():tooling[(r['tooling']['sha'],f)]=h
        for (sha,f),h in sorted(tooling.items()):
            assert re.fullmatch('[a-f0-9]{40}',sha);safe(f);b=subprocess.run(['git','show',sha+':'+f],cwd=root,check=True,stdout=subprocess.PIPE).stdout;assert H(b)==h;add(b,'tool-sources/'+sha+'/'+f,'git/'+sha+'/'+f)
        for name in ['task49-editor-chess-zip-002','task49-editor-bistro-zip-001']:copy(root/'work'/name/'manifest.json','zip-preparation/'+name+'/manifest.json')
        for name in ['task49-editor-chess-image-diagnostic-001']:
            folder=root/'work'/name
            for f in sorted(folder.rglob('*')):
                if f.is_file():copy(f,'image-diagnostics/'+name+'/'+str(f.relative_to(folder)))
        copy(root/'work/task49-editor-focus-diagnostic-execution-001/execution-record.json','execution-owner/focus-diagnostic-001.json')
        copy(root/'work/task49-viewer-chess-image-aa-audit-001/audit.py','image-diagnostics/decoder-dependency/audit.py')
        prep=root/'bench/results/task49-content-preparation-20261026'
        for name in ['bistro-fetch-manifest.json','beautiful-game-fetch-manifest.json']:copy(prep/name,'asset-provenance/'+name)
        for name in ['a-beautiful-game-README.md.gz','bistro-conversion-LICENSE.txt.gz','bistro-conversion-README.md.gz']:copy(prep/'notices'/name,'notices/'+name)
        previous=root/'bench/results/task49-native-content-correctness-20261026';copy(previous/'zip-input-audit.json','zip-preparation/retained-zip-input-audit.json')
        for f in sorted((root/'bench/results/task49-editor-single-correctness-20261026/licenses').rglob('*')):
            if f.is_file() and f.name=='THREE-LICENSE.txt':copy(f,'notices/'+str(f.relative_to(root/'bench/results/task49-editor-single-correctness-20261026/licenses')))
        for p,h in sources.items():assert H(p.read_bytes())==h,'Raw input changed during archival'
        for p,listing in listings.items():assert sorted(str(f.relative_to(p)) for f in p.rglob('*') if f.is_file())==listing
        write('archive-index.json',{'format':1,'kind':'Task49 native Editor content correctness and bounded diagnostics; not performance evidence','inputs':inputs,'files':rows,'policy':'Every selected original output file preserved. Huge source assets and ZIP payloads excluded. Explicit private-path metadata strings only; source/image/numeric bytes and failed statuses remain unchanged.'})
        status.update(status='complete',logicalFiles=len(rows),physicalBlobs=len(cache),sourceHashesRechecked=True,sourceListingsUnchanged=True);write('build-status.json',status)
        print(json.dumps({'status':'complete','files':len(rows),'blobs':len(cache),'normalizedFiles':sum(bool(e['normalizations']) for e in rows),'uniqueStoredBytes':sum(map(len,cache.values()))}))
    except BaseException as e:
        status.update(status='failed',errorType=type(e).__name__,error=str(e).replace(str(root),'<repository>'),copiedFiles=len(rows));write('build-status.json',status);write('partial-index.json',{'files':rows});raise

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args();build(a.root.resolve(strict=True),a.out.resolve())
