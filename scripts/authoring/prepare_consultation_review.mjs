import fs from 'node:fs/promises';
const original = JSON.parse(await fs.readFile('knowledge/review/consultation_before_v1.json','utf8'));
const runtime = JSON.parse(await fs.readFile('build/knowledge/runtime.json','utf8'));
const updates = {}, additions = [];
const note = '2026-10-03：完成教学文案与关联的辅助审核；仍需专业人员结合实际检查判断。问诊仅供教学，不收集答案、不自动归因。';
const sources = {
 pain:'https://www.iasp-pain.org/resources/fact-sheets/identifying-neuropathic-pain-in-the-clinic-a-guide-for-clinicians/',
 general:'https://www.nice.org.uk/guidance/ng193/chapter/recommendations',
 pes:'https://www.orthoinfo.org/diseases--conditions/pes-anserine-knee-tendon-bursitis',
 achilles:'https://www.orthoinfo.org/diseases--conditions/achilles-tendon-rupture-tear/',
 midfoot:'https://www.orthoinfo.org/diseases--conditions/lisfranc-midfoot-injury',
 ankle:'https://doi.org/10.2519/jospt.2021.0302',
};
function patch(id, values) { if(!original.some(r=>r.Guide_ID===id))throw Error(id); updates[id]={...updates[id],...values}; }
for(const r of original){
 if(r.Scope==='REGION' && (r.Guide_ID.endsWith('-2') || r.Guide_ID.endsWith('-ACTIVITY')))patch(r.Guide_ID,{Replaces_Guide_ID:'QG-PROVOKE'});
 if(r.Guide_ID.startsWith('QG-LPU-'))patch(r.Guide_ID,{Area_IDs:'LOC-LL-POSTUPPER|LOC-LL-GASTROC-MEDIAL|LOC-LL-GASTROC-LATERAL'});
}
patch('QG-KC-LOCATION',{Replaces_Guide_ID:'QG-KNEE-POST-1'});
patch('QG-KC-ACTIVITY',{Replaces_Guide_ID:'QG-PROVOKE|QG-KNEE-POST-2'});
patch('QG-KC-ASSOCIATED',{Replaces_Guide_ID:'QG-KNEE-POST-3',Assessment_Help:'结合膝后局部组织与感觉、力量检查；新发单侧明显肿胀、发热或变色，应先安排医学评估，不先做反复负重或深压测试。'});
patch('QG-LAB-LOCATION',{Optional_Probe:'能用一个手指指出最明显的位置吗？是在硬的骨面上还是旁边？有没有肿胀？无需患者自行反复按压。'});
patch('QG-LM-LOCATION',{Core_Prompt:'小腿内侧最不舒服的位置在哪里？靠近硬的骨边，还是更后面的软组织？'});
patch('QG-LPM-ASSOCIATED',{Assessment_Help:'感觉异常需结合分布补充神经筛查；新发单侧明显肿胀、发热或变色，应先安排医学评估，不以肌肉紧张解释。'});
for(const id of ['QG-AF-MID-CHANGE','QG-AF-INSERT-CHANGE'])patch(id,{Assessment_Help:'突然弹响或被踢感，伴明显蹬地无力时，先排查跟腱完整性并及时医学评估；暂缓强牵拉、反复提踵和跑跳测试。',Source_Reference:sources.achilles});
const prompts = {
 'QG-AF-R-006-1':['脚跟底下最痛的是正中间还是偏内侧？','是一点还是一片？是否向足弓延伸？'],
 'QG-AF-R-006-2':['赤脚、硬地走路和休息后刚起步，哪种更明显？','走开后是否减轻？走久后或第二天是否再次加重？'],
 'QG-AF-R-006-3':[null,'是否已有肿胀、夜间或休息时也痛、普通走路明显困难？'],
 'QG-AF-R-007-1':['脚底不适从脚跟延伸到足弓，还是只在足弓一处？','有没有麻木、烧灼或向脚趾延伸？'],
 'QG-AF-R-007-2':['刚起步、脚趾向上弯和久站走路时，有什么区别？','脱鞋、换鞋或休息后是否改变？'],
 'QG-AF-R-008-1':['足弓内侧最突出的位置痛，还是脚背偏内侧或突起后面痛？','这个突起一直有还是最近出现？鞋子是否压到它？'],
 'QG-AF-R-008-2':['脚向内转、踮脚和鞋子摩擦时，有什么区别？','走久后是否更明显？足弓外形或支撑感有无变化？'],
 'QG-AF-R-009-1':['足外侧突出的骨头附近痛，还是沿外踝后方一路痛下来？','能否指出最明显的一点？'],
 'QG-AF-R-009-3':[null,'受伤后能否正常走路？有没有明显肿胀或瘀斑？'],
 'QG-AF-R-010-1':['脚背中间最痛在哪里？松开鞋带后会不会好一些？','是一点、沿一条线，还是较深的一片？'],
 'QG-AF-R-010-3':[null,'受伤后还能正常走路吗？肿胀是否迅速增加？'],
 'QG-AF-R-011-1':[null,'是否有烧灼、麻刺或延伸到相邻脚趾？窄鞋或脱鞋后有何变化？'],
 'QG-AF-R-011-2':[null,'走路蹬地、赤脚或穿不同鞋时，疼痛位置是否一致？'],
 'QG-AF-R-012-1':['大脚趾根部是上面、两侧，还是脚底下面疼？','与鞋接触处是否相同？突然红、肿、热或静息剧痛也要了解。'],
 'QG-AF-R-012-2':['大脚趾向上弯、走路蹬地和鞋面压住时，有什么区别？','是疼痛先限制动作，还是觉得硬卡住？'],
 'QG-THIGH-R-001-1':['大腿前面最不舒服的位置在哪里？靠近髋、大腿中段还是膝盖上方？','是表面一片、深处还是一个明确点？'],
 'QG-THIGH-R-001-2':['弯膝拉伸、踢直膝盖、走路或跑跳时，哪种更明显？','上下台阶或加速时如何？不要为回答问题现场强行复现疼痛。'],
 'QG-THIGH-R-002-1':['大腿后面是靠近臀下、肌肉中段，还是膝盖后面疼？','坐着是否明显？有没有往小腿延伸的麻或电击感？'],
 'QG-THIGH-R-002-2':['伸直腿拉伸、弯膝发力和快跑时，有什么区别？','加速、跨大步与减速时是否不同？'],
 'QG-THIGH-R-003-1':['大腿内侧最痛在上端、中间，还是接近膝下内侧？','是局部疼，还是从近端延伸下来？'],
 'QG-THIGH-R-003-2':['双腿分开、夹腿、跨步或侧向移动时，哪种会不舒服？','变向与直线走跑时有何差别？'],
 'QG-THIGH-R-004-1':['大腿外侧最明显的是上段、中段还是接近膝外侧？','是深部疼、表面麻，还是沿一段延伸？'],
 'QG-KNEE-FRONT-1':['膝盖前面最痛在哪里？髌骨周围、上缘、下缘还是更下方的骨头突起？','能用手指出最明显位置吗？跪地接触痛与运动痛在同一处吗？'],
 'QG-KNEE-FRONT-3':['有没有扭伤、撞击、突然肿胀，或髌骨滑出去的感觉？','所谓卡住是关节确实动不了，还是怕痛不敢动？有无突然不能主动伸直膝盖？'],
 'QG-KNEE-MEDIAL-1':['膝内侧最痛在关节缝附近、膝下内侧，还是偏后方？','范围是一点还是沿一段？'],
 'QG-KNEE-MEDIAL-2':['上下台阶、转身、弯膝或夹腿时，哪种会不舒服？','日常活动中是否有膝向内偏或被外力推向内侧的受伤经过？'],
 'QG-KNEE-MEDIAL-3':['这次是否在转身、扭膝或受到侧向撞击后开始？','何时开始肿？是否真正卡住无法伸屈，或反复有失控打软的感觉？'],
 'QG-KNEE-LATERAL-1':['膝外侧疼在关节缝、稍上方，还是膝下外侧骨头突起附近？','是否延伸到小腿或足背？'],
 'QG-KNEE-LATERAL-2':['弯膝、转身、跑步或下坡时，有什么区别？','是否总在相近距离或屈膝角度出现？'],
 'QG-KNEE-LATERAL-3':['有没有扭转、侧向撞击，或突然踩空的受伤经过？','有没有肿胀、真正卡住、失控打软，或足背麻木、抬脚无力？'],
 'QG-KNEE-POST-1':['膝后是正中间、内侧还是外侧疼？','有没有摸到包块？是否向小腿延伸？'],
 'QG-KNEE-POST-2':['伸直膝盖、弯膝发力或踮脚时，哪种更明显？','是拉长时不适、发力痛，还是膝盖里顶胀？'],
 'QG-KNEE-POST-3':['有没有突然拉扯、扭伤、膝后包块或小腿肿胀？','是否伴发热、变色？膝盖是否真正卡住？'],
 'QG-KNEE-DIFFUSE-3':['有没有明显外伤，或没有外伤也突然肿、热？','是整圈胀、反复积液，还是伸屈确实受阻？有没有发热或其他关节同时不适？'],
};
for(const [id,[core,probe]]of Object.entries(prompts))patch(id,{...(core?{Core_Prompt:core}:{}),Optional_Probe:probe});
patch('QG-AF-R-010-3',{Assessment_Help:'中足扭伤后足底瘀斑、明显肿胀或负重困难，需优先医学评估骨性与跗跖稳定结构；暂缓负重旋转和跳跃测试。',Source_Reference:sources.midfoot});
patch('QG-KNEE-POST-3',{Assessment_Help:'结合膝后包块、关节与肌腱检查；新发单侧小腿明显肿热应先医学评估，不以一次牵拉反应排除血管问题。'});
patch('QG-KNEE-DIFFUSE-3',{Assessment_Help:'结合关节积液、活动受限与全身表现；急性红肿热伴发热、明显负重困难等应先医学评估。'});
function add(id,topic,prompt,probe,purpose,information,help,extra={}){
 additions.push({Guide_ID:id,Topic:topic,Core_Prompt:prompt,Optional_Probe:probe,Question_Purpose:purpose,Information_Gained:information,Assessment_Help:help,
 Scope:'GENERAL',Module_Codes:'KNEE|LOWER_LEG|ANKLE_FOOT|THIGH',Region_IDs:null,Area_IDs:null,Display_Order:1.5,Input_Mode:'Display_Only',Review_Status:'待临床审核',Source_Reference:sources.general,Internal_Note:note,Replaces_Guide_ID:null,...extra});
}
add('QG-PAIN-QUALITY','疼痛性质与分布','这种不舒服是什么感觉？请先用自己的话描述。','描述困难时，可询问酸胀、钝痛、针刺、烧灼、电击、拉扯或卡压等；是否伴麻木、轻碰痛或向其他位置延伸？',
 '了解体验、范围及伴随感觉，减少仅凭疼痛位置推断组织的偏差。','疼痛性质、是否混合出现、放射范围及感觉变化。',
 '结合受力反应选择局部检查；麻、电击或烧灼伴合理分布时补神经筛查。描述本身不能确定神经、肌腱或关节病变。',{Source_Reference:sources.pain});
