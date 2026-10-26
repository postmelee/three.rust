"""Independent numeric audit for Task49 Viewer timing.

Run only after all browser captures finish. Standard library, no live JS imports.
This module validates callback arithmetic and the prospective decision appendix.
It does not replace archive/source hashing, oracle, environment or license audits.
Usage: python3 analyze.py CAPTURE --expected-tool FULL_SHA --out FRESH_JSON
"""
from pathlib import Path
import argparse
import gzip
import json
import math
import sys

COLUMNS = ['kind', 'rafTimestampMs', 'startMs', 'endMs', 'mixerTimeSeconds',
           'actionTimeSeconds', 'clipDurationSeconds', 'mainFrame', 'axesFrame']
ROUTES = {
    'engine': [('pure-r186-A', 'pure-r186'), ('prepared-JS', 'prepared-js-r186'),
               ('prepared-Wasm', 'prepared-wasm-r186'), ('pure-r186-B', 'pure-r186')],
    'migration': [('original-r176-A', 'original-r176'), ('external-r176', 'external-r176'),
                  ('pure-r186', 'pure-r186'), ('original-r176-B', 'original-r176')],
}
CASES = {'engine': ['robot-static', 'robot-walking', 'robot-high-resolution', 'robot-walking-grid-off'],
         'migration': ['robot-static', 'robot-walking-grid-off']}
SETTINGS = {'full': {'rounds': 4, 'warmup': 600, 'samples': 1200, 'blockSize': 300},
            'smoke': {'rounds': 1, 'warmup': 10, 'samples': 30, 'blockSize': 10}}
CANDIDATE = '85e2c5d500edb0b92ea4ecb997087fded3fed45b'
VIEWER = 'b5ee5dafe27f953ae1b55f42b5fa3697fef08683'
QUANTILES = ('p50', 'p95', 'p99')
COUNTERS = ['wasmCalls', 'preparedPasses', 'preparedWasmCalls', 'preparedFallbacks',
            'matrixReads', 'preparedMatrixReads', 'materializedBytes']
EPSILON = 2.220446049250313e-16


def finite(value):
    return isinstance(value, (float, int)) and not isinstance(value, bool) and math.isfinite(value)


def integer(value):
    return finite(value) and int(value) == value and abs(value) <= 9007199254740991


def quantile(values, q):
    assert values and all(finite(value) for value in values)
    values = sorted(values)
    at = (len(values) - 1) * q
    lo, hi = math.floor(at), math.ceil(at)
    return values[lo] + (at - lo) * (values[hi] - values[lo])


def stats(values):
    return {**{key: quantile(values, q) for key, q in [('p50', .5), ('p95', .95), ('p99', .99)]},
            'mean': sum(values) / len(values), 'min': min(values), 'max': max(values)}


def same(actual, expected, label='value'):
    if finite(actual) and finite(expected):
        assert abs(actual - expected) <= 1e-9 + 1e-12 * abs(expected), (label, actual, expected)
    elif isinstance(actual, dict) and isinstance(expected, dict):
        assert actual.keys() == expected.keys(), (label, actual.keys(), expected.keys())
        for key in actual:
            same(actual[key], expected[key], label + '.' + key)
    elif isinstance(actual, list) and isinstance(expected, list):
        assert len(actual) == len(expected), label
        for i, (a, b) in enumerate(zip(actual, expected)):
            same(a, b, f'{label}[{i}]')
    else:
        assert type(actual) is type(expected) and actual == expected, (label, actual, expected)


def read(root, relative):
    path = Path(relative)
    assert not path.is_absolute() and '..' not in path.parts
    target = root / path
    if not target.exists():
        target = Path(str(target) + '.gz')
    data = target.read_bytes()
    return json.loads(gzip.decompress(data) if target.suffix == '.gz' else data)


