import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {computeBoundsTree,acceleratedRaycast} from 'three-mesh-bvh';
import {build} from 'esbuild';
const meta=JSON.parse(fs.readFileSync('public/3d/skin.json')).muscles;
const assets=JSON.parse(fs.readFileSync('assets/anatomy-supplements/manifest.json'));
const review=JSON.parse(fs.readFileSync('docs/MISSING_MUSCLE_ATTACHMENT_REVIEW.json'));
const raw=gunzipSync(fs.readFileSync('public/3d/muscles.pack'));
const buffer=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
const positions=new Float32Array(buffer,meta.positions,meta.vertexCount*3);
const indices=new Uint32Array(buffer,meta.indices,meta.indexCount);
const hash=raw=>createHash('sha256').update(raw).digest('hex');
async function load(path){const b=await build({entryPoints:[path],bundle:true,write:false,format:'esm'});return import(`data:text/javascript;base64,${Buffer.from(b.outputFiles[0].text).toString('base64')}`);}
const {peelMuscleIndices}=await load('src/content/muscle-layers.ts');
const {selectedMuscleIndices}=await load('src/muscle-selection.ts');

test('all registered assets are packed exactly, uniquely and with source-bound attachment reviews',()=>{
 assert.equal(assets.parts.length,26);
 assert.equal(new Set(assets.parts.map(p=>p.id)).size,26);
 for(const a of assets.parts){
  const p=meta.parts.find(p=>p.id===a.id);assert.ok(p,a.id);
  const asset=gunzipSync(fs.readFileSync('assets/anatomy-supplements/'+a.file));
  const local=new Uint32Array(asset.buffer.slice(asset.byteOffset+a.indices,asset.byteOffset+a.indices+a.indexCount*4));
  const packed=indices.subarray(p.firstFace*3,(p.firstFace+p.faceCount)*3);const offset=packed[0]-local[0];
  assert.ok(packed.every((v,n)=>v-offset===local[n]),p.id);
  assert.deepEqual(raw.subarray(meta.positions+offset*12,meta.positions+(offset+a.vertexCount)*12),asset.subarray(0,a.vertexCount*12));
  assert.equal(p.sourceGeometrySha256,hash(asset));
  const audited=review.parts.find(r=>r.id===p.id);assert.equal(audited.assetSha256,hash(asset));
  const field=review.registrationFieldSamples.rows.find(r=>r.sourceMesh===a.sourceMesh);
  assert.ok(field&&field.samples>0&&field.nonpositiveSamples===0&&field.minimumDeterminant>0,p.id+' sampled registration field');
  assert.ok(audited.contacts.filter(c=>c.representedInSource).every(c=>c.p95Mm<=6),p.id+' represented attachment patch gap');
  for(const c of audited.contacts.filter(c=>!c.representedInSource)){
   assert.ok(p.name.includes('internal oblique')&&c.sourceBone.startsWith('Ninth_rib'));
   assert.ok(c.sourceGapMm>25&&c.coverageNote.includes('Ninth-rib representation is absent'));
  }
  assert.ok(audited.areaRatioP01>.2&&audited.areaRatioP99<3,p.id+' mesh distortion');
  const points=new Float32Array(asset.buffer.slice(asset.byteOffset,asset.byteOffset+a.vertexCount*12));
  assert.ok(points.every(Number.isFinite));
  const xs=Array.from(points).filter((_,n)=>n%3===0);
  assert.ok(a.side==='right'?Math.max(...xs)<.015:Math.min(...xs)>-.015,p.id+' side');
 }
});

test('supplemental connective meshes retain their own identities, geometry and reviewed source hashes',()=>{
 const tendonMeta=JSON.parse(fs.readFileSync('public/3d/skin.json')).tendons;
 const tendonRaw=gunzipSync(fs.readFileSync('public/3d/tendons.pack'));
 assert.equal(assets.connective.length,7);
 for(const a of assets.connective){
  const p=tendonMeta.parts.find(p=>p.id===a.id);assert.ok(p,a.id);
  const asset=gunzipSync(fs.readFileSync('assets/anatomy-supplements/'+a.file));
  const count=a.indexCount;
  const local=new Uint32Array(asset.buffer.slice(asset.byteOffset+a.indices,asset.byteOffset+a.indices+count*4));
  const start=tendonMeta.indices+p.firstFace*12;
  const packed=new Uint32Array(tendonRaw.buffer.slice(tendonRaw.byteOffset+start,tendonRaw.byteOffset+start+count*4));
  const offset=packed[0]-local[0];assert.ok(packed.every((v,n)=>v-offset===local[n]));
  assert.deepEqual(tendonRaw.subarray(tendonMeta.positions+offset*12,tendonMeta.positions+(offset+a.vertexCount)*12),asset.subarray(0,a.vertexCount*12));
  assert.equal(p.sourceGeometrySha256,hash(asset));
  assert.equal(review.connective.find(r=>r.id===a.id).assetSha256,hash(asset));
  assert.deepEqual(p.relatedMuscles,a.relatedMuscles);assert.equal(p.kind,'fascia');
 }
});

