import test from 'node:test';
import assert from 'node:assert/strict';
import {knowledge} from '../api/knowledge.mjs';
import {resolveAssessment} from '../api/resolver.mjs';

const data = knowledge();
const items = result => result.dimensions.flatMap(d => d.groups.flatMap(g => g.items));

test('case methods, intrinsic recruitment and function feedback do not imply a universal treatment decision',()=>{
 const ext=data.clinical_extension;
 for(const id of ['AFM-0047-LENGTH-MUSCLE','AFM-0048-LENGTH-MUSCLE','AFM-0027-HALLUX-MANUAL','AFM-0027-LESSER_TOES-MANUAL']){
  const ref=ext.InterventionReference.find(r=>r.Reference_ID===id);
  assert.ok(!ref.Treatment_Method.includes('肌腹'));
  assert.ok(ref.Treatment_Goal.includes('伴内踝后方'));
  assert.ok(ref.Source_Note.includes('即时增加疼痛'));
 }
 for(const id of ['AFM-0050-TENSION-ACTIVE','AFM-0051-TENSION-ACTIVE','AFM-0052-TENSION-ACTIVE','AFM-0053-STATE-ACTIVE','AFM-0008-CONTROL-CONTROL','AFM-0022-EXCESS-CONTROL']){
  const ref=ext.InterventionReference.find(r=>r.Reference_ID===id);
  assert.ok(ref.Treatment_Goal.includes('控制'));
  assert.ok(ref.Source_Note.includes('8名健康'));
  assert.match(ref.Source_Note,/未验证疼痛|不作为.*疼痛.*独立疗效/);
 }
 const fs=ext.FindingFeature.filter(r=>/^AFM-01(19|20|21|22|23)-/.test(r.Feature_ID));
 assert.equal(fs.length,16);
 for(const f of fs)assert.ok(f.Finding_Feature.includes('不表示必须纠正'));
 for(const ref of ext.InterventionReference.filter(r=>/^AFM-01(19|20|21|22|23)-/.test(r.Reference_ID)))assert.ok(!ref.Treatment_Method.includes('髋膝踝协同'));
 const advanced=ext.InterventionReference.find(r=>r.Reference_ID==='AFM-0091-CAPACITY-1').Treatment_Method;
 assert.ok(advanced.includes('离心'));assert.ok(advanced.includes('罗马尼亚'));assert.ok(advanced.includes('Nordic'));
 assert.ok(!/Nordic|罗马尼亚/.test(ext.InterventionReference.find(r=>r.Reference_ID==='AFM-0100-PAIN-ACTIVE').Treatment_Method));
});

test('anatomy and exercise references retain their actual scope', () => {
  const ext=data.clinical_extension;
  for(const id of ['CORE-MUS-RF','CORE-MUS-SM','CORE-MUS-SART']) {
    assert.ok(!ext.ClinicalPurpose.find(r=>r.Item_ID===id).Source_URL.includes('2019.0302'));
  }
  for(const id of ['AFM-0106-PAIN','AFM-0103-LENGTH','AFM-0027-HALLUX']) {
    assert.ok(!ext.FindingFeature.find(r=>r.Feature_ID===id).Source_URL.includes('NBK539725'));
  }
  for(const id of ['AFM-0085-LIMIT-1','AFM-0086-LIMIT-1','AFM-0088-LIMIT-1']) {
    const ref=ext.InterventionReference.find(r=>r.Reference_ID===id);
    assert.ok(ref.Source_URL.includes('ng226'));
    assert.ok(ref.Source_Note.includes('骨关节炎'));
    assert.ok(ref.Source_Note.includes('不能外推'));
  }
  for(const ref of ext.InterventionReference.filter(r=>r.Source_URL?.includes('OP_outpatient_service.asp'))) {
    if(/站立屈膝|屈膝抗阻/.test(ref.Treatment_Method)) assert.ok(ref.Source_URL.includes('9QaAZGzRNAQ'));
    if(/桥式/.test(ref.Treatment_Method)) assert.ok(ref.Source_URL.includes('3kQfcIUXI28'));
    assert.ok(/名称|不声称/.test(ref.Source_Note));
  }
});