def row_groups(values, scenario, count, arming=False):
    assert len(values) % 9 == 0
    groups, seen_raf = [], set()
    for offset in range(0, len(values), 9):
        kind, raf, start, end, mixer, action, duration, main, axes = values[offset:offset + 9]
        assert integer(kind) and 0 <= kind < count
        assert all(finite(x) for x in [raf, start, end]) and end >= start
        if kind:
            assert all(x is None for x in [mixer, action, duration, main, axes])
        else:
            assert integer(main) and integer(axes)
            assert mixer is None or finite(mixer)
            if scenario['playback'] == 'static':
                assert action is None and duration is None
            else:
                assert finite(mixer) and finite(action) and finite(duration) and duration > 0
                assert 0 <= action < duration
        row = dict(kind=kind, raf=raf, start=start, end=end, mixer=mixer, action=action,
                   duration=duration, mainFrame=main, axesFrame=axes)
        if not groups or groups[-1][0]['raf'] != raf:
            assert raf not in seen_raf, 'Noncontiguous timestamp group'
            if groups:
                assert raf > groups[-1][0]['raf'], 'Nonmonotonic raw timestamps'
            seen_raf.add(raf)
            groups.append([])
        groups[-1].append(row)
    if arming:
        assert len(groups) == 1, 'Retain exactly the first observed timestamp separately'
    result = []
    for rows in groups:
        assert 0 < len(rows) <= count
        assert len({row['kind'] for row in rows}) == len(rows), 'Duplicate callback'
        if not arming:
            assert len(rows) == count, 'Missing callback'
        ordered = sorted(rows, key=lambda row: row['start'])
        for a, b in zip(ordered, ordered[1:]):
            assert a['end'] <= b['start'], 'Overlapping callback intervals'
        if arming:
            continue
        animate = next(row for row in rows if row['kind'] == 0)
        cpu = sum(row['end'] - row['start'] for row in ordered)
        animate_cpu = animate['end'] - animate['start']
        result.append(dict(raf=animate['raf'], start=ordered[0]['start'], cpu=cpu,
                           animateCpu=animate_cpu, guiCpu=cpu - animate_cpu,
                           **{key: animate[key] for key in ['mixer', 'action', 'duration', 'mainFrame', 'axesFrame']}))
    return groups if arming else result


def environment(snapshot, scenario, engine):
    assert snapshot['visibility'] == 'visible' and snapshot['focused'] is True
    assert snapshot['crossOriginIsolated'] is True and snapshot['dpr'] == 1
    assert snapshot['revision'] == ('176' if engine.endswith('r176') else '186')
    state = snapshot['state']
    assert state['grid'] == scenario['grid'] and state['autoRotate'] is False
    assert snapshot['controls']['autoRotate'] is False and state['playbackSpeed'] == 1
    assert snapshot['guiLoops'] == scenario['guiLoops']
    for name, renderer in snapshot['renderers'].items():
        assert renderer['pixelRatio'] == scenario['pixelRatio']
        if name == 'main' or scenario['grid']:
            for key in ['cssWidth', 'cssHeight']:
                assert renderer[key] > 0
            for key in ['display', 'parentDisplay']:
                assert renderer['layout'][key] != 'none'
            for key in ['visibility', 'parentVisibility']:
                assert renderer['layout'][key] != 'hidden'
            assert renderer['width'] == math.floor(renderer['cssWidth'] * scenario['pixelRatio'])
            assert renderer['height'] == math.floor(renderer['cssHeight'] * scenario['pixelRatio'])
    active = [name for name, enabled in state['actionStates'].items() if enabled]
    if scenario['playback'] == 'static':
        assert not active and snapshot['action'] is None
    else:
        assert len(active) == 1
        assert active[0].endswith('. Walking') if scenario['playback'] == 'walking' else active[0] == scenario['clip']
        action = snapshot['action']
        assert action['name'] == active[0] and action['running'] is True
        assert action['paused'] is False and action['enabled'] is True and action['timeScale'] == 1
    if snapshot['mixerTime'] is not None:
        assert finite(snapshot['mixerTime']) and snapshot['mixerTimeScale'] == 1
    if engine.startswith('prepared-'):
        assert snapshot['diagnostics']['backend'] == engine.removesuffix('-r186')
        if engine == 'prepared-wasm-r186':
            assert snapshot['diagnostics']['wasmActive'] is True
    else:
        assert snapshot['diagnostics'] is None


