"""Independently verify public archive bytes and replay both frozen app audits.
No original work directories, Git checkout, browser or application are required.
The replay uses exact archived auditor source plus a storage-only adapter.
"""
from pathlib import Path
import argparse,importlib.util,io,json,sys,tarfile
sys.dont_write_bytecode=True
from storage import Archive,H
HERE=Path(__file__).resolve().parent
PIN='96b0b4c0e7d55c22c1f2c22955356b9822e67d22'

def load_auditor(A):
 # Executed code is the separately reviewed independent auditor, byte-bound here.
 source=A.B('editor-audit/auditor/audit.py')
 assert source==A.B('viewer-audit/auditor/audit.py')
 for name in ['audit.py','png.py','README.md','test_audit.py']:
  for app in ['editor','viewer']:
   saved=next(x for x in A.J(app+'-audit/audit.json')['auditSources'] if x['file']==name)
   assert H(A.B(app+'-audit/auditor/'+name))==saved['sha256']
 png=type(sys)('png');exec(compile(A.B('editor-audit/auditor/png.py'),'<archived-png>','exec'),png.__dict__);sys.modules['png']=png
 module=type(sys)('independent_auditor');exec(compile(source,'<archived-auditor>','exec'),module.__dict__);return module

def replay(A,app,module):
 saved=A.J(app+'-audit/audit.json');assert saved['status']=='passed' and saved['toolSha']==PIN and saved['runtimeSha']==PIN and not saved['performanceQualification']
 report={k:v for k,v in saved.items() if k in ['app','toolSha','runtimeSha','performanceQualification','numericTolerance','limitations']};report['status']='running'
 class Adapter(module.Audit):
  def __init__(self):
   self.report=report;self.files={};self.source_pins={};self.images={};self.listing=self.list_files()
  def list_files(self):return sorted(p[len(app)+1:].removesuffix('.gz') for p in A.files if p.startswith(app+'/'))
  def read(self,name):
   entry=A.entry(app+'/'+name);assert not entry['normalizations'];data=A.B(app+'/'+name);assert H(data)==entry['sourceSha256'];row={'file':name,'bytes':len(data),'sha256':H(data)}
   if name in self.files:assert self.files[name]==row
   self.files[name]=row;return data
  def source_file(self,name,expected=None,tracked=False):
   if name=='work/task49-final-viewer-native-001/manifest.json':path='preparation/manifest.json'
   elif A.exists('runtime-artifacts/'+name):path='runtime-artifacts/'+name
   else:path='git-source/'+PIN+'/'+name
   data=A.B(path)
   if expected:assert H(data)==expected
   if tracked:assert data==A.B('git-source/'+PIN+'/'+name)
   self.source_pins[name]={'file':name,'bytes':len(data),'sha256':H(data),'checkedAgainstCommit':tracked};return H(data)
  def finish(self):self.report.update(inputFiles=list(self.files.values()),sourceFiles=list(self.source_pins.values()),decodedImages=list(self.images.values()),inputIntegrity='unchanged')
 audit=Adapter();audit.capture_inputs()
 for name in ['scripts/apps/check.mjs','scripts/apps/ui.mjs','scripts/apps/candidate-browser.mjs'] if app=='editor' else ['scripts/apps/viewer-check.mjs','scripts/apps/viewer-oracle.mjs','scripts/apps/viewer-browser.mjs']:audit.source_file(name,tracked=True)
 getattr(module,app)(audit);audit.finish();report['status']='passed';report['auditSources']=saved['auditSources'];assert report==saved,'Archived independent '+app+' audit differs from recomputation'
 support=A.J(app+'-audit/support-files.json')
 for row in support['files']:
  data=A.B(app+'-audit/'+row['file']);assert H(data)==row['sha256'] and len(data)==row['bytes']
 return {'app':app,'auditSha256':H(A.B(app+'-audit/audit.json')),'counts':report['counts'],'inputFiles':len(report['inputFiles']),'sourceFiles':len(report['sourceFiles']),'decodedPNGs':len(report['decodedImages'])}

