import {readFileSync,writeFileSync} from 'node:fs';
import {resolveAssessment} from '../../api/resolver.mjs';

const data=JSON.parse(readFileSync('build/authoring/database-audit-snapshot.json','utf8'));
const pointers=(sheet,ids,fields)=>ids.map(id=>({sheet,id,fields}));
const issues=[
  {id:'STATIC-01',priority:'P1',kind:'correction',title:'发现名称与实际表现不一致',
    problem:'活动与对侧不同并不等于活动受限；输出有差异也不等于能力不足。部分标题写受限，正文却只描述紧张。',
    targets:pointers('FindingFeature',['AFM-0086-LIMIT','AFM-0087-LIMIT','AFM-0088-LIMIT','AFM-0068-LENGTH','AFM-0072-LENGTH','AFM-0094-CAPACITY','AFM-0076-LENGTH','AFM-0100-RECORD-TENSION'],['Finding_Name','Finding_Feature','Source_URL']),
    recommendation:'按条目实际对象对应写范围减少、牵拉不适、肌腹紧绷或主动输出下降。若保留疼痛或牵拉不适，标题也应体现它；不把单纯侧差自动写成异常。腘肌条目当前只描述末端后外侧紧张，宜用相应标题。大腿后侧记录实际写过紧，没有记载当前文案中的左右牵拉范围比较，需移除未获记录支持的观察或另标教材/临床编辑来源。',
    example:'髌骨某方向被动活动较对侧减少。大腿后侧局部紧绷。以上为拟议文案，不是修改后的数据库。',
    evidence:['book://magee-local#pdf=756&print=747','local-records://LR-20a01619ecb0#L50-L55','local-records://LR-20a01619ecb0#L73-L90'],
    basis:'Magee区分活动过小与过大；线下记录只支持后侧过紧及相关方法。具体产品句子是审核建议。'},
  {id:'STATIC-02',priority:'P1',kind:'correction',title:'主动终末伸膝与被动伸直受限还未在发现中分清',
    problem:'目的提到了主动和被动范围，但发现正文只写出现伸膝滞后，没有明确主动伸膝和被动可达范围的关系。引用记录有伸直受限、力量弱及激活训练，不足以独立证明主动滞后。',
    targets:[...pointers('FindingFeature',['AFM-0095-CAPACITY'],['Finding_Feature','Source_URL']),...pointers('ClinicalPurpose',['CORE-CAP-QUAD-RECRUIT'],['Assessment_Focus','Source_URL']),...pointers('02_ClinicalItem',['CORE-CAP-QUAD-RECRUIT'],['check_focus'])],
    recommendation:'公开说明补主动伸膝与被动可达范围的比较；与膝伸直ROM项保留区别。主动、被动都受限时，不只放到募集/激活方向。保留现有肌腹松解及股四头肌训练菜单，供康复师参考，不由产品判断病因。',
    example:'主动伸膝未达到被动可达的伸直范围。',
    evidence:['book://magee-local#pdf=751,756&print=742,747','https://doi.org/10.1589/jpts.35.312','local-records://LR-4433b5bd593a#L15-L27','local-records://LR-4633fe94481a#L23-L38'],
    basis:'教材提供主动/被动及抗阻比较框架；2023研究区分主动与被动伸膝不足，27名单侧症状参与者，不作病因判定或自动治疗规则。拟议主动-被动比较句是临床编辑定义，不冒充该研究SAPLT的原操作方法。'},
  {id:'STATIC-03',priority:'P1',kind:'correction',title:'胫骨旋转检查仍混合了不同运动情境',
    problem:'检查重点只写屈伸末端胫骨旋转，未区分屈膝位轴向内外旋与屈伸末端伴随旋转。完全伸直时轴向旋转受到很大限制。',
    targets:[...pointers('ClinicalPurpose',['KNEE-JNT-TIBROT'],['Clinical_Purpose','Assessment_Focus','Source_URL']),...pointers('02_ClinicalItem',['KNEE-JNT-TIBROT'],['check_focus']),...pointers('FindingFeature',['AFM-0088-LIMIT'],['Finding_Feature','Source_URL'])],
    recommendation:'用短句区分屈膝位内外旋活动和屈伸末端伴随旋转。不扩写操作教程、正常阈值或强制末端旋转规则。',
    example:'屈膝位内外旋活动；屈伸末端伴随旋转与症状。',
    evidence:['book://essentials-kinesiology-3-local#pdf=306&print=288'],
    basis:'本地基础肌动学第3版印刷288页明确区分膝屈伸与轴向旋转及伸直位限制。'},
  {id:'STATIC-04',priority:'P1',kind:'correction',title:'大腿神经相关筛查存在区域覆盖缺口',
    problem:'THIGH-CX-01选中后确实显示筛查，但仅有小腿至足部感觉和背屈、伸趾、外翻、跖屈检查。大腿外侧麻木问诊已存在，大腿本身的筛查内容却没有接入。',
    targets:[...pointers('07_ContextRule',['THIGH-CX-01'],['target']),...pointers('ClinicalPurpose',['CORE-SPT-NEURO-DISTAL'],['Assessment_Focus']),...pointers('ConsultationGuide',['QG-THIGH-R-004-3'],['Core_Prompt','Assessment_Help'])],
    recommendation:'在现有表中增加大腿区域神经相关筛查及对应表现。提示感觉分布、局部受压背景，按表现对照膝伸输出及反射；远端放射时仍可保留远端筛查作为补充。前外侧纯感觉与伴运动变化不混为一类，不凭位置生成神经诊断。不接入独立髋/脊柱模块。',
    evidence:['https://www.orthoinfo.org/diseases--conditions/burning-thigh-pain-meralgia-paresthetica/','https://www.ncbi.nlm.nih.gov/books/NBK532301/','https://www.ncbi.nlm.nih.gov/books/NBK556065/'],
    basis:'AAOS说明大腿外侧感觉及受压病史评估；解剖章节区分股外侧皮神经的纯感觉范围与股神经的运动/感觉范围。建议是补充筛查思路，不照搬诊断及治疗流程。'},
  {id:'STATIC-05',priority:'P2',kind:'correction',title:'解剖与病种引用仍有少量对象错配',
    problem:'两条后内侧小腿区域仍引用小腿前侧间室；鹅足能力目的/表现及膝后外侧肌腹压痛仍只挂2019髌股疼痛指南。上一轮修复的方法来源没有自动修复这些字段。',
    targets:[...pointers('01_Region',['LL-R-003','LL-R-007'],['related_tissues_source']),...pointers('ClinicalPurpose',['KNEE-CAP-PES'],['Source_URL']),...pointers('FindingFeature',['AFM-0094-CAPACITY','AFM-0076-SENSITIVITY'],['Source_URL'])],
    recommendation:'后内侧组织改引对应后侧间室/胫后肌章节。鹅足能力、后外侧区域压痛挂对应解剖、教材检查框架及实际记录；临床编辑关系注明其性质。保留2019指南用于其适用的髌股内容，不批量删除所有指南引用。',
    evidence:['https://www.ncbi.nlm.nih.gov/books/NBK539725/','https://www.ncbi.nlm.nih.gov/books/NBK537340/','https://www.ncbi.nlm.nih.gov/books/NBK539913/','https://www.orthopt.org/content/s/patellofemoral-pain-2019','book://magee-local#pdf=751,756&print=742,747'],
    basis:'前侧章节不是后内侧组织列表的充分直接来源；髌股疼痛指南不构成鹅足/腘肌专属检查的直接依据。引用错配不等于这些临床检查本身无用。'},
  {id:'STATIC-06',priority:'P2',kind:'correction',title:'足内在肌动作名称仍超出所引募集研究',
    problem:'3组仅引2016 MRI研究的方法写足趾主动屈伸，另1组含同类来源。该研究测试短足、展开、拇趾伸展、第2–5趾伸展，没有测试一个通用主动屈伸方案。',
    targets:pointers('InterventionReference',['AFM-0050-TENSION-ACTIVE','AFM-0051-TENSION-ACTIVE','AFM-0052-TENSION-ACTIVE','AFM-0023-LIMIT-ACTIVE'],['Treatment_Method','Source_URL','Source_Note']),
    recommendation:'对应该研究时用实际测试的动作名称；通用足趾主动屈伸如保留，另找直接动作资料，并分别注明对应依据。保留区域活动/组合控制属性，不当作肌肉过紧或疼痛疗效证据。不要为了使来源看似完整把全部四个研究动作堆入每个发现。',
    evidence:['https://pmc.ncbi.nlm.nih.gov/articles/PMC5094843/','https://msk-bexley.nhs.uk/conditions/foot-and-ankle-pain/plantar-plate-injury'],
    basis:'8名健康运动员、T2 MRI募集研究；动作存在、组合募集与临床疗效是不同层次。NHS页面的展开/毛巾抓握也不等同第2–5趾活动受限的全部ROM方法。'},
  {id:'STATIC-07',priority:'P2',kind:'correction',title:'阔筋膜张肌主动活动的公开分组目标不准确',
    problem:'内部已写相关区域主动活动、不声称独立牵伸，但公开目标仍是改善拉长与活动，配侧卧髋外展主动活动。',
    targets:pointers('InterventionReference',['AFM-0075-TENSION-2'],['Treatment_Goal','Source_Note']),
    recommendation:'目标改成相关主动活动或动作控制参考，与牵伸/松解组分开。无需删除现有具名动作；不借内部备注修补公开标题的含义。',
    example:'相关主动活动',
    evidence:['https://www.ruh.nhs.uk/patients/services/physiotherapy/OP_outpatient_service.asp'],
    basis:'官方索引能验证动作名称，不证明该动作牵伸阔筋膜张肌；本建议只修正分组含义。'},
  {id:'STATIC-08',priority:'P2',kind:'correction',title:'仍有含混名称、抽象方法和重复措辞',
    problem:'小趾列MTP实际对象是第2–5跖趾关节；拇屈能力（FHL为主）没有说明区分长短屈肌的检查对象；4处髋膝踝协同练习没有具名动作；功能描述仍用动作线索；阔筋膜张肌按压句重复邻近。',
    targets:[...pointers('02_ClinicalItem',['AF-JNT-005','AF-ASM-004','CORE-CAP-HF'],['display_name','check_focus']),...pointers('ClinicalPurpose',['AF-JNT-005','AF-ASM-004','CORE-CAP-HF'],['Item_Name','Assessment_Focus']),...pointers('InterventionReference',['AFM-0110-KNEE-TASK','AFM-0112-KNEE-TASK','AFM-0113-KNEE-TASK','AFM-0116-KNEE-TASK'],['Treatment_Method']),...pointers('DimensionGuide',['FUNCTION'],['Public_Description']),...pointers('FindingFeature',['AFM-0075-SENSITIVITY'],['Finding_Feature'])],
    recommendation:'用第2–5跖趾关节活动、第一跖趾关节活动、拇趾屈曲力量等明确名称。拇趾项目若实际评估长屈肌须写清对象并另核相应依据。四组已经有具体反馈/支撑动作，可移除重复的泛化协同项。删重复字词，功能描述改成相关动作与动作模式观察。保留第一跖骨列上下活动，不再次改成第一跖跗关节。',
    evidence:['book://magee-local#pdf=882,889&print=873,880','https://www.ncbi.nlm.nih.gov/books/NBK539705/'],
    basis:'名称应反映检查范围；此组主要是产品信息精度，不把这些问题一概当成临床错误。'},
  {id:'STATIC-09',priority:'P2',kind:'coverage',title:'小腿和大腿的功能动作内容尚未接齐',
    problem:'小腿3条和大腿3条活动规则会组织肌肉、组织、活动度、力量检查，但没有FUNCTION映射。选项有效，功能动作观察尚无内容。',
    targets:[...pointers('07_ContextRule',['LL-MF-01','LL-MF-02','LL-MF-03','THIGH-MF-01','THIGH-MF-02','THIGH-MF-03'],['target']),{sheet:'05_RegionClinicalMap',id:null,fields:['assessment_dimension','clinical_item_id','display_mode'],missing:'LOWER_LEG/THIGH的FUNCTION映射'}],
    recommendation:'准确性修复后，再补少量可复用的下肢动作观察项目及区域侧重点。步行的负重/支撑/蹬地可作为基础；更高需求关联既有动作背景，采用现场相关任务、视频或负荷较低的相近任务观察。由康复师选适合的评估，不显示全套，也不把替代任务等同跑跳测试。用现有项目、表现、映射表，不新增嵌套查询或自动准入系统。',
    evidence:['book://magee-local#pdf=889&print=880','https://www.ncbi.nlm.nih.gov/books/NBK537340/'],
    basis:'这是产品覆盖范围的审核结论；具体观察项待按部位设计并核对，不称已由一篇文献验证。'},
];

