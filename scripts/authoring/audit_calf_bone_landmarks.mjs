import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as T from 'three';
import {meta,surface,mesh,localizeFace} from '../../tests/helpers/surface-atlas.mjs';
const root='baseline/RehabMind_LowerLimbV1_ImplementationBaseline_DBv3.7_2026-09-29/04_3D_Localization/model';
const source=JSON.parse(fs.readFileSync(`${root}/atlas_metadata.json`));
const chunks=new Map();
function points(name){
 const p=source.parts.find(p=>p.name===name);if(!p)throw Error(name);
 if(!chunks.has(p.chunk))chunks.set(p.chunk,gunzipSync(fs.readFileSync(`${root}/chunks/body-${p.chunk}.bin.gz`)));
 const raw=chunks.get(p.chunk);
 const vertices=Array.from({length:p.vertexCount},(_,i)=>new T.Vector3(...[0,1,2].map(a=>raw.readFloatLE(p.positions+i*12+a*4))));
 vertices.indices=Array.from({length:p.indexCount},(_,i)=>raw.readUInt32LE(p.indices+i*4));
 return vertices;
}
const mean=rows=>{if(!rows.length)throw Error('Missing landmark geometry');return rows.reduce((sum,p)=>sum.add(p),new T.Vector3()).divideScalar(rows.length);};
function section(vertices,y){
 const rows=[];
 for(let face=0;face<vertices.indices.length;face+=3)for(let edge=0;edge<3;edge++){
  const a=vertices[vertices.indices[face+edge]],b=vertices[vertices.indices[face+(edge+1)%3]];
  if(a.y===b.y||y<Math.min(a.y,b.y)||y>Math.max(a.y,b.y))continue;
  rows.push(a.clone().lerp(b,(y-a.y)/(b.y-a.y)));
 }
 return rows;
}
const records=[];
function probe(name,side,center,outward,expected,area){
 const vector=new T.Vector3(...outward).normalize();
 // Start in the inter-leg gap for medial rays, not behind the opposite limb.
 const distance=center.x*vector.x<0?Math.min(.04,(Math.abs(center.x)-.002)/Math.abs(vector.x)):.15;
 const ray=new T.Raycaster(center.clone().addScaledVector(vector,distance),vector.clone().negate());
 const hit=ray.intersectObject(mesh)[0],selected=hit&&localizeFace(meta,surface,hit.faceIndex,hit.point);
 records.push({name,side,landmark:center.toArray(),face:hit?.faceIndex,point:hit?.point.toArray(),expected_region:expected,expected_area:area,actual:selected,ok:selected?.side===side&&selected?.regionId===expected&&selected?.areaId===area});
}
for(const side of ['left','right']){
 const title=side[0].toUpperCase()+side.slice(1),sign=side==='left'?1:-1;
 const tibia=points(`${title} tibia`),fibula=points(`${title} fibula`);
 const tibialLow=Math.min(...tibia.map(p=>p.y)),fibularLow=Math.min(...fibula.map(p=>p.y)),fibularHigh=Math.max(...fibula.map(p=>p.y));
 probe('medial malleolus',side,mean(tibia.filter(p=>p.y<tibialLow+.009)),[-sign,0,0],'AF-R-002');
 probe('lateral malleolus',side,mean(fibula.filter(p=>p.y<fibularLow+.009)),[sign,0,0],'AF-R-003');
 probe('fibular head',side,mean(fibula.filter(p=>p.y>fibularHigh-.012)),[sign,0,0],'KNEE-R-011');
 for(const y of [.20,.25,.30,.35]){
  const band=section(tibia,y),z=Math.max(...band.map(p=>p.z));
  const center=mean(band.filter(p=>p.z>z-.001));
  probe(`tibial crest ${y}`,side,center,[0,0,1],'LL-R-002');
 }
}
fs.writeFileSync('build/authoring/calf-bone-landmark-audit.json',JSON.stringify(records,null,2)+'\n');
console.log(JSON.stringify({total:records.length,failed:records.filter(r=>!r.ok)},null,2));
if(records.some(r=>!r.ok))process.exitCode=1;