def preparation(A):
 m=A.J('preparation/manifest.json');assert m['status']=='prepared' and m['tooling']['sha']==PIN and not m['tooling']['dirty']
 assert H(A.B('preparation/manifest.json'))=='9f5c12a3f2e861f97f46eddd248f4f93aca7418652ed3c2fe9ecec128258a241'
 checks=0
 for row in m['outputs']:
  data=A.B('preparation/'+row['file']);assert H(data)==row['sha256'] and len(data)==row['bytes'];checks+=1
 for row in m['tooling']['files']:
  data=A.B('git-source/'+PIN+'/'+row['file'].removeprefix('tooling/'));assert H(data)==row['sha256'] and len(data)==row['bytes'];checks+=1
 for row in m['adaptations']:
  prefix='preparation/'+row['patch'].removesuffix('.patch');before=A.B(prefix+'.original');after=A.B(prefix+'.adapted');assert H(before)==row['originalSha256'] and len(before)==row['originalBytes'];assert H(after)==row['servedSha256'] and len(after)==row['servedBytes'];assert A.B('preparation/source/'+row['file'])==after
  old=before.decode().removesuffix('\n').split('\n');new=after.decode().removesuffix('\n').split('\n');patch='\n'.join(['--- a/'+row['file'],'+++ b/'+row['file'],f'@@ -1,{len(old)} +1,{len(new)} @@',*['-'+x for x in old],*['+'+x for x in new],'']);assert A.B('preparation/'+row['patch'])==patch.encode();checks+=4
 deps=[x for x in m['buildInputs'] if x['file'].startswith('viewer/node_modules/')]+[x for x in m['sources'] if x['file'] in ['viewer/package.json','viewer/yarn.lock']]
 for row in deps:
  data=A.B('dependency-inputs/'+row['file']);assert H(data)==row['sha256'] and len(data)==row['bytes'];checks+=1
 links=json.loads((A.root/'preparation-links.json').read_text());assert links['exactLinkSetRechecked'] and len(links['links'])==1 and not links['links'][0]['traversed'] and links['dependencyFiles']==[r['file'] for r in deps]
 return {'manifestSha256':H(A.B('preparation/manifest.json')),'byteChecks':checks,'recordedDependencyLinks':1}

def execution(A):
 before=A.J('execution/source-before.json');assert before==A.J('execution/source-after.json') and before['sha']==PIN and not before['dirty']
 for file,h in before['artifacts'].items():assert H(A.B(('runtime-artifacts/' if A.exists('runtime-artifacts/'+file) else 'git-source/'+PIN+'/')+file))==h
 for stage in ['before','after']:
  power=A.J('execution/environment-'+stage+'/runner.json')['power'];assert power['available'] and 'AC Power' in power['output']
 commands=A.J('execution/commands.json');assert len(commands)==7 and all(x['exitCode']==0 for x in commands)
 suites={label:A.J(label+'/commands.json') for label in ['build','node','browser','software-suite','analyzer-checks','publication-failed','publication-passed']}
 assert [r['exitCode'] for r in suites['build']]==[0]*6
 assert [r['exitCode'] for r in suites['node']]==[0,0,0,1]
 assert [r['exitCode'] for r in suites['browser']]==[0]*5
 assert [r['exitCode'] for r in suites['software-suite']]==[0]*11 and all(r['sourceSha']==PIN for r in suites['software-suite'])
 assert [r['exitCode'] for r in suites['analyzer-checks']]==[0]*5
 assert [r['exitCode'] for r in suites['publication-failed']]==[1] and 'EPERM' in A.B('publication-failed/infra.log').decode()
 assert [r['exitCode'] for r in suites['publication-passed']]==[0,0] and all(r['baseSha']=='7600d911bebac638605da993d38639617f04b964' for r in suites['publication-failed']+suites['publication-passed'])
 assert not A.exists('publication-failed/docs.log')
 assert A.exists('software-suite/package/rthree-0.1.0-alpha.0.tgz')
 for label,rows in suites.items():
  for row in rows:assert A.exists(label+'/'+row['log'])
 return {'nativeAppCommands':len(commands),'allNativeAppExitCodesZero':True,'sourceBeforeAfterIdentical':True,'ACBeforeAfter':True,'buildAndTestCommands':{k:[{'command':x['command'],'exitCode':x['exitCode']} for x in v] for k,v in suites.items()},'initialTimingTestFailureRetained':True,'sandboxLoopbackFailureRetained':True,'analyzerCheckBaseSha':'7600d911bebac638605da993d38639617f04b964'}

