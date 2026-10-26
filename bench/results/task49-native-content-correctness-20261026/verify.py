"""Offline native ZIP correctness audit. Python 3.10+ standard library only.
Does not launch a browser, download/copy assets, or convert failed gates to passes.
"""
from pathlib import Path
import argparse,gzip,hashlib,importlib.util,json,struct,sys,zlib
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('protocol_audit',Path(__file__).with_name('protocol_audit.py'));old=importlib.util.module_from_spec(spec);spec.loader.exec_module(old)
H=lambda b:hashlib.sha256(b).hexdigest()
NAMES=old.builder.NAMES

def png_rgba(b):
    assert b[:8]==b'\x89PNG\r\n\x1a\n';pos=8;data=[];seen=[];w=h=None
    while pos<len(b):
        n=struct.unpack('>I',b[pos:pos+4])[0];kind=b[pos+4:pos+8];payload=b[pos+8:pos+8+n];crc=b[pos+8+n:pos+12+n]
        assert len(payload)==n and struct.pack('>I',zlib.crc32(kind+payload)&0xffffffff)==crc
        seen.append(kind)
        if kind==b'IHDR':w,h,depth,color,comp,fil,interlace=struct.unpack('>IIBBBBB',payload);assert (depth,color,comp,fil,interlace)==(8,6,0,0,0)
        if kind==b'IDAT':data.append(payload)
        pos+=12+n
        if kind==b'IEND':break
    assert seen[0]==b'IHDR' and seen[-1]==b'IEND' and pos==len(b) and w*h<=20_000_000
    raw=zlib.decompress(b''.join(data));stride=w*4;assert len(raw)==h*(stride+1);rows=[];before=bytes(stride)
    for y in range(h):
        offset=y*(stride+1);kind=raw[offset];row=bytearray(raw[offset+1:offset+1+stride]);assert kind in range(5)
        if kind:
            for i in range(stride):
                a=row[i-4] if i>=4 else 0;b0=before[i];c=before[i-4] if i>=4 else 0
                if kind==1:pred=a
                elif kind==2:pred=b0
                elif kind==3:pred=(a+b0)//2
                else:
                    q=a+b0-c;da=abs(q-a);db=abs(q-b0);dc=abs(q-c);pred=a if da<=db and da<=dc else b0 if db<=dc else c
                row[i]=(row[i]+pred)&255
        rows.append(bytes(row));before=row
    return w,h,b''.join(rows),b''.join(reversed(rows))

