import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as T from '../../node_modules/three/build/three.module.js';
import { acceleratedRaycast, computeBoundsTree } from '../../node_modules/three-mesh-bvh/build/index.module.js';
import { transform } from '../../node_modules/esbuild/lib/main.js';

const root = 'baseline/RehabMind_LowerLimbV1_ImplementationBaseline_DBv3.7_2026-09-29/04_3D_Localization';
const meta = JSON.parse(fs.readFileSync('public/3d/skin.json'));
const raw = gunzipSync(fs.readFileSync('public/3d/skin.pack'));
const positions = new Float32Array(raw.buffer, raw.byteOffset + meta.mesh.positions, meta.mesh.vertexCount * 3);
const indices = new Uint32Array(raw.buffer, raw.byteOffset + meta.mesh.indices, meta.mesh.indexCount);
const semantics = fs.readFileSync(`${root}/semantics/skin_semantics.bin`);
const sourceAreas=JSON.parse(fs.readFileSync(`${root}/semantics/skin_semantics_metadata.json`)).areas;
const chart = JSON.parse(fs.readFileSync('build/authoring/surface-atlas-build.json'));
const { code } = await transform(fs.readFileSync('src/localization.ts', 'utf8'), { loader: 'ts', format: 'esm' });
const { localizeFace, decodeSurfaceAtlas } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const atlasBytes=fs.readFileSync('public/3d/surface_atlas.bin');
const surface=decodeSurfaceAtlas(meta,atlasBytes.buffer.slice(atlasBytes.byteOffset,atlasBytes.byteOffset+atlasBytes.byteLength),raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
const geo = new T.BufferGeometry();
geo.setAttribute('position', new T.BufferAttribute(positions, 3));
geo.setIndex(new T.BufferAttribute(indices, 1));
const before = geo.index.array.slice();
computeBoundsTree.call(geo, { indirect: true });
const ordinary = new T.Mesh(geo, new T.MeshBasicMaterial({ side: T.DoubleSide }));
const accelerated = new T.Mesh(geo, ordinary.material);
accelerated.raycast = acceleratedRaycast;
ordinary.updateMatrixWorld(); accelerated.updateMatrixWorld();
const atlas = JSON.parse(fs.readFileSync(`${root}/model/atlas_metadata.json`));
const bones = atlas.parts.filter(p => p.system === 'skeletal' && /^(Left|Right) (tibia|fibula|patella)$/.test(p.name)).map(p => {
  const chunk = gunzipSync(fs.readFileSync(`${root}/model/chunks/body-${p.chunk}.bin.gz`));
  const points = Array.from({ length: p.vertexCount }, (_, i) => [0, 1, 2].map(axis => chunk.readFloatLE(p.positions + i * 12 + axis * 4)));
  return { name: p.name, bounds: [0, 1, 2].map(axis => [Math.min(...points.map(v => v[axis])), Math.max(...points.map(v => v[axis]))]) };
});
const boundsAt = (side, y) => {
  const samples = chart.charts[side];
  const lower = [...samples].reverse().find(s => s.y <= y), upper = samples.find(s => s.y >= y);
  const t = lower.y === upper.y ? 0 : (y - lower.y) / (upper.y - lower.y);
  return lower.bounds.map((v, i) => v + t * (upper.bounds[i] - v));
};
const rays = [];
for (const side of ['left', 'right']) for (const y of [.16, .20, .25, .30, .36, .40]) {
  const b = boundsAt(side, y), sign = side === 'left' ? 1 : -1;
  const center = new T.Vector3(sign * (b[0] + b[1]) / 2, y, (b[2] + b[3]) / 2);
  // Sector names describe the ray approach, not an asserted diagnosis or
  // clinical ground truth. Medial rays start between legs to avoid occlusion.
  for (const elevation of [-25, 0, 25]) for (const [view, degrees] of [['front', 0], ['front-lateral', 45], ['lateral', 90], ['back-lateral', 135], ['back', 180], ['back-inner-10', 190], ['back-inner-20', 200], ['back-medial', 225], ['medial', 270], ['front-medial', 315]]) {
    const angle = degrees * Math.PI / 180;
    const tilt = elevation * Math.PI / 180;
    const outward = new T.Vector3(sign * Math.sin(angle) * Math.cos(tilt), Math.sin(tilt), Math.cos(angle) * Math.cos(tilt));
    const distance = Math.sin(angle) < -.01 ? (Math.abs(center.x) - .005) / (-Math.sin(angle) * Math.cos(tilt)) : .8;
    const ray = new T.Raycaster(center.clone().addScaledVector(outward, distance), outward.clone().negate());
    ray.firstHitOnly = true;
    const a = ray.intersectObject(ordinary)[0], bvh = ray.intersectObject(accelerated)[0];
    if (!a) { rays.push({ side, y, view, elevation, miss: true }); continue; }
    const selected = localizeFace(meta, surface, a.faceIndex, a.point);
    const patch = sourceAreas.find(row => row.code === semantics[a.faceIndex * 3]);
    rays.push({ side, y, view, elevation, point: a.point.toArray(), face: a.faceIndex,
      bvh_same: a.faceIndex === bvh?.faceIndex && a.point.distanceTo(bvh.point) < 1e-6,
      intended_side_hit: (a.point.x > 0 ? 'left' : 'right') === side,
      original_surface: patch?.clinicalSubregionId || 'unlabelled', selected });
  }
}
const kneeLabelsOnCalf = [];
for (let face = 0; face < meta.mesh.faceCount; face++) {
  const area = sourceAreas.find(row => row.code === semantics[face * 3]);
  if (!area?.clinicalSubregionId.startsWith('REG-KNEE-')) continue;
  const p = new T.Vector3();
  for (const c of [0, 1, 2]) p.add(new T.Vector3().fromArray(positions, indices[face * 3 + c] * 3).multiplyScalar(1 / 3));
  if (p.y < .405) kneeLabelsOnCalf.push({ face, side: area.side, patch: area.clinicalSubregionId, point: p.toArray() });
}
const output = { note: 'Read-only engineering audit; sampled ray approaches do not measure clinical accuracy.',
  index_unchanged: before.every((v, i) => v === geo.index.array[i]), bones, rays, kneeLabelsOnCalf };
fs.writeFileSync('build/authoring/surface-atlas-view-audit.json', JSON.stringify(output, null, 2));
console.log(JSON.stringify({ index_unchanged: output.index_unchanged,
  bvh_mismatches: rays.filter(r => !r.miss && !r.bvh_same).length, bones,
  knee_on_calf: [...new Set(kneeLabelsOnCalf.map(r => r.patch))].map(patch => ({ patch,
    faces: kneeLabelsOnCalf.filter(r => r.patch === patch).length,
    min_y: Math.min(...kneeLabelsOnCalf.filter(r => r.patch === patch).map(r => r.point[1])) })),
  rays: rays.filter(r => r.elevation===0&&(['back-inner-10','back-inner-20'].includes(r.view) || (r.y===.36&&['lateral','front-lateral'].includes(r.view)))).map(r => ({ side:r.side,y:r.y,view:r.view,
    patch:r.original_surface,region:r.selected?.regionId,area:r.selected?.areaId,name:r.selected?.displayName })) }, null, 2));
