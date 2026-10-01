import fs from 'node:fs/promises';
const batch=Number(process.argv.find(x=>x.startsWith('--batch='))?.split('=')[1]||2);
const d=JSON.parse(await fs.readFile('build/knowledge/runtime.json','utf8'));
const e=d.clinical_extension;
const spec={batch,approved_on:'2026-10-01',issue_ids:[],main:{},extension:{}};
const put=(sheet,id,fields,main=false)=>Object.assign((spec[main?'main':'extension'][sheet]??={})[id]??={},fields);
const add=(sheet,id,fields,main=false)=>put(sheet,id,{...Object.fromEntries(Object.keys((main?d.tables:e)[sheet][0]).map(k=>[k,null])),...fields},main);
const join=(...xs)=>[...new Set(xs.flatMap(x=>(x||'').split('\n')).filter(Boolean))].join('\n');
const A={quad:'https://www.ncbi.nlm.nih.gov/books/NBK513334/',ham:'https://www.ncbi.nlm.nih.gov/books/NBK542215/',medial:'https://www.ncbi.nlm.nih.gov/books/NBK534775/',hipflex:'https://www.ncbi.nlm.nih.gov/books/NBK531508/',lateral:'https://www.ncbi.nlm.nih.gov/books/NBK499870/',foot:'https://www.ncbi.nlm.nih.gov/books/NBK539705/',ankle:'https://www.ncbi.nlm.nih.gov/books/NBK545158/',arch:'https://www.ncbi.nlm.nih.gov/books/NBK587361/',anterior:'https://www.ncbi.nlm.nih.gov/books/NBK539725/'};
const S={stretch:'https://www.worcsacute.nhs.uk/leaflets/stretching-exercises-physiotherapy/',hipstretch:'https://roh.nhs.uk/services-information/therapy/exercises-for-osteoarthritis-of-the-hip',adductor:'https://www.ouh.nhs.uk/media/ggzlylpj/73885padductor.pdf',hamiso:'https://www.ouh.nhs.uk/patient-guide/leaflets/files/76406Pacl.pdf',hamguideline:'https://doi.org/10.2519/jospt.2022.0301',pfp:'https://doi.org/10.1136/bjsports-2024-108110',knee:'https://doi.org/10.2519/jospt.2018.0301',oa:'https://www.nice.org.uk/guidance/ng226/chapter/recommendations',ruh:'https://www.ruh.nhs.uk/patients/services/physiotherapy/OP_outpatient_service.asp',curl:'https://www.youtube.com/watch?v=9QaAZGzRNAQ',bridge:'https://www.youtube.com/watch?v=3kQfcIUXI28',abduction:'https://www.youtube.com/watch?v=-3wpGzwc3Io',rdl:'https://www.youtube.com/watch?v=7RWkEhJ4VlQ'};
const anatomyByItem={
 'CORE-MUS-RF':A.quad,'CORE-MUS-VL':A.quad,'CORE-MUS-VM':A.quad,'CORE-MUS-VI':A.quad,
 'CORE-MUS-BF':A.ham,'CORE-MUS-ST':A.ham,'CORE-MUS-SM':A.ham,
 'CORE-MUS-SART':A.medial,'CORE-MUS-GRAC':A.medial,'KNEE-MUS-ADD':A.medial,
 'KNEE-MUS-HIPFLEX':A.hipflex,'KNEE-MUS-LAT-CHAIN':A.lateral,
};
const anatomyByMap=Object.fromEntries(d.tables['08_AssessmentFindingMap'].filter(r=>anatomyByItem[r.clinical_item_id]).map(r=>[r.map_id,anatomyByItem[r.clinical_item_id]]));
const R={RF:'local-records://LR-a27906e6eaef#L17',VL:'local-records://LR-a27906e6eaef#L52',VM:'local-records://LR-e25569fa2a1a#L43',BF:'local-records://LR-b35efaa9dc7a#L15',ST:'local-records://LR-5720cfa367b7#L10',SM:'local-records://LR-5720cfa367b7#L29',TFL:'local-records://LR-a27906e6eaef#L5',HIP:'local-records://LR-da72e553ca07#L33',ADD:'local-records://LR-a72ff97740b2#L8',SART:'local-records://LR-5720cfa367b7#L8',GRAC:'local-records://LR-6cfab1d6f7d2#L58',PAT:'local-records://LR-14771cf95bce#L53'};
const recordsByMap={'AFM-0065':R.RF,'AFM-0066':R.VL,'AFM-0067':R.VM,'AFM-0069':R.BF,'AFM-0070':R.ST,'AFM-0071':R.SM,'AFM-0075':R.TFL,'AFM-0068':R.RF,'AFM-0077':R.HIP,'AFM-0074':R.ADD,'AFM-0072':R.SART,'AFM-0073':R.GRAC};
const B={knee:'book://magee-local#pdf=751,756&print=742,747',historyKnee:'book://magee-local#pdf=739&print=730',ankle:'book://magee-local#pdf=882,889&print=873,880',historyFoot:'book://magee-local#pdf=857&print=848',kinKnee:'book://essentials-kinesiology-3-local#pdf=306,308&print=288,290'};
if(batch===2){
 spec.issue_ids=['CLIN-03','CLIN-04','CLIN-11','CLIN-16'];
 // Correct evidence attribution, including dependent assessment text that used the same disease guideline.
 for(const ref of e.InterventionReference.filter(r=>r.Source_URL?.includes('2019.0302')&&!r.Source_Note)){
  const map=ref.Feature_ID.slice(0,8),baseline=`baseline://database-v3.8/InterventionReference/${ref.Reference_ID}`;
  if(recordsByMap[map]){
   const exercise=/拉伸|活动/.test(ref.Treatment_Method);
   const stretchSource=['AFM-0074','AFM-0073'].includes(map)?S.adductor:map==='AFM-0077'?S.hipstretch:S.stretch;
   put('InterventionReference',ref.Reference_ID,{Source_URL:join(baseline,/松解/.test(ref.Treatment_Method)?recordsByMap[map]:null,exercise?stretchSource:null),Source_Note:'手法来源为授权记录中的对应肌腹或肌群经验；练习资料只支持具名动作，不证明本发现的单项疗效。股中间肌采用前大腿区域方法。MET及未在记录中逐项出现的方法保留原库经验归属，不再用髌股指南为其背书。缝匠肌、股薄肌及腘绳肌牵伸按相关肌群理解，不声称单肌隔离。'});
  }else{
   put('InterventionReference',ref.Reference_ID,{Source_URL:join(baseline,ref.Feature_ID.startsWith('AFM-0091')?S.hamguideline:S.pfp),Source_Note:ref.Feature_ID==='AFM-0096-CAPACITY'?'历史任务条目，当前普通路线不展示。原库任务方法保留；2024最佳实践仅适用于髌股疼痛的运动及支持干预，不构成全部任务模式的病因或纠正依据。':'具名抗阻方法保留原库出处。髌股疼痛最佳实践的髋膝运动建议限于该人群；腘绳肌指南限于相应损伤背景。侧差或疼痛受限不能直接推出薄弱或自动安排训练。'});
  }
 }
 for(const row of e.ClinicalPurpose.filter(r=>r.Source_URL?.includes('2019.0302')&&anatomyByItem[r.Item_ID]))put('ClinicalPurpose',row.Item_ID,{Source_URL:join(`baseline://database-v3.8/ClinicalPurpose/${row.Item_ID}`,anatomyByItem[row.Item_ID])});
 for(const row of e.FindingFeature.filter(r=>r.Source_URL?.includes('2019.0302')&&anatomyByMap[r.Assessment_Map_ID]))put('FindingFeature',row.Feature_ID,{Source_URL:join(`baseline://database-v3.8/08_AssessmentFindingMap/${row.Assessment_Map_ID}`,anatomyByMap[row.Assessment_Map_ID])});
 // Anterior leg anatomy remains valid only for the anterior leg. Other anatomy citations are scoped.
 const replacement={
  'THIGH-LT-004':A.lateral,'THIGH-MUS-AL':A.medial,'THIGH-MUS-AB':A.medial,'THIGH-MUS-AM':A.medial,
  'AFM-0075-SENSITIVITY':A.lateral,'AFM-0077-SENSITIVITY':A.hipflex,'AFM-0072-SENSITIVITY':A.medial,'AFM-0089-SCREEN':A.hipflex,
  'AFM-0102-TENSION':join(A.quad,A.lateral),'AFM-0102-PAIN':join(A.quad,A.lateral),'AFM-0106-PAIN':A.lateral,
  'AFM-0103-LENGTH':A.medial,'AFM-0104-LENGTH':A.medial,'AFM-0105-LENGTH':A.medial,'AFM-0081-FIBULAR-TENDON':A.ham,
  'AFM-0027-HALLUX':A.ankle,'AFM-0027-LESSER_TOES':A.ankle,
 };
 for(const sheet of ['ClinicalPurpose','FindingFeature'])for(const row of e[sheet]){
  const id=row.Item_ID||row.Feature_ID;
  if(replacement[id]&&row.Source_URL?.includes(A.anterior))put(sheet,id,{Source_URL:row.Source_URL.replace(A.anterior,replacement[id])});
 }
 for(const row of e.LocationGuide.filter(r=>r.Area_ID.startsWith('LOC-AF-R-')||r.Area_ID.startsWith('LOC-THIGH-R-'))){
  const src=row.Area_ID.startsWith('LOC-AF')?join(A.foot,A.arch,A.ankle):row.Area_ID==='LOC-THIGH-R-002'?A.ham:row.Area_ID==='LOC-THIGH-R-003'?A.medial:row.Area_ID==='LOC-THIGH-R-004'?join(A.quad,A.lateral):A.quad;
  put('LocationGuide',row.Area_ID,{Source_Reference:row.Source_Reference.replace(A.anterior,src)});
 }
 put('InterventionReference','AFM-0077-SENSITIVITY-STRETCH',{Source_URL:S.hipstretch,Source_Note:'官方机构资料列髋屈肌群牵伸方法；原页疾病为髋骨关节炎，仅引用动作名称，不外推为所有髋前痛的疗效证据。疼痛与长度限制分别查看。'});
 // Name the actual NHS exercises and preserve the distinction between exercise source and clinical linkage.
 for(const row of e.InterventionReference.filter(r=>r.Source_URL?.includes('OP_outpatient_service.asp'))){
  const methods=row.Treatment_Method;
  const specifics=[];
  if(/屈膝等长|等长抗阻/.test(methods))specifics.push(S.hamiso);
  if(/站立屈膝|屈膝抗阻/.test(methods))specifics.push(S.curl);
  if(/桥式/.test(methods))specifics.push(S.bridge);
  if(/髋外展/.test(methods))specifics.push(S.abduction);
  if(/拉伸/.test(methods))specifics.push(S.stretch);
  put('InterventionReference',row.Reference_ID,{Source_URL:join(row.Source_URL.replace(S.ruh,''),S.ruh,...specifics),Source_Note:join(row.Source_Note,'RUH索引及其具体视频用于核对站立屈膝、桥式、侧卧髋外展的名称，未据视频推断此处组织关系。屈膝等长参照牛津ACL资料中的静态腘绳肌动作，拉伸参照官方牵伸资料；仅引用动作名称，不导入术后时间表，不认为疼痛就需要牵伸。')});
 }
 for(const id of ['AFM-0085-LIMIT-1','AFM-0086-LIMIT-1','AFM-0088-LIMIT-1','AFM-0080-JOINT-LIMIT-ROM','AFM-0081-JOINT-LIMIT-ROM']){
  const row=e.InterventionReference.find(r=>r.Reference_ID===id);
  put('InterventionReference',id,{Source_URL:join(`baseline://database-v3.8/InterventionReference/${id}`,S.knee,S.oa,id==='AFM-0086-LIMIT-1'?R.PAT:null,id==='AFM-0086-LIMIT-1'?'https://pubmed.ncbi.nlm.nih.gov/30420367/':null,id==='AFM-0085-LIMIT-1'||id==='AFM-0088-LIMIT-1'?'https://pubmed.ncbi.nlm.nih.gov/33910850/':null),Source_Note:'2018指南用于半月板/软骨活动恢复范围，已核验全文，没有把它当作每种方向性松动的依据。NICE NG226仅在髋膝骨关节炎、结合运动时考虑手法，证据不支持其单独应用。具名手法保留原库参考；髌骨松动另有授权记录及膝OA联合研究，屈伸方向有膝OA小样本联合干预研究。不同病种、术后限制、骨性阻挡及真正卡锁不能外推，胫骨旋转未据屈伸研究宣称独立疗效。'});
 }
}
else if(batch===3){
 spec.issue_ids=['CLIN-05','CLIN-06','CLIN-07','CLIN-08','CLIN-09'];
 spec.gap_dispositions={'AFM-0124-INTEGRITY':{category:'独立评估提示',reason:'外伤后主动伸膝困难或腱走行缺损，补充完整性与医学评估，不作为慢性肌腱训练入口。'},'AFM-0124-TENDON':{category:'已补具名参考',reason:'股四头肌腱承载相关的具名伸膝抗阻方法，来源限定于肌腱病背景。'}};
 const tendon='https://pubmed.ncbi.nlm.nih.gov/35703747/',tear='https://www.orthoinfo.org/diseases--conditions/quadriceps-tendon-tear/';
 add('02_ClinicalItem','KNEE-LT-SUPRAPAT',{item_id:'KNEE-LT-SUPRAPAT',item_type:'LOCAL_TISSUE',display_name:'髌骨上缘/股四头肌腱',check_focus:'股四头肌腱走行与髌骨上缘压痛、伸膝发力反应；有外伤时查看主动伸膝与肌腱完整性。',allowed_finding_types:'LOCAL_TISSUE',status:'Stable',source_asset:'Clinical remediation CLIN-05'},true);
 add('08_AssessmentFindingMap','AFM-0124',{map_id:'AFM-0124',clinical_item_id:'KNEE-LT-SUPRAPAT',finding_id:'CORE-FND-LOCAL',trigger_condition:'疼痛集中在髌骨上缘或股四头肌腱走行；伸膝发力或触诊时出现相关反应。',status:'Stable',source_asset:'Clinical remediation CLIN-05'},true);
 put('05_RegionClinicalMap','RCM-0375',{clinical_item_id:'KNEE-LT-SUPRAPAT'},true);
 put('05_RegionClinicalMap','RCM-0387',{clinical_item_id:'KNEE-LT-INFRAPAT'},true);
 for(const [rid,id]of [['KNEE-R-001','RCM-0536'],['KNEE-R-005','RCM-0537']])add('05_RegionClinicalMap',id,{map_id:id,region_id:rid,clinical_item_id:'KNEE-LT-PATELLA',direction_type:'局部组织',priority:'Secondary',condition:'Secondary review',status:'Stable',source_asset:'Clinical remediation CLIN-05',relation_nature:'邻近髌周组织',assessment_dimension:'LOCAL',assessment_group:'膝前侧局部组织',display_order:5002,display_mode:'EXPAND'},true);
 add('ClinicalPurpose','KNEE-LT-SUPRAPAT',{Item_ID:'KNEE-LT-SUPRAPAT',Item_Name:'髌骨上缘/股四头肌腱',Clinical_Purpose:'股四头肌腱连接股四头肌与髌骨上缘；此处不适可结合伸膝承载及外伤经过查看。',Assessment_Focus:'肌腱走行压痛、伸膝发力反应、外伤后的主动伸膝与完整性。',Module:'KNEE',Source_URL:join(tendon,tear),Review_Status:'待临床审核'});
 add('FindingFeature','AFM-0124-TENDON',{Feature_ID:'AFM-0124-TENDON',Assessment_Map_ID:'AFM-0124',Finding_Name:'股四头肌腱承载相关不适',Finding_Feature:'疼痛集中于髌骨上缘或股四头肌腱走行，伸膝抗阻、跳跃或落地时出现。',Finding_Interpretation:'训练方法供肌腱承载问题参考，不由压痛直接确定肌腱病；与急性撕裂及关节内反应分开。',Source_URL:tendon,Review_Status:'待临床审核'});
 add('FindingFeature','AFM-0124-INTEGRITY',{Feature_ID:'AFM-0124-INTEGRITY',Assessment_Map_ID:'AFM-0124',Finding_Name:'外伤后主动伸膝困难或腱走行缺损',Finding_Feature:'外伤后突然难以主动伸膝，或髌骨上方出现明显凹陷，伴肿胀、瘀斑。',Finding_Interpretation:'外伤后的伸膝困难需与慢性承载不适分开，可补股四头肌腱完整性及医学评估。',Source_URL:tear,Review_Status:'待临床审核'});
 add('InterventionReference','AFM-0124-TENDON-RESISTANCE',{Reference_ID:'AFM-0124-TENDON-RESISTANCE',Feature_ID:'AFM-0124-TENDON',Treatment_Goal:'股四头肌腱承载训练',Treatment_Method:'伸膝慢速抗阻训练；伸膝离心抗阻训练',Source_URL:tendon,Source_Note:'2022膝伸装置肌腱病综述明确包括股四头肌腱，并列离心或重慢速抗阻。这里只列方法名称，不移植髌腱研究的剂量或阶段，不用于急性腱撕裂，也不以局部压痛决定训练。',Review_Status:'待临床审核'});
 const muscleRows=[
 ['CORE-MUS-SM','半膜肌属于膝后内侧腘绳肌；可查看该区域随髋屈、膝伸的牵拉表现。','后内侧腘绳肌牵拉范围、局部反应与侧差；组合动作不隔离半膜肌。','AFM-0071-TENSION','后内侧腘绳肌牵拉受限或张力变化','髋屈结合膝伸时，后内侧腘绳肌区域牵拉受限或张力与对侧不同；不代表单独定位半膜肌。'],
 ['CORE-MUS-VI','股中间肌位于股四头肌深层；屈膝牵拉或伸膝发力时，可查看大腿前侧相关表现。','前侧股四头肌群屈膝牵拉与伸膝发力反应；不以表面触诊确定股中间肌。','AFM-0068-LENGTH','前侧股四头肌群牵拉受限','屈膝时前侧股四头肌群牵拉范围或局部反应与对侧不同；该动作不能单独评估股中间肌。'],
 ['CORE-MUS-SART','缝匠肌跨髋、膝并参与鹅足区；可将内侧肌群牵拉与鹅足区不适对照。','髋膝组合牵拉、相关肌群局部反应与鹅足区位置；不按一个动作隔离缝匠肌。','AFM-0072-LENGTH','内侧肌群组合牵拉受限','髋伸、内收结合膝伸时，内侧肌群牵拉范围或局部反应与对侧不同；不等同缝匠肌独立长度测试。'],
 ['CORE-MUS-GRAC','股薄肌跨髋、膝并参与鹅足区；可查看髋外展与膝伸组合时的内侧牵拉。','髋外展结合膝伸的内侧肌群牵拉、局部反应与侧差。','AFM-0073-LENGTH','内侧肌群牵拉受限','髋外展结合膝伸时，内侧肌群牵拉范围减少或局部反应与对侧不同；其他内收肌、腘绳肌也可能参与。'],
 ];
 for(const [item,why,focus,id,name,text]of muscleRows){put('ClinicalPurpose',item,{Clinical_Purpose:why,Assessment_Focus:focus,Source_URL:join(e.ClinicalPurpose.find(r=>r.Item_ID===item).Source_URL,B.knee)});put('FindingFeature',id,{Finding_Name:name,Finding_Feature:text,Source_URL:join(e.FindingFeature.find(r=>r.Feature_ID===id).Source_URL,B.knee)});put('02_ClinicalItem',item,{check_focus:focus},true);}
 put('InterventionReference','AFM-0066-TENSION-2',{Treatment_Method:'股四头肌拉伸'});
 for(const [n,action]of [['0090','膝伸'],['0091','膝屈'],['0092','髋外展/外旋'],['0093','髋伸'],['0005','足踝外翻'],['0006','足踝内翻'],['0007','踝背屈'],['0009','拇趾屈曲']]){
  const id=`AFM-${n}-CAPACITY`,isKnee=Number(n)>80;
  put('FindingFeature',id,{Finding_Name:`${action}输出下降或受疼痛限制`,Finding_Feature:`相同测试条件下，${action}抗阻输出与对侧或既往不同，或发力受疼痛限制；分别查看输出和疼痛反应，并对照目标活动需求。`,Source_URL:join(e.FindingFeature.find(r=>r.Feature_ID===id).Source_URL,isKnee?B.knee:B.ankle)});
 }
 put('FindingFeature','AFM-0004-CAPACITY',{Finding_Name:'跖屈输出下降或提踵完成差异',Finding_Feature:'分别比较跖屈抗阻输出、提踵高度和完成质量；可伴疼痛限制。侧差与目标活动所需能力分别查看。',Source_URL:join(e.FindingFeature.find(r=>r.Feature_ID==='AFM-0004-CAPACITY').Source_URL,B.ankle)});
 put('InterventionReference','AFM-0075-TENSION-2',{Treatment_Method:'侧卧髋外展主动活动',Source_URL:join('baseline://database-v3.8/InterventionReference/AFM-0075-TENSION-2',S.ruh,S.abduction),Source_Note:'原库“髋外侧主动活动”具体化为官方机构列出的侧卧髋外展；用于相关区域主动活动参考，不声称独立牵伸阔筋膜张肌或治疗所有髋外侧痛。不是从线下记录还原出该动作。'});
 put('InterventionReference','AFM-0005-CAPACITY-RECORD-2',{Treatment_Method:'单腿支撑训练；单腿下蹲训练',Source_Note:'授权记录同一段包含单腿站与单腿下蹲，作为区域任务参考；不说明外翻肌力下降就需做这些动作，也不据此确定疼痛来源。'});
 put('InterventionReference','AFM-0006-CAPACITY-MEDIAL-1',{Treatment_Method:'足踝内翻等长抗阻训练；弹力带足踝内翻训练',Source_Note:'原库内翻抗阻细化为等长与弹力带形式；官方资料中胫骨后肌腱背景不外推到所有内翻输出侧差，侧差、疼痛与运动需求分开查看。'});
 put('InterventionReference','AFM-0009-CAPACITY-MEDIAL-1',{Treatment_Method:'拇趾屈曲等长抗阻训练；拇趾屈曲动态抗阻训练',Source_Note:'原库拇趾屈曲募集与抗阻具体化为同一动作的等长/动态形式，保留原库经验归属；不是独立拇长屈肌测试或单肌训练。'});
 // Each question gets a short, location-specific purpose, information and assessment direction.
 const q={
 'AF-R-006':[
 ['区分足跟垫中央与筋膜附着处的疼痛范围。','足跟中央、内侧结节及周围的具体位置。','可分别查看足跟垫、足底筋膜附着处及邻近骨面。'],
 ['了解接触受压与休息后起步的反应差别。','赤脚、硬地和起步时的疼痛变化。','可对照足跟垫受压、筋膜牵拉与步行负重表现。'],
 ['了解足跟疼痛的外伤或重复负重背景。','突然起病、撞击经过及近期跑跳变化。','为足跟软组织与跟骨骨面评估补充背景。']],
 'AF-R-007':[
 ['区分筋膜起点、足弓中段与邻近肌腹。','疼痛集中位置及沿足弓的范围。','可分别查看筋膜走行、足底肌群与局部骨面。'],
 ['比较起步、筋膜牵拉和持续承重的反应。','起步、伸拇趾及站走时的差别。','可对照足底筋膜牵拉、足趾活动与足弓承重表现。'],
 ['了解足底近期承重条件的变化。','鞋具、跑量与负重时间的改变。','为鞋具接触、足弓承重和相关动作观察提供背景。']],
 'AF-R-008':[
 ['区分舟骨骨面、内侧突起与胫骨后肌腱附近。','舟骨邻近的具体疼痛位置。','可分别查看骨面、局部接触与胫骨后肌腱走行。'],
 ['比较肌腱发力承载与鞋具接触的反应。','内翻、提踵和摩擦时的症状差别。','可对照胫骨后肌相关抗阻、提踵及突起处受压。'],
 ['了解骨面疼痛、既有突起和近期负重背景。','外伤经过、突起是否长期存在及跑跳变化。','为舟骨骨面、附属舟骨邻近组织和肌腱评估提供背景。']],
 'AF-R-009':[
 ['区分第五跖骨骨面与腓骨肌腱附近。','骨面和外侧肌腱走行的集中疼痛位置。','可分别查看第五跖骨、腓骨肌腱及周围组织。'],
 ['比较外侧组织牵拉、发力与负重的反应。','内翻、外翻抗阻及负重时的差别。','可对照腓骨肌腱相关动作与第五跖骨骨面反应。'],
 ['了解外侧足痛的急性扭伤或重复负重背景。','崴脚经过、跑跳变化及起病方式。','为外侧骨面、肌腱及扭伤相关结构评估提供背景。']],
 'AF-R-010':[
 ['区分中足关节线、伸肌腱和鞋带接触区。','关节缝、肌腱走行或受压位置。','可分别查看中足关节、足背伸肌腱及局部接触。'],
 ['比较伸肌发力与蹬地承重的反应。','伸趾、背屈和蹬地时的疼痛差别。','可对照伸肌相关抗阻、中足活动与负重表现。'],
 ['了解中足外伤及稳定结构评估背景。','足部扭转、肿胀和足底瘀斑经过。','可补跗跖稳定结构、骨面与医学评估方向。']],
 'AF-R-011':[
 ['明确前足跖侧疼痛所在趾根。','对应趾根位置及踩石感范围。','可分别查看跖骨头、跖板邻近组织及趾间区域。'],
 ['了解跖骨头承重与鞋底接触的差别。','前足负重、提踵及鞋底软硬时的反应。','可对照前足压力位置、跖趾活动及支撑表现。'],
 ['了解足趾支撑位置是否近期改变。','新出现的上翘、偏移与贴地变化。','可补跖趾稳定、跖板邻近组织与足趾支撑观察。']],
 'AF-R-012':[
 ['区分拇趾关节周围与跖侧籽骨区域。','关节上方、两侧及籽骨附近的疼痛位置。','可分别查看第一跖趾关节、关节囊与籽骨邻近组织。'],
 ['比较拇趾伸展、蹬地与鞋面接触。','上述动作或接触时的症状差别。','可对照第一跖趾活动、前足承载与局部受压。'],
 ['了解拇趾过伸外伤的经过。','过伸方向、肿胀及瘀斑变化。','可补第一跖趾跖侧稳定结构与骨面评估。']],
 'THIGH-R-001':[
 ['区分大腿前侧肌腹、肌腱与深部区域。','疼痛集中位置、深浅与范围。','可分别查看股四头肌群、腱走行及股骨邻近反应。'],
 ['比较股四头肌牵拉、发力与跑跳承载。','屈膝、伸膝抗阻和跑跳时的差别。','可对照肌群牵拉、膝伸输出与相关动作。'],
 ['了解挫伤、突然发力和训练后疼痛背景。','撞击、发力经过与出现时间。','为肌腹、肌腱及外伤完整性评估提供背景。']],
 'THIGH-R-002':[
 ['区分后大腿肌腹、近端和远端肌腱。','疼痛沿后大腿的位置与范围。','可分别查看腘绳肌肌腹、坐骨附近与膝后肌腱。'],
 ['比较腘绳肌牵拉、膝屈发力与快跑需求。','伸膝牵拉、抗阻和快跑时的反应。','可对照髋膝组合牵拉、膝屈/髋伸输出及跑步动作。'],
 ['了解急性拉伤、手术与放射症状背景。','拉伤、瘀斑、取腱手术及麻木放射范围。','可补组织完整性、术后范围与神经相关评估。']],
 'THIGH-R-003':[
 ['区分内侧肌腹、近端深部与膝内侧止点。','内侧疼痛的近远端位置与范围。','可分别查看内收肌群、近端腱区与鹅足附近。'],
 ['比较内收肌群牵拉、发力及侧向承重。','外展、内收抗阻与侧向动作的反应。','可对照内侧肌群牵拉、内收输出与侧向动作。'],
 ['了解跨步、变向或逐渐起病的经过。','动作方向、出现时机及训练背景。','为内收肌群、肌腱与相关动作评估提供背景。']],
 'THIGH-R-004':[
 ['区分近端肌腹、外侧中段和膝外侧。','大腿外侧具体位置与延伸范围。','可分别查看阔筋膜张肌、外侧股四头肌与髂胫束邻近组织。'],
 ['比较膝屈伸、跑步及侧向支撑的反应。','各动作下出现的部位和时机。','可对照外侧肌群发力、膝活动与髋膝支撑动作。'],
 ['了解外伤、运动变化及感觉症状。','撞击经过、训练变化和外侧麻木范围。','可补局部软组织、骨面与神经相关评估。']],
 'KNEE-FRONT':[
 ['区分髌周、上下缘肌腱与胫骨结节。','膝前疼痛的集中位置及范围。','可分别查看髌股负重反应、股四头肌腱、髌腱和胫骨结节。'],
 ['比较负重屈膝、跑跳与跪地受压。','各动作下的疼痛位置和出现时机。','可对照髌周承重、肌腱发力及局部接触。'],
 ['了解膝前外伤和伸膝装置评估背景。','扭转、撞击、肿胀时机、卡锁及失稳经过。','可补关节内结构、稳定性与伸膝装置完整性评估。']],
 'KNEE-MEDIAL':[
 ['区分内侧关节线、韧带、鹅足及后内侧肌腱。','内侧疼痛的关节线与关节外位置。','可分别查看内侧关节、内侧副韧带、鹅足与腘绳肌远端。'],
 ['比较关节活动、内收和膝屈发力。','屈伸、内收抗阻及屈膝抗阻时的差别。','可对照内侧关节活动、内收肌与鹅足/腘绳肌发力反应。'],
 ['了解内侧膝痛的扭转和撞击经过。','受伤方向、肿胀时机、卡锁及失稳表现。','可补内侧稳定结构与半月板相关评估。']],
 'KNEE-LATERAL':[
 ['区分外侧关节线、腓骨头与外侧肌腱。','外侧疼痛的集中位置和范围。','可分别查看外侧关节、近端胫腓关节与股二头肌远端。'],
 ['比较膝屈发力、旋转与跑步反应。','屈膝抗阻、胫骨旋转及跑步时的差别。','可对照外侧肌腱、旋转活动与跑步中的症状位置。'],
 ['了解外侧膝痛的受伤机制与变化。','扭转或撞击方向、肿胀、卡锁及失稳经过。','可补外侧稳定结构、半月板与腓骨头相关评估。']],
 'KNEE-POST':[
 ['区分腘窝中央与后内外侧肌腱/肌腹。','膝后疼痛的具体位置及范围。','可分别查看腘窝组织、腘绳肌远端与腓肠肌近端。'],
 ['比较后侧牵拉、膝屈发力与跖屈承载。','伸膝牵拉、膝屈抗阻及提踵时的反应。','可对照腘绳肌、腓肠肌与膝后关节活动。'],
 ['了解膝后外伤、肿胀与活动阻挡。','扭转、撞击、肿胀时机、卡锁和失稳经过。','可补膝后稳定结构、关节内反应及腘窝局部评估。']],
 'KNEE-DIFFUSE':[
 ['明确膝周当前最明显的症状范围。','固定或变化的位置、集中点与扩散范围。','为局部组织查看提供位置，可对照不同区域。'],
 ['了解各动作下疼痛出现的位置。','步行、屈伸和负重时的位置与时机。','可对照关节活动、肌肉输出与相关动作中的症状分布。'],
 ['了解膝周症状的外伤与关节变化背景。','扭转、撞击、肿胀、卡锁及失稳经过。','可补关节积液、完整性和稳定性评估方向。']],
 };
 for(const [key,rows]of Object.entries(q))for(let i=0;i<rows.length;i++){
  const id=`QG-${key}-${i+1}`,row=e.ConsultationGuide.find(r=>r.Guide_ID===id);if(!row)throw Error(id);
  const [Question_Purpose,Information_Gained,Assessment_Help]=rows[i];
  put('ConsultationGuide',id,{Question_Purpose,Information_Gained,Assessment_Help,Source_Reference:join(`baseline://clinical-extension/ConsultationGuide/${id}`,key.startsWith('AF')?B.historyFoot:key.startsWith('KNEE')?B.historyKnee:B.knee),Internal_Note:'产品编辑按本问题及区域解剖整理用途，教材支持问诊与检查框架，不是教材原文或经验证的分诊规则。仅展示问诊思路，不录入回答，不自动确定组织、诊断或训练。'});
 }
 put('ConsultationGuide','QG-KNEE-FRONT-1',{Core_Prompt:'疼在髌骨周围、髌骨上下缘肌腱，还是胫骨结节？'});
}
else if(batch===4){
 spec.issue_ids=['CLIN-12','CLIN-13','CLIN-14','CLIN-17'];
 const flexor='https://pmc.ncbi.nlm.nih.gov/articles/PMC8159326/';
 for(const id of ['AFM-0048-LENGTH-MUSCLE','AFM-0047-LENGTH-MUSCLE','AFM-0027-HALLUX-MANUAL','AFM-0027-LESSER_TOES-MANUAL']){
  put('InterventionReference',id,{Treatment_Goal:'伴内踝后方屈趾肌腱不适',Treatment_Method:'内踝后方屈趾肌腱周围软组织手法',Source_URL:join(flexor,'https://assets.cureus.com/uploads/case_report/pdf/53750/20210527-28810-1j23d2f.pdf'),Source_Note:'已核对2021单病例正文及表1（PDF第4–5页）：处理对象为小腿远端、内踝后方FHL/FDL肌腱邻近组织，正文存在支持带名称表述差异，因此不复制其精确操作位置。不能支持两种独立肌腹常规松解或单项疗效。多方法病例曾即时增加疼痛，保留为伴该处不适的病例方法参考，不用于全部屈趾牵拉受限或疼痛；不复制深压、步骤、剂量、器械及不明神经症状操作。无授权记录中的FHL/FDL具名肌腹处理，不冒充线下来源。'});
 }
 for(const id of ['AFM-0047-LENGTH','AFM-0048-LENGTH']){
  const row=e.FindingFeature.find(r=>r.Feature_ID===id);
  put('FindingFeature',id,{Finding_Interpretation:row.Finding_Interpretation+' 腱周手法仅供伴内踝后方屈趾肌腱不适时查看，与小腿肌腹处理分开。'});
 }
 const intrinsic='https://pmc.ncbi.nlm.nih.gov/articles/PMC5094843/';
 for(const id of ['AFM-0050-TENSION-ACTIVE','AFM-0051-TENSION-ACTIVE','AFM-0052-TENSION-ACTIVE','AFM-0053-STATE-ACTIVE','AFM-0008-CONTROL-CONTROL','AFM-0022-EXCESS-CONTROL']){
  const row=e.InterventionReference.find(r=>r.Reference_ID===id);
  put('InterventionReference',id,{Treatment_Goal:id.includes('EXCESS')?'内侧前足支撑与足趾控制':'足趾活动与组合控制',Source_Note:join(row.Source_Note,'已核对8名健康运动员的T2 MRI描述性研究：短足、足趾展开及分离伸展募集多个足内在肌，未验证疼痛、过紧、牵伸改善或第一跖跗关节韧带修复。当前关联是区域活动/控制思路的临床编辑判断，不是单肌训练疗效。拇趾抗阻保留原库/患者资料出处，不把无抗阻MRI试验当作抗阻疗效证明。')});
 }
 for(const id of ['AFM-0050-TENSION','AFM-0051-TENSION','AFM-0052-TENSION','AFM-0053-STATE','AFM-0008-CONTROL','AFM-0022-EXCESS']){
  const row=e.FindingFeature.find(r=>r.Feature_ID===id);
  put('FindingFeature',id,{Source_URL:join(row.Source_URL,B.ankle),Finding_Interpretation:row.Finding_Interpretation+' 活动与控制参考不表示已确定某块肌肉过紧或薄弱。'});
 }
 const scope='同一任务和速度下，对照症状、完成表现、既往能力与恢复目标；该表现本身不表示必须纠正。';
 for(const row of e.FindingFeature.filter(r=>/^AFM-01(19|20|21|22|23)-/.test(r.Feature_ID))){
  put('FindingFeature',row.Feature_ID,{Finding_Feature:row.Finding_Feature+' '+scope,Source_URL:join(row.Source_URL.startsWith('https://doi.org/10.2519/jospt.2019.0302')?S.pfp:row.Source_URL,B.ankle),Finding_Interpretation:'此处为动作观察思路，不单独推断组织损伤、疼痛来源或肌肉薄弱。'});
 }
 for(const row of e.ClinicalPurpose.filter(r=>r.Item_ID.startsWith('KNEE-PATTERN-'))){
  put('ClinicalPurpose',row.Item_ID,{Clinical_Purpose:row.Clinical_Purpose+' 对照该动作中的症状、完成表现与恢复目标。',Source_URL:join(row.Source_URL.replace('https://doi.org/10.2519/jospt.2019.0302',S.pfp),B.ankle)});
 }
 const exactMethods={
  'AFM-0119-ALIGNMENT-TASK':'步态视频反馈练习；单腿支撑练习',
  'AFM-0120-KNEE-TASK':'下蹲镜面或视频反馈练习；辅助下蹲练习',
  'AFM-0121-KNEE-TASK':'单腿下蹲镜面或视频反馈练习；辅助单腿下蹲练习',
  'AFM-0122-KNEE-TASK':'落地视频反馈练习；落地屈膝缓冲练习',
 };
 for(const row of e.InterventionReference.filter(r=>/^AFM-01(19|20|21|22|23)-/.test(r.Reference_ID))){
  put('InterventionReference',row.Reference_ID,{Treatment_Goal:'相关动作练习参考',...(exactMethods[row.Reference_ID]?{Treatment_Method:exactMethods[row.Reference_ID]}:{}),Source_URL:join(`baseline://clinical-extension/InterventionReference/${row.Reference_ID}`,row.Source_URL.replace('https://doi.org/10.2519/jospt.2019.0302',S.pfp),B.ankle),Source_Note:'方法名称是产品对动作反馈、支撑及运动重学思路的编辑整理；2024髌股最佳实践限于髌股疼痛，Aspetar指南限于ACL重建后。不能证明此动作表现就是原因，也未验证每一观察项与练习的一对一关系。膝内移、骨盆下沉、躯干前倾、支撑侧差和制动步数均需结合任务、速度、症状、既往能力与目标，不默认需要纠正。教材支持按需求查看功能动作；现场或已有视频均可，不安排全套测试、训练剂量或自动准入。'});
 }
 put('ClinicalPurpose','CORE-CAP-KNEE-FLEX',{Clinical_Purpose:'膝屈抗阻查看腘绳肌输出；跑步等需求还可对照髋伸及较长肌长位的发力，与后侧牵拉和局部疼痛分别查看。',Assessment_Focus:'等长膝屈输出、疼痛限制与侧差；结合目标活动查看髋伸、膝屈离心及较长肌长位表现。',Source_URL:join(A.ham,B.knee,S.hamguideline)});
 put('02_ClinicalItem','CORE-CAP-KNEE-FLEX',{check_focus:'等长膝屈输出、疼痛限制与侧差；结合目标活动查看髋伸、膝屈离心及较长肌长位表现。'},true);
 put('InterventionReference','AFM-0091-CAPACITY-1',{Treatment_Goal:'腘绳肌能力训练参考',Treatment_Method:'腘绳肌等长训练；膝屈抗阻训练；膝屈离心抗阻训练；单腿罗马尼亚硬拉；Nordic腘绳肌训练',Source_URL:join('baseline://database-v3.8/InterventionReference/AFM-0091-CAPACITY-1',S.hamguideline,'https://www.orthopt.org/uploads/content_files/files/Hamstring_Strain_Injury_in_Athletes_2022.pdf',S.ruh,S.rdl),Source_Note:'已核验2022正式44页CPG全文：离心训练属于腘绳肌损伤后综合干预，Nordic属于预防综合训练，也有离心康复研究；不是所有后大腿疼痛的通用安排。单腿罗马尼亚硬拉的动作名称来自RUH索引，用于髋伸及较长肌长位发力参考；未据索引宣称本发现的疗效。较高需求方法放在能力参考，不复制到肌腹疼痛条目；侧差和疼痛不自动判为薄弱，不指定阶段、次数、顺序或测试准入。'});
 const pain=e.InterventionReference.find(r=>r.Reference_ID==='AFM-0100-PAIN-ACTIVE');
 put('InterventionReference',pain.Reference_ID,{Source_Note:join(pain.Source_Note,'该组保持基础具名动作参考；较高需求的髋伸、离心与Nordic选项单列在膝屈能力，不由疼痛表现自动安排。')});
}
else throw Error(`Unsupported batch ${batch}`);
await fs.writeFile(`knowledge/review/clinical_remediation_batch${batch}_v1.json`,JSON.stringify(spec,null,2));
console.log(JSON.stringify({batch,issues:spec.issue_ids,rows:Object.values(spec.extension).reduce((n,r)=>n+Object.keys(r).length,0)}));
