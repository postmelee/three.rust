"""Bounded pure mutation tests. No browser, assets, or original captures."""
from pathlib import Path
import copy,gzip,hashlib,importlib.util,json,math,sys,tempfile,unittest
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('verifier',ROOT/'verify.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
class Fake:
 def __init__(self,values):self.values=values
 def J(self,p):return self.values[p]
 def exists(self,p):return p in self.values

def snapshot():return {'numeric':[0.0,1.0,-0.0],'objects':[{'name':'Chess'}],'clips':[],'state':{'grid':True},'actions':[],'renderers':{key:{'width':1,'height':1,'pixelSha256':'a'*64,'quality':{'pixelRatio':1},'work':{'calls':1}} for key in ['main','axes']}}

class EvidenceTests(unittest.TestCase):
 def test_fixed_numeric_semantic_and_image_difference(self):
  a=snapshot();self.assertTrue(v.snapshot_difference(a,copy.deepcopy(a))['equal'])
  for kind in ['numeric','semantic','pixel']:
   b=copy.deepcopy(a)
   if kind=='numeric':b['numeric'][1]+=.1
   elif kind=='semantic':b['objects'][0]['name']='changed'
   else:b['renderers']['main']['pixelSha256']='b'*64
   self.assertFalse(v.snapshot_difference(a,b)['equal'])
 def test_nonfinite_oracle_rejected(self):
  b=snapshot();b['numeric'][0]=math.nan
  with self.assertRaises(AssertionError):v.snapshot_difference(snapshot(),b)
 def test_before_after_close_prefix_and_late_failure(self):
  request={'event':'Network.requestWillBeSent','requestId':'1','request':{'url':'<origin>/__viewer_content__/x.bin'}}
  failure={'event':'Network.loadingFailed','requestId':'1','errorText':'net::ERR_ABORTED','canceled':True,'timestamp':12,'phaseAtReceipt':'initial-load'}
  before=[request,failure];after=before+[dict(failure,requestId='2',phaseAtReceipt='closing')]
  a=Fake({'x/cdp-network-before-close.json':{'events':before},'x/cdp-network-after-close.json':{'events':after}})
  r=v.network_audit(a,'x');self.assertEqual(r['beforeCloseLoadingFailed'],1);self.assertEqual(r['afterCloseAdditionalLoadingFailed'],1);self.assertEqual(r['contentFailures'][0]['error'],'net::ERR_ABORTED')
  a.values['x/cdp-network-after-close.json']['events']=after[1:]
  with self.assertRaises(AssertionError):v.network_audit(a,'x')
 def test_missing_old_cdp_stays_unavailable(self):self.assertFalse(v.network_audit(Fake({}),'x')['available'])
 def test_cache_digest_observation_does_not_rewrite_failure(self):
  file={'file':'x.bin','bytes':4,'sha256':'a'*64};row={'file':'x.bin','expectedBytes':4,'expectedSha256':'a'*64,'status':'hashed','matchesExpected':False,'byteLength':3,'sha256':'b'*64,'present':True,'type':'ArrayBuffer'}
  a=Fake({'x/native-cache-checksums.json':[row]});self.assertFalse(v.caches(a,'x',{'files':[file]},{'nativeCacheChecksums':[row]})[0]['matchesExpected'])
  row['matchesExpected']=True
  with self.assertRaises(AssertionError):v.caches(a,'x',{'files':[file]},{'nativeCacheChecksums':[row]})
 def test_framing_recomputed_from_headers(self):
  row={'requestId':'1','file':'x.bin','headers':{'transfer-encoding':'chunked'},'status':200,'expectedBytes':4,'matched':True};summary={'framing':'default-chunked','responses':1,'uniqueOriginalResources':1,'allMatched':True}
  a=Fake({'suite/route/content-response-framing.json':[row],'suite/result.json':{'transportDiagnostic':{'contentLength':False}},'suite/route/cdp-network-before-close.json':{'events':[{'event':'Network.responseReceived','requestId':'1','response':{'headers':row['headers'],'status':200}}]}})
  self.assertEqual(v.framing(a,'suite/route',{'files':[{'file':'x.bin','bytes':4}]},{'transportHeaders':summary},{}),summary)
  row['headers']['content-length']='4'
  with self.assertRaises(AssertionError):v.framing(a,'suite/route',{'files':[{'file':'x.bin','bytes':4}]},{'transportHeaders':summary},{})

class PrivacyTests(unittest.TestCase):
 def test_denied_nonce_only_preserves_numeric_tokens(self):
  text='{"proxyBlocked":[{"url":"http://clients2.google.com/time/1/current?cup2key=10:random&cup2hreq=abcdef","action":"denied-without-forwarding"}],"samples":[-0.0,1e-12,5,null]}'
  b,notes=v.builder.public_json(text,'test/result.json');self.assertIn('"samples":[-0.0,1e-12,5,null]',b.decode());self.assertEqual(len(notes),1);self.assertIn('cup2key=<browser-nonce>',b.decode())
 def test_public_scene_and_cdp_ids_preserved(self):
  text='{"sceneUUID":"11111111-2222-3333-4444-555555555555","frameId":"abcdef1234"}'
  b,notes=v.builder.public_json(text,'snapshot.json');self.assertEqual(b.decode(),text);self.assertFalse(notes)
 def test_unexpected_identity_private_field_rejected(self):
  for value in [{'hardware_uuid':'11111111-2222-3333-4444-555555555555'},{'serial':123},{'hostname':'person'},{'data':'/Users/private/secret'}]:
   with self.subTest(value=value),self.assertRaises(AssertionError):v.builder.public_json(json.dumps(value),'test.json')
 def test_private_stack_path_changes_only_string(self):
  b,notes=v.builder.public_json('{"error":"at /Users/private/project/app.js:1","number":1}', 'result.json');self.assertEqual(json.loads(b)['error'],'at <home>/project/app.js:1');self.assertEqual(json.loads(b)['number'],1)

class GuardTests(unittest.TestCase):
 def fixture(self):
  digest=v.H(b'Pinned transport guard test payload\n'*1000);rows=[]
  for mode in ['proxy-playwright','proxy-cdp-remote']:
   urls=['http://127.0.0.1:1234/payload','https://allowed.invalid/payload','https://blocked.invalid/payload','http://blocked.invalid/payload','http://127.0.0.1:1235/payload']
   trials=[{'url':url,**({'status':200,'bytes':36000,'sha256':digest} if i<2 else {'failed':True})} for i,url in enumerate(urls)]
   rows.append({'mode':mode,'expectedHash':digest,'passed':True,'unexpectedConnections':0,'trials':trials,'proxyArgs':['--proxy-server=http://127.0.0.1:1236','--proxy-bypass-list=<-loopback>;http://127.0.0.1:1234'],'proxyBlocked':[{'url':urls[4],'action':'denied-without-forwarding'}],'guardEvents':[]})
  return {'results':rows}
 def test_guard_source_payload_and_missing_provenance(self):
  r=v.guard(self.fixture());self.assertFalse(r['recordedResultHasToolSha']);self.assertEqual(r['results'][0]['allowedPayloadBytes'],36000)
 def test_wrong_hash_external_connection_or_bypass_rejected(self):
  for key in ['hash','connection','bypass']:
   d=self.fixture();r=d['results'][0]
   if key=='hash':r['trials'][0]['sha256']='0'*64
   elif key=='connection':r['unexpectedConnections']=1
   else:r['proxyArgs'][1]='--proxy-bypass-list=*'
   with self.subTest(key=key),self.assertRaises(AssertionError):v.guard(d)

class StorageTests(unittest.TestCase):
 def fixture(self,root):
  b=b'{"n":1}';z=gzip.compress(b,mtime=0);row={'path':v.builder.NAMES[0]+'/raw.json','sourcePath':'work/capture/raw.json','blob':'blobs/'+v.H(b)+'.gz','storedSha256':v.H(z),'storedBytes':len(z),'decodedSha256':v.H(b),'decodedBytes':len(b),'decodedSourceSha256':v.H(b),'normalizations':[],'sourceGzip':False}
  (root/'blobs').mkdir();(root/row['blob']).write_bytes(z);index={'format':1,'files':[row],'inputs':[{'label':name,'files':1 if i==0 else 0} for i,name in enumerate(v.builder.NAMES)]};(root/'archive-index.json').write_text(json.dumps(index));(root/'build-status.json').write_text('{"status":"complete"}');return row,index
 def test_corrupt_blob_rejected(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp);row,index=self.fixture(p);v.Archive(p);(p/row['blob']).write_bytes(b'bad')
   with self.assertRaises(AssertionError):v.Archive(p)
 def test_duplicate_missing_or_traversal_rejected(self):
  for kind in ['duplicate','count','path']:
   with self.subTest(kind=kind),tempfile.TemporaryDirectory() as tmp:
    p=Path(tmp);row,index=self.fixture(p)
    if kind=='duplicate':index['files'].append(row.copy())
    elif kind=='count':index['inputs'][0]['files']=2
    else:row['path']='../escape'
    (p/'archive-index.json').write_text(json.dumps(index))
    with self.assertRaises(AssertionError):v.Archive(p)
 def test_extract_refuses_existing_destination(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp);row,index=self.fixture(p);a=v.Archive(p);out=p/'restored';a.extract(out);self.assertEqual((out/row['path']).read_bytes(),a.B(row['path']))
   with self.assertRaises(AssertionError):a.extract(out)

if __name__=='__main__':unittest.main()
