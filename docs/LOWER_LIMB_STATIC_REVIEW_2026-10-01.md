# 下肢数据库静态临床复审（2026-10-01）

原审核状态：只读审核，未实施本清单。原结论：仍有8组具体整改问题、1组内容覆盖待补。上一轮17组清单的落实与关系验证通过，不代表整个数据库临床内容不存在其他残留。

实施更新：用户批准后，以下9组清单已分四批整改并逐批复查。完成情况见 [整改完成记录](STATIC_REMEDIATION_PROGRESS_2026-10-01.md)。下文保留整改前的审核内容、原值及哈希，供追溯。

## 检查范围

当前主库与扩展库所有表重新读取；与运行快照逐表、逐行比较一致，重复ID、导入差异及哈希不同均未发现。临床走读覆盖38区域、125项目、537区域映射、124检查-发现映射、124检查目的、266条表现、282组方法、101条问诊、19条区域内容指南。内部旧条目与当前公开路径区分处理，不为不应提供方法的医学/定位提示硬填治疗。

主库SHA256：`a25d5579528d405d9079332b4995dd304ae11ee93f5b4104fe56f92412bc4716`。扩展库SHA256：`de2bff0c411a55896bcc209164cf536f18d160604fcf75b145eadd6df3bbc020`。

本次不改工作簿、运行快照、模型或页面；不扩展髋、脊柱、上肢、APK及部署。

## 总表

| 编号 | 优先级 | 类型 | 内容 |
| --- | --- | --- | --- |
| STATIC-01 | P1 | 整改 | 发现名称与实际表现不一致 |
| STATIC-02 | P1 | 整改 | 主动终末伸膝与被动伸直受限还未在发现中分清 |
| STATIC-03 | P1 | 整改 | 胫骨旋转检查仍混合了不同运动情境 |
| STATIC-04 | P1 | 整改 | 大腿神经相关筛查存在区域覆盖缺口 |
| STATIC-05 | P2 | 整改 | 解剖与病种引用仍有少量对象错配 |
| STATIC-06 | P2 | 整改 | 足内在肌动作名称仍超出所引募集研究 |
| STATIC-07 | P2 | 整改 | 阔筋膜张肌主动活动的公开分组目标不准确 |
| STATIC-08 | P2 | 整改 | 仍有含混名称、抽象方法和重复措辞 |
| STATIC-09 | P2 | 内容完善 | 小腿和大腿的功能动作内容尚未接齐 |

P1先修正公开内容的临床含义及区域错漏；P2随后修正文案、引用和覆盖。没有将本次发现归为需要停用整个产品的严重错误。

## STATIC-01 发现名称与实际表现不一致

**问题：**活动与对侧不同并不等于活动受限；输出有差异也不等于能力不足。部分标题写受限，正文却只描述紧张。

**修改方向：**按条目实际对象对应写范围减少、牵拉不适、肌腹紧绷或主动输出下降。若保留疼痛或牵拉不适，标题也应体现它；不把单纯侧差自动写成异常。腘肌条目当前只描述末端后外侧紧张，宜用相应标题。大腿后侧记录实际写过紧，没有记载当前文案中的左右牵拉范围比较，需移除未获记录支持的观察或另标教材/临床编辑来源。

**拟议简洁文案：**髌骨某方向被动活动较对侧减少。大腿后侧局部紧绷。以上为拟议文案，不是修改后的数据库。

**具体位置与当前值：**

