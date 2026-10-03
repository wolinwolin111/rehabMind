import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import * as T from 'three';
import {MeshBVH} from 'three-mesh-bvh';

function write(file,header,arrays){
 let offset=0;const chunks=[];
 for(const [name,array] of arrays){const bytes=Buffer.from(array.buffer??array,array.byteOffset??0,array.byteLength);header[name]={offset,length:array.length??array.byteLength};chunks.push(bytes);offset+=bytes.length;const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}}
 const json=Buffer.from(JSON.stringify(header)),prefix=Buffer.alloc(Math.ceil((json.length+4)/4)*4);prefix.writeUInt32LE(json.length);json.copy(prefix,4);
 const packed=gzipSync(Buffer.concat([prefix,...chunks]),{level:9});writeFileSync(file,packed);return packed.length;
}

/** Stage zero owns the initial pool; deeper stages fetch only one extra pool.
 * Vertex identity includes normals and grain coordinates: exposure changes
 * these on clipped sheets even when their positions have not changed. */
export function saveSharedDisplays(dir,views){
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],surfaceScale=[1,1,1,1];
 for(const {geometry:g} of views){const p=g.attributes.position.array,s=g.attributes.muscleSurface.array;for(let i=0;i<p.length;i++){min[i%3]=Math.min(min[i%3],p[i]);max[i%3]=Math.max(max[i%3],p[i]);}for(let i=0;i<s.length;i++)surfaceScale[i%4]=Math.max(surfaceScale[i%4],Math.abs(s[i]));}
 const positionScale=max.map((v,i)=>(v-min[i])/65535||1),records=new Map(),blocks=new Map(),pools=[{vertices:[],indices:[]},{vertices:[],indices:[]}],report={};
 for(let step=0;step<views.length;step++){
  const {geometry:g,parts}=views[step],pool=step===0?0:1,p=g.attributes.position,n=g.attributes.normal,s=g.attributes.muscleSurface,remap=new Uint32Array(p.count),newRecords=[];
  for(let i=0;i<p.count;i++){
   const r=[Math.round((p.getX(i)-min[0])/positionScale[0]),Math.round((p.getY(i)-min[1])/positionScale[1]),Math.round((p.getZ(i)-min[2])/positionScale[2]),Math.round(T.MathUtils.clamp(n.getX(i),-1,1)*32767),Math.round(T.MathUtils.clamp(n.getY(i),-1,1)*32767),Math.round(T.MathUtils.clamp(n.getZ(i),-1,1)*32767),Math.round(s.getX(i)/surfaceScale[0]*32767),Math.round(s.getY(i)/surfaceScale[1]*32767),Math.round(s.getZ(i)/surfaceScale[2]*32767),Math.round(s.getW(i)/surfaceScale[3]*32767)];
   const key=r.join(',' );let id=records.get(key);
   if(id===undefined){id=records.size;records.set(key,id);newRecords.push(r);}
   remap[i]=id;
   // BVH uses the exact quantized coordinates displayed by the decoder.
   for(let axis=0;axis<3;axis++)p.array[i*3+axis]=r[axis]*positionScale[axis]+min[axis];
  }
  for(const record of newRecords)pools[pool].vertices.push(record);
  const references=[];
  for(const part of parts){
   const local=g.index.array.subarray(part.firstFace*3,(part.firstFace+part.faceCount)*3),shared=Uint32Array.from(local,v=>remap[v]),bytes=Buffer.from(shared.buffer),key=createHash('sha256').update(bytes).digest('hex');let block=blocks.get(key);
   if(!block){block={pool,offset:pools[pool].indices.length,length:shared.length};blocks.set(key,block);for(const v of shared)pools[pool].indices.push(v);}
   references.push(block);
  }
  const header={version:2,parts,vertexCount:p.count,blocks:references,pools:step===0?['atlas-shared-0.pack']:step===4?[]:['atlas-shared-0.pack','atlas-shared-1.pack']},arrays=[];
  if(g.index.count){const bvh=new MeshBVH(g,{indirect:true,maxLeafTris:32}),data=MeshBVH.serialize(bvh,{cloneBuffers:false});header.rootCount=data.roots.length;data.roots.forEach((root,i)=>arrays.push([`root${i}`,root]));arrays.push(['indirect',new Uint32Array(data.indirectBuffer)]);}
  report[`atlas${step}`]={bytes:write(`${dir}/atlas-muscles-${step}.pack`,header,arrays),vertices:p.count,faces:g.index.count/3};
 }
 let firstVertex=0;
 for(let pool=0;pool<2;pool++){
  const rows=pools[pool].vertices,pos=new Uint16Array(rows.length*3),normal=new Int16Array(rows.length*3),surface=new Int16Array(rows.length*4);
  for(let i=0;i<rows.length;i++){pos.set(rows[i].slice(0,3),i*3);normal.set(rows[i].slice(3,6),i*3);surface.set(rows[i].slice(6),i*4);}
  report[`shared${pool}`]={bytes:write(`${dir}/atlas-shared-${pool}.pack`,{version:2,firstVertex,positionMin:min,positionScale,surfaceScale},[['position',pos],['normal',normal],['surface',surface],['index',new Uint32Array(pools[pool].indices)]]),vertices:rows.length,faces:pools[pool].indices.length/3};firstVertex+=rows.length;
 }
 return report;
}
