import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { acceleratedRaycast, computeBoundsTree } from 'three-mesh-bvh';
import { chooseGestureRegion, decodeSurfaceAtlas, localizeFace, type LocalizedHit, type SkinData, type SurfaceAtlas } from './localization';
import { muscleAtFace, type MusclePart } from './muscle-picking';
import { muscleSelectionParts, visibleMuscleColors, usesFittedMuscleDisplay } from './muscle-selection-display';
import {decodePreparedModel} from './prepared-model';
import {modelBuffer,modelMetadata} from './model-resources';
import {rectusTissueColors} from './rectus-tissue-color';
import { sampleGesture } from './gesture-sampling';
import { MuscleAnatomyCard } from './MuscleAnatomyCard';
import { musclePeelSteps, visibleMuscleParts } from './content/muscle-layers';
import { getMuscleDisplayName } from './content/muscle-anatomy';
import { getBoneDisplayName } from './content/bone-names';
import { AtlasTapTracker } from './atlas-gesture';
import { displayedAtlasSelection, ATLAS_CAMERA, type AtlasSelection } from './atlas-view';
import { muscleMaterial, muscleSurfaceCoordinates, softenAbdominalNormals } from './muscle-surface';
import { tendonVisible, excludeConnectiveBoneParts, type TendonPart } from './content/tendon-anatomy';

type Mode = 'view' | 'mark' | 'muscle';
interface Props { onSelect?: (hit: LocalizedHit) => void; selectedName?: string; selectionFooter?: ReactNode; purpose?: 'region' | 'muscle'; active?: boolean }
interface Sample { x: number; y: number }
type Layer = 'bones' | 'muscles' | 'skin';
type LayerSettings = Record<Layer, { visible: boolean; opacity: number }>;
// Display controls have been removed. Both views use the same anatomy layers,
// independent of settings saved by older versions or a fresh APK installation.
const MODEL_LAYERS: LayerSettings = { bones: { visible: true, opacity: 100 }, muscles: { visible: true, opacity: 100 }, skin: { visible: false, opacity: 0 } };

function applyLayer(mesh: T.Mesh, settings: LayerSettings[Layer]) {
  mesh.visible = settings.visible && settings.opacity > 0;
  const material = mesh.material as T.MeshStandardMaterial;
  const transparent = settings.opacity < 100;
  if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
  material.opacity = settings.opacity / 100;
  material.depthWrite = !transparent;
  material.forceSinglePass = true;
}

function geometry(buffer: ArrayBuffer, info: { vertexCount: number; positions: number; normals: number; indices: number; indexCount: number }) {
  const result = new T.BufferGeometry();
  result.setAttribute('position', new T.BufferAttribute(new Float32Array(buffer, info.positions, info.vertexCount * 3), 3));
  result.setAttribute('normal', new T.BufferAttribute(new Int16Array(buffer, info.normals, info.vertexCount * 3), 3, true));
  result.setIndex(new T.BufferAttribute(new Uint32Array(buffer, info.indices, info.indexCount), 1));
  return result;
}

