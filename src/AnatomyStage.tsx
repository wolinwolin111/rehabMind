import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { acceleratedRaycast, computeBoundsTree } from 'three-mesh-bvh';
import { chooseGestureRegion, decodeSurfaceAtlas, localizeFace, type LocalizedHit, type SkinData, type SurfaceAtlas } from './localization';

type Mode = 'view' | 'mark';
interface Props { onSelect: (hit: LocalizedHit) => void; selectedName?: string }
interface Sample { x: number; y: number }
type View = 'three' | 'front' | 'side' | 'back';

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

function insidePolygon(x: number, y: number, points: Sample[]) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function AnatomyStage({ onSelect, selectedName }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    renderer: T.WebGLRenderer; camera: T.PerspectiveCamera; skin: T.Mesh; visibleSkin: T.Mesh; bones: T.Mesh; marker: T.Mesh; raycaster: T.Raycaster; extras: T.Mesh[];
    metadata: SkinData; surfaceAtlas: SurfaceAtlas;
  } | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const onSelectRef = useRef(onSelect);
  const [mode, setMode] = useState<Mode>('mark');
  const [view, setView] = useState<View>('three');
  const modeRef = useRef<Mode>('mark');
  const viewAnimation = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tip, setTip] = useState('轻点、划线或圈出不适位置');
  onSelectRef.current = onSelect;

  useEffect(() => {
    let alive = true;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    let controls: OrbitControls | undefined;
    const host = hostRef.current;
    if (!host) return;
    const base = import.meta.env.BASE_URL;
    async function setup() {
      const [metaResponse, meshResponse, boneResponse, featureResponse, semanticResponse] = await Promise.all([
        fetch(`${base}3d/skin.json`, { cache: 'no-cache' }), fetch(`${base}3d/skin.pack`), fetch(`${base}3d/bones.pack`), fetch(`${base}3d/features.pack`), fetch(`${base}3d/surface_atlas.bin`, { cache: 'no-cache' }),
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
      scene.background = new T.Color('#f0f4f8');
      scene.fog = new T.Fog('#f0f4f8', 4.8, 8.5);
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
      visibleSkin.renderOrder = 1;
      scene.add(visibleSkin);
      const extras: T.Mesh[] = [];
      const patch = pelvisPatch(skinMaterial);
      patch.renderOrder = 1;
      scene.add(patch);
      extras.push(patch);
      const colors: Record<string, number> = { Eyebrow: 0x463a36, 'Hair of head': 0x3f3835, Lip: 0xa85e58 };
      for (const info of metadata.features) {
        const feature = new T.Mesh(geometry(featureBuffer, info), new T.MeshStandardMaterial({ color: colors[info.name], roughness: .8, side: T.DoubleSide, transparent: true, opacity: .1, depthWrite: false }));
        feature.frustumCulled = false;
        feature.renderOrder = 1;
        scene.add(feature);
        extras.push(feature);
      }
      const marker = new T.Mesh(new T.SphereGeometry(0.012, 16, 16), new T.MeshBasicMaterial({ color: '#df6c54', depthTest: false }));
      marker.visible = false;
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
      controls.enabled = modeRef.current === 'view';
      controls.update();
      controlsRef.current = controls;
      sceneRef.current = { renderer, camera, skin, visibleSkin, bones, marker, raycaster, extras, metadata, surfaceAtlas };
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
      const animate = () => { frame = requestAnimationFrame(animate); controls?.update(); renderer.render(scene, camera); };
      animate();
      setLoading(false);
    }
    setup().catch(cause => { if (alive) { setError(cause instanceof Error ? cause.message : '3D 定位不可用'); setLoading(false); } });
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(viewAnimation.current);
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
        (current.bones.material as T.Material).dispose();
        current.marker.geometry.dispose();
        (current.marker.material as T.Material).dispose();
        current.renderer.dispose();
        current.renderer.domElement.remove();
        sceneRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    modeRef.current = mode;
    if (controlsRef.current) controlsRef.current.enabled = mode === 'view';
  }, [mode]);

  function setViewPreset(next: View) {
    const state = sceneRef.current;
    const controls = controlsRef.current;
    setView(next);
    if (!state || !controls) return;
    const direction = next === 'front' ? new T.Vector3(0, 0, 1)
      : next === 'side' ? new T.Vector3(1, 0, 0)
      : next === 'back' ? new T.Vector3(0, 0, -1)
      : new T.Vector3(.35, .055, 1).normalize();
    cancelAnimationFrame(viewAnimation.current);
    const target = new T.Vector3(0, .84, 0);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      controls.target.copy(target);
      state.camera.position.copy(target).addScaledVector(direction, 4.1);
      state.camera.lookAt(target); controls.update(); return;
    }
    const fromTarget = controls.target.clone();
    const from = new T.Spherical().setFromVector3(state.camera.position.clone().sub(fromTarget));
    const to = new T.Spherical().setFromVector3(direction.clone().multiplyScalar(4.1));
    let angle = to.theta - from.theta;
    if (angle > Math.PI) angle -= Math.PI * 2;
    if (angle < -Math.PI) angle += Math.PI * 2;
    const started = performance.now();
    controls.enabled = false;
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / 440);
      const eased = 1 - Math.pow(1 - progress, 3);
      controls.target.copy(fromTarget).lerp(target, eased);
      const spherical = new T.Spherical(
        from.radius + (to.radius - from.radius) * eased,
        from.phi + (to.phi - from.phi) * eased,
        from.theta + angle * eased,
      );
      state.camera.position.setFromSpherical(spherical).add(controls.target);
      state.camera.lookAt(controls.target);
      controls.update();
      if (progress < 1) viewAnimation.current = requestAnimationFrame(step);
      else { viewAnimation.current = 0; controls.enabled = modeRef.current === 'view'; }
    };
    viewAnimation.current = requestAnimationFrame(step);
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
    ctx.strokeStyle = '#df6c54';
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
    const first = points[0], last = points[points.length - 1];
    const tap = points.every(point => Math.hypot(point.x - first.x, point.y - first.y) <= 6);
    if (tap) add(first);
    else for (let i = 0; i < points.length; i += Math.max(1, Math.floor(points.length / 70))) add(points[i]);
    const closed = !tap && points.length > 12 && Math.hypot(first.x - last.x, first.y - last.y) < 35;
    if (closed) {
      const xs = points.map(point => point.x), ys = points.map(point => point.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      for (let y = minY; y <= maxY; y += 14) for (let x = minX; x <= maxX; x += 14) {
        if (insidePolygon(x, y, points)) add({ x, y });
      }
    }
    const winner = [...votes.values()].sort((a, b) => b.count - a.count)[0];
    if (winner) {
      if (sceneRef.current) { sceneRef.current.marker.position.copy(winner.position); sceneRef.current.marker.visible = true; }
      const selected = chooseGestureRegion([...votes.values()], closed, sceneRef.current?.metadata.surface_atlas.gesture_groups) || winner.hit;
      onSelectRef.current(selected);
      setTip(`已定位：${selected.displayName}`);
    } else setTip('没有识别到下肢区域，请换个角度再标记');
    strokeRef.current = [];
    window.setTimeout(() => { const overlay = overlayRef.current; overlay?.getContext('2d')?.clearRect(0, 0, overlay.width, overlay.height); }, 450);
  }

  return <section className="anatomy-panel" aria-label="三维人体定位">
    <div className="anatomy-toolbar">
      <div className="anatomy-toolbar__title">人体模型<span>下肢</span></div>
      <div className="anatomy-mode" role="group" aria-label="模型操作方式">
        <button className={mode === 'mark' ? 'active' : ''} type="button" onClick={() => setMode('mark')}>选择部位</button>
        <button className={mode === 'view' ? 'active' : ''} type="button" onClick={() => setMode('view')}>调整视角</button>
      </div>
    </div>
    <div className="anatomy-stage" ref={hostRef}>
      {loading && <div className="anatomy-loading">正在载入人体模型…</div>}
      {error && <div className="anatomy-loading error"><div>{error}<br /><button type="button" onClick={() => window.location.reload()}>重新加载模型</button></div></div>}
      <canvas ref={overlayRef} className="anatomy-overlay" style={{ pointerEvents: mode === 'mark' ? 'auto' : 'none' }}
        onPointerDown={event => {
          if (mode !== 'mark') return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          const rect = hostRef.current?.getBoundingClientRect();
          if (!rect) return;
          strokeRef.current = [{ x: event.clientX - rect.left, y: event.clientY - rect.top }];
          drawStroke();
        }}
        onPointerMove={event => {
          if (mode !== 'mark' || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const rect = hostRef.current?.getBoundingClientRect();
          if (!rect) return;
          const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
          const old = strokeRef.current.at(-1);
          if (!old || Math.hypot(old.x - point.x, old.y - point.y) > 4) { strokeRef.current.push(point); drawStroke(); }
        }}
        onPointerUp={event => { if (mode === 'mark') { event.preventDefault(); finishStroke(); } }}
        onPointerCancel={() => { strokeRef.current = []; drawStroke(); }}
      />
      <div className="stage-guides" aria-hidden="true"><span>左</span><span>右</span></div>
      <div className="view-presets" role="group" aria-label="模型视角">
        {([['three', '立体'], ['front', '正面'], ['side', '侧面'], ['back', '背面']] as const).map(([id, label]) => <button key={id} type="button" className={view === id ? 'active' : ''} aria-pressed={view === id} onClick={() => setViewPreset(id)}>{label}</button>)}
      </div>
    </div>
    <div className="anatomy-foot"><span className="anatomy-dot" />{selectedName || tip}<span className="anatomy-hint">{mode === 'view' ? '单指旋转 · 双指缩放' : '轻点 · 划线 · 圈选'}</span></div>
  </section>;
}
