import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import * as T from 'three';
import {MeshBVH} from 'three-mesh-bvh';

const dir='public/3d',manifestPath=`${dir}/display-manifest.json`;
const sources=['skin.json','muscles.pack','bones.pack'].map(file=>`${dir}/${file}`);
const code=['scripts/authoring/prepare_model_display.mjs','src/prepared-model.ts','src/content/muscle-layers.ts','src/content/body-muscle-anatomy.ts','src/content/lower-limb-anatomy.ts','src/content/muscle-anatomy.ts','src/abdominal-display.ts','src/muscle-surface.ts','src/content/tendon-anatomy.ts','package-lock.json'];
const revision=createHash('sha256');for(const file of [...sources,...code])revision.update(readFileSync(file));
const fingerprint=revision.digest('hex');
const outputs=['home-muscles.pack','home-bones.pack',...[0,1,2,3,4].map(n=>`atlas-muscles-${n}.pack`)];
if(existsSync(manifestPath)&&JSON.parse(readFileSync(manifestPath)).fingerprint===fingerprint&&outputs.every(file=>existsSync(`${dir}/${file}`))){console.log('Prepared model displays are current');process.exit(0);}
mkdirSync('build/authoring',{recursive:true});
await build({stdin:{contents:"export * from './src/content/muscle-layers'; export * from './src/abdominal-display'; export * from './src/muscle-surface'; export * from './src/content/tendon-anatomy';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:'build/authoring/display-functions.mjs'});
const {peelMuscleIndices,abdominalDisplayNormals,softenAbdominalNormals,muscleSurfaceCoordinates,excludeConnectiveBoneParts}=await import('../../build/authoring/display-functions.mjs');
const metadata=JSON.parse(readFileSync(`${dir}/skin.json`));
function source(file,info){const raw=gunzipSync(readFileSync(`${dir}/${file}`)),buffer=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);return{positions:new Float32Array(buffer,info.positions,info.vertexCount*3),normals:new T.BufferAttribute(new Int16Array(buffer,info.normals,info.vertexCount*3),3,true),indices:new Uint32Array(buffer,info.indices,info.indexCount),parts:info.parts};}
function geometry(positions,indices,normals){const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setIndex(new T.BufferAttribute(indices,1));g.setAttribute('normal',normals);return g;}
// Compact exact displays; spatial clustering is used only for the home illustration.
// Each muscle/bone has its own vertex map so adjacent structures never merge.
function compact(g,parts,cell=0){
 const p=g.getAttribute('position'),n=g.getAttribute('normal'),s=g.getAttribute('muscleSurface'),idx=g.index.array;
 const points=[],normals=[],surface=[],indices=[],ranges=[];
 for(const part of parts){const map=new Map(),first=indices.length/3;
  const vertex=i=>{const key=cell?`${Math.round(p.getX(i)/cell)},${Math.round(p.getY(i)/cell)},${Math.round(p.getZ(i)/cell)}`:i;let v=map.get(key);if(v===undefined){v=points.length/3;map.set(key,v);points.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));if(s)surface.push(s.getX(i),s.getY(i),s.getZ(i),s.getW(i));}return v;};
  for(let f=part.firstFace*3;f<(part.firstFace+part.faceCount)*3;f+=3){const a=vertex(idx[f]),b=vertex(idx[f+1]),c=vertex(idx[f+2]);if(a!==b&&b!==c&&a!==c)indices.push(a,b,c);}
  if(indices.length/3>first)ranges.push({...part,firstFace:first,faceCount:indices.length/3-first});
 }
 const result=geometry(new Float32Array(points),new Uint32Array(indices),new T.BufferAttribute(new Float32Array(normals),3));
 if(s)result.setAttribute('muscleSurface',new T.BufferAttribute(new Float32Array(surface),4));
 return {geometry:result,parts:ranges};
}
function save(file,g,parts,picking){
 const arrays=[],header={version:1,parts};let offset=0;
 const add=array=>{const bytes=Buffer.from(array.buffer??array,array.byteOffset??0,array.byteLength);const span={offset,length:array.length??array.byteLength};arrays.push(bytes);offset+=bytes.length;const pad=(4-offset%4)%4;if(pad){arrays.push(Buffer.alloc(pad));offset+=pad;}return span;};
 const p=g.getAttribute('position').array,min=[0,0,0],max=[0,0,0];
 if(p.length){min.fill(Infinity);max.fill(-Infinity);for(let i=0;i<p.length;i++){min[i%3]=Math.min(min[i%3],p[i]);max[i%3]=Math.max(max[i%3],p[i]);}}
 const scale=max.map((value,i)=>(value-min[i])/65535||1),packedPosition=new Uint16Array(p.length);
 for(let i=0;i<p.length;i++){packedPosition[i]=Math.round((p[i]-min[i%3])/scale[i%3]);p[i]=packedPosition[i]*scale[i%3]+min[i%3];}
 header.position=add(packedPosition);header.positionMin=min;header.positionScale=scale;
 const n=g.getAttribute('normal'),normal=new Int16Array(n.count*3);for(let i=0;i<n.count;i++){normal[i*3]=Math.round(T.MathUtils.clamp(n.getX(i),-1,1)*32767);normal[i*3+1]=Math.round(T.MathUtils.clamp(n.getY(i),-1,1)*32767);normal[i*3+2]=Math.round(T.MathUtils.clamp(n.getZ(i),-1,1)*32767);}
 header.normal=add(normal);header.index=add(g.index.array);
 if(g.hasAttribute('muscleSurface')){
  const source=g.getAttribute('muscleSurface').array,scale=[1,1,1,1];
  for(let i=0;i<source.length;i++)scale[i%4]=Math.max(scale[i%4],Math.abs(source[i]));
  const packed=new Int16Array(source.length);for(let i=0;i<source.length;i++)packed[i]=Math.round(source[i]/scale[i%4]*32767);
  header.surface=add(packed);header.surfaceScale=scale;
 }
 if(picking&&g.index.count){const bvh=new MeshBVH(g,{indirect:true,maxLeafTris:32}),data=MeshBVH.serialize(bvh,{cloneBuffers:false});header.roots=data.roots.map(add);header.indirect=add(new Uint32Array(data.indirectBuffer));}
 const json=Buffer.from(JSON.stringify(header)),prefix=Buffer.alloc(Math.ceil((json.length+4)/4)*4);prefix.writeUInt32LE(json.length);json.copy(prefix,4);
 const packed=gzipSync(Buffer.concat([prefix,...arrays]),{level:9});writeFileSync(`${dir}/${file}`,packed);
 return {bytes:packed.length,vertices:g.getAttribute('position').count,faces:g.index.count/3};
}
const muscles=source('muscles.pack',metadata.muscles),report={};
for(let step=0;step<=4;step++){
 const start=performance.now(),shown=peelMuscleIndices(muscles.indices,muscles.parts,'all',step,muscles.positions);
 const g=geometry(shown.positions,shown.indices,new T.BufferAttribute(abdominalDisplayNormals(muscles.normals,shown.blends),3));
 softenAbdominalNormals(g,shown.parts);
 // Home uses the same corrected contour and normals, without procedural grain.
 if(step===0){const lite=compact(g,shown.parts,.003);report.homeMuscles=save('home-muscles.pack',lite.geometry,lite.parts,false);lite.geometry.dispose();}
 g.setAttribute('muscleSurface',new T.BufferAttribute(muscleSurfaceCoordinates(shown.positions,shown.indices,shown.parts),4));
 const exact=compact(g,shown.parts);report[`atlas${step}`]=save(`atlas-muscles-${step}.pack`,exact.geometry,exact.parts,true);
 report[`atlas${step}`].prepareMs=Math.round(performance.now()-start);console.log(step,report[`atlas${step}`]);g.dispose();exact.geometry.dispose();
}
const bones=source('bones.pack',metadata.bones),kept=excludeConnectiveBoneParts(bones.indices,bones.parts,metadata.tendons?.parts||[]);
const boneSource=geometry(bones.positions,kept.indices,bones.normals),liteBones=compact(boneSource,kept.parts,.003);
report.homeBones=save('home-bones.pack',liteBones.geometry,liteBones.parts,false);
writeFileSync(manifestPath,JSON.stringify({fingerprint,report},null,2));console.log(JSON.stringify(report,null,2));
