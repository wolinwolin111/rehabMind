export interface MusclePart {
  id: string; conceptId: string; name: string; displayName: string;
  side: string; firstFace: number; faceCount: number;
  sourceName?: string; sourceConceptId?: string; correctionReason?: string;
  sharedDistal?: {donorId:string;donorName:string;donorConceptId:string;sourceGeometrySha256:string;faces:number[];cutoffY:number;overlapMm:number;status:string};
  sourceSegmentOf?: string;
  schematicHead?: 'direct'|'reflected';
}

/** Face ranges follow the source mesh packing order, independent of body coordinates. */
export function muscleAtFace(parts: MusclePart[], face: number): MusclePart | null {
  if (!Number.isInteger(face) || face < 0) return null;
  let low = 0, high = parts.length - 1;
  while (low <= high) {
    const mid = (low + high) >>> 1, part = parts[mid];
    if (face < part.firstFace) high = mid - 1;
    else if (face >= part.firstFace + part.faceCount) low = mid + 1;
    else return part;
  }
  return null;
}
