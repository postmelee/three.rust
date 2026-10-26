"""Pure synthetic tests for the independent Viewer timing audit; no browser/raw capture."""
from pathlib import Path
import argparse
import copy
import importlib.util
import json
import sys
import unittest
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('viewer_audit', ROOT / 'analyze.py')
v = importlib.util.module_from_spec(spec); spec.loader.exec_module(v)
parser = argparse.ArgumentParser(add_help=False)
parser.add_argument('--protocol-root', type=Path, default=ROOT.parents[2] / 'mydocs/plans')
options, remaining = parser.parse_known_args()
PROTOCOLS = {group: json.loads((options.protocol_root / ('task_m6_49_viewer_protocol_' + name + '.json')).read_text())
             for group, name in [('engine', 'robot-timing'), ('migration', 'migration-timing')]}
TOOL = 'a' * 40


def fixture(case='robot-walking', engine='pure-r186', no_mixer=False):
    scenario = copy.deepcopy(next(c for c in PROTOCOLS['engine']['cases'] if c['id'] == case))
    loops = scenario['guiLoops']; static = scenario['playback'] == 'static'
    config = dict(mode='full', warmup=2, samples=8, blockSize=2)
    setup = dict(expectedCallbacks=4, guiLoops=copy.deepcopy(loops), clock=dict(minPositiveDeltaMs=.005))
    kinds = [dict(kind=0, name='Viewer.animate')] + [dict(kind=i + 1, name='dat.gui.updateDisplays', folder=loop['path'], controllers=copy.deepcopy(loop['controllers'])) for i, loop in enumerate(loops)]
    def snapshot(i):
        raf = 950 + i * 16
        def renderer(name):
            visible = name == 'main' or scenario['grid']; cssw, cssh = (100, 50) if visible else (0, 0)
            return dict(width=cssw * scenario['pixelRatio'], height=cssh * scenario['pixelRatio'], cssWidth=cssw, cssHeight=cssh,
                        pixelRatio=scenario['pixelRatio'], frame=100 + i if name == 'main' else 200 + (i if scenario['grid'] else 0),
                        layout=dict(display='block', visibility='visible', parentDisplay='block' if visible else 'none', parentVisibility='visible'), quality=dict(antialias=True))
        diagnostics = None
        if engine.startswith('prepared-'):
            diagnostics = {key: (i if key == 'wasmCalls' and engine == 'prepared-wasm-r186' else 0) for key in v.COUNTERS}
            diagnostics.update(backend=engine.removesuffix('-r186'), wasmActive=engine == 'prepared-wasm-r186')
        return dict(at=raf + 9, visibility='visible', focused=True, crossOriginIsolated=True, dpr=1, revision='176' if engine.endswith('r176') else '186',
                    renderers={name: renderer(name) for name in ['main', 'axes']}, mixerTime=None if no_mixer else raf / 1000,
                    mixerTimeScale=None if no_mixer else 1, action=None if static else dict(name='11. Walking', time=raf / 1000 % 1, duration=1,
                    paused=False, enabled=True, running=True, timeScale=1), guiLoops=copy.deepcopy(loops),
                    state=dict(grid=scenario['grid'], autoRotate=False, playbackSpeed=1, actionStates={name: name == '11. Walking' and not static for name in loops[1]['controllers']}),
                    controls=dict(autoRotate=False), diagnostics=diagnostics)
    rows = []
    for i in range(1, 11):
        raf = 950 + i * 16
        for kind, duration in enumerate([1, .125, .25, .5]):
            values = [kind, raf, raf + 2 * kind, raf + 2 * kind + duration]
            values += ([None if no_mixer else raf / 1000, None if static else raf / 1000 % 1, None if static else 1, 100 + i, 200 + (i if scenario['grid'] else 0)] if kind == 0 else [None] * 5)
            rows.extend(values)
    raw = dict(columns=v.COLUMNS.copy(), kinds=kinds, scenario=copy.deepcopy(scenario), warmup=2, samples=8, pairs=10, rows=rows,
               armingRows=[2, 950, 954, 954.25, None, None, None, None, None], before=snapshot(2), after=snapshot(10), activity=[], failure=None)
    return raw, scenario, setup, config, engine


