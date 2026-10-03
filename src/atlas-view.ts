import type {MusclePart} from './muscle-picking';
import type {TendonPart} from './content/tendon-anatomy';
export interface AtlasSelection {muscle:MusclePart|null;bone:MusclePart|null;tendon:TendonPart|null}
/** Inspection can change without replacing the structure isolated on screen. */
export function displayedAtlasSelection(selection:AtlasSelection,solo:AtlasSelection|null):AtlasSelection {
  return solo??selection;
}
export const ATLAS_CAMERA={near:.0005,minDistance:.015,maxDistance:7};
