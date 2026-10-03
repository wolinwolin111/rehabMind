import * as T from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { MusclePart } from './muscle-picking';

interface ArraySpan { offset:number; length:number }
interface PreparedHeader {
  version:number; parts:MusclePart[]; position:ArraySpan; normal:ArraySpan; index:ArraySpan;
  positionMin:number[]; positionScale:number[];
  surface?:ArraySpan; surfaceScale?:number[]; roots?:ArraySpan[]; indirect?:ArraySpan;
}
/** Build-time display data. Source anatomy and localization packs remain separate. */
export function decodePreparedModel(buffer:ArrayBuffer) {
  const size=new DataView(buffer).getUint32(0,true);
  const header=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,4,size))) as PreparedHeader;
  if(header.version!==1)throw new Error('模型显示资源版本不兼容');
  const start=Math.ceil((size+4)/4)*4;
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
