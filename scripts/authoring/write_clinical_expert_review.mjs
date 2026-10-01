import fs from 'node:fs/promises';
import { resolveAssessment } from '../../api/resolver.mjs';

const data = JSON.parse(await fs.readFile('build/knowledge/runtime.json', 'utf8'));
const ext = data.clinical_extension;
const split = value => String(value || '').split('|').filter(Boolean);
const targets = (table, rows, key) => rows.map(row => ({ table, id: row[key] }));
const features = ids => targets('FindingFeature', ext.FindingFeature.filter(row => ids.includes(row.Feature_ID)), 'Feature_ID');
const purposes = ids => targets('ClinicalPurpose', ext.ClinicalPurpose.filter(row => ids.includes(row.Item_ID)), 'Item_ID');
const references = ids => targets('InterventionReference', ext.InterventionReference.filter(row => ids.includes(row.Reference_ID)), 'Reference_ID');
const consultations = ids => targets('ConsultationGuide', ext.ConsultationGuide.filter(row => ids.includes(row.Guide_ID)), 'Guide_ID');
const rules = ids => targets('07_ContextRule', data.tables['07_ContextRule'].filter(row => ids.includes(row.rule_id)), 'rule_id');
const regions = ids => targets('01_Region', data.tables['01_Region'].filter(row => ids.includes(row.region_id)), 'region_id');
const issues = [];
function add(id, priority, category, title, affected, current, reason, recommendation, evidence = [], state = '建议整改') {
  issues.push({ id, priority, category, title, targets: affected, current, reason, recommendation, evidence, state });
}

add('CLIN-01', 'P1', '明确绑定错误', '膝部问诊绑定到错误的解剖区域',
  consultations(ext.ConsultationGuide.filter(x => /^QG-KNEE-(MEDIAL|LATERAL)-/.test(x.Guide_ID)).map(x => x.Guide_ID)),
  'MEDIAL 绑定 KNEE-R-006/007/008；LATERAL 绑定 KNEE-R-009/010/011/012。R-006实际是髌下，R-009实际是膝后内侧。',
  '同一数据库中区域名称与问诊位置直接矛盾；已通过实际 resolver 返回值确认，不是模型点击误差。',
  '前侧组接入R-006；内侧组改为R-007/008/009；外侧组改为R-010/011/012。R-009补后内侧肌腱与鹅足分区追问，避免只询问前内侧关节线。');

add('CLIN-02', 'P1', '用户已澄清', '第一跖骨项目的检查对象被改窄了',
  [{ table: '02_ClinicalItem', id: 'AF-JNT-004' }, ...purposes(['AF-JNT-004']), ...features(['AFM-0022-LIMIT','AFM-0022-EXCESS','AFM-0022-PAIN'])],
  '第一跖跗关节活动；第一跖骨基底与内侧楔骨之间的附属活动。',
  '用户2026-10-01明确要求的是第一跖骨列整体上下活动；当前文字与实际想看的检查范围不同。',
  '标题改为“第一跖骨列上下活动”；检查与说明围绕第一跖骨列相对其余跖骨的上下活动及承重表现。保留稳定ID，逐条复核受限、偏大与疼痛条目；不能仅换标题。中足松动不自动改成第一跖跗关节专属松动。',
  ['https://pubmed.ncbi.nlm.nih.gov/10739156/','https://pubmed.ncbi.nlm.nih.gov/32617706/'], '整改含义已确认');

const legacyPfp = ext.InterventionReference.filter(x => x.Source_URL?.includes('2019.0302') && !x.Source_Note);
add('CLIN-03', 'P1', '证据范围不匹配', '旧肌肉条目把髌股疼痛指南当成通用方法出处',
  targets('InterventionReference', legacyPfp, 'Reference_ID'),
  `${legacyPfp.length}条旧参考没有来源范围说明，其中含股内/外侧肌、腘绳肌、缝匠肌、股薄肌、髋屈肌群与内收肌群的手法或拉伸。`,
  '髌股疼痛指南的疾病、干预组合和研究人群范围，不能直接证明某单肌的检查、MET、选择性拉伸或松解。旧任务条目AFM-0096目前不在正常展示路径，需单独记为历史内容。',
  '逐条拆清“方法来自哪里”和“疗效证据适用于谁”。有对应授权记录的手法保留为经验参考；具名牵伸/训练补对应原始资料。髋膝抗阻可保留，但移除通用于全部问题的证据暗示。不能凭换上2024指南就声称其支持全部单肌方法。',
  ['https://doi.org/10.2519/jospt.2019.0302','https://pubmed.ncbi.nlm.nih.gov/39401870/']);

