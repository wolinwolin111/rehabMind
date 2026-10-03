import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
import * as T from 'three';
import {computeBoundsTree,acceleratedRaycast} from 'three-mesh-bvh';
const schematic=JSON.parse(fs.readFileSync('src/content/rectus-proximal-schematic.json'));
const meta=JSON.parse(fs.readFileSync('public/3d/skin.json')).muscles;
const raw=gunzipSync(fs.readFileSync('public/3d/muscles.pack')),buf=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
const positions=new Float32Array(buf,meta.positions,meta.vertexCount*3),indices=new Uint32Array(buf,meta.indices,meta.indexCount);
const bundle=await build({entryPoints:['src/muscle-selection.ts','src/muscle-picking.ts'],bundle:true,write:false,format:'esm',outdir:'out'});
const modules=await Promise.all(bundle.outputFiles.map(f=>import(`data:text/javascript;base64,${Buffer.from(f.text).toString('base64')}`)));
const {selectedMuscleGeometry}=modules.find(m=>m.selectedMuscleGeometry),{muscleAtFace}=modules.find(m=>m.muscleAtFace);
const sourceRoot='baseline/RehabMind_LowerLimbV1_ImplementationBaseline_DBv3.7_2026-09-29/04_3D_Localization/model';
const atlas=JSON.parse(fs.readFileSync(sourceRoot+'/atlas_metadata.json')),chunks=new Map();
function source(id){const p=atlas.parts.find(p=>p.id===id);if(!chunks.has(p.chunk))chunks.set(p.chunk,gunzipSync(fs.readFileSync(`${sourceRoot}/chunks/body-${p.chunk}.bin.gz`)));const r=chunks.get(p.chunk),pos=r.subarray(p.positions,p.positions+p.vertexCount*12),idx=r.subarray(p.indices,p.indices+p.indexCount*4);return {positions:new Float32Array(pos.buffer.slice(pos.byteOffset,pos.byteOffset+pos.length)),indices:new Uint32Array(idx.buffer.slice(idx.byteOffset,idx.byteOffset+idx.length)),sha:createHash('sha256').update(pos).update(idx).digest('hex')};}
function geometry(p,i){const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setIndex(new T.BufferAttribute(i,1));computeBoundsTree.call(g,{indirect:true});return g;}

test('proximal replacement preserves identities, distal source triangles and reversible originals',()=>{
  const before=createHash('sha256').update(new Uint8Array(positions.buffer)).digest('hex');
  for(const data of schematic.parts){
    assert.equal(source(data.muscleId).sha,data.muscleSourceSha256);assert.equal(source(data.hipId).sha,data.hipSourceSha256);
    const selected=meta.parts.find(p=>p.id===data.muscleId),result=selectedMuscleGeometry(indices,positions,meta.parts,selected);
    assert.equal(result.parts.length,3);assert.deepEqual(result.parts.slice(1).map(p=>p.schematicHead),['direct','reflected']);
    const triangleKey=(p,i,f)=>[0,1,2].map(n=>Array.from(p.slice(i[f+n]*3,i[f+n]*3+3)).map(v=>v.toFixed(7)).join(',')).sort().join('|');
    const retained=new Set();for(let f=0;f<data.body.indices.length;f+=3)retained.add(triangleKey(Float32Array.from(data.body.positions),data.body.indices,f));
    const originalSource=source(data.muscleId);for(let f=0;f<originalSource.indices.length;f+=3){if([0,1,2].every(n=>originalSource.positions[originalSource.indices[f+n]*3+1]<data.body.cutY))assert.ok(retained.has(triangleKey(originalSource.positions,originalSource.indices,f)),'distal source triangle changed');}
    assert.ok(Math.max(...Array.from(result.positions).filter((_,n)=>n%3===1))<.93,'old excessively high proximal branch retained');
    for(const p of result.parts){assert.equal(p.id,selected.id);assert.equal(p.side,selected.side);assert.equal(p.conceptId,selected.conceptId);}
    const original=selectedMuscleGeometry(indices,positions,meta.parts,selected,{proximalSchematic:false});assert.equal(original.parts.length,1);assert.strictEqual(original.positions,positions);
  }
  assert.equal(createHash('sha256').update(new Uint8Array(positions.buffer)).digest('hex'),before);
});

