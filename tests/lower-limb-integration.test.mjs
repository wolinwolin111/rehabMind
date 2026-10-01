import test from 'node:test';
import assert from 'node:assert/strict';
import {knowledge} from '../api/knowledge.mjs';
import {metadata,resolveAssessment} from '../api/resolver.mjs';
const data=knowledge(),meta=metadata(data);
const entries=[...meta.regions.map(r=>({region_id:r.region_id})),...meta.localization_areas.map(a=>({localization_area_id:a.area_id}))];
const items=result=>result.dimensions.flatMap(d=>d.groups.flatMap(g=>g.items));
const clinical=item=>({name:item.name,purpose:item.clinical_purpose,focus:item.check_focus,findings:item.possible_findings});
const developmentTerms=/数据库|基线|映射|开发|接入|模块暂|模板|占位|内部规则|运行快照|前端|字段/;

test('regional and boundary entries preserve shared content when activities are selected and cancelled',()=>{
 for(const input of entries){
  const base=resolveAssessment(data,input);
  const modules=base.selection_regions.map(r=>r.module);
  const ids=meta.contexts.filter(c=>c.rule_type!=='SAFETY'&&c.module_codes.some(m=>modules.includes(m))).map(c=>c.rule_id);
  const expanded=resolveAssessment(data,{...input,context_rule_ids:ids});
  const list=items(expanded),byId=new Map(list.map(i=>[i.item_id,i]));
  assert.equal(list.length,byId.size,JSON.stringify(input));
  for(const original of items(base))assert.deepEqual(clinical(byId.get(original.item_id)),clinical(original),original.item_id);
  for(const item of list){
   assert.equal(item.context_sources.length,new Set(item.context_sources.map(c=>c.rule_id)).size,item.item_id);
   assert.equal(item.possible_findings.length,new Set(item.possible_findings.map(f=>f.feature_id)).size,item.item_id);
  }
  assert.deepEqual(resolveAssessment(data,{...input,context_rule_ids:[]}),base);
 }
});

test('all displayed lower-limb content excludes developer notes; internal provenance stays private',()=>{
 for(const input of entries){
  const result=resolveAssessment(data,input);
  const values=[...result.clinical_considerations,...result.related_tissues.flatMap(g=>[g.category,...g.tissues]),
   ...result.consultation_guide.flatMap(q=>[q.topic,q.core_prompt,q.optional_probe,q.question_purpose,q.information_gained,q.assessment_help]),
   ...items(result).flatMap(item=>[item.name,item.clinical_purpose,item.check_focus,...item.possible_findings.flatMap(f=>[
    f.name,f.trigger_condition,f.display_note?.text,f.location_review?.prompt,...f.treatment_goals.flatMap(g=>[g.goal,...g.methods,g.progression])])])];
  assert.ok(values.filter(Boolean).every(value=>!developmentTerms.test(value)),JSON.stringify(input));
  assert.ok(!/Source_Note|Source_URL|local-records:\/\//.test(JSON.stringify(result)));
 }
});
