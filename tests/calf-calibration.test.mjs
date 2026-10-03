import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {knowledge} from '../api/knowledge.mjs';
import {resolveAssessment} from '../api/resolver.mjs';
import {meta,surface,localizeFace} from './helpers/surface-atlas.mjs';

test('exposed calf muscle samples reach the matching existing regional assessment',()=>{
 const cases=JSON.parse(fs.readFileSync(new URL('./fixtures/calf-tissue-surface.json',import.meta.url)));
 const itemFor={
  'tibialis anterior':'CORE-MUS-TA','extensor digitorum longus':'CORE-MUS-EDL',
  'fibularis longus':'CORE-MUS-PL','fibularis brevis':'CORE-MUS-PB',
  'medial head of gastrocnemius':'CORE-MUS-GASTROC','lateral head of gastrocnemius':'CORE-MUS-GASTROC','soleus':'CORE-MUS-SOLEUS',
 };
 for(const row of cases){
  const label=`${row.side}/${row.name}/${row.point[1]}`;
  const source=meta.muscles.parts.find(p=>p.id===row.source_part_id);
  assert.ok(source&&row.source_face>=source.firstFace&&row.source_face<source.firstFace+source.faceCount,label);
  assert.equal(source.name.toLowerCase().replace(/\b(left|right)\b\s*/g,'').trim(),row.name,label);
  const [x,y,z]=row.point,hit=localizeFace(meta,surface,row.face,{x,y,z});
  assert.equal(hit?.regionId,row.expected_region,label);assert.equal(hit?.side,row.side,label);
  const result=resolveAssessment(knowledge(),{region_id:hit.regionId});
  const primary=result.dimensions.flatMap(d=>d.groups).flatMap(g=>g.items).filter(i=>i.display_mode==='DEFAULT');
  assert.ok(primary.some(i=>i.item_id===itemFor[row.name]),`${label}: matching muscle must be directly readable`);
 }
 assert.equal(cases.length,26);
});

test('calf calibration preserves bone landmarks and ankle entrances on both sides',()=>{
 const cases=JSON.parse(fs.readFileSync(new URL('./fixtures/calf-bone-surface.json',import.meta.url)));
 for(const row of cases){
  const [x,y,z]=row.point,hit=localizeFace(meta,surface,row.face,{x,y,z});
  assert.equal(hit?.regionId,row.expected_region,`${row.side}/${row.name}`);
  assert.equal(hit?.areaId,row.expected_area,`${row.side}/${row.name}`);
  assert.equal(hit?.side,row.side);
 }
 assert.equal(cases.length,14);
});
