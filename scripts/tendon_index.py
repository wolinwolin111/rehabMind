"""Named original connective structures and their movement-system relationships."""
import gzip
import hashlib
import json
import re
import struct
from pathlib import Path

RELATED = ['medial head of gastrocnemius', 'lateral head of gastrocnemius', 'soleus']
STRUCTURES = {
    'calcaneal tendon': ('跟腱', 'tendon', RELATED, ['FJ1405', 'FJ1405M']),
    'iliotibial tract': ('髂胫束', 'fascia', ['tensor fasciae latae', 'gluteus maximus'], ['FJ1423', 'FJ1423M']),
    'interosseous membrane of leg': ('胫腓骨间膜', 'membrane', ['tibialis anterior', 'tibialis posterior', 'extensor hallucis longus', 'extensor digitorum longus', 'flexor hallucis longus', 'fibularis tertius'], ['FJ1392', 'FJ1392M']),
    'interosseous membrane of forearm': ('前臂骨间膜', 'membrane', ['flexor digitorum profundus', 'flexor pollicis longus', 'abductor pollicis longus', 'extensor pollicis brevis', 'extensor pollicis longus', 'extensor indicis'], ['FJ1476', 'FJ1476M']),
    'long plantar ligament': ('足底长韧带', 'ligament', ['flexor accessorius'], ['FJ1424', 'FJ1424M']),
}


def structure_for(part):
    key = re.sub(r'\b(left|right)\b\s*', '', part['name'].lower()).strip()
    spec = STRUCTURES.get(key)
    return spec if spec and part['id'] in spec[3] else None


def is_tendon_part(part):
    return structure_for(part) is not None


def pack_tendons(atlas, raw_for):
    positions, normals, indices, identities = bytearray(), bytearray(), [], []
    vertices = 0
    for part in atlas['parts']:
        if not is_tendon_part(part):
            continue
        raw, count = raw_for(part), part['vertexCount']
        label, kind, related, _ = structure_for(part)
        positions.extend(raw[part['positions']:part['positions'] + count * 12])
        normals.extend(raw[part['normals']:part['normals'] + count * 6])
        side = re.search(r'\b(left|right)\b', part['name'], re.I).group(1).lower()
        identities.append({'id': part['id'], 'conceptId': part['conceptId'], 'name': part['name'],
                           'displayName': f"{'左侧' if side == 'left' else '右侧'} · {label}", 'side': side, 'kind': kind,
                           'firstFace': len(indices) // 3, 'faceCount': part['indexCount'] // 3,
                           'relatedMuscles': related, 'source': 'BodyParts3D 4.0 original connective mesh',
                           'sourceGeometrySha256': hashlib.sha256(raw[part['positions']:part['positions']+count*12] + raw[part['indices']:part['indices']+part['indexCount']*4]).hexdigest()})
        indices.extend(i + vertices for i in struct.unpack_from(f"<{part['indexCount']}I", raw, part['indices']))
        vertices += count
    padding = bytes(-(len(positions) + len(normals)) % 4)
    offset = len(positions) + len(normals) + len(padding)
    packed = positions + normals + padding + struct.pack(f'<{len(indices)}I', *indices)
    info = {'vertexCount': vertices, 'positions': 0, 'normals': len(positions), 'indices': offset,
            'indexCount': len(indices), 'partCount': len(identities), 'parts': identities,
            'source': 'BodyParts3D 4.0 selected movement-system connective structures'}
    return packed, info


def main():
    root = Path(__file__).resolve().parents[1]
    source = root / 'baseline/RehabMind_LowerLimbV1_ImplementationBaseline_DBv3.7_2026-09-29/04_3D_Localization/model'
    target = root / 'public/3d'
    atlas = json.loads((source / 'atlas_metadata.json').read_text(encoding='utf-8'))
    chunks = {}
    def raw_for(part):
        chunk = part['chunk']
        if chunk not in chunks:
            chunks[chunk] = gzip.decompress((source / f'chunks/body-{chunk}.bin.gz').read_bytes())
        return chunks[chunk]
    packed, info = pack_tendons(atlas, raw_for)
    from anatomy_supplements import append_supplements
    packed, info = append_supplements(root, packed, info, 'connective')
    metadata = json.loads((target / 'skin.json').read_text(encoding='utf-8'))
    metadata['tendons'] = info
    (target / 'tendons.pack').write_bytes(gzip.compress(packed, compresslevel=9, mtime=0))
    (target / 'skin.json').write_text(json.dumps(metadata, ensure_ascii=False), encoding='utf-8')
    print(f"Restored {info['partCount']} sourced connective parts; original bone, muscle and skin buffers unchanged.")


if __name__ == '__main__':
    main()
