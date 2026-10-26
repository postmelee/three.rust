"""Independently verify Task #46 Editor raw evidence without modifying it.

Usage: python3 task_m6_46_editor_audit.py APP_RAW OUTPUT
The output normalizes only battery device identifiers. All recorded input
hashes are calculated from the original bytes before normalization.
"""
from pathlib import Path
from collections import OrderedDict
import argparse, hashlib, json, math, re, sys

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('app_raw', type=Path)
parser.add_argument('output', type=Path)
args=parser.parse_args()
root=args.app_raw
output_file=args.output
if output_file.resolve().is_relative_to(root.resolve()):
    parser.error('OUTPUT must be outside APP_RAW to preserve raw evidence')
load=lambda rel: json.loads((root/rel).read_text())
sha=lambda rel: hashlib.sha256((root/rel).read_bytes()).hexdigest()
m=load('manifest.json'); published=load('analysis.json')
errors=[]; runs=[]; fingerprints=[]
def require(ok,msg):
    if not ok: errors.append(msg)
def quantile(v,p):
    a=sorted(v); n=(len(a)-1)*p; lo=math.floor(n); hi=math.ceil(n)
    return a[lo]+(a[hi]-a[lo])*(n-lo)
def stats(v): return {q:quantile(v,p) for q,p in [('p50',.5),('p95',.95),('p99',.99)]}
def finite(v): return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
def near(a,b): return abs(a-b)<=1e-9
columns=['kind','rafTimestampMs','startMs','endMs','mixerTimeSeconds','actionTimeSeconds','clipDurationSeconds']
counterkeys=['wasmCalls','preparedPasses','preparedWasmCalls','preparedFallbacks','preparedMatrixReads','matrixReads']
require(m['status']=='screen-complete-unqualified','Manifest completion status')
require(len(m['runs'])==70 and len(m['oracles'])==24,'Run/oracle counts')
require(all(x['status']=='passed' for x in m['oracles']),'Oracle status')
require(m['errors']==[] and m['sourceIntegrity']['unchanged'],'Manifest errors/source integrity')
for entry in m['runs']:
    directory=entry['directory']; idle=entry['scenario']=='E1-idle'
    raw=load(directory+'/raw-callbacks.json'); setup=load(directory+'/setup.json'); stored=entry['result']
    prefix=directory+': '
    require(entry['status']=='captured' and raw['failure'] is None,prefix+'capture/failure')
    require(raw['columns']==columns,prefix+'columns')
    require(len(raw['rows'])%7==0,prefix+'row length')
    require(raw['warmup']==(120 if idle else 600) and raw['samples']==(240 if idle else 1200),prefix+'sample protocol')
    arming=[raw['armingRows'][i:i+7] for i in range(0,len(raw['armingRows']),7)]
    require(1<=len(arming)<=2,prefix+'arming count')
    require(len({row[0] for row in arming})==len(arming),prefix+'arming duplicate')
    allrows=[raw['rows'][i:i+7] for i in range(0,len(raw['rows']),7)]
    for row in arming+allrows:
        kind,raf,start,end,mixer,action,duration=row
        require(kind in [0,1] and all(finite(v) for v in row[:5]) and end>=start,prefix+'finite/order')
        if kind==1 and not idle: require(finite(action) and finite(duration) and duration>0,prefix+'phase columns')
        else: require(action is None and duration is None,prefix+'null schema')
    if len(arming)==2:
        a,b=arming; require(a[3]<=b[2] or b[3]<=a[2],prefix+'arming overlap')
    grouped=OrderedDict()
    last_raf=None
    for row in allrows:
        if row[1] not in grouped:
            require(last_raf is None or row[1]>last_raf,prefix+'raw timestamp order')
            grouped[row[1]]=[];last_raf=row[1]
        grouped[row[1]].append(row)
    pairs=[]
    for raf,group in grouped.items():
        require(len(group)==2 and sorted(x[0] for x in group)==[0,1],prefix+'pair completeness')
        v,t=sorted(group,key=lambda x:x[0]);require(v[3]<=t[2] or t[3]<=v[2],prefix+'interval overlap')
        pairs.append({'raf':raf,'start':min(v[2],t[2]),'cpu':(v[3]-v[2])+(t[3]-t[2]),'viewport':v[3]-v[2],'timeline':t[3]-t[2],'mixer':v[4],'timelineMixer':t[4],'phase':t[5],'duration':t[6]})
    require(len(pairs)==raw['warmup']+raw['samples'],prefix+'pair counts')
    measured=pairs[raw['warmup']:]; require(len(measured)==raw['samples'],prefix+'measured count')
    cpu=stats([x['cpu'] for x in measured]);intervals=stats([b['raf']-a['raf'] for a,b in zip(measured,measured[1:])]); arrivals=stats([b['start']-a['start'] for a,b in zip(measured,measured[1:])])
    inc=setup['clock']['minPositiveDeltaMs']; ownTolerance=max(.05*cpu['p50'],4*inc)
    blocksize=60 if idle else 300
    blocks=[quantile([p['cpu'] for p in measured[i:i+blocksize]],.5) for i in range(0,len(measured),blocksize)]
    ownBlockFailures=sum(abs(x-cpu['p50'])>ownTolerance for x in blocks)
    for key,recalc in [('cpu',cpu),('rafIntervals',intervals),('callbackStartIntervals',arrivals)]:
        for q,value in recalc.items(): require(near(value,stored[key][q]),prefix+key+'/'+q+' differs from published result')
    require(stored['blockStable']==(ownBlockFailures==0),prefix+'own block verdict')
    before,after=raw['before'],raw['after'];renderDelta=after['renderInfo']['frame']-before['renderInfo']['frame']
    sampleEvents=[x for x in raw['activity'] if x['phase']=='sample'];require(not sampleEvents,prefix+'sample activity')
    for state in [before,after]:
        require(state['focused'] and state['visibility']=='visible' and state['crossOriginIsolated'] and state['dpr']==1 and state['autosave'] and state['savingStarted']==state['savingFinished'],prefix+'environment/saving')
        require(state['rendererPixelRatio']==(2 if entry['scenario'].endswith('high-resolution') else 1),prefix+'renderer DPR')
    for key in ['width','height','cssWidth','cssHeight','rendererPixelRatio','quality']: require(before[key]==after[key],prefix+'changed '+key)
    require('Apple M4 Pro' in setup['hardware']['renderer'] and 'Metal' in setup['hardware']['renderer'] and 'SwiftShader' not in setup['hardware']['renderer'],prefix+'hardware backend')
    phase=None
    if not idle:
        expected=before['action']['duration'];tol=max(1e-9,128*2.220446049250313e-16*max(1,expected,max(abs(p['mixer']) for p in measured),max(abs(p['timelineMixer']) for p in measured)))
        require(renderDelta>=raw['samples'],prefix+'native render work')
        maxerr=0;changes=0;repeats=0
        first=measured[0]
        for i,row in enumerate(measured):
            require(row['duration']==expected and 0<=row['phase']<expected,prefix+'phase range/duration')
            err=abs(math.remainder((row['phase']-first['phase'])-(row['timelineMixer']-first['timelineMixer']),expected));maxerr=max(maxerr,err)
            require(err<=tol,prefix+'phase/mixer anchored divergence')
            if i:
                prev=measured[i-1]
                require(row['mixer']>prev['mixer'] and row['timelineMixer']>=prev['timelineMixer'],prefix+'phase clocks')
                changes+=abs(math.remainder(row['phase']-prev['phase'],expected))>tol
                repeats+=row['timelineMixer']==prev['timelineMixer']
        require(changes>0 and measured[-1]['timelineMixer']>first['timelineMixer'],prefix+'phase progression')
        require(stored['playbackValidation']['checkedPairs']==len(measured),prefix+'stored validation coverage')
        phase={'checkedPairs':len(measured),'duration':expected,'maxCircularErrorSeconds':maxerr,'toleranceSeconds':tol,'changedObservations':changes,'repeatedTimelineObservations':repeats,'mixerAdvanceSeconds':measured[-1]['mixer']-first['mixer']}
    else: require(renderDelta==0 and after['renderCount']-before['renderCount']==0,prefix+'idle rendered')
    deltas=None
    if before['diagnostics'] is not None:
        deltas={key:after['diagnostics'][key]-before['diagnostics'][key] for key in counterkeys}
        require(all(finite(v) and v>=0 for v in deltas.values()),prefix+'counter deltas')
        require(deltas==stored['counterDeltas'],prefix+'published counter delta')
        require(before['diagnostics']['backend']==entry['engine'] and after['diagnostics']['backend']==entry['engine'],prefix+'backend')
        require(before['diagnostics']['wasmActive']==(entry['engine']=='prepared-wasm'),prefix+'Wasm backend')
        if entry['engine']=='prepared-wasm' and not idle: require(deltas['wasmCalls']>0 or deltas['preparedWasmCalls']>0,prefix+'actual Wasm work')
    else: require(entry['engine']=='original',prefix+'missing candidate diagnostics')
    require(load(directory+'/errors.json')==[] and load(directory+'/integrity.json')['unchanged'],prefix+'close/integrity errors')
    record={k:entry[k] for k in ['scenario','label','engine','round','purpose','directory']}
    record.update(cpu=cpu,rafIntervals=intervals,callbackStartIntervals=arrivals,blocksP50=blocks,ownToleranceMs=ownTolerance,ownBlockFailures=ownBlockFailures,clockIncrementMs=inc,armingRows=len(arming),phase=phase,counterDeltas=deltas,renderFrameDelta=renderDelta,wallCaptureMs=after['at']-before['at'],viewportCpu=stats([p['viewport'] for p in measured]),timelineCpu=stats([p['timeline'] for p in measured]))
    runs.append(record);fingerprints.append({'file':directory+'/raw-callbacks.json','sha256':sha(directory+'/raw-callbacks.json')})
