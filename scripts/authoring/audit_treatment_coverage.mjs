import fs from 'node:fs/promises';
import {metadata,resolveAssessment} from '../../api/resolver.mjs';
import {findingDisplayNote} from '../../api/finding-display.mjs';

// First run read_database_audit.py so this reads the current workbooks.
const data=JSON.parse(await fs.readFile('build/authoring/database-audit-snapshot.json','utf8'));
const spec=JSON.parse(await fs.readFile('knowledge/review/treatment_gap_repair_v1.json','utf8'));
const ankleBatch=JSON.parse(await fs.readFile('knowledge/review/ankle_front_achilles_v1.json','utf8'));
const ankleSides=JSON.parse(await fs.readFile('knowledge/review/ankle_medial_lateral_v1.json','utf8'));
const ankleShared=JSON.parse(await fs.readFile('knowledge/review/ankle_shared_review_v1.json','utf8'));
const completion=JSON.parse(await fs.readFile('knowledge/review/lower_limb_completion_v1.json','utf8'));
const dispositions={...spec.gap_dispositions,...ankleBatch.gap_dispositions,...ankleSides.gap_dispositions,...ankleShared.gap_dispositions,...completion.gap_dispositions};
// Read the approved overlays used to build the current workbooks, rather than
// treating their later review decisions as omissions in the original catalogue.
const approvedFeatures={};
const overlayFiles=(await fs.readdir('knowledge/review')).filter(name=>/^(clinical|static)_remediation_batch\d+_v1\.json$/.test(name)).sort((a,b)=>Number(a.startsWith('static_'))-Number(b.startsWith('static_'))||Number(a.match(/batch(\d+)/)[1])-Number(b.match(/batch(\d+)/)[1]));
for(const name of overlayFiles){
 const overlay=JSON.parse(await fs.readFile(`knowledge/review/${name}`,'utf8'));
 Object.assign(dispositions,overlay.gap_dispositions??{});
 for(const[id,fields]of Object.entries(overlay.extension?.FindingFeature??{}))approvedFeatures[id]={...approvedFeatures[id],...fields};
}
const tables=data.tables,extension=data.clinical_extension;
const index=(rows,key)=>new Map(rows.map(r=>[r[key],r]));
const itemById=index(tables['02_ClinicalItem'],'item_id');
const regionById=index(tables['01_Region'],'region_id');
const mapById=index(tables['08_AssessmentFindingMap'],'map_id');
const findingById=index(tables['03_Finding'],'finding_id');
const interventionById=index(tables['04_Intervention'],'intervention_id');
const featureById=index(extension.FindingFeature,'Feature_ID');
const purposeById=index(extension.ClinicalPurpose,'Item_ID');
const references=extension.InterventionReference;
const split=value=>String(value??'').split('；').map(s=>s.trim()).filter(Boolean);
const regionsFor=id=>tables['05_RegionClinicalMap'].filter(r=>r.clinical_item_id===id).map(r=>r.region_id);
const modulesFor=id=>[...new Set(regionsFor(id).map(r=>regionById.get(r)?.module))];
const storedFor=id=>references.filter(r=>r.Feature_ID===id);
const rowLocation=(sheet,id)=>data.audit_source.row_locations[`${sheet}/${id}`];
const meta=metadata(data),observed=new Map(),observedItems=new Set(),missingLinks=[],scanErrors=[];
let requests=0;
function scan(input) {
  requests++;
  let result;
  try {result=resolveAssessment(data,input);} catch(error) {scanErrors.push({input,error:error.message});return;}
  const rows=result.dimensions.flatMap(d=>d.groups.flatMap(g=>g.items));
  const baselineIds=[...new Set(rows.flatMap(i=>i.possible_findings.filter(f=>!f.review_status).map(f=>f.finding_id)))];
  const expanded=baselineIds.length?resolveAssessment(data,{...input,confirmed_finding_ids:baselineIds}):result;
  for(const item of rows) {
    observedItems.add(item.item_id);
    for(const finding of item.possible_findings) {
      const methods=finding.review_status?finding.treatment_goals.flatMap(g=>g.methods):
        expanded.intervention_references.filter(r=>r.finding_id===finding.finding_id).map(r=>r.name);
      observed.set(finding.feature_id,{item_id:item.item_id,feature_id:finding.feature_id,methods});
      if(finding.review_status) {
        const stored=storedFor(finding.feature_id);
        const expected=stored.map(r=>({goal:r.Treatment_Goal,methods:split(r.Treatment_Method),progression:r.Progression||null}));
        if(finding.has_treatment!==(stored.length>0)||JSON.stringify(finding.treatment_goals)!==JSON.stringify(expected))
          missingLinks.push({input,item_id:item.item_id,feature_id:finding.feature_id});
      } else {
        const expected=tables['06_FindingInterventionMap'].filter(r=>r.finding_id===finding.finding_id)
          .map(r=>interventionById.get(r.intervention_id)).filter(r=>r&&r.intervention_class!=='DECISION_SUPPORT').map(r=>r.display_name);
        if(JSON.stringify(methods)!==JSON.stringify(expected)) missingLinks.push({input,feature_id:finding.feature_id,kind:'baseline'});
      }
    }
  }
}
const entries=[...tables['01_Region'].map(r=>({region_id:r.region_id})),
  ...extension.LocationGuide.map(r=>({localization_area_id:r.Area_ID}))];
