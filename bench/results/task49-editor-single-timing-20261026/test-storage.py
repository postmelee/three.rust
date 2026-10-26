"""Focused index resolver checks; no mutation of public evidence."""
import importlib.util,json,sys,copy
from pathlib import Path
sys.dont_write_bytecode=True
root=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('timing_verifier',root/'verify.py')
v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
i=json.loads((root/'archive-index.json').read_text());seen={};alias=None
for e in i['files']:
 if e['storage'] in seen:alias=(seen[e['storage']],e);break
 seen[e['storage']]=e
assert alias and alias[0]['path']!=alias[1]['path']
assert v.located(alias[0]['path'])==v.located(alias[1]['path'])
assert v.payload(alias[0]['path'])==v.payload(alias[1]['path'])
e=next(e for e in i['files'] if e['path'].endswith('.json.gz'))
assert v.payload(e['path'][:-3])==v.payload(e['path'])
def rejected(f):
 try:f()
 except AssertionError:return
 raise AssertionError('Unsafe storage entry was accepted')
x=copy.deepcopy(e);x['storage']='../escape.gz';rejected(lambda:v.entry_path(x))
x=copy.deepcopy(e);x['sha256']='0'*64;rejected(lambda:v.entry_path(x))
x=copy.deepcopy(e);x['path']='../escape.json';rejected(lambda:v.entry_path(x))
print(json.dumps({'status':'passed','checks':['distinct logical aliases retain exact shared bytes','logical gzip lookup','storage traversal rejected','stored digest/path mismatch rejected','logical traversal rejected'],'count':5}))
