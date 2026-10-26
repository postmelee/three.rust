"""Small regression tests for the archive's actual byte/privacy helpers."""
import importlib.util, unittest
from pathlib import Path

def module(name, file):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).parent/file)
    result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result);return result
build=module('archive_build','build.py')
verify=module('archive_verify','verify.py')

class ArchiveTests(unittest.TestCase):
    def test_numeric_json_bytes_and_negative_zero_are_not_reserialized(self):
        raw=b'{"numeric":[-0,1e-10,0.0000000000001,1.0000000000000002],"actions":[]}\n'
        public,changes=build.public_bytes(raw,'work/case-0.json',[])
        self.assertIs(public,raw);self.assertEqual(changes,[])
    def test_only_command_metadata_paths_change(self):
        raw=b'{"command":["node","/Users/example/app"],"exitCode":0,"sentinel":-0}\n'
        public,changes=build.public_bytes(raw,'work/server-command.json',[('/Users/example/app','<apps-root>')])
        self.assertEqual(public,raw.replace(b'/Users/example/app',b'<apps-root>'))
        self.assertEqual(changes,[{'kind':'local-command-or-log-path','replacement':'<apps-root>','occurrences':1}])
        with self.assertRaises(AssertionError):build.public_bytes(raw,'work/measurement.json',[('/Users/example/app','<apps-root>')])
    def test_private_executable_and_map_paths_fail_instead_of_redacting(self):
        for name in ['sources/hash.bin','dist/main.js','dist/main.js.map']:
            with self.subTest(name=name),self.assertRaises(AssertionError):
                build.public_bytes(b'const path="/Users/example/app";',name,[('/Users/example/app','<apps-root>')])
    def test_unknown_uuid_rejected_exact_public_readme_link_retained(self):
        with self.assertRaises(AssertionError):build.public_bytes(b'{"uuid":"12345678-1234-1234-1234-123456789012"}','work/case.json',[])
        raw=('![public screenshot]('+build.PUBLIC_IMAGE+')\n').encode()
        self.assertEqual(build.public_bytes(raw,'source/README.md',[]),(raw,[]))
    def test_path_traversal_rejected(self):
        for path in ['../outside','/absolute','blobs/../../outside','a//b']:
            with self.subTest(path=path),self.assertRaises(AssertionError):verify.safe(path)
    def test_numeric_tolerance_does_not_hide_action_or_render_changes(self):
        def snapshot():return {'numeric':[1.0],'objects':[],'clips':[],'state':{},'actions':[{'time':.75}], 'renderers':{k:{'width':1,'height':1,'pixelSha256':'a','quality':{},'work':{'calls':1}} for k in ['main','axes']}}
        a=snapshot();b=snapshot();self.assertTrue(verify.compare(a,b)['equal'])
        b['actions'][0]['time']=.5;self.assertFalse(verify.compare(a,b)['equal'])
        b=snapshot();b['renderers']['axes']['work']['calls']=0;self.assertFalse(verify.compare(a,b)['equal'])
if __name__=='__main__':unittest.main()