test('schematic bridges are finite, nondegenerate and confined to the correct proximal side',()=>{
  for(const data of schematic.parts)for(const head of data.heads){
    for(let n=0;n<head.positions.length;n+=3){const p=head.positions.slice(n,n+3);assert.ok(p.every(Number.isFinite));assert.ok(data.side==='right'?p[0]<0:p[0]>0);assert.ok(p[1]>data.body.cutY&&p[1]<.93);}
    for(let n=0;n<head.indices.length;n+=3){const vertices=head.indices.slice(n,n+3);assert.ok(vertices.every(i=>i>=0&&i<head.positions.length/3));const [a,b,c]=vertices.map(i=>new T.Vector3().fromArray(head.positions,i*3));assert.ok(b.sub(a).cross(c.sub(a)).length()>1e-12,data.muscleId+' '+head.head+' collapsed triangle');}
  }
});

test('roots conform to named recorded bone faces and both branches contact the retained-body transition',()=>{
  for(const data of schematic.parts){
    const hipData=source(data.hipId),hip=geometry(hipData.positions,hipData.indices),muscle=geometry(Float32Array.from(data.body.positions),Uint32Array.from(data.body.indices));
    for(const head of data.heads){
      for(let n=0;n<head.rootVertexCount;n++)assert.ok(hip.boundsTree.closestPointToPoint(new T.Vector3().fromArray(head.positions,(head.rootStartVertex+n)*3),{}).distance<1e-6,'floating bone root');
      const record=JSON.parse(fs.readFileSync('scripts/authoring/rectus-landmarks.json')).anchors[`${data.side}:${head.boneAnchor.landmark}`];
      assert.equal(record.partId,data.hipId);assert.equal(record.faceIndex,head.boneAnchor.sourceFace);
      assert.deepEqual(head.boneAnchor.point,[record.x,record.y,record.z]);assert.equal(head.boneAnchor.method,'visible_bone_surface_record');
      const triangle=new T.Triangle(...[0,1,2].map(n=>new T.Vector3().fromArray(hipData.positions,hipData.indices[record.faceIndex*3+n]*3)));
      for(let n=0;n<head.rootVertexCount;n++){
        const p=new T.Vector3().fromArray(head.positions,(head.rootStartVertex+n)*3);
        if(record.contactRadiusMm){
          const radius=record.contactRadiusMm/1000,distance=p.distanceTo(new T.Vector3(...head.boneAnchor.point));
          assert.equal(head.boneAnchor.contactRadiusMm,record.contactRadiusMm);
          assert.ok(distance>=radius*.8&&distance<=radius*1.35,'accepted rounded root diameter changed or collapsed into a needle');
        }else assert.ok(triangle.closestPointToPoint(p,new T.Vector3()).distanceTo(p)<1e-6,'root escaped recorded landmark triangle');
      }
      const bridge=geometry(Float32Array.from(head.positions),Uint32Array.from(head.indices)),contact={};
      muscle.boundsTree.closestPointToGeometry(bridge,new T.Matrix4(),contact,{},0);assert.ok(contact.distance<1e-6,data.muscleId+' '+head.head+' detached seam');bridge.dispose();
    }
    hip.dispose();muscle.dispose();
  }
});

