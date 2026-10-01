# RehabMind Lower Limb V1 — Current Implementation Baseline

**Baseline date:** 2026-09-29  
**Clinical Knowledge DB:** v3.7 Final  
**Design Spec:** DB v3.7  
**Executable Implementation Plan:** DB v3.7  
**UI reference:** G5.88 / Four-module / Profile Context / UserReadable v5  
**3D localization:** localization-v1.1-four-module / contract v1.2  

This package is the current minimum implementation baseline for continuing detailed development. It replaces the previous DB v3.4 implementation baseline as the normal development input.

## Authoritative asset categories

### 1. Design + execution contract
- `01_Design/RehabMind_LowerLimbV1_DesignSpec_DBv3.7.docx`
- `01_Design/RehabMind_LowerLimbV1_ExecutableImplementationPlan_DBv3.7.docx`

The design spec defines product boundaries, clinical semantics, database responsibilities, interaction principles, profile/context behavior, safety behavior, information-density rules, and extensibility. The implementation plan translates those decisions into an executable engineering sequence and acceptance criteria.

### 2. Clinical database — source of truth
`02_Database/RehabMind_LowerLimb_KnowledgeDB_v3.7_Final.xlsx`

This workbook is the authoritative clinical knowledge source. UI/API/Resolver must not create a parallel clinical rule set. Runtime snapshots may be generated from it but are derived artifacts.

DB v3.7 includes the RegionClinicalMap organization layer for parallel assessment dimensions rather than a fixed clinical sequence. In particular, region entry can organize ClinicalItems by dimensions such as muscle state, ROM, capacity, function, local assessment, and special tests while preserving therapist choice.

### 3. UI reference — accepted visual/interaction baseline
`03_UI_Reference/LowerLimb_v3.4_G5_88_4Module_ProfileContext_UserReadable_v5.html`

This HTML remains the accepted reference for overall visual language, 3D-to-reasoning interaction, drawer/card behavior, patient profile placement, and user-facing cleanliness. It is **not** a DB v3.7 runtime implementation: it predates the v3.7 RegionClinicalMap dimension/group fields. Production implementation should reproduce the accepted experience while reading the v3.7 schema described by the design and implementation documents.

### 4. 3D model + localization — spatial source
`04_3D_Localization/`

Contains standalone BodyParts3D-derived model data, project semantic surface assets, the current four-module localization contract, and reference localization implementation. Spatial localization only determines the Region; clinical reasoning remains in the database.

## Current product scope
- Knee: 15 Region entries
- Ankle-Foot: 12 Region entries
- Lower Leg: 7 Region entries
- Thigh: 4 Region entries
- Total: 38 Region entries

## Current architecture boundaries
- `Region → ClinicalItem → Finding → Intervention` remains a knowledge relationship, not a questionnaire workflow.
- RegionClinicalMap v3.7 adds **parallel assessment organization**, not a mandatory order of examination.
- Muscle state, capacity, function, ROM, and local tissue findings remain semantically distinct.
- Finding is confirmed by therapist assessment/judgment; location/profile/context must not auto-create a Finding.
- Intervention is a reference attached to a confirmed Finding, not an automatically assembled treatment plan.
- Patient Profile remains context/modifier information and must not directly create Findings or Interventions.
- Context relationships remain governed by the database; the Resolver stays thin.
- Post-operative rehabilitation remains outside Lower Limb V1.
- Hip assessment is not yet a complete module; current thigh logic must not invent missing hip ClinicalItems or Findings.

## Version-use rule
For new development, use **only** the DB v3.7 database and the DB v3.7 documents in this package as the current behavioral/clinical baseline. Earlier DB versions and old design documents are historical references only.

The UI reference and localization assets are intentionally preserved even though their filenames/version lineage predate DB v3.7, because those assets were not replaced by the database migration. Their exact role and compatibility boundaries are documented above.

## Recommended implementation start
1. Read the DB v3.7 design specification and executable implementation plan.
2. Build/validate database ingestion against `RehabMind_LowerLimb_KnowledgeDB_v3.7_Final.xlsx`.
3. Implement the thin Resolver and RegionClinicalMap dimension/group presentation without introducing a fixed assessment sequence.
4. Rebuild the accepted UI behavior using the reference HTML as a visual/interaction guide, not as the clinical data source.
5. Integrate the standalone 3D assets and localization contract.
6. Run automated database and 38-Region UI regression gates before production freeze.
