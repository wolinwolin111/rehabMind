import test from 'node:test';
import assert from 'node:assert/strict';
import { knowledge } from '../api/knowledge.mjs';
import { resolveAssessment } from '../api/resolver.mjs';

const data=knowledge();
const findings=result=>result.dimensions.flatMap(d=>d.groups.flatMap(g=>g.items.flatMap(i=>i.possible_findings)));

test('ankle inversion lateral pain exposes tissue-scoped methods without exposing internal sources',()=>{
  const result=resolveAssessment(data,{region_id:'LL-R-004'});
  const pain=findings(result).find(f=>f.feature_id==='AFM-0025-PAIN');
  assert.equal(pain.name,'内翻时外侧疼痛');
  assert.equal(pain.has_treatment,true);
  assert.deepEqual(pain.treatment_goals.map(g=>g.goal),['腓骨肌群','外踝后方腓骨肌腱','伴关节活动受限']);
  assert.deepEqual(pain.treatment_goals.flatMap(g=>g.methods),[
    '腓骨长肌手法松解','腓骨短肌手法松解','足踝外翻等长抗阻训练',
    '弹力带足踝外翻训练','距下关节松动','中足关节松动',
  ]);
  assert.ok(!JSON.stringify(result).includes('local-records://'));
  assert.ok(!JSON.stringify(result).includes('Source_Note'));
});

test('popliteus sensitivity now has its existing methods while knee swelling keeps its separate scope',()=>{
  const result=resolveAssessment(data,{localization_area_id:'LOC-KNEE-CALF-POST'});
  const rows=findings(result);
  const popliteus=rows.find(f=>f.feature_id==='AFM-0076-SENSITIVITY');
  assert.deepEqual(popliteus.treatment_goals.flatMap(g=>g.methods),
    ['腘肌手法松解','主动膝屈伸与胫骨旋转活动']);
  const swollen=rows.find(f=>f.feature_id==='AFM-0058-SWELLING');
  assert.equal(swollen.has_treatment,false);
  assert.ok(swollen.display_note?.text);
});
