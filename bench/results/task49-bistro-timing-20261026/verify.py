"""Offline public Bistro timing archive audit.
Requires frozen analyze.py/numeric_verify.py from the independent raw auditor.
No browser, model asset acquisition, JS analyzer execution or capture repair.
"""
from pathlib import Path
from types import SimpleNamespace
import argparse,hashlib,importlib.util,json,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent
def module(name):
 spec=importlib.util.spec_from_file_location(name,HERE/(name+'.py'));value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
s=module('storage');n=module('numeric_verify');png=module('png');H=s.H
TOOL='58b7cdce62ab15f1507dd76255840f406cee6287'
RUNTIME='85e2c5d500edb0b92ea4ecb997087fded3fed45b'
BROWSER='155.0.8059.86';GPU='ANGLE Metal Renderer: Apple M4 Pro'

class CaptureView:
 def __init__(self,archive,label):self.archive=archive;self.label=label
 def path(self,path):assert path.startswith('capture/');return self.label+'/'+path.removeprefix('capture/')
 def B(self,path):return self.archive.B(self.path(path))
 def J(self,path):return self.archive.J(self.path(path))
 def exists(self,path):return self.archive.exists(self.path(path))

def decode_oracles(A,label,manifest):
 images=values=0;missing=[]
 for entry in manifest['oracles']:
  base=label+'/'+entry['directory']
  for pose in [.25,.75]:
   file=base+'/oracle-'+str(pose)+'.json'
   if not A.exists(file):
    assert entry['status']!='passed';missing.append(file);continue
   snapshot=A.J(file);values+=len(snapshot['numeric'])
   for name,renderer in snapshot['renderers'].items():
    path=base+'/oracle-'+str(pose)+'-'+name+'.png'
    if A.exists(path):
     width,height,top,bottom=png.png_rgba(A.B(path));assert (width,height)==(renderer['width'],renderer['height']) and H(bottom)==renderer['pixelSha256'];images+=1
    elif entry['status']!='passed':missing.append(path)
    else:assert name=='axes' and renderer['width']*renderer['height']==0 and renderer['imageUnavailable']
 return dict(decodedPNGs=images,fixedPoseNumericValues=values,unavailablePartialOracleFiles=missing,method='Independent standard-library CRC/unfilter decode; bottom-up RGBA SHA equals retained readPixels SHA.')

def tool_sources(A,manifest):
 sha=manifest['sourceBefore']['tooling']['sha'];assert sha==TOOL;checks=0
 for file,h in manifest['toolHashes'].items():assert H(A.B('tool-sources/'+sha+'/'+file))==h;checks+=1
 return checks

def audit_evidence(A):
 rows=[]
 for evidence in A.index.get('sourceEvidence',[]):
  label=evidence['label'];assert sum(path.startswith(label+'/') for path in A.files)==evidence['fileCount']
  if A.exists(label+'/audit-sources.json'):
   for source in A.J(label+'/audit-sources.json'):
    row=A.entry(label+'/'+source['file']);assert row['sourceSha256']==source['sha256'] and row['sourceBytes']==source['bytes']
  if not A.exists(label+'/input-hashes.json'):continue
  inputs=A.J(label+'/input-hashes.json');matches=[]
  for suite in A.index['sourceSuites']:
   def same(row):
    path=suite['label']+'/'+row['path']
    if not A.exists(path):return False
    entry=A.entry(path)
    return entry['sourceSha256']==row['sha256'] and entry['sourceBytes']==row['bytes'] and entry['sourceDecodedSha256']==row['decodedSha256']
   if inputs and all(same(row) for row in inputs):matches.append(suite['label'])
  assert len(matches)==1,'Independent audit inputs do not bind exactly one preserved capture'
  report=A.J(label+'/audit.json');rows.append(dict(label=label,capture=matches[0],status=report['status'],inputHashesBound=len(inputs),auditSha256=H(A.B(label+'/audit.json')),report=report))
 return rows

