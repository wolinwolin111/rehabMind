"""Two-angle review sheets of registered geometry in the current bone context."""
import gzip,json,math
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from register_missing_muscles import ROOT,targets,pv,pi,meta
manifest=json.loads((ROOT/'assets/anatomy-supplements/manifest.json').read_text(encoding='utf-8'))
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',20)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',14)
bone_data=[]
for p in meta['bones']['parts']:
 if p['side']=='left' or not any(k in p['name'].lower() for k in ['hip bone','vertebra','sacrum','rib','cartilage','metatarsal','phalanx','calcaneus','humerus','scapula','xiphoid','sternum']):continue
 i=pi[p['firstFace']:p['firstFace']+p['faceCount']];bone_data.append((pv,i))
def draw_projection(v,i,angle):
 c,s=math.cos(angle),math.sin(angle);m=np.array([[c,0,s],[0,1,0],[-s,0,c]])
 center=(v.min(0)+v.max(0))/2
 p=(v-center)@m.T;extent=np.ptp(p,axis=0);scale=min(315/max(extent[0],.03),235/max(extent[1],.03))
 img=Image.new('RGB',(340,260),'#faf8f2');draw=ImageDraw.Draw(img)
 chunks=[]
 def add(points,faces,color):
  t=((points-center)@m.T)[faces];normal=np.cross(t[:,1]-t[:,0],t[:,2]-t[:,0])
  shade=.65+.35*np.abs(normal[:,2])/np.maximum(np.linalg.norm(normal,axis=1),1e-12)
  for n in range(len(t)):
   xy=np.stack([t[n,:,0]*scale+170,130-t[n,:,1]*scale],axis=1)
   if xy[:,0].max()<0 or xy[:,0].min()>340 or xy[:,1].max()<0 or xy[:,1].min()>260:continue
   chunks.append((t[n,:,2].mean(),xy,tuple(int(a*shade[n]) for a in color)))
 lo,hi=v.min(0)-.035,v.max(0)+.035
 for bv,bi in bone_data:
  centers=bv[bi].mean(1);local=bi[np.all((centers>=lo)&(centers<=hi),axis=1)]
  add(bv,local,(223,217,200))
 add(v,i,(99,166,132))
 for _,xy,color in sorted(chunks,key=lambda r:r[0]):draw.polygon([tuple(x) for x in xy],fill=color)
 return img
out=ROOT/'build/missing-muscle-review';out.mkdir(exist_ok=True)
for side in ['right','left']:
 bone_data=[]
 for p in meta['bones']['parts']:
  if p['side'] and p['side']!=side:continue
  if not any(k in p['name'].lower() for k in ['hip bone','vertebra','sacrum','rib','cartilage','metatarsal','phalanx','calcaneus','humerus','scapula','xiphoid','sternum']):continue
  bone_data.append((pv,pi[p['firstFace']:p['firstFace']+p['faceCount']]))
 rows=[p for p in manifest['parts'] if p['side']==side]
 rows += [p for p in manifest['connective'] if p['side']==side or not p['side'] and side=='right']
 sheet=Image.new('RGB',(2100,math.ceil(len(rows)/3)*320),'white');draw=ImageDraw.Draw(sheet)
 for n,p in enumerate(rows):
  raw=gzip.decompress((ROOT/'assets/anatomy-supplements'/p['file']).read_bytes());v=np.frombuffer(raw,dtype='<f4',count=p['vertexCount']*3).reshape(-1,3);i=np.frombuffer(raw,dtype='<u4',offset=p['indices'],count=p['indexCount']).reshape(-1,3)
  angle=math.pi if any(k in p['name'] for k in ['latissimus','multifidus','quadratus','thoracolumbar']) else 0
  x=n%3*700;y=n//3*320;draw.text((x+10,y+3),p['displayName'],font=font,fill='#25405a');draw.text((x+10,y+30),p['name'],font=small,fill='#395975')
  sheet.paste(draw_projection(v,i,angle),(x+5,y+55));sheet.paste(draw_projection(v,i,angle+math.pi/3),(x+350,y+55))
 sheet.save(out/f'registered-{side}.png');print(str(out/f'registered-{side}.png'),flush=True)