scenarios=[]
for name in [x['id'] for x in m['cases']]+[m['idleCase']['id']]:
    group=[x for x in runs if x['scenario']==name];original=[x for x in group if x['engine']=='original'];balanced=[x for x in group if x['purpose']=='balanced']
    median=quantile([x['cpu']['p50'] for x in original],.5);tolerance=max(.05*median,4*max(x['clockIncrementMs'] for x in original))
    aa=[]
    for x in original:
        aa.append({'directory':x['directory'],'purpose':x['purpose'],'runFailure':abs(x['cpu']['p50']-median)>tolerance,'blockFailures':sum(abs(b-x['cpu']['p50'])>tolerance for b in x['blocksP50'])})
    engines={}
    for engine in ['original','prepared-js','prepared-wasm']:
        group=[x for x in balanced if x['engine']==engine]
        med=lambda key:{q:quantile([x[key][q] for x in group],.5) for q in ['p50','p95','p99']}
        ranges={k:[min(x['counterDeltas'][k] for x in group),max(x['counterDeltas'][k] for x in group)] for k in counterkeys} if engine!='original' else None
        engines[engine]={'runs':len(group),'medianRunCpuMs':med('cpu'),'medianRunRafIntervalMs':med('rafIntervals'),'medianRunCallbackStartIntervalMs':med('callbackStartIntervals'),'p50RangeMs':[min(x['cpu']['p50'] for x in group),max(x['cpu']['p50'] for x in group)],'ownBlockFailingRuns':sum(x['ownBlockFailures']>0 for x in group),'ownFailingBlocks':sum(x['ownBlockFailures'] for x in group),'counterDeltaRanges':ranges,'renderFrameDeltaRange':[min(x['renderFrameDelta'] for x in group),max(x['renderFrameDelta'] for x in group)],'viewportP50Median':quantile([x['viewportCpu']['p50'] for x in group],.5),'timelineP50Median':quantile([x['timelineCpu']['p50'] for x in group],.5)}
    result={'scenario':name,'engines':engines,'aa':{'originalRunsIncludingBookends':len(original),'allOriginalMedianP50Ms':median,'sceneToleranceMs':tolerance,'runFailures':sum(x['runFailure'] for x in aa),'blockFailingRuns':sum(x['blockFailures']>0 for x in aa),'failingBlocks':sum(x['blockFailures'] for x in aa),'totalBlocks':4*len(aa),'details':aa}}
    result['observedAbsoluteDeltasMs']={label:{q:engines[a]['medianRunCpuMs'][q]-engines[b]['medianRunCpuMs'][q] for q in ['p50','p95','p99']} for label,a,b in [('js-original','prepared-js','original'),('wasm-original','prepared-wasm','original'),('wasm-js','prepared-wasm','prepared-js')]}
    expected=next(x for x in published['scenarios'] if x['scenario']==name)
    require(expected['aa']['passes']==(result['aa']['runFailures']==0 and result['aa']['failingBlocks']==0),name+': aggregate A/A result')
    for engine,value in engines.items():
        for q,cost in value['medianRunCpuMs'].items():require(near(cost,expected['engines'][engine]['medianRunCpu'][q]),name+': published aggregate CPU')
    scenarios.append(result)