const allTables={...data.tables,...data.clinical_extension};
for(const issue of issues)for(const target of issue.targets){
  if(!target.id)continue;
  const row=allTables[target.sheet]?.find(row=>Object.values(row)[0]===target.id);
  if(!row)throw new Error(`Missing audit target ${target.sheet}/${target.id}`);
  target.row=data.audit_source.row_locations[`${target.sheet}/${target.id}`];
  target.current=Object.fromEntries(target.fields.map(field=>[field,row[field]??null]));
}
const scenarios=[
  {region_id:'THIGH-R-004',context_rule_ids:['THIGH-CX-01']},
  {region_id:'LL-R-004',context_rule_ids:['LL-MF-01']},
  {region_id:'THIGH-R-003',context_rule_ids:['THIGH-MF-03']},
];
const observations=scenarios.map(input=>{
  const result=resolveAssessment(data,input);
  const items=result.dimensions.flatMap(d=>d.groups.flatMap(g=>g.items));
  return {input,function_items:result.dimensions.filter(d=>d.key==='FUNCTION').flatMap(d=>d.groups.flatMap(g=>g.items.map(i=>i.item_id))),
    highlighted_items:items.filter(i=>i.context_state==='highlighted').map(i=>i.item_id),
    neuro_items:items.filter(i=>i.item_id.includes('NEURO')).map(i=>({id:i.item_id,focus:i.check_focus}))};
});
const report={review_date:'2026-10-01',status:'read_only_audit_no_database_changes',
  source_hashes:{main:data.workbook_sha256,extension:data.clinical_extension_sha256},
  counts:{regions:data.tables['01_Region'].length,items:data.tables['02_ClinicalItem'].length,region_maps:data.tables['05_RegionClinicalMap'].length,assessment_maps:data.tables['08_AssessmentFindingMap'].length,purposes:data.clinical_extension.ClinicalPurpose.length,features:data.clinical_extension.FindingFeature.length,references:data.clinical_extension.InterventionReference.length,questions:data.clinical_extension.ConsultationGuide.length,locations:data.clinical_extension.LocationGuide.length},
  workbook_runtime_issues:data.audit_source.issues,observations,issues,
  limitations:['所有表重新从当前工作簿读取并与运行快照比较；临床正文逐项走读。','线下267份记录完成读取、哈希及引用位置复核，临床比较重点回看对应片段；不声称逐病例疗效审计。','本地两本书阅读相关页；解剖列车及其余书籍未作为本次新增结论的直接依据。','公开来源有全文、官方正文、摘要/索引不同阅读深度，详见Markdown；不把引用存在视为验证疗效。','本次只列问题及拟议修改，不改数据库、UI或模型；没有浏览器验证，也没有将旧测试结果作为本次临床通过证明。']};
