"""Small archive/privacy/oracle mutation tests; no browser or original captures."""
from pathlib import Path
import copy,gzip,hashlib,importlib.util,json,math,struct,sys,tempfile,unittest
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parent

def module(name):
    s=importlib.util.spec_from_file_location(name,ROOT/(name+'.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
v=module('verify');a=module('archive')

def oracle():
    return {'numeric':[0.0,1.0,-0.0],'objects':[{'name':'Robot','visible':True}], 'clips':['Walking'], 'state':{'grid':True},'actions':[{'time':.25}], 'captureLayout':{'main':{'width':1280}},'renderers':{name:{'width':2,'height':1,'pixelSha256':'a'*64,'quality':{'pixelRatio':1},'work':{'calls':1}} for name in ['main','axes']}}

class OracleTests(unittest.TestCase):
    def test_exact_and_small_allowed_numeric(self):
        x=oracle();y=copy.deepcopy(x);y['numeric'][1]+=1e-12
        self.assertTrue(v.compare_oracle(x,y,True)['equal'])
    def test_strict_mutations_fail(self):
        for key in ['numeric','objects','clips','state','actions','captureLayout','pixel']:
            with self.subTest(key=key):
                x=oracle();y=copy.deepcopy(x)
                if key=='numeric':y[key][1]+=.01
                elif key=='pixel':y['renderers']['axes']['pixelSha256']='b'*64
                else:y[key]={}
                with self.assertRaises(AssertionError):v.compare_oracle(x,y,True)
    def test_migration_non_strict_preserves_difference(self):
        x=oracle();y=copy.deepcopy(x);y['numeric'][0]=10;y['renderers']['main']['pixelSha256']='b'*64
        z=v.compare_oracle(x,y,False);self.assertFalse(z['equal']);self.assertEqual(z['differences'][0]['count'],1);self.assertEqual(z['maxAbsoluteDifference'],10)
    def test_nonfinite_rejected(self):
        for n in [math.inf,math.nan]:
            x=oracle();y=copy.deepcopy(x);y['numeric'][1]=n
            with self.assertRaises(AssertionError):v.compare_oracle(x,y,False)

class PrivacyTests(unittest.TestCase):
    def test_only_explicit_battery_field_preserves_tokens(self):
        text='{"power":{"output":"AC Power (id=123456)"},"samples":[-0.0,1e-7,42,null]}'
        b,notes=a.public_json(text,'engine-full/environment-before/runner.json')
        self.assertEqual(b.decode(),text.replace('id=123456','id=<redacted>'));self.assertEqual(len(notes),1)
    def test_unexpected_ids_paths_or_numeric_serial_rejected(self):
        cases=[({'x':'AC Power (id=123)'},'engine-full/raw.json'),({'hostname':'machine'},'engine-full/manifest.json'),({'x':'/Users/private/something'},'engine-full/setup.json'),({'x':'11111111-2222-3333-4444-555555555555'},'engine-full/raw.json'),({'hardware':{'serial':123}},'engine-full/environment-before/runner.json')]
        for obj,relative in cases:
            with self.subTest(obj=obj),self.assertRaises(AssertionError):a.public_json(json.dumps(obj),relative)
    def test_allowed_serial_string(self):
        b,notes=a.public_json('{"hardware":{"serial":"machine-value"},"n":1}','full/environment-before/runner.json');self.assertEqual(json.loads(b)['hardware']['serial'],'<redacted>');self.assertEqual(json.loads(b)['n'],1)

class StorageTests(unittest.TestCase):
    def fixture(self,root):
        b=b'{"rows":[1,2,3]}';z=gzip.compress(b,mtime=0);h=lambda x:hashlib.sha256(x).hexdigest();storage='blobs/'+h(z)+'.gz';(root/'blobs').mkdir();(root/storage).write_bytes(z)
        row={'path':'engine-full/raw.json.gz','sourcePath':'work/capture/raw.json','storage':storage,'gzip':True,'sourceGzip':False,'sha256':h(z),'storedBytes':len(z),'decodedSha256':h(b),'decodedBytes':len(b),'sourceDecodedSha256':h(b),'normalizations':[]}
        index={'format':2,'files':[row],'sourceSuites':[{'label':'engine-full','fileCount':1}]};(root/'archive-index.json').write_text(json.dumps(index));(root/'build-status.json').write_text('{"status":"complete"}');return index,row
    def test_hash_and_missing_file_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp);idx,row=self.fixture(p);v.Archive(p);(p/row['storage']).write_bytes(b'bad')
            with self.assertRaises(AssertionError):v.Archive(p)
    def test_duplicate_and_traversal_rejected(self):
        for mutation in ['duplicate','traversal','storage','count']:
            with self.subTest(mutation=mutation),tempfile.TemporaryDirectory() as tmp:
                p=Path(tmp);idx,row=self.fixture(p)
                if mutation=='duplicate':idx['files'].append(row.copy())
                elif mutation=='traversal':row['path']='../escape.json.gz'
                elif mutation=='storage':row['storage']='../outside.gz'
                else:idx['sourceSuites'][0]['fileCount']=2
                (p/'archive-index.json').write_text(json.dumps(idx))
                with self.assertRaises(AssertionError):v.Archive(p)
    def test_extract_public_bytes_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp);self.fixture(p);archive=v.Archive(p);dest=p/'restored';archive.extract(dest)
            self.assertEqual((dest/'engine-full/raw.json').read_bytes(),archive.B('engine-full/raw.json'))
            with self.assertRaises(AssertionError):archive.extract(dest)
    def test_path_prefix_sort_membership(self):
        paths=[Path('oracles/robot-walking/a'),Path('oracles/robot-walking-grid-off/a')]
        self.assertNotEqual([str(x) for x in sorted(paths)],sorted(str(x) for x in paths))
        self.assertEqual(sorted(str(x) for x in sorted(paths)),sorted(str(x) for x in paths))

if __name__=='__main__':unittest.main()
