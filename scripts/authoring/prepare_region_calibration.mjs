import fs from 'node:fs/promises';
const source='build/authoring/backups/region-calibration-20261002/runtime.json';
const data=JSON.parse(await fs.readFile(source,'utf8').catch(e=>{if(e.code!=='ENOENT')throw e;return fs.readFile('build/knowledge/runtime.json','utf8');}));
const main=data.tables,extra=data.clinical_extension;
const anatomy={thigh:'https://www.ncbi.nlm.nih.gov/books/NBK500008/',leg:'https://anatomy.med.utah.edu/diganat/PT/2014_lecture/L11_leg_knee.pdf',foot:'https://www.ncbi.nlm.nih.gov/books/NBK539705/'};
const batches=[1,2,3].map(batch=>({batch,main:{},extension:{},notes:[]}));
const put=(batch,section,sheet,id,patch)=>Object.assign(((batches[batch-1][section][sheet]??={})[id]??={}),patch);
const tissue=(batch,id,text)=>{
 put(batch,'main','01_Region',id,{related_tissues:text,related_tissues_source:anatomy[batch===1?'thigh':batch===2?'leg':'foot']+'\nBodyParts3D 4.0，当前原始模型组织与骨性标志核对；区域邻近关系，不作为组织诊断'});
 for(const g of extra.LocationGuide.filter(g=>g.Region_IDs===id&&g.Auto_Apply_To_Region!==false)) {
  put(batch,'extension','LocationGuide',g.Area_ID,{Related_Tissues:text});
 }
};
const tissues={
 'THIGH-R-001':'肌肉：股直肌；股内侧肌；股外侧肌\n深层邻近：股中间肌\n斜行经过：缝匠肌\n骨与周围组织：股骨；股四头肌筋膜；远端股四头肌腱',
 'THIGH-R-002':'肌肉：股二头肌长头与短头；半腱肌；半膜肌\n周围组织：腘绳肌腱膜及远端肌腱\n骨与深层邻近：股骨；坐骨神经',
 'THIGH-R-003':'肌肉：内收长肌；内收大肌；股薄肌\n深层邻近：内收短肌；耻骨肌\n斜行经过：缝匠肌\n骨与周围组织：股骨内侧；内收肌筋膜；远端鹅足肌腱',
 'THIGH-R-004':'肌肉：股外侧肌；近端阔筋膜张肌\n筋膜与邻近肌群：髂胫束；后外侧股二头肌\n骨与远端邻近：股骨外侧；股骨外侧髁；膝外侧软组织',
 'LL-R-001':'肌肉：胫骨前肌；趾长伸肌；拇长伸肌；第三腓骨肌\n骨与周围组织：胫骨前缘邻近；腓骨前方；小腿前侧筋膜\n神经与血管：深腓神经；胫前血管',
 'LL-R-002':'骨与周围组织：胫骨前缘；骨膜及皮下组织\n邻近肌群：胫骨前肌；前外侧趾长伸肌、拇长伸肌',
 'LL-R-003':'骨与周围组织：胫骨内侧缘；骨膜及筋膜\n邻近肌群：比目鱼肌；深层胫骨后肌、趾长屈肌\n远端邻近：内踝后方屈肌腱走行',
 'LL-R-004':'肌肉：腓骨长肌；腓骨短肌\n前外侧邻近：第三腓骨肌；趾长伸肌\n骨与周围组织：腓骨；小腿外侧筋膜\n神经邻近：浅腓神经',
 'LL-R-005':'表浅肌群：腓肠肌内侧头与外侧头\n深层邻近：比目鱼肌；跖肌\n近膝邻近：腘肌；腘绳肌远端；膝后关节囊\n骨与周围组织：胫骨、腓骨近端后方；后侧筋膜',
 'LL-R-006':'肌肉与肌腱：比目鱼肌；腓肠肌远端；跟腱近端\n深层邻近：胫骨后肌；趾长屈肌；拇长屈肌\n其他组织：跖肌腱；后侧筋膜',
 'LL-R-007':'深层肌群：胫骨后肌；趾长屈肌；拇长屈肌\n表浅邻近：比目鱼肌；腓肠肌内侧头\n骨与周围组织：胫骨后内侧；骨间膜及筋膜\n神经与血管：胫神经；胫后血管',
 'AF-R-006':'骨与表浅组织：跟骨底部；足跟脂肪垫\n筋膜与肌群起点：足底腱膜近端；趾短屈肌、拇展肌及小趾展肌起点\n神经邻近：足底神经分支',
 'AF-R-007':'筋膜与表浅肌群：足底腱膜；拇展肌；趾短屈肌\n深层邻近：足底方肌；屈趾肌腱；足内在肌群\n相关肌腱：胫骨后肌腱；腓骨长肌腱\n骨与关节：跟骨至中前足的足弓结构',
 'AF-R-008':'骨与关节：舟骨；内侧楔骨；邻近中足关节\n肌腱：胫骨后肌腱止点；胫骨前肌腱远端邻近\n足底邻近：拇展肌；足底筋膜与足弓支持组织',
 'AF-R-009':'骨与关节：第五跖骨基底；骰骨；外侧中足关节\n肌腱：腓骨短肌腱止点；第三腓骨肌腱；腓骨长肌腱走行\n足底邻近：小趾展肌；外侧足底筋膜',
 'AF-R-010':'肌腱：趾长伸肌腱；拇长伸肌腱；胫骨前肌腱邻近\n肌群：趾短伸肌；拇短伸肌\n骨与关节：跗骨背侧；跖骨基底；中足关节\n神经与支持组织：深腓神经；伸肌支持组织',
 'AF-R-011':'骨与关节：第2–5跖骨头；跖趾关节；近节趾骨\n肌腱与肌群：屈趾肌腱；蚓状肌；骨间肌；趾短屈肌；小趾肌群\n周围组织：跖板；足底脂肪垫；趾间神经',
 'AF-R-012':'骨与关节：第一跖骨头；拇趾近节趾骨；第一跖趾关节；籽骨\n肌腱：拇长屈肌腱；拇长伸肌腱\n肌群：拇短屈肌；拇展肌；拇收肌；拇短伸肌\n周围组织：跖板；关节囊',
};
for(const [id,text]of Object.entries(tissues))tissue(id.startsWith('THIGH')?1:id.startsWith('LL')?2:3,id,text);

