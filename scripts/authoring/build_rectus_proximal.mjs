/** Reversible proximal schematic. Named landmarks are recorded on the source bone,
 * rather than inferred from a global nearest-bone query. Fine footprints remain unverified.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import * as T from 'three';
import {computeBoundsTree} from 'three-mesh-bvh';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const source=path.join(root,'baseline/RehabMind_LowerLimbV1_ImplementationBaseline_DBv3.7_2026-09-29/04_3D_Localization/model');
const atlas=JSON.parse(fs.readFileSync(path.join(source,'atlas_metadata.json'))),chunks=new Map();
const option=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:path.resolve(process.argv[i+1]);};
const landmarks=JSON.parse(fs.readFileSync(option('--landmarks',path.join(root,'scripts/authoring/rectus-landmarks.json'))));
// Local display adjustment: lower the visible confluence by 8 mm and move it
// 2.5 mm toward screen-right in the right-side review view (mirrored on the left).
const neckRise=.013,neckSideShift=.0025;
function mesh(id){
  const p=atlas.parts.find(p=>p.id===id);if(!p)throw Error('Missing source '+id);
  if(!chunks.has(p.chunk))chunks.set(p.chunk,gunzipSync(fs.readFileSync(path.join(source,`chunks/body-${p.chunk}.bin.gz`))));
  const raw=chunks.get(p.chunk),pos=raw.subarray(p.positions,p.positions+p.vertexCount*12),idx=raw.subarray(p.indices,p.indices+p.indexCount*4);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(pos.buffer.slice(pos.byteOffset,pos.byteOffset+pos.length)),3));g.setIndex(new T.BufferAttribute(new Uint32Array(idx.buffer.slice(idx.byteOffset,idx.byteOffset+idx.length)),1));computeBoundsTree.call(g,{indirect:true});
  return {part:p,geometry:g,sha:createHash('sha256').update(pos).update(idx).digest('hex')};
}
function triangleAt(g,face){const p=g.getAttribute('position');return new T.Triangle(...[0,1,2].map(n=>new T.Vector3().fromBufferAttribute(p,g.index.array[face*3+n])));}
function landmark(g,side,head,hipId,override){
  const name=head==='direct'?'髂前下棘 · 直头附着':'髋臼上缘 · 反折头附着',record=override??landmarks.anchors[`${side}:${name}`];
  if(!record||record.partId!==hipId)throw Error('Missing same-side reviewed landmark '+name);
  const point=new T.Vector3(record.x,record.y,record.z),triangle=triangleAt(g,record.faceIndex);
  if(triangle.closestPointToPoint(point,new T.Vector3()).distanceTo(point)>1e-7)throw Error('Landmark no longer on recorded source triangle');
  return {point,face:record.faceIndex,triangle,name,basis:record.basis,contactRadiusMm:record.contactRadiusMm,barycentric:triangle.getBarycoord(point,new T.Vector3()).toArray()};
}
function replaceProximal(g,cutY,sign){
  const pos=[],idx=[],map=new Map(),edges=[],slopes=new Map();
  const vertex=p=>{const key=p.map(x=>x.toFixed(9)).join(',');if(map.has(key))return map.get(key);const n=pos.length/3;pos.push(...p);map.set(key,n);return n;};
  const p=g.getAttribute('position'),intersect=(a,b)=>{const t=(cutY-a[1])/(b[1]-a[1]);return [a[0]+t*(b[0]-a[0]),cutY,a[2]+t*(b[2]-a[2])];};
  for(let f=0;f<g.index.count;f+=3){
    const tri=[0,1,2].map(n=>new T.Vector3().fromBufferAttribute(p,g.index.array[f+n]).toArray()),poly=[],cross=[];
    for(let n=0;n<3;n++){const a=tri[n],b=tri[(n+1)%3],inside=a[1]<=cutY;if(inside)poly.push(a);if(inside!==(b[1]<=cutY)){const hit=intersect(a,b);poly.push(hit);cross.push(hit);const slope=new T.Vector3((b[0]-a[0])/(b[1]-a[1]),0,(b[2]-a[2])/(b[1]-a[1]));if(slope.length()>1)slope.normalize();slopes.set(vertex(hit),slope);}}
    for(let n=1;n<poly.length-1;n++)idx.push(vertex(poly[0]),vertex(poly[n]),vertex(poly[n+1]));
    if(cross.length===2)edges.push(cross.map(vertex));
  }
  const adjacent=new Map();for(const [a,b] of edges){for(const [x,y] of [[a,b],[b,a]]){if(!adjacent.has(x))adjacent.set(x,[]);adjacent.get(x).push(y);}}
  if([...adjacent.values()].some(n=>n.length!==2))throw Error('Proximal section is not a closed contour');
  const loop=[edges[0][0]];let prev=-1,current=loop[0];
  do{const next=adjacent.get(current).find(n=>n!==prev);prev=current;current=next;if(current!==loop[0])loop.push(current);}while(current!==loop[0]&&loop.length<=adjacent.size);
  if(loop.length!==adjacent.size)throw Error('Unexpected multiple proximal contours');
  // The new skirt must traverse the shared boundary opposite to the retained
  // source face. Otherwise its normals flip and a dark horizontal seam appears.
  const a=loop[0],b=loop[1];let sameDirection=false;
  for(let f=0;f<idx.length;f+=3)for(let n=0;n<3;n++)if(idx[f+n]===a&&idx[f+(n+1)%3]===b)sameDirection=true;
  if(sameDirection)loop.reverse();
  const center=new T.Vector3();loop.forEach(i=>center.add(new T.Vector3().fromArray(pos,i*3)));center.divideScalar(loop.length);
  const offsets=loop.map(i=>new T.Vector3().fromArray(pos,i*3).sub(center));
  const radiusX=Math.max(...offsets.map(p=>Math.abs(p.x))),radiusZ=Math.max(...offsets.map(p=>Math.abs(p.z)));
  const fork=new T.Vector3(-.112*sign,.8815,.011),rings=120;
  // Fit a shared center slope and radial slope. Independent slopes from tiny
  // source triangles amplify into crossing strips over a long loft; this fit
  // keeps the contour radially ordered through the long transition.
  const centerSlope=loop.reduce((v,i)=>v.add(slopes.get(i)),new T.Vector3()).divideScalar(loop.length);
  if(centerSlope.length()>.4)centerSlope.setLength(.4);
  let numerator=0,denominator=0;
  for(const i of loop){const offset=new T.Vector3().fromArray(pos,i*3).sub(center);numerator+=offset.dot(slopes.get(i).clone().sub(centerSlope));denominator+=offset.lengthSq();}
  const dy=fork.y-cutY,radialSlope=Math.max(-.6/dy,Math.min(0,numerator/denominator));
  let prior=loop;const sectionLoops=[loop];
  for(let r=1;r<rings;r++){
    const t=r/(rings-1),next=[];
    for(const i of loop){
      const start=new T.Vector3().fromArray(pos,i*3),offset=start.clone().sub(center);
      // Round shallow dents into an ellipse gradually over the loft. Radial
      // correspondence preserves contour order, instead of dragging vertices
      // sideways into new creases. The exact source boundary is still retained.
      const ellipseOffset=offset.clone().multiplyScalar(1/Math.hypot(offset.x/radiusX,offset.z/radiusZ));
      const finish=fork.clone().add(ellipseOffset.multiplyScalar(.40));
      const tangent=centerSlope.clone().addScaledVector(offset,radialSlope).setY(1).multiplyScalar(dy);
      const point=start.clone().multiplyScalar(2*t**3-3*t**2+1).addScaledVector(tangent,t**3-2*t**2+t).addScaledVector(finish,-2*t**3+3*t**2).addScaledVector(new T.Vector3(0,dy,0),t**3-t**2);
      next.push(vertex(point.toArray()));
    }
    for(let n=0;n<loop.length;n++){const k=(n+1)%loop.length;idx.push(prior[n],prior[k],next[k],prior[n],next[k],next[n]);}prior=next;sectionLoops.push(next);
  }
  // Leave the upper contour open: the two heads share this contour, including
  // an internal dividing chord. No capped stalk or overlapping tubes at the join.
  return {positions:pos,indices:idx,cutY,sectionVertices:loop.length,fork:fork.toArray(),upperLoop:prior,sectionLoops};
}

function forkContours(body,anchors){
  const loop=body.upperLoop,points=loop.map(i=>new T.Vector3().fromArray(body.positions,i*3));
  const separation=anchors[1].point.clone().sub(anchors[0].point).setY(0).normalize();
  const perpendicular=new T.Vector3(-separation.z,0,separation.x);
  const projected=points.map(p=>p.dot(perpendicular));
  const a=projected.indexOf(Math.min(...projected)),b=projected.indexOf(Math.max(...projected));
  const walk=(start,end)=>{const out=[];for(let n=start;;n=(n+1)%points.length){out.push(points[n]);if(n===end)break;}return out;};
  const chord=Array.from({length:7},(_,n)=>points[b].clone().lerp(points[a],(n+1)/8));
  const halves=[walk(a,b).concat(chord),walk(b,a).concat(chord.slice().reverse())];
  const mean=ring=>ring.reduce((v,p)=>v+p.dot(separation),0)/ring.length;
  // The direct head uses the half facing its recorded origin; the other half
  // belongs to the reflected head. They share the dividing edge in reverse.
  if(mean(halves[0])>mean(halves[1]))halves.reverse();
  return halves;
}

function roundFork(body,heads){
  // Fair the outer shoulders as one surface while retaining the medial V.
  const vertices=[],lookup=new Map(),maps=[],neighbors=[];
  for(const mesh of [body,...heads]){
    const map=[];
    for(let i=0;i<mesh.positions.length;i+=3){
      const point=mesh.positions.slice(i,i+3),key=point.map(v=>v.toFixed(9)).join(',');
      let id=lookup.get(key);
      if(id===undefined){id=vertices.length;lookup.set(key,id);vertices.push(new T.Vector3(...point));neighbors.push(new Set());}
      map.push(id);
    }
    maps.push(map);
    for(let f=0;f<mesh.indices.length;f+=3)for(let n=0;n<3;n++){
      const a=map[mesh.indices[f+n]],b=map[mesh.indices[f+(n+1)%3]];neighbors[a].add(b);neighbors[b].add(a);
    }
  }
  const fixed=new Set(heads.flatMap((head,n)=>maps[n+1].slice(head.rootStartVertex)));
  const crease=[];
  // Preserve the natural pointed V at confluence. Only the outer shoulders
  // are faired; the common medial edge is deliberately not rounded into a U.
  for(const [mesh,n] of heads.map((head,n)=>[head,n])){
    // First two pairs are the chord endpoints on the visible envelope. The
    // interior chord samples may relax; fixing that entire plane made ridges.
    const medial=body.sharedNeck.sharedPairs.slice(0,2).map(pair=>pair[n]);
    for(const index of medial)fixed.add(maps[n+1][mesh.neckRing*mesh.baseVertexCount+index]);
    // All samples across the common dividing chord mark the intentional sharp
    // confluence, even though only its two visible endpoints are pinned.
    for(const pair of body.sharedNeck.sharedPairs)crease.push({head:mesh.head,vertex:mesh.neckRing*mesh.baseVertexCount+pair[n]});
  }
  const weights=vertices.map((p,i)=>{
    if(fixed.has(i)||!neighbors[i].size)return 0;
    const t=Math.max(0,1-Math.abs(p.y-(body.sharedNeck?.endY??body.fork[1]))/.012);
    return t*t*(3-2*t);
  });
  for(let step=0;step<48;step++){
    const next=vertices.map((p,i)=>{
      if(!weights[i])return p;
      const mean=[...neighbors[i]].reduce((v,n)=>v.add(vertices[n]),new T.Vector3()).divideScalar(neighbors[i].size);
      const move=mean.sub(p).multiplyScalar(.48*weights[i]);
      if(move.length()>.0004)move.setLength(.0004);
      return p.clone().add(move);
    });
    vertices.splice(0,vertices.length,...next);
  }
  for(const [i,mesh] of [body,...heads].entries())for(let n=0;n<maps[i].length;n++)vertices[maps[i][n]].toArray(mesh.positions,n*3);
  body.junctionRounding={radius:.012,iterations:48,sharedSurface:true,preservePointedMedialCrease:true,crease};
}

function joinLowerHeads(body,heads,neckRing){
  const [a,b]=heads,key=p=>p.map(v=>v.toFixed(9)).join(',');
  const lookup=new Map(Array.from({length:b.baseVertexCount},(_,n)=>[key(b.positions.slice(n*3,n*3+3)),n]));
  const pairs=[];
  for(let n=0;n<a.baseVertexCount;n++){const match=lookup.get(key(a.positions.slice(n*3,n*3+3)));if(match!==undefined)pairs.push([n,match]);}
  if(pairs.length!==9)throw Error('Shared neck requires both endpoints and seven internal chord vertices');
  for(let r=1;r<=neckRing;r++)for(const [i,j] of pairs){
    const point=new T.Vector3().fromArray(a.positions,(r*a.baseVertexCount+i)*3).add(new T.Vector3().fromArray(b.positions,(r*b.baseVertexCount+j)*3)).multiplyScalar(.5);
    point.toArray(a.positions,(r*a.baseVertexCount+i)*3);point.toArray(b.positions,(r*b.baseVertexCount+j)*3);
  }
  for(const [mesh,side] of [[a,0],[b,1]]){
    const medial=new Set(pairs.map(pair=>pair[side])),indices=[];
    for(let f=0;f<mesh.indices.length;f+=3){
      const triangle=mesh.indices.slice(f,f+3);
      if(triangle.every(i=>Math.floor(i/mesh.baseVertexCount)<=neckRing&&medial.has(i%mesh.baseVertexCount)))continue;
      indices.push(...triangle);
    }
    mesh.indices=indices;mesh.neckRing=neckRing;
  }
  body.sharedNeck={endY:body.fork[1]+neckRise,ring:neckRing,sharedPairs:pairs,lateralShift:neckSideShift};
}

function removeHeadBulges(head,startRing=head.neckRing){
  // Fairing can shrink the neck more than the neighboring shaft. Match a
  // monotone taper after that neck, rather than leaving a bead-shaped swelling.
  for(let r=startRing+1;r<head.rings-1;r++){
    const points=Array.from({length:head.baseVertexCount},(_,n)=>new T.Vector3().fromArray(head.positions,(r*head.baseVertexCount+n)*3));
    const center=points.reduce((v,p)=>v.add(p),new T.Vector3()).divideScalar(points.length),area=new T.Vector3();
    points.forEach((p,n)=>area.add(p.clone().sub(center).cross(points[(n+1)%points.length].clone().sub(center))));
    const radius=Math.sqrt(area.length()/2/Math.PI),normal=area.clone().normalize();
    const t=Math.min(1,(r-head.neckRing)/(head.rings-1-head.neckRing)/.65),blend=t*t*(3-2*t);
    // Preserve the pointed lower confluence, then gradually restore the round
    // shaft section distorted by shoulder fairing. The bone-contact loop stays fixed.
    points.forEach((p,n)=>{
      const radial=p.clone().sub(center);radial.addScaledVector(normal,-radial.dot(normal)).setLength(radius);
      p.lerp(center.clone().add(radial),blend).toArray(head.positions,(r*head.baseVertexCount+n)*3);
    });
  }
  const rings=Array.from({length:head.rings},(_,r)=>{
    const points=Array.from({length:head.baseVertexCount},(_,n)=>new T.Vector3().fromArray(head.positions,(r*head.baseVertexCount+n)*3));
    const center=points.reduce((v,p)=>v.add(p),new T.Vector3()).divideScalar(points.length),area=new T.Vector3();
    points.forEach((p,n)=>area.add(p.clone().sub(center).cross(points[(n+1)%points.length].clone().sub(center))));
    return {points,center,radius:Math.sqrt(area.length()/2/Math.PI)};
  });
  const neck=startRing??0;
  const start=rings[neck].radius,end=rings.at(-1).radius;
  const soften=x=>x*x/(x+.0005);
  let minimum=start;
  for(let r=neck+1;r<head.rings-1;r++){
    const ring=rings[r];minimum=Math.min(minimum,ring.radius);
    // Keep the naturally fitted neck slope. A smooth lower bound prevents a
    // constricted shaft from subsequently swelling into the fixed bone root.
    const target=end+(start-end)*soften(Math.max(0,minimum-end))/soften(start-end);
    const scale=target/ring.radius;
    ring.points.forEach((p,n)=>p.sub(ring.center).multiplyScalar(scale).add(ring.center).toArray(head.positions,(r*head.baseVertexCount+n)*3));
  }
  head.profile='monotone_after_shared_neck';
}

function adjustUpperDirectHead(head,reference,anchor,hip){
  // The belly/shoulder was accepted before the bone endpoint moved. Keep its
  // fitted geometry independent of the endpoint and diameter controls.
  const startRing=head.neckRing+8,last=head.rings-1,sides=head.baseVertexCount;
  const delta=anchor.point.clone().sub(reference.point),rotation=new T.Quaternion().setFromUnitVectors(
    reference.triangle.getNormal(new T.Vector3()),anchor.triangle.getNormal(new T.Vector3()));
  const scale=anchor.contactRadiusMm/reference.contactRadiusMm;
  for(let r=startRing+1;r<=last;r++){
    const u=(r-startRing)/(last-startRing),weight=u*u*(3-2*u);
    const points=Array.from({length:sides},(_,n)=>new T.Vector3().fromArray(head.positions,(r*sides+n)*3));
    const center=points.reduce((v,p)=>v.add(p),new T.Vector3()).divideScalar(sides);
    const turn=new T.Quaternion().slerp(rotation,weight);
    points.forEach((p,n)=>{
      p.sub(center).applyQuaternion(turn).multiplyScalar(1+(scale-1)*weight).add(center).addScaledVector(delta,weight);
      if(r===last){
        // Exact circular contact on the current bone patch, including its
        // requested diameter; do not squeeze it into a single tiny triangle.
        const radial=p.clone().sub(anchor.point).setLength(anchor.contactRadiusMm/1000);
        p=hip.boundsTree.closestPointToPoint(anchor.point.clone().add(radial),{}).point.clone();
      }
      p.toArray(head.positions,(r*sides+n)*3);
    });
  }
  anchor.point.toArray(head.positions,head.rings*sides*3);
  head.boneAnchor={...head.boneAnchor,point:anchor.point.toArray(),sourceFace:anchor.face,barycentric:anchor.barycentric,
    contactRadiusMm:anchor.contactRadiusMm};
  head.upperAdjustment={startRing,referencePoint:reference.point.toArray(),referenceRadiusMm:reference.contactRadiusMm};
  head.centerlineControlSpace='shoulder_reference_before_upper_adjustment';
  // Normalize only the adjusted upper shaft. The locked shoulder is untouched.
  removeHeadBulges(head,startRing);
}

function blendBellyToSharedNeck(body,heads){
  // The old body ended with a vertical tangent while the two half-heads
  // immediately narrowed. Merely pressing that shoulder inward left a step.
  // Rebuild one contour loft across that join, with matching end tangents.
  const start=88,end=12,loops=body.sectionLoops,bodyEnd=loops.length-1;
  const lowY=body.positions[loops[start][0]*3+1],highY=body.fork[1]+neckRise*end/heads[0].neckRing,span=highY-lowY;
  const key=p=>p.map(v=>v.toFixed(9)).join(','),joins=new Map();
  heads.forEach((h,k)=>{for(let n=0;n<h.baseVertexCount;n++){const p=key(h.positions.slice(n*3,n*3+3));if(!joins.has(p))joins.set(p,[]);joins.get(p).push([k,n]);}});
  const point=(m,i)=>new T.Vector3().fromArray(m.positions,i*3);
  for(let n=0;n<body.sectionVertices;n++){
    const matches=joins.get(key(body.positions.slice(loops[bodyEnd][n]*3,loops[bodyEnd][n]*3+3)));
    if(!matches?.length)throw Error('Missing welded body/head contour correspondence');
    const [k,index]=matches[0],h=heads[k];
    const a=point(body,loops[start][n]),prior=point(body,loops[start-1][n]);
    const b=point(h,end*h.baseVertexCount+index),next=point(h,(end+1)*h.baseVertexCount+index);
    const lowerStep=(body.fork[1]-body.cutY)/(loops.length-1),upperStep=neckRise/h.neckRing;
    const m0=a.clone().sub(prior).divideScalar(lowerStep),m1=next.clone().sub(b).divideScalar(upperStep);
    // Monotone coordinate slopes avoid new humps between the two endpoints.
    for(const axis of ['x','y','z']){
      const slope=(b[axis]-a[axis])/span;
      if(Math.abs(slope)<1e-10){m0[axis]=0;m1[axis]=0;continue;}
      let s0=Math.max(0,m0[axis]/slope),s1=Math.max(0,m1[axis]/slope);
      const length=Math.hypot(s0,s1);if(length>3){s0*=3/length;s1*=3/length;}
      m0[axis]=s0*slope;m1[axis]=s1*slope;
    }
    const sample=t=>a.clone().multiplyScalar(2*t**3-3*t**2+1).addScaledVector(m0,span*(t**3-2*t**2+t)).addScaledVector(b,-2*t**3+3*t**2).addScaledVector(m1,span*(t**3-t**2));
    for(let r=start;r<=bodyEnd;r++){
      const y=body.cutY+(body.fork[1]-body.cutY)*r/bodyEnd;
      sample((y-lowY)/span).toArray(body.positions,loops[r][n]*3);
    }
    for(let r=0;r<=end;r++)for(const [headIndex,vertex] of matches){
      const y=body.fork[1]+neckRise*r/h.neckRing;
      sample((y-lowY)/span).toArray(heads[headIndex].positions,(r*heads[headIndex].baseVertexCount+vertex)*3);
    }
  }
  body.continuousShoulder={startSection:start,endHeadRing:end,startY:lowY,endY:highY,monotone:true};
}
const definitions=[
  {head:'direct',label:'直头 · 髂前下棘近端肌腱',rise:.016,boneApproach:[0,-.008,0]},
  {head:'reflected',label:'反折头 · 髋臼上缘近端肌腱',rise:.016,boneApproach:[-.010,-.006,.010]},
];
const report={schema:2,status:'anatomical_schematic_not_verified_tendon_or_footprint',source:atlas.version,
  references:['https://pubmed.ncbi.nlm.nih.gov/24793210/','https://pmc.ncbi.nlm.nih.gov/articles/PMC12178697/'],
  note:'右侧锚点按用户在本模型截图圈出的上方髂前下棘、下方髋臼上缘区域记录。左侧为限制在对应右点镜像3毫米邻域内的同侧骨面候选，单独记录，不宣称用户已确认左侧。锚点锁定具体源面；近端与两处分支为教学形态修正。下方肌腹、远端及源文件保留，精细足印未认证。',parts:[]};
for(const [muscleId,hipId,side,sign] of [['FJ1433','FJ3152','right',1],['FJ1433M','FJ3288','left',-1]]){
  const muscle=mesh(muscleId),hip=mesh(hipId),heads=[],body=replaceProximal(muscle.geometry,.800,sign);
  if(landmarks.sourceBoneHashes[hipId]!==hip.sha)throw Error('Hip geometry changed: re-record named landmarks before generating');
  const anchors=definitions.map(d=>landmark(hip.geometry,side,d.head,hipId));
  const shapeAnchors=anchors.map((a,n)=>{
    const record=landmarks.anchors[`${side}:${a.name}`],reference=record.shoulderShapeReference;
    return reference?landmark(hip.geometry,side,definitions[n].head,hipId,{...record,...reference}):a;
  });
  // A bone-end adjustment must not rotate the belly's dividing chord or
  // repartition both heads. Keep the original contour guide independently.
  const contourAnchors=anchors.map(a=>{
    const guide=landmarks.anchors[`${side}:${a.name}`].forkContourReference;
    return guide?{...a,point:new T.Vector3(...guide)}:a;
  });
  const contours=forkContours(body,contourAnchors);
  for(const [headIndex,d] of definitions.entries()){
    const b=shapeAnchors[headIndex],base=contours[headIndex],sides=base.length;
    const center=base.reduce((v,p)=>v.add(p),new T.Vector3()).divideScalar(sides);
    // Leave the belly in its existing upward tangent. The reflected head
    // starts bending lower, rising toward bone without a high returning hook.
    const control1=center.clone().add(new T.Vector3(0,d.rise,0));
    const control2=b.point.clone().add(new T.Vector3(d.boneApproach[0]*sign,d.boneApproach[1],d.boneApproach[2]));
    const curve=new T.CubicBezierCurve3(center,control1,control2,b.point);
    const normal=b.triangle.getNormal(new T.Vector3());
    if(normal.dot(b.point.clone().sub(center))<0)normal.negate();
    const rotateRoot=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),normal);
    const edgeDistance=Math.min(...[[b.triangle.a,b.triangle.b],[b.triangle.b,b.triangle.c],[b.triangle.c,b.triangle.a]].map(([a,c])=>new T.Line3(a,c).closestPointToPoint(b.point,true,new T.Vector3()).distanceTo(b.point)));
    // Retain the accepted rounded tendon diameter when its bone contact moves.
    // The direct-head footprint may cross neighboring faces of the same AIIS
    // patch; squeezing it into one small triangle incorrectly created a needle.
    const radius=b.contactRadiusMm?b.contactRadiusMm/1000:Math.max(1e-5,edgeDistance*.82);
    const offsets=base.map(p=>p.clone().sub(center));
    const startAngle=Math.atan2(offsets[0].z,offsets[0].x);
    const angles=[startAngle];
    for(let n=1;n<sides;n++){
      const a=Math.atan2(offsets[n].z,offsets[n].x),last=angles[n-1];
      angles.push(last+Math.atan2(Math.sin(a-last),Math.cos(a-last)));
    }
    const circleAngles=base.map((_,n)=>startAngle-n/sides*Math.PI*2);
    let area=0;for(let n=0;n<sides;n++){const a=offsets[n],b=offsets[(n+1)%sides];area+=a.x*b.z-b.x*a.z;}
    const baseRadius=Math.sqrt(Math.abs(area)*.5/Math.PI);
    const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
    const root=base.map((_,n)=>{
      const angle=circleAngles[n];
      const offsetOnBone=new T.Vector3(Math.cos(angle)*radius,0,Math.sin(angle)*radius).applyQuaternion(rotateRoot);
      const point=b.point.clone().add(offsetOnBone);
      if(!b.contactRadiusMm)return point;
      const contact=hip.geometry.boundsTree.closestPointToPoint(point,{});
      if(!contact||contact.point.distanceTo(b.point)>radius*1.35)throw Error('Rounded root escaped the reviewed local bone patch');
      return contact.point.clone();
    });
    const pos=[],idx=[],rings=65,neckRing=18,neckY=body.fork[1]+neckRise;
    const parameterAtY=y=>{let lo=0,hi=1;for(let n=0;n<40;n++){const mid=(lo+hi)/2;if(curve.getPoint(mid).y<y)lo=mid;else hi=mid;}return (lo+hi)/2;};
    const neckT=parameterAtY(neckY),ringParameters=[];
    for(let r=0;r<rings;r++){
      const t=r<=neckRing?parameterAtY(center.y+(neckY-center.y)*r/neckRing):neckT+(1-neckT)*(r-neckRing)/(rings-1-neckRing),at=curve.getPoint(t);ringParameters.push(t);
      const taper=smooth(t),rounded=smooth((r-neckRing)/(rings-1-neckRing)/.65);
      const frame=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),curve.getTangent(t));
      frame.slerp(rotateRoot,smooth((t-.88)/.12));
      // Broad shared base, gradually narrowing along each head (reference shape).
      // One smooth radius profile avoids a constant tube followed by a short neck.
      const tubeRadius=baseRadius*(1-taper)+radius*taper;
      for(let n=0;n<sides;n++){
        const angle=angles[n]*(1-rounded)+circleAngles[n]*rounded;
        const circle=new T.Vector3(Math.cos(angle)*tubeRadius,0,Math.sin(angle)*tubeRadius);
        const offset=offsets[n].clone().multiplyScalar(tubeRadius/baseRadius).lerp(circle,rounded).applyQuaternion(frame);
        const p=r===0?base[n]:r===rings-1?root[n]:at.clone().add(offset);
        // A smooth local displacement moves the confluence, while the muscle
        // join and the exact bone-contact loop retain their original positions.
        const shift=r<=neckRing?smooth(r/neckRing):1-smooth((r-neckRing)/(rings-1-neckRing));
        p.x+=neckSideShift*sign*shift;
        pos.push(...p.toArray());
      }
    }
    for(let r=0;r<rings-1;r++)for(let n=0;n<sides;n++){const a=r*sides+n,b=r*sides+(n+1)%sides,c=a+sides,e=b+sides;idx.push(a,b,e,a,e,c);}
    const cap=pos.length/3;pos.push(...b.point.toArray());
    for(let n=0;n<sides;n++)idx.push(cap,(rings-1)*sides+n,(rings-1)*sides+(n+1)%sides);
    heads.push({head:d.head,label:d.label,positions:pos,indices:idx,boneAnchor:{point:b.point.toArray(),sourceFace:b.face,landmark:b.name,barycentric:b.barycentric,method:'visible_bone_surface_record',basis:b.basis,contactRadiusMm:b.contactRadiusMm,footprintMethod:b.contactRadiusMm?'local_neighboring_faces_preserving_reference_radius':'recorded_triangle'},muscleJoin:{point:center.toArray(),sharedContour:true},centerlineControls:[center.toArray(),control1.toArray(),control2.toArray(),b.point.toArray()],crossSection:'circular_shaft_rounded_contact',baseVertexCount:sides,rootStartVertex:(rings-1)*sides,rootVertexCount:sides,rings,ringParameters});
  }
  joinLowerHeads(body,heads,18);
  roundFork(body,heads);
  heads.forEach(head=>removeHeadBulges(head));
  blendBellyToSharedNeck(body,heads);
  adjustUpperDirectHead(heads[0],shapeAnchors[0],anchors[0],hip.geometry);
  report.parts.push({muscleId,conceptId:muscle.part.conceptId,hipId,side,muscleSourceSha256:muscle.sha,hipSourceSha256:hip.sha,body,heads});
}
fs.writeFileSync(option('--output',path.join(root,'src/content/rectus-proximal-schematic.json')),JSON.stringify(report));
console.log(JSON.stringify(report.parts.map(p=>({muscle:p.muscleId,hip:p.hipId,heads:p.heads.map(h=>({head:h.head,bridgeMm:+(new T.Vector3(...h.boneAnchor.point).distanceTo(new T.Vector3(...h.muscleJoin.point))*1000).toFixed(2)}))})),null,2));
