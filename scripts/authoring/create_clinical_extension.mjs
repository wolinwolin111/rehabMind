import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { Workbook, SpreadsheetFile } = require('@oai/artifact-tool');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const base = JSON.parse(await fs.readFile(path.join(root, 'build/knowledge/runtime.json'), 'utf8'));
const tables = base.tables;
const itemById = new Map(tables['02_ClinicalItem'].map(row => [row.item_id, row]));
const afmByItem = new Map(tables['08_AssessmentFindingMap'].map(row => [row.clinical_item_id, row]));
const evidencePfp = 'https://doi.org/10.2519/jospt.2019.0302';
const evidencePatellar = 'https://doi.org/10.1136/bjsports-2020-103403';
const evidenceAnkle = 'https://doi.org/10.2519/JOSPT.2021.0302';
const evidenceAchilles = 'https://doi.org/10.2519/jospt.2024.0302';

const itemConfigs = [
  ['CORE-MUS-RF', '股直肌跨髋、膝；查看其长度、局部反应与膝前活动表现的关系。', '膝前', evidencePfp, 'muscle'],
  ['CORE-MUS-VL', '查看大腿前外侧局部状态及其与髌周症状、活动表现的关系。', '膝前', evidencePfp, 'muscle'],
  ['CORE-MUS-VM', '查看股内侧肌局部状态；张力表现与主动募集能力分别评估。', '膝前', evidencePfp, 'muscle'],
  ['CORE-MUS-BF', '查看后外侧肌群的长度与局部反应，并与膝后外侧定位比较。', '膝后', evidencePfp, 'muscle'],
  ['CORE-MUS-ST', '查看后内侧肌群的长度与局部反应，并与鹅足邻近症状区分。', '膝内侧', evidencePfp, 'muscle'],
  ['CORE-MUS-SM', '查看深层后内侧肌群的长度与局部反应，并与膝后内侧定位比较。', '膝后', evidencePfp, 'muscle'],
  ['KNEE-MUS-LAT-CHAIN', '查看外侧链肌肉状态与膝外侧定位、任务表现的关系。', '膝外侧', evidencePfp, 'muscle'],
  ['KNEE-LT-PATELLA', '区分髌周局部压痛、肿胀与组织敏感等可观察表现。', '膝前', evidencePfp, 'local'],
  ['KNEE-LT-INFRAPAT', '区分髌下不同组织的局部反应，并观察负荷相关表现。', '膝前', evidencePatellar, 'local'],
  ['KNEE-LT-DIFFUSE', '观察膝周压痛、肿胀和组织反应，再与具体区域定位对应。', '膝周', evidencePfp, 'local'],
  ['CORE-CAP-KNEE-EXT', '单独查看膝伸输出能力，与肌肉长度和局部敏感表现区分。', '膝', evidencePfp, 'capacity'],
  ['CORE-CAP-QUAD-RECRUIT', '查看股四头肌主动募集及终末伸膝表现，与整体膝伸力量区分。', '膝', evidencePfp, 'capacity'],
  ['KNEE-TASK-DYN', '查看实际任务中的动态控制与负荷分配表现。', '膝', evidencePfp, 'capacity'],
  ['CORE-MUS-TA', '查看胫骨前肌局部状态与踝背屈、足背症状的关系。', '踝足', evidenceAnkle, 'muscle'],
  ['CORE-MUS-PL', '查看腓骨长肌局部状态与踝外侧症状及外翻任务的关系。', '踝足', evidenceAnkle, 'muscle'],
  ['CORE-MUS-PB', '查看腓骨短肌局部状态与踝外侧症状及外翻任务的关系。', '踝足', evidenceAnkle, 'muscle'],
  ['CORE-MUS-GASTROC', '查看腓肠肌长度、局部反应与踝背屈及提踵表现的关系。', '踝足', evidenceAnkle, 'muscle'],
  ['AF-LT-004', '查看跟腱中段局部反应与负荷相关症状。', '踝足', evidenceAchilles, 'local'],
  ['AF-LT-005', '查看跟腱止点及后足跟局部反应与负荷相关症状。', '踝足', evidenceAchilles, 'local'],
];
const checkSummaries = {
  'CORE-MUS-RF': '比较股直肌拉长反应、侧差、前侧症状及骨盆代偿。',
  'CORE-MUS-VL': '查看大腿前外侧张力、局部敏感及髌骨外侧缘邻近反应。',
  'CORE-MUS-VM': '查看股内侧远端局部张力与敏感表现。',
  'CORE-MUS-BF': '比较后外侧长度、局部敏感与膝后外侧反应。',
  'CORE-MUS-ST': '比较后内侧长度、局部敏感与鹅足邻近反应。',
  'CORE-MUS-SM': '比较深层后内侧长度、局部敏感与膝后内侧反应。',
  'KNEE-MUS-LAT-CHAIN': '查看髋与大腿外侧张力、敏感及相关任务表现。',
  'KNEE-LT-PATELLA': '查看髌周压痛、敏感、肿胀与局部症状反应。',
  'KNEE-LT-INFRAPAT': '分别定位髌腱、脂肪垫、髌下缘与胫骨结节邻近反应。',
  'KNEE-LT-DIFFUSE': '分区观察膝周压痛、肿胀与症状反应。',
  'CORE-CAP-KNEE-EXT': '比较膝伸力量、侧差与相关任务中的输出。',
  'CORE-CAP-QUAD-RECRUIT': '观察股四头主动收缩、终末伸膝及伸膝滞后。',
  'KNEE-TASK-DYN': '观察诱发任务中的稳定性、负荷分配与髋膝踝协同。',
  'CORE-MUS-TA': '查看胫骨前肌局部敏感、张力与踝背屈表现。',
  'CORE-MUS-PL': '查看腓骨长肌局部敏感、张力与外翻表现。',
  'CORE-MUS-PB': '查看腓骨短肌局部敏感、张力与外翻表现。',
  'CORE-MUS-GASTROC': '比较腓肠肌局部反应、背屈与提踵表现。',
  'AF-LT-004': '查看跟腱中段压痛、肿胀、敏感与负荷反应。',
  'AF-LT-005': '查看跟腱止点与后足跟压痛、肿胀、敏感及负荷反应。',
};
const muscleTreatment = {
  'CORE-MUS-VL': ['股外侧肌软组织处理', '股四头肌前外侧拉长活动'],
  'CORE-MUS-VM': ['股内侧肌软组织处理', '股四头肌内侧拉长活动'],
  'CORE-MUS-BF': ['股二头肌软组织处理', '后外侧腘绳肌拉伸'],
  'CORE-MUS-ST': ['半腱肌软组织处理', '后内侧腘绳肌拉伸'],
  'CORE-MUS-SM': ['半膜肌软组织处理', '后内侧腘绳肌拉伸'],
  'KNEE-MUS-LAT-CHAIN': ['髋与大腿外侧软组织处理', '髋外侧主动活动'],
  'CORE-MUS-TA': ['胫骨前肌软组织处理', '踝主动跖屈活动'],
  'CORE-MUS-PL': ['腓骨长肌软组织处理', '踝足主动内外翻活动'],
  'CORE-MUS-PB': ['腓骨短肌软组织处理', '踝足主动内外翻活动'],
  'CORE-MUS-GASTROC': ['腓肠肌软组织处理', '膝伸位小腿后侧拉伸'],
};

