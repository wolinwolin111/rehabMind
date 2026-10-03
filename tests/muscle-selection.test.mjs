import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
import * as T from 'three';
import {computeBoundsTree,acceleratedRaycast} from 'three-mesh-bvh';
const read=path=>readFileSync(new URL(path,import.meta.url));
const {outputFiles}=await build({entryPoints:['src/muscle-selection.ts'],bundle:true,write:false,format:'esm'});
const {selectedMuscleIndices,selectedMuscleGeometry,muscleSelectionParts}=await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
const meta=JSON.parse(read('../public/3d/skin.json')).muscles;
const raw=gunzipSync(read('../public/3d/muscles.pack'));
const buf=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
const original=new Uint32Array(buf,meta.indices,meta.indexCount);
const positions=new Float32Array(buf,meta.positions,meta.vertexCount*3);

test('solo selection retains both same-side source portions and original triangles',()=>{
  for(const ids of [['FJ1499','FJ1475'],['FJ1499M','FJ1475M'],['FJ1472','FJ1517'],['FJ1472M','FJ1517M']]){
    for(const id of ids){
      const selected=meta.parts.find(p=>p.id===id);
      const result=selectedMuscleIndices(original,meta.parts,selected);
      assert.deepEqual(new Set(result.parts.map(p=>p.id)),new Set(ids));
      let offset=0;
      for(const range of result.parts){
        const source=meta.parts.find(p=>p.id===range.id);
        assert.equal(range.firstFace,offset/3);
        assert.deepEqual(result.indices.slice(offset,offset+range.faceCount*3),original.slice(source.firstFace*3,(source.firstFace+source.faceCount)*3));
        offset+=range.faceCount*3;
      }
    }
  }
  const selected=meta.parts.find(p=>p.id==='FJ1512');
  assert.deepEqual(muscleSelectionParts(meta.parts,selected).map(p=>p.id),['FJ1512']);
});

test('combined solo mesh retains hittable distal finger geometry',()=>{
  const selected=meta.parts.find(p=>p.id==='FJ1499');
  const result=selectedMuscleIndices(original,meta.parts,selected);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setIndex(new T.BufferAttribute(result.indices,1));
  computeBoundsTree.call(g,{indirect:true});
  const mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.raycast=acceleratedRaycast;mesh.updateMatrixWorld();
  const distal=result.parts.find(p=>p.id==='FJ1475');
  let hitDistal=false;
  for(let face=distal.firstFace;face<distal.firstFace+distal.faceCount;face++){
    const [a,b,c]=[0,1,2].map(n=>new T.Vector3().fromArray(positions,result.indices[face*3+n]*3));
    const point=a.clone().add(b).add(c).divideScalar(3);
    if(point.y>.84)continue;
    const normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    const ray=new T.Raycaster(point.clone().addScaledVector(normal,.0001),normal.negate(),0,.0003);
    const hit=ray.intersectObject(mesh)[0];
    if(hit?.faceIndex===face){hitDistal=true;break;}
  }
  assert.ok(hitDistal,'The distal finger portion was omitted from solo selection');
  g.dispose();mesh.material.dispose();
});

test('thumb short flexor side correction agrees with hand geometry and preserves source provenance',()=>{
  for(const [id,side,sign] of [['FJ1469','Right',-1],['FJ1469M','Left',1]]){
    const part=meta.parts.find(p=>p.id===id);
    assert.equal(part.side,side.toLowerCase());assert.match(part.name,new RegExp('^'+side+' '));
    assert.notEqual(part.sourceName,part.name);assert.ok(part.correctionReason);
    for(const index of original.slice(part.firstFace*3,(part.firstFace+part.faceCount)*3))assert.ok(positions[index*3]*sign>0);
  }
});

