import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { knowledge } from '../api/knowledge.mjs';
import { metadata, resolveAssessment } from '../api/resolver.mjs';

const data = knowledge();
const flatten = result => result.dimensions.flatMap(dimension => dimension.groups.flatMap(group => group.items));

test('common questions keep their source wording, while authored regional questions can replace the generic activity prompt', () => {
  const source = data.clinical_extension.ConsultationGuide;
  const specification = JSON.parse(readFileSync(new URL('../knowledge/review/consultation_v1.json', import.meta.url), 'utf8'));
  assert.equal(source.filter(row => row.Scope === 'GENERAL').length, 6);
  for (const region of data.tables['01_Region']) {
    const input = { region_id: region.region_id };
    const result = resolveAssessment(data, input);
    const common = result.consultation_guide.filter(row => row.scope === 'GENERAL');
    const replacements=new Set(result.consultation_guide.map(g=>source.find(row=>row.Guide_ID===g.guide_id)?.Replaces_Guide_ID).filter(Boolean));
    const expected = specification.guides.filter(row => !replacements.has(row.Guide_ID));
    assert.deepEqual(common.map(row => row.core_prompt), expected.map(row => row.Core_Prompt));
    assert.deepEqual(common.map(row => row.optional_probe), expected.map(row => row.Optional_Probe));
    assert.ok(result.consultation_guide.some(row => row.guide_id === 'QG-GOAL'));
    assert.ok(result.consultation_guide.every(row => Object.keys(row).every(key =>
      ['guide_id', 'topic', 'core_prompt', 'optional_probe', 'question_purpose', 'information_gained', 'assessment_help', 'scope'].includes(key))));
    assert.deepEqual(resolveAssessment(data, { ...input, consultation_answers: { 'QG-ONSET': '突然出现', 'QG-PROVOKE': '跑步' } }), result);
  }
});

test('regional questions stay scoped and a boundary does not duplicate common questions', () => {
  const changed = structuredClone(data);
  changed.clinical_extension.ConsultationGuide.push({ ...changed.clinical_extension.ConsultationGuide[0],
    Guide_ID: 'TEST-REGIONAL', Scope: 'REGION', Module_Codes: 'KNEE|LOWER_LEG', Region_IDs: 'KNEE-R-013|LL-R-005', Display_Order: 10 });
  assert.equal(resolveAssessment(changed, { region_id: 'LL-R-005' }).consultation_guide.length, 10);
  assert.ok(!resolveAssessment(changed, { region_id: 'LL-R-001' }).consultation_guide.some(row => row.guide_id === 'TEST-REGIONAL'));
  const boundary = resolveAssessment(changed, { region_ids: ['KNEE-R-013', 'LL-R-005'] });
  assert.equal(boundary.consultation_guide.filter(g=>g.scope==='GENERAL').length,6);
  assert.ok(boundary.consultation_guide.some(g=>g.guide_id==='TEST-REGIONAL'));
  assert.equal(new Set(boundary.consultation_guide.map(row => row.guide_id)).size,boundary.consultation_guide.length);
});

test('public labels are independent of rule prose and mechanical modifiers are not selectable', () => {
  const meta = metadata(data);
  for (let number = 1; number <= 5; number++) {
    const id = `AF-MF-0${number}`;
    assert.ok(!meta.contexts.some(rule => rule.rule_id === id));
    assert.throws(() => resolveAssessment(data, { region_id: 'AF-R-001', context_rule_ids: [id] }), RangeError);
  }
  assert.ok(meta.contexts.every(rule => rule.public_label && !Object.hasOwn(rule, 'source_context')));
  assert.equal(meta.contexts.find(rule => rule.rule_id === 'AF-MF-08').public_group, 'TIMING');
  const changed = structuredClone(data);
  const row = changed.tables['07_ContextRule'].find(rule => rule.rule_id === 'KNEE-MF-02');
  row.source_context = 'INTERNAL-ONLY'; row.public_label = '跑步时不适';
  assert.equal(metadata(changed).contexts.find(rule => rule.rule_id === row.rule_id).public_label, '跑步时不适');
  assert.ok(flatten(resolveAssessment(changed, { region_id: 'KNEE-R-003', context_rule_ids: [row.rule_id] }))
    .filter(item => item.context_sources.length).every(item => item.context_sources[0].label === '跑步时不适'));
});

test('explicit neighbouring regions merge shared items and keep associated items supplementary', () => {
  const ids = ['LL-R-005', 'KNEE-R-013'];
  const result = resolveAssessment(data, { region_ids: ids });
  assert.deepEqual(result.selection_regions.map(row => row.region_id), ids);
  for (const dimension of result.dimensions) {
    const items = dimension.groups.flatMap(group => group.items);
    assert.equal(items.length, new Set(items.map(item => item.item_id)).size);
  }
  const items = flatten(result);
  const primary = new Set(flatten(resolveAssessment(data, { region_id: ids[0] })).map(item => item.item_id));
  assert.ok(items.some(item => !primary.has(item.item_id)));
  assert.ok(items.filter(item => !primary.has(item.item_id)).every(item => item.display_mode === 'EXPAND'));
  assert.ok(items.some(item => item.region_sources.length === 2));
  assert.equal(result.consultation_guide.filter(g=>g.scope==='GENERAL').length,6);
  assert.ok(result.consultation_guide.some(g=>g.guide_id.startsWith('QG-KNEE-POST-')));
  assert.throws(() => resolveAssessment(data, { region_ids: ['LL-R-005', 'UNKNOWN'] }), RangeError);
  assert.throws(() => resolveAssessment(data, { region_id: 'LL-R-005', region_ids: ids }), RangeError);
});
