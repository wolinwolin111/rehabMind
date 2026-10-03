import sys,json,numpy as np,re
sys.path.insert(0,'scripts/authoring'); import register_missing_muscles as r
fits=json.load(open('build/z-bone-registration.json')); output=[]
trunkmuscles=['Latissimus_dorsi_muscle','Rectus_abdominis_muscle','Internal_abdominal_oblique_muscle','Transversus_abdominis_muscle','Quadratus_lumborum_muscle']
for suffix in ['r','l']:
 trunk=[n for n in fits if n.startswith(('Vertebra_','Sacrum','Hip_bone','Xiphoid','Body_of_sternum','Manubrium','Costal_')) or re.match(r'(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth)_rib',n)]+['Humerus'+suffix,'Scapula'+suffix]
 foot=[n for n in fits if n.endswith(suffix) and any(k in n for k in ['Calcaneus','Talus','Cuboid','metatarsal','phalanx_of_'])]
 spine=[n for n in fits if n.startswith(('Vertebra_','Sacrum','Hip_bone'))]
 for region,names,ms in [('trunk',trunk,trunkmuscles),('spine',spine,['Multifidus_colli_muscle','Multifidus_thoracis_muscle','Multifidus_lumborum_muscle']),('foot',foot,['Extensor_digitorum_brevis','Dorsal_interossei_muscles_of_foot'])]:
  f,*_=r.field(fits,names,[m+suffix for m in ms] if region!='foot' else [])
  for name in ms:
   x=r.geom(name+suffix)[0][::10];jac=[]
   for axis in range(3):
    eps=np.zeros(3);eps[axis]=1e-5;jac.append((f(x+eps)-f(x-eps))/2e-5)
   det=np.linalg.det(np.stack(jac,axis=2));row={'sourceMesh':name+suffix,'samples':len(x),'minimumDeterminant':float(det.min()),'nonpositiveSamples':int((det<=0).sum()),'p01':float(np.quantile(det,.01))};output.append(row);print(row,flush=True)
(r.ROOT/'build/z-field-quality.json').write_text(json.dumps({'smoothing':.004,'stepMetres':1e-5,'stride':10,'rows':output},indent=2))
