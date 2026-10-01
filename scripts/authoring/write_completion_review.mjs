import fs from 'node:fs/promises';
const esc=value=>String(value??'').replaceAll('|','／').replaceAll('\n','<br>');
const table=(head,rows)=>[`| ${head.join(' | ')} |`,`| ${head.map(()=>'---').join(' | ')} |`,...rows.map(row=>`| ${row.map(esc).join(' | ')} |`)];
export async function writeCompletionReview(audit,data,spec){
 const original=JSON.parse(await fs.readFile('knowledge/review/lower_limb_completion_checklist_before.json','utf8'));
 const ext=data.clinical_extension;
 const itemById=new Map(data.tables['02_ClinicalItem'].map(r=>[r.item_id,r]));
 const mapById=new Map(data.tables['08_AssessmentFindingMap'].map(r=>[r.map_id,r]));
 const featureById=new Map(ext.FindingFeature.map(r=>[r.Feature_ID,r]));
 const refsFor=id=>ext.InterventionReference.filter(r=>r.Feature_ID===id);
 const featuresFor=map=>ext.FindingFeature.filter(r=>r.Assessment_Map_ID===map);
 const methods=id=>refsFor(id).map(r=>`${r.Treatment_Goal}：${r.Treatment_Method}`).join('\n');
 const state=f=>refsFor(f.Feature_ID).length?'具名方法参考':f.Related_Location_Prompt?'具体部位继续查看':spec.display_notes[f.Feature_ID]?'独立评估提示':'原有评估提示';
 const input=original.totals,output=audit.totals;
 const gates=['baseline_content_pending','mapped_items_missing_purpose','vague_active_reference_rows','unreachable_regular_maps','bare_visible_explanations','mixed_feature_candidates','overlapping_baseline_maps','baseline_vague_maps','abstract_presentation_candidates','pipeline_mismatches','relation_errors','workbook_runtime_issues','safety_entry_issues'];
 const errors=gates.filter(key=>output[key]!==0);
 if(audit.empty_features.some(f=>f.reachable&&!f.location_review&&f.category!=='独立评估提示'))errors.push('unclassified_empty');
 if(errors.length)throw Error('Checklist not complete: '+errors.join(','));
 const lines=['# 下肢内容整改审核稿','',
 '日期：2026-10-01。范围：原复查清单涉及的膝、小腿、踝足与大腿。清单中的可处理缺项已逐项落实到工作簿和运行数据，新增及改写临床文案仍标记为“待临床审核”。','',
 '本稿区分处理方法、独立评估提示与进一步定位。骨面局灶痛、急性结构变化和神经筛查等没有强行补普通治疗。髋部独立模块、模型定位校准、嵌套查询、APK和部署均未纳入。','',
 '## 1. 清单核对结果','',
 ...table(['项目','整改前','当前'],[
  ['未扩展的普通检查项目',input.baseline_content_pending,output.baseline_content_pending],
  ['缺少为什么看',input.mapped_items_missing_purpose,output.mapped_items_missing_purpose],
  ['当前使用的笼统方法参考',input.vague_active_reference_rows,output.vague_active_reference_rows],
  ['普通项目无公开入口',input.unreachable_regular_maps,output.unreachable_regular_maps],
  ['只有说明，无方法或可见提示',input.bare_visible_explanations,output.bare_visible_explanations],
  ['受限与疼痛混写候选',input.mixed_feature_candidates,output.mixed_feature_candidates],
  ['旧基线与具体内容重复',input.overlapping_baseline_maps,output.overlapping_baseline_maps],
  ['原库普通项目笼统方法',input.baseline_vague_maps,output.baseline_vague_maps],
  ['抽象表现名称/说明候选',input.abstract_presentation_candidates,output.abstract_presentation_candidates],
  ['工作簿/运行数据/方法关联错误',0,output.workbook_runtime_issues+output.relation_errors+output.pipeline_mismatches],
  ['风险提示入口缺失', '另行核查',output.safety_entry_issues],
 ]),'',
 `当前${output.extension_features}条表现、${output.extension_references}组方法参考、${ext.ClinicalPurpose.length}条目的、${ext.ConsultationGuide.length}条问诊思路、${output.locations}个内容指南。对38区域及19指南的公开非安全条件运行${output.audited_requests}次关联核查，另检查${output.safety_requests}个风险入口。数字是数据关联结果，不等于临床有效性结论。`,'',
 `没有方法的${output.currently_empty}条表现中，${output.empty_with_location_review}条仅提供具体部位继续查看；其余${output.currently_empty-output.empty_with_location_review}条保留独立评估提示。存在导航的总条目还包括2条已提供肌腹方法、另指向足背肌腱的表现，二者不混计。`,'',
 '## 2. 重点变化','',
 '- 同部位重复入口：已选中踝前时隐藏“肌腱附近疼痛或位置未分清”，已选中膝周范围性区域时隐藏“不适位置不清”；从其他部位查阅仍保留。普通活动痛、组织检查和风险提示继续显示。第一射线相关检查标题统一为“第一跖跗关节活动”。',
 '- 周围组织：原有16个精确单区域指南继续供给内容；另外22个区域补独立组织说明，下肢全部38个区域及现有边界指南均有内容。该说明只列邻近结构，不由皮肤位置判断症状来源。',
 '- 足底与前足：跟垫缓冲、足弓贴扎、筋膜牵伸/手法、具名足趾控制、肌腱抗阻、跖板贴扎及籽骨减压分别挂在对应表现下。',
 '- 内踝后方：胫骨后肌腱、拇长屈肌腱、趾长屈肌腱与跗管分别展示。屈趾肌腱手法来自多方法单病例，独立效果未确定；拇长屈肌牵伸保留回顾性研究范围，不套用到趾长屈肌。',
 '- 大腿：前、内、外侧局部组织与内收肌补目的、问诊和方法；撤下后侧与阔筋膜张肌重复旧基线。',
 '- 膝周：肌腹压痛/活动痛替代“局部敏感”；内外侧关节线、韧带、腓骨头附近肌腱/关节与膝后肌腹分开。胫骨结节参考注明生长发育背景。',
 '- 专项检查：前抽屉、距骨倾斜、Windlass及远端神经补具体观察方向；筛查结果不直接产生统一治疗。',
 '- 入口：跖肌放入补充项目，拇短屈肌接到第一跖趾关节区域；内容指南仅整理既有区域，不更改模型或点击边界。',
 '- 问诊：新增足部、大腿和膝部的部位问题，提供为什么问、获取信息和后续评估用途，不录入答案。','',
 '## 3. 原清单逐项去向','',
 '以下清单保留整改前的记录编号，便于核对。一个项目可能曾出现在多个缺项统计中，不把重复命中当成多个项目。','',
 '### 3.1 原有34条无方法表现','',
 ...table(['检查项目','原记录','当前去向','现在显示'],original.empty_features.map(r=>{
  const f=featureById.get(r.feature_id);return [r.item_name,r.feature_id,f?state(f):'已撤下重复记录',f?(methods(f.Feature_ID)||[f.Related_Location_Prompt,f.Finding_Interpretation].filter(Boolean).join('\n')):'对应具体表现另列'];
 })),'',
 '### 3.2 原有36条仅用原库表现的检查项目','',
 ...table(['项目','原映射','目前表现','内容去向'],original.baseline_only.map(r=>[r.item_name,r.assessment_map_id,featuresFor(r.assessment_map_id).map(f=>f.Finding_Name).join('；'),featuresFor(r.assessment_map_id).map(f=>`${f.Feature_ID}：${state(f)}`).join('\n')])),'',
 '### 3.3 原有29条缺目的项目','',
 ...table(['项目','为什么看','检查关注'],original.missing_purposes.map(r=>{
  const p=ext.ClinicalPurpose.find(p=>p.Item_ID===r.item_id);return [r.name,p?.Clinical_Purpose,p?.Assessment_Focus];
 })),'',
 '### 3.4 原有19条笼统方法参考','',
 ...table(['原项目/参考','原方法','整改'],original.vague_references.map(r=>{
  const f=featureById.get(r.feature_id),ref=ext.InterventionReference.find(ref=>ref.Reference_ID===r.reference_id);
  return [r.item_name+' / '+r.reference_id,r.methods,r.item_status==='Internal'?'保留停用历史记录；当前产品无入口':!f?'撤下重复旧基线，保留独立具体表现':ref?`${ref.Treatment_Goal}：${ref.Treatment_Method}`:methods(f.Feature_ID)||f.Related_Location_Prompt||f.Finding_Interpretation];
 })),'',
 '### 3.5 入口与对外措辞','',
 ...table(['原问题','当前安排'],[
 ['跖肌无入口','踝后区域及小腿后侧上段的补充项目；保留解剖变异和鉴别说明。'],
 ['拇短屈肌无入口','第一跖趾关节区域的相关肌群；与籽骨、关节活动分别查看。'],
 ['UI分组开发文字','AF-MUS-012为UI_ONLY且无评估映射，不作为对外检查内容。'],
 ['条件性检查、提高关注等文字','替换为部位、牵拉、发力和对照组织的描述。'],
 ['Safety/结构化条件文字','膝风险触发文案改为具体外伤、肿胀、锁住、失稳和神经变化。'],
 ['7个安全项目无普通入口','通过9个公开风险入口显示独立评估提示；未改为普通卡片或治疗。'],
 ['11个停用动作项目','保留历史记录，当前公开条件继续连接已有动作模式项目，不恢复全套动作测试。'],
 ['上游髋活动','保留具体髋屈伸/旋转对照说明；明确髋独立模块暂不接入。'],
 ]),'',
 '## 4. 本批全部新增/修改临床文案','',
 '按检查项目分组。列出的都是工作簿中的对外文字及方法，不另写一套网页文案。','',
 ];
 const grouped=new Map();
 for(const row of spec.features){const item=mapById.get(row.Assessment_Map_ID).clinical_item_id;const list=grouped.get(item)||[];list.push(featureById.get(row.Feature_ID));grouped.set(item,list);}
 for(const [item,features]of grouped){
  lines.push(`### ${itemById.get(item).display_name}`,'',...table(['表现','如何理解','参考/继续查看'],features.map(f=>[`${f.Finding_Name} (${f.Feature_ID})`,f.Finding_Feature,methods(f.Feature_ID)||f.Related_Location_Prompt||f.Finding_Interpretation])),'');
  for(const f of features.filter(f=>spec.display_notes[f.Feature_ID]))lines.push(`提示（${f.Feature_ID}）：${f.Finding_Interpretation}`,'');
 }
 lines.push('## 5. 本批问诊思路','',...table(['适用部位','问题','为什么问','获取的信息','帮助查看'],spec.guides.map(g=>[g.Region_IDs,g.Core_Prompt,g.Question_Purpose,g.Information_Gained,g.Assessment_Help])),'',
 '### 5.1 周围组织说明','',
 '读取现有精确定位指南；缺少指南时读取区域组织说明。合并区域按组织类别去重，说明不代表疼痛来源已确定。','',
 ...table(['部位','组织说明','来源'],data.tables['01_Region'].map(region=>{
  const exact=ext.LocationGuide.filter(g=>g.Region_IDs===region.region_id);
  const guide=exact.length===1?exact[0]:null;
  return [data.region_display_names?.[region.region_id]||region.l3_region,guide?.Related_Tissues||region.related_tissues,guide?.Source_Reference||region.related_tissues_source];
 })),'',
 '## 6. 方法来源与审核边界','',
 '线下记录保留匿名来源编号及行号，只证明该方法在记录中出现，不证明单独疗效。足内在肌募集、近端胫腓关节及足跟贴扎等小样本/个案材料保留限制。未把局部疼痛直接诊断成腱病、跖板损伤或神经卡压，也未导入操作步骤和剂量。','',
 '本次尤其需要审核：深层肌群是否适合保留区域手法；内踝屈趾肌腱的个案手法参考；第一射线与中足方法的范围；胫骨结节生长发育期参考；第一MTP与籽骨的减压分类；关节线压痛对应的进一步检查。以下逐条保留证据范围，均可修改。','',
 ...table(['表现/方法','来源','范围与限制'],spec.references.map(r=>[`${r.Feature_ID}：${r.Treatment_Method}`,r.Source_URL,r.Source_Note])),'',
 '## 7. 未包含的工作','',
 '髋、脊柱与上肢独立模块暂不接入；模型定位精度、嵌套查询、APK及VPS部署保留原安排。当前完成的是原清单的下肢内容整改与接入，临床最终用词和参考范围请按本稿审核。','');
 await fs.writeFile('docs/LOWER_LIMB_COMPLETION_REVIEW.md',lines.join('\n'));
 const auditSummary=['# 下肢数据库清单复查','',
 '原缺项清单已完成编辑与接入，临床文案待用户审核。完整逐项去向、新文案、问诊及来源见 [下肢内容整改审核稿](LOWER_LIMB_COMPLETION_REVIEW.md)。','',
 ...table(['项目','当前结果'],Object.entries(output)), '',
 '普通内容缺项、目的缺失、空泛参考、无公开入口、无方法且无可见提示、混写与重复候选均为0。无方法表现单独按评估提示/定位继续查看统计，没有用统一治疗填充。','',
 '剩余1条笼统方法属于停用内部项目，1条开发措辞属于不可见UI分组；11个内部历史映射保留。7个安全项目通过已核查的公开风险提示接入，不要求出现在普通检查列表。','',
 ...table(['无方法表现','检查项目','当前分类','显示内容'],audit.empty_features.map(r=>[r.feature_id,r.item_name,r.category,r.location_review?.prompt||featureById.get(r.feature_id)?.Finding_Interpretation])), '',
 '核查范围是数据关联、对外内容完整性和已登记措辞候选；不能替代临床审核或表示每种病因、每种康复方法均已覆盖。',''];
 await fs.writeFile('docs/TREATMENT_REFERENCE_AUDIT.md',auditSummary.join('\n'));
}
