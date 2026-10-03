import type { MusclePart } from '../muscle-picking';
import { muscleKey } from './muscle-anatomy';

export interface TendonPart extends MusclePart { relatedMuscles:string[]; source:string; kind?:'tendon'|'fascia'|'membrane'|'ligament'; sourceGeometrySha256?:string }
export const achillesAnatomy = {
  connection:'腓肠肌内侧头、外侧头与比目鱼肌的共同远端肌腱。',
  attachment:'止于跟骨后面。跟腱附着与足底跟骨结节处的足底筋膜附着不同。',
  function:'把小腿三头肌的张力传递至跟骨，参与踝跖屈及行走、跑跳时的蹬地。',
  note:'跟腱是多个肌肉共同形成的结构；不同肌肉腱束的细节未在本模型中分开。',
  source:'https://anatomy.ttuhscep.edu/schemes/leg_tables.html',
};
export function getTendonAnatomy(name:string) {
  const key=muscleKey(name);
  if(key==='calcaneal tendon')return {...achillesAnatomy,connectionLabel:'连接肌肉',attachmentLabel:'骨性附着',sourceLabel:'小腿与足解剖参考'};
  return connectiveAnatomy[key]||null;
}
const connectiveAnatomy:Record<string,typeof achillesAnatomy & {connectionLabel:string;attachmentLabel:string;sourceLabel:string}>={
  'linea alba':{
    connection:'左右腹外斜肌、腹内斜肌及腹横肌的腱膜纤维在前腹壁中线交织形成的纤维带；位于两侧腹直肌之间。',
    attachment:'从剑突向下延续至耻骨联合及耻骨嵴附近。',
    function:'连接左右腹壁腱膜、传递腹壁张力，并参与维持腹壁结构。',
    note:'腹白线不是腹直肌的远端肌腱；腹直肌鞘和各层腹肌腱膜也不能用腹白线一条带状结构代替。',
    source:'https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/topographical-anatomy-tables/topographical-anatomy-of-the-abdomen/',sourceLabel:'UAMS 腹部解剖',connectionLabel:'腱膜关联',attachmentLabel:'主要连接',
  },
  'posterior layer of thoracolumbar fascia':{
    connection:'覆盖椎旁肌后方，与背阔肌腱膜、腹内斜肌及腹横肌腱膜在外侧区域形成连续的筋膜连接。',
    attachment:'内侧连于腰椎棘突及棘上韧带区域；下方延续至骶骨、髂嵴后部，外侧与其他筋膜层相接。',
    function:'包绕椎旁肌并传递背部、腹壁与骨盆之间的张力。',
    note:'采用三层教学模型；后层内部仍有多个板层。本模型未逐纤维分出附着足印和滑动界面。',
    source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC3512280/',sourceLabel:'胸腰筋膜解剖研究',connectionLabel:'筋膜关联',attachmentLabel:'主要连接',
  },
  'middle layer of thoracolumbar fascia':{
    connection:'位于椎旁肌与腰方肌之间；外侧与腹横肌腱膜及外侧缝相连，腹内斜肌下部也参与这一筋膜连接。',
    attachment:'腰椎横突及横突间区域，上方第十二肋、下方髂嵴附近。',
    function:'分隔并连接腰背肌群与后腹壁，参与腹壁张力向腰椎的传递。',
    note:'腰方肌位于中层前方；不能把这一层当成腰方肌肌腹或独立肌腱。',
    source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC2140134/',sourceLabel:'腰筋膜中层与横突附着解剖研究',connectionLabel:'筋膜关联',attachmentLabel:'主要连接',
  },
  'anterior layer of thoracolumbar fascia':{
    connection:'三层教学模型中覆盖腰方肌前面的薄筋膜，与腹横筋膜连续。',
    attachment:'腰椎横突附近、髂嵴及第十二肋区域，与邻近筋膜连续。',
    function:'覆盖并分隔后腹壁组织。',
    note:'不同资料对这一层的命名和归属有差异；部分将其视为腹横筋膜的延续，不应等同于厚实的承力腱膜。',
    source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC3512280/',sourceLabel:'后腹壁筋膜解剖研究',connectionLabel:'筋膜关联',attachmentLabel:'主要连接',
  },
  'iliotibial tract':{
    connection:'大腿阔筋膜外侧的增厚部分，接受阔筋膜张肌及臀大肌部分纤维的张力。',
    attachment:'近端与髂嵴相连，远端主要连接胫骨外侧髁前外侧的 Gerdy 结节。',
    function:'传递相关肌肉的张力，参与髋、膝外侧稳定。',
    note:'髂胫束属于筋膜结构，不是独立肌肉，也不是某一块肌肉独有的肌腱。源模型未分别标记全部深层纤维和连接面。',
    source:'https://www.elsevier.com/resources/anatomy/muscular-system/muscles-of-lower-limb/iliotibial-tract/17689',
    sourceLabel:'Elsevier 解剖参考',connectionLabel:'组织关联',attachmentLabel:'主要连接',
  },
  'interosseous membrane of leg':{
    connection:'位于胫骨与腓骨之间；其前、后表面为胫骨前肌、胫骨后肌以及部分长伸趾、长屈拇趾肌等提供起始区域。',
    attachment:'连接胫骨与腓骨相对的骨间缘。',function:'连接两骨、参与力的传递，并提供肌肉附着及小腿前后间室的分隔。',
    note:'它是纤维膜，不是肌肉的远端肌腱；显示整张膜不代表已经标出每块肌肉的具体起点足印。',
    source:'https://anatomy.ttuhscep.edu/schemes/leg_tables.html',sourceLabel:'Texas Tech 小腿解剖参考',connectionLabel:'组织关联',attachmentLabel:'骨性连接',
  },
  'interosseous membrane of forearm':{
    connection:'位于桡、尺骨之间；指深屈肌、拇长屈肌及部分深层拇指和示指伸肌、拇长展肌有纤维起于此膜。',
    attachment:'连接桡骨与尺骨相对的骨间缘。',function:'连接桡、尺骨、参与前臂负荷传递，并提供部分肌肉的起始区域。',
    note:'它是纤维膜，不是某一块肌肉独有的肌腱；前臂旋转时的各纤维束张力和细分附着面未在模型中表达。',
    source:'https://anatomy.ttuhscep.edu/schemes/forearm_tables.html',sourceLabel:'Texas Tech 前臂解剖参考',connectionLabel:'组织关联',attachmentLabel:'骨性连接',
  },
  'long plantar ligament':{
    connection:'足底深部韧带，参与外侧足弓的被动支撑；足底方肌部分纤维与其相连，邻近腓骨长肌腱的足底通道。',
    attachment:'从跟骨足底面向前连接骰骨，浅层纤维延续至第二至第五跖骨基底附近。',function:'支撑外侧纵弓，参与稳定跟骰区域。',
    note:'足底长韧带与足底腱膜、弹簧韧带是不同结构；这里保留原资源的单块形态，未分出各层附着面。',
    source:'https://www.elsevier.com/resources/anatomy/connective-tissue/connective-tissue-of-lower-limb/long-plantar-ligament/20688',sourceLabel:'Elsevier 足部韧带解剖参考',connectionLabel:'组织关联',attachmentLabel:'骨性连接',
  },
};
/** Preserve source skeletal pack while drawing recovered fascia only once. */
export function excludeConnectiveBoneParts(indices:Uint32Array, parts:MusclePart[], connective:TendonPart[]) {
  const ids=new Set(connective.map(p=>p.id)),kept=parts.filter(p=>!ids.has(p.id));
  const output=new Uint32Array(kept.reduce((n,p)=>n+p.faceCount*3,0));let offset=0;
  const ranges=kept.map(p=>{output.set(indices.subarray(p.firstFace*3,(p.firstFace+p.faceCount)*3),offset);const range={...p,firstFace:offset/3};offset+=p.faceCount*3;return range;});
  return {indices:output,parts:ranges};
}
const coveringFasciaDepth:Record<string,number>={
  'posterior layer of thoracolumbar fascia':0,
  'middle layer of thoracolumbar fascia':1,
  'anterior layer of thoracolumbar fascia':2,
};
export function tendonVisible(part:TendonPart, visibleMuscles:MusclePart[], isolated?: {muscle?:MusclePart|null;bone?:MusclePart|null;tendon?:TendonPart|null},removedLayers=0) {
  if(isolated?.tendon)return isolated.tendon.id===part.id;
  if(isolated?.bone)return false;
  const coveringDepth=coveringFasciaDepth[muscleKey(part.name)];
  // Coverage must peel with the dissection, even when one of its associated
  // deep muscles remains. A solo muscle must not be hidden by its fascial shell.
  if(coveringDepth!==undefined&&(isolated?.muscle||removedLayers>coveringDepth))return false;
  const muscles=isolated?.muscle?[isolated.muscle]:visibleMuscles;
  return muscles.some(muscle=>(!part.side||muscle.side===part.side)&&part.relatedMuscles.includes(muscleKey(muscle.name)));
}
