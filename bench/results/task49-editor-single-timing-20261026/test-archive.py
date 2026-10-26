"""Run only after capture ends: strict metadata normalization regression checks."""
from pathlib import Path
import importlib.util
import json
import sys
import unittest

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('timing_archiver', Path(__file__).parent / 'archive.py')
archive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(archive)


class MetadataTests(unittest.TestCase):
    def test_only_power_instance_string_changes(self):
        raw = '{"power":{"output":"AC Power (id=12345); charged"},"rows":[-0,1e-9,1.000,true,null],"at":42}\n'
        public, notes = archive.public_json(raw, 'full/environment-before/runner.json')
        self.assertEqual(public, raw.replace('(id=12345)', '(id=<redacted>)').encode())
        self.assertEqual(len(notes), 1)

    def test_manifest_power_paths_and_duplicate_unapproved_string(self):
        value = {'environmentBefore': {'power': {'observed': {'output': 'AC Power (id=123)'}}}}
        public, _ = archive.public_json(json.dumps(value), 'full/manifest.json')
        self.assertIn(b'(id=<redacted>)', public)
        value['measurementLabel'] = 'AC Power (id=123)'
        with self.assertRaises(AssertionError):
            archive.public_json(json.dumps(value), 'full/manifest.json')

    def test_serial_is_environment_string_only(self):
        value = {'hardware': {'serial_number': 'SERIAL-EXAMPLE'}, 'logicalCpus': 12}
        public, notes = archive.public_json(json.dumps(value), 'full/environment-after/runner.json')
        self.assertEqual(json.loads(public), {'hardware': {'serial_number': '<redacted>'}, 'logicalCpus': 12})
        self.assertEqual(len(notes), 1)
        for candidate in [{'hardware': {'serial_number': 123}}, {'serial_number': 'SERIAL-EXAMPLE'}]:
            with self.assertRaises(AssertionError):
                archive.public_json(json.dumps(candidate), 'full/environment-after/runner.json')

    def test_unexpected_identity_or_path_fails_closed(self):
        for value in [{'hostname': 'example'}, {'batteryID': 'example'}, {'value': '12345678-1234-1234-1234-123456789012'}, {'value': '/' + 'Users' + '/example/path'}, {'value': '(id=123)'}]:
            with self.assertRaises(AssertionError):
                archive.public_json(json.dumps(value), 'full/runs/example/raw-callbacks.json')


if __name__ == '__main__':
    unittest.main()
