"""Check imported attachment patches and mesh distortion against source anatomy."""
import json,gzip,sys,hashlib
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
from register_missing_muscles import ROOT,geom,targets,source,components,ordinals,pv,pi,meta

folder=ROOT/'assets/anatomy-supplements'
manifest=json.loads((folder/'manifest.json').read_text(encoding='utf-8'))
fits=json.loads((ROOT/'build/z-bone-registration.json').read_text())
target_triangles={p['name']:pv[pi[p['firstFace']:p['firstFace']+p['faceCount']]].astype(float) for p in meta['bones']['parts']}
def surface_distances(points,name):
 triangles=target_triangles[name];_,j=cKDTree(triangles.mean(1)).query(points,k=min(32,len(triangles)))
 t=triangles[j];p=points[:,None,:];a=t[:,:,0];b=t[:,:,1];c=t[:,:,2]
 ab=b-a;ac=c-a;ap=p-a;normal=np.cross(ab,ac);normal2=np.sum(normal*normal,axis=2)
 d00=np.sum(ab*ab,axis=2);d01=np.sum(ab*ac,axis=2);d11=np.sum(ac*ac,axis=2)
 d20=np.sum(ap*ab,axis=2);d21=np.sum(ap*ac,axis=2);den=np.maximum(d00*d11-d01*d01,1e-30)
 u=(d11*d20-d01*d21)/den;v=(d00*d21-d01*d20)/den
 plane=np.abs(np.sum(ap*normal,axis=2))/np.sqrt(np.maximum(normal2,1e-30))
 distance=np.where((u>=0)&(v>=0)&(u+v<=1)&(normal2>1e-24),plane,np.inf)
 for x,y in [(a,b),(b,c),(c,a)]:
  edge=y-x;q=np.clip(np.sum((p-x)*edge,axis=2)/np.maximum(np.sum(edge*edge,axis=2),1e-30),0,1)
  distance=np.minimum(distance,np.linalg.norm(p-(x+q[:,:,None]*edge),axis=2))
 return distance.min(1)*1000
attachment_groups={
 'latissimus dorsi':['Hip_bone','Humerus','Scapula'],
 'rectus abdominis':['Hip_bone','Xiphoid_process','Costal_cartilage_of_fifth_rib','Costal_cartilage_of_sixth_rib','Costal_cartilage_of_seventh_rib'],
 'internal oblique':['Hip_bone','Ninth_rib','Tenth_rib','Eleventh_rib','Twelfth_rib'],
 'transversus abdominis':['Hip_bone','Costal_cartilage_of_seventh_rib','Eighth_rib','Ninth_rib','Tenth_rib','Eleventh_rib','Twelfth_rib'],
 'quadratus lumborum':['Hip_bone','Twelfth_rib','Vertebra_L1','Vertebra_L2','Vertebra_L3','Vertebra_L4'],
 'extensor digitorum brevis':['Calcaneus','Middle_phalanx_of_second_finger_of_foot','Middle_phalanx_of_third_finger_of_foot','Middle_phalanx_of_fourth_finger_of_foot'],
 'multifidus cervicis':[f'Vertebra_C{n}' for n in range(3,8)],
 'multifidus thoracis':[f'Vertebra_T{n}' for n in range(1,13)],
 'multifidus lumborum':['Sacrum']+[f'Vertebra_L{n}' for n in range(1,6)],
}
rows=[]
for p in manifest['parts']:
 raw=gzip.decompress((folder/p['file']).read_bytes());v=np.frombuffer(raw,dtype='<f4',count=p['vertexCount']*3).reshape(-1,3)
 i=np.frombuffer(raw,dtype='<u4',count=p['indexCount'],offset=p['indices']).reshape(-1,3)
 old,oi=geom(p['sourceMesh']);key=p['name'].replace('Right ','').replace('Left ','');suffix='r' if p['side']=='right' else 'l'
 if 'dorsal interosseous' in key:
  k=next(n for n,ordinal in enumerate(ordinals[:4]) if key.startswith(ordinal.lower()))
  groups=components(old,oi);groups.sort(key=lambda faces:np.mean(np.abs(old[np.unique(faces),0])))
  ids=np.unique(groups[k]);old=old[ids];oi=i
  bone_names=[f'{ordinals[k]}_metatarsal_bone',f'{ordinals[k+1]}_metatarsal_bone',f'Proximal_phalanx_of_{ordinals[(1 if k<2 else k)].lower()}_finger_of_foot']
 else:bone_names=attachment_groups[key]
 contacts=[]
 for bone in bone_names:
  name=bone if bone.startswith(('Vertebra_','Sacrum','Xiphoid_')) else bone+suffix
  sv,_=geom(name);d=cKDTree(sv).query(old)[0]
  # Preserve the corresponding SOURCE attachment-region vertices, rather than
  # reporting whichever point accidentally lies closest after deformation.
  patch=d<=max(.0015,float(d.min())+.0008)
  td=surface_distances(v[:len(old)][patch],fits[name]['target'])
  if name=='Sacrum' and p.get('sacralExtension'):
   # Only the bone-facing end ring/cap is an origin patch; the continuation
   # running toward the existing muscle belly should not touch the bone.
   td=surface_distances(np.vstack([v[len(old):len(old)+20],p['sacralExtension']['boneAnchor']]),'Sacrum')
  # The book describes IO ribs 9–12; the donor depicts the also-described
  # lower-three-rib variant (10–12). Keep the missing ninth-rib representation
  # explicit, rather than treating a 32 mm gap as a passed attachment.
  represented=not (key=='internal oblique' and bone=='Ninth_rib')
  contacts.append({'bone':fits[name]['target'],'sourceBone':name,'representedInSource':represented,'sourcePatchVertices':int(patch.sum()),
   **({'coverageNote':'Book: ribs 9–12; donor: ribs 10–12. UAMS/TTUHSC describe lower three or four ribs. Ninth-rib representation is absent; it is not a passed attachment.'} if not represented else {}),
   'sourceGapMm':round(float(d.min()*1000),3),'minimumMm':round(float(td.min()),3),
   'medianMm':round(float(np.median(td)),3),'p95Mm':round(float(np.quantile(td,.95)),3),
   **({'reconstructedCaudalFascicle':True,'boneAnchor':p['sacralExtension']['boneAnchor'],'attachmentGapMm':round(float(td.min()),3)} if name=='Sacrum' and p.get('sacralExtension') else {}),
   'sourceMusclePoint':old[np.argmin(d)].tolist(),'registeredMusclePoint':v[np.argmin(d)].tolist()})
 a=old[oi];b=v[i[:len(oi)]];before=np.linalg.norm(np.cross(a[:,1]-a[:,0],a[:,2]-a[:,0]),axis=1)
 after=np.linalg.norm(np.cross(b[:,1]-b[:,0],b[:,2]-b[:,0]),axis=1)
 ratio=after[before>1e-12]/before[before>1e-12]
 na=np.cross(a[:,1]-a[:,0],a[:,2]-a[:,0]);nb=np.cross(b[:,1]-b[:,0],b[:,2]-b[:,0]);dot=np.sum(na*nb,axis=1)/np.maximum(before*after,1e-15)
 rows.append({'id':p['id'],'name':p['name'],'assetSha256':hashlib.sha256(raw).hexdigest(),'contacts':contacts,'areaRatioP01':round(float(np.quantile(ratio,.01)),3),'areaRatioP99':round(float(np.quantile(ratio,.99)),3),'normalDirectionChangeFraction':float(np.mean(dot<-.1)), 'normalDirectionNote':'Source/target normal rotation is descriptive, not evidence of mesh inversion; anatomical bending also rotates normals.'})