const outsideAnteriorPurposes = ['THIGH-LT-004','THIGH-MUS-AL','THIGH-MUS-AB','THIGH-MUS-AM'];
const outsideAnteriorFeatures = ['AFM-0075-SENSITIVITY','AFM-0077-SENSITIVITY','AFM-0072-SENSITIVITY','AFM-0089-SCREEN','AFM-0102-TENSION','AFM-0102-PAIN','AFM-0106-PAIN','AFM-0103-LENGTH','AFM-0104-LENGTH','AFM-0105-LENGTH','AFM-0081-FIBULAR-TENDON','AFM-0027-HALLUX','AFM-0027-LESSER_TOES'];
const outsideAnteriorLocations = ext.LocationGuide.filter(x => x.Source_Reference?.includes('NBK539725') && x.Area_ID !== 'LOC-LL-ANTERIOR');
add('CLIN-04', 'P1', '明确引用对象错误', '小腿前侧间室解剖资料被用于髋、大腿、后内踝及足部',
  [...purposes(outsideAnteriorPurposes), ...features(outsideAnteriorFeatures), ...references(['AFM-0077-SENSITIVITY-STRETCH']), ...targets('LocationGuide', outsideAnteriorLocations, 'Area_ID')],
  'NBK539725被用作通用下肢解剖来源；髋屈肌群拉伸一条仅引用这篇资料。',
  '原文标题是Leg Anterior Compartment。它可以支持小腿前侧相关解剖，不能直接支持内收肌、髂腰肌、足底肌群或其治疗。混合来源里有其他有效来源，也应清除不相干的这一条。',
  '按组织更换解剖来源；治疗方法引用具名运动或临床记录。清理基础生成脚本里的通用anatomy变量，防止下次导入重新带回错误来源。',
  ['https://www.ncbi.nlm.nih.gov/books/NBK539725/']);

add('CLIN-05', 'P1', '区域内容缺口', '髌骨上下缘的肌腱内容未覆盖到位',
  regions(['KNEE-R-001','KNEE-R-005']),
  'R-001写股四头肌腱邻近、R-005写髌骨下缘；两者LOCAL实际只有髌周负重屈膝、软组织损伤后肿胀、皮肤触碰敏感。',
  '范围名称虽写了肌腱，实际没有上缘股四头肌腱对应发现；下缘未接入现有髌腱条目。结构完整检查无法发现这种临床覆盖缺口。',
  'R-005接入已有髌腱相关内容，按邻近范围放置，保留髌周补充。R-001补股四头肌腱走行压痛、伸膝发力痛与完整性评估方向；方法需取得对应来源再列，不整套挪用髌腱病方案。');

add('CLIN-06', 'P2', '检查表述过度特异', '深层肌与单肌拉长的文字暗示了过高定位精度',
  [...purposes(['CORE-MUS-SM','CORE-MUS-VI','CORE-MUS-SART','CORE-MUS-GRAC']), ...features(['AFM-0071-TENSION','AFM-0068-LENGTH','AFM-0072-LENGTH','AFM-0073-LENGTH']), ...references(['AFM-0066-TENSION-2'])],
  '后内侧深层主动膝伸拉长；前大腿深层张力；缝匠肌髋膝组合拉长；股四头肌前外侧拉伸。',
  '临床审读意见：这些动作包含肌群、关节、疼痛限制与神经等共同因素；当前说明没有充分体现这种共同参与，和新条目中的区域说明不一致。',
  '保留具名解剖项目供思路查看；检查描述改为相关区域/肌群的牵拉表现，按需要简短列动作组合。半膜肌不写成独立的“深层主动膝伸测试”；股中间肌与足内在肌保留区域方法，不构造独立触诊结论。“股四头肌前外侧拉伸”复核为一般股四头肌拉伸，不暗示可以独立选择性拉伸股外侧肌。',
  ['https://pubmed.ncbi.nlm.nih.gov/30374579/']);

