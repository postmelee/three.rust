"""Build a FRESH final-integration correctness archive from frozen explicit inputs.
No capture, source alteration, browser, or timing analysis. Python stdlib only.
"""
from pathlib import Path
import argparse,gzip,hashlib,json,posixpath,re,struct,subprocess
MAX=100_000_000
SHA='96b0b4c0e7d55c22c1f2c22955356b9822e67d22'
VIEWER='b5ee5dafe27f953ae1b55f42b5fa3697fef08683'
EDITOR='9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8'
HOME=re.compile('/'+'Users/[^/\\s"\\\\]+')
PRIVATE=re.compile('/'+'Users/|/(?:private/)?(?:var/folders|tmp)/')
IDENTITY=re.compile(r'(?i)^(?:host.?name|computer.?name|hardware.?uuid|battery.?id|serial(?:number|_num|_number)?)$')
def H(b):return hashlib.sha256(b).hexdigest()
def safe(p):
 assert isinstance(p,str) and p and not p.startswith('/') and '\\' not in p and posixpath.normpath(p)==p and '..' not in p.split('/');return p

def public_json(text,path):
 original=json.loads(text);changes={};notes=set();parts=Path(path).parts
 runner=parts[-1]=='runner.json' and len(parts)>2 and parts[-2] in ['environment-before','environment-after']
 def string(value,where):
  result=value
  if re.search(r'\(id=\d+\)',result):
   assert runner and where==('power','output'),'Battery identity outside explicit power output';result=re.sub(r'\(id=\d+\)','(id=<redacted>)',result);notes.add('Battery instance ID in explicit environment power output only')
  if PRIVATE.search(result):
   approved=where and (str(where[-1]).lower() in ['error','stack','message','url','path','file','filename','executablepath','stdout','stderr'] or 'command' in where or 'arguments' in where)
   assert approved,'Unreviewed private JSON field '+str(where);result=HOME.sub('<home>',result);notes.add('Approved home prefix in explicit command/error/path metadata; suffix and numeric values preserved')
  assert not PRIVATE.search(result),'Unexpected temporary path requires review'
  return result
 def visit(x,where=()):
  if isinstance(x,str):
   y=string(x,where)
   if y!=x:changes[x]=y
  elif isinstance(x,dict):
   for k,y in x.items():
    if IDENTITY.fullmatch(k):assert y in ['',None,'<redacted>'],'Unexpected private identity'
    visit(y,where+(k,))
  elif isinstance(x,list):
   for i,y in enumerate(x):visit(y,where+(i,))
 visit(original);public=text
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

STATUS_LOG_SHA='4c40d906b1ddf305e224843378f456548aab2fd6859c598a03950c9738e70f40'
def status_temp_line(text):
 pattern=r'(?m)^Status site: /var/folders/[A-Za-z0-9_]+/[A-Za-z0-9_]+/T/tmp[A-Za-z0-9_]+/site; 2 real daily points$'
 result,count=re.subn(pattern,'Status site: <temporary-path>/site; 2 real daily points',text)
 assert count==1,'Exactly one approved status-site line required'
 assert not PRIVATE.search(result),'Unreviewed additional private path'
 return result

