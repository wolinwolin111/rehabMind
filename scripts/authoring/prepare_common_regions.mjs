import fs from 'node:fs';
import {knowledge} from '../../api/knowledge.mjs';

const data=knowledge(),regions=data.tables['01_Region'],maps=data.tables['05_RegionClinicalMap'];
const current=fs.existsSync('knowledge/review/common_region_v1.json')?JSON.parse(fs.readFileSync('knowledge/review/common_region_v1.json')):{date:'2026-10-02',batches:[]};
const source='BodyParts3D 4.0 原始模型具名组织及骨性标志；既有01_Region、02_ClinicalItem及评估/处理关联；book://magee-local，已核验膝部主动活动与抗阻章节（见reference_books_verified_v1.json）。本次只调整阅读入口和组织关联，不新增治疗方法。';
const peronealPlacement={...maps.find(r=>r.region_id==='LL-R-004'&&r.clinical_item_id==='CORE-MUS-PL'),map_id:'RCM-COMMON-KNEE-PL',region_id:'KNEE-R-011',assessment_group:'膝外侧邻近肌群',display_mode:'DEFAULT'};
if(!maps.some(r=>r.map_id===peronealPlacement.map_id))maps.push(peronealPlacement);
const records={};
const groups='MUSCLE_STATE:邻近肌群|ROM:相关关节活动|CAPACITY:相关肌力|LOCAL:局部组织|SPECIAL_TEST:补充检查|FUNCTION:相关动作观察';
function guide(id,parent,name,primary,extra=[],tissues=null,auto=true){
  const base=maps.filter(r=>r.region_id===parent),seen=new Set(primary);
  const linked=[],additional=[];
  for(const iid of extra){if(!seen.has(iid)){additional.push(iid);seen.add(iid);}}
  for(const row of base){
    if(seen.has(row.clinical_item_id))continue;
    (row.display_mode==='LINKED'||row.assessment_dimension==='FUNCTION'?linked:additional).push(row.clinical_item_id);seen.add(row.clinical_item_id);
  }
  const region=regions.find(r=>r.region_id===parent);
  for(const iid of seen)if(!maps.some(r=>r.clinical_item_id===iid&&regions.find(p=>p.region_id===r.region_id)?.module===region.module))throw Error(`No placement: ${iid}`);
  records[id]={Area_ID:id,Display_Name:name,Region_IDs:parent,Module_Codes:region.module,Related_Tissues:tissues||region.related_tissues,Primary_Item_IDs:primary.join('|'),Additional_Item_IDs:additional.join('|')||null,Linked_Item_IDs:linked.join('|')||null,Assessment_Groups:groups,Review_Status:'待临床审核',Source_Reference:source,Internal_Note:'区域是周围组织与评估参考的阅读入口。主要项目直接展示，补充项目按需展开。沿用既有检查与处理内容，不以模型选点确定疼痛组织。',Auto_Apply_To_Region:auto};
}
const rom=['KNEE-ROM-EXT','KNEE-ROM-FLEX'];
const quad=['CORE-CAP-QUAD-RECRUIT','CORE-CAP-KNEE-EXT'];
guide('LOC-KNEE-R-001','KNEE-R-001','髌骨上缘与股四头肌腱',['CORE-MUS-RF','CORE-MUS-VM','CORE-MUS-VL','KNEE-LT-SUPRAPAT',...rom,'KNEE-JNT-PF',...quad]);
guide('LOC-KNEE-R-002','KNEE-R-002','髌骨外侧缘',['CORE-MUS-VL','KNEE-LT-PATELLA',...rom,'KNEE-JNT-PF',...quad]);
guide('LOC-KNEE-R-003','KNEE-R-003','髌骨内侧缘',['CORE-MUS-VM','KNEE-LT-PATELLA',...rom,'KNEE-JNT-PF',...quad]);
guide('LOC-KNEE-R-004','KNEE-R-004','髌骨前方',['KNEE-LT-PATELLA',...rom,'KNEE-JNT-PF',...quad],['CORE-MUS-RF','CORE-MUS-VM','CORE-MUS-VL']);
guide('LOC-KNEE-R-005','KNEE-R-005','髌骨下缘与髌腱近端',['KNEE-LT-INFRAPAT',...rom,...quad],['CORE-MUS-RF','CORE-MUS-VL']);
guide('LOC-KNEE-R-006','KNEE-R-006','髌下前方',['KNEE-LT-INFRAPAT',...rom,...quad],['CORE-MUS-RF','CORE-MUS-VL']);
guide('LOC-KNEE-PATELLAR-TENDON','KNEE-R-006','髌腱邻近',['KNEE-LT-INFRAPAT',...rom,...quad],['CORE-MUS-RF','CORE-MUS-VL'],'肌腱与附着：髌腱；髌骨下缘；胫骨结节\n深部邻近：髌下脂肪垫；髌下滑囊',false);
guide('LOC-KNEE-TIBIAL-TUBERCLE','KNEE-R-006','胫骨结节邻近',['KNEE-LT-INFRAPAT',...rom,...quad],['CORE-MUS-RF','CORE-MUS-VL'],'骨与附着：胫骨结节；髌腱止点\n周围组织：髌下滑囊；皮下组织',false);
guide('LOC-KNEE-R-007','KNEE-R-007','膝内侧关节线',['KNEE-LT-MEDIAL',...rom,'KNEE-JNT-TIBROT'],['CORE-MUS-SM','CORE-MUS-ST','CORE-MUS-VM']);
guide('LOC-KNEE-R-008','KNEE-R-008','鹅足区 / 膝下内侧',['CORE-MUS-SART','CORE-MUS-GRAC','CORE-MUS-ST','KNEE-LT-MEDIAL',...rom,'KNEE-CAP-PES']);
guide('LOC-KNEE-R-009','KNEE-R-009','膝后内侧／内侧腘绳肌腱邻近',['CORE-MUS-SM','CORE-MUS-ST','CORE-MUS-GASTROC','KNEE-LT-POST',...rom,'CORE-CAP-KNEE-FLEX']);
guide('LOC-KNEE-R-010','KNEE-R-010','膝外侧关节线',['KNEE-LT-LATERAL',...rom,'KNEE-JNT-TIBROT'],['CORE-MUS-BF','KNEE-MUS-POPLIT','CORE-MUS-VL']);
guide('LOC-KNEE-R-011','KNEE-R-011','腓骨头及肌腱附着邻近',['CORE-MUS-BF','CORE-MUS-PL','KNEE-LT-LATERAL','KNEE-JNT-PROXTF',...rom,'CORE-CAP-KNEE-FLEX','CORE-CAP-EV']);
guide('LOC-KNEE-R-012','KNEE-R-012','膝外侧／髂胫束远端邻近',['CORE-MUS-VL','KNEE-MUS-LAT-CHAIN','KNEE-LT-LATERAL',...rom,'KNEE-CAP-HIPABD'],['KNEE-CAP-HIPEXT']);
guide('LOC-KNEE-R-013','KNEE-R-013','腘窝／膝后中央',['KNEE-LT-POST','CORE-MUS-GASTROC','KNEE-MUS-POPLIT',...rom,'CORE-CAP-KNEE-FLEX','CORE-CAP-PF'],['CORE-MUS-ST','CORE-MUS-SM','CORE-MUS-BF']);
guide('LOC-KNEE-R-014','KNEE-R-014','膝后外侧／股二头肌腱邻近',['CORE-MUS-BF','CORE-MUS-GASTROC','KNEE-MUS-POPLIT','KNEE-LT-POST',...rom,'KNEE-JNT-PROXTF','CORE-CAP-KNEE-FLEX'],['CORE-CAP-EV']);
current.batches=current.batches.filter(b=>b.batch!==4);
current.batches.push({batch:4,name:'膝周常见局部入口',main:{'05_RegionClinicalMap':{[peronealPlacement.map_id]:peronealPlacement}},extension:{LocationGuide:{...records}}});
fs.writeFileSync('knowledge/review/common_region_v1.json',JSON.stringify(current,null,2)+'\n');
console.log(JSON.stringify({batch:4,guides:Object.keys(records).length}));

