#!/usr/bin/env python3
"""Independent Python audit. Run only after browser-quiet release.

This does not import or execute the JavaScript count/weighted analyzers.
Counts, ancestry, source bytes, exact source-map segments, and historical
failure links are recomputed. AST-derived function labels remain the recorded
resolver's labels; their complete parser equivalence is not independently run.
"""
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib
import json
import math
import re
import statistics
import subprocess

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
CAPTURE = ROOT / 'work/task49-viewer-bistro-zip-engine-profile-full-001'
COUNTS = ROOT / 'work/task49-viewer-bistro-zip-engine-count-analysis-001'
WEIGHTED = ROOT / 'work/task49-viewer-bistro-zip-engine-profile-full-analysis-001'
EXPECTED_TOOL = 'b33cbb8d7cef1c92fdf475c9e12d830eb1ff7cd1'
EXPECTED_RUNTIME = '85e2c5d500edb0b92ea4ecb997087fded3fed45b'
ledger = {}
map_cache = {}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read(path):
    path = path.resolve()
    data = path.read_bytes()
    record = {'file': path.relative_to(ROOT).as_posix(), 'bytes': len(data), 'sha256': sha(data)}
    if path in ledger:
        assert ledger[path] == record, 'Input changed between reads: ' + record['file']
    ledger[path] = record
    return data


def load(path):
    return json.loads(read(path))