def compare_png(a,b):
    wa,ha,x,_=png_rgba(a);wb,hb,y,_=png_rgba(b);assert(wa,ha)==(wb,hb)
    changed=[];channels=0;maximum=0
    for off in range(0,len(x),4):
        if x[off:off+4]==y[off:off+4]:continue
        deltas=[int(y[off+i])-int(x[off+i]) for i in range(4)];channels+=sum(d!=0 for d in deltas);maximum=max(maximum,*map(abs,deltas));n=off//4
        changed.append({'x':n%wa,'y':n//wa,'referenceRGBA':list(x[off:off+4]),'actualRGBA':list(y[off:off+4]),'deltaRGBA':deltas})
    return {'width':wa,'height':ha,'totalPixels':wa*ha,'changedPixels':len(changed),'changedChannels':channels,'maxAbsoluteChannelDelta':maximum,'changedPixelFraction':len(changed)/(wa*ha),'pixels':changed if len(changed)<100 else None}

def verify(root):
    A=old.Archive(root);report={'status':'verified','performanceEvidence':False,'logicalFiles':len(A.rows),'physicalBlobs':len(A.blobs),'attempts':[]};pngs=[]
    for label in NAMES:
        r=A.J(label+'/result.json');assert r['tooling']['dirty'] is False and r['runtimeSha']==old.RUNTIME and not r['performanceEvidence'];gate=old.audit_gate(A,label,r)
        comparisons=[]
        for c in r['comparisons']:
            a=label+'/'+c['reference'];b=label+'/'+c['actual']
            if c['case']=='native-material-texture-state':
                x=A.J(a+'/native-final.json');y=A.J(b+'/native-final.json');equal=all(x[k]==y[k] for k in ['materials','textures']);assert equal==c['equal'];comparisons.append({'case':c['case'],'equal':equal,'requiredEqual':c['requiredEqual'],'reference':c['reference'],'actual':c['actual']})
            else:
                x=A.J(a+'/'+c['case']+'-0.json');y=A.J(b+'/'+c['case']+'-0.json');diff=old.snapshot_difference(x,y)
                assert diff['equal']==c['equal'] and diff['maximumAbsoluteDifference']==c['maxAbsoluteDifference'] and diff['numericValues']==c['numericValues']
                assert diff['differences']==[d['field'] for d in c['differences']]
                comparisons.append({'case':c['case'],'reference':c['reference'],'actual':c['actual'],'requiredEqual':c['requiredEqual'],**diff})
        if 'input' in r:
            prep='task49-editor-bistro-zip-001' if r['content']=='bistro' else 'task49-editor-chess-zip-002';data=A.B('zip-preparation/'+prep+'/manifest.json');m=json.loads(data)
            assert H(data)==r['input']['preparationManifestSha256'] and m['zip']==r['input']['zip'] and m['source']==r['source'] and m['assetBytesChanged'] is False
            assert r['input']['sourceFiles']==len(m['files']) and not r['input']['assetBytesChanged']
            for route in r['routes']:
                q=route.get('requestCoverage');assert q and q['mountedHTTPRequests']==0 and q['verifiedZipEntries']==len(m['verifiedEntries']) and q['originalFiles']==len(m['files'])
        report['attempts'].append({'label':label,'recordedStatus':r['status'],'tooling':r['tooling'],'runtimeSha':r['runtimeSha'],'gate':gate,'crossComparisons':comparisons})
    # Decode every saved readPixels image independently; the encoded PNG bytes alone are not the frame hash.
    for path in sorted(A.rows):
        if path.endswith('.png') and '/authored-' in path:
            suffix='-main.png' if path.endswith('-main.png') else '-axes.png';renderer='main' if suffix=='-main.png' else 'axes';snapshot=A.J(path.removesuffix(suffix)+'.json');w,h,rgba,flipped=png_rgba(A.B(path));record=snapshot['renderers'][renderer]
            assert (w,h)==(record['width'],record['height']) and H(flipped)==record['pixelSha256'];pngs.append({'file':path,'width':w,'height':h,'readPixelsSha256':H(flipped)})
    report['decodedPngs']=pngs
    base='chess-zip-correctness-001/';aa1='chess-zip-pure-aa-001/pure-r186/';aa2='chess-zip-pure-aa-002/pure-r186/';frame='authored-static-0-main.png'
    control1=A.B(aa1+frame);control2=A.B(aa2+frame);assert control1==A.B(base+'prepared-js-r186/'+frame)==A.B(base+'prepared-wasm-r186/'+frame);assert control2==A.B(base+'pure-r186/'+frame)
    delta=compare_png(control2,control1);assert(delta['changedPixels'],delta['changedChannels'],delta['maxAbsoluteChannelDelta'])==(4,8,13)
    report['freshPureControls']={'firstMatchesInitialJSAndWasm':True,'secondMatchesInitialPure':True,'bothRouteLocalGatesPassed':True,'acrossPages':delta,'conclusion':'The four-pixel difference also occurs across pure-r186 pages. Candidate causality is not established; the earlier strict cross-route failure remains failed.'}
    za=json.loads((root/'zip-input-audit.json').read_text());assert not za['sceneAssetPayloadsCopied']
    for z in za['archives']:
        m=A.J('zip-preparation/'+z['directory']+'/manifest.json')
        if z['status']=='failed':assert m['status']=='failed' and not z['zipCreated'];continue
        assert H(A.B('zip-preparation/'+z['directory']+'/manifest.json'))==z['manifestSha256'] and m['zip']==z['zip'] and m['verifiedEntries']==z['entries'];assert not z['payloadArchived']
        entries={x['name']:x for x in z['entries']};assert len(entries)==len(z['entries'])
        for f in m['files']:assert entries[f['file']]=={'name':f['file'],'bytes':f['bytes'],'sha256':f['sha256']}
        for n in m['notices']:
            b=A.B('zip-notices/'+z['directory']+'/'+n['zipPath']);assert len(b)==n['originalBytes'] and H(b)==n['originalSHA256'];assert b==A.B('notices/'+n['file'])
        assert len(entries)==len(m['files'])+len(m['notices'])+1
        assert m['tooling']['dirty'] is True and m['tooling']['sha']=='5d1f3bc42d1b78d1fa1b1ada84bbe5d0150c6b11'
        assert H(A.B('tool-sources/d8cef95bcc906b7e20a248c3f8b3193fcffdfcbd/scripts/apps/editor-content.mjs'))==m['tooling']['sourceSha256']
        fflate=A.B('upstream/'+m['nativeZipLibrary']['file']);assert H(fflate)==m['nativeZipLibrary']['sha256'] and len(fflate)==m['nativeZipLibrary']['bytes']
    report['zipPreparation']=za
    report['limitations']=['This is correctness and diagnostic evidence, not primary CPU timing or a GPU/FPS result.','Native File/Blob ZIP input is a separate supported app workflow; it does not resolve or waive earlier HTTP request failures.','Bistro required same-version image/numeric checks passed. This does not certify upstream asset visual fidelity or unsupported KTX2 validation.','Chess pure-r186 cross-page image instability prevents a strict cross-route image verdict; no tolerance was relaxed.','Preparation used dirty source at the recorded base plus exact helper hash. Successful helper bytes match later clean d8cef95; the failed preparation helper snapshot was not retained, only its recorded source hash.','Large ZIPs and original scene assets are absent from the public archive. Local stream/entry verification is recorded; offline verification checks these records and fetch pins rather than rehashing absent payloads.','Guarded HTTP pass/fail mixture remains failed and unresolved. Browser behavior and cross-page variation are not re-executed by this audit.']
    return report

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--archive',type=Path,default=Path(__file__).resolve().parent);p.add_argument('--out',type=Path);p.add_argument('--extract',type=Path);a=p.parse_args();report=verify(a.archive)
    if a.out:
        with a.out.open('x') as f:json.dump(report,f,indent=2,allow_nan=False);f.write('\n')
    if a.extract:old.Archive(a.archive).extract(a.extract)
    print(json.dumps({'status':report['status'],'logicalFiles':report['logicalFiles'],'physicalBlobs':report['physicalBlobs'],'attempts':len(report['attempts']),'decodedPngs':len(report['decodedPngs']),'performanceEvidence':False}))
