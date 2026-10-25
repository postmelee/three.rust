"""Independent audit of the archived Editor callback screen.

Run next to archive-index only after capture/archival ends; keep offline analysis
separate from active browser measurements. Python 3.10+ standard library; no browser, JS
analyzer imports, live engine or network. --write-audit creates a derived audit;
without it an existing audit.json is checked when present. Failed captures stay
inspectable and are counted separately from successful measurements.
"""
from pathlib import Path
from collections import defaultdict
import gzip
import hashlib
import json
import math
import sys

ROOT = Path(__file__).resolve().parent
EXPECTED_COLUMNS = ['kind', 'rafTimestampMs', 'startMs', 'endMs',
                    'mixerTimeSeconds', 'actionTimeSeconds', 'clipDurationSeconds']
PINS = {'candidate': '6990fd92f61a031c8c2ba7a8282cfb63684e6dfb',
        'editor': '9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8',
        'viewer': 'b5ee5dafe27f953ae1b55f42b5fa3697fef08683'}


def sha(value):
    return hashlib.sha256(value).hexdigest()


def located(relative):
    p = ROOT / relative
    if not p.exists():
        p = Path(str(p) + '.gz')
    return p


def payload(relative):
    p = located(relative)
    value = p.read_bytes()
    return gzip.decompress(value) if p.suffix == '.gz' else value


def read(relative):
    return json.loads(payload(relative))


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def re_full_sha(value):
    return isinstance(value, str) and len(value) == 40 and all(c in '0123456789abcdef' for c in value)


def close(actual, expected, label='number'):
    assert finite(actual) and finite(expected), label
    assert abs(actual - expected) <= 1e-9 + 1e-12 * abs(expected), (label, actual, expected)


def comparable(actual, expected, label='value'):
    if isinstance(actual, bool) or isinstance(expected, bool):
        assert type(actual) is type(expected) and actual == expected, label
    elif finite(actual) and finite(expected):
        close(actual, expected, label)
    elif isinstance(actual, dict) and isinstance(expected, dict):
        assert actual.keys() == expected.keys(), (label, actual.keys(), expected.keys())
        for key in actual:
            comparable(actual[key], expected[key], label + '.' + key)
    elif isinstance(actual, list) and isinstance(expected, list):
        assert len(actual) == len(expected), label
        for i, (a, b) in enumerate(zip(actual, expected)):
            comparable(a, b, f'{label}[{i}]')
    else:
        assert type(actual) is type(expected) and actual == expected, label


def percentile(values, p):
    assert values and all(finite(v) for v in values)
    a = sorted(values)
    position = (len(a) - 1) * p
    low, high = math.floor(position), math.ceil(position)
    return a[low] + (position - low) * (a[high] - a[low])


def stats(values):
    return {**{q: percentile(values, p) for q, p in [('p50', .5), ('p95', .95), ('p99', .99)]},
            'mean': sum(values) / len(values), 'min': min(values), 'max': max(values)}


def backend(engine, state):
    diagnostics = state['diagnostics']
    if engine == 'original':
        assert diagnostics is None
    else:
        assert diagnostics['backend'] == engine
        assert diagnostics['wasmActive'] == (engine == 'prepared-wasm')


def environment(state, scenario, engine):
    assert state['crossOriginIsolated'] and state['visibility'] == 'visible' and state['focused']
    assert state['dpr'] == 1 and state['rendererPixelRatio'] == scenario['pixelRatio']
    assert state['autosave'] and state['savingStarted'] == state['savingFinished']
    backend(engine, state)
    if not scenario.get('idle'):
        action = state['action']
        assert action['name'] == 'Walking' and action['running'] and not action['paused']
        assert action['enabled'] and action['mixerTimeScale'] == 1
        assert state['selected'] == 'RobotExpressive.glb'


