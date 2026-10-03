import * as T from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import type {MusclePart} from './muscle-picking';

const key=(name:string)=>name.replace(/^(Right|Left) /i,'').toLowerCase();
const sheets=new Set(['external oblique','internal oblique','transversus abdominis']);
export const isAbdominalMuscle=(name:string)=>sheets.has(key(name))||key(name)==='rectus abdominis';
const erector=(name:string)=>/^(iliocostalis|longissimus|spinalis)( |$)/.test(key(name));
const deepBack=(name:string)=>/multifidus|rotator|interspinal|intertransvers|semispinalis/.test(key(name));
const backSheet=(name:string)=>['latissimus dorsi','serratus posterior inferior','serratus posterior superior'].includes(key(name));
const backCover=(outer:string,inner:string)=>
  (backSheet(outer)&&(erector(inner)||deepBack(inner)))||
  (key(outer)==='latissimus dorsi'&&/^serratus posterior (inferior|superior)$/.test(key(inner)))||
  (erector(outer)&&deepBack(inner));
type Outline={ys:number[];lo:number[];hi:number[]};
type Surface={part:MusclePart;tree:MeshBVH;box:T.Box3;outline?:Outline};
export type VertexBlend={a:number;b:number;t:number};
type Display={positions:Float32Array;indices:Uint32Array;parts:MusclePart[];blends:VertexBlend[]};
const cache=new WeakMap<Float32Array,{source:Uint32Array;surfaces:Surface[];views:Map<string,Display>}>();

/** Smooth the projected dissection boundary, not the original muscle. */
function rectusOutline(positions:Float32Array,source:Uint32Array,part:MusclePart,box:T.Box3):Outline {
  const ys=Array.from({length:129},(_,i)=>T.MathUtils.lerp(box.min.y,box.max.y,i/128));
  const lo=ys.map(()=>Infinity),hi=ys.map(()=>-Infinity);
  for(let f=part.firstFace;f<part.firstFace+part.faceCount;f++)for(let e=0;e<3;e++){
    const a=source[f*3+e]*3,b=source[f*3+(e+1)%3]*3,ay=positions[a+1],by=positions[b+1];
    if(Math.abs(by-ay)<1e-9)continue;
    const start=Math.max(0,Math.ceil((Math.min(ay,by)-box.min.y)/(box.max.y-box.min.y)*128));
    const end=Math.min(128,Math.floor((Math.max(ay,by)-box.min.y)/(box.max.y-box.min.y)*128));
    for(let i=start;i<=end;i++){const t=(ys[i]-ay)/(by-ay),x=T.MathUtils.lerp(positions[a],positions[b],t);lo[i]=Math.min(lo[i],x);hi[i]=Math.max(hi[i],x);}
  }
  for(const values of [lo,hi]){
    for(let i=0;i<values.length;i++)if(!Number.isFinite(values[i]))values[i]=values.find(Number.isFinite)??box.min.x;
    for(let pass=0;pass<5;pass++){const copy=values.slice();for(let i=1;i<values.length-1;i++)values[i]=(copy[i-1]+copy[i]*2+copy[i+1])/4;}
  }
  return {ys,lo,hi};
}