test('both heads weld into one continuous belly surface with shared normals and tissue blend',()=>{
  for(const data of schematic.parts){
    const selected=meta.parts.find(p=>p.id===data.muscleId),result=selectedMuscleGeometry(indices,positions,meta.parts,selected);
    const key=p=>Array.from(Float32Array.from(p)).map(v=>v.toFixed(7)).join(',');
    const joint=new Set(data.heads.flatMap(h=>[0,h.neckRing].flatMap(r=>Array.from({length:h.baseVertexCount},(_,n)=>key(h.positions.slice((r*h.baseVertexCount+n)*3,(r*h.baseVertexCount+n)*3+3))))));
    const edges=new Map();
    for(let f=0;f<result.indices.length;f+=3)for(let n=0;n<3;n++){
      const a=result.indices[f+n],b=result.indices[f+(n+1)%3];
      if(!joint.has(key(result.positions.slice(a*3,a*3+3)))||!joint.has(key(result.positions.slice(b*3,b*3+3))))continue;
      const edgeKey=[a,b].sort((x,y)=>x-y).join(',');if(!edges.has(edgeKey))edges.set(edgeKey,[]);edges.get(edgeKey).push([a,b]);
    }
    assert.ok(edges.size>data.body.sectionVertices,'missing shared fork chord');
    for(const list of edges.values()){assert.equal(list.length,2,'open or overlapping fork edge');assert.deepEqual(list[0],[list[1][1],list[1][0]],'fork faces have reversed normals');}
    assert.equal(result.tendonBlend.length,result.positions.length/3);
    assert.ok(result.tendonBlend.every(v=>v>=0&&v<=1));
    assert.ok(result.tendonBlend.includes(0));assert.ok(result.tendonBlend.includes(1));
    const lookup=new Map();for(let i=0;i<result.positions.length/3;i++)lookup.set(key(result.positions.slice(i*3,i*3+3)),i);
    for(const h of data.heads)for(const r of [0,h.neckRing])for(let n=0;n<h.baseVertexCount;n++){
      const p=key(h.positions.slice((r*h.baseVertexCount+n)*3,(r*h.baseVertexCount+n)*3+3)),i=lookup.get(p);
      const t=r/(h.rings-1)/.9,expected=.25+.75*(t*t*(3-2*t));
      assert.ok(Math.abs(result.tendonBlend[i]-expected)<1e-6,'color seam at shared neck');
    }
  }
});

test('actual BVH hits on either added head retain the same selected RF context',()=>{
  for(const data of schematic.parts){
    const selected=meta.parts.find(p=>p.id===data.muscleId),result=selectedMuscleGeometry(indices,positions,meta.parts,selected),g=geometry(result.positions,result.indices),mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.raycast=acceleratedRaycast;mesh.updateMatrixWorld();
    for(const range of result.parts.slice(1)){
      let found=false;
      for(let face=range.firstFace;face<range.firstFace+range.faceCount&&!found;face++){
        const [a,b,c]=[0,1,2].map(n=>new T.Vector3().fromArray(result.positions,result.indices[face*3+n]*3)),p=a.clone().add(b).add(c).divideScalar(3),normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
        const hit=new T.Raycaster(p.clone().addScaledVector(normal,.0001),normal.negate(),0,.0003).intersectObject(mesh)[0];
        if(hit?.faceIndex===face){assert.equal(muscleAtFace(result.parts,face).id,selected.id);assert.equal(muscleAtFace(result.parts,face).schematicHead,range.schematicHead);found=true;}
      }
      assert.ok(found,data.muscleId+' '+range.schematicHead+' not selectable');
    }
    g.dispose();mesh.material.dispose();
  }
});

test('retained body and new transition share oppositely wound edges at the cut',()=>{
  for(const {body} of schematic.parts){
    const edges=new Map();
    for(let f=0;f<body.indices.length;f+=3)for(let n=0;n<3;n++){
      const a=body.indices[f+n],b=body.indices[f+(n+1)%3];
      if(Math.abs(body.positions[a*3+1]-body.cutY)>1e-8||Math.abs(body.positions[b*3+1]-body.cutY)>1e-8)continue;
      const key=[a,b].sort((x,y)=>x-y).join(',');if(!edges.has(key))edges.set(key,[]);edges.get(key).push([a,b]);
    }
    assert.equal(edges.size,body.sectionVertices);
    for(const list of edges.values()){assert.equal(list.length,2);assert.deepEqual(list[0],[list[1][1],list[1][0]],'transition normals reverse at shared edge');}
  }
});