def window(before, after, scenario, engine, samples):
    environment(before, scenario, engine)
    environment(after, scenario, engine)
    assert after['at'] > before['at'] and before['state'] == after['state']
    for name in ['main', 'axes']:
        for field in ['width', 'height', 'cssWidth', 'cssHeight', 'pixelRatio', 'layout', 'quality']:
            assert before['renderers'][name][field] == after['renderers'][name][field], (name, field)
    frames = {name: after['renderers'][name]['frame'] - before['renderers'][name]['frame'] for name in ['main', 'axes']}
    assert frames == {'main': samples, 'axes': samples if scenario['grid'] else 0}
    advance = None if before['mixerTime'] is None else after['mixerTime'] - before['mixerTime']
    assert advance is None and after['mixerTime'] is None or finite(advance) and advance > 0
    if before['action']:
        a, b = before['action'], after['action']
        assert a['duration'] == b['duration'] and a['duration'] > 0
        assert all(finite(x['time']) and 0 <= x['time'] < a['duration'] for x in [a, b])
        expected = (a['time'] + advance) % a['duration']
        distance = abs(b['time'] - expected)
        assert min(distance, a['duration'] - distance) <= max(1e-9, 128 * EPSILON * max(1, abs(after['mixerTime'])))
    counters = None if before['diagnostics'] is None else {key: after['diagnostics'][key] - before['diagnostics'][key] for key in COUNTERS}
    if counters is not None:
        assert all(finite(value) and value >= 0 for value in counters.values())
    if engine == 'prepared-wasm-r186':
        assert counters['wasmCalls'] > 0 or counters['preparedWasmCalls'] > 0
    return dict(mainFrames=frames['main'], axesFrames=frames['axes'], mixerAdvance=advance, counters=counters)


