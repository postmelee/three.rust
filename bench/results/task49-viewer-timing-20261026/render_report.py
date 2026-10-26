"""Render the descriptive Viewer timing tables from the independent audit JSON.
Usage: python3 render_report.py AUDIT_JSON FRESH_MARKDOWN
"""
import json,sys
from pathlib import Path

def f(x):return f'{x:.6f}'
def triple(d):return ' / '.join(f(d[k]) for k in ['p50','p95','p99'])
def changes(actual,reference):return ' / '.join(f(actual[k]-reference[k])+f' ({100*(actual[k]-reference[k])/reference[k]:+.2f}%)' for k in ['p50','p95','p99'])
def report(d):
    captures={x['label']:x for x in d['captures']};engine=captures['engine-full']['numeric'];migration=captures['migration-full']['numeric']
    lines=['# Independent Viewer timing audit — 2026-10-26','',
    '**The raw, source and oracle audit passed; the performance qualification did not.** All four engine original A/A screens and both migration original A/A screens failed. The observed candidate callback costs do not establish an adoptable advantage. The precise effect sizes and cause of the instability remain unresolved.','',
    'The engine session and migration session are independent experiments. In particular, pure-r186 Walking/grid-off CPU p50 was 0.472500 ms in the engine session and 0.990000 ms in the migration session. This unresolved regime change must not be pooled, subtracted into a migration or Rust effect, or explained as OS/JIT behavior without further evidence.','',
    '## Scope and method','',
    'Timing sums disjoint synchronous Viewer.animate and all three native dat.gui.updateDisplays bodies sharing a rAF timestamp. K=4 is frozen, including Lighting 1, Animation 14 and Morph Targets 9 ordered controllers. The GUI bodies, complete native animation/render work, public matrix reads and synchronous renderer handoff remain inside the measured boundary. Browser/compositor/GPU and asynchronous work are outside it; instrumentation overhead is uncalibrated. Native playback phases are not matched frame by frame across routes. CPU savings alone cannot establish FPS gains.','',
    'Each full run retains 600 warmup and 1,200 measured groups, plus its first arming group. Statistics interpolate at (n−1)q, then take the median of independent balanced-run quantiles: eight original runs, four JS/external and four Wasm/pure-r186 runs per case. Original bookends are used for A/A, not added to the balanced cost aggregate. Component quantiles need not add to the total quantile; the total is computed from the actual per-group sum. No fast, slow or unstable run is excluded.','',
    '## Completed capture accounting','',
    '| Suite | Runs | Measured groups | Including warmup | Arming rows | Oracle pages / poses | PNG files |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: |']
    for c in d['captures']:
        n=c['numeric'];o=c['oracles'];lines.append(f"| {c['label']} | {n['capturedRuns']} | {n['measuredGroups']:,} | {n['groupsIncludingWarmup']:,} | {n['retainedArmingRows']} | {o['pages']} / {o['poses']} | {o['imageFiles']} |")
    lines += ['', 'The two full groups retain 108 runs, 129,600 measured groups, 194,400 complete warmup/measured groups (777,600 ordinary callback rows) and 432 arming rows. Smoke is separate tooling evidence. The four original captures have no capture errors and unchanged clean sources; no failed primary run was removed.','',
    '## Original A/A and independent route-repeat screens','',
    'Original run medians are compared with the median of all ten original runs including bookends. Each block median is compared with its own run median using the shared tolerance max(5% × original scene median, 8 × largest original clock increment). Own-run block stability is separately computed from that run’s own median/clock. The four-repeat JS/Wasm screen uses that route’s own median/clock; it is not dedicated JS A/A or pre/post bookend calibration.','',
    '| Group / case / route | Run failures / runs | Block failures / blocks | Tolerance ms | Pass |', '| --- | ---: | ---: | ---: | --- |']
    for group,n in [('engine',engine),('migration',migration)]:
        for s in n['scenarios']:
            items=[('original A/A',s['originalAA'])]
            if group=='engine':items += [(k,s['balancedRepeatScreens'][k]) for k in ['prepared-js-r186','prepared-wasm-r186']]
            for name,a in items:
                lines.append(f"| {group} / {s['scenario']} / {name} | {a['failedRuns']} / {len(a['checks'])} | {a['failedBlocks']} / {sum(len(x['blocks']) for x in a['checks'])} | {f(a['toleranceMs'])} | {a['passes']} |")
    lines += ['', 'Engine original A/A failures total 8/40 runs and 30/160 blocks; migration failures total 7/20 runs and 23/80 blocks. All four matched-JS repeat screens fail. Only the Walking/grid-on Wasm repeat screen passes; this does not repair the failed original or JS screen. Complete per-run and per-block checks, own-run stability and migration route repeat checks are preserved in [audit.json](audit.json).','',
    '## Absolute callback CPU','',
    'All cells below are p50 / p95 / p99 in milliseconds, medians of balanced-run quantiles. Full ranges and raw group durations remain in the audit and indexed payloads.','',
    '| Session / case | Route | Total CPU ms | Viewer.animate ms | GUI sum ms |','| --- | --- | ---: | ---: | ---: |']
    for group,n in [('engine',engine),('migration',migration)]:
        for s in n['scenarios']:
            for name,e in s['engines'].items():lines.append(f"| {group} / {s['scenario']} | {name} | {triple(e['cpu'])} | {triple(e['animateCpu'])} | {triple(e['guiCpu'])} |")
    lines += ['', '## Frame-arrival intervals','',
    'These intervals are rAF/callback arrivals, not presentation completion or GPU timing. All cells are p50 / p95 / p99 milliseconds.','',
    '| Session / case | Route | rAF timestamp interval ms | Callback-start interval ms |','| --- | --- | ---: | ---: |']
    for group,n in [('engine',engine),('migration',migration)]:
        for s in n['scenarios']:
            for name,e in s['engines'].items():lines.append(f"| {group} / {s['scenario']} | {name} | {triple(e['rafIntervals'])} | {triple(e['callbackStartIntervals'])} |")
    lines += ['', '## Absolute and relative differences','',
    'Each cell is p50 / p95 / p99 change in milliseconds (relative percent). Positive means more callback time. Comparisons are confined to their own session. These descriptive differences are not qualified speedup/regression estimates.','',
    '| Session / case | Contrast (actual minus reference) | CPU Δms (Δ%) |','| --- | --- | ---: |']
    for s in engine['scenarios']:
        e=s['engines']
        for a,b in [('prepared-js-r186','pure-r186'),('prepared-wasm-r186','pure-r186'),('prepared-wasm-r186','prepared-js-r186')]:lines.append(f"| engine / {s['scenario']} | {a} − {b} | {changes(e[a]['cpu'],e[b]['cpu'])} |")
    for s in migration['scenarios']:
        e=s['engines']
        for a,b in [('external-r176','original-r176'),('pure-r186','original-r176'),('pure-r186','external-r176')]:lines.append(f"| migration / {s['scenario']} | {a} − {b} | {changes(e[a]['cpu'],e[b]['cpu'])} |")
    lines += ['', 'The direct external-r176→pure-r186 contrast controls externalized packaging within the migration session. It is still unstable and has finite version-related correctness differences. It is not a correction to apply to the separate engine experiment.','',
    '## Prospective adoption arithmetic','',
    'Walking/grid-on and Walking/grid-off are the target scenarios; static and higher resolution are controls. No target meets G1 (20% and 1 ms saving at p50 and p95 versus pure-r186), and none meets G2 (10% and 0.5 ms versus matched JS). In particular the grid-off Wasm p95 saving versus JS is 0.4973749954253437 ms, below 0.5 ms, with a failed JS repeat screen. No dedicated JS calibration or Rust advantage is established.','',
    '| Case | Route | G5 CPU p50 / p95 / p99 observed budget passes | rAF p95 / p99 | Callback start p95 / p99 |','| --- | --- | --- | --- | --- |']
    for s in engine['scenarios']:
        for name,g in s['observedG5'].items():
            flags=lambda key,qs:' / '.join(str(g[key][q]['observedBudgetPass']) for q in qs)
            lines.append(f"| {s['scenario']} | {name} | {flags('cpu',['p50','p95','p99'])} | {flags('rafIntervals',['p95','p99'])} | {flags('callbackStartIntervals',['p95','p99'])} |")
    lines += ['', 'G5 allows max(5%, 0.2 ms); measured noise is not added to that allowance. The grid-off Wasm p95 increase is 0.20000000298023224 ms and therefore fails the exact raw arithmetic at the 0.2 ms boundary; this tiny boundary excess is not treated as a meaningful causal regression. The failed A/A keeps formal performance inference inconclusive. The finite observations and missing useful advantage support declining adoption of this tested path, without proving that the architecture or language cannot win elsewhere. The original scenes remain below the normally 5 ms CPU-heavy cohort.','',
    '## Work, phase, correctness and source evidence','',
    'All 144 full/smoke captures retain K=4 and valid complete callback groups. Every full group advances the main renderer once; axes advance once with grid on and zero with grid off. Native mixer/rAF and modulo action-phase checks include warmup; maximum full phase residual is 1.7763568394002505e-15 seconds. Captured state remains focused, visible and isolated with fixed quality/controller layout and no sample-phase activity.','',
    'All candidate full runs record zero preparedPasses and preparedWasmCalls. Grid-on and higher-resolution groups pay 2 fallback submissions, 68 paid matrix materializations (matrixReads) and 8,704 materialized bytes per-group averages across each measured window; Wasm additionally averages 22 calls. Grid-off averages 1 fallback, 62 materializations and 7,936 bytes; Wasm averages 15 calls. These averages are endpoint counter deltas divided by 1,200 measured groups, not counters sampled in each raw callback row. These synchronous costs remain paid inside the total callback path; the counters do not establish ownership promotion or an isolated cost attribution.','',
    'Each engine suite has 24 oracle pages / 42 poses and 341,880 ordered numerical reference comparisons, with maximum error 0 and identical strict image/semantic comparisons. Each migration suite has 12 pages / 18 poses and 145,944 reference values. Native-versus-instrumented comparisons are strict for every route (21 engine and 9 migration pose pairs per suite); all pass with equal PNG bytes. Original-r176 versus external-r176 remains strict. Pure-r186 versus r176 remains deliberately non-strict: preserved differences include image, layout and numerical outputs, with maximum numerical difference 8.145756254407388e-06. This is not candidate equivalence or a silent oracle exemption. Each full suite preserves its actual 84 engine / 36 migration PNG files.','',
    'The independent verifier checks captured JS/Wasm bytes against served/network hashes, exact HTML import-map transformation, prepared-manifest/output hashes, all full-file adaptation patches and adapted build inputs. It retains original/build dependency inventories, source maps, decoder/asset hashes, source integrity and errors. Native oracle captureSources is disabled, so those pages retain inventories and exact HTML rather than duplicate every executed source body. Existing build hashes do not independently certify source-to-binary compilation. PNG bytes/dimensions and stored raw-pixel SHA equality are verified; WebGL readback is not recreated offline.','',
    '## Preservation, failures and remaining gates','',
    'The archive retains 7,522 logical files in 935 content-addressed blobs (27,306,606 unique stored bytes; largest blob 1,054,343 bytes). Every source file has original, decoded-original, normalized-public and stored hashes. Only eight explicit runner power-output strings needed battery instance-ID normalization. Exact JSON token/type/value/sign/key/order invariance was checked; source/code/image bytes are unchanged. Deduplication removes duplicate storage only. All raw arming/warmup/measured arrays, preparation files, source inventories, maps, images, failures and MIT/CC0 notices remain recoverable.','',
    'There were no capture failures in these four suites. Archive build attempt 001 rejected a Path-order versus string-order listing comparison; identical file membership/content was confirmed, the comparison was corrected, and fresh archive 002 was built. Independent verifier attempts 001/002 exposed two incorrect verifier assumptions: dat.gui is transformed during build and retains its exact patch rather than a physical adapted source file; both r176 routes have null runtime metadata. These verifier assumptions were corrected to the captured tool contract; raw data and acceptance criteria did not change. All attempt logs/status records are retained with public hashes. The final verifier and 18 numeric plus 11 privacy/storage/oracle mutation tests pass.','',
    'Unmet gates include original A/A stability (performed and failed). Unperformed gates include dedicated matched-JS A/A/bookends; startup/first use/transfer/memory; 30-minute interaction; broader CPU-heavy content/behavior; and other hardware, browsers and dates. No new engine optimization, profiler cost claim, whole-browser speedup, FPS improvement or product ownership/progress promotion follows from this archive. See [README.md](README.md) for exact pins, hardware, commands and restoration.','']
    return '\n'.join(lines)

if __name__=='__main__':
    data=json.loads(Path(sys.argv[1]).read_text());target=Path(sys.argv[2]);
    with target.open('x') as out:out.write(report(data))
