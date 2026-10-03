import { muscleKey } from './muscle-anatomy';
const labels: Record<string, string> = {
  'hip bone':'髋骨', femur:'股骨', tibia:'胫骨', fibula:'腓骨', patella:'髌骨',
  humerus:'肱骨', radius:'桡骨', ulna:'尺骨', scapula:'肩胛骨', clavicle:'锁骨',
  talus:'距骨', calcaneus:'跟骨', 'navicular bone of foot':'足舟骨', 'cuboid bone':'骰骨',
  'medial cuneiform bone':'内侧楔骨','intermediate cuneiform bone':'中间楔骨','lateral cuneiform bone':'外侧楔骨',
  'sesamoid bone of foot':'足籽骨', scaphoid:'手舟骨', lunate:'月骨', triquetral:'三角骨', pisiform:'豌豆骨',
  trapezium:'大多角骨', trapezoid:'小多角骨', capitate:'头状骨', hamate:'钩骨',
  atlas:'寰椎', axis:'枢椎', sacrum:'骶骨', 'hyoid bone':'舌骨', 'body of sternum':'胸骨体', manubrium:'胸骨柄', 'xiphoid process':'剑突',
  'frontal bone':'额骨', 'parietal bone':'顶骨', 'temporal bone':'颞骨', 'occipital bone':'枕骨',
  'sphenoid bone':'蝶骨', ethmoid:'筛骨', maxilla:'上颌骨', mandible:'下颌骨', 'zygomatic bone':'颧骨', 'nasal bone':'鼻骨', 'palatine bone':'腭骨', vomer:'犁骨',
};
const order = ['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth'];
export function getBoneDisplayName(name: string): string | null {
  const key = muscleKey(name);
  let label = labels[key];
  const vertebra = key.match(/^(\w+) (cervical|thoracic|lumbar) vertebra$/);
  if (vertebra && order.includes(vertebra[1])) label = `第${order.indexOf(vertebra[1]) + 1}${{cervical:'颈',thoracic:'胸',lumbar:'腰'}[vertebra[2]]}椎`;
  const numbered = key.match(/^(\w+) (rib|metacarpal bone|metatarsal bone)$/);
  if (numbered && order.includes(numbered[1])) label = `第${order.indexOf(numbered[1]) + 1}${{'rib':'肋骨','metacarpal bone':'掌骨','metatarsal bone':'跖骨'}[numbered[2]]}`;
  const digit = key.match(/^(proximal|middle|distal) phalanx of (.+)$/);
  if (digit) {
    const digits: Record<string,string> = {'big toe':'拇趾','second toe':'第2趾','third toe':'第3趾','fourth toe':'第4趾','little toe':'第5趾','thumb':'拇指','index finger':'示指','middle finger':'中指','ring finger':'环指','little finger':'小指'};
    if (digits[digit[2]]) label = `${digits[digit[2]]}${{proximal:'近',middle:'中',distal:'远'}[digit[1]]}节${digit[2].includes('toe') ? '趾' : '指'}骨`;
  }
  if (!label) return null; // Do not mislabel teeth, cartilage, discs or connective tissue as bone.
  const side = name.match(/\b(left|right)\b/i)?.[1].toLowerCase();
  return `${side ? side === 'left' ? '左侧 · ' : '右侧 · ' : ''}${label}`;
}