add('QG-IRRITABILITY','症状多久恢复','最容易不舒服的活动，大概做到什么程度开始？停下来后多久恢复？','当晚或第二天是否比原来更不舒服？有没有休息或睡觉时也痛？可请患者描述能接受的活动范围。',
 '了解症状敏感程度和恢复过程，决定本次评估的起始负荷。','诱发所需活动量、缓解时间、延迟反应及静息表现。',
 '从可耐受、易停止的任务开始，控制重复次数并观察恢复；持续加重或出现异常伴随表现时先调整评估方向。',{Display_Order:2.5});
// Targeted questions replace broader questions, rather than stacking a second interview.
function local(prefix,areas,replaces,rows,source){
 const locations=areas.split('|').map(id=>runtime.clinical_extension.LocationGuide.find(r=>r.Area_ID===id));
 if(locations.some(r=>!r))throw Error(areas);
 rows.forEach(([topic,prompt,probe,purpose,info,help],i)=>add(`QG-${prefix}-${i+1}`,topic,prompt,probe,purpose,info,help,{
  Scope:'LOCATION',Module_Codes:[...new Set(locations.flatMap(r=>r.Module_Codes.split('|')))].join('|'),Area_IDs:areas,Display_Order:20+i,
  Replaces_Guide_ID:replaces[i],Source_Reference:source || original.find(r=>r.Guide_ID===replaces[i].split('|')[0])?.Source_Reference || sources.general,
 }));
}
local('SART','LOC-THIGH-SART',[1,2,3].map(n=>`QG-THIGH-R-001-${n}|QG-THIGH-R-003-${n}${n===2?'|QG-PROVOKE':''}`),[
 ['斜行不适的位置','不适在大腿前内侧哪一段？是否一路延伸到膝下内侧？','能否指出最明显的一处？','分清斜行范围与局部最明显点。','近端、肌腹或远端分布。','分别查看缝匠肌邻近、内收肌群及鹅足；不能仅凭走向锁定一块肌肉。'],
 ['哪些动作会不舒服','抬腿、盘腿、弯膝或上下台阶时，有什么区别？','夹腿与伸直膝盖时也会出现吗？','比较跨髋膝动作与邻近肌群受力。','诱发动作与症状位置是否一致。','对照髋膝组合活动、膝屈与邻近肌群输出。'],
 ['开始经过与伴随表现','是某次跨步、扭转后突然出现，还是逐渐不适？','有无瘀斑、肿胀、麻木或取腱手术史？','补充损伤、手术及感觉背景。','起病机制、手术范围、感觉变化。','急性明显损伤先排完整性；感觉异常按分布补神经检查。'],
]);
local('PES','LOC-KNEE-R-008',[1,2,3].map(n=>`QG-KNEE-MEDIAL-${n}${n===2?'|QG-PROVOKE':''}`),[
 ['膝下内侧的位置','最痛的是膝内侧关节缝，还是往下几厘米的地方？','是表面按压不适、深部疼，还是一片烧灼或麻木？','区分关节线与鹅足附着邻近。','具体位置、深浅感及伴随感觉。','对照鹅足肌腱与滑囊邻近、关节线及必要的感觉检查；位置不能单独确认滑囊炎。'],
 ['上下台阶与屈膝反应','上下台阶、走久、弯膝或从椅子上起身时，哪种更明显？','直接压到膝下内侧时，是否和活动时一样？','比较局部接触与肌腱受力、负重反应。','诱发任务、接触敏感和疼痛一致性。','结合鹅足局部检查、膝屈肌输出与步行或台阶观察。'],
 ['活动变化和受伤经过','最近走跑或台阶量增加了吗？有没有扭伤或撞击？','有无鹅足取腱手术史、局部肿热、卡住或打软？','避免把此处不适一律归于鹅足肌肉。','负荷、手术及关节伴随表现。','关节卡锁或不稳另查关节结构；局部明显红肿热先判断是否需医学评估。'],
],sources.pes);
local('PATELLAR','LOC-KNEE-R-005|LOC-KNEE-PATELLAR-TENDON',[1,2].map(n=>`QG-KNEE-FRONT-${n}${n===2?'|QG-PROVOKE':''}`),[
 ['髌腱附近的位置','痛在髌骨下缘、下面那条腱，还是更深的膝前方？','能否指出一个固定点？跪地与发力时位置相同吗？','分清髌腱、邻近脂肪垫和接触位置。','疼痛最明显点及位置的一致性。','与髌腱局部、伸膝输出及髌下邻近组织对照，不凭压痛确诊。'],
 ['跳跃与伸膝负荷','跳跃、落地、加速、下台阶时，什么时候疼？','热身后、活动后和第二天有什么变化？近期训练有没有增加？','明确伸膝负荷及恢复反应。','动作阶段、负荷变化和延迟反应。','从可耐受伸膝或低负荷动作开始，再决定是否需要更高强度任务。'],
]);
local('ITB','LOC-KNEE-R-012',[1,2].map(n=>`QG-KNEE-LATERAL-${n}${n===2?'|QG-PROVOKE':''}`),[
 ['膝外侧最明显点','最痛在膝外侧稍上方，还是关节缝或膝下的骨头突起？','是固定一点还是沿大腿外侧延伸？','分清髂胫束远端邻近与其他外侧组织。','位置和范围。','分别查看髂胫束邻近、外侧关节线及腓骨头；不凭位置判断摩擦。'],
 ['跑步与重复屈伸','跑步或骑车到什么时间、距离后出现？下坡有不同吗？','停下后多久缓解？近期跑量、坡度或骑车设置是否改变？','明确重复屈伸和负荷背景。','出现阈值、恢复时间及活动变化。','选择可耐受的重复任务观察髋膝控制和症状变化；特殊诱发试验仅作补充。'],
]);
local('FIBHEAD','LOC-KNEE-R-011',[1,2].map(n=>`QG-KNEE-LATERAL-${n}${n===2?'|QG-PROVOKE':''}`),[
 ['腓骨头周围的位置','膝下外侧突起附近痛，还是沿小腿、足背有麻或电击感？','是否跷腿、蹲久或护具压到后出现？','区分局部接触与感觉分布。','骨突、肌腱邻近或远端感觉表现。','结合股二头肌腱、近端胫腓关节及腓总神经筛查。'],
 ['动作与力量变化','弯膝发力、转身或蹲下时会不会疼？','有没有新出现抬脚、伸趾或向外转脚无力？','了解局部受力与远端运动变化。','诱发动作及是否有新发无力。','新发明显远端无力应及时医学评估；无此表现时再对照局部检查。'],
]);
for(const [prefix,area,base,big]of [['TOE-H','LOC-TOE-HALLUX','QG-AF-R-012',true],['TOE-L','LOC-TOE-LESSER','QG-AF-R-011',false]])local(prefix,area,[1,2,3].map(n=>`${base}-${n}${n===2?'|QG-PROVOKE':''}`),[
 ['足趾不适的位置',big?'大脚趾最痛在根部、趾间关节、趾尖还是趾甲旁？':'哪根脚趾、哪个位置最不舒服？根部、关节、趾尖还是趾间？','有无鞋挤压、皮肤破损或麻刺？','防止把所有足趾问题都归入跖趾关节。','具体趾与关节、皮肤或趾间分布。','按部位选择关节活动、屈伸肌腱和感觉检查；皮肤及甲周问题需相应专业处理。'],
 ['鞋内与蹬地反应','穿鞋、赤脚、弯伸脚趾和走路蹬地时有什么区别？','换宽一些的鞋或减少走路后是否改变？','比较挤压、运动及负重。','接触与动作相关性。','核对鞋内空间、足趾活动及支撑，避免只查看前足跖骨头。'],
 ['受伤与外形变化','有没有踢撞、被踩或脚趾被掰到？','是否出现变形、明显肿胀、瘀斑、伤口或突然红热？','了解急性损伤及局部异常。','受伤机制与结构、皮肤变化。','明显变形、开放伤或急性红肿热优先医学评估，不强行活动矫正。'],
]);
// Legacy region-only selections have no unique surface entry for these two regions.
const fallbackIds=[];
for(const [prefix,region]of [['LM','LL-R-003'],['LPM','LL-R-007']])for(const row of original.filter(r=>r.Guide_ID.startsWith(`QG-${prefix}-`))){
 const id=`${row.Guide_ID}-REGION`;
 additions.push({...row,...updates[row.Guide_ID],Guide_ID:id,Scope:'REGION',Region_IDs:region,Area_IDs:null,Internal_Note:note});
 fallbackIds.push(id);
}
for(const id of ['QG-LM-LOCATION','QG-LPM-LOCATION'])patch(id,{Replaces_Guide_ID:fallbackIds.join('|')});
// Keep provenance and the user's goal-to-capacity wording intact.
for(const [id,value]of Object.entries(updates)){
 const before=original.find(r=>r.Guide_ID===id);
 value.Internal_Note=[before.Internal_Note,note].filter(Boolean).join('\n');
 if(value.Source_Reference && value.Source_Reference!==before.Source_Reference)value.Source_Reference=[before.Source_Reference,value.Source_Reference].filter(Boolean).join('\n');
}
await fs.writeFile('knowledge/review/consultation_review_v1.json',JSON.stringify({date:'2026-10-03',updates,additions},null,2)+'\n');
await fs.writeFile('knowledge/review/consultation_review_disposition.json',JSON.stringify({date:'2026-10-03',scope:'101 existing consultation records; teaching content and routing review, not independent clinical validation',records:original.map(r=>({id:r.Guide_ID,action:updates[r.Guide_ID]?'corrected':'retained',fields:Object.keys(updates[r.Guide_ID]||{}),reason:updates[r.Guide_ID]?'Improve wording, scope, replacement or assessment boundaries as recorded in cell diff.':'Prompt, purpose, information and assessment direction are specific enough; no tissue diagnosis or treatment is inferred from history alone.'})),new_ids:additions.map(r=>r.Guide_ID)},null,2)+'\n');
console.log({reviewed:original.length,updated:Object.keys(updates).length,added:additions.length});