def overlay_provenance(directory, manifest, instrumented):
    adaptation = read(directory + '/adaptation.json')
    entry = adaptation['editor']
    original = payload(directory + '/editor-index.original.html')
    served = payload(directory + '/editor-index.served.html')
    assert sha(original) == entry['originalSha256']
    assert sha(served) == entry['servedSha256']
    assert sha(original) == '1e186dca4fd7f15d3fea1f137406e250786b5fcd2451cf8677c65a77946aad36'
    text = original.decode()
    for edit in entry['edits']:
        assert text.count(edit['from']) == 1
        text = text.replace(edit['from'], edit['to'])
    assert text.encode() == served
    assert adaptation['appSources']['editor'] == PINS['editor']
    if adaptation['candidate'] is not None:
        assert adaptation['candidate']['sha'] == PINS['candidate']
        assert not adaptation['candidate']['dirty']
    overlays = read(directory + '/source-overlays.json')
    assert len(overlays) == (2 if instrumented else 0)
    for overlay in overlays:
        prefix = directory + '/' + overlay['archivePrefix']
        before, after = payload(prefix + '.original.txt'), payload(prefix + '.served.txt')
        assert sha(before) == overlay['originalSha256'] == manifest['timingSources'][overlay['file']]
        assert sha(after) == overlay['servedSha256']
        text = before.decode()
        for edit in overlay['edits']:
            assert text.count(edit['from']) == 1
            text = text.replace(edit['from'], edit['to'])
        assert text.encode() == after
        # Check that the published full-file patch contains precisely the same
        # before/after source, not an incomplete descriptive diff.
        old = before.decode().removesuffix('\n').split('\n')
        new = after.decode().removesuffix('\n').split('\n')
        patch = '\n'.join(['--- a/' + overlay['file'], '+++ b/' + overlay['file'],
                           f'@@ -1,{len(old)} +1,{len(new)} @@',
                           *('-' + line for line in old), *('+' + line for line in new), ''])
        assert payload(prefix + '.patch').decode() == patch
    integrity = read(directory + '/integrity.json')
    assert integrity['unchanged'] and integrity['error'] is None
    assert read(directory + '/errors.json') == []
    assert not any(row.get('blocked') for row in read(directory + '/network.json'))
    return len(overlays)


def check_oracle(actual, reference, actual_directory, reference_directory, time):
    for key in ['pixelSha256', 'width', 'height', 'selected', 'objects', 'passes',
                'history', 'quality', 'timeline']:
        assert actual[key] == reference[key], key
    assert actual['nonzero'] > 0
    a, b = actual['numeric'], reference['numeric']
    assert len(a) == len(b) and all(finite(x) for x in a + b)
    maximum = max(abs(x - y) for x, y in zip(a, b))
    assert all(abs(x - y) <= 1e-10 + 1e-12 * abs(y) for x, y in zip(a, b))
    assert payload(f'{actual_directory}/pose-{time}.png') == payload(f'{reference_directory}/pose-{time}.png')
    return {'maxAbsoluteError': maximum, 'pixelSha256': actual['pixelSha256'], 'numericValues': len(a)}


