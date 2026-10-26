"""Build the finite Viewer correctness archive in a fresh directory.

Lossless, content-addressed gzip deduplicates storage only. No measurements are
selected or recomputed here. Executable sources, maps, images and numeric JSON
stay byte-identical. Only declared command/log path metadata may be normalized.
"""
from pathlib import Path
import argparse, gzip, hashlib, json, re

MAX = 100_000_000
CAPTURES = ['smoke-001', 'smoke-002', 'correctness-001', 'correctness-002', 'correctness-003', 'correctness-004']
TREES = CAPTURES + ['external-001', 'external-002', 'tools-004', 'server-node-001', 'server-node-002', 'server-node-003', 'server-node-004']
NODE_FILES = ['commands.json', 'server-command.json', 'server.log'] + [f'{i:02}.log' for i in range(12)]
SETUP_FILES = ['viewer-tools-001/unit.log', 'viewer-tools-001/unit-002.log', 'viewer-tools-001/syntax.json', 'infra-viewer-integration-001.log', 'infra-viewer-integration-002.log', 'docs-viewer-tooling-001.log', 'docs-viewer-freeze.log']
PRIVATE = re.compile(r'/Users/|/(?:private/)?(?:var/folders|tmp)/|\(id=\d+\)')
UUID = re.compile(r'(?i)\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b')
SYSTEM = re.compile(r'(?i)^(?:hostname|computer.?name|serial.?number|hardware.?uuid|battery.?id)$')
PUBLIC_IMAGE = 'https://user-images.githubusercontent.com/1848368/31580352-b7354096-b101-11e7-86d7-f07677835812.png'

def sha(data): return hashlib.sha256(data).hexdigest()
def write_json(path, value):
    with path.open('x') as f: f.write(json.dumps(value, indent=2) + '\n')
def list_tree(root):
    files = []; excluded = []
    for path in root.rglob('*'):
        if path.is_symlink():
            assert path.relative_to(root).as_posix() == 'source/node_modules', 'Unexpected symbolic link'
            excluded.append({'path': 'source/node_modules', 'reason': 'Unmodified dependency installation; package/yarn.lock and executed sources are retained.'})
        elif path.is_file(): files.append(path.relative_to(root).as_posix())
        else: assert path.is_dir()
    return sorted(files), excluded
def inspect_json(value, path=()):
    if isinstance(value, str):
        assert not PRIVATE.search(value), 'Unexpected private path in JSON'
        assert not UUID.search(value), 'Unexpected UUID in JSON; exact field review required'
    elif isinstance(value, dict):
        for key, child in value.items():
            assert not UUID.search(key), 'Unexpected UUID key'
            assert not SYSTEM.fullmatch(key) or child in ['', None, '<redacted>'], 'Private system metadata'
            inspect_json(child, path+(key,))
    elif isinstance(value, list):
        for i, child in enumerate(value): inspect_json(child, path+(i,))
def public_bytes(raw, logical, replacements):
    normalized = []; public = raw
    metadata = logical.endswith('.log') or logical.endswith('/server-command.json')
    if metadata:
        for old, new in replacements:
            count = public.count(old.encode())
            if count:
                public = public.replace(old.encode(), new.encode())
                normalized.append({'kind': 'local-command-or-log-path', 'replacement': new, 'occurrences': count})
    if logical.endswith('.json'):
        after = json.loads(public)
        def numeric_tokens(v):
            if isinstance(v, (int, float)) and not isinstance(v, bool): return [v]
            if isinstance(v, dict): return sum((numeric_tokens(x) for x in v.values()), [])
            if isinstance(v, list): return sum((numeric_tokens(x) for x in v), [])
            return []
        if public != raw: assert numeric_tokens(json.loads(raw)) == numeric_tokens(after), 'Normalization changed numbers'
        inspect_json(after)
    # Binary images and Wasm are preserved without pretending to inspect their text.
    if not logical.endswith(('.png', '.ico', '.wasm')) and not public.startswith(b'\x00asm'):
        text = public.decode('utf-8')
        assert not PRIVATE.search(text), 'Private text outside declared metadata normalization'
        if not logical.endswith(('.bin', '.js', '.mjs', '.map', '.patch', '.original', '.adapted')):
            assert not UUID.search(text.replace(PUBLIC_IMAGE, '')), 'Unreviewed public UUID'
    if not metadata: assert public == raw
    return public, normalized
