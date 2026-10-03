import schematic from './content/rectus-proximal-schematic.json';
import type {MusclePart} from './muscle-picking';

/** Selected-view proximal correction. Original resources stay intact and can be toggled back. */
export function appendRectusProximal(_indices:Uint32Array,_positions:Float32Array,selected:MusclePart){
  if(schematic.status!=='anatomical_schematic_not_verified_tendon_or_footprint')return null;
  const data=schematic.parts.find(p=>p.muscleId===selected.id&&p.side===selected.side&&p.conceptId===selected.conceptId);
  if(!data)return null;
  const positions:number[]=[],indices:number[]=[],tendonBlend:number[]=[],vertices=new Map<string,number>();
  const smooth=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  const append=(points:number[],faces:number[],blend:(i:number)=>number)=>{
    const map:number[]=[];
    for(let i=0;i<points.length;i+=3){
      const key=points.slice(i,i+3).map(v=>v.toFixed(9)).join(',');
      let vertex=vertices.get(key);
      if(vertex===undefined){vertex=positions.length/3;vertices.set(key,vertex);positions.push(...points.slice(i,i+3));tendonBlend.push(blend(i/3));}
      map.push(vertex);
    }
    indices.push(...faces.map(i=>map[i]));
  };
  const colorStart=data.body.cutY+.003;
  const junctionVertices=new Set(data.body.upperLoop);
  append(data.body.positions,data.body.indices,i=>junctionVertices.has(i) ? .25 : .25*smooth((data.body.positions[i*3+1]-colorStart)/(data.body.fork[1]-colorStart)));
  const parts:MusclePart[]=[{...selected,firstFace:0,faceCount:data.body.indices.length/3}];
  for(const head of data.heads){
    const face=indices.length/3;
    append(head.positions,head.indices,i=>.25+.75*smooth(Math.floor(i/head.baseVertexCount)/(head.rings-1)/.9));
    parts.push({...selected,firstFace:face,faceCount:head.indices.length/3,schematicHead:head.head as 'direct'|'reflected'});
  }
  return {positions:Float32Array.from(positions),indices:Uint32Array.from(indices),parts,tendonBlend:Float32Array.from(tendonBlend),clipped:true,proximalSchematic:true};
}