def phase_consistency(pairs, duration):
    assert len(pairs) >= 2 and finite(duration) and duration > 0
    magnitude = max(1, duration, *(abs(p[k]) for p in pairs for k in ['mixerTime', 'timelineMixerTime']))
    tolerance = max(1e-9, 128 * sys.float_info.epsilon * magnitude)
    assert tolerance < duration / 4
    circular = lambda a, b: min(abs(a - b), duration - abs(a - b))
    first = pairs[0]
    changed = wraps = repeated = 0
    maximum = 0
    for i, current in enumerate(pairs):
        assert all(finite(current[k]) for k in ['raf', 'mixerTime', 'timelineMixerTime', 'actionTime'])
        assert current['clipDuration'] == duration and 0 <= current['actionTime'] < duration
        anchored = (first['actionTime'] + current['timelineMixerTime'] - first['timelineMixerTime']) % duration
        error = circular(current['actionTime'], anchored)
        maximum = max(maximum, error)
        assert error <= tolerance, ('anchored phase', i)
        if i:
            previous = pairs[i - 1]
            assert current['raf'] > previous['raf'] and current['mixerTime'] > previous['mixerTime']
            assert current['timelineMixerTime'] >= previous['timelineMixerTime']
            repeated += current['timelineMixerTime'] == previous['timelineMixerTime']
            predicted = (previous['actionTime'] + current['timelineMixerTime'] - previous['timelineMixerTime']) % duration
            error = circular(current['actionTime'], predicted)
            maximum = max(maximum, error)
            assert error <= tolerance, ('incremental phase', i)
            changed += circular(current['actionTime'], previous['actionTime']) > tolerance
            wraps += current['actionTime'] < previous['actionTime'] - tolerance
    last = pairs[-1]
    assert last['timelineMixerTime'] > first['timelineMixerTime'] and changed > 0
    return {'checkedPairs': len(pairs), 'checkedTransitions': len(pairs) - 1,
            'durationSeconds': duration, 'toleranceSeconds': tolerance,
            'maxPhaseErrorSeconds': maximum,
            'viewportAdvanceSeconds': last['mixerTime'] - first['mixerTime'],
            'timelineAdvanceSeconds': last['timelineMixerTime'] - first['timelineMixerTime'],
            'observedPhaseChanges': changed, 'observedWraps': wraps,
            'repeatedTimelineObservations': repeated,
            'scope': 'Observed native callback phase consistency for unit-speed repeating playback; does not establish pose, render or whole-frame correctness.'}