def build(root, apps, out):
    root = root.resolve(strict=True); apps = apps.resolve(strict=True); out = out.resolve()
    assert not out.exists(), 'Archive destination must be fresh'
    selected = []; trees = []; excluded = []
    for name in TREES:
        rel = 'work/task49-viewer-' + name; folder = root/rel
        files, omissions = list_tree(folder)
        if name in CAPTURES:
            assert json.loads((folder/'result.json').read_text())['status'] in ['passed', 'failed'], 'Pending capture'
        selected += [(f'{rel}/{file}', folder/file, 'tool-root') for file in files]
        trees.append({'path': rel, 'files': files})
        excluded += [{'path': f'{rel}/{x["path"]}', 'reason': x['reason']} for x in omissions]
    for file in NODE_FILES:
        rel = 'work/task49-viewer-node-004/' + file; selected.append((rel, root/rel, 'tool-root'))
    for file in SETUP_FILES:
        rel = 'work/task49-setup/' + file; selected.append((rel, root/rel, 'tool-root'))
    # Actual bundle dependency license files, with pinned package metadata.
    prep = json.loads((root/'work/task49-viewer-external-002/manifest.json').read_text())
    dependencies = sorted({x['file'].split('/')[2] for x in prep['buildInputs'] if x['file'].startswith('viewer/node_modules/')} | {'three'})
    notices = []
    for name in dependencies:
        package = apps/'viewer/node_modules'/name
        files = sorted(p for p in package.iterdir() if p.is_file() and (p.name.lower().startswith(('license', 'notice', 'copying')) or p.name == 'package.json'))
        assert any(p.name != 'package.json' for p in files), 'Dependency license missing'
        for p in files:
            rel = p.relative_to(apps).as_posix(); selected.append(('notices/' + rel, p, 'apps-root')); notices.append('notices/' + rel)
    for file in ['RobotExpressive-LICENSE.md', 'THREE-LICENSE.txt']:
        p = root/'bench/results/task49-editor-single-correctness-20261026/licenses'/file
        selected.append(('notices/' + file, p, 'tool-root'))
    assert len({x[0] for x in selected}) == len(selected)
    out.mkdir(parents=True); (out/'blobs').mkdir(); entries = []; blob_info = {}
    try:
        for logical, source, source_root in sorted(selected):
            raw = source.read_bytes(); assert len(raw) < MAX
            public, normalizations = public_bytes(raw, logical, [(str(apps), '<apps-root>'), (str(root), '<tool-root>')])
            digest = sha(public); blob = f'blobs/{digest}.gz'
            if digest not in blob_info:
                encoded = gzip.compress(public, compresslevel=6, mtime=0)
                with (out/blob).open('xb') as f: f.write(encoded)
                blob_info[digest] = {'blob': blob, 'storedBytes': len(encoded), 'storedSha256': sha(encoded)}
            srcbase = apps if source_root == 'apps-root' else root
            entries.append({'path': logical, 'sourceRoot': source_root, 'sourcePath': source.relative_to(srcbase).as_posix(), 'sourceBytes': len(raw), 'sourceSha256': sha(raw), 'decodedBytes': len(public), 'decodedSha256': digest, **blob_info[digest], 'normalizations': normalizations})
        for tree in trees: assert list_tree(root/tree['path'])[0] == tree['files'], 'Source tree changed'
        for entry in entries:
            base = apps if entry['sourceRoot'] == 'apps-root' else root
            assert sha((base/entry['sourcePath']).read_bytes()) == entry['sourceSha256'], 'Source bytes changed'
        index = {'format': 1, 'storage': 'Content-addressed deterministic gzip; logical paths reconstruct every selected raw file.', 'normalizationPolicy': 'Only declared command/log local path strings. All executable source, map, PNG and numeric snapshot bytes unchanged. No UUID normalization or blanket UUID allowlist.', 'sourceTrees': trees, 'scope': {'captures': CAPTURES, 'preparations': ['external-001', 'external-002'], 'toolSnapshot': 'tools-004', 'transportChecks': ['server-node-001', 'server-node-002', 'server-node-003', 'server-node-004'], 'node004Files': NODE_FILES, 'setupFiles': SETUP_FILES, 'excludedLaterWork': 'external-003, timing preparations, larger-content descriptors/captures and their new commands are separate subsequent work.'}, 'excludedSymlinks': excluded, 'notices': notices, 'files': entries}
        write_json(out/'archive-index.json', index)
        status = {'status': 'complete', 'logicalFiles': len(entries), 'physicalBlobs': len(blob_info), 'sourceBytes': sum(e['sourceBytes'] for e in entries), 'storedBlobBytes': sum(e['storedBytes'] for e in blob_info.values()), 'normalizedFiles': sum(bool(e['normalizations']) for e in entries), 'sourceHashesRechecked': True, 'sourceListingsUnchanged': True}
        write_json(out/'build-status.json', status)
        return status
    except Exception as error:
        write_json(out/'partial-index.json', {'files': entries})
        write_json(out/'build-status.json', {'status': 'failed', 'errorType': type(error).__name__, 'copiedLogicalFiles': len(entries)})
        raise
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True); parser.add_argument('--apps', type=Path, required=True); parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args(); print(json.dumps(build(args.root, args.apps, args.out)))
