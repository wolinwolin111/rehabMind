import {Color} from 'three';

/** Linear vertex colors: selected muscle green gradually becomes tendon ivory. */
export function rectusTissueColors(blend:Float32Array,muscleColor:string){
  const muscle=new Color(muscleColor),tendon=new Color('#ede5cf'),colors=new Float32Array(blend.length*3);
  for(let i=0;i<blend.length;i++)muscle.clone().lerp(tendon,blend[i]).toArray(colors,i*3);
  return colors;
}
