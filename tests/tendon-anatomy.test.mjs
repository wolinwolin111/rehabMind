import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
import * as T from 'three';
import {computeBoundsTree,acceleratedRaycast} from 'three-mesh-bvh';
const {outputFiles}=await build({entryPoints:['src/content/tendon-anatomy.ts'],bundle:true,write:false,format:'esm'});
const {tendonVisible,getTendonAnatomy,excludeConnectiveBoneParts}=await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
const read=path=>readFileSync(new URL(path,import.meta.url));
const meta=JSON.parse(read('../public/3d/skin.json'));
test('all recovered connective parts keep original vertices, normals, triangles and identities',()=>{
  const base='../baseline/RehabMind_LowerLimbV1_ImplementationBaseline_DBv3.7_2026-09-29/04_3D_Localization/model/';
  const atlas=JSON.parse(read(base+'atlas_metadata.json'));
  const packed=gunzipSync(read('../public/3d/tendons.pack'));
  const buf=packed.buffer.slice(packed.byteOffset,packed.byteOffset+packed.byteLength);
  const indices=new Uint32Array(buf,meta.tendons.indices,meta.tendons.indexCount);
  let vertex=0;
  assert.deepEqual(new Set(meta.tendons.parts.filter(p=>!p.id.startsWith('ZA-')).map(p=>p.id)),new Set(['FJ1405','FJ1405M','FJ1392','FJ1392M','FJ1423','FJ1423M','FJ1424','FJ1424M','FJ1476','FJ1476M']));
  for(const part of meta.tendons.parts.filter(p=>!p.id.startsWith('ZA-'))){
    const source=atlas.parts.find(p=>p.id===part.id),raw=gunzipSync(read(base+`chunks/body-${source.chunk}.bin.gz`));
    assert.equal(part.name,source.name);assert.equal(part.conceptId,source.conceptId);
    assert.deepEqual(packed.subarray(meta.tendons.positions+vertex*12,meta.tendons.positions+(vertex+source.vertexCount)*12),raw.subarray(source.positions,source.positions+source.vertexCount*12));
    assert.deepEqual(packed.subarray(meta.tendons.normals+vertex*6,meta.tendons.normals+(vertex+source.vertexCount)*6),raw.subarray(source.normals,source.normals+source.vertexCount*6));
    for(let i=0;i<source.indexCount;i++)assert.equal(indices[part.firstFace*3+i]-vertex,raw.readUInt32LE(source.indices+i*4));
    vertex+=source.vertexCount;
  }
});
test('common Achilles follows related muscles, side, solo and peeled visibility',()=>{
  for(const tendon of meta.tendons.parts.filter(p=>p.kind==='tendon')){
    const muscles=meta.muscles.parts.filter(p=>p.side===tendon.side&&/gastrocnemius|soleus/.test(p.name));
    assert.equal(muscles.length,3);
    for(const muscle of muscles)assert.equal(tendonVisible(tendon,[],{muscle}),true);
    assert.equal(tendonVisible(tendon,muscles),true);
    assert.equal(tendonVisible(tendon,[]),false);
    const opposite=meta.muscles.parts.find(p=>p.side!==tendon.side&&/soleus/.test(p.name));
    assert.equal(tendonVisible(tendon,[],{muscle:opposite}),false);
    assert.equal(tendonVisible(tendon,muscles,{bone:meta.bones.parts[0]}),false);
    assert.equal(tendonVisible(tendon,[],{tendon}),true);
  }
});
test('connective identities have typed anatomy and same-side muscle relationships without being renamed muscles',()=>{
  for(const part of meta.tendons.parts){
    const facts=getTendonAnatomy(part.name);assert.ok(facts,part.id+' lacks anatomy');
    for(const field of ['connection','attachment','function','note','source','sourceLabel','connectionLabel','attachmentLabel'])assert.ok(facts[field]);
    assert.ok(['tendon','fascia','membrane','ligament'].includes(part.kind));
    for(const key of part.relatedMuscles){
      const muscle=meta.muscles.parts.find(p=>(!part.side||p.side===part.side)&&p.name.toLowerCase().replace(/\b(left|right)\b\s*/g,'').trim()===key);
      assert.ok(muscle,part.id+' missing related '+key);assert.equal(tendonVisible(part,[],{muscle}),!/layer of thoracolumbar fascia/i.test(part.name));
      const opposite={...muscle,side:part.side==='left'?'right':'left'};assert.equal(tendonVisible(part,[],{muscle:opposite}),!part.side);
    }
    assert.equal(tendonVisible(part,[]),false);assert.equal(tendonVisible(part,[],{tendon:part}),true);
  }
});
test('thoracolumbar covering fascia peels before quadratus and cannot hide a solo muscle',()=>{
 for(const side of ['right','left']){
  const muscles=meta.muscles.parts.filter(p=>p.side===side),q=muscles.find(p=>/quadratus lumborum/.test(p.name));
  for(const [name,depth] of [['posterior',0],['middle',1],['anterior',2]]){
   const fascia=meta.tendons.parts.find(p=>p.side===side&&p.name.toLowerCase().includes(`${name} layer of thoracolumbar fascia`));
   assert.ok(fascia);assert.equal(tendonVisible(fascia,muscles,undefined,depth),true);
   assert.equal(tendonVisible(fascia,muscles,undefined,depth+1),false);
   assert.equal(tendonVisible(fascia,[],{muscle:q}),false);
   assert.equal(tendonVisible(fascia,[],{tendon:fascia},4),true);
  }
 }
});
test('recovered fascia draws once and remaining skeletal face identities stay mapped to original triangles',()=>{
  const raw=gunzipSync(read('../public/3d/bones.pack')),buf=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
  const source=new Uint32Array(buf,meta.bones.indices,meta.bones.indexCount),sourceCopy=source.slice();
  const filtered=excludeConnectiveBoneParts(source,meta.bones.parts,meta.tendons.parts);
  const omitted=meta.bones.parts.filter(p=>meta.tendons.parts.some(t=>t.id===p.id));
  assert.deepEqual(omitted.map(p=>p.id),['FJ1423','FJ1423M']);
  assert.equal(filtered.indices.length,source.length-omitted.reduce((n,p)=>n+p.faceCount*3,0));
  let offset=0;for(const range of filtered.parts){
    const original=meta.bones.parts.find(p=>p.id===range.id);assert.equal(range.firstFace,offset/3);
    assert.deepEqual(filtered.indices.slice(offset,offset+range.faceCount*3),source.slice(original.firstFace*3,(original.firstFace+original.faceCount)*3));
    offset+=range.faceCount*3;
  }
  assert.deepEqual(source,sourceCopy);assert.equal(filtered.parts.some(p=>p.id==='FJ1423'||p.id==='FJ1423M'),false);
});
test('separate original tendon draw ranges support ray selection with BVH',()=>{
  const raw=gunzipSync(read('../public/3d/tendons.pack')),buf=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
  const info=meta.tendons,positions=new Float32Array(buf,info.positions,info.vertexCount*3),indices=new Uint32Array(buf,info.indices,info.indexCount);
  for(const part of info.parts){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setIndex(new T.BufferAttribute(indices,1));g.setDrawRange(part.firstFace*3,part.faceCount*3);
    computeBoundsTree.call(g,{indirect:true});
    const mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.raycast=acceleratedRaycast;mesh.updateMatrixWorld();
    let found=false;
    for(let face=part.firstFace;face<part.firstFace+part.faceCount;face+=5){
      const [a,b,c]=[0,1,2].map(n=>new T.Vector3().fromArray(positions,indices[face*3+n]*3));
      const normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize(),point=a.clone().add(b).add(c).divideScalar(3);
      const hit=new T.Raycaster(point.clone().addScaledVector(normal,.0001),normal.negate(),0,.0003).intersectObject(mesh)[0];
      if(hit?.faceIndex===face){found=true;break;}
    }
    assert.ok(found,part.id+' tendon cannot be selected');g.dispose();mesh.material.dispose();
  }
});
