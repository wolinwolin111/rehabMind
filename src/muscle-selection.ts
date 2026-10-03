import type { MusclePart } from './muscle-picking';
import { appendRectusProximal } from './rectus-proximal';
import { roundBicepsDistal } from './biceps-distal';
import {muscleSelectionParts} from './muscle-selection-display';
export {muscleSelectionParts,visibleMuscleColors,usesFittedMuscleDisplay} from './muscle-selection-display';

/** Copy original triangles without moving vertices; return new face ranges for picking. */
export function selectedMuscleIndices(indices: Uint32Array, parts: MusclePart[], selected: MusclePart) {
  const members = muscleSelectionParts(parts, selected);
  const recipient = parts.find(p=>p.id===selected.id);
  const shared = recipient?.sharedDistal;
  const donor = shared && parts.find(p=>p.id===shared.donorId&&p.side===selected.side&&p.conceptId===shared.donorConceptId);
  const faces = donor && shared ? shared.faces.filter(f=>Number.isInteger(f)&&f>=0&&f<donor.faceCount) : [];
  const output = new Uint32Array(members.reduce((sum, part) => sum + part.faceCount * 3, 0)+faces.length*3);
  let offset = 0;
  const ranges = members.map(part => {
    output.set(indices.subarray(part.firstFace * 3, (part.firstFace + part.faceCount) * 3), offset);
    const range = { ...part, firstFace: offset / 3 };
    offset += part.faceCount * 3;
    return range;
  });
  if(donor&&recipient&&faces.length){
    const firstFace=offset/3;
    for(const face of faces){const start=(donor.firstFace+face)*3;output.set(indices.subarray(start,start+3),offset);offset+=3;}
    // Picking the shared display segment retains its selected muscle context.
    // Its donor identity is separately traceable; the donor head is not renamed.
    ranges.push({...recipient,firstFace,faceCount:faces.length,sourceSegmentOf:donor.id});
  }
  return { indices: output, parts: ranges };
}

