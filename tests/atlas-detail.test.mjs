import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
async function load(path){
  const b=await build({entryPoints:[path],bundle:true,write:false,format:'esm',external:['three']});
  // Resolve three in this test file's scope rather than from a data URL.
  const code=b.outputFiles[0].text.replace(/from "three"/g,`from "${new URL('../node_modules/three/build/three.module.js',import.meta.url).href}"`);
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}
const {ATLAS_CAMERA,displayedAtlasSelection}=await load('src/atlas-view.ts');
const {muscleSurfaceCoordinates,softenAbdominalNormals}=await load('src/muscle-surface.ts');
const {getMuscleAnatomy,muscleKey,supplementalMuscles}=await load('src/content/muscle-anatomy.ts');
const {muscleBookReviews}=await load('src/content/muscle-book-reference.ts');
const metadata=JSON.parse(readFileSync('public/3d/skin.json'));

test('isolated muscle remains visible while inspecting other bones and reselecting the muscle',()=>{
  const muscle=metadata.muscles.parts.find(p=>p.name==='Right rectus femoris');
  const bone=metadata.bones.parts.find(p=>p.name==='Right femur');
  assert.ok(muscle&&bone);
  const solo={muscle,bone:null,tendon:null};
  assert.equal(displayedAtlasSelection({muscle:null,bone,tendon:null},solo).muscle.id,muscle.id);
  assert.equal(displayedAtlasSelection({muscle,bone:null,tendon:null},solo).muscle.id,muscle.id);
  assert.equal(displayedAtlasSelection({muscle:null,bone,tendon:null},null).bone.id,bone.id);
});

test('actual OrbitControls wheel zoom reaches fine detail without the former 1.45 m limit',()=>{
  const element=new EventTarget();element.style={};element.clientWidth=600;element.clientHeight=600;
  element.getBoundingClientRect=()=>({left:0,top:0,width:600,height:600});
  const camera=new T.PerspectiveCamera(40,1,ATLAS_CAMERA.near,20);camera.position.set(0,0,1.45);
  const controls=new OrbitControls(camera,element);controls.minDistance=ATLAS_CAMERA.minDistance;
  controls.maxDistance=ATLAS_CAMERA.maxDistance;controls.zoomToCursor=true;controls.screenSpacePanning=true;
  for(let i=0;i<100;i++){
    const event=new Event('wheel',{cancelable:true});
    Object.assign(event,{deltaY:-100,clientX:300,clientY:300});element.dispatchEvent(event);
  }
  const distance=camera.position.distanceTo(controls.target);
  assert.ok(distance<.025,distance);
  assert.ok(distance>=ATLAS_CAMERA.minDistance-1e-6);
  assert.ok(camera.near<distance/10);
  controls.dispose();
});

test('book audit covers exactly every selectable name plus text supplements, with honest coverage',()=>{
  const names=new Set(metadata.muscles.parts.filter(p=>getMuscleAnatomy(p.name)).map(p=>muscleKey(p.name)));
  for(const p of supplementalMuscles)names.add(p.name);
  assert.deepEqual(new Set(Object.keys(muscleBookReviews)),names);
  for(const review of Object.values(muscleBookReviews)){
    assert.ok(['attachments','group','secondary'].includes(review.coverage));
    assert.equal(review.printedPages.length===0,review.coverage==='secondary');
    assert.ok(review.printedPages.every(p=>Number.isInteger(p)&&p>0&&p<399));
  }
  assert.match(getMuscleAnatomy('ulnar head of pronator teres').origin,/冠突/);
  assert.match(getMuscleAnatomy('oblique head of adductor pollicis').origin,/头状骨/);
  assert.match(getMuscleAnatomy('oblique head of adductor pollicis').action,/内收/);
  assert.match(getMuscleAnatomy('Right tibialis anterior').insertion,/内侧、跖侧/);
  assert.match(getMuscleAnatomy('Right fibularis longus').insertion,/楔骨外侧/);
  assert.match(getMuscleAnatomy('Right extensor digitorum longus').origin,/腓骨内侧面近侧三分之二/);
});

test('display grain stays finite and leaves anatomy positions unchanged even for a planar mesh',()=>{
  const positions=new Float32Array([0,0,0,0,1,0,0,.5,.1]);const before=positions.slice();
  const result=muscleSurfaceCoordinates(positions,new Uint32Array([0,1,2]),[{firstFace:0,faceCount:1}]);
  assert.equal(result.length,12);assert.ok(result.every(Number.isFinite));
  assert.deepEqual(positions,before);
});

