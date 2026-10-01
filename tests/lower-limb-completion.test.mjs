import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {knowledge} from '../api/knowledge.mjs';
import {metadata,resolveAssessment} from '../api/resolver.mjs';
const data=knowledge(),meta=metadata(data);
const audit=JSON.parse(readFileSync(new URL('../build/authoring/treatment-reference-audit.json',import.meta.url)));
const spec=JSON.parse(readFileSync(new URL('../knowledge/review/lower_limb_completion_v1.json',import.meta.url)));
const flatten=r=>r.dimensions.flatMap(d=>d.groups.flatMap(g=>g.items));
test('every lower-limb region and explicit boundary guide has authored neighbouring tissues',()=>{
 for(const region of meta.regions){
  const result=resolveAssessment(data,{region_id:region.region_id});
  assert.ok(result.related_tissues.length,region.region_id);
  assert.ok(result.related_tissues.every(group=>group.category&&group.tissues.length&&new Set(group.tissues).size===group.tissues.length));
  const guide=data.clinical_extension.LocationGuide.find(g=>g.Area_ID===result.localization_area?.area_id);
  assert.ok(guide?.Related_Tissues||data.tables['01_Region'].find(r=>r.region_id===region.region_id)?.related_tissues_source);
 }
 for(const guide of meta.localization_areas)assert.ok(resolveAssessment(data,{localization_area_id:guide.area_id}).related_tissues.length,guide.area_id);
 const front=resolveAssessment(data,{region_id:'AF-R-001'}).related_tissues.flatMap(g=>g.tissues);
 assert.ok(front.includes('胫骨前肌腱'));assert.ok(!front.includes('髌腱'));
 const merged=resolveAssessment(data,{region_ids:['AF-R-001','AF-R-002']}).related_tissues;
 assert.ok(merged.every(group=>group.tissues.length===new Set(group.tissues).size));
});
test('full lower-limb checklist has no ordinary content, purpose, wording, entry or method omissions',()=>{
 for(const key of ['baseline_content_pending','mapped_items_missing_purpose','visible_items_missing_purpose','vague_active_reference_rows','unreachable_regular_maps','bare_visible_explanations','mixed_feature_candidates','overlapping_baseline_maps','baseline_vague_maps','abstract_presentation_candidates','pipeline_mismatches','relation_errors','workbook_runtime_issues'])assert.equal(audit.totals[key],0,key);
 assert.ok(audit.empty_features.every(f=>!f.reachable||f.location_review||f.category==='独立评估提示'));
 assert.ok(audit.public_wording_candidates.every(c=>!c.reachable));
});
test('foot and thigh entries expose regional questions, specific purposes, and unique items',()=>{
 for(const region of meta.regions.filter(r=>r.region_id.startsWith('THIGH')||/^AF-R-00[6-9]$|^AF-R-01[012]$/.test(r.region_id))){
  const result=resolveAssessment(data,{region_id:region.region_id});
  assert.ok(result.localization_area);
  assert.ok(result.related_tissues.length);
  const items=flatten(result);assert.equal(items.length,new Set(items.map(i=>i.item_id)).size);
  assert.ok(items.every(i=>i.clinical_purpose));
  assert.equal(result.consultation_guide.filter(g=>g.guide_id.startsWith(`QG-${region.region_id}-`)).length,3);
  assert.deepEqual(result.confirmed_findings,[]);assert.deepEqual(result.intervention_references,[]);
 }
});
test('foot padding and tendon options stay with their tissue; pain navigation does not inherit mobilisation',()=>{
 const findings=meta.regions.flatMap(r=>flatten(resolveAssessment(data,{region_id:r.region_id}))).flatMap(i=>i.possible_findings);
 const get=id=>findings.find(f=>f.feature_id===id),methods=id=>get(id).treatment_goals.flatMap(g=>g.methods);
 assert.ok(methods('AFM-0031-PAD').includes('硅胶足跟杯'));
 assert.ok(methods('AFM-0032-FASCIA').includes('足底筋膜手法松解'));
 assert.ok(methods('AFM-0036-PLATE').includes('足趾跖屈锚定贴扎'));
 assert.ok(methods('AFM-0037-SESAMOID').includes('籽骨减压垫'));
 assert.ok(methods('AFM-0027-HALLUX').includes('拇长屈肌牵伸'));
 assert.ok(methods('AFM-0027-LESSER_TOES').includes('内踝后方屈趾肌腱周围软组织手法'));
 assert.ok(!methods('AFM-0027-LESSER_TOES').includes('拇长屈肌牵伸'));
 for(const id of ['AFM-0003-PAIN','AFM-0022-PAIN','AFM-0023-PAIN','AFM-0087-SYMPTOM']){
  assert.deepEqual(methods(id),[]);assert.ok(get(id).location_review);
 }
 for(const id of ['AFM-0033-BONE','AFM-0034-BONE','AFM-0035-TRAUMA','AFM-0037-TRAUMA']){
  assert.deepEqual(methods(id),[]);assert.ok(get(id).display_note);
 }
});
test('formerly inaccessible plantaris and flexor hallucis brevis have optional or relevant regional entries',()=>{
 assert.equal(flatten(resolveAssessment(data,{region_id:'LL-R-005'})).find(i=>i.item_id==='CORE-MUS-PLANTARIS').display_mode,'EXPAND');
 assert.ok(flatten(resolveAssessment(data,{region_id:'AF-R-012'})).some(i=>i.item_id==='AF-MUS-017'));
});
test('every safety target has a public independent evaluation note and suppresses ordinary methods',()=>{
 for(const rule of data.tables['07_ContextRule'].filter(r=>r.rule_type==='SAFETY')){
  assert.ok(rule.public_note,rule.rule_id);
  for(const module of rule.module_codes.split('|')){
   const region=meta.regions.find(r=>r.module===module);
   const result=resolveAssessment(data,{region_id:region.region_id,context_rule_ids:[rule.rule_id]});
   assert.equal(result.normal_intervention_actions_enabled,false);
   assert.ok(result.safety_alerts.find(a=>a.rule_id===rule.rule_id).guidance.includes(rule.public_note));
   assert.deepEqual(result.intervention_references,[]);
  }
 }
});
test('authored clinical methods retain evidence scope internally without leaking records to product responses',()=>{
 for(const reference of spec.references)assert.ok(reference.Source_URL&&reference.Source_Note,reference.Reference_ID);
 for(const region of meta.regions){
  const publicResult=JSON.stringify(resolveAssessment(data,{region_id:region.region_id}));
  assert.ok(!/local-records:\/\/|Source_Note|Source_URL|LR-[0-9a-f]+/.test(publicResult));
 }
});
