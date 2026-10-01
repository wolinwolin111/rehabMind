import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { knowledge } from '../api/knowledge.mjs';
import { metadata, resolveAssessment } from '../api/resolver.mjs';
import { findingDisplayNote } from '../api/finding-display.mjs';

const data = knowledge();
const meta = metadata(data);
const tables = data.tables;
const itemsById = new Map(tables['02_ClinicalItem'].map(row => [row.item_id, row]));

test('finding display preserves original descriptions and only keeps audited interpretation notes', () => {
  const source = new Map(data.clinical_extension.FindingFeature.map(row => [row.Feature_ID, row]));
  for (const region of meta.regions) {
    const result = resolveAssessment(data, { region_id: region.region_id });
    for (const item of allItems(result)) {
      for (const finding of item.possible_findings) {
        const original = source.get(finding.feature_id);
        if (!original) continue;
        assert.equal(finding.trigger_condition, original.Finding_Feature);
        assert.equal(finding.name, original.Finding_Name);
        assert.deepEqual(finding.display_note, findingDisplayNote(original));
      }
    }
  }
  assert.equal(findingDisplayNote(source.get('AFM-0074-LENGTH')), null);
  assert.equal(findingDisplayNote(source.get('AFM-0082-SWELLING')).text,
    source.get('AFM-0082-SWELLING').Finding_Interpretation);
  assert.ok(findingDisplayNote(source.get('AFM-0079-TENDON')));
});

function allItems(result) {
  return result.dimensions.flatMap(dimension => dimension.groups.flatMap(group => group.items));
}

test('v3.8 snapshot is generated from the current workbooks', () => {
  const workbook = readFileSync(new URL('../knowledge/RehabMind_KnowledgeDB_v3.8.xlsx', import.meta.url));
  const extension = readFileSync(new URL('../knowledge/RehabMind_ClinicalExtension_v1.1.xlsx', import.meta.url));
  assert.equal(data.workbook_sha256, createHash('sha256').update(workbook).digest('hex'));
  assert.equal(data.clinical_extension_sha256, createHash('sha256').update(extension).digest('hex'));
  assert.equal(data.database_version, 'v3.8');
  assert.equal(meta.regions.length, 38);
  assert.ok(tables['11_ContextItemMap'].length > 0);
  assert.equal(Object.keys(meta.dimension_labels).length, 6);
  assert.equal(Object.hasOwn(tables, '11_v3.6_MigrationLog'), false);
});

test('all 38 regions expose their assessments and optional context-driven directions', () => {
  for (const region of meta.regions) {
    const result = resolveAssessment(data, { region_id: region.region_id });
    const baseRows = tables['05_RegionClinicalMap'].filter(row => row.region_id === region.region_id);
    assert.ok(result.dimensions.length > 0, region.region_id);
    assert.equal(result.region.name, region.l3_region);
    assert.deepEqual(result.confirmed_findings, []);
    assert.deepEqual(result.intervention_references, []);
    for (const dimension of result.dimensions) {
      if (!dimension.groups.length) {
        assert.equal(dimension.key, 'FUNCTION');
        assert.ok(dimension.description);
      }
      assert.equal(dimension.label, meta.dimension_labels[dimension.key]);
      for (const group of dimension.groups) {
        assert.ok(group.items.length > 0);
        for (const item of group.items) {
          const source = itemsById.get(item.item_id);
          assert.ok(source, item.item_id);
          assert.equal(item.name, source.display_name);
          assert.equal(item.check_focus, data.clinical_extension.ClinicalPurpose.find(row => row.Item_ID === item.item_id)?.Assessment_Focus || source.check_focus);
          if (result.localization_area) {
            const guide = data.clinical_extension.LocationGuide.find(row => row.Area_ID === result.localization_area.area_id);
            const ids = [guide.Primary_Item_IDs,guide.Additional_Item_IDs,guide.Linked_Item_IDs].filter(Boolean).join('|').split('|');
            const label = guide.Assessment_Groups.split('|').find(value => value.startsWith(`${dimension.key}:`))?.slice(dimension.key.length+1);
            assert.ok(ids.includes(item.item_id));
            assert.ok(tables['05_RegionClinicalMap'].some(row => row.clinical_item_id === item.item_id && row.assessment_dimension === dimension.key));
            if (label) assert.equal(group.name,label);
          } else assert.ok(baseRows.some(row => row.clinical_item_id === item.item_id && row.assessment_dimension === dimension.key && row.assessment_group === group.name));
          assert.notEqual(item.display_mode, 'LINKED');
        }
      }
    }
  }
});

