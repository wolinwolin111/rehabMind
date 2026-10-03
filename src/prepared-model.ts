import * as T from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { MusclePart } from './muscle-picking';

interface ArraySpan { offset:number; length:number }
interface PreparedHeader {
  version:number; parts:MusclePart[]; position:ArraySpan; normal:ArraySpan; index:ArraySpan;
  positionMin:number[]; positionScale:number[];
  surface?:ArraySpan; surfaceScale?:number[]; roots?:ArraySpan[]; indirect?:ArraySpan;
  pools?:string[]; blocks?:{pool:number;offset:number;length:number}[]; rootCount?:number;
  [key:string]:unknown;
}
export interface PreparedPool {
  firstVertex:number; position:Uint16Array; normal:Int16Array; surface:Int16Array; index:Uint32Array;
  positionMin:number[];positionScale:number[];surfaceScale:number[];
}
function unpackHeader(buffer:ArrayBuffer){
  const size=new DataView(buffer).getUint32(0,true);
  return {header:JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,4,size))) as PreparedHeader,start:Math.ceil((size+4)/4)*4};
}
export function preparedPoolFiles(buffer:ArrayBuffer){return unpackHeader(buffer).header.pools??[];}
export function decodePreparedPool(buffer:ArrayBuffer):PreparedPool {
  const {header:h,start}=unpackHeader(buffer);
  if(h.version!==2)throw new Error('模型共享资源版本不兼容');
  const span=(name:string)=>h[name] as ArraySpan;
  return {firstVertex:h.firstVertex as number,position:new Uint16Array(buffer,start+span('position').offset,span('position').length),normal:new Int16Array(buffer,start+span('normal').offset,span('normal').length),surface:new Int16Array(buffer,start+span('surface').offset,span('surface').length),index:new Uint32Array(buffer,start+span('index').offset,span('index').length),positionMin:h.positionMin,positionScale:h.positionScale,surfaceScale:h.surfaceScale!};
}
function decodeSharedModel(buffer:ArrayBuffer,header:PreparedHeader,start:number,pools:PreparedPool[]){
  if(pools.length!==(header.pools?.length??0))throw new Error('模型共享资源不完整');
  const count=pools.reduce((n,p)=>n+p.position.length/3,0),map=new Int32Array(count).fill(-1),capacity=header.vertexCount as number;
  const positions=new Float32Array(capacity*3),normals=new Int16Array(capacity*3),surface=new Float32Array(capacity*4);
  const indices=new Uint32Array(header.parts.reduce((n,p)=>n+p.faceCount*3,0));let vertices=0,offset=0;
  for(const block of header.blocks??[]){const shared=pools[block.pool].index.subarray(block.offset,block.offset+block.length);
    for(const id of shared){let local=map[id];
      if(local===-1){local=vertices++;map[id]=local;const pool=pools.length>1&&id>=pools[1].firstVertex?pools[1]:pools[0],v=id-pool.firstVertex;
        for(let a=0;a<3;a++){positions[local*3+a]=pool.position[v*3+a]*pool.positionScale[a]+pool.positionMin[a];normals[local*3+a]=pool.normal[v*3+a];}
        for(let a=0;a<4;a++)surface[local*4+a]=pool.surface[v*4+a]*pool.surfaceScale[a]/32767;
      }
      indices[offset++]=local;
    }
  }
  const geometry=new T.BufferGeometry();
  // Each view owns its GPU attributes. Disposing a previous layer cannot
  // delete shared buffers still used by the next layer or its highlight.
  geometry.setAttribute('position',new T.BufferAttribute(positions.subarray(0,vertices*3),3));geometry.setAttribute('normal',new T.BufferAttribute(normals.subarray(0,vertices*3),3,true));geometry.setAttribute('muscleSurface',new T.BufferAttribute(surface.subarray(0,vertices*4),4));geometry.setIndex(new T.BufferAttribute(indices,1));
  if(header.rootCount&&header.indirect){const roots=Array.from({length:header.rootCount},(_,i)=>{const span=header[`root${i}`] as ArraySpan;return buffer.slice(start+span.offset,start+span.offset+span.length);});
    const serialized={roots,index:indices,indirectBuffer:new Uint32Array(buffer,start+header.indirect.offset,header.indirect.length)};
    (geometry as T.BufferGeometry & {boundsTree:MeshBVH}).boundsTree=MeshBVH.deserialize(serialized,geometry,{setIndex:false});
  }
  geometry.computeBoundingSphere();return {geometry,parts:header.parts};
}
/** Build-time display data. Source anatomy and localization packs remain separate. */
export function decodePreparedModel(buffer:ArrayBuffer,pools:PreparedPool[]=[]) {
  const {header,start}=unpackHeader(buffer);
  if(header.version===2)return decodeSharedModel(buffer,header,start,pools);
  if(header.version!==1)throw new Error('模型显示资源版本不兼容');
  const geometry=new T.BufferGeometry();
  const integers=(span:ArraySpan)=>new Uint32Array(buffer,start+span.offset,span.length);
  const indices=integers(header.index);
  const packedPosition=new Uint16Array(buffer,start+header.position.offset,header.position.length),positions=new Float32Array(packedPosition.length);
  for(let i=0;i<positions.length;i++)positions[i]=packedPosition[i]*header.positionScale[i%3]+header.positionMin[i%3];
  geometry.setAttribute('position',new T.BufferAttribute(positions,3));
  geometry.setAttribute('normal',new T.BufferAttribute(new Int16Array(buffer,start+header.normal.offset,header.normal.length),3,true));
  geometry.setIndex(new T.BufferAttribute(indices,1));
  if(header.surface){
    const packed=new Int16Array(buffer,start+header.surface.offset,header.surface.length),values=new Float32Array(packed.length);
    for(let i=0;i<values.length;i++)values[i]=packed[i]*(header.surfaceScale![i%4])/32767;
    geometry.setAttribute('muscleSurface',new T.BufferAttribute(values,4));
  }
  if(header.roots&&header.indirect){
    const roots=header.roots.map(span=>buffer.slice(start+span.offset,start+span.offset+span.length));
    const serialized={roots,index:indices,indirectBuffer:integers(header.indirect)};
    (geometry as T.BufferGeometry & {boundsTree:MeshBVH}).boundsTree=MeshBVH.deserialize(serialized,geometry,{setIndex:false});
  }
  geometry.computeBoundingSphere();
  return {geometry,parts:header.parts};
}