const clinicalItems = [];
const findingFeatures = [];
const interventionRefs = [];
function addRef(mapId, code, goal, methods, progression, source) {
  interventionRefs.push([`${mapId}-${code}`, `${mapId}-${code.split('-')[0]}`, goal, methods.join('；'), progression || '', source, '待临床审核']);
}
for (const [id, purpose, module, evidence, kind] of itemConfigs) {
  const item = itemById.get(id);
  const afm = afmByItem.get(id);
  if (!item || !afm) throw new Error(`Unknown item or assessment map: ${id}`);
  clinicalItems.push([id, item.display_name, purpose, checkSummaries[id], module, evidence, '待临床审核']);
  if (kind === 'capacity') {
    findingFeatures.push([`${afm.map_id}-CAPACITY`, afm.map_id, '能力或任务表现不足', '独立检查中出现力量、募集或任务控制表现不足。', '提示对应能力或任务环节需要关注；不能由位置或动作外观单独推断原因。', evidence, '待临床审核']);
    addRef(afm.map_id, 'CAPACITY-1', '改善对应能力', [id === 'CORE-CAP-QUAD-RECRUIT' ? '股四头肌主动募集与终末伸膝训练' : id === 'KNEE-TASK-DYN' ? '任务特异的动作控制训练' : '膝伸力量训练'], '', evidence);
  } else if (kind === 'muscle') {
    if (id === 'CORE-MUS-RF') {
      findingFeatures.push([`${afm.map_id}-TENSION`, afm.map_id, '局部张力增加', '股直肌局部触诊张力偏高；与对侧及活动表现对照。', '可作为局部软组织状态线索；单凭触诊不确定疼痛来源。', evidence, '待临床审核']);
      findingFeatures.push([`${afm.map_id}-LENGTH`, afm.map_id, '拉长受限', '股直肌拉长时膝屈或髋伸活动受限，可伴骨盆代偿。', '可与膝前活动受限有关；结合关节活动度和动作表现查看。', evidence, '待临床审核']);
      findingFeatures.push([`${afm.map_id}-SENSITIVITY`, afm.map_id, '局部敏感', '股直肌局部触诊或拉长时出现敏感反应。', '提示当前局部刺激耐受下降，不能据此确定组织损伤。', evidence, '待临床审核']);
      addRef(afm.map_id, 'TENSION-1', '改善软组织活动', ['股直肌软组织松解', '主动膝屈伸活动'], '', evidence);
      addRef(afm.map_id, 'LENGTH-1', '改善长度与活动', ['股直肌拉伸', '髋伸展活动训练'], '', evidence);
      addRef(afm.map_id, 'SENSITIVITY-1', '降低局部刺激', ['调整诱发动作负荷', '低刺激主动活动'], '', evidence);
      continue;
    }
    findingFeatures.push([`${afm.map_id}-TENSION`, afm.map_id, '张力或拉长反应异常', `${item.display_name}局部张力或拉长反应与对侧不同；结合相应动作查看。`, '提示该项目的局部状态值得关注；与力量不足分别记录。', evidence, '待临床审核']);
    findingFeatures.push([`${afm.map_id}-SENSITIVITY`, afm.map_id, '局部敏感', '触诊或相关活动出现局部敏感反应。', '提示局部刺激敏感性增加；需与活动和负荷表现一起查看。', evidence, '待临床审核']);
    addRef(afm.map_id, 'TENSION-1', '改善软组织活动', [muscleTreatment[id][0]], '', evidence);
    addRef(afm.map_id, 'TENSION-2', '改善拉长与活动', [muscleTreatment[id][1]], '', evidence);
    addRef(afm.map_id, 'SENSITIVITY-1', '降低局部刺激', ['调整诱发动作负荷', '低刺激主动活动'], '', evidence);
  } else {
    findingFeatures.push([`${afm.map_id}-TENDERNESS`, afm.map_id, '局部压痛', '局部触诊或压迫出现压痛。', '提示该区域存在局部症状反应；压痛位置不能单独确定具体组织诊断。', evidence, '待临床审核']);
    findingFeatures.push([`${afm.map_id}-SWELLING`, afm.map_id, '局部肿胀', '观察或触诊可见局部肿胀、热感或组织反应。', '提示局部组织反应；需结合病史与安全线索理解。', evidence, '待临床审核']);
    findingFeatures.push([`${afm.map_id}-SENSITIVITY`, afm.map_id, '组织敏感', '局部刺激或相关活动出现较明显症状反应。', '提示该区域刺激敏感性增加；需结合任务与负荷表现查看。', evidence, '待临床审核']);
    addRef(afm.map_id, 'TENDERNESS-1', '缓解局部症状', ['局部症状管理', '调整刺激负荷'], '', evidence);
    addRef(afm.map_id, 'SWELLING-1', '关注局部反应', ['局部症状管理', '活动与负荷调整'], '', evidence);
    addRef(afm.map_id, 'SENSITIVITY-1', '降低局部刺激', ['局部症状管理', '辅助贴扎'], '', evidence);
    if (id === 'KNEE-LT-INFRAPAT' || id.startsWith('AF-LT-')) addRef(afm.map_id, 'SENSITIVITY-2', '恢复负荷能力', ['渐进负荷训练'], '', evidence);
  }
}

