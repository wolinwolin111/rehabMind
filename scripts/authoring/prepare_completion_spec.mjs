import fs from 'node:fs/promises';
const data=JSON.parse(await fs.readFile('build/authoring/completion-original-runtime.json','utf8'));
const before=JSON.parse(await fs.readFile('knowledge/review/lower_limb_completion_checklist_before.json','utf8'));
try {await fs.writeFile('knowledge/review/lower_limb_completion_checklist_before.json',JSON.stringify(before,null,2),{flag:'wx'});} catch(e){if(e.code!=='EEXIST')throw e;}
const items=new Map(data.tables['02_ClinicalItem'].map(r=>[r.item_id,r]));
const maps=new Map(data.tables['08_AssessmentFindingMap'].map(r=>[r.map_id,r]));
const previous=new Map(data.clinical_extension.FindingFeature.map(r=>[r.Feature_ID,r]));
const S={
 anatomyMedial:'https://www.ncbi.nlm.nih.gov/books/NBK534775/',
 anatomyLateral:'https://www.ncbi.nlm.nih.gov/books/NBK499870/',
 anatomyQuad:'https://www.ncbi.nlm.nih.gov/books/NBK513334/',
 anatomyHam:'https://www.ncbi.nlm.nih.gov/books/NBK542215/',
 anatomyHipflex:'https://www.ncbi.nlm.nih.gov/books/NBK531508/',
 anatomyFoot:'https://www.ncbi.nlm.nih.gov/books/NBK539705/',
 anatomyArch:'https://www.ncbi.nlm.nih.gov/books/NBK587361/',
 anatomyAnkle:'https://www.ncbi.nlm.nih.gov/books/NBK545158/',
 exam:'https://pmc.ncbi.nlm.nih.gov/articles/PMC5241541/',
 ankle:'https://doi.org/10.2519/jospt.2021.0302',
 fascia:'https://doi.org/10.2519/jospt.2023.0303',
 heel:'https://roh.nhs.uk/services-information/foot-and-ankle/plantar-fasciitis',
 pad:'https://www.bdct.nhs.uk/pain-in-your-heel-fat-pad-syndrome/',
 padTape:'https://pmc.ncbi.nlm.nih.gov/articles/PMC5940598/',
 intrinsic:'https://pmc.ncbi.nlm.nih.gov/articles/PMC5094843/',
 toe:'https://msk-bexley.nhs.uk/conditions/foot-and-ankle-pain/arthritis-of-the-first-toe-joint',
 plate:'https://msk-bexley.nhs.uk/conditions/foot-and-ankle-pain/plantar-plate-injury',
 sesamoid:'https://www.orthoinfo.org/diseases--conditions/sesamoiditis/',
 turf:'https://www.orthoinfo.org/en/diseases--conditions/turf-toe/',
 bone:'https://www.orthoinfo.org/diseases--conditions/stress-fractures-of-the-foot-and-ankle/',
 midfoot:'https://rms.cornwall.nhs.uk/primary_care_clinical_referral_criteria/primary_care_clinical_referral_criteria/orthopaedics/primary_care_clinical_referral_criteria/primary_care_clinical_referral_criteria/orthopaedics/foot_and_ankle_referral/midfoot_arthritis',
 tp:'https://www.norfolkandwaveneycommunityhealth.nhs.uk/msk/self-help/foot-and-ankle/posterior-tibial-tendinopathy/',
 nav:'https://www.kentcht.nhs.uk/leaflet/accessory-navicular/',
 peroneal:'https://myjointhealthhub.bnssg.nhs.uk/foot-ankle-pain/peroneal-tendinopathy/',
 extensor:'https://msk-bexley.nhs.uk/conditions/foot-and-ankle-pain/extensor-tendinopathy-foot',
 plantaris:'https://pmc.ncbi.nlm.nih.gov/articles/PMC3604295/',
 adductor:'https://www.ouh.nhs.uk/media/ggzlylpj/73885padductor.pdf\nhttps://www.dynamichealth.nhs.uk/help-and-advice/hip-pain/hip-adductor-strains-and-tendinopathies/',
 addStrength:'https://pubmed.ncbi.nlm.nih.gov/39444266/',
 quads:'https://www.northerncarealliance.nhs.uk/patient-information/patient-leaflets/emergency-and-urgent-care-thigh-injury-quadriceps',
 ham:'https://www.ruh.nhs.uk/patients/services/physiotherapy/OP_outpatient_service.asp',
 osgood:'https://www.yorkhospitals.nhs.uk/childrens-centre/your-childs-hospital-journey/therapy-services/physiotherapy/osgood-schlatters-disease/',
 knee:'https://doi.org/10.2519/jospt.2018.0301',
 mcl:'https://www.uhcw.nhs.uk/download/clientfiles/files/Acute%20MCL%20Injry%20Exercises.pdf',
 lcl:'https://fractureclinic.royalcornwallhospitals.nhs.uk/knee-injuries/suspected-lateral-collateral-ligament-lcl-injury/',
 neuro:'https://www.ncbi.nlm.nih.gov/books/NBK549859/',
 tarsal:'https://msk-bexley.nhs.uk/conditions/foot-and-ankle-pain/tarsal-tunnel-syndrome',
 compartment:'https://www.orthoinfo.org/diseases--conditions/compartment-syndrome/',
 dvt:'https://www.nhs.uk/conditions/deep-vein-thrombosis-dvt/',
 achilles:'https://www.orthoinfo.org/diseases--conditions/achilles-tendon-rupture-injury/',
 records:'local-records://LR-20a01619ecb0#L50-L55\nlocal-records://LR-20a01619ecb0#L73-L90',
};
const spec={module:'LOWER_LIMB',source_note:'下肢现有检查项目、授权康复记录与逐条列出的公开资料。仅展示问题及评估用途，不录入回答。',
 locations:[],guides:[],purposes:[],features:[],references:[],retired_features:[],retired_references:[],display_notes:{},gap_dispositions:{},main_updates:{}};
const join=(...s)=>[...new Set(s.filter(Boolean))].join('\n');
function feature(map,suffix,name,text,note=null,source=S.exam){
 const id=`${map}-${suffix}`;
 const row={Feature_ID:id,Assessment_Map_ID:map,Finding_Name:name,Finding_Feature:text,Finding_Interpretation:note,Source_URL:join(`baseline://database-v3.8/08_AssessmentFindingMap/${map}`,source),Related_Location_Prompt:null,Related_Location_Action_Label:null};
 spec.features.push(row);
 if(note)spec.display_notes[id]='提示';
 return id;
}
function update(id,fields){const row={...previous.get(id),...fields}; if(!previous.has(id))throw Error(id);spec.features.push(row);if(row.Finding_Interpretation&&fields.Finding_Interpretation)spec.display_notes[id]='提示';return id;}
function ref(id,suffix,goal,methods,source,note){spec.references.push({Reference_ID:`${id}-${suffix}`,Feature_ID:id,Treatment_Goal:goal,Treatment_Method:methods,Source_URL:source,Source_Note:note});spec.gap_dispositions[id]={category:'已补具名参考',reason:goal+'：'+methods};}
function locate(id,prompt='可回到模型选择疼痛部位，查看该部位的康复思路。'){
 const row=spec.features.find(r=>r.Feature_ID===id);row.Related_Location_Prompt=prompt;row.Related_Location_Action_Label='选择疼痛部位';
 spec.gap_dispositions[id]={category:'按疼痛位置继续查看',reason:'疼痛与单纯活动受限分开；部位内容已补齐，不按方向性疼痛指定组织。'};
}
function assess(id,reason){spec.gap_dispositions[id]={category:'独立评估提示',reason};}
function purpose(id,why,focus,source=S.exam){spec.purposes.push({Item_ID:id,Module:data.tables['01_Region'].find(r=>data.tables['05_RegionClinicalMap'].some(m=>m.region_id===r.region_id&&m.clinical_item_id===id))?.module||'LOWER_LIMB',Clinical_Purpose:why,Assessment_Focus:focus,Source_URL:source});}
function retire(id){spec.retired_features.push(id);spec.retired_references.push(...data.clinical_extension.InterventionReference.filter(r=>r.Feature_ID===id).map(r=>r.Reference_ID));}
function retireRefs(id){spec.retired_references.push(...data.clinical_extension.InterventionReference.filter(r=>r.Feature_ID===id).map(r=>r.Reference_ID));}
const recordNote='授权记录列出该区域的方法，供临床经验对照；不证明单一方法疗效，不依据压痛自动选择方法。';
const exerciseNote='来源列出具名练习，本库只保留方法名称，不导入剂量、阶段或自动选择规则。';
const fasciaNote='2023足底筋膜相关足跟痛指南参考；适用范围是对应的足底筋膜表现，不扩大到所有足跟痛。';

