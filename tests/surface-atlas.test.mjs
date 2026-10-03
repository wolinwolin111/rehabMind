import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import * as T from 'three';
import {createHash} from 'node:crypto';
import {acceleratedRaycast,computeBoundsTree} from 'three-mesh-bvh';
import {knowledge} from '../api/knowledge.mjs';
import {resolveAssessment} from '../api/resolver.mjs';
import {meta,raw,atlasRaw,asBuffer,surface,positions,indices,mesh,report,rayAt,localizeFace,decodeSurfaceAtlas,chooseGestureRegion} from './helpers/surface-atlas.mjs';

test('the atlas reads exact points of a triangle and supports future body entries without anatomy branches',()=>{
 const skin=new Float32Array([0,0,0,1,0,0,0,1,0]);
 const buf=new ArrayBuffer(48);new Float32Array(buf,0,9).set(skin);new Uint32Array(buf,36,3).set([0,1,2]);
 const roots=new Int32Array([-1,1,2,3,4]);
 const entries=[null,...['SPINE','PELVIS','UPPER_LIMB','NEW_MODULE'].map((module,i)=>({regionId:`TEST-${i}`,module,side:'midline',source:'surface',displayName:module}))];
 const data={mesh:{vertexCount:3,faceCount:1,positions:0,indices:36,indexCount:3},surface_atlas:{version:1,face_count:1,roots_offset:0,nodes_offset:4,node_count:4,byte_length:20,entries,gesture_groups:[]}};
 const map=decodeSurfaceAtlas(data,roots.buffer,buf);
 for(const [x,y,index]of [[.1,.1,1],[.8,.1,2],[.1,.8,3],[1/3,1/3,4]]){
  assert.equal(localizeFace(data,map,0,{x,y,z:0}),entries[index]);
 }
 assert.equal(localizeFace(data,map,-1,{x:0,y:0,z:0}),null);
 assert.equal(localizeFace(data,map,0,{x:NaN,y:0,z:0}),null);
 assert.equal(localizeFace(data,map,0,{x:2,y:2,z:0}),null);
 const invalid=roots.slice();invalid[1]=-1; // self-reference must not hang lookup.
 assert.throws(()=>decodeSurfaceAtlas(data,invalid.buffer,buf),/定位标注/);
 assert.throws(()=>decodeSurfaceAtlas({...data,surface_atlas:{...data.surface_atlas,face_count:2}},roots.buffer,buf),/不匹配/);
});

test('previous reproduced upper lateral and posterior errors resolve at the same world points',()=>{
 const cases=JSON.parse(readFileSync(new URL('./fixtures/surface-localization-regressions.json',import.meta.url)));
 for(const row of cases){
  const selected=localizeFace(meta,surface,row.face,new T.Vector3(...row.point));
  assert.equal(selected.regionId,row.expected_region,row.name);
  assert.equal(selected.side,row.side,row.name);
  if(row.expected_region==='LL-R-005')assert.ok(!selected.areaId||['LOC-LL-GASTROC-MEDIAL','LOC-LL-GASTROC-LATERAL'].includes(selected.areaId),row.name);
  else assert.ok(!selected.areaId,row.name);
 }
});

test('actual tibial front references distinguish bone, medial surface and lateral muscle at multiple heights',()=>{
 for(const side of ['left','right'])for(const y of [.155,.195,.255,.305,.355]){
  const row=report.charts[side].find(r=>r.y===y),sign=side==='left'?1:-1;
  for(const [offset,region,area]of [[0,'LL-R-002',undefined],[-.025,'LL-R-003','LOC-LL-MEDIAL'],[.025,'LL-R-001',undefined]]){
   const hit=new T.Raycaster(new T.Vector3(sign*(row.tibial_front[0]+offset),y,1),new T.Vector3(0,0,-1)).intersectObject(mesh)[0];
   assert.ok(hit,`${side}/${y}/${offset}`);
   const selected=localizeFace(meta,surface,hit.faceIndex,hit.point);
   assert.equal(selected.regionId,region,`${side}/${y}/${offset}`);
   assert.equal(selected.areaId,area,`${side}/${y}/${offset}`);
  }
 }
});

