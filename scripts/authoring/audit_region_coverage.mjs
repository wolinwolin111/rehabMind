import fs from 'node:fs/promises';
const data=JSON.parse(await fs.readFile('build/knowledge/runtime.json','utf8'));
const atlas=JSON.parse(await fs.readFile('baseline/RehabMind_LowerLimbV1_ImplementationBaseline_DBv3.7_2026-09-29/04_3D_Localization/model/atlas_metadata.json','utf8'));
const normalize=name=>name.toLowerCase().replace(/\b(left|right)\b\s*/g,'').trim();
const groups=[
 ['股四头肌',['rectus femoris','vastus medialis','vastus lateralis','vastus intermedius'],['THIGH-R-001','THIGH-R-004','KNEE-R-001','KNEE-R-002','KNEE-R-003'],['CORE-MUS-RF','CORE-MUS-VM','CORE-MUS-VL','CORE-MUS-VI'],'浅层及深层分别记录；前内/前外侧增加定位子区域'],
 ['缝匠肌',['sartorius'],['THIGH-R-001','THIGH-R-003','KNEE-R-008'],['CORE-MUS-SART'],'跨大腿前内侧至膝内侧；增加斜行邻近子区域'],
 ['内收肌及股薄肌',['adductor longus','adductor brevis','adductor magnus','adductor minimus','gracilis','pectineus'],['THIGH-R-003','KNEE-R-008'],['THIGH-MUS-AL','THIGH-MUS-AB','THIGH-MUS-AM','CORE-MUS-GRAC','THIGH-CAP-ADD'],'耻骨肌及模型单列小收肌无独立检查，保留邻近/肌群层面评估'],
 ['腘绳肌',['long head of biceps femoris','short head of biceps femoris','semitendinosus','semimembranosus'],['THIGH-R-002','KNEE-R-008','KNEE-R-009','KNEE-R-011','KNEE-R-014'],['CORE-MUS-BF','CORE-MUS-ST','CORE-MUS-SM','CORE-CAP-KNEE-FLEX'],'后内侧与后外侧分别定位；股二头肌两头共用已有检查'],
 ['外侧筋膜邻近',['tensor fasciae latae','iliotibial tract'],['THIGH-R-004','KNEE-R-012'],['THIGH-MUS-TFL','CORE-MUS-VL','THIGH-LT-004'],'髂胫束是筋膜，不作为独立肌肉；仅保留现有下肢关联'],
 ['膝后深层',['popliteus'],['KNEE-R-013','KNEE-R-014','LL-R-005'],['KNEE-MUS-POPLIT'],'保留膝后及小腿上段组合区域，不由体表确定深层组织'],
 ['小腿后侧浅层',['medial head of gastrocnemius','lateral head of gastrocnemius','soleus','plantaris'],['LL-R-005','LL-R-006','AF-R-004','AF-R-005'],['CORE-MUS-GASTROC','CORE-MUS-SOLEUS','CORE-MUS-PLANTARIS'],'腓肠肌两头共用检查；跖肌保留补充入口'],
 ['小腿前侧',['tibialis anterior','extensor hallucis longus','extensor digitorum longus','fibularis tertius'],['LL-R-001','LL-R-002','AF-R-001','AF-R-010'],['CORE-MUS-TA','CORE-MUS-EHL','CORE-MUS-EDL','CORE-MUS-PT'],'保留肌腹、胫骨骨面与远端伸肌腱的不同位置'],
 ['小腿外侧',['fibularis longus','fibularis brevis'],['LL-R-004','AF-R-003','AF-R-009'],['CORE-MUS-PL','CORE-MUS-PB'],'外侧肌腹、外踝肌腱及第五跖骨基底分开'],
 ['小腿后侧深层',['tibialis posterior','flexor digitorum longus','flexor hallucis longus'],['LL-R-003','LL-R-007','AF-R-002','AF-R-008'],['CORE-MUS-TP','CORE-MUS-FDL','CORE-MUS-FHL'],'作为后内侧和内踝周围的邻近组织；不拆成精准体表肌肉识别'],
 ['足内侧肌群',['abductor hallucis','medial head of flexor hallucis brevis','lateral head of flexor hallucis brevis','oblique head of adductor hallucis','transverse head of adductor hallucis'],['AF-R-007','AF-R-011','AF-R-012'],['AF-MUS-014','AF-MUS-015','AF-MUS-017','CORE-CAP-ARCH-TOE','CORE-CAP-HF'],'复用拇展/拇收/拇短屈肌及足趾控制项目'],
 ['足底中央及外侧肌群',['flexor digitorum brevis','flexor accessorius','abductor digiti minimi of foot','flexor digiti minimi brevis of foot','opponens digiti minimi of foot','first lumbrical of foot','second lumbrical of foot','third lumbrical of foot','fourth lumbrical of foot','first plantar interosseous of foot','second plantar interosseous of foot','third plantar interosseous of foot'],['AF-R-007','AF-R-011'],['AF-MUS-016','CORE-CAP-ARCH-TOE','AF-LT-011'],'以已有局部组织及足趾控制检查覆盖，未新增无来源的单肌方法'],
 ['足背短伸肌与骨间肌',['extensor digitorum brevis','extensor hallucis brevis','first dorsal interosseous of foot','second dorsal interosseous of foot','third dorsal interosseous of foot','fourth dorsal interosseous of foot'],['AF-R-010','AF-R-011','AF-R-012'],['CORE-CAP-ARCH-TOE','AF-JNT-005','AF-ASM-004'],'模型缺失者记录为空，组织知识保留；不生成不存在的网格定位'],
];
const muscles=groups.map(([name,names,regions,items,disposition])=>({name,regions,clinical_items:items,disposition,
 model_parts:names.map(name=>({name,parts:atlas.parts.filter(p=>normalize(p.name)===name).map(p=>({id:p.id,name:p.name,system:p.system,conceptId:p.conceptId}))}))}));