/** Teaching exposure, not anatomical relocation or muscle/tendon reconstruction. */
export function abdominalDisplayGeometry(positions:Float32Array,source:Uint32Array,parts:MusclePart[],visible:MusclePart[]):Display {
  let entry=cache.get(positions);
  if(!entry||entry.source!==source){
    const surfaces:Surface[]=[];
    for(const part of parts.filter(p=>isAbdominalMuscle(p.name)||erector(p.name)||deepBack(p.name)||backSheet(p.name))){
      const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));
      g.setIndex(new T.BufferAttribute(source.slice(part.firstFace*3,(part.firstFace+part.faceCount)*3),1));
      const box=new T.Box3();for(const i of g.index!.array)box.expandByPoint(new T.Vector3().fromArray(positions,i*3));
      surfaces.push({part,tree:new MeshBVH(g),box,outline:key(part.name)==='rectus abdominis'?rectusOutline(positions,source,part,box):undefined});
    }
    entry={source,surfaces,views:new Map()};cache.set(positions,entry);
  }
  const active=new Set(visible.map(p=>p.id)),signature=visible.map(p=>p.id).join(',');
  if(entry.views.has(signature))return entry.views.get(signature)!;
  const extra:number[]=[],blends:VertexBlend[]=[],output:number[]=[],ranges:MusclePart[]=[];
  const originalCount=positions.length/3,edgeVertices=new Map<string,number>();
  const point=(i:number)=>i<originalCount?new T.Vector3().fromArray(positions,i*3):new T.Vector3().fromArray(extra,(i-originalCount)*3);
  const ray=new T.Ray(new T.Vector3(),new T.Vector3(0,0,-1));
  const front=(surface:Surface,x:number,y:number)=>{
    if(x<surface.box.min.x||x>surface.box.max.x||y<surface.box.min.y||y>surface.box.max.y)return undefined;
    ray.origin.set(x,y,.5);return surface.tree.raycastFirst(ray,T.DoubleSide)?.point.z;
  };
  const behind=(surface:Surface,p:T.Vector3)=>{
    if(p.x<surface.box.min.x||p.x>surface.box.max.x||p.y<surface.box.min.y||p.y>surface.box.max.y)return .001;
    ray.direction.set(0,0,1);ray.origin.set(p.x,p.y,-.5);
    const z=surface.tree.raycastFirst(ray,T.DoubleSide)?.point.z;ray.direction.set(0,0,-1);
    if(z===undefined||p.z-z<-.015)return .001;
    return p.z-z+.0002;
  };
  const radialRay=new T.Ray();
  const withinOuterSheet=(surface:Surface,p:T.Vector3)=>{
    if(p.y<surface.box.min.y||p.y>surface.box.max.y)return .001;
    // Follow the curved abdominal wall at the flank as well as its front.
    const radius=Math.hypot(p.x,p.z);if(radius<.001)return .001;
    radialRay.direction.set(-p.x/radius,0,-p.z/radius);
    radialRay.origin.copy(radialRay.direction).multiplyScalar(-.5);radialRay.origin.y=p.y;
    const hit=surface.tree.raycastFirst(radialRay,T.DoubleSide);
    if(!hit)return .001;
    const depth=.5-hit.distance-radius;
    if(depth<-.015)return .001;
    // A small inset in the cut boundary prevents near-coplanar fragments from
    // reappearing as the camera rotates; no source vertex is moved.
    return depth-.0004;
  };
  const bounds=(surface:Surface,y:number)=>{
    const o=surface.outline!,u=T.MathUtils.clamp((y-o.ys[0])/(o.ys[128]-o.ys[0])*128,0,128),i=Math.min(127,Math.floor(u)),t=u-i;
    return [T.MathUtils.lerp(o.lo[i],o.lo[i+1],t)-.0008,T.MathUtils.lerp(o.hi[i],o.hi[i+1],t)+.0008];
  };
  function crossing(a:number,b:number,distance:(p:T.Vector3)=>number,label:string){
    const edge=`${Math.min(a,b)}:${Math.max(a,b)}:${label}`;
    if(edgeVertices.has(edge))return edgeVertices.get(edge)!;
    const pa=point(a),pb=point(b),da=distance(pa);let lo=0,hi=1;
    for(let n=0;n<18;n++){const mid=(lo+hi)/2;if((distance(pa.clone().lerp(pb,mid))>=0)===(da>=0))lo=mid;else hi=mid;}
    const t=(lo+hi)/2,p=pa.lerp(pb,t),id=originalCount+extra.length/3;
    extra.push(p.x,p.y,p.z);blends.push({a,b,t});edgeVertices.set(edge,id);return id;
  }
  function split(polygon:number[],distance:(p:T.Vector3)=>number,label:string){
    const inside:number[]=[],outside:number[]=[];
    for(let n=0;n<polygon.length;n++){
      const a=polygon[n],b=polygon[(n+1)%polygon.length],da=distance(point(a)),db=distance(point(b));
      (da>=0?inside:outside).push(a);
      if((da>=0)!==(db>=0)){const id=crossing(a,b,distance,label);inside.push(id);outside.push(id);}
    }
    return {inside,outside};
  }
  function emit(polygon:number[]){for(let n=1;n+1<polygon.length;n++){
    const a=point(polygon[0]),b=point(polygon[n]),c=point(polygon[n+1]);
    if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-20)output.push(polygon[0],polygon[n],polygon[n+1]);
  }}
  function clipCover(polygons:number[][],distance:(p:T.Vector3)=>number,label:string){
    return polygons.flatMap(polygon=>{
      const values=polygon.map(i=>distance(point(i))),centre=polygon.reduce((p,i)=>p.add(point(i)),new T.Vector3()).multiplyScalar(1/polygon.length);
      if(values.every(d=>d>=0)&&distance(centre)<0&&polygon.length===3){
        // Catch an interior protrusion even when the source triangle's corners are covered.
        const [a,b,c]=polygon,mid=originalCount+extra.length/3;
        extra.push(...point(a).lerp(point(b),.5).toArray());blends.push({a,b,t:.5});
        const id=originalCount+extra.length/3;extra.push(...point(mid).lerp(point(c),1/3).toArray());blends.push({a:mid,b:c,t:1/3});
        return [[a,b,id],[b,c,id],[c,a,id]].map(p=>split(p,distance,label).inside).filter(p=>p.length>=3);
      }
      return [split(polygon,distance,label).inside].filter(p=>p.length>=3);
    });
  }
  for(const part of visible){
    const start=output.length/3,inner=entry.surfaces.find(s=>s.part.id===part.id),kind=key(part.name);
    const rectus=inner&&sheets.has(kind)?entry.surfaces.find(s=>active.has(s.part.id)&&s.part.side===part.side&&key(s.part.name)==='rectus abdominis'&&s.outline):undefined;
    const outers=inner&&sheets.has(kind)?entry.surfaces.filter(s=>active.has(s.part.id)&&s.part.side===part.side&&
      (kind!=='external oblique'&&key(s.part.name)==='external oblique'||kind==='transversus abdominis'&&key(s.part.name)==='internal oblique')):[];
    const backCovers=inner?entry.surfaces.filter(s=>active.has(s.part.id)&&s.part.side===part.side&&backCover(s.part.name,part.name)):[];
    for(let f=part.firstFace;f<part.firstFace+part.faceCount;f++){
      const triangle=Array.from(source.subarray(f*3,f*3+3));
      if(backCovers.length){
        let polygons=[triangle];
        for(const cover of backCovers){
          polygons=clipCover(polygons,p=>behind(cover,p),`back:${cover.part.id}`);
        }
        for(const polygon of polygons)emit(polygon);
        continue;
      }
      if(!inner||!sheets.has(kind)){output.push(...triangle);continue;}
      let polygons=[triangle];
      for(const cover of outers)polygons=clipCover(polygons,p=>withinOuterSheet(cover,p),`abd:${cover.part.id}`);
      if(!rectus){for(const polygon of polygons)emit(polygon);continue;}
      for(let polygon of polygons){
      const centre=polygon.reduce((p,i)=>p.add(point(i)),new T.Vector3()).multiplyScalar(1/polygon.length);
      const y=T.MathUtils.clamp(centre.y,rectus.box.min.y+.00001,rectus.box.max.y-.00001),[lx,rx]=bounds(rectus,y);
      const z=front(rectus,T.MathUtils.clamp(centre.x,lx+.001,rx-.001),y);
      // Preserve the posterior sheath. The former 18 mm distance cap left the
      // inferior anterior sheath in place and split the highlighted rectus.
      if(z===undefined||centre.z<=z-.002){emit(polygon);continue;}
      const limits=[(p:T.Vector3)=>p.y-rectus.box.min.y,(p:T.Vector3)=>rectus.box.max.y-p.y,
        (p:T.Vector3)=>p.x-bounds(rectus,p.y)[0],(p:T.Vector3)=>bounds(rectus,p.y)[1]-p.x];
      for(let n=0;n<limits.length&&polygon.length>=3;n++){
        const halves=split(polygon,limits[n],`${part.id}:${n}`);emit(halves.outside);polygon=halves.inside;
      }
      }
    }
    if(output.length/3>start)ranges.push({...part,firstFace:start,faceCount:output.length/3-start});
  }
  const displayedPositions=extra.length?new Float32Array(positions.length+extra.length):positions;
  if(extra.length){displayedPositions.set(positions);displayedPositions.set(extra,positions.length);}
  const result={positions:displayedPositions,indices:Uint32Array.from(output),parts:ranges,blends};entry.views.set(signature,result);return result;
}

/** Interpolate cut-edge normals; leave unrelated muscle normals unchanged. */
export function abdominalDisplayNormals(source:T.BufferAttribute,blends:VertexBlend[]){
  const normals=new Float32Array((source.count+blends.length)*3);
  for(let i=0;i<source.count;i++)normals.set([source.getX(i),source.getY(i),source.getZ(i)],i*3);
  for(let i=0;i<blends.length;i++){const {a,b,t}=blends[i],n=new T.Vector3().fromArray(normals,a*3).lerp(new T.Vector3().fromArray(normals,b*3),t).normalize();normals.set(n.toArray(),(source.count+i)*3);}
  return normals;
}