// Make the regional fallback agree with the already reviewed primary/additional lists.
for(const guide of extra.LocationGuide.filter(g=>g.Region_IDs.split('|').length===1&&g.Auto_Apply_To_Region!==false)){
 const batch=guide.Region_IDs.startsWith('THIGH')?1:guide.Region_IDs.startsWith('LL')?2:3;
 const priority=new Set((guide.Primary_Item_IDs||'').split('|')),additional=new Set((guide.Additional_Item_IDs||'').split('|'));
 for(const m of main['05_RegionClinicalMap'].filter(m=>m.region_id===guide.Region_IDs)){
  const mode=priority.has(m.clinical_item_id)?'DEFAULT':additional.has(m.clinical_item_id)?'EXPAND':m.display_mode;
  if(mode!==m.display_mode)put(batch,'main','05_RegionClinicalMap',m.map_id,{display_mode:mode});
 }
}
const sourceNote='BodyParts3D 4.0 原始具名肌肉及骨骼；'+anatomy.thigh+'\n既有02_ClinicalItem及05_RegionClinicalMap；定位子区域复用现有临床内容';
const sublocations=[
 ['LOC-THIGH-ANTMED','大腿前内侧／股内侧肌邻近','THIGH-R-001',['CORE-MUS-VM','CORE-MUS-RF','THIGH-LT-001','KNEE-ROM-FLEX','KNEE-ROM-EXT','CORE-CAP-KNEE-EXT','CORE-CAP-QUAD-RECRUIT'],['CORE-MUS-VL','CORE-MUS-VI','CORE-MUS-SART'],
  '肌肉：股内侧肌；邻近股直肌\n深层邻近：股中间肌\n斜行邻近：缝匠肌\n骨与远端邻近：股骨；股四头肌腱；髌骨内上缘'],
 ['LOC-THIGH-ANTLAT','大腿前外侧／股外侧肌邻近','THIGH-R-001',['CORE-MUS-VL','CORE-MUS-RF','THIGH-LT-001','KNEE-ROM-FLEX','CORE-CAP-KNEE-EXT'],['CORE-MUS-VM','CORE-MUS-VI','KNEE-ROM-EXT','CORE-CAP-QUAD-RECRUIT'],
  '肌肉：股外侧肌；邻近股直肌\n深层邻近：股中间肌\n骨与筋膜：股骨；外侧肌间隔；外侧邻近髂胫束'],
 ['LOC-THIGH-POSTMED','大腿后内侧／内侧腘绳肌邻近','THIGH-R-002',['CORE-MUS-ST','CORE-MUS-SM','THIGH-LT-002','KNEE-ROM-EXT','CORE-CAP-KNEE-FLEX'],['CORE-MUS-BF','KNEE-ROM-FLEX'],
  '肌肉：半腱肌；半膜肌\n内侧邻近：股薄肌；内收大肌\n远端邻近：鹅足及膝后内侧肌腱\n骨与深层邻近：股骨；坐骨神经'],
 ['LOC-THIGH-POSTLAT','大腿后外侧／股二头肌邻近','THIGH-R-002',['CORE-MUS-BF','THIGH-LT-002','KNEE-ROM-EXT','CORE-CAP-KNEE-FLEX'],['CORE-MUS-ST','CORE-MUS-SM','KNEE-ROM-FLEX'],
  '肌肉：股二头肌长头与短头\n前外侧邻近：股外侧肌；髂胫束\n远端邻近：股二头肌腱；腓骨头\n深层邻近：坐骨神经'],
 ['LOC-THIGH-SART','大腿斜行／缝匠肌邻近','THIGH-R-001|THIGH-R-003',['CORE-MUS-SART','THIGH-LT-001','THIGH-LT-003','KNEE-ROM-FLEX','KNEE-ROM-EXT'],['CORE-MUS-RF','CORE-MUS-VM','CORE-MUS-GRAC','THIGH-MUS-AL','CORE-CAP-KNEE-FLEX','CORE-CAP-KNEE-EXT'],
  '斜行肌肉：缝匠肌\n前侧邻近：股直肌；股内侧肌\n内侧邻近：股薄肌；内收肌群\n远端邻近：鹅足肌腱'],
];
for(const [id,name,regions,primary,additional,text]of sublocations){
 const parent=extra.LocationGuide.find(g=>g.Area_ID==='LOC-THIGH-R-00'+(regions.startsWith('THIGH-R-002')?'2':'1'));
 const linked=(parent.Linked_Item_IDs||'').split('|').filter(x=>x&&!primary.includes(x)&&!additional.includes(x));
 const g={...parent,Area_ID:id,Display_Name:name,Region_IDs:regions,Module_Codes:'THIGH',Related_Tissues:text,
  Primary_Item_IDs:primary.join('|'),Additional_Item_IDs:additional.join('|'),Linked_Item_IDs:linked.join('|'),
  Auto_Apply_To_Region:false,Review_Status:'待临床审核',Source_Reference:sourceNote,
  Internal_Note:'体表定位子区域，具名肌肉用于模型标注参照，不能据此确定症状来源。复用已有肌群、关节、能力及局部组织项目；不新增诊断或处理方案。'};
 put(1,'extension','LocationGuide',id,g);
 // Conditional associations become readable for this explicit location only.
}
// Region fallback and dedicated anterior guide expose the same terminal knee extension reference.
const anterior=extra.LocationGuide.find(g=>g.Area_ID==='LOC-THIGH-R-001');
put(1,'extension','LocationGuide',anterior.Area_ID,{Additional_Item_IDs:[...new Set([...anterior.Additional_Item_IDs.split('|'),'CORE-CAP-QUAD-RECRUIT','CORE-MUS-SART'])].join('|')});
const medial=extra.LocationGuide.find(g=>g.Area_ID==='LOC-THIGH-R-003');
put(1,'extension','LocationGuide',medial.Area_ID,{Additional_Item_IDs:[...new Set([...medial.Additional_Item_IDs.split('|'),'CORE-MUS-SART','KNEE-ROM-FLEX'])].join('|')});
for(const m of main['05_RegionClinicalMap'].filter(m=>['THIGH-R-001','THIGH-R-003'].includes(m.region_id)&&m.clinical_item_id==='CORE-MUS-SART'))
 put(1,'main','05_RegionClinicalMap',m.map_id,{display_mode:'EXPAND'});
