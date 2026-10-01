# 下肢内容临床思路审核

> 2026-10-01｜审核报告，生产数据库未改。

## 结论

**现有内容仍需整改，不能因结构检查通过就称临床内容已经完成。** 本次通读123条检查目的、264条发现、281条处理参考、101条问诊及19组部位说明，并核对38个区域的实际内容分配。普通展示及全部非风险活动关联可访问105个项目、231条发现；其余含历史任务、同部位隐藏项及独立安全项，另行记录，未混算为界面缺项。

共归纳17组问题：5组优先整改、12组随后整改。分组数不是错误行数，同一行可能涉及多个问题。

审核形式是临床思路审读与重点来源核验。没有逐篇完成281条参考的全文系统评价，也不修改数据库“待临床审核”状态。未标记条目表示本轮没有提出新的整改意见，不是单项疗效认证。

## 用户已确认的边界

- 线下松解与筋膜刀可在肌腹按压或发力痛下保留；需注明对应肌腹，与骨面/肌腱内容分开。
- Compex relax对外名称为肌肉电刺激放松；内部记录NMES relax。
- 第一跖骨项目为第一跖骨列整体上下活动，非单一第一跖跗关节附属活动。

## 优先整改

| 编号 | 优先级 | 问题 | 涉及行数 |
|---|---|---|---:|
| CLIN-01 | P1 | 膝部问诊绑定到错误的解剖区域 | 6 |
| CLIN-02 | P1 | 第一跖骨项目的检查对象被改窄了 | 5 |
| CLIN-03 | P1 | 旧肌肉条目把髌股疼痛指南当成通用方法出处 | 24 |
| CLIN-04 | P1 | 小腿前侧间室解剖资料被用于髋、大腿、后内踝及足部 | 29 |
| CLIN-05 | P1 | 髌骨上下缘的肌腱内容未覆盖到位 | 2 |
| CLIN-06 | P2 | 深层肌与单肌拉长的文字暗示了过高定位精度 | 9 |
| CLIN-07 | P2 | 力量不足标题包含了疼痛限制 | 9 |
| CLIN-08 | P2 | 少量方法名称仍然是方向性占位文字 | 4 |
| CLIN-09 | P2 | 48条后补问诊的用途和信息说明没有随部位展开 | 48 |
| CLIN-10 | P2 | 放松模式的电刺激名称应准确 | 4 |
| CLIN-11 | P2 | 膝关节活动方法的来源过于笼统 | 5 |
| CLIN-12 | P2 | 拇长屈肌/趾长屈肌手法依据不足以支持分开的肌腹疗效 | 4 |
| CLIN-13 | P2 | 足内在肌募集资料不能变成紧张或疼痛的疗效依据 | 6 |
| CLIN-14 | P2 | 动作模式发现不应天然成为待纠正异常 | 16 |
| CLIN-15 | P2 | 共用安全条目仍写小腿，实际被大腿调用 | 8 |
| CLIN-16 | P2 | 部分NHS索引能支持动作名称，不能支持整个关联 | 9 |
| CLIN-17 | P2 | 大腿后侧力量参考覆盖偏基础 | 3 |

## 逐组意见

### CLIN-01 · 膝部问诊绑定到错误的解剖区域

**P1｜明确绑定错误｜建议整改**

目前：MEDIAL 绑定 KNEE-R-006/007/008；LATERAL 绑定 KNEE-R-009/010/011/012。R-006实际是髌下，R-009实际是膝后内侧。

审核意见：同一数据库中区域名称与问诊位置直接矛盾；已通过实际 resolver 返回值确认，不是模型点击误差。

整改建议：前侧组接入R-006；内侧组改为R-007/008/009；外侧组改为R-010/011/012。R-009补后内侧肌腱与鹅足分区追问，避免只询问前内侧关节线。

