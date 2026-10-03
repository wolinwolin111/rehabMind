import { anatomySources, getMuscleAnatomy as getLowerFacts, supplementalMuscles as lowerSupplements } from './lower-limb-anatomy';
import { bodyMuscleAnatomy, supplementalBodyMuscles } from './body-muscle-anatomy';
export const muscleKey = (name: string) => name.replace(/\b(left|right)\s+/gi, '').toLowerCase().trim();
export function getMuscleAnatomy(name: string) {
  const body = bodyMuscleAnatomy[muscleKey(name)];
  if (body) return body;
  const lower = getLowerFacts(name);
  return lower ? { ...lower, source: lower.source || anatomySources.lowerLimb, sourceLabel: lower.sourceLabel || '下肢解剖参考' } : null;
}
export const isCommonMuscle = (name: string) => !!getMuscleAnatomy(name);
export function getMuscleDisplayName(name: string, fallback = name) {
  const facts = bodyMuscleAnatomy[muscleKey(name)];
  if (!facts) return fallback;
  const side = name.match(/\b(left|right)\b/i)?.[1].toLowerCase();
  return `${side ? side === 'left' ? '左侧 · ' : '右侧 · ' : ''}${facts.displayName}`;
}
export const supplementalMuscles = [...lowerSupplements, ...supplementalBodyMuscles];
