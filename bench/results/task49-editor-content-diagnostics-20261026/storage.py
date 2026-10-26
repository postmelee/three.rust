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