对应条目：`ConsultationGuide/QG-KNEE-MEDIAL-1`、`ConsultationGuide/QG-KNEE-MEDIAL-2`、`ConsultationGuide/QG-KNEE-MEDIAL-3`、`ConsultationGuide/QG-KNEE-LATERAL-1`、`ConsultationGuide/QG-KNEE-LATERAL-2`、`ConsultationGuide/QG-KNEE-LATERAL-3`

### CLIN-02 · 第一跖骨项目的检查对象被改窄了

**P1｜用户已澄清｜整改含义已确认**

目前：第一跖跗关节活动；第一跖骨基底与内侧楔骨之间的附属活动。

审核意见：用户2026-10-01明确要求的是第一跖骨列整体上下活动；当前文字与实际想看的检查范围不同。

整改建议：标题改为“第一跖骨列上下活动”；检查与说明围绕第一跖骨列相对其余跖骨的上下活动及承重表现。保留稳定ID，逐条复核受限、偏大与疼痛条目；不能仅换标题。中足松动不自动改成第一跖跗关节专属松动。

对应条目：`02_ClinicalItem/AF-JNT-004`、`ClinicalPurpose/AF-JNT-004`、`FindingFeature/AFM-0022-LIMIT`、`FindingFeature/AFM-0022-EXCESS`、`FindingFeature/AFM-0022-PAIN`

