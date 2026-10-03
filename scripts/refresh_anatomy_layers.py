"""Repack display layers only, preserving skin and localization assets."""
import gzip
import json
import struct
from prepare_3d import SOURCE, TARGET
from muscle_index import build_muscle_parts, build_bone_parts, is_muscle_part

atlas = json.loads((SOURCE / 'model/atlas_metadata.json').read_text(encoding='utf-8'))
metadata = json.loads((TARGET / 'skin.json').read_text(encoding='utf-8'))
chunks = {}
for key, predicate, identities in [
    ('muscles', is_muscle_part, build_muscle_parts),
    ('bones', lambda p: p['system'] == 'skeletal' and not is_muscle_part(p), build_bone_parts),
]:
    positions, normals, indices = bytearray(), bytearray(), []
    vertices = 0
    parts = [p for p in atlas['parts'] if predicate(p)]
    for p in parts:
        chunk = p['chunk']
        if chunk not in chunks:
            chunks[chunk] = gzip.decompress((SOURCE / f'model/chunks/body-{chunk}.bin.gz').read_bytes())
        raw, count = chunks[chunk], p['vertexCount']
        positions.extend(raw[p['positions']:p['positions'] + count * 12])
        normals.extend(raw[p['normals']:p['normals'] + count * 6])
        indices.extend(i + vertices for i in struct.unpack_from(f"<{p['indexCount']}I", raw, p['indices']))
        vertices += count
    padding = bytes(-(len(positions) + len(normals)) % 4)
    offset = len(positions) + len(normals) + len(padding)
    packed = positions + normals + padding + struct.pack(f'<{len(indices)}I', *indices)
    metadata[key] = {**metadata[key], 'vertexCount': vertices, 'positions': 0, 'normals': len(positions),
                     'indices': offset, 'indexCount': len(indices), 'partCount': len(parts), 'parts': identities(atlas)}
    assert sum(p['faceCount'] for p in metadata[key]['parts']) * 3 == len(indices)
    (TARGET / f'{key}.pack').write_bytes(gzip.compress(packed, compresslevel=9, mtime=0))
(TARGET / 'skin.json').write_text(json.dumps(metadata, ensure_ascii=False), encoding='utf-8')
print('Updated muscle and bone identities; skin and region atlas unchanged.')
