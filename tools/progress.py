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
             '<desc id="desc">The compatibility facade retains JS authority. The explicit owned rig API retains animation, transforms and palettes in Rust. Fine tiles map scoped computation and logical state to pinned upstream declarations; ordinary JS methods and objects remain JS.</desc>',
             '<rect width="1200" height="710" fill="#0d1117"/><g font-family="Arial, sans-serif" fill="#f0f6fc">',
             svg_text(16, 27, 'Computation and authority: compatibility facade and owned rig pipeline', 23),
             svg_text(16, 53, 'COMPATIBILITY FACADE — public objects remain authoritative in JavaScript', 13)]
    for i, stage in enumerate(data['pipeline']):
        x=16+i*236
        color=COLORS['rust-batch'] if i==2 else COLORS['js']
        parts.append(f'<rect x="{x}" y="65" width="220" height="49" fill="#161b22" stroke="{color}"/>')
        parts += [svg_text(x+8,85,stage['name'],14),svg_text(x+8,103,stage['current'],12)]
        if i<4:
            parts.append(svg_text(x+222,94,'→',16))
    parts.append(svg_text(16,140,'EXPLICIT OWNED API — commands → persistent Rust rig state + animation + transforms → final palettes',13))
    parts.append('<rect x="16" y="151" width="928" height="52" fill="#102019" stroke="#2ea043" stroke-width="2"/>')
    for i,stage in enumerate(data['pipeline']):
        x=16+i*236
        if i==4:
            parts.append(f'<rect x="{x}" y="151" width="220" height="52" fill="#161b22" stroke="#6e7681"/>')
        parts += [svg_text(x+8,172,stage['name'],14),svg_text(x+8,190,stage['target'],12)]
        if i<4:
            parts.append(svg_text(x+222,181,'→',16))
    titles={'functions':f'CPU functions: {data["functions"]["counts"]["rust-batch"]} scoped Rust mappings / {data["functions"]["total"]} tracked',
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
    for x,state,label in [(16,'js','JavaScript execution / state'),(315,'rust-batch','Scoped Rust computation'),(602,'rust','Rust computation'),(802,'rust-owned','Owned API: Rust state')]:
        parts.append(f'<rect x="{x}" y="635" width="12" height="12" fill="{COLORS[state]}"/>')
        parts.append(svg_text(x+20,646,label,14))
    parts.append(svg_text(16,676,'One cell = one source definition or logical field mapping. Scoped owned API claims are not ordinary JS API ports.',14))
    parts.append(svg_text(16,698,'Counts describe the selected r186 source inventory; they are not speed, effort, or complete Three.js compatibility.',13))
    return '\n'.join(parts+['</g></svg>'])+'\n'


def shell(title,body):
    return f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{escape(title)}</title><style>{STYLE}</style></head><body>{body}</body></html>\n'


GATE_STATES = {'open': 'Not yet', 'early': 'Early evidence', 'qualified': 'Qualified'}


def validate_goals(goals):
    if goals['schemaVersion'] != 1 or goals['apiTier'] != 'application-replacement':
        raise ValueError('Unknown adoption schema or API tier')
    ids = set()
    for gate in goals['gates']:
        if gate['id'] in ids or gate['status'] not in GATE_STATES:
            raise ValueError('Duplicate gate or unknown state')
        ids.add(gate['id'])
        for evidence in gate['evidence']:
            p = (ROOT / evidence).resolve()
            if not p.is_relative_to(ROOT) or not p.is_file():
                raise ValueError('Missing adoption evidence')
        if gate['status'] == 'qualified':
            q = gate.get('qualification', {})
            if (q.get('profile') != goals['profile'] or q.get('apiTier') != goals['apiTier']
                or q.get('report') not in gate['evidence']
                or not re.fullmatch('[a-f0-9]{40}', q.get('implementationCommit', ''))):
                raise ValueError('Qualified gate requires matching profile/tier, report and pinned implementation')
    if len(ids) != 6:
        raise ValueError('Adoption profile must declare six gates')
    return goals


def read_goals():
    return validate_goals(json.loads((ROOT/'docs/product-goals.json').read_text()))


def readme_goals(goals):
    source = (ROOT/'README.md').read_text()
    start, end = '<!-- adoption-goals:start -->', '<!-- adoption-goals:end -->'
    if source.count(start) != 1 or source.count(end) != 1 or source.index(start) >= source.index(end):
        raise ValueError('README requires one adoption-goals marker pair')
    lines = ['| Product gate | Target | Current status |', '|---|---|---|']
    def cell(value):
        return escape(value).replace('|', '&#124;').replace('\n', ' ')
    for gate in goals['gates']:
        label = GATE_STATES[gate['status']]
        lines.append('| '+ ' | '.join(cell(v) for v in [gate['title'],gate['target'],label])+' |')
    return source[:source.index(start)+len(start)]+'\n'+'\n'.join(lines)+'\n'+source[source.index(end):]


def readiness_html(goals, base):
    parts = ['<section aria-labelledby="adoption-heading"><h2 id="adoption-heading">Product goals</h2>',
             '<p><strong>'+escape(goals['stage'])+' — '+escape(goals['claim'])+'</strong></p>',
             '<p><a href="'+base+goals['contract']+'">Product goals and qualification budgets</a> · <a href="'+base+'docs/product-goals.json">Declared gates</a></p>',
             '<p>Early evidence is not qualification. These gates describe application replacement; an explicit accelerator has a separate migration contract. Source ownership is implementation evidence, not product completion.</p>',
             '<table id="adoption-gates"><caption>Application replacement: prospective targets and current evidence</caption><thead><tr><th>Gate / target</th><th>Status / current evidence</th></tr></thead><tbody>']
    for gate in goals['gates']:
        label = GATE_STATES[gate['status']]
        links = ' · '.join('<a href="'+base+escape(e)+'">Evidence '+str(i+1)+'</a>' for i,e in enumerate(gate['evidence']))
        parts.append('<tr><th>'+escape(gate['title'])+'<br><small>'+escape(gate['target'])+'</small></th><td><strong>'+label+'</strong><br>'+escape(gate['current'])+'<br>'+links+'</td></tr>')
    parts.append('</tbody></table></section>')
    return '\n'.join(parts)


def render_html(data):
    base=BASE+'blob/'+data['sourceRef']+'/'
    parts=['<h1>Ownership progress</h1>',render_svg(data),'<p><a href="history.html">Progress history</a> · <a href="progress.json">Raw data</a> · <a href="'+base+'docs/PROGRESS.md">Counting rules</a></p>']
    parts.append('<p>The goal is a useful Three.js replacement with little application change. This map tracks implementation; <a href="#adoption-heading">product goals and current evidence</a> are listed separately below.</p>')
    for panel,title,statuses in [('functions','Known CPU callable definitions',['js','rust-batch','rust']),('state','Known scene and animation state fields',['js','rust-owned'])]:
        p=data[panel]
        parts.append(f'<table id="{panel}"><caption>{title}</caption><thead><tr><th>Source group</th>'+''.join(f'<th>{s}</th>' for s in statuses)+'<th>Total</th></tr></thead><tbody>')
        for g in p['groups']:
            parts.append(f'<tr><th><a href="#{panel}-{g["id"]}">{escape(g["name"])}</a></th>'+''.join(f'<td>{g["counts"][s]}</td>' for s in statuses)+f'<td>{g["total"]}</td></tr>')
        parts.append('</tbody><tfoot><tr><th>Total</th>'+''.join(f'<td>{p["counts"][s]}</td>' for s in statuses)+f'<td>{p["total"]}</td></tr></tfoot></table>')
    parts.append(readiness_html(read_goals(),base))
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


def daily_history(history):
    """Last genuine schema-3 observation per UTC day; legacy rows stay separate."""
    points = {}
    for observation in sorted(history['observations'], key=lambda o:datetime.fromisoformat(o['recordedAt'].replace('Z','+00:00'))):
        if observation['schemaVersion'] == 3:
            day = datetime.fromisoformat(observation['recordedAt'].replace('Z','+00:00')).astimezone(timezone.utc).date().isoformat()
            points[day] = {**observation, 'day': day}
    return list(sorted(points.values(), key=lambda o:o['day']))


def history_chart(history):
    points = daily_history(history)
    if not points:
        return '<p>No comparable source-derived observations yet.</p>'
    from datetime import date
    days = [date.fromisoformat(p['day']).toordinal() for p in points]
    left, right, width = 70, 920, 1200
    xs = [((left+right)/2 if days[0]==days[-1] else left+(d-days[0])/(days[-1]-days[0])*(right-left)) for d in days]
    panels = [('functions','CPU callable definitions',[('rust','Rust computation','#58a6ff'),('rust-batch','Conditional Rust','#d29922')]),('state','Persistent state authority',[('rust-owned','Rust authority','#2ea043')])]
    svg = ['<svg xmlns="http://www.w3.org/2000/svg" data-role="history-chart" viewBox="0 0 1200 520" role="img" aria-labelledby="history-title history-description">',
           '<title id="history-title">Computation and state ownership over time</title>',
           '<desc id="history-description">Two independently scaled panels. Solid colored series show Rust computation or state authority; the gray dashed series is the declared inventory. Conditional Rust computation is separate. Only genuine comparable observations are plotted.</desc>',
           '<rect width="1200" height="520" rx="6" fill="#0d1117"/><g fill="#f0f6fc" font-family="Arial,sans-serif" font-size="13">']
    for index,(panel,title,series) in enumerate(panels):
        offset=index*260; top=offset+64; bottom=offset+218
        peak=max(1,max(p['counts'][panel]['total'] for p in points))
        magnitude=10**math.floor(math.log10(peak));step=max(1,math.ceil(peak/magnitude/4)*magnitude);ceiling=math.ceil(peak/step)*step
        y=lambda value: bottom-value/ceiling*(bottom-top)
        svg.append(f'<g data-panel="{panel}">')
        svg.append(svg_text(left,offset+26,title,19))
        legend='Solid: '+', '.join(label for _,label,_ in series)+' · Dashed: declared inventory'
        svg.append(svg_text(left,offset+48,legend,12))
        for value in range(0,ceiling+1,step):
            svg.append(f'<line x1="{left}" x2="{right}" y1="{y(value):.2f}" y2="{y(value):.2f}" stroke="#30363d"/>')
            svg.append(svg_text(left-12,y(value)+4,str(value),12,'text-anchor="end" fill="#b1bac4"'))
        for key,label,color in [('total','Declared','#b1bac4'),*series]:
            values=[p['counts'][panel]['total'] if key=='total' else p['counts'][panel]['states'][key] for p in points]
            # Only connect adjacent observations on the same upstream pin.
            for i in range(1,len(points)):
                if points[i].get('upstreamCommit')!=points[i-1].get('upstreamCommit'):
                    continue
                dash=' stroke-dasharray="7 5"' if key=='total' else ''
                svg.append(f'<path data-series="{key}" d="M {xs[i-1]:.2f} {y(values[i-1]):.2f} L {xs[i]:.2f} {y(values[i]):.2f}" fill="none" stroke="{color}" stroke-width="2"{dash}/>')
            for x,v in zip(xs,values):
                svg.append(f'<circle data-series="{key}" cx="{x:.2f}" cy="{y(v):.2f}" r="4" fill="{color}" stroke="#0d1117"/>')
            # A fixed right-hand key avoids overlapping labels when values are zero.
            line=offset+92+([k for k,_,_ in [('total','Declared','#b1bac4'),*series]].index(key))*26
            dash=' stroke-dasharray="7 5"' if key=='total' else ''
            svg.append(f'<line x1="940" x2="966" y1="{line-4}" y2="{line-4}" stroke="{color}" stroke-width="2"{dash}/>')
            svg.append(svg_text(974,line,f'{label}: {values[-1]:,}',13))
        stride=max(1,math.ceil(len(points)/6))
        for i,p in enumerate(points):
            if i%stride==0 or i==len(points)-1:
                svg.append(svg_text(xs[i],bottom+23,p['day'],12,'text-anchor="middle" fill="#b1bac4"'))
        svg.append('</g>')
    for i,p in enumerate(points):
        f=p['counts']['functions'];s=p['counts']['state']
        detail=f'{p["day"]}: Rust computation {f["states"]["rust"]}/{f["total"]}; conditional Rust {f["states"]["rust-batch"]}/{f["total"]}; Rust authority {s["states"]["rust-owned"]}/{s["total"]}. Commit {p["implementationCommit"][:7]}.'
        lo=left if i==0 else (xs[i-1]+xs[i])/2;hi=right if i==len(points)-1 else (xs[i]+xs[i+1])/2
        svg.append(f'<g tabindex="0" role="button" aria-label="{escape(detail)}" data-detail="{escape(detail)}"><title>{escape(detail)}</title><rect x="{lo:.2f}" y="55" width="{hi-lo:.2f}" height="430" fill="#ffffff" fill-opacity="0"/></g>')
    svg.append('</g></svg>')
    return '\n'.join(svg)


def history_views(history):
    rows=[]
    for o in history['observations']:
        c=o['counts']
        values=(f'{c["cpu"]["done"]}/{c["cpu"]["total"]} curated capabilities; {c["evidence"]["done"]}/{c["evidence"]["total"]} evidence gates' if o['schemaVersion']==2 else f'{c["functions"]["states"]["rust-batch"]}/{c["functions"]["total"]} conditional Rust functions; {c["state"]["states"]["rust-owned"]}/{c["state"]["total"]} Rust-owned fields')
        rows.append((o['recordedAt'],str(o['schemaVersion']),o['implementationCommit'],values,o['note']))
    intro='Recorded observations only. Schema 2 counted curated capabilities; schema 3 counts source definitions and state fields. The two series are not comparable. A changed denominator is not a porting gain. No trend is inferred from a single observation.'
    md='# Progress history\n\n'+intro+'\n\n[Current ownership map](PROGRESS.md) · [Raw history](progress-history.json) · [HTML page](history.html)\n\n| Observation (UTC) | Scheme | Implementation | Counts | Note |\n|---|---|---|---|---|\n'
    for date,scheme,commit,values,note in rows:
        md+=f'| {date} | {scheme} | [{commit[:7]}]({BASE}commit/{commit}) | {values} | {note} |\n'
    html='<h1>Progress history</h1><div class="chart-scroll">'+history_chart(history)+'</div><output id="history-detail" aria-live="polite">Hover, tap or focus a date for exact counts.</output>'
    html+='<p>Each panel has its own scale. Solid series show Rust computation, conditional computation and state authority separately; the dashed series is the declared inventory. One point per UTC day, using the last comparable recorded observation. A single point does not establish a trend. Different upstream pins are not connected.</p>'
    if history.get('source')=='main-commits':
        html+='<p>Published observations use the last main commit of each UTC day with a schema-3 inventory. Counts come from that committed inventory, not an inferred port or a retroactive reclassification.</p>'
    html+='<p><a href="progress-history.json">Raw history</a> · <a href="progress.html">Back to current progress</a></p><table id="history-table"><thead><tr><th>Date (UTC)</th><th>Rust computation</th><th>Conditional Rust</th><th>Rust authority</th><th>Commit</th></tr></thead><tbody>'
    for p in reversed(daily_history(history)):
        f=p['counts']['functions'];s=p['counts']['state'];commit=p['implementationCommit']
        html+=f'<tr><td>{p["day"]}</td><td>{f["states"]["rust"]}/{f["total"]}</td><td>{f["states"]["rust-batch"]}/{f["total"]}</td><td>{s["states"]["rust-owned"]}/{s["total"]}</td><td><a href="{BASE}commit/{commit}">{commit[:7]}</a></td></tr>'
    html+='</tbody></table><p>Counts cover the selected source inventory, not equal effort, full Three.js compatibility or performance. Ownership is tracked separately; explicit owned API mappings do not port ordinary JS objects.</p><details><summary>Earlier counting scheme</summary><p>'+intro+'</p><ul>'
    for date,scheme,commit,values,note in rows:
        if scheme=='2':
            html+=f'<li>{escape(date)}: {escape(values)}. {escape(note)} <a href="{BASE}commit/{commit}">{commit[:7]}</a></li>'
    html+='</ul></details><style>.chart-scroll{overflow-x:auto}.chart-scroll svg{min-width:640px}#history-detail{display:block;padding:12px;background:#161b22;border-left:3px solid #58a6ff}g[data-detail]:focus{outline:none}g[data-detail]:hover rect,g[data-detail]:focus rect{fill-opacity:.06}</style><script>for(const item of document.querySelectorAll("[data-detail]")){const show=()=>document.querySelector("#history-detail").textContent=item.dataset.detail;for(const event of ["pointerenter","focus","click"])item.addEventListener(event,show);item.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();show();}});}</script>'
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
    outputs={'README.md':readme_goals(read_goals()),'docs/progress.json':json.dumps(data,indent=2)+'\n','docs/progress.html':render_html(data),'docs/assets/progress.svg':render_svg(data),'docs/HISTORY.md':md,'docs/history.html':html,'docs/assets/history.svg':history_chart(history)+'\n'}
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
