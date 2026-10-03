import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
import * as T from 'three';
import {acceleratedRaycast,computeBoundsTree} from 'three-mesh-bvh';
const result=await build({stdin:{contents:"export * from './src/prepared-model'; export * from './src/content/muscle-layers';export * from './src/content/tendon-anatomy';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm'});
const {decodePreparedModel,peelMuscleIndices,tendonVisible}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const meta=JSON.parse(readFileSync('public/3d/skin.json'));
const read=file=>{const raw=gunzipSync(readFileSync(`public/3d/${file}`));return raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);};
const original=read('muscles.pack'),positions=new Float32Array(original,meta.muscles.positions,meta.muscles.vertexCount*3),indices=new Uint32Array(original,meta.muscles.indices,meta.muscles.indexCount);
test('prepared atlas preserves corrected triangle identities, attachments and ray picks',()=>{
 const old=peelMuscleIndices(indices,meta.muscles.parts,'all',0,positions),shown=decodePreparedModel(read('atlas-muscles-0.pack'));
 assert.deepEqual(shown.parts.map(p=>[p.id,p.firstFace,p.faceCount]),old.parts.map(p=>[p.id,p.firstFace,p.faceCount]));
 const newPositions=shown.geometry.getAttribute('position'),newIndices=shown.geometry.index.array;
 for(const p of old.parts)for(const face of [p.firstFace,p.firstFace+Math.floor(p.faceCount/2),p.firstFace+p.faceCount-1])for(let c=0;c<3;c++){
  const a=old.indices[face*3+c],b=newIndices[face*3+c];
  for(let axis=0;axis<3;axis++)assert.ok(Math.abs(old.positions[a*3+axis]-newPositions.array[b*3+axis])<.00002,`${p.name}: display moved more than 0.02 mm`);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(old.positions,3));g.setIndex(new T.BufferAttribute(old.indices,1));computeBoundsTree.call(g,{indirect:true});
 const mesh=geometry=>{const m=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));m.raycast=acceleratedRaycast;m.updateMatrixWorld();return m;};
 const before=mesh(g),after=mesh(shown.geometry);
 const hit=(m,parts,ray)=>{const h=ray.intersectObject(m)[0];return parts.find(p=>h&&h.faceIndex>=p.firstFace&&h.faceIndex<p.firstFace+p.faceCount)?.id;};
 for(const front of [-1,1])for(const x of [-.08,-.04,.04,.08])for(const y of [.25,.5,.85,1,1.12,1.25,1.4]){
  const ray=new T.Raycaster(new T.Vector3(x,y,front*.6),new T.Vector3(0,0,-front));ray.firstHitOnly=true;
  assert.equal(hit(after,shown.parts,ray),hit(before,old.parts,ray));
 }
 g.dispose();shown.geometry.dispose();before.material.dispose();after.material.dispose();
});
test('prepared layer three removes transversus but preserves posterior wall, then reaches skeleton',()=>{
 const deep=decodePreparedModel(read('atlas-muscles-3.pack'));
 assert.ok(!deep.parts.some(p=>/transversus abdominis/.test(p.name)));
 for(const side of ['Right','Left'])for(const name of ['quadratus lumborum','psoas major','iliacus'])assert.ok(deep.parts.some(p=>p.name===`${side} ${name}`));
 // Every original triangle must survive: a projected quadratus window used to
 // cut psoas (and deep back muscles) into disconnected upper/lower pieces.
 for(const part of deep.parts.filter(p=>/quadratus lumborum|psoas major/.test(p.name))){
  const originalPart=meta.muscles.parts.find(p=>p.id===part.id);
  assert.equal(part.faceCount,originalPart.faceCount,`${part.name} was cut`);
  for(let f=0;f<part.faceCount;f++)for(let corner=0;corner<3;corner++){
   const before=indices[(originalPart.firstFace+f)*3+corner],after=deep.geometry.index.array[(part.firstFace+f)*3+corner];
   for(let axis=0;axis<3;axis++)assert.ok(Math.abs(positions[before*3+axis]-deep.geometry.getAttribute('position').array[after*3+axis])<.00002,`${part.name}: original surface changed`);
  }
 }
 const skeleton=decodePreparedModel(read('atlas-muscles-4.pack'));assert.equal(skeleton.parts.length,0);assert.equal(skeleton.geometry.index.count,0);
 deep.geometry.dispose();skeleton.geometry.dispose();
});
test('quadratus remains selectable with complete psoas and natural source occlusion after transversus removal',()=>{
 const shown=decodePreparedModel(read('atlas-muscles-3.pack'));
 const whole=new T.Mesh(shown.geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));whole.raycast=acceleratedRaycast;whole.updateMatrixWorld();
 const bonesBuffer=read('bones.pack'),bg=new T.BufferGeometry(),info=meta.bones;
 bg.setAttribute('position',new T.BufferAttribute(new Float32Array(bonesBuffer,info.positions,info.vertexCount*3),3));bg.setIndex(new T.BufferAttribute(new Uint32Array(bonesBuffer,info.indices,info.indexCount),1));computeBoundsTree.call(bg,{indirect:true});
 const bones=new T.Mesh(bg,new T.MeshBasicMaterial({side:T.DoubleSide}));bones.raycast=acceleratedRaycast;bones.updateMatrixWorld();
 const tissueInfo=meta.tendons,tissueBuffer=read('tendons.pack'),tissueIndices=new Uint32Array(tissueBuffer,tissueInfo.indices,tissueInfo.indexCount);
 const visibleTissue=meta.tendons.parts.filter(p=>tendonVisible(p,shown.parts,undefined,3)),ti=new Uint32Array(visibleTissue.reduce((n,p)=>n+p.faceCount*3,0));let offset=0;
 for(const p of visibleTissue){const faces=tissueIndices.subarray(p.firstFace*3,(p.firstFace+p.faceCount)*3);ti.set(faces,offset);offset+=faces.length;}
 const tg=new T.BufferGeometry();tg.setAttribute('position',new T.BufferAttribute(new Float32Array(tissueBuffer,tissueInfo.positions,tissueInfo.vertexCount*3),3));tg.setIndex(new T.BufferAttribute(ti,1));computeBoundsTree.call(tg,{indirect:true});
 const connective=new T.Mesh(tg,new T.MeshBasicMaterial({side:T.DoubleSide}));connective.raycast=acceleratedRaycast;connective.updateMatrixWorld();
 const sourceFaces=[],sourceParts=[];
 for(const part of shown.parts){
  const originalPart=meta.muscles.parts.find(p=>p.id===part.id),firstFace=sourceFaces.length/3;
  sourceFaces.push(...indices.subarray(originalPart.firstFace*3,(originalPart.firstFace+originalPart.faceCount)*3));
  sourceParts.push({...originalPart,firstFace});
 }
 const sg=new T.BufferGeometry();sg.setAttribute('position',new T.BufferAttribute(positions,3));sg.setIndex(new T.BufferAttribute(Uint32Array.from(sourceFaces),1));computeBoundsTree.call(sg,{indirect:true});
 const sourceMesh=new T.Mesh(sg,new T.MeshBasicMaterial({side:T.DoubleSide}));sourceMesh.raycast=acceleratedRaycast;sourceMesh.updateMatrixWorld();
 const identity=(hit,muscleMesh,ranges)=>hit?.object===muscleMesh?ranges.find(p=>hit.faceIndex>=p.firstFace&&hit.faceIndex<p.firstFace+p.faceCount)?.id:hit?.object===bones?'bone':hit?.object===connective?'connective':undefined;
 for(const part of shown.parts.filter(p=>/quadratus lumborum/.test(p.name))){
  const qg=new T.BufferGeometry();qg.setAttribute('position',shown.geometry.getAttribute('position'));qg.setIndex(new T.BufferAttribute(shown.geometry.index.array.slice(part.firstFace*3,(part.firstFace+part.faceCount)*3),1));computeBoundsTree.call(qg,{indirect:true});
  const q=new T.Mesh(qg,new T.MeshBasicMaterial({side:T.DoubleSide}));q.raycast=acceleratedRaycast;q.updateMatrixWorld();const box=new T.Box3().setFromObject(q);
  for(const angle of [0,20]){let samples=0,hits=0;const direction=new T.Vector3(Math.sin(angle*Math.PI/180),0,Math.cos(angle*Math.PI/180));
   for(let row=1;row<16;row++)for(let col=1;col<14;col++){
    const target=new T.Vector3(T.MathUtils.lerp(box.min.x,box.max.x,col/14),T.MathUtils.lerp(box.min.y,box.max.y,row/16),(box.min.z+box.max.z)/2);
    const ray=new T.Raycaster(target.addScaledVector(direction,.6),direction.clone().negate());ray.firstHitOnly=true;
    const qHit=ray.intersectObject(q)[0];if(!qHit)continue;
    // Preserve actual depth relationships, including psoas and bone occlusion.
    // A visibility percentage must not justify deleting another muscle.
    const boneHit=ray.intersectObject(bones)[0];if(boneHit&&boneHit.distance<qHit.distance-.0005)continue;
    samples++;
    const hit=ray.intersectObjects([whole,bones,connective],false)[0],expected=ray.intersectObjects([sourceMesh,bones,connective],false)[0];
    assert.equal(identity(hit,whole,shown.parts),identity(expected,sourceMesh,sourceParts),`${part.name}: changed source occlusion at ${angle}°`);
    if(hit?.object===whole&&hit.faceIndex>=part.firstFace&&hit.faceIndex<part.firstFace+part.faceCount)hits++;
   }
   assert.ok(samples>35);assert.ok(hits>0,`${part.name}, ${angle}°: no selectable source surface`);
  }
  qg.dispose();q.material.dispose();
 }
 shown.geometry.dispose();whole.material.dispose();bg.dispose();bones.material.dispose();tg.dispose();connective.material.dispose();sg.dispose();sourceMesh.material.dispose();
});
test('home display has lower download and triangle cost without changing localization source',()=>{
 const report=JSON.parse(readFileSync('public/3d/display-manifest.json')).report;
 const home=decodePreparedModel(read('home-muscles.pack'));
 assert.ok(report.homeMuscles.bytes+report.homeBones.bytes<(readFileSync('public/3d/muscles.pack').length+readFileSync('public/3d/bones.pack').length)*.4);
 assert.ok(report.homeMuscles.faces+report.homeBones.faces<(meta.muscles.indexCount+meta.bones.indexCount)/3*.5);
 for(const name of ['Right rectus femoris','Left rectus abdominis','Right external oblique','Right latissimus dorsi'])assert.ok(home.parts.some(p=>p.name===name));
 // AnatomyStage continues raycasting the untouched skin.pack / surface_atlas.
 const stage=readFileSync('src/AnatomyStage.tsx','utf8');assert.match(stage,/intersectObject\(state.skin, false\)/);assert.match(stage,/localizeFace\(state.metadata, state.surfaceAtlas/);
 home.geometry.dispose();
});
