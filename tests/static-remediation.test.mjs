import test from 'node:test';
import assert from 'node:assert/strict';
import {knowledge} from '../api/knowledge.mjs';
import {resolveAssessment} from '../api/resolver.mjs';

const data=knowledge();
const items=result=>result.dimensions.flatMap(dim=>dim.groups.flatMap(group=>group.items));
const functions=result=>result.dimensions.filter(dim=>dim.key==='FUNCTION').flatMap(dim=>dim.groups.flatMap(group=>group.items));

test('thigh sensory context exposes local sensory and motor review with distal screening as a supplement',()=>{
 for(const region of data.tables['01_Region'].filter(r=>r.module==='THIGH')){
  const baseline=resolveAssessment(data,{region_id:region.region_id});
  assert.ok(!items(baseline).some(i=>i.item_id==='THIGH-SPT-NEURO'));
  const result=resolveAssessment(data,{region_id:region.region_id,context_rule_ids:['THIGH-CX-01']});
  const local=items(result).find(i=>i.item_id==='THIGH-SPT-NEURO');assert.ok(local);
  assert.ok(items(result).some(i=>i.item_id==='CORE-SPT-NEURO-DISTAL'));
  const sensory=local.possible_findings.find(f=>f.feature_id==='AFM-0125-LATERAL');
  assert.match(sensory.trigger_condition,/大腿前外侧/);
  assert.match(sensory.display_note.text,/没有运动功能/);
  const motor=local.possible_findings.find(f=>f.feature_id==='AFM-0125-MOTOR');
  assert.match(motor.trigger_condition,/膝反射/);assert.match(motor.display_note.text,/医学评估/);
  assert.ok(local.possible_findings.every(f=>!f.has_treatment));
  assert.ok(!JSON.stringify(local).includes('local-records://'));
 }
 assert.ok(!items(resolveAssessment(data,{region_id:'AF-R-001'})).some(i=>i.item_id==='THIGH-SPT-NEURO'));
});

test('lower leg and thigh functional routes follow selected activities, have references and clear without residue',()=>{
 const expected={
  'LL-MF-01':['LL-PATTERN-IMPACT'],
  'LL-MF-02':['LL-PATTERN-PUSH','LL-PATTERN-IMPACT'],
  'LL-MF-03':['LL-PATTERN-GAIT','LL-PATTERN-PUSH'],
  'THIGH-MF-01':['THIGH-PATTERN-SAGITTAL'],
  'THIGH-MF-02':['THIGH-PATTERN-SAGITTAL'],
  'THIGH-MF-03':['THIGH-PATTERN-LATERAL'],
  'THIGH-MF-04':['THIGH-PATTERN-GAIT'],
 };
 for(const region of data.tables['01_Region'].filter(r=>['LOWER_LEG','THIGH'].includes(r.module))){
  const baseline=resolveAssessment(data,{region_id:region.region_id});assert.equal(functions(baseline).length,0);
  const rules=Object.keys(expected).filter(id=>id.startsWith(region.module==='THIGH'?'THIGH':'LL'));
  for(const rule of rules){
   const result=resolveAssessment(data,{region_id:region.region_id,context_rule_ids:[rule]});
   assert.deepEqual(new Set(functions(result).map(i=>i.item_id)),new Set(expected[rule]));
   for(const item of functions(result))for(const finding of item.possible_findings){
    assert.ok(finding.has_treatment);assert.ok(finding.treatment_goals.every(g=>g.methods.length));
    assert.ok(!JSON.stringify(finding).includes('Source_Note'));
    assert.ok(data.clinical_extension.InterventionReference.some(r=>r.Feature_ID===finding.feature_id&&r.Source_URL));
   }
  }
  const combined=resolveAssessment(data,{region_id:region.region_id,context_rule_ids:rules});
  assert.equal(functions(combined).length,3);
  assert.deepEqual(resolveAssessment(data,{region_id:region.region_id,context_rule_ids:[]}),baseline);
 }
 assert.throws(()=>resolveAssessment(data,{region_id:'THIGH-R-001',context_rule_ids:['LL-MF-01']}),RangeError);
});
