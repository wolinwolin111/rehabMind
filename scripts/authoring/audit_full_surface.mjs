import fs from 'node:fs';
import * as T from 'three';
import {meta,surface,mesh,report,rayAt,localizeFace} from '../../tests/helpers/surface-atlas.mjs';

const records=[];
function probe(name,side,center,outward,expected,area){
 const v=new T.Vector3(...outward).normalize(),c=new T.Vector3(...center);
 const distance=side==='left'&&v.x<-.3||side==='right'&&v.x>.3?.045:.5;
 const hits=new T.Raycaster(c.clone().addScaledVector(v,distance),v.clone().negate()).intersectObject(mesh);
 const hit=hits.find(h=>Math.sign(h.point.x)===(side==='left'?1:-1)&&h.point.y<.14);
 const selected=hit?localizeFace(meta,surface,hit.faceIndex,hit.point):null;
 records.push({name,side,expected,area,face:hit?.faceIndex,point:hit?.point.toArray(),actual:selected?.regionId,actual_area:selected?.areaId,ok:selected?.regionId===expected&&selected?.areaId===area});
}
for(const side of ['left','right']){
 const r=report.foot_landmarks[side],sign=side==='left'?1:-1;
 const lateral=[sign*r.lateral[0],0,r.lateral[1]],medial=lateral.map(v=>-v);
 probe('heel plantar',side,r.heel.center,[0,-1,0],'AF-R-006');
 probe('heel posterior',side,r.heel.center,[0,0,-1],'AF-R-005');
 probe('navicular medial',side,r.navicular.center,medial,'AF-R-009');
 probe('cuboid lateral',side,r.cuboid.center,lateral,'AF-R-010');
 probe('midfoot dorsal',side,r.cuneiform.center,[0,1,0],'AF-R-007');
 const arch=r.cuneiform.center.map((v,i)=>(v+r.heel.center[i])/2);
 arch[2]+=.025;
 probe('arch plantar',side,arch,[0,-1,0],'AF-R-008');
 for(const[i,m]of r.metatarsals.entries()){
  probe(`metatarsal ${i+1} head dorsal`,side,m.head,[0,1,0],i===0?'AF-R-012':'AF-R-011');
  probe(`metatarsal ${i+1} head plantar`,side,m.head,[0,-1,0],i===0?'AF-R-012':'AF-R-011');
 }
 probe('fifth base lateral',side,r.metatarsals[4].base,lateral,'AF-R-010');
 for(const[i,t]of r.toes.entries())for(const direction of [[0,1,0],[0,-1,0]]){
  probe(`toe ${i+1} ${direction[1]>0?'dorsal':'plantar'}`,side,t.distal,direction,i===0?'AF-R-012':'AF-R-011',i===0?'LOC-TOE-HALLUX':'LOC-TOE-LESSER');
 }
 for(const[y,angle,expected]of [[.10,0,'AF-R-001'],[.08,90,'AF-R-003'],[.08,270,'AF-R-002'],[.10,180,'AF-R-004']]){
  const center=[sign*.075,y,-.025];
  probe(`ankle ${y}/${angle}`,side,center,[sign*Math.sin(angle*Math.PI/180),0,Math.cos(angle*Math.PI/180)],expected);
 }
 for(const y of [.53,.55,.58,.65,.75,.83])for(const[angle,expected]of [[0,'THIGH-R-001'],[90,'THIGH-R-004'],[180,'THIGH-R-002'],[270,'THIGH-R-003']]){
  if(y===.83&&angle===270)continue; // The source skin joins at the groin: no exposed medial surface on this ray.
  const h=rayAt(side,y,angle);
  records.push({name:`thigh ${y}/${angle}`,side,expected,face:h?.faceIndex,point:h?.point.toArray(),actual:h?.selected?.regionId,ok:h?.selected?.regionId===expected});
 }
}
fs.writeFileSync('build/authoring/full-surface-landmark-audit.json',JSON.stringify(records,null,2)+'\n');
console.log(JSON.stringify({total:records.length,failed:records.filter(r=>!r.ok)},null,2));
