import test from 'node:test';
import assert from 'node:assert/strict';
import { knowledge } from '../api/knowledge.mjs';
import { resolveAssessment } from '../api/resolver.mjs';

const data=knowledge();
const items=result=>result.dimensions.flatMap(d=>d.groups.flatMap(g=>g.items));
const methods=item=>item.possible_findings.flatMap(f=>f.treatment_goals.flatMap(g=>g.methods));

test('posterior upper and lower regions have separate questions and direct assessments without inferring neighbouring areas',()=>{
  for(const [region,area,prefix,local] of [
    ['LL-R-005','LOC-LL-POSTUPPER','QG-LPU-','LL-LT-005'],
    ['LL-R-006','LOC-LL-POSTLOWER','QG-LPL-','LL-LT-006']
  ]) {
    const result=resolveAssessment(data,{region_id:region});
    assert.deepEqual(result,resolveAssessment(data,{localization_area_id:area}));
    assert.deepEqual(result.selection_regions.map(r=>r.region_id),[region]);
    assert.equal(result.consultation_guide.filter(q=>q.guide_id.startsWith(prefix)).length,4);
    assert.equal(result.consultation_guide.filter(q=>q.scope==='GENERAL').length,7);
    assert.deepEqual(result,resolveAssessment(data,{region_id:region,consultation_answers:{activity:'提踵'}}));
    const rows=items(result);
    assert.equal(rows.length,new Set(rows.map(i=>i.item_id)).size);
    assert.deepEqual(new Set(rows.filter(i=>i.display_mode==='DEFAULT').map(i=>i.item_id)),
      new Set(['CORE-MUS-GASTROC','CORE-MUS-SOLEUS','CORE-ROM-ANK-DF','CORE-CAP-PF',local]));
    assert.equal(rows.find(i=>i.item_id==='CORE-MUS-TP').display_mode,'EXPAND');
    assert.ok(rows.every(i=>i.clinical_purpose&&i.possible_findings.length));
    assert.ok(!result.dimensions.some(d=>d.key==='FUNCTION'&&d.groups.length));
    assert.ok(!JSON.stringify(result).includes('local-records://'));
  }
  assert.equal(resolveAssessment(data,{region_ids:['LL-R-005','LL-R-006']}).localization_area,null);
  assert.equal(resolveAssessment(data,{localization_area_id:'LOC-KNEE-CALF-POST'}).localization_area.area_id,'LOC-KNEE-CALF-POST');
  assert.equal(resolveAssessment(data,{localization_area_id:'LOC-LL-POSTMEDIAL'}).localization_area.area_id,'LOC-LL-POSTMEDIAL');
});

test('swelling and exertional changes retain their own notes without receiving routine muscle methods',()=>{
  const rows=items(resolveAssessment(data,{region_id:'LL-R-006'}));
  for(const id of ['LL-LT-005','LL-LT-006']) {
    const local=rows.find(i=>i.item_id===id);
    for(const feature of local.possible_findings.filter(f=>/SWELLING|EXERTIONAL/.test(f.feature_id))) {
      assert.equal(feature.has_treatment,false);
      assert.deepEqual(feature.treatment_goals,[]);
      assert.ok(feature.display_note?.text);
    }
    const activity=local.possible_findings.find(f=>f.feature_id.endsWith('-ACTIVITY'));
    assert.equal(activity.has_treatment,true);
    assert.deepEqual(activity.treatment_goals.flatMap(g=>g.methods),
      [id==='LL-LT-005'?'腓肠肌手法松解':'比目鱼肌手法松解']);
    assert.match(activity.treatment_goals[0].goal,/肌腹/);
  }
});

test('posterior methods keep their muscle and knee-position distinctions and replace vague sensitivity prose',()=>{
  const rows=items(resolveAssessment(data,{region_id:'LL-R-006'}));
  const gastroc=rows.find(i=>i.item_id==='CORE-MUS-GASTROC');
  const soleus=rows.find(i=>i.item_id==='CORE-MUS-SOLEUS');
  assert.ok(methods(gastroc).includes('伸膝位腓肠肌牵伸'));
  assert.ok(methods(soleus).includes('屈膝位比目鱼肌牵伸'));
  assert.ok(methods(soleus).includes('比目鱼肌器械辅助松解（筋膜刀）'));
  assert.ok([...gastroc.possible_findings,...soleus.possible_findings].every(f=>f.name!=='局部敏感'));
  const strength=methods(rows.find(i=>i.item_id==='CORE-CAP-PF'));
  for(const method of ['站立提踵','坐位提踵','提踵慢速下降训练']) assert.ok(strength.includes(method));
  assert.ok(!strength.some(m=>/松解/.test(m)));
  assert.ok(!methods(soleus).some(m=>/调整诱发动作负荷|冷疗|超声/.test(m)));
  assert.ok(methods(rows.find(i=>i.item_id==='LL-LT-006')).includes('比目鱼肌手法松解'));
});
