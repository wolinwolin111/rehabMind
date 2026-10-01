import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { FileBlob, SpreadsheetFile } = require('@oai/artifact-tool');
const mainPath = 'baseline/RehabMind_LowerLimbV1_ImplementationBaseline_DBv3.7_2026-09-29/02_Database/RehabMind_LowerLimb_KnowledgeDB_v3.7_Final.xlsx';
const extensionPath = 'knowledge/RehabMind_ClinicalExtension_v1.0_Draft.xlsx';
const mainOutput = 'knowledge/RehabMind_KnowledgeDB_v3.8.xlsx';
const extensionOutput = 'knowledge/RehabMind_ClinicalExtension_v1.1.xlsx';
const pfp = 'https://doi.org/10.2519/jospt.2019.0302';
const acl = 'https://doi.org/10.1136/bjsports-2022-106158';
const mobility = 'https://doi.org/10.2519/jospt.2018.0301';
const draft = '待临床审核';
const source = 'Function and Context Migration v3.8';
// Authored product summaries, not validated diagnostic criteria or prescribed exercises.
const tasks = [
  ['WALK','步行','步行','观察支撑与推进过程中的膝部表现及左右差异。','支撑时间、步长、膝屈伸、推进及左右差异。',mobility,[
    ['SUPPORT','支撑时间不对称','行走时两侧支撑时间不同，一侧较早离地。',['步态反馈练习','左右交替负重练习','步行节奏练习']],
    ['PROPULSION','推进表现不同','两侧蹬离表现或步长不同，前进节奏不一致。',['步行推进练习','前后重心转移练习','步态反馈练习']],
  ]],
  ['SQUAT','下蹲','负重与单腿控制','观察双腿负重时的膝运动与髋膝踝配合。','下蹲深度、左右负重、膝运动轨迹及躯干表现。',pfp,[
    ['LOAD','负重偏向一侧','下蹲或起身时重心持续偏向一侧。',['下蹲负重分配练习','镜面或视频反馈练习','辅助下蹲练习']],
    ['KNEE','膝向内移动','下蹲或起身过程中膝相对足部向内移动。',['下蹲动作反馈练习','髋膝踝协同练习','辅助下蹲练习']],
  ]],
  ['STEPUP','上台阶','负重与单腿控制','观察单腿蹬伸与身体向上转移时的动作表现。','蹬伸、骨盆位置、躯干偏移及另一侧借力。',pfp,[
    ['TRUNK','躯干偏移明显','上台阶时躯干明显前倾或向支撑侧偏移。',['上台阶动作反馈练习','单腿负重转移练习','辅助上台阶练习']],
    ['ASSIST','另一侧借力明显','上台阶时后侧脚蹬地或上肢支撑参与明显。',['上台阶蹬伸练习','辅助上台阶练习','单腿负重转移练习']],
  ]],
  ['STEPDOWN','下台阶','负重与单腿控制','观察单腿负重和下放过程中的髋膝踝配合。','下放速度、膝运动轨迹、骨盆与躯干表现。',pfp,[
    ['DESCENT','下放不平稳','下放速度不均、突然下落或需要扶持。',['下台阶控制练习','辅助下台阶练习','动作反馈练习']],
    ['KNEE','膝向内移动','下台阶过程中支撑侧膝相对足部向内移动。',['下台阶动作反馈练习','单腿负重控制练习','髋膝踝协同练习']],
    ['PELVIS','骨盆下沉或躯干侧倾','下放时非支撑侧骨盆下沉，或躯干向一侧倾斜。',['单腿支撑控制练习','下台阶控制练习','镜面或视频反馈练习']],
  ]],
  ['SLSQUAT','单腿下蹲','负重与单腿控制','观察单腿负重下的骨盆、膝与足部配合。','骨盆位置、膝运动轨迹、躯干与足部支撑。',pfp,[
    ['PELVIS','骨盆下沉','单腿下蹲时非支撑侧骨盆向下倾斜。',['单腿支撑控制练习','辅助单腿下蹲练习','镜面或视频反馈练习']],
    ['KNEE','膝向内移动','单腿下蹲时支撑侧膝相对足部向内移动。',['单腿下蹲动作反馈练习','髋膝踝协同练习','辅助单腿下蹲练习']],
    ['BALANCE','反复调整支撑','下蹲过程中足部反复挪动，或需要另一侧脚、上肢帮助支撑。',['单腿平衡练习','辅助单腿下蹲练习','单腿重心控制练习']],
  ]],
  ['RUN','跑步','跑跳与落地','观察跑步支撑与推进阶段的膝部表现。','步频、步长、支撑与推进、左右差异及症状出现阶段。',acl,[
    ['ASYM','左右支撑或步长不同','跑步时两侧支撑时间、步长或蹬离表现不同。',['跑步视频反馈练习','步频与步幅反馈练习','跑步支撑与推进练习']],
    ['CONTROL','支撑期膝或骨盆偏移','跑步支撑阶段出现膝向内移动或骨盆侧向倾斜。',['跑步动作反馈练习','单腿支撑控制练习','跑步支撑与推进练习']],
  ]],
  ['LAND2','双腿跳跃落地','跑跳与落地','观察双腿起跳与落地时的负重和缓冲表现。','两侧负重、髋膝屈曲、落地稳定性及重复表现。',acl,[
    ['LOAD','落地负重偏向一侧','双腿落地时一侧先承重，或身体持续偏向一侧。',['双腿落地负重分配练习','落地视频反馈练习','起跳与落地协调练习']],
    ['BUFFER','落地屈曲较少','落地时髋膝屈曲较少，缓冲动作短促。',['髋膝屈曲缓冲练习','双腿落地控制练习','落地视频反馈练习']],
  ]],
  ['LAND1','单腿跳跃落地','跑跳与落地','观察单腿落地后的支撑、缓冲和稳定表现。','落地后支撑、髋膝屈曲、膝轨迹与骨盆位置。',acl,[
    ['BALANCE','落地后反复调整','单腿落地后需要跳动、挪脚或另一侧脚辅助站稳。',['单腿落地稳定练习','单腿支撑控制练习','落地视频反馈练习']],
    ['KNEE','落地时膝向内移动','单腿落地时支撑侧膝相对足部向内移动。',['单腿落地动作反馈练习','髋膝踝协同练习','单腿缓冲练习']],
    ['BUFFER','落地屈曲较少','单腿落地时髋膝屈曲较少，缓冲动作短促。',['单腿缓冲练习','单腿落地控制练习','落地视频反馈练习']],
  ]],
  ['DECEL','急停减速','减速与变向','观察减速过程中膝部承重和身体控制。','制动步、髋膝屈曲、身体重心及左右支撑。',acl,[
    ['STEPS','制动步调整较多','减速时需要多次碎步或额外跨步才能停止。',['减速步伐练习','分步制动练习','减速视频反馈练习']],
    ['BUFFER','制动时屈曲较少','制动步中髋膝屈曲较少，躯干或重心转移明显。',['制动缓冲练习','减速重心控制练习','减速动作反馈练习']],
  ]],
  ['CUT','变向','减速与变向','观察改变方向时的支撑与髋膝踝配合。','支撑脚位置、膝运动轨迹、躯干方向及转向节奏。',acl,[
    ['KNEE','转向时膝向内移动','变向支撑阶段膝相对足部向内移动。',['侧向支撑练习','变向步伐练习','变向视频反馈练习']],
    ['TIMING','转向前后衔接不连贯','减速、转向与再次推进之间出现停顿或反复调整步伐。',['减速与转向衔接练习','变向步伐练习','侧向重心转移练习']],
  ]],
];