test('both origins stay above the shared fork and preserve user-region provenance',()=>{
  for(const part of schematic.parts)for(const head of part.heads){
    assert.ok(head.boneAnchor.point[1]>part.body.fork[1],head.head+' wrongly runs upwards into the shared fork');
    assert.equal(head.boneAnchor.basis,part.side==='right'?'user_circled_screenshot_region_matched_in_visible_model':'bounded_contralateral_correspondence_from_user_right_landmark');
  }
});

test('heads leave the belly smoothly and the reflected centerline has a gradual arch',()=>{
  for(const part of schematic.parts){
    assert.ok(part.body.fork[1]-part.body.cutY>.075,'belly taper is still compressed into a short shoulder');
    for(const head of part.heads){
      assert.ok(part.body.junctionRounding.sharedSurface,'heads rounded separately instead of at shared fork');
      if(head.head!=='reflected')continue;
      const curve=new T.CubicBezierCurve3(...head.centerlineControls.map(p=>new T.Vector3(...p)));
      assert.ok(curve.v0.y<.883,'reflected head still branches too high');
      assert.ok(curve.v1.y<curve.v3.y&&curve.v2.y<curve.v3.y,'reflected controls form a high returning hook');
      const chord=new T.Line3(curve.v0,curve.v3);
      let deviation=0;
      for(let n=1;n<100;n++){
        const point=curve.getPoint(n/100);
        assert.ok(point.y<curve.v3.y,'reflected arc overshoots its bone origin');
        assert.ok(curve.getTangent(n/100).y>0,'reflected head doubles back from above');
        deviation=Math.max(deviation,point.distanceTo(chord.closestPointToPoint(point,true,new T.Vector3())));
        assert.ok(curve.getTangent((n-1)/100).angleTo(curve.getTangent(n/100))<.12,'sharp reflected-head turn');
      }
      assert.ok(deviation>.004,'reflected head is still essentially straight');
    }
  }
});

test('belly starts narrowing early and has no abrupt width step through the transition',()=>{
  for(const {body} of schematic.parts){
    const widths=body.sectionLoops.map(loop=>{const x=loop.map(i=>body.positions[i*3]);return Math.max(...x)-Math.min(...x);});
    assert.ok(widths.length>=75,'long taper is visibly undersampled');
    const early=widths[Math.floor((widths.length-1)*.3)];
    assert.ok(early<widths[0]*.93&&early>widths[0]*.78,'narrowing is delayed or collapses too early');
    for(let n=1;n<widths.length;n++)assert.ok(Math.abs(widths[n]-widths[n-1])/widths[n-1]<.025,'abrupt width step');
  }
});

test('long belly transition has no inward flipped strips',()=>{
  for(const {body} of schematic.parts){
    const centers=new Map();
    for(const loop of body.sectionLoops){const center=loop.reduce((sum,i)=>sum.add(new T.Vector3().fromArray(body.positions,i*3)),new T.Vector3()).divideScalar(loop.length);loop.forEach(i=>centers.set(i,center));}
    for(let f=0;f<body.indices.length;f+=3){
      const ids=body.indices.slice(f,f+3),points=ids.map(i=>new T.Vector3().fromArray(body.positions,i*3));
      if(ids.some(i=>!centers.has(i)))continue;
      const at=points.reduce((sum,p)=>sum.add(p),new T.Vector3()).divideScalar(3);
      const center=ids.reduce((sum,i)=>sum.add(centers.get(i)),new T.Vector3()).divideScalar(3);
      const radial=at.sub(center).setY(0);
      const normal=new T.Triangle(...points).getNormal(new T.Vector3());
      assert.ok(normal.dot(radial)>0,'inward surface strip causing a dark groove');
    }
  }
});

