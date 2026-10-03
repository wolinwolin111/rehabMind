import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {transform} from 'esbuild';
import * as T from 'three';
import {acceleratedRaycast, computeBoundsTree} from 'three-mesh-bvh';

const read = path => readFileSync(new URL(path, import.meta.url));
const {code} = await transform(read('../src/muscle-picking.ts').toString(), {loader:'ts',format:'esm'});
const {muscleAtFace} = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const meta = JSON.parse(read('../public/3d/skin.json')).muscles;
const correctedIds = ['FJ1409','FJ1410','FJ1411','FJ1438','FJ1439','FJ1440'];
const original = JSON.parse(read('../baseline/RehabMind_LowerLimbV1_ImplementationBaseline_DBv3.7_2026-09-29/04_3D_Localization/model/atlas_metadata.json')).parts.filter(p=>p.system==='muscular'||correctedIds.includes(p.id.replace(/M$/,''))||/^(Left|Right) (subscapularis|levator scapulae)$/i.test(p.name));
const supplements = JSON.parse(read('../assets/anatomy-supplements/manifest.json')).parts;

test('every packed muscle retains its original identity and complete face interval', () => {
  assert.equal(meta.parts.length, original.length + supplements.length);
  let face = 0;
  original.forEach((source, index) => {
    const part = meta.parts[index];
    assert.equal(part.id, source.id);
    assert.equal(part.sourceName ?? part.name, source.name);
    assert.equal(part.conceptId,source.conceptId);
    assert.equal(part.firstFace, face);
    assert.equal(part.faceCount * 3, source.indexCount);
    assert.equal(muscleAtFace(meta.parts, face).id, source.id);
    assert.equal(muscleAtFace(meta.parts, face + part.faceCount - 1).id, source.id);
    face += part.faceCount;
  });
  assert.deepEqual(meta.parts.slice(original.length).map(part=>part.id),supplements.map(part=>part.id));
  for(const part of meta.parts.slice(original.length)) {
    assert.equal(part.firstFace,face);
    assert.equal(muscleAtFace(meta.parts,face).id,part.id);
    assert.equal(muscleAtFace(meta.parts,face+part.faceCount-1).id,part.id);
    face += part.faceCount;
  }
  assert.equal(face * 3, meta.indexCount);
  for (const invalid of [-1, .5, NaN, face]) assert.equal(muscleAtFace(meta.parts, invalid), null);
  assert.equal(meta.parts.find(p=>p.name==='Right vastus medialis').displayName, '右侧 · 股内侧肌');
});

test('BVH ray hits preserve the source triangle identities for lower limb muscles', () => {
  const raw = gunzipSync(read('../public/3d/muscles.pack'));
  const buffer = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  const positions = new Float32Array(buffer, meta.positions, meta.vertexCount * 3);
  const indices = new Uint32Array(buffer, meta.indices, meta.indexCount);
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
  geometry.setIndex(new T.BufferAttribute(indices, 1));
  const mesh = new T.Mesh(geometry, new T.MeshBasicMaterial({side:T.DoubleSide}));
  mesh.updateMatrixWorld();
  const probes = [];
  for (const name of ['Right vastus medialis','Left vastus medialis','Right vastus lateralis','Right rectus femoris','Right soleus','Right tibialis anterior']) {
    const part = meta.parts.find(p=>p.name===name);
    assert.ok(part, name);
    let found = false;
    for(let offset=0;offset<part.faceCount;offset+=Math.max(1,Math.floor(part.faceCount/35))) {
      const face = part.firstFace + offset;
      const [a,b,c] = [0,1,2].map(corner=>new T.Vector3().fromArray(positions,indices[face*3+corner]*3));
      const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      if(normal.lengthSq()===0) continue;
      const point = a.clone().add(b).add(c).multiplyScalar(1/3);
      const ray = new T.Raycaster(point.clone().addScaledVector(normal,.0001), normal.negate(),0,.001);
      const hit = ray.intersectObject(mesh,false)[0];
      if (hit && muscleAtFace(meta.parts,hit.faceIndex).id===part.id) {
        probes.push({ray,id:part.id,face:hit.faceIndex}); found=true; break;
      }
    }
    assert.ok(found, `No test ray reached ${name}`);
  }
  computeBoundsTree.call(geometry,{indirect:true});
  mesh.raycast = acceleratedRaycast;
  for(const {ray,id,face} of probes) {
    ray.firstHitOnly = true;
    const hit = ray.intersectObject(mesh,false)[0];
    assert.ok(hit);
    assert.equal(hit.faceIndex,face);
    assert.equal(muscleAtFace(meta.parts,hit.faceIndex).id,id);
  }
  geometry.dispose(); mesh.material.dispose();
});