// Activities carry observations; they do not form a mandatory testing battery.
const patterns = [
  ['GAIT','步态与支撑','步态观察','查看行进时两侧支撑、推进及膝与骨盆的配合。','相关步行或跑步动作：支撑时间、步长、推进、膝轨迹与骨盆位置。',pfp,[
    ['SUPPORT','左右支撑不对称','行进时两侧支撑时间或步长不同，一侧较早离地。',['步态反馈练习','左右交替负重练习','步频与步幅反馈练习']],
    ['PROPULSION','推进表现不同','两侧蹬离表现不同，前进节奏不一致。',['步态支撑与推进练习','前后重心转移练习','步态反馈练习']],
    ['ALIGNMENT','支撑期膝或骨盆偏移','单腿支撑阶段膝相对足部向内移动，或骨盆向一侧倾斜。',['步态反馈练习','单腿支撑控制练习','髋膝踝协同练习']],
  ]],
  ['BILATERAL','双腿负重模式','负重与动作控制','查看双腿承重时的左右负重分配与膝运动轨迹。','下蹲动作：左右负重、膝轨迹、髋膝踝配合与躯干偏移。',pfp,[
    ['LOAD','负重偏向一侧','下蹲或起身时重心持续偏向一侧。',['下蹲负重分配练习','镜面或视频反馈练习','辅助下蹲练习']],
    ['KNEE','膝向内移动','下蹲或起身过程中膝相对足部向内移动。',['下蹲动作反馈练习','髋膝踝协同练习','辅助下蹲练习']],
  ]],
  ['SINGLE','单腿动作控制','负重与动作控制','查看单腿承重时膝、骨盆与躯干的配合，以及蹬伸或下放的稳定性。','相关单腿下蹲或台阶动作：膝轨迹、骨盆位置、躯干偏移、蹬伸与下放。',pfp,[
    ['KNEE','膝向内移动','单腿承重过程中，支撑侧膝相对足部向内移动。',['单腿动作反馈练习','髋膝踝协同练习','辅助单腿下蹲练习']],
    ['PELVIS','骨盆下沉','单腿承重时非支撑侧骨盆向下倾斜。',['单腿支撑控制练习','镜面或视频反馈练习','辅助单腿动作练习']],
    ['TRUNK','躯干偏移明显','单腿下蹲或台阶动作中，躯干明显前倾或向一侧偏移。',['单腿负重转移练习','镜面或视频反馈练习','辅助台阶练习']],
    ['DESCENT','下放不平稳','单腿下蹲或下台阶时，下放速度不均或突然下落。',['单腿下放控制练习','辅助下台阶练习','动作反馈练习']],
  ]],
  ['LANDING','落地缓冲与稳定','跑跳与方向转换','查看落地时的负重分配、髋膝缓冲与落地后稳定性。','相关落地动作：左右负重、髋膝屈曲、膝轨迹与落地后支撑。',acl,[
    ['LOAD','落地负重偏向一侧','双腿落地时一侧先承重，或身体持续偏向一侧。',['双腿落地负重分配练习','落地视频反馈练习','起跳与落地协调练习']],
    ['BUFFER','落地屈曲较少','落地时髋膝屈曲较少，缓冲动作短促。',['髋膝屈曲缓冲练习','落地控制练习','落地视频反馈练习']],
    ['BALANCE','落地后反复调整','落地后需要跳动、挪脚或另一侧脚辅助站稳。',['落地稳定练习','单腿支撑控制练习','落地视频反馈练习']],
    ['KNEE','落地时膝向内移动','落地支撑阶段膝相对足部向内移动。',['落地动作反馈练习','髋膝踝协同练习','缓冲练习']],
  ]],
  ['DIRECTION','减速与转向控制','跑跳与方向转换','查看制动、转向与再次推进时的支撑和动作衔接。','相关减速或变向动作：制动步、髋膝屈曲、膝轨迹、躯干方向与步伐衔接。',acl,[
    ['STEPS','制动步调整较多','减速时需要多次碎步或额外跨步才能停止。',['减速步伐练习','分步制动练习','减速视频反馈练习']],
    ['KNEE','转向时膝向内移动','变向支撑阶段膝相对足部向内移动。',['侧向支撑练习','变向步伐练习','变向视频反馈练习']],
    ['TIMING','转向衔接不连贯','减速、转向与再次推进之间出现停顿或反复调整步伐。',['减速与转向衔接练习','变向步伐练习','侧向重心转移练习']],
  ]],
];

