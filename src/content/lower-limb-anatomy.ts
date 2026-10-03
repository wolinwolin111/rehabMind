/** Teaching summaries, not geometric attachment annotations. Keys are exact atlas names without side. */
export interface MuscleAnatomy { origin: string; insertion: string; action: string; note?: string; source?: string; sourceLabel?: string }
export const anatomySources = {
  lowerLimb: 'https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-lower-limb/',
  legFoot: 'https://anatomy.ttuhscep.edu/schemes/leg_tables.html',
  variation: 'https://doi.org/10.1002/ar.22919',
};
const quadricepsInsertion = '经股四头肌腱止于髌骨，并经髌韧带延续至胫骨粗隆。';
const achillesInsertion = '经跟腱止于跟骨后面。';
const entry = (origin: string, insertion: string, action: string, note?: string): MuscleAnatomy => ({origin, insertion, action, note});
export const lowerLimbAnatomy: Record<string, MuscleAnatomy> = {
  'rectus femoris': { ...entry('直头：髂前下棘；反折头（间接头）：髋臼上缘及邻近髋关节囊。', quadricepsInsertion, '伸膝、屈髋。', '跨髋、膝两关节；髋位会影响其长度与伸膝表现。模型为简化显示，未标注各肌头的实际腱性附着点。'), source: 'https://pubmed.ncbi.nlm.nih.gov/24793210/', sourceLabel: '股直肌起点解剖研究' },
  'vastus medialis': entry('股骨转子间线下部、粗线内侧唇及内侧髁上线。', quadricepsInsertion, '伸膝，并参与髌骨的动态稳定。', '不能仅凭膝伸动作把股内侧肌与其余股四头肌完全分离。'),
  'vastus lateralis': entry('股骨大转子、臀肌粗隆及粗线外侧唇。', quadricepsInsertion, '伸膝，参与髌骨稳定。'),
  'vastus intermedius': entry('股骨干前面及外侧面。', quadricepsInsertion, '伸膝。', '位于股直肌深面。'),
  'sartorius': entry('髂前上棘。', '胫骨近端内侧面，经鹅足附着。', '屈髋、外展及外旋髋；屈膝，屈膝位辅助小腿内旋。'),
  'gracilis': entry('耻骨体及耻骨下支。', '胫骨近端内侧面，经鹅足附着。', '内收髋；屈膝，屈膝位辅助小腿内旋。'),
  'pectineus': entry('耻骨上支的耻骨梳。', '股骨耻骨肌线。', '内收、屈髋。'),
  'adductor longus': entry('耻骨体前面，耻骨结节下方。', '股骨粗线中段内侧唇。', '内收髋，辅助屈髋。'),
  'adductor brevis': entry('耻骨体及耻骨下支。', '股骨耻骨肌线及粗线近端。', '内收髋，辅助屈髋。'),
  'adductor magnus': entry('内收部：耻骨下支及坐骨支；腘绳肌部：坐骨结节。', '内收部沿臀肌粗隆、粗线至内侧髁上线；腘绳肌部止于收肌结节。', '内收髋；腘绳肌部参与伸髋，前部纤维可辅助屈髋。'),
  'adductor minimus': entry('耻骨下支与坐骨支相邻的近端起始区。', '股骨臀肌粗隆及粗线近端。', '内收髋，辅助髋外旋。', '通常视作大收肌近端的一部分；不同图谱分束命名可有差异。'),
  'long head of biceps femoris': entry('坐骨结节。', '以腓骨头为主，与短头肌腱汇合。', '伸髋、屈膝；屈膝位使小腿外旋。'),
  'short head of biceps femoris': entry('股骨粗线外侧唇及外侧髁上线。', '与长头肌腱汇合，主要止于腓骨头。', '屈膝；屈膝位使小腿外旋。', '不跨髋关节，不承担长头的伸髋作用。'),
  'semitendinosus': entry('坐骨结节。', '胫骨近端内侧面，经鹅足附着。', '伸髋、屈膝；屈膝位使小腿内旋。'),
  'semimembranosus': entry('坐骨结节上外侧。', '胫骨内侧髁后面，并向膝后关节囊等发出扩展。', '伸髋、屈膝；屈膝位使小腿内旋。'),
  'popliteus': entry('股骨外侧髁，部分纤维与外侧半月板相连。', '胫骨后面、比目鱼肌线以上。', '辅助屈膝启动；非负重时内旋胫骨，足固定时外旋股骨。'),
  'plantaris': entry('股骨外侧髁上线下部及邻近关节囊。', '长腱下行至跟骨后面，常位于跟腱内侧。', '微弱辅助屈膝及踝跖屈。', '形态及远端附着存在变异，部分人缺如。'),
  'medial head of gastrocnemius': entry('股骨内侧髁后上方。', achillesInsertion, '踝跖屈、辅助屈膝。', '与外侧头共同跨膝、踝；伸膝位与屈膝位的长度条件不同。'),
  'lateral head of gastrocnemius': entry('股骨外侧髁外侧面及后上方。', achillesInsertion, '踝跖屈、辅助屈膝。'),
  'soleus': entry('腓骨头及近端后面、胫骨比目鱼肌线及邻近内侧缘。', achillesInsertion, '踝跖屈；负重时参与控制小腿向前移动。', '不跨膝关节；屈膝提踵仍有其他跖屈肌参与。'),
  'tibialis anterior': entry('胫骨外侧髁、胫骨外侧面近段及骨间膜。', '内侧楔骨及第一跖骨基底。', '踝背屈、足内翻。'),
  'tibialis posterior': entry('胫、腓骨后面及骨间膜。', '以舟骨粗隆为主，向楔骨、骰骨及第二至第四跖骨基底等扩展。', '足内翻、辅助踝跖屈，参与足弓支撑。'),
  'fibularis longus': entry('腓骨头及腓骨外侧面近段。', '绕行足底，止于内侧楔骨及第一跖骨基底。', '足外翻、辅助跖屈；参与第一跖骨列与足弓的负重控制。'),
  'fibularis brevis': entry('腓骨外侧面远段。', '第五跖骨基底粗隆。', '足外翻、辅助跖屈。'),
  'fibularis tertius': entry('腓骨前面远段及骨间膜。', '第五跖骨基底背侧。', '辅助踝背屈和足外翻。'),
  'extensor digitorum longus': entry('胫骨外侧髁、腓骨前面及骨间膜。', '第二至第五趾趾背腱膜，延续至中、末节趾骨。', '伸第二至第五趾，辅助踝背屈。'),
  'extensor hallucis longus': entry('腓骨前面中段及骨间膜。', '拇趾末节趾骨基底背侧。', '伸拇趾，辅助踝背屈。'),
  'extensor hallucis brevis': entry('跟骨上外侧面。', '拇趾近节趾骨基底背侧。', '伸第一跖趾关节。', '通常归入趾短伸肌的内侧部分，不跨拇趾趾间关节。'),
  'flexor digitorum longus': entry('胫骨后面，比目鱼肌线下方。', '第二至第五趾末节趾骨基底跖侧。', '屈第二至第五趾，辅助踝跖屈及足弓支撑。'),
  'flexor hallucis longus': entry('腓骨后面远侧约三分之二及骨间膜。', '拇趾末节趾骨基底跖侧。', '屈拇趾，辅助踝跖屈，参与蹬地。'),
  'flexor digitorum brevis': entry('跟骨结节内侧突、足底腱膜及肌间隔。', '第二至第五趾中节趾骨两侧。', '屈第二至第五趾近侧趾间关节及跖趾关节。'),
  'abductor hallucis': entry('跟骨结节内侧突、屈肌支持带及足底腱膜。', '经内侧籽骨附近止于拇趾近节趾骨基底内侧。', '外展并辅助屈拇趾，参与内侧足弓支撑。'),
  'medial head of flexor hallucis brevis': entry('骰骨及外侧楔骨跖侧，部分纤维与胫骨后肌腱相连。', '经内侧籽骨止于拇趾近节趾骨基底内侧。', '屈第一跖趾关节，参与拇趾跖侧支撑。'),
  'lateral head of flexor hallucis brevis': entry('骰骨及外侧楔骨跖侧。', '经外侧籽骨止于拇趾近节趾骨基底外侧。', '屈第一跖趾关节，参与拇趾跖侧支撑。'),
  'oblique head of adductor hallucis': entry('第二至第四跖骨基底及腓骨长肌腱鞘附近。', '经外侧籽骨附近止于拇趾近节趾骨基底外侧。', '内收拇趾，辅助屈第一跖趾关节及前足横弓支撑。'),
  'transverse head of adductor hallucis': entry('第三至第五跖趾关节跖侧韧带及跖骨深横韧带。', '与斜头汇合至拇趾近节趾骨基底外侧。', '内收拇趾，参与前足横向稳定。'),
  'flexor accessorius': entry('跟骨跖面内、外侧，部分与足底长韧带相连。', '趾长屈肌腱。', '辅助趾长屈肌屈趾，并调整其斜向牵拉方向。', '即足底方肌；模型使用 flexor accessorius 名称。'),
  'abductor digiti minimi of foot': entry('跟骨结节内、外侧突及足底腱膜。', '第五趾近节趾骨基底外侧。', '外展并辅助屈第五趾跖趾关节。'),
  'flexor digiti minimi brevis of foot': entry('第五跖骨基底及腓骨长肌腱鞘附近。', '第五趾近节趾骨基底外侧。', '屈第五跖趾关节。'),
  'opponens digiti minimi of foot': { ...entry('通常与足小趾短屈肌深部的起始区相连。', '常描述为第五跖骨外侧；作为独立肌时附着存在变异。', '可能辅助第五跖骨列稳定；不宜按手小指对掌功能解释。', '变异性结构：模型单独命名不代表每个人都有独立、相同形态的这块肌肉。'), source: anatomySources.variation },
  'gluteus maximus': entry('髂骨后部、骶尾骨背侧及骶结节韧带。', '髂胫束及股骨臀肌粗隆。', '伸髋、外旋髋；参与起身、上坡及负重时躯干和骨盆控制。'),
  'gluteus medius': entry('髂骨外面，前、后臀线之间。', '股骨大转子外侧面。', '外展髋；单腿负重时控制骨盆，前部纤维参与内旋。'),
  'gluteus minimus': entry('髂骨外面，前、下臀线之间。', '股骨大转子前面。', '外展、内旋髋，参与骨盆及髋关节稳定。'),
  'tensor fasciae latae': entry('髂前上棘及髂嵴前部。', '髂胫束，经其连接胫骨外侧髁前外侧。', '屈髋、外展及内旋髋，通过髂胫束参与髋膝稳定。'),
  'iliacus': entry('髂窝及邻近髂嵴内面。', '与腰大肌共同经髂腰肌腱止于股骨小转子。', '屈髋；下肢固定时参与骨盆位置控制。'),
  'psoas major': entry('第十二胸椎至腰椎椎体、椎间盘侧面及腰椎横突。', '股骨小转子。', '屈髋；下肢固定时参与躯干屈曲、侧屈及腰盆控制。'),
  'piriformis': entry('骶骨前面。', '股骨大转子上缘。', '伸髋位外旋髋；屈髋位可外展，参与髋稳定。'),
  'obturator internus': entry('闭孔膜内面及闭孔周缘骨面。', '经小坐骨孔转向，止于股骨大转子内侧面。', '外旋髋；屈髋位辅助外展，参与髋稳定。'),
  'obturator externus': entry('闭孔膜外面及周缘骨面。', '股骨转子窝。', '外旋髋，参与髋关节稳定。'),
  'gemellus superior': entry('坐骨棘。', '与闭孔内肌腱汇合至大转子内侧面。', '辅助髋外旋及屈髋位外展。'),
  'gemellus inferior': entry('坐骨结节上部。', '与闭孔内肌腱汇合至大转子内侧面。', '辅助髋外旋及屈髋位外展。'),
  'quadratus femoris': entry('坐骨结节外侧缘。', '股骨转子间嵴的方形结节及邻近骨面。', '外旋髋，辅助内收髋。'),
  'extensor digitorum brevis': entry('跟骨上外侧面及邻近伸肌支持带。', '第二至第四趾的趾长伸肌腱与趾背腱膜。', '辅助伸第二至第四趾。', '至拇趾的内侧部分通常单独称拇短伸肌；其余部分不直接承担第五趾伸趾。'),
  'articularis genu': entry('股骨远端前面，髌面上方。', '膝关节囊及髌上囊壁。', '伸膝时向近端提拉髌上囊，减少其夹入关节的机会。', '位于股中间肌深面；不宜将其视作能单独进行常规徒手肌力测试的主要伸膝肌。'),
};
for (const [index, ordinal] of ['first', 'second', 'third', 'fourth'].entries()) {
  const toe = index + 2;
  lowerLimbAnatomy[`${ordinal} lumbrical of foot`] = entry(
    index === 0 ? '趾长屈肌通向第二趾的肌腱内侧。' : `趾长屈肌通向第${toe - 1}、${toe}趾的相邻肌腱。`,
    `第${toe}趾近节趾骨基底内侧及趾背腱膜。`, `屈第${toe}跖趾关节，辅助伸其趾间关节。`);
}
for (const [index, ordinal] of ['first', 'second', 'third'].entries()) {
  const toe = index + 3;
  lowerLimbAnatomy[`${ordinal} plantar interosseous of foot`] = entry(
    `第${toe}跖骨基底及骨干内侧面。`, `第${toe}趾近节趾骨基底内侧及趾背腱膜。`,
    `使第${toe}趾向第二趾轴线内收；辅助屈跖趾关节、伸趾间关节。`);
}
export function getMuscleAnatomy(name: string): MuscleAnatomy | null {
  return lowerLimbAnatomy[name.replace(/\b(left|right)\s+/gi, '').toLowerCase().trim()] ?? null;
}

/** These teaching entries have no independent mesh in the current source atlas. */
export const supplementalMuscles = [
  { name: 'extensor digitorum brevis', displayName: '趾短伸肌' },
  { name: 'articularis genu', displayName: '膝关节肌' },
  ...['first', 'second', 'third', 'fourth'].map((ordinal, index) => {
    const toe = index < 2 ? 2 : index + 1;
    const side = index === 0 ? '内侧' : '外侧';
    const name = `${ordinal} dorsal interosseous of foot`;
    lowerLimbAnatomy[name] = entry(
      `第${index + 1}、${index + 2}跖骨相对的骨干面。`,
      `第${toe}趾近节趾骨基底${side}及趾背腱膜。`,
      `使第${toe}趾向${side}偏移（以第二趾为轴）；辅助屈跖趾关节、伸趾间关节。`);
    return { name, displayName: `第${index + 1}足背骨间肌` };
  }),
];
