import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
import * as T from 'three';
import {computeBoundsTree} from 'three-mesh-bvh';
await build({stdin:{contents:"export * from './src/prepared-model';export * from './src/content/muscle-layers';export * from './src/abdominal-display';export * from './src/muscle-surface';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:'build/authoring/benchmark-functions.mjs'});
const {decodePreparedModel,decodePreparedPool,preparedPoolFiles,peelMuscleIndices,abdominalDisplayNormals,softenAbdominalNormals,muscleSurfaceCoordinates}=await import('../../build/authoring/benchmark-functions.mjs');
const read=file=>{const raw=gunzipSync(readFileSync(`public/3d/${file}`));return raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);};
const poolCache=new Map();
const prepared=file=>{const buffer=read(file);return decodePreparedModel(buffer,preparedPoolFiles(buffer).map(name=>{if(!poolCache.has(name))poolCache.set(name,decodePreparedPool(read(name)));return poolCache.get(name);}));};
const info=JSON.parse(readFileSync('public/3d/skin.json')).muscles,b=read('muscles.pack'),pos=new Float32Array(b,info.positions,info.vertexCount*3),indices=new Uint32Array(b,info.indices,info.indexCount),norm=new T.BufferAttribute(new Int16Array(b,info.normals,info.vertexCount*3),3,true);
let start=performance.now();const old=peelMuscleIndices(indices,info.parts,'all',0,pos),g=new T.BufferGeometry();
g.setAttribute('position',new T.BufferAttribute(old.positions,3));g.setIndex(new T.BufferAttribute(old.indices,1));g.setAttribute('normal',new T.BufferAttribute(abdominalDisplayNormals(norm,old.blends),3));softenAbdominalNormals(g,old.parts);g.setAttribute('muscleSurface',new T.BufferAttribute(muscleSurfaceCoordinates(old.positions,old.indices,old.parts),4));computeBoundsTree.call(g,{indirect:true});
const oldCpuMs=Math.round(performance.now()-start);g.dispose();
const report={environment:`Node ${process.version} / ${process.platform}, excludes network and GPU`,oldCpuMs};
for(const file of ['home-muscles.pack',...[0,1,2,3,4].map(n=>`atlas-muscles-${n}.pack`)]){
 const required=preparedPoolFiles(read(file)).filter(name=>!poolCache.has(name));
 start=performance.now();const view=prepared(file);
 report[file]={inflateAndDecodeMs:Math.round(performance.now()-start),newDownloadBytes:[file,...required].reduce((n,name)=>n+readFileSync(`public/3d/${name}`).length,0),sharedPoolFiles:required};view.geometry.dispose();
}
const files=[...[0,1,2,3,4].map(n=>`atlas-muscles-${n}.pack`),'atlas-shared-0.pack','atlas-shared-1.pack'];
report.totalAtlasBytes=files.reduce((n,file)=>n+readFileSync(`public/3d/${file}`).length,0);
writeFileSync('build/authoring/model-performance.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