const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(mainPath));
const ext = await SpreadsheetFile.importXlsx(await FileBlob.load(extensionPath));
function read(book,name) {
  const sheet=book.worksheets.getItem(name), values=sheet.getUsedRange().values;
  const headers=values[0];
  return {sheet,headers,rows:values.slice(1).filter(r=>r[0]).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??null]))),oldLength:values.length};
}
const names=['01_Region','02_ClinicalItem','03_Finding','04_Intervention','05_RegionClinicalMap','06_FindingInterventionMap','07_ContextRule','08_AssessmentFindingMap','09_Evidence','10_Governance'];
const t=Object.fromEntries(names.map(n=>[n,read(wb,n)]));
const e=Object.fromEntries(['DimensionGuide','ClinicalPurpose','FindingFeature','InterventionReference'].map(n=>[n,read(ext,n)]));
const originalRows=Object.fromEntries(Object.entries(t).map(([n,v])=>[n,structuredClone(v.rows)]));
function add(name,record){t[name].rows.push(record);}
function gov(key,value,note) {
  const current=t['10_Governance'].rows.find(r=>r.key===key);
  if(current) Object.assign(current,{value,note});else add('10_Governance',{key,value,note});
}
let afm=109,rcm=1000;
function purpose(id,name,why,focus,url=mobility) {
  e.ClinicalPurpose.rows.push({Item_ID:id,Item_Name:name,Clinical_Purpose:why,Assessment_Focus:focus,Module:'膝',Source_URL:url,Review_Status:draft});
}
for(const [prefix,entries,status] of [['TASK',tasks,'Internal'],['PATTERN',patterns,'Stable']])
for(const [code,name,group,why,focus,url,features] of entries){
  const id=`KNEE-${prefix}-${code}`, map=`AFM-${String(afm++).padStart(4,'0')}`;
  add('02_ClinicalItem',{item_id:id,item_type:'TASK',display_name:name,check_focus:focus,allowed_finding_types:'TASK_CONTROL',status,source_asset:source});
  add('08_AssessmentFindingMap',{map_id:map,clinical_item_id:id,finding_id:'KNEE-FND-TASK',trigger_condition:focus,status:'Stable',source_asset:source});
  purpose(id,name,why,focus,url);
  for(const [suffix,title,description,methods] of features){
    const fid=`${map}-${suffix}`;
    e.FindingFeature.rows.push({Feature_ID:fid,Assessment_Map_ID:map,Finding_Name:title,Finding_Feature:description,
      Finding_Interpretation:'描述当前动作表现，不单独推断组织损伤、疼痛来源或肌肉薄弱。',Source_URL:url,Review_Status:draft});
    e.InterventionReference.rows.push({Reference_ID:`${fid}-TASK`,Feature_ID:fid,Treatment_Goal:'动作练习',Treatment_Method:methods.join('；'),Progression:'',Source_URL:url,Review_Status:draft,
      Source_Note:'产品动作观察及练习文案依据相关指南主题编辑整理；线索关联、具体表现与方法的对应未构成独立诊断规则。髌股疼痛和ACL术后来源各有适用范围，不能外推为全部膝部问题的验证标准。相关动作可由康复师选择现场观察或已有视频，不要求完成测试全套，也不由动作线索决定测试准入。'});
  }
}
// Remove only obsolete task presentation links; retain the item and historical findings.
t['05_RegionClinicalMap'].rows=t['05_RegionClinicalMap'].rows.filter(r=>r.clinical_item_id!=='KNEE-TASK-DYN');
t['02_ClinicalItem'].rows.find(r=>r.item_id==='KNEE-TASK-DYN').status='Internal';
const kneeRegions=t['01_Region'].rows.filter(r=>r.module==='KNEE');
// One module placement per pattern; matching context exposes it across KNEE.
for(const [index,task] of patterns.entries()) {
  const [code,,group]=task;
  add('05_RegionClinicalMap',{map_id:`RCM-${rcm++}`,region_id:kneeRegions[0].region_id,clinical_item_id:`KNEE-PATTERN-${code}`,direction_type:'功能动作',priority:'Context',condition:'Context',status:'Stable',source_asset:source,relation_nature:'动作模式观察',assessment_dimension:'FUNCTION',assessment_group:group,display_order:5000+index,display_mode:'LINKED',context_link:null,relationship_type:null});
}

