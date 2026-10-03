import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as T from 'three';
import {acceleratedRaycast,computeBoundsTree} from 'three-mesh-bvh';
import {meta,surface,mesh,localizeFace,sectionBounds} from '../../tests/helpers/surface-atlas.mjs';
const raw=gunzipSync(fs.readFileSync('public/3d/muscles.pack')),buf=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),info=meta.muscles;
const pos=new Float32Array(buf,info.positions,info.vertexCount*3),indices=new Uint32Array(buf,info.indices,info.indexCount);
const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setIndex(new T.BufferAttribute(indices,1));
computeBoundsTree.call(geo,{indirect:true});computeBoundsTree.call(mesh.geometry,{indirect:true});
const muscle=new T.Mesh(geo,new T.MeshBasicMaterial({side:T.DoubleSide}));muscle.raycast=acceleratedRaycast;mesh.raycast=acceleratedRaycast;muscle.updateMatrixWorld();
const targets={
 'rectus femoris':'LOC-THIGH-ANTCENT','gracilis':'LOC-THIGH-MEDIAL-GRAC',
 'adductor longus':'LOC-THIGH-MEDIAL-ADD','adductor magnus':'LOC-THIGH-MEDIAL-ADD',
 'vastus medialis':'LOC-THIGH-ANTMED','vastus lateralis':'LOC-THIGH-ANTLAT',
 'semitendinosus':'LOC-THIGH-POSTMED','semimembranosus':'LOC-THIGH-POSTMED',
 'long head of biceps femoris':'LOC-THIGH-POSTLAT','sartorius':'LOC-THIGH-SART',
};
const records=[];
for(const side of ['left','right'])for(const [name,area]of Object.entries(targets)){
 const part=info.parts.find(p=>p.side===side&&p.name.toLowerCase().replace(/\b(left|right)\b\s*/g,'').trim()===name);
 if(!part)throw Error(name);
 let exposed=0,mapped=0;const samples=[],mismatches=[];
 for(let offset=0;offset<part.faceCount;offset+=name==='gracilis'?1:Math.max(1,Math.floor(part.faceCount/250))){
  const face=part.firstFace+offset,point=new T.Vector3();
  for(let c=0;c<3;c++)point.add(new T.Vector3().fromArray(pos,indices[face*3+c]*3));point.multiplyScalar(1/3);
  if(point.y<.53||point.y>.80)continue;
  const b=sectionBounds(side,point.y),center=new T.Vector3((side==='left'?1:-1)*(b[0]+b[1])/2,point.y,(b[2]+b[3])/2);
  const outward=point.clone().sub(center).normalize();
  const ray=new T.Raycaster(point.clone().addScaledVector(outward,.03),outward.clone().negate());ray.firstHitOnly=true;
  const m=ray.intersectObject(muscle,false)[0];
  if(!m||m.faceIndex<part.firstFace||m.faceIndex>=part.firstFace+part.faceCount)continue;
  const h=ray.intersectObject(mesh,false)[0];if(!h)continue;
  const selected=localizeFace(meta,surface,h.faceIndex,h.point);
  // Medial rays can start beyond the other leg. Those rays do not represent a
  // visible point on this side and must not count as projection mismatches.
  if(selected?.side!==side||h.distance>m.distance+.001)continue;
  // Front-lateral subset is intentionally separate from the existing lateral guide.
  if(name==='vastus lateralis'&&selected?.regionId==='THIGH-R-004')continue;
  exposed++;if(selected?.areaId===area)mapped++;
  if(selected?.areaId!==area&&mismatches.length<5)mismatches.push({point:h.point.toArray(),actual:selected,source_muscle_face:m.faceIndex});
  if(samples.length<8&&selected?.areaId===area)samples.push({point:h.point.toArray(),face:h.faceIndex,source_muscle_face:m.faceIndex,source_part_id:part.id,expected_area:area});
 }
 records.push({name,side,source_part_id:part.id,exposed_probes:exposed,mapped_probes:mapped,fraction:exposed?mapped/exposed:null,samples,mismatches});
}
fs.writeFileSync('build/authoring/muscle-surface-projection-audit.json',JSON.stringify(records,null,2)+'\n');
console.log(JSON.stringify(records.map(({samples,mismatches,...r})=>r),null,2));
