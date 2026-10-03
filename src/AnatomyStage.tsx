import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { acceleratedRaycast, computeBoundsTree } from 'three-mesh-bvh';
import { chooseGestureRegion, decodeSurfaceAtlas, localizeFace, type LocalizedHit, type SkinData, type SurfaceAtlas } from './localization';
import { muscleAtFace, type MusclePart } from './muscle-picking';
import { sampleGesture } from './gesture-sampling';
import { MuscleAnatomyCard } from './MuscleAnatomyCard';
import { musclePeelSteps, peelMuscleIndices } from './content/muscle-layers';
import { getMuscleDisplayName, supplementalMuscles } from './content/muscle-anatomy';
import { getBoneDisplayName } from './content/bone-names';
import { AtlasTapTracker } from './atlas-gesture';

type Mode = 'view' | 'mark' | 'muscle';
interface Props { onSelect?: (hit: LocalizedHit) => void; selectedName?: string; selectionFooter?: ReactNode; purpose?: 'region' | 'muscle'; active?: boolean }
interface Sample { x: number; y: number }
type Layer = 'bones' | 'muscles' | 'skin';
type LayerSettings = Record<Layer, { visible: boolean; opacity: number }>;
// Display controls have been removed. Both views use the same anatomy layers,
// independent of settings saved by older versions or a fresh APK installation.
const MODEL_LAYERS: LayerSettings = { bones: { visible: true, opacity: 100 }, muscles: { visible: true, opacity: 100 }, skin: { visible: false, opacity: 0 } };
const modelAsset = (file: string) => `${import.meta.env.BASE_URL}3d/${file}?v=${import.meta.env.VITE_MODEL_ASSET_REVISION}`;

function applyLayer(mesh: T.Mesh, settings: LayerSettings[Layer]) {
  mesh.visible = settings.visible && settings.opacity > 0;
  const material = mesh.material as T.MeshStandardMaterial;
  const transparent = settings.opacity < 100;
  if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
  material.opacity = settings.opacity / 100;
  material.depthWrite = !transparent;
  material.forceSinglePass = true;
}

async function inflate(response: Response): Promise<ArrayBuffer> {
  if (!('DecompressionStream' in window)) throw new Error('当前浏览器不支持模型解压，请更新浏览器');
  return new Response(response.body!.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}

function geometry(buffer: ArrayBuffer, info: { vertexCount: number; positions: number; normals: number; indices: number; indexCount: number }) {
  const result = new T.BufferGeometry();
  result.setAttribute('position', new T.BufferAttribute(new Float32Array(buffer, info.positions, info.vertexCount * 3), 3));
  result.setAttribute('normal', new T.BufferAttribute(new Int16Array(buffer, info.normals, info.vertexCount * 3), 3, true));
  result.setIndex(new T.BufferAttribute(new Uint32Array(buffer, info.indices, info.indexCount), 1));
  return result;
}

function neutralizeSkin(original: T.BufferGeometry) {
  const visible = original.clone();
  const positions = visible.getAttribute('position');
  const smooth = (value: number) => { const x = T.MathUtils.clamp(value, 0, 1); return x * x * (3 - 2 * x); };
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i);
    let z = positions.getZ(i);
    if (Math.abs(x) >= .105 || y <= .635 || y >= .905 || z <= -.004) continue;
    const weight = (1 - smooth((Math.abs(x) - .020) / .075)) * smooth((y - .635) / .070) * (1 - smooth((y - .875) / .035)) * smooth((z + .004) / .050);
    const target = .014 + .028 * smooth((y - .650) / .225);
    if (z > target) z = T.MathUtils.lerp(z, target, weight);
    positions.setZ(i, z);
  }
  const old = visible.index!.array;
  const keep: number[] = [];
  for (let i = 0; i < old.length; i += 3) {
    const ia = old[i], ib = old[i + 1], ic = old[i + 2];
    const my = (positions.getY(ia) + positions.getY(ib) + positions.getY(ic)) / 3;
    const mz = (positions.getZ(ia) + positions.getZ(ib) + positions.getZ(ic)) / 3;
    const width = .036 + .034 * Math.sin(Math.PI * T.MathUtils.clamp((my - .655) / .185, 0, 1));
    const lower = my < .715 ? .014 * (1 - T.MathUtils.clamp((my - .655) / .060, 0, 1)) : 0;
    const maxX = Math.max(Math.abs(positions.getX(ia)), Math.abs(positions.getX(ib)), Math.abs(positions.getX(ic)));
    if (!(my > .655 && my < .840 && mz > -.004 && maxX < width + lower)) keep.push(ia, ib, ic);
  }
  visible.setIndex(keep);
  visible.computeVertexNormals();
  return visible;
}

