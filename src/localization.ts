import type { ModuleId } from './types';

interface Point { x: number; y: number; z: number }
interface MeshInfo { vertexCount: number; faceCount: number; positions: number; normals: number; indices: number; indexCount: number }
interface GestureGroup {
  members: string[]; min_regions: number; min_fraction: number; closed_only: boolean;
  targets: Record<string, LocalizedHit>;
}

export interface LocalizedHit {
  regionId: string;
  areaId?: string;
  regionIds?: string[];
  module: ModuleId;
  side: string;
  source: 'surface' | 'geometry';
  displayName: string;
}

export interface SkinData {
  mesh: MeshInfo;
  bones: Omit<MeshInfo, 'faceCount'> & { partCount: number; parts?: import('./muscle-picking').MusclePart[] };
  muscles: Omit<MeshInfo, 'faceCount'> & { partCount: number; parts?: import('./muscle-picking').MusclePart[] };
  features: (Omit<MeshInfo, 'faceCount'> & { name: string })[];
  surface_atlas: {
    version: number; face_count: number; roots_offset: number; nodes_offset: number;
    node_count: number; byte_length: number; mesh_sha256: string;
    entries: (LocalizedHit | null)[];
    gesture_groups: GestureGroup[];
  };
}

export interface SurfaceAtlas {
  roots: Int32Array;
  nodes: Int32Array;
  positions: Float32Array;
  indices: Uint32Array;
}

/** A generic triangle label reader. No body coordinates or anatomy rules. */
export function decodeSurfaceAtlas(data: SkinData, atlasBuffer: ArrayBuffer, skinBuffer: ArrayBuffer): SurfaceAtlas {
  const info = data.surface_atlas;
  if (!info || info.version !== 1 || info.face_count !== data.mesh.faceCount ||
      info.byte_length !== atlasBuffer.byteLength || info.roots_offset !== 0 ||
      info.nodes_offset !== info.face_count * 4 || info.node_count % 4 !== 0 ||
      info.byte_length !== info.nodes_offset + info.node_count * 4 ||
      info.entries[0] !== null) throw new Error('模型与定位标注不匹配，请重新加载');
  const roots = new Int32Array(atlasBuffer, info.roots_offset, info.face_count);
  const nodes = new Int32Array(atlasBuffer, info.nodes_offset, info.node_count);
  const valid = (value: number, limit: number) => value >= 0
    ? value < info.entries.length
    : (-value - 1) % 4 === 0 && -value - 1 + 4 <= limit;
  if (!roots.every(value => valid(value, nodes.length)) ||
      !nodes.every((value, index) => valid(value, Math.floor(index / 4) * 4))) {
    throw new Error('定位标注数据不完整，请重新加载');
  }
  return { roots, nodes,
    positions: new Float32Array(skinBuffer, data.mesh.positions, data.mesh.vertexCount * 3),
    indices: new Uint32Array(skinBuffer, data.mesh.indices, data.mesh.indexCount) };
}

export function localizeFace(data: SkinData, atlas: SurfaceAtlas, faceIndex: number, point: Point): LocalizedHit | null {
  if (!Number.isInteger(faceIndex) || faceIndex < 0 || faceIndex >= atlas.roots.length ||
      ![point.x, point.y, point.z].every(Number.isFinite)) return null;
  let label = atlas.roots[faceIndex];
  if (label < 0) {
    const offsets = [0, 1, 2].map(c => atlas.indices[faceIndex * 3 + c] * 3);
    const p = atlas.positions, [a, b, c] = offsets;
    const ab = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]];
    const ac = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]];
    const ap = [point.x - p[a], point.y - p[a + 1], point.z - p[a + 2]];
    const dot = (x: number[], y: number[]) => x.reduce((sum, value, i) => sum + value * y[i], 0);
    const d00 = dot(ab, ab), d01 = dot(ab, ac), d11 = dot(ac, ac);
    const denominator = d00 * d11 - d01 * d01;
    if (denominator <= 0) return null;
    let v = (d11 * dot(ap, ab) - d01 * dot(ap, ac)) / denominator;
    let w = (d00 * dot(ap, ac) - d01 * dot(ap, ab)) / denominator;
    let u = 1 - v - w;
    if (Math.min(u, v, w) < -1e-4) return null;
    while (label < 0) {
      const offset = -label - 1;
      if (u >= .5) { label = atlas.nodes[offset]; u = 2 * u - 1; v *= 2; w *= 2; }
      else if (v >= .5) { label = atlas.nodes[offset + 1]; u *= 2; v = 2 * v - 1; w *= 2; }
      else if (w >= .5) { label = atlas.nodes[offset + 2]; u *= 2; v *= 2; w = 2 * w - 1; }
      else { label = atlas.nodes[offset + 3]; [u, v, w] = [1 - 2 * w, 1 - 2 * u, 1 - 2 * v]; }
    }
  }
  return data.surface_atlas.entries[label] || null;
}