add('CLIN-07', 'P2', '结论与表现混写', '力量不足标题包含了疼痛限制',
  features(['AFM-0090-CAPACITY','AFM-0091-CAPACITY','AFM-0092-CAPACITY','AFM-0093-CAPACITY','AFM-0004-CAPACITY','AFM-0005-CAPACITY','AFM-0006-CAPACITY','AFM-0007-CAPACITY','AFM-0009-CAPACITY']),
  '标题为力量/输出不足，说明同时包含输出侧差或受到疼痛限制。',
  '输出下降、疼痛限制和动作质量下降提供不同评估信息，不宜由标题直接归为肌肉薄弱。侧差也不直接等同未达到目标能力。',
  '保留现有检查思路，标题区分“输出下降/受疼痛限制”与“动作完成质量”。说明简短提示比较测量条件、当前表现和目标能力，不新增自动阈值或训练选择规则。');

add('CLIN-08', 'P2', '方法仍不具体', '少量方法名称仍然是方向性占位文字',
  references(['AFM-0075-TENSION-2','AFM-0005-CAPACITY-RECORD-2','AFM-0006-CAPACITY-MEDIAL-1','AFM-0009-CAPACITY-MEDIAL-1']),
  '髋外侧主动活动；侧向稳定任务训练；内翻肌群募集与抗阻；拇趾屈曲募集与抗阻。',
  '康复师能够理解总体方向，但方法名称无法快速给出具体可查看的选择。',
  '内翻参考已有具名内翻等长/弹力带训练；拇趾屈曲明确抗阻动作对象；侧向任务列确有记录的单腿支撑/侧向重心转移等具名任务。髋外侧活动先核实原记录所指动作，不自行创造特异牵伸。',
  ['https://www.norfolkandwaveneycommunityhealth.nhs.uk/msk/self-help/foot-and-ankle/posterior-tibial-tendinopathy/']);

const standardizedQuestions = ext.ConsultationGuide.filter(x => /^QG-(AF-R-|THIGH-R-|KNEE-)/.test(x.Guide_ID));
add('CLIN-09', 'P2', '问诊用途模板化', '48条后补问诊的用途和信息说明没有随部位展开',
  targets('ConsultationGuide', standardizedQuestions, 'Guide_ID'),
  '普遍复用“分清同一区域的肌腹、肌腱、关节或骨面”“分别查看活动度、相关肌力及动作表现”等说明。',
  '问题本身多数具体，但“为什么这样问、能得到什么”仍泛化。鞋具/跑量问题的收集信息有时写成肿胀瘀斑，字段内容与问题不对应。',
  '逐问题写1句部位相关用途。例如足跟中央/内侧问题→足跟垫与筋膜附着处分区；舟骨发力/鞋摩擦问题→肌腱承载与局部接触差别；中足外伤/足底瘀斑问题→跗跖稳定结构评估背景。保持只读提示，不加入问诊结果表单。');

const relax = ext.InterventionReference.filter(x => /低频电刺激/.test(x.Treatment_Method));
add('CLIN-10', 'P2', '用户已澄清', '放松模式的电刺激名称应准确',
  targets('InterventionReference', relax, 'Reference_ID'),
  '低频电刺激/腓骨长肌低频电刺激。',
  '用户确认实际为神经肌肉电刺激的relax模式，要求对外只写肌肉电刺激放松。',
  '改成“肌肉电刺激放松”，必要时带相关肌群名。内部保留NMES relax与原记录出处。募集锻炼用的NMES继续单列，不能顺带改成放松或TENS。', [], '整改名称已确认');

