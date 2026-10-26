"""Preserve explicitly listed finished Bistro timing attempts in a FRESH archive.
No browser, build, asset download, analysis rerun or numerical repair. Do not run
while any browser capture is active. All source roots are explicit CLI inputs;
only public aliases and repository-relative source paths enter the index.
"""
from pathlib import Path
import argparse,gzip,hashlib,json,posixpath,re,struct,subprocess
MAX=100_000_000
PRIVATE=re.compile(r'/Users/|/(?:private/)?(?:var/folders|tmp)/')
SERIAL=re.compile(r'(?i)^(?:serial(?:_num|_number|Number)?|spdisplays_display-serial-number)$')
def H(data):return hashlib.sha256(data).hexdigest()
def safe(name):
 assert isinstance(name,str) and name and not name.startswith('/') and '\\' not in name and posixpath.normpath(name)==name and '..' not in name.split('/');return name

REVIEWED_ARCHIVE_SOURCE_HASHES={'archive-build-failure/archive.py': '79075f7e50fc89e4b4cde8d85add2560aad2d1625676f8468a8971b573988f2a', 'archive-build-failure-002/archive.py': 'd96ae4493a0a2e367ff15a26809cf00d9305ba4293fc9553894343a70f2bf054'}

def public_source(text,name):
 inspected=text
 if name in REVIEWED_ARCHIVE_SOURCE_HASHES:
  assert H(text.encode())==REVIEWED_ARCHIVE_SOURCE_HASHES[name],'Historical builder bytes differ from reviewed source'
  inspected=text.replace('/Users/[','<home-regex>/[').replace('/Users/|','<home-regex>/|')
 assert not PRIVATE.search(inspected),'Private source/text requires review: '+name
 return text.encode()