test('shared distal display copies only same-side terminal donor faces and preserves identity',()=>{
  const base='../baseline/RehabMind_LowerLimbV1_ImplementationBaseline_DBv3.7_2026-09-29/04_3D_Localization/model/';
  const atlas=JSON.parse(read(base+'atlas_metadata.json'));
  for(const id of ['FJ1512','FJ1512M','FJ1518','FJ1518M']){
    const selected=meta.parts.find(p=>p.id===id),shared=selected.sharedDistal;
    assert.ok(shared,id+' missing terminal segment');
    const donor=meta.parts.find(p=>p.id===shared.donorId),source=atlas.parts.find(p=>p.id===donor.id);
    assert.equal(donor.side,selected.side);assert.notEqual(donor.conceptId,selected.conceptId);
    const chunk=gunzipSync(read(base+`chunks/body-${source.chunk}.bin.gz`));
    assert.equal(createHash('sha256').update(chunk.subarray(source.positions,source.positions+source.vertexCount*12)).update(chunk.subarray(source.indices,source.indices+source.indexCount*4)).digest('hex'),shared.sourceGeometrySha256);
    const result=selectedMuscleIndices(original,meta.parts,selected),first=selected.faceCount*3;
    assert.equal(result.indices.length,first+shared.faces.length*3);assert.ok(shared.faces.length<donor.faceCount/2,'borrowed too much of donor head');
    assert.deepEqual(result.indices.slice(0,first),original.slice(selected.firstFace*3,(selected.firstFace+selected.faceCount)*3));
    const tail=result.parts[1];assert.equal(tail.id,selected.id);assert.equal(tail.sourceSegmentOf,donor.id);assert.equal(tail.firstFace,selected.faceCount);
    shared.faces.forEach((face,index)=>{const expected=original.slice((donor.firstFace+face)*3,(donor.firstFace+face+1)*3);assert.deepEqual(result.indices.slice(first+index*3,first+(index+1)*3),expected);assert.ok([...expected].some(v=>positions[v*3+1]<=shared.cutoffY));});
    let crossings=0;
    for(let face=0;face<donor.faceCount;face++){
      const y=[...original.slice((donor.firstFace+face)*3,(donor.firstFace+face+1)*3)].map(v=>positions[v*3+1]);
      if(Math.min(...y)<=shared.cutoffY&&Math.max(...y)>shared.cutoffY){crossings++;assert.ok(shared.faces.includes(face),id+' omitted joining triangle '+face);}
    }
    assert.ok(crossings>10,'no joining surface retained');
    const donorSelection=selectedMuscleIndices(original,meta.parts,donor);assert.equal(donorSelection.indices.length,donor.faceCount*3,'changed donor head display');
  }
});

test('recipient solo display retains ray-selectable distal attachment triangles on both sides',()=>{
  for(const id of ['FJ1512','FJ1512M','FJ1518','FJ1518M']){
    const selected=meta.parts.find(p=>p.id===id),result=selectedMuscleGeometry(original,positions,meta.parts,selected),tail=result.parts[1];
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(result.positions,3));geometry.setIndex(new T.BufferAttribute(result.indices,1));computeBoundsTree.call(geometry,{indirect:true});
    const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.raycast=acceleratedRaycast;mesh.updateMatrixWorld();let found=false;
    for(let face=tail.firstFace;face<tail.firstFace+tail.faceCount&&!found;face++){
      const [a,b,c]=[0,1,2].map(n=>new T.Vector3().fromArray(result.positions,result.indices[face*3+n]*3)),point=a.clone().add(b).add(c).divideScalar(3);
      if(point.y> (id.startsWith('FJ1512')?1.1:.89))continue;
      const normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize(),hit=new T.Raycaster(point.clone().addScaledVector(normal,.0001),normal.negate(),0,.0003).intersectObject(mesh)[0];
      if(hit?.faceIndex===face)found=true;
    }
    assert.ok(found,id+' distal attachment not selectable');geometry.dispose();mesh.material.dispose();
  }
});

