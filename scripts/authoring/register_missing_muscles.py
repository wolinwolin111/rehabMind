"""Register source anatomy to the existing skeleton; save reproducible review data.

Bone correspondences use named source bones, then rigid ICP surface registration.
A smooth displacement field transfers the local bone fits into soft tissue.
Distances report geometric fit, not clinical or specimen-level accuracy.
"""
from pathlib import Path
import json, gzip, re
import numpy as np
from scipy.spatial import cKDTree
from scipy.interpolate import RBFInterpolator

ROOT=Path(__file__).resolve().parents[2]
EXTRACT=ROOT/'build/z-anatomy-extracted'
manifest=json.loads((EXTRACT/'manifest.json').read_text())
source={p['name']:p for p in manifest}
meta=json.loads((ROOT/'public/3d/skin.json').read_text(encoding='utf-8'))
raw=gzip.decompress((ROOT/'public/3d/bones.pack').read_bytes())
pv=np.frombuffer(raw,dtype='<f4',offset=meta['bones']['positions'],count=meta['bones']['vertexCount']*3).reshape(-1,3)
pi=np.frombuffer(raw,dtype='<u4',offset=meta['bones']['indices'],count=meta['bones']['indexCount']).reshape(-1,3)
targets={p['name']:pv[np.unique(pi[p['firstFace']:p['firstFace']+p['faceCount']])] for p in meta['bones']['parts']}
def geom(name):
 p=source[name]
 return (np.fromfile(EXTRACT/f"{p['id']}.positions",dtype='<f4').reshape(-1,3).astype(float),
         np.fromfile(EXTRACT/f"{p['id']}.indices",dtype='<u4').reshape(-1,3))
ordinals=['First','Second','Third','Fourth','Fifth','Sixth','Seventh','Eighth','Ninth','Tenth','Eleventh','Twelfth']
pairs={'Sacrum':'Sacrum','Xiphoid_process':'Xiphoid process','Body_of_sternum':'Body of sternum','Manubrium_of_sternum':'Manubrium'}
for n in range(3,8):pairs[f'Vertebra_C{n}']=f'{ordinals[n-1]} cervical vertebra'
for prefix,label,count in [('T','thoracic',12),('L','lumbar',5)]:
 for n in range(1,count+1):pairs[f'Vertebra_{prefix}{n}']=f'{ordinals[n-1]} {label} vertebra'
for side,suffix in [('Right','r'),('Left','l')]:
 for name,label in [('Hip_bone','hip bone'),('Humerus','humerus'),('Scapula','scapula'),('Calcaneus','calcaneus'),('Talus','talus'),('Femur','femur'),('Cuboid_bone','cuboid bone')]:pairs[name+suffix]=f'{side} {label}'
 for n in range(1,13):pairs[f'{ordinals[n-1]}_rib{suffix}']=f'{side} {ordinals[n-1].lower()} rib'
 for n in range(1,8):pairs[f'Costal_cartilage_of_{ordinals[n-1].lower()}_rib{suffix}']=f'{side} {ordinals[n-1].lower()} costal cartilage'
 for n in range(1,6):pairs[f'{ordinals[n-1]}_metatarsal_bone{suffix}']=f'{side} {ordinals[n-1].lower()} metatarsal bone'
 for n in range(2,5):
  for level in ['Proximal','Middle']:
   pairs[f'{level}_phalanx_of_{ordinals[n-1].lower()}_finger_of_foot{suffix}']=f'{level} phalanx of {side.lower()} {ordinals[n-1].lower()} toe'