def js_json(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()


def within(root, relative):
    path = (root / relative).resolve()
    assert path.is_relative_to(root.resolve()) and path != root.resolve()
    return path


def captured(run, record):
    assert re.fullmatch(r'(?:sources|debug-sources)/[a-f0-9]{64}\.bin', record['file'])
    assert Path(record['file']).stem == record['sha256']
    data = read(within(run, record['file']))
    assert len(data) == record['bytes'] and sha(data) == record['sha256']
    return data


def work_category(label, file):
    text = label + ' ' + file
    rules = [
        (r'expandByObject|setFromObject|getVertexPosition|applyBoneTransform|intersectObject|checkGeometryIntersection|raycast', 'bounds/picking/skinned-public-read'),
        (r'AnimationMixer|AnimationAction|PropertyMixer|PropertyBinding|Interpolant|interpolate_|slerpFlat', 'animation/binding'),
        (r'Skeleton', 'skeleton/palette'),
        (r'projectObject|Frustum|painterSort|reversePainterSort|WebGLRenderList', 'visibility/sort'),
        (r'WebGLShadowMap', 'shadow pass'),
        (r'uniform|Uniform|WebGLAttributes|WebGLTextures|bufferSubData|texSubImage|texImage|renderBufferDirect|renderObject', 'render preparation/submission'),
        (r'updateMatrixWorld|updateWorldMatrix|Matrix4|Matrix3|Vector3|Quaternion', 'transform/math'),
        (r'render|WebGLRenderer', 'render residual'),
        (r'dispatch|Signal|GUI|Stats|Animation\.js|Sidebar|Menubar|Outliner|ui\.js', 'UI/callback'),
    ]
    return next((name for pattern, name in rules if re.search(pattern, text)), None)


def category(node):
    frame = node['callFrame']; label = node['label']; file = (node.get('source') or {}).get('file', '')
    special = {'(idle)': 'idle', '(garbage collector)': 'GC', '(program)': 'program/native-unresolved', '(root)': 'root'}
    if frame['functionName'] in special:
        return special[frame['functionName']]
    if node.get('wasm') or frame['url'].startswith('wasm:'):
        return 'Wasm verified function' if (node.get('wasm') or {}).get('resolved') else 'Wasm unresolved'
    if node['sourceStatus'] != 'verified-js' and (re.search(r'UtilityScript|injectedScript|__pw|__rthree', label + ' ' + frame['url']) or re.fullmatch(r'observe|evaluate', label)):
        return 'automation/observation'
    if re.search(r'(?:^|/)(?:candidate-profile-session|timing-overlay)\.mjs$', file) and re.search(r'profileSnapshot|warmNativeFrames|installProfileObserver|installTimingCollector', label):
        return 'automation/observation'
    if node['sourceStatus'] != 'verified-js':
        return 'source unresolved'
    if re.search(r'(?:facade|prepared)-kernel\.js$', file):
        return 'matched-JS kernel'
    if file.endswith('facade-state.js'):
        for pattern, result in [
            (r'(?:^|\.)(?:materialize|readFacadeElements|trackedMatrix)(?:\.|$)', 'facade matrix materialization/proxy'),
            (r'(?:^|\.)(?:scalar|trackFacadeObject)(?:\.|$)', 'facade scalar/input/flag tracking'),
            (r'markInput|markMeta|upload|facadeUpdate|updateSingle|syncInputs|updatePlan|refreshPassInputs|ensurePlan|objectMeta', 'facade operation preparation'),
            (r'(?:^|\.)call$', 'facade ABI dispatch')]:
            if re.search(pattern, label):
                return result
        return 'facade other'
    if file.endswith('runtime.js') and re.search(r'matrixElements|preparedUploadElements', label):
        return 'facade matrix materialization/proxy'
    if file.endswith('runtime.js') and re.search(r'facadeLocal|facadeSelective', label):
        return 'facade ABI dispatch'
    return work_category(label, file) or 'verified JS other'


def decode_map(mapping):
    alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    previous_source = previous_line = previous_column = previous_name = 0
    output = defaultdict(list)
    for line_index, line in enumerate(mapping.split(';')):
        generated_column = 0
        for segment in line.split(',') if line else []:
            fields = []; value = shift = 0
            for char in segment:
                digit = alphabet.index(char); value += (digit & 31) << shift
                if digit & 32:
                    shift += 5
                else:
                    fields.append(-(value >> 1) if value & 1 else value >> 1); value = shift = 0
            assert shift == 0 and len(fields) in (1, 4, 5)
            generated_column += fields[0]
            if len(fields) == 1:
                output[(line_index, generated_column)].append(None)
                continue
            previous_source += fields[1]; previous_line += fields[2]; previous_column += fields[3]
            if len(fields) == 5:
                previous_name += fields[4]
            output[(line_index, generated_column)].append((previous_source, previous_line, previous_column))
    return output


def wasm_function_symbols(data):
    assert data[:8] == b'\0asm\1\0\0\0'
    def unsigned(at):
        n = shift = 0
        while True:
            byte = data[at]; at += 1; n += (byte & 127) << shift
            if not byte & 128:
                return n, at
            shift += 7; assert shift <= 63
    def string(at):
        length, at = unsigned(at)
        return data[at:at + length].decode(), at + length
    def limits(at):
        flags, at = unsigned(at); _, at = unsigned(at)
        if flags & 1:
            _, at = unsigned(at)
        return at
    imports = defined = 0; at = 8; names = {}; exports = defaultdict(list)
    while at < len(data):
        section = data[at]; length, at = unsigned(at + 1); end = at + length
        if section == 0:
            kind, at = string(at)
            if kind == 'name':
                while at < end:
                    subsection = data[at]; size, at = unsigned(at + 1); subend = at + size
                    if subsection == 1:
                        count, at = unsigned(at)
                        for _ in range(count):
                            index, at = unsigned(at); name, at = string(at)
                            assert index not in names; names[index] = name
                    at = subend
        elif section == 2:
            count, at = unsigned(at)
            for _ in range(count):
                _, at = string(at); _, at = string(at); kind = data[at]; at += 1
                if kind == 0:
                    imports += 1; _, at = unsigned(at)
                elif kind == 1:
                    at = limits(at + 1)
                elif kind == 2:
                    at = limits(at)
                elif kind == 3:
                    at += 2
                elif kind == 4:
                    _, at = unsigned(at); _, at = unsigned(at)
                else:
                    raise AssertionError('Unknown Wasm import kind')
        elif section == 3:
            defined, _ = unsigned(at)
        elif section == 7:
            count, at = unsigned(at)
            for _ in range(count):
                name, at = string(at); kind = data[at]; index, at = unsigned(at + 1)
                if kind == 0:
                    exports[index].append(name)
        at = end
    return {'count': imports + defined, 'names': names, 'exports': exports}


def source_audit(run, report, prepared, proof):
    sources = load(run / 'captured-sources.json'); scripts = load(run / 'profile-scripts.json')
    served = {x['file']: x['sha256'] for x in load(run / 'served-files.json')}
    network = {x['url']: x['sha256'] for x in load(run / 'network.json') if x.get('mirrored')}
    by_url = {}; source_data = {}; wasm_counts = {}
    for source in sources:
        assert source['url'] not in by_url
        expected = served.get(source['label']) if source['url'].startswith('<origin>/') else network.get(source['url'])
        assert expected == source['sha256']
        source_data[source['sha256']] = captured(run, source); by_url[source['url']] = source
        if source['label'].endswith('.wasm'):
            wasm_counts[source['sha256']] = wasm_function_symbols(source_data[source['sha256']])
    assert report['capturedSources'] == [{k: x[k] for k in ('url', 'label', 'sha256', 'bytes')} for x in sources]
    script_map = {}; base_status = {}
    for script in scripts:
        if script.get('cleanupError'):
            continue
        script_id = script['scriptId']; assert script_id not in script_map; script_map[script_id] = script
        if not script.get('file'):
            base_status[script_id] = 'unresolved-script-unavailable'
            continue
        data = captured(run, script)
        if script['kind'] == 'wasm':
            base_status[script_id] = 'verified-wasm' if script['sha256'] in wasm_counts else 'unresolved-wasm-not-served'
        else:
            original = by_url.get((script.get('parsed') or {}).get('url'))
            if not original:
                base_status[script_id] = 'unresolved-script-not-served'
            else:
                assert not original['label'].endswith('.html'), 'Inline-script audit not implemented for this fixture'
                assert original['sha256'] == sha(data)
                base_status[script_id] = 'verified-js'
    for row in report['sourceScriptCoverage']:
        if 'scriptId' in row:
            assert row['sourceStatus'] == base_status[row['scriptId']]
    adaptation = load(run / 'adaptation.json')
    assert adaptation['preparationManifestSha256'] == proof['sha256'] and adaptation['appBundleOutputs'] == prepared['outputs']
    prepared_inputs = {x['file']: x for x in prepared['buildInputs']}
    maps = {}; verified_points = 0
    for row in report['sourceMapCoverage']:
        if row['status'] != 'verified-map':
            continue
        script = script_map[row['scriptId']]; assert row['generatedSha256'] == script['sha256']
        map_hash = row['mapSha256']; raw_map = source_data[map_hash]
        if map_hash not in map_cache:
            smap = json.loads(raw_map); map_cache[map_hash] = (smap, decode_map(smap['mappings']))
        smap, decoded = map_cache[map_hash]; maps[row['scriptId']] = (row, smap, decoded)
        map_proof = next(x for x in prepared['sourceMaps'] if x['servedSha256'] == map_hash)
        assert sha(smap['mappings'].encode()) == map_proof['mappingsSha256']
        assert sha(js_json(smap['sourcesContent'])) == map_proof['sourcesContentSha256']
        assert sha(js_json({**smap, 'sources': []})) == map_proof['unchangedNonPathPayloadSha256']
        assert smap.get('sourceRoot', '') == ''
        for item in row['inputs']:
            if item['status'] == 'verified-source-map-input':
                content = smap['sourcesContent'][item['index']].encode(); file = smap['sources'][item['index']]
                assert file == item['file'] and sha(content) == item['sha256']
                assert prepared_inputs[file]['sha256'] == sha(content) and prepared_inputs[file]['bytes'] == len(content)
    for node in report['nodes']:
        frame = node['callFrame']; script_id = frame['scriptId']; status = base_status.get(script_id, 'unresolved-script-id')
        if node['sourceStatus'] == 'unresolved-wasm-function':
            assert status == 'verified-wasm' and not node['wasm']['resolved']
            symbols = wasm_counts[node['source']['sha256']]
            assert not any(frame['functionName'] == symbols['names'].get(i) or frame['functionName'] in symbols['exports'].get(i, []) for i in range(symbols['count']))
            continue
        assert node['sourceStatus'] == status
        if status == 'verified-js':
            source = node['source']; script = script_map[script_id]
            if source.get('mapping'):
                row, smap, decoded = maps[script_id]; mapping = source['mapping']
                assert mapping['method'] == 'exact-generated-segment-to-verified-input-AST'
                assert mapping['mapSha256'] == row['mapSha256'] and mapping['generatedSha256'] == script['sha256']
                line = frame['lineNumber'] - script['parsed'].get('startLine', 0)
                column = frame['columnNumber'] - (script['parsed'].get('startColumn', 0) if line == 0 else 0)
                assert (mapping['generatedLine'], mapping['generatedColumn']) == (line, column)
                candidates = decoded[(line, column)]; assert len(candidates) == 1 and candidates[0] is not None
                index, original_line, original_column = candidates[0]
                assert source['file'] == smap['sources'][index] and source['sha256'] == sha(smap['sourcesContent'][index].encode())
                assert (source['line'], source['column']) == (original_line, original_column)
                assert source['generated']['sha256'] == script['sha256']; verified_points += 1
            else:
                assert source['sha256'] == script['sha256'] and source['servedSha256'] == script['sha256']
                assert source['file'] == by_url[script['parsed']['url']]['label']
        elif status == 'verified-wasm':
            wasm = node['wasm']; digest = node['source']['sha256']
            symbols = wasm_counts[digest]; index = wasm['functionIndex']
            assert wasm['resolved'] and wasm['moduleSha256'] == digest and 0 <= index < symbols['count']
            match = re.fullmatch(r'wasm-function\[(\d+)\]', frame['functionName'])
            if match:
                assert int(match.group(1)) == index
            else:
                matches = [i for i in range(symbols['count']) if frame['functionName'] == symbols['names'].get(i) or frame['functionName'] in symbols['exports'].get(i, [])]
                assert matches == [index]
            assert wasm['name'] == symbols['names'].get(index) and wasm['exports'] == symbols['exports'].get(index, [])
    return {'capturedSources': len(sources), 'debuggerScripts': len(script_map), 'exactSourceMapNodePositions': verified_points,
            'scope': 'Independent served/network/debugger/content-addressed byte binding, Wasm function/name/export resolution, and exact VLQ source positions. Recorded AST function labels were not independently reparsed.'}


def plain(table):
    return {key: value['hits'] for key, value in table.items()}

