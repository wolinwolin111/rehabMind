import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
import * as T from 'three';
import {acceleratedRaycast,computeBoundsTree} from 'three-mesh-bvh';
const read = path => readFileSync(new URL(path,import.meta.url));
async function load(path){const result=await build({entryPoints:[new URL(path,import.meta.url).pathname.replace(/^\/(\w:)/,'$1')],bundle:true,write:false,format:'esm'});return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);}
const {muscleLayerRegions,muscleKey,peelMuscleIndices,musclePeelSteps,bodyDisplayGroup,bodyDisplayDepth,bodyDisplayDepths}=await load('../src/content/muscle-layers.ts');
const {isCommonMuscle}=await load('../src/content/muscle-anatomy.ts');
const {bodyMuscleAnatomy}=await load('../src/content/body-muscle-anatomy.ts');
const {muscleAtFace}=await load('../src/muscle-picking.ts');
const meta=JSON.parse(read('../public/3d/skin.json')).muscles;
const raw=gunzipSync(read('../public/3d/muscles.pack'));
const buffer=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
const indices=new Uint32Array(buffer,meta.indices,meta.indexCount);
const commonParts=meta.parts.filter(p=>isCommonMuscle(p.name));
const complete=peelMuscleIndices(indices,meta.parts,'all',0);
test('all common meshes have an explicit layer assignment, including imported trunk muscles',()=>{
 const regional=new Set(Object.values(muscleLayerRegions).flatMap(r=>r.layers.flat()));
 for(const p of commonParts)assert.ok(regional.has(muscleKey(p.name))||bodyMuscleAnatomy[muscleKey(p.name)],`unassigned: ${p.name}`);
 const ids=step=>new Set(peelMuscleIndices(indices,meta.parts,'all',step).parts.map(p=>p.name));
 assert.ok(ids(0).has('Right latissimus dorsi'));assert.ok(!ids(1).has('Right latissimus dorsi'));
 assert.ok(ids(1).has('Right rhomboid major'));assert.ok(!ids(2).has('Right rhomboid major'));
 assert.ok(ids(1).has('Right brachialis'));assert.ok(!ids(3).has('Right subscapularis'));
 assert.ok(ids(2).has('Right flexor digitorum profundus'));assert.ok(ids(3).has('Right pronator quadratus'));
 assert.ok(ids(1).has('external intercostal muscle'));assert.ok(!ids(2).has('external intercostal muscle'));
 assert.ok(ids(2).has('internal intercostal muscle'));assert.ok(ids(3).has('innermost intercostal muscle'));
 assert.ok(ids(1).has('Right serratus posterior inferior'));assert.ok(!ids(2).has('Right serratus posterior inferior'));
 for(const side of ['Right','Left']){
  assert.ok(ids(2).has(`${side} serratus posterior superior`));
  assert.ok(!ids(2).has(`${side} rhomboid major`));
  assert.ok(!ids(3).has(`${side} serratus posterior superior`));
 }
 for(const name of ['Set of right levatores costarum breves','Set of left levatores costarum breves','Set of right levatores costarum longi','Set of left levatores costarum longi'])assert.ok(ids(3).has(name));
 assert.ok(ids(2).has('Right longissimus thoracis'));assert.ok(!ids(3).has('Right longissimus thoracis'));
 assert.ok(ids(3).has('Right multifidus lumborum'));
 for(const side of ['Right','Left'])for(const name of ['quadratus lumborum','psoas major','iliacus']){
  assert.ok(ids(3).has(`${side} ${name}`),`retain posterior abdominal wall: ${side} ${name}`);
  assert.ok(!ids(4).has(`${side} ${name}`));
 }
 assert.ok(!ids(3).has('Right transversus abdominis'));
});
test('every lower-limb mesh belongs to exactly one regional dissection group',()=>{
 const start=meta.parts.findIndex(p=>/First lumbrical of right foot/i.test(p.name));
 const end=meta.parts.findIndex(p=>/Abdominal part of right pectoralis/i.test(p.name));
 const names=new Set(meta.parts.slice(start,end).map(p=>muscleKey(p.name)).filter(key=>!bodyMuscleAnatomy[key]));
 for(const p of meta.parts.filter(p=>/^ZA-.*(of-foot|digitorum-brevis)/.test(p.id)))names.add(muscleKey(p.name));
 const layered=Object.values(muscleLayerRegions).flatMap(r=>r.layers.flat());
 assert.equal(new Set(layered).size,layered.length);
 assert.deepEqual(new Set(layered),names);
});
test('peeling is reversible and preserves outside regions, source triangles and picking identity',()=>{
 for(const [region,config] of Object.entries(muscleLayerRegions)){
  let previous=meta.parts.length;
  for(let step=0;step<=config.layers.length;step++){
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
test('whole model removes every layer through the skeleton and restores source muscles',()=>{
 assert.equal(musclePeelSteps('all'),4);
 let previous=new Set(commonParts.map(p=>p.id));
 for(let step=0;step<=4;step++){
  const global=peelMuscleIndices(indices,meta.parts,'all',step);
  assert.ok(global.parts.every(p=>previous.has(p.id)));previous=new Set(global.parts.map(p=>p.id));
  for(const side of ['Right','Left'])assert.equal(global.parts.some(p=>p.name===`${side} pronator quadratus`),step<4);
 }
 const deep=peelMuscleIndices(indices,meta.parts,'all',2);
 for(const name of ['Right vastus intermedius','Right tibialis posterior','First plantar interosseous of right foot'])assert.ok(deep.parts.some(p=>p.name===name),name);
 assert.ok(!complete.parts.some(p=>/papillary|crico-arytenoid|inferior rectus/i.test(p.name)));
 assert.ok(complete.parts.some(p=>/subscapularis/i.test(p.name)));
 assert.deepEqual(peelMuscleIndices(indices,meta.parts,'all',0).indices,complete.indices);
 const final=peelMuscleIndices(indices,meta.parts,'all',musclePeelSteps('all'),new Float32Array(buffer,meta.positions,meta.vertexCount*3));
 assert.equal(final.parts.length,0);assert.equal(final.indices.length,0);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(final.positions,3));g.setIndex(new T.BufferAttribute(final.indices,1));
 computeBoundsTree.call(g,{indirect:true});const m=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));m.raycast=acceleratedRaycast;m.updateMatrixWorld();
 assert.equal(new T.Raycaster(new T.Vector3(0,1,.5),new T.Vector3(0,0,-1)).intersectObject(m).length,0);
 g.dispose();m.material.dispose();
 // Abdomen and thigh must disappear after their own last layer, rather than remain until a separate visibility toggle.
 const afterThree=peelMuscleIndices(indices,meta.parts,'all',3).parts;
 assert.ok(!afterThree.some(p=>/rectus abdominis|oblique|transversus abdominis|rectus femoris|vastus|adductor|semimembranosus/i.test(p.name)));
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