function pelvisPatch(material: T.Material) {
  const geo = new T.PlaneGeometry(.158, .196, 52, 58);
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i), sy = (pos.getY(i) + .098) / .196;
    const nx = lx / .079;
    const width = (.070 + .010 * Math.sin(Math.PI * sy)) * (1 - .12 * Math.max(0, (.18 - sy) / .18));
    const arch = Math.sin(Math.PI * T.MathUtils.clamp(sy, 0, 1));
    let z = .013 + .014 * Math.pow(arch, 1.18) - .0045 * Math.pow(Math.max(0, .34 - sy) / .34, 1.25) - .0035 * Math.pow(Math.min(1, Math.abs(nx)), 1.65);
    z -= .0038 * (1 - Math.min(1, Math.abs(nx) / .55)) * Math.pow(Math.max(0, .28 - sy) / .28, 1.35);
    pos.setXYZ(i, nx * width, .652 + sy * .196, z);
  }
  geo.computeVertexNormals();
  return new T.Mesh(geo, material);
}

export function AnatomyStage({ onSelect, selectedName, selectionFooter, purpose = 'region', active = true }: Props) {
  const muscleExplorer = purpose === 'muscle';
  const activeRef = useRef(active);
  activeRef.current = active;
  const hostRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    renderer: T.WebGLRenderer; camera: T.PerspectiveCamera; skin: T.Mesh; visibleSkin: T.Mesh; bones: T.Mesh; marker: T.Mesh; raycaster: T.Raycaster; extras: T.Mesh[];
    metadata: SkinData; surfaceAtlas: SurfaceAtlas; scene: T.Scene; muscles: T.Mesh | null; muscleHighlight: T.Mesh | null;
    muscleIndices?: Uint32Array; pickingParts?: MusclePart[]; boneHighlight: T.Mesh;
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
  const [selectedMuscle, setSelectedMuscle] = useState<MusclePart | null>(null);
  const [selectedBone, setSelectedBone] = useState<MusclePart | null>(null);
  const [muscleTip, setMuscleTip] = useState('点击可见肌肉');
  const [removedLayers, setRemovedLayers] = useState(0);
  const [supplementalName, setSupplementalName] = useState('');
  const [muscleSolo, setMuscleSolo] = useState(false);
  const isolatedMuscle = muscleExplorer && muscleSolo && !!(selectedMuscle || selectedBone);
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
      const [metaResponse, meshResponse, boneResponse, featureResponse, semanticResponse] = await Promise.all([
        fetch(modelAsset('skin.json'), { cache: 'no-cache' }), fetch(modelAsset('skin.pack')), fetch(modelAsset('bones.pack')), fetch(modelAsset('features.pack')), fetch(modelAsset('surface_atlas.bin'), { cache: 'no-cache' }),
      ]);
      if (![metaResponse, meshResponse, boneResponse, featureResponse, semanticResponse].every(response => response.ok)) throw new Error('3D 定位资源加载失败');
      const metadata = await metaResponse.json() as SkinData;
      const [buffer, boneBuffer, featureBuffer] = await Promise.all([inflate(meshResponse), inflate(boneResponse), inflate(featureResponse)]);
      const surfaceAtlas = decodeSurfaceAtlas(metadata, await semanticResponse.arrayBuffer(), buffer);
      if (!alive || !host) return;

      (T.Mesh.prototype as unknown as { raycast: typeof acceleratedRaycast }).raycast = acceleratedRaycast;
      (T.BufferGeometry.prototype as unknown as { computeBoundsTree: typeof computeBoundsTree }).computeBoundsTree = computeBoundsTree;
      const geo = geometry(buffer, metadata.mesh);
      (geo as T.BufferGeometry & { computeBoundsTree: (options: object) => void }).computeBoundsTree({ indirect: true });
      const boneGeo = geometry(boneBuffer, metadata.bones);

      const scene = new T.Scene();
      const modelBackground = getComputedStyle(host).getPropertyValue('--model-background').trim() || '#fbf7ef';
      scene.background = new T.Color(modelBackground);
      scene.fog = new T.Fog(modelBackground, 4.8, 8.5);
      const camera = new T.PerspectiveCamera(32, 1, 0.01, 12);
      camera.position.set(1.35, 1.06, 3.88);
      camera.lookAt(0, 0.84, 0);
      const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
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
      const visibleSkin = new T.Mesh(neutralizeSkin(geo), skinMaterial);
      visibleSkin.frustumCulled = false;
      visibleSkin.renderOrder = 2;
      scene.add(visibleSkin);
      const extras: T.Mesh[] = [];
      const patch = pelvisPatch(skinMaterial);
      patch.renderOrder = 2;
      scene.add(patch);
      extras.push(patch);
      const colors: Record<string, number> = { Eyebrow: 0x463a36, 'Hair of head': 0x3f3835, Lip: 0xa85e58 };
      for (const info of metadata.features) {
        const feature = new T.Mesh(geometry(featureBuffer, info), new T.MeshStandardMaterial({ color: colors[info.name], roughness: .8, side: T.DoubleSide, transparent: true, opacity: .1, depthWrite: false }));
        feature.frustumCulled = false;
        feature.renderOrder = 2;
        scene.add(feature);
        extras.push(feature);
      }
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
      controls.minDistance = 1.45;
      controls.maxDistance = 7;
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
      sceneRef.current = { renderer, camera, skin, visibleSkin, bones, marker, raycaster, extras, metadata, surfaceAtlas, scene, muscles: null, muscleHighlight: null, boneHighlight };
      applyLayer(bones, layersRef.current.bones);
      applyLayer(visibleSkin, layersRef.current.skin);
      extras.forEach(mesh => applyLayer(mesh, layersRef.current.skin));
      const resize = () => {
        const width = host.clientWidth, height = host.clientHeight;
        renderer.setSize(width, height);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
        const overlay = overlayRef.current;
        if (overlay) { overlay.width = width * devicePixelRatio; overlay.height = height * devicePixelRatio; }
      };
      observer = new ResizeObserver(resize);
      observer.observe(host);
      resize();
      const animate = () => { frame = requestAnimationFrame(animate); if (activeRef.current) { controls?.update(); renderer.render(scene, camera); } };
      animate();
      setLoading(false);
    }
    setup().catch(cause => { if (alive) { setError(cause instanceof Error ? cause.message : '3D 定位不可用'); setLoading(false); } });
    return () => {
      alive = false;
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
    if (isolatedMuscle && selectedBone) state.bones.visible = false;
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
  }, [layers, loading, muscleExplorer, isolatedMuscle, muscleLoading, selectedBone]);

  // The full muscle layer is only downloaded when first enabled.
  useEffect(() => {
    const state = sceneRef.current;
    if (loading || !state) return;
    if (!layers.muscles.visible || state.muscles) { setMuscleLoading(false); return; }
    const controller = new AbortController();
    setMuscleLoading(true); setMuscleError('');
    async function loadMuscles() {
      const response = await fetch(modelAsset('muscles.pack'), { signal: controller.signal });
      if (!response.ok) throw new Error('肌肉模型载入失败');
      const buffer = await inflate(response);
      if (controller.signal.aborted || sceneRef.current !== state) return;
      const mesh = new T.Mesh(geometry(buffer, state!.metadata.muscles), new T.MeshStandardMaterial({ color: 0xb66d59, roughness: .85, side: T.DoubleSide }));
      (mesh.geometry as T.BufferGeometry & { computeBoundsTree: (options: object) => void }).computeBoundsTree({ indirect: true });
      (state!.bones.geometry as T.BufferGeometry & { computeBoundsTree: (options: object) => void }).computeBoundsTree({ indirect: true });
      mesh.frustumCulled = false; mesh.renderOrder = 1;
      applyLayer(mesh, layersRef.current.muscles);
      state!.muscles = mesh; state!.scene.add(mesh);
      state!.muscleIndices = mesh.geometry.index!.array as Uint32Array;
      state!.pickingParts = state!.metadata.muscles.parts || [];
      const highlightGeometry = new T.BufferGeometry();
      highlightGeometry.setAttribute('position', mesh.geometry.getAttribute('position'));
      highlightGeometry.setIndex(mesh.geometry.index);
      highlightGeometry.setDrawRange(0, 0);
      const highlight = new T.Mesh(highlightGeometry, new T.MeshBasicMaterial({ color: '#59bd86', side: T.DoubleSide, transparent: true, opacity: .88, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
      highlight.visible = false; highlight.frustumCulled = false; highlight.renderOrder = 3;
      state!.muscleHighlight = highlight; state!.scene.add(highlight);
    }
    loadMuscles().catch(cause => { if (!controller.signal.aborted) setMuscleError(cause instanceof Error ? cause.message : '肌肉模型载入失败'); })
      .finally(() => { if (!controller.signal.aborted) setMuscleLoading(false); });
    return () => controller.abort();
  }, [layers.muscles.visible, loading, muscleAttempt]);

  useEffect(() => {
    const state = sceneRef.current;
    if (!muscleExplorer || !state?.muscles || !state.muscleIndices || muscleLoading) return;
    const peeled = peelMuscleIndices(state.muscleIndices, state.metadata.muscles.parts || [], 'all', removedLayers);
    state.muscles.geometry.setIndex(new T.BufferAttribute(peeled.indices, 1));
    (state.muscles.geometry as T.BufferGeometry & { computeBoundsTree: (options: object) => void }).computeBoundsTree({ indirect: true });
    state.pickingParts = peeled.parts;
    setSelectedMuscle(current => current && peeled.parts.some(part => part.id === current.id) ? current : null);
  }, [muscleExplorer, muscleLoading, loading, removedLayers]);

  useEffect(() => {
    modeRef.current = mode;
    if (controlsRef.current) controlsRef.current.enabled = muscleExplorer || mode === 'view';
  }, [mode, muscleExplorer]);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    state.marker.visible = !muscleExplorer && mode !== 'muscle' && !!selectedName;
    state.boneHighlight.visible = muscleExplorer && !!selectedBone && (isolatedMuscle || (layers.bones.visible && layers.bones.opacity > 0));
    if (state.muscleHighlight) {
      state.muscleHighlight.visible = (muscleExplorer || mode === 'muscle') && !!selectedMuscle && (isolatedMuscle || (layers.muscles.visible && layers.muscles.opacity > 0));
      const material = state.muscleHighlight.material as T.MeshBasicMaterial;
      material.opacity = isolatedMuscle ? 1 : .88;
      material.depthWrite = isolatedMuscle;
    }
  }, [mode, selectedMuscle, selectedBone, layers.muscles, layers.bones, selectedName, muscleExplorer, isolatedMuscle, muscleLoading, loading]);

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
    const muscleMesh = isolatedMuscle && selectedMuscle ? state.muscleHighlight : state.muscles;
    const boneMesh = isolatedMuscle && selectedBone ? state.boneHighlight : state.bones;
    const hit = state.raycaster.intersectObjects([muscleMesh,boneMesh].filter((mesh):mesh is T.Mesh => !!mesh?.visible),false)[0];
    const skinHit = state.visibleSkin.visible && layers.skin.opacity >= 95 ? state.raycaster.intersectObject(state.visibleSkin,false)[0] : null;
    if (!hit || hit.faceIndex == null || (skinHit && skinHit.distance < hit.distance-.0005)) return;
    const isBone = hit.object === boneMesh;
    const part = muscleAtFace(isBone ? state.metadata.bones.parts || [] : muscleMesh === state.muscleHighlight ? state.metadata.muscles.parts || [] : state.pickingParts || [],hit.faceIndex);
    if (!part || (isBone && !getBoneDisplayName(part.name))) return;
    const original = isBone ? part : state.metadata.muscles.parts?.find(p=>p.id === part.id) || part;
    setSupplementalName('');
    setSelectedBone(isBone ? original : null);
    setSelectedMuscle(isBone ? null : original);
    const highlight = isBone ? state.boneHighlight : state.muscleHighlight;
    highlight?.geometry.setDrawRange(original.firstFace*3,original.faceCount*3);
  };

  function finishMuscleTap() {
    const points = strokeRef.current;
    strokeRef.current = [];
    const first = points[0], host = hostRef.current, state = sceneRef.current;
    if (!first || !host || !state || points.some(point => Math.hypot(point.x - first.x, point.y - first.y) > 6)) return;
    setSelectedMuscle(null);
    setSupplementalName('');
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
    if (state.muscleHighlight) {
      state.muscleHighlight.geometry.setDrawRange(originalPart.firstFace * 3, originalPart.faceCount * 3);
      state.muscleHighlight.visible = true;
    }
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
    <div className="anatomy-toolbar">
      {!muscleExplorer && <div className="anatomy-toolbar__title"><h1>选择不适部位</h1><p>在模型上选择位置，查看康复思路</p></div>}
      <div className="anatomy-toolbar__actions">{muscleExplorer ? <span className="atlas-gesture-hint">拖动旋转 · 双指缩放与移动 · 单击选择</span> : <div className="anatomy-mode" role="group" aria-label="模型操作方式">
        <button className={mode === 'mark' ? 'active' : ''} type="button" onClick={() => setMode('mark')}>选择部位</button>
        <button className={mode === 'view' ? 'active' : ''} type="button" onClick={() => setMode('view')}>调整视角</button>
      </div>}</div>
    </div>
    {muscleExplorer && <div className="muscle-peel" aria-label="全身运动肌肉分层">
      <button type="button" disabled={isolatedMuscle || loading || muscleLoading || !removedLayers} onClick={() => setRemovedLayers(value => value - 1)}>＋ 加一层</button>
      <span role="status">{isolatedMuscle ? '单独显示中' : removedLayers ? `全身 · 已去 ${removedLayers} 层` : '全身运动肌肉'}</span>
      <button type="button" disabled={isolatedMuscle || loading || muscleLoading || !!muscleError || removedLayers >= musclePeelSteps('all')} onClick={() => {
        setRemovedLayers(value => value + 1);
      }}>− 去一层</button>
    </div>}
    <div className="anatomy-stage"><div className="anatomy-viewport" ref={hostRef}>
      {loading && <div className="anatomy-loading">正在载入人体模型…</div>}
      {error && <div className="anatomy-loading error"><div>{error}<br /><button type="button" onClick={() => window.location.reload()}>重新加载模型</button></div></div>}
      {muscleLoading && <div className="muscle-pick-status" role="status">正在载入肌肉…</div>}
      {muscleError && <div className="muscle-pick-status" role="alert">{muscleError}<button type="button" onClick={() => setMuscleAttempt(value => value + 1)}>重试</button></div>}
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
    {muscleExplorer || mode === 'muscle' ? <div className="muscle-selection" aria-live="polite"><div className="muscle-selection__name"><small>{supplementalName ? '补充资料 · 暂无模型' : selectedBone ? '已选骨骼' : selectedMuscle ? '已选肌肉' : '肌肉与骨骼'}</small><strong>{selectedBone ? getBoneDisplayName(selectedBone.name) : muscleLoading ? '正在载入肌肉…' : muscleError || (supplementalName ? supplementalMuscles.find(muscle => muscle.name === supplementalName)?.displayName : selectedMuscle ? getMuscleDisplayName(selectedMuscle.name,selectedMuscle.displayName) : muscleTip)}</strong></div>
      {muscleExplorer && <button className="muscle-solo-button" type="button" aria-pressed={isolatedMuscle} disabled={!(selectedMuscle || selectedBone) || muscleLoading} onClick={() => {
        setMuscleSolo(!isolatedMuscle);
      }}>{isolatedMuscle ? '恢复显示' : '单独显示'}</button>}
    </div>
      : selectionFooter || <div className="anatomy-foot"><span className="anatomy-dot" />{selectedName || tip}<span className="anatomy-hint">{mode === 'view' ? '单指旋转 · 双指缩放' : '轻点 · 划线 · 圈选'}</span></div>}
    {muscleExplorer && <MuscleAnatomyCard key={supplementalName || selectedMuscle?.id || selectedBone?.id || 'unselected'} name={supplementalName || selectedMuscle?.name} boneName={selectedBone?.name} supplement={supplementalName} onSupplement={name => { setSupplementalName(name); setSelectedMuscle(null); setSelectedBone(null); }} />}
  </section>;
}