for(const input of entries) {
  scan(input);
  const moduleSet=new Set(input.region_id?[regionById.get(input.region_id).module]:
    extension.LocationGuide.find(l=>l.Area_ID===input.localization_area_id).Module_Codes.split('|'));
  const rules=meta.contexts.filter(r=>r.rule_type!=='SAFETY'&&r.module_codes.some(m=>moduleSet.has(m)));
  for(const rule of rules) scan({...input,context_rule_ids:[rule.rule_id]});
  if(rules.length) scan({...input,context_rule_ids:rules.map(r=>r.rule_id)});
}
const relations=[];
const check=(rows,key,target,name)=>rows.forEach(r=>{if(!target.has(r[key]))relations.push({record:Object.values(r)[0],field:key,target:r[key],kind:name});});
check(extension.FindingFeature,'Assessment_Map_ID',mapById,'feature_map');
check(references,'Feature_ID',featureById,'reference_feature');
check(extension.ClinicalPurpose,'Item_ID',itemById,'purpose_item');
check(tables['08_AssessmentFindingMap'],'clinical_item_id',itemById,'assessment_item');
check(tables['08_AssessmentFindingMap'],'finding_id',findingById,'assessment_finding');
check(tables['06_FindingInterventionMap'],'intervention_id',interventionById,'baseline_method');
check(tables['06_FindingInterventionMap'],'finding_id',findingById,'baseline_finding');
const empty=extension.FindingFeature.filter(f=>!storedFor(f.Feature_ID).flatMap(r=>split(r.Treatment_Method)).length).map(f=>{
  const item_id=mapById.get(f.Assessment_Map_ID)?.clinical_item_id;
  const category=dispositions[f.Feature_ID]?.category||(findingDisplayNote(f)?'独立评估提示':'待逐项审核');
  return {feature_id:f.Feature_ID,item_id,item_name:itemById.get(item_id)?.display_name,name:f.Finding_Name,
    modules:modulesFor(item_id),description:f.Finding_Feature,category,
    location_review: f.Related_Location_Prompt ? {prompt:f.Related_Location_Prompt,action_label:f.Related_Location_Action_Label}:null,
    proposed_action:f.Related_Location_Prompt?'已提供具体部位入口；下肢目标内容已补':category==='待补分组织参考'?'核查明确组织内容，并补对应参考':
      dispositions[f.Feature_ID]?.reason||'尚未登记处置理由',
    reachable:observed.has(f.Feature_ID),row:rowLocation('FindingFeature',f.Feature_ID)};
});
const oldVague=/局部症状管理|调整诱发动作负荷|低刺激主动活动|局部软组织处理与活动改善/;
const broaderVague=/活动改善|相关任务动作控制训练|髋膝踝协同训练|相关肌群针对性抗阻训练|渐进负荷训练|渐进能力训练|推进相关任务训练|单腿稳定、本体感觉\/动态控制训练|可耐受范围内的主动活动|相关任务负荷调整/;
const vague=references.filter(r=>oldVague.test(r.Treatment_Method)||broaderVague.test(r.Treatment_Method)).map(r=>{
  const feature=featureById.get(r.Feature_ID),item_id=mapById.get(feature?.Assessment_Map_ID)?.clinical_item_id;
  return {reference_id:r.Reference_ID,feature_id:r.Feature_ID,item_id,item_name:itemById.get(item_id)?.display_name,
    finding:feature?.Finding_Name,methods:r.Treatment_Method,previously_counted:oldVague.test(r.Treatment_Method),
    item_status:itemById.get(item_id)?.status,reachable:observed.has(r.Feature_ID),
    row:rowLocation('InterventionReference',r.Reference_ID)};
});
const baseline=tables['08_AssessmentFindingMap'].filter(m=>!extension.FindingFeature.some(f=>f.Assessment_Map_ID===m.map_id)).map(m=>{
  const finding=findingById.get(m.finding_id);
  const methods=tables['06_FindingInterventionMap'].filter(r=>r.finding_id===m.finding_id)
    .map(r=>interventionById.get(r.intervention_id)).filter(r=>r&&r.intervention_class!=='DECISION_SUPPORT');
  return {assessment_map_id:m.map_id,item_id:m.clinical_item_id,item_name:itemById.get(m.clinical_item_id)?.display_name,
    finding_name:finding?.display_name,finding_class:finding?.finding_class,description:m.trigger_condition,
    methods:methods.map(r=>r.display_name),modules:modulesFor(m.clinical_item_id),
    reachable:observed.has(m.map_id),purpose:purposeById.has(m.clinical_item_id),
    category:finding?.finding_class==='SAFETY'?'医学评估提示':finding?.finding_class==='SPECIAL_TEST'?'专项检查支持信息':
      finding?.finding_class==='FURTHER_ASSESSMENT'?'专项评估提示':'待细化原库内容',row:rowLocation('08_AssessmentFindingMap',m.map_id)};
});
const mappedIds=new Set(tables['05_RegionClinicalMap'].map(r=>r.clinical_item_id));
const missingPurposes=tables['02_ClinicalItem'].filter(i=>mappedIds.has(i.item_id)&&!purposeById.has(i.item_id))
  .map(i=>({item_id:i.item_id,name:i.display_name,modules:modulesFor(i.item_id),reachable:observedItems.has(i.item_id),check_focus:i.check_focus}));