const kneeMobilityRefs = ext.InterventionReference.filter(x => x.Source_URL?.includes('2018.0301') && !x.Source_Note);
add('CLIN-11', 'P2', '来源需拆分', '膝关节活动方法的来源过于笼统',
  [...targets('InterventionReference', kneeMobilityRefs, 'Reference_ID'), ...references(['AFM-0080-JOINT-LIMIT-ROM','AFM-0081-JOINT-LIMIT-ROM'])],
  '屈曲方向松动、髌骨方向性松动、胫股旋转松动等统一引用半月板/关节软骨2018指南。',
  '该指南的主要对象为半月板与软骨病变、尤其术后评估与康复。主动/被动活动参考与具体方向性松动并非同一种来源支持，需要核对具体原段，不能仅从指南标题推导每种手法。',
  '活动练习保留相应来源；具体手法补对应记录/原始资料和适用范围。对骨性阻挡、真正卡锁的提示继续保留，不因活动受限列出所有松动。',
  ['https://pubmed.ncbi.nlm.nih.gov/29385940/']);

add('CLIN-12', 'P2', '单病例方法需谨慎归属', '拇长屈肌/趾长屈肌手法依据不足以支持分开的肌腹疗效',
  references(['AFM-0047-LENGTH-MUSCLE','AFM-0048-LENGTH-MUSCLE','AFM-0027-HALLUX-MANUAL','AFM-0027-LESSER_TOES-MANUAL']),
  '拇长屈肌/趾长屈肌肌腹或肌腱周围手法，主要引用PMC8159326。',
  '原文是一个FHL/FDL共同受累的多方法病例，处理位点主要在远端肌腱邻近，出现即时疼痛增加。当前内注明确单病例，但把它拆成两种肌腹常规方法仍需重新核对部位。',
  '作为病例经验资料可保留；复核肌腹/肌腱方法名称和真实处理位置。主思路不得宣称手法独立疗效，不用来填充所有屈趾疼痛。FHL牵伸队列不能外推为FDL牵伸疗效。没有更直接经验记录时，先保留范围而不扩充理疗清单。',
  ['https://pmc.ncbi.nlm.nih.gov/articles/PMC8159326/','https://pubmed.ncbi.nlm.nih.gov/34170867/']);

add('CLIN-13', 'P2', '测量证据与治疗证据区分', '足内在肌募集资料不能变成紧张或疼痛的疗效依据',
  features(['AFM-0050-TENSION','AFM-0051-TENSION','AFM-0052-TENSION','AFM-0053-STATE','AFM-0008-CONTROL','AFM-0022-EXCESS']),
  '足趾展开/分离活动引用8名健康运动员MRI募集研究。',
  '该研究支持这些组合动作有肌肉募集，未测肌肉过紧、疼痛缓解或跖跗关节稳定修复。目前多条内注明确此点，可以保留，但其方法应放在活动/控制范围。',
  '保留短足、足趾展开与分离控制；治疗分类体现活动/控制，不把MRI作为牵伸疗效证据。拇收肌等不写单肌分离训练；单肌紧张条目的相关性标为临床编辑判断。',
  ['https://pubmed.ncbi.nlm.nih.gov/27690528/']);

const currentPatterns = ext.FindingFeature.filter(x => /^AFM-01(19|20|21|22|23)-/.test(x.Feature_ID));
add('CLIN-14', 'P2', '动作观察需保持中性', '动作模式发现不应天然成为待纠正异常',
  targets('FindingFeature', currentPatterns, 'Feature_ID'),
  '膝向内移动、骨盆下沉、躯干明显前倾、多次制动步等直接接动作控制练习。',
  '这些描述适合观察，但是否有意义取决于任务、速度、症状、既往能力与恢复目标。临床审读不能仅凭姿势或左右差别给出病因或纠正决定。',
  '保留动作名称与已有视频/现场观察入口；检查用途强调比较任务中症状、完成质量及目标需求。替换纯“髋膝踝协同”的重复方法为有来源的具名动作反馈练习，不把足外翻、膝内移或躯干前倾规定为必须纠正。',
  ['https://pubmed.ncbi.nlm.nih.gov/39401870/']);