before=load('environment-before/runner.json');after=load('environment-after/runner.json')
for key in ['platform','release','arch','cpuModel','logicalCpus','totalMemory','browserPath','node','macos','hardware','graphics','powerSettings']:require(before[key]==after[key],'Host environment changed: '+key)
require(before['power']['available'] and after['power']['available'] and 'AC Power' in before['power']['output'] and 'AC Power' in after['power']['output'],'Before/after AC power')
output={'status':'passed' if not errors else 'failed','errors':errors,'method':'Independent Python recalculation from every raw callback file, linear-interpolated quantiles, independent modulo phase checks; no browser or benchmark rerun. Absolute differences are observations, not stable speedup percentages.','toolingSha':m['tooling']['sha'],'candidateSha':m['candidateSha'],'appPins':m['sourceBefore']['apps'],'runCount':len(runs),'oracleCount':len(m['oracles']),'continuousRuns':sum(x['phase'] is not None for x in runs),'idleRuns':sum(x['phase'] is None for x in runs),'scenarios':scenarios,'environment':{'before':before,'after':after,'browserVersion':m['browser']['version'],'executablePath':m['browser']['executablePath'],'actualGpu':m['browser']['protocolMetadata']['systemInfo']['value']['gpu']['devices'],'browserLaunchHasSwiftShaderPermissionFlag':any('swiftshader' in a.lower() for a in m['browser']['protocolMetadata']['commandLine']['value']['arguments']),'actualWebGLHardwareInEveryRun':True,'scopeNote':'Chrome launch permits SwiftShader fallback, but the per-run observed renderer and browser GPU are Apple M4 Pro ANGLE Metal. The permission flag is not the measured backend.'},'runs':runs,'inputHashes':{'manifest':sha('manifest.json'),'analysis':sha('analysis.json'),'rawFiles':fingerprints}}

