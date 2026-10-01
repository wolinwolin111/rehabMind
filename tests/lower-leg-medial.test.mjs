import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { knowledge } from '../api/knowledge.mjs';
import { resolveAssessment } from '../api/resolver.mjs';

const data=knowledge();
const spec=JSON.parse(readFileSync(new URL('../knowledge/review/lower_leg_medial_v1.json',import.meta.url)));
const flat=result=>result.dimensions.flatMap(d=>d.groups.flatMap(g=>g.items));
test('medial locations expose surrounding tissues, scoped questions and curated assessments without front muscles',()=>{
  for(const location of spec.locations){
    const input={localization_area_id:location.Area_ID};
    const result=resolveAssessment(data,input), items=flat(result);
    assert.equal(result.localization_area.display_name,location.Display_Name);
    assert.equal(result.consultation_guide.filter(row=>row.scope==='LOCATION').length,4);
    assert.equal(result.consultation_guide.filter(row=>row.scope==='GENERAL').length,5);
    assert.ok(!items.some(row=>row.item_id==='CORE-MUS-TA'));
    assert.deepEqual(new Set(items.filter(row=>row.display_mode==='DEFAULT').map(row=>row.item_id)),new Set(location.Primary_Item_IDs.split('|')));
    assert.equal(items.length,new Set(items.map(row=>row.item_id)).size);
    assert.ok(items.every(row=>row.clinical_purpose));
    assert.ok(items.every(row=>row.possible_findings.every(f=>f.review_status)));
    assert.ok(!result.dimensions.some(d=>d.key==='FUNCTION'&&d.groups.length));
    assert.deepEqual(resolveAssessment(data,{...input,consultation_answers:{activity:'跑步'}}),result);
  }
  const bone=flat(resolveAssessment(data,{localization_area_id:'LOC-LL-MEDIAL'})).find(row=>row.item_id==='LL-LT-003');
  assert.ok(bone.possible_findings.find(row=>row.feature_id==='AFM-0056-DIFFUSE').has_treatment);
  assert.ok(!bone.possible_findings.find(row=>row.feature_id==='AFM-0056-FOCAL').has_treatment);
  for(const location of spec.locations){
    const items=flat(resolveAssessment(data,{localization_area_id:location.Area_ID}));
    for(const id of ['CORE-MUS-TP','CORE-MUS-FDL','CORE-MUS-SOLEUS','CORE-ROM-ANK-DF','CORE-ROM-ANK-EV','CORE-CAP-INV','CORE-CAP-PF','LL-LT-007']){
      const item=items.find(row=>row.item_id===id);
      assert.equal(item?.display_mode,'DEFAULT',`${location.Area_ID}/${id} should be directly listed`);
      assert.ok(item.possible_findings.length>0);
    }
    assert.ok(items.find(row=>row.item_id==='LL-LT-007').possible_findings.every(row=>row.has_treatment));
  }
  const post=flat(resolveAssessment(data,{localization_area_id:'LOC-LL-POSTMEDIAL'}));
  assert.ok(post.some(row=>row.item_id==='CORE-MUS-GASTROC'&&row.display_mode==='DEFAULT'));
  const tp=post.find(row=>row.item_id==='CORE-MUS-TP');
  assert.ok(tp.possible_findings.some(f=>f.treatment_goals.some(goal=>goal.methods.includes('胫骨后肌手法松解'))));
  assert.ok(!resolveAssessment(data,{region_id:'LL-R-001'}).consultation_guide.some(row=>row.guide_id.startsWith('QG-LM-')||row.guide_id.startsWith('QG-LPM-')));
});

test('medial and posteromedial surfaces stay distinct from the posterior center on both legs',async()=>{
  const {rayAt}=await import('./helpers/surface-atlas.mjs');
  for(const side of ['left','right'])for(const y of [.20,.27,.32]){
    assert.equal(rayAt(side,y,270).selected.areaId,'LOC-LL-MEDIAL',`${side}/${y}/medial`);
    assert.equal(rayAt(side,y,225).selected.areaId,'LOC-LL-POSTMEDIAL',`${side}/${y}/posteromedial`);
    for(const angle of [175,180,185,190]){
      const selected=rayAt(side,y,angle).selected;
      assert.ok(['LL-R-005','LL-R-006'].includes(selected.regionId),`${side}/${y}/${angle}`);
      assert.ok(!selected.areaId,`${side}/${y}/${angle}`);
    }
  }
});