- `FindingFeature`第58行，`AFM-0086-LIMIT`：Finding_Name=「髌骨方向性活动受限」；Finding_Feature=「髌骨上下或内外侧活动与对侧不同」；Source_URL=「https://doi.org/10.2519/jospt.2018.0301」
- `FindingFeature`第62行，`AFM-0087-LIMIT`：Finding_Name=「近端胫腓关节活动受限」；Finding_Feature=「腓骨头方向性活动与对侧不同」；Source_URL=「https://doi.org/10.2519/jospt.2018.0301」
- `FindingFeature`第60行，`AFM-0088-LIMIT`：Finding_Name=「胫骨旋转活动受限」；Finding_Feature=「屈伸末端胫骨旋转活动与对侧不同」；Source_URL=「https://doi.org/10.2519/jospt.2018.0301」
- `FindingFeature`第34行，`AFM-0068-LENGTH`：Finding_Name=「前侧股四头肌群牵拉受限」；Finding_Feature=「屈膝时前侧股四头肌群牵拉范围或局部反应与对侧不同；该动作不能单独评估股中间肌。」；Source_URL=「baseline://database-v3.8/08_AssessmentFindingMap/AFM-0068；https://www.ncbi.nlm.nih.gov/books/NBK513334/；book://magee-local#pdf=751,756&print=742,747」
- `FindingFeature`第44行，`AFM-0072-LENGTH`：Finding_Name=「内侧肌群组合牵拉受限」；Finding_Feature=「髋伸、内收结合膝伸时，内侧肌群牵拉范围或局部反应与对侧不同；不等同缝匠肌独立长度测试。」；Source_URL=「baseline://database-v3.8/08_AssessmentFindingMap/AFM-0072；https://www.ncbi.nlm.nih.gov/books/NBK534775/；book://magee-local#pdf=751,756&print=742,747」
- `FindingFeature`第51行，`AFM-0094-CAPACITY`：Finding_Name=「鹅足相关屈膝或内收能力不足」；Finding_Feature=「屈膝或内收抗阻时力值、耐力或左右表现有差异，需与膝内侧疼痛分开查看。」；Source_URL=「https://doi.org/10.2519/jospt.2019.0302」
- `FindingFeature`第42行，`AFM-0076-LENGTH`：Finding_Name=「拉长或活动受限」；Finding_Feature=「膝伸直或胫骨旋转末端伴后外侧局部紧张」；Source_URL=「local-records://LR-9a5cba6e18ed#L10-L40；local-records://LR-b62ce4e8b001#L105-L109」
- `FindingFeature`第135行，`AFM-0100-RECORD-TENSION`：Finding_Name=「后侧紧张或牵拉受限」；Finding_Feature=「大腿后侧局部紧绷，或后侧牵拉范围与对侧不同。」；Source_URL=「local-records://LR-20a01619ecb0#L50-L55；local-records://LR-20a01619ecb0#L73-L90」

**依据及边界：**Magee区分活动过小与过大；线下记录只支持后侧过紧及相关方法。具体产品句子是审核建议。

- `book://magee-local#pdf=756&print=747`
- `local-records://LR-20a01619ecb0#L50-L55`
- `local-records://LR-20a01619ecb0#L73-L90`


## STATIC-02 主动终末伸膝与被动伸直受限还未在发现中分清

**问题：**目的提到了主动和被动范围，但发现正文只写出现伸膝滞后，没有明确主动伸膝和被动可达范围的关系。引用记录有伸直受限、力量弱及激活训练，不足以独立证明主动滞后。

**修改方向：**公开说明补主动伸膝与被动可达范围的比较；与膝伸直ROM项保留区别。主动、被动都受限时，不只放到募集/激活方向。保留现有肌腹松解及股四头肌训练菜单，供康复师参考，不由产品判断病因。

**拟议简洁文案：**主动伸膝未达到被动可达的伸直范围。

**具体位置与当前值：**

- `FindingFeature`第18行，`AFM-0095-CAPACITY`：Finding_Feature=「股四头肌主动收缩或终末伸膝出现伸膝滞后」；Source_URL=「local-records://LR-4433b5bd593a#L15-L27；local-records://LR-4633fe94481a#L23-L38」
- `ClinicalPurpose`第13行，`CORE-CAP-QUAD-RECRUIT`：Assessment_Focus=「终末伸膝、收缩质量、伸膝滞后与左右差异。」；Source_URL=「local-records://LR-4433b5bd593a#L15-L27；local-records://LR-4633fe94481a#L23-L38」
- `02_ClinicalItem`第93行，`CORE-CAP-QUAD-RECRUIT`：check_focus=「在固定体位观察股四头主动收缩与主动终末伸膝：记录能否达到终末伸膝、是否存在伸膝滞后、收缩质量、疼痛和明显代偿，并与对侧比较。该项描述募集/主动控制，不替代膝伸力量测试。」

**依据及边界：**教材提供主动/被动及抗阻比较框架；2023研究区分主动与被动伸膝不足，27名单侧症状参与者，不作病因判定或自动治疗规则。拟议主动-被动比较句是临床编辑定义，不冒充该研究SAPLT的原操作方法。