if(process.argv.includes('--ankle')){
  for(const id of Object.keys(records))delete records[id];
  const df='CORE-ROM-ANK-DF',pf='CORE-ROM-ANK-PF',iv='CORE-ROM-ANK-INV',ev='CORE-ROM-ANK-EV';
  guide('LOC-AF-R-001','AF-R-001','前踝关节与伸肌腱邻近',['AF-LT-001','CORE-MUS-TA','CORE-MUS-EHL','CORE-MUS-EDL',df,pf,'AF-ASM-002','CORE-CAP-DF']);
  guide('LOC-AF-R-002','AF-R-002','内踝周围',['AF-LT-002','CORE-MUS-TP','CORE-MUS-FDL','CORE-MUS-FHL',df,ev,'CORE-CAP-INV'],['CORE-CAP-HF']);
  guide('LOC-AF-MEDIAL-TENDONS','AF-R-002','内踝后方／屈肌腱邻近',['CORE-MUS-TP','CORE-MUS-FDL','CORE-MUS-FHL','AF-LT-002',df,ev,'CORE-CAP-INV','CORE-CAP-HF'],[],'肌腱：胫骨后肌腱；趾长屈肌腱；拇长屈肌腱\n骨与通道：内踝后方；跗管\n周围组织：屈肌支持带；胫神经邻近',false);
  guide('LOC-AF-R-003','AF-R-003','外踝周围',['AF-LT-003','CORE-MUS-PL','CORE-MUS-PB',df,iv,ev,'AF-JNT-002','CORE-CAP-EV']);
  guide('LOC-AF-LATERAL-TENDONS','AF-R-003','外踝后方／腓骨肌腱邻近',['CORE-MUS-PL','CORE-MUS-PB','AF-LT-003',iv,ev,'CORE-CAP-EV'],[df,'AF-JNT-002'],'肌腱：腓骨长肌腱；腓骨短肌腱\n骨与周围组织：外踝后方；腓骨肌支持带\n邻近：跟腓韧带；腓骨远端',false);
  guide('LOC-AF-R-004','AF-R-004','跟腱中段与踝后方',['AF-LT-004','CORE-MUS-GASTROC','CORE-MUS-SOLEUS',df,'CORE-CAP-PF']);
  guide('LOC-AF-R-005','AF-R-005','跟腱止点与跟骨后方',['AF-LT-005','CORE-MUS-GASTROC','CORE-MUS-SOLEUS',df,'CORE-CAP-PF']);
  for(const row of Object.values(records))row.Source_Reference=source.replace('膝部主动活动与抗阻章节','踝足主动活动、抗阻及附属活动章节');
  current.batches=current.batches.filter(b=>b.batch!==5);
  current.batches.push({batch:5,name:'踝周常见局部入口',main:{},extension:{LocationGuide:{...records}}});
  fs.writeFileSync('knowledge/review/common_region_v1.json',JSON.stringify(current,null,2)+'\n');
  console.log(JSON.stringify({batch:5,guides:Object.keys(records).length}));
}