const unmappedItems=tables['02_ClinicalItem'].filter(i=>!mappedIds.has(i.item_id)).map(i=>({item_id:i.item_id,name:i.display_name,status:i.status}));
const unreachable=tables['08_AssessmentFindingMap'].filter(m=>!baseline.find(r=>r.assessment_map_id===m.map_id)?.reachable&&
  !extension.FindingFeature.filter(f=>f.Assessment_Map_ID===m.map_id).some(f=>observed.has(f.Feature_ID)))
  .map(m=>({assessment_map_id:m.map_id,item_id:m.clinical_item_id,name:itemById.get(m.clinical_item_id)?.display_name,
    finding_class:findingById.get(m.finding_id)?.finding_class,item_status:itemById.get(m.clinical_item_id)?.status,
    placements:tables['05_RegionClinicalMap'].filter(r=>r.clinical_item_id===m.clinical_item_id).map(r=>({region:r.region_id,mode:r.display_mode,context_link:r.context_link})),
    rules:tables['11_ContextItemMap'].filter(r=>r.clinical_item_id===m.clinical_item_id).map(r=>r.rule_id)}));
const publicRuleIds=new Set(meta.contexts.filter(r=>r.rule_type!=='SAFETY').map(r=>r.rule_id));
const unreachableReasons=unreachable.map(r=>({...r,public_rules:r.rules.filter(id=>publicRuleIds.has(id)),
  reason:r.item_status==='Internal'?'已停用的历史内部项目，不属于当前产品缺项':
    r.finding_class==='SAFETY'?'安全内容，需单独核查风险提示入口':
    !r.placements.length?'没有区域映射，需确认接入范围':
    r.placements.every(p=>p.mode==='LINKED')&&!r.rules.some(id=>publicRuleIds.has(id))?
    '只有条件显示位置，没有可用公开关联入口':
    '当前位置指南替代区域列表，且公开条件未重新接入该项'}));
