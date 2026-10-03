/** Text source traceability; does not certify mesh anatomy. */
import fs from 'node:fs';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['src/content/muscle-anatomy.ts'],bundle:true,write:false,format:'esm'});
const {getMuscleAnatomy,muscleKey,getMuscleDisplayName,supplementalMuscles}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const meta=JSON.parse(fs.readFileSync('public/3d/skin.json'));
const reviews=JSON.parse(fs.readFileSync('src/content/muscle-book-review.json'));
const modeled=meta.muscles.parts.filter(p=>getMuscleAnatomy(p.name));
const names=[...new Set(modeled.map(p=>muscleKey(p.name))),...supplementalMuscles.map(p=>p.name)];
if(names.length!==Object.keys(reviews).length||names.some(n=>!reviews[n]))throw Error('Text audit coverage gap');
const count=type=>names.filter(n=>reviews[n].coverage===type).length;
const lines=[
  '# 肌肉文案与《基础肌动学》第3版比对', '',
  '审核日期：2026-10-03。这里只核对文案；不能以文案通过推断模型附着也通过。', '',
  `当前可点选：${modeled.length}个网格、${new Set(modeled.map(p=>muscleKey(p.name))).size}种名称；另有${supplementalMuscles.length}条暂无模型的文字补充。左右侧重复文案按同一肌肉核对。`, '',
  `共${names.length}条：${count('attachments')}条有书中独立附着描述，${count('group')}条只在肌群、合并条目或相关说明中覆盖，${count('secondary')}条本次未找到独立书籍条目，仍用大学解剖资料补充。`, '',
  '## 参考与处理原则', '',
  '- 主参考：Mansfield、Neumann《基础肌动学》第3版，本地扫描PDF。下表为印刷页码；此文件PDF页码=印刷页码+18。',
  '- 起止点的骨性范围采用书中描述；书中为简化示意而数据库已有可靠细分时，保留细分。筋膜、共同腱、指背装置等不能写成肌腹直接连接骨面。',
  '- 书内表格疑误、同书正文冲突、不同资料的节段差异逐条记录，使用UAMS或TTUHSC解剖教学资料复核，不直接复制疑误。',
  '- 股直肌反折头保留已引用解剖研究；已通过模型几何不变。大小菱形肌按不同起止点保留，模型不变。', '',
  '## 本轮修改', '',
  '细化斜方肌、胸大肌、大圆肌、前锯肌、夹肌、最长肌、背阔肌、腹内斜肌、腹横肌、股中间肌、胫骨前后肌、腓骨长短肌、趾长伸屈肌、阔筋膜张肌、腰大肌等附着。補足菱形肌、肩胛提肌、中斜角肌、腰方肌、股薄肌、臀中肌、拇长屈肌及拇收肌功能。字段记录见 MUSCLE_TEXT_CHANGES.json；网页每条参考资料显示对应书页及差异。', '',
  '## 全量名称清单', '',
  '| 名称 | 书上印刷页 | 核对范围 | 处理说明 |',
  '|---|---|---|---|',
];
const labels={attachments:'独立附着描述',group:'肌群/相关说明；细分另补',secondary:'大学资料补充'};
for(const name of names){
  const r=reviews[name],part=modeled.find(p=>muscleKey(p.name)===name);
  const display=getMuscleDisplayName(name,part?.displayName?.replace(/^[左右]侧\s*·\s*/,'')||supplementalMuscles.find(p=>p.name===name)?.displayName||name);
  lines.push(`| ${display} (${name})${part?'':' · 暂无模型'} | ${r.printedPages.join('、')||'—'} | ${labels[r.coverage]} | ${r.reviewNote||(r.coverage==='attachments'?'主体附着相符，保留可靠的细分或腱性连接。':'细分起止点由解剖资料补充，不能当作书中独立条目。')} |`);
}
lines.push('', '## 补充来源', '',
  '- [UAMS 肌肉解剖表](https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/)',
  '- [TTUHSC 前臂解剖](https://anatomy.ttuhscep.edu/schemes/forearm_tables.html)',
  '- [TTUHSC 手部解剖](https://anatomy.ttuhscep.edu/musculoskeletal_system/hand_tables.html)',
  '- [TTUHSC 背部解剖](https://anatomy.ttuhscep.edu/schemes/back_tables.html)',
  '- [股直肌近端附着研究](https://pubmed.ncbi.nlm.nih.gov/24793210/)', '');
fs.writeFileSync('docs/MUSCLE_TEXT_REVIEW.md',lines.join('\n'));
console.log({modeledMeshes:modeled.length,modeledNames:new Set(modeled.map(p=>muscleKey(p.name))).size,reviewRows:names.length,bookAttachments:count('attachments'),bookGroup:count('group'),secondary:count('secondary')});
