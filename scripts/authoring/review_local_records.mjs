import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root='C:/Users/26259/Desktop/ai资料';
const files=(await fs.readdir(root,{withFileTypes:true})).filter(f=>f.isFile()&&f.name.endsWith('.txt')).map(f=>f.name).sort();
const rows=[];
const topics={extension:/膝.*(?:伸直|伸膝).*受限|(?:伸直|伸膝).*受限/,flexion:/屈膝.*受限|屈曲.*受限/,rotation:/胫骨.*旋.*受限|胫骨.*活动.*受限/,patella:/髌骨.*活动.*(?:差|低|受限)/,quad:/股内斜肌.*(?:弱|无力)|vmo.*(?:弱|无力)|末端.*(?:无力|发力)/i};
const lowerTopics={
  ankle_df:/背屈.*(?:受限|差|低)|(?:踝|距骨).*活动度.*(?:受限|差|低)/,
  ankle_ev:/外翻.*(?:受限|差|弱|无力)/,
  fibular:/腓骨.*(?:卡|活动度|受限)|胫腓.*(?:受限|差)/,
  calf:/小腿.*(?:紧|酸|胀|痛)|腓肠肌.*紧|小腿三头肌.*紧/,
  foot:/跟腱|足底|跟骨|骰骨|内踝|外踝|足弓/,
  thigh:/股(?:外侧|直|内侧)肌.*(?:紧|弱|痛)|腘绳肌.*(?:紧|弱|痛)|大腿.*(?:紧|痛|受限)/,
  hip:/髋.*(?:内旋|外旋|后伸|外展).*(?:受限|差|弱|无力)/,
};
const methods=/松解|松动|MET|激活|拉伸|超声|贴扎|贴布|compex|筋膜刀|电刺激|神经.*(?:滑动|松动)|提踵|臀桥|分腿蹲|弹力带.*(?:外翻|背屈)/i;
const manifests=[];
for(const file of files){
  const bytes=await fs.readFile(path.join(root,file));
  let content,encoding='utf-8';try{content=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{content=new TextDecoder('gb18030',{fatal:true}).decode(bytes);encoding='gb18030';}
  const sha256=createHash('sha256').update(bytes).digest('hex'),id=`LR-${sha256.slice(0,12)}`;
  const lines=content.split(/\r?\n/);
  manifests.push({id,sha256,encoding,line_count:lines.length,file});
  let starts=[0];
  for(let i=1;i<lines.length;i++)if(/^\s*\d+[.．]\s*[^0-9].{0,25}$/.test(lines[i])||/^\s*\d{4}[.\/-]\d{1,2}[.\/-]\d{1,2}/.test(lines[i]))starts.push(i);
  starts.push(lines.length);
  for(let part=0;part<starts.length-1;part++){
    const from=starts[part],to=starts[part+1],block=lines.slice(from,to);
    if(!/膝|腘肌|股内斜|股外侧肌|vmo|踝|小腿|大腿|足底|跟腱|髋/i.test(block.join('\n')))continue;
    const observations=block.map((text,j)=>({line:from+j+1,text:text.trim()})).filter(r=>r.text&&!methods.test(r.text)&&Object.values({...topics,...lowerTopics}).some(p=>p.test(r.text)));
    if(!observations.length)continue;
    const treatments=block.map((text,j)=>({line:from+j+1,text:text.trim()})).filter(r=>r.text&&methods.test(r.text));
    rows.push({source_id:id,start_line:from+1,end_line:to,topics:Object.entries({...topics,...lowerTopics}).filter(([,p])=>observations.some(r=>p.test(r.text))).map(([k])=>k),observations,treatments});
  }
}
await fs.mkdir('knowledge/review',{recursive:true});
// The source index stays local and is not part of the generated runtime or page.
await fs.writeFile('knowledge/review/local_record_sources.private.json',JSON.stringify({root,files:manifests},null,2)+'\n');
await fs.writeFile('build/authoring/local_record_candidates.json',JSON.stringify(rows,null,2)+'\n');
const ext=rows.filter(r=>r.topics.includes('extension'));
const methodTopics={vastus:/股外侧肌.*松解/,popliteus:/腘肌.*松解/,hamstrings:/腘绳肌.*(?:松解|MET|拉伸)/i,calf:/小腿三头肌.*松解|腓肠肌.*(?:松解|拉伸)/,joint:/膝关节.*松动/,patellar:/髌骨.*松动/,quad:/股内斜肌.*激活|vmo.*(?:激活|compex)/i};
console.log(JSON.stringify({files_read:files.length,lower_limb_candidates:rows.length,extension_candidates:ext.length,extension_cooccurrence:Object.fromEntries(Object.entries(methodTopics).map(([k,p])=>[k,ext.filter(r=>r.treatments.some(t=>p.test(t.text))).length]))}));
for(const key of ['vastus','popliteus','hamstrings','joint','quad']){
  console.log(JSON.stringify({key,examples:ext.filter(r=>r.treatments.some(t=>methodTopics[key].test(t.text))).slice(0,5).map(r=>({source_id:r.source_id,span:[r.start_line,r.end_line],observations:r.observations.filter(o=>topics.extension.test(o.text)).map(o=>({line:o.line,text:o.text})),methods:r.treatments.filter(t=>methodTopics[key].test(t.text))}))}));
}
for(const [key,pattern] of Object.entries(lowerTopics)){
  const candidates=rows.filter(r=>r.topics.includes(key));
  console.log(JSON.stringify({topic:key,candidates:candidates.length,examples:candidates.filter(r=>r.treatments.length).slice(0,4).map(r=>({source_id:r.source_id,span:[r.start_line,r.end_line],observations:r.observations.filter(o=>pattern.test(o.text)),methods:r.treatments.filter(t=>/踝|腓骨|距骨|胫腓|小腿|腓肠|比目鱼|跟腱|足底|骰骨|跟骨|股外侧|股直|腘绳|外翻|髋|臀|胫骨.*肌|提踵/i.test(t.text)).slice(0,10)}))}));
}