const publicText=[];
const bareExplanations=empty.filter(r=>r.reachable&&!r.location_review&&!findingDisplayNote(featureById.get(r.feature_id)));
const approvedGroupScreen=f=>{
 const accepted=approvedFeatures[f.Feature_ID];
 return accepted?.Finding_Name===f.Finding_Name&&accepted?.Finding_Feature===f.Finding_Feature&&
  /不能单独评估|不等同.*独立.*测试/.test(f.Finding_Feature);
};
const mixedFeatures=extension.FindingFeature.filter(f=>observed.has(f.Feature_ID)&&!approvedGroupScreen(f)&&
  /受限[^。；]*或[^。；]*(?:不适|疼痛|症状)|受限[^。；]*过度|异常\/症状性|受限\/症状性/.test(`${f.Finding_Name}；${f.Finding_Feature}`))
  .map(f=>({feature_id:f.Feature_ID,item_name:itemById.get(mapById.get(f.Assessment_Map_ID)?.clinical_item_id)?.display_name,
    name:f.Finding_Name,description:f.Finding_Feature}));
const overlappingBaselines=[...mapById.keys()].flatMap(id=>{
  const features=extension.FindingFeature.filter(f=>f.Assessment_Map_ID===id);
  const generic=features.filter(f=>f.Feature_ID.endsWith('-BASELINE'));
  return generic.length&&features.length>generic.length ? [{assessment_map_id:id,
    item_name:itemById.get(mapById.get(id).clinical_item_id)?.display_name,
    features:features.map(f=>`${f.Finding_Name} (${f.Feature_ID})`),
    reachable:features.some(f=>observed.has(f.Feature_ID))}] : [];
});
const baselineVague=baseline.filter(r=>r.reachable&&r.category==='待细化原库内容'&&
  r.methods.some(method=>oldVague.test(method)||broaderVague.test(method)));
const safetyEntryIssues=[];
let safetyRequests=0;
for(const rule of tables['07_ContextRule'].filter(r=>r.rule_type==='SAFETY')) {
  const targets=String(rule.target).split('|');
  for(const id of targets) if(!purposeById.has(id)||!extension.FindingFeature.some(f=>mapById.get(f.Assessment_Map_ID)?.clinical_item_id===id&&findingDisplayNote(f)))
    safetyEntryIssues.push({rule_id:rule.rule_id,target:id,kind:'missing_assessment_content'});
  for(const module of String(rule.module_codes).split('|')) {
    const region=meta.regions.find(r=>r.module===module);safetyRequests++;
    const response=resolveAssessment(data,{region_id:region.region_id,context_rule_ids:[rule.rule_id]});
    if(!rule.public_note||!response.safety_alerts.some(a=>a.rule_id===rule.rule_id&&a.guidance.includes(rule.public_note))||response.normal_intervention_actions_enabled||response.intervention_references.length)
      safetyEntryIssues.push({rule_id:rule.rule_id,module,kind:'missing_public_risk_note'});
  }
}
const abstractPresentations=[
  ...extension.FindingFeature.filter(f=>observed.has(f.Feature_ID)).map(f=>({
    feature_id:f.Feature_ID,item_name:itemById.get(mapById.get(f.Assessment_Map_ID)?.clinical_item_id)?.display_name,
    name:f.Finding_Name,description:f.Finding_Feature})),
  ...baseline.filter(b=>b.reachable).map(b=>({feature_id:b.assessment_map_id,item_name:b.item_name,
    name:b.finding_name,description:b.description})),
].filter(f=>/局部敏感|局部组织刺激|症状性|熟悉症状|任务相关能力缺口|相关肌群\/功能能力不足/.test(`${f.name}；${f.description}`));
function register(sheet,id,fields,row,reachable) {for(const field of fields){const value=String(row[field]??'');
  if(/UI分组|不直接生成|仅作条件性|提高关注|进入医学评估路径|结构化|Safety|稳定层|模板|映射|回退|占位/.test(value))
    publicText.push({sheet,id,field,text:value,reachable});}}
