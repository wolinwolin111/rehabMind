import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

test('postoperative catalog links to complete, unchanged source files and local assets', async () => {
  const catalog = JSON.parse(await readFile('src/content/postop-catalog.json', 'utf8'));
  const manifest = JSON.parse(await readFile('docs/POSTOP_IMPORT_MANIFEST.json', 'utf8'));
  assert.equal(catalog.length, 6);
  assert.equal(new Set(catalog.map(item => item.id)).size, catalog.length);
  assert.deepEqual(catalog.map(item => item.id), manifest.documents);
  const knownFiles = new Set(manifest.files.map(item => path.resolve(item.file)));
  for (const record of manifest.files) {
    const data = await readFile(record.file);
    assert.equal(data.length, record.bytes, record.file);
    assert.equal(createHash('sha256').update(data).digest('hex'), record.sha256, record.file);
  }
  for (const item of catalog) {
    const file = path.resolve('public', item.file);
    assert.ok(knownFiles.has(file));
    const html = await readFile(file, 'utf8');
    assert.ok(html.includes('参考依据'), `${item.id}: references preserved`);
    assert.ok(html.includes('cycle-panel'), `${item.id}: full stage content preserved`);
    for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
      const reference = match[1];
      if (/^(?:#|data:|https?:|\/\/)/i.test(reference)) continue;
      assert.ok(knownFiles.has(path.resolve(path.dirname(file), decodeURIComponent(reference.split(/[?#]/)[0]))), `${item.id}: missing ${reference}`);
    }
  }
});

test('professional edition preserves all 29 rupture/postoperative stages and first-stage exercise references', async () => {
  const guides = JSON.parse(await readFile('src/content/postop-professional.json', 'utf8'));
  const expected = { acl: [5, 25], meniscus: [4, 20], 'acl-meniscus': [4, 20], pcl: [4, 20], 'patellar-dislocation': [4, 20], 'achilles-rupture': [8, 32] };
  assert.equal(guides.length, 6);
  for (const guide of guides) {
    const source = await readFile(path.resolve('public', guide.file), 'utf8');
    assert.equal(guide.phases.length, expected[guide.id][0]);
    assert.equal(guide.phases.flatMap(phase => phase.exercises).length, expected[guide.id][1]);
    assert.ok(guide.paths.some(route => route.id === guide.default_path));
    assert.equal(new Set(guide.phases.map(phase => phase.id)).size, guide.phases.length);
    for (const phase of guide.phases) {
      assert.ok(source.includes(`id="${phase.id}"`), phase.id);
      for (const key of ['goals', 'protection', 'progression', 'assessment', 'exercises', 'alerts']) assert.ok(phase[key].length, `${phase.id}: ${key}`);
      for (const exercise of phase.exercises) {
        assert.ok(source.includes(exercise.name), `${phase.id}: ${exercise.name}`);
        assert.ok(exercise.purpose.length && exercise.details.some(item => item.label === '停止或退阶' && item.text));
      }
    }
    for (const route of guide.paths) {
      assert.ok(route.scope && route.protection && route.exclude, `${guide.id}: ${route.id}`);
      for (const id of route.phase_ids) assert.ok(guide.phases.some(phase => phase.id === id));
      assert.equal(route.has_phases, !!route.phase_ids.length);
    }
    for (const reference of guide.references) assert.ok(source.includes(reference.url));
  }
});

test('different operations and nonoperative pathways do not silently inherit conflicting calendars', async () => {
  const guides = JSON.parse(await readFile('src/content/postop-professional.json', 'utf8'));
  const get = id => guides.find(guide => guide.id === id);
  for (const id of ['meniscus', 'patellar-dislocation']) {
    assert.ok(get(id).phases.every(phase => !phase.time));
    assert.ok(get(id).paths.every(route => !route.show_time));
  }
  for (const id of ['acl', 'pcl']) {
    const guide = get(id);
    assert.ok(guide.paths.filter(route => route.id !== guide.default_path).every(route => !route.phase_ids.length));
  }
  const achilles = get('achilles-rupture');
  const repair = achilles.paths.find(route => route.id === 'path-operative').phase_ids;
  const partial = achilles.paths.find(route => route.id === 'path-nonop').phase_ids;
  assert.equal(repair.length, 4);
  assert.equal(partial.length, 4);
  assert.ok(repair.every(id => !partial.includes(id)));
  assert.ok(achilles.paths.find(route => route.id === 'path-reconstruction').phase_ids.length === 0);
  for (const phase of get('meniscus').phases) {
    const resection = phase.path_overrides.find(item => item.path_id === 'path-meniscectomy');
    assert.ok(resection);
    assert.ok(!resection.protection.join('').includes('根部'));
  }
  assert.ok(!get('acl').return_criteria.join('').includes('九成'));
  assert.ok(!get('meniscus').phases.flatMap(phase => phase.progression).join('').includes('6–9个月'));
});
