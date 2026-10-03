import type { MusclePart } from '../muscle-picking';
import { bodyMuscleAnatomy } from './body-muscle-anatomy';
import { isCommonMuscle } from './muscle-anatomy';
import {abdominalDisplayGeometry} from '../abdominal-display';

export const muscleKey = (name: string) => name.replace(/\b(left|right)\s+/gi, '').toLowerCase().trim();
/** Regional teaching dissection groups, not equal-thickness shells or muscle subdivisions. */
export const muscleLayerRegions = {
  hip: { label: '髋臀', layers: [
    ['gluteus maximus', 'tensor fasciae latae'],
    ['gluteus medius', 'piriformis', 'gemellus superior', 'gemellus inferior', 'quadratus femoris'],
    ['gluteus minimus', 'obturator internus', 'obturator externus'],
    ['iliacus', 'psoas major'],
  ] },
  thigh: { label: '大腿', layers: [
    ['rectus femoris', 'sartorius', 'gracilis', 'pectineus', 'adductor longus', 'long head of biceps femoris', 'semitendinosus'],
    ['vastus medialis', 'vastus lateralis', 'adductor brevis'],
    ['vastus intermedius', 'adductor magnus', 'adductor minimus', 'short head of biceps femoris', 'semimembranosus'],
  ] },
  calf: { label: '小腿', layers: [
    ['medial head of gastrocnemius', 'lateral head of gastrocnemius', 'plantaris', 'fibularis longus', 'tibialis anterior', 'extensor digitorum longus', 'fibularis tertius'],
    ['soleus', 'fibularis brevis', 'extensor hallucis longus'],
    ['tibialis posterior', 'flexor digitorum longus', 'flexor hallucis longus', 'popliteus'],
  ] },
  foot: { label: '足部', layers: [
    ['abductor hallucis', 'flexor digitorum brevis', 'abductor digiti minimi of foot', 'extensor hallucis brevis', 'extensor digitorum brevis'],
    ['flexor accessorius', ...['first', 'second', 'third', 'fourth'].map(n => `${n} lumbrical of foot`)],
    ['medial head of flexor hallucis brevis', 'lateral head of flexor hallucis brevis', 'oblique head of adductor hallucis', 'transverse head of adductor hallucis', 'flexor digiti minimi brevis of foot', 'opponens digiti minimi of foot'],
    [...['first', 'second', 'third'].map(n => `${n} plantar interosseous of foot`), ...['first','second','third','fourth'].map(n => `${n} dorsal interosseous of foot`)],
  ] },
} as const;
export type MuscleLayerRegion = keyof typeof muscleLayerRegions | 'all';
export function musclePeelSteps(region: MuscleLayerRegion) {
  // Include removal of the deepest layer, so peeling can reach the skeleton.
  return region === 'all' ? Math.max(4,...Object.values(muscleLayerRegions).map(group=>group.layers.length)) : muscleLayerRegions[region].layers.length;
}

/** Group source-table supplements with the anatomy they extend, not their editorial section. */
export function bodyDisplayGroup(name:string) {
  const k=muscleKey(name),info=bodyMuscleAnatomy[k];
  if(/^(rectus abdominis|external oblique|internal oblique|transversus abdominis)$/.test(k))return '腹壁';
  if(/latissimus|multifidus|trapezius|rhomboid|serratus posterior|erector|spinalis|longissimus|iliocostalis|rotator|semispinalis|interspinal|intertransvers/.test(k))return '背部';
  if(/subscapularis|levator scapulae/.test(k))return '肩与上臂';
  return info?.group;
}

const chestDisplayDepth:Record<string,number>={'external intercostal muscle':1,'internal intercostal muscle':2,'innermost intercostal muscle':3};
/** Whole-model peeling includes the pectoral cover before the intercostal layers. */
export function bodyDisplayDepth(name:string) {
  const k=muscleKey(name);
  // Remove posterior covering sheets before the erectors, then reveal the
  // segmental muscles. An editorial supplement group must not keep a cover forever.
  // Keep superior serratus after the overlying rhomboids have peeled away.
  if(k==='serratus posterior superior')return 2;
  if(k==='serratus posterior inferior')return 1;
  // Levatores lie beneath the erectors; removing both in the same step left
  // only narrow slivers available for selection.
  if(/^set of levatores costarum (breves|longi)$/.test(k))return 3;
  if(/^(iliocostalis|longissimus|spinalis)( |$)/.test(k))return 2;
  if(/^multifidus( |$)/.test(k))return 3;
  if(k==='quadratus lumborum')return 3;
  return chestDisplayDepth[k]??bodyMuscleAnatomy[k]?.depth;
}

export function bodyDisplayDepths(parts:MusclePart[]) {
  const groupMax=new Map<string,number>();
  for(const p of parts){const depth=bodyDisplayDepth(p.name),group=bodyDisplayGroup(p.name);if(depth!==undefined&&group)groupMax.set(group,Math.max(groupMax.get(group)??0,depth));}
  return {groupMax};
}

export function visibleMuscleParts(parts: MusclePart[], region: MuscleLayerRegion, removed: number) {
  const groups = region==='all'?Object.values(muscleLayerRegions):[muscleLayerRegions[region]];
  const hidden = new Set<string>();
  for (const group of groups) {
    const count = Math.max(0, Math.min(Math.trunc(removed) || 0, group.layers.length));
    group.layers.slice(0, count).flat().forEach(name => hidden.add(name));
  }
  const step=Math.max(0,Math.min(musclePeelSteps('all'),Math.trunc(removed)||0));
  return parts.filter(part=>isCommonMuscle(part.name)&&!hidden.has(muscleKey(part.name))&&
    !(region==='all'&&((bodyDisplayDepth(part.name)??3)<step)));
}

/** Repack only triangle indices; preserve source IDs for the new raycast face numbering. */
export function peelMuscleIndices(source: Uint32Array, parts: MusclePart[], region: MuscleLayerRegion, removed: number, positions?:Float32Array) {
  const visible = visibleMuscleParts(parts, region, removed);
  if(positions)return abdominalDisplayGeometry(positions,source,parts,visible);
  const indices = new Uint32Array(visible.reduce((sum, p) => sum + p.faceCount * 3, 0));
  const pickingParts: MusclePart[] = [];
  let offset = 0;
  for (const part of visible) {
    const start=offset;
    indices.set(source.subarray(part.firstFace*3,(part.firstFace+part.faceCount)*3),offset);offset+=part.faceCount*3;
    if(offset>start)pickingParts.push({ ...part, firstFace: start / 3, faceCount:(offset-start)/3 });
  }
  return { indices:indices.subarray(0,offset), parts: pickingParts,positions,blends:[] };
}
