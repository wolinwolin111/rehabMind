# Current Version Matrix

| Asset | Current package version | Role |
|---|---|---|
| Clinical database | DB v3.7 Final | Clinical source of truth |
| Design specification | DB v3.7 | Product/architecture/clinical-behavior contract |
| Executable implementation plan | DB v3.7 | Step-by-step implementation and acceptance plan |
| UI reference | G5.88 / Profile Context / UserReadable v5 (v3.4-era prototype) | Visual & interaction reference only |
| 3D localization | localization-v1.1 / contract-v1.2, relabeled compatible with DB v3.7 | Spatial Region localization |
| 3D model | BodyParts3D 4.0 derived optimized model | Spatial rendering asset |

## Important compatibility note
The UI reference has **not** yet been rebuilt against the v3.7 RegionClinicalMap dimension/group fields. It remains the accepted visual and interaction baseline, not a production runtime snapshot for DB v3.7. A production implementation should follow the DB v3.7 design/implementation documents and reproduce the accepted UI style while reading the current database schema.