test('belly and shared neck form a continuous taper without the former shoulder step',()=>{
  for(const {body,heads} of schematic.parts){
    const key=p=>p.map(v=>v.toFixed(9)).join(','),joins=new Map();
    for(const h of heads)for(let n=0;n<h.baseVertexCount;n++)joins.set(key(h.positions.slice(n*3,n*3+3)),{h,n});
    const band=body.continuousShoulder;
    assert.ok(band.endY-band.startY>.025,'shoulder blend is compressed into a short patch');
    for(let n=0;n<body.sectionVertices;n++){
      const join=new T.Vector3().fromArray(body.positions,body.upperLoop[n]*3),match=joins.get(key(join.toArray()));
      assert.ok(match,'contour detached at belly/head boundary');
      const prior=new T.Vector3().fromArray(body.positions,body.sectionLoops.at(-2)[n]*3);
      const next=new T.Vector3().fromArray(match.h.positions,(match.h.baseVertexCount+match.n)*3);
      assert.ok(join.clone().sub(prior).angleTo(next.sub(join))<1.2*Math.PI/180,'tangent jump at the former shoulder');
      const path=body.sectionLoops.slice(band.startSection).map(loop=>new T.Vector3().fromArray(body.positions,loop[n]*3));
      for(let r=1;r<=band.endHeadRing;r++)path.push(new T.Vector3().fromArray(match.h.positions,(r*match.h.baseVertexCount+match.n)*3));
      for(const axis of ['x','z']){
        const direction=Math.sign(path.at(-1)[axis]-path[0][axis]);
        for(let r=1;r<path.length;r++)assert.ok(direction*(path[r][axis]-path[r-1][axis])>=-1e-9,'outward hump between taper endpoints');
      }
    }
  }
});

test('moving and thickening the direct bone contact cannot reshape the accepted lower shoulder',()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'rectus-shoulder-regression-'));
  try{
    const records=JSON.parse(fs.readFileSync('scripts/authoring/rectus-landmarks.json'));
    for(const record of Object.values(records.anchors))if(record.shoulderShapeReference)Object.assign(record,record.shoulderShapeReference);
    const input=path.join(folder,'landmarks.json'),output=path.join(folder,'reference.json');
    fs.writeFileSync(input,JSON.stringify(records));
    const run=spawnSync(process.execPath,['scripts/authoring/build_rectus_proximal.mjs','--landmarks',input,'--output',output],{encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    const reference=JSON.parse(fs.readFileSync(output));
    for(const [n,current] of schematic.parts.entries()){
      const original=reference.parts[n],head=current.heads[0];
      assert.deepEqual(current.body,original.body,'bone-end adjustment altered the belly/shoulder');
      assert.deepEqual(current.heads[1],original.heads[1],'direct adjustment altered the reflected head');
      assert.equal(head.upperAdjustment.startRing,head.neckRing+8);
      const count=(head.upperAdjustment.startRing+1)*head.baseVertexCount*3;
      assert.deepEqual(head.positions.slice(0,count),original.heads[0].positions.slice(0,count),'lower contour changed with endpoint/diameter');
      assert.notDeepEqual(head.positions.slice(count),original.heads[0].positions.slice(count),'upper contact adjustment did not take effect');
      assert.ok(head.boneAnchor.contactRadiusMm>head.upperAdjustment.referenceRadiusMm,'requested slight thickening lost');
    }
  }finally{fs.rmSync(folder,{recursive:true,force:true});}
});

test('shared lower heads stay welded and preserve a pointed medial junction',()=>{
  for(const {body,heads} of schematic.parts){
    assert.ok(body.junctionRounding.preservePointedMedialCrease);
    assert.equal(body.sharedNeck.sharedPairs.length,9);
    assert.ok(body.sharedNeck.endY>body.fork[1]+.01,'shared lower segment is too short');
    const [a,b]=heads;
    for(let r=0;r<=body.sharedNeck.ring;r++)for(const [i,j] of body.sharedNeck.sharedPairs){
      assert.deepEqual(a.positions.slice((r*a.baseVertexCount+i)*3,(r*a.baseVertexCount+i)*3+3),b.positions.slice((r*b.baseVertexCount+j)*3,(r*b.baseVertexCount+j)*3+3),'slit between lower heads');
    }
    for(const [h,side] of heads.map((h,n)=>[h,n])){
      const medial=new Set(body.sharedNeck.sharedPairs.map(pair=>pair[side]));
      for(let f=0;f<h.indices.length;f+=3)assert.ok(!h.indices.slice(f,f+3).every(i=>Math.floor(i/h.baseVertexCount)<=h.neckRing&&medial.has(i%h.baseVertexCount)),'overlapping internal medial wall');
    }
  }
});