def rigid_icp(x,y):
 x=x[::max(1,len(x)//1800)];y=y[::max(1,len(y)//4000)]
 tree=cKDTree(y);rotation=np.eye(3);shift=y.mean(0)-x.mean(0)
 for _ in range(70):
  moved=x@rotation+shift;d,j=tree.query(moved);keep=d<np.quantile(d,.9)+1e-9
  a=x[keep];b=y[j[keep]];ac=a.mean(0);bc=b.mean(0)
  u,_,vt=np.linalg.svd((a-ac).T@(b-bc));r=u@vt
  if np.linalg.det(r)<0:u[:,-1]*=-1;r=u@vt
  t=bc-ac@r
  if np.max(np.abs(r-rotation))<1e-8 and np.linalg.norm(t-shift)<1e-9:break
  rotation,shift=r,t
 d,_=tree.query(x@rotation+shift)
 return rotation,shift,{'medianMm':float(np.median(d)*1000),'p95Mm':float(np.quantile(d,.95)*1000)}

def fit_bones():
 fits={};missing=[]
 for name,label in pairs.items():
  if name not in source or label not in targets:missing.append([name,label]);continue
  x,_=geom(name);r,t,stats=rigid_icp(x,targets[label]);fits[name]={'target':label,'rotation':r.tolist(),'translation':t.tolist(),**stats}
 print(json.dumps({'fits':len(fits),'missing':missing,'worst':[(n,round(p['p95Mm'],2)) for n,p in sorted(fits.items(),key=lambda p:p[1]['p95Mm'],reverse=True)[:5]]}))
 (ROOT/'build/z-bone-registration.json').write_text(json.dumps(fits,indent=2))
 return fits

def field(fits,names,muscles=()):
 controls=[];displacements=[]
 for name in names:
  p=geom(name)[0];fit=fits[name];r=np.array(fit['rotation']);t=np.array(fit['translation'])
  # Farthest point samples avoid over-weighting dense tessellation regions.
  ids=[np.argmin(p[:,1])];distance=np.full(len(p),np.inf)
  for _ in range(22):
   distance=np.minimum(distance,np.linalg.norm(p-p[ids[-1]],axis=1));ids.append(np.argmax(distance))
  x=p[ids];y=x@r+t
  _,nearest=cKDTree(targets[fit['target']]).query(y)
  y=targets[fit['target']][nearest]
  controls.extend(x);displacements.extend(y-x)
 # More controls at actual source muscle/bone contact patches, including the
 # humeral groove and broad iliac/costal attachments. Avoid a coarse bone fit
 # leaving attachment gaps despite a small nearest-point minimum.
 for muscle in muscles:
  v=geom(muscle)[0]
  for name in names:
   p=geom(name)[0];dist,near=cKDTree(p).query(v)
   patch=np.flatnonzero(dist<.002)
   if not len(patch):continue
   x=p[near[patch]];x=np.unique(np.round(x,7),axis=0)
   ids=[0];distance=np.full(len(x),np.inf)
   for _ in range(min(28,len(x))-1):
    distance=np.minimum(distance,np.linalg.norm(x-x[ids[-1]],axis=1));ids.append(np.argmax(distance))
   x=x[ids];fit=fits[name];y=x@np.array(fit['rotation'])+np.array(fit['translation'])
   _,j=cKDTree(targets[fit['target']]).query(y);y=targets[fit['target']][j]
   controls.extend(x);displacements.extend(y-x)
 c=np.array(controls);d=np.array(displacements)
 _,unique=np.unique(np.round(c,7),axis=0,return_index=True);c=c[unique];d=d[unique]
 # Linear RBF displacement has bounded behaviour and no hard segment seams.
 f=RBFInterpolator(c,d,kernel='linear',smoothing=.004)
 def warp(v):return v+f(v)
 return warp,c,d

def components(v,i):
 from scipy.sparse import coo_matrix
 from scipy.sparse.csgraph import connected_components
 a=np.concatenate([i[:,0],i[:,1],i[:,2]]);b=np.concatenate([i[:,1],i[:,2],i[:,0]])
 graph=coo_matrix((np.ones(len(a)),(a,b)),shape=(len(v),len(v)))
 count,labels=connected_components(graph,directed=False)
 return [i[labels[i[:,0]]==n] for n in range(count) if np.sum(labels==n)>20]

def compact(v,i):
 ids,inv=np.unique(i,return_inverse=True);return v[ids],inv.reshape(-1,3).astype('<u4')

def fair_displacement(original,warped,faces):
 """Fair spatial offsets gently; preserve bends and bone attachment patches.
 A source/target normal angle is not an inversion test: legitimate anatomical
 bending rotates surface normals. Do not flatten bent muscle toward an affine fit.
 """
 from scipy.sparse import coo_matrix
 a=np.concatenate([faces[:,0],faces[:,1],faces[:,2]]);b=np.concatenate([faces[:,1],faces[:,2],faces[:,0]])
 graph=coo_matrix((np.ones(len(a)*2),(np.r_[a,b],np.r_[b,a])),shape=(len(original),len(original))).tocsr()
 graph.data[:]=1;degree=np.maximum(np.asarray(graph.sum(1)).ravel(),1)
 delta=warped-original
 for _ in range(4):delta=.9*delta+.1*(graph@delta)/degree[:,None]
 return original+delta

def build_import(fits):
 configs=[
 ('Latissimus_dorsi_muscle','latissimus dorsi','背阔肌','trunk'),
 ('Rectus_abdominis_muscle','rectus abdominis','腹直肌','trunk'),
 ('Internal_abdominal_oblique_muscle','internal oblique','腹内斜肌','trunk'),
 ('Transversus_abdominis_muscle','transversus abdominis','腹横肌','trunk'),
 ('Quadratus_lumborum_muscle','quadratus lumborum','腰方肌','trunk'),
 ('Multifidus_colli_muscle','multifidus cervicis','多裂肌（颈段）','spine'),
 ('Multifidus_thoracis_muscle','multifidus thoracis','多裂肌（胸段）','spine'),
 ('Multifidus_lumborum_muscle','multifidus lumborum','多裂肌（腰段）','spine'),
 ('Extensor_digitorum_brevis','extensor digitorum brevis','趾短伸肌','foot'),
 ('Dorsal_interossei_muscles_of_foot',None,None,'foot'),
 ]
 out=ROOT/'assets/anatomy-supplements';out.mkdir(parents=True,exist_ok=True)
 rows=[];report=[]
 for side,suffix in [('right','r'),('left','l')]:
  trunk=[n for n in fits if n.startswith(('Vertebra_','Sacrum','Hip_bone','Xiphoid','Body_of_sternum','Manubrium','Costal_')) or re.match(r'(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth)_rib',n)]
  trunk+=[n for n in fits if n in ['Humerus'+suffix,'Scapula'+suffix]]
  foot=[n for n in fits if n.endswith(suffix) and any(k in n for k in ['Calcaneus','Talus','Cuboid','metatarsal','phalanx_of_'])]
  spine=[n for n in fits if n.startswith(('Vertebra_','Sacrum','Hip_bone'))]
  warps={key:field(fits,names,[s+suffix for s,_,_,region in configs if region==key] if key!='foot' else [])[0] for key,names in [('trunk',trunk),('foot',foot),('spine',spine)]}
  for source_name,name,label,region in configs:
   original,indices=geom(source_name+suffix);warped=fair_displacement(original,warps[region](original),indices)
   sacral_extension=None
   if name=='multifidus lumborum':
    # Preserve every source lumbar attachment. Add a short caudal continuation
    # instead of pulling the original L4/L5 fascicles away from their bones.
    bone=targets['Sacrum'];bone=bone[(bone[:,0]*(1 if side=='left' else -1)>0)&(bone[:,2]<np.median(bone[:,2]))]
    tail=np.flatnonzero(original[:,1]<original[:,1].min()+.004)
    dist,nearest=cKDTree(bone).query(warped[tail]);end=tail[np.argmin(dist)]
    anchor=bone[nearest[np.argmin(dist)]]
    direction=warped[end]-anchor;direction/=np.linalg.norm(direction)
    join=warped[end]+direction*.005
    across=np.cross(direction,[0,0,1]);across/=np.linalg.norm(across)
    depth=np.cross(direction,across)
    points=[];faces=[];rings=28;steps=20;base=len(warped)
    for ring in range(rings+1):
     t=ring/rings;center=anchor+(join-anchor)*t
     width=.0014+(.0038-.0014)*(t*t*(3-2*t));thickness=.001+.0013*(t*t*(3-2*t))
     for a in range(steps):
      theta=a/steps*2*np.pi;points.append(center+across*np.cos(theta)*width+depth*np.sin(theta)*thickness)
    for ring in range(rings):
     for a in range(steps):
      x=base+ring*steps+a;y=base+ring*steps+(a+1)%steps;z=x+steps;w=y+steps
      faces.extend([[x,y,z],[y,w,z]])
    # Caps are inside the bone and existing muscle, with 5 mm overlap at join.
    points.extend([anchor,join]);bottom=base+len(points)-2;top=bottom+1
    for a in range(steps):
     faces.extend([[bottom,base+(a+1)%steps,base+a],[top,base+rings*steps+a,base+rings*steps+(a+1)%steps]])
    original_count=len(warped);warped=np.vstack([warped,points]);indices=np.vstack([indices,faces]).astype('<u4')
    sacral_extension={'sourceGapMm':float(np.min(dist)*1000),'overlapMm':5,'boneAnchor':anchor.tolist(),'sourceVertexCount':original_count,'method':'Added short caudal teaching fascicle to the dorsal sacrum; all original lumbar vertices preserved. Not a specimen tendon-footprint reconstruction.'}
   groups=[indices]
   if name is None:
    groups=components(original,indices)
    if len(groups)!=4:raise ValueError(f'Expected four dorsal interossei, found {len(groups)}')
    groups.sort(key=lambda i:np.mean(np.abs(original[np.unique(i),0])))
   for k,faces in enumerate(groups):
    key=name or f'{ordinals[k].lower()} dorsal interosseous of foot'
    chinese=label or f'第{k+1}足背骨间肌'
    v,i=compact(warped,faces)
    id='ZA-'+key.replace(' ','-')+'-'+suffix
    normals=np.zeros(v.shape)
    t=v[i];face_normals=np.cross(t[:,1]-t[:,0],t[:,2]-t[:,0])
    for c in range(3):np.add.at(normals,i[:,c],face_normals)
    normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-12)
    # Portable, reproducible compact payload; source FBX remains a download input.
    payload=v.astype('<f4').tobytes()+np.round(normals*32767).astype('<i2').tobytes()
    payload+=bytes(-len(payload)%4)+i.astype('<u4').tobytes()
    file=id+'.bin.gz';(out/file).write_bytes(gzip.compress(payload,compresslevel=9,mtime=0))
    rows.append({'id':id,'name':side.title()+' '+key,'displayName':('右侧' if side=='right' else '左侧')+' · '+chinese,'side':side,'conceptId':'ZA:'+key,'sourceMesh':source_name+suffix,'file':file,'vertexCount':len(v),'indexCount':i.size,'positions':0,'normals':v.size*4,'indices':(v.size*6+3)//4*4,'license':'CC-BY-SA-4.0','source':'https://github.com/LluisV/Z-Anatomy-Sample',**({'sacralExtension':sacral_extension} if sacral_extension else {})})
    report.append({'id':id,'vertices':len(v),'faces':len(i),'sourceMesh':source_name+suffix,'min':v.min(0).tolist(),'max':v.max(0).tolist(),'maxDisplacementMm':float(np.max(np.linalg.norm(warped[:len(original)]-original,axis=1))*1000),'region':region})
 # Named source connective structures use the same registered displacement
 # fields as their associated muscles; they remain separate selectable tissue.
 connective=[]
 for side,suffix in [('right','r'),('left','l')]:
  trunk=[n for n in fits if n.startswith(('Vertebra_','Sacrum','Hip_bone','Xiphoid','Body_of_sternum','Manubrium','Costal_')) or re.match(r'(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth)_rib',n)]
  trunk+=[n for n in fits if n in ['Humerus'+suffix,'Scapula'+suffix]]
  warp=field(fits,trunk,[s+suffix for s,_,_,region in configs if region=='trunk'])[0]
  for layer,chinese,related in [('Posterior','后层',['latissimus dorsi','internal oblique','transversus abdominis','multifidus lumborum']),('Middle','中层',['transversus abdominis','internal oblique','quadratus lumborum']),('Anterior','前层',['quadratus lumborum'])]:
   sn=f'{layer}_layer_of_thoracolumbar_fascia{suffix}';v,i=geom(sn);v=fair_displacement(v,warp(v),i)
   if layer=='Middle':
    # The source's medial edge stops short of several transverse processes.
    # Transfer the medial sheet edge to the actual ipsilateral lumbar tips;
    # leave the iliac origin and lateral aponeurotic seam in place.
    tips=[]
    for n in range(1,6):
     bone=targets[fits[f'Vertebra_L{n}']['target']]
     signed=bone[:,0]*(1 if side=='left' else -1)
     patch=bone[signed>np.quantile(signed,.99)]
     tips.append(patch.mean(0))
    tips=np.array(sorted(tips,key=lambda p:p[1]));width=np.abs(v[:,0]);lo,hi=np.quantile(width,[.03,.97])
    w=np.clip((hi-width)/max(hi-lo,1e-5),0,1)**3
    band=np.clip((v[:,1]-(tips[0,1]-.018))/.018,0,1)*np.clip(((tips[-1,1]+.018)-v[:,1])/.018,0,1)
    for axis in [0,2]:
     edge=np.interp(v[:,1],tips[:,1],tips[:,axis]);v[:,axis]+=(edge-v[:,axis])*w*band
   key=f'{layer.lower()} layer of thoracolumbar fascia';id='ZA-'+key.replace(' ','-')+'-'+suffix
   connective.append((id,side.title()+' '+key,('右侧' if side=='right' else '左侧')+' · 胸腰筋膜'+chinese,side,sn,v,i,related,'fascia'))
  if side=='right':
   v,i=geom('Linea_alba');v=fair_displacement(v,warp(v),i)
   connective.append(('ZA-linea-alba','Linea alba','腹白线','','Linea_alba',v,i,['rectus abdominis','external oblique','internal oblique','transversus abdominis'],'fascia'))
 connective_rows=[]
 for id,name,label,side,sn,v,i,related,kind in connective:
  normal=np.zeros(v.shape);t=v[i];fn=np.cross(t[:,1]-t[:,0],t[:,2]-t[:,0])
  for c in range(3):np.add.at(normal,i[:,c],fn)
  normal/=np.maximum(np.linalg.norm(normal,axis=1)[:,None],1e-12)
  payload=v.astype('<f4').tobytes()+np.round(normal*32767).astype('<i2').tobytes();offset=(len(payload)+3)//4*4
  payload+=bytes(-len(payload)%4)+i.astype('<u4').tobytes();file=id+'.bin.gz';(out/file).write_bytes(gzip.compress(payload,compresslevel=9,mtime=0))
  connective_rows.append({'id':id,'name':name,'displayName':label,'side':side,'conceptId':'ZA:'+name,'sourceMesh':sn,'file':file,'vertexCount':len(v),'indexCount':i.size,'positions':0,'normals':v.size*4,'indices':offset,'license':'CC-BY-SA-4.0','source':'https://github.com/LluisV/Z-Anatomy-Sample','relatedMuscles':related,'kind':kind})
 (out/'manifest.json').write_text(json.dumps({'source':'https://github.com/LluisV/Z-Anatomy-Sample','license':'CC-BY-SA-4.0','parts':rows,'connective':connective_rows},ensure_ascii=False,indent=2),encoding='utf-8')
 (ROOT/'build/z-import-review.json').write_text(json.dumps({'bones':fits,'parts':report},indent=2))
 print(json.dumps({'importedParts':len(rows),'vertices':sum(p['vertexCount'] for p in rows)}))

if __name__=='__main__':
 fits=fit_bones();build_import(fits)