/** Display-only fitting; source packs remain untouched. Biceps seam is locally faired. */
export function selectedMuscleGeometry(indices: Uint32Array, positions: Float32Array, parts: MusclePart[], selected: MusclePart, options:{proximalSchematic?:boolean}={}) {
  const proximal=options.proximalSchematic!==false&&appendRectusProximal(indices,positions,selected);
  if(proximal)return proximal;
  const source = selectedMuscleIndices(indices, parts, selected);
  const shared = selected.sharedDistal;
  const tail = source.parts.find(p => p.sourceSegmentOf);
  if (!shared || !tail) return {...source, positions, clipped: false};
  const points:number[] = [], output:number[] = [], vertices = new Map<string,number>();
  const original = (id:number) => {
    const key = `v${id}`;
    if (!vertices.has(key)) { vertices.set(key,points.length/3); points.push(positions[id*3],positions[id*3+1],positions[id*3+2]); }
    return vertices.get(key)!;
  };
  const crossing = (a:number,b:number) => {
    const key = `e${Math.min(a,b)}:${Math.max(a,b)}`;
    if (!vertices.has(key)) {
      const t = (shared.cutoffY-positions[a*3+1])/(positions[b*3+1]-positions[a*3+1]);
      vertices.set(key,points.length/3);
      points.push(positions[a*3]+t*(positions[b*3]-positions[a*3]),shared.cutoffY,positions[a*3+2]+t*(positions[b*3+2]-positions[a*3+2]));
    }
    return vertices.get(key)!;
  };
  const ranges = source.parts.filter(p=>!p.sourceSegmentOf).map(part=>{
    const firstFace=output.length/3;
    for(const id of source.indices.subarray(part.firstFace*3,(part.firstFace+part.faceCount)*3)) output.push(original(id));
    return {...part,firstFace};
  });
  const firstFace=output.length/3;
  for(let face=tail.firstFace;face<tail.firstFace+tail.faceCount;face++) {
    const triangle=[...source.indices.subarray(face*3,face*3+3)], polygon:number[]=[];
    for(let n=0;n<3;n++) {
      const a=triangle[n],b=triangle[(n+1)%3],insideA=positions[a*3+1]<=shared.cutoffY,insideB=positions[b*3+1]<=shared.cutoffY;
      if(insideA)polygon.push(original(a));
      if(insideA!==insideB)polygon.push(crossing(a,b));
    }
    for(let n=1;n+1<polygon.length;n++)output.push(polygon[0],polygon[n],polygon[n+1]);
  }
  // Fit only the supplementary end inside the recipient's section. A raw donor
  // cut leaves a wide ledge because the two source heads meet at an angle.
  // This display transition is not a reconstructed anatomical tendon footprint.
  const section=(start:number,end:number)=>{
    const samples:number[][]=[];
    for(let i=start;i<end;i+=3)for(let n=0;n<3;n++){
      const a=indices[i+n],b=indices[i+(n+1)%3],ay=positions[a*3+1],by=positions[b*3+1];
      if((ay<=shared.cutoffY)!==(by<=shared.cutoffY)){
        const t=(shared.cutoffY-ay)/(by-ay);
        samples.push([positions[a*3]+t*(positions[b*3]-positions[a*3]),positions[a*3+2]+t*(positions[b*3+2]-positions[a*3+2])]);
      }
    }
    if(samples.length<3)return null;
    const lo=[Math.min(...samples.map(p=>p[0])),Math.min(...samples.map(p=>p[1]))],hi=[Math.max(...samples.map(p=>p[0])),Math.max(...samples.map(p=>p[1]))];
    return {center:lo.map((v,n)=>(v+hi[n])/2),radius:lo.map((v,n)=>(hi[n]-v)/2)};
  };
  const recipientSection=section(selected.firstFace*3,(selected.firstFace+selected.faceCount)*3);
  const donor=parts.find(p=>p.id===tail.sourceSegmentOf)!;
  const donorSection=section(donor.firstFace*3,(donor.firstFace+donor.faceCount)*3);
  if(recipientSection&&donorSection&&donorSection.radius.every(r=>r>1e-7)){
    let tipY=Infinity;
    for(const id of indices.subarray(selected.firstFace*3,(selected.firstFace+selected.faceCount)*3))tipY=Math.min(tipY,positions[id*3+1]);
    const blendStart=tipY-.012,span=shared.cutoffY-blendStart;
    // Add section rings before fitting so large source triangles cannot create
    // another angular spur. The donor surface below the blend stays original.
    const planes=[1,2,3,4].map(n=>blendStart+span*n/5);
    const sectionVertices=new Map<string,number>();
    const split=(polygon:number[],plane:number)=>{
      if(polygon.every(v=>points[v*3+1]<=plane)||polygon.every(v=>points[v*3+1]>=plane))return [polygon];
      const below:number[]=[],above:number[]=[];
      for(let n=0;n<polygon.length;n++){
        const a=polygon[n],b=polygon[(n+1)%polygon.length],ay=points[a*3+1],by=points[b*3+1];
        if(ay<=plane)below.push(a);if(ay>=plane)above.push(a);
        if((ay<plane&&by>plane)||(ay>plane&&by<plane)){
          const key=`${Math.min(a,b)}:${Math.max(a,b)}:${plane}`;
          if(!sectionVertices.has(key)){
            const t=(plane-ay)/(by-ay);sectionVertices.set(key,points.length/3);
            points.push(points[a*3]+t*(points[b*3]-points[a*3]),plane,points[a*3+2]+t*(points[b*3+2]-points[a*3+2]));
          }
          const v=sectionVertices.get(key)!;below.push(v);above.push(v);
        }
      }
      return [below,above].filter(p=>p.length>=3);
    };
    const tailIndices=output.splice(firstFace*3);
    for(let face=0;face<tailIndices.length;face+=3){
      let polygons=[tailIndices.slice(face,face+3)];
      for(const plane of planes)polygons=polygons.flatMap(p=>split(p,plane));
      for(const polygon of polygons)for(let n=1;n+1<polygon.length;n++)output.push(polygon[0],polygon[n],polygon[n+1]);
    }
    const supplementalVertices=new Set(output.slice(firstFace*3));
    for(const id of supplementalVertices){
      const y=points[id*3+1];if(y<=blendStart)continue;
      const t=Math.min(1,(y-blendStart)/span),weight=t*t*(3-2*t);
      for(const [axis,coord] of [[0,0],[2,1]]){
        const current=points[id*3+axis];
        const fitted=recipientSection.center[coord]+(current-donorSection.center[coord])*recipientSection.radius[coord]*.72/donorSection.radius[coord];
        points[id*3+axis]=current+(fitted-current)*weight;
      }
    }
    if(selected.id==='FJ1512'||selected.id==='FJ1512M'){
      const rounded=roundBicepsDistal(points,output,firstFace,blendStart,shared.cutoffY+.014);
      if(rounded)return {positions:Float32Array.from(rounded.points),indices:Uint32Array.from(rounded.indices),clipped:true,tendonBlend:rounded.tendonBlend,
        parts:[{...ranges[0],firstFace:0,faceCount:rounded.firstTailFace},{...tail,firstFace:rounded.firstTailFace,faceCount:rounded.indices.length/3-rounded.firstTailFace}],roundedJunction:rounded.roundedJunction};
    }
  }
  ranges.push({...tail,firstFace,faceCount:output.length/3-firstFace});
  return {indices:Uint32Array.from(output),positions:Float32Array.from(points),parts:ranges,clipped:true};
}