test('linked special tests appear only with matching context and do not create a finding', () => {
  const base = resolveAssessment(data, { region_id: 'AF-R-003' });
  assert.ok(!allItems(base).some(item => item.item_id === 'AF-SPT-001'));
  const linked = resolveAssessment(data, { region_id: 'AF-R-003', context_rule_ids: ['AF-CX-01'] });
  const item = allItems(linked).find(value => value.item_id === 'AF-SPT-001');
  assert.equal(item?.display_mode, 'LINKED');
  assert.equal(item?.context_state, 'highlighted');
  assert.deepEqual(linked.confirmed_findings, []);
  assert.deepEqual(linked.intervention_references, []);
});

test('profile adds considerations without changing base assessment', () => {
  const base = resolveAssessment(data, { region_id: 'KNEE-R-003' });
  const withProfile = resolveAssessment(data, { region_id: 'KNEE-R-003', patient_profile: { age_band: 'youth' } });
  assert.ok(withProfile.clinical_considerations.length > 0);
  assert.deepEqual(withProfile.dimensions, base.dimensions);
});

test('treatment references require an explicitly selected reachable finding', () => {
  const base = resolveAssessment(data, { region_id: 'KNEE-R-003' });
  const local = allItems(base).find(item => item.item_id === 'KNEE-LT-PATELLA');
  assert.ok(local);
  const findingId = local.possible_findings[0].finding_id;
  const opened = resolveAssessment(data, { region_id: 'KNEE-R-003', confirmed_finding_ids: [findingId] });
  assert.ok(opened.intervention_references.length > 0);
  assert.ok(opened.intervention_references.every(ref => ref.finding_id === findingId));
  assert.throws(() => resolveAssessment(data, { region_id: 'KNEE-R-003', confirmed_finding_ids: ['AF-FND-WINDLASS'] }), RangeError);
});

test('critical safety keeps assessment visible and suppresses ordinary treatment references', () => {
  const base = resolveAssessment(data, { region_id: 'KNEE-R-003' });
  const findingId = allItems(base).find(item => item.item_id === 'KNEE-LT-PATELLA').possible_findings[0].finding_id;
  const safe = resolveAssessment(data, { region_id: 'KNEE-R-003', context_rule_ids: ['KNEE-SAF-01'], confirmed_finding_ids: [findingId] });
  assert.ok(safe.safety_alerts.length > 0);
  assert.ok(safe.dimensions.length > 0);
  assert.equal(safe.normal_intervention_actions_enabled, false);
  assert.deepEqual(safe.intervention_references, []);
  const rule=tables['07_ContextRule'].find(rule => rule.rule_id === 'KNEE-SAF-01');
  assert.equal(safe.safety_alerts[0].guidance,[rule.trigger,rule.public_note].filter(Boolean).join('\n'));
  assert.ok(!Object.hasOwn(safe, 'context_notes'));
});

test('metadata omits context choices without a linked assessment or safety action', () => {
  assert.ok(meta.contexts.some(rule => rule.rule_id === 'KNEE-CX-01'));
  assert.ok(!meta.contexts.some(rule => rule.rule_id === 'K-CHAIN-001'));
  assert.ok(meta.contexts.some(rule => rule.rule_id === 'KNEE-SAF-01'));
});

