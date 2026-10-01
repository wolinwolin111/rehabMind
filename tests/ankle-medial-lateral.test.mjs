import test from 'node:test';
import assert from 'node:assert/strict';
import {knowledge} from '../api/knowledge.mjs';
import {resolveAssessment} from '../api/resolver.mjs';

const data=knowledge();
const items=result=>result.dimensions.flatMap(d=>d.groups.flatMap(g=>g.items));
const get=(result,id)=>items(result).flatMap(i=>i.possible_findings).find(f=>f.feature_id===id);
const methods=f=>f.treatment_goals.flatMap(g=>g.methods);

test('inner and outer ankle expose their own default local content and display-only interview ideas',()=>{
  for(const [region,itemId,prefix,total] of [['AF-R-002','AF-LT-002','QG-AF-MED-',6],['AF-R-003','AF-LT-003','QG-AF-LAT-',5]]) {
    const result=resolveAssessment(data,{region_id:region});
    const item=items(result).find(i=>i.item_id===itemId);
    assert.equal(item.display_mode,'DEFAULT');
    assert.ok(item.clinical_purpose);
    assert.equal(item.possible_findings.length,total);
    assert.ok(item.possible_findings.every(f=>f.review_status&&f.feature_id!==f.assessment_map_id));
    assert.equal(result.consultation_guide.filter(q=>q.guide_id.startsWith(prefix)).length,3);
    assert.equal(result.consultation_guide.filter(q=>q.guide_id.startsWith('QG-AF-')).length,3);
    assert.ok(!result.consultation_guide.some(q=>q.guide_id==='QG-PROVOKE'));
    assert.ok(!JSON.stringify(result).includes('local-records://'));
    assert.ok(!JSON.stringify(result).includes('Source_Note'));
  }
});

test('tendon and neural methods stay scoped, while painful snapping and bone signs expose assessment notes',()=>{
  const inner=resolveAssessment(data,{region_id:'AF-R-002'});
  const outer=resolveAssessment(data,{region_id:'AF-R-003'});
  assert.ok(methods(get(inner,'AFM-0027-TENDON')).includes('弹力带足踝内翻训练'));
  assert.ok(!methods(get(inner,'AFM-0027-TENDON')).some(m=>m.includes('胫神经')));
  assert.ok(methods(get(inner,'AFM-0027-NERVE')).includes('胫神经松动练习'));
  assert.ok(!methods(get(inner,'AFM-0027-NERVE')).some(m=>m.includes('肌手法松解')));
  assert.deepEqual(methods(get(outer,'AFM-0028-TENDON')).slice(0,2),['足踝外翻等长抗阻训练','弹力带足踝外翻训练']);
  assert.equal(get(outer,'AFM-0028-LIGAMENT').treatment_goals[1].goal,'伴背屈活动受限');
  for(const [result,id] of [[inner,'AFM-0027-BONE'],[outer,'AFM-0028-BONE'],[outer,'AFM-0028-SNAPPING']]) {
    const finding=get(result,id);
    assert.equal(finding.has_treatment,false);
    assert.deepEqual(finding.treatment_goals,[]);
    assert.ok(finding.display_note?.text.includes('评估')||finding.display_note?.text.includes('排查'));
  }
});

test('expanded ankle content does not restore generic references or disturb earlier location hints',()=>{
  for(const region of ['AF-R-002','AF-R-003']) {
    const result=resolveAssessment(data,{region_id:region});
    const local=items(result).find(i=>['AF-LT-002','AF-LT-003'].includes(i.item_id));
    assert.ok(local.possible_findings.every(f=>!methods(f).some(m=>/局部症状管理|渐进负荷训练/.test(m))));
  }
  const old=resolveAssessment(data,{region_id:'AF-R-001'});
  assert.equal(get(old,'AFM-0026-LOCALISE'),undefined);
  assert.ok(data.clinical_extension.FindingFeature.filter(f=>f.Related_Location_Prompt).length>=10);
});
