#!/usr/bin/env python3
"""Generate source-derived ownership progress and its observed history."""
import argparse
from datetime import datetime, timezone
from html import escape
import hashlib
import json
import math
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
COLORS = {'js': '#6e7681', 'rust-batch': '#d29922', 'rust': '#58a6ff', 'rust-owned': '#2ea043'}
BASE = 'https://github.com/postmelee/three.rust/'
STYLE = 'body{background:#0d1117;color:#f0f6fc;font:16px/1.5 system-ui,sans-serif;max-width:1200px;margin:auto;padding:24px}a{color:#58a6ff}h1{border-bottom:1px solid #30363d;padding-bottom:12px}svg{width:100%;height:auto}table{width:100%;border-collapse:collapse;margin:18px 0}th,td{border:1px solid #30363d;padding:5px 8px;text-align:left;overflow-wrap:anywhere}caption{text-align:left;font-weight:bold}details{margin:10px 0}summary{cursor:pointer}li{overflow-wrap:anywhere}.muted{color:#b1bac4}@media(max-width:600px){body{padding:12px;font-size:13px}th,td{padding:4px}}'


def summarize(rules, source=None):
    source = source or json.loads((ROOT/'docs/progress-source.json').read_text())
    if rules['schemaVersion'] != 3 or source['schemaVersion'] != 3:
        raise ValueError('Unknown inventory schema')
    result = {'schemaVersion': 3, 'sourceRef': rules['sourceRef'], 'upstream': source['upstream'], 'pipeline': rules['pipeline']}
    seen = set()
    for panel, overrides, allowed in [('functions','computeOverrides',{'js','rust-batch','rust'}), ('state','stateOverrides',{'js','rust-owned'})]:
        groups = []
        ids = {item['id'] for g in source[panel] for item in g['items']}
        if not set(rules[overrides]).issubset(ids):
            raise ValueError('Ownership mapping references a missing source item')
        for group in source[panel]:
            items = []
            for item in group['items']:
                if panel+item['id'] in seen:
                    raise ValueError('Duplicate source item')
                seen.add(panel+item['id'])
                mapping = rules[overrides].get(item['id'], {})
                state = mapping.get('status', 'js')
                if state not in allowed:
                    raise ValueError('Invalid ownership state')
                if state != 'js' and not mapping.get('evidence'):
                    raise ValueError('Rust claims require evidence')
                for evidence in mapping.get('evidence', []):
                    path = (ROOT/evidence).resolve()
                    if not path.is_relative_to(ROOT) or not path.is_file():
                        raise ValueError('Missing evidence')
                items.append({**item, **mapping, 'status': state})
            groups.append({**group, 'items': items, 'total': len(items), 'counts': {state: sum(i['status']==state for i in items) for state in sorted(allowed)}})
        result[panel] = {'groups': groups, 'total': sum(g['total'] for g in groups), 'counts': {state: sum(g['counts'][state] for g in groups) for state in sorted(allowed)}}
    result['inventoryHash'] = hashlib.sha256(json.dumps({'source':source,'rules':rules},sort_keys=True).encode()).hexdigest()
    return result


def layout(groups, x, y, width, height):
    """Split the ordered groups near half their weight along the longer side."""
    if len(groups) == 1:
        return [(groups[0], x, y, width, height)]
    total = sum(g['total'] for g in groups)
    cut = min(range(1, len(groups)), key=lambda i: abs(sum(g['total'] for g in groups[:i]) - total / 2))
    fraction = sum(g['total'] for g in groups[:cut]) / total
    if width >= height:
        a = width * fraction
        return layout(groups[:cut], x, y, a, height) + layout(groups[cut:], x+a, y, width-a, height)
    a = height * fraction
    return layout(groups[:cut], x, y, width, a) + layout(groups[cut:], x, y+a, width, height-a)


def svg_text(x, y, text, size=15, extra=''):
    return f'<text x="{x:.2f}" y="{y:.2f}" font-size="{size}" {extra}>{escape(text)}</text>'


