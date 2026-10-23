#!/usr/bin/env python3
"""Build an allowlisted public status site from committed daily inventories."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import shutil
import subprocess
import progress


def git(*args):
    return subprocess.check_output(['git', *args], cwd=progress.ROOT, stderr=subprocess.DEVNULL).decode().strip()


def committed_history(ref, main=False):
    head=git('rev-parse', ref)
    if main and head!=git('rev-parse','origin/main'):
        raise ValueError('Main publication must build the fetched origin/main commit')
    latest={}
    for line in git('log','--first-parent','--format=%H %ct',head).splitlines():
        commit,timestamp=line.split();dt=datetime.fromtimestamp(int(timestamp),timezone.utc)
        latest.setdefault(dt.date().isoformat(),(commit,dt))
    # Retain genuine legacy observations, without plotting them as source coverage.
    old=json.loads(git('show',f'{head}:docs/progress-history.json'))
    observations=[o for o in old['observations'] if o['schemaVersion']==2]
    for day,(commit,dt) in sorted(latest.items()):
        try:
            data=json.loads(git('show',f'{commit}:docs/progress.json'))
        except subprocess.CalledProcessError:
            continue
        if data.get('schemaVersion')!=3:
            continue
        observations.append({'schemaVersion':3,'recordedAt':dt.isoformat(),'implementationCommit':commit,'label':'Committed daily inventory','inventoryHash':data['inventoryHash'],'upstreamCommit':data['upstream']['commit'],'counts':{p:{'total':data[p]['total'],'states':data[p]['counts']} for p in ['functions','state']},'note':'Last first-parent commit of this UTC day; counts read from its committed schema-3 inventory.'})
    return progress.validate_history({'schemaVersion':1,'source':'main-commits' if main else 'preview-commits','head':head,'observations':observations})


def build(out,ref='HEAD',main=False):
    if out.exists():
        raise ValueError('Choose a fresh site output directory')
    history=committed_history(ref,main)
    out.mkdir(parents=True)
    # No repository dump, environment metadata, downloaded assets or engine binaries.
    for name in ['progress.html','progress.json','assets/progress.svg']:
        target=out/name;target.parent.mkdir(parents=True,exist_ok=True)
        target.write_text(git('show',f"{history['head']}:docs/{name}")+'\n')
    shutil.copyfile(out/'progress.html',out/'index.html')
    _,html=progress.history_views(history)
    (out/'history.html').write_text(html)
    (out/'progress-history.json').write_text(json.dumps(history,indent=2)+'\n')
    (out/'history.json').write_text(json.dumps(history,indent=2)+'\n')
    (out/'assets/history.svg').write_text(progress.history_chart(history)+'\n')
    (out/'.nojekyll').write_text('')
    (out/'site-build.json').write_text(json.dumps({'commit':history['head'],'source':history['source'],'dailyPoints':len(progress.daily_history(history))},indent=2)+'\n')
    print(f'Status site: {out}; {len(progress.daily_history(history))} real daily points')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('out',type=Path);parser.add_argument('--ref',default='HEAD');parser.add_argument('--main',action='store_true')
    args=parser.parse_args();build(args.out,args.ref,args.main)
