import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveAssessment} from '../api/resolver.mjs';
const data=JSON.parse(readFileSync(new URL('../build/knowledge/runtime.json',import.meta.url)));
const resolve=area=>resolveAssessment(data,{localization_area_id:area,side:'right'});
test('every lower limb region and localization has complete read-only consultation, including pain quality',()=>{
 for(const input of [...data.tables['01_Region'].map(r=>({region_id:r.region_id})),...data.clinical_extension.LocationGuide.map(r=>({localization_area_id:r.Area_ID}))]){
  const result=resolveAssessment(data,{...input,side:'right'}),rows=result.consultation_guide;
  assert.equal(rows.filter(r=>r.guide_id==='QG-PAIN-QUALITY').length,1,JSON.stringify(input));
  assert.ok(rows.some(r=>r.scope!=='GENERAL'),JSON.stringify(input));
  assert.equal(new Set(rows.map(r=>r.guide_id)).size,rows.length);
  for(const r of rows)for(const f of ['core_prompt','question_purpose','information_gained','assessment_help'])assert.ok(r[f]?.trim(),r.guide_id+'/'+f);
  assert.ok(rows.some(r=>r.guide_id==='QG-GOAL'&&r.assessment_help.includes('能力')));
 }
 assert.ok(data.clinical_extension.ConsultationGuide.every(r=>r.Input_Mode==='Display_Only'));
});
test('junction and overlapping areas replace broader questions, without duplicate prompts',()=>{
 for(const [area,removed]of [
  ['LOC-KNEE-CALF-POST',['QG-KNEE-POST-1','QG-KNEE-POST-2','QG-KNEE-POST-3']],
  ['LOC-THIGH-SART',['QG-THIGH-R-001-1','QG-THIGH-R-003-1']],
  ['LOC-KNEE-R-008',['QG-KNEE-MEDIAL-1']],
  ['LOC-TOE-HALLUX',['QG-AF-R-012-1']],
  ['LOC-TOE-LESSER',['QG-AF-R-011-1']],
 ]){
  const rows=resolve(area).consultation_guide;
  for(const id of [...removed,'QG-PROVOKE'])assert.ok(!rows.some(r=>r.guide_id===id),area+'/'+id);
  assert.equal(new Set(rows.map(r=>r.core_prompt)).size,rows.length);
 }
 for(const area of ['LOC-LL-GASTROC-MEDIAL','LOC-LL-GASTROC-LATERAL'])assert.equal(resolve(area).consultation_guide.filter(r=>r.guide_id.startsWith('QG-LPU-')).length,4);
});
test('new teaching questions do not change assessments or intervention rules',()=>{
 const before=structuredClone(data);before.clinical_extension.ConsultationGuide=JSON.parse(readFileSync(new URL('../knowledge/review/consultation_before_v1.json',import.meta.url)));
 for(const row of data.clinical_extension.LocationGuide){
  const input={localization_area_id:row.Area_ID,side:'right'};
  const {consultation_guide:a,...old}=resolveAssessment(before,input);
  const {consultation_guide:b,...current}=resolveAssessment(data,input);
  assert.deepEqual(current,old,row.Area_ID);
 }
});