def reconstruct(raw, scenario, setup, config, engine):
    assert raw['failure'] is None and raw['columns'] == COLUMNS
    # Discovery smoke can attach before the host appends its observed GUI list.
    # Full case identities and GUI controller coverage are checked separately.
    for key in ['id', 'asset', 'playback', 'pixelRatio', 'grid', 'clip', 'clipDuration', 'clipTargetCount']:
        assert raw['scenario'].get(key) == scenario.get(key)
    assert raw['warmup'] == config['warmup'] and raw['samples'] == config['samples']
    count = len(raw['kinds'])
    assert count == 4 and setup['expectedCallbacks'] == count
    assert raw['kinds'][0] == {'kind': 0, 'name': 'Viewer.animate'}
    for i, item in enumerate(raw['kinds'][1:], 1):
        assert item['kind'] == i and item['name'] == 'dat.gui.updateDisplays'
    loops = [{'path': item['folder'], 'controllers': item['controllers']} for item in raw['kinds'][1:]]
    assert loops == scenario['guiLoops'] == setup['guiLoops']
    assert [len(loop['controllers']) for loop in loops] == [1, 14, 9]
    assert [loop['path'] for loop in loops] == ['root/Lighting', 'root/Animation', 'root/Morph Targets']
    # Distinct native morph controllers intentionally share property names 0/1/2.
    # Their complete ordered list is frozen; names are not controller identities.
    arming = row_groups(raw['armingRows'], scenario, count, arming=True)
    groups = row_groups(raw['rows'], scenario, count)
    assert arming[0][0]['raf'] < groups[0]['raf']
    assert len(groups) == raw['pairs'] == raw['warmup'] + raw['samples']
    phase_errors = []
    for a, b in zip(groups, groups[1:]):
        assert b['mainFrame'] - a['mainFrame'] == 1
        assert b['axesFrame'] - a['axesFrame'] == (1 if scenario['grid'] else 0)
        if a['mixer'] is None:
            assert b['mixer'] is None
        else:
            assert finite(b['mixer']) and b['mixer'] > a['mixer']
            tolerance = max(1e-9, 128 * EPSILON * max(1, abs(b['mixer'])))
            assert abs(b['mixer'] - a['mixer'] - (b['raf'] - a['raf']) / 1000) <= tolerance
        if scenario['playback'] != 'static':
            assert b['duration'] == a['duration'] == raw['before']['action']['duration']
            expected = (a['action'] + b['mixer'] - a['mixer']) % a['duration']
            distance = abs(b['action'] - expected)
            error = min(distance, a['duration'] - distance)
            assert error <= tolerance
            phase_errors.append(error)
    measured = groups[raw['warmup']:]
    for snapshot, row in [(raw['before'], groups[raw['warmup'] - 1]), (raw['after'], groups[-1])]:
        assert snapshot['renderers']['main']['frame'] == row['mainFrame']
        assert snapshot['renderers']['axes']['frame'] == row['axesFrame']
        same(snapshot['mixerTime'], row['mixer'])
    assert not [event for event in raw['activity'] if event['phase'] == 'sample']
    increment = setup['clock']['minPositiveDeltaMs']
    assert finite(increment) and increment > 0
    floor = 2 * count * increment
    cpu = stats([row['cpu'] for row in measured])
    block_size = config['blockSize']
    assert integer(block_size) and block_size > 0
    if config['mode'] == 'full':
        assert len(measured) % block_size == 0
    blocks = []
    for start in range(0, len(measured), block_size):
        values = stats([row['cpu'] for row in measured[start:start + block_size]])
        blocks.append(dict(start=start, samples=min(block_size, len(measured) - start), **values,
                           stable=abs(values['p50'] - cpu['p50']) <= max(.05 * cpu['p50'], floor)))
    result = dict(samples=len(measured), callbackCount=count, guiLoops=raw['kinds'][1:], cpu=cpu,
                  animateCpu=stats([row['animateCpu'] for row in measured]), guiCpu=stats([row['guiCpu'] for row in measured]),
                  rafIntervals=stats([b['raf'] - a['raf'] for a, b in zip(measured, measured[1:])]),
                  callbackStartIntervals=stats([b['start'] - a['start'] for a, b in zip(measured, measured[1:])]),
                  arrivalDelay=stats([row['start'] - row['raf'] for row in measured]), blocks=blocks,
                  blockStable=all(block['stable'] for block in blocks), observedClockIncrement=increment,
                  quantizationFloorMs=floor,
                  phaseCoverage=dict(nativeWallClock=True, frameMatchedAcrossRoutes=False, mixerStart=measured[0]['mixer'],
                                     mixerEnd=measured[-1]['mixer'], actionStart=measured[0]['action'], actionEnd=measured[-1]['action'], duration=measured[0]['duration']),
                  windowValidation=window(raw['before'], raw['after'], scenario, engine, raw['samples']))
    audit = dict(allGroups=len(groups), measuredGroups=len(measured), armingRows=len(raw['armingRows']) // 9,
                 rawRows=len(raw['rows']) // 9, maxPhaseErrorSeconds=max(phase_errors, default=0),
                 perMeasuredGroupCounters=None if result['windowValidation']['counters'] is None else
                 {key: value / len(measured) for key, value in result['windowValidation']['counters'].items()})
    return result, measured, audit


def stability(runs, full):
    median = quantile([run['result']['cpu']['p50'] for run in runs], .5)
    floor = max(run['result']['quantizationFloorMs'] for run in runs)
    tolerance = max(.05 * median, floor)
    checks = []
    for run in runs:
        result = run['result']
        blocks = [{'start': block['start'], 'samples': block['samples'], 'p50': block['p50'],
                   'ownRunDeltaMs': block['p50'] - result['cpu']['p50'],
                   'withinRouteTolerance': abs(block['p50'] - result['cpu']['p50']) <= tolerance} for block in result['blocks']]
        checks.append(dict(directory=run['directory'], p50=result['cpu']['p50'],
                           withinTolerance=abs(result['cpu']['p50'] - median) <= tolerance, blocks=blocks))
    return dict(medianP50Ms=median, quantizationFloorMs=floor, toleranceMs=tolerance, checks=checks,
                failedRuns=sum(not row['withinTolerance'] for row in checks),
                failedBlocks=sum(not block['withinRouteTolerance'] for row in checks for block in row['blocks']),
                passes=full and all(row['withinTolerance'] and all(block['withinRouteTolerance'] for block in row['blocks']) for row in checks))