// Foot joints: separate restricted motion, excessive motion and pain.
purpose('AF-ASM-004','第一跖趾关节的伸展参与步行蹬地；对照非负重与负重时的活动范围。','第一MTP主动/被动屈伸、负重伸展、疼痛位置。',join(S.exam,S.toe));
let id=feature('AFM-0003','LIMIT','第一跖趾关节屈伸受限','拇趾根部关节屈曲或伸展范围减少；比较主动、被动及负重时的差异。',null,join(S.exam,S.toe));
ref(id,'MOTION','关节活动','第一跖趾关节手法活动；拇趾主动屈伸',S.toe,'NHS第一MTP资料列手法活动；不等同强行突破骨性阻挡或急性损伤限制。');
id=feature('AFM-0003','PAIN','拇趾关节活动时疼痛','拇趾屈伸或蹬地时，关节线、跖侧籽骨附近或足背出现疼痛。',null,S.exam);locate(id);
purpose('AF-JNT-004','第一跖跗关节活动参与内侧前足承重和蹬地；活动受限与活动偏大分别查看。','第一跖骨基底与内侧楔骨之间的附属活动、终末感、关节线压痛及承重反应。');
id=feature('AFM-0022','LIMIT','第一跖跗关节活动受限','第一跖骨基底与内侧楔骨之间的附属活动较对侧减少，并与内侧前足承重或蹬地表现相对照。',null,S.exam);
ref(id,'MOTION','足部活动','中足手法松动；足部旋前、旋后主动活动',join('local-records://LR-146150af5fed#L135',S.exam),'沿用授权记录中的中足活动方法，需对照实际关节活动；不是第一TMT专属疗效证据。');
id=feature('AFM-0022','EXCESS','第一跖跗关节活动偏大伴承重控制不足','第一跖骨基底与内侧楔骨之间的附属活动偏大，且承重时内侧前足支撑或拇趾贴地控制不足。','活动偏大与活动受限分开查看；附属活动单项不能确定稳定结构损伤。',S.exam);
ref(id,'CONTROL','足部控制','短足训练；拇趾贴地抗阻训练',join(S.intrinsic,S.toe),'短足为足内在肌组合募集参考，拇趾抗阻为第一MTP控制方法；不宣称恢复第一TMT韧带稳定。');
id=feature('AFM-0022','PAIN','第一跖跗关节活动时疼痛','第一跖跗关节附属活动或负重时，内侧中足的该关节附近出现疼痛。',null,S.exam);locate(id);
purpose('AF-JNT-005','第2–5跖趾关节活动参与足趾支撑和前足负重；关节受限与跖板不适分别查看。','第2–5MTP主动/被动屈伸、跖侧压痛、足趾贴地及排列。');
id=feature('AFM-0023','LIMIT','第2–5跖趾关节屈伸受限','第2–5趾根部关节屈伸范围减少，主动与被动活动表现可不同。',null,S.exam);
ref(id,'ACTIVE','足趾活动','第2–5趾主动屈伸；足趾展开练习',join(S.plate,S.intrinsic),exerciseNote);
id=feature('AFM-0023','PAIN','第2–5跖趾关节活动时疼痛','第2–5趾根部关节活动或前足负重时疼痛，可伴跖侧压痛或足趾排列变化。',null,S.plate);locate(id);

// Plantar heel, fascia and navicular attachment.
purpose('AF-LT-006','足跟中央受压痛与内侧筋膜附着处疼痛涉及不同组织；先分清足跟垫与筋膜区域。','足跟中央/内侧结节压痛、赤脚与硬地负重、起步时反应。',join(S.pad,S.fascia));
id=feature('AFM-0031','PAD','足跟中央受压痛','疼痛集中在足跟底中央，直接按压、赤脚或硬地负重时更明显。','足跟垫受压表现与足底筋膜附着处疼痛分别查看。',S.pad);
ref(id,'CUSHION','足跟缓冲','硅胶足跟杯；缓冲足跟垫；带足跟缓冲的鞋具',S.pad,'仅列足跟垫相关减压工具；不能由部位痛诊断脂肪垫萎缩。');
ref(id,'TAPE','足跟贴扎','Low-Dye加8字贴扎',S.padTape,'足跟垫萎缩小样本即时压力/疼痛研究，无长期独立疗效结论；与足底筋膜Low-Dye范围分别记录。');
id=feature('AFM-0031','MEDIAL','足跟内侧结节牵拉痛','压痛集中在跟骨内侧结节，伸拇趾或起步时足底近端疼痛。','该表现可与足底筋膜内侧带项目对照；局灶骨面痛、突然瘀斑或负重困难另看骨与损伤评估。',S.fascia);
ref(id,'FASCIA','筋膜相关方法','足底筋膜牵伸；Low-Dye足弓贴扎',S.fascia,fasciaNote);
purpose('AF-LT-007','足底筋膜连接足跟与前足；结合走行压痛、拇趾伸展和起步负重反应查看。','近端及内侧带压痛、伸拇趾牵拉、休息后起步和持续负重。',S.fascia);
id=feature('AFM-0032','FASCIA','足底内侧带按压或牵拉痛','沿足底筋膜内侧带按压或伸拇趾牵拉时疼痛，可伴休息后起步痛。',null,S.fascia);
ref(id,'MANUAL','软组织方法','足底筋膜手法松解',join(S.fascia,'local-records://LR-f81dd3a468ec#L64'),recordNote);
ref(id,'STRETCH','牵伸','足底筋膜牵伸；腓肠肌拉伸；比目鱼肌拉伸',S.fascia,fasciaNote);
ref(id,'SUPPORT','贴扎与支撑','Low-Dye足弓贴扎；足弓支撑鞋垫（配合其他方法）',join(S.fascia,S.heel),fasciaNote+' 支撑鞋垫不标作单独有效治疗。');
ref(id,'EXERCISE','足踝训练','足趾屈曲抗阻训练；提踵训练',S.fascia,'指南支持足踝抗阻训练；具体动作需结合能力评估，无固定处方。');
id=feature('AFM-0032','PERSISTENT','持续的足底筋膜相关足跟痛','足底近端负重痛持续存在，已有其他保守处理后仍影响活动。',null,S.heel);
ref(id,'ESWT','物理治疗','体外冲击波',S.heel,'NHS将冲击波列为其他措施未改善的足底筋膜相关足跟痛选项；不推广到急性撕裂或所有足底痛。');
purpose('AF-LT-008','舟骨结节是胫骨后肌腱止点邻近；把骨面受压、鞋具摩擦与肌腱发力反应分开。','舟骨结节压痛、内翻/提踵反应、鞋具接触、近期外伤。',join(S.tp,S.nav));
id=feature('AFM-0033','TENDON','舟骨止点附近按压或内翻发力痛','舟骨结节附近压痛，内翻抗阻或提踵时同一区域不适。','止点附近有肌腱和骨性结构；单项发力痛不能区分胫骨后肌腱与副舟骨相关问题。',join(S.tp,S.nav));
ref(id,'LOAD','胫骨后肌相关训练','内翻等长抗阻；弹力带内翻训练；提踵训练',S.tp,exerciseNote);
ref(id,'SUPPORT','内侧足弓支撑','足弓支撑鞋垫；减少舟骨结节局部摩擦的鞋具',S.nav,'来源针对副舟骨伴内侧足痛的支撑与鞋具；不是副舟骨诊断或所有舟骨痛的统一处理。');
id=feature('AFM-0033','BONE','舟骨骨面局灶痛或外伤后肿胀','舟骨骨面局灶压痛，或外伤后肿胀、瘀斑、负重困难。','可补问外伤和近期跑跳变化，并查看骨应力或骨折评估；不与普通肌腱训练共用。',S.bone);assess(id,'骨与肌腱分开，明确评估提示。');

