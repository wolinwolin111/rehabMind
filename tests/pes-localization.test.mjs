import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {knowledge} from '../api/knowledge.mjs';
import {resolveAssessment} from '../api/resolver.mjs';
import {meta,surface,localizeFace} from './helpers/surface-atlas.mjs';

test('distal pes-associated source surfaces on both legs reach the existing pes region',()=>{
  const samples=JSON.parse(readFileSync(new URL('./fixtures/pes-surface.json',import.meta.url)));
  for(const sample of samples){
    const label=`${sample.side}/${sample.name}/${sample.point[1]}`;
    const part=meta.muscles.parts.find(p=>p.id===sample.source_part_id);
    assert.ok(part&&sample.source_face>=part.firstFace&&sample.source_face<part.firstFace+part.faceCount,label);
    assert.equal(part.name.toLowerCase().replace(/\b(left|right)\b\s*/g,'').trim(),sample.name,label);
    const [x,y,z]=sample.point;
    const hit=localizeFace(meta,surface,sample.face,{x,y,z});
    assert.equal(hit?.regionId,sample.expected_region,label);
    assert.equal(hit?.side,sample.side,label);
    assert.equal(hit?.displayName,'鹅足区 / 膝下内侧',label);
  }
  assert.equal(samples.length,12);
});

test('pes entry exposes existing muscle, knee movement and local treatment content',()=>{
  const result=resolveAssessment(knowledge(),{region_id:'KNEE-R-008'});
  assert.equal(result.region.name,'鹅足区 / 膝下内侧');
  const primary=result.dimensions.flatMap(d=>d.groups).flatMap(g=>g.items).filter(i=>i.display_mode==='DEFAULT');
  for(const id of ['CORE-MUS-SART','CORE-MUS-GRAC','CORE-MUS-ST','KNEE-ROM-EXT','KNEE-ROM-FLEX','KNEE-LT-MEDIAL']){
    assert.ok(primary.some(i=>i.item_id===id),`${id} must be directly readable`);
  }
  const local=primary.find(i=>i.item_id==='KNEE-LT-MEDIAL');
  const pes=local.possible_findings.find(f=>f.feature_id==='AFM-0080-PES');
  assert.ok(pes?.has_treatment);
  assert.ok(pes.treatment_goals.flatMap(g=>g.methods).length>0);
});
