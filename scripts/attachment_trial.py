"""Export a local attachment review using unchanged, named source meshes."""
import gzip
import hashlib
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'baseline/RehabMind_LowerLimbV1_ImplementationBaseline_DBv3.7_2026-09-29/04_3D_Localization/model'
TARGET = ROOT / 'public/3d/attachment-trial.json'
NAMES = {
    'hip bone', 'femur', 'patella', 'tibia', 'fibula', 'talus', 'calcaneus',
    'rectus femoris', 'soleus', 'medial head of gastrocnemius',
    'lateral head of gastrocnemius', 'calcaneal tendon',
    'rhomboid major', 'rhomboid minor', 'scapula',
    'sixth cervical vertebra', 'seventh cervical vertebra',
    'first thoracic vertebra', 'second thoracic vertebra', 'third thoracic vertebra',
    'fourth thoracic vertebra', 'fifth thoracic vertebra', 'sixth thoracic vertebra',
}


def key(name):
    return name.lower().replace('right ', '').replace('left ', '')


def main():
    atlas = json.loads((SOURCE / 'atlas_metadata.json').read_text(encoding='utf-8'))
    chunks, meshes = {}, []
    for part in atlas['parts']:
        name = key(part['name'])
        if name not in NAMES:
            continue
        chunk = part['chunk']
        if chunk not in chunks:
            chunks[chunk] = gzip.decompress((SOURCE / f'chunks/body-{chunk}.bin.gz').read_bytes())
        raw = chunks[chunk]
        positions = raw[part['positions']:part['positions'] + part['vertexCount'] * 12]
        indices = raw[part['indices']:part['indices'] + part['indexCount'] * 4]
        meshes.append({
            'id': part['id'], 'conceptId': part['conceptId'], 'name': part['name'],
            'key': name, 'side': 'right' if 'right' in part['name'].lower() else 'left' if 'left' in part['name'].lower() else '',
            'role': 'tendon' if name == 'calcaneal tendon' else 'bone' if part['system'] == 'skeletal' else 'muscle',
            'positions': struct.unpack(f'<{part["vertexCount"] * 3}f', positions),
            'indices': struct.unpack(f'<{part["indexCount"]}I', indices),
            'sourceGeometrySha256': hashlib.sha256(positions + indices).hexdigest(),
        })
    assert len(meshes) == 38
    report = {
        'source': atlas['version'], 'scope': 'local feasibility review', 'meshes': meshes,
        'recovered': ['FJ1405', 'FJ1405M'],
        'rectusProximalTendon': {
            'status': 'no separate source part',
            'note': 'A whole-muscle mesh is present. Separate head identity and attachment footprint are not supplied; absence of a separate part alone does not prove absence of the shape.',
            'source': 'https://pubmed.ncbi.nlm.nih.gov/24793210/',
        },
    }
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(json.dumps(report, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'Exported {len(meshes)} unchanged source parts to {TARGET}')


if __name__ == '__main__':
    main()
