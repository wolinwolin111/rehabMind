import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as T from 'three';

const root=fileURLToPath(new URL('../',import.meta.url));
const generated=spawnSync(process.execPath,['scripts/run-python.mjs','scripts/attachment_trial.py'],{cwd:root,encoding:'utf8'});
assert.equal(generated.status,0,generated.stderr);
const read=path=>readFileSync(new URL('../'+path,import.meta.url));
const baseline='baseline/RehabMind_LowerLimbV1_ImplementationBaseline_DBv3.7_2026-09-29/04_3D_Localization/model/';
const atlas=JSON.parse(read(baseline+'atlas_metadata.json'));
const trial=JSON.parse(read('public/3d/attachment-trial.json'));

test('trial retains original geometry and identities for all 38 attachment review structures',()=>{
  assert.equal(new Set(trial.meshes.map(p=>p.id)).size,38);
  const chunks=new Map();
  for(const part of trial.meshes) {
    const original=atlas.parts.find(p=>p.id===part.id);assert.ok(original);
    assert.equal(original.conceptId,part.conceptId);assert.equal(original.name,part.name);
    if(!chunks.has(original.chunk))chunks.set(original.chunk,gunzipSync(read(baseline+`chunks/body-${original.chunk}.bin.gz`)));
    const raw=chunks.get(original.chunk);
    const positions=raw.subarray(original.positions,original.positions+original.vertexCount*12);
    const indices=raw.subarray(original.indices,original.indices+original.indexCount*4);
    const actualPositions=Buffer.from(new Float32Array(part.positions).buffer);
    const actualIndices=Buffer.from(new Uint32Array(part.indices).buffer);
    assert.ok(positions.equals(actualPositions),part.name+' vertices changed');
    assert.ok(indices.equals(actualIndices),part.name+' triangles changed');
    assert.equal(createHash('sha256').update(positions).update(indices).digest('hex'),part.sourceGeometrySha256);
    assert.ok(part.positions.every(Number.isFinite));
    assert.ok(part.indices.every(i=>Number.isInteger(i)&&i>=0&&i<original.vertexCount));
  }
});

test('recovered Achilles tendons are independent source tissues, not assigned to one muscle',()=>{
  assert.deepEqual(trial.meshes.filter(p=>p.role==='tendon').map(p=>p.id),['FJ1405','FJ1405M']);
  const production=JSON.parse(read('public/3d/skin.json'));
  for(const id of trial.recovered) {
    assert.equal(atlas.parts.find(p=>p.id===id).system,'connective');
    assert.ok(!production.muscles.parts.some(p=>p.id===id));
    assert.ok(!production.bones.parts.some(p=>p.id===id));
  }
  assert.equal(trial.rectusProximalTendon.status,'no separate source part');
  assert.ok(!trial.meshes.some(p=>/reflected|direct head of .*rectus/i.test(p.name)));
});

test('actual raycasts select restored left/right tendons without relabeling muscle or bone',()=>{
  const keys=new Set(['tibia','fibula','talus','calcaneus','soleus','medial head of gastrocnemius','lateral head of gastrocnemius','calcaneal tendon']);
  for(const side of ['right','left']) {
    const meshes=trial.meshes.filter(p=>p.side===side&&keys.has(p.key)).map(p=>{
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p.positions,3));g.setIndex(p.indices);
      const mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.userData.part=p;mesh.updateMatrixWorld();return mesh;
    });
    const tendon=meshes.find(m=>m.userData.part.role==='tendon');
    const p=tendon.geometry.getAttribute('position'),i=tendon.geometry.index.array;
    let recovered=false;
    for(let face=0;face<i.length/3&&!recovered;face+=11) {
      const a=new T.Vector3().fromBufferAttribute(p,i[face*3]),b=new T.Vector3().fromBufferAttribute(p,i[face*3+1]),c=new T.Vector3().fromBufferAttribute(p,i[face*3+2]);
      const center=a.clone().add(b).add(c).multiplyScalar(1/3);
      const normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      if(!normal.lengthSq())continue;
      const ray=new T.Raycaster(center.clone().addScaledVector(normal,.003),normal.negate(),0,.008);
      const hit=ray.intersectObjects(meshes,false)[0];
      if(hit?.object===tendon) {recovered=true;assert.equal(hit.object.userData.part.id,side==='right'?'FJ1405':'FJ1405M');}
    }
    assert.ok(recovered,side+' restored tendon never selectable');
    for(const m of meshes){m.geometry.dispose();m.material.dispose();}
  }
});
