"""Append reviewed supplemental meshes while preserving every baseline face/vertex."""
from pathlib import Path
import gzip, hashlib, json, struct

def append_supplements(root: Path, packed: bytes, info: dict, layer='parts'):
    folder=root/'assets/anatomy-supplements'
    manifest=json.loads((folder/'manifest.json').read_text(encoding='utf-8'))
    positions=bytearray(packed[info['positions']:info['positions']+info['vertexCount']*12])
    normals=bytearray(packed[info['normals']:info['normals']+info['vertexCount']*6])
    indices=list(struct.unpack_from(f"<{info['indexCount']}I",packed,info['indices']))
    count=info['vertexCount'];parts=list(info['parts'])
    for part in manifest[layer]:
        raw=gzip.decompress((folder/part['file']).read_bytes())
        n=part['vertexCount'];first=len(indices)//3
        positions.extend(raw[part['positions']:part['positions']+n*12])
        normals.extend(raw[part['normals']:part['normals']+n*6])
        source=struct.unpack_from(f"<{part['indexCount']}I",raw,part['indices'])
        if not source or max(source)>=n:raise ValueError(f"Invalid mesh indices: {part['id']}")
        indices.extend(i+count for i in source);count+=n
        parts.append({k:part[k] for k in ['id','conceptId','name','displayName','side','sourceMesh','source','license']}|
                     {k:part[k] for k in ['relatedMuscles','kind'] if k in part}|
                     {'firstFace':first,'faceCount':len(source)//3,'sourceGeometrySha256':hashlib.sha256(raw).hexdigest()})
    padding=bytes(-(len(positions)+len(normals))%4)
    output=positions+normals+padding+struct.pack(f'<{len(indices)}I',*indices)
    return output,{**info,'positions':0,'normals':len(positions),'indices':len(positions)+len(normals)+len(padding),
                   'vertexCount':count,'indexCount':len(indices),'partCount':len(parts),'parts':parts,
                   'supplements':{'source':manifest['source'],'license':manifest['license'],'partCount':len(manifest[layer])}}