test('patellar upper and lower edges expose the matching tendon and keep peripatellar review secondary',()=>{
  const upper=items(resolveAssessment(data,{region_id:'KNEE-R-001'}));
  const lower=items(resolveAssessment(data,{region_id:'KNEE-R-005'}));
  const quad=upper.find(r=>r.item_id==='KNEE-LT-SUPRAPAT');
  assert.ok(quad);
  const tendon=quad.possible_findings.find(f=>f.feature_id==='AFM-0124-TENDON');
  assert.ok(tendon.treatment_goals.flatMap(g=>g.methods).includes('伸膝慢速抗阻训练'));
  const acute=quad.possible_findings.find(f=>f.feature_id==='AFM-0124-INTEGRITY');
  assert.equal(acute.treatment_goals.length,0);
  assert.ok(acute.display_note.text.includes('完整性'));
  assert.ok(lower.find(r=>r.item_id==='KNEE-LT-INFRAPAT').possible_findings.some(f=>f.feature_id==='AFM-0079-TENDON'));
  assert.ok(!lower.some(r=>r.item_id==='KNEE-LT-SUPRAPAT'));
  for(const region of ['KNEE-R-001','KNEE-R-005'])assert.equal(data.tables['05_RegionClinicalMap'].find(r=>r.region_id===region&&r.clinical_item_id==='KNEE-LT-PATELLA').display_mode,'EXPAND');
});

test('output differences are separate from a weakness diagnosis and deep muscle checks remain regional',()=>{
 const ext=data.clinical_extension;
 for(const n of ['0090','0091','0092','0093','0004','0005','0006','0007','0009']){
  const row=ext.FindingFeature.find(r=>r.Feature_ID===`AFM-${n}-CAPACITY`);
  assert.ok(!/不足|薄弱/.test(row.Finding_Name));
  assert.ok(row.Finding_Feature.includes('疼痛'));
  assert.ok(row.Finding_Feature.includes('目标'));
 }
 assert.ok(data.tables['02_ClinicalItem'].find(r=>r.item_id==='CORE-MUS-VI').check_focus.includes('不以表面触诊'));
 assert.ok(ext.FindingFeature.find(r=>r.Feature_ID==='AFM-0071-TENSION').Finding_Feature.includes('不代表单独定位'));
 assert.equal(ext.InterventionReference.find(r=>r.Reference_ID==='AFM-0066-TENSION-2').Treatment_Method,'股四头肌拉伸');
});

test('region interview purposes reflect the question and remain read-only',()=>{
 const qs=data.clinical_extension.ConsultationGuide;
 const shoe=qs.find(r=>r.Guide_ID==='QG-AF-R-007-3');
 assert.ok(/鞋具/.test(shoe.Information_Gained));assert.ok(!/瘀斑/.test(shoe.Information_Gained));
 const navigation=qs.find(r=>r.Guide_ID==='QG-AF-R-008-2');assert.ok(navigation.Assessment_Help.includes('胫骨后肌'));
 const midfoot=qs.find(r=>r.Guide_ID==='QG-AF-R-010-3');assert.ok(midfoot.Assessment_Help.includes('跗跖'));
 const rows=qs.filter(r=>/^QG-(AF-R-00[6-9]|AF-R-01[0-2]|THIGH-R|KNEE-(FRONT|MEDIAL|LATERAL|POST|DIFFUSE))-/.test(r.Guide_ID));
 assert.equal(rows.length,48);
 for(const r of rows)assert.equal(r.Input_Mode,'Display_Only');
});

