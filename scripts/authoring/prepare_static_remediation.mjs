import fs from 'node:fs/promises';
const batch=Number(process.argv.find(x=>x.startsWith('--batch='))?.split('=')[1]||1);
const d=JSON.parse(await fs.readFile('build/knowledge/runtime.json','utf8'));
const e=d.clinical_extension;
const spec={batch,approved_on:'2026-10-01',issue_ids:[],main:{},extension:{}};
const put=(sheet,id,fields,main=false)=>Object.assign((spec[main?'main':'extension'][sheet]??={})[id]??={},fields);
const add=(sheet,id,fields,main=false)=>put(sheet,id,{...Object.fromEntries(Object.keys((main?d.tables:e)[sheet][0]).map(k=>[k,null])),...fields},main);
const join=(...xs)=>[...new Set(xs.flatMap(x=>(x||'').split('\n')).filter(Boolean))].join('\n');
const B={knee:'book://magee-local#pdf=751,756&print=742,747',ankle:'book://magee-local#pdf=882,889&print=873,880',rotation:'book://essentials-kinesiology-3-local#pdf=306,308&print=288,290'};
if(batch===1){
 spec.issue_ids=['STATIC-01','STATIC-02','STATIC-03','STATIC-08-duplicate'];
 const changes={
  'AFM-0086-LIMIT':['髌骨方向性活动受限','髌骨上下或内外侧某方向被动活动较对侧减少。'],
  'AFM-0087-LIMIT':['近端胫腓关节活动受限','腓骨头某方向附属活动较对侧减少。'],
  'AFM-0088-LIMIT':['胫骨旋转活动受限','屈膝位胫骨内旋或外旋活动范围较对侧减少；可对照屈伸末端伴随旋转与症状。'],
  'AFM-0068-LENGTH':['前侧股四头肌群牵拉受限或不适','屈膝牵拉时前侧股四头肌群活动范围减少或出现牵拉不适；该动作不能单独评估股中间肌。'],
  'AFM-0072-LENGTH':['内侧肌群组合牵拉受限或不适','髋伸、内收结合膝伸时，内侧肌群牵拉范围减少或出现不适；不等同缝匠肌独立长度测试。'],
  'AFM-0094-CAPACITY':['屈膝或内收输出下降或受疼痛限制','屈膝或内收抗阻时力量、耐力下降，或受膝内侧疼痛限制；可与对侧、既往表现和目标需求对照。'],
  'AFM-0076-LENGTH':['伸膝或旋转末端后外侧紧绷','膝伸直或胫骨旋转末端伴膝后外侧紧绷。'],
  'AFM-0100-RECORD-TENSION':['大腿后侧紧绷','大腿后侧局部紧绷。'],
  'AFM-0095-CAPACITY':['主动终末伸膝不足','主动伸膝未达到被动可达的伸直范围。'],
 };
 for(const[id,[Finding_Name,Finding_Feature]]of Object.entries(changes)){
  const row=e.FindingFeature.find(r=>r.Feature_ID===id);
  put('FindingFeature',id,{Finding_Name,Finding_Feature,Source_URL:join(row.Source_URL,id==='AFM-0088-LIMIT'?B.rotation:B.knee)});
 }
 put('ClinicalPurpose','CORE-CAP-QUAD-RECRUIT',{Assessment_Focus:'主动伸膝与被动可达范围；收缩质量、疼痛与代偿。',Source_URL:join(e.ClinicalPurpose.find(r=>r.Item_ID==='CORE-CAP-QUAD-RECRUIT').Source_URL,B.knee)});
 put('02_ClinicalItem','CORE-CAP-QUAD-RECRUIT',{check_focus:'比较主动伸膝与被动可达的伸直范围，观察股四头肌收缩质量、疼痛及代偿；与膝伸直活动度和膝伸力量分别查看。'},true);
 put('ClinicalPurpose','KNEE-JNT-TIBROT',{Clinical_Purpose:'胫骨旋转包括屈膝位内外旋及膝屈伸末端的伴随运动，可分别对照范围和症状。',Assessment_Focus:'屈膝位内外旋活动；屈伸末端伴随旋转与症状。',Source_URL:join(B.rotation,B.knee)});
 put('02_ClinicalItem','KNEE-JNT-TIBROT',{check_focus:'屈膝位胫骨内外旋活动；屈伸末端伴随旋转及症状。'},true);
 const row=e.FindingFeature.find(r=>r.Feature_ID==='AFM-0075-SENSITIVITY');
 put('FindingFeature',row.Feature_ID,{Finding_Feature:row.Finding_Feature.replace('邻近肌腹邻近按压','邻近肌腹按压')});
}
else if(batch===2){
 spec.issue_ids=['STATIC-04'];
 const sources=join('https://www.orthoinfo.org/diseases--conditions/burning-thigh-pain-meralgia-paresthetica/','https://www.ncbi.nlm.nih.gov/books/NBK532301/','https://www.ncbi.nlm.nih.gov/books/NBK556065/');
 add('02_ClinicalItem','THIGH-SPT-NEURO',{item_id:'THIGH-SPT-NEURO',item_type:'NEURO_SCREEN',display_name:'大腿区域神经相关筛查',check_focus:'大腿感觉变化范围；局部受压背景；膝伸输出与膝反射。向小腿或足部放射时可补远端筛查。',allowed_finding_types:'NEURO',status:'Stable',source_asset:'Static Clinical Review 2026-10-01'},true);
 add('03_Finding','THIGH-FND-NEURO',{finding_id:'THIGH-FND-NEURO',finding_class:'NEURO',display_name:'大腿感觉或神经相关表现',scope:'Module',status:'Stable',boundary:'对照感觉分布、局部受压及运动/反射表现；不由位置或单项测试确定神经病因。'},true);
 add('08_AssessmentFindingMap','AFM-0125',{map_id:'AFM-0125',clinical_item_id:'THIGH-SPT-NEURO',finding_id:'THIGH-FND-NEURO',trigger_condition:'大腿感觉分布变化，或伴神经相关运动、反射表现',status:'Stable',source_asset:'Static Clinical Review 2026-10-01'},true);
 add('ClinicalPurpose','THIGH-SPT-NEURO',{Item_ID:'THIGH-SPT-NEURO',Item_Name:'大腿区域神经相关筛查',Clinical_Purpose:'大腿麻木、灼痛或放射痛可对照感觉分布、局部受压背景及运动表现。',Assessment_Focus:'大腿前、内、外、后侧感觉分布；受压背景；膝伸输出与膝反射。',Module:'THIGH',Source_URL:sources,Review_Status:'待临床审核'});
 const features=[
  ['SENSORY','大腿感觉分布变化','大腿出现麻木、灼痛或触觉变化，可标出感觉变化的范围。','可对照局部受压与近端相关表现；向小腿或足部放射时补远端感觉和运动检查。新发或进行性无力、持续感觉缺失需医学评估。',sources],
  ['LATERAL','大腿前外侧麻木或灼痛','大腿前外侧或外侧出现麻木、灼痛或触觉变化，可伴衣物、腰带或局部受压相关表现。','可对照股外侧皮神经的感觉分布。该神经没有运动功能，伴膝伸输出或反射变化时可另看相关运动与近端方向。',join('https://www.orthoinfo.org/diseases--conditions/burning-thigh-pain-meralgia-paresthetica/','https://www.ncbi.nlm.nih.gov/books/NBK532301/')],
  ['MOTOR','膝伸输出或膝反射变化','膝伸抗阻输出下降或膝反射变化，可伴大腿前内侧感觉变化。','可对照股神经相关运动和感觉、局部膝痛限制及近端表现；一项变化不能单独确定神经损伤。新发或进行性无力需医学评估。','https://www.ncbi.nlm.nih.gov/books/NBK556065/'],
 ];
 for(const[suffix,Finding_Name,Finding_Feature,Finding_Interpretation,Source_URL]of features)add('FindingFeature',`AFM-0125-${suffix}`,{Feature_ID:`AFM-0125-${suffix}`,Assessment_Map_ID:'AFM-0125',Finding_Name,Finding_Feature,Finding_Interpretation,Source_URL,Review_Status:'待临床审核'});
 for(const region of d.tables['01_Region'].filter(r=>r.module==='THIGH'))add('05_RegionClinicalMap',`RCM-STATIC-NEURO-${region.region_id}`,{map_id:`RCM-STATIC-NEURO-${region.region_id}`,region_id:region.region_id,clinical_item_id:'THIGH-SPT-NEURO',direction_type:'特殊测试',priority:'Context',condition:'大腿感觉或神经相关表现时',status:'Stable',source_asset:'Static Clinical Review 2026-10-01',relation_nature:'区域症状相关',assessment_dimension:'SPECIAL_TEST',assessment_group:'神经相关检查',display_order:9000,display_mode:'LINKED'},true);
 put('07_ContextRule','THIGH-CX-01',{target:'THIGH-SPT-NEURO / CORE-SPT-NEURO-DISTAL'},true);
 // The local screen is first; the existing distal screen remains a supplementary reference.
 put('11_ContextItemMap','CIM-0121',{clinical_item_id:'THIGH-SPT-NEURO'},true);
 add('11_ContextItemMap','CIM-STATIC-THIGH-DISTAL',{map_id:'CIM-STATIC-THIGH-DISTAL',rule_id:'THIGH-CX-01',clinical_item_id:'CORE-SPT-NEURO-DISTAL',status:'Stable'},true);
 for(const row of d.tables['05_RegionClinicalMap'].filter(r=>r.region_id.startsWith('THIGH')&&r.clinical_item_id==='CORE-SPT-NEURO-DISTAL'))put('05_RegionClinicalMap',row.map_id,{display_order:9002,assessment_group:'神经相关检查'},true);
 for(const row of e.LocationGuide.filter(r=>r.Area_ID.startsWith('LOC-THIGH-R-')))put('LocationGuide',row.Area_ID,{Linked_Item_IDs:[...new Set([...(row.Linked_Item_IDs||'').split('|').filter(Boolean),'THIGH-SPT-NEURO'])].join('|')});
 put('ConsultationGuide','QG-THIGH-R-004-3',{Assessment_Help:'可补大腿外侧局部组织、感觉分布及神经相关检查；向小腿或足部放射时补远端筛查。',Source_Reference:sources});
}
else if(batch===3){
 spec.issue_ids=['STATIC-05','STATIC-06','STATIC-07','STATIC-08'];
 const posterior=join('https://www.ncbi.nlm.nih.gov/books/NBK537340/','https://www.ncbi.nlm.nih.gov/books/NBK539913/');
 for(const id of ['LL-R-003','LL-R-007']){const row=d.tables['01_Region'].find(r=>r.region_id===id);put('01_Region',id,{related_tissues_source:row.related_tissues_source.replace('https://www.ncbi.nlm.nih.gov/books/NBK539725/',posterior)},true);}
 const pes=join('https://www.ncbi.nlm.nih.gov/books/NBK534775/',B.knee);
 put('ClinicalPurpose','KNEE-CAP-PES',{Clinical_Purpose:'查看屈膝、髋内收发力与鹅足区局部压痛，分别对照主动输出和疼痛。',Assessment_Focus:'屈膝、髋内收抗阻；力量、耐力、疼痛与目标需求。',Source_URL:pes});
 put('FindingFeature','AFM-0094-CAPACITY',{Source_URL:pes});
 put('FindingFeature','AFM-0076-SENSITIVITY',{Source_URL:join('https://www.ncbi.nlm.nih.gov/books/NBK526084/',B.knee,e.InterventionReference.find(r=>r.Reference_ID==='AFM-0076-SENSITIVITY-MANUAL').Source_URL)});
 const toeNote='8名健康运动员T2 MRI研究实际测试短足、足趾展开、拇趾伸展和第2–5趾伸展。此处仅列分离伸展与展开的区域活动/组合控制参考，不作为肌肉过紧、疼痛或活动受限的独立疗效依据，不声称单肌隔离。方法与发现的关联为临床编辑整理。';
 for(const id of ['AFM-0050-TENSION-ACTIVE','AFM-0051-TENSION-ACTIVE','AFM-0052-TENSION-ACTIVE'])put('InterventionReference',id,{Treatment_Method:'拇趾与第2–5趾分离伸展；足趾展开练习',Source_Note:toeNote});
 put('InterventionReference','AFM-0023-LIMIT-ACTIVE',{Treatment_Method:'第2–5趾分离伸展；足趾展开练习',Source_Note:toeNote+' NHS跖板资料列足趾展开；未据其声称本条所有关节受限的治疗效果。'});
 put('InterventionReference','AFM-0075-TENSION-2',{Treatment_Goal:'相关主动活动'});
 for(const[id,name,focus]of [
  ['AF-JNT-005','第2–5跖趾关节活动','第2–5跖趾关节主动/被动屈伸、跖侧压痛、足趾贴地及排列。'],
  ['AF-ASM-004','第一跖趾关节活动','第一跖趾关节主动/被动屈伸、负重伸展及疼痛位置。'],
  ['CORE-CAP-HF','拇趾屈曲力量','拇趾屈曲抗阻；力量、疼痛与左右差异。'],
 ]){
  put('02_ClinicalItem',id,{display_name:name,check_focus:focus},true);
  const row=e.ClinicalPurpose.find(r=>r.Item_ID===id);put('ClinicalPurpose',id,{Item_Name:name,Assessment_Focus:focus,Source_URL:join(row.Source_URL,id==='CORE-CAP-HF'?'https://www.ncbi.nlm.nih.gov/books/NBK539705/':null,id==='CORE-CAP-HF'?B.ankle:null)});
 }
 for(const id of ['AFM-0110-KNEE-TASK','AFM-0112-KNEE-TASK','AFM-0113-KNEE-TASK','AFM-0116-KNEE-TASK']){const row=e.InterventionReference.find(r=>r.Reference_ID===id);put('InterventionReference',id,{Treatment_Method:row.Treatment_Method.split('；').filter(m=>m!=='髋膝踝协同练习').join('；')});}
 put('DimensionGuide','FUNCTION',{Public_Description:'结合相关动作，观察负重、支撑与动作配合。'});
}
else if(batch===4){
 spec.issue_ids=['STATIC-09'];
 const ankle='https://www.orthoinfo.org/recovery/foot-and-ankle-conditioning-program/';
 const knee='https://www.orthoinfo.org/recovery/knee-conditioning-program/';
 const balance='https://www.nhs.uk/live-well/exercise/balance-exercises/';
 const ham='https://doi.org/10.2519/jospt.2022.0301';
 const observationNote='区域动作观察及方法对应为临床编辑整理，教材用于检查框架。具名练习资料仅核对动作，不证明此表现必然需要纠正或该方法能治疗所有原因。康复师可按当前能力、症状与恢复目标选择相关任务或已有视频；低负荷任务不能替代高速度跑跳能力结论。不导入剂量、训练阶段或自动准入。';
 const configs=[
  {id:'LL-PATTERN-GAIT',module:'LOWER_LEG',map:'AFM-0126',name:'步行中的足踝配合',purpose:'查看小腿症状出现时，足部接触、抬脚与蹬地的配合。',focus:'步行触地与离地；抬脚、足部支撑和蹬地；步速与症状。',source:join(B.ankle,'https://www.ncbi.nlm.nih.gov/books/NBK537340/'),features:[
   ['CLEARANCE','抬脚或触地方式变化','摆动时抬脚较少或足尖擦地，触地后前脚掌下落较快；对照步速、鞋具、疼痛和既往表现。','步行抬脚与触地反馈练习；踝背屈抗阻训练',ankle],
   ['PUSH','蹬地或支撑时间变化','某侧提前卸重、蹬地减少或步幅缩短；对照同一速度下的症状与完成表现。','步行蹬地反馈练习；双脚或单脚提踵练习',ankle],
  ]},
  {id:'LL-PATTERN-PUSH',module:'LOWER_LEG',map:'AFM-0127',name:'提踵与蹬地表现',purpose:'提踵和蹬地可补充查看小腿输出、足部支撑与动作完成方式。',focus:'提踵高度、节奏、足部负重位置；膝位与身体借力。',source:join(B.ankle,ankle),features:[
   ['HEEL','提踵高度或节奏变化','反复提踵时高度下降、节奏中断，或借助屈膝和身体前移完成；对照膝位、支撑方式及疼痛。','双脚提踵练习；辅助单脚提踵练习；提踵动作反馈练习',ankle],
   ['SUPPORT','前足支撑或负重转移变化','提踵或蹬地时负重明显偏向前足一侧，或足趾反复抓地；对照接触位置、症状与目标任务。','辅助单脚支撑练习；提踵负重位置反馈练习',ankle],
  ]},
  {id:'LL-PATTERN-IMPACT',module:'LOWER_LEG',map:'AFM-0128',name:'跑跳中的足踝支撑',purpose:'跑跳相关小腿不适可对照触地缓冲、足踝支撑与蹬地转换。',focus:'现场相关动作或已有视频中的触地、踝背屈、蹬地转换及左右承重。',source:join(B.ankle,ham),features:[
   ['CONTACT','触地缓冲或承重方式变化','触地后踝背屈较少、缓冲中断，或明显避开某侧承重；对照同一任务、速度及症状。','动作视频反馈练习；辅助下蹲缓冲练习；相关落地缓冲练习',join(knee,ham)],
   ['PROPULSION','触地与蹬地衔接变化','触地后蹬地转换迟缓、提踵减少或左右节奏不同；对照速度、疲劳及完成表现。','跑步触地与蹬地反馈练习；提踵练习',join(ankle,ham)],
  ]},
  {id:'THIGH-PATTERN-GAIT',module:'THIGH',map:'AFM-0129',name:'步行中的大腿支撑与摆动',purpose:'大腿症状可与步行支撑、摆腿和步幅变化对照。',focus:'支撑时间、步幅、髋膝屈伸与摆腿；步速及症状。',source:join(B.ankle,ham),features:[
   ['LOAD','支撑侧提前卸重','步行时某侧支撑时间缩短，或提前把重量移向另一侧；对照步速、疼痛和既往步态。','步行负重转移反馈练习；辅助单脚支撑练习',join(balance,ankle)],
   ['SWING','步幅或摆腿配合变化','步幅缩短、摆腿时髋膝屈伸衔接改变，或躯干偏移增加；对照任务、症状与恢复目标。','步态视频反馈练习；相关步行步幅与节奏练习',ham],
  ]},
  {id:'THIGH-PATTERN-SAGITTAL',module:'THIGH',map:'AFM-0130',name:'前后向步出与蹬伸',purpose:'冲刺、踢腿或快速蹬伸相关大腿不适，可查看步出、回收与髋膝配合。',focus:'相关任务或视频中的步出、摆腿回收、蹬伸与躯干配合；速度及症状。',source:join(B.ankle,ham),features:[
   ['EXTEND','蹬伸或身体推进变化','蹬伸时膝伸幅度减少、推进迟缓，或用躯干偏移完成；对照同一任务下的症状与输出。','上台阶蹬伸练习；辅助半蹲蹬伸练习；动作视频反馈练习',join(knee,ham,'https://roh.nhs.uk/services-information/therapy/otago-strength-and-balance-exercises')],
   ['RECOVERY','步出或摆腿回收节奏变化','步出或摆腿回收时髋膝动作衔接中断、步幅缩短或节奏改变；对照速度、疼痛和既往能力。','相关跑步步幅与节奏反馈练习；步出与回收动作练习',ham],
  ]},
  {id:'THIGH-PATTERN-LATERAL',module:'THIGH',map:'AFM-0131',name:'侧向支撑与步出',purpose:'侧移、变向或大跨步相关大腿不适，可查看侧向承重与步出回收。',focus:'相关侧移或变向任务；步宽、负重转移、步出回收和骨盆躯干配合。',source:join(B.ankle,ham),features:[
   ['TRANSFER','侧向承重或身体偏移变化','侧向移动时提前卸重、躯干明显偏向一侧，或支撑阶段衔接中断；对照速度、步宽和症状。','侧向步行练习；侧向负重转移动作反馈练习',join(balance,ham)],
   ['STEP','侧向步出或回收变化','侧向步出距离减少、回收迟缓，或明显缩小步宽避开不适；对照同一动作的症状与目标需求。','侧向步出与回收练习；变向步伐反馈练习',join(balance,ham)],
  ]},
 ];
 for(const module of ['LOWER_LEG','THIGH']){
  const finding_id=module==='THIGH'?'THIGH-FND-TASK':'LL-FND-TASK';
  add('03_Finding',finding_id,{finding_id,finding_class:'TASK_CONTROL',display_name:module==='THIGH'?'大腿相关动作表现':'小腿相关动作表现',scope:'Module',status:'Stable',boundary:'对照任务、速度、症状及目标需求；动作差异不单独确定组织来源、肌肉薄弱或必须纠正。'},true);
 }
 for(const c of configs){
  add('02_ClinicalItem',c.id,{item_id:c.id,item_type:'TASK',display_name:c.name,check_focus:c.focus,allowed_finding_types:'TASK_CONTROL',status:'Stable',source_asset:'Static Clinical Review 2026-10-01'},true);
  add('08_AssessmentFindingMap',c.map,{map_id:c.map,clinical_item_id:c.id,finding_id:c.module==='THIGH'?'THIGH-FND-TASK':'LL-FND-TASK',trigger_condition:c.focus,status:'Stable',source_asset:'Static Clinical Review 2026-10-01'},true);
  add('ClinicalPurpose',c.id,{Item_ID:c.id,Item_Name:c.name,Clinical_Purpose:c.purpose,Assessment_Focus:c.focus,Module:c.module,Source_URL:c.source,Review_Status:'待临床审核'});
  for(const[suffix,Finding_Name,Finding_Feature,Treatment_Method,methodSource]of c.features){
   const Feature_ID=`${c.map}-${suffix}`;
   add('FindingFeature',Feature_ID,{Feature_ID,Assessment_Map_ID:c.map,Finding_Name,Finding_Feature,Finding_Interpretation:'可按当前能力观察相关任务或已有视频，不要求完成全套跑跳；低负荷任务不能替代高速度任务的能力结论。',Source_URL:c.source,Review_Status:'待临床审核'});
   add('InterventionReference',`${Feature_ID}-TASK`,{Reference_ID:`${Feature_ID}-TASK`,Feature_ID,Treatment_Goal:'相关动作练习',Treatment_Method,Source_URL:join(c.source,methodSource),Source_Note:observationNote+' 腘绳肌指南限于相应损伤运动员，其跑步与敏捷训练建议仅提供该情境的方法方向；本条动作反馈文案不是指南原文，也未验证全部小腿/大腿症状的疗效。',Review_Status:'待临床审核'});
  }
  for(const region of d.tables['01_Region'].filter(r=>r.module===c.module))add('05_RegionClinicalMap',`RCM-STATIC-${region.region_id}-${c.id}`,{map_id:`RCM-STATIC-${region.region_id}-${c.id}`,region_id:region.region_id,clinical_item_id:c.id,direction_type:'功能动作',priority:'Context',condition:'相关活动背景下补充观察',status:'Stable',source_asset:'Static Clinical Review 2026-10-01',relation_nature:'动作模式观察',assessment_dimension:'FUNCTION',assessment_group:c.id.includes('GAIT')?'步行表现':'相关活动表现',display_order:4100+configs.indexOf(c),display_mode:'LINKED'},true);
 }
 add('07_ContextRule','THIGH-MF-04',{rule_id:'THIGH-MF-04',rule_type:'MOVEMENT',source_context:'步行/长时间走路',trigger:'大腿症状与步行或长时间走路相关时',target_type:'ASSESSMENT_FOCUS',target:'THIGH-PATTERN-GAIT',priority:'Context',boundary:'只组织相关步态观察；不因步态变化自动确定组织、病因或训练。',status:'Stable',module_codes:'THIGH',public_label:'步行/长时间走路',public_group:'ACTIVITY'},true);
 const links={
  'LL-MF-01':['LL-PATTERN-IMPACT'],
  'LL-MF-02':['LL-PATTERN-PUSH','LL-PATTERN-IMPACT'],
  'LL-MF-03':['LL-PATTERN-GAIT','LL-PATTERN-PUSH'],
  'THIGH-MF-01':['THIGH-PATTERN-SAGITTAL'],
  'THIGH-MF-02':['THIGH-PATTERN-SAGITTAL'],
  'THIGH-MF-03':['THIGH-PATTERN-LATERAL'],
  'THIGH-MF-04':['THIGH-PATTERN-GAIT'],
 };
 for(const[rule,items]of Object.entries(links)){
  const original=d.tables['07_ContextRule'].find(r=>r.rule_id===rule);
  if(original)put('07_ContextRule',rule,{target:join(original.target,...items).replace(/\n/g,' / ')},true);
  for(const id of items)add('11_ContextItemMap',`CIM-STATIC-${rule}-${id}`,{map_id:`CIM-STATIC-${rule}-${id}`,rule_id:rule,clinical_item_id:id,status:'Stable'},true);
 }
 for(const location of e.LocationGuide.filter(r=>['LOWER_LEG','THIGH'].includes(r.Module_Codes))){
  const items=configs.filter(c=>c.module===location.Module_Codes).map(c=>c.id);
  put('LocationGuide',location.Area_ID,{Linked_Item_IDs:[...new Set([...(location.Linked_Item_IDs||'').split('|').filter(Boolean),...items])].join('|')});
 }
}
else throw Error(`Batch ${batch} not prepared yet`);
await fs.writeFile(`knowledge/review/static_remediation_batch${batch}_v1.json`,JSON.stringify(spec,null,2)+'\n');
console.log(JSON.stringify({batch,issue_ids:spec.issue_ids,records:Object.values(spec.main).concat(Object.values(spec.extension)).reduce((n,r)=>n+Object.keys(r).length,0)}));
