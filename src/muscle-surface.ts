import * as T from 'three';
import type {MusclePart} from './muscle-picking';

function abdominalKind(part:MusclePart) {
  return (part.name||'').toLowerCase().replace(/^(right|left) /,'').match(/^(rectus abdominis|external oblique|internal oblique|transversus abdominis)$/)?.[0];
}

function surfaceFrame(positions:Float32Array,vertices:Set<number>,center:number[]) {
  // Principal axes follow an oblique muscle rather than whichever world axis
  // happens to have the longest bounding box. Jacobi rotation on a 3x3 covariance.
  const matrix=Array.from({length:3},()=>[0,0,0]),vectors=[[1,0,0],[0,1,0],[0,0,1]];
  for(const i of vertices){const v=[0,1,2].map(a=>positions[i*3+a]-center[a]);for(let a=0;a<3;a++)for(let b=0;b<3;b++)matrix[a][b]+=v[a]*v[b];}
  for(let iter=0;iter<12;iter++){
    let p=0,q=1;for(const [a,b] of [[0,2],[1,2]])if(Math.abs(matrix[a][b])>Math.abs(matrix[p][q])){p=a;q=b;}
    if(Math.abs(matrix[p][q])<1e-12)break;
    const angle=.5*Math.atan2(2*matrix[p][q],matrix[q][q]-matrix[p][p]),c=Math.cos(angle),s=Math.sin(angle);
    const app=matrix[p][p],aqq=matrix[q][q],apq=matrix[p][q];
    matrix[p][p]=c*c*app-2*s*c*apq+s*s*aqq;matrix[q][q]=s*s*app+2*s*c*apq+c*c*aqq;matrix[p][q]=matrix[q][p]=0;
    for(let a=0;a<3;a++){if(a!==p&&a!==q){const ap=matrix[a][p],aq=matrix[a][q];matrix[a][p]=matrix[p][a]=c*ap-s*aq;matrix[a][q]=matrix[q][a]=s*ap+c*aq;}const vp=vectors[a][p],vq=vectors[a][q];vectors[a][p]=c*vp-s*vq;vectors[a][q]=s*vp+c*vq;}
  }
  const order=[0,1,2].sort((a,b)=>matrix[b][b]-matrix[a][a]);
  const axes=order.map(i=>new T.Vector3(vectors[0][i],vectors[1][i],vectors[2][i]).normalize());
  for(const axis of axes){const values=axis.toArray(),dominant=values.map(Math.abs).indexOf(Math.max(...values.map(Math.abs)));if(values[dominant]<0)axis.negate();}
  const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
  for(const i of vertices){const p=new T.Vector3().fromArray(positions,i*3).sub(new T.Vector3(...center));axes.forEach((axis,a)=>{const v=p.dot(axis);low[a]=Math.min(low[a],v);high[a]=Math.max(high[a],v);});}
  return {axes,mid:low.map((v,a)=>(v+high[a])/2),spans:low.map((v,a)=>high[a]-v)};
}