const posterior=extra.LocationGuide.find(g=>g.Area_ID==='LOC-LL-POSTUPPER');
put(2,'extension','LocationGuide',posterior.Area_ID,{Additional_Item_IDs:[...new Set([...posterior.Additional_Item_IDs.split('|'),'CORE-MUS-FHL'])].join('|')});

// Keep all guides with the same parent updated; composite guides preserve their more precise tissue lists.
for(const guide of extra.LocationGuide.filter(g=>g.Region_IDs==='AF-R-011'&&g.Auto_Apply_To_Region===false))
 put(3,'extension','LocationGuide',guide.Area_ID,{Related_Tissues:'肌腱：第2–5趾伸肌腱与屈肌腱\n肌群：蚓状肌；骨间肌；趾短屈肌；小趾肌群\n骨与关节：第2–5趾骨；跖趾关节；趾间关节'});
for(const guide of extra.LocationGuide.filter(g=>g.Region_IDs==='AF-R-012'&&g.Auto_Apply_To_Region===false))
 put(3,'extension','LocationGuide',guide.Area_ID,{Related_Tissues:'肌腱：拇长伸肌腱；拇长屈肌腱\n肌群：拇短屈肌；拇展肌；拇收肌；拇短伸肌\n骨与关节：拇趾趾骨；第一跖趾关节；趾间关节'});

// Existing kinetic templates remain intact. No Finding/Intervention records are authored here.
batches[0].notes=['新增5个显式体表子区域，保留4个大腿主区域和全部原检查/处理内容。','耻骨肌、小收肌作为邻近组织，不伪造独立检查条目。'];
batches[1].notes=['深层组织作为邻近信息；骨面与肌腹的局部检查不互换。'];
batches[2].notes=['模型中的舟骨/第五跖骨基底/足背/足弓4处旧编号错配单独修正。','模型缺少部分足内在肌网格；保留数据库的肌群层面检查，不能按缺失网格发明独立点选。'];
await fs.writeFile('knowledge/review/region_calibration_v1.json',JSON.stringify({date:'2026-10-02',scope:'THIGH,KNEE,LOWER_LEG,ANKLE_FOOT',batches},null,2)+'\n');
console.log(JSON.stringify(batches.map(b=>({batch:b.batch,main:Object.fromEntries(Object.entries(b.main).map(([k,v])=>[k,Object.keys(v).length])),extension:Object.fromEntries(Object.entries(b.extension).map(([k,v])=>[k,Object.keys(v).length]))}))));
