// Extract world-space metre geometry from the official Z-Anatomy sample.
// npm dependencies are sufficient; no Blender or DOM runtime is required.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import {Vector3} from 'three';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.join(root,'build/z-anatomy-extracted');fs.mkdirSync(out,{recursive:true});
const rows=[];
for(const system of ['Skeletal','Muscular']){
 const raw=fs.readFileSync(path.join(root,`build/${system}System100.fbx`));
 const scene=new FBXLoader().parse(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
 scene.updateMatrixWorld(true);
 scene.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const geometry=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld).scale(.01,.01,.01);
  for(const key of Object.keys(geometry.attributes))if(key!=='position')geometry.deleteAttribute(key);
  let welded=mergeVertices(geometry,1e-6);
  const pos=welded.getAttribute('position'),index=welded.index.array,kept=[];
  const a=new Vector3(),b=new Vector3(),c=new Vector3();
  for(let n=0;n<index.length;n+=3){
   a.fromBufferAttribute(pos,index[n]);b.fromBufferAttribute(pos,index[n+1]);c.fromBufferAttribute(pos,index[n+2]);
   if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-24)kept.push(index[n],index[n+1],index[n+2]);
  }
  const droppedFaces=(index.length-kept.length)/3;
  welded.setIndex(kept);welded=mergeVertices(welded,1e-6);welded.computeVertexNormals();
  const vertices=welded.getAttribute('position').array,indices=welded.index.array;
  const id=`${system}-${rows.length}`;
  fs.writeFileSync(path.join(out,`${id}.positions`),Buffer.from(vertices.buffer,vertices.byteOffset,vertices.byteLength));
  fs.writeFileSync(path.join(out,`${id}.indices`),Buffer.from(Uint32Array.from(indices).buffer));
  rows.push({id,name:mesh.name,system,vertices:vertices.length/3,faces:indices.length/3,droppedFaces});
 });
}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(rows,null,2));
console.log(JSON.stringify({meshes:rows.length,bones:rows.filter(p=>p.system==='Skeletal').length}));
