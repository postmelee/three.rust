"""Archive finished Viewer timing captures; do not run during capture.

Example, only after the operator confirms that every source session has ended:
  python3 archive.py --root /path/to/tooling \
    --out /path/to/new/archive --verifier /path/to/verify.py \
    --suite smoke=work/task49-viewer-robot-timing-smoke-001 \
    --suite full=work/task49-viewer-robot-timing-full-001

No defaults select or omit sessions. The caller lists every attempted capture.
The destination must not exist. Failed/partial sessions are evidence, not errors
to discard. This script never edits sources, launches a browser or runs a build.
It writes a failed build-status record if archival fails; use a fresh destination
after correcting that problem rather than overwriting either source or archive.
"""
from pathlib import Path
import argparse
import gzip
import hashlib
import json
import re
import shutil
import struct

MAX_BYTES = 100_000_000
PRIVATE_PATH = re.compile(r'/Users/|/(?:private/)?(?:var/folders|tmp)/')
UUID = re.compile(r'(?i)\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b')
SERIAL = re.compile(r'(?i)^(?:serial(?:_num|_number|Number)?|spdisplays_display-serial-number)$')


def public_json(text, relative):
    """Replace only known environment identity strings, preserving numeric tokens."""
    original = json.loads(text)
    parts = Path(relative).parts
    runner = len(parts) >= 3 and parts[-2] in ['environment-before', 'environment-after'] and parts[-1] == 'runner.json'
    manifest = len(parts) == 2 and parts[-1] == 'manifest.json'
    replacements, notes = {}, set()

    def normalized(value, where):
        result = value
        power_output = (runner and where == ('power', 'output')) or (manifest and where in [
            ('environmentBefore', 'power', 'observed', 'output'),
            ('environmentAfter', 'power', 'observed', 'output')])
        if power_output:
            result, count = re.subn(r'\(id=\d+\)', '(id=<redacted>)', result)
            if count:
                notes.add('Battery instance identifier redacted only in recorded power output')
        if runner and where and where[0] in ['hardware', 'graphics'] and SERIAL.fullmatch(str(where[-1])):
            result = '<redacted>'
            notes.add('Hardware/display serial string redacted in its explicit environment field')
        return result

    def inspect(value, where=()):
        if isinstance(value, str):
            changed = normalized(value, where)
            assert not PRIVATE_PATH.search(changed), 'Unexpected private path requires explicit review'
            assert not UUID.search(changed), 'Unexpected UUID requires explicit review'
            assert not re.search(r'\(id=\d+\)', changed), 'Unexpected instance ID requires explicit review'
            if changed != value:
                replacements[value] = changed
        elif isinstance(value, dict):
            for key, child in value.items():
                assert not UUID.search(key)
                if re.fullmatch(r'(?i)(?:hostname|computer.?name|hardware.?uuid|battery.?id)', key):
                    assert child in ['', None, '<redacted>'], 'Unexpected system identity field'
                if SERIAL.fullmatch(key):
                    assert runner and where and where[0] in ['hardware', 'graphics'] and isinstance(child, str), 'Serial outside allowed environment string field'
                inspect(child, where + (key,))
        elif isinstance(value, list):
            for i, child in enumerate(value):
                inspect(child, where + (i,))

    inspect(original)
    public = text
    for before, after in replacements.items():
        token = json.dumps(before, ensure_ascii=False)
        assert token in public, 'Expected exact JSON string token'
        public = public.replace(token, json.dumps(after, ensure_ascii=False))

    def invariant(a, b, where=()):
        assert type(a) is type(b), 'Changed JSON value type'
        if isinstance(a, str):
            assert b == normalized(a, where), 'Unexpected metadata change'
        elif isinstance(a, dict):
            assert list(a) == list(b), 'Changed JSON keys/order'
            for key in a:
                invariant(a[key], b[key], where + (key,))
        elif isinstance(a, list):
            assert len(a) == len(b)
            for i, (x, y) in enumerate(zip(a, b)):
                invariant(x, y, where + (i,))
        elif isinstance(a, float):
            assert struct.pack('>d', a) == struct.pack('>d', b), 'Changed JSON numeric value/sign'
        else:
            assert a == b, 'Changed non-string value'
    invariant(original, json.loads(public))
    return public.encode('utf-8'), sorted(notes)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--verifier', type=Path, required=True)
    parser.add_argument('--suite', action='append', required=True,
                        help='Public label=source path relative to root')
    args = parser.parse_args()
    root = args.root.resolve(strict=True)
    out = args.out.resolve()
    verifier = args.verifier.resolve(strict=True)
    assert not out.exists(), 'Choose a fresh archive path; refusing overwrite'
    assert verifier.is_file()
    suites = {}
    for item in args.suite:
        label, relative = item.split('=', 1)
        assert re.fullmatch(r'[a-z0-9][a-z0-9-]*', label), 'Unsafe suite label'
        assert label not in suites
        path = (root / relative).resolve(strict=True)
        assert path.is_dir() and path.is_relative_to(root / 'work')
        assert not out.is_relative_to(path) and not path.is_relative_to(out)
        manifest = json.loads((path / 'manifest.json').read_text())
        assert manifest.get('status') in {
            'failed', 'smoke-complete-not-performance-evidence',
            'screen-complete-unqualified'
        }, f'{label}: capture is not terminal'
        assert manifest.get('finishedAt'), f'{label}: capture lacks final timestamp'
        assert 'sourceIntegrity' in manifest, f'{label}: finalization is incomplete'
        suites[label] = (path, manifest)

    replacements = [(str(root), '<tooling-checkout>')]
    # Source paths may already be redacted by the capture tool. Only literal
    # metadata paths are normalized; numeric values, UUIDs and other IDs stay.
    for label, (path, _) in suites.items():
        replacements.insert(0, (str(path), f'<capture:{label}>'))
    replacements.sort(key=lambda item: len(item[0]), reverse=True)

    def normalize(value):
        notes = []
        for original, public in replacements:
            if original in value:
                value = value.replace(original, public)
                notes.append('Absolute local path normalized to ' + public)
        for pattern, replacement, note in [
            (r'/Users/[^/\s"\\<>]+', '<home>', 'Other local home prefix normalized'),
            (r'/(?:private/)?var/folders/[^\s"\\<>]+', '<temporary-directory>',
             'Private temporary directory normalized'),
            (r'\(id=\d+\)', '(id=<redacted>)',
             'Battery instance identifier redacted; status and settings unchanged'),
        ]:
            value, count = re.subn(pattern, replacement, value)
            if count:
                notes.append(note)
        # Existing <browser-private-directory> placeholders remain unchanged.
        pattern = r'--(user-data-dir|crash-dumps-dir|disk-cache-dir)=([^\s"\\]+)'
        count = [0]

        def profile(match):
            if match.group(2).startswith('<'):
                return match.group(0)
            count[0] += 1
            return '--' + match.group(1) + '=<browser-private-directory>'

        value = re.sub(pattern, profile, value)
        if count[0]:
            notes.append('Browser profile/cache path normalized; other argv retained')
        assert not re.search(r'/Users/|/(?:private/)?var/folders/', value)
        return value, notes

    def invariant(original, public):
        if original == public:
            return
        if isinstance(original, str) and isinstance(public, str):
            assert normalize(original)[0] == public
            return
        assert type(original) is type(public), 'Changed JSON value type'
        if isinstance(original, dict):
            assert original.keys() == public.keys(), 'Changed JSON keys'
            for key in original:
                invariant(original[key], public[key])
        elif isinstance(original, list):
            assert len(original) == len(public), 'Changed array length'
            for a, b in zip(original, public):
                invariant(a, b)
        else:
            raise AssertionError('Changed non-string JSON value')

    out.mkdir(parents=True, exist_ok=False)
    entries = []
    original_files = {}
    compression_cache = {}
    status = {'status': 'building', 'sourceSuites': []}
    write = lambda name, value: (out / name).write_text(json.dumps(value, indent=2) + '\n')
    write('build-status.json', status)

    def copy_file(source, relative):
        assert source.is_file() and not source.is_symlink(), 'Unexpected source symlink'
        source_data = source.read_bytes()
        assert len(source_data) < MAX_BYTES
        source_gzip = source.suffix == '.gz'
        source_decoded = gzip.decompress(source_data) if source_gzip else source_data
        assert len(source_decoded) < MAX_BYTES
        notes = []
        try:
            text = source_decoded.decode('utf-8')
        except UnicodeDecodeError:
            public = source_decoded
        else:
            if source.name.endswith(('.json', '.json.gz')):
                public, notes = public_json(text, relative)
            else:
                assert not PRIVATE_PATH.search(text), 'Private source/text requires explicit review'
                public = source_decoded
        compress = Path(relative).parts[0] != 'licenses'
        if compress and not str(relative).endswith('.gz'):
            relative = Path(str(relative) + '.gz')
        digest = sha(public)
        if compress and digest in compression_cache:
            stored = compression_cache[digest]
        else:
            stored = gzip.compress(public, compresslevel=9, mtime=0) if compress else public
            if compress:
                compression_cache[digest] = stored
        assert len(stored) < MAX_BYTES
        storage = f"blobs/{sha(stored)}{'.gz' if compress else '.bin'}"
        target = out / storage
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            assert target.read_bytes() == stored, 'Content-address collision'
        else:
            target.write_bytes(stored)
        if Path(relative).parts[0] == 'licenses':
            visible = out / relative
            visible.parent.mkdir(parents=True, exist_ok=True)
            visible.write_bytes(stored)
        item = {
            'path': str(relative), 'storage': storage, 'sourcePath': str(source.relative_to(root)),
            'sourceSha256': sha(source_data), 'sourceDecodedSha256': sha(source_decoded),
            'decodedSha256': sha(public), 'sha256': sha(stored),
            'sourceBytes': len(source_data), 'decodedBytes': len(public),
            'storedBytes': len(stored), 'sourceGzip': source_gzip,
            'gzip': compress, 'normalizations': notes
        }
        entries.append(item)
        original_files[source] = item['sourceSha256']

    try:
        source_listing = {}
        for label, (directory, manifest) in suites.items():
            assert not any(f.is_symlink() for f in directory.rglob('*')), 'Source symlink rejected'
            files = sorted(f for f in directory.rglob('*') if f.is_file())
            source_listing[label] = sorted(str(f.relative_to(directory)) for f in files)
            status['sourceSuites'].append({
                'label': label, 'sourceDirectory': str(directory.relative_to(root)),
                'captureStatus': manifest['status'],
                'mode': manifest['configuration']['mode'],
                'toolingSha': manifest['sourceBefore']['tooling']['sha'],
                'candidateSha': manifest.get('candidateSha'),
                'finishedAt': manifest['finishedAt'], 'fileCount': len(files)
            })
            for source in files:
                copy_file(source, Path(label) / source.relative_to(directory))
        for label, (directory, manifest) in suites.items():
            protocol = manifest['protocol']
            file = root / protocol['file']
            assert sha(file.read_bytes()) == protocol['sha256']
            assert json.loads(file.read_bytes()) == protocol['protocol']
            logical = Path('protocols') / file.name
            if not any(entry['path'] == str(logical) + '.gz' for entry in entries):
                copy_file(file, logical)
        decision = root / 'mydocs/plans/task_m6_49_viewer_decision.md'
        assert sha(decision.read_bytes()) == '04f9a4114dfbddabc683963386a206eb40cbb2294e0d8904c53f174c93e4e7df'
        copy_file(decision, Path('protocols') / decision.name)
        for name in ['THREE-LICENSE.txt', 'RobotExpressive-LICENSE.md', 'Viewer-LICENSE']:
            source = root / 'bench/results/task49-viewer-profile-20261026/licenses' / name
            copy_file(source, Path('licenses') / name)

        prepared = {
            'native': 'work/task49-viewer-external-003',
            'timing': 'work/task49-viewer-timing-external-frozen-001',
            'timingOriginal': 'work/task49-viewer-timing-bundled-frozen-001'
        }
        for kind, relative in prepared.items():
            directory = root / relative
            expected = {m['preparedManifests'][kind] for _, m in suites.values() if kind in m['preparedManifests']}
            assert len(expected) == 1 and sha((directory / 'manifest.json').read_bytes()) in expected
            files = sorted(f for f in directory.rglob('*') if f.is_file())
            for source in files:
                copy_file(source, Path('preparation') / kind / source.relative_to(directory))

        # Refuse an inconsistent snapshot if a source changed during archival.
        for source, expected in original_files.items():
            assert sha(source.read_bytes()) == expected, f'Capture changed: {source.name}'
        for label, (directory, _) in suites.items():
            assert sorted(str(f.relative_to(directory)) for f in directory.rglob('*')
                          if f.is_file()) == source_listing[label]

        index = {
            'format': 2, 'storage': 'Logical paths retain all original provenance; storage identifies exact content-addressed stored bytes. Repeated payloads share one blob without recompression.', 'kind': 'Task49 Viewer native callback timing: separate engine and migration sessions',
            'normalizationPolicy': 'Only battery instance identifiers in explicit environment power-output fields and hardware/display serial string fields are normalized. Unexpected private paths, UUIDs or system identities fail closed. All other source bytes, numeric tokens, unavailable values, timestamps, arrays, counters, errors, overlays and images remain unchanged. Source, decoded-source, public-decoded and stored hashes are separate. No run, partial callback or failed attempt is excluded.',
            'numericInvariance': 'Exact JSON string-token replacement plus recursive type/value/sign/key/order verification; all numeric tokens remain unchanged.',
            'sourceSuites': status['sourceSuites'], 'files': entries
        }
        write('archive-index.json', index)
        shutil.copyfile(verifier, out / 'verify.py')
        status.update(status='complete', payloads=len(entries),
                      sourceHashesRechecked=True, sourceListingsUnchanged=True)
        write('build-status.json', status)
        print(json.dumps({'status': 'complete', 'payloads': len(entries),
                          'bytes': sum(e['storedBytes'] for e in entries),
                          'normalizedPayloads': sum(bool(e['normalizations']) for e in entries)}))
    except BaseException as error:
        status.update(status='failed', error=normalize(str(error))[0],
                      copiedPayloads=len(entries))
        write('build-status.json', status)
        write('partial-index.json', {'files': entries})
        raise


if __name__ == '__main__':
    main()