const moduleIds=['KNEE','ANKLE_FOOT','LOWER_LEG','THIGH'];
const modulePrefixes={KNEE:'KNEE-',ANKLE_FOOT:'AF-',LOWER_LEG:'LL-',THIGH:'THIGH-'};
t['07_ContextRule'].headers.push('module_codes');
for(const rule of t['07_ContextRule'].rows) {
  rule.module_codes=moduleIds.filter(m=>rule.rule_id.startsWith(modulePrefixes[m])).join('|');
  if(rule.rule_type==='PROFILE')rule.module_codes=moduleIds.join('|');
  if(rule.rule_id.startsWith('K-CHAIN-'))rule.module_codes='KNEE';
}
const ruleTargets=new Map();
const existingItems=t['02_ClinicalItem'].rows.map(r=>r.item_id);
function idsIn(raw){return existingItems.filter(id=>String(raw||'').split(/[^A-Za-z0-9-]+/).includes(id));}
for(const rule of t['07_ContextRule'].rows) if(!['PROFILE','SAFETY'].includes(rule.rule_type))ruleTargets.set(rule.rule_id,idsIn(rule.target).filter(id=>id!=='KNEE-TASK-DYN'));
const common=['CORE-CAP-KNEE-EXT','CORE-CAP-QUAD-RECRUIT','KNEE-ROM-EXT','KNEE-ROM-FLEX'];
const sport=['CORE-CAP-KNEE-EXT','KNEE-CAP-HIPABD','KNEE-CAP-HIPEXT'];
function reviseRule(id,label,targets){
  const r=t['07_ContextRule'].rows.find(r=>r.rule_id===id);r.source_context=label;ruleTargets.set(id,targets);
}
reviseRule('KNEE-MF-01','下台阶',['KNEE-PATTERN-SINGLE',...common]);
reviseRule('KNEE-MF-02','跑步',['KNEE-PATTERN-GAIT',...sport]);
reviseRule('KNEE-MF-03','步行',['KNEE-PATTERN-GAIT','KNEE-ROM-EXT','KNEE-ROM-FLEX']);
for(const [id,label,targets] of [
  ['KNEE-MF-04','下蹲',['KNEE-PATTERN-BILATERAL',...common]],
  ['KNEE-MF-05','上台阶',['KNEE-PATTERN-SINGLE',...common]],
  ['KNEE-MF-06','单腿下蹲',['KNEE-PATTERN-SINGLE',...sport]],
  ['KNEE-MF-07','跳跃／落地',['KNEE-PATTERN-LANDING',...sport]],
  ['KNEE-MF-08','急停／变向',['KNEE-PATTERN-DIRECTION',...sport]],
]){
  add('07_ContextRule',{rule_id:id,rule_type:'MOVEMENT',source_context:label,trigger:'主诉动作或恢复目标涉及该任务时作为检查入口。',target_type:'ASSESSMENT_FOCUS',target:targets.join(' / '),priority:'Context',boundary:'关联项目供查看；不由动作名称生成检查结果、病因或训练安排。',status:'Stable',module_codes:'KNEE'});ruleTargets.set(id,targets);
}
reviseRule('KNEE-CX-01','持续活动后才出现不适',['CORE-CAP-KNEE-EXT']);
// Encode the already-authored activity-timing observation in the database, not the page.
t['07_ContextRule'].headers.push('public_note');
for(const r of t['07_ContextRule'].rows)r.public_note=r.rule_id==='KNEE-CX-01'?'比较相关动作在活动初期与后期的表现。':
  /^KNEE-MF-/.test(r.rule_id)?'可结合现场动作或已有视频观察。':'';