// Lateral foot, dorsum and forefoot.
purpose('AF-LT-009','第五跖骨基底邻近腓骨短肌止点；外翻发力痛与骨面局灶痛分开。','第五跖骨基底压痛、外翻抗阻、内翻牵拉、扭伤和负重。',join(S.peroneal,S.bone));
id=feature('AFM-0034','TENDON','第五跖骨基底邻近肌腱发力痛','基底邻近软组织按压或外翻抗阻时不适，与直接骨面按压痛分别查看。',null,S.peroneal);
ref(id,'LOAD','腓骨肌腱相关训练','外翻等长抗阻；弹力带外翻训练；提踵训练',S.peroneal,'腓骨肌腱资料列练习，仅作肌腱相关参考；不能用外翻痛排除第五跖骨损伤。');
id=feature('AFM-0034','BONE','第五跖骨基底骨面压痛','第五跖骨基底有集中的骨性压痛，可能伴扭伤后肿胀或跑跳负重痛。','结合扭伤、负重和近期运动量查看骨折或骨应力评估，不直接关联筋膜刀或肌腱训练。',S.bone);assess(id,'第五跖骨骨面风险与肌腱表现分开。');
purpose('AF-LT-010','足背同一区域有伸肌腱与跗跖关节；区分肌腱发力、关节活动与鞋面压迫。','伸趾/背屈抗阻、关节线压痛、鞋带压迫、足背肿胀。',join(S.extensor,S.midfoot));
id=feature('AFM-0035','TENDON','足背伸肌腱按压或发力痛','沿足背伸肌腱按压、伸趾或踝背屈抗阻时疼痛，可能受鞋面或鞋带压迫影响。',null,S.extensor);
ref(id,'LOAD','伸肌腱相关训练','踝背屈抗阻训练；足趾抬起后缓慢下放练习',S.extensor,exerciseNote);
ref(id,'SHOE','局部压迫','鞋带跨区系法；减少鞋面压迫的鞋具',S.extensor,'NHS提示鞋具压迫，跨区系法为减少鞋带接触的临床编辑示例，不宣称原文具名或独立疗效。');
id=feature('AFM-0035','JOINT','足背关节线压痛伴中足活动受限','压痛集中在跗跖/中足关节线，关节活动范围减少，肌腱发力反应可不同。',null,S.midfoot);
ref(id,'SUPPORT','中足支撑','足弓支撑鞋垫',S.midfoot,'中足关节相关支撑参考，不把关节线压痛等同关节炎。');
id=feature('AFM-0035','TRAUMA','外伤后中足肿胀或足底瘀斑','外伤后中足肿胀、负重困难，或足底出现瘀斑。','可补问扭转或足部被压住的经过，查看跗跖关节损伤与骨折评估。',S.exam);assess(id,'中足急性变化保留结构性损伤评估。');
purpose('AF-LT-011','跖骨头受压、跖板支撑和足趾排列共同影响前足承重；足趾偏移需另看稳定表现。','跖侧压痛、提踵反应、足趾贴地、排列与MTP稳定检查。',S.plate);
id=feature('AFM-0036','PRESSURE','跖骨头跖侧负重痛','疼痛集中在第2–5跖骨头跖侧，前足承重或提踵时更明显。',null,S.plate);
ref(id,'PAD','前足减压','跖骨减压垫；缓冲前足鞋垫；宽楦支撑鞋具',S.plate,'减压工具来自跖板相关前足痛资料；本表现不直接诊断跖板损伤。');
id=feature('AFM-0036','PLATE','跖侧疼痛伴足趾上翘或偏移','第2–5MTP跖侧痛，伴足趾贴地不足、上翘或侧向偏移。','可补跖板稳定检查；突然出现的偏移、明显肿胀或外伤需另行结构评估。',S.plate);
ref(id,'TAPE','跖板支撑','足趾跖屈锚定贴扎；跖骨减压垫',S.plate,'仅列跖板支撑选项，不导入固定时间/剂量，也不把所有前足痛都贴趾。');
ref(id,'CONTROL','足趾控制','足趾屈曲抗阻训练；足趾展开练习',S.plate,exerciseNote);
purpose('AF-LT-012','第一MTP关节线、籽骨和跖侧软组织都参与拇趾蹬地；先分清疼痛位置及过伸外伤。','关节线/籽骨压痛、拇趾屈伸、蹬地、过伸经过与肿胀。',join(S.sesamoid,S.turf));
id=feature('AFM-0037','SESAMOID','籽骨附近受压或蹬地痛','疼痛集中在第一跖骨头跖侧籽骨附近，直接受压或蹬地时不适。','籽骨骨面痛需结合外伤或重复冲击背景查看，不能只凭疼痛位置区分骨折与其他跖侧问题。',S.sesamoid);
ref(id,'PAD','籽骨区减压','籽骨减压垫；缓冲鞋垫；限制拇趾过伸的贴扎',S.sesamoid,'AAOS列缓冲垫与拇趾轻度跖屈贴扎；不把骨折处理或侵入性方法当普通参考。');
id=feature('AFM-0037','JOINT','第一MTP关节线疼痛伴僵硬','拇趾根部关节线压痛，关节屈伸僵硬，步行蹬地时不适。',null,S.toe);
ref(id,'JOINT','活动方法','拇趾主动屈伸；第一跖趾关节手法活动',S.toe,'慢性部分活动受限的参考；不是急性过伸损伤的松动方案。');
id=feature('AFM-0037','TRAUMA','拇趾过伸后肿胀或瘀斑','拇趾被迫过伸后，关节或跖侧出现肿胀、瘀斑、明显疼痛或不稳。','可进一步查看跖侧复合体与籽骨的结构损伤评估，不能用普通牵伸条目替代。',S.turf);assess(id,'第一MTP急性外伤与慢性僵硬分开。');

// Intrinsic muscle state and control remain distinct.
for(const [map,item,name,place] of [
 ['AFM-0050','AF-MUS-014','拇展肌','内侧足弓肌腹'],
 ['AFM-0051','AF-MUS-015','拇收肌','前足深层及拇趾外侧邻近'],
 ['AFM-0052','AF-MUS-016','趾短屈肌','足底中央肌腹'],
 ['AFM-0053','AF-MUS-017','拇短屈肌','第一MTP跖侧及籽骨邻近'],
]){
 purpose(item,`${name}参与足趾支撑；把${place}的肌肉牵拉表现与邻近筋膜、关节或骨面痛分开。`,'局部张力、足趾牵拉及屈曲/贴地表现；控制另看足弓与足趾项目。',join(S.exam,S.intrinsic));
 if(map==='AFM-0053'){
  id=feature(map,'STATE','拇趾跖侧肌肉牵拉受限','拇趾伸展时，第一MTP跖侧软组织牵拉范围减少，需与关节僵硬及籽骨压痛对照。','拇短屈肌与籽骨复合体紧密相连，不能通过局部触诊独立确定；骨面痛另看第一MTP/籽骨项目。',join(S.exam,S.turf));
  ref(id,'ACTIVE','足趾活动','拇趾主动屈伸；拇趾与第2–5趾分离控制',join(S.toe,S.intrinsic),'主动屈伸及分离活动是组合动作，不宣称单独募集或拉伸拇短屈肌。');
 }else{
  id=feature(map,'TENSION',`${place}紧张或牵拉受限`,`${place}软组织张力与对侧不同，或足趾拉长时局部牵拉范围减少。`,'足内在肌与邻近筋膜共同参与，局部触诊不能把深层肌肉单独隔离。',S.exam);
  ref(id,'MANUAL','足底软组织方法',map==='AFM-0050'?'足底内侧肌肉手法松解':'足底肌肉手法松解','local-records://LR-d64a19ea9ecf#L65','授权记录仅写足底肌肉松解；名称按区域列出，不冒充某一足内在肌的特异手法证据。');
  ref(id,'ACTIVE','足趾活动','足趾主动屈伸；足趾展开练习',S.intrinsic,'健康人MRI研究支持组合肌肉募集，不是疼痛治疗试验，不宣称单肌分离效果。');
 }
 const pain=feature(map,'PAIN',`${place}按压或活动痛`,`${place}按压、足趾发力或前足负重时疼痛。`,null,S.exam);locate(pain);
}
purpose('CORE-MUS-PLANTARIS','跖肌位于后侧肌群之间且存在解剖变异；后侧症状范围未分清时供补充查看。','后侧疼痛范围、急性弹响、肿胀及腓肠肌/比目鱼肌/跟腱对照。',S.plantaris);
id=feature('AFM-0049','ASSESS','后侧肌群间疼痛范围未分清','小腿后侧深部或跟腱内侧不适，尚不能区分腓肠肌、比目鱼肌、跖肌或跟腱。','可对照两种膝位的背屈、提踵与局部检查；突然弹响或肿胀需查看肌腱/肌肉完整性及血管评估，必要时补影像。皮肤位置不能确定跖肌。',S.plantaris);assess(id,'变异小肌肉不伪造独立牵伸或按摩方法，补具体鉴别内容与公开入口。');

// Two task observations: no field-dependent running/jumping test requirement.
purpose('AF-TASK-001','比较单腿支撑时足踝控制与重心转移；与力量、活动度分开查看动作模式。','单腿支撑、前后/侧向触及、左右负重与足踝摆动。',S.ankle);
id=feature('AFM-0010','CONTROL','单腿支撑或触及控制不足','实际单腿支撑或触及动作中，出现反复摆动、支撑脚失稳或需要额外支撑。','高强度动作可以参考已有视频；不要求现场完成跑跳、变向。',S.ankle);
ref(id,'BALANCE','平衡与控制','单腿站立平衡；多方向触及练习；前后与侧向重心转移',S.ankle,'慢性踝不稳指南的感觉运动/平衡练习参考；不按一个动作直接确定损伤。');
purpose('AF-TASK-002','步行蹬地与提踵时序用于看推进动作；把力量缺口与动作代偿分开。','步行末期支撑、提踵轨迹、足趾支撑及左右参与差异。',join(S.exam,S.ankle));
id=feature('AFM-0011','PROPULSION','蹬地或提踵轨迹改变','实际步行或提踵中，出现推进参与减少、重心偏移或提踵方向/时序改变。','跑跳只在已有任务表现可供观察时追加；力量不足另看跖屈能力。',S.exam);
ref(id,'TASK','推进动作练习','步行蹬地反馈练习；提踵轨迹练习；前后重心转移',join(S.ankle,S.exam),'由原库任务方向编辑成可观察具名动作，属于动作练习参考，不宣称特定病种独立疗效。');
purpose('AF-SPT-004','拇趾伸展增加足底张力；负重与非负重反应用于支持足底筋膜相关检查。','伸拇趾时足跟/足弓反应及负重差异；与局部检查对照。',join(S.exam,S.fascia));
id=feature('AFM-0015','SCREEN','伸拇趾时足底或足跟疼痛','Windlass检查时足底或足跟出现疼痛，记录具体位置及负重差异。','该检查提供支持信息；可结合筋膜走行压痛、起步反应和局部骨面检查，不单项确定诊断。',S.exam);locate(id);

