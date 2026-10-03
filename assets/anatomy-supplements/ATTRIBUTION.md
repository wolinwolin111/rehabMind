# Supplemental muscle geometry

Source: [Z-Anatomy-Sample](https://github.com/LluisV/Z-Anatomy-Sample), LluisV / Z-Anatomy contributors; derived from the Z-Anatomy anatomical models.

Original asset: `Assets/Models/1.0 Models/MuscularSystem100.fbx`, Git blob `2477e1b6caf97d7174762b5eec6cf1c80db64eed`.
Registration skeleton: `Assets/Models/1.0 Models/SkeletalSystem100.fbx` from the same repository.

These adapted geometry files are licensed under [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/). Attribution and this license apply to these assets and their adaptations. The original sample README states CC-BY-SA 4.0. Baseline BodyParts3D assets retain their own attribution.

Changes: world transforms applied; centimetres converted to metres; coincident vertices welded; degenerate triangles removed; local bone registration and smooth spatial displacement into the existing skeleton; local deformation fairing; foot dorsal interossei separated by mesh connectivity; short teaching continuation of lumbar multifidus to dorsal sacrum added; source thoracolumbar fascia and linea alba preserved as separate connective structures; normals recalculated; packed into gzip binary assets. Anatomical names and book references are recorded separately. Geometry fit does not establish individual specimen or clinical measurement accuracy.

The middle thoracolumbar fascia medial boundary was additionally transferred toward the existing lumbar transverse-process tips. Its broad sheet is a teaching adaptation, not a reconstruction of every individual ligament or fascial attachment.

Reproduce: download the two official FBX inputs into `build/`, run `node scripts/authoring/extract_z_anatomy.mjs`, `py -3 scripts/authoring/register_missing_muscles.py`, `py -3 scripts/authoring/check_registration_field.py`, `py -3 scripts/authoring/review_missing_muscles.py`, then `py -3 scripts/prepare_3d.py`. Build consumes the compact assets and does not require downloading FBX files.
