import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as T from 'three';
import {computeBoundsTree,acceleratedRaycast} from 'three-mesh-bvh';
import {meta,mesh,surface,sectionBounds,localizeFace} from '../../tests/helpers/surface-atlas.mjs';

const raw=gunzipSync(fs.readFileSync('public/3d/muscles.pack'));
const buffer=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),info=meta.muscles;
const positions=new Float32Array(buffer,info.positions,info.vertexCount*3),indices=new Uint32Array(buffer,info.indices,info.indexCount);
const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setIndex(new T.BufferAttribute(indices,1));
computeBoundsTree.call(geometry,{indirect:true});computeBoundsTree.call(mesh.geometry,{indirect:true});
const muscles=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));muscles.raycast=acceleratedRaycast;mesh.raycast=acceleratedRaycast;muscles.updateMatrixWorld();
const records=[];
for(const side of ['left','right'])for(const name of ['sartorius','gracilis','semitendinosus']){
  const part=info.parts.find(p=>p.side===side&&p.name.toLowerCase().replace(/\b(left|right)\b\s*/g,'').trim()===name);
  const samples=[],counts={};
  for(let offset=0;offset<part.faceCount;offset++){
    const face=part.firstFace+offset,point=new T.Vector3();
    for(let c=0;c<3;c++)point.add(new T.Vector3().fromArray(positions,indices[face*3+c]*3));point.multiplyScalar(1/3);
    if(point.y<.355||point.y>.435)continue;
    const b=sectionBounds(side,point.y),sign=side==='left'?1:-1;
    const center=new T.Vector3(sign*(b[0]+b[1])/2,point.y,(b[2]+b[3])/2);
    const angle=Math.atan2((Math.abs(point.x)-(b[0]+b[1])/2)/((b[1]-b[0])/2),(point.z-(b[2]+b[3])/2)/((b[3]-b[2])/2))*180/Math.PI;
    if(angle < -90 || angle > -20)continue;
    const outward=point.clone().sub(center).normalize(),origin=point.clone().addScaledVector(outward,.02);
    const ray=new T.Raycaster(origin,outward.clone().negate());ray.firstHitOnly=true;
    const m=ray.intersectObject(muscles)[0];if(!m||m.faceIndex<part.firstFace||m.faceIndex>=part.firstFace+part.faceCount)continue;
    const h=ray.intersectObject(mesh)[0];if(!h||h.distance>m.distance+.001)continue;
    const selected=localizeFace(meta,surface,h.faceIndex,h.point);if(selected?.side!==side)continue;
    counts[selected?.regionId||'null']=(counts[selected?.regionId||'null']||0)+1;
    samples.push({side,name,source_part_id:part.id,source_face:m.faceIndex,point:h.point.toArray(),face:h.faceIndex,selected});
  }
  records.push({side,name,counts,samples});
}
fs.writeFileSync('build/authoring/pes-surface-audit.json',JSON.stringify(records,null,2)+'\n');
console.log(JSON.stringify(records.map(({samples,...r})=>({...r,exposed:samples.length})),null,2));