test('lower leg and thigh function items are not a default testing battery', () => {
  for (const region of meta.regions.filter(row => row.module === 'LOWER_LEG' || row.module === 'THIGH')) {
    const result = resolveAssessment(data, { region_id: region.region_id });
    assert.deepEqual(result.dimensions.filter(dimension => dimension.key === 'FUNCTION').flatMap(dimension => dimension.groups.flatMap(group => group.items)), []);
  }
});

test('rectus femoris preview uses item-specific purpose, features and goal-linked methods', () => {
  const result = resolveAssessment(data, { region_id: 'KNEE-R-003' });
  const item = allItems(result).find(value => value.item_id === 'CORE-MUS-RF');
  assert.ok(item?.clinical_purpose);
  assert.ok(item.check_focus.length < itemsById.get('CORE-MUS-RF').check_focus.length);
  assert.deepEqual(item.possible_findings.map(finding => finding.name), ['局部张力增加', '拉长受限', '股直肌肌腹按压或活动痛']);
  assert.ok(item.possible_findings[0].interpretation);
  assert.ok(item.possible_findings[1].treatment_goals.some(goal => goal.methods.includes('股直肌拉伸')));
  assert.ok(!item.possible_findings[0].treatment_goals.some(goal => goal.methods.includes('股直肌拉伸')));
  assert.ok(item.possible_findings.every(finding => finding.review_status === '待临床审核'));
});

test('extension workbooks retain source-linked records and valid foreign keys', () => {
  const extra = data.clinical_extension;
  const currentItems = new Set(tables['02_ClinicalItem'].map(row => row.item_id));
  assert.ok(extra.ClinicalPurpose.every(row => currentItems.has(row.Item_ID)));
  const featureIds = new Set(extra.FindingFeature.map(row => row.Feature_ID));
  assert.ok(extra.InterventionReference.every(row => featureIds.has(row.Feature_ID) && row.Source_URL));
});

test('every knee item has a purpose and source-linked findings without forcing treatment', () => {
  const kneeItems = new Set(tables['05_RegionClinicalMap']
    .filter(row => row.region_id.startsWith('KNEE-')).map(row => row.clinical_item_id));
  const seen = new Set();
  for (const region of meta.regions.filter(row => row.module === 'KNEE')) {
    const rules = meta.contexts.filter(rule => rule.module_codes.includes('KNEE') && rule.rule_type !== 'SAFETY').map(rule => rule.rule_id);
    for (const item of allItems(resolveAssessment(data, { region_id: region.region_id, context_rule_ids: rules }))) {
      seen.add(item.item_id);
      assert.ok(item.clinical_purpose, item.item_id);
      assert.ok(item.possible_findings.length, item.item_id);
      assert.ok(item.possible_findings.every(finding => finding.review_status === '待临床审核' &&
        finding.trigger_condition && (finding.has_treatment || finding.display_note || finding.location_review)), item.item_id);
      assert.ok(item.possible_findings.flatMap(finding => finding.treatment_goals)
        .flatMap(goal => goal.methods).every(method => !/膝及相关关节活动改善|局部症状管理/.test(method)), item.item_id);
    }
  }
  assert.ok([...seen].every(id => kneeItems.has(id)));
  assert.deepEqual([...kneeItems].filter(id => !seen.has(id)), []);
  const ext = allItems(resolveAssessment(data, { region_id: 'KNEE-R-003' }))
    .find(item => item.item_id === 'KNEE-ROM-EXT');
  assert.ok(ext.possible_findings.find(finding => finding.name === '伸膝活动受限')
    ?.treatment_goals.some(goal => goal.methods.includes('膝关节伸直方向松动')));
});

