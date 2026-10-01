# 3D / Localization Implementation Baseline

This directory is the canonical spatial-interaction asset set packaged with Lower Limb V1 DB v3.7.

## Contents
- `model/atlas_metadata.json` — BodyParts3D 4.0 optimized atlas metadata; 2,234 parts.
- `model/chunks/body-*.bin.gz` — 15 compressed geometry chunks used by the accepted prototype.
- `semantics/skin_semantics_metadata.json` — project semantic surface metadata.
- `semantics/skin_semantics.bin` — per-face semantic records for the Skin mesh.
- `localization/LowerLimb_v3.7_3DLocalizationContract_v1.2.json` — four-module localization contract compatible with the current 38 Region IDs.
- `localization/localization_reference_current.js` — current mapping/fallback reference implementation.

## Source-of-truth rules
1. Spatial assets answer **where the user marked** only.
2. They must not contain ClinicalItem, Finding, Intervention, diagnosis, or treatment rules.
3. The clinical source of truth is `02_Database/RehabMind_LowerLimb_KnowledgeDB_v3.7_Final.xlsx`.
4. Knee and ankle/foot use established surface semantics. Lower-leg and thigh geometry fallbacks remain internal-validation mappings and require click-sampling calibration before production freeze.
5. The UI HTML contains an embedded model copy for standalone demonstration; production implementation should use the standalone assets in this directory.
6. DB v3.7 changed clinical organization/display metadata, not the 38 spatial Region IDs; therefore localization-v1.1 / contract-v1.2 remains the current spatial baseline.
