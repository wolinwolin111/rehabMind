"""Select unchanged distal source triangles for solo display of split heads.

This is a display segmentation, not a histological muscle/tendon boundary.
Never borrow an entire donor head or transform its original coordinates.
"""
import gzip
import hashlib
import json
import struct
from pathlib import Path

# Reviewed source terminal planes: just proximal to each recipient's end.
# FCU needs more overlap because the two head meshes meet obliquely.
PAIRS = [('FJ1512', 'FJ1478', .005), ('FJ1512M', 'FJ1478M', .005),
         ('FJ1518', 'FJ1473', .030), ('FJ1518M', 'FJ1473M', .030)]


def attach_shared_distal(atlas, raw_for, identities):
    originals = {p['id']: p for p in atlas['parts']}
    targets = {p['id']: p for p in identities}
    for recipient_id, donor_id, overlap in PAIRS:
        recipient, donor = originals[recipient_id], originals[donor_id]
        recipient_raw, donor_raw = raw_for(recipient), raw_for(donor)
        rp = struct.unpack_from(f"<{recipient['vertexCount'] * 3}f", recipient_raw, recipient['positions'])
        positions = struct.unpack_from(f"<{donor['vertexCount'] * 3}f", donor_raw, donor['positions'])
        indices = struct.unpack_from(f"<{donor['indexCount']}I", donor_raw, donor['indices'])
        cutoff = min(rp[1::3]) + overlap
        # Keep full source triangles crossing the plane, including the join.
        # Selecting only triangles entirely below it leaves an open seam.
        faces = [face for face in range(len(indices) // 3)
                 if min(positions[indices[face * 3 + n] * 3 + 1] for n in range(3)) <= cutoff]
        assert faces and len(faces) < len(indices) // 3
        position_bytes = donor_raw[donor['positions']:donor['positions'] + donor['vertexCount'] * 12]
        index_bytes = donor_raw[donor['indices']:donor['indices'] + donor['indexCount'] * 4]
        assert targets[recipient_id]['side'] == targets[donor_id]['side']
        targets[recipient_id]['sharedDistal'] = {
            'donorId': donor_id, 'donorName': donor['name'], 'donorConceptId': donor['conceptId'],
            'sourceGeometrySha256': hashlib.sha256(position_bytes + index_bytes).hexdigest(),
            'faces': faces, 'cutoffY': cutoff, 'overlapMm': overlap * 1000,
            'selectionMethod': 'retain_distal_and_plane_crossing_original_triangles',
            'status': 'unchanged_source_distal_display_segment_not_verified_tendon_boundary',
        }
    return identities


def main():
    root = Path(__file__).resolve().parents[1]
    source = root / 'baseline/RehabMind_LowerLimbV1_ImplementationBaseline_DBv3.7_2026-09-29/04_3D_Localization/model'
    atlas = json.loads((source / 'atlas_metadata.json').read_text(encoding='utf-8'))
    from muscle_index import build_muscle_parts
    chunks = {}
    def raw_for(part):
        chunk = part['chunk']
        if chunk not in chunks:
            chunks[chunk] = gzip.decompress((source / f'chunks/body-{chunk}.bin.gz').read_bytes())
        return chunks[chunk]
    parts = attach_shared_distal(atlas, raw_for, build_muscle_parts(atlas))
    target = root / 'public/3d/skin.json'
    metadata = json.loads(target.read_text(encoding='utf-8'))
    metadata['muscles']['parts'] = parts
    target.write_text(json.dumps(metadata, ensure_ascii=False), encoding='utf-8')
    print(json.dumps([{'id': p['id'], 'donor': p['sharedDistal']['donorId'],
                       'selectedFaces': len(p['sharedDistal']['faces']), 'sourceFaces': next(d['faceCount'] for d in parts if d['id'] == p['sharedDistal']['donorId'])}
                      for p in parts if 'sharedDistal' in p], indent=2))


if __name__ == '__main__':
    main()
