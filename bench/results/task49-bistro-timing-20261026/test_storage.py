"""Small privacy and format-2 corruption/extraction tests; no capture input required."""
from pathlib import Path
import gzip,hashlib,importlib.util,json,sys,tempfile,unittest
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent

def module(name):
 spec=importlib.util.spec_from_file_location(name,HERE/(name+'.py'));value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
b=module('archive');s=module('storage')
class Checks(unittest.TestCase):
 def test_battery_only_explicit_output(self):
  data,notes=b.public_json('{"power":{"output":"AC (id=123)"},"negative":-0.0}','smoke/environment-before/runner.json');self.assertIn(b'"negative":-0.0',data);self.assertIn(b'(id=<redacted>)',data);self.assertTrue(notes)
 def test_battery_elsewhere_rejected(self):
  with self.assertRaises(AssertionError):b.public_json('{"error":"id (id=123)"}','run/result.json')
 def test_native_uuid_preserved(self):
  text='{"blob":"blob:<origin>/12345678-1234-1234-1234-123456789abc","scene":"12345678-1234-1234-1234-123456789abc"}';data,notes=b.public_json(text,'run/result.json');self.assertEqual(data,text.encode());self.assertEqual(notes,[])
 def test_home_prefix_keeps_suffix(self):
  data,_=b.public_json('{"error":"/Users/example/project/source.py:42"}','audit/audit.json');self.assertEqual(json.loads(data)['error'],'<home>/project/source.py:42')
 def test_unknown_private_field_rejected(self):
  with self.assertRaises(AssertionError):b.public_json('{"payload":"/Users/example/file"}','run/result.json')
 def test_system_identity_rejected(self):
  with self.assertRaises(AssertionError):b.public_json('{"hardwareUUID":"private"}','run/result.json')
 def test_unknown_serial_rejected(self):
  with self.assertRaises(AssertionError):b.public_json('{"serialNumber":"private"}','run/result.json')
 def test_environment_serial_allowed(self):
  data,_=b.public_json('{"graphics":{"serialNumber":"private"}}','smoke/environment-after/runner.json');self.assertEqual(json.loads(data)['graphics']['serialNumber'],'<redacted>')
 def test_historical_regex_exception_is_hash_bound(self):
  with self.assertRaises(AssertionError):b.public_source('changed source','archive-build-failure/archive.py')
 def test_unreviewed_real_source_home_rejected(self):
  with self.assertRaises(AssertionError):b.public_source('path="/Users/example/private.txt"','tool-sources/tool.mjs')
 def test_real_home_rejected_even_with_review_hash(self):
  name='archive-build-failure/archive.py';text='path="/Users/example/private.txt"';saved=b.REVIEWED_ARCHIVE_SOURCE_HASHES[name]
  try:
   b.REVIEWED_ARCHIVE_SOURCE_HASHES[name]=b.H(text.encode())
   with self.assertRaises(AssertionError):b.public_source(text,name)
  finally:b.REVIEWED_ARCHIVE_SOURCE_HASHES[name]=saved
 def test_literal_regex_allowed_only_after_exact_hash(self):
  name='archive-build-failure/archive.py';text='PRIVATE = r"/Users/|temporary"';saved=b.REVIEWED_ARCHIVE_SOURCE_HASHES[name]
  try:
   b.REVIEWED_ARCHIVE_SOURCE_HASHES[name]=b.H(text.encode());self.assertEqual(b.public_source(text,name),text.encode())
  finally:b.REVIEWED_ARCHIVE_SOURCE_HASHES[name]=saved
 def test_paths(self):
  for value in ['../x','a/../../x','/absolute','a//b','a\\b']:
   with self.assertRaises(AssertionError):b.safe(value)
 def fixture(self,root):
  data=b'{"value":-0.0,"samples":[1,2,3]}\n';stored=gzip.compress(data,mtime=0);h=s.H(stored);path='blobs/'+h+'.gz';(root/'blobs').mkdir();(root/path).write_bytes(stored)
  row={'path':'smoke/result.json.gz','storage':path,'sourcePath':'repository/work/example/result.json','sourceSha256':s.H(data),'sourceDecodedSha256':s.H(data),'decodedSha256':s.H(data),'sha256':h,'sourceBytes':len(data),'decodedBytes':len(data),'storedBytes':len(stored),'sourceGzip':False,'gzip':True,'normalizations':[]}
  (root/'archive-index.json').write_text(json.dumps({'format':2,'files':[row],'sourceSuites':[{'label':'smoke','fileCount':1}]}));(root/'build-status.json').write_text('{"status":"complete"}');return data,path
 def test_exact_extract_and_fresh_destination(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp)/'archive';root.mkdir();data,_=self.fixture(root);a=s.Archive(root);self.assertEqual(a.B('smoke/result.json'),data);out=Path(tmp)/'extracted';a.extract(out);self.assertEqual((out/'smoke/result.json').read_bytes(),data)
   with self.assertRaises(AssertionError):a.extract(out)
 def test_corruption_rejected(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);_,path=self.fixture(root);(root/path).write_bytes(b'corrupt')
   with self.assertRaises(AssertionError):s.Archive(root)
 def test_unindexed_blob_rejected(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);self.fixture(root);(root/'blobs/extra.gz').write_bytes(b'bad')
   with self.assertRaises(AssertionError):s.Archive(root)
if __name__=='__main__':unittest.main()