test('knee function shows only clue-matched movement patterns, with no default testing battery', () => {
  const associations = {
    'KNEE-MF-01': '单腿动作控制', 'KNEE-MF-02': '步态与支撑',
    'KNEE-MF-03': '步态与支撑', 'KNEE-MF-04': '双腿负重模式',
    'KNEE-MF-05': '单腿动作控制', 'KNEE-MF-06': '单腿动作控制',
    'KNEE-MF-07': '落地缓冲与稳定', 'KNEE-MF-08': '减速与转向控制',
  };
  for (const region of meta.regions.filter(r => r.module === 'KNEE')) {
    const base = resolveAssessment(data, { region_id: region.region_id });
    assert.equal(base.dimensions.find(d => d.key === 'CAPACITY').label, '力量与募集');
    assert.equal(base.dimensions.find(d => d.key === 'FUNCTION').label, '功能动作');
    assert.deepEqual(base.dimensions.find(d => d.key === 'FUNCTION').groups, []);
    const timing = resolveAssessment(data, { region_id: region.region_id, context_rule_ids: ['KNEE-CX-01'] });
    assert.deepEqual(timing.dimensions.find(d => d.key === 'FUNCTION').groups, []);
    for (const [rule, name] of Object.entries(associations)) {
      const result = resolveAssessment(data, { region_id: region.region_id, context_rule_ids: [rule] });
      const patterns = result.dimensions.find(d => d.key === 'FUNCTION').groups.flatMap(g => g.items);
      assert.deepEqual(patterns.map(item => item.name), [name]);
      assert.ok(!allItems(result).some(item => item.item_id.startsWith('KNEE-TASK-')));
      for (const item of patterns) {
        assert.equal(item.display_mode, 'LINKED');
        assert.ok(item.clinical_purpose && item.check_focus);
        assert.ok(item.context_sources.some(s => s.note.includes('现场动作或已有视频')));
        assert.ok(item.possible_findings.every(f => f.review_status === '待临床审核'));
      }
      assert.deepEqual(result.confirmed_findings, []);
      assert.deepEqual(result.intervention_references, []);
    }
    const overlapping = resolveAssessment(data, { region_id: region.region_id, context_rule_ids: ['KNEE-MF-01', 'KNEE-MF-05', 'KNEE-MF-06'] });
    const single = overlapping.dimensions.find(d => d.key === 'FUNCTION').groups.flatMap(g => g.items);
    assert.equal(single.length, 1);
    assert.equal(single[0].context_sources.length, 3);
  }
});

test('every exposed non-safety context reaches its structured targets in all applicable regions', () => {
  for (const rule of meta.contexts.filter(rule => rule.rule_type !== 'SAFETY')) {
    const expected = tables['11_ContextItemMap'].filter(link => link.rule_id === rule.rule_id).map(link => link.clinical_item_id).sort();
    for (const region of meta.regions.filter(region => rule.module_codes.includes(region.module))) {
      const result = resolveAssessment(data, { region_id: region.region_id, context_rule_ids: [rule.rule_id] });
      const associated = allItems(result).filter(item => item.context_state === 'highlighted');
      assert.deepEqual(associated.map(item => item.item_id).sort(), expected, `${region.region_id}: ${rule.rule_id}`);
      assert.ok(associated.every(item => item.context_sources.some(source => source.rule_id === rule.rule_id)));
      assert.deepEqual(result.confirmed_findings, []);
      assert.deepEqual(result.intervention_references, []);
    }
  }
});

test('contexts merge without duplication, clear without residue, and ignore legacy target prose', () => {
  const input = { region_id: 'KNEE-R-003', context_rule_ids: ['KNEE-MF-01', 'KNEE-MF-02'] };
  const combined = resolveAssessment(data, input);
  const items = allItems(combined);
  assert.equal(items.length, new Set(items.map(item => item.item_id)).size);
  assert.equal(items.find(item => item.item_id === 'CORE-CAP-KNEE-EXT').context_sources.length, 2);
  assert.ok(allItems(resolveAssessment(data, { region_id: input.region_id })).every(item => !item.context_sources.length && item.context_state === 'base'));
  const changed = structuredClone(data);
  changed.tables['07_ContextRule'].forEach(rule => { if (rule.rule_type !== 'PROFILE') rule.target = 'UNRELATED-LEGACY-TEXT'; });
  assert.deepEqual(resolveAssessment(changed, input), combined);
});