def changes(actual, baseline, floor):
    return {q: dict(absoluteMs=actual[q] - baseline[q],
                   relativeChangePercent=100 * (actual[q] - baseline[q]) / baseline[q] if baseline[q] > floor else None) for q in QUANTILES}


def budget(actual, baseline, percent, absolute, saving=False, quantiles=QUANTILES):
    return {q: dict(baselineMs=baseline[q], actualMs=actual[q], requiredOrAllowedMs=max(percent * baseline[q], absolute),
                   observedChangeMs=actual[q] - baseline[q],
                   observedBudgetPass=(baseline[q] - actual[q] >= max(percent * baseline[q], absolute) if saving else actual[q] - baseline[q] <= max(percent * baseline[q], absolute))) for q in quantiles}


def aggregate(manifest, runs):
    group, config = manifest['group'], manifest['configuration']
    baseline = ROUTES[group][0][1]
    engines = list(dict.fromkeys(engine for _, engine in ROUTES[group]))
    result = []
    for scenario in manifest['cases']:
        selected = [run for run in runs if run['scenario'] == scenario['id']]
        balanced = [run for run in selected if run['purpose'] == 'balanced']
        original = [run for run in selected if run['engine'] == baseline]
        aa = stability(original, config['mode'] == 'full')
        summaries, route_stability = {}, {}
        for engine in engines:
            subset = [run for run in balanced if run['engine'] == engine]
            summary = {}
            for field in ['cpu', 'animateCpu', 'guiCpu', 'rafIntervals', 'callbackStartIntervals']:
                summary[field] = {q: quantile([run['result'][field][q] for run in subset], .5) for q in QUANTILES}
            summary['cpuRanges'] = {q: [min(run['result']['cpu'][q] for run in subset), max(run['result']['cpu'][q] for run in subset)] for q in QUANTILES}
            summary['independentRuns'] = len(subset)
            summaries[engine] = summary
            route_stability[engine] = stability(subset, config['mode'] == 'full')
        row = dict(scenario=scenario['id'], engines=summaries, originalAA=aa, balancedRepeatScreens=route_stability,
                   versusBaseline={engine: changes(summaries[engine]['cpu'], summaries[baseline]['cpu'], aa['quantizationFloorMs']) for engine in engines if engine != baseline})
        if group == 'engine':
            js, wasm = summaries['prepared-js-r186'], summaries['prepared-wasm-r186']
            row['wasmVersusMatchedJS'] = changes(wasm['cpu'], js['cpu'], route_stability['prepared-js-r186']['quantizationFloorMs'])
            row['wasmVersusMatchedJSIntervals'] = {field: changes(wasm[field], js[field], route_stability['prepared-js-r186']['quantizationFloorMs'])
                                                  for field in ['rafIntervals', 'callbackStartIntervals']}
            row['observedG1'] = {engine: budget(summaries[engine]['cpu'], summaries[baseline]['cpu'], .20, 1, saving=True, quantiles=('p50', 'p95')) for engine in engines if engine != baseline}
            row['observedG2'] = budget(wasm['cpu'], js['cpu'], .10, .5, saving=True, quantiles=('p50', 'p95'))
            row['observedG5'] = {engine: {field: budget(summaries[engine][field], summaries[baseline][field], .05, .2,
                                                       quantiles=QUANTILES if field == 'cpu' else ('p95', 'p99'))
                                         for field in ['cpu', 'rafIntervals', 'callbackStartIntervals']} for engine in engines if engine != baseline}
            row['role'] = 'target' if scenario['id'] in ['robot-walking', 'robot-walking-grid-off'] else 'control'
            row['rustCalibration'] = 'Four matched-JS repeats are not dedicated JS A/A or pre/post bookends. Even a threshold pass requires new prospective calibration before a Rust recommendation.'
        else:
            row['pureR186VersusExternalR176'] = changes(summaries['pure-r186']['cpu'], summaries['external-r176']['cpu'], route_stability['external-r176']['quantizationFloorMs'])
            row['scope'] = 'Packaging/version migration only; not candidate architecture or Rust effect.'
        result.append(row)
    return result