/** Cosmetic fiber direction only, not a reconstruction of individual fascicles. */
export function muscleSurfaceCoordinates(positions:Float32Array,indices:Uint32Array,parts:MusclePart[]) {
  // Store the transverse direction rather than an angle. Interpolated angles had a
  // discontinuity at +/- pi that could leave a stripe across an otherwise smooth mesh.
  const result=new Float32Array(positions.length/3*4);
  for(const part of parts){
    const vertices=new Set<number>(),box=new T.Box3();
    for(let i=part.firstFace*3;i<(part.firstFace+part.faceCount)*3;i++)vertices.add(indices[i]);
    for(const i of vertices)box.expandByPoint(new T.Vector3().fromArray(positions,i*3));
    const center=box.getCenter(new T.Vector3()).toArray();
    const frame=surfaceFrame(positions,vertices,center);
    const radius=Math.max(Math.hypot(frame.spans[1],frame.spans[2])*.5,1e-5);
    const cycles=Math.max(12,Math.min(64,Math.round(2*Math.PI*radius/.0028)));
    const abdomen=abdominalKind(part),side=part.side==='left'?1:-1;
    for(const i of vertices){
      if(abdomen){
        // Unwrap the abdominal wall around the body's vertical axis. A cylindrical
        // wrap around the *muscle* axis pinched the grain at the centre of thin sheets.
        const lateral=side*Math.atan2(positions[i*3],positions[i*3+2])*.12;
        const vertical=positions[i*3+1]-center[1];
        let across=lateral,along=vertical;
        if(abdomen==='external oblique'){across=(lateral-vertical)*Math.SQRT1_2;along=(lateral+vertical)*Math.SQRT1_2;}
        if(abdomen==='internal oblique'){across=(lateral+vertical)*Math.SQRT1_2;along=(vertical-lateral)*Math.SQRT1_2;}
        if(abdomen==='transversus abdominis'){across=vertical;along=lateral;}
        result.set([across,along,0,-1],i*4);
        continue;
      }
      const relative=new T.Vector3().fromArray(positions,i*3).sub(new T.Vector3(...center));
      const along=relative.dot(frame.axes[0])-frame.mid[0],across=relative.dot(frame.axes[1])-frame.mid[1],depth=relative.dot(frame.axes[2])-frame.mid[2];
      const sheet=frame.spans[2]<frame.spans[1]*.22;
      result.set(sheet?[across,along,0,-2]:[across/radius,depth/radius,along,cycles],i*4);
    }
  }
  return result;
}

/** Filter small shading wrinkles only. Positions, tendon intersections and picking stay intact. */
export function softenAbdominalNormals(geometry:T.BufferGeometry,parts:MusclePart[]) {
  const abdominal=parts.filter(abdominalKind);
  if(!abdominal.length)return;
  const positions=geometry.getAttribute('position'),source=geometry.getAttribute('normal'),indices=geometry.index?.array;
  if(!source||!indices)return;
  const filtered=source.clone();
  for(const part of abdominal){
    const neighbors=new Map<number,Set<number>>();
    for(let f=part.firstFace*3;f<(part.firstFace+part.faceCount)*3;f+=3){
      const face=[indices[f],indices[f+1],indices[f+2]];
      for(const v of face){if(!neighbors.has(v))neighbors.set(v,new Set());for(const n of face)if(n!==v)neighbors.get(v)!.add(n);}
    }
    let normals=new Map([...neighbors.keys()].map(i=>[i,new T.Vector3().fromBufferAttribute(source,i)]));
    // Short neighborhood diffusion reduces the source mesh's tiny jagged highlights,
    // without bridging disconnected surfaces or averaging across a sharp fold.
    for(let pass=0;pass<6;pass++){
      const next=new Map<number,T.Vector3>();
      for(const [i,adjacent] of neighbors){
        const original=normals.get(i)!,sum=original.clone(),point=new T.Vector3().fromBufferAttribute(positions,i);
        let weight=1;
        for(const j of adjacent){
          const normal=normals.get(j)!;
          if(original.dot(normal)<.65)continue;
          const distance=point.distanceToSquared(new T.Vector3().fromBufferAttribute(positions,j));
          if(distance>.008**2)continue;
          const w=Math.exp(-distance/(.003**2));sum.addScaledVector(normal,w);weight+=w;
        }
        next.set(i,sum.multiplyScalar(1/weight).normalize());
      }
      normals=next;
    }
    for(const [i,n] of normals)filtered.setXYZ(i,n.x,n.y,n.z);
  }
  geometry.setAttribute('normal',filtered);
}

