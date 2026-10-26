"""Pure archive-audit regressions; no browser, source checkout or capture work."""
import importlib.util, unittest, json
from pathlib import Path
spec=importlib.util.spec_from_file_location('viewer_archive_verify',Path(__file__).with_name('verify.py'))
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)

class AuditTests(unittest.TestCase):
    def profile(self):
        return {'nodes':[{'id':1,'children':[2,3]},{'id':2,'children':[4]},{'id':3},{'id':4}], 'samples':[2,4,3,4], 'timeDeltas':[100,250,75,125]}
    def test_exclusive_and_overlapping_inclusive_accounting(self):
        nodes,own,hits,inclusive,ih=audit.profile_accounting(self.profile())
        self.assertEqual(dict(own),{2:100,4:375,3:75});self.assertEqual(inclusive[1],550);self.assertEqual(inclusive[2],475)
        self.assertEqual(ih[1],4);self.assertEqual(ih[2],3);self.assertEqual(hits[4],2)
    def test_broken_graph_and_negative_gaps_rejected(self):
        for mutation in ['child','cycle','negative','unknown']:
            p=self.profile()
            if mutation=='child':p['nodes'][2]['children']=[4]
            elif mutation=='cycle':p['nodes'][3]['children']=[1]
            elif mutation=='negative':p['timeDeltas'][0]=-1
            else:p['samples'][0]=99
            with self.subTest(mutation=mutation),self.assertRaises(AssertionError):audit.profile_accounting(p)
    def test_exact_source_map_points_and_explicit_unmapped_segments(self):
        # AAAA => generated0/source0/line0/column0, C => unmap generated1.
        # Next line resets generated column but retains source/original deltas.
        points=audit.decode_points('AAAA,C;AACA')
        self.assertEqual(points[(0,0)],[(0,0,0)]);self.assertEqual(points[(0,1)],[None]);self.assertEqual(points[(1,0)],[(0,1,0)])
        self.assertNotIn((0,2),points)  # No greatest-lower-bound interpolation.
    def test_duplicate_exact_mapping_is_not_unique(self):
        self.assertEqual(len(audit.decode_points('AAAA,AAAA')[(0,0)]),2)
    def test_unavailable_script_metadata_remains_generated_only(self):
        prepared={'viewerPin':audit.APP,'status':'prepared','outputs':[],'sourceMaps':[],'buildInputs':[],'sources':[],'adaptations':[],'integrity':{'originalSourcesAndDistUnchanged':True,'capturedInputsUnchanged':True}}
        data=json.dumps(prepared).encode();digest=audit.H(data)
        manifest={'preparedManifestFiles':{'native':{'file':'prepared.json','bytes':len(data),'sha256':digest}},'preparedManifests':{'native':digest}}
        class FakeArchive:
            def J(self,path):return manifest if path.endswith('/manifest.json') else {'preparationManifestSha256':digest,'appBundleOutputs':[]}
            def B(self,path):return data
        self.assertEqual(audit.source_maps(FakeArchive(),'capture','capture/run',{},[{'scriptId':'1','parsed':None}]),{})
    def test_logical_paths_cannot_escape(self):
        for value in ['/absolute','../parent','a/../b','a//b','a\\b','']:
            with self.subTest(value=value),self.assertRaises(AssertionError):audit.safe(value)
    def test_phase_oracle_includes_actions_and_draw_work(self):
        def snapshot():
            return {'numeric':[0,1],'objects':[],'clips':[],'state':{},'actions':[{'time':.75}],'captureLayout':{},'identityFailures':[],'axesCameraUpIdentity':True,'controlsCameraIdentity':True,'renderers':{k:{'width':1,'height':1,'pixelSha256':'pixel','quality':{},'work':{'calls':1}} for k in ['main','axes']}}
        a=snapshot();b=snapshot();self.assertEqual(audit.compare_oracle(a,b)['maximumAbsoluteDifference'],0)
        b['actions'][0]['time']=.5
        with self.assertRaises(AssertionError):audit.compare_oracle(a,b)
        b=snapshot();b['renderers']['axes']['work']['calls']=0
        with self.assertRaises(AssertionError):audit.compare_oracle(a,b)
if __name__=='__main__':unittest.main()