if(process.argv.includes('--foot')){
  for(const id of Object.keys(records))delete records[id];
  const df='CORE-ROM-ANK-DF';
  guide('LOC-AF-R-006','AF-R-006','足跟底部',['AF-LT-006',df,'CORE-MUS-GASTROC','CORE-MUS-SOLEUS'],['AF-LT-007','CORE-CAP-PF','CORE-CAP-ARCH-TOE'],'骨与表浅组织：跟骨底部；足跟脂肪垫；皮下组织\n前内侧邻近：足底筋膜附着区');
  guide('LOC-AF-HEEL-MEDIAL','AF-R-006','足跟底内侧／足底筋膜附着邻近',['AF-LT-007','AF-LT-006',df,'CORE-MUS-GASTROC','CORE-MUS-SOLEUS','CORE-CAP-ARCH-TOE'],['CORE-CAP-PF','AF-SPT-004'],'骨与附着：跟骨内侧结节；足底筋膜近端\n周围组织：足跟脂肪垫；足内在肌邻近',false);
  guide('LOC-AF-FIRST-MTP-PLANTAR','AF-R-012','第一跖趾关节足底侧／籽骨邻近',['AF-LT-012','AF-MUS-017','CORE-MUS-FHL','AF-ASM-004','CORE-CAP-HF'],['AF-MUS-014','AF-MUS-015','AF-JNT-004','CORE-CAP-ARCH-TOE'],'骨与关节：第一跖骨头；第一跖趾关节；籽骨\n肌肉与肌腱：拇短屈肌；拇长屈肌腱\n周围组织：跖板；关节囊',false);
  for(const row of Object.values(records))row.Source_Reference=source.replace('膝部主动活动与抗阻章节','踝足主动活动、抗阻及附属活动章节');
  current.batches=current.batches.filter(b=>b.batch!==6);
  current.batches.push({batch:6,name:'足部常见局部入口',main:{},extension:{LocationGuide:{...records}}});
  fs.writeFileSync('knowledge/review/common_region_v1.json',JSON.stringify(current,null,2)+'\n');
  console.log(JSON.stringify({batch:6,guides:Object.keys(records).length}));
}

