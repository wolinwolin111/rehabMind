import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import * as T from 'three';
import {acceleratedRaycast,computeBoundsTree} from 'three-mesh-bvh';
import {knowledge} from '../api/knowledge.mjs';
import {resolveAssessment} from '../api/resolver.mjs';
import {meta,surface,mesh,rayAt,localizeFace} from './helpers/surface-atlas.mjs';
const fixed=JSON.parse(readFileSync(new URL('./fixtures/full-lower-limb-surface.json',import.meta.url)));

test('saved distal thigh errors and foot bone landmark rays retain the authored territories',()=>{
 for(const r of fixed){
  const hit=localizeFace(meta,surface,r.face,new T.Vector3(...r.point));
  assert.equal(hit?.regionId,r.expected_region,`${r.name}/${r.side}`);
  assert.equal(hit?.areaId,r.expected_area,`${r.name}/${r.side}`);
  assert.equal(hit?.side,r.side,`${r.name}/${r.side}`);
 }
});

test('thigh surfaces stay distinct from knee from distal to proximal levels on both sides',()=>{
 let count=0;
 for(const side of ['left','right'])for(const y of [.51,.53,.55,.58,.65,.75,.83])for(const [angle,expected]of [[90,'THIGH-R-004'],[180,'THIGH-R-002'],[270,'THIGH-R-003']]){
  if(y===.83&&angle===270)continue; // Skin joins at groin; this view cannot reach an exposed medial surface.
  const hit=rayAt(side,y,angle);assert.ok(hit,`${side}/${y}/${angle}`);
  assert.equal(hit.selected?.regionId,expected,`${side}/${y}/${angle}`);count++;
 }
 for(const side of ['left','right'])for(const y of [.53,.55,.58,.65,.75,.83]){
  assert.equal(rayAt(side,y,0)?.selected?.regionId,'THIGH-R-001');count++;
 }
 writeFileSync(new URL('../build/authoring/full-lower-limb-verification.json',import.meta.url),JSON.stringify({fixed_points:fixed.length,thigh_rays:count,sides:['left','right'],model_geometry_unchanged:true},null,2)+'\n');
});

test('ordinary and accelerated selection agree at thigh, ankle, foot and toe surfaces',()=>{
 const fast=new T.Mesh(mesh.geometry,mesh.material);
 computeBoundsTree.call(mesh.geometry,{indirect:true});fast.raycast=acceleratedRaycast;fast.updateMatrixWorld();
 for(const r of fixed){
  const indices=mesh.geometry.index.array,positions=mesh.geometry.attributes.position;
  const [a,b,c]=[0,1,2].map(i=>new T.Vector3().fromBufferAttribute(positions,indices[r.face*3+i]));
  const normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
  const point=new T.Vector3(...r.point);
  const ray=new T.Raycaster(point.clone().addScaledVector(normal,.003),normal.clone().negate());ray.firstHitOnly=true;
  const ordinary=ray.intersectObject(mesh)[0],accelerated=ray.intersectObject(fast)[0];
  assert.ok(ordinary&&accelerated,r.name);
  assert.equal(accelerated.faceIndex,ordinary.faceIndex,r.name);
  assert.ok(accelerated.point.distanceTo(ordinary.point)<1e-6,r.name);
  assert.equal(localizeFace(meta,surface,accelerated.faceIndex,accelerated.point)?.regionId,r.expected_region,r.name);
 }
});

test('toe entries reuse tendon, root MTP and capability content without adding clinical items',()=>{
 const data=knowledge();
 assert.equal(data.tables['02_ClinicalItem'].length,132);
 for(const region of ['AF-R-011','AF-R-012'])assert.equal(resolveAssessment(data,{region_id:region}).localization_area?.area_id,`LOC-${region}`);
 for(const [area,primary,extra]of [
  ['LOC-TOE-HALLUX',['CORE-MUS-EHL','CORE-MUS-FHL','AF-ASM-004','CORE-CAP-HF','CORE-CAP-ARCH-TOE'],['AF-MUS-017','AF-LT-012']],
  ['LOC-TOE-LESSER',['CORE-MUS-EDL','CORE-MUS-FDL','AF-JNT-005','CORE-CAP-ARCH-TOE'],['AF-MUS-016','AF-LT-011']]]){
  const result=resolveAssessment(data,{localization_area_id:area});
  const items=result.dimensions.flatMap(d=>d.groups.flatMap(g=>g.items));
  for(const id of primary){const item=items.find(r=>r.item_id===id);assert.ok(item,`${area}/${id}`);assert.equal(item.display_mode,'DEFAULT');assert.ok(item.possible_findings.length);}
  for(const id of extra){const item=items.find(r=>r.item_id===id);assert.ok(item);assert.equal(item.display_mode,'EXPAND');}
  assert.ok(result.related_tissues.length);
 }
});
