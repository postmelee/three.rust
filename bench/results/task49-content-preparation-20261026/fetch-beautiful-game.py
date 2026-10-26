#!/usr/bin/env python3
"""Fetch the fixed Khronos glTF variant using captured GitHub file metadata."""
import datetime
import hashlib
import json
import pathlib
import sys
import time
import urllib.request

REPOSITORY = 'KhronosGroup/glTF-Sample-Assets'
PIN = '8f492390ddc7a2ae221a1369ef560589cf8c70fb'
PREFIX = 'Models/ABeautifulGame/glTF/'
EXPECTED_COUNT = 35
EXPECTED_BYTES = 29805749

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def main():
    if len(sys.argv) != 3:
        raise SystemExit('Usage: task49-fetch-beautiful-game.py CAPTURED_METADATA NEW_OUTPUT_DIRECTORY')
    metadata_bytes = pathlib.Path(sys.argv[1]).read_bytes()
    metadata = json.loads(metadata_bytes)
    entries = metadata['ABeautifulGameFiles']
    assert metadata['pin'] == PIN
    assert len(entries) == EXPECTED_COUNT and sum(x['size'] for x in entries) == EXPECTED_BYTES
    assert len({x['name'] for x in entries}) == EXPECTED_COUNT
    for entry in entries:
        assert entry['type'] == 'file' and entry['path'] == PREFIX + entry['name']
        assert pathlib.PurePosixPath(entry['name']).name == entry['name']
        assert entry['name'] not in ('.', '..')
        assert entry['download_url'] == f'https://raw.githubusercontent.com/{REPOSITORY}/{PIN}/{entry["path"]}'
    destination = pathlib.Path(sys.argv[2])
    destination.mkdir(exist_ok=False)
    manifest = {
        'schema': 1, 'asset': 'A Beautiful Game', 'variant': 'glTF',
        'repository': REPOSITORY, 'sourcePin': PIN,
        'sourceMetadataSHA256': hashlib.sha256(metadata_bytes).hexdigest(),
        'expectedFiles': EXPECTED_COUNT, 'expectedBytes': EXPECTED_BYTES,
        'license': 'CC-BY-4.0',
        'noticeSource': f'https://github.com/{REPOSITORY}/blob/{PIN}/Models/ABeautifulGame/README.md',
        'startedAt': now(), 'status': 'running', 'files': [], 'failures': []
    }
    def save():
        temporary = destination / 'fetch-manifest.json.tmp'
        temporary.write_text(json.dumps(manifest, indent=2) + '\n')
        temporary.replace(destination / 'fetch-manifest.json')
    save()
    try:
        for entry in entries:
            url = entry['download_url']
            data = None
            for attempt in range(1, 4):
                try:
                    request = urllib.request.Request(url, headers={'User-Agent': 'three-rust-pinned-asset-fetch'})
                    with urllib.request.urlopen(request, timeout=60) as response:
                        data = response.read(entry['size'] + 1)
                    break
                except Exception as error:
                    manifest['failures'].append({'path': entry['path'], 'attempt': attempt, 'errorType': type(error).__name__, 'message': str(error), 'timestamp': now()})
                    save()
                    if attempt == 3:
                        raise
                    time.sleep(attempt)
            target = destination / entry['name']
            partial = destination / (entry['name'] + '.part')
            with partial.open('xb') as stream:
                stream.write(data)
            actual_git_sha = hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()
            if len(data) != entry['size'] or actual_git_sha != entry['sha']:
                raise ValueError(f'Pinned size/Git blob mismatch for {entry["name"]}: bytes={len(data)}, gitBlobSha1={actual_git_sha}')
            partial.rename(target)
            manifest['files'].append({'path': entry['path'], 'localPath': entry['name'], 'sourceURL': url, 'bytes': len(data), 'gitBlobSha1': actual_git_sha, 'sha256': hashlib.sha256(data).hexdigest()})
            save()
            print(json.dumps({'downloadedFiles': len(manifest['files']), 'expectedFiles': EXPECTED_COUNT, 'path': entry['name'], 'bytes': len(data)}), flush=True)
        gltf = json.loads((destination / 'ABeautifulGame.gltf').read_bytes())
        references = [x['uri'] for x in gltf['buffers']] + [x['uri'] for x in gltf['images']]
        assert set(references) | {'ABeautifulGame.gltf'} == {x['name'] for x in entries}
        assert len(references) == len(set(references)) == 34
        manifest['referenceCheck'] = {'uniqueExternalReferences': len(references), 'allManifestFilesReferencedOrRootJSON': True}
        manifest['status'] = 'complete'
        manifest['downloadedBytes'] = sum(x['bytes'] for x in manifest['files'])
        assert manifest['downloadedBytes'] == EXPECTED_BYTES
    except Exception as error:
        manifest['status'] = 'failed'
        manifest['failures'].append({'stage': 'fetch-or-integrity-check', 'errorType': type(error).__name__, 'message': str(error), 'timestamp': now()})
        raise
    finally:
        manifest['finishedAt'] = now()
        save()
    print(json.dumps({'status': manifest['status'], 'files': len(manifest['files']), 'bytes': manifest['downloadedBytes'], 'failedAttempts': len(manifest['failures'])}), flush=True)

if __name__ == '__main__':
    main()