# Recreate the complete condition record from the first actual run of each case.
case_conditions=[]
for case in scenarios:
    selected=[x for x in runs if x['scenario']==case['scenario']]
    setup=load(selected[0]['directory']+'/setup.json')
    phases=[x['phase'] for x in selected if x['phase'] is not None]
    case_conditions.append({
        'scenario':case['scenario'],
        'canvas':[setup['environment']['width'],setup['environment']['height']],
        'css':[setup['environment']['cssWidth'],setup['environment']['cssHeight']],
        'rendererDpr':setup['environment']['rendererPixelRatio'],
        'quality':setup['environment']['quality'], 'sceneSetup':setup['sceneSetup'],
        'wallCaptureRangeMs':[min(x['wallCaptureMs'] for x in selected),max(x['wallCaptureMs'] for x in selected)],
        'phaseMaxErrorSeconds':max((p['maxCircularErrorSeconds'] for p in phases),default=None),
        'phaseMixerAdvanceRangeSeconds':[min(p['mixerAdvanceSeconds'] for p in phases),max(p['mixerAdvanceSeconds'] for p in phases)] if phases else None,
        'clockIncrementRangeMs':[min(x['clockIncrementMs'] for x in selected),max(x['clockIncrementMs'] for x in selected)]
    })
output['caseConditions']=case_conditions

# Compare every unmodified/overlay route and frozen pose directly with its
# original-unmodified reference, including the actual stored PNG bytes.
oracle_errors=[]
oracle_records=[]
def oracle_require(ok, message):
    if not ok:
        oracle_errors.append(message)
        errors.append(message)