test('fitted supplement preserves source attachments outside its locally rounded biceps seam',()=>{
  const before=createHash('sha256').update(new Uint8Array(positions.buffer,positions.byteOffset,positions.byteLength)).digest('hex');
  for(const id of ['FJ1512','FJ1512M','FJ1518','FJ1518M']){
    const selected=meta.parts.find(p=>p.id===id),s=selected.sharedDistal,donor=meta.parts.find(p=>p.id===s.donorId);
    const result=selectedMuscleGeometry(original,positions,meta.parts,selected),tail=result.parts[1];
    assert.ok(result.clipped);assert.equal(tail.sourceSegmentOf,donor.id);assert.equal(tail.id,selected.id);
    const rounding=result.roundedJunction;
    if(id.startsWith('FJ1512')){assert.ok(rounding.sharedSurface);assert.ok(rounding.sectionCount>=30);}
    else {
      assert.equal(rounding,undefined,'changed accepted wrist flexor seam');
      for(let n=0;n<selected.faceCount*3;n++){
        const a=result.indices[n]*3,b=original[selected.firstFace*3+n]*3;
        assert.deepEqual(result.positions.slice(a,a+3),positions.slice(b,b+3),'wrist flexor recipient changed');
      }
    }
    const triangles=new Set(),recipientTriangles=new Set(),seamEdges=new Map();
    const key=(pts,idx)=>idx.flatMap(v=>[...pts.slice(v*3,v*3+3)]).join(',');
    for(let f=0;f<tail.firstFace*3;f+=3)recipientTriangles.add(key(result.positions,[...result.indices.slice(f,f+3)]));
    if(rounding){
      for(let f=selected.firstFace*3;f<(selected.firstFace+selected.faceCount)*3;f+=3){
        const ids=[...original.slice(f,f+3)];
        if(ids.every(v=>positions[v*3+1]>rounding.endY))assert.ok(recipientTriangles.has(key(positions,ids)),'source muscle above seam changed');
      }
      for(let f=0;f<result.indices.length;f+=3){
        const ids=[...result.indices.slice(f,f+3)],vertices=ids.map(v=>new T.Vector3().fromArray(result.positions,v*3));
        assert.ok(vertices.every(p=>[p.x,p.y,p.z].every(Number.isFinite)));assert.ok(new T.Triangle(...vertices).getArea()>1e-12,'collapsed round transition');
        for(let n=0;n<3;n++){
          const a=ids[n],b=ids[(n+1)%3];
          if(!rounding.seamLoops.some(loop=>loop.includes(a)&&loop.includes(b)))continue;
          const edge=[a,b].sort((x,y)=>x-y).join(',');if(!seamEdges.has(edge))seamEdges.set(edge,[]);seamEdges.get(edge).push([a,b]);
        }
      }
      assert.ok(seamEdges.size>20,'missing shared section boundaries');
      for(const uses of seamEdges.values()){assert.equal(uses.length,2,'open rounded seam');assert.deepEqual(uses[0],[uses[1][1],uses[1][0]],'reversed rounded seam');}
      assert.equal(result.tendonBlend.length,result.positions.length/3);
      assert.ok(result.tendonBlend.every(v=>v>=0&&v<=1));
      const radii=rounding.sectionLoops.map(loop=>{
        const pts=loop.map(i=>new T.Vector3().fromArray(result.positions,i*3)),center=pts.reduce((v,p)=>v.add(p),new T.Vector3()).divideScalar(pts.length),area=new T.Vector3();
        pts.forEach((p,n)=>area.add(p.clone().sub(center).cross(pts[(n+1)%pts.length].clone().sub(center))));return Math.sqrt(area.length()/2/Math.PI);
      });
      for(let r=1;r<radii.length;r++)assert.ok(radii[r]>=radii[r-1]-1e-6,'abnormal swelling/pinch in biceps transition');
      for(let i=0;i<result.tendonBlend.length;i++){
        const y=result.positions[i*3+1];
        if(y>=rounding.endY)assert.equal(result.tendonBlend[i],0,'muscle body whitened');
        if(y<=rounding.startY)assert.equal(result.tendonBlend[i],1,'tendon color stops at join');
      }
    }
    for(let face=tail.firstFace;face<tail.firstFace+tail.faceCount;face++){
      const indices=[...result.indices.slice(face*3,face*3+3)];
      indices.forEach(v=>{assert.ok(v<result.positions.length/3);assert.ok(result.positions[v*3+1]<=s.cutoffY+1e-7,'proximal fork retained');});
      triangles.add(key(result.positions,indices));
      const [a,b,c]=indices.map(v=>new T.Vector3().fromArray(result.positions,v*3));
      assert.ok(b.sub(a).cross(c.sub(a)).length()>1e-12,'collapsed display triangle');
    }
    let tipY=Infinity;for(const v of original.slice(selected.firstFace*3,(selected.firstFace+selected.faceCount)*3))tipY=Math.min(tipY,positions[v*3+1]);
    let preserved=0;
    for(const face of s.faces){
      const indices=[...original.slice((donor.firstFace+face)*3,(donor.firstFace+face+1)*3)];
      if(indices.every(v=>positions[v*3+1]<=(rounding?.startY??tipY-.012))){assert.ok(triangles.has(key(positions,indices)),'distal source triangle changed');preserved++;}
    }
    assert.ok(preserved>30);
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(result.positions,3));
    g.setIndex(new T.BufferAttribute(result.indices.slice(0,tail.firstFace*3),1));computeBoundsTree.call(g,{indirect:true});
    const distal=g.clone();distal.setIndex(new T.BufferAttribute(result.indices.slice(tail.firstFace*3),1));
    const nearest={};g.boundsTree.closestPointToGeometry(distal,new T.Matrix4(),nearest,{},0);
    assert.ok(nearest.distance<1e-6,id+' supplement detached');g.dispose();distal.dispose();
  }
  assert.equal(createHash('sha256').update(new Uint8Array(positions.buffer,positions.byteOffset,positions.byteLength)).digest('hex'),before,'source buffer mutated');
});