def run_fixture(data):
    return v.reconstruct(*data)


def summary(cpu, clock=.005, block=None):
    metric = dict(p50=cpu, p95=cpu, p99=cpu)
    return dict(cpu=metric.copy(), animateCpu=metric.copy(), guiCpu=dict(p50=0, p95=0, p99=0), rafIntervals=dict(p50=16, p95=16, p99=16),
                callbackStartIntervals=dict(p50=16, p95=16, p99=16), quantizationFloorMs=8 * clock, observedClockIncrement=clock,
                blocks=[dict(start=0, samples=300, p50=cpu if block is None else block)], blockStable=True)


def manifest(group='engine'):
    cases = copy.deepcopy(PROTOCOLS[group]['cases']); routes = v.ROUTES[group]
    cfg = dict(mode='full', **v.SETTINGS['full'], profiling=False, gpuQueriesInWindow=False, pageDpr=1, cssViewport=dict(width=1280, height=720))
    pins = {key: dict(sha=sha, dirty=False) for key, sha in [('tooling', TOOL), ('candidate', v.CANDIDATE), ('viewer', v.VIEWER)]}
    orders = [[(i + round_) % 4 for i in [0, 1, 3, 2]] for round_ in range(4)]
    runs = []
    def add(scenario, label, engine, round_, purpose):
        runs.append(dict(scenario=scenario['id'], label=label, engine=engine, round=round_, purpose=purpose, directory=str(len(runs)), status='captured', result=summary(2)))
    for case in cases:
        add(case, 'baseline-pre', routes[0][1], None, 'bookend-before')
        for round_, order in enumerate(orders):
            for i in order: add(case, *routes[i], round_, 'balanced')
        add(case, 'baseline-post', routes[0][1], None, 'bookend-after')
    return dict(candidateSha=v.CANDIDATE, group=group, configuration=cfg, sourceBefore=copy.deepcopy(pins), sourceAfter=copy.deepcopy(pins), sourceIntegrity='passed',
                environmentBefore=dict(verifiedAC=True), environmentAfter=dict(verifiedAC=True), protocol=dict(protocol=copy.deepcopy(PROTOCOLS[group])),
                cases=cases, routes=[dict(label=label, engine=engine) for label, engine in routes], orders=orders, runs=runs, status='screen-complete-unqualified', errors=[])


