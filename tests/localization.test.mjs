import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {meta,surface as semantics,positions,indices,localizeFace,chooseGestureRegion} from './helpers/surface-atlas.mjs';
const knowledge = JSON.parse(readFileSync(new URL('../build/knowledge/runtime.json', import.meta.url), 'utf8'));

test('the visible model uses the complete demo mesh and skeletal layer', () => {
  assert.equal(meta.mesh.faceCount, 44744);
  // Ten source meshes tagged skeletal are tibialis/fibularis muscles, now in their own layer.
  assert.equal(meta.bones.partCount, 286);
  assert.deepEqual(meta.features.map(feature => feature.name), ['Eyebrow', 'Hair of head', 'Lip']);
  assert.equal(semantics.roots.length, meta.mesh.faceCount);
});

test('model points reach every specific region on both sides', () => {
  const reached = new Set();
  for (let face = 0; face < meta.mesh.faceCount; face++) {
    const point = { x: 0, y: 0, z: 0 };
    for (let corner = 0; corner < 3; corner++) {
      const vertex = indices[face * 3 + corner];
      point.x += positions[vertex * 3] / 3;
      point.y += positions[vertex * 3 + 1] / 3;
      point.z += positions[vertex * 3 + 2] / 3;
    }
    const hit = localizeFace(meta, semantics, face, point);
    if (hit) for (const id of hit.regionIds || [hit.regionId]) reached.add(`${id}:${hit.side}`);
  }
  const specific = knowledge.tables['01_Region'].filter(region => region.region_id !== 'KNEE-R-015');
  for (const region of specific) {
    assert.ok(reached.has(`${region.region_id}:left`), `${region.region_id} left`);
    assert.ok(reached.has(`${region.region_id}:right`), `${region.region_id} right`);
  }
});

test('circling multiple knee areas reaches the diffuse knee region', () => {
  const votes = ['KNEE-R-001', 'KNEE-R-002', 'KNEE-R-003'].map(regionId => ({
    hit: { regionId, module: 'KNEE', side: 'left', source: 'surface', displayName: regionId },
    count: 4,
  }));
  assert.equal(chooseGestureRegion(votes, true, meta.surface_atlas.gesture_groups)?.regionId, 'KNEE-R-015');
  assert.equal(chooseGestureRegion(votes, false, meta.surface_atlas.gesture_groups)?.regionId, 'KNEE-R-001');
});
