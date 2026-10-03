import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {gunzipSync} from 'node:zlib';
import * as T from 'three';
import {computeBoundsTree,acceleratedRaycast} from 'three-mesh-bvh';
async function load(path) {
  const result=await build({entryPoints:[fileURLToPath(new URL(path,import.meta.url))],bundle:true,write:false,format:'esm'});
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
const {AtlasTapTracker}=await load('../src/atlas-gesture.ts');
const {getMuscleAnatomy,isCommonMuscle,muscleKey,supplementalMuscles,getMuscleDisplayName}=await load('../src/content/muscle-anatomy.ts');
const {getBoneDisplayName}=await load('../src/content/bone-names.ts');
const {getBoneAnatomy}=await load('../src/content/bone-anatomy.ts');
const {muscleAtFace}=await load('../src/muscle-picking.ts');
const read=path=>readFileSync(new URL(path,import.meta.url));
const metadata=JSON.parse(read('../public/3d/skin.json'));
test('stationary tap selects; drag, long press, multitouch and cancelled pointers never select',()=>{
  const tracker=new AtlasTapTracker();
  tracker.down(1,10,20,0);assert.ok(tracker.up(1,12,21,120));
  tracker.down(1,10,20,0);tracker.move(1,25,20);assert.ok(!tracker.up(1,10,20,120));
  tracker.down(1,10,20,0);assert.ok(!tracker.up(1,10,20,800));
  tracker.down(1,10,20,0);tracker.down(2,20,20,10);
  assert.ok(!tracker.up(2,20,20,100));assert.ok(!tracker.up(1,10,20,150));
  tracker.down(1,10,20,0);tracker.cancel(1);assert.ok(!tracker.up(1,10,20,100));
  tracker.down(1,10,20,200);assert.ok(tracker.up(1,10,20,300));
});
test('all current atlas muscles are complete common entries or explicitly excluded structures',()=>{
  const excluded=new Set(['inferior oblique','inferior rectus','lateral rectus','levator palpebrae superioris','medial rectus','superior oblique','superior rectus','superficial perineal muscle','digastric','platysma','geniohyoid','mylohyoid','omohyoid','sternohyoid','sternothyroid','stylohyoid','thyrohyoid','anterolateral head of lateral papillary muscle of ventricle','anterior papillary muscle of ventricle','lateral papillary muscle of ventricle','posterior papillary muscle of ventricle','septal papillary muscle of ventricle','genioglossus','hyoglossus','levator veli palatini','tensor veli palatini','uvular muscle','aryepiglotticus','lateral crico-arytenoid','oblique arytenoid','oblique part of cricothyroid','posterior crico-arytenoid','straight part of cricothyroid','thyro-arytenoid','vocalis','transverse arytenoid']);
  const keys=new Set(metadata.muscles.parts.map(p=>muscleKey(p.name)));
  for(const key of keys) {
    if(excluded.has(key)) {assert.equal(isCommonMuscle(key),false);continue;}
    const facts=getMuscleAnatomy(key);assert.ok(facts,key);
    for(const field of ['origin','insertion','action','source']) assert.ok(facts[field]?.trim(),key+'/'+field);
    assert.match(facts.source,/^https:\/\//);
  }
  assert.deepEqual(new Set([...keys].filter(key=>!isCommonMuscle(key))),excluded);
  for(const p of metadata.muscles.parts.filter(p=>isCommonMuscle(p.name))) assert.match(getMuscleDisplayName(p.name,p.displayName),/[\u4e00-\u9fff]/,p.name);
  for(const p of supplementalMuscles) {assert.ok(getMuscleAnatomy(p.name));assert.ok(!keys.has(p.name),p.name);}
  assert.notEqual(getMuscleAnatomy('Long head of right triceps brachii').origin,getMuscleAnatomy('Medial head of right triceps brachii').origin);
  assert.match(getMuscleAnatomy('Right rectus femoris').origin,/直头.*髂前下棘.*反折头.*髋臼上缘/);
  console.log({modeledCommonNames:[...keys].filter(isCommonMuscle).length,excludedNames:excluded.size,supplementalNames:supplementalMuscles.length});
});
test('bone identities cover the packed index without gaps; actual rays identify patella, tibia and humerus',()=>{
  const meta=metadata.bones;
  let end=0;
  for(const p of meta.parts){assert.equal(p.firstFace,end);assert.equal(muscleAtFace(meta.parts,end)?.id,p.id);end+=p.faceCount;}
  assert.equal(end*3,meta.indexCount);
  assert.equal(getBoneDisplayName('Right tibia'),'右侧 · 胫骨');
  assert.equal(getBoneDisplayName('Left major alar cartilage'),null);
  const raw=gunzipSync(read('../public/3d/bones.pack'));
  const buffer=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
  const positions=new T.BufferAttribute(new Float32Array(buffer,meta.positions,meta.vertexCount*3),3);
  const indices=new Uint32Array(buffer,meta.indices,meta.indexCount);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',positions);geometry.setIndex(new T.BufferAttribute(indices,1));
  computeBoundsTree.call(geometry,{indirect:true});
  const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.raycast=acceleratedRaycast;mesh.updateMatrixWorld();
  const ray=new T.Raycaster();ray.firstHitOnly=true;
  for(const name of ['Right patella','Right tibia','Left humerus']) {
    const part=meta.parts.find(p=>p.name.toLowerCase()===name.toLowerCase());assert.ok(part,name);let valid=false;
    for(let face=part.firstFace;face<part.firstFace+part.faceCount;face+=13) {
      const a=new T.Vector3().fromBufferAttribute(positions,indices[face*3]);
      const b=new T.Vector3().fromBufferAttribute(positions,indices[face*3+1]);
      const c=new T.Vector3().fromBufferAttribute(positions,indices[face*3+2]);
      const normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      const center=a.clone().add(b).add(c).multiplyScalar(1/3);
      ray.set(center.clone().addScaledVector(normal,.00001),normal.negate());
      const hit=ray.intersectObject(mesh,false)[0];
      if(hit&&muscleAtFace(meta.parts,hit.faceIndex)?.id===part.id){valid=true;break;}
    }
    assert.ok(valid,name);
  }
  geometry.dispose();mesh.material.dispose();
});
test('every selectable bone has shape, landmarks, learning context and region-specific reference',()=>{
  const selected=metadata.bones.parts.filter(p=>getBoneDisplayName(p.name));
  for(const part of selected){
    const facts=getBoneAnatomy(part.name);assert.ok(facts,part.name);
    for(const field of ['shape','landmarks','context','source'])assert.ok(facts[field]?.trim(),part.name+'/'+field);
  }
  assert.match(getBoneAnatomy('Right tibia').landmarks,/胫骨粗隆.*前缘.*内踝/);
  assert.match(getBoneAnatomy('Right fibula').landmarks,/腓骨头.*腓骨颈.*外踝/);
  assert.match(getBoneAnatomy('Eleventh thoracic vertebra').landmarks,/无典型横突肋凹/);
  assert.notEqual(getBoneAnatomy('First lumbar vertebra').shape,getBoneAnatomy('Fifth lumbar vertebra').shape);
  assert.notEqual(getBoneAnatomy('Left first metatarsal bone').landmarks,getBoneAnatomy('Left fifth metatarsal bone').landmarks);
  console.log({selectableBoneParts:selected.length,boneNames:new Set(selected.map(p=>muscleKey(p.name))).size});
});