test('pointed junction retains smooth outer shoulders, rounded shafts and monotone taper',()=>{
  for(const data of schematic.parts){
    const selected=meta.parts.find(p=>p.id===data.muscleId),g=selectedMuscleGeometry(indices,positions,meta.parts,selected);
    const crease=new Set(data.body.junctionRounding.crease.map(({head,vertex})=>{const h=data.heads.find(h=>h.head===head);return h.positions.slice(vertex*3,vertex*3+3).map(v=>Math.fround(v).toFixed(7)).join(',');}));
    const rootPoints=new Set(data.heads.flatMap(h=>Array.from({length:h.positions.length/3-h.rootStartVertex},(_,n)=>h.positions.slice((h.rootStartVertex+n)*3,(h.rootStartVertex+n)*3+3).map(v=>Math.fround(v).toFixed(7)).join(','))));
    const edges=new Map(),normals=[],excluded=[];
    for(let f=0;f<g.indices.length;f+=3){
      const ids=[...g.indices.slice(f,f+3)],keys=ids.map(i=>[...g.positions.slice(i*3,i*3+3)].map(v=>v.toFixed(7)).join(','));
      normals.push(new T.Triangle(...ids.map(i=>new T.Vector3().fromArray(g.positions,i*3))).getNormal(new T.Vector3()));
      // The intentional medial V and the planar bone-contact cap need corners.
      // Neither is an accidental fold on the outer shaft/shoulder.
      excluded.push(keys.some(k=>crease.has(k))||keys.every(k=>rootPoints.has(k)));
      for(let n=0;n<3;n++){
        const a=ids[n],b=ids[(n+1)%3];
        if([a,b].some(i=>crease.has([...g.positions.slice(i*3,i*3+3)].map(v=>v.toFixed(7)).join(','))))continue;
        if(![a,b].every(i=>Math.abs(g.positions[i*3+1]-data.body.sharedNeck.endY)<.009))continue;
        const edge=[a,b].sort((x,y)=>x-y).join(',');if(!edges.has(edge))edges.set(edge,[]);edges.get(edge).push(f/3);
      }
    }
    let checked=0;
    for(const uses of edges.values())if(uses.length===2&&!uses.some(f=>excluded[f])){assert.ok(normals[uses[0]].angleTo(normals[uses[1]])<35*Math.PI/180,'abnormal fold on outer fork surface');checked++;}
    assert.ok(checked>100);
    for(const h of data.heads){
      const ring=Math.floor((h.rings-1)*.78),pts=Array.from({length:h.baseVertexCount},(_,n)=>new T.Vector3().fromArray(h.positions,(ring*h.baseVertexCount+n)*3));
      const center=pts.reduce((v,p)=>v.add(p),new T.Vector3()).divideScalar(pts.length),radii=pts.map(p=>p.distanceTo(center));
      assert.ok(Math.max(...radii)/Math.min(...radii)<1.15,'rounded tendon section became a flat blade');
      let previous=Infinity;
      for(let r=h.neckRing;r<h.rings;r++){
        const loop=Array.from({length:h.baseVertexCount},(_,n)=>new T.Vector3().fromArray(h.positions,(r*h.baseVertexCount+n)*3));
        const center=loop.reduce((v,p)=>v.add(p),new T.Vector3()).divideScalar(loop.length),area=new T.Vector3();
        loop.forEach((p,n)=>area.add(p.clone().sub(center).cross(loop[(n+1)%loop.length].clone().sub(center))));
        const radius=Math.sqrt(area.length()/2/Math.PI);
        assert.ok(radius<=previous+1e-6,'tendon narrows then swells into an abnormal bead');previous=radius;
      }
    }
  }
});