def public_text(text,name,aliases):
 notes=[]
 if name=='software-suite/08.log':
  assert H(text.encode())==STATUS_LOG_SHA,'Status log differs from reviewed bytes';text=status_temp_line(text);notes.append('Approved status-site temporary root only; /site suffix and 2 real daily points unchanged')
 if name=='execution-driver/run.py':
  for value,alias in aliases.items():
   if value in text:text=text.replace(value,alias);notes.append('Driver path substituted with '+alias+'; restore local checkout paths before execution')
 elif name.endswith(('.log','.txt')) and name.split('/')[0] in ['build','node','browser','software-suite','execution','editor-audit','viewer-audit','publication-failed','publication-passed','analyzer-checks','archive-build-failure']:
  result=HOME.sub('<home>',text)
  if result!=text:notes.append('Approved traceback/build log home prefix normalized; suffix and numbers preserved')
  text=result
 assert not PRIVATE.search(text),'Unreviewed private source/text: '+name
 return text.encode(),notes

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--root',type=Path,required=True);ap.add_argument('--final-root',type=Path,required=True);ap.add_argument('--apps-root',type=Path,required=True);ap.add_argument('--out',type=Path,required=True);ap.add_argument('--tree',action='append',required=True,help='label=repository|final:relative-directory');ap.add_argument('--file',action='append',default=[],help='logical=repository|final:relative-file');a=ap.parse_args()
 root=a.root.resolve(strict=True);final=a.final_root.resolve(strict=True);apps=a.apps_root.resolve(strict=True);out=a.out.resolve();roots={'repository':root,'final':final}
 def git(cwd,*args):return subprocess.check_output(['git',*args],cwd=cwd)
 assert git(final,'rev-parse','HEAD').decode().strip()==SHA and not git(final,'status','--porcelain').strip()
 for app,pin in [('viewer',VIEWER),('editor',EDITOR)]:assert git(apps/app,'rev-parse','HEAD').decode().strip()==pin and not git(apps/app,'status','--porcelain','--untracked-files=no').strip()
 def decl(value):
  name,ref=value.split('=',1);safe(name);alias,path=ref.split(':',1);safe(path);p=roots[alias]/path;assert p.resolve(strict=True).is_relative_to(roots[alias]);return name,p,alias+'/'+path
 trees=[decl(x) for x in a.tree];single=[decl(x) for x in a.file];assert len({x[0] for x in trees+single})==len(trees+single)
 assert not out.exists(),'Fresh archive required';out.mkdir(parents=True);rows=[];sources={};listings={};links={};blobs={};status={'status':'building'};inputs=[]
 write=lambda path,value:(out/path).write_text(json.dumps(value,indent=2)+'\n')
 write('build-status.json',status)
 aliases={str(root):'<repository>',str(final):'<final-checkout>',str(apps):'<pinned-apps>'}
 def add(data,name,origin,source_gzip=False,visible=False,public_git=False):
  safe(name);safe(origin);assert len(data)<MAX;decoded=gzip.decompress(data) if source_gzip else data;assert len(decoded)<MAX;notes=[]
  try:text=decoded.decode()
  except UnicodeDecodeError:public=decoded
  else:
   if public_git:public=decoded # Exact already-public Git source; no local path is introduced.
   elif name.endswith(('.json','.json.gz')):public,notes=public_json(text,name)
   else:public,notes=public_text(text,name,aliases)
  logical=name if name.endswith('.gz') else name+'.gz';assert logical not in {r['path'] for r in rows}
  digest=H(public)
  if digest not in blobs:blobs[digest]=gzip.compress(public,compresslevel=9,mtime=0)
  stored=blobs[digest];storage='blobs/'+H(stored)+'.gz';p=out/storage;p.parent.mkdir(exist_ok=True)
  if not p.exists():p.write_bytes(stored)
  rows.append({'path':logical,'storage':storage,'sourcePath':origin,'sourceSha256':H(data),'sourceDecodedSha256':H(decoded),'decodedSha256':digest,'sha256':H(stored),'sourceBytes':len(data),'decodedBytes':len(public),'storedBytes':len(stored),'sourceGzip':source_gzip,'gzip':True,'normalizations':notes})
  if visible:
   p=out/name.removesuffix('.gz');p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(public)
 def copy(p,name,origin,visible=False):
  assert p.is_file() and not p.is_symlink();data=p.read_bytes();sources[p]=H(data);add(data,name,origin,p.suffix=='.gz',visible)
 try:
  for label,folder,origin in trees:
   allpaths=list(folder.rglob('*'));flinks=[p for p in allpaths if p.is_symlink()]
   for link in flinks:
    target=apps/'viewer/node_modules';assert label=='preparation' and str(link.relative_to(folder))=='source/node_modules' and target.is_dir() and not target.is_symlink() and str(link.readlink())==str(target) and link.resolve(strict=True)==target,'Unapproved symlink';links[link]=str(link.readlink()).encode()
   files=sorted(p for p in allpaths if p.is_file());listings[folder]=([str(p.relative_to(folder)) for p in files],[str(p.relative_to(folder)) for p in flinks])
   for p in files:copy(p,label+'/'+str(p.relative_to(folder)),origin+'/'+str(p.relative_to(folder)))
   inputs.append({'label':label,'sourceDirectory':origin,'fileCount':len(files)})
  for name,p,origin in single:copy(p,name,origin)
  state=json.loads((root/'work/task49-final-app-execution-001/source-before.json').read_text());assert state==json.loads((root/'work/task49-final-app-execution-001/source-after.json').read_text()) and state['sha']==SHA and not state['dirty']
  for file,h in state['artifacts'].items():assert H((final/file).read_bytes())==h
  # Preserve every candidate artifact used in Editor plus candidate served addon inputs.
  candidate={}
  editor_sources={}
  for route in ['original','prepared-js','prepared-wasm']:
   for kind in ['check','ui']:
    folder=root/'work/task49-final-editor-correctness-001'/route/kind;ad=json.loads((folder/'adaptation.json').read_text())
    for row in ad.get('candidate',{}).get('artifacts',[]):candidate[row['file'].removeprefix('candidate/')]=(row['sha256'],row['bytes'])
    for row in json.loads((folder/'served-files.json').read_text()):
     file=row['file'];value=(row.get('originalSha256',row['sha256']),row.get('originalBytes',row['bytes']))
     if file.startswith('candidate/'):candidate[file.removeprefix('candidate/')]=value
     elif file.startswith('editor/'):
      if file in editor_sources:assert editor_sources[file]==value
      editor_sources[file]=value
  for route in ['original-r176','external-r176','pure-r186','prepared-js-r186','prepared-wasm-r186']:
   for row in json.loads((root/'work/task49-final-viewer-correctness-001'/route/'served-files.json').read_text()):
    if row['file'].startswith('candidate/'):
     file='packages/rthree/'+row['file'].removeprefix('candidate/');value=(row['sha256'],row['bytes'])
     if file in candidate:assert candidate[file]==value
     candidate[file]=value
  for file,(h,n) in sorted(candidate.items()):
   p=final/safe(file);b=p.read_bytes();assert H(b)==h and len(b)==n;copy(p,'runtime-artifacts/'+file,'final/'+file)
  omitted=[]
  for file,(h,n) in sorted(editor_sources.items()):
   p=apps/safe(file);b=p.read_bytes();assert H(b)==h and len(b)==n
   if p.suffix in ['.glb','.gltf','.bin']:
    omitted.append({'file':file,'bytes':n,'sha256':h,'policy':'Source asset omitted; original capture inventory and checksum retained'});sources[p]=h
   else:copy(p,'upstream-sources/'+file,'pinned-apps/'+file)
  # Exact runtime and directly invoked tool sources from the measured Git revision.
  paths=git(final,'ls-tree','-r','--name-only',SHA,'crates','packages/rthree','scripts/apps','scripts/build.mjs','scripts/runner-environment.mjs','Cargo.toml','Cargo.lock','package.json','package-lock.json','rust-toolchain.toml','LICENSE').decode().splitlines()
  for file in paths:add(git(final,'show',SHA+':'+file),'git-source/'+SHA+'/'+file,'git/'+SHA+'/'+file,public_git=True)
  prep=json.loads((final/'work/task49-final-viewer-native-001/manifest.json').read_text())
  dependencies=[x for x in prep['buildInputs'] if x['file'].startswith('viewer/node_modules/')]+[x for x in prep['sources'] if x['file'] in ['viewer/package.json','viewer/yarn.lock']]
  for row in dependencies:
   file=safe(row['file']);p=apps/file;b=p.read_bytes();assert H(b)==row['sha256'] and len(b)==row['bytes'];copy(p,'dependency-inputs/'+file,'pinned-apps/'+file)
  analyzer_sha='7600d911bebac638605da993d38639617f04b964'
  for file in ['scripts/apps/viewer-profile-analysis-runs.mjs','scripts/apps/viewer-profile-analyze.mjs','scripts/apps/viewer-profile-count-analyze.mjs','tests/viewer-profile-analysis-runs.mjs','tests/candidate-profile-count-analysis.mjs','tests/candidate-profile-analysis.mjs','tests/viewer-profile-source-maps.mjs']:
   add(git(root,'show',analyzer_sha+':'+file),'git-source/'+analyzer_sha+'/'+file,'git/'+analyzer_sha+'/'+file,public_git=True)
  for folder in [root/'bench/results/task49-bistro-profile-20261026/licenses',root/'bench/results/task49-editor-single-correctness-20261026/licenses']:
   for p in sorted(folder.rglob('*')):
    if p.is_file():
     name='licenses/'+str(p.relative_to(folder))
     existing=next((x for x in rows if x['path']==name+'.gz'),None)
     if existing:assert H(p.read_bytes())==existing['sourceSha256']
     else:copy(p,name,'repository/'+str(p.relative_to(root)),True)
  for p,h in sources.items():assert H(p.read_bytes())==h,'Input changed: '+p.name
  for folder,(files,linkpaths) in listings.items():
   assert sorted(str(p.relative_to(folder)) for p in folder.rglob('*') if p.is_file())==files
   assert sorted(str(p.relative_to(folder)) for p in folder.rglob('*') if p.is_symlink())==sorted(linkpaths)
  for link,target in links.items():assert link.is_symlink() and str(link.readlink()).encode()==target and link.resolve(strict=True)==apps/'viewer/node_modules'
  assert len(links)==1
  write('preparation-links.json',{'links':[{'path':'preparation/source/node_modules','originalTargetSha256':H(target),'originalTargetBytes':len(target),'publicTarget':'<pinned-apps>/viewer/node_modules','viewerSha':VIEWER,'traversed':False} for target in links.values()],'exactLinkSetRechecked':True,'dependencyFiles':[r['file'] for r in dependencies]})
  write('omitted-source-assets.json',{'files':omitted,'reason':'No additional scene asset copy; native capture payloads remain complete'})
  write('archive-index.json',{'format':2,'kind':'Task49 final integration correctness; no timing/performance evidence','runtimeSha':SHA,'sourceSuites':inputs,'files':rows,'policy':'Every selected frozen input retained. Explicit home and battery metadata transformations only; original, decoded-public and stored hashes separated. Numeric/image/source evidence unchanged. Public Git snapshots are exact bytes. One explicitly checked prep dependency symlink is recorded but never traversed.'})
  status.update(status='complete',logicalFiles=len(rows),uniqueBlobs=len(blobs),uniqueStoredBytes=sum(map(len,blobs.values())),sourceHashesRechecked=True,sourceListingsUnchanged=True,linkSetRechecked=True);write('build-status.json',status);print(json.dumps(status))
 except BaseException as error:
  status.update(status='failed',errorType=type(error).__name__,error=HOME.sub('<home>',str(error)),copiedPayloads=len(rows));write('build-status.json',status);write('partial-index.json',{'files':rows});raise
if __name__=='__main__':main()
