"""Bounded archive regression checks; no browser or application fixture."""
from pathlib import Path
import unittest,tempfile,json,gzip,hashlib
ns={'__name__':'archive_builder'};exec(compile((Path(__file__).parent/'build.py').read_text(),'build.py','exec'),ns)
class ArchiveTests(unittest.TestCase):
 def test_scene_uuid_is_not_private_system_identity(self):
  u='12345678-1234-1234-1234-123456789012'
  scene={'camera':{'object':{'uuid':u}},'scene':{'object':{'children':[{'uuid':u,'geometry':u,'material':u,'target':u,'skeleton':u,'animations':[u]}]},'skeletons':[{'bones':[u],'uuid':u}]}}
  ns['privacy'](scene,'E2-scene-0.json')
  for value,file in [(scene,'environment.json'),({'scene':{'hostname':u}},'E2-scene-0.json'),({'scene':{'name':u}},'E2-scene-0.json'),({'uuid':u},'environment.json')]:
   with self.assertRaises(AssertionError):ns['privacy'](value,file)
 def test_private_strings_and_system_keys_fail_closed(self):
  for x in [{'hostname':'machine'}, {'batteryID':123}, {'path':'/'+ 'Users'+'/sample/path'}, {'power':'battery (id=12345)'}]:
   with self.assertRaises(AssertionError):ns['privacy'](x,'environment.json')
 def test_bytes_numeric_tokens_fresh_destination_and_failed_archive(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);source=root/'source'
   for route in ns['ROUTES']:
    for suite in ['check','ui']:
     d=source/route/suite;d.mkdir(parents=True)
     for f,v in [('result.json',b'{"status":"passed", "values":[-0,1e-9,true,null]}\n'),('environment.json',b'{}'),('errors.json',b'[]'),('integrity.json',b'{}'),('adaptation.json',b'{}')]: (d/f).write_bytes(v)
   out=root/'archive';ns['build'](root,'source',out)
   index=json.loads((out/'archive-index.json').read_text());self.assertEqual(len(index['files']),30)
   for e in index['files']:
    original=(root/e['sourcePath']).read_bytes();stored=(out/e['path']).read_bytes();self.assertEqual(gzip.decompress(stored),original);self.assertEqual(e['sourceSha256'],hashlib.sha256(original).hexdigest())
   with self.assertRaises(AssertionError):ns['build'](root,'source',out)
   (source/'original/check/unlisted-private.json').write_text('{"hardwareUUID":"private"}')
   with self.assertRaises(AssertionError):ns['build'](root,'source',root/'failed-archive')
   self.assertEqual(json.loads((root/'failed-archive/build-status.json').read_text())['status'],'failed')
   self.assertTrue((root/'failed-archive/partial-index.json').exists())
 def test_pending_capture_is_rejected_before_destination(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);d=root/'source/original/check';d.mkdir(parents=True);(d/'result.json').write_text('{"status":"running"}')
   with self.assertRaises(AssertionError):ns['build'](root,'source',root/'archive')
   self.assertFalse((root/'archive').exists())
if __name__=='__main__':unittest.main()