const contextRows=[];
for(const [ruleId,items] of ruleTargets)for(const id of [...new Set(items)])contextRows.push({map_id:`CIM-${String(contextRows.length+1).padStart(4,'0')}`,rule_id:ruleId,clinical_item_id:id,status:'Stable'});
const sheet=wb.worksheets.add('11_ContextItemMap');
t['11_ContextItemMap']={sheet,headers:['map_id','rule_id','clinical_item_id','status'],rows:contextRows,oldLength:1};
// A rule target must have an explicit presentation location in each applicable module.
const itemsById=new Map(t['02_ClinicalItem'].rows.map(i=>[i.item_id,i]));
const regionModule=new Map(t['01_Region'].rows.map(r=>[r.region_id,r.module]));
const addedPresentation=[];
for(const rule of t['07_ContextRule'].rows){
  const targets=ruleTargets.get(rule.rule_id)||[];
  for(const module of String(rule.module_codes||'').split('|').filter(Boolean))for(const id of targets){
    if(t['05_RegionClinicalMap'].rows.some(r=>r.clinical_item_id===id&&regionModule.get(r.region_id)===module))continue;
    const item=itemsById.get(id),regions=t['01_Region'].rows.filter(r=>r.module===module);
    const example=t['05_RegionClinicalMap'].rows.find(r=>r.clinical_item_id===id);
    const screening=['SPECIAL_TEST','NEURO_SCREEN','FURTHER_ASSESSMENT'].includes(item.item_type);
    const hipROM=id==='KNEE-CHAIN-HIP-ROM';
    if(!example&&!screening&&!hipROM)throw new Error(`Missing placement policy for ${rule.rule_id} -> ${id}`);
    for(const region of regions)add('05_RegionClinicalMap',{map_id:`RCM-${rcm++}`,region_id:region.region_id,clinical_item_id:id,direction_type:screening?'特殊测试':hipROM?'活动度':example.direction_type,priority:'Context',condition:'Context',status:'Stable',source_asset:source,relation_nature:'线索关联补充',assessment_dimension:screening?'SPECIAL_TEST':hipROM?'ROM':example.assessment_dimension,assessment_group:screening?'线索相关检查':hipROM?'髋关节活动':example.assessment_group,display_order:screening?9000:hipROM?2900:example.display_order,display_mode:'LINKED',context_link:null,relationship_type:null});
    addedPresentation.push({rule_id:rule.rule_id,module,item_id:id});
  }
}
// Make newly reachable knee screening entries concise and source-linked without inventing interventions.
for(const [id,name,why,focus] of [
  ['KNEE-SPT-MECH','疼痛/功能相关机械表现检查','查看弹响、摩擦或卡顿发生时的膝部活动表现。','出现角度、屈伸轨迹、疼痛及活动受阻情况。'],
  ['CORE-SPT-NEURO-DISTAL','下肢远端神经相关筛查','查看麻木、放射或远端无力伴随的感觉与运动表现。','感觉分布、远端肌力及相关神经检查。'],
  ['KNEE-CHAIN-HIP-ROM','上游髋关节活动范围','查看髋活动范围与当前膝部动作的关系。','髋屈伸、内外旋活动及左右差异。'],
  ['CORE-ROM-ANK-DF','踝背屈 ROM','查看踝背屈与下蹲、台阶及步行的配合。','伸膝位与屈膝位背屈、负重背屈及左右差异。'],
]){
  purpose(id,name,why,focus,mobility);
  const map=t['08_AssessmentFindingMap'].rows.find(r=>r.clinical_item_id===id);
  const original=t['03_Finding'].rows.find(r=>r.finding_id===map.finding_id);
  e.FindingFeature.rows.push({Feature_ID:`${map.map_id}-SCREEN`,Assessment_Map_ID:map.map_id,Finding_Name:original.display_name,Finding_Feature:map.trigger_condition,Finding_Interpretation:original.boundary||'与症状分布及其他检查共同查看。',Source_URL:mobility,Review_Status:draft});
}
for(const guide of e.DimensionGuide.rows){
  if(guide.Dimension_Key==='CAPACITY')guide.Public_Description='查看力量输出与主动募集。';
  if(guide.Dimension_Key==='FUNCTION')guide.Public_Description='选择相关动作线索，查看对应的动作模式。';
}
gov('database_version','v3.8','具体膝部功能动作、明确线索关联及模块范围；保留现有知识主链。');
gov('assessment_dimension_labels','MUSCLE_STATE:肌肉状态|ROM:活动度|CAPACITY:力量与募集|FUNCTION:功能动作|LOCAL:局部组织|SPECIAL_TEST:特殊测试','内部维度编号保持不变，展示名称来自数据库。');
gov('module_labels','KNEE:膝|ANKLE_FOOT:踝足|LOWER_LEG:小腿|THIGH:大腿','模块代码与展示名称；新增部位在此注册。');
gov('context_item_map_policy','11_ContextItemMap IS AUTHORITATIVE','07保存线索、范围、条件与内部边界；11保存检查项目关联；target仅保留迁移追溯，不参与项目解析。');
gov('region_map_context_policy','07_ContextRule + 11_ContextItemMap','05只保存项目展示位置，不复制线索逻辑。');
gov('function_display_policy','MATCHED_MOVEMENT_ONLY','动作模式按明确动作线索出现；活动后不适不单独展开动作清单。共享展示位置不代表该区域默认需要所有动作测试。');
gov('schema','8 Runtime + ContextItemMap + Evidence + Governance','在原知识主链上增加一张线索关联表。');
gov('audit_context_refs','PASS','检查关联编号、模块适用范围及项目展示可达性。');
for(const [id,topic,url,scope] of [
  ['V38-PFP','下蹲、台阶与单腿动作',pfp,'参考髌股疼痛指南的功能任务及运动协调观察；具体表现与练习对应为产品编辑整理，不作为诊断规则。'],
  ['V38-ACLR','跑步、跳跃落地与变向',acl,'参考ACL重建术后康复指南中的相关任务主题；不将术后时间、准入标准或剂量套用至所有膝部问题。'],
  ['V38-MOBILITY','膝部活动、步行与伴随检查',mobility,'参考膝痛与活动受限指南的检查范围；新文案为简短产品摘要，需保留临床审核状态。'],
])add('09_Evidence',{evidence_id:id,topic,evidence_type:'Clinical practice guideline',grade:null,source_or_reference:url,supports:scope,status:draft});

