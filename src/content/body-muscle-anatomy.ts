import type { MuscleAnatomy } from './lower-limb-anatomy';

export interface BodyMuscleAnatomy extends MuscleAnatomy {
  displayName: string;
  /** Teaching display depth, not uniform anatomical shells. */
  depth: 0 | 1 | 2 | 3;
  group: string;
  sourceLabel: string;
}
type Row = [string, string, string, string, string, BodyMuscleAnatomy['depth'], string?];
export const bodyMuscleAnatomy: Record<string, BodyMuscleAnatomy> = {};
const uams = 'https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/';
function add(group: string, source: string, rows: Row[], sourceLabel = '解剖教学参考') {
  for (const [name, displayName, origin, insertion, action, depth, note] of rows) {
    bodyMuscleAnatomy[name] = { displayName, origin, insertion, action, depth, note, group, source, sourceLabel };
  }
}
add('肩与上臂', `${uams}muscles-of-the-upper-limb/`, [
  ['clavicular part of pectoralis major','胸大肌锁骨部','锁骨内侧半前面。','肱骨结节间沟外侧唇。','屈肩、水平内收及内旋肩。',0],
  ['sternocostal part of pectoralis major','胸大肌胸肋部','胸骨前面及上位肋软骨。','肱骨结节间沟外侧唇。','内收、内旋肩；从屈曲位参与肩伸展。',0],
  ['abdominal part of pectoralis major','胸大肌腹部','腹外斜肌腱膜及邻近腹直肌鞘前层。','肱骨结节间沟外侧唇。','辅助内收、内旋肩，并从抬臂位将上臂向下拉回。',0,'为胸大肌下部纤维，不是腹壁肌。'],
  ['pectoralis minor','胸小肌','第三至第五肋近肋软骨处。','肩胛骨喙突内侧缘及上面。','使肩胛骨向前下方移动；肩胛固定时可辅助抬肋。',1],
  ['serratus anterior','前锯肌','第一至第八或第九肋外侧面。','肩胛骨内侧缘的肋面。','肩胛前伸、上回旋，使肩胛贴近胸壁。',1],
  ['subclavius','锁骨下肌','第一肋与其肋软骨交界处。','锁骨中段下面。','下压并稳定锁骨。',1],
  ['clavicular part of deltoid','三角肌锁骨部','锁骨外侧三分之一前缘。','肱骨三角肌粗隆。','屈肩、内旋肩，辅助水平内收。',0],
  ['acromial part of deltoid','三角肌肩峰部','肩峰外侧缘及上面。','肱骨三角肌粗隆。','主要参与肩外展，协同肩袖稳定肱骨头。',0],
  ['spinal part of deltoid','三角肌肩胛冈部','肩胛冈下缘。','肱骨三角肌粗隆。','伸肩、外旋肩，辅助水平外展。',0],
  ['supraspinatus','冈上肌','肩胛骨冈上窝。','肱骨大结节上部及肩关节囊。','参与肩外展及肱骨头稳定。',1,'属于肩袖；外展不是仅由冈上肌完成。'],
  ['infraspinatus muscle','冈下肌','肩胛骨冈下窝。','肱骨大结节中部及肩关节囊。','外旋肩，协同稳定肱骨头。',1],
  ['teres minor','小圆肌','肩胛骨外侧缘上部。','肱骨大结节下部及肩关节囊。','外旋肩，辅助内收并稳定肱骨头。',1],
  ['teres major','大圆肌','肩胛骨下角及邻近外侧缘后面。','肱骨结节间沟内侧唇。','内收、内旋肩，参与伸肩。',1,'大圆肌不属于肩袖。'],
  ['long head of biceps brachii','肱二头肌长头','肩胛骨盂上结节及邻近盂唇。','桡骨粗隆，并经肱二头肌腱膜连至前臂筋膜。','屈肘、前臂旋后，辅助屈肩。',0],
  ['short head of biceps brachii','肱二头肌短头','肩胛骨喙突尖。','桡骨粗隆及肱二头肌腱膜。','屈肘、前臂旋后，辅助屈肩。',0],
  ['brachialis','肱肌','肱骨前面远侧半。','尺骨粗隆及冠突。','屈肘，前臂不同旋转位置下均参与。',1],
  ['coracobrachialis','喙肱肌','肩胛骨喙突尖。','肱骨中段内侧面。','屈肩、内收肩。',1],
  ['long head of triceps brachii','肱三头肌长头','肩胛骨盂下结节。','尺骨鹰嘴。','伸肘，辅助伸肩及内收肩。',0,'跨肩与肘；肩位改变会影响其长度。'],
  ['lateral head of triceps brachii','肱三头肌外侧头','肱骨后面，桡神经沟以上。','尺骨鹰嘴。','伸肘。',0],
  ['medial head of triceps brachii','肱三头肌内侧头','肱骨后面，桡神经沟以下。','尺骨鹰嘴，部分纤维连至肘关节囊。','伸肘。',1],
  ['anconeus','肘肌','肱骨外上髁后面。','尺骨鹰嘴外侧及近端后面。','辅助伸肘及肘后侧稳定。',0],
]);
add('前臂', 'https://anatomy.ttuhscep.edu/schemes/forearm_tables.html', [
  ['brachioradialis','肱桡肌','肱骨外侧髁上嵴近端部分。','桡骨远端外侧，茎突近侧。','屈肘，尤其前臂中立位；帮助前臂回到中立位。',0],
  ['extensor carpi radialis longus','桡侧腕长伸肌','肱骨外侧髁上嵴远段。','第二掌骨基底背侧。','伸腕、桡偏腕。',0],
  ['extensor carpi radialis brevis','桡侧腕短伸肌','肱骨外上髁的共同伸肌腱。','第三掌骨基底背侧。','伸腕、辅助桡偏，握持时参与腕稳定。',1],
  ['extensor carpi ulnaris','尺侧腕伸肌','肱骨外上髁及尺骨后缘。','第五掌骨基底背侧。','伸腕、尺偏腕。',0],
  ['extensor digitorum','指伸肌','肱骨外上髁的共同伸肌腱。','第二至第五指指背腱膜。','伸第二至第五指，辅助伸腕。',0],
  ['extensor digiti minimi','小指伸肌','肱骨外上髁的共同伸肌腱。','第五指指背腱膜。','伸小指，辅助伸腕。',0],
  ['extensor indicis','示指伸肌','尺骨后面远段及骨间膜。','第二指指背腱膜。','独立伸示指，辅助伸腕。',2],
  ['abductor pollicis longus','拇长展肌','桡、尺骨后面近段及骨间膜。','第一掌骨基底桡侧。','外展、伸拇指腕掌关节，辅助腕桡偏。',2],
  ['extensor pollicis brevis','拇短伸肌','桡骨后面远段及骨间膜。','拇指近节指骨基底背侧。','伸拇指掌指关节，并参与腕掌关节伸展。',2],
  ['extensor pollicis longus','拇长伸肌','尺骨后面中段及骨间膜。','拇指末节指骨基底背侧。','伸拇指指间关节，并辅助伸掌指、腕掌关节。',2],
  ['flexor carpi radialis','桡侧腕屈肌','肱骨内上髁的共同屈肌腱。','第二掌骨基底，常有纤维至第三掌骨基底。','屈腕、桡偏腕。',0],
  ['palmaris longus','掌长肌','肱骨内上髁的共同屈肌腱。','屈肌支持带及掌腱膜。','紧张掌腱膜，微弱辅助屈腕。',0,'常有先天缺如，模型存在不代表每个人都有。'],
  ['humeral head of pronator teres','旋前圆肌肱骨头','肱骨内上髁及邻近髁上嵴。','桡骨中段外侧面。','前臂旋前，辅助屈肘。',0],
  ['ulnar head of pronator teres','旋前圆肌尺骨头','尺骨冠突内侧。','与肱骨头汇合至桡骨中段外侧面。','前臂旋前。',1],
  ['humeral head of flexor carpi ulnaris','尺侧腕屈肌肱骨头','肱骨内上髁的共同屈肌腱。','豌豆骨，再经韧带连至钩骨钩及第五掌骨基底。','屈腕、尺偏腕。',0],
  ['ulnar head of flexor carpi ulnaris','尺侧腕屈肌尺骨头','尺骨鹰嘴内侧及尺骨后缘近段。','豌豆骨，并经韧带连至钩骨钩及第五掌骨基底。','屈腕、尺偏腕。',0],
  ['flexor digitorum superficialis','指浅屈肌','肱尺头：肱骨内上髁及尺骨冠突；桡头：桡骨前缘。','第二至第五指中节指骨两侧。','屈近侧指间关节，辅助屈掌指关节及腕。',1],
  ['flexor digitorum profundus','指深屈肌','尺骨前、内侧面近段及骨间膜。','第二至第五指末节指骨基底掌侧。','屈远侧指间关节，辅助屈其他指关节及腕。',2],
  ['flexor pollicis longus','拇长屈肌','桡骨前面及骨间膜。','拇指末节指骨基底掌侧。','屈拇指指间关节，辅助屈拇指掌指关节。',2],
  ['pronator quadratus','旋前方肌','尺骨远端前面。','桡骨远端前面。','前臂旋前，并参与远侧桡尺关节稳定。',3],
  ['supinator','旋后肌','肱骨外上髁、桡侧副韧带、桡骨环状韧带及尺骨旋后肌嵴。','桡骨近端前、外、后面。','前臂旋后。',2],
]);
add('手', 'https://anatomy.ttuhscep.edu/musculoskeletal_system/hand_tables.html', [
  ['abductor pollicis brevis','拇短展肌','屈肌支持带、舟骨结节及大多角骨结节。','拇指近节指骨基底桡侧及指背腱膜。','使拇指离开手掌平面，辅助对掌。',0],
  ['flexor pollicis brevis','拇短屈肌','浅头：屈肌支持带及大多角骨；深部常来自小多角骨及头状骨。','经桡侧籽骨等止于拇指近节指骨基底。','屈拇指掌指关节，辅助对掌。',1,'模型还单列浅头；深头的形态和归属存在变异，不能由网格命名判定个体变异。'],
  ['superficial head of flexor pollicis brevis','拇短屈肌浅头','屈肌支持带及大多角骨结节。','经桡侧籽骨止于拇指近节指骨基底桡侧。','屈拇指掌指关节，辅助对掌。',0],
  ['opponens pollicis','拇对掌肌','屈肌支持带及大多角骨结节。','第一掌骨桡侧缘及掌面。','使第一掌骨屈曲并旋转，形成拇指对掌。',2],
  ['oblique head of adductor pollicis','拇收肌斜头','头状骨、第二和第三掌骨基底及邻近韧带。','经尺侧籽骨止于拇指近节指骨基底尺侧。','内收拇指，参与捏持。',2],
  ['transverse head of adductor pollicis','拇收肌横头','第三掌骨掌面。','拇指近节指骨基底尺侧及指背腱膜。','内收拇指，参与捏持。',2],
  ['abductor digiti minimi of hand','小指展肌','豌豆骨及尺侧腕屈肌腱附近。','第五指近节指骨基底尺侧及指背腱膜。','外展小指，辅助屈其掌指关节。',0],
  ['flexor digiti minimi brevis of hand','小指短屈肌','钩骨钩及屈肌支持带。','第五指近节指骨基底尺侧。','屈第五掌指关节。',0],
  ['opponens digiti minimi of hand','小指对掌肌','钩骨钩及屈肌支持带。','第五掌骨尺侧缘及掌面。','使第五掌骨向掌侧并旋转，参与掌弓形成和握持。',2],
  ['set of lumbricals of hand','手蚓状肌群','第二至第五指指深屈肌腱；第一、二肌通常单羽状，第三、四肌通常双羽状。','第二至第五指指背腱膜桡侧。','屈掌指关节、伸指间关节，协调手指姿势。',1,'这是四块蚓状肌的集合网格。'],
  ['set of dorsal interossei of hand','手背侧骨间肌群','相邻掌骨的相对骨干面。','第二至第四指近节指骨基底及指背腱膜。','以中指为轴外展第二至第四指，辅助屈掌指、伸指间关节。',3,'通常四块；各肌的止点侧别不同，集合网格不能作为单块肌肉。'],
  ['set of palmar interossei of hand','手掌侧骨间肌群','第二、第四、第五掌骨朝向中指轴线一侧的骨干面。','第二、第四、第五指近节指骨基底及指背腱膜，朝向中指的一侧。','使手指向中指轴线内收，辅助屈掌指、伸指间关节。',3,'常按三块描述；部分命名体系另计拇指掌侧骨间肌。'],
]);
add('胸腹', `${uams}muscles-of-the-thorax/`, [
  ['external intercostal muscle','肋间外肌','上位肋骨下缘。','下一肋骨上缘。','参与吸气时抬肋，并稳定肋间隙。',0,'纤维总体向前下走行；单纯可见不代表呼吸功能正常。'],
  ['internal intercostal muscle','肋间内肌','上位肋骨肋沟内侧区域。','下一肋骨上缘。','骨间部主要参与用力呼气；软骨间部可辅助吸气，稳定肋间隙。',1],
  ['innermost intercostal muscle','肋间最内肌','上位肋骨内面。','下一肋骨内面。','与肋间内肌协同，稳定肋间隙并参与呼吸。',2],
  ['transversus thoracis','胸横肌','胸骨体下部及剑突后面。','第二至第六肋软骨内面。','微弱下压肋软骨，辅助呼气。',3],
  ['set of levatores costarum breves','肋短提肌群','第七颈椎至第十一胸椎横突。','下一肋骨结节与肋角之间。','辅助抬肋，并参与胸椎局部运动及稳定。',2],
  ['set of levatores costarum longi','肋长提肌群','下位胸椎横突。','跨过一肋，止于下方第二肋的肋角附近。','辅助抬肋，参与胸椎局部控制。',2,'主要出现在下位胸部；与肋短提肌按跨越肋数区分。'],
  ['serratus posterior superior','上后锯肌','项韧带下部及第七颈椎至第三胸椎棘突。','第二至第五肋肋角外侧。','可辅助抬上位肋；还可能参与胸壁本体感觉。',1,'其呼吸作用的大小仍有争议，不宜当作主要吸气肌。'],
  ['serratus posterior inferior','下后锯肌','第十一胸椎至第二腰椎棘突及胸腰筋膜。','第九至第十二肋下缘、肋角外侧。','可辅助稳定或下拉下位肋，并参与胸壁感觉。',1],
]);
add('腹壁与膈', `${uams}muscles-of-the-abdominal-region/`, [
  ['external oblique','腹外斜肌','第五至第十二肋外侧面。','腹白线、耻骨结节和髂嵴前部，经腱膜形成腹壁连接。','双侧协同屈躯干、增加腹压；单侧使躯干向同侧侧屈、向对侧旋转。',0],
  ['diaphragm','膈肌','剑突后面、下位肋及肋软骨、内外侧弓状韧带；左右膈脚附于上位腰椎。','膈肌中心腱。','吸气时收缩下降、增加胸腔容积，也参与腹压调节。',3,'右膈脚通常至第一至第三腰椎，左侧通常至第一至第二腰椎；呼吸作用不能简化为某项关节动作。'],
]);
add('盆底与会阴', `${uams}muscles-of-the-pelvis-and-perineum/`, [
  ['coccygeus','尾骨肌','坐骨棘及骶棘韧带。','骶骨下部及尾骨外侧缘。','支撑盆底，辅助尾骨位置控制。',2],
  ['iliococcygeus','髂尾肌','肛提肌腱弓后部及坐骨棘附近。','尾骨和肛尾缝。','支撑盆腔脏器，参与盆底抬升。',2],
  ['pubococcygeus','耻骨尾骨肌','耻骨后面及肛提肌腱弓前部。','会阴体、肛尾缝及尾骨，部分纤维连至邻近盆底结构。','支撑盆腔脏器，参与盆底闭合及抬升。',2],
  ['puborectalis','耻骨直肠肌','左右耻骨后面。','绕肛直肠交界后方形成U形肌袢，与对侧汇合。','维持肛直肠角，参与控便；排便时需适当放松。',2,'不是一条两端止于骨面的直线肌。'],
  ['external anal sphincter','肛门外括约肌','环绕肛管，前方连会阴体。','后方连肛尾韧带及尾骨，并与邻近盆底肌交织。','随意收缩关闭肛管，参与控便。',1,'环形肌用前后附着概述，不宜按普通肢体肌的起止端理解。'],
]);
add('背部', `${uams}muscles-of-the-back-region/`, [
  ['descending part of trapezius','斜方肌上部','枕外隆凸、上项线内侧部及项韧带。','锁骨外侧三分之一。','参与肩胛上提与上回旋；肩带固定时参与颈伸展、同侧侧屈及对侧旋转。',0,'上、下部需协同前锯肌完成肩胛上回旋，不能只按单束解释抬臂。'],
  ['transverse part of trapezius','斜方肌中部','下位颈椎及上位胸椎棘突、棘上韧带。','肩峰内侧缘及肩胛冈。','主要使肩胛后缩，参与肩胛稳定。',0],
  ['ascending part of trapezius','斜方肌下部','中下位胸椎棘突及棘上韧带，通常第四至第十二胸椎。','肩胛冈内侧端附近。','参与肩胛下压、上回旋及稳定。',0],
  ['rhomboid major','大菱形肌','第二至第五胸椎棘突及棘上韧带。','肩胛冈以下的肩胛骨内侧缘。','肩胛后缩、下回旋，参与肩胛贴胸壁的稳定。',1],
  ['rhomboid minor','小菱形肌','项韧带下部、第七颈椎及第一胸椎棘突。','肩胛冈根部的内侧缘。','肩胛后缩、下回旋，辅助上提和稳定。',1],
  ['splenius capitis','头夹肌','项韧带下半及第七颈椎至上位胸椎棘突。','颞骨乳突及上项线外侧。','双侧伸头颈；单侧使头颈同侧旋转、侧屈。',1],
  ['splenius cervicis','颈夹肌','第三至第六胸椎棘突。','第一至第三或第四颈椎横突。','双侧伸颈；单侧使颈同侧旋转、侧屈。',1],
]);
add('竖脊肌', 'https://anatomy.ttuhscep.edu/schemes/back_tables.html', [
  ['iliocostalis lumborum','髂肋肌腰部','髂嵴后部、骶骨及胸腰筋膜的共同腱性起始区。','下位肋肋角及腰椎横突的相关肌束。','伸展、同侧侧屈躯干，参与脊柱负荷控制。',1,'该名称包含多段肌束，附着不能简化为两个单点。'],
  ['iliocostalis thoracis','髂肋肌胸部','下位肋肋角。','上位肋肋角及第七颈椎横突。','伸展、同侧侧屈胸段，参与躯干稳定。',1],
  ['iliocostalis cervicis','髂肋肌颈部','第三至第六肋肋角附近。','第四至第六颈椎横突后结节。','伸颈、同侧侧屈颈部。',1],
  ['longissimus thoracis','最长肌胸部','骶骨、髂嵴后部及腰椎横突，经竖脊肌共同腱连接。','胸椎横突、肋骨结节与肋角之间，腰部肌束连至腰椎横突。','伸展、同侧侧屈躯干，参与脊柱稳定。',1],
  ['longissimus cervicis','最长肌颈部','上位胸椎横突。','第二至第六颈椎横突后结节。','伸颈、同侧侧屈颈部。',1],
  ['longissimus capitis','最长肌头部','上位胸椎横突及下位颈椎关节突。','颞骨乳突后缘。','双侧伸头；单侧同侧侧屈、旋转头部。',1],
  ['spinalis thoracis','棘肌胸部','下位胸椎、上位腰椎棘突及邻近棘上韧带。','上位胸椎棘突。','伸展胸椎，参与姿势维持。',1],
  ['spinalis','棘肌（集合）','相关下位椎骨的棘突及棘上、项韧带区域。','相关上位椎骨棘突；头部肌束可与头半棘肌融合。','参与伸展脊柱和头颈，具体作用取决于所包含的肌束。',1,'原模型未注明细分段，本条按棘肌集合说明；胸棘肌另有独立条目。'],
]);
add('深层脊柱肌', 'https://anatomy.ttuhscep.edu/schemes/back_tables.html', [
  ['semispinalis thoracis','半棘肌胸部','中下位胸椎横突，常为第六至第十胸椎。','下位颈椎及上位胸椎棘突，肌束向上跨数节。','伸展脊柱，单侧参与对侧旋转及节段控制。',2],
  ['semispinalis cervicis','半棘肌颈部','上位胸椎横突，常为第一至第六胸椎。','第二至第五颈椎棘突。','伸颈，单侧参与对侧旋转。',2],
  ['semispinalis capitis','半棘肌头部','上位胸椎横突及下位颈椎关节突。','枕骨上下项线之间。','双侧伸头颈；单侧参与对侧旋转。',2],
  ['lumbar rotator','腰回旋肌','腰椎横突或副突附近的短肌束。','上方相邻或隔一节椎骨的椎板、棘突根部。','参与局部稳定及本体感觉，可辅助伸展和对侧旋转。',3,'腰部回旋肌细小、常不明显；模型分束不能代替真实个体解剖。'],
  ['cervical rotator','颈回旋肌','颈椎横突相关区域。','上方一至两节颈椎的椎板、棘突根部。','参与局部稳定及本体感觉，辅助伸展、对侧旋转。',3],
  ['thoracic rotator','胸回旋肌','胸椎横突。','上方一至两节胸椎的椎板及棘突根部。','参与胸椎节段稳定及本体感觉，辅助伸展、对侧旋转。',3,'回旋短肌通常跨一节，长肌通常跨两节。'],
  ['lateral lumbar intertransversarius','腰外侧横突间肌','下位腰椎横突上缘附近。','相邻上位腰椎横突下缘附近。','辅助同侧侧屈及腰椎局部稳定。',3,'包含相邻横突之间的外侧肌束。'],
  ['medial lumbar intertransversarius','腰内侧横突间肌','下位腰椎副突附近。','相邻上位腰椎乳突附近。','参与腰椎节段稳定和本体感觉，辅助侧屈。',3],
  ['set of anterior cervical intertransversarii','颈前横突间肌群','下位颈椎横突前结节区域。','相邻上位颈椎横突前结节区域。','辅助同侧侧屈，参与颈椎节段稳定。',3],
  ['set of posterior cervical intertransversarii','颈后横突间肌群','下位颈椎横突后结节区域。','相邻上位颈椎横突后结节区域。','辅助同侧侧屈，参与颈椎节段稳定及本体感觉。',3],
  ['set of interspinales cervicis','颈棘间肌群','下位颈椎棘突上缘。','相邻上位颈椎棘突下缘。','辅助伸颈，参与局部稳定及本体感觉。',3],
  ['interspinalis thoracis','胸棘间肌','相关下位胸椎棘突上缘。','相邻上位胸椎棘突下缘。','参与胸椎局部稳定，微弱辅助伸展。',3,'胸段棘间肌较不发达，并非每个节段都有同样明确的肌束。'],
  ['set of interspinales lumborum','腰棘间肌群','下位腰椎棘突上缘。','相邻上位腰椎棘突下缘。','辅助伸腰，参与腰椎节段稳定。',3],
]);
add('颈部与枕下', `${uams}muscles-of-the-head-and-neck/`, [
  ['sternocleidomastoid','胸锁乳突肌','胸骨柄前面及锁骨内侧三分之一。','颞骨乳突和上项线外侧部。','单侧使颈同侧侧屈、头向对侧旋转；双侧协同颈屈曲，头位不同可伴上颈伸展；可辅助吸气。',0],
  ['scalenus anterior','前斜角肌','第三至第六颈椎横突前结节。','第一肋斜角肌结节。','参与颈屈曲、同侧侧屈；颈固定时抬第一肋。',1],
  ['scalenus medius','中斜角肌','第二至第七颈椎横突后结节。','第一肋上面，锁骨下动脉沟后方。','同侧侧屈颈部；颈固定时抬第一肋。',1],
  ['scalenus posterior','后斜角肌','第五至第七颈椎横突后结节。','第二肋外侧面。','同侧侧屈颈部；颈固定时抬第二肋。',1],
  ['longus capitis','头长肌','第三至第六颈椎横突前结节。','枕骨基底部下面。','屈头，参与深层头颈控制。',2],
  ['inferior oblique part of longus colli','颈长肌下斜部','第一至第三胸椎椎体前面。','第五、第六颈椎横突前结节。','参与屈颈及颈椎前方稳定；单侧可辅助对侧旋转。',2],
  ['superior oblique part of longus colli','颈长肌上斜部','第三至第五颈椎横突前结节。','寰椎前结节。','屈颈，参与上颈椎前方稳定。',2],
  ['vertical intermediate part of longus colli','颈长肌垂直部','下位颈椎及上位胸椎椎体前面。','第二至第四颈椎椎体前面。','屈颈并参与颈椎节段控制。',2,'颈长肌各束附着分布跨多个椎体，节段范围存在描述差异。'],
  ['rectus capitis anterior','头前直肌','寰椎侧块及横突前面。','枕骨基底部，枕髁前方。','屈头，参与寰枕关节局部稳定。',3],
  ['rectus capitis lateralis','头外侧直肌','寰椎横突上面。','枕骨颈静脉突下面。','同侧侧屈头，参与寰枕关节稳定。',3],
  ['rectus capitis posterior major','头后大直肌','枢椎棘突。','下项线外侧及邻近枕骨。','伸头，参与同侧旋转与枕下控制。',3],
  ['rectus capitis posterior minor','头后小直肌','寰椎后结节。','下项线内侧及邻近枕骨。','微弱伸头，参与枕下局部控制及本体感觉。',3],
  ['obliquus capitis superior','头上斜肌','寰椎横突。','枕骨上下项线之间。','伸头、同侧侧屈，参与枕下控制。',3],
  ['obliquus capitis inferior','头下斜肌','枢椎棘突。','寰椎横突。','使寰椎及头部向同侧旋转，参与寰枢关节控制。',3,'不直接附着于颅骨。'],
]);

