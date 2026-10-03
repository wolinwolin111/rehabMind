"""Static projections of every selectable source mesh for manual shape screening.

Bones are drawn as context through the muscle, not as an occlusion simulation.
This is a review aid; it cannot certify a tendon footprint.
"""
from pathlib import Path
import gzip, json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'baseline/RehabMind_LowerLimbV1_ImplementationBaseline_DBv3.7_2026-09-29/04_3D_Localization/model'
atlas=json.loads((SOURCE/'atlas_metadata.json').read_text(encoding='utf-8'))
audit=json.loads((ROOT/'build/clickable-muscle-audit.json').read_text(encoding='utf-8'))
meta=json.loads((ROOT/'public/3d/skin.json').read_text(encoding='utf-8'))
by_id={p['id']:p for p in atlas['parts']}
chunks={}
def geometry(id):
    p=by_id[id]
    if p['chunk'] not in chunks: chunks[p['chunk']]=gzip.decompress((SOURCE/f"chunks/body-{p['chunk']}.bin.gz").read_bytes())
    raw=chunks[p['chunk']]
    v=np.frombuffer(raw,dtype='<f4',count=p['vertexCount']*3,offset=p['positions']).reshape(-1,3)
    i=np.frombuffer(raw,dtype='<u4',count=p['indexCount'],offset=p['indices']).reshape(-1,3)
    return v,i
bones=[]
for p in meta['bones']['parts']:
    v,i=geometry(p['id']);bones.append((v,i,v.min(0),v.max(0)))
font_path='C:/Windows/Fonts/msyh.ttc'
font=ImageFont.truetype(font_path,21)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)

def projection(v,i,bg,bbox,angle,w=340,h=258):
    # Angle zero is anterior; pi is posterior. Orthographic, original coordinates.
    c,s=math.cos(angle),math.sin(angle)
    matrix=np.array([[c,0,s],[0,1,0],[-s,0,c]])
    center=(bbox[0]+bbox[1])/2
    rotated=(v-center)@matrix.T
    extent=np.ptp(rotated,axis=0)
    scale=min((w-28)/max(extent[0],.01),(h-24)/max(extent[1],.01))
    picture=Image.new('RGB',(w,h),'#faf8f2');draw=ImageDraw.Draw(picture)
    def paint(vertices,faces,color):
        p=(vertices-center)@matrix.T
        t=p[faces]; depths=t[:,:,2].mean(1)
        coords=np.stack([p[:,0]*scale+w/2,h/2-p[:,1]*scale],axis=1)
        normal=np.cross(t[:,1]-t[:,0],t[:,2]-t[:,0]);length=np.linalg.norm(normal,axis=1)
        shade=.65+.35*np.abs(normal[:,2]/np.maximum(length,1e-12))
        for n in np.argsort(depths):
            tri=coords[faces[n]]
            if tri[:,0].max()<0 or tri[:,0].min()>w or tri[:,1].max()<0 or tri[:,1].min()>h:continue
            rgb=tuple(int(a*shade[n]) for a in color)
            draw.polygon([tuple(x) for x in tri],fill=rgb)
    for bv,bi,lo,hi in bg:
        padded_lo,padded_hi=bbox[0]-.045,bbox[1]+.045
        if np.any(hi<padded_lo) or np.any(lo>padded_hi):continue
        # Preserve all local source faces; omit distant parts of long bones.
        centroids=bv[bi].mean(1)
        local=bi[np.all((centroids>=padded_lo)&(centroids<=padded_hi),axis=1)]
        paint(bv,local,(226,220,204))
    paint(v,i,(77,142,111))
    return picture

out=ROOT/'build/muscle-audit-sheets';out.mkdir(parents=True,exist_ok=True)
manifest=[]
for page in range(math.ceil(len(audit['rows'])/12)):
    sheet=Image.new('RGB',(2100,1330),'#ffffff');d=ImageDraw.Draw(sheet)
    d.text((15,8),f'Source shape screening {page+1:02d} | green: original muscle | bones: transparent context | two views',font=small,fill='#304154')
    for j,row in enumerate(audit['rows'][page*12:(page+1)*12]):
        v,i=geometry(row['id']);bbox=(v.min(0),v.max(0))
        posterior=any(k in row['key'] for k in ['rhomboid','trapezius','splenius','spinalis','longissimus','iliocostalis','rotator','interspinal','intertransvers','gastrocnemius','soleus','popliteus','biceps femoris','semitend','semimem','gluteus','piriformis','gemellus','quadratus femoris','tibialis posterior','flexor hallucis longus','flexor digitorum longus'])
        angle=math.pi if posterior else 0
        x=(j%3)*700;y=38+(j//3)*320
        d.text((x+10,y),row['id']+' '+row['displayName'],font=font,fill='#25374a')
        d.text((x+10,y+27),row['name'],font=small,fill='#596879')
        sheet.paste(projection(v,i,bones,bbox,angle),(x+5,y+50))
        sheet.paste(projection(v,i,bones,bbox,angle+math.pi/3),(x+350,y+50))
        manifest.append({'id':row['id'],'sheet':page+1,'cell':j+1,'bbox':[a.tolist() for a in bbox]})
    sheet.save(out/f'sheet-{page+1:02d}.jpg',quality=92)
(out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(f'Rendered {len(manifest)} source parts to {math.ceil(len(manifest)/12)} sheets')