test('new modules use configured scopes rather than rule or region ID prefixes', () => {
  const expanded = structuredClone(data);
  expanded.tables['10_Governance'].find(row => row.key === 'module_labels').value += '|SHOULDER:肩';
  expanded.tables['01_Region'].push({ ...tables['01_Region'][0], region_id: 'TEST-R-001', module: 'SHOULDER' });
  expanded.tables['05_RegionClinicalMap'].push({ ...tables['05_RegionClinicalMap'][0], map_id: 'TEST-MAP', region_id: 'TEST-R-001', display_mode: 'DEFAULT' });
  expanded.tables['07_ContextRule'].push({ rule_id: 'UNRELATED-PREFIX', rule_type: 'MOVEMENT', source_context: '测试范围', public_label: '测试范围', public_group: 'ACTIVITY', module_codes: 'SHOULDER' });
  expanded.tables['11_ContextItemMap'].push({ map_id: 'TEST-CIM', rule_id: 'UNRELATED-PREFIX', clinical_item_id: tables['05_RegionClinicalMap'][0].clinical_item_id, status: 'Stable' });
  assert.ok(metadata(expanded).modules.some(module => module.id === 'SHOULDER'));
  assert.ok(allItems(resolveAssessment(expanded, { region_id: 'TEST-R-001', context_rule_ids: ['UNRELATED-PREFIX'] })).some(item => item.context_state === 'highlighted'));
  assert.throws(() => resolveAssessment(expanded, { region_id: 'KNEE-R-003', context_rule_ids: ['UNRELATED-PREFIX'] }), RangeError);
});

test('local tissue references distinguish tissue context and retain evidence limitations internally', () => {
  const found = new Map();
  for (const region of meta.regions.filter(row => row.module === 'KNEE')) {
    for (const item of allItems(resolveAssessment(data, { region_id: region.region_id }))) {
      if (item.item_id.startsWith('KNEE-LT-')) found.set(item.item_id, item);
    }
  }
  assert.equal(found.size, 7);
  const features = [...found.values()].flatMap(item => item.possible_findings);
  assert.equal(features.length,27);
  assert.ok(!features.some(row=>row.feature_id==='AFM-0083-LOCALISE'));
  const methods = features.flatMap(row => row.treatment_goals).flatMap(row => row.methods);
  assert.ok(methods.includes('脂肪垫减压贴扎'));
  assert.ok(methods.includes('鹅足区肌内效贴贴扎'));
  assert.ok(methods.includes('经皮神经电刺激（TENS）'));
  assert.ok(!methods.some(method => /冷疗|冰敷|肿胀管理|调整诱发动作负荷|低刺激主动活动|局部贴扎辅助/.test(method)));
  const posteriorSwelling = features.find(row => row.feature_id === 'AFM-0082-SWELLING');
  assert.equal(posteriorSwelling.has_treatment, false);
  assert.deepEqual(posteriorSwelling.treatment_goals, []);
  assert.ok(posteriorSwelling.interpretation.includes('血栓'));
  const tendon = features.find(row => row.feature_id === 'AFM-0079-TENDON');
  const fatpad = features.find(row => row.feature_id === 'AFM-0079-FATPAD');
  assert.ok(tendon.treatment_goals.flatMap(row => row.methods).includes('膝伸慢速抗阻训练'));
  assert.ok(!fatpad.treatment_goals.flatMap(row => row.methods).includes('膝伸慢速抗阻训练'));
  const pfp = features.find(row => row.feature_id === 'AFM-0078-PFP');
  assert.ok(!pfp.treatment_goals.flatMap(row => row.methods).some(method => /超声|电刺激/.test(method)));
  const ids = new Set(features.map(row => row.feature_id));
  const refs = data.clinical_extension.InterventionReference.filter(row => ids.has(row.Feature_ID));
  assert.ok(refs.every(row => row.Source_Note && row.Source_URL));
  assert.ok(refs.some(row => row.Source_Note.includes('不能分离单项效果')));
  assert.ok(!JSON.stringify([...found.values()]).includes('失访不均'));
});