// Thigh local tissue and adductors.
const thighLocal=[
 ['AFM-0099','THIGH-LT-001','前侧','膝屈牵拉或伸膝抗阻', '股直肌手法松解；股外侧肌手法松解', 'local-records://LR-a27906e6eaef#L17\nlocal-records://LR-a27906e6eaef#L52', '股四头肌拉伸',S.quads],
 ['AFM-0101','THIGH-LT-003','内侧','髋外展牵拉或内收抗阻', '内收肌群手法松解', 'local-records://LR-a72ff97740b2#L8','内收肌群拉伸',S.adductor],
 ['AFM-0102','THIGH-LT-004','外侧','膝屈伸或侧向活动', '股外侧肌手法松解；阔筋膜张肌手法松解', 'local-records://LR-a27906e6eaef#L5\nlocal-records://LR-a27906e6eaef#L52','阔筋膜张肌相关主动活动',S.anatomyLateral],
];
for(const [map,item,side,prov,manual,source,stretch,external]of thighLocal){
 purpose(item,`大腿${side}肌腹、筋膜与肌腱邻近表现分别查看；结合拉长、发力及受伤经过。`,`${side}局部压痛、张力、${prov}、肿胀/瘀斑。`,join(S.exam,external));
 id=feature(map,'TENSION',`${side}肌腹紧张或牵拉受限`,`${side}肌腹紧张或拉长范围较对侧减少，可与${prov}的表现对照。`,map==='AFM-0102'?'髂胫束是筋膜结构，局部处理不等于把整条髂胫束拉长。':null,join(source,external));
 ref(id,'MANUAL','肌腹软组织方法',manual,source,recordNote);
 if(map!=='AFM-0102')ref(id,'STRETCH','牵伸',stretch,external,exerciseNote);
 const pain=feature(map,'PAIN',`${side}肌腹按压或发力痛`,`${side}肌腹按压或${prov}时疼痛。`,'突然疼痛、瘀斑、明显无力或局部缺损需补损伤范围与完整性评估，不能与单纯紧张共用。',external);
 ref(pain,'ACTIVE','相关主动与抗阻方法',map==='AFM-0099'?'股四头肌等长收缩；主动膝屈伸':map==='AFM-0101'?'内收等长抗阻；侧卧髋内收训练':'主动膝屈伸；侧卧髋外展训练',map==='AFM-0101'?S.adductor:map==='AFM-0099'?S.quads:S.ham,'具名相关练习参考；急性损伤是否适合由康复师评估，不由系统安排。');
}
retire('AFM-0100-BASELINE');retire('AFM-0106-BASELINE');
id=feature('AFM-0100','PAIN','后侧肌腹按压或屈膝发力痛','后侧肌腹按压、伸膝牵拉或屈膝抗阻时疼痛。','突然疼痛、瘀斑、明显无力或取腱手术背景，需与单纯张力增加分开查看。',S.ham);
ref(id,'ACTIVE','腘绳肌相关方法','屈膝等长抗阻；站立屈膝训练；双腿桥式',S.ham,exerciseNote);
id=feature('AFM-0106','PAIN','近端外侧肌腹按压或活动痛','大腿近端外侧肌腹按压或髋屈、外展时不适；需与远端髂胫束附近疼痛分开。',null,S.anatomyLateral);
ref(id,'MANUAL','相关肌腹方法','阔筋膜张肌手法松解','local-records://LR-a27906e6eaef#L5',recordNote);
for(const [map,item,name,place]of [['AFM-0103','THIGH-MUS-AL','内收长肌','较表浅的内侧肌腹'],['AFM-0104','THIGH-MUS-AB','内收短肌','近端内侧深层邻近'],['AFM-0105','THIGH-MUS-AM','内收大肌','内侧及后内侧肌腹']]){
 purpose(item,`${name}参与内收；比较${place}的牵拉与发力反应，不由位置确定单块肌肉。`,'外展牵拉、内收抗阻、局部张力与疼痛位置。',join(S.anatomyMedial,S.adductor));
 id=feature(map,'LENGTH',`${name}相关牵拉受限`,`${place}在髋外展拉长时牵拉范围减少，或内侧肌群张力与对侧不同。`,map==='AFM-0104'?'内收短肌较深，拉长、内收抗阻和触诊不能把它与其他内收肌独立隔离。':null,S.anatomyMedial);
 ref(id,'MANUAL','内侧肌腹方法','内收肌群手法松解','local-records://LR-a72ff97740b2#L8','授权记录写内收肌群，不能冒充单独内收长/短/大肌的独立操作证据。');
 ref(id,'STRETCH','牵伸','内收肌群拉伸',S.adductor,exerciseNote);
 const pain=feature(map,'PAIN','内侧肌腹按压或内收发力痛',`${place}按压或内收抗阻时不适，可与外展牵拉反应对照。`,'局部痛可能来自肌腹、肌腱或其他近端组织，突然疼痛及瘀斑另补损伤评估。',S.adductor);
 ref(pain,'LOAD','内收肌群方法','内收等长抗阻；侧卧髋内收训练',S.adductor,'内收肌群运动资料，未声称可隔离每块肌肉或适用于所有近端痛。');
}
purpose('THIGH-CAP-ADD','内收输出影响侧向移动与变向；比较标准化力量和任务需求，再看能力缺口。','标准化内收等长力值、单侧测力、侧差；任务需要时追加动态/离心测试。',join(S.addStrength,'https://pubmed.ncbi.nlm.nih.gov/35176620/'));
id=feature('AFM-0107','STRENGTH','内收力量或耐力不足','标准化内收抗阻测试显示力值或重复能力不足，或左右差异与目标任务相关。',null,S.addStrength);
ref(id,'STRENGTH','内收抗阻','夹球等长内收；侧卧髋内收训练；哥本哈根内收训练',join(S.adductor,S.addStrength),'运动员力量研究及NHS具名练习；不导入训练周期、动作优先级或适用所有损伤结论。');

// Posteromedial ankle: long toe flexors have their own reference scope.
const flexorCase='https://pmc.ncbi.nlm.nih.gov/articles/PMC8159326/';
const fhlStretch='https://pmc.ncbi.nlm.nih.gov/articles/PMC8726539/';
id=feature('AFM-0027','HALLUX','内踝后方屈拇趾或牵拉时疼痛','内踝后方至足底内侧在拇趾屈曲抗阻，或踝背屈结合拇趾伸展时疼痛。','拇长屈肌腱、胫骨后肌腱及跗管相邻；动作反应不能单独确定来源，麻木或感觉变化可另看神经检查。',join(S.anatomyAnkle,flexorCase));
ref(id,'MANUAL','屈趾肌腱周围软组织','拇长屈肌肌腱周围手法松解',flexorCase,'单病例的多方法康复中列有FHL/FDL肌肉与肌腱手法；不能推断手法独立疗效。原病例操作可即时诱发疼痛，不复制深压、操作步骤或剂量，不用于不明神经症状。');
ref(id,'STRETCH','伴拇趾牵拉范围受限','拇长屈肌牵伸',fhlStretch,'FHL专门牵伸项目的回顾性队列，存在选择和失访偏倚；只作为对应牵拉受限的方法参考，不把内踝疼痛等同FHL腱病，不用于强行突破疼痛范围。');
id=feature('AFM-0027','LESSER_TOES','内踝后方屈第2–5趾时疼痛','内踝后方在第2–5趾屈曲抗阻时疼痛，可与足底走行处不适及足趾活动范围对照。','趾长屈肌腱与拇长屈肌腱、胫骨后肌腱及神经相邻；不能由屈趾痛单独确定肌腱损伤。',join(S.anatomyAnkle,flexorCase));
ref(id,'MANUAL','屈趾肌腱周围软组织','趾长屈肌肌腱周围手法松解',flexorCase,'FHL/FDL共同受累的单病例多方法经验，未发现FDL独立手法疗效试验；只保留病例所列方法，不外推FHL专门牵伸、贴扎或理疗证据至FDL。原病例操作可即时增加疼痛，不复制操作步骤。');