for(const g of muscles){for(const id of g.regions)if(!data.tables['01_Region'].some(r=>r.region_id===id))throw Error(id);for(const id of g.clinical_items)if(!data.tables['02_ClinicalItem'].some(i=>i.item_id===id))throw Error(id);}
const bones=[
 ['股骨与髌骨',['femur','patella'],['THIGH-R-001','THIGH-R-002','THIGH-R-003','THIGH-R-004','KNEE-R-001','KNEE-R-002','KNEE-R-003','KNEE-R-004','KNEE-R-005'],'髌骨实际中心与宽度；髌骨圈选回归'],
 ['胫腓骨',['tibia','fibula'],['LL-R-002','LL-R-003','KNEE-R-006','KNEE-R-011','AF-R-002','AF-R-003'],'胫骨前缘截面、腓骨头及内外踝固定射线'],
 ['跟骨及跗骨',['calcaneus','talus','navicular bone of foot','cuboid bone','medial cuneiform bone'],['AF-R-005','AF-R-006','AF-R-008','AF-R-009','AF-R-010'],'真实骨骼中心/边界和足轴；修正足弓、舟骨、外侧中足、足背编号错配'],
 ['跖骨及趾骨',['first metatarsal bone','second metatarsal bone','third metatarsal bone','fourth metatarsal bone','fifth metatarsal bone'],['AF-R-011','AF-R-012'],'跖骨头、第五跖骨基底和已有趾骨定位参照'],
].map(([name,names,regions,verification])=>({name,regions,verification,model_parts:atlas.parts.filter(p=>names.includes(normalize(p.name))).map(p=>({id:p.id,name:p.name,conceptId:p.conceptId}))}));
const missing=muscles.flatMap(g=>g.model_parts.filter(p=>!p.parts.length).map(p=>p.name));
const report={date:'2026-10-02',scope:'大腿、膝、小腿、踝、足；髋臀独立入口暂缓',muscles,bones,missing_model_meshes:missing,clinical_items_added:0,regions_added:0,location_subareas_added:5,
 note:'这是组织覆盖与区域关联审计，不是每块组织的独立诊断能力或治疗疗效认证。'};
await fs.writeFile('knowledge/review/region_anatomy_coverage_v1.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({groups:muscles.length,anatomical_names:muscles.reduce((n,g)=>n+g.model_parts.length,0),missing_model_meshes:missing}));