def public_json(text,path):
 original=json.loads(text);replacements={};notes=set();parts=Path(path).parts;runner=parts[-1]=='runner.json' and len(parts)>2 and parts[-2] in ['environment-before','environment-after']
 def string(value,where):
  result=value
  if re.search(r'\(id=\d+\)',result):
   assert runner and where==('power','output'),'Battery identity outside explicit runner power field';result=re.sub(r'\(id=\d+\)','(id=<redacted>)',result);notes.add('Battery instance ID in explicit runner power output; status/settings/numbers unchanged')
  if where and SERIAL.fullmatch(str(where[-1])):
   assert runner and where[0] in ['hardware','graphics'];result='<redacted>';notes.add('Hardware/display serial in explicit environment string field')
  if PRIVATE.search(result):
   assert where and str(where[-1]).lower() in ['error','stack','message','path','file','filename','executablepath'],'Unexpected private path requires review';result=re.sub(r'/Users/[^/\s"\\]+','<home>',result);notes.add('Approved home prefix in explicit error/path metadata; suffix preserved')
  assert not PRIVATE.search(result),'Unexpected private temporary path requires review'
  return result
 def visit(x,where=()):
  if isinstance(x,str):
   y=string(x,where)
   if y!=x:replacements[x]=y
  elif isinstance(x,dict):
   for k,y in x.items():
    if re.fullmatch(r'(?i)(?:hostname|computer.?name|hardware.?uuid|battery.?id)',k):assert y in ['',None,'<redacted>']
    if SERIAL.fullmatch(k):assert isinstance(y,str) and runner and where and where[0] in ['hardware','graphics']
    visit(y,where+(k,))
  elif isinstance(x,list):
   for i,y in enumerate(x):visit(y,where+(i,))
 visit(original);public=text
 for before,after in replacements.items():
  token=json.dumps(before,ensure_ascii=False);assert token in public;public=public.replace(token,json.dumps(after,ensure_ascii=False))
 def invariant(x,y,where=()):
  assert type(x) is type(y)
  if isinstance(x,str):assert y==string(x,where)
  elif isinstance(x,dict):
   assert list(x)==list(y)
   for k in x:invariant(x[k],y[k],where+(k,))
  elif isinstance(x,list):
   assert len(x)==len(y)
   for i,(a,b) in enumerate(zip(x,y)):invariant(a,b,where+(i,))
  elif isinstance(x,float):assert struct.pack('>d',x)==struct.pack('>d',y)
  else:assert x==y
 invariant(original,json.loads(public));return public.encode(),sorted(notes)

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--root',type=Path,required=True);ap.add_argument('--out',type=Path,required=True);ap.add_argument('--viewer-root',type=Path,required=True);ap.add_argument('--source-root',action='append',default=[],help='Public alias=absolute source checkout');ap.add_argument('--suite',action='append',required=True,help='label=alias:relative capture');ap.add_argument('--preparation',action='append',required=True,help='kind=alias:relative prepared tree');ap.add_argument('--evidence',action='append',default=[],help='label=alias:relative frozen independent audit tree');args=ap.parse_args();root=args.root.resolve(strict=True);out=args.out.resolve();roots={'repository':root};viewer=args.viewer_root.resolve(strict=True)
 for pair in args.source_root:
  alias,path=pair.split('=',1);assert re.fullmatch('[a-z][a-z0-9-]*',alias) and alias not in roots;roots[alias]=Path(path).resolve(strict=True)
 def source(spec):
  alias,relative=spec.split(':',1);safe(relative);p=(roots[alias]/relative).resolve(strict=True);assert p.is_relative_to(roots[alias]);return p,alias+'/'+relative
 def declarations(rows):
  result={}
  for text in rows:
   label,ref=text.split('=',1);assert re.fullmatch('[a-z][a-z0-9-]*',label) and label not in result;result[label]=source(ref)
  return result
 suites=declarations(args.suite);preps=declarations(args.preparation);evidence=declarations(args.evidence);assert set(preps)=={'native','timing'};assert not set(suites)&set(evidence)
 manifests={}
 for label,(folder,_) in suites.items():
  m=json.loads((folder/'manifest.json').read_text());assert m['status'] in ['failed','smoke-complete-not-performance-evidence','screen-complete-unqualified'] and m['finishedAt'] and 'sourceIntegrity' in m;manifests[label]=m
 assert not out.exists(),'Fresh archive required';out.mkdir(parents=True);entries=[];originals={};listings={};blobs={};link_targets={};link_records=[];dependency_inputs={};status={'status':'building','sourceSuites':[]};write=lambda name,x:(out/name).write_text(json.dumps(x,indent=2)+'\n');write('build-status.json',status)
 def add(data,name,origin,source_gzip=False,visible=False):
  safe(name);safe(origin);assert len(data)<MAX;decoded=gzip.decompress(data) if source_gzip else data;assert len(decoded)<MAX;notes=[]
  try:text=decoded.decode()
  except UnicodeDecodeError:public=decoded
  else:
   if name.endswith(('.json','.json.gz')):public,notes=public_json(text,name)
   elif name.endswith(('.log','.txt')) and name.split('/')[0] in evidence:
    public=re.sub(r'/Users/[^/\s"\\]+','<home>',text).encode();assert not PRIVATE.search(public.decode());notes=['Approved traceback home prefix normalized; suffix and numerical/error evidence preserved'] if public!=decoded else []
   else:
    public=public_source(text,name)
  logical=name if name.endswith('.gz') else name+'.gz';assert not any(r['path']==logical for r in entries)
  digest=H(public)
  if digest not in blobs:blobs[digest]=gzip.compress(public,compresslevel=9,mtime=0)
  stored=blobs[digest];storage='blobs/'+H(stored)+'.gz';target=out/storage;target.parent.mkdir(exist_ok=True)
  if not target.exists():target.write_bytes(stored)
  entries.append({'path':logical,'storage':storage,'sourcePath':origin,'sourceSha256':H(data),'sourceDecodedSha256':H(decoded),'decodedSha256':digest,'sha256':H(stored),'sourceBytes':len(data),'decodedBytes':len(public),'storedBytes':len(stored),'sourceGzip':source_gzip,'gzip':True,'normalizations':notes})
  if visible:
   target=out/name.removesuffix('.gz');target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(public)
 def copy(path,name,origin,visible=False):
  assert path.is_file() and not path.is_symlink();data=path.read_bytes();add(data,name,origin,path.suffix=='.gz',visible);originals[path]=H(data)
 def tree(folder,prefix,origin):
  assert folder.is_dir() and not folder.is_symlink() and not out.is_relative_to(folder);all_paths=list(folder.rglob('*'))
  for link in [p for p in all_paths if p.is_symlink()]:
   relative=str(link.relative_to(folder));expected=viewer/'node_modules';assert prefix in ['preparation/native','preparation/timing'] and relative=='source/node_modules' and expected.is_dir() and not expected.is_symlink(),'Unapproved directory link';target=str(link.readlink());assert target==str(expected) and link.resolve(strict=True)==expected;raw=target.encode();link_targets[link]=raw;link_records.append({'path':prefix+'/'+relative,'sourcePath':origin+'/'+relative,'originalTargetSha256':H(raw),'originalTargetBytes':len(raw),'publicTarget':'<pinned-viewer>/node_modules','viewerSha':'b5ee5dafe27f953ae1b55f42b5fa3697fef08683','kind':'external dependency directory symlink','handling':'Not traversed. Only exact manifest build-input files and original package/lock bytes are copied separately; complete node_modules installation is excluded.'})
  files=sorted(p for p in all_paths if p.is_file());listings[folder]=[str(p.relative_to(folder)) for p in files]
  for path in files:relative=str(path.relative_to(folder));copy(path,prefix+'/'+relative,origin+'/'+relative)
  return len(files)
 try:
  tools={};protocols={};viewer_sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=viewer,text=True).strip();assert viewer_sha=='b5ee5dafe27f953ae1b55f42b5fa3697fef08683';assert not subprocess.check_output(['git','status','--porcelain','--untracked-files=no'],cwd=viewer,text=True).strip()
  for label,(folder,origin) in suites.items():
   m=manifests[label];count=tree(folder,label,origin);sha=m['sourceBefore']['tooling']['sha'];assert not m['sourceBefore']['tooling']['dirty'];status['sourceSuites'].append({'label':label,'sourceDirectory':origin,'captureStatus':m['status'],'mode':m['configuration']['mode'],'toolingSha':sha,'candidateSha':m['candidateSha'],'finishedAt':m['finishedAt'],'fileCount':count})
   for file,h in m['toolHashes'].items():tools[(sha,file)]=h
   protocol=m['protocol'];protocols[(sha,protocol['file'])]=(protocol['sha256'],protocol['protocol'])
  for kind,(folder,origin) in preps.items():
   b=(folder/'manifest.json').read_bytes();assert all(H(b)==m['preparedManifests'][kind] for m in manifests.values());tree(folder,'preparation/'+kind,origin)
   pm=json.loads(b);assert not pm['tooling']['dirty']
   for row in pm['tooling']['files']:tools[(pm['tooling']['sha'],row['file'].removeprefix('tooling/'))]=row['sha256']
   for row in [*[x for x in pm['buildInputs'] if x['file'].startswith('viewer/node_modules/')],*[x for x in pm['sources'] if x['file'] in ['viewer/package.json','viewer/yarn.lock']]]:
    if row['file'] in dependency_inputs:assert dependency_inputs[row['file']]==row
    dependency_inputs[row['file']]=row
  extras=[]
  for label,(folder,origin) in evidence.items():extras.append({'label':label,'sourceDirectory':origin,'fileCount':tree(folder,label,origin)})
  for file,row in sorted(dependency_inputs.items()):
   relative=safe(file.removeprefix('viewer/'));source_file=viewer/relative;data=source_file.read_bytes();assert H(data)==row['sha256'] and len(data)==row['bytes'];copy(source_file,'dependency-inputs/'+file,'pinned-viewer/'+relative)
  for (sha,file),h in sorted(tools.items()):
   safe(file);assert re.fullmatch('[a-f0-9]{40}',sha);data=subprocess.check_output(['git','show',sha+':'+file],cwd=root);assert H(data)==h;add(data,'tool-sources/'+sha+'/'+file,'git/'+sha+'/'+file)
  for (sha,file),(h,value) in sorted(protocols.items()):
   data=subprocess.check_output(['git','show',sha+':'+safe(file)],cwd=root);assert H(data)==h and json.loads(data)==value;name='protocols/'+Path(file).name
   if not (out/name).exists():add(data,name,'git/'+sha+'/'+file,visible=True)
  licenses=root/'bench/results/task49-bistro-profile-20261026/licenses'
  for path in sorted(licenses.rglob('*')):
   if path.is_file():copy(path,'licenses/'+str(path.relative_to(licenses)),'repository/'+str(path.relative_to(root)),True)
  for relative in ['work/task49-editor-bistro-zip-001/manifest.json','bench/results/task49-content-preparation-20261026/bistro-fetch-manifest.json','bench/results/task49-native-content-correctness-20261026/zip-input-audit.json']:
   copy(root/relative,'asset-provenance/'+Path(relative).parent.name+'/'+Path(relative).name,'repository/'+relative,True)
  for path,h in originals.items():assert H(path.read_bytes())==h,'Original changed during archival'
  for link,target in link_targets.items():assert link.is_symlink() and str(link.readlink()).encode()==target and link.resolve(strict=True)==viewer/'node_modules','Preparation link changed during archival'
  assert len(link_records)==2;write('preparation-links.json',{'links':link_records,'originalTargetHashesRechecked':True,'targetDirectoryTraversal':False,'manifestDependencyFiles':list(dependency_inputs),'originalViewerSourceSha':viewer_sha,'originalTrackedViewerClean':True})
  for path,files in listings.items():assert sorted(str(p.relative_to(path)) for p in path.rglob('*') if p.is_file())==files,'Input tree changed during archival'
  index={'format':2,'kind':'Task49 Bistro native ZIP callback timing; every explicitly listed attempt retained','sourceSuites':status['sourceSuites'],'sourceEvidence':extras,'preparationSources':[{'kind':k,'sourceDirectory':p[1]} for k,p in preps.items()],'normalizationPolicy':'Only explicit battery/serial environment strings and reviewed traceback/home metadata. Native Blob/scene UUIDs, source/image bytes, every raw callback, numbers and order preserved. Original/public/stored hashes remain separate. Large source ZIP/assets are not copied.','files':entries};write('archive-index.json',index);status.update(status='complete',payloads=len(entries),uniqueBlobs=len(blobs),uniqueStoredBytes=sum(map(len,blobs.values())),sourceHashesRechecked=True,sourceListingsUnchanged=True);write('build-status.json',status);print(json.dumps(status|{'sourceSuites':len(suites)}))
 except BaseException as error:
  status.update(status='failed',errorType=type(error).__name__,error=re.sub(r'/Users/[^/\s"\\]+','<home>',str(error)),copiedPayloads=len(entries));write('build-status.json',status);write('partial-index.json',{'files':entries});raise
if __name__=='__main__':main()
