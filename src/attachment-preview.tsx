import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AtlasTapTracker } from './atlas-gesture';
import { getMuscleAnatomy, getMuscleDisplayName } from './content/muscle-anatomy';
import { getBoneDisplayName } from './content/bone-names';
import './attachment-preview.css';

interface Part { id:string; conceptId:string; name:string; key:string; side:'left'|'right'|''; role:'bone'|'muscle'|'tendon'; positions:number[]; indices:number[]; sourceGeometrySha256:string }
interface ReviewData { source:string; meshes:Part[]; recovered:string[] }
type Trial = 'achilles' | 'rectus' | 'rhomboid';
interface View { renderer:T.WebGLRenderer; scene:T.Scene; camera:T.PerspectiveCamera; controls:OrbitControls; meshes:T.Mesh[]; markers:T.Group; host:HTMLDivElement }
const calf = new Set(['tibia','fibula','talus','calcaneus','soleus','medial head of gastrocnemius','lateral head of gastrocnemius','calcaneal tendon']);
const thigh = new Set(['hip bone','femur','patella','rectus femoris']);
const shoulder = new Set(['scapula','rhomboid major','rhomboid minor','sixth cervical vertebra','seventh cervical vertebra', ...['first','second','third','fourth','fifth','sixth'].map(n=>`${n} thoracic vertebra`)]);
const labels = (p:Part) => p.role === 'tendon' ? `${p.side === 'right' ? '右侧' : '左侧'} · 跟腱` : p.role === 'bone' ? getBoneDisplayName(p.name) || p.name : getMuscleDisplayName(p.name,p.name);

