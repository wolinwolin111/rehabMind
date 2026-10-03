import test from 'node:test';
import assert from 'node:assert/strict';
import { knowledge } from '../api/knowledge.mjs';
import { resolveAssessment } from '../api/resolver.mjs';

const data=knowledge();
const items=result=>result.dimensions.flatMap(d=>d.groups.flatMap(g=>g.items));
const methods=item=>item.possible_findings.flatMap(f=>f.treatment_goals.flatMap(g=>g.methods));

test('existing anterior region entries receive authored content without changing or merging their localisation',()=>{
  for(const [region,area,prefix] of [['LL-R-001','LOC-LL-ANTERIOR','QG-LA-'],['LL-R-002','LOC-LL-ANTERIOR-BONE','QG-LAB-']]) {
    const result=resolveAssessment(data,{region_id:region});
    assert.deepEqual(result,resolveAssessment(data,{localization_area_id:area}));
    assert.deepEqual(result.selection_regions.map(r=>r.region_id),[region]);
    assert.equal(result.consultation_guide.filter(q=>q.guide_id.startsWith(prefix)).length,4);
    assert.equal(result.consultation_guide.filter(q=>q.scope==='GENERAL').length,7);
    assert.ok(!result.consultation_guide.some(q=>q.guide_id==='QG-PROVOKE'));
    assert.deepEqual(resolveAssessment(data,{region_id:region,consultation_answers:{activity:'跑步'}}),result);
    const rows=items(result);
    assert.equal(rows.length,new Set(rows.map(r=>r.item_id)).size);
    assert.ok(rows.every(r=>r.clinical_purpose&&r.possible_findings.length));
    assert.ok(!result.dimensions.some(d=>d.key==='FUNCTION'&&d.groups.length));
    assert.ok(!JSON.stringify(result).includes('local-records://'));
  }
  const rows=items(resolveAssessment(data,{region_id:'LL-R-001'}));
  for(const id of ['CORE-MUS-TA','CORE-MUS-EHL','CORE-MUS-EDL','CORE-ROM-ANK-PF','CORE-ROM-ANK-DF','CORE-CAP-DF','LL-LT-001']) {
    assert.equal(rows.find(r=>r.item_id===id)?.display_mode,'DEFAULT',id);
  }
  assert.equal(rows.find(r=>r.item_id==='CORE-MUS-PT').display_mode,'EXPAND');
});

test('bone and exertional findings keep assessment notes without inheriting soft-tissue treatment',()=>{
  const rows=items(resolveAssessment(data,{region_id:'LL-R-001'}));
  const bone=rows.find(r=>r.item_id==='LL-LT-002');
  assert.ok(bone.possible_findings.every(f=>!f.has_treatment&&f.treatment_goals.length===0&&f.display_note));
  const exertional=rows.find(r=>r.item_id==='LL-LT-001').possible_findings.find(f=>f.feature_id==='AFM-0054-EXERTIONAL');
  assert.equal(exertional.has_treatment,false);
  assert.ok(exertional.display_note.text.includes('医学评估'));
  assert.ok(methods(rows.find(r=>r.item_id==='CORE-MUS-EDL')).includes('趾长伸肌器械辅助松解（筋膜刀）'));
  assert.ok(methods(rows.find(r=>r.item_id==='CORE-CAP-DF')).includes('神经肌肉电刺激辅助背屈募集'));
  assert.ok(!methods(rows.find(r=>r.item_id==='LL-LT-001')).some(m=>/电刺激|超声|冷疗/.test(m)));
});

test('regional guide routing remains unambiguous and does not infer a guide for a neighbouring-region selection',()=>{
  assert.equal(resolveAssessment(data,{region_ids:['LL-R-001','LL-R-002']}).localization_area,null);
  const changed=structuredClone(data);
  changed.clinical_extension.LocationGuide.push({...changed.clinical_extension.LocationGuide.find(r=>r.Area_ID==='LOC-LL-ANTERIOR'),Area_ID:'TEST-AMBIGUOUS'});
  assert.equal(resolveAssessment(changed,{region_id:'LL-R-001'}).localization_area,null);
  assert.throws(()=>resolveAssessment(data,{localization_area_id:'LOC-LL-ANTERIOR',region_id:'LL-R-001'}),RangeError);
});