test('genuine anterior knee, fibular head, posterior overlap and distal Achilles stay separately reachable',()=>{
 for(const side of ['left','right']){
  for(const [y,angle,region,area]of [
   [.395,0,'KNEE-R-006',undefined], [.435,0,'KNEE-R-005',undefined],
   [.425,90,'KNEE-R-011',undefined], [.40,180,'LL-R-005','LOC-KNEE-CALF-POST'],
   [.36,90,'LL-R-004',undefined], [.155,180,'AF-R-004',undefined],
   [.25,180,'LL-R-006',undefined], [.30,190,'LL-R-005',undefined],
   // At .30 / 225 the exposed source mesh is the medial gastrocnemius;
   // the old angle-only expectation incorrectly labelled it as deep tissue.
   [.30,225,'LL-R-005',undefined], [.165,225,'LL-R-007','LOC-LL-POSTMEDIAL']]){
    const hit=rayAt(side,y,angle);assert.ok(hit);
    assert.equal(hit.selected.regionId,region,`${side}/${y}/${angle}`);
    if(region==='LL-R-005'&&!area)assert.ok(!hit.selected.areaId||['LOC-LL-GASTROC-MEDIAL','LOC-LL-GASTROC-LATERAL'].includes(hit.selected.areaId),`${side}/${y}/${angle}`);
    else assert.equal(hit.selected.areaId,area,`${side}/${y}/${angle}`);
  }
 }
});

test('surface labels agree with accelerated rays across angles and map to existing clinical entries',()=>{
 const accelerated=new T.Mesh(mesh.geometry,mesh.material);
 computeBoundsTree.call(mesh.geometry,{indirect:true});accelerated.raycast=acceleratedRaycast;accelerated.updateMatrixWorld();
 let rays=0;
 const cases=[];
 for(const side of ['left','right'])for(const y of [.16,.20,.25,.30,.36,.40])for(const elevation of [-25,0,25])for(const angle of [0,45,90,135,180,190,200,225,270,315]){
  const hit=rayAt(side,y,angle,elevation);assert.ok(hit);assert.ok(hit.selected,`${side}/${y}/${angle}/${elevation}`);
  const normal=hit.face.normal.clone().multiplyScalar(.1);
  const ray=new T.Raycaster(hit.point.clone().add(normal),normal.clone().negate().normalize());ray.firstHitOnly=true;
  const ordinary=ray.intersectObject(mesh)[0],fast=ray.intersectObject(accelerated)[0];
  assert.equal(fast.faceIndex,ordinary.faceIndex);assert.ok(fast.point.distanceTo(ordinary.point)<1e-6);
  assert.equal(localizeFace(meta,surface,fast.faceIndex,fast.point)?.regionId,localizeFace(meta,surface,ordinary.faceIndex,ordinary.point)?.regionId);
  assert.equal(hit.selected.side,side);
  cases.push({side,y,angle,elevation,point:hit.point.toArray(),face:hit.faceIndex,selected:hit.selected});rays++;
 }
 const data=knowledge();
 for(const entry of meta.surface_atlas.entries.filter(Boolean)){
  const result=resolveAssessment(data,entry.areaId?{localization_area_id:entry.areaId}:{region_id:entry.regionId});
  assert.ok(result.dimensions.length);assert.equal(result.region.region_id,entry.regionId);
 }
 assert.equal(createHash('sha256').update(raw).digest('hex'),meta.surface_atlas.mesh_sha256);
 assert.ok(report.max_boundary_leaf_edge_m<=.0025);
 const runtimeSource=readFileSync(new URL('../src/localization.ts',import.meta.url),'utf8');
 assert.ok(!/REG-LL|REG-KNEE|fallbackArea|medialPointArea|KNEE-R-/.test(runtimeSource));
 writeFileSync(new URL('../build/authoring/surface-atlas-verification.json',import.meta.url),JSON.stringify({rays,entry_checks:meta.surface_atlas.entries.length-1,mesh_unchanged:true,bvh_mismatches:0,cases},null,2)+'\n');
});

test('authored gesture groups merge posterior boundaries without combining unrelated or opposite-side regions',()=>{
 const entry=(id,side='left')=>meta.surface_atlas.entries.find(r=>r?.regionId===id&&!r.areaId&&r.side===side);
 const groups=meta.surface_atlas.gesture_groups;
 const votes=[{hit:entry('LL-R-005'),count:8},{hit:entry('KNEE-R-013'),count:8}];
 assert.equal(chooseGestureRegion(votes,false,groups).areaId,'LOC-KNEE-CALF-POST');
 assert.ok(!chooseGestureRegion([{hit:entry('LL-R-004'),count:8},{hit:entry('KNEE-R-006'),count:8}],true,groups).areaId);
 assert.ok(!chooseGestureRegion([{hit:entry('LL-R-005'),count:8},{hit:entry('KNEE-R-013','right'),count:8}],true,groups).areaId);
});
