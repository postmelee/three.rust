"""Privacy allowlist, exact numeric preservation, and archive corruption tests."""
from pathlib import Path
import gzip,importlib.util,json,sys,tempfile,unittest
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent

def module(name):
 spec=importlib.util.spec_from_file_location(name,HERE/(name+'.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
b=module('archive');s=module('storage')
class Checks(unittest.TestCase):
 def test_battery_field_only(self):
  data,notes=b.public_json('{"power":{"output":"AC (id=123)"},"negative":-0.0}','execution/environment-before/runner.json');self.assertIn(b'"negative":-0.0',data);self.assertIn(b'(id=<redacted>)',data);self.assertTrue(notes)
 def test_unexpected_battery_rejected(self):
  with self.assertRaises(AssertionError):b.public_json('{"error":"(id=123)"}','editor/result.json')
 def test_uuid_unchanged(self):
  text='{"blob":"blob:<origin>/12345678-1234-1234-1234-123456789abc","scene":"12345678-1234-1234-1234-123456789abc"}';data,notes=b.public_json(text,'viewer/result.json');self.assertEqual(data,text.encode());self.assertEqual(notes,[])
 def test_home_suffix_and_numeric_order(self):
  data,_=b.public_json('{"error":"/Users/example/project/source.py:42","numeric":[-0.0,2,1]}','execution/error.json');self.assertEqual(json.loads(data)['error'],'<home>/project/source.py:42');self.assertIn(b'[-0.0,2,1]',data)
 def test_command_path_allowed(self):
  data,_=b.public_json('{"command":["node","/Users/example/project/tool.mjs"]}','execution/commands.json');self.assertIn(b'<home>/project/tool.mjs',data)
 def test_unknown_private_field_rejected(self):
  with self.assertRaises(AssertionError):b.public_json('{"payload":"/Users/example/file"}','viewer/result.json')
 def test_private_identity_rejected(self):
  for key in ['hardwareUUID','hostname','serialNumber']:
   with self.assertRaises(AssertionError):b.public_json(json.dumps({key:'private'}),'execution/runner.json')
 def test_driver_exact_alias_only(self):
  data,notes=b.public_text("ROOT='/Users/example/project'",'execution-driver/run.py',{'/Users/example/project':'<repository>'});self.assertEqual(data,b"ROOT='<repository>'");self.assertTrue(notes)
 def test_unknown_source_home_rejected(self):
  with self.assertRaises(AssertionError):b.public_text("ROOT='/Users/example/private'",'execution-driver/run.py',{'/Users/example/project':'<repository>'})
 def test_log_home_only(self):
  data,notes=b.public_text('at /Users/example/project/a.py:9','build/03.log',{});self.assertEqual(data,b'at <home>/project/a.py:9');self.assertTrue(notes)
 def test_temporary_path_rejected(self):
  with self.assertRaises(AssertionError):b.public_json('{"path":"/tmp/private/file"}','execution/a.json')
 def test_status_line_shape(self):
  line='Status site: /var/folders/ab/randomtoken/T/tmp_test/site; 2 real daily points'
  self.assertEqual(b.status_temp_line(line),'Status site: <temporary-path>/site; 2 real daily points')
  for changed in [line.replace('2 real','3 real'),line.replace('/site;', '/other;'),line+'\n/Users/example/private']:
   with self.assertRaises(AssertionError):b.status_temp_line(changed)
 def test_status_log_hash_bound(self):
  with self.assertRaises(AssertionError):b.public_text('Status site: /var/folders/ab/randomtoken/T/tmp_test/site; 2 real daily points','software-suite/08.log',{})
 def test_paths(self):
  for p in ['../x','a/../../x','/absolute','a//b','a\\b']:
   with self.assertRaises(AssertionError):b.safe(p)
 def fixture(self,root):
  data=b'{"value":-0.0,"samples":[1,2,3]}\n';stored=gzip.compress(data,mtime=0);h=s.H(stored);path='blobs/'+h+'.gz';(root/'blobs').mkdir();(root/path).write_bytes(stored)
  row={'path':'editor/result.json.gz','storage':path,'sourcePath':'repository/work/example/result.json','sourceSha256':s.H(data),'sourceDecodedSha256':s.H(data),'decodedSha256':s.H(data),'sha256':h,'sourceBytes':len(data),'decodedBytes':len(data),'storedBytes':len(stored),'sourceGzip':False,'gzip':True,'normalizations':[]}
  (root/'archive-index.json').write_text(json.dumps({'format':2,'files':[row],'sourceSuites':[{'label':'editor','fileCount':1}]}));(root/'build-status.json').write_text('{"status":"complete"}');return data,path
 def test_exact_extract_fresh_destination(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d)/'archive';root.mkdir();data,_=self.fixture(root);a=s.Archive(root);self.assertEqual(a.B('editor/result.json'),data);out=Path(d)/'extracted';a.extract(out);self.assertEqual((out/'editor/result.json').read_bytes(),data)
   with self.assertRaises(AssertionError):a.extract(out)
 def test_corrupt_blob_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);_,path=self.fixture(root);(root/path).write_bytes(b'corrupt')
   with self.assertRaises(AssertionError):s.Archive(root)
 def test_unindexed_blob_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);self.fixture(root);(root/'blobs/extra.gz').write_bytes(b'bad')
   with self.assertRaises(AssertionError):s.Archive(root)
 def test_support_hash_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);self.fixture(root);files=[{'file':p.name,'bytes':len(p.read_bytes()),'sha256':s.H(p.read_bytes())} for p in root.iterdir() if p.is_file()];(root/'derived-files.json').write_text(json.dumps({'files':files}));s.Archive(root);(root/'build-status.json').write_text('{"status":"complete","extra":1}')
   with self.assertRaises(AssertionError):s.Archive(root)
if __name__=='__main__':unittest.main()
