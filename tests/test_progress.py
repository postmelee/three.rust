import copy
import importlib.util
import json
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('progress', ROOT/'tools/progress.py')
progress = importlib.util.module_from_spec(spec)
spec.loader.exec_module(progress)


class ProgressTests(unittest.TestCase):
    def setUp(self):
        self.inventory = json.loads((ROOT/'docs/progress-inventory.json').read_text())

    def test_counts_match_enumerated_items_and_svg_tiles(self):
        data = progress.summarize(self.inventory)
        svg = ET.fromstring(progress.render_svg(data))
        tiles = [r for r in svg.iter() if 'data-item' in r.attrib]
        self.assertEqual(len(tiles), sum(data[p]['total'] for p in ['cpu', 'evidence']))
        for p, state in [('cpu', 'implemented'), ('evidence', 'passed')]:
            self.assertEqual(data[p]['done'], sum(i['state'] == state for g in data[p]['groups'] for i in g['items']))
        self.assertTrue(all(float(t.attrib['width']) > 0 and float(t.attrib['height']) > 0 for t in tiles))

    def test_rejects_duplicate_ids_bad_states_and_missing_evidence(self):
        for mutate in [lambda d: d['cpu'][0]['items'].append(copy.deepcopy(d['cpu'][0]['items'][0])),
                       lambda d: d['cpu'][0]['items'][0].update(state='passed'),
                       lambda d: d['cpu'][0]['items'][0].update(evidence='../missing')]:
            d = copy.deepcopy(self.inventory)
            mutate(d)
            with self.assertRaises(ValueError):
                progress.summarize(d)

    def test_html_and_svg_escape_labels(self):
        self.inventory['cpu'][0]['name'] = '<unsafe & label>'
        d = progress.summarize(self.inventory)
        for result in [progress.render_html(d), progress.render_svg(d)]:
            self.assertIn('&lt;unsafe &amp; label&gt;', result)
            self.assertNotIn('<unsafe & label>', result)

    def test_group_layout_preserves_area_without_overlap(self):
        d = progress.summarize(self.inventory)
        boxes = progress.layout(d['cpu']['groups'], 0, 0, 572, 338)
        self.assertAlmostEqual(sum(w*h for _, x, y, w, h in boxes), 572*338)
        for i, (_, x, y, w, h) in enumerate(boxes):
            for _, a, b, c, e in boxes[i+1:]:
                overlap = max(0, min(x+w, a+c)-max(x, a))*max(0, min(y+h, b+e)-max(y, b))
                self.assertLess(overlap, 1e-6)


if __name__ == '__main__':
    unittest.main()
