"""Adversarial tests for offline raw-data and metadata invariants."""
from pathlib import Path
import copy,gzip,hashlib,importlib.util,json,struct,sys,tempfile,unittest,zlib
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('verify',Path(__file__).with_name('verify.py'));v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)

class Checks(unittest.TestCase):
 def raw(self):return {'nodes':[{'id':1,'callFrame':{},'children':[2]},{'id':2,'callFrame':{}}],'samples':[1,2,2],'timeDeltas':[1,-1,0]}
 def data(self,x):return json.dumps(x).encode()
 def test_negative_intervals_are_preserved(self):
  original=self.raw();data=self.data(original);raw,_,_,report=v.raw_profile(data);self.assertEqual(raw,original);self.assertEqual(report['negativeIntervals'],[{'sampleIndex':1,'nodeId':2,'rawTimeDelta':-1}]);self.assertEqual(report['zeroIntervals'],1);self.assertEqual(report['sha256'],hashlib.sha256(data).hexdigest())
 def test_weighted_helper_rejects_negative(self):
  with self.assertRaises(AssertionError):v.p.profile_accounting(self.raw())
 def test_missing_sample_node_rejected(self):
  x=self.raw();x['samples'][1]=99
  with self.assertRaises(AssertionError):v.raw_profile(self.data(x))
 def test_cycle_rejected(self):
  x=self.raw();x['nodes'][1]['children']=[1]
  with self.assertRaises(AssertionError):v.raw_profile(self.data(x))
 def test_multiple_parents_rejected(self):
  x=self.raw();x['nodes'].append({'id':3,'callFrame':{},'children':[2]})
  with self.assertRaises(AssertionError):v.raw_profile(self.data(x))
 def test_duplicate_id_rejected(self):
  x=self.raw();x['nodes'].append({'id':2,'callFrame':{}})
  with self.assertRaises(AssertionError):v.raw_profile(self.data(x))
 def test_nan_rejected(self):
  x=self.raw();x['timeDeltas'][0]=float('nan')
  with self.assertRaises(AssertionError):v.raw_profile(self.data(x))
 def test_metadata_normalization_keeps_numeric_and_scene_id(self):
  text='{"value":-0.0,"id":"12345678-1234-1234-1234-123456789abc","power":{"output":"AC (id=123)"}}'
  data,notes=v.builder.public_json(text,'environment.json');self.assertIn(b'"value":-0.0',data);self.assertIn(b'12345678-1234-1234-1234-123456789abc',data);self.assertIn(b'(id=<redacted>)',data);self.assertTrue(notes)
 def test_unapproved_battery_location_rejected(self):
  with self.assertRaises(AssertionError):v.builder.public_json('{"sample":"(id=123)"}','result.json')
 def test_machine_identifier_rejected(self):
  with self.assertRaises(AssertionError):v.builder.public_json('{"serialNumber":"private"}','environment.json')
 def test_unapproved_private_field_rejected(self):
  with self.assertRaises(AssertionError):v.builder.public_json('{"value":"/Users/example/data"}','result.json')
 def test_home_suffix_preserved(self):
  data,_=v.builder.public_json('{"stack":"/Users/example/project/f.py:42"}','error.json');self.assertEqual(json.loads(data)['stack'],'<home>/project/f.py:42')
 def test_png_crc_rejected(self):
  def chunk(k,b):return struct.pack('>I',len(b))+k+b+struct.pack('>I',zlib.crc32(k+b))
  raw=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',1,1,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(b'\0\x01\x02\x03\xff'))+chunk(b'IEND',b'')
  self.assertEqual(v.png.png_rgba(raw)[2],b'\x01\x02\x03\xff');bad=bytearray(raw);bad[-1]^=1
  with self.assertRaises(AssertionError):v.png.png_rgba(bytes(bad))

if __name__=='__main__':unittest.main()
