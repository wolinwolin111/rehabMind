import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transform} from 'esbuild';
import * as T from 'three';
import {computeBoundsTree, acceleratedRaycast} from 'three-mesh-bvh';
import {mesh, meta, report, surface, localizeFace, chooseGestureRegion, rayAt} from './helpers/surface-atlas.mjs';

const {code}=await transform(readFileSync(new URL('../src/gesture-sampling.ts',import.meta.url),'utf8'),{loader:'ts',format:'esm'});
const {sampleGesture}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
computeBoundsTree.call(mesh.geometry,{indirect:true}); mesh.raycast=acceleratedRaycast;
const ellipse=(center,radius,count=81)=>Array.from({length:count},(_,i)=>({
 x:center.x+radius.x*Math.cos(i/(count-1)*2*Math.PI),
 y:center.y+radius.y*Math.sin(i/(count-1)*2*Math.PI),
}));
function view(width,height,oblique) {
 const camera=new T.PerspectiveCamera(32,width/height,.01,12);
 camera.position.set(oblique?1.35:0,1.06,3.88); camera.lookAt(0,.84,0); camera.updateMatrixWorld();
 const project=p=>{const n=p.clone().project(camera);return {x:(n.x+1)*width/2,y:(1-n.y)*height/2};};
 const ray=new T.Raycaster();ray.firstHitOnly=true;
 const read=p=>{
  ray.setFromCamera(new T.Vector2(p.x/width*2-1,1-p.y/height*2),camera);
  const h=ray.intersectObject(mesh,false)[0];
  return h&&localizeFace(meta,surface,h.faceIndex,h.point);
 };
 return {project,read};
}
function select(points,read) {
 const gesture=sampleGesture(points),votes=new Map();
 for(const p of gesture.samples){
  const hit=read(p);if(!hit)continue;
  const key=`${hit.areaId||hit.regionId}:${hit.side}`,old=votes.get(key);
  votes.set(key,{hit,count:(old?.count||0)+1});
 }
 return chooseGestureRegion([...votes.values()],gesture.closed,meta.surface_atlas.gesture_groups,meta.surface_atlas.entries);
}

test('loops use only interior coverage independent of pointer density; taps and open lines remain distinct',()=>{
 const sparse=ellipse({x:30,y:30},{x:12,y:10},9);
 const dense=ellipse({x:30,y:30},{x:12,y:10},241);
 for(const points of [sparse,dense]){
  const g=sampleGesture(points);assert.equal(g.closed,true);assert.ok(g.samples.length>300&&g.samples.length<=576);
  assert.ok(g.samples.every(p=>((p.x-30)/12)**2+((p.y-30)/10)**2<1));
 }
 assert.equal(sampleGesture([{x:0,y:0},{x:3,y:2}]).samples.length,1);
 const retraced=sampleGesture([{x:0,y:0},{x:40,y:0},{x:0,y:0}]);
 assert.equal(retraced.closed,false);
 const open=sampleGesture([{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:100,y:0}]);
 assert.equal(open.closed,false);assert.equal(open.samples.length,35);
 assert.ok(Math.abs(open.samples[1].x-100/34)<1e-8);
 assert.deepEqual(sampleGesture([]),{closed:false,samples:[]});
});

test('fragmented knee coverage beats an incidental single thigh label, without biasing taps or real thigh coverage',()=>{
 const vote=(regionId,module,count,side='left')=>({hit:{regionId,module,side,source:'surface',displayName:regionId},count});
 const votes=[vote('KNEE-R-002','KNEE',20),vote('KNEE-R-003','KNEE',20),vote('KNEE-R-004','KNEE',20),vote('THIGH-R-001','THIGH',40)];
 assert.equal(chooseGestureRegion(votes,true,meta.surface_atlas.gesture_groups).regionId,'KNEE-R-015');
 assert.equal(chooseGestureRegion(votes,false,meta.surface_atlas.gesture_groups).regionId,'THIGH-R-001');
 votes[3].count=80;
 assert.equal(chooseGestureRegion(votes,true,meta.surface_atlas.gesture_groups).regionId,'THIGH-R-001');
 assert.equal(chooseGestureRegion([vote('KNEE-R-004','KNEE',1)],true,meta.surface_atlas.gesture_groups).regionId,'KNEE-R-004');
 const composite=[vote('LL-R-005','LOWER_LEG',55),vote('KNEE-R-013','KNEE',45)];
 assert.equal(chooseGestureRegion(composite,true,meta.surface_atlas.gesture_groups).areaId,'LOC-KNEE-CALF-POST');
});