依据/核对资料：[资料1](https://pubmed.ncbi.nlm.nih.gov/10739156/)、[资料2](https://pubmed.ncbi.nlm.nih.gov/32617706/)

### CLIN-03 · 旧肌肉条目把髌股疼痛指南当成通用方法出处

**P1｜证据范围不匹配｜建议整改**

目前：24条旧参考没有来源范围说明，其中含股内/外侧肌、腘绳肌、缝匠肌、股薄肌、髋屈肌群与内收肌群的手法或拉伸。

审核意见：髌股疼痛指南的疾病、干预组合和研究人群范围，不能直接证明某单肌的检查、MET、选择性拉伸或松解。旧任务条目AFM-0096目前不在正常展示路径，需单独记为历史内容。

整改建议：逐条拆清“方法来自哪里”和“疗效证据适用于谁”。有对应授权记录的手法保留为经验参考；具名牵伸/训练补对应原始资料。髋膝抗阻可保留，但移除通用于全部问题的证据暗示。不能凭换上2024指南就声称其支持全部单肌方法。

对应条目：`InterventionReference/AFM-0065-TENSION-1`、`InterventionReference/AFM-0065-LENGTH-1`、`InterventionReference/AFM-0066-TENSION-1`、`InterventionReference/AFM-0066-TENSION-2`、`InterventionReference/AFM-0067-TENSION-1`、`InterventionReference/AFM-0067-TENSION-2`、`InterventionReference/AFM-0069-TENSION-1`、`InterventionReference/AFM-0069-TENSION-2`、`InterventionReference/AFM-0070-TENSION-1`、`InterventionReference/AFM-0070-TENSION-2`、`InterventionReference/AFM-0071-TENSION-1`、`InterventionReference/AFM-0071-TENSION-2`、`InterventionReference/AFM-0075-TENSION-1`、`InterventionReference/AFM-0075-TENSION-2`、`InterventionReference/AFM-0090-CAPACITY-1`、`InterventionReference/AFM-0096-CAPACITY-1`、`InterventionReference/AFM-0068-LENGTH-1`、`InterventionReference/AFM-0077-LENGTH-1`、`InterventionReference/AFM-0074-LENGTH-1`、`InterventionReference/AFM-0072-LENGTH-1`、`InterventionReference/AFM-0073-LENGTH-1`、`InterventionReference/AFM-0093-CAPACITY-1`、`InterventionReference/AFM-0092-CAPACITY-1`、`InterventionReference/AFM-0091-CAPACITY-1`

依据/核对资料：[资料1](https://doi.org/10.2519/jospt.2019.0302)、[资料2](https://pubmed.ncbi.nlm.nih.gov/39401870/)

### CLIN-04 · 小腿前侧间室解剖资料被用于髋、大腿、后内踝及足部

**P1｜明确引用对象错误｜建议整改**

目前：NBK539725被用作通用下肢解剖来源；髋屈肌群拉伸一条仅引用这篇资料。

审核意见：原文标题是Leg Anterior Compartment。它可以支持小腿前侧相关解剖，不能直接支持内收肌、髂腰肌、足底肌群或其治疗。混合来源里有其他有效来源，也应清除不相干的这一条。

整改建议：按组织更换解剖来源；治疗方法引用具名运动或临床记录。清理基础生成脚本里的通用anatomy变量，防止下次导入重新带回错误来源。

对应条目：`ClinicalPurpose/THIGH-LT-004`、`ClinicalPurpose/THIGH-MUS-AL`、`ClinicalPurpose/THIGH-MUS-AB`、`ClinicalPurpose/THIGH-MUS-AM`、`FindingFeature/AFM-0075-SENSITIVITY`、`FindingFeature/AFM-0077-SENSITIVITY`、`FindingFeature/AFM-0072-SENSITIVITY`、`FindingFeature/AFM-0089-SCREEN`、`FindingFeature/AFM-0102-TENSION`、`FindingFeature/AFM-0102-PAIN`、`FindingFeature/AFM-0106-PAIN`、`FindingFeature/AFM-0103-LENGTH`、`FindingFeature/AFM-0104-LENGTH`、`FindingFeature/AFM-0105-LENGTH`、`FindingFeature/AFM-0081-FIBULAR-TENDON`、`FindingFeature/AFM-0027-HALLUX`、`FindingFeature/AFM-0027-LESSER_TOES`、`InterventionReference/AFM-0077-SENSITIVITY-STRETCH`、`LocationGuide/LOC-AF-R-006`、`LocationGuide/LOC-AF-R-007`、`LocationGuide/LOC-AF-R-008`、`LocationGuide/LOC-AF-R-009`、`LocationGuide/LOC-AF-R-010`、`LocationGuide/LOC-AF-R-011`、`LocationGuide/LOC-AF-R-012`、`LocationGuide/LOC-THIGH-R-001`、`LocationGuide/LOC-THIGH-R-002`、`LocationGuide/LOC-THIGH-R-003`、`LocationGuide/LOC-THIGH-R-004`

依据/核对资料：[资料1](https://www.ncbi.nlm.nih.gov/books/NBK539725/)

### CLIN-05 · 髌骨上下缘的肌腱内容未覆盖到位

**P1｜区域内容缺口｜建议整改**

目前：R-001写股四头肌腱邻近、R-005写髌骨下缘；两者LOCAL实际只有髌周负重屈膝、软组织损伤后肿胀、皮肤触碰敏感。

审核意见：范围名称虽写了肌腱，实际没有上缘股四头肌腱对应发现；下缘未接入现有髌腱条目。结构完整检查无法发现这种临床覆盖缺口。

整改建议：R-005接入已有髌腱相关内容，按邻近范围放置，保留髌周补充。R-001补股四头肌腱走行压痛、伸膝发力痛与完整性评估方向；方法需取得对应来源再列，不整套挪用髌腱病方案。

对应条目：`01_Region/KNEE-R-001`、`01_Region/KNEE-R-005`

### CLIN-06 · 深层肌与单肌拉长的文字暗示了过高定位精度

**P2｜检查表述过度特异｜建议整改**

目前：后内侧深层主动膝伸拉长；前大腿深层张力；缝匠肌髋膝组合拉长；股四头肌前外侧拉伸。

审核意见：临床审读意见：这些动作包含肌群、关节、疼痛限制与神经等共同因素；当前说明没有充分体现这种共同参与，和新条目中的区域说明不一致。

整改建议：保留具名解剖项目供思路查看；检查描述改为相关区域/肌群的牵拉表现，按需要简短列动作组合。半膜肌不写成独立的“深层主动膝伸测试”；股中间肌与足内在肌保留区域方法，不构造独立触诊结论。“股四头肌前外侧拉伸”复核为一般股四头肌拉伸，不暗示可以独立选择性拉伸股外侧肌。

对应条目：`ClinicalPurpose/CORE-MUS-SM`、`ClinicalPurpose/CORE-MUS-VI`、`ClinicalPurpose/CORE-MUS-SART`、`ClinicalPurpose/CORE-MUS-GRAC`、`FindingFeature/AFM-0071-TENSION`、`FindingFeature/AFM-0068-LENGTH`、`FindingFeature/AFM-0072-LENGTH`、`FindingFeature/AFM-0073-LENGTH`、`InterventionReference/AFM-0066-TENSION-2`

依据/核对资料：[资料1](https://pubmed.ncbi.nlm.nih.gov/30374579/)

### CLIN-07 · 力量不足标题包含了疼痛限制

**P2｜结论与表现混写｜建议整改**

目前：标题为力量/输出不足，说明同时包含输出侧差或受到疼痛限制。

审核意见：输出下降、疼痛限制和动作质量下降提供不同评估信息，不宜由标题直接归为肌肉薄弱。侧差也不直接等同未达到目标能力。

整改建议：保留现有检查思路，标题区分“输出下降/受疼痛限制”与“动作完成质量”。说明简短提示比较测量条件、当前表现和目标能力，不新增自动阈值或训练选择规则。

对应条目：`FindingFeature/AFM-0090-CAPACITY`、`FindingFeature/AFM-0093-CAPACITY`、`FindingFeature/AFM-0092-CAPACITY`、`FindingFeature/AFM-0091-CAPACITY`、`FindingFeature/AFM-0004-CAPACITY`、`FindingFeature/AFM-0005-CAPACITY`、`FindingFeature/AFM-0006-CAPACITY`、`FindingFeature/AFM-0009-CAPACITY`、`FindingFeature/AFM-0007-CAPACITY`

### CLIN-08 · 少量方法名称仍然是方向性占位文字

**P2｜方法仍不具体｜建议整改**

目前：髋外侧主动活动；侧向稳定任务训练；内翻肌群募集与抗阻；拇趾屈曲募集与抗阻。

审核意见：康复师能够理解总体方向，但方法名称无法快速给出具体可查看的选择。

整改建议：内翻参考已有具名内翻等长/弹力带训练；拇趾屈曲明确抗阻动作对象；侧向任务列确有记录的单腿支撑/侧向重心转移等具名任务。髋外侧活动先核实原记录所指动作，不自行创造特异牵伸。

对应条目：`InterventionReference/AFM-0075-TENSION-2`、`InterventionReference/AFM-0005-CAPACITY-RECORD-2`、`InterventionReference/AFM-0006-CAPACITY-MEDIAL-1`、`InterventionReference/AFM-0009-CAPACITY-MEDIAL-1`

依据/核对资料：[资料1](https://www.norfolkandwaveneycommunityhealth.nhs.uk/msk/self-help/foot-and-ankle/posterior-tibial-tendinopathy/)

### CLIN-09 · 48条后补问诊的用途和信息说明没有随部位展开

**P2｜问诊用途模板化｜建议整改**

目前：普遍复用“分清同一区域的肌腹、肌腱、关节或骨面”“分别查看活动度、相关肌力及动作表现”等说明。

审核意见：问题本身多数具体，但“为什么这样问、能得到什么”仍泛化。鞋具/跑量问题的收集信息有时写成肿胀瘀斑，字段内容与问题不对应。

整改建议：逐问题写1句部位相关用途。例如足跟中央/内侧问题→足跟垫与筋膜附着处分区；舟骨发力/鞋摩擦问题→肌腱承载与局部接触差别；中足外伤/足底瘀斑问题→跗跖稳定结构评估背景。保持只读提示，不加入问诊结果表单。

对应条目：`ConsultationGuide/QG-AF-R-006-1`、`ConsultationGuide/QG-AF-R-006-2`、`ConsultationGuide/QG-AF-R-006-3`、`ConsultationGuide/QG-AF-R-007-1`、`ConsultationGuide/QG-AF-R-007-2`、`ConsultationGuide/QG-AF-R-007-3`、`ConsultationGuide/QG-AF-R-008-1`、`ConsultationGuide/QG-AF-R-008-2`、`ConsultationGuide/QG-AF-R-008-3`、`ConsultationGuide/QG-AF-R-009-1`、`ConsultationGuide/QG-AF-R-009-2`、`ConsultationGuide/QG-AF-R-009-3`、`ConsultationGuide/QG-AF-R-010-1`、`ConsultationGuide/QG-AF-R-010-2`、`ConsultationGuide/QG-AF-R-010-3`、`ConsultationGuide/QG-AF-R-011-1`、`ConsultationGuide/QG-AF-R-011-2`、`ConsultationGuide/QG-AF-R-011-3`、`ConsultationGuide/QG-AF-R-012-1`、`ConsultationGuide/QG-AF-R-012-2`、`ConsultationGuide/QG-AF-R-012-3`、`ConsultationGuide/QG-THIGH-R-001-1`、`ConsultationGuide/QG-THIGH-R-001-2`、`ConsultationGuide/QG-THIGH-R-001-3`、`ConsultationGuide/QG-THIGH-R-002-1`、`ConsultationGuide/QG-THIGH-R-002-2`、`ConsultationGuide/QG-THIGH-R-002-3`、`ConsultationGuide/QG-THIGH-R-003-1`、`ConsultationGuide/QG-THIGH-R-003-2`、`ConsultationGuide/QG-THIGH-R-003-3`、`ConsultationGuide/QG-THIGH-R-004-1`、`ConsultationGuide/QG-THIGH-R-004-2`、`ConsultationGuide/QG-THIGH-R-004-3`、`ConsultationGuide/QG-KNEE-FRONT-1`、`ConsultationGuide/QG-KNEE-FRONT-2`、`ConsultationGuide/QG-KNEE-FRONT-3`、`ConsultationGuide/QG-KNEE-MEDIAL-1`、`ConsultationGuide/QG-KNEE-MEDIAL-2`、`ConsultationGuide/QG-KNEE-MEDIAL-3`、`ConsultationGuide/QG-KNEE-LATERAL-1`、`ConsultationGuide/QG-KNEE-LATERAL-2`、`ConsultationGuide/QG-KNEE-LATERAL-3`、`ConsultationGuide/QG-KNEE-POST-1`、`ConsultationGuide/QG-KNEE-POST-2`、`ConsultationGuide/QG-KNEE-POST-3`、`ConsultationGuide/QG-KNEE-DIFFUSE-1`、`ConsultationGuide/QG-KNEE-DIFFUSE-2`、`ConsultationGuide/QG-KNEE-DIFFUSE-3`

### CLIN-10 · 放松模式的电刺激名称应准确

**P2｜用户已澄清｜整改名称已确认**

目前：低频电刺激/腓骨长肌低频电刺激。

审核意见：用户确认实际为神经肌肉电刺激的relax模式，要求对外只写肌肉电刺激放松。

整改建议：改成“肌肉电刺激放松”，必要时带相关肌群名。内部保留NMES relax与原记录出处。募集锻炼用的NMES继续单列，不能顺带改成放松或TENS。

对应条目：`InterventionReference/AFM-0046-PRESSURE-RECORD-1`、`InterventionReference/AFM-0060-PRESSURE-LOCAL-1`、`InterventionReference/AFM-0060-ACTIVITY-LOCAL-1`、`InterventionReference/AFM-0042-TENSION-RELAX-1`

### CLIN-11 · 膝关节活动方法的来源过于笼统

**P2｜来源需拆分｜建议整改**

目前：屈曲方向松动、髌骨方向性松动、胫股旋转松动等统一引用半月板/关节软骨2018指南。

审核意见：该指南的主要对象为半月板与软骨病变、尤其术后评估与康复。主动/被动活动参考与具体方向性松动并非同一种来源支持，需要核对具体原段，不能仅从指南标题推导每种手法。

整改建议：活动练习保留相应来源；具体手法补对应记录/原始资料和适用范围。对骨性阻挡、真正卡锁的提示继续保留，不因活动受限列出所有松动。

对应条目：`InterventionReference/AFM-0085-LIMIT-1`、`InterventionReference/AFM-0086-LIMIT-1`、`InterventionReference/AFM-0088-LIMIT-1`、`InterventionReference/AFM-0080-JOINT-LIMIT-ROM`、`InterventionReference/AFM-0081-JOINT-LIMIT-ROM`

依据/核对资料：[资料1](https://pubmed.ncbi.nlm.nih.gov/29385940/)

### CLIN-12 · 拇长屈肌/趾长屈肌手法依据不足以支持分开的肌腹疗效

**P2｜单病例方法需谨慎归属｜建议整改**

目前：拇长屈肌/趾长屈肌肌腹或肌腱周围手法，主要引用PMC8159326。

审核意见：原文是一个FHL/FDL共同受累的多方法病例，处理位点主要在远端肌腱邻近，出现即时疼痛增加。当前内注明确单病例，但把它拆成两种肌腹常规方法仍需重新核对部位。

整改建议：作为病例经验资料可保留；复核肌腹/肌腱方法名称和真实处理位置。主思路不得宣称手法独立疗效，不用来填充所有屈趾疼痛。FHL牵伸队列不能外推为FDL牵伸疗效。没有更直接经验记录时，先保留范围而不扩充理疗清单。

对应条目：`InterventionReference/AFM-0048-LENGTH-MUSCLE`、`InterventionReference/AFM-0047-LENGTH-MUSCLE`、`InterventionReference/AFM-0027-HALLUX-MANUAL`、`InterventionReference/AFM-0027-LESSER_TOES-MANUAL`

依据/核对资料：[资料1](https://pmc.ncbi.nlm.nih.gov/articles/PMC8159326/)、[资料2](https://pubmed.ncbi.nlm.nih.gov/34170867/)

### CLIN-13 · 足内在肌募集资料不能变成紧张或疼痛的疗效依据

**P2｜测量证据与治疗证据区分｜建议整改**

目前：足趾展开/分离活动引用8名健康运动员MRI募集研究。

审核意见：该研究支持这些组合动作有肌肉募集，未测肌肉过紧、疼痛缓解或跖跗关节稳定修复。目前多条内注明确此点，可以保留，但其方法应放在活动/控制范围。

整改建议：保留短足、足趾展开与分离控制；治疗分类体现活动/控制，不把MRI作为牵伸疗效证据。拇收肌等不写单肌分离训练；单肌紧张条目的相关性标为临床编辑判断。

对应条目：`FindingFeature/AFM-0008-CONTROL`、`FindingFeature/AFM-0022-EXCESS`、`FindingFeature/AFM-0050-TENSION`、`FindingFeature/AFM-0051-TENSION`、`FindingFeature/AFM-0052-TENSION`、`FindingFeature/AFM-0053-STATE`

依据/核对资料：[资料1](https://pubmed.ncbi.nlm.nih.gov/27690528/)

### CLIN-14 · 动作模式发现不应天然成为待纠正异常

**P2｜动作观察需保持中性｜建议整改**

目前：膝向内移动、骨盆下沉、躯干明显前倾、多次制动步等直接接动作控制练习。

审核意见：这些描述适合观察，但是否有意义取决于任务、速度、症状、既往能力与恢复目标。临床审读不能仅凭姿势或左右差别给出病因或纠正决定。

整改建议：保留动作名称与已有视频/现场观察入口；检查用途强调比较任务中症状、完成质量及目标需求。替换纯“髋膝踝协同”的重复方法为有来源的具名动作反馈练习，不把足外翻、膝内移或躯干前倾规定为必须纠正。

对应条目：`FindingFeature/AFM-0119-SUPPORT`、`FindingFeature/AFM-0119-PROPULSION`、`FindingFeature/AFM-0119-ALIGNMENT`、`FindingFeature/AFM-0120-LOAD`、`FindingFeature/AFM-0120-KNEE`、`FindingFeature/AFM-0121-KNEE`、`FindingFeature/AFM-0121-PELVIS`、`FindingFeature/AFM-0121-TRUNK`、`FindingFeature/AFM-0121-DESCENT`、`FindingFeature/AFM-0122-LOAD`、`FindingFeature/AFM-0122-BUFFER`、`FindingFeature/AFM-0122-BALANCE`、`FindingFeature/AFM-0122-KNEE`、`FindingFeature/AFM-0123-STEPS`、`FindingFeature/AFM-0123-KNEE`、`FindingFeature/AFM-0123-TIMING`

依据/核对资料：[资料1](https://pubmed.ncbi.nlm.nih.gov/39401870/)

### CLIN-15 · 共用安全条目仍写小腿，实际被大腿调用

**P2｜共用标题与场景不符｜建议整改**

目前：“急性小腿间室综合征风险筛查”“小腿静脉血栓风险筛查”作为大腿安全规则目标。

审核意见：提示内容总体方向合理。当前大腿公开风险标题来自规则，本轮没有确认这些小腿标题在大腿界面直接显示；问题在共用目标条目的内部命名与适用范围，后续复用时应消除歧义。

整改建议：共用条目改为下肢/对应区域的间室及静脉血栓风险；保留急性紧急程度及医学评估提示。不要加入自动判断、按摩试验或新的筛查表单。

对应条目：`02_ClinicalItem/CORE-SAF-ACS`、`02_ClinicalItem/CORE-SAF-VTE`、`ClinicalPurpose/CORE-SAF-ACS`、`ClinicalPurpose/CORE-SAF-VTE`、`FindingFeature/AFM-0063-ASSESS`、`FindingFeature/AFM-0064-ASSESS`、`07_ContextRule/THIGH-SAF-01`、`07_ContextRule/THIGH-SAF-02`

依据/核对资料：[资料1](https://www.orthoinfo.org/en/diseases--conditions/compartment-syndrome/)、[资料2](https://www.nice.org.uk/guidance/ng158/chapter/Recommendations)

### CLIN-16 · 部分NHS索引能支持动作名称，不能支持整个关联

**P2｜具名练习可追溯性｜建议整改**

目前：腘绳肌、鹅足、腓骨头附近肌腱及大腿外侧参考共用RUH练习索引。

审核意见：原页面确有站立屈膝、桥式、髋外展等具名条目，应保留；本次核对未在索引中找到所有“屈膝等长”“腘绳肌拉伸”的对应条目，且索引没有直接证明每个疼痛部位的治疗关系。

整改建议：已找到动作补准确条目/视频或对应患者资料链接；等长和拉伸另补直接来源。分别记录动作出处与临床关联判断，不把源页面说成验证了全部部位关系。

对应条目：`InterventionReference/AFM-0087-LIMIT-1`、`InterventionReference/AFM-0102-PAIN-ACTIVE`、`InterventionReference/AFM-0100-PAIN-ACTIVE`、`InterventionReference/AFM-0069-SENSITIVITY-STRETCH`、`InterventionReference/AFM-0070-SENSITIVITY-STRETCH`、`InterventionReference/AFM-0071-SENSITIVITY-STRETCH`、`InterventionReference/AFM-0094-CAPACITY-STRENGTH`、`InterventionReference/AFM-0081-FIBULAR-TENDON-LOAD`、`InterventionReference/AFM-0082-TENDON-LOAD`

依据/核对资料：[资料1](https://www.ruh.nhs.uk/patients/services/physiotherapy/OP_outpatient_service.asp)

### CLIN-17 · 大腿后侧力量参考覆盖偏基础

**P2｜方法菜单可补运动需求｜建议整改**

目前：屈膝等长、站立屈膝、桥式为主；运动需求下缺少不同肌长、髋伸及离心承载方法方向。

审核意见：作为基础思路可保留，若恢复目标为快跑/加速等，只呈现这几种方法仍偏窄。本条是菜单补充建议，不等于所有疼痛都要采用高强度训练。

整改建议：在对应能力条目中补有来源的髋伸抗阻、长肌长/离心屈膝训练名称；结合需求展示，保留急性损伤、肌腱和术后范围，不增加阶段、剂量、强制进阶或自动准入规则。

对应条目：`FindingFeature/AFM-0091-CAPACITY`、`FindingFeature/AFM-0100-PAIN`、`ClinicalPurpose/CORE-CAP-KNEE-FLEX`

依据/核对资料：[资料1](https://pubmed.ncbi.nlm.nih.gov/35164536/)、[资料2](https://pubmed.ncbi.nlm.nih.gov/36650032/)

## 可保留的主要内容

- 肌肉状态、活动范围、力量输出和动作表现分层有意义；保持区别，避免同一检查重复命名。
- 跟腱中段与止点分开，止点采用平地/有限背屈范围的参考，现有分类方向合理。低压缩研究的组合内容不拆成单项疗效宣称。[止点RCT](https://doi.org/10.1136/bjsports-2024-109138)。
- 足跟垫、足底筋膜、舟骨/胫骨后肌止点、第五跖骨基底/腓骨短肌止点、跖板及籽骨分别查看，明显优于通用局部敏感条目。相关骨性风险和新发形态变化继续单列。
- 髌周参考的髋膝抗阻与个体化髌骨贴扎可保留在髌股疼痛范围；手法可作支持方法。[2024最佳实践指导](https://pubmed.ncbi.nlm.nih.gov/39401870/)。
- 线下松解、MET、筋膜刀及肌肉电刺激放松保留经验出处，明确肌腹及对应表现；无需因为缺少某单项RCT就整批删除。
- 未明确组织的活动末端疼痛可给出分组织查看/重新定位建议；包块、骨面局灶痛、明显形态变化与神经血管表现保留评估提示，不能为“齐全”硬加理疗。
- 问诊保持提示为什么问、能了解什么、帮助看什么；不收集回答，不替康复师判断。恢复目标仍用于对照目标所需能力与当前能力。

## 实施顺序

1. **纠正确定错误**：问诊区域绑定、第一跖骨列检查对象、电刺激名称、共用风险条目标题。同步主表与扩展表，保留ID。
2. **纠正来源及范围**：逐条修13个旧肌肉发现的19条手法/拉伸参考；其余旧髋膝能力与历史任务参考补范围。替换不相干的小腿前侧解剖引用，拆清动作出处与疗效/经验来源。
3. **补临床覆盖并细化方法菜单**：髌骨上下缘肌腱内容；具体力量/活动/动作名称；深层肌检查与力量标题；48条问诊用途。优先复用现有条目，不扩大疾病教学。
4. **处理经验和弱证据边界**：复核FHL/FDL手法真实处理位置；保留足内在肌募集方法但不冒充止痛/韧带修复证据；按目标需求补大腿后侧训练参考。拿不准且涉及线下经验的具体条目集中向用户核实。
5. **最小充分核对**：直接用数据库和resolver核对修改行、对应区域和未受影响方法；类型与构建检查即可。保持模型定位专项暂停。

## 覆盖与追踪

全部264条发现的ID、当前展示可达性、相关问题编号，见 [机器清单](../knowledge/review/lower_limb_clinical_expert_review_v1.json)。普通展示可达性采用全部有效非风险活动关联的并集；独立安全项不计为普通可达内容。

生产主库/扩展库哈希已记录在机器清单，便于后续判断整改前后来源是否变化。临床记录的患者姓名、联系方式及可识别细节未导出。

### 本次公开来源核验的限制

- 旧记录的使用经过并非全部可由摘录还原；不推断单一方法因果疗效。
- 部分JOSPT全文及NCBI页面访问受限，仅取得摘要、指南推荐片段或来源主题；需原段核验的条目已保留为待核对。
- 不修模型定位，不接入新身体模块，不新增问诊结果录入或处方规则。