test('every new muscle can be ray-selected in the peeled model and isolated independently',()=>{
 const peeled=peelMuscleIndices(indices,meta.parts,'all',0);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setIndex(new T.BufferAttribute(peeled.indices,1));
 computeBoundsTree.call(g,{indirect:true});
 const mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.raycast=acceleratedRaycast;mesh.updateMatrixWorld();
 for(const a of assets.parts){
  const p=peeled.parts.find(p=>p.id===a.id);assert.ok(p,a.id);let hitCorrect=false;
  for(let f=p.firstFace;f<p.firstFace+p.faceCount;f+=11){
   const [a,b,c]=[0,1,2].map(n=>new T.Vector3().fromArray(positions,peeled.indices[f*3+n]*3));
   const normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
   const center=a.clone().add(b).add(c).multiplyScalar(1/3);
   const ray=new T.Raycaster(center.clone().addScaledVector(normal,.000005),normal.negate(),0,.00002);
   const hit=ray.intersectObject(mesh)[0];
   if(hit?.faceIndex>=p.firstFace&&hit.faceIndex<p.firstFace+p.faceCount){hitCorrect=true;break;}
  }
  assert.ok(hitCorrect,a.id);
  const solo=selectedMuscleIndices(indices,meta.parts,meta.parts.find(p=>p.id===a.id));
  assert.equal(solo.parts.length,1);assert.equal(solo.parts[0].id,a.id);
  assert.equal(solo.indices.length,a.indexCount);
 }
 g.dispose();mesh.material.dispose();
});

test('dorsal foot interossei have correct neighbouring metatarsals and digit-specific insertions',()=>{
 const ord=['first','second','third','fourth','fifth'];
 for(const side of ['Right','Left'])for(let n=0;n<4;n++){
  const r=review.parts.find(p=>p.name===`${side} ${ord[n]} dorsal interosseous of foot`);assert.ok(r);
  assert.deepEqual(r.contacts.map(c=>c.bone),[`${side} ${ord[n]} metatarsal bone`,`${side} ${ord[n+1]} metatarsal bone`,`Proximal phalanx of ${side.toLowerCase()} ${ord[n<2?1:n]} toe`]);
 }
 const deep=peelMuscleIndices(indices,meta.parts,'all',3).parts;
 assert.ok(deep.some(p=>p.name==='Right first dorsal interosseous of foot'));
 assert.ok(!deep.some(p=>p.name==='Right extensor digitorum brevis'));
 assert.ok(!deep.some(p=>p.name==='Right latissimus dorsi'));
});

test('every baseline muscle retains its original geometry after appending the supplements',()=>{
 const root='baseline/RehabMind_LowerLimbV1_ImplementationBaseline_DBv3.7_2026-09-29/04_3D_Localization/model/';
 const atlas=JSON.parse(fs.readFileSync(root+'atlas_metadata.json'));const chunks=new Map();let offset=0;
 for(const p of meta.parts.filter(p=>!p.id.startsWith('ZA-'))){
  const a=atlas.parts.find(a=>a.id===p.id);assert.ok(a,p.id);
  if(!chunks.has(a.chunk))chunks.set(a.chunk,gunzipSync(fs.readFileSync(root+`chunks/body-${a.chunk}.bin.gz`)));
  const original=chunks.get(a.chunk);
  assert.deepEqual(raw.subarray(meta.positions+offset*12,meta.positions+(offset+a.vertexCount)*12),original.subarray(a.positions,a.positions+a.vertexCount*12),p.id);
  const source=new Uint32Array(original.buffer.slice(original.byteOffset+a.indices,original.byteOffset+a.indices+a.indexCount*4));
  assert.ok(indices.subarray(p.firstFace*3,(p.firstFace+p.faceCount)*3).every((v,n)=>v-offset===source[n]),p.id);
  offset+=a.vertexCount;
 }
});