connective_rows=[]
for p in manifest.get('connective',[]):
 raw=gzip.decompress((folder/p['file']).read_bytes());v=np.frombuffer(raw,dtype='<f4',count=p['vertexCount']*3).reshape(-1,3)
 old,i=geom(p['sourceMesh']);suffix='r' if p['side']=='right' else 'l'
 names=['Xiphoid_process','Hip_boner','Hip_bonel'] if p['name']=='Linea alba' else ['Hip_bone'+suffix]+[f'Vertebra_L{n}' for n in range(1,6)]
 contacts=[]
 for name in names:
  d=cKDTree(geom(name)[0]).query(old)[0];patch=d<=d.min()+.001
  distances=surface_distances(v[patch],fits[name]['target'])
  contacts.append({'bone':fits[name]['target'],'sourceGapMm':round(float(d.min()*1000),3),'registeredGapMm':round(float(distances.min()),3),'interpretation':'source connective attachment/context; broad tissue boundary is not an individual tendon footprint'})
 connective_rows.append({'id':p['id'],'name':p['name'],'assetSha256':hashlib.sha256(raw).hexdigest(),'contacts':contacts,'relatedMuscles':p['relatedMuscles']})
quality=json.loads((ROOT/'build/z-field-quality.json').read_text())
report={'method':'Named source bone surface registration plus smooth displacement; attachment patches are preserved source muscle vertices nearest the documented bone. Distances use closest points on 32 nearby target triangles and conservatively bound true surface distance. This is a geometric teaching-model check, not validated tendon-footprint or specimen anatomy.','registrationFieldSamples':quality,'parts':rows,'connective':connective_rows}
(ROOT/'docs/MISSING_MUSCLE_ATTACHMENT_REVIEW.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'parts':len(rows),'maxRepresentedPatchP95Mm':max(c['p95Mm'] for p in rows for c in p['contacts'] if c['representedInSource']),'warnings':[(p['name'],c['bone'],c['p95Mm']) for p in rows for c in p['contacts'] if c['representedInSource'] and c['p95Mm']>6],'notRepresented':[(p['name'],c['bone']) for p in rows for c in p['contacts'] if not c['representedInSource']]},ensure_ascii=True))