for(const row of tables['02_ClinicalItem']) register('02_ClinicalItem',row.item_id,
  purposeById.has(row.item_id)?['display_name']:['display_name','check_focus'],row,observedItems.has(row.item_id));
for(const row of extension.ClinicalPurpose) register('ClinicalPurpose',row.Item_ID,['Clinical_Purpose','Assessment_Focus'],row,observedItems.has(row.Item_ID));
for(const row of extension.FindingFeature) {
  register('FindingFeature',row.Feature_ID,['Finding_Name','Finding_Feature'],row,observed.has(row.Feature_ID));
  if(findingDisplayNote(row)) register('FindingFeature',row.Feature_ID,['Finding_Interpretation'],row,observed.has(row.Feature_ID));
}
for(const row of tables['08_AssessmentFindingMap'].filter(r=>baseline.some(b=>b.assessment_map_id===r.map_id)))
  register('08_AssessmentFindingMap',row.map_id,['trigger_condition'],row,observed.has(row.map_id));
for(const row of extension.ConsultationGuide)
  register('ConsultationGuide',row.Guide_ID,['Core_Prompt','Question_Purpose','Information_Gained','Assessment_Help'],row,true);
const totals={regions:tables['01_Region'].length,locations:extension.LocationGuide.length,
  clinical_items:tables['02_ClinicalItem'].length,assessment_maps:mapById.size,
  extension_features:extension.FindingFeature.length,extension_references:references.length,
  audited_requests:requests,observed_features:observed.size,currently_empty:empty.length,
  empty_with_location_review:empty.filter(r=>r.location_review).length,
  baseline_only_maps:baseline.length,baseline_content_pending:baseline.filter(r=>r.category==='待细化原库内容').length,
  mapped_items_missing_purpose:missingPurposes.length,visible_items_missing_purpose:missingPurposes.filter(r=>r.reachable).length,unmapped_items:unmappedItems.length,
  vague_reference_rows:vague.length,previous_vague_rows:vague.filter(r=>r.previously_counted).length,
  vague_active_reference_rows:vague.filter(r=>r.item_status!=='Internal').length,
  unreachable_maps:unreachable.length,unreachable_regular_maps:unreachable.filter(r=>r.finding_class!=='SAFETY'&&r.item_status!=='Internal').length,
  internal_history_maps:unreachable.filter(r=>r.item_status==='Internal').length,
  pipeline_mismatches:missingLinks.length,relation_errors:relations.length,workbook_runtime_issues:data.audit_source.issues.length,
  public_wording_candidates:publicText.length,
  bare_visible_explanations:bareExplanations.length,mixed_feature_candidates:mixedFeatures.length,
  overlapping_baseline_maps:overlappingBaselines.length,baseline_vague_maps:baselineVague.length,
  abstract_presentation_candidates:abstractPresentations.length,safety_requests:safetyRequests,safety_entry_issues:safetyEntryIssues.length};
const result={totals,empty_features:empty,baseline_only:baseline,missing_purposes:missingPurposes,
  vague_references:vague,unreachable_maps:unreachableReasons,unmapped_items:unmappedItems,
  public_wording_candidates:publicText,bare_visible_explanations:bareExplanations,mixed_feature_candidates:mixedFeatures,
  overlapping_baseline_maps:overlappingBaselines,baseline_vague_maps:baselineVague,
  abstract_presentation_candidates:abstractPresentations,
  pipeline_mismatches:missingLinks,relation_errors:relations,scan_errors:scanErrors,safety_entry_issues:safetyEntryIssues};
await fs.writeFile('build/authoring/treatment-reference-audit.json',JSON.stringify(result,null,2));
if(!process.argv.includes('--report-only')){
  const {writeCompletionReview}=await import('./write_completion_review.mjs');
  await writeCompletionReview(result,data,completion);
}
console.log(JSON.stringify(totals));
if(missingLinks.length||relations.length||scanErrors.length||data.audit_source.issues.length||safetyEntryIssues.length) process.exitCode=1;