def render_svg(data):
    parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="710" viewBox="0 0 1200 710" role="img" aria-labelledby="title desc">',
             '<title id="title">three.rust — computation and persistent state ownership</title>',
             '<desc id="desc">Current: JS owns state and animation, a conditional Rust batch computes transforms, and JS prepares bone palettes. Target: one persistent Rust domain owns scene state, animation, transforms and palettes. Fine tiles below represent pinned upstream callable definitions and declared fields.</desc>',
             '<rect width="1200" height="710" fill="#0d1117"/><g font-family="Arial, sans-serif" fill="#f0f6fc">',
             svg_text(16, 27, 'From isolated Rust computation to a persistent Rust-owned pipeline', 23),
             svg_text(16, 53, 'CURRENT — public state remains in JavaScript', 13)]
    for i, stage in enumerate(data['pipeline']):
        x=16+i*236
        color=COLORS['rust-batch'] if i==2 else COLORS['js']
        parts.append(f'<rect x="{x}" y="65" width="220" height="49" fill="#161b22" stroke="{color}"/>')
        parts += [svg_text(x+8,85,stage['name'],14),svg_text(x+8,103,stage['current'],12)]
        if i<4:
            parts.append(svg_text(x+222,94,'→',16))
    parts.append(svg_text(16,140,'TARGET — one command batch → persistent Rust state + consecutive CPU stages → final buffers (not implemented)',13))
    parts.append('<rect x="16" y="151" width="928" height="52" fill="#102019" stroke="#2ea043" stroke-width="2" stroke-dasharray="6 4"/>')
    for i,stage in enumerate(data['pipeline']):
        x=16+i*236
        if i==4:
            parts.append(f'<rect x="{x}" y="151" width="220" height="52" fill="#161b22" stroke="#6e7681"/>')
        parts += [svg_text(x+8,172,stage['name'],14),svg_text(x+8,190,stage['target'],12)]
        if i<4:
            parts.append(svg_text(x+222,181,'→',16))
    titles={'functions':f'CPU functions: {data["functions"]["counts"]["rust-batch"]} conditional Rust route / {data["functions"]["total"]} tracked',
            'state':f'State fields: {data["state"]["counts"]["rust-owned"]} / {data["state"]["total"]} Rust-owned'}
    for panel,left in [('functions',16),('state',612)]:
        parts.append(svg_text(left,240,titles[panel],18))
        groups=sorted(data[panel]['groups'],key=lambda g:(-g['total'],g['id']))
        for group,x,y,w,h in layout(groups,left,256,572,355):
            gid=panel+'-'+group['id']
            parts.append(f'<g><title>{escape(group["name"])} — {group["total"]} declared items</title>')
            # Every visible cell represents exactly one actual source definition.
            n=group['total']; rows=max(1,min(n,round(math.sqrt(n*h/w))))
            offset=0
            for row in range(rows):
                count=n//rows+int(row<n%rows);cw=(w-3)/count;ch=(h-3)/rows
                for col in range(count):
                    item=group['items'][offset];offset+=1
                    cx=x+1.5+col*cw;cy=y+1.5+row*ch
                    parts.append(f'<rect data-item="{escape(item["id"])}" data-panel="{panel}" x="{cx:.2f}" y="{cy:.2f}" width="{max(.1,cw-.65):.2f}" height="{max(.1,ch-.65):.2f}" fill="{COLORS[item["status"]]}"><title>{escape(item["name"])} — {item["status"]}; {escape(item["path"])}:{item["line"]}</title></rect>')
            parts.append(f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" fill="none" stroke="#0d1117" stroke-width="2"/>')
            if w>42 and h>18:
                label=group['name'][:max(3,int((w-8)/7))]
                parts.append(svg_text(x+4,y+15,label,12,'stroke="#0d1117" stroke-width="3" paint-order="stroke"'))
            parts.append('</g>')
    for x,state,label in [(16,'js','JavaScript execution / state'),(315,'rust-batch','Rust batch; JS authority'),(602,'rust','Rust function'),(802,'rust-owned','Persistent Rust authority')]:
        parts.append(f'<rect x="{x}" y="635" width="12" height="12" fill="{COLORS[state]}"/>')
        parts.append(svg_text(x+20,646,label,14))
    parts.append(svg_text(16,676,'One cell = one known source function or state field. A Rust cache is not authoritative state.',14))
    parts.append(svg_text(16,698,'Counts describe the selected r186 source inventory; they are not speed, effort, or complete Three.js compatibility.',13))
    return '\n'.join(parts+['</g></svg>'])+'\n'


def shell(title,body):
    return f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{escape(title)}</title><style>{STYLE}</style></head><body>{body}</body></html>\n'


def render_html(data):
    base=BASE+'blob/'+data['sourceRef']+'/'
    parts=['<h1>Ownership progress</h1>',render_svg(data),'<p><a href="history.html">Progress history</a> · <a href="progress.json">Raw data</a> · <a href="'+base+'docs/PROGRESS.md">Counting rules</a></p>']
    for panel,title,statuses in [('functions','Known CPU callable definitions',['js','rust-batch','rust']),('state','Known scene and animation state fields',['js','rust-owned'])]:
        p=data[panel]
        parts.append(f'<table id="{panel}"><caption>{title}</caption><thead><tr><th>Source group</th>'+''.join(f'<th>{s}</th>' for s in statuses)+'<th>Total</th></tr></thead><tbody>')
        for g in p['groups']:
            parts.append(f'<tr><th><a href="#{panel}-{g["id"]}">{escape(g["name"])}</a></th>'+''.join(f'<td>{g["counts"][s]}</td>' for s in statuses)+f'<td>{g["total"]}</td></tr>')
        parts.append('</tbody><tfoot><tr><th>Total</th>'+''.join(f'<td>{p["counts"][s]}</td>' for s in statuses)+f'<td>{p["total"]}</td></tr></tfoot></table>')
    parts.append('<p>State fields are inventoried independently of computation. Public metadata and callbacks may remain in JS by design. No 100% Rust target is implied for every declaration. Unsupported custom transform dispatch retains the documented JS path.</p><h2>Definitions and evidence</h2>')
    for panel in ['functions','state']:
        for g in data[panel]['groups']:
            parts.append(f'<details id="{panel}-{g["id"]}"><summary>{escape(g["name"])} — {g["total"]} {panel}</summary><ul>')
            for item in g['items']:
                src='https://github.com/mrdoob/three.js/blob/'+data['upstream']['commit']+'/src/'+item['path']+'#L'+str(item['line'])
                links='; '.join(f'<a href="{base}{escape(e)}">{escape(e)}</a>' for e in item.get('evidence',[]))
                parts.append(f'<li><a href="{src}">{escape(item["name"])}</a>: <strong>{item["status"]}</strong> {escape(item.get("note",""))} {links}</li>')
            parts.append('</ul></details>')
    return shell('three.rust ownership progress','\n'.join(parts))


def validate_history(history):
    if history['schemaVersion']!=1:
        raise ValueError('Unknown history schema')
    keys=set()
    for obs in history['observations']:
        if not re.fullmatch('[a-f0-9]{40}',obs['implementationCommit']):
            raise ValueError('History requires a full implementation commit')
        datetime.fromisoformat(obs['recordedAt'].replace('Z','+00:00'))
        key=(obs['recordedAt'],obs['schemaVersion'])
        if key in keys:
            raise ValueError('Duplicate history observation')
        keys.add(key)
        if obs['schemaVersion'] not in [2,3]:
            raise ValueError('Unknown observation scheme')
        if obs['schemaVersion']==3:
            for p in ['functions','state']:
                counts=obs['counts'][p]
                if sum(counts['states'].values())!=counts['total'] or any(v<0 for v in counts['states'].values()):
                    raise ValueError('History count mismatch')
    return history


def record(history,data,commit):
    if not re.fullmatch('[a-f0-9]{40}',commit):
        raise ValueError('Use the full observed implementation commit')
    if any(o.get('inventoryHash')==data['inventoryHash'] and o['implementationCommit']==commit for o in history['observations']):
        return
    history['observations'].append({'schemaVersion':3,'recordedAt':datetime.now(timezone.utc).isoformat(),'implementationCommit':commit,'label':'Source-derived computation and authority inventory','inventoryHash':data['inventoryHash'],'upstreamCommit':data['upstream']['commit'],'counts':{p:{'total':data[p]['total'],'states':data[p]['counts']} for p in ['functions','state']},'note':'New counting scheme; no engine port is implied by the denominator change.'})


def history_views(history):
    rows=[]
    for o in history['observations']:
        c=o['counts']
        values=(f'{c["cpu"]["done"]}/{c["cpu"]["total"]} curated capabilities; {c["evidence"]["done"]}/{c["evidence"]["total"]} evidence gates' if o['schemaVersion']==2 else f'{c["functions"]["states"]["rust-batch"]}/{c["functions"]["total"]} conditional Rust functions; {c["state"]["states"]["rust-owned"]}/{c["state"]["total"]} Rust-owned fields')
        rows.append((o['recordedAt'],str(o['schemaVersion']),o['implementationCommit'],values,o['note']))
    intro='Recorded observations only. Schema 2 counted curated capabilities; schema 3 counts source definitions and state fields. The two series are not comparable. A changed denominator is not a porting gain. No trend is inferred from a single observation.'
    md='# Progress history\n\n'+intro+'\n\n[Current ownership map](PROGRESS.md) · [Raw history](progress-history.json) · [HTML page](history.html)\n\n| Observation (UTC) | Scheme | Implementation | Counts | Note |\n|---|---|---|---|---|\n'
    html='<h1>Progress history</h1><p>'+intro+'</p><p><a href="progress.html">Current progress</a> · <a href="progress-history.json">Raw history</a></p><table><thead><tr><th>Observation (UTC)</th><th>Scheme</th><th>Implementation</th><th>Counts</th><th>Note</th></tr></thead><tbody>'
    for date,scheme,commit,values,note in rows:
        md+=f'| {date} | {scheme} | [{commit[:7]}]({BASE}commit/{commit}) | {values} | {note} |\n'
        html+=f'<tr><td>{escape(date)}</td><td>{scheme}</td><td><a href="{BASE}commit/{commit}">{commit[:7]}</a></td><td>{escape(values)}</td><td>{escape(note)}</td></tr>'
    html+='</tbody></table>'
    return md,shell('three.rust progress history',html)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    parser.add_argument('--record',metavar='IMPLEMENTATION_COMMIT',help='append a genuine observation of the stated implementation')
    args=parser.parse_args()
    if args.check and args.record:
        parser.error('--check cannot mutate history')
    data=summarize(json.loads((ROOT/'docs/progress-inventory.json').read_text()))
    history=validate_history(json.loads((ROOT/'docs/progress-history.json').read_text()))
    if args.record:
        record(history,data,args.record);validate_history(history)
        (ROOT/'docs/progress-history.json').write_text(json.dumps(history,indent=2)+'\n')
    md,html=history_views(history)
    outputs={'docs/progress.json':json.dumps(data,indent=2)+'\n','docs/progress.html':render_html(data),'docs/assets/progress.svg':render_svg(data),'docs/HISTORY.md':md,'docs/history.html':html}
    for name,content in outputs.items():
        p=ROOT/name
        if args.check:
            if not p.exists() or p.read_text()!=content:
                raise SystemExit(f'Stale output: {name}; run npm run docs:generate')
        else:
            p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
    print(f'Progress: {data["functions"]["total"]} source functions, {data["state"]["total"]} state fields; {len(history["observations"])} observed history records')


if __name__=='__main__':
    main()
