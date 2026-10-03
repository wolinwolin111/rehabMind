import type {MusclePart} from './muscle-picking';
import {Color} from 'three';
export const usesFittedMuscleDisplay=(part:MusclePart)=>!!part.sharedDistal||/^FJ1433M?$/.test(part.id);
export function visibleMuscleColors(vertexCount:number,indices:Uint32Array,visible:MusclePart[],members:MusclePart[]){
  const result=new Float32Array(vertexCount*3),base=new Color(0xb66d59),green=new Color('#59bd86');
  for(let i=0;i<result.length;i+=3){result[i]=base.r;result[i+1]=base.g;result[i+2]=base.b;}
  const ids=new Set(members.map(p=>p.id));
  for(const p of visible)if(ids.has(p.id))for(let f=p.firstFace*3;f<(p.firstFace+p.faceCount)*3;f++){
    const i=indices[f]*3;result[i]=green.r;result[i+1]=green.g;result[i+2]=green.b;
  }
  return result;
}
// Merge only known source subdivisions of one same-side muscle.
const assemblies=[['FJ1499','FJ1475'],['FJ1499M','FJ1475M'],['FJ1472','FJ1517'],['FJ1472M','FJ1517M']];
export function muscleSelectionParts(parts:MusclePart[],selected:MusclePart):MusclePart[]{
  const ids=assemblies.find(group=>group.includes(selected.id));
  if(!ids)return parts.filter(part=>part.id===selected.id);
  return parts.filter(part=>ids.includes(part.id)&&part.side===selected.side&&part.conceptId===selected.conceptId);
}
