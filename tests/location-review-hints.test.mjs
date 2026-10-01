import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {knowledge} from '../api/knowledge.mjs';
import {metadata,resolveAssessment} from '../api/resolver.mjs';

const data=knowledge();
const spec=JSON.parse(readFileSync(new URL('../knowledge/review/location_review_hints_v1.json',import.meta.url)));
const ankleSpec=JSON.parse(readFileSync(new URL('../knowledge/review/ankle_front_achilles_v1.json',import.meta.url)));
const hints=new Map(data.clinical_extension.FindingFeature.filter(f=>f.Related_Location_Prompt).map(h=>[h.Feature_ID,h]));
const navigationOnly=new Set([...spec.hints,...ankleSpec.features.filter(f=>f.Related_Location_Prompt)].map(h=>h.Feature_ID));
const features=new Map(data.clinical_extension.FindingFeature.map(f=>[f.Feature_ID,f]));
const seen=new Set();

test('only authored findings expose workbook hints without replacing descriptions or selecting methods',()=>{
  for(const region of metadata(data).regions) {
    const result=resolveAssessment(data,{region_id:region.region_id});
    for(const item of result.dimensions.flatMap(d=>d.groups.flatMap(g=>g.items))) {
      for(const finding of item.possible_findings) {
        const hint=hints.get(finding.feature_id);
        assert.deepEqual(finding.location_review,hint?
          {prompt:hint.Related_Location_Prompt,action_label:hint.Related_Location_Action_Label}:null);
        if(hint) {
          seen.add(finding.feature_id);
          assert.equal(finding.trigger_condition,features.get(finding.feature_id).Finding_Feature);
          if(navigationOnly.has(finding.feature_id)){
            assert.equal(finding.has_treatment,false);
            assert.deepEqual(finding.treatment_goals,[]);
          }
        }
      }
    }
  }
  assert.deepEqual(seen,new Set([...hints.keys()].filter(id=>!['AFM-0083-LOCALISE','AFM-0026-LOCALISE'].includes(id))));
  for(const hint of spec.hints)assert.equal(hints.get(hint.Feature_ID).Related_Location_Prompt,hint.Related_Location_Prompt);
});

test('a vague same-region localisation placeholder is hidden without removing pain or safety findings',()=>{
  const ankle=resolveAssessment(data,{region_id:'AF-R-001'});
  const front=ankle.dimensions.flatMap(d=>d.groups.flatMap(g=>g.items)).find(i=>i.item_id==='AF-LT-001');
  assert.ok(!front.possible_findings.some(f=>f.feature_id==='AFM-0026-LOCALISE'));
  assert.ok(front.possible_findings.some(f=>f.feature_id==='AFM-0026-DORSIFLEXION'));
  const result=resolveAssessment(data,{region_id:'KNEE-R-015'});
  const local=result.dimensions.flatMap(d=>d.groups.flatMap(g=>g.items)).find(i=>i.item_id==='KNEE-LT-DIFFUSE');
  assert.ok(local);
  assert.ok(!local.possible_findings.some(f=>f.feature_id==='AFM-0083-LOCALISE'));
  assert.ok(local.possible_findings.some(f=>f.feature_id==='AFM-0083-TRAUMATIC-SWELLING'));
  const pain=result.dimensions.flatMap(d=>d.groups.flatMap(g=>g.items)).flatMap(i=>i.possible_findings).find(f=>f.feature_id==='AFM-0084-SYMPTOM');
  assert.ok(pain?.location_review);
  assert.ok(data.clinical_extension.FindingFeature.some(f=>f.Feature_ID==='AFM-0083-LOCALISE'));
});

test('hints remain available as navigation when ordinary treatments are suppressed by safety input',()=>{
  const safety=metadata(data).contexts.find(r=>r.rule_type==='SAFETY'&&r.module_codes.includes('LOWER_LEG'));
  const result=resolveAssessment(data,{region_id:'LL-R-001',context_rule_ids:[safety.rule_id]});
  assert.equal(result.normal_intervention_actions_enabled,false);
  const pain=result.dimensions.flatMap(d=>d.groups.flatMap(g=>g.items.flatMap(i=>i.possible_findings)))
    .find(f=>f.feature_id==='AFM-0019-PAIN');
  assert.equal(pain.location_review.action_label,'选择疼痛部位');
  assert.ok(!JSON.stringify(result).includes('Source_URL'));
});
