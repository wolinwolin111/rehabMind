"""Preserve original muscle identities when packing the merged display mesh."""
import json
import re
from pathlib import Path

LABELS = {
    'subscapularis': '肩胛下肌', 'levator scapulae': '肩胛提肌',
    'rectus femoris': '股直肌', 'vastus medialis': '股内侧肌',
    'vastus lateralis': '股外侧肌', 'vastus intermedius': '股中间肌',
    'sartorius': '缝匠肌', 'gracilis': '股薄肌', 'pectineus': '耻骨肌',
    'adductor longus': '长收肌', 'adductor brevis': '短收肌',
    'adductor magnus': '大收肌', 'adductor minimus': '小收肌',
    'long head of biceps femoris': '股二头肌长头',
    'short head of biceps femoris': '股二头肌短头',
    'semimembranosus': '半膜肌', 'semitendinosus': '半腱肌',
    'popliteus': '腘肌', 'plantaris': '跖肌', 'soleus': '比目鱼肌',
    'medial head of gastrocnemius': '腓肠肌内侧头',
    'lateral head of gastrocnemius': '腓肠肌外侧头',
    'tibialis anterior': '胫骨前肌', 'tibialis posterior': '胫骨后肌',
    'fibularis longus': '腓骨长肌', 'fibularis brevis': '腓骨短肌',
    'fibularis tertius': '第三腓骨肌',
    'peroneus longus': '腓骨长肌', 'peroneus brevis': '腓骨短肌',
    'peroneus tertius': '第三腓骨肌',
    'extensor digitorum longus': '趾长伸肌',
    'extensor digitorum brevis': '趾短伸肌',
    'extensor hallucis longus': '拇长伸肌',
    'extensor hallucis brevis': '拇短伸肌',
    'flexor digitorum longus': '趾长屈肌',
    'flexor digitorum brevis': '趾短屈肌',
    'flexor hallucis longus': '拇长屈肌',
    'medial head of flexor hallucis brevis': '拇短屈肌内侧头',
    'lateral head of flexor hallucis brevis': '拇短屈肌外侧头',
    'oblique head of adductor hallucis': '拇收肌斜头',
    'transverse head of adductor hallucis': '拇收肌横头',
    'abductor hallucis': '拇展肌', 'flexor accessorius': '足底方肌',
    'quadratus plantae': '足底方肌',
    'abductor digiti minimi of foot': '小趾展肌',
    'flexor digiti minimi brevis of foot': '小趾短屈肌',
    'opponens digiti minimi of foot': '小趾对跖肌',
    'gluteus maximus': '臀大肌', 'gluteus medius': '臀中肌',
    'gluteus minimus': '臀小肌', 'tensor fasciae latae': '阔筋膜张肌',
    'iliacus': '髂肌', 'psoas major': '腰大肌', 'psoas minor': '腰小肌',
    'piriformis': '梨状肌', 'obturator internus': '闭孔内肌',
    'obturator externus': '闭孔外肌', 'gemellus superior': '上孖肌',
    'gemellus inferior': '下孖肌', 'quadratus femoris': '股方肌',
}
for number, chinese in [('first', '第1'), ('second', '第2'), ('third', '第3'), ('fourth', '第4')]:
    LABELS[f'{number} lumbrical of foot'] = f'{chinese}蚓状肌（足）'
    LABELS[f'{number} plantar interosseous of foot'] = f'{chinese}足底骨间肌'
    LABELS[f'{number} dorsal interosseous of foot'] = f'{chinese}足背骨间肌'


def muscle_key(name):
    return re.sub(r'\b(left|right)\b\s*', '', name.lower()).strip()


def is_muscle_part(part):
    # The source layer tags misclassify several named lower-limb muscles.
    return part['system'] == 'muscular' or muscle_key(part['name']) in LABELS


def build_muscle_parts(atlas):
    parts, first_face = [], 0
    for part in atlas['parts']:
        if not is_muscle_part(part):
            continue
        name = part['name']
        # These two source side labels contradict their coordinates:
        # FJ1469 lies at the right hand alongside FJ1514 and the right carpals.
        correction = {
            'FJ1469': 'Right flexor pollicis brevis',
            'FJ1469M': 'Left flexor pollicis brevis',
        }.get(part['id'])
        if correction:
            name = correction
        side_match = re.search(r'\b(left|right)\b', name, re.I)
        side = side_match.group(1).lower() if side_match else ''
        key = muscle_key(name)
        translated = LABELS.get(key)
        display = f"{'左侧' if side == 'left' else '右侧'} · {translated}" if translated and side else translated or name
        face_count = part['indexCount'] // 3
        identity = {'id': part['id'], 'conceptId': part['conceptId'], 'name': name,
                    'displayName': display, 'side': side, 'firstFace': first_face, 'faceCount': face_count}
        if correction:
            identity.update(sourceName=part['name'], sourceConceptId=part['conceptId'],
                            correctionReason='Source left/right label contradicts hand coordinates; geometry unchanged.')
        parts.append(identity)
        first_face += face_count
    return parts


def build_bone_parts(atlas):
    parts, first_face = [], 0
    for part in atlas['parts']:
        if part['system'] != 'skeletal' or is_muscle_part(part):
            continue
        name = part['name']
        side_match = re.search(r'\b(left|right)\b', name, re.I)
        count = part['indexCount'] // 3
        parts.append({'id': part['id'], 'conceptId': part['conceptId'], 'name': name,
                      'displayName': name, 'side': side_match.group(1).lower() if side_match else '',
                      'firstFace': first_face, 'faceCount': count})
        first_face += count
    return parts


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    source = root / 'baseline/RehabMind_LowerLimbV1_ImplementationBaseline_DBv3.7_2026-09-29/04_3D_Localization/model/atlas_metadata.json'
    target = root / 'public/3d/skin.json'
    atlas = json.loads(source.read_text(encoding='utf-8'))
    data = json.loads(target.read_text(encoding='utf-8'))
    from shared_distal_index import attach_shared_distal
    base = source.parent
    chunks = {}
    def raw_for(part):
        import gzip
        if part['chunk'] not in chunks:
            chunks[part['chunk']] = gzip.decompress((base / 'chunks' / f"body-{part['chunk']}.bin.gz").read_bytes())
        return chunks[part['chunk']]
    parts = attach_shared_distal(atlas, raw_for, build_muscle_parts(atlas)) + [p for p in data['muscles']['parts'] if p['id'].startswith('ZA-')]
    assert sum(part['faceCount'] for part in parts) * 3 == data['muscles']['indexCount']
    data['muscles']['parts'] = parts
    target.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
    print(f'Preserved {len(parts)} original muscle identities; mesh buffers unchanged.')