def compare_recorded_analysis(recorded, manifest, scenarios, runs):
    """Check native JS summaries without importing that implementation."""
    group = manifest['group']
    baseline = ROUTES[group][0][1]
    assert recorded['qualification'] is False and recorded['group'] == group
    assert recorded['mode'] == manifest['configuration']['mode'] and recorded['baseline'] == baseline
    assert [row['scenario'] for row in recorded['scenarios']] == [row['scenario'] for row in scenarios]
    fields = {'medianRunCpu': 'cpu', 'medianRunAnimateCpu': 'animateCpu', 'medianRunGuiCpu': 'guiCpu',
              'medianRunRafIntervals': 'rafIntervals', 'medianRunCallbackStartIntervals': 'callbackStartIntervals'}
    for saved, fresh in zip(recorded['scenarios'], scenarios):
        for engine, values in saved['engines'].items():
            expected = fresh['engines'][engine]
            assert values['independentRuns'] == expected['independentRuns']
            for to, source in fields.items():
                same(values[to], expected[source])
            subset = [run for run in runs if run['scenario'] == fresh['scenario'] and run['purpose'] == 'balanced' and run['engine'] == engine]
            assert values['blockStable'] == all(run['result']['blockStable'] for run in subset)
        same(saved['versusBaseline'], fresh['versusBaseline'])
        aa = fresh['originalAA']
        same(saved['aa']['allOriginalMedian'], aa['medianP50Ms'])
        same(saved['aa']['toleranceMs'], aa['toleranceMs'])
        same(saved['aa']['quantizationFloorMs'], aa['quantizationFloorMs'])
        assert saved['aa']['includesBookendsInTolerance'] is True and saved['aa']['passes'] == aa['passes']
        assert len(saved['aa']['checks']) == len(aa['checks'])
        for old, new in zip(saved['aa']['checks'], aa['checks']):
            assert old['directory'] == new['directory']
            assert old['withinTolerance'] == new['withinTolerance']
            assert old['blocksWithinSceneTolerance'] == all(block['withinRouteTolerance'] for block in new['blocks'])
        if group == 'engine':
            # The recorded display ratio uses original's floor; the appendix
            # contrast independently suppresses ratios using matched JS's floor.
            expected = changes(fresh['engines']['prepared-wasm-r186']['cpu'],
                               fresh['engines']['prepared-js-r186']['cpu'], aa['quantizationFloorMs'])
            same(saved['wasmVersusMatchedJS'], expected)
        else:
            assert saved['wasmVersusMatchedJS'] is None