// Knee muscle pain labels and concrete regional manual reference; no false PFP sourcing.
const kneeMuscles=[
 ['0065','股直肌','local-records://LR-a27906e6eaef#L17','股直肌手法松解','膝屈拉长或髋伸','股四头肌拉伸',S.quads],
 ['0066','股外侧肌','local-records://LR-a27906e6eaef#L52','股外侧肌手法松解','膝屈拉长或伸膝发力','股四头肌拉伸',S.quads],
 ['0067','股内侧肌','local-records://LR-e25569fa2a1a#L43','股内侧肌手法松解','膝屈拉长或伸膝发力','股四头肌拉伸',S.quads],
 ['0068','股四头肌深层邻近','local-records://LR-a27906e6eaef#L17\nlocal-records://LR-a27906e6eaef#L52','股四头肌肌腹手法松解','膝屈拉长或伸膝发力','股四头肌拉伸',S.quads],
 ['0069','股二头肌','local-records://LR-b35efaa9dc7a#L15','股二头肌肌腹手法松解','伸膝牵拉或屈膝发力','腘绳肌拉伸',S.ham],
 ['0070','半腱肌','local-records://LR-5720cfa367b7#L10','半腱肌肌腹手法松解','伸膝牵拉或屈膝发力','腘绳肌拉伸',S.ham],
 ['0071','半膜肌','local-records://LR-5720cfa367b7#L29','半膜肌肌腹手法松解','伸膝牵拉或屈膝发力','腘绳肌拉伸',S.ham],
 ['0072','缝匠肌','local-records://LR-5720cfa367b7#L8','缝匠肌邻近肌腹手法松解','髋伸牵拉或屈膝发力',null,S.anatomyMedial],
 ['0073','股薄肌','local-records://LR-5720cfa367b7#L8','股薄肌邻近肌腹手法松解','髋外展结合伸膝牵拉或内收发力','内收肌群拉伸',S.adductor],
 ['0074','内收肌群','local-records://LR-a72ff97740b2#L8','内收肌群手法松解','髋外展牵拉或内收发力','内收肌群拉伸',S.adductor],
 ['0075','阔筋膜张肌邻近','local-records://LR-a27906e6eaef#L5','阔筋膜张肌手法松解','髋屈或外展发力',null,S.anatomyLateral],
 ['0077','髋前侧肌群','local-records://LR-da72e553ca07#L33','髂腰肌手法松解','髋伸牵拉或髋屈发力','髋屈肌群拉伸',S.anatomyHipflex],
];
for(const [n,name,source,manual,action,stretch,external]of kneeMuscles){
 const fid=`AFM-${n}-SENSITIVITY`;retireRefs(fid);
 update(fid,{Finding_Name:`${name}肌腹按压或活动痛`,Finding_Feature:`${name}肌腹邻近按压，或${action}时出现疼痛；与关节线及肌腱止点分别查看。`,Finding_Interpretation:n==='0068'?'股中间肌较深，局部触诊不能独立确定；这里列股四头肌区域方法。':n==='0077'?'髂腰肌较深，不能由表面压痛确定；仅保留既有下肢关联项目，不接入髋关节模块。':'肌腹疼痛与单纯紧张分开查看；突然疼痛、瘀斑或明显无力需补损伤范围评估。',Source_URL:join(source,external)});
 const row=spec.features.at(-1);
 if(n==='0068'){row.Finding_Name='大腿前侧深部牵拉或发力痛';row.Finding_Feature='大腿前侧深部在屈膝牵拉或伸膝发力时疼痛，与表浅肌腹及关节线分别查看。';}
 if(n==='0077'){row.Finding_Name='髋前侧牵拉或发力痛';row.Finding_Feature='髋前侧在髋伸牵拉或屈髋发力时疼痛，与腹股沟、关节及肌腱区域分别查看。';row.Finding_Interpretation='髂腰肌较深，表面压痛不能单独确定来源；可结合牵拉、抗阻及邻近组织评估。';}
 ref(fid,'MANUAL','相关肌腹方法',manual,source,recordNote+(n==='0068'?' 记录没有具名股中间肌松解，只能列区域方法。':n==='0077'?' 记录有髂腰肌操作，但不复制深部按压步骤。':''));
 if(stretch)ref(fid,'STRETCH','伴牵拉受限',stretch,external,'只列相关肌群牵伸方法，需另对照牵拉范围，不把痛等同过紧。');
}
update('AFM-0076-SENSITIVITY',{Finding_Name:'膝后外侧肌腹邻近压痛',Finding_Feature:'膝后外侧肌腹邻近按压或屈膝、胫骨旋转时不适，与腘窝深部、包块和关节线分开。',Finding_Interpretation:'腘肌较深，按压与动作反应不能单独定位；肌腹参考不用于不明腘窝包块。'});
retireRefs('AFM-0094-CAPACITY');
ref('AFM-0094-CAPACITY','STRENGTH','鹅足相关肌群抗阻','屈膝抗阻训练；内收等长抗阻；侧卧髋内收训练',join(S.ham,S.adductor),'鹅足由多条肌腱共同构成；列相关方向，不声称测试或训练可隔离缝匠肌、股薄肌和半腱肌。');
update('AFM-0094-CAPACITY',{Finding_Name:'鹅足相关屈膝或内收能力不足',Finding_Feature:'屈膝或内收抗阻时力值、耐力或左右表现有差异，需与膝内侧疼痛分开查看。'});
retireRefs('AFM-0008-CONTROL');
ref('AFM-0008-CONTROL','CONTROL','足弓与足趾控制','短足训练；足趾展开练习；拇趾与第2–5趾分离控制',join(S.intrinsic,'local-records://LR-146150af5fed#L150'),'健康人MRI募集研究与授权足弓训练记录；不是某块足内在肌独立疗效或所有足痛方案。');

// Split knee non-specific pain from mobility methods.
for(const [map,place,prov]of [['AFM-0086','髌骨周围','髌骨活动'],['AFM-0087','腓骨头邻近','近端胫腓关节活动'],['AFM-0088','膝关节内外侧或后侧','胫骨内外旋']]){
 const fid=`${map}-SYMPTOM`;retireRefs(fid);
 update(fid,{Finding_Name:`${prov}时疼痛`,Finding_Feature:`${prov}时${place}出现疼痛，活动范围可以没有受限。`,Finding_Interpretation:null});
 locate(fid,`可回到模型选择${place}的疼痛部位，查看对应组织的康复思路。`);
}
update('AFM-0079-TUBERCLE',{Finding_Name:'胫骨结节压痛或跑跳痛',Finding_Feature:'疼痛集中在胫骨结节，跑跳或跪地时不适；需结合年龄、发育及外伤经过。',Finding_Interpretation:'以下参考针对生长发育期相关表现；成人新发骨面痛、外伤后明显肿胀或伸膝无力需另行结构评估。',Source_URL:S.osgood});
ref('AFM-0079-TUBERCLE','SUPPORT','生长发育期相关方法','髌腱减压带；股四头肌拉伸；腘绳肌拉伸',S.osgood,'NHS生长发育期OSD资料，不由胫骨结节压痛自动诊断OSD；不导入成人髌腱大负荷方案。');
update('AFM-0080-JOINTLINE',{Finding_Name:'内侧关节线压痛',Finding_Feature:'压痛集中在内侧关节线，需与关节线下方鹅足区和内侧副韧带走行分开。',Finding_Interpretation:'可结合膝屈伸、积液、卡锁表现及半月板相关检查查看；关节线压痛不能单项确定半月板损伤。',Source_URL:S.knee});
assess('AFM-0080-JOINTLINE','关节线是评估定位，不伪造半月板松解；补具体后续检查。');
update('AFM-0081-LOCALISE',{Finding_Name:'外侧关节线压痛',Finding_Feature:'压痛集中在外侧关节线，与腓骨头、外侧副韧带及股二头肌止点分别查看。',Finding_Interpretation:'可结合膝屈伸、积液、卡锁表现及半月板相关检查查看；关节线压痛不能单项确定半月板损伤。',Source_URL:S.knee});
assess('AFM-0081-LOCALISE','拆开原先关节线与腓骨头混合描述，分别提供评估内容。');
for(const [map,side,source]of [['AFM-0080','内',S.mcl],['AFM-0081','外',S.lcl]]){
 id=feature(map,'COLLATERAL',`${side}侧副韧带走行压痛`,`${side}侧副韧带走行有压痛，可与相应应力检查、外伤及不稳表现对照。`,'支具与抗阻参考属于已评估的韧带问题；新发外伤或明显失稳需单独查看损伤范围。',source);
 ref(id,'SUPPORT','韧带相关支撑与练习','铰链膝支具；股四头肌等长收缩；主动膝屈伸',source,'来源是韧带损伤康复资料，支具限制由专业评估确定；不导入固定角度、时间或统一处方。');
 id=feature(map,'JOINT-LIMIT',`${side}侧关节线痛伴膝活动受限`,`${side}侧关节线附近疼痛，并在膝屈伸评估中有活动范围减少。`,null,S.knee);
 ref(id,'ROM','膝关节活动','膝关节手法松动；脚跟滑动屈膝；主动膝屈伸',S.knee,'半月板/软骨相关活动障碍CPG支持手法与活动训练；不是用关节线痛单项诊断或针对骨性卡锁强行松动。');
}
id=feature('AFM-0081','FIBULAR-TENDON','腓骨头邻近肌腱压痛或屈膝发力痛','腓骨头邻近肌腱按压或屈膝抗阻时不适，需与骨面及近端胫腓关节分开。','足背麻木或抬脚无力可追加腓总神经相关检查。',join(S.anatomyHam,S.neuro));
ref(id,'LOAD','相关肌群方法','屈膝等长抗阻；站立屈膝训练',S.ham,exerciseNote);
id=feature('AFM-0081','FIBULAR-JOINT','腓骨头附近关节活动受限','近端胫腓关节附属活动较对侧减少，可伴膝外侧活动痛。',null,S.exam);
// Reuse already authored joint reference, retaining its exact source and limitation.
const proxRef=data.clinical_extension.InterventionReference.find(r=>r.Feature_ID==='AFM-0087-LIMIT');
if(proxRef){
 const source='https://pubmed.ncbi.nlm.nih.gov/29364749/';
 const note='近端胫腓关节MWM个案报告，不能证明普遍疗效；只列手法参考，不导入操作步骤或应用于脱位、不稳及骨性压痛。';
 ref(id,'MOTION','近端胫腓关节方法','近端胫腓关节伴随运动松动（MWM）',source,note);
 spec.references.push({...proxRef,Treatment_Method:'近端胫腓关节伴随运动松动（MWM）；主动膝屈伸',Source_URL:join(source,S.ham),Source_Note:note});
}
else {spec.features.find(r=>r.Feature_ID===id).Finding_Interpretation='可与近端胫腓关节活动项目对照；外伤后突出、明显不稳或神经变化需追加结构评估。';spec.display_notes[id]='提示';assess(id,'关节受限评估提示。');}
update('AFM-0082-TENDERNESS',{Finding_Name:'腘窝深部压痛或疼痛范围不清',Finding_Feature:'腘窝深部压痛，与膝后内侧肌腱、后外侧肌腹或关节线尚未分清。',Finding_Interpretation:'可对照膝屈伸、腘绳肌与腓肠肌抗阻、局部包块和神经血管表现。深部痛伴包块、肿胀或小腿变化需独立评估。'});locate('AFM-0082-TENDERNESS','可回到模型选择膝后内侧、后外侧或小腿肌腹的具体疼痛部位，查看相关组织。');
id=feature('AFM-0082','TENDON','膝后肌腱按压或屈膝发力痛','膝后内外侧肌腱邻近按压，或屈膝抗阻时疼痛，与腘窝中央深部压痛分开。',null,S.ham);
ref(id,'LOAD','腘绳肌相关方法','屈膝等长抗阻；站立屈膝训练；双腿桥式',S.ham,exerciseNote);
id=feature('AFM-0082','MUSCLE','膝后肌腹紧张伴伸膝牵拉受限','膝后相关肌腹紧张，伸膝牵拉范围减少，可与腘肌及腘绳肌项目对照。',null,S.records);
ref(id,'MANUAL','膝后肌腹方法','腘绳肌手法松解；腘肌手法松解',join(S.records,'local-records://LR-b62ce4e8b001#L105-L109'),recordNote);