def verify(root):
 A=s.Archive(root);preparation=s.preparation_audit(A);evidence=audit_evidence(A);captures=[]
 links=json.loads((root/'preparation-links.json').read_text());assert links['originalTargetHashesRechecked'] and not links['targetDirectoryTraversal'];assert links['originalViewerSourceSha']==n.v.VIEWER and links['originalTrackedViewerClean'];assert {r['path'] for r in links['links']}=={'preparation/native/source/node_modules','preparation/timing/source/node_modules'}
 for row in links['links']:assert row['publicTarget']=='<pinned-viewer>/node_modules' and row['viewerSha']==n.v.VIEWER and len(row['originalTargetSha256'])==64 and row['originalTargetBytes']>0
 for row in A.index.get('sourceEvidence',[]):
  prefix=row['label']
  if A.exists(prefix+'/partial-index.json'):
   old=A.J(prefix+'/partial-index.json');assert A.J(prefix+'/build-status.json')['status']=='failed'
   for entry in old['files']:assert A.entry(entry['path'])==entry,'Preserved failed-build payload differs from final archive'
   move=A.J(prefix+'/move-integrity.json');assert move['beforeAfterSame'] and move['files']
   for name,record in move['files'].items():
    if name.startswith('blobs/'):data=(root/name).read_bytes()
    else:data=A.B(prefix+'/'+name)
    assert H(data)==record['sha256'] and len(data)==record['bytes']

 for suite in A.index['sourceSuites']:
  label=suite['label'];m=A.J(label+'/manifest.json');sources=tool_sources(A,m);protocol=m['protocol'];file=root/'protocols'/Path(protocol['file']).name;data=file.read_bytes();assert H(data)==protocol['sha256'] and data==A.B('protocols/'+file.name);p=json.loads(data);assert p==protocol['protocol'];assert m['candidateSha']==RUNTIME and m['group']=='engine'
  assert m['status']==suite['captureStatus'] and m['finishedAt']==suite['finishedAt']
  for kind,proof in m['preparedManifestFiles'].items():assert A.B('preparation/'+kind+'/manifest.json')==A.B(label+'/'+proof['file'])
  image=decode_oracles(A,label,m)
  if m['status']=='failed':
   captures.append(dict(label=label,status='failed-capture-preserved',captureStatus=m['status'],errors=m['errors'],toolSourceHashes=sources,images=image,numericQualification=False));continue
  args=SimpleNamespace(capture=Path(suite['sourceDirectory']),protocol=file,zip_manifest=root/'asset-provenance/task49-editor-bistro-zip-001/manifest.json',expected_tool=TOOL,expected_runtime=RUNTIME,expected_protocol_sha256=protocol['sha256'],expected_native_manifest_sha256=p['preparedManifests']['native'],expected_timing_manifest_sha256=p['preparedManifests']['timing'],expected_browser=BROWSER,expected_gpu=GPU)
  result=n.verify_capture(args,CaptureView(A,label));assert result['status']=='verified'
  prior=[r for r in evidence if r['capture']==label and r['status']=='verified']
  assert prior,'Completed capture lacks its preserved independent raw audit'
  for row in prior:assert row['report']==result,'Archived independent audit differs from recomputation'
  captures.append(dict(label=label,status='verified',captureStatus=m['status'],audit=result,toolSourceHashes=sources,images=image))
 listing=json.loads((root/'source-listing-audit.json').read_text());assert listing['status']=='pass' and not listing['originalSourcesModified'];expected_sources={x['sourceDirectory'] for x in [*A.index['sourceSuites'],*A.index['sourceEvidence'],*A.index['preparationSources']]};assert {x['sourceDirectory'] for x in listing['records']}==expected_sources
 for row in listing['records']:
  assert row['regularFilesMatchArchive'] and row['linkSetExact'];assert row['regularFiles']==len({r['sourcePath'] for r in A.index['files'] if r['sourcePath'].startswith(row['sourceDirectory']+'/')});wanted=[r['sourcePath'].removeprefix(row['sourceDirectory']+'/') for r in links['links'] if r['sourcePath'].startswith(row['sourceDirectory']+'/')];assert row['directorySymlinks']==sorted(wanted)
 for row in evidence:row.pop('report')
 return dict(status='verified',performanceQualification=False,logicalFiles=len(A.files),physicalBlobs=len(A.blobs),preparation=preparation,preparationDirectoryLinks=links,captures=captures,independentAuditBindings=evidence,limits=['Archive integrity and complete raw arithmetic do not establish a qualified candidate. See each full-capture prospective stability verdict.','All attempted sessions are preserved. Failed capture entries stay failed; partial data are not padded or used as completed comparisons.','PNG decode checks captured bytes, not a new GPU rendering. Source snapshots and preparation bytes do not constitute an independent rebuild.','Large original ZIP/assets are excluded; manifests, entry proofs and notices remain.','The independent raw auditor applies its declared warmup/sample activity gate; no raw row is dropped to pass it.'])

if __name__=='__main__':
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--archive',type=Path,default=HERE);ap.add_argument('--out',type=Path);ap.add_argument('--extract',type=Path);args=ap.parse_args();result=verify(args.archive)
 if args.extract:s.Archive(args.archive).extract(args.extract)
 if args.out:
  with args.out.open('x') as f:json.dump(result,f,indent=2,allow_nan=False);f.write('\n')
 print(json.dumps({'status':result['status'],'logicalFiles':result['logicalFiles'],'physicalBlobs':result['physicalBlobs'],'captures':[{'label':x['label'],'status':x['status'],'images':x['images']} for x in result['captures']]}))
