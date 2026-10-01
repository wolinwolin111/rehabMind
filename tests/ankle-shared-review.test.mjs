import test from 'node:test';
import assert from 'node:assert/strict';
import {knowledge} from '../api/knowledge.mjs';
import {resolveAssessment} from '../api/resolver.mjs';

const data=knowledge();
const allItems=r=>r.dimensions.flatMap(d=>d.groups.flatMap(g=>g.items));
const methods=f=>f.treatment_goals.flatMap(g=>g.methods);
const getItem=(id)=>{
  const placements=data.tables['05_RegionClinicalMap'].filter(r=>r.clinical_item_id===id);
  const items=placements.flatMap(p=>allItems(resolveAssessment(data,{region_id:p.region_id})));
  const item=items.find(i=>i.item_id===id);
  assert.ok(item,`Public entry missing: ${id}`);
  return item;
};

test('three joint projects expose specific restricted-motion methods and separate pain navigation',()=>{
  for(const [itemId,mapId,expected] of [
    ['AF-ASM-002','AFM-0002','距小腿关节松动'],
    ['AF-JNT-002','AFM-0020','跟骨／距下关节松动'],
    ['AF-JNT-003','AFM-0021','骰骨松动'],
  ]) {
    const item=getItem(itemId);
    assert.ok(!item.possible_findings.some(f=>f.feature_id===`${mapId}-BASELINE`));
    const limit=item.possible_findings.find(f=>f.feature_id===`${mapId}-RECORD-LIMIT`);
    assert.ok(methods(limit).includes(expected));
    assert.ok(!methods(limit).some(m=>/活动改善/.test(m)));
    const pain=item.possible_findings.find(f=>f.feature_id===`${mapId}-PAIN`);
    assert.ok(pain.location_review?.prompt);
    assert.equal(pain.location_review?.action_label,'选择疼痛部位');
    assert.equal(pain.has_treatment,false);
  }
  const excess=getItem('AF-JNT-002').possible_findings.find(f=>f.feature_id==='AFM-0020-EXCESS');
  assert.equal(excess.treatment_goals[0].goal,'伴负重稳定控制不足');
  assert.ok(!methods(excess).some(m=>m.includes('松动')));
});

test('long toe flexors expose sourced methods for restriction and do not apply them to undifferentiated pain',()=>{
  for(const [itemId,mapId,muscle] of [['CORE-MUS-FDL','AFM-0048','趾长屈肌'],['CORE-MUS-FHL','AFM-0047','拇长屈肌']]) {
    const item=getItem(itemId);
    const limit=item.possible_findings.find(f=>f.feature_id===`${mapId}-LENGTH`);
    assert.ok(!methods(limit).includes(`${muscle}肌腹手法松解`));
    assert.ok(limit.treatment_goals.some(g=>g.goal==='伴内踝后方屈趾肌腱不适'&&g.methods.includes('内踝后方屈趾肌腱周围软组织手法')));
    assert.ok(methods(limit).some(m=>m.includes('牵伸')));
    assert.ok(limit.display_note?.text.includes('肌腹、内踝肌腱与足底'));
    const pain=item.possible_findings.find(f=>f.feature_id===`${mapId}-PAIN`);
    assert.deepEqual(methods(pain),[]);
    assert.ok(pain.location_review?.prompt.includes('肌腹、内踝或足底'));
    assert.ok(!JSON.stringify(item).includes('Source_Note'));
    assert.ok(!JSON.stringify(item).includes('local-records://'));
  }
});

test('retired generic rows cannot reappear in any applicable public region or location',()=>{
  const entries=[...data.tables['01_Region'].map(r=>({region_id:r.region_id})),
    ...data.clinical_extension.LocationGuide.map(l=>({localization_area_id:l.Area_ID}))];
  for(const input of entries) {
    const result=resolveAssessment(data,input);
    for(const item of allItems(result).filter(i=>['AF-ASM-002','AF-JNT-002','AF-JNT-003'].includes(i.item_id))) {
      assert.ok(item.possible_findings.every(f=>!f.feature_id.endsWith('-BASELINE')));
      assert.ok(item.possible_findings.flatMap(methods).every(m=>!/区域关节活动改善|距小腿关节活动改善/.test(m)));
    }
  }
});
