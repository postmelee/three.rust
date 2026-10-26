"""Standard-library 8-bit RGBA PNG decode, CRC and pixel comparison."""
import struct,zlib
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
