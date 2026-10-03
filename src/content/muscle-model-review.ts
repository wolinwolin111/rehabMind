import { muscleKey } from './muscle-anatomy';

/** Source-mesh observations. Keep standard anatomy independent of source shape. */
const observations: Record<string,string> = {
  'flexor digitorum superficialis':'显示修正：源资源把同侧指浅屈肌分为两个网格，点击任一部分后已组合显示，保留通向手指的远端结构。各指止点的精细附着面仍未认证。',
  'extensor carpi ulnaris':'显示修正：源资源把同侧尺侧腕伸肌分为两个网格，点击任一部分后已组合显示。',
  'short head of biceps brachii':'显示补充：单独显示短头时带上原资源保存于长头网格中的共享远端连接段，便于观察通向桡骨的路径。接缝附近替换为连续渐细曲面，共用边界和法线，肌腹到肌腱颜色渐变；局部过渡之外的肌头及靠骨端保持原形。属于教学显示过渡，不代表两头的真实精细腱束或附着足印。',
  'ulnar head of flexor carpi ulnaris':'显示补充：单独显示尺骨头时带上原资源保存于肱骨头网格中的远端连接段，便于观察到豌豆骨及其远端延续。原肌头及补段靠骨端保持原形；补段接缝经过裁切与渐进收拢，仅为显示过渡，分割边界不是经过组织学验证的肌腱边界。',
  'rectus femoris':'近端教学形态修正：右侧按用户在本模型截图圈出的上方髂前下棘、下方髋臼上缘区域重新记录连接点。左侧采用对应骨面候选，尚未由用户单独确认。双头外形参考用户的3DBody截图及分界标注，两头下段共享连续表面，交界保留尖角，上方分别渐细接入骨面；外围曲面平滑，共用边界和法线，绿色肌腹渐变为米白肌腱。骨面锚点固定，精细附着范围、关节囊和真实腱束未认证。核查页可关闭修正查看原模型。',
  'flexor pollicis brevis':'模型核查：这对源网格的左右标签与手部坐标相反，现已校正显示名称和侧别；原始部件编号及原始标签保留供追溯。',
};
export function muscleModelObservation(name:string) {
  const key=muscleKey(name);
  if(observations[key])return observations[key];
  if(/gastrocnemius|^soleus$/.test(key))return '显示修正：已恢复源资源中的同侧跟腱，作为小腿三头肌的共同肌腱显示；没有把共同跟腱归为某一个肌头独有。';
  if(['tensor fasciae latae','gluteus maximus'].includes(key))return '显示补充：已恢复同侧原资源的髂胫束，单独显示肌肉时可一起观察其筋膜连接。臀大肌另有股骨附着；不能把髂胫束视为全部纤维的唯一止点。';
  if(['tibialis anterior','tibialis posterior','extensor hallucis longus','extensor digitorum longus','flexor hallucis longus','fibularis tertius'].includes(key))return '显示补充：已恢复同侧原资源的胫腓骨间膜，作为起点关系的观察参考。整张膜不是该肌肉独有的肌腱，模型未标出该肌肉在膜上的精细附着范围。';
  if(['flexor digitorum profundus','flexor pollicis longus','abductor pollicis longus','extensor pollicis brevis','extensor pollicis longus','extensor indicis'].includes(key))return '显示补充：已恢复同侧原资源的前臂骨间膜，便于观察相关起点位置。原肌肉保持原形，未用整张膜代替每块肌肉的实际附着足印。';
  if(key==='flexor accessorius')return '显示补充：已恢复同侧原资源的足底长韧带，便于观察部分近端纤维的连接关系；足底方肌仍以趾长屈肌腱为止点，不把足底长韧带归为它的远端肌腱。';
  if(/set of|rotator$|intertransversarius$|interspinalis thoracis$|intercostal muscle$|^spinalis$/.test(key))return '模型范围：一次选中的是该类多个肌束的集合。当前不能分别核对每一束的起止节段或每个指、趾的附着面。';
  return null;
}
