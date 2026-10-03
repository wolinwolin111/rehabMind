import type { MusclePart } from '../muscle-picking';
import { bodyMuscleAnatomy } from './body-muscle-anatomy';
import { isCommonMuscle } from './muscle-anatomy';

export const muscleKey = (name: string) => name.replace(/\b(left|right)\s+/gi, '').toLowerCase().trim();
/** Regional teaching dissection groups, not equal-thickness shells or muscle subdivisions. */
export const muscleLayerRegions = {
  hip: { label: '髋臀', layers: [
    ['gluteus maximus', 'tensor fasciae latae'],
    ['gluteus medius', 'piriformis', 'gemellus superior', 'gemellus inferior', 'quadratus femoris'],
    ['gluteus minimus', 'obturator internus', 'obturator externus', 'iliacus', 'psoas major'],
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
    ['abductor hallucis', 'flexor digitorum brevis', 'abductor digiti minimi of foot', 'extensor hallucis brevis'],
    ['flexor accessorius', ...['first', 'second', 'third', 'fourth'].map(n => `${n} lumbrical of foot`)],
    ['medial head of flexor hallucis brevis', 'lateral head of flexor hallucis brevis', 'oblique head of adductor hallucis', 'transverse head of adductor hallucis', 'flexor digiti minimi brevis of foot', 'opponens digiti minimi of foot'],
    [...['first', 'second', 'third'].map(n => `${n} plantar interosseous of foot`)],
  ] },
} as const;
export type MuscleLayerRegion = keyof typeof muscleLayerRegions | 'all';
export function musclePeelSteps(region: MuscleLayerRegion) {
  return region === 'all' ? Math.max(...Object.values(muscleLayerRegions).map(group => group.layers.length)) - 1 : muscleLayerRegions[region].layers.length - 1;
}

export function visibleMuscleParts(parts: MusclePart[], region: MuscleLayerRegion, removed: number) {
  const groups = region === 'all' ? Object.values(muscleLayerRegions) : [muscleLayerRegions[region]];
  const hidden = new Set<string>();
  for (const group of groups) {
    const count = Math.max(0, Math.min(Math.trunc(removed) || 0, group.layers.length - 1));
    group.layers.slice(0, count).flat().forEach(name => hidden.add(name));
  }
  const step = Math.max(0, Math.min(3, Math.trunc(removed) || 0));
  return parts.filter(part => isCommonMuscle(part.name) && !hidden.has(muscleKey(part.name)) &&
    !(region === 'all' && (bodyMuscleAnatomy[muscleKey(part.name)]?.depth ?? 3) < step));
}

/** Repack only triangle indices; preserve source IDs for the new raycast face numbering. */
export function peelMuscleIndices(source: Uint32Array, parts: MusclePart[], region: MuscleLayerRegion, removed: number) {
  const visible = visibleMuscleParts(parts, region, removed);
  const indices = new Uint32Array(visible.reduce((sum, p) => sum + p.faceCount * 3, 0));
  const pickingParts: MusclePart[] = [];
  let offset = 0;
  for (const part of visible) {
    indices.set(source.subarray(part.firstFace * 3, (part.firstFace + part.faceCount) * 3), offset);
    pickingParts.push({ ...part, firstFace: offset / 3 });
    offset += part.faceCount * 3;
  }
  return { indices, parts: pickingParts };
}