writeFileSync('knowledge/review/lower_limb_static_review_2026-10-01.json',JSON.stringify(report,null,2)+'\n');
const evidenceGuide=`
## 依据与阅读边界

| 来源 | 实际阅读 | 这次的用途 |
| --- | --- | --- |
| 本地Magee台版扫描本，英文原著版本按译者序为第5版 | 本次复看PDF751/印刷742、PDF756/印刷747、PDF913/印刷904；前批登记的踝足页见reference_books_verified_v1.json | 主动/被动、抗阻、活动过小/过大、附属活动等检查框架，不证明具体治疗独立疗效 |
| 本地《基础肌动学》第3版 | PDF306/印刷288完整页面，膝屈伸与轴向旋转 | 区分伸直位限制、屈膝位旋转和末端伴随运动 |
| 线下康复记录 | 267文件读取/哈希一致，所有local-records引用ID与行范围有效；重点核读对应肌腹方法、后侧过紧、伸膝及放松电刺激片段 | 保留已认可的肌腹松解、筋膜刀、MET、肌肉电刺激放松；不提取自动病因判断，不公开个人信息 |
| [2023主动/被动伸膝不足研究](https://doi.org/10.1589/jpts.35.312) | 原刊摘要及PDF前两页方法/引言 | 27名单侧症状者，区分两类表现；不导入研究的诊断效能或用其代替病因鉴别 |
| [AAOS大腿外侧感觉问题](https://www.orthoinfo.org/diseases--conditions/burning-thigh-pain-meralgia-paresthetica/) | 官方正文 | 支持大腿感觉分布及局部受压史的评估方向 |
| NCBI后侧间室、股外侧皮神经、股神经解剖章节 | 对应章节检索正文 | 解剖范围与区域对应；不是治疗指南 |
| [2016足内在肌MRI研究](https://pmc.ncbi.nlm.nih.gov/articles/PMC5094843/) | 摘要及检索正文的方法部分；直接打开PMC正文遇访问限制 | 8名健康运动员，短足、展开、拇趾伸展及第2–5趾伸展；不证明疼痛或过紧治疗效果 |
| [NHS跖板资料](https://msk-bexley.nhs.uk/conditions/foot-and-ankle-pain/plantar-plate-injury) | 官方正文 | 核对具名动作及病种范围，不把其泛用于所有跖趾ROM问题 |
| [APTA 2019髌股疼痛指南官方页面](https://www.orthopt.org/content/s/patellofemoral-pain-2019) | 官方题名/引文及相关官方检索内容 | 核对病种对象；本次没有声称重读该95页指南全文 |
| RUH官方练习索引 | 名称/链接，未声称已观看视频或验证疗效 | 动作名称依据，不能证明独立牵伸作用 |

本次没有把未读正文的《解剖列车》作为结论依据。教材、病例、健康人募集研究和临床指南分别承担不同用途，不能互相替代。

## 可以保留的内容

- 用户已确认的对应肌腹疼痛下松解/筋膜刀、肌肉电刺激放松、第一跖骨列上下活动，不需要推翻。
- 股四头肌腱慢性承载与外伤后完整性分开；原有医学评估提示保留，不能为了“每条都有处理”填入常规训练。
- 屈趾肌腱病例参考已经按内踝后方范围展示，证据限制在内部保留。本次未据病例推导独立肌腹疗效。
- 记录中的股外侧肌、腘肌等松解可保留在伸直受限的参考菜单。一个手法在病例中出现，不意味着产品应判断它是该表现的必选治疗。
- 当前肌肉状态与力量内容已有区域/组合表述，无需回到单肌隔离检查；输出下降与疼痛限制可保留在同一参考项，但不由产品决定治疗。
- 同部位未分清定位的发现隐藏规则、只读问诊用途及恢复目标用途，未发现需要整体重做。

## 整改顺序与复查方式

1. **第一批：公开表现准确性。**落实STATIC-01、02、03，逐条对照原记录和教材；同期删STATIC-08的明显重复文字。保持处理关系不变，除非条目范围必须同步。
2. **第二批：区域神经覆盖。**落实STATIC-04；在现有表内补最少必要条目，不开发独立髋/脊柱模块，不建立问诊结果录入或自动诊断。
3. **第三批：来源、方法名称与公开分组。**落实STATIC-05、06、07及STATIC-08余项；对原始方法、病例、动作资料、研究对象分别记录来源范围，避免只补内部备注。
4. **第四批：动作内容补齐。**落实STATIC-09；先基础步行/支撑/蹬地，再按恢复目标与活动背景补充更高需求。所有内容仍供康复师选择参考。

每批只做相应字段/关系修改，再从工作簿重读，核对预期差异及所有下肢解析请求；新增项目检查映射、可达性、方法与来源，原项目检查无意覆盖。采用CLI静态检查，不逐页浏览器验证。自动检查证明导入、关系和清单落实，临床正文仍要再读，不能把字符串检查的零候选写成“所有临床描述都已准确”。

不需要数据库架构重构。现有ClinicalPurpose、FindingFeature、InterventionReference、ContextItemMap、RegionClinicalMap足以承载本清单。未来可能的嵌套查询本次不实现。
`;
const overview=`# 下肢数据库静态临床复审（2026-10-01）

状态：只读审核，未实施本清单。结论：仍有8组具体整改问题、1组内容覆盖待补。上一轮17组清单的落实与关系验证通过，不代表整个数据库临床内容不存在其他残留。

## 检查范围

当前主库与扩展库所有表重新读取；与运行快照逐表、逐行比较一致，重复ID、导入差异及哈希不同均未发现。临床走读覆盖38区域、125项目、537区域映射、124检查-发现映射、124检查目的、266条表现、282组方法、101条问诊、19条区域内容指南。内部旧条目与当前公开路径区分处理，不为不应提供方法的医学/定位提示硬填治疗。

主库SHA256：\`${data.workbook_sha256}\`。扩展库SHA256：\`${data.clinical_extension_sha256}\`。

本次不改工作簿、运行快照、模型或页面；不扩展髋、脊柱、上肢、APK及部署。

## 总表

| 编号 | 优先级 | 类型 | 内容 |
| --- | --- | --- | --- |
${issues.map(i=>`| ${i.id} | ${i.priority} | ${i.kind==='coverage'?'内容完善':'整改'} | ${i.title} |`).join('\n')}

P1先修正公开内容的临床含义及区域错漏；P2随后修正文案、引用和覆盖。没有将本次发现归为需要停用整个产品的严重错误。
`;
const sections=issues.map(issue=>`
## ${issue.id} ${issue.title}

**问题：**${issue.problem}

**修改方向：**${issue.recommendation}
${issue.example?`\n**拟议简洁文案：**${issue.example}\n`:''}
**具体位置与当前值：**

${issue.targets.map(t=>t.id?`- \`${t.sheet}\`第${t.row}行，\`${t.id}\`：${Object.entries(t.current).map(([k,v])=>`${k}=「${String(v??'').replace(/\n/g,'；')}」`).join('；')}`:`- \`${t.sheet}\`：${t.missing}`).join('\n')}

