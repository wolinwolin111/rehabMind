import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {CSS2DObject,CSS2DRenderer} from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type {SkinData} from './localization';
import {getBoneDisplayName} from './content/bone-names';
import {muscleModelObservation} from './content/muscle-model-review';
import {selectedMuscleGeometry} from './muscle-selection';
import {getTendonAnatomy,tendonVisible,type TendonPart} from './content/tendon-anatomy';
import rectusSchematic from './content/rectus-proximal-schematic.json';
import {rectusTissueColors} from './rectus-tissue-color';
import {muscleMaterial,muscleSurfaceCoordinates,softenAbdominalNormals} from './muscle-surface';
import './attachment-preview.css';
import {getMuscleAnatomy} from './content/muscle-anatomy';

interface Row {id:string;name:string;sourceName:string;conceptId:string;displayName:string;key:string;side:string;sourceGeometrySha256:string;facts:{origin:string;insertion:string;action:string;source:string;note?:string};flags:string[];shapeReview:{status:string}|null;connectiveKind?:string;sharedDistal?:{donorId:string;faceCount:number;status:string};medialSpineContacts?:{bone:string;sampledDistanceMm:number}[]}
interface Audit {clickableParts:number;muscleNames:number;visuallyScreenedParts:number;rows:Row[];method:string}
interface Scene {renderer:T.WebGLRenderer;scene:T.Scene;camera:T.PerspectiveCamera;controls:OrbitControls;muscle:T.Mesh;bones:{mesh:T.Mesh;box:T.Box3;name:string}[];connective:{mesh:T.Mesh;part:TendonPart;box:T.Box3}[];spineLabels:CSS2DObject[];rectusLabels:{label:CSS2DObject;muscleId:string}[];positions:T.BufferAttribute;normals:T.BufferAttribute;indices:Uint32Array;meta:SkinData}
function App(){
  const host=useRef<HTMLDivElement>(null),view=useRef<Scene|null>(null);
  const [audit,setAudit]=useState<Audit|null>(null),[ready,setReady]=useState(false),[id,setId]=useState(new URLSearchParams(location.search).get('part')||'FJ1536');
  const [error,setError]=useState(''),[search,setSearch]=useState(''),[showBones,setShowBones]=useState(true),[complete,setComplete]=useState(true);
  const [closeup,setCloseup]=useState(false);
  const [bellyCloseup,setBellyCloseup]=useState(false);
  const [showGrain,setShowGrain]=useState(true);
  const [showSchematic,setShowSchematic]=useState(rectusSchematic.status==='anatomical_schematic_not_verified_tendon_or_footprint');
  const [transparentHip,setTransparentHip]=useState(false);
  const current=audit?.rows.find(p=>p.id===id);
  useEffect(()=>{
    const controller=new AbortController();let disposed=false,frame=0,dispose=()=>{};
    const get=async(path:string)=>{const r=await fetch(path,{signal:controller.signal,cache:'no-cache'});if(!r.ok)throw Error(`资源载入失败：${path}`);return r;};
    const unpack=async(path:string)=>{const r=await get(path);return new Response(r.body!.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();};
    (async()=>{
      const [data,meta,m,b,c]=await Promise.all([(await get('./audit.json')).json(),(await get('/3d/skin.json')).json(),unpack('/3d/muscles.pack'),unpack('/3d/bones.pack'),unpack('/3d/tendons.pack')]) as [Audit,SkinData,ArrayBuffer,ArrayBuffer,ArrayBuffer];
      if(disposed)return;
      const imported=(meta.muscles.parts||[]).filter(p=>p.id.startsWith('ZA-'));
      data.clickableParts+=imported.length;data.muscleNames+=new Set(imported.map(p=>p.name.replace(/\b(left|right)\s+/gi,''))).size;
      for(const part of imported){
        const facts=getMuscleAnatomy(part.name);if(!facts)continue;
        data.rows.push({id:part.id,name:part.name,sourceName:part.name,conceptId:part.conceptId,displayName:part.displayName,key:part.name.toLowerCase().replace(/\b(left|right)\b\s*/g,''),side:part.side,sourceGeometrySha256:'',facts:{...facts,source:facts.source||'https://github.com/LluisV/Z-Anatomy-Sample'},flags:['Z-Anatomy 补充网格；已做骨架配准和附着区域核查。模型为教学用途，未验证个体肌腱足印。',...(part.name.includes('multifidus lumborum')?['骶骨端另补教学肌束；原有腰椎附着保留。']:[])],shapeReview:{status:'registered_teaching_model'}});
      }
      for(const part of meta.tendons?.parts||[]){
        const facts=getTendonAnatomy(part.name);if(!facts)continue;
        data.rows.push({id:part.id,name:part.name,sourceName:part.name,conceptId:part.conceptId,displayName:part.displayName,key:part.name.toLowerCase().replace(/\b(left|right)\b\s*/g,''),side:part.side,sourceGeometrySha256:part.sourceGeometrySha256||'',connectiveKind:part.kind||'tendon',facts:{origin:facts.connection,insertion:facts.attachment,action:facts.function,source:facts.source,note:facts.note},flags:[part.id.startsWith('ZA-')?'Z-Anatomy 连接组织；已配准至当前骨架，宽面边界为教学表达，未验证逐纤维附着足印。':'保留原资源的顶点、法线和三角面；未生成推测的附着足印。'],shapeReview:part.id.startsWith('ZA-')?{status:'registered_teaching_model'}:null});
      }
      setAudit(data);
      function geometry(buffer:ArrayBuffer,info:{vertexCount:number;positions:number;normals:number;indices:number;indexCount:number}){const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(buffer,info.positions,info.vertexCount*3),3));g.setAttribute('normal',new T.BufferAttribute(new Int16Array(buffer,info.normals,info.vertexCount*3),3,true));g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,info.indices,info.indexCount),1));return g;}
      const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;host.current!.append(renderer.domElement);
      const scene=new T.Scene();scene.background=new T.Color('#fbf7ef');scene.add(new T.HemisphereLight('#ffffff','#819bae',2));const light=new T.DirectionalLight('#ffffff',2.5);light.position.set(-1,2,1);scene.add(light);
      const camera=new T.PerspectiveCamera(35,1,.001,10),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.06;controls.maxDistance=3;controls.touches.TWO=T.TOUCH.DOLLY_PAN;
      const labels=new CSS2DRenderer();labels.domElement.style.cssText='position:absolute;inset:0;pointer-events:none';host.current!.append(labels.domElement);
      const spineLabels:CSS2DObject[]=[];
      const rectusLabels=rectusSchematic.parts.flatMap(part=>part.heads.map(head=>{
        const tag=document.createElement('span');tag.textContent=head.head==='direct'?'髂前下棘 · 直头':'髋臼上缘 · 反折头';tag.style.cssText=`font:600 12px sans-serif;padding:3px 6px;margin-left:${head.head==='direct'?-150:150}px;background:#fbf7ef;color:#355779;border:1px solid ${head.head==='direct'?'#edc989':'#90afde'};border-radius:4px`;
        const label=new CSS2DObject(tag);label.position.fromArray(head.boneAnchor.point);label.visible=false;scene.add(label);return {label,muscleId:part.muscleId};
      }));
      const muscle=new T.Mesh(geometry(m,meta.muscles),[new T.MeshStandardMaterial({color:'#6f9986',side:T.DoubleSide,roughness:.75}),new T.MeshStandardMaterial({color:'#edc989',side:T.DoubleSide,roughness:.75}),new T.MeshStandardMaterial({color:'#90afde',side:T.DoubleSide,roughness:.75})]);muscle.frustumCulled=false;muscle.geometry.setDrawRange(0,0);scene.add(muscle);
      const vertebrae:Record<string,string>={FJ3170:'C6',FJ3172:'C7',FJ3158:'T1',FJ3160:'T2',FJ3163:'T3',FJ3166:'T4',FJ3169:'T5',FJ3171:'T6'};
      const bones=(meta.bones.parts||[]).filter(p=>getBoneDisplayName(p.name)).map(p=>{const geo=geometry(b,meta.bones);geo.setDrawRange(p.firstFace*3,p.faceCount*3);const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({color:'#dcd4bf',side:T.DoubleSide,roughness:.8}));mesh.frustumCulled=false;scene.add(mesh);const box=new T.Box3(),positions=geo.getAttribute('position'),indices=geo.index!.array,tip=new T.Vector3(0,0,Infinity);for(let i=p.firstFace*3;i<(p.firstFace+p.faceCount)*3;i++){const point=new T.Vector3().fromBufferAttribute(positions,indices[i]);box.expandByPoint(point);if(Math.abs(point.x)<.008&&point.z<tip.z)tip.copy(point);}if(vertebrae[p.id]&&Number.isFinite(tip.z)){const tag=document.createElement('span');tag.textContent=vertebrae[p.id];tag.title=getBoneDisplayName(p.name)!;tag.style.cssText='font:600 12px sans-serif;padding:2px 5px;margin-right:42px;background:#fbf7ef;color:#355779;border:1px solid #90afde;border-radius:4px';const label=new CSS2DObject(tag);label.position.copy(tip);label.visible=false;scene.add(label);spineLabels.push(label);}return{mesh,box,name:p.name};});
      const connective=(meta.tendons?.parts||[]).map(part=>{
        const geo=geometry(c,meta.tendons!);geo.setDrawRange(part.firstFace*3,part.faceCount*3);
        const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({color:'#edc989',side:T.DoubleSide,roughness:.75}));mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);
        const box=new T.Box3(),positions=geo.getAttribute('position'),indices=geo.index!.array;
        for(let i=part.firstFace*3;i<(part.firstFace+part.faceCount)*3;i++)box.expandByPoint(new T.Vector3().fromBufferAttribute(positions,indices[i]));
        return {mesh,part,box};
      });
      view.current={renderer,scene,camera,controls,muscle,bones,connective,spineLabels,rectusLabels,positions:muscle.geometry.getAttribute('position') as T.BufferAttribute,normals:muscle.geometry.getAttribute('normal') as T.BufferAttribute,indices:muscle.geometry.index!.array as Uint32Array,meta};
      const resize=()=>{const w=host.current!.clientWidth,h=host.current!.clientHeight;renderer.setSize(w,h);labels.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(host.current!);resize();
      const animate=()=>{if(disposed)return;frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);labels.render(scene,camera);};animate();setReady(true);
      dispose=()=>{observer.disconnect();controls.dispose();muscle.geometry.dispose();muscle.material.forEach(m=>m.dispose());[...bones,...connective].forEach(({mesh})=>{mesh.geometry.dispose();(mesh.material as T.Material).dispose();});renderer.dispose();renderer.domElement.remove();labels.domElement.remove();view.current=null;};
    })().catch(e=>{if(!disposed)setError(String(e));});
    return()=>{disposed=true;controller.abort();cancelAnimationFrame(frame);dispose();};
  },[]);
  useEffect(()=>{
    const v=view.current,part=v?.meta.muscles.parts?.find(p=>p.id===id),tissue=v?.connective.find(p=>p.part.id===id);if(!v||(!part&&!tissue)||!current)return;
    const selection=tissue?{indices:(tissue.mesh.geometry.index!.array as Uint32Array).slice(tissue.part.firstFace*3,(tissue.part.firstFace+tissue.part.faceCount)*3),positions:tissue.mesh.geometry.getAttribute('position').array as Float32Array,clipped:false}:complete||current.key==='rectus femoris'?selectedMuscleGeometry(v.indices,v.positions.array as Float32Array,v.meta.muscles.parts||[],part!,{proximalSchematic:showSchematic}):{indices:v.indices.slice(part!.firstFace*3,(part!.firstFace+part!.faceCount)*3),positions:v.positions.array as Float32Array,clipped:false};
    const shownPositions=new T.BufferAttribute(selection.positions,3);
    v.muscle.geometry.setAttribute('position',shownPositions);
    v.muscle.geometry.setIndex(new T.BufferAttribute(selection.indices,1));v.muscle.geometry.setDrawRange(0,selection.indices.length);
    if(selection.clipped){v.muscle.geometry.deleteAttribute('normal');v.muscle.geometry.computeVertexNormals();}
    else v.muscle.geometry.setAttribute('normal',tissue?tissue.mesh.geometry.getAttribute('normal'):v.normals);
    const tissueBlend='tendonBlend' in selection&&selection.tendonBlend instanceof Float32Array?selection.tendonBlend:undefined;
    (v.muscle.material as T.MeshStandardMaterial[]).forEach(material=>material.dispose());
    const materials=['#6f9986','#edc989','#90afde'].map(color=>muscleMaterial({color,side:T.DoubleSide},showGrain&&!tissue));
    v.muscle.material=materials;
    if(part){
      const parts='parts' in selection?selection.parts:[{...part,firstFace:0,faceCount:selection.indices.length/3}];
      if(showGrain)softenAbdominalNormals(v.muscle.geometry,parts);
      v.muscle.geometry.setAttribute('muscleSurface',new T.BufferAttribute(muscleSurfaceCoordinates(selection.positions,selection.indices,parts),4));
    }else v.muscle.geometry.deleteAttribute('muscleSurface');
    if(tissueBlend)v.muscle.geometry.setAttribute('color',new T.BufferAttribute(rectusTissueColors(tissueBlend,'#6f9986'),3));
    else v.muscle.geometry.deleteAttribute('color');
    materials.forEach((material,i)=>{
      material.vertexColors=!!tissueBlend;material.color.set(tissueBlend?'#ffffff':['#6f9986','#edc989','#90afde'][i]);material.needsUpdate=true;
    });
    v.muscle.geometry.clearGroups();
    if('parts' in selection)for(const range of selection.parts)v.muscle.geometry.addGroup(range.firstFace*3,range.faceCount*3,range.schematicHead==='reflected'?2:range.schematicHead==='direct'||range.sourceSegmentOf?1:0);
    else v.muscle.geometry.addGroup(0,selection.indices.length,0);
    const box=new T.Box3();for(const index of selection.indices)box.expandByPoint(new T.Vector3().fromBufferAttribute(shownPositions,index));
    for(const related of v.connective){related.mesh.visible=!!part&&complete&&tendonVisible(related.part,[],{muscle:part});if(related.mesh.visible)box.union(related.box);}
    const padded=box.clone().expandByScalar(.07);v.bones.forEach(({mesh,box,name})=>{mesh.visible=showBones&&padded.intersectsBox(box)&&(current.key!=='rectus femoris'||/hip bone|femur|patella/i.test(name)&&name.toLowerCase().startsWith(current.side+' '));const material=mesh.material as T.MeshStandardMaterial;material.transparent=transparentHip&&current.key==='rectus femoris'&&/hip bone/i.test(name);material.opacity=material.transparent?.32:1;material.depthWrite=!material.transparent;});
    v.rectusLabels.forEach(({label,muscleId})=>{label.visible=showSchematic&&id===muscleId;});
    v.spineLabels.forEach(label=>{label.visible=showBones&&/rhomboid/.test(current.key);});
    const focus=box.clone();
    if(bellyCloseup&&part){
      const size=box.getSize(new T.Vector3()).toArray(),axis=size.indexOf(Math.max(...size));
      const center=box.getCenter(new T.Vector3()).toArray()[axis],belly=new T.Box3();
      for(const index of selection.indices){const point=new T.Vector3().fromBufferAttribute(shownPositions,index);if(Math.abs(point.toArray()[axis]-center)<size[axis]*.08)belly.expandByPoint(point);}
      if(!belly.isEmpty())focus.copy(belly);
    }
    if(closeup&&part?.sharedDistal){
      const seam=new T.Box3();for(const index of selection.indices){const point=new T.Vector3().fromBufferAttribute(shownPositions,index);if(Math.abs(point.y-part.sharedDistal.cutoffY)<.02)seam.expandByPoint(point);}
      if(!seam.isEmpty())focus.copy(seam);
    }
    if(closeup&&current.key==='rectus femoris'){
      const proximal=new T.Box3();for(const index of selection.indices){const point=new T.Vector3().fromBufferAttribute(shownPositions,index);if(point.y>box.max.y-.07)proximal.expandByPoint(point);}
      if(!proximal.isEmpty())focus.copy(proximal).expandByScalar(.01);
    }
    const center=focus.getCenter(new T.Vector3()),size=focus.getSize(new T.Vector3());v.controls.target.copy(center);
    const posterior=/rhomboid|trapezius|splenius|spinalis|longissimus|iliocostalis|semispinalis|rotator|gastrocnemius|soleus|latissimus|multifidus|quadratus lumborum|thoracolumbar/.test(current.key);
    const distance=Math.max(size.x,size.y,size.z,.055)*2.45;
    v.camera.position.copy(center).add(new T.Vector3(0,.04*distance,posterior?-distance:distance));v.controls.update();
    if(closeup&&current.key==='rectus femoris'){
      const sign=current.side==='left'?1:-1;
      const proximal=rectusSchematic.parts.find(p=>p.muscleId===id)!;
      const originY=Math.max(...proximal.heads.map(h=>h.boneAnchor.point[1]));
      const viewStartY=proximal.body.fork[1]-.01;
      const span=originY-viewStartY,scale=span*2.45/Math.hypot(.045,.015,.28);
      // The close-up is for inspecting the adjoining heads and bone contacts.
      // The whole-muscle view retains the complete gradual belly taper.
      v.controls.target.set(sign*.11,(originY+viewStartY)/2,.006);
      v.camera.position.copy(v.controls.target).add(new T.Vector3(sign*.045,.015,.28).multiplyScalar(scale));v.controls.update();
    }
  },[ready,id,current,showBones,complete,closeup,bellyCloseup,showSchematic,transparentHip,showGrain]);
  return <main className="attachment-review">
    <label style={{display:'inline-flex',alignItems:'center',gap:7,marginBottom:12}}><input type="checkbox" checked={showGrain} onChange={e=>setShowGrain(e.target.checked)}/>显示细化肌理</label>
    {current&&!current.connectiveKind&&<button onClick={()=>{setBellyCloseup(v=>!v);setCloseup(false);}} aria-pressed={bellyCloseup}>{bellyCloseup?'显示整块肌肉':'肌腹放大'}</button>}
    {(current?.sharedDistal||current?.key==='rectus femoris')&&<button onClick={()=>{setCloseup(v=>!v);setBellyCloseup(false);}} aria-pressed={closeup}>{closeup?'显示整块肌肉':current?.key==='rectus femoris'?'近端放大':'连接处放大'}</button>}
    {current?.sharedDistal&&<p style={{fontSize:13,lineHeight:1.8,marginBottom:12}}>{/^FJ1512M?$/.test(current.id)?'绿色肌腹渐变为米白肌腱，接缝附近经过连续曲面过渡；骨端连接保留。':'绿色：原肌头；浅杏色：关联远端补段，接缝经过裁切与收拢。'}仅为显示参考。取消“补齐源资源中的关联结构”可查看原单片。</p>}
    {current?.key==='rectus femoris'&&<p style={{fontSize:13,lineHeight:1.8,marginBottom:12}}>绿色肌腹渐变为米白肌腱，两头下段贴合，交界保留尖角；直头接髂前下棘，反折头接髋臼上缘。近端为教学形态修正，可关闭修正查看原模型；未验证精细附着范围。</p>}
    <header><span className="eyebrow">RehabMind · 全量肌肉核查</span><h1>把肌肉放回骨骼上核对。</h1><p>{audit?`${audit.clickableParts} 个可点选网格，${audit.muscleNames} 个去侧别名称；${audit.visuallyScreenedParts} 个已完成双视角外形粗核。`:'正在加载清单…'}肌腹位置和大体走向的检查，不能替代逐个附着面的解剖确认。</p></header>
    <div className="review-controls"><a href="./index.html">附着结构样例 ↗</a><input aria-label="搜索肌肉" placeholder="搜索中文或英文肌肉名" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="选择核查肌肉" value={id} onChange={e=>setId(e.target.value)}>{audit?.rows.filter(p=>p.id===id||`${p.displayName} ${p.name}`.toLowerCase().includes(search.toLowerCase())).map(p=><option key={p.id} value={p.id}>{p.displayName} · {p.id}</option>)}</select><label><input type="checkbox" checked={showBones} onChange={e=>setShowBones(e.target.checked)}/>显示周围骨骼</label><label><input type="checkbox" checked={complete} onChange={e=>setComplete(e.target.checked)}/>补齐源资源中的关联结构</label>{current?.key==='rectus femoris'&&<label><input type="checkbox" checked={showSchematic} onChange={e=>setShowSchematic(e.target.checked)}/>显示股直肌近端修正</label>}{current?.key==='rectus femoris'&&<label><input type="checkbox" checked={transparentHip} onChange={e=>setTransparentHip(e.target.checked)}/>骨盆半透明</label>}</div>
    <nav className="trial-tabs">{[['FJ1536','大菱形肌'],['FJ1537','小菱形肌'],['FJ1469','拇短屈肌'],['FJ1499','指浅屈肌'],['FJ1512','肱二头肌短头'],['FJ1518','尺侧腕屈肌尺骨头'],['FJ1433','股直肌'],['FJ1423','髂胫束'],['FJ1392','胫腓骨间膜'],['FJ1476','前臂骨间膜'],['FJ1424','足底长韧带']].map(([part,label])=><button key={part} aria-pressed={id===part} onClick={()=>setId(part)}>{label}</button>)}</nav>
    <section className="model-card"><h2>{current?.displayName||'源网格核查'}<small>拖动旋转 · 双指缩放／移动 · {current?.id.startsWith('ZA-')?'补充模型 · 骨架配准':showSchematic&&current?.key==='rectus femoris'?'肌腹保留，近端为教学形态修正':complete&&current?.sharedDistal?'骨端保留，接缝为显示过渡':'源网格未变形'}</small></h2><div className="model-host" style={{height:'52dvh',minHeight:340,maxHeight:620}}><div ref={host} style={{position:'absolute',inset:0}}/>{(!ready||error)&&<span className="loading">{error||'载入模型…'}</span>}</div></section>
    {current&&<section className="review-detail"><div><h2>{current.connectiveKind?'连接组织说明':'标准解剖描述'}</h2><dl><dt>{current.connectiveKind?'组织关联':'起点'}</dt><dd>{current.facts.origin}</dd><dt>{current.connectiveKind?'主要连接':'止点'}</dt><dd>{current.facts.insertion}</dd><dt>功能</dt><dd>{current.facts.action}</dd></dl><a href={current.facts.source} target="_blank" rel="noreferrer">查看解剖依据 ↗</a></div><aside><h3>当前模型的核查记录</h3><p>{(current.connectiveKind?current.facts.note:muscleModelObservation(current.name)||current.facts.note)||'已完成源身份、完整性和双视角外形粗核；尚未逐个骨性标志确认附着足印，不能视为全部起止点准确。'}</p><ul>{current.flags.map(f=><li key={f}>{f}</li>)}</ul><small>源部件 {current.id} · {current.conceptId}<br/>原始名称：{current.sourceName}</small>{current.medialSpineContacts&&<p>内侧边缘靠近的椎骨（筛查）：{current.medialSpineContacts.slice(0,4).map(p=>`${getBoneDisplayName(p.bone)} ${p.sampledDistanceMm} mm`).join('、')}。接近不等于附着。</p>}</aside></section>}
    <footer>完整清单见 docs/CLICKABLE_MUSCLE_AUDIT.md。股直肌新增连接为教学示意，与原资源恢复分开标识；康复思路数据库未改动。</footer>
  </main>;
}
const root=createRoot(document.getElementById('root')!);
root.render(<App/>);
// This standalone entry is re-evaluated by Vite when authoring data changes.
// Unmount its prior scene before creating the next root and WebGL renderer.
if(import.meta.hot)import.meta.hot.dispose(()=>root.unmount());
