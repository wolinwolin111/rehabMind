import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {transform} from 'esbuild';
import * as T from 'three';

export const meta=JSON.parse(readFileSync(new URL('../../public/3d/skin.json',import.meta.url)));
export const report=JSON.parse(readFileSync(new URL('../../build/authoring/surface-atlas-build.json',import.meta.url)));
export const raw=gunzipSync(readFileSync(new URL('../../public/3d/skin.pack',import.meta.url)));
export const atlasRaw=readFileSync(new URL('../../public/3d/surface_atlas.bin',import.meta.url));
export const asBuffer=value=>value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength);
const {code}=await transform(readFileSync(new URL('../../src/localization.ts',import.meta.url),'utf8'),{loader:'ts',format:'esm'});
export const {localizeFace,decodeSurfaceAtlas,chooseGestureRegion}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
export const surface=decodeSurfaceAtlas(meta,asBuffer(atlasRaw),asBuffer(raw));
export const positions=surface.positions,indices=surface.indices;
const geo=new T.BufferGeometry();
geo.setAttribute('position',new T.BufferAttribute(positions,3));
geo.setIndex(new T.BufferAttribute(indices,1));
export const mesh=new T.Mesh(geo,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.updateMatrixWorld();

export function sectionBounds(side,y){
 const rows=(y>=.5?report.thigh_charts:y>=.445?report.knee_charts:report.charts)[side];
 const lo=[...rows].reverse().find(r=>r.y<=y),hi=rows.find(r=>r.y>=y);
 if(!lo||!hi)throw new Error(`Outside authored chart: ${side}/${y}`);
 const t=hi.y===lo.y?0:(y-lo.y)/(hi.y-lo.y);
 return lo.bounds.map((v,i)=>v+t*(hi.bounds[i]-v));
}

// Approach angles are test inputs, not the implementation's label classifier.
export function rayAt(side,y,degrees,elevation=0){
 const b=sectionBounds(side,y),sign=side==='left'?1:-1;
 const center=new T.Vector3(sign*(b[0]+b[1])/2,y,(b[2]+b[3])/2);
 const angle=degrees*Math.PI/180,tilt=elevation*Math.PI/180;
 const outward=new T.Vector3(sign*Math.sin(angle)*Math.cos(tilt),Math.sin(tilt),Math.cos(angle)*Math.cos(tilt));
 const distance=Math.sin(angle)<-.01?(Math.abs(center.x)-.005)/(-Math.sin(angle)*Math.cos(tilt)):.8;
 const ray=new T.Raycaster(center.clone().addScaledVector(outward,distance),outward.clone().negate());
 const hit=ray.intersectObject(mesh)[0];
 return hit?{...hit,selected:localizeFace(meta,surface,hit.faceIndex,hit.point)}:null;
}