**依据及边界：**${issue.basis}

${issue.evidence.map(u=>`- ${u.startsWith('http')?`[对应资料](${u})`:`\`${u}\``}`).join('\n')}
`).join('\n');
const routeSection=`
## 当前解析路径的定向静态观察

以下使用当前工作簿快照直接调用现有resolver，未靠截图判断。

${observations.map(o=>`- 输入\`${o.input.region_id}\` + \`${o.input.context_rule_ids.join('|')}\`：功能项目${o.function_items.length}个；已被突出显示的相关检查：${o.highlighted_items.map(i=>`\`${i}\``).join('、')}。${o.neuro_items.map(i=>`神经检查实际内容：${i.focus}`).join('')}`).join('\n')}

小腿/大腿活动选择已参与组织相关检查，缺的是功能动作观察内容；不能称整个选择机制未生效。大腿麻木路径的地区对象缺口已经由解析返回值确认。
`;
writeFileSync('docs/LOWER_LIMB_STATIC_REVIEW_2026-10-01.md',overview+sections+routeSection+evidenceGuide);
console.log(JSON.stringify({correction_groups:issues.filter(i=>i.kind==='correction').length,coverage_groups:issues.filter(i=>i.kind==='coverage').length,target_rows:new Set(issues.flatMap(i=>i.targets.filter(t=>t.id).map(t=>t.sheet+'/'+t.id))).size,workbook_runtime_issues:data.audit_source.issues,observations,report:'docs/LOWER_LIMB_STATIC_REVIEW_2026-10-01.md'},null,2));
