import copy
import importlib.util
import json
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('progress',ROOT/'tools/progress.py')
progress=importlib.util.module_from_spec(spec);spec.loader.exec_module(progress)

class ProgressTests(unittest.TestCase):
    def setUp(self):
        self.rules=json.loads((ROOT/'docs/progress-inventory.json').read_text())
        self.source=json.loads((ROOT/'docs/progress-source.json').read_text())
    def test_tiles_are_real_definitions_and_authority_is_separate(self):
        data=progress.summarize(self.rules,self.source)
        svg=ET.fromstring(progress.render_svg(data))
        tiles=[x for x in svg.iter() if 'data-item' in x.attrib]
        self.assertEqual(len(tiles),sum(data[p]['total'] for p in ['functions','state']))
        self.assertEqual(data['functions']['counts']['rust-batch'],1)
        self.assertEqual(data['state']['counts']['rust-owned'],0)
        self.assertTrue(all(float(x.attrib['width'])>0 and float(x.attrib['height'])>0 for x in tiles))
    def test_missing_mapping_and_unsubstantiated_authority_fail(self):
        self.rules['stateOverrides']['missing']={'status':'rust-owned'}
        with self.assertRaises(ValueError):progress.summarize(self.rules,self.source)
        self.rules['stateOverrides']={self.source['state'][0]['items'][0]['id']:{'status':'rust-owned'}}
        with self.assertRaises(ValueError):progress.summarize(self.rules,self.source)
    def test_names_are_escaped(self):
        self.source['state'][0]['name']='<unsafe & name>'
        data=progress.summarize(self.rules,self.source)
        for text in [progress.render_svg(data),progress.render_html(data)]:
            self.assertNotIn('<unsafe & name>',text)
            self.assertIn('&lt;unsafe',text)
    def test_history_does_not_equate_denominators_and_record_is_idempotent(self):
        h=json.loads((ROOT/'docs/progress-history.json').read_text());progress.validate_history(h)
        data=progress.summarize(self.rules,self.source);commit='a'*40
        progress.record(h,data,commit);n=len(h['observations']);progress.record(h,data,commit)
        self.assertEqual(len(h['observations']),n)
        md,html=progress.history_views(h);self.assertIn('not comparable',md);self.assertIn('not comparable',html)
        h['observations'][-1]['counts']['state']['total']+=1
        with self.assertRaises(ValueError):progress.validate_history(h)
    def test_layout_area_and_no_overlap(self):
        boxes=progress.layout([{'total':9},{'total':5},{'total':1}],0,0,500,300)
        self.assertAlmostEqual(sum(w*h for _,x,y,w,h in boxes),150000)
        for i,(_,x,y,w,h) in enumerate(boxes):
            for _,a,b,c,d in boxes[i+1:]:
                self.assertLess(max(0,min(x+w,a+c)-max(x,a))*max(0,min(y+h,b+d)-max(y,b)),1e-6)
if __name__=='__main__':unittest.main()