test('knee interview prompts follow anterior, medial and lateral tissue regions', () => {
  const locationPrompts = {
    5: ['QG-PATELLAR-1', 'QG-PATELLAR-2', 'QG-KNEE-FRONT-3'],
    8: ['QG-PES-1', 'QG-PES-2', 'QG-PES-3'],
    11: ['QG-FIBHEAD-1', 'QG-FIBHEAD-2', 'QG-KNEE-LATERAL-3'],
    12: ['QG-ITB-1', 'QG-ITB-2', 'QG-KNEE-LATERAL-3'],
  };
  for (let number = 1; number <= 12; number++) {
    const result = resolveAssessment(data, {region_id:`KNEE-R-${String(number).padStart(3,'0')}`});
    const prompts = result.consultation_guide.filter(row => row.scope !== 'GENERAL');
    const group = number <= 6 ? 'FRONT' : number <= 9 ? 'MEDIAL' : 'LATERAL';
    assert.deepEqual(prompts.map(row => row.guide_id), locationPrompts[number] || [1,2,3].map(n => `QG-KNEE-${group}-${n}`));
    assert.equal(new Set(result.consultation_guide.map(row => row.guide_id)).size, result.consultation_guide.length);
  }
  const medial = resolveAssessment(data, {region_id:'KNEE-R-009'});
  assert.ok(medial.consultation_guide.find(row => row.guide_id === 'QG-KNEE-MEDIAL-1').core_prompt.includes('偏后方'));
});

test('first ray scope stays consistent across assessment and finding details', () => {
  const item = items(resolveAssessment(data,{region_id:'AF-R-008'})).find(row => row.item_id === 'AF-JNT-004');
  assert.ok(item);
  assert.equal(item.name, '第一跖骨列上下活动');
  assert.ok(item.check_focus.includes('第一跖骨列上下活动范围'));
  assert.deepEqual(new Set(item.possible_findings.map(row => row.feature_id)), new Set(['AFM-0022-LIMIT','AFM-0022-EXCESS','AFM-0022-PAIN']));
  for (const finding of item.possible_findings) {
    assert.ok(finding.name.startsWith('第一跖骨列上下活动'));
    assert.ok(finding.trigger_condition.includes('第一跖骨列整体'));
    assert.ok(!finding.trigger_condition.includes('内侧楔骨'));
  }
  assert.ok(item.possible_findings.find(row => row.feature_id === 'AFM-0022-PAIN').location_review);
});

test('relax stimulation is distinct from strength recruitment and TENS', () => {
  const refs = data.clinical_extension.InterventionReference;
  const relaxIds = ['AFM-0046-PRESSURE-RECORD-1','AFM-0060-PRESSURE-LOCAL-1','AFM-0060-ACTIVITY-LOCAL-1','AFM-0042-TENSION-RELAX-1'];
  for (const id of relaxIds) {
    const ref = refs.find(row => row.Reference_ID === id);
    assert.ok(ref.Treatment_Method.includes('肌肉电刺激放松'));
    assert.ok(ref.Source_Note.includes('NMES relax'));
    assert.ok(ref.Source_URL.startsWith('local-records://'));
  }
  const strength = items(resolveAssessment(data,{region_id:'LL-R-004'})).find(row => row.item_id === 'CORE-CAP-EV');
  const methods = strength.possible_findings.flatMap(f => f.treatment_goals.flatMap(g => g.methods));
  assert.ok(methods.includes('神经肌肉电刺激辅助外翻募集'));
  assert.ok(!methods.some(text => text.includes('电刺激放松')));
});

test('shared lower limb risk titles retain urgent thigh guidance', () => {
  for (const id of ['CORE-SAF-ACS','CORE-SAF-VTE']) {
    assert.ok(data.tables['02_ClinicalItem'].find(row => row.item_id === id).display_name.includes('下肢'));
    assert.ok(data.clinical_extension.ClinicalPurpose.find(row => row.Item_ID === id).Item_Name.includes('下肢'));
  }
  const rule = data.tables['07_ContextRule'].find(row => row.rule_id === 'THIGH-SAF-01');
  assert.equal(rule.priority, 'Critical');
  assert.ok(rule.public_note.includes('紧急医学评估'));
  const vte = data.tables['07_ContextRule'].find(row => row.rule_id === 'THIGH-SAF-02');
  assert.ok(vte.public_label.includes('大腿'));
  assert.ok(vte.public_note.includes('胸痛、呼吸困难'));
});
