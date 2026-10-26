"""Small mutation tests for numeric/image/error/storage evidence contracts."""
from pathlib import Path
import copy,gzip,hashlib,importlib.util,json,math,struct,sys,tempfile,unittest,zlib
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('verify',Path(__file__).with_name('verify.py'));v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)

def snapshot():return {'numeric':[0.,1.,-0.],'pixelSha256':'a'*64,'width':1,'height':1,'objects':[{'name':'original'}],'history':['AddObjectCommand'],'selectedRoot':True}
class Fake:
 def __init__(self,values):self.values=values
 def J(self,p):return self.values[p]
class ContractTests(unittest.TestCase):
 def test_camera_numeric_or_image_changes_cannot_pass(self):
  original=snapshot();self.assertTrue(v.compare(original,copy.deepcopy(original))['equal'])
  for kind in ['numeric','pixelSha256','selectedRoot','objects','history']:
   modified=copy.deepcopy(original)
   if kind=='numeric':modified[kind][1]+=.1
   elif kind=='pixelSha256':modified[kind]='b'*64
   elif kind=='selectedRoot':modified[kind]=False
   else:modified[kind]=[]
   with self.subTest(kind=kind):self.assertFalse(v.compare(original,modified)['equal'])
 def test_nonfinite_numbers_rejected(self):
  for value in [math.nan,math.inf,-math.inf]:
   with self.subTest(value=value),self.assertRaises(AssertionError):v.numeric([1],[value])
 def test_native_close_tail_preserved(self):
  before={k:[] for k in ['requestFailed','console','dialogs','crashes','responses']};after=copy.deepcopy(before);failure={'phaseAtReceipt':'closing','url':'blob:<origin>/example','error':'net::ERR_BLOB_OUT_OF_MEMORY'};after['requestFailed'].append(failure)
  a=Fake({'r/native-events.json':after,'r/native-events-before-close.json':{'events':before},'r/native-events-after-close.json':{'events':after}});r=v.events(a,'r');self.assertEqual(r['requestFailed'],[failure]);self.assertEqual(r['tailEvents']['requestFailed'],[failure])
 def test_missing_before_event_rejected(self):
  before={k:[] for k in ['requestFailed','console','dialogs','crashes','responses']};before['requestFailed']=[{'error':'failure'}];after=copy.deepcopy(before);after['requestFailed']=[]
  with self.assertRaises(AssertionError):v.events(Fake({'r/native-events.json':after,'r/native-events-before-close.json':{'events':before},'r/native-events-after-close.json':{'events':after}}),'r')
 def test_saved_native_prefix_must_remain_ordered(self):
  before={k:[] for k in ['requestFailed','console','dialogs','crashes','responses']};after=copy.deepcopy(before);after['console']=[{'type':'error'}];before['console']=[{'type':'warning'}]
  with self.assertRaises(AssertionError):v.events(Fake({'r/native-events.json':before,'r/native-events-before-close.json':{'events':before},'r/native-events-after-close.json':{'events':after}}),'r')
class PrivacyTests(unittest.TestCase):
 def test_error_home_path_only_string_normalization(self):
  original='{"error":"at /Users/person/project/file.mjs:42","sample":[1e-12,-0.0,4]}'
  data,notes=v.s.builder.public_json(original,'result.json');self.assertEqual(data.decode(),'{"error":"at <home>/project/file.mjs:42","sample":[1e-12,-0.0,4]}');self.assertTrue(notes)
 def test_unknown_private_and_identity_rejected(self):
  for value in [{'data':'/Users/person/file'},{'hardware_uuid':'private'},{'hostname':'private'}]:
   with self.subTest(value=value),self.assertRaises(AssertionError):v.s.builder.public_json(json.dumps(value),'test.json')
 def test_public_scene_blob_ids_unchanged(self):
  text='{"url":"blob:<origin>/11111111-2222-3333-4444-555555555555"}';b,notes=v.s.builder.public_json(text,'test.json');self.assertEqual(b.decode(),text);self.assertFalse(notes)
class PngTests(unittest.TestCase):
 def png(self,pixels,w,h):
  def chunk(kind,p):return struct.pack('>I',len(p))+kind+p+struct.pack('>I',zlib.crc32(kind+p)&0xffffffff)
  raw=b''.join(b'\x00'+pixels[y*w*4:(y+1)*w*4] for y in range(h));return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
 def test_png_flip_channel_changes(self):
  original=bytes([1,2,3,255,4,5,6,255]);a=self.png(original,1,2);w,h,top,bottom=v.png.png_rgba(a);self.assertEqual((w,h,top,bottom),(1,2,original,original[4:]+original[:4]));b=self.png(bytes([1,2,3,255,4,8,6,255]),1,2);r=v.png.compare_png(a,b);self.assertEqual((r['changedPixels'],r['changedChannels'],r['maxAbsoluteChannelDelta']),(1,1,3))
 def test_crc_trailing_and_invalid_type_rejected(self):
  p=self.png(bytes([1,2,3,255]),1,1)
  for bad in [p[:-1]+bytes([p[-1]^1]),p+b'bad']:
   with self.assertRaises(AssertionError):v.png.png_rgba(bad)
class StorageTests(unittest.TestCase):
 def fixture(self,p):
  b=b'{"n":1}';z=gzip.compress(b,mtime=0);row={'path':v.s.builder.NAMES[0]+'/raw.json','sourcePath':'work/raw.json','blob':'blobs/'+v.H(b)+'.gz','storedSha256':v.H(z),'storedBytes':len(z),'decodedSha256':v.H(b),'decodedBytes':len(b),'decodedSourceSha256':v.H(b),'normalizations':[],'sourceGzip':False};(p/'blobs').mkdir();(p/row['blob']).write_bytes(z);index={'format':1,'files':[row],'inputs':[{'label':name,'files':1 if i==0 else 0} for i,name in enumerate(v.s.builder.NAMES)]};(p/'archive-index.json').write_text(json.dumps(index));(p/'build-status.json').write_text('{"status":"complete"}');return row,index
 def test_corrupt_blob_rejected(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp);row,index=self.fixture(p);v.s.Archive(p);(p/row['blob']).write_bytes(b'bad')
   with self.assertRaises(AssertionError):v.s.Archive(p)
 def test_duplicate_missing_or_traversal_rejected(self):
  for kind in ['duplicate','count','path']:
   with self.subTest(kind=kind),tempfile.TemporaryDirectory() as tmp:
    p=Path(tmp);row,index=self.fixture(p)
    if kind=='duplicate':index['files'].append(row.copy())
    elif kind=='count':index['inputs'][0]['files']=2
    else:row['path']='../escape'
    (p/'archive-index.json').write_text(json.dumps(index))
    with self.assertRaises(AssertionError):v.s.Archive(p)
 def test_extract_fresh_only(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp);row,index=self.fixture(p);a=v.s.Archive(p);dest=p/'restored';a.extract(dest);self.assertEqual((dest/row['path']).read_bytes(),a.B(row['path']))
   with self.assertRaises(AssertionError):a.extract(dest)
if __name__=='__main__':unittest.main()
