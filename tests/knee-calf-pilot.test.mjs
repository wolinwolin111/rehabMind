import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { knowledge } from '../api/knowledge.mjs';
import { metadata, resolveAssessment } from '../api/resolver.mjs';

const data = knowledge(), areaId = 'LOC-KNEE-CALF-POST';
const input = { localization_area_id: areaId };
const flatten = result => result.dimensions.flatMap(d => d.groups.flatMap(g => g.items));
const spec = JSON.parse(readFileSync(new URL('../knowledge/review/knee_calf_pilot_v1.json', import.meta.url)));

test('curated location shows eight primary assessments, separate supplements and no default action catalogue', () => {
  const result = resolveAssessment(data, input), items = flatten(result);
  assert.equal(result.localization_area.display_name, '膝后及小腿上段');
  assert.deepEqual(result.selection_regions.map(row => row.region_id), ['LL-R-005','KNEE-R-013']);
  assert.deepEqual(new Set(items.filter(row => row.display_mode === 'DEFAULT').map(row => row.item_id)), new Set(spec.location.Primary_Item_IDs.split('|')));
  assert.deepEqual(new Set(items.filter(row => row.display_mode === 'EXPAND').map(row => row.item_id)), new Set(spec.location.Additional_Item_IDs.split('|')));
  assert.equal(items.length, new Set(items.map(row => row.item_id)).size);
  assert.ok(items.every(row => row.clinical_purpose && row.check_focus));
  assert.equal(result.dimensions.find(row => row.key === 'FUNCTION').groups.length, 0);
  assert.equal(result.dimensions.find(row => row.key === 'MUSCLE_STATE').groups.length, 1);
  assert.equal(result.related_tissues.length, 3);
  assert.ok(result.related_tissues[0].tissues.includes('腘肌'));
  const local = items.find(row => row.item_id === 'LL-LT-005');
  assert.equal(local.possible_findings.length, 5);
  assert.ok(local.possible_findings.every(row => row.review_status));
  assert.ok(local.possible_findings.filter(row => /SWELLING|EXERTIONAL/.test(row.feature_id)).every(row => !row.has_treatment));
  assert.ok(local.possible_findings.find(row => row.feature_id === 'AFM-0058-SWELLING').display_note);
  assert.throws(() => resolveAssessment(data, { ...input, region_id:'LL-R-005' }), RangeError);
  assert.throws(() => resolveAssessment(data, { localization_area_id:'INVALID' }), RangeError);
  assert.ok(!JSON.stringify(metadata(data).localization_areas).includes('Internal_Note'));
});

test('regional consultation replaces one repeated general question, has no answers and stays in this location', () => {
  const result = resolveAssessment(data, input);
  assert.equal(result.consultation_guide.filter(row => row.scope === 'LOCATION').length, 4);
  assert.equal(result.consultation_guide.filter(row => row.scope === 'GENERAL').length, 5);
  assert.ok(!result.consultation_guide.some(row => row.guide_id === 'QG-PROVOKE'));
  assert.deepEqual(resolveAssessment(data, { ...input, consultation_answers:{'QG-KC-ACTIVITY':'提踵'} }), result);
  assert.equal(resolveAssessment(data, {region_id:'LL-R-005'}).consultation_guide.length, 9);
  assert.ok(!result.consultation_guide.some(row => row.guide_id.startsWith('QG-LPU-')));
  assert.ok(result.consultation_guide.find(row => row.guide_id === 'QG-GOAL').assessment_help.includes('当前能力是否满足需求'));
  const extension = data.clinical_extension;
  assert.ok(!extension.InterventionReference.some(row => spec.retired_references.includes(row.Reference_ID)));
  assert.ok(flatten(result).find(row => row.item_id === 'KNEE-ROM-EXT').possible_findings.some(row => row.treatment_goals.some(goal => goal.methods.includes('腘肌手法松解'))));
});

test('posterior overlap is reachable on both sides without wrapping onto the lateral calf', async () => {
  const {rayAt,raw,chooseGestureRegion}=await import('./helpers/surface-atlas.mjs');
  const recipe=JSON.parse(readFileSync(new URL('../scripts/surface_regions.json',import.meta.url)));
  assert.equal(createHash('sha256').update(raw).digest('hex'),recipe.source_skin_sha256);
  for(const side of ['left','right']){
    const hit=rayAt(side,.40,180).selected;
    assert.equal(hit.areaId,areaId);
    assert.deepEqual(hit.regionIds,['LL-R-005','KNEE-R-013']);
    assert.equal(chooseGestureRegion([{hit,count:20}],true).areaId,areaId);
    const lateral=rayAt(side,.36,90).selected;
    assert.equal(lateral.regionId,'LL-R-004');assert.ok(!lateral.areaId);
  }
});