// Curated record review is applied here so regenerating v3.8 cannot discard it.
const recordReview=JSON.parse(await fs.readFile('knowledge/review/clinical_record_revisions_v1.json','utf8'));
const recordSources=JSON.parse(await fs.readFile('knowledge/review/local_record_sources.private.json','utf8'));
const sourceById=new Map(recordSources.files.map(r=>[r.id,r]));
const recordBefore=Object.fromEntries(Object.entries(e).map(([name,table])=>[name,structuredClone(table.rows)]));
for(const refs of Object.values(recordReview.sources))for(const ref of refs){
  const original=sourceById.get(ref.source_id);
  if(!original||ref.lines[0]<1||ref.lines[1]>original.line_count)throw new Error(`Invalid local record reference: ${ref.source_id}`);
}
function recordRefs(keys){
  return [...new Set(keys.flatMap(key=>{
    if(!recordReview.sources[key])throw new Error(`Unknown record group: ${key}`);
    return recordReview.sources[key].map(r=>`local-records://${r.source_id}#L${r.lines[0]}-L${r.lines[1]}`);
  }))].join('\n');
}
function upsertExtension(name,key,record){
  const existing=e[name].rows.find(r=>r[e[name].headers[0]]===key);
  if(existing)Object.assign(existing,record);else e[name].rows.push(record);
}
for(const revision of recordReview.purposes){
  const item=itemsById.get(revision.item_id);
  if(!item)throw new Error(`Unknown reviewed item: ${revision.item_id}`);
  const existing=e.ClinicalPurpose.rows.find(r=>r.Item_ID===item.item_id);
  const modules=[...new Set(t['05_RegionClinicalMap'].rows.filter(r=>r.clinical_item_id===item.item_id).map(r=>regionModule.get(r.region_id)))];
  upsertExtension('ClinicalPurpose',item.item_id,{Item_ID:item.item_id,Item_Name:item.display_name,Clinical_Purpose:revision.why,Assessment_Focus:revision.focus,
    Module:existing?.Module||modules.join('/'),Source_URL:recordRefs(revision.source_keys),Review_Status:draft});
}
for(const revision of recordReview.features){
  const link=t['08_AssessmentFindingMap'].rows.find(r=>r.map_id===revision.map_id);
  if(!link)throw new Error(`Unknown reviewed assessment map: ${revision.map_id}`);
  const existing=e.FindingFeature.rows.find(r=>r.Feature_ID===revision.id);
  if(!existing&&(!revision.name||!revision.description))throw new Error(`Missing reviewed feature text: ${revision.id}`);
  const refs=recordRefs(revision.source_keys);
  // A concrete addition must not remove the original map's other presentations.
  if(!e.FindingFeature.rows.some(r=>r.Assessment_Map_ID===revision.map_id)){
    const original=t['03_Finding'].rows.find(r=>r.finding_id===link.finding_id);
    const retainedId=`${link.map_id}-BASELINE`;
    const retainedSource=`baseline://database-v3.7/08_AssessmentFindingMap/${link.map_id}`;
    e.FindingFeature.rows.push({Feature_ID:retainedId,Assessment_Map_ID:link.map_id,Finding_Name:original.display_name,
      Finding_Feature:link.trigger_condition,Finding_Interpretation:original.boundary||'',Source_URL:retainedSource,Review_Status:draft});
    const baselineMethods=t['06_FindingInterventionMap'].rows.filter(r=>r.finding_id===link.finding_id)
      .map(r=>t['04_Intervention'].rows.find(i=>i.intervention_id===r.intervention_id)).filter(i=>i&&i.intervention_class!=='DECISION_SUPPORT');
    if(baselineMethods.length)e.InterventionReference.rows.push({Reference_ID:`${retainedId}-METHODS`,Feature_ID:retainedId,
      Treatment_Goal:'相关方法',Treatment_Method:[...new Set(baselineMethods.map(i=>i.display_name))].join('；'),Progression:'',Source_URL:retainedSource,Review_Status:draft,
      Source_Note:'保留原库发现分类及处理对应，不把本轮经验补充视为对原有所有表现的覆盖。'});
  }
  upsertExtension('FindingFeature',revision.id,{Feature_ID:revision.id,Assessment_Map_ID:revision.map_id,
    Finding_Name:revision.name||existing.Finding_Name,Finding_Feature:revision.description||existing.Finding_Feature,
    Finding_Interpretation:existing?.Finding_Interpretation||'记录中的检查表现供康复师对照，不由单条表现判定病因。',Source_URL:refs,Review_Status:draft});
  e.InterventionReference.rows=e.InterventionReference.rows.filter(r=>r.Feature_ID!==revision.id);
  for(const [index,group] of revision.groups.entries())e.InterventionReference.rows.push({Reference_ID:`${revision.id}-RECORD-${index+1}`,Feature_ID:revision.id,
    Treatment_Goal:group.goal,Treatment_Method:group.methods.join('；'),Progression:'',Source_URL:refs,Review_Status:draft,
    Source_Note:'临床经验参考，待临床审核；不构成病因、独立疗效或方案判断。来源范围见09_Evidence与clinical_record_scope。'});
}
gov('clinical_record_revision',recordReview.revision,'按本地经验记录修正现有条目；原记录、个人信息与内部索引不进入页面文案。');
gov('clinical_record_scope',recordReview.evidence_scope,'经验记录的统一内部边界；不在每条方法中复制。');
for(const [key,refs] of Object.entries(recordReview.sources))add('09_Evidence',{evidence_id:`LOCAL-RECORD-${key.toUpperCase()}`,topic:key,evidence_type:'Local clinical experience record',grade:'经验记录',source_or_reference:recordRefs([key]),supports:recordReview.evidence_scope,status:draft});
// Guideline scope is recorded separately; it does not certify individual record links.
add('09_Evidence',{evidence_id:'LOCAL-REVIEW-GUIDELINE-SCOPE',topic:'关节与软组织手法、活动训练和电刺激的一般范围',evidence_type:'Clinical practice guideline',grade:null,
  source_or_reference:'https://doi.org/10.2519/jospt.2021.0302\nhttps://doi.org/10.2519/jospt.2023.0303\nhttps://doi.org/10.1136/bjsports-2022-106158',
  supports:'踝扭伤/慢性踝不稳、足底跟痛与ACL术后指南分别提供一般背景；不将指南外推为股外侧肌或腘肌松解、骰骨松动或经验组合的独立验证。',status:draft});

