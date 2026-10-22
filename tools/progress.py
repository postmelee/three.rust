#!/usr/bin/env python3
"""Generate the bounded three.rust inventory report. Python standard library only.

Presentation reference: AnyPS5. Independent implementation: recursive bisection
layout and a curated, evidence-linked inventory, not its source scanner.
"""
import argparse
from html import escape
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COLORS = {'implemented': '#2ea043', 'passed': '#2ea043', 'pending': '#6e7681', 'regression': '#d29922'}


def summarize(data):
    if data['schemaVersion'] != 2:
        raise ValueError('Unknown inventory schema')
    seen = set()
    result = {k: data[k] for k in ('schemaVersion', 'title', 'sourceRef', 'scope', 'retained')}
    for panel, complete in [('cpu', 'implemented'), ('evidence', 'passed')]:
        groups = []
        for group in data[panel]:
            if not group['items'] or group['id'] in seen:
                raise ValueError('Empty or duplicate group')
            seen.add(group['id'])
            for item in group['items']:
                allowed = {'implemented', 'pending'} if panel == 'cpu' else {'passed', 'pending', 'regression'}
                if item['id'] in seen or item['state'] not in allowed:
                    raise ValueError('Duplicate item or invalid state')
                seen.add(item['id'])
                path = (ROOT / item['evidence']).resolve()
                if not path.is_relative_to(ROOT) or not path.is_file():
                    raise ValueError(f'Missing evidence: {item["evidence"]}')
            done = sum(item['state'] == complete for item in group['items'])
            groups.append({**group, 'done': done, 'total': len(group['items'])})
        total = sum(g['total'] for g in groups)
        if not total:
            raise ValueError('Empty panel')
        result[panel] = {'done': sum(g['done'] for g in groups), 'total': total, 'groups': groups}
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
    parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="470" viewBox="0 0 1200 470" role="img" aria-labelledby="title desc">',
             '<title id="title">three.rust implementation and evidence</title>',
             '<desc id="desc">Each tile is one explicitly listed capability or evidence gate. Green means implemented or passed. Gray means outstanding. Amber means a regression prevents a general gain claim. This is not a percentage of all Three.js.</desc>',
             '<rect width="1200" height="470" fill="#0d1117"/>',
             '<g font-family="Arial, sans-serif" fill="#f0f6fc">']
    for panel, title, left in [('cpu', 'Rust CPU capabilities', 16), ('evidence', 'Evidence gates passed', 612)]:
        value = data[panel]
        parts.append(svg_text(left, 28, f'{title}: {value["done"]}/{value["total"]}', 20))
        for group, x, y, w, h in layout(value['groups'], left, 45, 572, 338):
            parts.append(f'<g><title>{escape(group["name"])}: {group["done"]}/{group["total"]}</title>')
            parts.append(f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" fill="#161b22" stroke="#0d1117" stroke-width="4"/>')
            n = group['total']
            cols = max(1, math.ceil(math.sqrt(n * (w-8) / max(1, h-32))))
            rows = math.ceil(n / cols)
            offset = 0
            for row in range(rows):
                count = n // rows + int(row < n % rows)
                cw, ch = (w-8)/count, (h-32)/rows
                for col in range(count):
                    item = group['items'][offset]
                    offset += 1
                    cx, cy = x+4+col*cw, y+28+row*ch
                    parts.append(f'<rect data-item="{escape(item["id"])}" x="{cx:.2f}" y="{cy:.2f}" width="{cw-2:.2f}" height="{ch-2:.2f}" fill="{COLORS[item["state"]]}"><title>{escape(item["name"])} — {item["state"]}</title></rect>')
            parts.append(svg_text(x+7, y+20, group['name'], 14))
            parts.append('</g>')
    for x, state, label in [(16, 'implemented', 'Implemented / passed'), (275, 'pending', 'Outstanding'), (456, 'regression', 'Regression / no general gain')]:
        parts.append(f'<rect x="{x}" y="405" width="12" height="12" fill="{COLORS[state]}"/>')
        parts.append(svg_text(x+20, 416, label, 14))
    parts.append(svg_text(16, 450, 'One tile = one declared item. Counts are not API coverage, equal effort, or a speedup claim.', 15))
    return '\n'.join(parts+['</g></svg>'])+'\n'


def render_html(data):
    base = 'https://github.com/postmelee/three.rust/blob/'+data['sourceRef']+'/'
    parts = ['<!doctype html><html lang="en"><head><meta charset="utf-8">',
             '<meta name="viewport" content="width=device-width, initial-scale=1"><title>three.rust progress</title>',
             '<style>body{background:#0d1117;color:#f0f6fc;font:16px/1.5 system-ui,sans-serif;max-width:1200px;margin:auto;padding:24px}h1{font-size:36px;border-bottom:1px solid #30363d;padding-bottom:12px}a{color:#58a6ff}img{width:100%;height:auto}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #30363d;padding:6px 12px;text-align:left}td.num,th.num{text-align:right}caption{text-align:left;font-weight:bold;margin-bottom:8px}.muted{color:#b1bac4}.badges{display:flex;flex-wrap:wrap;gap:12px}.badge{background:#30363d;padding:4px 10px}summary{cursor:pointer}li{margin:8px 0}@media(max-width:600px){body{padding:12px;font-size:14px}th,td{padding:4px}h1{font-size:30px}}</style></head><body>',
             '<h1>Status</h1><div class="badges">']
    for panel, title in [('cpu','Rust capabilities'),('evidence','Evidence passed')]:
        p = data[panel]
        parts.append(f'<span class="badge">{title}: <strong>{p["done"]}/{p["total"]}</strong></span>')
    parts += ['</div><p class="muted">'+escape(data['scope'])+'</p>',
              '<img src="assets/progress.svg" alt="Grouped tiles showing Rust capabilities and evidence gates. Detailed counts and all items follow.">',
              f'<p>Generated by <a href="{escape(base)}tools/progress.py">tools/progress.py</a>. <a href="progress.json">Raw JSON</a> · <a href="{escape(base)}docs/PROGRESS.md">Counting rules</a> · <a href="https://github.com/postmelee/three.rust/commits/codex/ownership-roadmap/docs/progress-inventory.json">Inventory history</a></p>']
    for panel, title, column in [('cpu','Declared CPU capabilities','Rust implemented'),('evidence','Recorded evidence gates','Passed')]:
        p = data[panel]
        parts.append(f'<table id="{panel}"><caption>{title}</caption><thead><tr><th scope="col">Subsystem</th><th scope="col" class="num">{column}</th><th scope="col" class="num">Declared total</th></tr></thead><tbody>')
        for g in p['groups']:
            parts.append(f'<tr><th scope="row"><a href="#{g["id"]}">{escape(g["name"])}</a></th><td class="num">{g["done"]}</td><td class="num">{g["total"]}</td></tr>')
        parts.append(f'</tbody><tfoot><tr><th>Total in this inventory</th><td class="num">{p["done"]}</td><td class="num">{p["total"]}</td></tr></tfoot></table>')
    parts += ['<h2>Items and evidence</h2><p>'+escape(data['retained'])+'</p>']
    for panel in ['cpu','evidence']:
        for g in data[panel]['groups']:
            parts.append(f'<details id="{g["id"]}"><summary>{escape(g["name"])} — {g["done"]}/{g["total"]}</summary><ul>')
            for item in g['items']:
                parts.append(f'<li>{escape(item["name"])}: <strong>{item["state"]}</strong> — <a href="{escape(base+item["evidence"])}">evidence / planned contract</a></li>')
            parts.append('</ul></details>')
    parts += ['<p class="muted">Evidence is a reviewed snapshot, not a claim that every environment passed. Broad whole-frame gain has not been established; the cloud hierarchy experiment regressed. Physical GPU validation is outstanding. Retained GPU shaders are not Rust ports.</p>',
              '<p>Presentation inspired by <a href="https://boykopovar.github.io/AnyPS5/progress.html">AnyPS5 progress</a>; independently implemented for this project.</p></body></html>']
    return '\n'.join(parts)+'\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='fail if generated outputs differ')
    args = parser.parse_args()
    data = summarize(json.loads((ROOT/'docs/progress-inventory.json').read_text()))
    outputs = {'docs/progress.json': json.dumps(data, indent=2, ensure_ascii=False)+'\n',
               'docs/progress.html': render_html(data), 'docs/assets/progress.svg': render_svg(data)}
    for name, content in outputs.items():
        path = ROOT/name
        if args.check:
            if not path.exists() or path.read_text() != content:
                raise SystemExit(f'Stale output: {name}; run python3 tools/progress.py')
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)
    print(f'Progress: Rust {data["cpu"]["done"]}/{data["cpu"]["total"]}, evidence {data["evidence"]["done"]}/{data["evidence"]["total"]}; bounded inventory only')


if __name__ == '__main__':
    main()
