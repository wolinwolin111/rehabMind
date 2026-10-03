// Sample the actual atlas displays, including opaque bone and connective tissue.
// This is a geometric accessibility audit, not an anatomical accuracy certificate.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
import * as T from 'three';
import {acceleratedRaycast,computeBoundsTree} from 'three-mesh-bvh';
mkdirSync('build/authoring',{recursive:true});
await build({stdin:{contents:"export * from './src/prepared-model';export * from './src/content/tendon-anatomy';export * from './src/content/muscle-anatomy';",resolveDir:process.cwd()},bundle:true,packages:'external',platform:'node',format:'esm',outfile:'build/authoring/visibility-functions.mjs'});
const {decodePreparedModel,decodePreparedPool,preparedPoolFiles,tendonVisible,excludeConnectiveBoneParts,getMuscleDisplayName}=await import('../../build/authoring/visibility-functions.mjs');
const metadata=JSON.parse(readFileSync('public/3d/skin.json'));
const material=new T.MeshBasicMaterial({side:T.DoubleSide});
const read=file=>{const b=gunzipSync(readFileSync(`public/3d/${file}`));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
const prepared=file=>{const buffer=read(file);return decodePreparedModel(buffer,preparedPoolFiles(buffer).map(name=>decodePreparedPool(read(name))));};
function mesh(g){if(!g.boundsTree)computeBoundsTree.call(g,{indirect:true});const m=new T.Mesh(g,material);m.raycast=acceleratedRaycast;m.updateMatrixWorld();return m;}
function source(file,info,selection){
 const raw=read(file),g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(raw,info.positions,info.vertexCount*3),3));
 g.setIndex(new T.BufferAttribute(selection??new Uint32Array(raw,info.indices,info.indexCount),1));return g;
}
const boneRaw=read('bones.pack'),boneIndices=new Uint32Array(boneRaw,metadata.bones.indices,metadata.bones.indexCount);
const boneSelection=excludeConnectiveBoneParts(boneIndices,metadata.bones.parts,metadata.tendons.parts);
const bones=mesh(source('bones.pack',metadata.bones,boneSelection.indices));
const tendonRaw=read('tendons.pack'),tendonIndices=new Uint32Array(tendonRaw,metadata.tendons.indices,metadata.tendons.indexCount);
const directions=[];for(const elevation of [-25,0,25])for(let azimuth=0;azimuth<360;azimuth+=30){
 const a=azimuth*Math.PI/180,e=elevation*Math.PI/180;
 directions.push({azimuth,elevation,vector:new T.Vector3(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e))});
}
const rows=new Map(),ray=new T.Raycaster();ray.firstHitOnly=true;
for(let step=0;step<4;step++){
 const shown=prepared(`atlas-muscles-${step}.pack`),muscles=mesh(shown.geometry);
 const selected=metadata.tendons.parts.filter(p=>tendonVisible(p,shown.parts,undefined,step));
 const tissueRanges=[],tissueFaces=[];for(const p of selected){tissueRanges.push({...p,firstFace:tissueFaces.length/3});tissueFaces.push(...tendonIndices.subarray(p.firstFace*3,(p.firstFace+p.faceCount)*3));}
 const tissue=mesh(source('tendons.pack',metadata.tendons,Uint32Array.from(tissueFaces)));
 const pos=shown.geometry.getAttribute('position'),idx=shown.geometry.index.array;
 for(const part of shown.parts){
  const row=rows.get(part.id)??{id:part.id,name:part.name,label:getMuscleDisplayName(part.name,part.displayName),layers:[]};rows.set(part.id,row);
  const result={step,faces:part.faceCount,rays:0,hits:0,bestView:null,blockers:{}};
  for(const view of directions){let viewHits=0;
   for(let sample=0;sample<72;sample++){
    const f=part.firstFace+Math.min(part.faceCount-1,Math.floor((sample+.381)*part.faceCount/72));
    const point=new T.Vector3();for(let c=0;c<3;c++)point.add(new T.Vector3().fromBufferAttribute(pos,idx[f*3+c]));point.multiplyScalar(1/3);
    ray.set(point.addScaledVector(view.vector,.8),view.vector.clone().negate());
    const hit=ray.intersectObjects([muscles,bones,tissue],false)[0];result.rays++;
    const ranges=hit?.object===muscles?shown.parts:hit?.object===bones?boneSelection.parts:tissueRanges;
    const hitPart=ranges.find(p=>hit&&hit.faceIndex>=p.firstFace&&hit.faceIndex<p.firstFace+p.faceCount);
    if(hit?.object===muscles&&hitPart?.id===part.id){result.hits++;viewHits++;}
    else {const key=hitPart?.name??'no hit';result.blockers[key]=(result.blockers[key]??0)+1;}
   }
   if(viewHits>(result.bestView?.hits??0))result.bestView={azimuth:view.azimuth,elevation:view.elevation,hits:viewHits};
  }
  row.layers.push(result);
 }
 console.log(`layer ${step}: ${shown.parts.length} parts checked`);
 shown.geometry.dispose();tissue.geometry.dispose();
}
const parts=[...rows.values()];for(const row of parts){row.selectable=row.layers.some(l=>l.hits>0);row.bestLayer=row.layers.reduce((best,l)=>l.hits>best.hits?l:best,row.layers[0]).step;}
const report={method:'72 triangle centres per part, 12 azimuths at 3 elevations, all four peel stages. Includes actual opaque bones and visible connective tissues. Zero sampled hits triggers focused review; sampling cannot prove anatomical correctness or rule out every small hidden patch.',parts};
writeFileSync('build/authoring/muscle-visibility-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({parts:parts.length,neverSelected:parts.filter(p=>!p.selectable).map(p=>({id:p.id,name:p.name,label:p.label,layers:p.layers.map(l=>({step:l.step,hits:l.hits,blockers:Object.entries(l.blockers).sort((a,b)=>b[1]-a[1]).slice(0,4)}))})),poor:parts.filter(p=>p.selectable&&Math.max(...p.layers.map(l=>l.hits))<12).map(p=>({id:p.id,name:p.name,hits:p.layers.map(l=>l.hits)}))},null,2));