test('circles enclosing actual patella projections reach the knee across sides, zoom sizes, views and drawing densities',()=>{
 for(const side of ['left','right']) for(const height of [480,650]) for(const oblique of [false,true]) {
  const v=view(390,height,oblique),b=report.patella_references[side].bounds,projected=[];
  for(const x of b[0])for(const y of b[1])for(const z of b[2])projected.push(v.project(new T.Vector3(x,y,z)));
  const xs=projected.map(p=>p.x),ys=projected.map(p=>p.y);
  const center={x:(Math.min(...xs)+Math.max(...xs))/2,y:(Math.min(...ys)+Math.max(...ys))/2};
  for(const scale of [1.3,2.4])for(const count of [9,81]){
   const radius={x:(Math.max(...xs)-Math.min(...xs))/2*scale,y:(Math.max(...ys)-Math.min(...ys))/2*scale};
   const hit=select(ellipse(center,radius,count),v.read);
   assert.equal(hit?.module,'KNEE',`${side}/${height}/${oblique}/${scale}/${count}: ${hit?.regionId}`);
   assert.equal(hit.side,side);
  }
 }
});

test('closed circles aggregate sibling locations into their existing region without merging sides or boundary guides',()=>{
 const entries=meta.surface_atlas.entries,groups=meta.surface_atlas.gesture_groups;
 const find=(id,side='left')=>entries.find(e=>e&&e.side===side&&(e.areaId===id||!e.areaId&&e.regionId===id));
 const vote=(id,count,side)=>({hit:find(id,side),count});
 const votes=[vote('LOC-THIGH-ANTMED',25),vote('LOC-THIGH-ANTLAT',25),vote('THIGH-R-004',40)];
 const selected=chooseGestureRegion(votes,true,groups,entries);
 assert.equal(selected,find('THIGH-R-001'));
 // A tap or open stroke retains the existing location-level winner.
 assert.equal(chooseGestureRegion(votes,false,groups,entries),find('THIGH-R-004'));
 assert.equal(chooseGestureRegion([vote('LOC-THIGH-ANTMED',60),vote('THIGH-R-004',40)],true,groups,entries),find('LOC-THIGH-ANTMED'));
 assert.equal(chooseGestureRegion([vote('LOC-THIGH-ANTMED',30),vote('LOC-THIGH-ANTLAT',30,'right'),vote('THIGH-R-004',40)],true,groups,entries),find('THIGH-R-004'));
 // The oblique sartorius guide spans two regions; its coverage is not donated
 // to whichever region happens to be listed first in that guide.
 assert.equal(chooseGestureRegion([vote('LOC-THIGH-SART',25),vote('LOC-THIGH-ANTMED',25),vote('THIGH-R-004',40)],true,groups,entries),find('THIGH-R-004'));
 assert.equal(chooseGestureRegion([vote('LOC-KNEE-CALF-POST',70),vote('LL-R-006',30)],true,groups,entries),find('LOC-KNEE-CALF-POST'));
});

test('the same circle sampler preserves genuine thigh, calf and ankle selections on the actual mesh',()=>{
 const v=view(390,650,false);
 for(const side of ['left','right'])for(const [y,module] of [[.67,'THIGH'],[.30,'LOWER_LEG'],[.13,'ANKLE_FOOT']]){
  const hit=rayAt(side,y,0);assert.ok(hit);
  assert.equal(hit.selected.module,module);
  const center=v.project(hit.point),circle=ellipse(center,{x:5,y:7});
  const selected=select(circle,v.read);
  assert.equal(selected?.module,module,`${side}/${y}: ${selected?.regionId}`);assert.equal(selected.side,side);
 }
});
