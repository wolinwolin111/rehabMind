import test from 'node:test';
import assert from 'node:assert/strict';
import {knowledge} from '../api/knowledge.mjs';
import {resolveAssessment} from '../api/resolver.mjs';

const data=knowledge();
const items=result=>result.dimensions.flatMap(d=>d.groups.flatMap(g=>g.items));
const methods=f=>f.treatment_goals.flatMap(g=>g.methods);
const finding=(result,id)=>items(result).flatMap(i=>i.possible_findings).find(f=>f.feature_id===id);

test('anterior ankle exposes specific content, scoped mobilisation and location review',()=>{
  const result=resolveAssessment(data,{region_id:'AF-R-001'});
  const item=items(result).find(i=>i.item_id==='AF-LT-001');
  assert.equal(item.display_mode,'DEFAULT');
  assert.ok(item.clinical_purpose?.includes('关节线'));
  assert.equal(item.possible_findings.length,2);
  const limited=finding(result,'AFM-0026-DORSIFLEXION');
  assert.equal(limited.treatment_goals[0].goal,'伴背屈活动受限');
  assert.ok(methods(limited).includes('距骨后滑松动'));
  const unclear=finding(result,'AFM-0026-LOCALISE');
  assert.equal(unclear,undefined);
  assert.ok(data.clinical_extension.FindingFeature.some(f=>f.Feature_ID==='AFM-0026-LOCALISE'));
});

test('midportion and insertion references remain distinct, and acute changes retain assessment notes',()=>{
  const mid=resolveAssessment(data,{region_id:'AF-R-004'});
  const insertion=resolveAssessment(data,{region_id:'AF-R-005'});
  assert.ok(methods(finding(mid,'AFM-0029-SENSITIVITY')).includes('提踵离心训练'));
  const load=finding(insertion,'AFM-0030-SENSITIVITY');
  assert.equal(load.treatment_goals[0].goal,'平地或有限背屈范围训练');
  assert.ok(methods(load).includes('平地负重提踵'));
  assert.ok(!methods(load).some(m=>/拉伸|台阶下沉/.test(m)));
  for(const [result,id] of [[mid,'AFM-0029-SWELLING'],[insertion,'AFM-0030-SWELLING']]) {
    const acute=finding(result,id);
    assert.equal(acute.has_treatment,false);
    assert.equal(acute.treatment_goals.length,0);
    assert.ok(acute.display_note?.text.includes('完整性'));
  }
  assert.ok(!JSON.stringify([mid,insertion]).includes('局部症状管理'));
  assert.ok(!JSON.stringify([mid,insertion]).includes('local-records://'));
});

test('each ankle batch region receives only its display-only question ideas and original hints remain',()=>{
  for(const [region,prefix] of [['AF-R-001','QG-AF-FRONT-'],['AF-R-004','QG-AF-MID-'],['AF-R-005','QG-AF-INSERT-']]) {
    const result=resolveAssessment(data,{region_id:region});
    const guides=result.consultation_guide;
    assert.equal(guides.filter(g=>g.guide_id.startsWith(prefix)).length,3);
    assert.equal(guides.filter(g=>g.guide_id.startsWith('QG-AF-')).length,3);
    assert.ok(guides.every(g=>g.question_purpose&&g.information_gained&&g.assessment_help));
    assert.ok(!guides.some(g=>g.guide_id==='QG-PROVOKE'));
  }
  assert.ok(data.clinical_extension.FindingFeature.filter(f=>f.Related_Location_Prompt).length>=10);
  assert.ok(data.clinical_extension.FindingFeature.find(f=>f.Feature_ID==='AFM-0019-PAIN')?.Related_Location_Prompt);
});
