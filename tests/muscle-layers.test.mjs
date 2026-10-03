import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
import * as T from 'three';
import {acceleratedRaycast,computeBoundsTree} from 'three-mesh-bvh';
const read = path => readFileSync(new URL(path,import.meta.url));
async function load(path){const result=await build({entryPoints:[new URL(path,import.meta.url).pathname.replace(/^\/(\w:)/,'$1')],bundle:true,write:false,format:'esm'});return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);}
const {muscleLayerRegions,muscleKey,peelMuscleIndices,musclePeelSteps}=await load('../src/content/muscle-layers.ts');
const {isCommonMuscle}=await load('../src/content/muscle-anatomy.ts');
const {bodyMuscleAnatomy}=await load('../src/content/body-muscle-anatomy.ts');
const {muscleAtFace}=await load('../src/muscle-picking.ts');
const meta=JSON.parse(read('../public/3d/skin.json')).muscles;
const raw=gunzipSync(read('../public/3d/muscles.pack'));
const buffer=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
const indices=new Uint32Array(buffer,meta.indices,meta.indexCount);
const commonParts=meta.parts.filter(p=>isCommonMuscle(p.name));
const complete=peelMuscleIndices(indices,meta.parts,'all',0);
test('every lower-limb mesh belongs to exactly one regional dissection group',()=>{
 const start=meta.parts.findIndex(p=>/First lumbrical of right foot/i.test(p.name));
 const end=meta.parts.findIndex(p=>/Abdominal part of right pectoralis/i.test(p.name));
 const names=new Set(meta.parts.slice(start,end).map(p=>muscleKey(p.name)).filter(key=>!bodyMuscleAnatomy[key]));
 const layered=Object.values(muscleLayerRegions).flatMap(r=>r.layers.flat());
 assert.equal(new Set(layered).size,layered.length);
 assert.deepEqual(new Set(layered),names);
});
test('peeling is reversible and preserves outside regions, source triangles and picking identity',()=>{
 for(const [region,config] of Object.entries(muscleLayerRegions)){
  let previous=meta.parts.length;
  for(let step=0;step<config.layers.length;step++){
   const peeled=peelMuscleIndices(indices,meta.parts,region,step);
   assert.ok(peeled.parts.length<=previous);previous=peeled.parts.length;
   const hidden=new Set(config.layers.slice(0,step).flat());
   assert.deepEqual(peeled.parts.map(p=>p.id),commonParts.filter(p=>!hidden.has(muscleKey(p.name))).map(p=>p.id));
   for(const p of peeled.parts){
    const original=meta.parts.find(o=>o.id===p.id);
    assert.deepEqual(peeled.indices.subarray(p.firstFace*3,(p.firstFace+p.faceCount)*3),indices.subarray(original.firstFace*3,(original.firstFace+original.faceCount)*3));
    assert.equal(muscleAtFace(peeled.parts,p.firstFace).id,p.id);
    assert.equal(muscleAtFace(peeled.parts,p.firstFace+p.faceCount-1).id,p.id);
   }
  }
  assert.deepEqual(peelMuscleIndices(indices,meta.parts,region,0).indices,complete.indices);
 }
});
test('whole model peeling combines lower groups with upper depths, excludes unrelated organs and restores',()=>{
 assert.equal(musclePeelSteps('all'),3);
 for(let step=0;step<=3;step++){
  const global=peelMuscleIndices(indices,meta.parts,'all',step);
  const regional=Object.keys(muscleLayerRegions).map(region=>new Set(peelMuscleIndices(indices,meta.parts,region,step).parts.map(p=>p.id)));
  assert.deepEqual(global.parts.map(p=>p.id),commonParts.filter(p=>regional.every(ids=>ids.has(p.id)) && (bodyMuscleAnatomy[muscleKey(p.name)]?.depth??3)>=step).map(p=>p.id));
 }
 const deep=peelMuscleIndices(indices,meta.parts,'all',3);
 for(const name of ['Right vastus intermedius','Right tibialis posterior','First plantar interosseous of right foot'])assert.ok(deep.parts.some(p=>p.name===name),name);
 assert.ok(!complete.parts.some(p=>/papillary|crico-arytenoid|inferior rectus/i.test(p.name)));
 assert.ok(complete.parts.some(p=>/subscapularis/i.test(p.name)));
 assert.deepEqual(peelMuscleIndices(indices,meta.parts,'all',0).indices,complete.indices);
});
test('BVH after calf peeling hits exposed deep muscles with their own identity',()=>{
 const peeled=peelMuscleIndices(indices,meta.parts,'calf',2);
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(buffer,meta.positions,meta.vertexCount*3),3));
 geometry.setIndex(new T.BufferAttribute(peeled.indices,1));
 computeBoundsTree.call(geometry,{indirect:true});
 const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.raycast=acceleratedRaycast;mesh.updateMatrixWorld();
 const ray=new T.Raycaster();ray.firstHitOnly=true;
 const positions=geometry.getAttribute('position');
 for(const name of ['Right tibialis posterior','Right flexor digitorum longus','Right popliteus']){
  const part=peeled.parts.find(p=>p.name===name);let verified=false;
  for(let face=part.firstFace;face<part.firstFace+part.faceCount;face+=7){
   const a=new T.Vector3().fromBufferAttribute(positions,peeled.indices[face*3]);
   const b=new T.Vector3().fromBufferAttribute(positions,peeled.indices[face*3+1]);
   const c=new T.Vector3().fromBufferAttribute(positions,peeled.indices[face*3+2]);
   const normal=new T.Vector3().subVectors(b,a).cross(new T.Vector3().subVectors(c,a)).normalize();
   const center=a.clone().add(b).add(c).multiplyScalar(1/3);
   ray.set(center.clone().addScaledVector(normal,.00001),normal.negate());
   const hit=ray.intersectObject(mesh,false)[0];
   if(hit&&muscleAtFace(peeled.parts,hit.faceIndex)?.id===part.id){verified=true;break;}
  }
  assert.ok(verified,name);
 }
 geometry.dispose();mesh.material.dispose();
});