const workbook = Workbook.create();
const specs = [
  ['DimensionGuide', ['Dimension_Key', 'Public_Description', 'Source', 'Review_Status'], [
    ['MUSCLE_STATE', '关注肌肉张力、长度与局部敏感。', '康复思路数据库与产品整改方案 v1.0', '待临床审核'],
    ['ROM', '查看关节活动范围与末端表现。', '康复思路数据库与产品整改方案 v1.0', '待临床审核'],
    ['CAPACITY', '查看力量、募集与负荷能力。', '康复思路数据库与产品整改方案 v1.0', '待临床审核'],
    ['FUNCTION', '观察任务中的动作控制表现。', '康复思路数据库与产品整改方案 v1.0', '待临床审核'],
    ['LOCAL', '观察压痛、肿胀与组织反应。', '康复思路数据库与产品整改方案 v1.0', '待临床审核'],
  ]],
  ['ClinicalPurpose', ['Item_ID', 'Item_Name', 'Clinical_Purpose', 'Assessment_Focus', 'Module', 'Source_URL', 'Review_Status'], clinicalItems],
  ['FindingFeature', ['Feature_ID', 'Assessment_Map_ID', 'Finding_Name', 'Finding_Feature', 'Finding_Interpretation', 'Source_URL', 'Review_Status'], findingFeatures],
  ['InterventionReference', ['Reference_ID', 'Feature_ID', 'Treatment_Goal', 'Treatment_Method', 'Progression', 'Source_URL', 'Review_Status'], interventionRefs],
];
await fs.writeFile(path.join(root, 'build', 'authoring', 'clinical_extension_rows.json'), JSON.stringify(specs, null, 2), 'utf8');
for (const [name, headers, rows] of specs) {
  const sheet = workbook.worksheets.add(name);
  sheet.showGridLines = false;
  sheet.getRangeByIndexes(0, 0, rows.length + 1, headers.length).values = [headers, ...rows];
  sheet.getRangeByIndexes(0, 0, 1, headers.length).format = { fill: '#146B67', font: { name: 'Microsoft YaHei', bold: true, color: '#FFFFFF', size: 11 } };
  sheet.getRangeByIndexes(1, 0, rows.length, headers.length).format.font = { name: 'Microsoft YaHei', size: 10 };
  sheet.getRangeByIndexes(0, 0, rows.length + 1, headers.length).format.rowHeight = 26;
  sheet.getRangeByIndexes(0, 0, rows.length + 1, 2).format.columnWidth = 28;
  sheet.getRangeByIndexes(0, 2, rows.length + 1, Math.max(1, headers.length - 2)).format.columnWidth = 38;
  sheet.freezePanes.freezeRows(1);
}
workbook.recalculate();
const output = path.join(root, 'knowledge', 'RehabMind_ClinicalExtension_v1.0_Draft.xlsx');
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(output);
console.log(JSON.stringify({ output, clinical_items: clinicalItems.length, finding_features: findingFeatures.length, intervention_references: interventionRefs.length }));
