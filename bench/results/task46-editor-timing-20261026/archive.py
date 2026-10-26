"""Archive finished Editor timing captures; do not run during capture.

Example, only after the operator confirms that every source session has ended:
  python3 archive.py --root /path/to/tooling \
    --out /path/to/new/archive --verifier /path/to/verify.py \
    --suite smoke-001=work/task46-editor-timing-smoke-001 \
    --suite smoke-002=work/task46-editor-timing-smoke-002 \
    --suite smoke-003=work/task46-editor-timing-smoke-003 \
    --suite full=work/task46-editor-timing-screen-001

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
    status = {'status': 'building', 'sourceSuites': []}
    write = lambda name, value: (out / name).write_text(json.dumps(value, indent=2) + '\n')
    write('build-status.json', status)

    def copy_file(source, relative):
        assert source.is_file() and not source.is_symlink(), 'Unexpected source symlink'
        source_data = source.read_bytes()
        source_gzip = source.suffix == '.gz'
        source_decoded = gzip.decompress(source_data) if source_gzip else source_data
        notes = []
        try:
            text = source_decoded.decode('utf-8')
        except UnicodeDecodeError:
            public = source_decoded
        else:
            public_text, notes = normalize(text)
            public = public_text.encode('utf-8')
            if source.name.endswith(('.json', '.json.gz')):
                invariant(json.loads(source_decoded), json.loads(public))
        keep_plain = source.name in {
            'manifest.json', 'analysis.json', 'environment.json', 'setup.json',
            'summary.json', 'errors.json', 'integrity.json', 'failure.json',
            'oracle-failure.json'
        }
        compress = source_gzip or (source.suffix == '.json' and not keep_plain)
        if compress and not str(relative).endswith('.gz'):
            relative = Path(str(relative) + '.gz')
        stored = gzip.compress(public, compresslevel=9, mtime=0) if compress else public
        target = out / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(stored)
        item = {
            'path': str(relative), 'sourcePath': str(source.relative_to(root)),
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
            files = sorted(f for f in directory.rglob('*') if f.is_file())
            source_listing[label] = [str(f.relative_to(directory)) for f in files]
            status['sourceSuites'].append({
                'label': label, 'sourceDirectory': str(directory.relative_to(root)),
                'captureStatus': manifest['status'],
                'mode': manifest['configuration']['mode'],
                'toolingSha': manifest.get('tooling', {}).get('sha'),
                'candidateSha': manifest.get('candidateSha'),
                'finishedAt': manifest['finishedAt'], 'fileCount': len(files)
            })
            for source in files:
                copy_file(source, Path(label) / source.relative_to(directory))
        for name in ['THREE-LICENSE.txt', 'RobotExpressive-LICENSE.md']:
            source = root / 'bench/results/task46-editor-correctness-20261026/licenses' / name
            copy_file(source, Path('licenses') / name)

        # Refuse an inconsistent snapshot if a source changed during archival.
        for source, expected in original_files.items():
            assert sha(source.read_bytes()) == expected, f'Capture changed: {source.name}'
        for label, (directory, _) in suites.items():
            assert sorted(str(f.relative_to(directory)) for f in directory.rglob('*')
                          if f.is_file()) == source_listing[label]

        index = {
            'format': 1, 'kind': 'Task46 Editor native callback timing evidence',
            'normalizationPolicy': 'Only explicitly listed absolute local paths, browser profile/cache paths and battery instance identifier strings are normalized or redacted. Numeric JSON values, null/unavailable values, timestamps, arrays, counters, errors, source overlays and images remain unchanged. Source hashes identify untouched original bytes; source-decoded, public-decoded and stored hashes are separate. No run, partial callback or failed attempt is excluded.',
            'numericInvariance': 'Recursively verified for every JSON payload; only the named string normalizations may differ.',
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
