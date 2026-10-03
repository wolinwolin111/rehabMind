import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
import * as T from 'three';
import {acceleratedRaycast,computeBoundsTree} from 'three-mesh-bvh';
const b=await build({entryPoints:['src/content/muscle-layers.ts'],bundle:true,write:false,format:'esm'});
const {peelMuscleIndices}=await import(`data:text/javascript;base64,${Buffer.from(b.outputFiles[0].text).toString('base64')}`);
const sb=await build({entryPoints:['src/muscle-selection.ts'],bundle:true,write:false,format:'esm'});
const {visibleMuscleColors}=await import(`data:text/javascript;base64,${Buffer.from(sb.outputFiles[0].text).toString('base64')}`);
const meta=JSON.parse(readFileSync('public/3d/skin.json')).muscles,raw=gunzipSync(readFileSync('public/3d/muscles.pack'));
const buffer=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
const positions=new Float32Array(buffer,meta.positions,meta.vertexCount*3),indices=new Uint32Array(buffer,meta.indices,meta.indexCount);
function mesh(selection){const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(selection.positions??positions,3));g.setIndex(new T.BufferAttribute(selection.indices,1));computeBoundsTree.call(g,{indirect:true});const m=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));m.raycast=acceleratedRaycast;m.updateMatrixWorld();return m;}
test('combined display opens the rectus sheath without modifying source attachments or other muscles',()=>{
 const before=positions.slice(),original=peelMuscleIndices(indices,meta.parts,'all',0),shown=peelMuscleIndices(indices,meta.parts,'all',0,positions);
 assert.deepEqual(positions,before);assert.ok(shown.indices.length<original.indices.length);
 let end=0;for(const p of shown.parts){assert.equal(p.firstFace,end);end+=p.faceCount;
   if(!/oblique|transversus abdominis|iliocostalis|longissimus|spinalis|serratus posterior|multifidus|rotator|interspinal|intertransvers/i.test(p.name)){const source=meta.parts.find(s=>s.id===p.id);assert.equal(p.faceCount,source.faceCount);assert.deepEqual(shown.indices.slice(p.firstFace*3,(p.firstFace+p.faceCount)*3),indices.slice(source.firstFace*3,(source.firstFace+source.faceCount)*3));}}
 assert.deepEqual(shown.positions.subarray(0,positions.length),positions);
 assert.ok(shown.blends.length>0,'the window boundary must split triangles rather than delete whole faces');
 const m=mesh(shown);
 for(const side of ['right','left']){
   let hits=0;
   for(let y=.96;y<1.22;y+=.02){const ray=new T.Raycaster(new T.Vector3(side==='right'?-.04:.04,y,.5),new T.Vector3(0,0,-1));ray.firstHitOnly=true;const h=ray.intersectObject(m)[0];if(h){const p=shown.parts.find(p=>h.faceIndex>=p.firstFace&&h.faceIndex<p.firstFace+p.faceCount);if(p?.name.toLowerCase().includes('rectus abdominis'))hits++;}}
   assert.ok(hits>=8,`${side}: rectus remains covered at ${13-hits} samples`);
 }
 m.geometry.dispose();m.material.dispose();
});

test('single-pass colour follows the visible abdomen and back triangles and does not add hidden surfaces',()=>{
 const shown=peelMuscleIndices(indices,meta.parts,'all',0,positions),before=shown.indices.slice();
 for(const name of ['Left rectus abdominis','Left external oblique','Right latissimus dorsi']){
   const member=shown.parts.find(p=>p.name===name);assert.ok(member);
   const colors=visibleMuscleColors(shown.positions.length/3,shown.indices,shown.parts,[member]);
   assert.ok(colors.every(Number.isFinite));
   const picked=new Set(shown.indices.subarray(member.firstFace*3,(member.firstFace+member.faceCount)*3));
   for(const i of picked)assert.ok(colors[i*3+1]>colors[i*3],'selected geometry is not green');
   for(const p of shown.parts.filter(p=>p.id!==member.id))for(let f=p.firstFace*3;f<(p.firstFace+p.faceCount)*3;f++){
     const i=shown.indices[f];if(!picked.has(i))assert.ok(colors[i*3]>colors[i*3+1],`${p.name} was coloured by another muscle`);
   }
 }
 assert.deepEqual(shown.indices,before);
});