- `book://magee-local#pdf=751,756&print=742,747`
- [对应资料](https://doi.org/10.1589/jpts.35.312)
- `local-records://LR-4433b5bd593a#L15-L27`
- `local-records://LR-4633fe94481a#L23-L38`


## STATIC-03 胫骨旋转检查仍混合了不同运动情境

**问题：**检查重点只写屈伸末端胫骨旋转，未区分屈膝位轴向内外旋与屈伸末端伴随旋转。完全伸直时轴向旋转受到很大限制。

**修改方向：**用短句区分屈膝位内外旋活动和屈伸末端伴随旋转。不扩写操作教程、正常阈值或强制末端旋转规则。

**拟议简洁文案：**屈膝位内外旋活动；屈伸末端伴随旋转与症状。

**具体位置与当前值：**

- `ClinicalPurpose`第35行，`KNEE-JNT-TIBROT`：Clinical_Purpose=「胫骨旋转参与膝屈伸末端活动；方向性差异可与末端症状对照。」；Assessment_Focus=「比较屈伸末端的胫骨旋转、侧差和症状。」；Source_URL=「https://doi.org/10.2519/jospt.2018.0301」
- `02_ClinicalItem`第84行，`KNEE-JNT-TIBROT`：check_focus=「结合膝屈伸末端观察胫骨旋转、末端方向性活动与症状反应」
- `FindingFeature`第60行，`AFM-0088-LIMIT`：Finding_Feature=「屈伸末端胫骨旋转活动与对侧不同」；Source_URL=「https://doi.org/10.2519/jospt.2018.0301」

**依据及边界：**本地基础肌动学第3版印刷288页明确区分膝屈伸与轴向旋转及伸直位限制。

- `book://essentials-kinesiology-3-local#pdf=306&print=288`


## STATIC-04 大腿神经相关筛查存在区域覆盖缺口

**问题：**THIGH-CX-01选中后确实显示筛查，但仅有小腿至足部感觉和背屈、伸趾、外翻、跖屈检查。大腿外侧麻木问诊已存在，大腿本身的筛查内容却没有接入。

**修改方向：**在现有表中增加大腿区域神经相关筛查及对应表现。提示感觉分布、局部受压背景，按表现对照膝伸输出及反射；远端放射时仍可保留远端筛查作为补充。前外侧纯感觉与伴运动变化不混为一类，不凭位置生成神经诊断。不接入独立髋/脊柱模块。

**具体位置与当前值：**

- `07_ContextRule`第57行，`THIGH-CX-01`：target=「CORE-SPT-NEURO-DISTAL」
- `ClinicalPurpose`第58行，`CORE-SPT-NEURO-DISTAL`：Assessment_Focus=「足背/第一趾蹼/足底/内外侧感觉，背屈、伸趾、外翻及跖屈肌力。」
- `ConsultationGuide`第87行，`QG-THIGH-R-004-3`：Core_Prompt=「有没有撞击、近期运动变化或外侧麻木？」；Assessment_Help=「可补局部软组织、骨面与神经相关评估。」

**依据及边界：**AAOS说明大腿外侧感觉及受压病史评估；解剖章节区分股外侧皮神经的纯感觉范围与股神经的运动/感觉范围。建议是补充筛查思路，不照搬诊断及治疗流程。

- [对应资料](https://www.orthoinfo.org/diseases--conditions/burning-thigh-pain-meralgia-paresthetica/)
- [对应资料](https://www.ncbi.nlm.nih.gov/books/NBK532301/)
- [对应资料](https://www.ncbi.nlm.nih.gov/books/NBK556065/)


## STATIC-05 解剖与病种引用仍有少量对象错配

**问题：**两条后内侧小腿区域仍引用小腿前侧间室；鹅足能力目的/表现及膝后外侧肌腹压痛仍只挂2019髌股疼痛指南。上一轮修复的方法来源没有自动修复这些字段。

**修改方向：**后内侧组织改引对应后侧间室/胫后肌章节。鹅足能力、后外侧区域压痛挂对应解剖、教材检查框架及实际记录；临床编辑关系注明其性质。保留2019指南用于其适用的髌股内容，不批量删除所有指南引用。

**具体位置与当前值：**

- `01_Region`第31行，`LL-R-003`：related_tissues_source=「baseline://clinical-extension/LocationGuide/LOC-LL-MEDIAL；https://www.ncbi.nlm.nih.gov/books/NBK539725/」
- `01_Region`第35行，`LL-R-007`：related_tissues_source=「baseline://clinical-extension/LocationGuide/LOC-LL-POSTMEDIAL；https://www.ncbi.nlm.nih.gov/books/NBK539725/」
- `ClinicalPurpose`第28行，`KNEE-CAP-PES`：Source_URL=「https://doi.org/10.2519/jospt.2019.0302」
- `FindingFeature`第51行，`AFM-0094-CAPACITY`：Source_URL=「https://doi.org/10.2519/jospt.2019.0302」
- `FindingFeature`第43行，`AFM-0076-SENSITIVITY`：Source_URL=「https://doi.org/10.2519/jospt.2019.0302」

**依据及边界：**前侧章节不是后内侧组织列表的充分直接来源；髌股疼痛指南不构成鹅足/腘肌专属检查的直接依据。引用错配不等于这些临床检查本身无用。

- [对应资料](https://www.ncbi.nlm.nih.gov/books/NBK539725/)
- [对应资料](https://www.ncbi.nlm.nih.gov/books/NBK537340/)
- [对应资料](https://www.ncbi.nlm.nih.gov/books/NBK539913/)
- [对应资料](https://www.orthopt.org/content/s/patellofemoral-pain-2019)
- `book://magee-local#pdf=751,756&print=742,747`


## STATIC-06 足内在肌动作名称仍超出所引募集研究

**问题：**3组仅引2016 MRI研究的方法写足趾主动屈伸，另1组含同类来源。该研究测试短足、展开、拇趾伸展、第2–5趾伸展，没有测试一个通用主动屈伸方案。

**修改方向：**对应该研究时用实际测试的动作名称；通用足趾主动屈伸如保留，另找直接动作资料，并分别注明对应依据。保留区域活动/组合控制属性，不当作肌肉过紧或疼痛疗效证据。不要为了使来源看似完整把全部四个研究动作堆入每个发现。

**具体位置与当前值：**

- `InterventionReference`第219行，`AFM-0050-TENSION-ACTIVE`：Treatment_Method=「足趾主动屈伸；足趾展开练习」；Source_URL=「https://pmc.ncbi.nlm.nih.gov/articles/PMC5094843/」；Source_Note=「健康人MRI研究支持组合肌肉募集，不是疼痛治疗试验，不宣称单肌分离效果。；已核对8名健康运动员的T2 MRI描述性研究：短足、足趾展开及分离伸展募集多个足内在肌，未验证疼痛、过紧、牵伸改善或第一跖跗关节韧带修复。当前关联是区域活动/控制思路的临床编辑判断，不是单肌训练疗效。拇趾抗阻保留原库/患者资料出处，不把无抗阻MRI试验当作抗阻疗效证明。」
- `InterventionReference`第221行，`AFM-0051-TENSION-ACTIVE`：Treatment_Method=「足趾主动屈伸；足趾展开练习」；Source_URL=「https://pmc.ncbi.nlm.nih.gov/articles/PMC5094843/」；Source_Note=「健康人MRI研究支持组合肌肉募集，不是疼痛治疗试验，不宣称单肌分离效果。；已核对8名健康运动员的T2 MRI描述性研究：短足、足趾展开及分离伸展募集多个足内在肌，未验证疼痛、过紧、牵伸改善或第一跖跗关节韧带修复。当前关联是区域活动/控制思路的临床编辑判断，不是单肌训练疗效。拇趾抗阻保留原库/患者资料出处，不把无抗阻MRI试验当作抗阻疗效证明。」
- `InterventionReference`第223行，`AFM-0052-TENSION-ACTIVE`：Treatment_Method=「足趾主动屈伸；足趾展开练习」；Source_URL=「https://pmc.ncbi.nlm.nih.gov/articles/PMC5094843/」；Source_Note=「健康人MRI研究支持组合肌肉募集，不是疼痛治疗试验，不宣称单肌分离效果。；已核对8名健康运动员的T2 MRI描述性研究：短足、足趾展开及分离伸展募集多个足内在肌，未验证疼痛、过紧、牵伸改善或第一跖跗关节韧带修复。当前关联是区域活动/控制思路的临床编辑判断，不是单肌训练疗效。拇趾抗阻保留原库/患者资料出处，不把无抗阻MRI试验当作抗阻疗效证明。」
- `InterventionReference`第13行，`AFM-0023-LIMIT-ACTIVE`：Treatment_Method=「第2–5趾主动屈伸；足趾展开练习」；Source_URL=「https://msk-bexley.nhs.uk/conditions/foot-and-ankle-pain/plantar-plate-injury；https://pmc.ncbi.nlm.nih.gov/articles/PMC5094843/」；Source_Note=「来源列出具名练习，本库只保留方法名称，不导入剂量、阶段或自动选择规则。」

**依据及边界：**8名健康运动员、T2 MRI募集研究；动作存在、组合募集与临床疗效是不同层次。NHS页面的展开/毛巾抓握也不等同第2–5趾活动受限的全部ROM方法。

- [对应资料](https://pmc.ncbi.nlm.nih.gov/articles/PMC5094843/)
- [对应资料](https://msk-bexley.nhs.uk/conditions/foot-and-ankle-pain/plantar-plate-injury)


## STATIC-07 阔筋膜张肌主动活动的公开分组目标不准确

**问题：**内部已写相关区域主动活动、不声称独立牵伸，但公开目标仍是改善拉长与活动，配侧卧髋外展主动活动。

**修改方向：**目标改成相关主动活动或动作控制参考，与牵伸/松解组分开。无需删除现有具名动作；不借内部备注修补公开标题的含义。

**拟议简洁文案：**相关主动活动

**具体位置与当前值：**

- `InterventionReference`第21行，`AFM-0075-TENSION-2`：Treatment_Goal=「改善拉长与活动」；Source_Note=「原库“髋外侧主动活动”具体化为官方机构列出的侧卧髋外展；用于相关区域主动活动参考，不声称独立牵伸阔筋膜张肌或治疗所有髋外侧痛。不是从线下记录还原出该动作。」

**依据及边界：**官方索引能验证动作名称，不证明该动作牵伸阔筋膜张肌；本建议只修正分组含义。

- [对应资料](https://www.ruh.nhs.uk/patients/services/physiotherapy/OP_outpatient_service.asp)


## STATIC-08 仍有含混名称、抽象方法和重复措辞

**问题：**小趾列MTP实际对象是第2–5跖趾关节；拇屈能力（FHL为主）没有说明区分长短屈肌的检查对象；4处髋膝踝协同练习没有具名动作；功能描述仍用动作线索；阔筋膜张肌按压句重复邻近。

**修改方向：**用第2–5跖趾关节活动、第一跖趾关节活动、拇趾屈曲力量等明确名称。拇趾项目若实际评估长屈肌须写清对象并另核相应依据。四组已经有具体反馈/支撑动作，可移除重复的泛化协同项。删重复字词，功能描述改成相关动作与动作模式观察。保留第一跖骨列上下活动，不再次改成第一跖跗关节。

**具体位置与当前值：**

- `02_ClinicalItem`第26行，`AF-JNT-005`：display_name=「小趾列 MTP 活动」；check_focus=「第2–5 MTP 屈伸、症状及跖骨头负荷反应」
- `02_ClinicalItem`第4行，`AF-ASM-004`：display_name=「第一MTP活动」；check_focus=「伸展/屈曲及推进相关症状」
- `02_ClinicalItem`第46行，`CORE-CAP-HF`：display_name=「拇屈能力（FHL为主）」；check_focus=「抗阻拇屈、第一MTP/推蹬相关症状与力量表现；第一MTP场景以拇长屈肌为主要能力对象」
- `ClinicalPurpose`第91行，`AF-JNT-005`：Item_Name=「小趾列 MTP 活动」；Assessment_Focus=「第2–5MTP主动/被动屈伸、跖侧压痛、足趾贴地及排列。」
- `ClinicalPurpose`第89行，`AF-ASM-004`：Item_Name=「第一MTP活动」；Assessment_Focus=「第一MTP主动/被动屈伸、负重伸展、疼痛位置。」
- `ClinicalPurpose`第74行，`CORE-CAP-HF`：Item_Name=「拇屈能力（FHL为主）」；Assessment_Focus=「拇趾屈曲抗阻；力量、疼痛与左右差异。」
- `InterventionReference`第87行，`AFM-0110-KNEE-TASK`：Treatment_Method=「下蹲动作反馈练习；髋膝踝协同练习；辅助下蹲练习」
- `InterventionReference`第91行，`AFM-0112-KNEE-TASK`：Treatment_Method=「下台阶动作反馈练习；单腿负重控制练习；髋膝踝协同练习」
- `InterventionReference`第94行，`AFM-0113-KNEE-TASK`：Treatment_Method=「单腿下蹲动作反馈练习；髋膝踝协同练习；辅助单腿下蹲练习」
- `InterventionReference`第101行，`AFM-0116-KNEE-TASK`：Treatment_Method=「单腿落地动作反馈练习；髋膝踝协同练习；单腿缓冲练习」
- `DimensionGuide`第5行，`FUNCTION`：Public_Description=「选择相关动作线索，查看对应的动作模式。」
- `FindingFeature`第16行，`AFM-0075-SENSITIVITY`：Finding_Feature=「阔筋膜张肌邻近肌腹邻近按压，或髋屈或外展发力时出现疼痛；与关节线及肌腱止点分别查看。」

**依据及边界：**名称应反映检查范围；此组主要是产品信息精度，不把这些问题一概当成临床错误。

- `book://magee-local#pdf=882,889&print=873,880`
- [对应资料](https://www.ncbi.nlm.nih.gov/books/NBK539705/)


## STATIC-09 小腿和大腿的功能动作内容尚未接齐

**问题：**小腿3条和大腿3条活动规则会组织肌肉、组织、活动度、力量检查，但没有FUNCTION映射。选项有效，功能动作观察尚无内容。

**修改方向：**准确性修复后，再补少量可复用的下肢动作观察项目及区域侧重点。步行的负重/支撑/蹬地可作为基础；更高需求关联既有动作背景，采用现场相关任务、视频或负荷较低的相近任务观察。由康复师选适合的评估，不显示全套，也不把替代任务等同跑跳测试。用现有项目、表现、映射表，不新增嵌套查询或自动准入系统。

**具体位置与当前值：**

- `07_ContextRule`第39行，`LL-MF-01`：target=「LL-LT-002 / LL-LT-003 / CORE-CAP-DF / CORE-ROM-ANK-DF」
- `07_ContextRule`第42行，`LL-MF-02`：target=「LL-LT-005 / CORE-MUS-GASTROC / CORE-CAP-PF；必要时LL-LT-006 / CORE-MUS-SOLEUS」
- `07_ContextRule`第43行，`LL-MF-03`：target=「LL-LT-006 / CORE-MUS-SOLEUS / CORE-CAP-PF；按定位叠加LL-LT-007」
- `07_ContextRule`第54行，`THIGH-MF-01`：target=「THIGH-LT-001 / THIGH-LT-002 / CORE-MUS-RF / CORE-MUS-BF / CORE-MUS-ST / CORE-MUS-SM / CORE-CAP-KNEE-EXT / CORE-CAP-KNEE-FLEX」
- `07_ContextRule`第55行，`THIGH-MF-02`：target=「THIGH-LT-001 / CORE-MUS-RF / CORE-MUS-VL / CORE-CAP-KNEE-EXT / CORE-CAP-QUAD-RECRUIT」
- `07_ContextRule`第56行，`THIGH-MF-03`：target=「THIGH-LT-003 / THIGH-MUS-AL / THIGH-MUS-AM / THIGH-CAP-ADD」
- `05_RegionClinicalMap`：LOWER_LEG/THIGH的FUNCTION映射

**依据及边界：**这是产品覆盖范围的审核结论；具体观察项待按部位设计并核对，不称已由一篇文献验证。

- `book://magee-local#pdf=889&print=880`
- [对应资料](https://www.ncbi.nlm.nih.gov/books/NBK537340/)

## 当前解析路径的定向静态观察

以下使用当前工作簿快照直接调用现有resolver，未靠截图判断。

- 输入`THIGH-R-004` + `THIGH-CX-01`：功能项目0个；已被突出显示的相关检查：`CORE-SPT-NEURO-DISTAL`。神经检查实际内容：足背/第一趾蹼/足底/内外侧感觉，背屈、伸趾、外翻及跖屈肌力。
- 输入`LL-R-004` + `LL-MF-01`：功能项目0个；已被突出显示的相关检查：`CORE-ROM-ANK-DF`、`CORE-CAP-DF`、`LL-LT-002`、`LL-LT-003`。
- 输入`THIGH-R-003` + `THIGH-MF-03`：功能项目0个；已被突出显示的相关检查：`THIGH-MUS-AL`、`THIGH-MUS-AM`、`THIGH-CAP-ADD`、`THIGH-LT-003`。

小腿/大腿活动选择已参与组织相关检查，缺的是功能动作观察内容；不能称整个选择机制未生效。大腿麻木路径的地区对象缺口已经由解析返回值确认。

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
