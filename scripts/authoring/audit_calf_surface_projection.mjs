// Compare regional labels with exposed source geometry; not clinical accuracy.
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as T from 'three';
import {acceleratedRaycast,computeBoundsTree} from 'three-mesh-bvh';
import {meta,surface,mesh,localizeFace,sectionBounds} from '../../tests/helpers/surface-atlas.mjs';

function packedMesh(info,raw){
 const buffer=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
 const positions=new Float32Array(buffer,info.positions,info.vertexCount*3);
 const indices=new Uint32Array(buffer,info.indices,info.indexCount);
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setIndex(new T.BufferAttribute(indices,1));
 computeBoundsTree.call(geometry,{indirect:true});
 const object=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));
 object.raycast=acceleratedRaycast;object.updateMatrixWorld();
 return {object,positions,indices};
}
const muscular=packedMesh(meta.muscles,gunzipSync(fs.readFileSync('public/3d/muscles.pack')));
const bones=packedMesh(meta.bones,gunzipSync(fs.readFileSync('public/3d/bones.pack')));
computeBoundsTree.call(mesh.geometry,{indirect:true});mesh.raycast=acceleratedRaycast;
const names=['tibialis anterior','extensor digitorum longus','fibularis longus','fibularis brevis','medial head of gastrocnemius','lateral head of gastrocnemius','soleus'];
const records=[];
for(const side of ['left','right'])for(const name of names){
 const part=meta.muscles.parts.find(p=>p.side===side&&p.name.toLowerCase().replace(/\b(left|right)\b\s*/g,'').trim()===name);
 if(!part)throw Error(name);
 const samples=[];
 for(let offset=0;offset<part.faceCount;offset+=Math.max(1,Math.floor(part.faceCount/250))){
  const face=part.firstFace+offset,point=new T.Vector3();
  for(let c=0;c<3;c++)point.add(new T.Vector3().fromArray(muscular.positions,muscular.indices[face*3+c]*3));point.multiplyScalar(1/3);
  if(point.y<.16||point.y>.425)continue;
  const b=sectionBounds(side,point.y),center=new T.Vector3((side==='left'?1:-1)*(b[0]+b[1])/2,point.y,(b[2]+b[3])/2);
  const outward=point.clone().sub(center).normalize();
  const ray=new T.Raycaster(point.clone().addScaledVector(outward,.20),outward.clone().negate());ray.firstHitOnly=true;
  const m=ray.intersectObject(muscular.object,false)[0],bone=ray.intersectObject(bones.object,false)[0];
  if(!m||m.faceIndex<part.firstFace||m.faceIndex>=part.firstFace+part.faceCount||bone&&bone.distance<m.distance-.0001)continue;
  const h=ray.intersectObject(mesh,false)[0];if(!h)continue;
  const selected=localizeFace(meta,surface,h.faceIndex,h.point);
  if(selected?.side!==side||h.distance>m.distance+.001)continue;
  samples.push({face:h.faceIndex,point:h.point.toArray(),source_part_id:part.id,source_face:m.faceIndex,selected});
 }
 records.push({name,side,source_part_id:part.id,samples});
}
const stage=process.argv.includes('--before')?'before':'after';
fs.writeFileSync(`build/authoring/calf-projection-${stage}.json`,JSON.stringify(records,null,2)+'\n');
console.log(JSON.stringify(records.map(({samples,...row})=>({...row,count:samples.length,labels:samples.reduce((out,s)=>{const id=s.selected.areaId||s.selected.regionId;out[id]=(out[id]||0)+1;return out;},{})})),null,2));
