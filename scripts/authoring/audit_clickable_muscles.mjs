/** Exhaustive source/identity check plus geometric screening, NOT an anatomical certification. */
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import * as T from 'three';
import { computeBoundsTree } from 'three-mesh-bvh';

const bundled=await build({entryPoints:['src/content/muscle-anatomy.ts'],bundle:true,write:false,format:'esm'});
const {getMuscleAnatomy,muscleKey,getMuscleDisplayName}=await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const reviewBundle=await build({entryPoints:['src/content/muscle-model-review.ts'],bundle:true,write:false,format:'esm'});
const {muscleModelObservation}=await import(`data:text/javascript;base64,${Buffer.from(reviewBundle.outputFiles[0].text).toString('base64')}`);
const selectionBundle=await build({entryPoints:['src/muscle-selection.ts'],bundle:true,write:false,format:'esm'});
const {muscleSelectionParts}=await import(`data:text/javascript;base64,${Buffer.from(selectionBundle.outputFiles[0].text).toString('base64')}`);
const manual=fs.existsSync('docs/MUSCLE_SHAPE_REVIEW.json')?JSON.parse(fs.readFileSync('docs/MUSCLE_SHAPE_REVIEW.json')):null;
const root='baseline/RehabMind_LowerLimbV1_ImplementationBaseline_DBv3.7_2026-09-29/04_3D_Localization/model/';
const atlas=JSON.parse(fs.readFileSync(root+'atlas_metadata.json'));
const meta=JSON.parse(fs.readFileSync('public/3d/skin.json'));
const chunks=new Map();
function sourceGeometry(part){
  if(!chunks.has(part.chunk))chunks.set(part.chunk,gunzipSync(fs.readFileSync(root+`chunks/body-${part.chunk}.bin.gz`)));
  const raw=chunks.get(part.chunk);
  const positions=raw.subarray(part.positions,part.positions+part.vertexCount*12);
  const indexBytes=raw.subarray(part.indices,part.indices+part.indexCount*4);
  const coords=new Float32Array(positions.buffer.slice(positions.byteOffset,positions.byteOffset+positions.byteLength));
  const indices=new Uint32Array(indexBytes.buffer.slice(indexBytes.byteOffset,indexBytes.byteOffset+indexBytes.byteLength));
  return {positions,indices,indexBytes,coords};
}
const sourceById=new Map(atlas.parts.map(p=>[p.id,p]));
const packed=gunzipSync(fs.readFileSync('public/3d/muscles.pack'));
const buf=packed.buffer.slice(packed.byteOffset,packed.byteOffset+packed.byteLength);
const prodIndices=new Uint32Array(buf,meta.muscles.indices,meta.muscles.indexCount);
const bones=meta.bones.parts.map(p=>{
  const original=sourceById.get(p.id),source=sourceGeometry(original);
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(source.coords,3));geo.setIndex(new T.BufferAttribute(source.indices,1));geo.computeBoundingBox();
  computeBoundsTree.call(geo,{indirect:true});
  return {part:p,geo,key:muscleKey(p.name)};
});
// Broad bone families named in the text. This does not locate a tubercle, facet,
// tendon footprint, digit-specific insertion or the appropriate vertebral level.
const families=[
  [/肩胛|喙突|盂[上下]|冈[上下]窝/,/scapula/], [/肱骨|大结节|小结节/,/^humerus$/],
  [/锁骨/,/^clavicle$/], [/桡骨/,/^radius$/], [/尺骨|鹰嘴|冠突/,/^ulna$/],
  [/髂|耻骨|坐骨|髋臼|闭孔/,/^hip bone$/], [/股骨|转子|粗线|收肌结节/,/^femur$/],
  [/髌骨/,/^patella$/], [/胫骨/,/^tibia$/], [/腓骨/,/^fibula$/], [/跟骨/,/^calcaneus$/],
  [/跖骨/,/metatarsal bone/], [/掌骨/,/metacarpal bone/], [/趾骨/,/phalanx of .+toe/], [/指骨/,/phalanx of (?:.*finger|thumb)$/],
  [/楔骨/,/cuneiform bone/], [/骰骨/,/cuboid bone/], [/舟骨/,/(scaphoid|navicular bone of foot)/],
  [/大多角骨/,/^trapezium$/], [/小多角骨/,/^trapezoid$/], [/头状骨/,/^capitate$/], [/钩骨/,/^hamate$/], [/豌豆骨/,/^pisiform$/],
  [/寰椎/,/^atlas$/], [/枢椎/,/^axis$/], [/颈椎/,/cervical vertebra/], [/胸椎/,/thoracic vertebra/], [/腰椎/,/lumbar vertebra/],
  [/骶骨|骶尾/,/^sacrum$/], [/枕骨|项线|枕外隆凸/,/^occipital bone$/], [/乳突|颞骨/,/^temporal bone$/],
  [/肋|胸骨|剑突/,/(rib$|sternum|manubrium|xiphoid)/],
];
const point=new T.Vector3();
function contacts(coords,text,side,medialOnly=false){
  const patterns=families.filter(([words])=>words.test(text)).map(([,pattern])=>pattern);
  const candidates=bones.filter(b=>(!b.part.side||!side||b.part.side===side)&&patterns.some(pattern=>pattern.test(b.key)));
  const results=[];
  for(const bone of candidates){
    let best=Infinity,at=null,target=null;
    for(let i=0;i<coords.length;i+=3){
      point.fromArray(coords,i);if(medialOnly&&Math.abs(point.x)>.012)continue;
      if(bone.geo.boundingBox.distanceToPoint(point)>best)continue;
      const hit=bone.geo.boundsTree.closestPointToPoint(point,{});
      if(hit&&hit.distance<best){best=hit.distance;at=point.toArray();target=hit.point.toArray();}
    }
    if(Number.isFinite(best))results.push({boneId:bone.part.id,bone:bone.part.name,sampledDistanceMm:+(best*1000).toFixed(2),musclePoint:at,bonePoint:target});
  }
  return results.sort((a,b)=>a.sampledDistanceMm-b.sampledDistanceMm).slice(0,8);
}
let offset=0;
const rows=[];
for(const part of meta.muscles.parts){
  // Adapted assets have their own source-bound registration/attachment review.
  // This audit compares the unchanged baseline BodyParts3D vertices only.
  if(part.id.startsWith('ZA-'))continue;
  const original=sourceById.get(part.id);if(!original)throw Error('Missing source '+part.id);
  const source=sourceGeometry(original),start=offset;offset+=original.vertexCount;
  const facts=getMuscleAnatomy(part.name);if(!facts)continue;
  const packedPos=packed.subarray(meta.muscles.positions+start*12,meta.muscles.positions+offset*12);
  const indices=prodIndices.subarray(part.firstFace*3,(part.firstFace+part.faceCount)*3);
  const same=packedPos.equals(source.positions)&&indices.length===source.indices.length&&indices.every((value,i)=>value-start===source.indices[i]);
  if(!same||(part.sourceName??part.name)!==original.name||(part.sourceConceptId??part.conceptId)!==original.conceptId)throw Error('Changed identity or source geometry '+part.id);
  const flags=[];
  if(part.correctionReason)flags.push('源左右侧标签错误：已按同侧手骨及网格坐标校正，保留原始标签');
  if(/set of|^spinalis$/i.test(muscleKey(part.name)))flags.push('集合网格：不能验证为单块肌肉');
  if(/韧带|筋膜|腱膜|关节囊|肌腱|支持带|跟腱|髂胫束|指背|趾背|共同.*腱/.test(facts.origin+' '+facts.insertion))flags.push('含软组织附着：单看骨骼不能判定完整性');
  const origin=contacts(source.coords,facts.origin,part.side),insertion=contacts(source.coords,facts.insertion,part.side);
  if(!origin.length)flags.push('起点非骨性或未能自动对应：需人工核对');
  if(!insertion.length)flags.push('止点非骨性或未能自动对应：需人工核对');
  if(origin.length&&origin[0].sampledDistanceMm>20)flags.push('起点骨面距离筛查异常：需核对腱性路径');
  if(insertion.length&&insertion[0].sampledDistanceMm>20){
    const commonAchilles=/gastrocnemius|^soleus$/.test(muscleKey(part.name))&&meta.tendons?.parts.some(p=>p.side===part.side);
    const combined=muscleSelectionParts(meta.muscles.parts,part).length>1;
    flags.push(commonAchilles?'单片未达跟骨：已恢复同侧共同跟腱显示':part.sharedDistal?'单片未达止点：单独显示已补充原资源的远端连接段':combined?'单片未达指骨：已组合该肌肉的另一源网格':'止点骨面距离筛查异常：需核对腱性路径');
  }
  const hash=createHash('sha256').update(source.positions).update(source.indexBytes).digest('hex');
  const shapeReview=manual?.rows.find(p=>p.id===part.id&&p.sourceGeometrySha256===hash);
  const selectionParts=muscleSelectionParts(meta.muscles.parts,part).map(p=>p.id);
  if(selectionParts.length>1)flags.push('单独显示已组合多个同肌网格：单片的骨面距离不代表整个肌肉缺失');
  rows.push({id:part.id,conceptId:part.conceptId,name:part.name,sourceName:original.name,sourceConceptId:original.conceptId,key:muscleKey(part.name),displayName:getMuscleDisplayName(part.name,part.displayName),side:part.side,
    sourceIdentity:'exact',sourceGeometrySha256:hash,
    facts,originContacts:origin,insertionContacts:insertion,flags,
    attachmentStatus:'未进行逐骨性标志的解剖认证',shapeReview:shapeReview?{status:shapeReview.status,sheet:shapeReview.sheet,cell:shapeReview.cell}:null,
    modelObservation:muscleModelObservation(part.name),selectionParts,
    ...(part.sharedDistal?{sharedDistal:{donorId:part.sharedDistal.donorId,faceCount:part.sharedDistal.faces.length,status:part.sharedDistal.status}}:{}),
  });
}
const names=[...new Set(rows.map(p=>p.key))];
const report={schema:1,source:atlas.version,clickableParts:rows.length,muscleNames:names.length,sourceIdentityFailures:0,
  visuallyScreenedParts:rows.filter(p=>p.shapeReview).length,
  method:'全部可点选网格与原始顶点及三角面逐项对比；文案骨名对应和肌肉顶点到骨面距离筛查。距离不是起止点验证，未标记解剖足印。',rows};