/** Additional common shoulder and trunk muscles; only absent meshes go in the supplement list. */
add('肩胛与腹壁补充', `${uams}muscles-of-the-upper-limb/`, [
  ['latissimus dorsi','背阔肌','第七胸椎至下位脊柱棘突、胸腰筋膜、髂嵴后部及下位肋；可有纤维来自肩胛骨下角。','肱骨结节间沟底。','伸肩、内收、内旋肩；上肢固定时参与躯干牵拉。',0],
  ['subscapularis','肩胛下肌','肩胛骨肩胛下窝。','肱骨小结节及肩关节囊。','内旋肩，协同肩袖稳定肱骨头。',2],
  ['levator scapulae','肩胛提肌','第一至第四颈椎横突。','肩胛骨上角至肩胛冈根部之间的内侧缘。','上提、下回旋肩胛；肩胛固定时辅助同侧侧屈颈部。',1],
]);
add('腹壁补充', `${uams}muscles-of-the-abdominal-region/`, [
  ['rectus abdominis','腹直肌','耻骨联合及耻骨嵴。','剑突及第五至第七肋软骨。','屈躯干、参与骨盆后倾及腹压控制。',0],
  ['internal oblique','腹内斜肌','胸腰筋膜、髂嵴前部及腹股沟韧带外侧部。','下位肋、腹白线及耻骨梳等腱膜连接。','双侧屈躯干、增加腹压；单侧使躯干同侧侧屈、旋转。',1],
  ['transversus abdominis','腹横肌','下位肋软骨内面、胸腰筋膜、髂嵴及腹股沟韧带外侧部。','腹白线及耻骨嵴、耻骨梳的腱膜连接。','参与腹压调节与躯干稳定。',2,'不能仅凭收腹就判断腹横肌已被单独激活。'],
  ['quadratus lumborum','腰方肌','髂嵴后部及髂腰韧带。','第十二肋及第一至第四腰椎横突。','同侧侧屈躯干，稳定第十二肋；骨盆固定条件改变时作用不同。',2],
]);
add('深层背肌补充', `${uams}muscles-of-the-back-region/`, [
  ['multifidus','多裂肌','骶骨后面、髂后上棘附近；腰椎乳突、胸椎横突及下位颈椎关节突。','上方二至四节椎骨棘突。','参与脊柱节段稳定，辅助伸展、对侧旋转及局部控制。',2,'不同节段的附着和肌束长度不同，不是一块跨全脊柱的均匀肌肉。'],
]);
export const supplementalBodyMuscles = ['latissimus dorsi','rectus abdominis','internal oblique','transversus abdominis','quadratus lumborum','multifidus'].map(name => ({ name, displayName: bodyMuscleAnatomy[name].displayName }));