class AuditTests(unittest.TestCase):
    def test_frozen_protocol_contracts(self):
        for group, expected in [('engine', 72), ('migration', 36)]:
            m = manifest(group); complete, plan = v.validate_manifest(m, TOOL)
            self.assertTrue(complete); self.assertEqual(len(plan), expected)
            self.assertEqual(PROTOCOLS[group]['runtimeSha'], v.CANDIDATE)
            self.assertEqual(PROTOCOLS[group]['settings']['timing'], v.SETTINGS)

    def test_four_callbacks_golden_cpu_phase_and_arming(self):
        result, measured, audit = run_fixture(fixture())
        self.assertEqual(result['cpu']['p50'], 1.875); self.assertEqual(result['animateCpu']['p50'], 1)
        self.assertEqual(result['guiCpu']['p50'], .875); self.assertEqual(result['rafIntervals']['p95'], 16)
        self.assertEqual(result['quantizationFloorMs'], .04); self.assertEqual(len(measured), 8)
        self.assertEqual(audit['armingRows'], 1); self.assertEqual(audit['allGroups'], 10)
        self.assertLess(audit['maxPhaseErrorSeconds'], 1e-9)

    def test_duplicate_morph_property_names_are_preserved(self):
        data = fixture(); self.assertEqual(data[1]['guiLoops'][2]['controllers'], ['0', '1', '2'] * 3)
        run_fixture(data)

    def test_static_with_and_without_mixer(self):
        for missing in [False, True]:
            result, _, _ = run_fixture(fixture('robot-static', no_mixer=missing))
            self.assertIsNone(result['phaseCoverage']['actionStart'])
            self.assertEqual(result['windowValidation']['mainFrames'], 8)
            self.assertEqual(result['windowValidation']['mixerAdvance'] is None, missing)

    def test_grid_off_and_high_resolution(self):
        result, _, _ = run_fixture(fixture('robot-walking-grid-off'))
        self.assertEqual(result['windowValidation']['axesFrames'], 0)
        run_fixture(fixture('robot-high-resolution'))

    def test_all_engine_endpoints(self):
        for engine in ['pure-r186', 'prepared-js-r186', 'prepared-wasm-r186', 'original-r176', 'external-r176']:
            run_fixture(fixture(engine=engine))

    def test_bad_rows_rejected(self):
        mutators = {
            'missing': lambda r: r['rows'].__delitem__(slice(0, 9)),
            'duplicate': lambda r: r['rows'].__setitem__(slice(0, 0), r['rows'][:9]),
            'overlap': lambda r: r['rows'].__setitem__(slice(11, 13), [966.5, 967.5]),
            'nonfinite': lambda r: r['rows'].__setitem__(2, None),
            'GUI phase not null': lambda r: r['rows'].__setitem__(13, 0),
            'frozen mixer': lambda r: r['rows'].__setitem__(40, r['rows'][4]),
            'frozen action': lambda r: r['rows'].__setitem__(41, r['rows'][5]),
            'changed duration': lambda r: r['rows'].__setitem__(42, 2),
            'skipped main': lambda r: r['rows'].__setitem__(43, r['rows'][7]),
            'extra axes': lambda r: r['rows'].__setitem__(44, r['rows'][8] + 2),
            'missing arming': lambda r: r.update(armingRows=[]),
            'failure': lambda r: r.update(failure='retained synthetic failure'),
        }
        for name, mutate in mutators.items():
            with self.subTest(name=name):
                data = fixture(); mutate(data[0])
                with self.assertRaises(AssertionError): run_fixture(data)

    def test_changed_controller_scope_and_count_rejected(self):
        for change in ['folder', 'list', 'count']:
            data = fixture()
            if change == 'folder': data[0]['kinds'][1]['folder'] = 'root/Other'
            if change == 'list': data[0]['kinds'][3]['controllers'][0] = 'other'
            if change == 'count': data[0]['kinds'].append(dict(kind=4, name='dat.gui.updateDisplays', folder='root/New', controllers=['x']))
            with self.subTest(change=change), self.assertRaises(AssertionError): run_fixture(data)

    def test_endpoint_mutations_rejected(self):
        mutators = [lambda r: r['after'].update(focused=False), lambda r: r['after']['renderers']['main']['quality'].update(antialias=False),
                    lambda r: r['after']['state'].update(playbackSpeed=2), lambda r: r['after']['renderers']['main'].update(frame=111),
                    lambda r: r['activity'].append(dict(type='blur', phase='sample'))]
        for index, mutate in enumerate(mutators):
            data = fixture(); mutate(data[0])
            with self.subTest(index=index), self.assertRaises(AssertionError): run_fixture(data)

    def test_grid_off_extra_axes_and_fake_wasm_rejected(self):
        data = fixture('robot-walking-grid-off'); data[0]['rows'][44] = 201
        with self.assertRaises(AssertionError): run_fixture(data)
        data = fixture(engine='prepared-wasm-r186'); data[0]['after']['diagnostics']['wasmCalls'] = data[0]['before']['diagnostics']['wasmCalls']
        with self.assertRaises(AssertionError): run_fixture(data)

    def test_changed_measured_cpu_is_not_accepted(self):
        _, measured, _ = run_fixture(fixture()); modified = copy.deepcopy(measured); modified[3]['cpu'] += .1
        with self.assertRaises(AssertionError): v.same(modified, measured)

    def test_original_blocks_center_on_own_run(self):
        runs = [dict(directory=str(i), result=summary(value, block=value if i < 3 else 109)) for i, value in enumerate([100, 100, 100, 104])]
        result = v.stability(runs, True)
        self.assertEqual(result['medianP50Ms'], 100); self.assertEqual(result['toleranceMs'], 5)
        self.assertTrue(result['passes'])  # 109 is 5 from its run, but 9 from global center.
        runs[-1]['result']['blocks'][0]['p50'] = 109.1
        self.assertFalse(v.stability(runs, True)['passes'])  # Shared scene tolerance, not run-specific 5.2.

    def test_eight_tick_floor_and_quantized_ratio(self):
        runs = [dict(directory=str(i), result=summary(value)) for i, value in enumerate([.01, .01, .01, .045])]
        result = v.stability(runs, True); self.assertEqual(result['toleranceMs'], .04); self.assertTrue(result['passes'])
        self.assertIsNone(v.changes(dict.fromkeys(v.QUANTILES, .02), dict.fromkeys(v.QUANTILES, .01), .04)['p50']['relativeChangePercent'])

    def test_route_repeat_screen_does_not_inherit_original_pass(self):
        m = manifest(); js = [r for r in m['runs'] if r['scenario'] == 'robot-walking' and r['engine'] == 'prepared-js-r186']
        js[-1]['result'] = summary(3)
        case = next(row for row in v.aggregate(m, m['runs']) if row['scenario'] == 'robot-walking')
        self.assertTrue(case['originalAA']['passes']); self.assertFalse(case['balancedRepeatScreens']['prepared-js-r186']['passes'])
        self.assertIn('not dedicated JS A/A', case['rustCalibration'])

    def test_migration_direct_contrast_is_not_original_contrast(self):
        m = manifest('migration')
        for r in m['runs']: r['result'] = summary({'original-r176': 10, 'external-r176': 20, 'pure-r186': 15}[r['engine']])
        row = v.aggregate(m, m['runs'])[0]
        self.assertEqual(row['versusBaseline']['pure-r186']['p50']['absoluteMs'], 5)
        self.assertEqual(row['pureR186VersusExternalR176']['p50']['absoluteMs'], -5)
        self.assertEqual(row['pureR186VersusExternalR176']['p50']['relativeChangePercent'], -25)

    def test_missing_duplicate_reordered_or_failed_matrix_rejected(self):
        for kind in ['missing', 'duplicate', 'reorder', 'failed', 'bookend', 'clockconfig', 'dirty', 'protocol']:
            m = manifest()
            if kind == 'missing': m['runs'].pop(2)
            if kind == 'duplicate': m['runs'].insert(2, copy.deepcopy(m['runs'][2]))
            if kind == 'reorder': m['runs'][1], m['runs'][2] = m['runs'][2], m['runs'][1]
            if kind == 'failed': m['runs'][1]['status'] = 'failed'
            if kind == 'bookend': m['runs'][0]['engine'] = 'prepared-js-r186'
            if kind == 'clockconfig': m['configuration']['samples'] += 1
            if kind == 'dirty': m['sourceAfter']['tooling']['dirty'] = True
            if kind == 'protocol': m['protocol']['protocol']['cases'].pop()
            with self.subTest(kind=kind), self.assertRaises(AssertionError): v.validate_manifest(m, TOOL)

    def test_failed_prefix_never_becomes_complete(self):
        m = manifest(); m['status'] = 'failed'; m['runs'] = m['runs'][:2]; m['runs'][-1]['status'] = 'failed'; m['errors'] = ['preserved']
        complete, expected = v.validate_manifest(m, TOOL); self.assertFalse(complete); self.assertEqual(len(expected), 72)

    def test_product_budget_is_not_increased_by_noise(self):
        base = dict.fromkeys(v.QUANTILES, 1); changed = dict.fromkeys(v.QUANTILES, 1.25)
        self.assertFalse(v.budget(changed, base, .05, .2)['p99']['observedBudgetPass'])
        self.assertEqual(v.budget(changed, base, .05, .2)['p99']['requiredOrAllowedMs'], .2)
        self.assertFalse(v.budget(dict.fromkeys(v.QUANTILES, .7), base, .20, 1, saving=True)['p50']['observedBudgetPass'])
        self.assertTrue(v.budget(dict.fromkeys(v.QUANTILES, .5), base, .10, .5, saving=True)['p95']['observedBudgetPass'])


if __name__ == '__main__':
    unittest.main(argv=[sys.argv[0], *remaining])
