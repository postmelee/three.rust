"""Format-2 archive storage and preparation patch checks, adapted from Robot timing archive."""
from pathlib import Path
import gzip,hashlib,json,posixpath
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
            else:assert p.endswith(('.json','.json.gz','.log.gz','.txt.gz'))
            self.files[p]=r
        assert {p.name for p in (root/'blobs').iterdir()}=={Path(p).name for p in self.blobs}
        for row in self.index['sourceSuites']:
            assert sum(p.startswith(row['label']+'/') for p in self.files)==row['fileCount']
        derived=root/'derived-files.json'
        if derived.exists():
            support=json.loads(derived.read_text())['files'];actual={str(p.relative_to(root)) for p in root.rglob('*') if p.is_file() and 'blobs' not in p.relative_to(root).parts and p.name!='derived-files.json'};assert actual=={row['file'] for row in support},'Visible support coverage differs'
            for row in support:
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

def preparation_audit(A):
    records=[]
    for kind in ['native','timing']:
        base='preparation/'+kind;m=A.J(base+'/manifest.json');changes={x['file']:x for x in m['adaptations']}
        checks=0
        assert not m['tooling']['dirty']
        for row in m['tooling']['files']:
            data=A.B('tool-sources/'+m['tooling']['sha']+'/'+row['file'].removeprefix('tooling/'));assert H(data)==row['sha256'] and len(data)==row['bytes'];checks+=1
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
        for row in [*[x for x in m['buildInputs'] if x['file'].startswith('viewer/node_modules/')],*[x for x in m['sources'] if x['file'] in ['viewer/package.json','viewer/yarn.lock']]]:
            data=A.B('dependency-inputs/'+row['file']);assert H(data)==row['sha256'] and len(data)==row['bytes'];input_checks+=1
        for row in m['buildInputs']:
            if row['file'].startswith('adapted/'):
                b=A.B(base+'/source/'+row['file'].removeprefix('adapted/'));assert H(b)==row['sha256'] and len(b)==row['bytes'];input_checks+=1
        records.append({'kind':kind,'manifestSha256':H(A.B(base+'/manifest.json')),'outputAndPatchByteChecks':checks,'adaptedBuildInputChecks':input_checks,'adaptations':len(changes),'thirdPartyInputInventoryRetained':True})
    return records