if(process.argv.includes('--thigh')){
  for(const id of Object.keys(records))delete records[id];
  guide('LOC-THIGH-ANTCENT','THIGH-R-001','大腿前中央／股直肌邻近',['CORE-MUS-RF','THIGH-LT-001','KNEE-ROM-FLEX','CORE-CAP-KNEE-EXT'],['CORE-MUS-VI','CORE-MUS-VM','CORE-MUS-VL','KNEE-ROM-EXT','CORE-CAP-QUAD-RECRUIT'],'肌肉：股直肌\n深层邻近：股中间肌\n两侧邻近：股内侧肌；股外侧肌\n远端邻近：股四头肌腱',false);
  guide('LOC-THIGH-MEDIAL-GRAC','THIGH-R-003','大腿内侧／股薄肌邻近',['CORE-MUS-GRAC','THIGH-LT-003','KNEE-ROM-EXT','KNEE-ROM-FLEX','THIGH-CAP-ADD'],['CORE-MUS-SART','THIGH-MUS-AL','THIGH-MUS-AM','THIGH-MUS-AB'],'肌肉：股薄肌\n邻近肌群：内收长肌；内收大肌；缝匠肌\n远端附着邻近：鹅足肌腱',false);
  guide('LOC-THIGH-MEDIAL-ADD','THIGH-R-003','大腿内侧／内收肌腹邻近',['THIGH-MUS-AL','THIGH-MUS-AM','THIGH-LT-003','THIGH-CAP-ADD'],['THIGH-MUS-AB','CORE-MUS-GRAC','CORE-MUS-SART','KNEE-ROM-EXT'],'肌肉：内收长肌；内收大肌\n深层邻近：内收短肌；耻骨肌\n浅表邻近：股薄肌；缝匠肌\n骨与周围组织：股骨内侧；内收肌筋膜',false);
  current.batches=current.batches.filter(b=>b.batch!==7);
  current.batches.push({batch:7,name:'大腿肌腹局部入口',main:{},extension:{LocationGuide:{...records}}});
  fs.writeFileSync('knowledge/review/common_region_v1.json',JSON.stringify(current,null,2)+'\n');
  console.log(JSON.stringify({batch:7,guides:Object.keys(records).length}));
}

if(process.argv.includes('--calf')){
  for(const id of Object.keys(records))delete records[id];
  const df='CORE-ROM-ANK-DF';
  guide('LOC-LL-GASTROC-MEDIAL','LL-R-005','小腿后侧／腓肠肌内侧头邻近',['CORE-MUS-GASTROC','LL-LT-005',df,'CORE-CAP-PF'],['CORE-MUS-SOLEUS','CORE-MUS-TP','CORE-MUS-FDL'],'表浅肌群：腓肠肌内侧头\n深层邻近：比目鱼肌\n近端邻近：膝后内侧肌腱；膝后关节囊\n远端邻近：腓肠肌腱膜；跟腱',false);
  guide('LOC-LL-GASTROC-LATERAL','LL-R-005','小腿后侧／腓肠肌外侧头邻近',['CORE-MUS-GASTROC','LL-LT-005',df,'CORE-CAP-PF'],['CORE-MUS-SOLEUS','CORE-MUS-PL','CORE-MUS-PB'],'表浅肌群：腓肠肌外侧头\n深层邻近：比目鱼肌\n近端邻近：股二头肌腱；腓骨头\n远端邻近：腓肠肌腱膜；跟腱',false);
  const previous=data.clinical_extension.LocationGuide.find(r=>r.Area_ID==='LOC-LL-POSTMEDIAL');
  const note='本批将已有拇长屈肌检查由补充项移为直接阅读项。';
  records[previous.Area_ID]={...previous,Primary_Item_IDs:[...new Set([...previous.Primary_Item_IDs.split('|'),'CORE-MUS-FHL'])].join('|'),Additional_Item_IDs:previous.Additional_Item_IDs.split('|').filter(i=>i!=='CORE-MUS-FHL').join('|'),Source_Reference:previous.Source_Reference.includes(note)?previous.Source_Reference:previous.Source_Reference+'；'+note};
  current.batches=current.batches.filter(b=>b.batch!==8);
  current.batches.push({batch:8,name:'小腿后侧局部入口',main:{},extension:{LocationGuide:{...records}}});
  fs.writeFileSync('knowledge/review/common_region_v1.json',JSON.stringify(current,null,2)+'\n');
  console.log(JSON.stringify({batch:8,guides:Object.keys(records).length}));
}
