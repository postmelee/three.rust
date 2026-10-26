"""Mutation checks for the offline verifier, using a preserved full-run input."""
from pathlib import Path
import importlib.util,json,copy,sys
sys.dont_write_bytecode=True
root=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('audit_verifier',root/'verify.py')
v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
m=v.read('full/manifest.json');entry=m['runs'][0];directory='full/'+entry['directory']
raw=v.read(directory+'/raw-callbacks.json');pairs=v.read(directory+'/measured-pairs.json')
setup=v.read(directory+'/setup.json');summary=v.read(directory+'/summary.json');scenario=m['cases'][0]
v.phase_consistency(pairs,raw['before']['action']['duration']);success=[]
def rejected(name,fn):
 try:fn()
 except AssertionError:success.append(name)
 else:raise AssertionError('Mutation escaped: '+name)
x=copy.deepcopy(pairs)
for item in x:item['actionTime']=x[0]['actionTime']
rejected('frozen action',lambda:v.phase_consistency(x,raw['before']['action']['duration']))
x=copy.deepcopy(pairs);x[7]['clipDuration']+=.1
rejected('changed clip duration',lambda:v.phase_consistency(x,raw['before']['action']['duration']))
x=copy.deepcopy(pairs);x[7]['mixerTime']=x[6]['mixerTime']
rejected('nonadvancing mixer',lambda:v.phase_consistency(x,raw['before']['action']['duration']))
x=copy.deepcopy(raw);del x['rows'][:7]
rejected('missing callback',lambda:v.reconstruct(x,scenario,setup,summary,pairs,'full'))
x=copy.deepcopy(raw);x['rows'][:0]=x['rows'][:7]
rejected('duplicate callback',lambda:v.reconstruct(x,scenario,setup,summary,pairs,'full'))
x=copy.deepcopy(raw);x['rows'][9]=x['rows'][2];x['rows'][10]=x['rows'][3]
rejected('overlapping callbacks',lambda:v.reconstruct(x,scenario,setup,summary,pairs,'full'))
x=copy.deepcopy(pairs);x[7]['cpu']+=.1
rejected('altered measured CPU',lambda:v.reconstruct(raw,scenario,setup,summary,x,'full'))
result={'originalPhaseAccepted':True,'rejectedMutations':success,'count':len(success)}
assert result==json.loads((root/'verifier-mutation-checks.json').read_text())
print(json.dumps(result))