test('posterior dissection removes deep fragments piercing latissimus while preserving trapezius coverage',()=>{
 const shown=peelMuscleIndices(indices,meta.parts,'all',0,positions),m=mesh(shown);
 const at=(x,y)=>{const r=new T.Raycaster(new T.Vector3(x,y,-.5),new T.Vector3(0,0,1));r.firstHitOnly=true;const h=r.intersectObject(m)[0];return shown.parts.find(p=>h&&h.faceIndex>=p.firstFace&&h.faceIndex<p.firstFace+p.faceCount)?.name;};
 // These posterior points hit serratus posterior inferior / iliocostalis in the old combined view.
 for(const side of [-1,1])for(const [x,y] of [[.06,1.08],[.054,1.08],[.042,.998]])assert.match(at(side*x,y),/latissimus/i);
 const trap=meta.parts.find(p=>/Ascending part of right trapezius/.test(p.name)),kept=shown.parts.find(p=>p.id===trap.id);
 assert.equal(kept.faceCount,trap.faceCount);
 m.geometry.dispose();m.material.dispose();
});
test('peeling exposes internal oblique then transversus and removes the deepest abdominal layer',()=>{
 for(const step of [0,1,2,3,4]){
  const shown=peelMuscleIndices(indices,meta.parts,'all',step,positions),names=new Set(shown.parts.map(p=>p.name));
  assert.ok(shown.positions.every(Number.isFinite));
  assert.deepEqual(shown.positions.subarray(0,positions.length),positions);
  for(const side of ['Right','Left']){
   assert.equal(names.has(`${side} external oblique`),step===0);
   assert.equal(names.has(`${side} rectus abdominis`),step===0);
   assert.equal(names.has(`${side} internal oblique`),step<2);
   assert.equal(names.has(`${side} transversus abdominis`),step<3);
  }
 }
 const deepest=peelMuscleIndices(indices,meta.parts,'all',3).parts;
 assert.ok(!deepest.some(p=>p.name==='Right subscapularis'));assert.ok(deepest.some(p=>p.name==='Right pronator quadratus'));
});

test('both abdominal flanks keep inner sheets behind the outer sheet across camera angles',()=>{
 const original=peelMuscleIndices(indices,meta.parts,'all',0),shown=peelMuscleIndices(indices,meta.parts,'all',0,positions);
 function protrusions(selection){
  const m=mesh(selection);let count=0;
  for(const side of [-1,1])for(let y=.96;y<1.23;y+=.012)for(let angle=45;angle<=135;angle+=5){
   const a=angle*Math.PI/180,u=new T.Vector3(side*Math.sin(a),0,Math.cos(a)),origin=u.clone().multiplyScalar(.5);origin.y=y;
   const hits=new T.Raycaster(origin,u.clone().negate()).intersectObject(m);
   const rows=hits.map(h=>({h,p:selection.parts.find(p=>h.faceIndex>=p.firstFace&&h.faceIndex<p.firstFace+p.faceCount)}));
   const outer=rows.find(r=>/external oblique/i.test(r.p?.name??''));
   if(outer&&/internal oblique|transversus abdominis/i.test(rows[0].p?.name??'')&&outer.h.distance-rows[0].h.distance<.015)count++;
  }
  m.geometry.dispose();m.material.dispose();return count;
 }
 assert.ok(protrusions(original)>=10,'sampling must reproduce the original flank intersections');
 assert.equal(protrusions(shown),0,'a deep abdominal sheet still protrudes through the outer sheet');
});