function Preview() {
  const hosts = [useRef<HTMLDivElement>(null),useRef<HTMLDivElement>(null)];
  const views = useRef<View[]>([]);
  const [data,setData] = useState<ReviewData | null>(null);
  const [error,setError] = useState('');
  const [trial,setTrial] = useState<Trial>('achilles');
  const [side,setSide] = useState<'right'|'left'>('right');
  const [selected,setSelected] = useState<Part | null>(null);
  const [includeMuscles,setIncludeMuscles] = useState(true);
  const [closeup,setCloseup] = useState(false);
  const [calibrating,setCalibrating] = useState(false);
  const [anchors,setAnchors] = useState<Record<string, {x:number;y:number;z:number;partId:string;faceIndex:number}>>({});
  const [anchorLabel,setAnchorLabel] = useState('髂前下棘 · 直头附着');
  const trialRef = useRef(trial); trialRef.current=trial;
  const calibrationRef = useRef(calibrating); calibrationRef.current=calibrating;
  const anchorLabelRef = useRef(anchorLabel); anchorLabelRef.current=anchorLabel;
  const anchorKey = `${side}:${anchorLabel}`;

  useEffect(()=> { const controller=new AbortController(); fetch('/3d/attachment-trial.json',{signal:controller.signal,cache:'no-cache'}).then(r=> {if(!r.ok) throw Error('核对资源未生成');return r.json();}).then(setData).catch(e=> {if(!controller.signal.aborted)setError(String(e));});return()=>controller.abort(); },[]);
  useEffect(()=> {
    if(!data) return;
    let disposed=false,frame=0;
    const disposers:(()=>void)[]=[];
    const next:View[]=[];
    hosts.forEach((ref,column)=> {
      const host=ref.current!;
      const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
      renderer.domElement.dataset.column=String(column);host.append(renderer.domElement);
      const scene=new T.Scene();scene.background=new T.Color('#fbf7ef');scene.add(new T.HemisphereLight(0xffffff,0x96a9b5,2.3));
      const light=new T.DirectionalLight(0xffffff,2.4);light.position.set(-.5,1,1);scene.add(light);
      const camera=new T.PerspectiveCamera(34,1,.005,10);
      const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=.13;controls.maxDistance=3;controls.touches.TWO=T.TOUCH.DOLLY_PAN;
      const markers=new T.Group();scene.add(markers);
      const meshes:T.Mesh[]=[];
      for(const part of data.meshes) {
        const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(part.positions,3));geo.setIndex(part.indices);geo.computeVertexNormals();
        const color=part.role==='bone'?'#dcd4bf':part.role==='tendon'?'#edc989':'#91c5a4';
        const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({color,roughness:.78,side:T.DoubleSide}));mesh.userData.part=part;scene.add(mesh);meshes.push(mesh);
      }
      const view={renderer,scene,camera,controls,meshes,markers,host};next.push(view);
      const resize=()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();};
      const observer=new ResizeObserver(resize);observer.observe(host);resize();
      const tracker=new AtlasTapTracker();
      const down=(e:PointerEvent)=>tracker.down(e.pointerId,e.clientX,e.clientY,performance.now());
      const move=(e:PointerEvent)=>tracker.move(e.pointerId,e.clientX,e.clientY);
      const cancel=(e:PointerEvent)=>tracker.cancel(e.pointerId);
      const up=(e:PointerEvent)=> {
        if(!tracker.up(e.pointerId,e.clientX,e.clientY,performance.now()))return;
        const rect=renderer.domElement.getBoundingClientRect();const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);
        const hits=ray.intersectObjects(meshes.filter(m=>m.visible));
        const hit=calibrationRef.current&&trialRef.current==='rectus' ? hits.find(h=>(h.object.userData.part as Part).key==='hip bone') : hits[0];
        if(!hit || hit.faceIndex==null)return;
        const part=hit.object.userData.part as Part;setSelected(part);
        if(calibrationRef.current&&trialRef.current==='rectus') {
          const key=`${part.side}:${anchorLabelRef.current}`;
          setAnchors(current=>({...current,[key]:{x:hit.point.x,y:hit.point.y,z:hit.point.z,partId:part.id,faceIndex:hit.faceIndex!}}));
        }
      };
      renderer.domElement.addEventListener('pointerdown',down,true);renderer.domElement.addEventListener('pointermove',move,true);renderer.domElement.addEventListener('pointerup',up,true);renderer.domElement.addEventListener('pointercancel',cancel,true);
      disposers.push(()=>{observer.disconnect();controls.dispose();for(const [name,handler] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel]] as const)renderer.domElement.removeEventListener(name,handler,true);for(const mesh of meshes){mesh.geometry.dispose();(mesh.material as T.Material).dispose();}renderer.dispose();renderer.domElement.remove();});
    });
    let syncing=false;
    next.forEach((view,i)=>{const mirror=()=>{if(syncing)return;syncing=true;const other=next[1-i];other.camera.position.copy(view.camera.position);other.camera.quaternion.copy(view.camera.quaternion);other.controls.target.copy(view.controls.target);other.controls.update();syncing=false;};view.controls.addEventListener('change',mirror);disposers.push(()=>view.controls.removeEventListener('change',mirror));});
    views.current=next;
    const animate=()=>{if(disposed)return;frame=requestAnimationFrame(animate);next.forEach(v=>{v.controls.update();v.renderer.render(v.scene,v.camera);});};animate();
    return()=>{disposed=true;cancelAnimationFrame(frame);next.forEach(v=>v.markers.children.forEach(m=>{const mesh=m as T.Mesh;mesh.geometry?.dispose();(mesh.material as T.Material)?.dispose();}));disposers.forEach(f=>f());views.current=[];};
  },[data]);
  useEffect(()=> {
    views.current.forEach((view,column)=> {
      const groups=trial==='achilles'?calf:trial==='rectus'?thigh:shoulder;
      for(const mesh of view.meshes) {
        const part=mesh.userData.part as Part;
        mesh.visible=(!part.side||part.side===side)&&groups.has(part.key)&&(part.role!=='tendon'||column===1)&&(part.role!=='muscle'||includeMuscles)&&
          (trial!=='rectus'||!calibrating||part.key==='hip bone')&&
          (trial!=='rhomboid'||part.role!=='muscle'||part.key===(column===0?'rhomboid major':'rhomboid minor'));
        (mesh.material as T.MeshStandardMaterial).color.set(part.id===selected?.id?'#16826b':part.role==='bone'?'#dcd4bf':part.role==='tendon'?'#edc989':'#91c5a4');
      }
      for(const old of [...view.markers.children]){view.markers.remove(old);(old as T.Mesh).geometry.dispose();((old as T.Mesh).material as T.Material).dispose();}
      if(trial==='rectus'&&column===1)for(const [name,point] of Object.entries(anchors)) {
        if(!name.startsWith(side+':'))continue;
        const marker=new T.Mesh(new T.SphereGeometry(.003,16,12),new T.MeshBasicMaterial({color:'#e2a560',depthTest:false}));marker.position.set(point.x,point.y,point.z);marker.renderOrder=10;view.markers.add(marker);
      }
    });
  },[data,trial,side,selected,includeMuscles,anchors,calibrating]);
  useEffect(()=> {
    const sign=side==='right'?-1:1;
    views.current.forEach(v=>{
      const center=trial==='achilles'?new T.Vector3(sign*.068,closeup?.10:.25,-.03):trial==='rhomboid'?new T.Vector3(sign*.05,1.38,-.075):new T.Vector3(sign*.096,calibrating?.933:closeup?.94:.73,-.005);
      v.controls.target.copy(center);
      v.camera.position.copy(center).add(trial==='achilles'?new T.Vector3(sign*(closeup?.07:.14),.02,closeup?-.48:-.95):trial==='rhomboid'?new T.Vector3(sign*.02,.015,closeup?-.47:-.70):calibrating?new T.Vector3(sign*.18,.025,.09):new T.Vector3(sign*(closeup?.12:.24),.03,closeup?.45:1.25));v.controls.update();
    });
  },[data,trial,side,closeup,calibrating]);
  const facts=selected?.role==='muscle'?getMuscleAnatomy(selected.name):null;
  function downloadAnchors(){const payload={status:'draft_requires_anatomical_review',source:data?.source,trial:'rectus femoris origins',anchors};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='rectus-origin-review.json';a.click();URL.revokeObjectURL(url);}
  return <main className="attachment-review">
    <header><span className="eyebrow">RehabMind · 本地解剖核对</span><h1>肌腹、肌腱与骨面，连起来看。</h1><p>先核对常用运动肌肉的附着关系。两侧模型视角同步，可以拖动、缩放和点选组织。</p></header>
    <nav className="trial-tabs" aria-label="核对样例"><button aria-pressed={trial==='achilles'} onClick={()=>{setTrial('achilles');setCloseup(false);setSelected(null);setCalibrating(false);}}>小腿三头肌 · 跟腱</button><button aria-pressed={trial==='rectus'} onClick={()=>{setTrial('rectus');setCloseup(true);setSelected(null);}}>股直肌 · 近端起点</button><button aria-pressed={trial==='rhomboid'} onClick={()=>{setTrial('rhomboid');setCloseup(true);setSelected(null);setCalibrating(false);}}>大小菱形肌 · 原始模型</button><a href="./audit.html">全部可点选肌肉核查 ↗</a><div className="side-switch"><button aria-pressed={side==='right'} onClick={()=>{setSide('right');setSelected(null);}}>右侧</button><button aria-pressed={side==='left'} onClick={()=>{setSide('left');setSelected(null);}}>左侧</button></div></nav>
    <div className="review-controls"><label><input type="checkbox" checked={includeMuscles} onChange={e=>setIncludeMuscles(e.target.checked)}/>显示肌肉</label><button aria-pressed={closeup} onClick={()=>setCloseup(v=>!v)}>{closeup?'恢复整体观察':'附着处放大'}</button><span>{trial==='achilles'?'右图补回原始资源中的跟腱，形态与坐标保持原样。':trial==='rhomboid'?'左图大菱形肌、右图小菱形肌；两图均保留原始网格。':'两图均为当前原始网格；右图支持记录待核对的骨面位置。'}</span></div>
    <div className="review-models">{hosts.map((ref,i)=><section className="model-card" key={i}><h2>{trial==='rhomboid'?(i===0?'大菱形肌 · 当前源形态':'小菱形肌 · 当前源形态'):i===0?'原显示方式':trial==='achilles'?'补回原始跟腱':'起点位置核对'}<small>{trial==='rhomboid'?'骨骼＋单块肌肉 · 同步旋转':i===0?'骨骼＋肌肉':trial==='achilles'?'骨骼＋肌肉＋跟腱':'骨面标记需解剖复核'}</small></h2><div className="model-host" ref={ref}>{!data&&!error&&<span className="loading">正在载入核对模型…</span>}{error&&<span className="loading">{error}</span>}</div></section>)}</div>
    <section className="review-detail"><div><span className="eyebrow">{selected?'已选择组织':'点击模型查看'}</span>
      <h2>{selected?labels(selected):trial==='achilles'?'腓肠肌、比目鱼肌 → 跟腱 → 跟骨':trial==='rhomboid'?'书籍与模型的附着范围对照':'股直肌的两处近端附着'}</h2>
      {facts?<dl><dt>起点</dt><dd>{facts.origin}</dd><dt>止点</dt><dd>{facts.insertion}</dd><dt>功能</dt><dd>{facts.action}</dd></dl>:<p>{trial==='rhomboid'?'《基础肌动学》第65页将大小菱形肌合并描述为C7–T5棘突及项韧带，止于肩胛骨内侧缘。用户核对原模型后确认连接点正确，保留原形态。':trial==='achilles'?'跟腱承接腓肠肌和比目鱼肌，附着于跟骨后面。跟腱是独立结构，不能归成某一块肌肉的专属肌腱。':'直头来自髂前下棘；反折头来自髋臼上缘及邻近关节囊。原模型将股直肌保存为一块网格，没有单独的肌头与附着面标识。'}</p>}
      {selected&&<small className="identity">原始部件 {selected.id} · {selected.conceptId}</small>}</div>
      <aside><h3>{trial==='achilles'?'已验证的补回方式':trial==='rhomboid'?'保留原始模型':'模型仍需修正的部分'}</h3><p>{trial==='rhomboid'?'标准解剖中，大菱形肌起于T2–T5，小菱形肌起于C7–T1及下部项韧带。合并描述与分开描述可以兼容，本轮不调整大小菱形肌模型。':trial==='achilles'?'从原始连接组织层取回左右跟腱。保留原始顶点、三角面、左右侧与组织编号，可以作为独立组织点选。':'先在骨面确认髂前下棘和髋臼上缘，再检查近端腱的路径与附着范围。这里的标记是人工核对草稿，不代表已重建肌腱。'}</p>
      <a href={trial==='achilles'?'https://anatomy.ttuhscep.edu/schemes/leg_tables.html':trial==='rhomboid'?'https://anatomy.ttuhscep.edu/schemes/back_tables.html':'https://pubmed.ncbi.nlm.nih.gov/24793210/'} target="_blank" rel="noreferrer">查看解剖依据 ↗</a></aside></section>
    {trial==='rectus'&&<section className="calibration"><div><h3>骨面位置记录</h3><p>选择名称，开启标记后仅显示髋骨，轻点骨性标志。可旋转模型从不同方向核对。</p></div><select aria-label="待核对起点" value={anchorLabel} onChange={e=>setAnchorLabel(e.target.value)}><option>髂前下棘 · 直头附着</option><option>髋臼上缘 · 反折头附着</option></select><button aria-pressed={calibrating} onClick={()=>setCalibrating(v=>!v)}>{calibrating?'结束标记':'在骨面标记'}</button><button disabled={!Object.keys(anchors).length} onClick={downloadAnchors}>导出核对草稿</button><output>{anchors[anchorKey]?`当前已记录 · ${anchors[anchorKey].partId} · 骨面 ${anchors[anchorKey].faceIndex} · 坐标 ${[anchors[anchorKey].x,anchors[anchorKey].y,anchors[anchorKey].z].map(v=>v.toFixed(6)).join(', ')}`:'当前尚未记录'}</output></section>}
    <footer>此页用于局部可行性核对。肌腱补回不改既有区域定位与康复思路数据库。</footer>
  </main>;
}

const root=createRoot(document.getElementById('root')!);root.render(<Preview/>);
if(import.meta.hot)import.meta.hot.dispose(()=>root.unmount());