def source_bindings(A):
 omitted={r['file']:r for r in json.loads((A.root/'omitted-source-assets.json').read_text())['files']}
 for route in ['original','prepared-js','prepared-wasm']:
  for kind in ['check','ui']:
   for row in A.J('editor/'+route+'/'+kind+'/served-files.json'):
    file=row['file'];expected=row.get('originalSha256',row['sha256']);size=row.get('originalBytes',row['bytes'])
    if file.startswith('editor/'):
     if file in omitted:assert omitted[file]['sha256']==expected and omitted[file]['bytes']==size;continue
     path='upstream-sources/'+file
    elif file.startswith('candidate/'):path='runtime-artifacts/'+file.removeprefix('candidate/')
    else:continue
    data=A.B(path);assert H(data)==expected and len(data)==size
 with tarfile.open(fileobj=io.BytesIO(A.B('software-suite/package/rthree-0.1.0-alpha.0.tgz')),mode='r:gz') as tar:
  members={}
  for member in tar.getmembers():
   assert not member.issym() and not member.islnk() and not member.name.startswith('/') and '..' not in Path(member.name).parts
   if member.isfile():assert member.name not in members;members[member.name]=member
  checked=0
  for path in A.files:
   prefix='runtime-artifacts/packages/rthree/'
   if path.startswith(prefix):
    name='package/'+path[len(prefix):].removesuffix('.gz');assert name in members;data=tar.extractfile(members[name]).read();assert data==A.B(path);checked+=1
  assert checked>30
 assert A.J('software-suite/source-after.json')['sha']==PIN and not A.J('software-suite/source-after.json')['dirty']

def failed_build(A):
 status=A.J('archive-build-failure/build-status.json');assert status['status']=='failed' and status['copiedPayloads']==884 and status['error']=='Unreviewed private source/text: software-suite/08.log'
 old=A.J('archive-build-failure/partial-index.json')['files'];assert len(old)==884
 for row in old:assert A.files[row['path']]==row
 move=A.J('archive-build-failure/move-inventory.json');assert move['byteIdentical'] and len(move['files'])==441
 for row in move['files']:
  name=row['file']
  if name.startswith('blobs/'):
   p=A.root/name;b=p.read_bytes();assert H(b)==row['sha256'] and len(b)==row['bytes']
  else:
   b=A.B('archive-build-failure/'+name);assert H(b)==row['sha256'] and len(b)==row['bytes']
 return {'archiveOnlyFailurePreserved':True,'copiedPayloads':len(old),'movedPhysicalFiles':len(move['files']),'partialRowsMatchFinalPayloads':True}

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--archive',type=Path,default=HERE);p.add_argument('--out',type=Path);p.add_argument('--extract',type=Path);a=p.parse_args();A=Archive(a.archive)
 if a.extract:A.extract(a.extract)
 source_bindings(A)
 module=load_auditor(A);result={'status':'verified','scope':'Final96 finite Robot/static correctness and software/build records only; no performance qualification','runtimeSha':PIN,'logicalFiles':len(A.files),'uniqueBlobs':len(A.blobs),'apps':[replay(A,app,module) for app in ['editor','viewer']],'preparation':preparation(A),'execution':execution(A),'failedBuild':failed_build(A),'normalizedFiles':[{'path':r['path'],'sourceSha256':r['sourceSha256'],'publicSha256':r['decodedSha256'],'normalizations':r['normalizations']} for r in A.files.values() if r['normalizations']]}
 if a.out:
  with a.out.open('x') as f:f.write(json.dumps(result,indent=2)+'\n')
 else:assert result==json.loads((a.archive/'audit.json').read_text())
 print(json.dumps({k:v for k,v in result.items() if k not in ['execution','normalizedFiles']},indent=2))
if __name__=='__main__':main()