export function chooseGestureRegion(votes: { hit: LocalizedHit; count: number }[], closed: boolean, groups: GestureGroup[] = [], entries: (LocalizedHit | null)[] = []): LocalizedHit | null {
  const sorted = votes.filter(entry => Number.isFinite(entry.count) && entry.count > 0).sort((a, b) => b.count - a.count);
  const winner = sorted[0];
  if (!winner) return null;
  const regionalWinner = (candidates: typeof votes): LocalizedHit => {
    const coverage = new Map<string, { hit: LocalizedHit; count: number; labels: Set<string> }>();
    for (const vote of candidates) {
      const { hit } = vote;
      // Authored multi-region locations keep their own identity and coverage.
      const composite = (hit.regionIds?.length || 0) > 1;
      const key = `${hit.side}:${hit.module}:${composite ? hit.areaId : hit.regionId}`;
      const current = coverage.get(key) || { hit, count: 0, labels: new Set<string>() };
      current.count += vote.count;
      current.labels.add(hit.areaId || hit.regionId);
      coverage.set(key, current);
    }
    const selected = [...coverage.values()].sort((a, b) => b.count - a.count)[0];
    if (selected.labels.size > 1) {
      const parent = entries.find(entry => entry && !entry.areaId && entry.side === selected.hit.side &&
        entry.module === selected.hit.module && entry.regionId === selected.hit.regionId);
      if (parent) return parent;
    }
    return selected.hit;
  };
  const grouped = (entries: typeof votes, side: string) => {
    const total = entries.reduce((sum, entry) => sum + entry.count, 0);
    for (const group of groups) {
      if (group.closed_only && !closed) continue;
      const matches = entries.filter(entry => entry.hit.side === side &&
        (entry.hit.regionIds || [entry.hit.regionId]).every(id => group.members.includes(id)));
      const distinct = new Set(matches.flatMap(entry => entry.hit.regionIds || [entry.hit.regionId]));
      if (distinct.size >= group.min_regions && matches.reduce((sum, entry) => sum + entry.count, 0) / total >= group.min_fraction) {
        return group.targets[side] || null;
      }
    }
    return null;
  };
  if (closed) {
    // Compare whole regions before their subdivisions. A knee split into many
    // labels must not lose to one thigh label with less overall coverage.
    const coverage = new Map<string, { side: string; module: ModuleId; count: number }>();
    for (const entry of sorted) {
      const key = `${entry.hit.side}:${entry.hit.module}`;
      const current = coverage.get(key);
      coverage.set(key, { side: entry.hit.side, module: entry.hit.module, count: (current?.count || 0) + entry.count });
    }
    const dominant = [...coverage.values()].sort((a, b) => b.count - a.count)[0];
    const composite = grouped(sorted, dominant.side);
    if (composite) return composite;
    const total = sorted.reduce((sum, entry) => sum + entry.count, 0);
    if (dominant.count > total / 2) {
      const scoped = sorted.filter(entry => entry.hit.side === dominant.side && entry.hit.module === dominant.module);
      return grouped(scoped, dominant.side) || regionalWinner(scoped);
    }
    return regionalWinner(sorted);
  }
  return grouped(sorted, winner.hit.side) || winner.hit;
}