def validate_manifest(manifest, expected_tool):
    config, group = manifest['configuration'], manifest['group']
    assert group in ROUTES and config['mode'] in SETTINGS
    assert manifest['candidateSha'] == CANDIDATE
    assert len(expected_tool) == 40 and all(c in '0123456789abcdef' for c in expected_tool)
    for key, expected in [('tooling', expected_tool), ('candidate', CANDIDATE), ('viewer', VIEWER)]:
        assert manifest['sourceBefore'][key] == manifest['sourceAfter'][key] == {'sha': expected, 'dirty': False}
    assert manifest['sourceIntegrity'] == 'passed'
    assert manifest['environmentBefore']['verifiedAC'] is True and manifest['environmentAfter']['verifiedAC'] is True
    assert config['profiling'] is False and config['gpuQueriesInWindow'] is False
    assert config['pageDpr'] == 1 and config['cssViewport'] == {'width': 1280, 'height': 720}
    for key, value in SETTINGS[config['mode']].items():
        assert config[key] == value
    if config['mode'] == 'full':
        assert [case['id'] for case in manifest['cases']] == CASES[group]
        assert manifest['protocol']['protocol']['cases'] == manifest['cases']
    routes = ROUTES[group]
    assert manifest['routes'] == [dict(label=label, engine=engine) for label, engine in routes]
    expected_order = [[(i + round_) % 4 for i in [0, 1, 3, 2]] for round_ in range(config['rounds'])]
    assert manifest['orders'] == expected_order
    expected = []
    for scenario in manifest['cases']:
        expected.append((scenario['id'], 'baseline-pre', routes[0][1], None, 'bookend-before'))
        for round_, order in enumerate(expected_order):
            expected.extend((scenario['id'], routes[i][0], routes[i][1], round_, 'balanced') for i in order)
        expected.append((scenario['id'], 'baseline-post', routes[0][1], None, 'bookend-after'))
    complete = manifest['status'] in ['screen-complete-unqualified', 'smoke-complete-not-performance-evidence']
    actual = [(run['scenario'], run['label'], run['engine'], run['round'], run['purpose']) for run in manifest['runs']]
    assert actual == expected[:len(actual)]
    if complete:
        assert actual == expected and not manifest['errors']
        assert all(run['status'] == 'captured' for run in manifest['runs'])
    return complete, expected


def audit_capture(root, expected_tool):
    manifest = read(root, 'manifest.json')
    complete, expected = validate_manifest(manifest, expected_tool)
    config, group = manifest['configuration'], manifest['group']
    audited, partial = [], []
    cases = {case['id']: case for case in manifest['cases']}
    for entry in manifest['runs']:
        directory = entry['directory']
        if entry['status'] != 'captured':
            partial.append(dict(directory=directory, status=entry['status'], error=entry.get('error'), rawPreserved=entry.get('rawPreserved')))
            continue
        raw = read(root, directory + '/raw-callbacks.json')
        summary, measured, evidence = reconstruct(raw, cases[entry['scenario']], read(root, directory + '/setup.json'), config, entry['engine'])
        same(summary, read(root, directory + '/summary.json'), directory + '.summary')
        same(summary, entry['result'], directory + '.manifestResult')
        same(measured, read(root, directory + '/measured-groups.json'), directory + '.measuredGroups')
        audited.append({**entry, 'result': summary, 'independent': evidence})
    if complete:
        assert not partial and len(audited) == len(expected)
    scenarios = aggregate(manifest, audited) if complete else None
    if complete:
        compare_recorded_analysis(read(root, 'analysis.json'), manifest, scenarios, audited)
    return dict(status='numeric-audit-complete' if complete else 'partial-evidence-no-performance-pass', qualification=False,
                scope='Callback arithmetic/phase/frame/stability only; archive/source/oracle/environment/license audits are separate.',
                candidateSha=CANDIDATE, toolingSha=expected_tool, group=group, mode=config['mode'],
                expectedRuns=len(expected), capturedRuns=len(audited), partialRuns=partial,
                measuredGroups=sum(run['independent']['measuredGroups'] for run in audited),
                groupsIncludingWarmup=sum(run['independent']['allGroups'] for run in audited),
                retainedArmingRows=sum(run['independent']['armingRows'] for run in audited),
                runAudits=audited, scenarios=scenarios,
                missingGates=['Archive/source/oracle review', 'Dedicated matched-JS A/A/bookends', 'Startup/transfer/memory', '30-minute interaction', 'Additional asset families/scenarios', 'Other hardware/browser/day replication'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('capture', type=Path)
    parser.add_argument('--expected-tool', required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    assert not args.out.exists(), 'Use a fresh output; never overwrite evidence'
    result = audit_capture(args.capture.resolve(strict=True), args.expected_tool)
    with args.out.open('x') as output:
        json.dump(result, output, indent=2, allow_nan=False)
        output.write('\n')
    print(json.dumps({key: result[key] for key in ['status', 'group', 'mode', 'capturedRuns', 'measuredGroups', 'groupsIncludingWarmup', 'retainedArmingRows']}))


if __name__ == '__main__':
    main()