export function muscleMaterial(parameters:T.MeshStandardMaterialParameters,detail=true) {
  const material=new T.MeshStandardMaterial({...parameters,roughness:.76,metalness:0});
  if(!detail)return material;
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>',
      '#include <common>\nattribute vec4 muscleSurface; varying vec4 vMuscleSurface;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvMuscleSurface = muscleSurface;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
      `#include <common>
      varying vec4 vMuscleSurface;
      // Surface-gradient bump mapping. Limit the normal change to keep shallow
      // fibers from becoming deep grooves on small or grazing-angle surfaces.
      vec3 muscleGrainNormal(vec3 baseNormal, float height) {
        vec3 dx = dFdx(-vViewPosition), dy = dFdy(-vViewPosition);
        vec3 rx = cross(dy, baseNormal), ry = cross(baseNormal, dx);
        float determinant = dot(dx, rx);
        float divisor = determinant < 0.0 ? -max(abs(determinant), 1e-12) : max(abs(determinant), 1e-12);
        vec3 gradient = (dFdx(height) * rx + dFdy(height) * ry) / divisor;
        gradient *= min(1.0, 0.10 / max(length(gradient), 1e-6));
        return normalize(baseNormal - gradient);
      }`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 radial = vMuscleSurface.xy;
      float radialLength = dot(radial, radial);
      float angle = atan(radial.y, radial.x + 1e-8);
      float along = vMuscleSurface.z;
      float cycles = floor(vMuscleSurface.w + 0.5);
      float bend = sin(angle * 3.0 + along * 19.0) * 0.65
                 + sin(angle * 7.0 - along * 31.0) * 0.18;
      float phase = angle * cycles + bend;
      float finePhase = angle * (cycles * 3.0 + 1.0) + bend * 1.8 + sin(along * 41.0) * 0.25;
      // Periodic angular phases plus seam-free derivatives, so both sides of
      // the cylindrical wrap meet. Fade fibers before they become subpixel.
      vec2 radialDx = dFdx(radial), radialDy = dFdy(radial);
      float angularWidth = (abs(radial.x * radialDx.y - radial.y * radialDx.x)
                          + abs(radial.x * radialDy.y - radial.y * radialDy.x)) / max(radialLength, 1e-5);
      float visibility = (1.0 - smoothstep(0.55, 1.6, angularWidth * cycles)) * smoothstep(0.001, 0.025, radialLength);
      float fineVisibility = 1.0 - smoothstep(0.45, 1.4, angularWidth * (cycles * 3.0 + 1.0));
      float widthVariation = 0.80 + 0.20 * sin(angle * 5.0 + along * 13.0);
      float reliefScale = 1.0;
      if (vMuscleSurface.w < 0.0) {
        float across = vMuscleSurface.x;
        along = vMuscleSurface.y;
        bend = sin(across * 23.0 + along * 17.0) * 0.35 + sin(along * 37.0) * 0.12;
        phase = across * 3490.66 + bend;
        finePhase = across * 10471.98 + bend * 1.8;
        float width = fwidth(across);
        visibility = 1.0 - smoothstep(0.55, 1.6, width * 3490.66);
        fineVisibility = 1.0 - smoothstep(0.45, 1.4, width * 10471.98);
        widthVariation = 0.80 + 0.20 * sin(across * 51.0 + along * 13.0);
        reliefScale = 0.60;
      }
      float bundle = (sin(phase) * 0.65 + sin(phase * 2.0 + 0.35) * 0.18) * widthVariation;
      float fineFiber = sin(finePhase) * fineVisibility;
      // Ivory tendon vertices receive less cosmetic grain than muscle bellies.
      float strength = 1.0;
      #ifdef USE_COLOR
        float tissueSaturation = max(max(vColor.r, vColor.g), vColor.b) - min(min(vColor.r, vColor.g), vColor.b);
        strength = mix(0.15, 1.0, clamp(tissueSaturation * 4.0, 0.0, 1.0));
      #endif
      float fiberAmount = visibility * strength;
      float grain = (bundle * 0.035 + fineFiber * 0.009) * fiberAmount;
      float muscleHeight = (bundle + fineFiber * 0.18) * 0.000015 * fiberAmount * reliefScale;
      diffuseColor.rgb *= 1.0 + grain;
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',
      '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + bundle * fiberAmount * 0.025, 0.70, 0.82);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',
      '#include <normal_fragment_maps>\nnormal = muscleGrainNormal(normal, muscleHeight);');
  };
  material.customProgramCacheKey=()=> 'rehab-muscle-grain-v5';
  return material;
}