fs.mkdirSync('build',{recursive:true});fs.mkdirSync('public/design-preview/attachments',{recursive:true});
fs.writeFileSync('public/design-preview/attachments/audit.json',JSON.stringify(report));
fs.writeFileSync('build/clickable-muscle-audit.json',JSON.stringify(report,null,2));
const escape=value=>String(value).replaceAll('|','／').replaceAll('\n',' ');
const table=['# 可点选肌肉全量静态核查清单','',`范围：${rows.length} 个可点选网格、${names.length} 个去侧别名称。集合网格可能包含多块肌肉。`,'',report.method,'',
  '所有源身份与顶点／三角面比对通过。**这不代表所有起止点已通过解剖验证。** 未见明显筛查异常的条目也仍需足印标注后才能确认。','',
  `已逐张查看 ${report.visuallyScreenedParts} 个源网格的双视角外形（肌腹位置、走向、明显缺尾、集合形态）。记录绑定源几何哈希，几何改变后不会沿用本次状态。`,
  '', '已修正：恢复独立跟腱；组合指浅屈肌、尺侧腕伸肌的同侧源网格；校正拇短屈肌左右显示标签，源编号与 FMA 编号保留。',
  '', '已恢复：左右髂胫束、胫腓骨间膜、前臂骨间膜、足底长韧带，共 8 个源连接组织；与共同跟腱合计 10 个。保持源几何与身份，支持点选、独立查看和同侧肌肉关联。髂胫束从骨骼绘制中排除重复，原骨骼资源不变。详见 CONNECTIVE_MODEL_RECOVERY.md。',
  '', '已补充显示：肱二头肌短头、尺侧腕屈肌尺骨头的原资源远端连接段。肱二头肌接缝附近为连续曲面修正、共用边界和法线、颜色渐变；该过渡之外及靠骨端保持原形。尺侧腕屈肌沿用裁切与收拢。均为教学显示参考，不代表真实精细腱束。',
  '', '用户复核大小菱形肌连接点正确，保留原模型；此前用邻近椎骨推断起点不准确，已撤销。仍待精细标注：股直肌近端分头、共享腱束及集合网格。', '',
  '股直肌近端已按单独记录的髂前下棘／髋臼上缘骨面修正两处分支；下方肌腹和远端保留，可关闭示意查看原形。修正形态不代表完整足印或真实精细腱束。详见 RECTUS_PROXIMAL_SCHEMATIC.md。', '',
  '| 名称 | 源部件（左右均核查） | 起点 | 止点 | 实际模型核查记录 | 筛查发现 | 依据 |','|---|---|---|---|---|---|---|'];
for(const key of names){const group=rows.filter(p=>p.key===key),p=group[0];table.push(`| ${escape(p.displayName.replace(/^[左右]侧 · /,''))} | ${group.map(p=>p.id).join('、')} | ${escape(p.facts.origin)} | ${escape(p.facts.insertion)} | ${escape(p.modelObservation||'双视角肌腹位置与大体走向粗核完成；精细足印未认证')} | ${escape([...new Set(group.flatMap(p=>p.flags))].join('；')||'未见粗筛异常；足印未认证')} | [参考](${p.facts.source}) |`);}
fs.writeFileSync('docs/CLICKABLE_MUSCLE_AUDIT.md',table.join('\n')+'\n');
console.log(JSON.stringify({parts:rows.length,names:names.length,identityFailures:0,distanceFlags:rows.filter(p=>p.flags.some(f=>f.includes('距离筛查异常'))).map(p=>({id:p.id,name:p.name,origin:p.originContacts[0]?.sampledDistanceMm,insertion:p.insertionContacts[0]?.sampledDistanceMm})),rhomboids:rows.filter(p=>/rhomboid/.test(p.key)).map(p=>({id:p.id,medial:p.medialSpineContacts}))},null,2));