for case in m['cases']+[m['idleCase']]:
    reference='oracles/'+case['id']+'/original-unmodified'
    for item in [x for x in m['oracles'] if x['scenario']==case['id']]:
        directory=item['directory']
        oracle_require(load(directory+'/errors.json')==[],directory+': browser errors')
        oracle_require(load(directory+'/integrity.json')['unchanged'],directory+': source integrity')
        for time in ([0] if case.get('idle') else [.25,.75]):
            filename=f'pose-{time}.json'
            expected=load(reference+'/'+filename)
            actual=load(directory+'/'+filename)
            for key in ['pixelSha256','width','height','selected','objects','passes','history','quality','timeline']:
                oracle_require(actual[key]==expected[key],directory+'/'+filename+': '+key)
            oracle_require(len(actual['numeric'])==len(expected['numeric']),directory+'/'+filename+': numeric length')
            maxerror=0
            for index,(x,y) in enumerate(zip(actual['numeric'],expected['numeric'])):
                if not (finite(x) and finite(y)):
                    oracle_require(False,directory+'/'+filename+': nonfinite numeric value '+str(index))
                    continue
                maxerror=max(maxerror,abs(x-y))
                oracle_require(abs(x-y)<=1e-10+1e-12*abs(y),directory+'/'+filename+': numeric tolerance '+str(index))
            png=f'pose-{time}.png'
            pnghash=sha(directory+'/'+png)
            oracle_require(pnghash==sha(reference+'/'+png),directory+'/'+png+': PNG bytes differ')
            oracle_records.append({'directory':directory,'pose':time,'numericValues':len(actual['numeric']),'maxAbsoluteError':maxerror,'rawPixelSha256':actual['pixelSha256'],'pngSha256':pnghash})
require(len(oracle_records)==42,'Expected 42 frozen-pose records')
output['oracleIndependentCheck']={'pages':len(m['oracles']),'poseRecords':len(oracle_records),'errors':oracle_errors,'records':oracle_records}
output['verdict']='Observed candidate callback costs are higher than original in every continuous condition, and no Rust benefit over matched JS is established. Prepared rendering never activates for this feature-preserving workload. Original A/A block gates fail in all continuous conditions; do not report stable performance percentages, FPS gains, or an exact causal allocation of the regression. This supports a bounded negative adoption verdict for this candidate and app path, not a rejection of Rust ownership generally.'

# Hash the original environment records before preparing a public copy.
output['inputHashes']['environmentBefore']=sha('environment-before/runner.json')
output['inputHashes']['environmentAfter']=sha('environment-after/runner.json')
redaction_count=0
battery_id=re.compile(r'(InternalBattery-\d+\s*\(id=)\d+(\))')
def normalize_metadata(value):
    global redaction_count
    if isinstance(value,str):
        value,count=battery_id.subn(r'\1<redacted>\2',value)
        redaction_count+=count
        return value
    if isinstance(value,list): return [normalize_metadata(item) for item in value]
    if isinstance(value,dict): return {key:normalize_metadata(item) for key,item in value.items()}
    return value
output['environment']=normalize_metadata(output['environment'])
output['normalization']={
    'scope':'Metadata-only public copy: digits in InternalBattery-N (id=...) become <redacted>; the battery index, AC source, charge, power settings and all measured quantities are unchanged.',
    'batteryIdentifiersRedacted':redaction_count,
    'originalInputsModified':False,
    'inputHashScope':'Every inputHashes digest is SHA-256 of original raw file bytes before metadata normalization; no digest describes a normalized replacement.'
}
output['status']='passed' if not errors else 'failed'
if errors:
    output['verdict']='Audit failed. Do not rely on a performance or correctness verdict until the listed evidence mismatches are resolved.'
output_file.write_text(json.dumps(output,indent=2)+'\n')
print(json.dumps({'status':output['status'],'runs':len(runs),'oraclePages':len(m['oracles']),'poseRecords':len(oracle_records),'errors':errors,'normalization':output['normalization']},indent=2))
sys.exit(1 if errors else 0)