// Specific screening descriptions; methods belong to assessed tissue/ability findings.
update('AFM-0097-SCREEN',{Finding_Name:'弹响、卡顿或支撑后动作变化',Finding_Feature:'膝屈伸或实际任务中出现弹响、卡顿、摩擦或活动受阻；支撑或动作修改后表现可能变化。',Finding_Interpretation:'可记录出现角度、是否疼痛及是否阻挡活动，并与髌骨活动、膝屈伸和局部组织检查对照。真正锁住或急性明显肿胀需独立结构评估。',Source_URL:S.knee});assess('AFM-0097-SCREEN','具名机械表现及后续评估，不将支持性反应当治疗对象。');
update('AFM-0089-SCREEN',{Finding_Name:'髋屈伸或旋转范围差异',Finding_Feature:'比较髋屈、髋伸及内外旋范围，查看是否与膝部动作或不适同时出现。',Finding_Interpretation:'此处保留膝部评估的上游对照；髋部独立康复思路暂不接入，不在此生成髋部处理方法。',Source_URL:S.anatomyHipflex});assess('AFM-0089-SCREEN','按既定范围保留明确上游对照，髋模块未扩展。');
purpose('CORE-SPT-NEURO-DISTAL','麻木、放射痛或远端无力需要对照感觉分布与运动变化；与局部组织痛分开。','足背/第一趾蹼/足底/内外侧感觉，背屈、伸趾、外翻及跖屈肌力。',join(S.neuro,S.tarsal));
update('AFM-0016-SCREEN',{Finding_Name:'麻木、放射痛或远端肌力变化',Finding_Feature:'小腿至足部出现麻木、放射痛，或背屈、伸趾、外翻、跖屈肌力变化。',Finding_Interpretation:'可比较足背、第一趾蹼、足底及内外侧感觉，结合相关抗阻、神经张力和叩击检查。新发或进行性无力、持续感觉缺失需医学评估。',Source_URL:join(S.neuro,S.tarsal)});assess('AFM-0016-SCREEN','明确感觉/运动范围；筛查不直接绑定统一神经松动。');
id=feature('AFM-0016','PERONEAL','足背或第一趾蹼麻木伴抬脚变化','足背或第一趾蹼感觉变化，可伴背屈、伸趾或外翻无力。','可对照腓骨头邻近、外侧小腿、足背局部压迫及近端神经表现。腓浅与腓深神经的感觉和运动范围不同，不凭一处麻木确定卡压点。',S.neuro);assess(id,'具名腓神经筛查方向，含必要医学评估范围。');
id=feature('AFM-0016','TIBIAL','足底麻木或内踝放射痛','足底感觉变化，内踝附近叩击或相关张力检查时出现向足底的放射反应。','可对照跗管邻近、足底感觉及屈趾/跖屈肌力；持续感觉缺失或进行性无力需补医学与电生理评估。',S.tarsal);assess(id,'具体胫神经相关评估，内踝项目已有相应方法，不把整个筛查等同跗管诊断。');
id=feature('AFM-0016','CUTANEOUS','足内侧或外侧感觉变化','足内侧或外侧边缘有麻木、触觉变化或放射痛，运动检查可能没有相同变化。','可对照隐神经或腓肠神经分布、鞋具/局部压迫及近端症状；感觉分布有重叠，不凭一项定位。',S.exam);assess(id,'补皮神经方向与感觉范围，不伪造神经特异手法。');

// Long extensors: restricted length is not resisted pain.
for(const [map,toe,place]of [['AFM-0039','拇趾','前侧至足背'],['AFM-0040','第2–5趾','前外侧至足背']]){
 update(`${map}-LENGTH`,{Finding_Feature:`踝跖屈结合${toe}屈曲牵拉时，相关软组织牵拉范围较对侧减少。`,Finding_Interpretation:'足趾关节活动与肌肉牵拉分别查看；此条不包含单纯发力痛。',Source_URL:join(S.exam,S.extensor)});
 const pain=feature(map,'PULL-PAIN',`${toe}牵拉时疼痛`,`${toe}屈曲结合踝跖屈牵拉时，${place}出现疼痛，活动范围可以没有受限。`,null,S.extensor);locate(pain);
 // Existing muscle-belly references remain, with a new route to the now populated dorsum tendon card.
 update(`${map}-PRESSURE`,{Finding_Interpretation:'肌腹与足背肌腱分别查看；肌腹方法不直接迁移到肌腱或骨面。',Related_Location_Prompt:'若疼痛集中在足背肌腱，可回到模型选择足背，查看伸肌腱相关思路。',Related_Location_Action_Label:'选择疼痛部位'});
}
update('AFM-0041-STATE',{Finding_Name:'前外侧牵拉或背屈外翻发力痛',Finding_Feature:'远端前外侧按压、跖屈结合内翻牵拉，或背屈结合外翻抗阻时疼痛。',Finding_Interpretation:'第三腓骨肌存在解剖变异，该动作还涉及伸肌群及腓骨肌群；可与小腿前外侧肌腹、外踝肌腱及足背分别对照。'});locate('AFM-0041-STATE','可回到模型选择前外侧肌腹、外踝或足背的具体疼痛位置，查看对应组织。');

