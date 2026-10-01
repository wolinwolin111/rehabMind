import test from 'node:test';
import assert from 'node:assert/strict';
import { knowledge } from '../api/knowledge.mjs';
import { resolveAssessment } from '../api/resolver.mjs';

const data=knowledge();
const items=result=>result.dimensions.flatMap(d=>d.groups.flatMap(g=>g.items));
const methods=item=>item.possible_findings.flatMap(f=>f.treatment_goals.flatMap(g=>g.methods));

test('lateral content has its own regional questions and primary reading list without a default action battery',()=>{
  const result=resolveAssessment(data,{region_id:'LL-R-004'});
  assert.deepEqual(result,resolveAssessment(data,{localization_area_id:'LOC-LL-LATERAL'}));
  assert.deepEqual(result.selection_regions.map(r=>r.region_id),['LL-R-004']);
  assert.equal(result.consultation_guide.filter(q=>q.guide_id.startsWith('QG-LLAT-')).length,4);
  assert.equal(result.consultation_guide.filter(q=>q.scope==='GENERAL').length,5);
  assert.ok(!result.consultation_guide.some(q=>q.guide_id==='QG-PROVOKE'));
  assert.deepEqual(result,resolveAssessment(data,{region_id:'LL-R-004',consultation_answers:{activity:'跑步'}}));
  const rows=items(result);
  assert.equal(rows.length,new Set(rows.map(r=>r.item_id)).size);
  for(const id of ['CORE-MUS-PL','CORE-MUS-PB','CORE-ROM-ANK-INV','CORE-ROM-ANK-EV','CORE-CAP-EV','LL-LT-004']) {
    assert.equal(rows.find(r=>r.item_id===id)?.display_mode,'DEFAULT',id);
  }
  for(const id of ['CORE-MUS-PT','CORE-ROM-ANK-DF','CORE-CAP-ARCH-TOE']) {
    assert.equal(rows.find(r=>r.item_id===id)?.display_mode,'EXPAND',id);
  }
  assert.ok(rows.every(r=>r.clinical_purpose&&r.possible_findings.length));
  assert.ok(!result.dimensions.some(d=>d.key==='FUNCTION'&&d.groups.length));
  assert.ok(!JSON.stringify(result).includes('local-records://'));
});

test('bone and exertional findings do not inherit muscle treatment and keep their assessment notes',()=>{
  const local=items(resolveAssessment(data,{region_id:'LL-R-004'})).find(i=>i.item_id==='LL-LT-004');
  for(const id of ['AFM-0057-BONE','AFM-0057-EXERTIONAL']) {
    const feature=local.possible_findings.find(f=>f.feature_id===id);
    assert.equal(feature.has_treatment,false);
    assert.equal(feature.treatment_goals.length,0);
    assert.ok(feature.display_note?.text);
  }
  assert.deepEqual(new Set(methods(local)),new Set(['腓骨长肌手法松解','腓骨短肌手法松解']));
});

test('specific lateral methods replace generic prose while strength stimulation stays separate from relaxation',()=>{
  const rows=items(resolveAssessment(data,{region_id:'LL-R-004'}));
  assert.ok(methods(rows.find(i=>i.item_id==='CORE-MUS-PL')).includes('腓骨长肌肌肉电刺激放松'));
  assert.ok(methods(rows.find(i=>i.item_id==='CORE-MUS-PB')).includes('腓骨短肌手法松解'));
  const strength=methods(rows.find(i=>i.item_id==='CORE-CAP-EV'));
  assert.ok(strength.includes('弹力带足踝外翻训练'));
  assert.ok(strength.includes('神经肌肉电刺激辅助外翻募集'));
  assert.ok(!strength.includes('腓骨长肌肌肉电刺激放松'));
  assert.ok(!data.clinical_extension.FindingFeature.some(f=>f.Feature_ID==='AFM-0024-BASELINE'));
  assert.ok(!data.clinical_extension.InterventionReference.some(f=>f.Reference_ID==='AFM-0024-BASELINE-METHODS'));
  assert.ok(rows.find(i=>i.item_id==='CORE-ROM-ANK-EV').possible_findings.some(f=>f.feature_id==='AFM-0024-RECORD-LIMIT'));
});