function writeTable(table,newSheet=false){
  const {sheet,headers,rows,oldLength}=table,width=headers.length,height=rows.length+1;
  if(height>oldLength&&!newSheet)for(let r=oldLength;r<height;r++)sheet.getRangeByIndexes(r,0,1,width).copyFrom(sheet.getRangeByIndexes(Math.max(1,oldLength-1),0,1,width),'all');
  if(oldLength>height)sheet.getRangeByIndexes(height,0,oldLength-height,width).clear({applyTo:'contents'});
  sheet.getRangeByIndexes(0,0,height,width).values=[headers,...rows.map(r=>headers.map(h=>r[h]??null))];
  if(newSheet){sheet.showGridLines=false;sheet.freezePanes.freezeRows(1);sheet.getRangeByIndexes(0,0,height,width).format.font={name:'Microsoft YaHei',size:11};sheet.getRangeByIndexes(0,0,1,width).format={fill:'#DDEBE7',font:{bold:true,color:'#29434A'},rowHeight:26};sheet.getRangeByIndexes(1,0,height-1,width).format.rowHeight=22;sheet.getRangeByIndexes(0,0,height,width).format.columnWidth=30;}
}
for(const [name,table] of Object.entries(t))if(!['01_Region','03_Finding','04_Intervention','06_FindingInterventionMap'].includes(name))writeTable(table,name==='11_ContextItemMap');
// Extend the new scope/note columns using the adjacent existing header and body conventions.
const rules=t['07_ContextRule'];
rules.sheet.getRange('J1:K1').copyFrom(rules.sheet.getRange('H1:I1'),'all');
rules.sheet.getRange('J1:K1').values=[['module_codes','public_note']];
rules.sheet.getRange(`J2:J${rules.rows.length+1}`).format.columnWidth=32;
rules.sheet.getRange(`K2:K${rules.rows.length+1}`).format.columnWidth=48;
for(const table of Object.values(e))writeTable(table);
// Adjust only new clinical rows to fit their short authored text.
for(const table of [e.ClinicalPurpose,e.FindingFeature,e.InterventionReference]){
  const count=table.rows.length+1-table.oldLength;
  if(count>0){const range=table.sheet.getRangeByIndexes(table.oldLength,0,count,table.headers.length);range.format.wrapText=true;range.format.rowHeight=66;}
}
// Reapply the shared foundation when rebuilding from older baseline workbooks.
const { applyCommonFoundation } = await import('./add_consultation_v1.mjs');
await applyCommonFoundation(wb, ext);
wb.recalculate();ext.recalculate();
await fs.writeFile('knowledge/review/clinical_record_change_audit.json',JSON.stringify({revision:recordReview.revision,files_read:recordSources.files.length,
  items:recordReview.purposes.map(r=>({item_id:r.item_id,before:recordBefore.ClinicalPurpose.find(p=>p.Item_ID===r.item_id)||null,after:e.ClinicalPurpose.rows.find(p=>p.Item_ID===r.item_id),sources:r.source_keys})),
  features:recordReview.features.map(r=>({feature_id:r.id,before:recordBefore.FindingFeature.find(f=>f.Feature_ID===r.id)||null,after:e.FindingFeature.rows.find(f=>f.Feature_ID===r.id),
    previous_methods:recordBefore.InterventionReference.filter(ref=>ref.Feature_ID===r.id),current_methods:e.InterventionReference.rows.filter(ref=>ref.Feature_ID===r.id),sources:r.source_keys})),
  scope:recordReview.evidence_scope},null,2)+'\n');