add('CLIN-15', 'P2', '共用标题与场景不符', '共用安全条目仍写小腿，实际被大腿调用',
  [{ table: '02_ClinicalItem', id: 'CORE-SAF-ACS' }, { table: '02_ClinicalItem', id: 'CORE-SAF-VTE' }, ...purposes(['CORE-SAF-ACS','CORE-SAF-VTE']), ...features(['AFM-0063-ASSESS','AFM-0064-ASSESS']), ...rules(['THIGH-SAF-01','THIGH-SAF-02'])],
  '“急性小腿间室综合征风险筛查”“小腿静脉血栓风险筛查”作为大腿安全规则目标。',
  '提示内容总体方向合理。当前大腿公开风险标题来自规则，本轮没有确认这些小腿标题在大腿界面直接显示；问题在共用目标条目的内部命名与适用范围，后续复用时应消除歧义。',
  '共用条目改为下肢/对应区域的间室及静脉血栓风险；保留急性紧急程度及医学评估提示。不要加入自动判断、按摩试验或新的筛查表单。',
  ['https://www.orthoinfo.org/en/diseases--conditions/compartment-syndrome/','https://www.nice.org.uk/guidance/ng158/chapter/Recommendations']);

add('CLIN-16', 'P2', '具名练习可追溯性', '部分NHS索引能支持动作名称，不能支持整个关联',
  targets('InterventionReference', ext.InterventionReference.filter(x => x.Source_URL?.includes('OP_outpatient_service.asp')), 'Reference_ID'),
  '腘绳肌、鹅足、腓骨头附近肌腱及大腿外侧参考共用RUH练习索引。',
  '原页面确有站立屈膝、桥式、髋外展等具名条目，应保留；本次核对未在索引中找到所有“屈膝等长”“腘绳肌拉伸”的对应条目，且索引没有直接证明每个疼痛部位的治疗关系。',
  '已找到动作补准确条目/视频或对应患者资料链接；等长和拉伸另补直接来源。分别记录动作出处与临床关联判断，不把源页面说成验证了全部部位关系。',
  ['https://www.ruh.nhs.uk/patients/services/physiotherapy/OP_outpatient_service.asp']);

add('CLIN-17', 'P2', '方法菜单可补运动需求', '大腿后侧力量参考覆盖偏基础',
  [...features(['AFM-0091-CAPACITY','AFM-0100-PAIN']), ...purposes(['CORE-CAP-KNEE-FLEX'])],
  '屈膝等长、站立屈膝、桥式为主；运动需求下缺少不同肌长、髋伸及离心承载方法方向。',
  '作为基础思路可保留，若恢复目标为快跑/加速等，只呈现这几种方法仍偏窄。本条是菜单补充建议，不等于所有疼痛都要采用高强度训练。',
  '在对应能力条目中补有来源的髋伸抗阻、长肌长/离心屈膝训练名称；结合需求展示，保留急性损伤、肌腱和术后范围，不增加阶段、剂量、强制进阶或自动准入规则。',
  ['https://pubmed.ncbi.nlm.nih.gov/35164536/','https://pubmed.ncbi.nlm.nih.gov/36650032/']);

