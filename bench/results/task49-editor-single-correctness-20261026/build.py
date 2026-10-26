"""Archive six terminal Editor correctness datasets without changing any source bytes.
Only known public scene UUID/reference fields are allowed; unexpected private data
fails closed. No browser execution, normalization or capture selection is performed.
"""
from pathlib import Path
import argparse,gzip,hashlib,json,re
MAX=100_000_000
UUID=re.compile(r'(?i)\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b')
PRIVATE=re.compile(r'/Users/|/(?:private/)?(?:var/folders|tmp)/|\(id=\d+\)')
SYSTEM=re.compile(r'(?i)^(?:hostname|computer.?name|serial.?number|hardware.?uuid|battery.?id)$')
ROUTES={'original':'original','prepared-js':'js','prepared-wasm':'wasm'}
def sha(b):return hashlib.sha256(b).hexdigest()
def privacy(value,file,path=()):
 if isinstance(value,str):
  assert not PRIVATE.search(value),'Private path/instance string requires explicit review'
  if UUID.search(value):
   scene=bool(re.fullmatch(r'E[12]-scene-[01]\.json',file))
   keys=[k for k in path if not isinstance(k,int)]
   allowed=scene and keys and keys[0] in ['camera','scene'] and keys[-1] in ['uuid','geometry','material','target','skeleton','bones','animations']
   assert allowed and UUID.fullmatch(value),'UUID outside known public scene identity/reference field'
 elif isinstance(value,dict):
  for k,v in value.items():
   assert not UUID.search(k),'UUID object key requires explicit review'
   assert not SYSTEM.fullmatch(k) or v in ['',None,'<redacted>'],'Private system metadata requires explicit review'
   privacy(v,file,path+(k,))
 elif isinstance(value,list):
  for i,v in enumerate(value):privacy(v,file,path+(i,))
def listing(root):
 out=[]
 for p in root.rglob('*'):
  assert not p.is_symlink(),'Symlinks are not accepted'
  if p.is_file():out.append(p.relative_to(root).as_posix())
  else:assert p.is_dir()
 return sorted(out)
def build(root,input_path,out):
 root=root.resolve(strict=True);source=(root/input_path).resolve(strict=True);out=out.resolve()
 assert source.is_relative_to(root) and not out.is_relative_to(source) and not source.is_relative_to(out)
 assert not out.exists(),'Archive destination must be fresh'
 sources=[]
 for route,label in ROUTES.items():
  for suite in ['check','ui']:
   d=source/route/suite;r=json.loads((d/'result.json').read_text())
   assert r['status'] in ['passed','failed'],'Dataset is not terminal'
   for required in ['environment.json','errors.json','integrity.json','adaptation.json']:assert (d/required).is_file(),required
   sources.append((d,f'canonical/{label}-{suite}',listing(d),r['status']))
 for route,label in ROUTES.items():
  logs=[f'{suite}.log' for suite in ['check','ui'] if (source/route/f'{suite}.log').is_file()]
  if logs:sources.append((source/route,f'logs/{label}',logs,'process-log'))
 allfiles=listing(source);expected=sorted(str((d/f).relative_to(source)) for d,_,files,_ in sources for f in files)
 assert allfiles==expected,'Unlisted source files or attempts require explicit inclusion'
 out.mkdir(parents=True);entries=[]
 try:
  for d,label,files,status in sources:
   for file in files:
    src=d/file;raw=src.read_bytes();assert len(raw)<MAX
    isgzip=file.endswith('.gz');decoded=gzip.decompress(raw) if isgzip else raw;assert len(decoded)<MAX
    logical=file.removesuffix('.gz');isjson=logical.endswith('.json')
    if isjson:privacy(json.loads(decoded),Path(logical).name)
    elif src.suffix!='.png':assert not PRIVATE.search(decoded.decode()),'Private data in source/text requires explicit review'
    stored=gzip.compress(decoded,compresslevel=9,mtime=0) if isjson else decoded
    assert len(stored)<MAX
    rel=label+'/'+logical+('.gz' if isjson else '');target=out/rel;target.parent.mkdir(parents=True,exist_ok=True)
    with target.open('xb') as f:f.write(stored)
    public=gzip.decompress(stored) if isjson else stored
    assert public==decoded,'Archival changed source bytes'
    entries.append({'path':rel,'sourcePath':src.relative_to(root).as_posix(),'sourceSha256':sha(raw),'sourceDecodedSha256':sha(decoded),'decodedSha256':sha(public),'sha256':sha(stored),'sourceBytes':len(raw),'decodedBytes':len(public),'storedBytes':len(stored),'sourceGzip':isgzip,'gzip':isjson,'normalizations':[]})
  assert listing(source)==allfiles,'Source listing changed'
  for e in entries:assert sha((root/e['sourcePath']).read_bytes())==e['sourceSha256'],'Source changed during archive'
  index={'format':1,'normalizationPolicy':'All payload bytes are preserved after lossless JSON gzip. No normalization was required or performed. Public Three.js scene UUIDs/references are preserved only in the explicitly reviewed E1/E2 scene fields; unexpected UUIDs, private paths or system identity fields fail closed. Original and decoded/stored archive hashes are separate.','sourceToPublicNumericEquality':'Decoded bytes are identical, preserving every JSON numeric token, structure, string, UUID and negative zero.','datasets':[{'path':label,'sourcePath':d.relative_to(root).as_posix(),'status':status} for d,label,_,status in sources if label.startswith('canonical/')],'files':entries}
  (out/'archive-index.json').write_text(json.dumps(index,indent=2)+'\n')
  (out/'build-status.json').write_text(json.dumps({'status':'complete','payloads':len(entries),'storedBytes':sum(e['storedBytes'] for e in entries),'sourceHashesRechecked':True,'sourceListingsUnchanged':True,'normalizedFiles':0},indent=2)+'\n')
 except Exception as e:
  (out/'partial-index.json').write_text(json.dumps({'files':entries},indent=2)+'\n')
  # Raw exception paths stay local; the public failure marker contains no private paths.
  (out/'build-status.json').write_text(json.dumps({'status':'failed','errorType':type(e).__name__,'copiedFiles':len(entries)},indent=2)+'\n')
  raise
 return {'status':'complete','payloads':len(entries),'storedBytes':sum(e['storedBytes'] for e in entries)}
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=Path,required=True);p.add_argument('--input',required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
 assert not Path(a.input).is_absolute() and '..' not in Path(a.input).parts
 print(json.dumps(build(a.root,a.input,a.out)))