export function AnatomyStage({ onSelect, selectedName, selectionFooter, purpose = 'region', active = true }: Props) {
  const muscleExplorer = purpose === 'muscle';
  const renderRequestedRef=useRef(true);
  renderRequestedRef.current=true;
  const activeRef = useRef(active);
  activeRef.current = active;
  const hostRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    renderer: T.WebGLRenderer; camera: T.PerspectiveCamera; skin: T.Mesh; visibleSkin: T.Mesh; bones: T.Mesh; marker: T.Mesh; raycaster: T.Raycaster; extras: T.Mesh[];
    metadata: SkinData; surfaceAtlas: SurfaceAtlas; scene: T.Scene; muscles: T.Mesh | null; muscleHighlight: T.Mesh | null;
    muscleIndices?: Uint32Array; musclePositions?:Float32Array; muscleNormals?:T.BufferAttribute; pickingParts?: MusclePart[]; highlightParts?: MusclePart[]; bonePickingParts?:MusclePart[]; boneHighlight: T.Mesh; tendonMeshes:T.Mesh[];
  } | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const onSelectRef = useRef(onSelect);
  const [mode, setMode] = useState<Mode>(muscleExplorer ? 'muscle' : 'mark');
  const modeRef = useRef<Mode>(muscleExplorer ? 'muscle' : 'mark');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tip, setTip] = useState('尚未选择位置');
  const layers = MODEL_LAYERS;
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const [muscleLoading, setMuscleLoading] = useState(false);
  const [muscleError, setMuscleError] = useState('');
  const [muscleAttempt, setMuscleAttempt] = useState(0);
  const [sourceReady,setSourceReady]=useState(false);
  const selectionBuilderRef=useRef<typeof import('./muscle-selection').selectedMuscleGeometry|null>(null);
  const [appliedLayers,setAppliedLayers]=useState(0);
  const [tendonLoading,setTendonLoading] = useState(false);
  const [tendonError,setTendonError] = useState('');
  const [tendonAttempt,setTendonAttempt] = useState(0);
  const [selectedMuscle, setSelectedMuscle] = useState<MusclePart | null>(null);
  const [selectedBone, setSelectedBone] = useState<MusclePart | null>(null);
  const [selectedTendon,setSelectedTendon] = useState<TendonPart|null>(null);
  const [muscleTip, setMuscleTip] = useState('点击可见肌肉');
  const [removedLayers, setRemovedLayers] = useState(0);
  const [muscleSolo, setMuscleSolo] = useState(false);
  const [soloSelection,setSoloSelection]=useState<AtlasSelection|null>(null);
  const isolatedMuscle = muscleExplorer && muscleSolo && !!soloSelection;
  const displayed=displayedAtlasSelection({muscle:selectedMuscle,bone:selectedBone,tendon:selectedTendon},isolatedMuscle?soloSelection:null);
  const displayedMuscle=displayed.muscle,displayedBone=displayed.bone;
  const atlasTapRef = useRef<(x:number,y:number) => void>(() => {});
  onSelectRef.current = onSelect;

  useEffect(() => {
    let alive = true;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    let controls: OrbitControls | undefined;
    const host = hostRef.current;
    if (!host) return;
    async function setup() {
      const [metadata,buffer,boneBuffer,semanticBuffer] = await Promise.all([
        modelMetadata<SkinData>(),modelBuffer('skin.pack'),modelBuffer(muscleExplorer?'bones.pack':'home-bones.pack'),modelBuffer('surface_atlas.bin',false),
        modelBuffer(muscleExplorer?'atlas-muscles-0.pack':'home-muscles.pack'),
      ]);
      const surfaceAtlas=decodeSurfaceAtlas(metadata,semanticBuffer,buffer);
      if (!alive || !host) return;

      (T.Mesh.prototype as unknown as { raycast: typeof acceleratedRaycast }).raycast = acceleratedRaycast;
      (T.BufferGeometry.prototype as unknown as { computeBoundsTree: typeof computeBoundsTree }).computeBoundsTree = computeBoundsTree;
      const geo = geometry(buffer, metadata.mesh);
      (geo as T.BufferGeometry & { computeBoundsTree: (options: object) => void }).computeBoundsTree({ indirect: true });
      const boneGeo=muscleExplorer?geometry(boneBuffer,metadata.bones):decodePreparedModel(boneBuffer).geometry;

      const scene = new T.Scene();
      const modelBackground = getComputedStyle(host).getPropertyValue('--model-background').trim() || '#fbf7ef';
      scene.background = new T.Color(modelBackground);
      scene.fog = new T.Fog(modelBackground, 4.8, 8.5);
      const camera = new T.PerspectiveCamera(32, 1, muscleExplorer?ATLAS_CAMERA.near:.01, 12);
      camera.position.set(1.35, 1.06, 3.88);
      camera.lookAt(0, 0.84, 0);
      const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, muscleExplorer?1.8:1.35));
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.domElement.className = 'anatomy-canvas';
      host.appendChild(renderer.domElement);
      scene.add(new T.HemisphereLight(0xffffff, 0x8fa4a0, 2.0));
      const directional = new T.DirectionalLight(0xffffff, 2.3);
      directional.position.set(-0.6, 1.7, 1.8);
      scene.add(directional);
      const bones = new T.Mesh(boneGeo, new T.MeshStandardMaterial({ color: 0xe5dcc2, roughness: 0.79, metalness: 0, side: T.DoubleSide }));
      bones.frustumCulled = false;
      scene.add(bones);
      const skinMaterial = new T.MeshStandardMaterial({ color: 0xc79b7d, roughness: 0.76, metalness: 0, side: T.DoubleSide, transparent: true, opacity: 0.1, depthWrite: false });
      const skin = new T.Mesh(geo, new T.MeshBasicMaterial({ visible: false, side: T.DoubleSide }));
      const visibleSkin = new T.Mesh(new T.BufferGeometry(), skinMaterial);
      visibleSkin.frustumCulled = false;
      visibleSkin.renderOrder = 2;
      scene.add(visibleSkin);
      const extras: T.Mesh[] = [];
      const marker = new T.Mesh(new T.SphereGeometry(0.012, 16, 16), new T.MeshBasicMaterial({ color: '#00698e', depthTest: false }));
      marker.visible = false;
      marker.renderOrder = 10;
      scene.add(marker);
      const raycaster = new T.Raycaster();
      (raycaster as T.Raycaster & { firstHitOnly: boolean }).firstHitOnly = true;
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0.84, 0);
      controls.enablePan = true;
      controls.enableDamping = true;
      controls.dampingFactor = .075;
      controls.minDistance = muscleExplorer?ATLAS_CAMERA.minDistance:.08;
      controls.maxDistance = ATLAS_CAMERA.maxDistance;
      controls.zoomToCursor = true;
      controls.screenSpacePanning = true;
      controls.maxPolarAngle = Math.PI * .97;
      controls.enabled = muscleExplorer || modeRef.current === 'view';
      controls.touches.ONE = T.TOUCH.ROTATE;
      controls.touches.TWO = T.TOUCH.DOLLY_PAN;
      controls.update();
      controlsRef.current = controls;
      const boneHighlightGeometry = new T.BufferGeometry();
      boneHighlightGeometry.setAttribute('position', boneGeo.getAttribute('position'));
      boneHighlightGeometry.setIndex(boneGeo.index);
      boneHighlightGeometry.setDrawRange(0,0);
      const boneHighlight = new T.Mesh(boneHighlightGeometry, new T.MeshBasicMaterial({ color:'#59bd86', side:T.DoubleSide, polygonOffset:true, polygonOffsetFactor:-1, polygonOffsetUnits:-1 }));
      boneHighlight.visible = false; boneHighlight.frustumCulled = false; boneHighlight.renderOrder = 3;
      scene.add(boneHighlight);
      const boneSelection=muscleExplorer?excludeConnectiveBoneParts(boneGeo.index!.array as Uint32Array,metadata.bones.parts||[],metadata.tendons?.parts||[]):{indices:boneGeo.index!.array as Uint32Array,parts:[]};
      boneGeo.setIndex(new T.BufferAttribute(boneSelection.indices,1));
      sceneRef.current = { renderer, camera, skin, visibleSkin, bones, marker, raycaster, extras, metadata, surfaceAtlas, scene, muscles: null, muscleHighlight: null, boneHighlight, bonePickingParts:boneSelection.parts, tendonMeshes:[] };
      applyLayer(bones, layersRef.current.bones);
      applyLayer(visibleSkin, layersRef.current.skin);
      extras.forEach(mesh => applyLayer(mesh, layersRef.current.skin));
      const resize = () => {
        const width = host.clientWidth, height = host.clientHeight;
        renderer.setSize(width, height);
        renderRequestedRef.current=true;
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
        const overlay = overlayRef.current;
        if (overlay) { overlay.width = width * devicePixelRatio; overlay.height = height * devicePixelRatio; }
      };
      observer = new ResizeObserver(resize);
      observer.observe(host);
      resize();
      controls.addEventListener('change',()=>{renderRequestedRef.current=true;});
      const animate=()=>{frame=requestAnimationFrame(animate);if(activeRef.current){const changed=controls?.update();if(changed||renderRequestedRef.current){renderer.render(scene,camera);renderRequestedRef.current=false;}}};
      animate();
      setLoading(false);
    }
    setup().catch(cause => { if (alive) { setError(cause instanceof Error ? cause.message : '3D 定位不可用'); setLoading(false); } });
    // The standalone palette studio updates the canvas along with the surrounding CSS.
    const updateTheme = () => {
      const scene = sceneRef.current?.scene;
      if (!scene || !host) return;
      const color = getComputedStyle(host).getPropertyValue('--model-background').trim() || '#fbf7ef';
      (scene.background as T.Color).set(color);
      renderRequestedRef.current=true;
      if (scene.fog instanceof T.Fog) scene.fog.color.set(color);
    };
    window.addEventListener('rehabmind:themechange', updateTheme);
    return () => {
      alive = false;
      window.removeEventListener('rehabmind:themechange', updateTheme);
      cancelAnimationFrame(frame);
      observer?.disconnect();
      controls?.dispose();
      controlsRef.current = null;
      const current = sceneRef.current;
      if (current) {
        current.skin.geometry.dispose();
        (current.skin.material as T.Material).dispose();
        current.visibleSkin.geometry.dispose();
        (current.visibleSkin.material as T.Material).dispose();
        current.extras.forEach(mesh => { mesh.geometry.dispose(); if (mesh.material !== current.visibleSkin.material) (mesh.material as T.Material).dispose(); });
        current.bones.geometry.dispose();
        current.boneHighlight.geometry.dispose();
        (current.boneHighlight.material as T.Material).dispose();
        (current.bones.material as T.Material).dispose();
        current.muscles?.geometry.dispose();
        (current.muscles?.material as T.Material | undefined)?.dispose();
        current.muscleHighlight?.geometry.dispose();
        (current.muscleHighlight?.material as T.Material | undefined)?.dispose();
        current.marker.geometry.dispose();
        current.tendonMeshes.forEach(mesh=>{mesh.geometry.dispose();(mesh.material as T.Material).dispose();});
        (current.marker.material as T.Material).dispose();
        current.renderer.dispose();
        current.renderer.domElement.remove();
        sceneRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    applyLayer(state.bones, isolatedMuscle ? { visible: true, opacity: 100 } : layers.bones);
    if (isolatedMuscle && displayedBone) state.bones.visible = false;
    applyLayer(state.visibleSkin, layers.skin);
    state.extras.forEach(mesh => applyLayer(mesh, layers.skin));
    if (state.muscles) {
      applyLayer(state.muscles, layers.muscles);
      if (isolatedMuscle) state.muscles.visible = false;
    }
    if (isolatedMuscle) {
      state.visibleSkin.visible = false;
      state.extras.forEach(mesh => { mesh.visible = false; });
    }
    renderRequestedRef.current=true;
  }, [layers, loading, muscleExplorer, isolatedMuscle, muscleLoading, displayedBone]);

  // The full muscle layer is only downloaded when first enabled.
  useEffect(() => {
    const state = sceneRef.current;
    if (loading || !state) return;
    if (!layers.muscles.visible || state.muscles) { setMuscleLoading(false); return; }
    const controller = new AbortController();
    setMuscleLoading(true); setMuscleError('');
    async function loadMuscles() {
      const buffer=await modelBuffer(muscleExplorer?'atlas-muscles-0.pack':'home-muscles.pack');
      if (controller.signal.aborted || sceneRef.current !== state) return;
      const displayed=decodePreparedModel(buffer),muscleGeo=displayed.geometry;
      const mesh = new T.Mesh(muscleGeo, muscleMaterial({ color: 0xb66d59, side: T.DoubleSide },muscleExplorer));
      if(muscleExplorer)(state!.bones.geometry as T.BufferGeometry & { computeBoundsTree: (options: object) => void }).computeBoundsTree({ indirect: true });
      mesh.frustumCulled = false; mesh.renderOrder = 1;
      applyLayer(mesh, layersRef.current.muscles);
      state!.muscles = mesh; state!.scene.add(mesh);
      state!.pickingParts = displayed.parts;
      if(!muscleExplorer)return;
      const highlightGeometry = new T.BufferGeometry();
      highlightGeometry.setAttribute('position', mesh.geometry.getAttribute('position'));
      highlightGeometry.setIndex(mesh.geometry.index);
      highlightGeometry.setDrawRange(0, 0);
      const highlight = new T.Mesh(highlightGeometry, muscleMaterial({ color: '#59bd86', side: T.DoubleSide, transparent: true, opacity: .88, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
      highlight.visible = false; highlight.frustumCulled = false; highlight.renderOrder = 3;
      state!.muscleHighlight = highlight; state!.scene.add(highlight);
    }
    loadMuscles().catch(cause => { if (!controller.signal.aborted) setMuscleError(cause instanceof Error ? cause.message : '肌肉模型载入失败'); })
      .finally(() => { if (!controller.signal.aborted) setMuscleLoading(false); });
    return () => controller.abort();
  }, [layers.muscles.visible, loading, muscleAttempt]);

  useEffect(()=> {
    const state=sceneRef.current,info=state?.metadata.tendons;
    if(!muscleExplorer||loading||!state||!info||state.tendonMeshes.length)return;
    const controller=new AbortController();setTendonLoading(true);setTendonError('');
    async function loadTendons(){
      const buffer=await modelBuffer('tendons.pack');
      if(controller.signal.aborted||sceneRef.current!==state)return;
      for(const part of info!.parts){
        const geo=geometry(buffer,info!);geo.setDrawRange(part.firstFace*3,part.faceCount*3);
        (geo as T.BufferGeometry & {computeBoundsTree:(options:object)=>void}).computeBoundsTree({indirect:true});
        const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({color:'#e9dec3',roughness:.8,side:T.DoubleSide}));
        mesh.userData.part=part;mesh.frustumCulled=false;mesh.visible=false;state!.tendonMeshes.push(mesh);state!.scene.add(mesh);
      }
    }
    loadTendons().catch(cause=>{if(!controller.signal.aborted)setTendonError(cause instanceof Error?cause.message:'连接组织模型载入失败');})
      .finally(()=>{if(!controller.signal.aborted)setTendonLoading(false);});
    return()=>controller.abort();
  },[loading,tendonAttempt]);

  useEffect(()=> {
    const state=sceneRef.current;if(!state)return;
    const muscles=muscleExplorer?visibleMuscleParts(state.metadata.muscles.parts||[],'all',appliedLayers):state.metadata.muscles.parts||[];
    if(selectedTendon&&!isolatedMuscle&&!tendonVisible(selectedTendon,muscles,undefined,appliedLayers))setSelectedTendon(null);
    for(const mesh of state.tendonMeshes){
      const part=mesh.userData.part as TendonPart;
      mesh.visible=layers.muscles.visible&&tendonVisible(part,muscles,isolatedMuscle?displayed:undefined,appliedLayers);
      (mesh.material as T.MeshStandardMaterial).color.set(part.id===selectedTendon?.id?'#59bd86':'#e9dec3');
    }
    renderRequestedRef.current=true;
  },[loading,tendonLoading,appliedLayers,muscleExplorer,isolatedMuscle,displayedMuscle,displayedBone,displayed.tendon,selectedTendon,layers.muscles.visible]);

  useEffect(() => {
    const state=sceneRef.current;
    if(!muscleExplorer||!state?.muscles||removedLayers===appliedLayers)return;
    let alive=true;setMuscleLoading(true);setMuscleError('');
    modelBuffer(`atlas-muscles-${removedLayers}.pack`).then(buffer=>{
      if(!alive||sceneRef.current!==state)return;
      const shown=decodePreparedModel(buffer),old=state.muscles!.geometry;
      state.muscles!.geometry=shown.geometry;state.pickingParts=shown.parts;old.dispose();
      setMuscleLoading(false);
      setAppliedLayers(removedLayers);
      setSelectedMuscle(current=>current&&shown.parts.some(p=>p.id===current.id)?current:null);
    }).catch(error=>{if(alive){setMuscleLoading(false);setMuscleError(error instanceof Error?error.message:'肌肉分层载入失败');}});
    return()=>{alive=false;};
  },[muscleExplorer,loading,removedLayers,appliedLayers,muscleAttempt]);

  // Load original anatomy only when a muscle is selected, for isolated display
  // and the accepted attachment corrections. It does not delay the first view.
  useEffect(()=>{
    const state=sceneRef.current;
    if(!muscleExplorer||!displayedMuscle||!state||state.muscleIndices)return;
    let alive=true;
    Promise.all([modelBuffer('muscles.pack'),import('./muscle-selection')]).then(([buffer,selection])=>{
      if(!alive||sceneRef.current!==state)return;
      const source=geometry(buffer,state.metadata.muscles);
      state.muscleIndices=source.index!.array as Uint32Array;
      state.musclePositions=source.getAttribute('position').array as Float32Array;
      state.muscleNormals=source.getAttribute('normal') as T.BufferAttribute;
      selectionBuilderRef.current=selection.selectedMuscleGeometry;
      setSourceReady(true);
    }).catch(error=>{if(alive)setMuscleError(error instanceof Error?error.message:'解剖细节载入失败');});
    return()=>{alive=false;};
  },[muscleExplorer,displayedMuscle,loading,muscleAttempt]);

  useEffect(() => {
    modeRef.current = mode;
    if (controlsRef.current) controlsRef.current.enabled = muscleExplorer || mode === 'view';
  }, [mode, muscleExplorer]);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state?.muscleHighlight || !state.muscleIndices || !displayedMuscle || !selectionBuilderRef.current) return;
    const selection = selectionBuilderRef.current(state.muscleIndices, state.musclePositions!, state.metadata.muscles.parts || [], displayedMuscle);
    const geo = state.muscleHighlight.geometry;
    geo.setAttribute('position', new T.BufferAttribute(selection.positions,3));
    geo.setIndex(new T.BufferAttribute(selection.indices, 1));
    geo.setDrawRange(0, selection.indices.length);
    geo.computeVertexNormals();
    softenAbdominalNormals(geo,selection.parts);
    geo.setAttribute('muscleSurface',new T.BufferAttribute(muscleSurfaceCoordinates(selection.positions,selection.indices,selection.parts),4));
    const tissueBlend='tendonBlend' in selection?selection.tendonBlend:undefined;
    const material=state.muscleHighlight.material as T.MeshStandardMaterial;
    if(tissueBlend)geo.setAttribute('color',new T.BufferAttribute(rectusTissueColors(tissueBlend,'#59bd86'),3));
    else geo.deleteAttribute('color');
    material.vertexColors=!!tissueBlend;material.color.set(tissueBlend?'#ffffff':'#59bd86');material.needsUpdate=true;
    (geo as T.BufferGeometry & { computeBoundsTree: (options: object) => void }).computeBoundsTree({ indirect: true });
    state.highlightParts = selection.parts;
    renderRequestedRef.current=true;
  }, [displayedMuscle, muscleLoading, loading,sourceReady]);

  // Colour the actually rendered triangles in one pass. A second copy of the
  // complete selected mesh caused z-fighting and reinstated hidden sheath faces.
  useEffect(()=>{
    const state=sceneRef.current;if(!muscleExplorer||!state?.muscles||muscleLoading)return;
    const geo=state.muscles.geometry,pos=geo.getAttribute('position'),indices=geo.index!.array as Uint32Array;
    const members=displayedMuscle&&!isolatedMuscle&&!usesFittedMuscleDisplay(displayedMuscle)?muscleSelectionParts(state.metadata.muscles.parts||[],displayedMuscle):[];
    const colors=visibleMuscleColors(pos.count,indices,state.pickingParts||[],members);
    geo.setAttribute('color',new T.BufferAttribute(colors,3));
    const material=state.muscles.material as T.MeshStandardMaterial;material.vertexColors=true;material.color.set('#ffffff');material.needsUpdate=true;
    renderRequestedRef.current=true;
  },[displayedMuscle,isolatedMuscle,muscleLoading,loading,appliedLayers]);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    state.marker.visible = !muscleExplorer && mode !== 'muscle' && !!selectedName;
    const bone=isolatedMuscle&&displayedBone?displayedBone:selectedBone;
    if(bone)state.boneHighlight.geometry.setDrawRange(bone.firstFace*3,bone.faceCount*3);
    state.boneHighlight.visible = muscleExplorer && !!bone && (isolatedMuscle || (layers.bones.visible && layers.bones.opacity > 0));
    if (state.muscleHighlight) {
      state.muscleHighlight.visible = (muscleExplorer || mode === 'muscle') && !!displayedMuscle && (isolatedMuscle || usesFittedMuscleDisplay(displayedMuscle));
      const material = state.muscleHighlight.material as T.MeshStandardMaterial;
      material.opacity = isolatedMuscle ? 1 : .88;
      material.depthWrite = isolatedMuscle;
    }
    renderRequestedRef.current=true;
  }, [mode, displayedMuscle, displayedBone, selectedBone, layers.muscles, layers.bones, selectedName, muscleExplorer, isolatedMuscle, muscleLoading, loading,sourceReady]);

  useEffect(() => {
    const canvas = sceneRef.current?.renderer.domElement;
    if (!muscleExplorer || loading || !canvas) return;
    const tracker = new AtlasTapTracker();
    const down = (event:PointerEvent) => {
      if (event.button === 0) tracker.down(event.pointerId,event.clientX,event.clientY,event.timeStamp);
    };
    const move = (event:PointerEvent) => tracker.move(event.pointerId,event.clientX,event.clientY);
    const up = (event:PointerEvent) => {
      if (tracker.up(event.pointerId,event.clientX,event.clientY,event.timeStamp)) atlasTapRef.current(event.clientX,event.clientY);
    };
    const cancel = (event:PointerEvent) => tracker.cancel(event.pointerId);
    canvas.addEventListener('pointerdown',down,true);
    canvas.addEventListener('pointermove',move,true);
    canvas.addEventListener('pointerup',up,true);
    canvas.addEventListener('pointercancel',cancel,true);
    return () => {
      canvas.removeEventListener('pointerdown',down,true); canvas.removeEventListener('pointermove',move,true);
      canvas.removeEventListener('pointerup',up,true); canvas.removeEventListener('pointercancel',cancel,true);
    };
  },[muscleExplorer,loading]);

  atlasTapRef.current = (x,y) => {
    const state = sceneRef.current, host = hostRef.current;
    if (!state || !host) return;
    const rect = host.getBoundingClientRect();
    state.raycaster.setFromCamera(new T.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),state.camera);
    const muscleMesh = isolatedMuscle && displayedMuscle ? state.muscleHighlight : state.muscles;
    const boneMesh = isolatedMuscle && displayedBone ? state.boneHighlight : state.bones;
    const hit = state.raycaster.intersectObjects([muscleMesh,boneMesh,...state.tendonMeshes].filter((mesh):mesh is T.Mesh => !!mesh?.visible),false)[0];
    const skinHit = state.visibleSkin.visible && layers.skin.opacity >= 95 ? state.raycaster.intersectObject(state.visibleSkin,false)[0] : null;
    if (!hit || hit.faceIndex == null || (skinHit && skinHit.distance < hit.distance-.0005)) return;
    const tendon=state.tendonMeshes.includes(hit.object as T.Mesh)?hit.object.userData.part as TendonPart:null;
    if(tendon){setSelectedBone(null);setSelectedMuscle(null);setSelectedTendon(tendon);return;}
    const isBone = hit.object === boneMesh;
    const part = muscleAtFace(isBone ? boneMesh===state.boneHighlight?state.metadata.bones.parts||[]:state.bonePickingParts||[] : muscleMesh === state.muscleHighlight ? state.highlightParts || [] : state.pickingParts || [],hit.faceIndex);
    if (!part || (isBone && !getBoneDisplayName(part.name))) return;
    const original = isBone ? state.metadata.bones.parts?.find(p=>p.id===part.id)||part : state.metadata.muscles.parts?.find(p=>p.id === part.id) || part;

    setSelectedTendon(null);
    setSelectedBone(isBone ? original : null);
    setSelectedMuscle(isBone ? null : original);
    if (isBone) state.boneHighlight.geometry.setDrawRange(original.firstFace*3,original.faceCount*3);
  };

  function finishMuscleTap() {
    const points = strokeRef.current;
    strokeRef.current = [];
    const first = points[0], host = hostRef.current, state = sceneRef.current;
    if (!first || !host || !state || points.some(point => Math.hypot(point.x - first.x, point.y - first.y) > 6)) return;
    setSelectedMuscle(null);
    setSelectedTendon(null);

    if (state.muscleHighlight) state.muscleHighlight.visible = false;
    if (!state.muscles?.visible) { setMuscleTip(muscleLoading ? '正在载入肌肉…' : '请开启肌肉显示'); return; }
    state.raycaster.setFromCamera(new T.Vector2(first.x / host.clientWidth * 2 - 1, -(first.y / host.clientHeight) * 2 + 1), state.camera);
    const hit = state.raycaster.intersectObject(state.muscles, false)[0];
    const occluders = [
      ...(state.bones.visible && layers.bones.opacity >= 95 ? [state.bones] : []),
      ...(state.visibleSkin.visible && layers.skin.opacity >= 95 ? [state.visibleSkin, ...state.extras] : []),
    ];
    const occlusion = state.raycaster.intersectObjects(occluders, false)[0];
    const part = hit?.faceIndex !== undefined && !(occlusion && occlusion.distance < hit.distance - .0005)
      ? muscleAtFace(state.pickingParts || state.metadata.muscles.parts || [], hit.faceIndex) : null;
    if (!part) { setMuscleTip('未选中肌肉，可调整视角后重试'); return; }
    const originalPart = state.metadata.muscles.parts?.find(source => source.id === part.id) || part;
    setSelectedMuscle(originalPart);
  }

  function raySample(x: number, y: number) {
    const state = sceneRef.current;
    const host = hostRef.current;
    if (!state || !host) return null;
    const rect = host.getBoundingClientRect();
    const point = new T.Vector2((x - rect.left) / rect.width * 2 - 1, -((y - rect.top) / rect.height * 2 - 1));
    state.raycaster.setFromCamera(point, state.camera);
    const hit = state.raycaster.intersectObject(state.skin, false)[0];
    if (!hit || hit.faceIndex === undefined) return null;
    const localized = localizeFace(state.metadata, state.surfaceAtlas, hit.faceIndex, hit.point);
    return localized ? { ...localized, point: hit.point } : null;
  }

  const strokeRef = useRef<Sample[]>([]);
  function drawStroke() {
    const overlay = overlayRef.current;
    const host = hostRef.current;
    if (!overlay || !host) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    const scale = devicePixelRatio || 1;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    const points = strokeRef.current;
    if (!points.length) return;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.strokeStyle = '#00698e';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.restore();
  }

  function finishStroke() {
    const host = hostRef.current;
    const points = strokeRef.current;
    if (!host || !points.length) return;
    const rect = host.getBoundingClientRect();
    const votes = new Map<string, { hit: LocalizedHit; count: number; position: T.Vector3 }>();
    const add = (point: Sample) => {
      const match = raySample(point.x + rect.left, point.y + rect.top);
      if (!match) return;
      const key = `${match.areaId || match.regionId}:${match.side}`;
      const entry = votes.get(key);
      votes.set(key, { hit: match, count: (entry?.count || 0) + 1, position: match.point });
    };
    const { closed, samples } = sampleGesture(points);
    samples.forEach(add);
    const atlas = sceneRef.current?.metadata.surface_atlas;
    const selected = chooseGestureRegion([...votes.values()], closed, atlas?.gesture_groups, atlas?.entries);
    if (selected) {
      // Place the marker in the chosen region, rather than an unrelated vote leader.
      const exact = [...votes.values()].filter(entry => entry.hit.side === selected.side &&
        (entry.hit.areaId === selected.areaId && !!selected.areaId ||
         entry.hit.regionId === selected.regionId ||
         selected.regionIds?.includes(entry.hit.regionId)));
      const covered = exact.length ? exact : [...votes.values()].filter(entry => entry.hit.side === selected.side && entry.hit.module === selected.module);
      const position = covered.sort((a, b) => b.count - a.count)[0]?.position;
      if (sceneRef.current && position) { sceneRef.current.marker.position.copy(position); sceneRef.current.marker.visible = true; }
      onSelectRef.current?.(selected);
      setTip(`已定位：${selected.displayName}`);
    } else setTip('没有识别到下肢区域，请换个角度再标记');
    strokeRef.current = [];
    window.setTimeout(() => { const overlay = overlayRef.current; overlay?.getContext('2d')?.clearRect(0, 0, overlay.width, overlay.height); }, 450);
  }

  return <section className={`anatomy-panel${muscleExplorer ? ' anatomy-panel--muscle' : ''}`} aria-label={muscleExplorer ? '三维肌肉图谱' : '三维人体定位'}>
    {!muscleExplorer && <div className="anatomy-toolbar">
      <div className="anatomy-toolbar__title"><h1>选择不适部位</h1><p>在模型上选择位置，查看康复思路</p></div>
      <div className="anatomy-toolbar__actions"><div className="anatomy-mode" role="group" aria-label="模型操作方式">
        <button className={mode === 'mark' ? 'active' : ''} type="button" onClick={() => setMode('mark')}>选择部位</button>
        <button className={mode === 'view' ? 'active' : ''} type="button" onClick={() => setMode('view')}>调整视角</button>
      </div></div>
    </div>}
    <div className="anatomy-stage"><div className="anatomy-viewport" ref={hostRef}>
      {muscleExplorer && <div className="muscle-peel-controls" role="group" aria-label="全身运动肌肉分层">
        <button type="button" title="增加一层肌肉" disabled={isolatedMuscle || loading || muscleLoading || !removedLayers} onClick={() => setRemovedLayers(value => value - 1)}>肌肉＋</button>
        <button type="button" title="去掉一层肌肉" disabled={isolatedMuscle || loading || muscleLoading || !!muscleError || removedLayers >= musclePeelSteps('all')} onClick={() => setRemovedLayers(value => value + 1)}>肌肉－</button>
        <span className="muscle-peel-status" role="status">{isolatedMuscle ? '单独显示中' : appliedLayers===musclePeelSteps('all') ? '骨架 · 肌肉已全部去除' : appliedLayers ? `全身 · 已去 ${appliedLayers} 层` : '全身运动肌肉'}</span>
      </div>}
      {loading && <div className="anatomy-loading">正在载入人体模型…</div>}
      {error && <div className="anatomy-loading error"><div>{error}<br /><button type="button" onClick={() => window.location.reload()}>重新加载模型</button></div></div>}
      {muscleLoading && <div className="muscle-pick-status" role="status">正在载入肌肉…</div>}
      {muscleError && <div className="muscle-pick-status" role="alert">{muscleError}<button type="button" onClick={() => setMuscleAttempt(value => value + 1)}>重试</button></div>}
      {tendonError && <div className="muscle-pick-status" role="alert">{tendonError}<button type="button" onClick={()=>setTendonAttempt(value=>value+1)}>重试连接组织</button></div>}
      <canvas ref={overlayRef} className="anatomy-overlay" style={{ pointerEvents: !muscleExplorer && mode !== 'view' ? 'auto' : 'none' }}
        onPointerDown={event => {
          if (mode === 'view') return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          const rect = hostRef.current?.getBoundingClientRect();
          if (!rect) return;
          strokeRef.current = [{ x: event.clientX - rect.left, y: event.clientY - rect.top }];
          if (mode === 'mark') drawStroke();
        }}
        onPointerMove={event => {
          if (mode === 'view' || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const rect = hostRef.current?.getBoundingClientRect();
          if (!rect) return;
          const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
          const old = strokeRef.current.at(-1);
          if (!old || Math.hypot(old.x - point.x, old.y - point.y) > 4) { strokeRef.current.push(point); if (mode === 'mark') drawStroke(); }
        }}
        onPointerUp={event => {
          if (mode === 'view') return;
          event.preventDefault();
          if (mode === 'muscle') {
            const rect = hostRef.current?.getBoundingClientRect();
            if (rect) strokeRef.current.push({ x: event.clientX - rect.left, y: event.clientY - rect.top });
            finishMuscleTap();
          } else {
            const rect = hostRef.current?.getBoundingClientRect();
            if (rect) strokeRef.current.push({ x: event.clientX - rect.left, y: event.clientY - rect.top });
            finishStroke();
          }
        }}
        onPointerCancel={() => { strokeRef.current = []; drawStroke(); }}
      />
      </div>
    </div>
    {muscleExplorer || mode === 'muscle' ? <div className="muscle-selection" aria-live="polite"><div className="muscle-selection__name"><small>{selectedTendon?`已选${{tendon:'肌腱',fascia:'筋膜',membrane:'骨间膜',ligament:'韧带'}[selectedTendon.kind||'tendon']}`:selectedBone ? '已选骨骼' : selectedMuscle ? '已选肌肉' : '肌肉、骨骼与连接组织'}</small><strong>{selectedTendon?selectedTendon.displayName:selectedBone ? getBoneDisplayName(selectedBone.name) : muscleLoading ? '正在载入肌肉…' : muscleError || (selectedMuscle ? getMuscleDisplayName(selectedMuscle.name,selectedMuscle.displayName) : muscleTip)}</strong></div>
      {muscleExplorer && <button className="muscle-solo-button" type="button" aria-pressed={isolatedMuscle} disabled={!(selectedMuscle || selectedBone || selectedTendon) || muscleLoading || tendonLoading || (!!displayedMuscle&&!sourceReady)} onClick={() => {
        const next=!isolatedMuscle;
        setSoloSelection(next?{muscle:selectedMuscle,bone:selectedBone,tendon:selectedTendon}:null);
        setMuscleSolo(next);
        if(next&&sceneRef.current&&controlsRef.current){
          const state=sceneRef.current,controls=controlsRef.current,box=new T.Box3();
          const geo=selectedMuscle?state.muscleHighlight?.geometry:selectedBone?state.boneHighlight.geometry:state.tendonMeshes.find(mesh=>mesh.userData.part.id===selectedTendon?.id)?.geometry;
          if(geo?.index){
            const position=geo.getAttribute('position'),begin=geo.drawRange.start,end=Math.min(geo.index.count,begin+geo.drawRange.count);
            for(let i=begin;i<end;i++)box.expandByPoint(new T.Vector3().fromBufferAttribute(position,geo.index.array[i]));
            if(!box.isEmpty()){
              const center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),offset=state.camera.position.clone().sub(controls.target);
              offset.setLength(Math.max(size.x,size.y,size.z,.04)*2.7);controls.target.copy(center);state.camera.position.copy(center).add(offset);controls.update();
            }
          }
        }
      }}>{isolatedMuscle ? '恢复显示' : '单独显示'}</button>}
    </div>
      : selectionFooter || <div className="anatomy-foot"><span className="anatomy-dot" />{selectedName || tip}<span className="anatomy-hint">{mode === 'view' ? '单指旋转 · 双指缩放' : '轻点 · 划线 · 圈选'}</span></div>}
    {muscleExplorer && <MuscleAnatomyCard key={selectedMuscle?.id || selectedBone?.id || selectedTendon?.id || 'unselected'} name={selectedMuscle?.name} boneName={selectedBone?.name} tendonName={selectedTendon?.name} />}  </section>;
}