const confirmedPolicies = [
  { id: 'POLICY-01', policy: '线下松解与筋膜刀可在肌腹按压或发力痛下保留；需注明对应肌腹，与骨面/肌腱内容分开。', user_confirmed: true },
  { id: 'POLICY-02', policy: 'Compex relax对外名称为肌肉电刺激放松；内部记录NMES relax。', user_confirmed: true },
  { id: 'POLICY-03', policy: '第一跖骨项目为第一跖骨列整体上下活动，非单一第一跖跗关节附属活动。', user_confirmed: true },
];
const reachable = new Set();
const publicItems = new Set();
for (const r of data.tables['01_Region']) {
  const contextIds = data.tables['07_ContextRule'].filter(x => x.rule_type !== 'PROFILE' && x.rule_type !== 'SAFETY' && x.public_group !== 'INTERNAL' && x.public_label && split(x.module_codes).includes(r.module) && data.tables['11_ContextItemMap'].some(m => m.rule_id === x.rule_id && m.status === 'Stable')).map(x => x.rule_id);
  const result = resolveAssessment(data, { region_id: r.region_id, context_rule_ids: contextIds });
  for (const dim of result.dimensions) for (const group of dim.groups) for (const item of group.items) {
    publicItems.add(item.item_id);
    for (const feature of item.possible_findings) reachable.add(feature.feature_id);
  }
}
const mapItem = new Map(data.tables['08_AssessmentFindingMap'].map(x => [x.map_id, x.clinical_item_id]));
const itemNames = new Map(data.tables['02_ClinicalItem'].map(x => [x.item_id,x.display_name]));
const issueIdsFor = (table,id) => issues.filter(x => x.targets.some(t => t.table === table && t.id === id)).map(x => x.id);
const inventory = ext.FindingFeature.map(x => {
  const item = mapItem.get(x.Assessment_Map_ID);
  const refs = ext.InterventionReference.filter(r => r.Feature_ID === x.Feature_ID);
  return { feature_id:x.Feature_ID, item_id:item, item_name:itemNames.get(item), title:x.Finding_Name,
    normal_route_reachable:reachable.has(x.Feature_ID),
    source_class:refs.length ? refs.some(r=>r.Source_URL?.includes('local-records://')) ? '含线下经验来源' : '公开或原库来源' : '评估/再定位/风险提示（非自动缺项）',
    issue_ids:[...new Set([...issueIdsFor('FindingFeature',x.Feature_ID),...issueIdsFor('ClinicalPurpose',item),...refs.flatMap(r=>issueIdsFor('InterventionReference',r.Reference_ID))])],
    review_disposition:'已做文字审读；存在问题按issue_ids整改。无标记不等于疗效认证或临床签核。' };
});