// Special and safety maps get purposes and public assessment notes, never ordinary treatment.
const checks=[
 ['AFM-0012','AF-SPT-001','前抽屉松弛或终末感差异','前抽屉松弛、终末感或疼痛较对侧不同；结合外侧扭伤或反复崴脚经过。','可补ATFL邻近压痛、距骨倾斜及实际支撑表现；单项不能确定损伤级别。','对照外側踝机械稳定与扭伤背景。','前抽屉侧差、终末感及疼痛位置。',S.ankle],
 ['AFM-0013','AF-SPT-002','距骨倾斜侧差或外踝下方疼痛','距骨倾斜幅度、终末感或外踝下方疼痛较对侧不同。','与CFL走行、外侧扭伤经过及其他稳定检查对照，不与前抽屉结果自动捆绑。','补充外踝下方稳定结构方向。','距骨倾斜侧差、CFL邻近压痛与终末感。',S.ankle],
 ['AFM-0014','AF-SPT-003','联合区压痛或应力检查痛','下胫腓联合区压痛，外旋应力或挤压检查出现疼痛。','可结合扭伤机制、负重与稳定表现查看联合损伤范围，必要时医学或影像评估；单项不诊断。','结合联合区压痛与应力反应，区别普通外踝问题。','联合区位置、外旋/挤压反应与负重。',S.exam],
 ['AFM-0017','AF-SAF-001','突发后踝痛伴蹬地无力','突然后踝痛、弹响或蹬地明显无力，可伴轮廓变化。','可补跟腱连续性及小腿挤压试验，及时查看医学评估；保留跖屈动作不能单独排除断裂。','识别跟腱完整性需要独立评估的表现。','受伤经过、连续性、挤压试验与蹬地变化。',S.achilles],
 ['AFM-0018','AF-SAF-002','急性踝足外伤后骨点压痛或负重困难','急性踝足外伤后，踝骨点、舟骨或第五跖骨基底有压痛，或负重困难。','可结合Ottawa相关检查及外伤机制查看是否需要影像/医学评估，不用普通训练代替骨折排查。','外伤后先查看需要骨折评估的部位与负重表现。','骨点位置、受伤机制与负重能力。',S.exam],
 ['AFM-0061','LL-SPT-001','相近运动量后反复胀痛或麻木','在相近运动时间、距离或强度后反复出现胀痛、紧绷、麻木或短暂无力，停止后变化明显。','可补症状起止时间、运动后感觉/肌力及血管表现，查看运动诱发间室或神经血管专项评估；不靠一项诊断。','了解反复运动诱发表现的时间与神经血管变化。','诱发阈值、停止后变化及运动前后感觉/肌力。',S.compartment],
 ['AFM-0062','LL-SAF-001','胫骨局灶痛随负重或冲击加重','胫骨局灶骨面痛随负重、跑跳加重，或症状出现越来越早。','可补近期训练变化与骨健康背景，查看骨应力影像或医学评估；不直接安排骨面松解。','与邻近肌腹痛区分，查看骨应力评估需要。','骨面压痛范围、负重反应和近期运动变化。',S.bone],
 ['AFM-0063','CORE-SAF-ACS','急性进行性剧痛与紧张肿胀','急性创伤后剧痛进行性加重、紧张肿胀或被动牵伸显著加痛，可伴神经变化。','提示紧急医学评估；有脉搏或某项体征阴性不能自行排除急性间室问题。','识别急性疼痛与肿胀需要紧急评估的表现。','创伤、疼痛变化、牵伸及神经血管。',S.compartment],
 ['AFM-0064','CORE-SAF-VTE','无法解释的单侧疼痛肿胀或温热','单侧腿部疼痛伴肿胀、温热或变色，可能有制动、近期手术或既往血栓背景。','可查看静脉血栓医学评估；伴胸痛、呼吸困难、咯血或晕厥需紧急处理，不进入普通按摩。','识别单侧肿胀及血栓风险背景。','症状变化、近期制动/手术及胸部伴随表现。',S.dvt],
 ['AFM-0098','KNEE-SAF-001','急性肿胀、锁住或明显失稳','膝外伤后明显肿胀、活动真正锁住、反复明显失稳，或新出现远端神经变化。','可补损伤机制、积液、伸膝完整性及神经血管检查，查看独立医学/影像评估。','查看急性膝部结构与神经血管评估需要。','外伤、积液、锁住、失稳及远端变化。',S.knee],
 ['AFM-0108','THIGH-SAF-001','深部局灶痛随跑跳或负重加重','大腿深部局灶痛难以明确到肌腹，随跑跳或负重加重，或日常负重受限。','可补骨健康、近期训练变化及股骨骨应力医学/影像评估；普通肌肉抗阻或松解不能排除骨性问题。','把深部骨性表现与肌腹牵拉/发力痛分开。','深部痛位置、负重变化及骨健康背景。',S.bone],
];
for(const [map,item,name,text,note,why,focus,source]of checks){
 purpose(item,why,focus,source);id=feature(map,'ASSESS',name,text,note,source);assess(id,'专项检查或独立医学评估，已补公开目的、表现与后续方向。');
}