for(const [book,name,sheetName,range] of [[wb,'context','11_ContextItemMap','A1:D8'],[wb,'rules','07_ContextRule',`J1:K8`],[ext,'tasks','ClinicalPurpose','A52:D56'],[ext,'findings','FindingFeature','A105:D109']]){
  const preview=await book.render({sheetName,range,scale:1});await fs.writeFile(`build/authoring/v38-${name}.png`,new Uint8Array(await preview.arrayBuffer()));
}
console.log((await wb.inspect({kind:'table',range:'11_ContextItemMap!A1:D5',include:'values',tableMaxRows:5,tableMaxCols:4,maxChars:1000})).ndjson);
await (await SpreadsheetFile.exportXlsx(wb)).save(mainOutput);
await (await SpreadsheetFile.exportXlsx(ext)).save(extensionOutput);
const audit={version:'v3.8',tasks:tasks.map(([code,name,group])=>({id:`KNEE-TASK-${code}`,name,group})),context_migration:t['07_ContextRule'].rows.map(r=>({rule_id:r.rule_id,name:r.source_context,module_codes:r.module_codes,original_target:originalRows['07_ContextRule'].find(o=>o.rule_id===r.rule_id)?.target??null,linked_items:ruleTargets.get(r.rule_id)||[],visible:['SAFETY','PROFILE'].includes(r.rule_type)||(ruleTargets.get(r.rule_id)||[]).length>0})),added_presentation:addedPresentation,counts:Object.fromEntries(Object.entries(t).map(([n,v])=>[n,v.rows.length])),extension_counts:Object.fromEntries(Object.entries(e).map(([n,v])=>[n,v.rows.length]))};
audit.internal_tasks=audit.tasks; delete audit.tasks;
audit.patterns=patterns.map(([code,name,group])=>({id:`KNEE-PATTERN-${code}`,name,group,display_mode:'LINKED'}));
audit.function_policy='Only explicitly selected movement clues expose matching patterns; timing alone exposes no function pattern. Therapist observation may use actual movement or existing video, without a mandatory testing battery.';
await fs.mkdir('knowledge/review',{recursive:true});await fs.writeFile('knowledge/review/v3.8_context_migration.json',JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify({outputs:[mainOutput,extensionOutput],counts:audit.counts,extension:audit.extension_counts}));
