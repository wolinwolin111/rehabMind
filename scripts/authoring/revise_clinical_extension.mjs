import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { FileBlob, SpreadsheetFile } = require('@oai/artifact-tool');
if (!process.argv.includes('--write')) {
  console.log('Usage: node scripts/authoring/revise_clinical_extension.mjs --write');
  process.exit(0);
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = path.join(root, 'build/authoring/clinical_extension_rows.json');
const output = path.join(root, 'knowledge/RehabMind_ClinicalExtension_v1.0_Draft.xlsx');
const runtime = JSON.parse(await fs.readFile(path.join(root, 'build/knowledge/runtime.json'), 'utf8'));
const specs = JSON.parse(await fs.readFile(source, 'utf8'));
const bySheet = Object.fromEntries(specs.map(([name, headers, rows]) => [name, { headers, rows }]));
const itemById = new Map(runtime.tables['02_ClinicalItem'].map(row => [row.item_id, row]));
const mapByItem = new Map(runtime.tables['08_AssessmentFindingMap'].map(row => [row.clinical_item_id, row.map_id]));
const pfp = 'https://doi.org/10.2519/jospt.2019.0302';
const mobility = 'https://doi.org/10.2519/jospt.2018.0301';
const draft = '待临床审核';
const purposeArea = {
  'CORE-MUS-RF': '膝前', 'CORE-MUS-VL': '膝前', 'CORE-MUS-VM': '膝前',
  'CORE-MUS-VI': '膝前', 'CORE-MUS-BF': '膝后', 'CORE-MUS-ST': '膝内侧',
  'CORE-MUS-SM': '膝后', 'KNEE-MUS-LAT-CHAIN': '膝外侧',
  'KNEE-LT-PATELLA': '膝前', 'KNEE-LT-INFRAPAT': '膝前',
  'KNEE-LT-DIFFUSE': '膝周', 'CORE-MUS-GASTROC': '膝后/踝足',
};

function upsert(sheetName, key, record) {
  const { headers, rows } = bySheet[sheetName];
  const values = headers.map(header => record[header] ?? '');
  const at = rows.findIndex(row => row[0] === key);
  if (at >= 0) rows[at] = values;
  else rows.push(values);
}
function purpose(id, why, focus, sourceUrl = pfp) {
  const item = itemById.get(id);
  if (!item) throw new Error(`Missing item ${id}`);
  const existing = bySheet.ClinicalPurpose.rows.find(row => row[0] === id);
  upsert('ClinicalPurpose', id, { Item_ID: id, Item_Name: item.display_name,
    Clinical_Purpose: why, Assessment_Focus: focus, Module: purposeArea[id] || existing?.[4] || '膝', Source_URL: sourceUrl, Review_Status: draft });
}
function feature(itemId, suffix, name, signs, meaning, sourceUrl = pfp) {
  const map = mapByItem.get(itemId);
  if (!map) throw new Error(`Missing map for ${itemId}`);
  const id = `${map}-${suffix}`;
  upsert('FindingFeature', id, { Feature_ID: id, Assessment_Map_ID: map,
    Finding_Name: name, Finding_Feature: signs, Finding_Interpretation: meaning,
    Source_URL: sourceUrl, Review_Status: draft });
  return id;
}
function reference(featureId, suffix, goal, methods, sourceUrl = pfp) {
  const id = `${featureId}-${suffix}`;
  upsert('InterventionReference', id, { Reference_ID: id, Feature_ID: featureId,
    Treatment_Goal: goal, Treatment_Method: methods.join('；'), Progression: '',
    Source_URL: sourceUrl, Review_Status: draft });
}

// Clinical purpose is item specific; the short check focus is displayed in the app.
const purposes = [
  ['CORE-MUS-RF', '股直肌跨髋、膝两关节；长度变化可能影响膝屈与髋伸，并关联膝前负荷和髋膝协同。', '比较拉长反应、侧差、膝前症状与骨盆代偿。'],
  ['CORE-MUS-VI', '股中间肌位于股四头肌深层；膝屈受限或大腿前侧深层不适时，可补充查看局部状态。', '查看前大腿深层张力、膝屈拉长反应与侧差。'],
  ['KNEE-MUS-HIPFLEX', '髋屈肌群的长度和髋前侧状态，可能影响髋伸动作及下肢任务中的代偿。', '比较髋伸时的前侧牵拉、骨盆代偿与侧差。'],
  ['KNEE-CAP-HIPEXT', '髋伸输出参与起立、上台阶和减速；可与膝部负荷任务表现一起查看。', '比较髋伸抗阻、侧差及相关任务中的输出。'],
  ['KNEE-CAP-HIPABD', '髋外展和外旋输出参与单腿任务中的骨盆与下肢控制。', '比较髋外展/外旋抗阻与单腿任务表现。'],
  ['CORE-CAP-KNEE-FLEX', '膝屈力量反映腘绳肌输出能力，与后侧肌群长度和局部敏感分开查看。', '比较等长膝屈力量、侧差及任务中的后侧链输出。'],
  ['CORE-MUS-SOLEUS', '比目鱼肌跨踝而不跨膝；屈膝位背屈或提踵变化，可帮助区分小腿后侧相关线索。', '查看屈膝位背屈、局部反应与提踵表现。'],
  ['KNEE-MUS-ADD', '内收肌群的长度和局部状态可与大腿内侧及膝内侧牵扯感对照。', '比较内收肌群拉长、局部反应与侧差。'],
  ['KNEE-CAP-PES', '鹅足相关肌群的主动输出与鹅足区局部压痛是不同线索。', '查看相关收缩/抗阻表现及与局部反应的差异。'],
  ['CORE-CAP-PF', '跖屈输出影响提踵和步行推进，可与膝部任务中的下肢负荷表现对照。', '比较单腿提踵高度、质量、侧差及相关任务。'],
  ['KNEE-MUS-POPLIT', '腘肌邻近膝后外侧；其局部状态可与伸膝末端和胫骨旋转表现对照。', '查看膝后外侧局部反应与末端旋转活动。'],
  ['CORE-CAP-EV', '足踝外翻输出参与侧向稳定任务，可与膝外侧链表现一并查看。', '比较外翻抗阻力量、侧差和相关任务表现。'],
  ['KNEE-ROM-EXT', '伸膝受限会改变站立、步行及终末伸膝任务；先区分主动与被动受限。', '比较主动/被动伸膝、末端感觉、侧差和症状。', mobility],
  ['KNEE-ROM-FLEX', '屈膝范围关系到下蹲、上下楼等任务，也可与前侧软组织拉长反应对照。', '比较主动/被动屈膝、末端感觉、侧差和症状。', mobility],
  ['KNEE-JNT-PF', '髌骨方向性活动可与膝前/髌周症状和屈伸活动表现对照。', '比较髌骨上下及内外侧活动、侧差与症状。', pfp],
  ['KNEE-JNT-TIBROT', '胫骨旋转参与膝屈伸末端活动；方向性差异可与末端症状对照。', '比较屈伸末端的胫骨旋转、侧差和症状。', mobility],
  ['KNEE-JNT-PROXTF', '近端胫腓关节邻近腓骨头；其活动可与膝外侧局部和末端动作表现对照。', '比较腓骨头方向性活动、侧差与局部反应。', mobility],
  ['KNEE-LT-MEDIAL', '内侧关节线、鹅足和后内侧位置相近；分区查看可使局部线索更清楚。', '分区查看内侧关节线、鹅足与后内侧压痛、肿胀和敏感。'],
  ['CORE-MUS-SART', '缝匠肌参与鹅足区；其长度和局部状态可与膝内下方不适对照。', '查看缝匠肌拉长、局部反应与鹅足区定位。'],
  ['CORE-MUS-GRAC', '股薄肌跨髋、膝两关节；长度和局部状态可与内侧牵扯感对照。', '比较股薄肌拉长、内侧局部反应与侧差。'],
  ['KNEE-LT-LATERAL', '外侧关节线、腓骨头及周围软组织相邻；分区定位可区分不同局部反应。', '分区查看外侧关节线、腓骨头及软组织的压痛和敏感。'],
  ['KNEE-LT-POST', '膝后局部反应可与屈伸末端、腘绳肌及近端小腿后侧线索对照。', '分区查看腘窝、后内外侧与近端小腿的压痛、肿胀和敏感。'],
  ['CORE-CAP-KNEE-EXT', '膝伸力量反映整体输出；与股四头肌主动终末伸膝的募集表现分开查看。', '比较等长膝伸力量、疼痛限制与侧差。'],
  ['CORE-CAP-QUAD-RECRUIT', '主动终末伸膝可显示股四头肌募集与伸膝滞后，不能由整体力量值代替。', '观察股四头肌收缩、终末伸膝及伸膝滞后。'],
  ['KNEE-TASK-DYN', '实际任务可呈现静态检查未显示的负荷分配与髋膝踝协同问题。', '观察诱发任务中的稳定性、负荷分配和动作阶段。'],
  ['CORE-MUS-VL', '股外侧肌邻近髌骨外侧缘；局部张力或拉长反应可与膝前外侧不适和屈膝活动对照。', '比较前外侧张力、屈膝拉长反应与髌外侧邻近症状。'],
  ['CORE-MUS-VM', '股内侧肌远端邻近髌骨内侧；局部状态与主动终末伸膝募集是两类线索。', '查看股内侧远端张力、局部敏感与侧差。'],
  ['KNEE-MUS-LAT-CHAIN', '阔筋膜张肌及大腿外侧软组织与膝外侧区域相连；可与外侧牵扯感和单腿任务表现对照。', '比较髋与大腿外侧拉长、敏感及单腿任务表现。'],
  ['CORE-MUS-BF', '股二头肌位于腘绳肌外侧；长度和局部反应可与膝后外侧不适及伸膝末端对照。', '比较后外侧主动膝伸拉长、局部反应与侧差。'],
  ['CORE-MUS-GASTROC', '腓肠肌跨膝与踝；伸膝位背屈和局部拉长反应可与膝后牵扯及踝活动对照。', '比较伸膝位背屈、小腿后侧反应与提踵表现。'],
  ['CORE-MUS-SM', '半膜肌位于腘绳肌后内侧深层；拉长和局部反应可与膝后内侧不适对照。', '比较后内侧深层主动膝伸拉长与局部反应。'],
  ['CORE-MUS-ST', '半腱肌参与鹅足结构；其拉长或局部反应可与膝内下方不适区分。', '比较后内侧主动膝伸拉长与鹅足邻近反应。'],
  ['KNEE-LT-PATELLA', '髌周区域可分别出现压痛、肿胀和刺激敏感；这些表现可与膝前负荷任务对照。', '分区查看髌周压痛、肿胀和活动时反应。'],
  ['KNEE-LT-INFRAPAT', '髌腱、脂肪垫与胫骨结节邻近；定位各处反应有助于区分膝前下方的症状线索。', '分别查看髌腱、脂肪垫、髌下缘和胫骨结节的局部反应。'],
  ['KNEE-LT-DIFFUSE', '膝周定位不清时，分区查看压痛与肿胀可帮助找到更具体的关注区域。', '分区查看膝周压痛、肿胀与活动相关反应。'],
];
for (const row of purposes) purpose(...row);

const muscles = [
  ['CORE-MUS-VI', '股中间肌深层', '膝屈时前大腿深层牵拉或局部张力与对侧不同', ['前大腿软组织手法松解', '股四头肌拉伸']],
  ['KNEE-MUS-HIPFLEX', '髋前侧', '髋伸时前侧牵拉受限或出现明显骨盆代偿', ['髋屈肌群手法松解', '髋屈肌群拉伸', 'MET']],
  ['CORE-MUS-SOLEUS', '比目鱼肌', '屈膝位背屈受限，伴小腿后侧拉长反应或局部张力改变', ['比目鱼肌手法松解', '屈膝位小腿后侧拉伸']],
  ['KNEE-MUS-ADD', '内收肌群', '髋外展拉长时内侧牵拉受限或局部张力改变', ['内收肌群手法松解', '内收肌拉伸', 'MET']],
  ['KNEE-MUS-POPLIT', '膝后外侧', '膝伸直或胫骨旋转末端伴后外侧局部紧张', ['膝后外侧软组织手法松解', '主动膝屈伸与旋转活动']],
  ['CORE-MUS-SART', '缝匠肌', '髋膝组合拉长时内下方牵拉受限或局部张力改变', ['缝匠肌手法松解', '缝匠肌拉伸']],
  ['CORE-MUS-GRAC', '股薄肌', '髋外展、膝伸组合拉长时内侧牵拉受限', ['股薄肌手法松解', '股薄肌拉伸']],
];
for (const [id, area, signs, methods] of muscles) {
  const limit = feature(id, 'LENGTH', '拉长或活动受限', signs, `可与${area}的长度或软组织活动表现对照。`);
  reference(limit, '1', '改善长度与活动', methods);
  const sensitive = feature(id, 'SENSITIVITY', '局部敏感', `${area}触诊或相关活动时出现局部敏感反应`, '记录局部刺激反应，并与动作和负荷表现对照。');
  reference(sensitive, '1', '缓解局部不适', ['调整诱发动作负荷', '低刺激主动活动']);
}

const capacity = [
  ['KNEE-CAP-HIPEXT', '髋伸输出不足', '髋伸抗阻或相关任务中出现输出侧差', ['髋伸抗阻训练', '臀桥或髋铰链训练']],
  ['KNEE-CAP-HIPABD', '髋外展/外旋输出不足', '髋外展或外旋抗阻与单腿任务出现侧差', ['髋外展/外旋抗阻训练', '单腿任务控制训练']],
  ['CORE-CAP-KNEE-FLEX', '膝屈力量不足', '等长膝屈测试中力量或疼痛限制与对侧不同', ['腘绳肌等长训练', '膝屈抗阻训练']],
  ['KNEE-CAP-PES', '鹅足相关肌群输出不足', '相关肌群收缩或抗阻时输出与对侧不同', ['相关肌群针对性抗阻训练']],
  ['CORE-CAP-PF', '跖屈输出不足', '单腿提踵高度、质量或完成能力与对侧不同', ['跖屈抗阻训练', '提踵训练']],
  ['CORE-CAP-EV', '足踝外翻力量不足', '固定体位外翻抗阻时力量或疼痛限制与对侧不同', ['足踝外翻抗阻训练', '侧向稳定任务训练']],
];
for (const [id, name, signs, methods] of capacity) {
  const found = feature(id, 'CAPACITY', name, signs, '与局部张力和压痛分别记录，供处理方向参考。');
  reference(found, '1', '改善对应输出', methods);
}

const rom = [
  ['KNEE-ROM-EXT', '伸膝', '主动或被动伸膝范围较对侧受限', ['膝关节伸直方向松动', '主动终末伸膝活动', '腘绳肌或腓肠肌拉伸'], '主动与被动末端的差异，可与股四头肌募集及后侧组织拉长表现对照。'],
  ['KNEE-ROM-FLEX', '屈膝', '主动或被动屈膝范围较对侧受限', ['膝关节屈曲方向松动', '主动屈膝活动', '股四头肌拉伸'], '可与股直肌拉长反应、髌股活动和下蹲任务对照。'],
  ['KNEE-JNT-PF', '髌骨方向性', '髌骨上下或内外侧活动与对侧不同', ['髌骨方向性松动', '主动膝屈伸活动'], '可与髌周局部反应及膝屈伸末端症状对照。'],
  ['KNEE-JNT-TIBROT', '胫骨旋转', '屈伸末端胫骨旋转活动与对侧不同', ['胫股关节方向性松动', '主动膝屈伸与旋转活动'], '可与屈伸末端方向性限制和膝后外侧反应对照。'],
  ['KNEE-JNT-PROXTF', '近端胫腓关节', '腓骨头方向性活动与对侧不同', ['近端胫腓关节松动', '主动膝屈伸活动'], '可与腓骨头邻近压痛和膝外侧局部反应对照。'],
];
for (const [id, area, signs, methods, meaning] of rom) {
  const limited = feature(id, 'LIMIT', `${area}活动受限`, signs, meaning, mobility);
  reference(limited, '1', '改善方向性活动', methods, mobility);
  const symptoms = feature(id, 'SYMPTOM', `${area}末端症状`, `${area}末端活动出现局部症状反应，范围可未受限`, `可与${area}活动范围、局部组织反应及负荷任务分别对照。`, mobility);
  reference(symptoms, '1', '改善活动耐受', ['可耐受范围内的主动活动', '相关任务负荷调整'], mobility);
}

const local = [
  ['KNEE-LT-MEDIAL', '膝内侧', '内侧关节线、鹅足或后内侧'],
  ['KNEE-LT-LATERAL', '膝外侧', '外侧关节线、腓骨头或外侧软组织'],
  ['KNEE-LT-POST', '膝后侧', '腘窝、后内外侧或近端小腿'],
];
for (const [id, area, subareas] of local) {
  const tender = feature(id, 'TENDERNESS', '局部压痛', `${subareas}压迫时出现局部压痛`, `记录${area}具体压痛位置与活动表现。`);
  reference(tender, '1', '缓解局部不适', ['调整诱发动作负荷', '局部贴扎辅助']);
  const swelling = feature(id, 'SWELLING', '局部肿胀', `${area}可见或可触及肿胀、热感`, '记录肿胀范围和活动时变化。');
  reference(swelling, '1', '管理局部反应', ['活动与负荷调整', '肿胀管理']);
  const sensitive = feature(id, 'SENSITIVITY', '组织敏感', `${area}局部刺激或活动时症状反应较明显`, '记录刺激耐受与相关任务表现。');
  reference(sensitive, '1', '降低刺激反应', ['诱发任务负荷调整', '局部贴扎辅助', '低刺激主动活动']);
}

// Replace broad descriptions in the knee preview with location or task specific text.
const existingMuscles = [
  ['CORE-MUS-VL', '股外侧肌', '大腿前外侧张力或膝屈拉长反应与对侧不同', ['股外侧肌手法松解', '股四头肌前外侧拉伸']],
  ['CORE-MUS-VM', '股内侧肌', '大腿前内侧局部张力或膝屈拉长反应与对侧不同', ['股内侧肌手法松解', '股四头肌拉伸']],
  ['CORE-MUS-BF', '股二头肌', '后外侧腘绳肌主动膝伸时拉长受限或局部张力改变', ['股二头肌手法松解', '后外侧腘绳肌拉伸']],
  ['CORE-MUS-ST', '半腱肌', '后内侧腘绳肌主动膝伸时拉长受限或局部张力改变', ['半腱肌手法松解', '后内侧腘绳肌拉伸']],
  ['CORE-MUS-SM', '半膜肌', '后内侧深层主动膝伸时拉长受限或局部张力改变', ['半膜肌手法松解', '后内侧腘绳肌拉伸']],
  ['KNEE-MUS-LAT-CHAIN', '髋与大腿外侧链', '髋与大腿外侧拉长或局部张力表现与对侧不同', ['阔筋膜张肌及相关软组织手法松解', '髋外侧主动活动']],
];
for (const [id, area, signs, methods] of existingMuscles) {
  const tension = feature(id, 'TENSION', '张力或拉长反应异常', signs, `可与${area}的活动和局部反应对照。`);
  reference(tension, '1', '改善软组织活动', [methods[0]]);
  reference(tension, '2', '改善拉长与活动', [methods[1]]);
  const sensitivity = feature(id, 'SENSITIVITY', '局部敏感', `${area}触诊或相关活动时出现局部敏感反应`, '记录局部刺激反应，并与动作和负荷表现对照。');
  reference(sensitivity, '1', '缓解局部不适', ['调整诱发动作负荷', '低刺激主动活动']);
}
const calfTension = feature('CORE-MUS-GASTROC', 'TENSION', '拉长或张力反应异常', '伸膝位踝背屈时小腿后侧拉长受限，或腓肠肌局部张力与对侧不同', '与屈膝位背屈和提踵表现对照。');
reference(calfTension, '1', '改善软组织活动', ['腓肠肌手法松解']);
reference(calfTension, '2', '改善长度与活动', ['伸膝位腓肠肌拉伸']);
const calfSensitive = feature('CORE-MUS-GASTROC', 'SENSITIVITY', '局部敏感', '腓肠肌触诊或提踵时局部刺激反应明显', '记录敏感位置与活动和负荷的关系。');
reference(calfSensitive, '1', '缓解局部不适', ['调整诱发动作负荷', '低刺激主动活动']);
const rfSensitive = feature('CORE-MUS-RF', 'SENSITIVITY', '局部敏感', '股直肌触诊或拉长时局部刺激反应明显', '记录敏感位置和膝前活动反应。');
reference(rfSensitive, '1', '缓解局部不适', ['调整诱发动作负荷', '低刺激主动活动']);

for (const [id, place] of [
  ['KNEE-LT-PATELLA', '髌周'], ['KNEE-LT-INFRAPAT', '髌下'], ['KNEE-LT-DIFFUSE', '膝周']
]) {
  const tender = feature(id, 'TENDERNESS', '局部压痛', `${place}分区压迫时出现局部压痛`, `记录${place}具体位置与活动表现。`);
  reference(tender, '1', '缓解局部不适', ['调整诱发动作负荷', '局部贴扎辅助']);
  const swelling = feature(id, 'SWELLING', '局部肿胀', `${place}可见或可触及肿胀、热感`, '记录肿胀范围及活动时变化。');
  reference(swelling, '1', '管理局部反应', ['活动与负荷调整', '肿胀管理']);
  const sensitivity = feature(id, 'SENSITIVITY', '组织敏感', `${place}局部刺激或活动时症状反应较明显`, '记录刺激耐受与相关任务表现。');
  reference(sensitivity, '1', '降低刺激反应', ['诱发任务负荷调整', '局部贴扎辅助', '低刺激主动活动']);
}
for (const [id, name, signs, methods] of [
  ['CORE-CAP-KNEE-EXT', '膝伸力量不足', '等长膝伸测试中输出或疼痛限制与对侧不同', ['膝伸等长训练', '股四头肌抗阻训练']],
  ['CORE-CAP-QUAD-RECRUIT', '主动终末伸膝不足', '股四头肌主动收缩或终末伸膝出现伸膝滞后', ['股四头肌主动募集训练', '终末伸膝训练']],
  ['KNEE-TASK-DYN', '任务中动态控制不足', '下楼、下蹲或单腿任务中出现稳定性或负荷分配差异', ['相关任务动作控制训练', '髋膝踝协同训练']],
]) {
  const found = feature(id, 'CAPACITY', name, signs, '与肌肉长度和局部反应分别查看。');
  reference(found, '1', '改善对应任务表现', methods);
}

// The former broad knee references were extra goals on sensitivity; remove only
// those rows. The new location-specific reference remains available.
for (const id of ['AFM-0079-SENSITIVITY-2']) {
  const at = bySheet.InterventionReference.rows.findIndex(row => row[0] === id);
  if (at >= 0) bySheet.InterventionReference.rows.splice(at, 1);
}

// Local-tissue revision: location alone must not prescribe a modality.
const urls = {
  tendon: 'https://doi.org/10.1136/bjsports-2020-103403',
  fatpad: 'https://www.mskdorset.nhs.uk/knee-pain/knee-pain-hoffas-fat-pad-syndrome/',
  pes: 'https://www.orthoinfo.org/diseases--conditions/pes-anserine-knee-tendon-bursitis/',
  pesTape: 'https://doi.org/10.1080/00913847.2016.1199251',
  tens: 'https://doi.org/10.1136/bmjopen-2021-051073',
  pesPT: 'https://pubmed.ncbi.nlm.nih.gov/27512249/',
  skin: 'https://www.northerncarealliance.nhs.uk/patient-information/patient-leaflets/pain-service-desensitisation-techniques',
  swelling: 'https://www.worcsacute.nhs.uk/leaflets/knee-soft-tissue-injury/',
  compression: 'https://www.chelwest.nhs.uk/your-visit/patient-leaflets/medicine-services/knee-injury-information-and-advice',
  knee: 'https://www.nhs.uk/symptoms/knee-pain/',
  posterior: 'https://www.nhs.uk/conditions/bakers-cyst/',
  itb: 'https://doi.org/10.1186/s13018-020-01713-7',
};
const localIds = ['KNEE-LT-PATELLA', 'KNEE-LT-INFRAPAT', 'KNEE-LT-MEDIAL', 'KNEE-LT-LATERAL', 'KNEE-LT-POST', 'KNEE-LT-DIFFUSE'];
const localMaps = new Set(localIds.map(id => mapByItem.get(id)));
const removed = new Set(bySheet.FindingFeature.rows.filter(row => localMaps.has(row[1])).map(row => row[0]));
for (const name of ['FindingFeature', 'InterventionReference']) {
  const rows = bySheet[name].rows;
  const key = name === 'FindingFeature' ? 0 : 1;
  rows.splice(0, rows.length, ...rows.filter(row => !removed.has(row[key])));
}
const audit = [];
function method(id, suffix, label, methods, url, note) {
  reference(id, suffix, label, methods, url);
  audit.push({ reference_id: `${id}-${suffix}`, feature_id: id, methods, source_url: url, evidence_note: note });
}
function skin(id, area) {
  const f = feature(id, 'SKIN', '皮肤触碰敏感', `${area}轻触、衣物摩擦或不同材质接触时不适`, '皮肤触碰反应与深部压痛分开查看。', urls.skin);
  method(f, '1', '触觉脱敏', ['分级触碰', '不同材质刺激', '轻柔按摩'], urls.skin, '成人疼痛服务临床资料；适用于触觉敏感，不外推至所有深部压痛。');
}
function swelling(id, area) {
  const f = feature(id, 'TRAUMATIC-SWELLING', '软组织损伤后肿胀', `${area}在明确软组织损伤后出现肿胀`, '与原因不明的关节积液、红热及膝后包块分开查看。', urls.swelling);
  method(f, '1', '体位与加压', ['患肢抬高', '弹性加压'], `${urls.swelling}\n${urls.compression}`, '普通软组织损伤的患者指导资料；不能声称证据强于冷疗或加速愈合。加压需结合循环、皮肤情况，不用于原因未明的急性肿胀。');
  method(f, '2', '主动活动', ['踝泵运动'], urls.swelling, '损伤后肿胀的活动选项，不用于原因未明的急性小腿肿胀。');
}
for (const row of [
  ['KNEE-LT-PATELLA', '髌周疼痛、皮肤触碰敏感和损伤后肿胀对应不同线索，需分开查看。', '髌周定位、负重屈膝反应、皮肤触感及肿胀。', pfp],
  ['KNEE-LT-INFRAPAT', '髌腱、脂肪垫与胫骨结节位置相邻，但承载和受压方式不同。', '髌腱承载反应、脂肪垫受压及胫骨结节定位。', `${urls.tendon}\n${urls.fatpad}`],
  ['KNEE-LT-MEDIAL', '鹅足区与内侧关节线位置接近，分区定位有助于区分软组织和关节相关线索。', '鹅足区、内侧关节线定位及皮肤触感。', urls.pes],
  ['KNEE-LT-LATERAL', '外侧股骨髁、关节线与腓骨头邻近，疼痛位置和运动关联各不相同。', '外侧股骨髁、关节线、腓骨头定位及皮肤触感。', `${urls.itb}\n${urls.knee}`],
  ['KNEE-LT-POST', '膝后压痛、包块和小腿肿胀涉及不同组织，局部位置不能单独确定处理方向。', '腘窝包块、后侧压痛、近端小腿肿胀及皮肤触感。', urls.posterior],
  ['KNEE-LT-DIFFUSE', '膝周不适定位不清时，区分肿胀、皮肤触碰与深部活动相关表现。', '肿胀范围、皮肤触感及最明显的不适位置。', urls.knee],
]) purpose(...row);

let f = feature('KNEE-LT-PATELLA', 'PFP', '髌周负重屈膝不适', '下蹲、上下楼等负重屈膝活动时出现髌周或髌后不适', '以下为髌股疼痛情境的参考，单独髌周压痛不能确定来源。', pfp);
method(f, '1', '贴扎', ['个体化髌骨贴扎'], pfp, '2019髌股疼痛指南中的短期辅助，结合运动；不等同通用肌内效贴。');
method(f, '2', '训练', ['股四头肌抗阻训练', '髋外展与外旋抗阻训练'], pfp, '髋膝运动治疗方向，不自动指定剂量。');
swelling('KNEE-LT-PATELLA', '髌周');
skin('KNEE-LT-PATELLA', '髌周');
f = feature('KNEE-LT-INFRAPAT', 'TENDON', '髌腱承载相关不适', '跳跃、落地或膝伸抗阻时不适集中于髌腱区域', '肌腱训练参考对应髌腱病情境，与脂肪垫受压和胫骨结节反应分开。', urls.tendon);
method(f, '1', '抗阻训练', ['股四头肌等长训练', '膝伸慢速抗阻训练'], urls.tendon, '髌腱病RCT的渐进肌腱负荷方案组成部分；不能据此证明单项动作独立疗效。');
method(f, '2', '储能训练', ['跳跃与落地训练'], urls.tendon, '肌腱储能训练选项，阶段与负荷由康复师评估，产品不自动安排。');
f = feature('KNEE-LT-INFRAPAT', 'FATPAD', '脂肪垫受压相关不适', '髌腱两侧受压或膝过伸时出现髌下不适', '处理参考对应脂肪垫受压情境。', urls.fatpad);
method(f, '1', '贴扎', ['脂肪垫减压贴扎'], urls.fatpad, 'NHS临床指导资料，直接高质量疗效证据有限，不能声称强于冷疗。');
method(f, '2', '动作控制', ['伸膝末端控制训练', '膝过伸控制训练'], urls.fatpad, '针对过伸控制，不是增加过伸幅度。');
feature('KNEE-LT-INFRAPAT', 'TUBERCLE', '胫骨结节局部反应', '不适集中于胫骨结节，而非髌腱两侧', '结合年龄、发育阶段及运动史查看，不能直接套用成人髌腱训练。', urls.knee);
f = feature('KNEE-LT-MEDIAL', 'PES', '鹅足区局部不适', '内侧关节线下方鹅足区压痛，可伴上下楼不适或局部肿胀', '以下为鹅足肌腱滑囊相关情境的参考，与内侧关节线压痛分开。', urls.pes);
method(f, '1', '贴扎', ['鹅足区肌内效贴贴扎'], urls.pesTape, '56人随机试验，46人完成、失访不均；慢性鹅足肌腱滑囊病对象，证据有限，不泛化至所有内侧压痛。');
method(f, '2', '理疗辅助', ['治疗性超声', '经皮神经电刺激（TENS）'], `${urls.pes}\n${urls.pesPT}\n${urls.tens}`, '超声为AAOS所列选项。鹅足研究使用热敷+超声+TENS，不能分离单项效果。跨病种TENS证据支持使用中或紧接使用后的镇痛，不证明组织修复或鹅足特异疗效。');
method(f, '3', '伴腘绳肌拉长受限', ['腘绳肌拉伸'], urls.pes, '在相关肌群拉长受限情境下列为参考，不因压痛自动关联拉伸。');
feature('KNEE-LT-MEDIAL', 'JOINTLINE', '内侧关节线压痛', '压痛主要位于内侧关节线', '与鹅足区不适分开查看，结合关节活动及专项检查。', urls.pes);
skin('KNEE-LT-MEDIAL', '膝内侧');
f = feature('KNEE-LT-LATERAL', 'ITB', '外侧股骨髁运动相关不适', '跑步或反复屈伸时不适集中于外侧股骨髁附近', '以下为髂胫束综合征情境的参考，与外侧关节线及腓骨头压痛分开。', urls.itb);
method(f, '1', '髋部训练', ['髋外展抗阻训练', '髋外旋抗阻训练'], urls.itb, '24名女性跑者的小样本试验；组内改善、总体组间结论不确定，不宣称优于其他方法。');
feature('KNEE-LT-LATERAL', 'LOCALISE', '外侧关节线或腓骨头压痛', '局部压痛位于外侧关节线或腓骨头邻近', '结合关节活动、肌腱附着及神经相关表现查看。', urls.knee);
skin('KNEE-LT-LATERAL', '膝外侧');
feature('KNEE-LT-POST', 'TENDERNESS', '膝后深部压痛', '腘窝或后内外侧深部压迫时不适', '与腘绳肌、小腿肌群拉长和收缩表现对照，压痛本身不能确定组织来源。', urls.posterior);
feature('KNEE-LT-POST', 'SWELLING', '膝后包块或肿胀', '膝后可见或可触及包块、肿胀，可伴小腿症状', '突发小腿肿痛、红热需排查血栓等原因。', urls.posterior);
skin('KNEE-LT-POST', '膝后');
swelling('KNEE-LT-DIFFUSE', '膝周');
feature('KNEE-LT-DIFFUSE', 'LOCALISE', '不适位置不清', '膝周多处不适，尚无明确集中位置', '区分皮肤触碰、深部压痛与活动相关不适。', urls.knee);
skin('KNEE-LT-DIFFUSE', '膝周');

const backup = path.join(root, 'build/authoring/backups', `local-tissue-${Date.now()}`);
await fs.mkdir(backup, { recursive: true });
await fs.copyFile(output, path.join(backup, path.basename(output)));
await fs.copyFile(source, path.join(backup, 'clinical_extension_rows.json'));
const refSheet = bySheet.InterventionReference;
if (!refSheet.headers.includes('Source_Note')) {
  refSheet.headers.push('Source_Note');
  refSheet.rows.forEach(row => row.push(''));
}
for (const entry of audit) {
  refSheet.rows.find(row => row[0] === entry.reference_id)[refSheet.headers.indexOf('Source_Note')] = entry.evidence_note;
}
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(output));
for (const [name, headers, rows] of specs) {
  const sheet = workbook.worksheets.getItem(name);
  const oldCount = (runtime.clinical_extension[name]?.length || 0) + 1;
  sheet.getRangeByIndexes(0, 0, rows.length + 1, headers.length).values = [headers, ...rows];
  if (oldCount > rows.length + 1) {
    sheet.getRangeByIndexes(rows.length + 1, 0, oldCount - rows.length - 1, headers.length).values =
      Array.from({ length: oldCount - rows.length - 1 }, () => headers.map(() => ''));
  }
  if (rows.length + 1 > oldCount) {
    const extra = sheet.getRangeByIndexes(oldCount, 0, rows.length + 1 - oldCount, headers.length);
    extra.format.font = { name: 'Microsoft YaHei', size: 10 };
    extra.format.rowHeight = 26;
  }
  if (name === 'InterventionReference') {
    const notes = sheet.getRangeByIndexes(0, headers.indexOf('Source_Note'), rows.length + 1, 1);
    notes.format.columnWidth = 85;
    notes.format.wrapText = true;
    notes.format.font = { name: 'Microsoft YaHei', size: 10 };
    sheet.getRangeByIndexes(0, headers.indexOf('Source_Note'), 1, 1).format.fill = '#E6EFEB';
    for (let i = 0; i < rows.length; i++) {
      if (audit.some(entry => entry.reference_id === rows[i][0])) {
        sheet.getRangeByIndexes(i + 1, 0, 1, headers.length).format.rowHeight = 76;
      }
    }
  }
}
workbook.recalculate();
console.log((await workbook.inspect({ kind: 'table', range: 'InterventionReference!C75:H80', tableMaxRows: 6, tableMaxCols: 6, maxChars: 1500 })).ndjson);
console.log((await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?', options: { useRegex: true, maxResults: 10 }, maxChars: 500 })).ndjson);
const saved = await SpreadsheetFile.exportXlsx(workbook);
await saved.save(output);
await fs.writeFile(source, JSON.stringify(specs, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ output, counts: Object.fromEntries(specs.map(([name,,rows]) => [name, rows.length])) }));