def reconstruct(raw, scenario, setup, recorded, measured_file, mode):
    assert raw['failure'] is None and raw['columns'] == EXPECTED_COLUMNS
    assert len(raw['rows']) % 7 == 0 and len(raw['armingRows']) % 7 == 0
    arming = [raw['armingRows'][i:i + 7] for i in range(0, len(raw['armingRows']), 7)]
    assert 1 <= len(arming) <= 2 and len({r[0] for r in arming}) == len(arming)
    assert len({r[1] for r in arming}) == 1
    assert all(r[0] in [0, 1] and all(finite(x) for x in r[1:5]) and r[3] >= r[2] for r in arming)
    for row in arming:
        if row[0] == 1 and not scenario.get('idle'):
            assert finite(row[5]) and finite(row[6]) and row[6] > 0
        else:
            assert row[5] is None and row[6] is None
    if len(arming) == 2:
        assert arming[0][3] <= arming[1][2] or arming[1][3] <= arming[0][2]
    grouped = defaultdict(list)
    previous_timestamp = arming[0][1]
    for i in range(0, len(raw['rows']), 7):
        row = raw['rows'][i:i + 7]
        kind, raf, start, end, mixer, action, duration = row
        assert kind in [0, 1] and all(finite(x) for x in [raf, start, end, mixer]) and end >= start
        assert raf > arming[0][1] and raf >= previous_timestamp
        previous_timestamp = raf
        if kind == 1 and not scenario.get('idle'):
            assert finite(action) and finite(duration) and duration > 0
        else:
            assert action is None and duration is None
        grouped[raf].append(row)
    pairs = []
    for raf, group in sorted(grouped.items()):
        assert len(group) == 2 and sorted(r[0] for r in group) == [0, 1]
        viewport, timeline = sorted(group)
        assert viewport[3] <= timeline[2] or timeline[3] <= viewport[2]
        pairs.append({'raf': raf, 'start': min(viewport[2], timeline[2]),
                      'cpu': viewport[3] - viewport[2] + timeline[3] - timeline[2],
                      'viewportCpu': viewport[3] - viewport[2],
                      'timelineCpu': timeline[3] - timeline[2],
                      'mixerTime': viewport[4], 'timelineMixerTime': timeline[4],
                      'actionTime': timeline[5], 'clipDuration': timeline[6]})
    assert len(pairs) == raw['pairs'] == raw['warmup'] + raw['samples']
    assert len(raw['rows']) == len(pairs) * 2 * 7
    measured = pairs[raw['warmup']:]
    comparable(measured, measured_file, 'measured-pairs reconstructed from callback rows')
    clock = setup['clock']['minPositiveDeltaMs']
    assert setup['clock']['crossOriginIsolated'] and finite(clock) and clock > 0
    cpu = stats([p['cpu'] for p in measured])
    block_size = (max(1, raw['samples'] // 4) if scenario.get('idle') or mode != 'full' else 300)
    blocks = []
    for start in range(0, len(measured), block_size):
        values = [p['cpu'] for p in measured[start:start + block_size]]
        s = stats(values)
        blocks.append({'start': start, 'samples': len(values), **s,
                       'stable': abs(s['p50'] - cpu['p50']) <= max(.05 * cpu['p50'], 4 * clock)})
    first, last = measured[0], measured[-1]
    result = {
        'samples': len(measured), 'cpu': cpu,
        'playbackValidation': None if scenario.get('idle') else phase_consistency(measured, raw['before']['action']['duration']),
        'viewportCpu': stats([p['viewportCpu'] for p in measured]),
        'timelineCpu': stats([p['timelineCpu'] for p in measured]),
        'rafIntervals': stats([b['raf'] - a['raf'] for a, b in zip(measured, measured[1:])]),
        'callbackStartIntervals': stats([b['start'] - a['start'] for a, b in zip(measured, measured[1:])]),
        'arrivalDelay': stats([p['start'] - p['raf'] for p in measured]),
        'blocks': blocks, 'blockStable': all(b['stable'] for b in blocks),
        'observedClockIncrement': clock,
        'phaseCoverage': {'nativeWallClock': True, 'frameMatchedAcrossRoutes': False,
                          'mixerTimeStart': first['mixerTime'], 'mixerTimeEnd': last['mixerTime'],
                          'actionTimeStart': first['actionTime'], 'actionTimeEnd': last['actionTime'],
                          'clipDuration': first['clipDuration'],
                          'elapsedClipCycles': None if scenario.get('idle') else (last['mixerTime'] - first['mixerTime']) / first['clipDuration']}
    }
    for key in result:
        comparable(result[key], recorded[key], key)
    return result, len(pairs), len(arming)


def aggregate(manifest, results):
    mode = manifest['configuration']['mode']
    derived = {'qualification': False, 'mode': mode, 'scope': manifest['configuration']['scope'], 'scenarios': []}
    failures = []
    for scenario in manifest['cases'] + [manifest['idleCase']]:
        runs = [r for r in results if r['scenario'] == scenario['id']]
        balanced = [r for r in runs if r['purpose'] == 'balanced']
        originals = [r for r in runs if r['engine'] == 'original']
        midpoint = percentile([r['result']['cpu']['p50'] for r in originals], .5)
        increment = max(r['result']['observedClockIncrement'] for r in originals)
        tolerance = max(.05 * midpoint, 4 * increment)
        checks = []
        for r in originals:
            result = r['result']
            checks.append({'purpose': r['purpose'], 'directory': r['directory'], 'cpu': result['cpu'],
                           'withinTolerance': abs(result['cpu']['p50'] - midpoint) <= tolerance,
                           'blocksWithinSceneTolerance': all(abs(b['p50'] - result['cpu']['p50']) <= tolerance for b in result['blocks']),
                           'sceneToleranceMs': tolerance, 'ownRunBlockStable': result['blockStable']})
        engines = {}
        for engine in ['original', 'prepared-js', 'prepared-wasm']:
            selected = [r for r in balanced if r['engine'] == engine]
            medians = lambda metric: {q: percentile([r['result'][metric][q] for r in selected], .5) for q in ['p50', 'p95', 'p99']}
            engines[engine] = {'independentRuns': len(selected), 'medianRunCpu': medians('cpu'),
                               'medianRunRafIntervals': medians('rafIntervals'),
                               'medianRunCallbackStartIntervals': medians('callbackStartIntervals'),
                               'p50Range': [min(r['result']['cpu']['p50'] for r in selected), max(r['result']['cpu']['p50'] for r in selected)],
                               'ownRunBlockStable': all(r['result']['blockStable'] for r in selected)}

        def delta(actual, reference):
            return {q: {'absoluteMs': actual[q] - reference[q],
                        'relativeChangePercent': (100 * (actual[q] - reference[q]) / reference[q]
                                                  if not scenario.get('idle') and reference[q] > 4 * increment else None)}
                    for q in ['p50', 'p95', 'p99']}

        o, j, w = (engines[e]['medianRunCpu'] for e in ['original', 'prepared-js', 'prepared-wasm'])
        passed = mode == 'full' and all(c['withinTolerance'] and c['blocksWithinSceneTolerance'] for c in checks)
        derived['scenarios'].append({
            'scenario': scenario['id'], 'auxiliary': bool(scenario.get('idle')), 'engines': engines,
            'jsVersusOriginal': delta(j, o), 'wasmVersusOriginal': delta(w, o), 'wasmVersusMatchedJS': delta(w, j),
            'aa': {'allOriginalMedian': midpoint, 'includesBookendsInTolerance': True, 'toleranceMs': tolerance,
                   'originals': [c for c in checks if c['purpose'] == 'balanced'],
                   'bookends': [c for c in checks if c['purpose'] != 'balanced'], 'passes': passed},
            'interpretation': 'Observed callback costs only. A/A or block failures preclude a stable speedup claim. Native phase coverage and intervals remain per-run; no FPS claim.'
        })
        failures.append({'scenario': scenario['id'], 'originalRuns': len(originals),
                         'failedOriginalRuns': sum(not c['withinTolerance'] for c in checks),
                         'originalBlocks': sum(len(r['result']['blocks']) for r in originals),
                         'failedOriginalBlocks': sum(abs(b['p50'] - r['result']['cpu']['p50']) > tolerance for r in originals for b in r['result']['blocks']),
                         'allRouteBlocks': sum(len(r['result']['blocks']) for r in runs),
                         'failedOwnRunBlocks': sum(not b['stable'] for r in runs for b in r['result']['blocks']),
                         'aaPass': passed})
    return derived, failures


def main():
    index = read('archive-index.json')
    for entry in index['files']:
        p = ROOT / entry['path']
        stored = p.read_bytes()
        decoded = gzip.decompress(stored) if entry['gzip'] else stored
        assert sha(stored) == entry['sha256'] and len(stored) == entry['storedBytes'], str(p)
        assert sha(decoded) == entry['decodedSha256'] and len(decoded) == entry['decodedBytes'], str(p)
        if not entry['normalizations']:
            assert entry['sourceDecodedSha256'] == entry['decodedSha256']
        if '.json' in p.suffixes:
            json.loads(decoded)
        if p.suffix == '.png':
            assert entry['sourceSha256'] == entry['sha256']
    audit = {'status': 'verified', 'qualification': False, 'payloads': len(index['files']), 'suites': []}
    for suite in index['sourceSuites']:
        label = suite['label']
        manifest = read(label + '/manifest.json')
        mode = manifest['configuration']['mode']
        complete = manifest['status'] in ['screen-complete-unqualified', 'smoke-complete-not-performance-evidence']
        result = {'suite': label, 'captureStatus': manifest['status'], 'toolingSha': manifest.get('tooling', {}).get('sha'),
                  'complete': complete, 'passedOraclePages': 0, 'nonPassedOraclePages': [],
                  'fixedPoses': 0, 'originalComparisonsIncludingSelf': 0, 'overlayComparisons': 0,
                  'originalNumericValuesComparedIncludingSelf': 0,
                  'overlayNumericValuesCompared': 0, 'maxAbsoluteOracleError': 0,
                  'capturedRuns': 0, 'failedRuns': 0, 'measuredPairs': 0, 'allPairsIncludingWarmup': 0,
                  'retainedArmingRows': 0, 'failedRawRecords': [], 'runAudits': [], 'captureErrors': manifest.get('errors', [])}
        assert manifest['candidateSha'] == PINS['candidate']
        if complete:
            assert manifest['errors'] == [] and manifest['sourceIntegrity']['unchanged']
            assert manifest['sourceBefore'] == manifest['sourceAfter']
            assert manifest['tooling']['sha'] == manifest['sourceBefore']['tooling']['sha']
            assert re_full_sha(manifest['tooling']['sha'])
            assert not manifest['sourceBefore']['candidate']['dirty']
            assert manifest['sourceBefore']['candidate']['sha'] == PINS['candidate']
            for name in ['editor', 'viewer']:
                assert manifest['sourceBefore']['apps'][name] == {'sha': PINS[name], 'dirty': False}
            if mode == 'full':
                assert not manifest['sourceBefore']['tooling']['dirty']
                assert manifest['powerVerifiedACBeforeAndAfter']
                assert manifest['environmentBefore']['power']['verifiedAC'] and manifest['environmentAfter']['power']['verifiedAC']
                assert manifest['configuration']['rounds'] == 4 and manifest['configuration']['warmup'] == 600 and manifest['configuration']['samples'] == 1200
                assert manifest['configuration']['idleWarmup'] == 120 and manifest['configuration']['idleSamples'] == 240
                assert manifest['plannedContinuousRuns'] == 54 and manifest['plannedIdleRuns'] == 16
            else:
                assert manifest['configuration']['rounds'] == 1 and manifest['configuration']['warmup'] == 10 and manifest['configuration']['samples'] == 30
                assert manifest['configuration']['idleWarmup'] == 10 and manifest['configuration']['idleSamples'] == 30
                assert manifest['plannedContinuousRuns'] == 18 and manifest['plannedIdleRuns'] == 4
            assert manifest['configuration']['cssViewport'] == {'width': 1280, 'height': 720}
            assert manifest['configuration']['pageDpr'] == 1
            assert manifest['configuration']['timelinePanelHeight'] == 307 and manifest['configuration']['timelineContentHeight'] == 306
            assert manifest['configuration']['qualification'] is False
            assert not any(manifest['configuration'][k] for k in ['profiling', 'gpuQueries', 'stageTimers'])
            assert manifest['configuration']['isolated'] and manifest['asset']['sha256'] == '047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319'
            assert manifest['cases'] == [
                {'id': 'E3-root-selected-shadow', 'selected': True, 'shadow': True, 'pixelRatio': 1},
                {'id': 'E3-root-selected-no-shadow', 'selected': True, 'shadow': False, 'pixelRatio': 1},
                {'id': 'E3-root-selected-high-resolution', 'selected': True, 'shadow': True, 'pixelRatio': 2}
            ]
            assert manifest['idleCase'] == {'id': 'E1-idle', 'idle': True, 'selected': False, 'shadow': True, 'pixelRatio': 1}
            route_labels = ['original-A', 'prepared-JS', 'prepared-Wasm', 'original-B']
            expected_orders = [[route_labels[(value + r) % 4] for value in [0, 1, 3, 2]]
                               for r in range(manifest['configuration']['rounds'])]
            assert manifest['orders'] == expected_orders
            expected_schedule = []
            for case in manifest['cases']:
                expected_schedule.append((case['id'], 'original-pre', None, 'bookend-before'))
                for round_number, order in enumerate(expected_orders):
                    expected_schedule.extend((case['id'], label, round_number, 'balanced') for label in order)
                expected_schedule.append((case['id'], 'original-post', None, 'bookend-after'))
            for round_number, order in enumerate(expected_orders):
                expected_schedule.extend(('E1-idle', label, round_number, 'balanced') for label in order)
            assert [(r['scenario'], r['label'], r['round'], r['purpose']) for r in manifest['runs']] == expected_schedule
        originals, unmodified = {}, {}
        scenarios = {s['id']: s for s in manifest['cases'] + [manifest['idleCase']]}
        for entry in manifest['oracles']:
            if entry['status'] != 'passed':
                result['nonPassedOraclePages'].append({'directory': entry['directory'], 'status': entry['status'], 'error': entry.get('error')})
                continue
            directory = label + '/' + entry['directory']
            scenario = scenarios[entry['scenario']]
            overlay_provenance(directory, manifest, entry['instrumented'])
            setup = read(directory + '/setup.json')
            assert 'ANGLE Metal Renderer: Apple M4 Pro' in setup['hardware']['renderer']
            environment(setup['environment'], scenario, entry['engine'])
            times = ['0'] if scenario.get('idle') else ['0.25', '0.75']
            captures = [read(f'{directory}/pose-{time}.json') for time in times]
            key = entry['scenario']
            if entry['engine'] == 'original' and not entry['instrumented']:
                originals[key] = (directory, captures)
            reference_directory, reference = originals[key]
            checks = [check_oracle(a, b, directory, reference_directory, time)
                      for a, b, time in zip(captures, reference, times)]
            comparable(checks, entry['originalComparisons'])
            result['originalComparisonsIncludingSelf'] += len(checks)
            result['originalNumericValuesComparedIncludingSelf'] += sum(c['numericValues'] for c in checks)
            result['maxAbsoluteOracleError'] = max(result['maxAbsoluteOracleError'], *(c['maxAbsoluteError'] for c in checks))
            if entry['instrumented']:
                prior_directory, prior = unmodified[(key, entry['engine'])]
                checks = [check_oracle(a, b, directory, prior_directory, time)
                          for a, b, time in zip(captures, prior, times)]
                comparable(checks, entry['overlayComparisons'])
                result['overlayComparisons'] += len(checks)
                result['overlayNumericValuesCompared'] += sum(c['numericValues'] for c in checks)
                result['maxAbsoluteOracleError'] = max(result['maxAbsoluteOracleError'], *(c['maxAbsoluteError'] for c in checks))
            else:
                unmodified[(key, entry['engine'])] = (directory, captures)
            result['passedOraclePages'] += 1
            result['fixedPoses'] += len(captures)
        reconstructed = []
        for entry in manifest['runs']:
            directory = label + '/' + entry['directory']
            if entry['status'] != 'captured':
                result['failedRuns'] += 1
                raw_path = located(directory + '/raw-callbacks.json')
                raw = read(directory + '/raw-callbacks.json') if raw_path.exists() else None
                result['failedRawRecords'].append({'directory': entry['directory'], 'rawPresent': raw is not None,
                                                   'exportError': raw.get('exportError') if raw else None,
                                                   'rawValues': len(raw.get('rows', [])) if raw else None,
                                                   'armingValues': len(raw.get('armingRows', [])) if raw else None,
                                                   'failure': raw.get('failure') if raw else entry.get('error')})
                continue
            scenario = scenarios[entry['scenario']]
            overlay_provenance(directory, manifest, True)
            raw, setup = read(directory + '/raw-callbacks.json'), read(directory + '/setup.json')
            cfg = manifest['configuration']
            assert raw['warmup'] == cfg['idleWarmup' if scenario.get('idle') else 'warmup']
            assert raw['samples'] == cfg['idleSamples' if scenario.get('idle') else 'samples']
            run_environment = read(directory + '/environment.json')
            assert run_environment['toolingSha'] == manifest['tooling']['sha']
            assert entry['engine'] == {'original-A': 'original', 'original-B': 'original',
                                        'original-pre': 'original', 'original-post': 'original',
                                        'prepared-JS': 'prepared-js', 'prepared-Wasm': 'prepared-wasm'}[entry['label']]
            summary = read(directory + '/summary.json')
            comparable(summary, entry['result'], 'manifest/run summary agreement')
            assert 'ANGLE Metal Renderer: Apple M4 Pro' in setup['hardware']['renderer']
            for boundary in ['before', 'after']:
                environment(raw[boundary], scenario, entry['engine'])
            for key in ['width', 'height', 'cssWidth', 'cssHeight', 'rendererPixelRatio', 'quality']:
                assert raw['before'][key] == raw['after'][key]
            assert not [event for event in raw['activity'] if event['phase'] == 'sample']
            derived, pair_count, arming_count = reconstruct(raw, scenario, setup, summary,
                                                           read(directory + '/measured-pairs.json'), mode)
            frame_delta = raw['after']['renderInfo']['frame'] - raw['before']['renderInfo']['frame']
            assert frame_delta == summary['renderFrameDelta']
            if scenario.get('idle'):
                assert frame_delta == 0 and raw['after']['renderCount'] == raw['before']['renderCount']
            else:
                assert frame_delta >= raw['samples']
            before, after = raw['before']['diagnostics'], raw['after']['diagnostics']
            deltas = None if before is None else {k: after[k] - before[k] for k in ['wasmCalls', 'preparedPasses', 'preparedWasmCalls', 'preparedFallbacks', 'preparedMatrixReads', 'matrixReads']}
            assert deltas == summary['counterDeltas']
            materialized_bytes = None if before is None else after['materializedBytes'] - before['materializedBytes']
            assert materialized_bytes is None or (finite(materialized_bytes) and materialized_bytes >= 0)
            if deltas:
                assert all(finite(v) and v >= 0 for v in deltas.values())
            native = deltas is not None and (deltas['wasmCalls'] > 0 or deltas['preparedWasmCalls'] > 0)
            assert native == summary['nativeWorkInWindow']
            if not scenario.get('idle') and entry['engine'] == 'prepared-wasm':
                assert native
            assert summary['fallbackIsExpected'] == (not scenario.get('idle') and entry['engine'] != 'original')
            comparable(entry['wallCaptureMs'], raw['after']['at'] - raw['before']['at'])
            reconstructed.append({**entry, 'result': {**summary, **derived}})
            result['runAudits'].append({'directory': entry['directory'], 'scenario': entry['scenario'],
                                       'engine': entry['engine'], 'purpose': entry['purpose'],
                                       'measuredPairs': raw['samples'], 'allPairsIncludingWarmup': pair_count,
                                       'armingRows': arming_count, 'renderFrameDelta': frame_delta,
                                       'counterDeltas': deltas, 'materializedBytesDelta': materialized_bytes,
                                       **{k: derived[k] for k in ['cpu', 'viewportCpu', 'timelineCpu',
                                           'rafIntervals', 'callbackStartIntervals', 'arrivalDelay', 'playbackValidation']}})
            result['capturedRuns'] += 1
            result['measuredPairs'] += raw['samples']
            result['allPairsIncludingWarmup'] += pair_count
            result['retainedArmingRows'] += arming_count
        if complete:
            assert result['failedRuns'] == 0 and result['nonPassedOraclePages'] == []
            assert len(manifest['runs']) == manifest['plannedContinuousRuns'] + manifest['plannedIdleRuns']
            assert result['passedOraclePages'] == (len(manifest['cases']) + 1) * 3 * 2
            analysis, failures = aggregate(manifest, reconstructed)
            comparable(analysis, read(label + '/analysis.json'), 'recomputed complete analysis')
            result['aaAndBlockChecks'] = failures
            result['analysisRecomputed'] = True
        else:
            assert manifest['status'] == 'failed'
            result['analysisRecomputed'] = False
        audit['suites'].append(result)
    if '--write-audit' in sys.argv:
        (ROOT / 'audit.json').write_text(json.dumps(audit, indent=2) + '\n')
    elif (ROOT / 'audit.json').exists():
        comparable(audit, read('audit.json'), 'published audit')
    print(json.dumps(audit, indent=2))


if __name__ == '__main__':
    main()