const review = {
  review_date:'2026-10-01', scope:'现有下肢内容的运动康复临床思路审读；未改写生产数据库',
  method:'通读项目、检查目的、发现说明、处理参考、问诊和周围组织；核对38区域实际内容分配；针对关键争议核对公开一手资料与线下记录摘录。不是系统评价，也未逐篇取得所有来源全文。',
  limitations:['旧记录的使用经过并非全部可由摘录还原；不推断单一方法因果疗效。','部分JOSPT全文及NCBI页面访问受限，仅取得摘要、指南推荐片段或来源主题；需原段核验的条目已保留为待核对。','不修模型定位，不接入新身体模块，不新增问诊结果录入或处方规则。'],
  production_hashes:{workbook:data.workbook_sha256,clinical_extension:data.clinical_extension_sha256},
  coverage:{regions:38,clinical_purposes:ext.ClinicalPurpose.length,finding_features:ext.FindingFeature.length,intervention_references:ext.InterventionReference.length,consultation_guides:ext.ConsultationGuide.length,location_guides:ext.LocationGuide.length,normal_route_items:publicItems.size,normal_route_features:reachable.size,priority_groups:issues.reduce((a,x)=>(a[x.priority]=(a[x.priority]||0)+1,a),{})},
  confirmed_policies:confirmedPolicies, issues, finding_inventory:inventory,
};
await fs.writeFile('knowledge/review/lower_limb_clinical_expert_review_v1.json',JSON.stringify(review,null,2)+'\n');
const md = [
  '# 下肢内容临床思路审核', '', '> 2026-10-01｜审核报告，生产数据库未改。', '',
  '## 结论', '',
  '**现有内容仍需整改，不能因结构检查通过就称临床内容已经完成。** 本次通读123条检查目的、264条发现、281条处理参考、101条问诊及19组部位说明，并核对38个区域的实际内容分配。普通展示及全部非风险活动关联可访问105个项目、231条发现；其余含历史任务、同部位隐藏项及独立安全项，另行记录，未混算为界面缺项。', '',
  `共归纳${issues.length}组问题：${review.coverage.priority_groups.P1}组优先整改、${review.coverage.priority_groups.P2}组随后整改。分组数不是错误行数，同一行可能涉及多个问题。`, '',
  '审核形式是临床思路审读与重点来源核验。没有逐篇完成281条参考的全文系统评价，也不修改数据库“待临床审核”状态。未标记条目表示本轮没有提出新的整改意见，不是单项疗效认证。', '',
  '## 用户已确认的边界', '', ...confirmedPolicies.map(x=>'- '+x.policy), '',
  '## 优先整改', '',
  '| 编号 | 优先级 | 问题 | 涉及行数 |', '|---|---|---|---:|',
  ...issues.map(x=>`| ${x.id} | ${x.priority} | ${x.title} | ${x.targets.length} |`), '',
  '## 逐组意见', '',
  ...issues.flatMap(x=>[`### ${x.id} · ${x.title}`, '', `**${x.priority}｜${x.category}｜${x.state}**`, '', `目前：${x.current}`, '', `审核意见：${x.reason}`, '', `整改建议：${x.recommendation}`, '',
    `对应条目：${x.targets.map(t=>'`'+t.table+'/'+t.id+'`').join('、')||'按部位补充新条目'}`, '',
    ...(x.evidence.length ? ['依据/核对资料：'+x.evidence.map((url,i)=>`[资料${i+1}](${url})`).join('、'), ''] : [])]),
  '## 可保留的主要内容', '',
  '- 肌肉状态、活动范围、力量输出和动作表现分层有意义；保持区别，避免同一检查重复命名。',
  '- 跟腱中段与止点分开，止点采用平地/有限背屈范围的参考，现有分类方向合理。低压缩研究的组合内容不拆成单项疗效宣称。[止点RCT](https://doi.org/10.1136/bjsports-2024-109138)。',
  '- 足跟垫、足底筋膜、舟骨/胫骨后肌止点、第五跖骨基底/腓骨短肌止点、跖板及籽骨分别查看，明显优于通用局部敏感条目。相关骨性风险和新发形态变化继续单列。',
  '- 髌周参考的髋膝抗阻与个体化髌骨贴扎可保留在髌股疼痛范围；手法可作支持方法。[2024最佳实践指导](https://pubmed.ncbi.nlm.nih.gov/39401870/)。',
  '- 线下松解、MET、筋膜刀及肌肉电刺激放松保留经验出处，明确肌腹及对应表现；无需因为缺少某单项RCT就整批删除。',
  '- 未明确组织的活动末端疼痛可给出分组织查看/重新定位建议；包块、骨面局灶痛、明显形态变化与神经血管表现保留评估提示，不能为“齐全”硬加理疗。',
  '- 问诊保持提示为什么问、能了解什么、帮助看什么；不收集回答，不替康复师判断。恢复目标仍用于对照目标所需能力与当前能力。', '',
  '## 实施顺序', '',
  '1. **纠正确定错误**：问诊区域绑定、第一跖骨列检查对象、电刺激名称、共用风险条目标题。同步主表与扩展表，保留ID。',
  '2. **纠正来源及范围**：逐条修13个旧肌肉发现的19条手法/拉伸参考；其余旧髋膝能力与历史任务参考补范围。替换不相干的小腿前侧解剖引用，拆清动作出处与疗效/经验来源。',
  '3. **补临床覆盖并细化方法菜单**：髌骨上下缘肌腱内容；具体力量/活动/动作名称；深层肌检查与力量标题；48条问诊用途。优先复用现有条目，不扩大疾病教学。',
  '4. **处理经验和弱证据边界**：复核FHL/FDL手法真实处理位置；保留足内在肌募集方法但不冒充止痛/韧带修复证据；按目标需求补大腿后侧训练参考。拿不准且涉及线下经验的具体条目集中向用户核实。',
  '5. **最小充分核对**：直接用数据库和resolver核对修改行、对应区域和未受影响方法；类型与构建检查即可。保持模型定位专项暂停。', '',
  '## 覆盖与追踪', '',
  '全部264条发现的ID、当前展示可达性、相关问题编号，见 [机器清单](../knowledge/review/lower_limb_clinical_expert_review_v1.json)。普通展示可达性采用全部有效非风险活动关联的并集；独立安全项不计为普通可达内容。', '',
  '生产主库/扩展库哈希已记录在机器清单，便于后续判断整改前后来源是否变化。临床记录的患者姓名、联系方式及可识别细节未导出。', '',
  '### 本次公开来源核验的限制', '', ...review.limitations.map(x=>'- '+x), '',
];
await fs.writeFile('docs/LOWER_LIMB_CLINICAL_EXPERT_REVIEW.md',md.join('\n'));
console.log(JSON.stringify({coverage:review.coverage,groups:issues.map(x=>({id:x.id,targets:x.targets.length}))},null,2));