test('fiber coordinates cross the cylindrical seam continuously and adapt spacing to muscle size',()=>{
  const positions=new Float32Array([.00001,0,-.02,-.00001,0,-.02,-.02,0,0,.02,0,0,0,0,.02,0,.2,-.02,-.02,.2,0,.02,.2,0,0,.2,.02]);
  const indices=new Uint32Array([0,1,2,3,4,5,6,7,8]),parts=[{firstFace:0,faceCount:3}];
  const result=muscleSurfaceCoordinates(positions,indices,parts);
  assert.ok(Math.abs(result[0]-result[4])<.002);
  assert.ok(Math.abs(result[1]-result[5])<.002,'angular seam creates a coordinate jump');
  assert.ok(result[3]>0,'round elongated muscles should use cylindrical grain');
  const small=muscleSurfaceCoordinates(positions.map(v=>v*.1),indices,parts);
  assert.ok(small[3]<result[3],'small muscles should not inherit a large muscle fiber count');
});

test('oblique planar muscles use a continuous sheet frame rather than a radial pinch',()=>{
  const points=new Float32Array([0,0,0,.01,.01,0,.11,.09,0,.10,.10,0]);
  const result=muscleSurfaceCoordinates(points,new Uint32Array([0,1,2,0,2,3]),[{firstFace:0,faceCount:2}]);
  assert.ok(result.every(Number.isFinite));assert.equal(result[3],-2);
  assert.ok(Math.abs(result[2])<1e-8);assert.ok(Math.abs(result[1]-result[13])>.05);
});

test('abdominal sheets have continuous grain across their centre and mirrored directions',()=>{
  const right=new Float32Array([-.04,1.10,.10,-.02,1.12,.10,-.04,1.14,.10]);
  const left=right.map((v,i)=>i%3===0?-v:v),indices=new Uint32Array([0,1,2]);
  for(const name of ['rectus abdominis','external oblique','internal oblique','transversus abdominis']){
    const r=muscleSurfaceCoordinates(right,indices,[{name:`Right ${name}`,side:'right',firstFace:0,faceCount:1}]);
    const l=muscleSurfaceCoordinates(left,indices,[{name:`Left ${name}`,side:'left',firstFace:0,faceCount:1}]);
    assert.deepEqual(r,l);assert.equal(r[3],-1);assert.ok(r.every(Number.isFinite));
    if(name==='rectus abdominis')assert.equal(r[0],r[8],'vertical fibers should have constant cross coordinate');
    if(name==='transversus abdominis')assert.equal(r[1],r[9],'horizontal fibers should have constant along coordinate');
  }
});

test('abdominal shading filter preserves positions, topology and other muscle normals',()=>{
  const geo=new T.BufferGeometry(),positions=new Float32Array([0,0,.1,.001,0,.1,0,.001,.1,.1,0,0,.1,.01,0,.1,0,.01]);
  const indices=new Uint32Array([0,1,2,3,4,5]);
  geo.setAttribute('position',new T.BufferAttribute(positions,3));geo.setIndex(new T.BufferAttribute(indices,1));
  const normals=new Float32Array([0,0,1,.2,0,Math.sqrt(.96),-.2,0,Math.sqrt(.96),1,0,0,1,0,0,1,0,0]);
  geo.setAttribute('normal',new T.BufferAttribute(normals,3));
  softenAbdominalNormals(geo,[{name:'Right rectus abdominis',firstFace:0,faceCount:1}]);
  const result=geo.getAttribute('normal').array;
  assert.deepEqual(geo.getAttribute('position').array,positions);assert.deepEqual(geo.index.array,indices);
  assert.deepEqual(result.slice(9),normals.slice(9));assert.deepEqual(normals.slice(0,3),new Float32Array([0,0,1]));
  assert.ok(Math.abs(result[3])<.2,'fine shading ridge was not reduced');
  for(let i=0;i<9;i+=3)assert.ok(Math.abs(Math.hypot(...result.slice(i,i+3))-1)<1e-6);
});

test('every selectable mesh receives finite full-model grain without changing its source positions',()=>{
  const meta=metadata.muscles,raw=gunzipSync(readFileSync('public/3d/muscles.pack'));
  const buffer=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
  const positions=new Float32Array(buffer,meta.positions,meta.vertexCount*3),before=positions.slice();
  const indices=new Uint32Array(buffer,meta.indices,meta.indexCount);
  const parts=meta.parts.filter(p=>getMuscleAnatomy(p.name)),coordinates=muscleSurfaceCoordinates(positions,indices,parts);
  const modes=new Set();
  for(const part of parts){
    const vertices=new Set(indices.subarray(part.firstFace*3,(part.firstFace+part.faceCount)*3));
    for(const i of vertices){const v=coordinates.subarray(i*4,i*4+4);assert.ok(v.every(Number.isFinite),part.name);assert.notEqual(v[3],0,part.name);modes.add(v[3]<0?v[3]:1);}
  }
  assert.deepEqual(modes,new Set([-1,-2,1]));
  assert.deepEqual(positions,before);
});
