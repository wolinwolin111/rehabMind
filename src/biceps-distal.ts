/** Local display replacement joining two source sections. Bone ends are preserved. */
export function roundBicepsDistal(sourcePoints:number[],sourceIndices:number[],firstTailFace:number,startY:number,endY:number){
  const points:number[]=[],vertices=new Map<string,number>();
  const vertex=(_key:string,p:number[])=>{
    const key=Array.from(Float32Array.from(p)).map(v=>v.toFixed(9)).join(',');
    if(!vertices.has(key)){vertices.set(key,points.length/3);points.push(...p);}
    return vertices.get(key)!;
  };
  const clip=(faces:number[],plane:number,above:boolean)=>{
    const result:number[]=[],boundary=new Set<number>(),slopes=new Map<number,number[]>();
    for(let f=0;f<faces.length;f+=3){
      const polygon:number[]=[];
      for(let n=0;n<3;n++){
        const a=faces[f+n],b=faces[f+(n+1)%3],ay=sourcePoints[a*3+1],by=sourcePoints[b*3+1];
        const insideA=above?ay>=plane:ay<=plane,insideB=above?by>=plane:by<=plane;
        if(insideA)polygon.push(vertex(`v${a}`,sourcePoints.slice(a*3,a*3+3)));
        if(insideA!==insideB){
          const t=(plane-ay)/(by-ay),id=vertex(`e${Math.min(a,b)}:${Math.max(a,b)}:${plane}`,[sourcePoints[a*3]+t*(sourcePoints[b*3]-sourcePoints[a*3]),plane,sourcePoints[a*3+2]+t*(sourcePoints[b*3+2]-sourcePoints[a*3+2])]);
          polygon.push(id);boundary.add(id);
          slopes.set(id,[0,1,2].map(axis=>(sourcePoints[b*3+axis]-sourcePoints[a*3+axis])/(by-ay)));
        }
      }
      const distinct=polygon.filter((id,n)=>id!==polygon[(n+polygon.length-1)%polygon.length]);
      for(let n=1;n+1<distinct.length;n++)if(new Set([distinct[0],distinct[n],distinct[n+1]]).size===3)result.push(distinct[0],distinct[n],distinct[n+1]);
    }
    // Follow actual boundary edges; angular sorting skips the source's concavities.
    const edgeUses=new Map<string,number[][]>();
    for(let f=0;f<result.length;f+=3)for(let n=0;n<3;n++){
      const a=result[f+n],b=result[f+(n+1)%3];if(!boundary.has(a)||!boundary.has(b))continue;
      const key=[a,b].sort((x,y)=>x-y).join(',');if(!edgeUses.has(key))edgeUses.set(key,[]);edgeUses.get(key)!.push([a,b]);
    }
    const adjacent=new Map<number,number[]>();
    for(const uses of edgeUses.values())if(uses.length===1)for(const [a,b] of [uses[0],[uses[0][1],uses[0][0]]]){
      if(!adjacent.has(a))adjacent.set(a,[]);adjacent.get(a)!.push(b);
    }
    if([...adjacent.values()].some(neighbors=>neighbors.length!==2))return {indices:result,loop:[],angles:[],center:[0,plane,0]};
    const loop:number[]=[],visited=new Set<number>();let current=adjacent.keys().next().value as number,previous=-1;
    while(current!==undefined&&!visited.has(current)){
      loop.push(current);visited.add(current);const next=adjacent.get(current)!.find(v=>v!==previous)!;previous=current;current=next;
    }
    if(visited.size!==adjacent.size)return {indices:result,loop:[],angles:[],center:[0,plane,0]};
    const area=loop.reduce((sum,a,n)=>{const b=loop[(n+1)%loop.length];return sum+points[a*3]*points[b*3+2]-points[b*3]*points[a*3+2];},0);
    if(area<0)loop.reverse();
    const center=loop.reduce((sum,i)=>sum.map((v,n)=>v+points[i*3+n]),[0,0,0]).map(v=>v/loop.length);
    const angle=(i:number)=>(Math.atan2(points[i*3+2]-center[2],points[i*3]-center[0])+Math.PI*2)%(Math.PI*2);
    const first=loop.reduce((best,id,n)=>angle(id)<angle(loop[best])?n:best,0);
    loop.push(...loop.splice(0,first));
    const lengths=loop.map((a,n)=>{const b=loop[(n+1)%loop.length];return Math.hypot(points[a*3]-points[b*3],points[a*3+2]-points[b*3+2]);}),total=lengths.reduce((a,b)=>a+b,0);
    let cumulative=0;const angles=lengths.map(length=>{const theta=cumulative/total*Math.PI*2;cumulative+=length;return theta;});
    const centerSlope=loop.reduce((sum,i)=>sum.map((v,n)=>v+slopes.get(i)![n]),[0,0,0]).map(v=>v/loop.length);centerSlope[1]=1;
    const drift=Math.hypot(centerSlope[0],centerSlope[2]);if(drift>.4){centerSlope[0]*=.4/drift;centerSlope[2]*=.4/drift;}
    let numerator=0,denominator=0;
    for(const id of loop)for(const axis of [0,2]){const offset=points[id*3+axis]-center[axis];numerator+=offset*(slopes.get(id)![axis]-centerSlope[axis]);denominator+=offset*offset;}
    return {indices:result,loop,angles,center,centerSlope,radialSlope:Math.max(-40,Math.min(40,numerator/denominator))};
  };
  const upper=clip(sourceIndices.slice(0,firstTailFace*3),endY,true);
  const lower=clip(sourceIndices.slice(firstTailFace*3),startY,false);
  if(upper.loop.length<3||lower.loop.length<3)return null;
  const radius=(section:typeof upper,axis:number)=>Math.max(...section.loop.map(i=>Math.abs(points[i*3+axis]-section.center[axis])));
  const sample=(section:typeof upper,angle:number)=>{
    for(let i=0;i<section.loop.length;i++){
      const a=section.loop[i],b=section.loop[(i+1)%section.loop.length];
      const from=section.angles[i],to=i+1<section.loop.length?section.angles[i+1]:Math.PI*2;
      if(angle>=from&&angle<=to){const t=(angle-from)/(to-from);return [0,2].map(axis=>points[a*3+axis]*(1-t)+points[b*3+axis]*t-section.center[axis]);}
    }
    return [0,0];
  };
  if(!upper.centerSlope||!lower.centerSlope)return null;
  const rings=[lower.loop],angles=[lower.angles],span=endY-startY;
  const hermite=(lo:number,hi:number,loSlope:number,hiSlope:number,t:number)=>lo*(2*t**3-3*t**2+1)+loSlope*span*(t**3-2*t**2+t)+hi*(-2*t**3+3*t**2)+hiSlope*span*(t**3-t**2);
  const count=64,sections=32;
  for(let r=1;r<sections;r++){
    const t=r/sections,regular=.85*Math.sin(Math.PI*t)**2;
    const center=lower.center.map((v,n)=>hermite(v,upper.center[n],lower.centerSlope![n],upper.centerSlope![n],t));
    const sectionRadius=(axis:number)=>hermite(radius(lower,axis),radius(upper,axis),radius(lower,axis)*lower.radialSlope!,radius(upper,axis)*upper.radialSlope!,t);
    const rx=sectionRadius(0),rz=sectionRadius(2);
    const loop:number[]=[],theta:number[]=[];
    for(let n=0;n<count;n++){
      const a=n/count*Math.PI*2,lo=sample(lower,a),hi=sample(upper,a);
      const offset=lo.map((v,k)=>{const original=hermite(v,hi[k],v*lower.radialSlope!,hi[k]*upper.radialSlope!,t),ellipse=(k===0?Math.cos(a)*rx:Math.sin(a)*rz);return original+(ellipse-original)*regular;});
      loop.push(vertex(`ring${r}:${n}`,[center[0]+offset[0],center[1],center[2]+offset[1]]));theta.push(a);
    }
    rings.push(loop);angles.push(theta);
  }
  rings.push(upper.loop);angles.push(upper.angles);
  const bridge:number[]=[];
  for(let r=0;r+1<rings.length;r++){
    const lo=rings[r],hi=rings[r+1],la=angles[r],ha=angles[r+1];let a=0,b=0;
    while(a<lo.length||b<hi.length){
      const nextA=a<lo.length?(a+1<lo.length?la[a+1]:la[0]+Math.PI*2):Infinity;
      const nextB=b<hi.length?(b+1<hi.length?ha[b+1]:ha[0]+Math.PI*2):Infinity;
      if(nextA<nextB){bridge.push(lo[a%lo.length],hi[b%hi.length],lo[(a+1)%lo.length]);a++;}
      else {bridge.push(lo[a%lo.length],hi[b%hi.length],hi[(b+1)%hi.length]);b++;}
    }
  }
  // A shared indexed boundary lets normal computation smooth the joining edges.
  const indices=[...upper.indices,...bridge,...lower.indices];
  const neighbors=Array.from({length:points.length/3},()=>new Set<number>());
  for(let f=0;f<indices.length;f+=3)for(let n=0;n<3;n++){const a=indices[f+n],b=indices[f+(n+1)%3];neighbors[a].add(b);neighbors[b].add(a);}
  const weights=neighbors.map((_,i)=>{const y=points[i*3+1],distance=Math.min(Math.abs(y-startY)/.008,Math.abs(y-endY)/.010),t=Math.max(0,1-distance);return t*t*(3-2*t);});
  // Smooth across both source/new boundaries together, preserving indexed joins.
  // The surrounding cuff lets the tangent change gradually instead of at one ring.
  for(let step=0;step<100;step++){
    const next=points.slice();
    for(let i=0;i<neighbors.length;i++){
      if(!weights[i]||!neighbors[i].size)continue;
      const delta=[0,0,0];for(const j of neighbors[i])for(let axis=0;axis<3;axis++)delta[axis]+=points[j*3+axis];
      for(let axis=0;axis<3;axis++)delta[axis]=(delta[axis]/neighbors[i].size-points[i*3+axis])*.42*weights[i];
      const scale=Math.min(1,.0002/Math.hypot(...delta));for(let axis=0;axis<3;axis++)next[i*3+axis]+=delta[axis]*scale;
    }
    for(let i=0;i<points.length;i++)points[i]=next[i];
  }
  const profiles=rings.map(loop=>{
    const center=loop.reduce((sum,id)=>sum.map((v,n)=>v+points[id*3+n]),[0,0,0]).map(v=>v/loop.length);
    const area=[0,0,0];
    for(let n=0;n<loop.length;n++){
      const a=loop[n],b=loop[(n+1)%loop.length],u=[0,1,2].map(k=>points[a*3+k]-center[k]),v=[0,1,2].map(k=>points[b*3+k]-center[k]);
      area[0]+=u[1]*v[2]-u[2]*v[1];area[1]+=u[2]*v[0]-u[0]*v[2];area[2]+=u[0]*v[1]-u[1]*v[0];
    }
    return {center,radius:Math.sqrt(Math.hypot(...area)/2/Math.PI)};
  });
  // The fairing/ellipse fit must not leave a swelling between narrower ends.
  // Keep both shared source boundaries, normalize only the intermediate rings.
  for(let r=1;r<rings.length-1;r++){
    const t=r/(rings.length-1),w=t*t*(3-2*t),target=profiles[0].radius*(1-w)+profiles.at(-1)!.radius*w;
    const profile=profiles[r],scale=target/profile.radius;
    for(const id of rings[r])for(let axis=0;axis<3;axis++)points[id*3+axis]=profile.center[axis]+(points[id*3+axis]-profile.center[axis])*scale;
  }
  const tendonBlend=Float32Array.from(Array.from({length:points.length/3},(_,i)=>{const t=Math.max(0,Math.min(1,(endY-points[i*3+1])/span));return t*t*(3-2*t);}));
  return {points,indices,firstTailFace:(upper.indices.length+bridge.length)/3,tendonBlend,
    roundedJunction:{startY:startY-.008,endY:endY+.010,cutStartY:startY,cutEndY:endY,sectionCount:sections,sectionLoops:rings,seamLoops:[lower.loop,upper.loop],sharedSurface:true}};
}
