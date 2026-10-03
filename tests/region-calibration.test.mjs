import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {resolveAssessment} from '../api/resolver.mjs';
import {meta,surface,localizeFace} from './helpers/surface-atlas.mjs';
const data=JSON.parse(readFileSync(new URL('../build/knowledge/runtime.json',import.meta.url),'utf8'));
const items=result=>result.dimensions.flatMap(d=>d.groups.flatMap(g=>g.items));

test('all lower-limb regions and added subdivisions have reachable baked surface leaves',()=>{
 const labels=new Set(),branches=new Set(),pending=[...surface.roots];
 while(pending.length){
  const value=pending.pop();
  if(value>=0){if(value)labels.add(value);continue;}
  const offset=-value-1;
  if(branches.has(offset))continue;
  branches.add(offset);for(let i=0;i<4;i++)pending.push(surface.nodes[offset+i]);
 }
 const reachable=[...labels].map(id=>meta.surface_atlas.entries[id]);
 for(const side of ['left','right']){
  for(const region of data.tables['01_Region']){
   if(region.region_id==='KNEE-R-015')continue; // Broad knee is a circle aggregate.
   assert.ok(reachable.some(e=>e.side===side&&e.regionId===region.region_id),`${side}/${region.region_id} missing surface`);
  }
  for(const id of ['LOC-THIGH-ANTMED','LOC-THIGH-ANTLAT','LOC-THIGH-POSTMED','LOC-THIGH-POSTLAT','LOC-THIGH-SART','LOC-TOE-HALLUX','LOC-TOE-LESSER']){
   assert.ok(reachable.some(e=>e.side===side&&e.areaId===id),`${side}/${id} missing surface`);
  }
 }
});

test('explicit thigh subdivisions keep anatomical priorities while a whole-region query keeps its default guide',()=>{
 for(const [area,region,first]of [
  ['LOC-THIGH-ANTMED','THIGH-R-001','CORE-MUS-VM'],
  ['LOC-THIGH-ANTLAT','THIGH-R-001','CORE-MUS-VL'],
  ['LOC-THIGH-POSTMED','THIGH-R-002','CORE-MUS-ST'],
  ['LOC-THIGH-POSTLAT','THIGH-R-002','CORE-MUS-BF'],
  ['LOC-THIGH-SART','THIGH-R-001','CORE-MUS-SART'],
 ]){
  const result=resolveAssessment(data,{localization_area_id:area});
  assert.equal(result.region.region_id,region);
  const visible=items(result).filter(i=>i.item_id.startsWith('CORE-MUS-')&&i.display_mode==='DEFAULT');
  assert.equal(visible[0].item_id,first);
  assert.equal(visible[0].display_mode,'DEFAULT');
  if(area==='LOC-THIGH-SART') {
   assert.deepEqual(result.consultation_guide.filter(q=>q.scope!=='GENERAL').map(q=>q.guide_id),['QG-SART-1','QG-SART-2','QG-SART-3']);
   assert.ok(!result.consultation_guide.some(q=>q.guide_id.startsWith('QG-THIGH-')));
  } else assert.ok(result.consultation_guide.some(q=>q.guide_id.startsWith('QG-THIGH-')));
  assert.ok(result.related_tissues.length);
  for(const side of ['left','right']) assert.ok(meta.surface_atlas.entries.some(e=>e?.areaId===area&&e.side===side),`${area}/${side} unreachable`);
  const baseline=resolveAssessment(data,{region_id:region});
  assert.equal(baseline.localization_area.area_id,`LOC-${region}`);
  assert.ok(!JSON.stringify(result.related_tissues).includes('模型'));
 }
});

test('actual foot landmark selections reach the named clinical location rather than old permuted region IDs',()=>{
 const fixtures=JSON.parse(readFileSync(new URL('./fixtures/full-lower-limb-surface.json',import.meta.url),'utf8'));
 const expected={
  'navicular medial':['舟骨','CORE-MUS-TP'],
  'fifth base lateral':['第五跖骨','CORE-MUS-PB'],
  'midfoot dorsal':['足背','CORE-MUS-EHL'],
  'arch plantar':['足弓','AF-MUS-014'],
 };
 for(const [name,[label,itemId]]of Object.entries(expected))for(const side of ['left','right']){
  const fixture=fixtures.find(r=>r.name===name&&r.side===side);assert.ok(fixture);
  const hit=localizeFace(meta,surface,fixture.face,new T.Vector3(...fixture.point));
  const result=resolveAssessment(data,hit.areaId?{localization_area_id:hit.areaId}:{region_id:hit.regionId});
  assert.ok(result.localization_area.display_name.includes(label),`${name}/${side}: ${result.localization_area.display_name}`);
  const item=items(result).find(i=>i.item_id===itemId);assert.ok(item,`${name}/${itemId}`);assert.equal(item.display_mode,'DEFAULT');
 }
});