// Content-only entry fixes: make two formerly unreachable optional items discoverable.
spec.main_updates['05_RegionClinicalMap']=data.tables['05_RegionClinicalMap'].filter(r=>['RCM-0018','RCM-0024','RCM-0057','RCM-0177'].includes(r.map_id)).map(r=>({...r,display_mode:'EXPAND'}));
const upper={...data.clinical_extension.LocationGuide.find(r=>r.Area_ID==='LOC-LL-POSTUPPER')};
upper.Additional_Item_IDs+='|CORE-MUS-PLANTARIS';upper.Linked_Item_IDs=upper.Linked_Item_IDs.split('|').filter(id=>id!=='CORE-MUS-PLANTARIS').join('|');spec.locations.push(upper);
// Exact guides for the existing foot/thigh areas, without changing geometry.
const regionEntries=[
 ['AF-R-006','足跟底部','骨与局部组织：跟骨底；足跟垫\n软组织：足底筋膜近端','AF-LT-006|AF-LT-007|CORE-ROM-ANK-DF|CORE-MUS-GASTROC|CORE-MUS-SOLEUS','CORE-CAP-PF|AF-SPT-004|CORE-CAP-ARCH-TOE','疼在足跟中央还是内侧结节？','赤脚、硬地走路和休息后起步，哪种更明显？','有没有突然疼痛、撞击或近期跑跳增加？'],
 ['AF-R-007','内侧足弓','软组织：足底筋膜内侧带\n肌群：拇展肌；趾短屈肌；长屈趾肌邻近','AF-LT-007|AF-MUS-014|AF-MUS-016|CORE-CAP-ARCH-TOE|CORE-ROM-ANK-DF','CORE-MUS-FHL|CORE-MUS-FDL|AF-SPT-004','疼在足跟起点、足弓中段，还是肌腹附近？','起步、伸拇趾和持续站走时有什么区别？','最近鞋具、跑量或负重时间有没有变化？'],
 ['AF-R-008','舟骨与内侧中足','骨与关节：舟骨；内侧中足关节\n肌腱：胫骨后肌止点','AF-LT-008|CORE-MUS-TP|CORE-CAP-INV|CORE-CAP-PF|AF-JNT-003','AF-JNT-004|CORE-CAP-ARCH-TOE|AF-MUS-014','疼在舟骨骨面、内侧突起还是肌腱附近？','内翻发力、提踵与鞋具摩擦时有什么区别？','有没有外伤、长期突起或近期跑跳增加？'],
 ['AF-R-009','第五跖骨基底与外侧中足','骨与关节：第五跖骨基底；骰骨邻近\n肌腱：腓骨短肌止点；腓骨长肌邻近','AF-LT-009|CORE-MUS-PB|CORE-MUS-PL|CORE-ROM-ANK-INV|CORE-CAP-EV|AF-JNT-003','CORE-CAP-ARCH-TOE','疼在骨头上还是外侧肌腱附近？','脚往里翻、向外发力与负重时有什么区别？','是崴脚后出现，还是跑跳增加后逐渐疼？'],
 ['AF-R-010','足背中段','关节：跗跖及中足关节\n肌腱：胫骨前肌；拇长伸肌；趾长伸肌','AF-LT-010|CORE-MUS-EHL|CORE-MUS-EDL|CORE-CAP-DF|AF-JNT-003','CORE-MUS-TA|AF-JNT-004|AF-JNT-005','疼在关节缝、肌腱走行还是鞋带压住的位置？','伸趾、勾脚和蹬地时有什么区别？','有没有足部扭转、肿胀或足底瘀斑？'],
 ['AF-R-011','前足跖侧','局部组织：第2–5跖骨头；跖板\n肌群：趾短屈肌；拇收肌；长屈趾肌邻近','AF-LT-011|AF-JNT-005|AF-MUS-015|AF-MUS-016|CORE-CAP-ARCH-TOE','CORE-MUS-FDL|AF-JNT-004','疼集中在哪个趾根部？有没有像踩到小石子的感觉？','前足负重、提踵和鞋底软硬时有什么区别？','足趾有没有新出现上翘、偏移或贴地变化？'],
 ['AF-R-012','第一跖趾关节','骨与关节：第一MTP；籽骨\n软组织：跖板；拇短屈肌；拇长屈肌腱邻近','AF-ASM-004|AF-LT-012|AF-MUS-017|CORE-CAP-HF','AF-MUS-014|AF-MUS-015|CORE-MUS-FHL|AF-JNT-004|CORE-CAP-ARCH-TOE','疼在关节上方、两侧还是跖侧籽骨附近？','拇趾伸展、蹬地与鞋面压迫时有什么区别？','有没有拇趾被迫过伸、肿胀或瘀斑？'],
 ['THIGH-R-001','大腿前侧','肌群：股直肌；股外侧肌；股内侧肌；股中间肌邻近\n局部组织：前侧肌筋膜；股骨邻近','THIGH-LT-001|CORE-MUS-RF|CORE-MUS-VL|CORE-MUS-VM|KNEE-ROM-FLEX|CORE-CAP-KNEE-EXT','CORE-MUS-VI|KNEE-ROM-EXT','疼在肌腹、肌腱附近还是深部？','膝屈拉长、伸膝发力和跑跳时有什么区别？','是撞击、突然发力，还是训练后逐渐出现？'],
 ['THIGH-R-002','大腿后侧','肌群：股二头肌；半腱肌；半膜肌\n局部组织：后侧肌腱膜；坐骨近端邻近','THIGH-LT-002|CORE-MUS-BF|CORE-MUS-ST|CORE-MUS-SM|CORE-CAP-KNEE-FLEX|KNEE-ROM-EXT','KNEE-ROM-FLEX|CORE-SPT-NEURO-DISTAL','疼在后侧肌腹、近端还是膝后肌腱？','伸膝牵拉、屈膝发力和快跑时有什么区别？','有没有突然拉伤、瘀斑、取腱手术或放射麻木？'],
 ['THIGH-R-003','大腿内侧','肌群：内收长肌；内收短肌；内收大肌；股薄肌\n局部组织：内侧肌腱膜；股骨邻近','THIGH-LT-003|THIGH-MUS-AL|THIGH-MUS-AM|CORE-MUS-GRAC|THIGH-CAP-ADD','THIGH-MUS-AB|KNEE-ROM-EXT','疼在肌腹、近端深层还是膝内侧止点？','外展拉长、内收发力和侧向移动时有什么区别？','是突然跨步或变向后出现，还是逐渐疼？'],
 ['THIGH-R-004','大腿外侧','肌群：股外侧肌；阔筋膜张肌邻近\n局部组织：髂胫束周围筋膜；股骨邻近','THIGH-LT-004|THIGH-MUS-TFL|CORE-MUS-VL|KNEE-ROM-FLEX|CORE-CAP-KNEE-EXT','KNEE-ROM-EXT|CORE-SPT-NEURO-DISTAL','疼在近端肌腹、中段外侧还是膝外侧？','膝屈伸、跑步与侧向支撑时有什么区别？','有没有撞击、近期运动变化或外侧麻木？'],
];
function addQuestions(prefix,regions,module,qs){
 for(const [n,topic,prompt,purposeText,info,help]of qs){spec.guides.push({Guide_ID:`QG-${prefix}-${n}`,Scope:'REGION',Module_Codes:module,Region_IDs:regions,Area_IDs:null,Topic:topic,Core_Prompt:prompt,Optional_Probe:null,Question_Purpose:purposeText,Information_Gained:info,Assessment_Help:help,Display_Order:20+n});}
}
for(const [rid,name,tissues,primary,additional,q1,q2,q3]of regionEntries){
 const module=rid.startsWith('THIGH')?'THIGH':'ANKLE_FOOT';
 spec.locations.push({Area_ID:`LOC-${rid}`,Display_Name:name,Region_IDs:rid,Module_Codes:module,Related_Tissues:tissues,Primary_Item_IDs:primary,Additional_Item_IDs:additional,Linked_Item_IDs:(primary+'|'+additional).split('|').includes('CORE-SPT-NEURO-DISTAL')?null:'CORE-SPT-NEURO-DISTAL',Assessment_Groups:'MUSCLE_STATE:邻近肌群|ROM:关节活动|CAPACITY:相关肌力|LOCAL:局部组织|SPECIAL_TEST:补充检查|FUNCTION:相关动作观察',Review_Status:'待临床审核',Source_Reference:join(S.exam,(module==="ANKLE_FOOT"?join(S.anatomyFoot,S.anatomyArch,S.anatomyAnkle):rid==="THIGH-R-001"?S.anatomyQuad:rid==="THIGH-R-002"?S.anatomyHam:rid==="THIGH-R-003"?S.anatomyMedial:join(S.anatomyQuad,S.anatomyLateral))),Internal_Note:'现有区域的内容入口，不改变定位边界。主要清单供康复师查阅，不表示全部项目必做。'});
 addQuestions(rid,rid,module,[[1,'疼痛位置',q1,'分清同一区域的肌腹、肌腱、关节或骨面。','疼痛集中位置及范围。','对照相邻组织和局部检查。'],[2,'动作与承重',q2,'了解拉长、发力和负重时的差别。','具体诱发动作和出现时机。','分别查看活动度、相关肌力及动作表现。'],[3,'出现经过',q3,'了解外伤、运动变化或结构变化的背景。','突然或逐渐出现，以及肿胀、瘀斑等变化。','区分普通参考与需要进一步结构评估的内容。']]);
}
const kneeQs=[
 ['FRONT','KNEE-R-001|KNEE-R-002|KNEE-R-003|KNEE-R-004|KNEE-R-005','疼在髌骨周围、髌腱两侧还是胫骨结节？','蹲起、下台阶、跑跳和跪地时有什么区别？'],
 ['MEDIAL','KNEE-R-006|KNEE-R-007|KNEE-R-008','疼在内侧关节线、韧带走行还是关节线下方？','伸屈膝、内收或屈膝发力时有什么区别？'],
 ['LATERAL','KNEE-R-009|KNEE-R-010|KNEE-R-011|KNEE-R-012','疼在外侧关节线、腓骨头还是外侧肌腱附近？','屈膝发力、胫骨旋转和跑步时有什么区别？'],
 ['POST','KNEE-R-013|KNEE-R-014','疼在腘窝中央、后内侧肌腱还是后外侧肌腹？','伸膝牵拉、屈膝发力与提踵时有什么区别？'],
 ['DIFFUSE','KNEE-R-015','膝周哪一处最明显？位置是固定还是变化？','走路、屈伸和负重时哪些位置会不舒服？'],
];
for(const [name,regions,q1,q2]of kneeQs)addQuestions(`KNEE-${name}`,regions,'KNEE',[[1,'疼痛位置',q1,'区分邻近组织范围。','集中位置和移动范围。','安排局部组织与相邻肌群检查。'],[2,'动作反应',q2,'区分活动、发力和承重反应。','诱发动作及出现时机。','对照活动度、肌力和动作观察。'],[3,'外伤与变化','有没有扭转、撞击、突然肿胀、真正卡住或明显失稳？','了解结构性表现及外伤背景。','受伤机制、肿胀和活动阻挡。','补充稳定、完整性及需要独立评估的方向。']]);

// Public wording fixes. Keep the historic internal grouping explicitly internal.
const mainItems=new Map();
function mainItem(id,fields){mainItems.set(id,{...items.get(id),...fields});}
mainItem('AF-JNT-004',{display_name:'第一跖跗关节活动',check_focus:'第一跖骨基底与内侧楔骨之间的附属活动、终末感及关节线压痛。'});
mainItem('CORE-MUS-PLANTARIS',{check_focus:'小腿后侧深部及跟腱内侧疼痛范围，与腓肠肌、比目鱼肌及跟腱对照。'});
mainItem('THIGH-MUS-AB',{check_focus:'近端内侧深层牵拉与内收发力反应；与其他内收肌及邻近组织对照。'});
mainItem('CORE-SAF-VTE',{check_focus:'单侧疼痛、肿胀、温热或变色，结合制动、近期手术及既往血栓背景查看；胸痛、呼吸困难或晕厥需紧急医学评估。'});
mainItem('THIGH-SAF-001',{check_focus:'深部局灶痛、负重或跑跳加重、骨面压痛及近期训练变化。'});
// No exposed item check_focus may retain developer wording when no purpose overrides it.
spec.main_updates['02_ClinicalItem']=[...mainItems.values()];
spec.main_updates['08_AssessmentFindingMap']=[{...maps.get('AFM-0098'),trigger_condition:'外伤后明显肿胀、真正锁住、明显失稳或新发远端神经变化。'}];
spec.main_updates['07_ContextRule']=data.tables['07_ContextRule'].filter(r=>r.rule_type==='SAFETY').map(r=>{
 const check=checks.find(c=>c[1]===r.target);
 return {...r,...(r.rule_id==='KNEE-SAF-01'?{trigger:'膝外伤后明显肿胀、真正锁住、反复明显失稳，或新发/进行性远端神经功能变化。'}:{}),public_note:check?.[4]||r.public_note};
});

// Register all previously accepted risk/location dispositions with visible explanations.
for(const r of before.empty_features){
 if(spec.gap_dispositions[r.feature_id])continue;
 const old=previous.get(r.feature_id);
 if(!old)continue;
 if(old.Related_Location_Prompt){spec.gap_dispositions[r.feature_id]={category:'按疼痛位置继续查看',reason:'保持原有定位提示；下肢目标内容本批已补，不凭活动痛指定组织。'};continue;}
 if(old.Finding_Interpretation){spec.display_notes[r.feature_id]='提示';spec.gap_dispositions[r.feature_id]={category:'独立评估提示',reason:old.Finding_Interpretation};}
 else throw Error(`Unaddressed empty finding ${r.feature_id}`);
}
spec.retired_features=[...new Set(spec.retired_features)];spec.retired_references=[...new Set(spec.retired_references)];
for(const key of ['features','references','purposes','guides','locations']){
 const idField={features:'Feature_ID',references:'Reference_ID',purposes:'Item_ID',guides:'Guide_ID',locations:'Area_ID'}[key];
 if(new Set(spec[key].map(r=>r[idField])).size!==spec[key].length)throw Error(`duplicate ${key}`);
}
const {amendCompletionSpecification}=await import('./apply_clinical_remediation.mjs');
await amendCompletionSpecification(spec,data);
await fs.writeFile('knowledge/review/lower_limb_completion_v1.json',JSON.stringify(spec,null,2));
console.log(JSON.stringify(Object.fromEntries(['features','references','purposes','guides','locations','retired_features','retired_references'].map(k=>[k,spec[k].length]))));
