"""Export the full BodyParts3D figure with the demo's default visible layers."""

from __future__ import annotations

import gzip
import json
import struct
from surface_atlas import build_surface_atlas
from muscle_index import build_muscle_parts, build_bone_parts, is_muscle_part
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "baseline" / "RehabMind_LowerLimbV1_ImplementationBaseline_DBv3.7_2026-09-29" / "04_3D_Localization"
TARGET = ROOT / "public" / "3d"


def pack_part(raw: bytes, part: dict) -> tuple[bytes, dict]:
    vertices = part["vertexCount"]
    position_bytes = raw[part["positions"] : part["positions"] + vertices * 12]
    normal_bytes = raw[part["normals"] : part["normals"] + vertices * 6]
    index_bytes = raw[part["indices"] : part["indices"] + part["indexCount"] * 4]
    padding = bytes(-(len(position_bytes) + len(normal_bytes)) % 4)
    index_offset = len(position_bytes) + len(normal_bytes) + len(padding)
    return position_bytes + normal_bytes + padding + index_bytes, {
        "vertexCount": vertices,
        "faceCount": part["indexCount"] // 3,
        "positions": 0,
        "normals": len(position_bytes),
        "indices": index_offset,
        "indexCount": part["indexCount"],
    }


def main() -> None:
    atlas = json.loads((SOURCE / "model" / "atlas_metadata.json").read_text(encoding="utf-8"))
    semantics = json.loads((SOURCE / "semantics" / "skin_semantics_metadata.json").read_text(encoding="utf-8"))
    chunks: dict[int, bytes] = {}

    def raw_for(part: dict) -> bytes:
        chunk = part["chunk"]
        if chunk not in chunks:
            chunks[chunk] = gzip.decompress((SOURCE / "model" / "chunks" / f"body-{chunk}.bin.gz").read_bytes())
        return chunks[chunk]

    skin_part = next(part for part in atlas["parts"] if part["id"] == semantics["sourceMesh"]["partId"])
    skin_bytes, skin_info = pack_part(raw_for(skin_part), skin_part)
    if skin_info["faceCount"] != semantics["sourceMesh"]["faceCount"]:
        raise ValueError("Full Skin mesh and semantic face table do not match")

    surface_bytes, surface_info, surface_report = build_surface_atlas(
        ROOT, atlas, raw_for, skin_bytes, skin_info)

    def pack_layer(system: str) -> tuple[bytes, dict]:
        parts = [part for part in atlas['parts'] if is_muscle_part(part)] if system == 'muscular' else [
            part for part in atlas['parts'] if part['system'] == system and not is_muscle_part(part)]
        positions, normals, indices = bytearray(), bytearray(), []
        vertex_offset = 0
        for part in parts:
            raw = raw_for(part)
            count = part["vertexCount"]
            positions.extend(raw[part["positions"] : part["positions"] + count * 12])
            normals.extend(raw[part["normals"] : part["normals"] + count * 6])
            part_indices = struct.unpack_from(f"<{part['indexCount']}I", raw, part["indices"])
            indices.extend(index + vertex_offset for index in part_indices)
            vertex_offset += count
        padding = bytes(-(len(positions) + len(normals)) % 4)
        packed = positions + normals + padding + struct.pack(f"<{len(indices)}I", *indices)
        return packed, {
            "vertexCount": vertex_offset, "positions": 0, "normals": len(positions),
            "indices": len(positions) + len(normals) + len(padding), "indexCount": len(indices),
            "partCount": len(parts), "source": f"BodyParts3D 4.0 complete {system} layer",
        }

    bone_bytes, bones_info = pack_layer("skeletal")
    bones_info['parts'] = build_bone_parts(atlas)
    muscle_bytes, muscles_info = pack_layer("muscular")
    muscles_info['parts'] = build_muscle_parts(atlas)

    feature_bytes = bytearray()
    feature_info = []
    for name in ("Eyebrow", "Hair of head", "Lip"):
        part = next(part for part in atlas["parts"] if part["name"] == name)
        packed, info = pack_part(raw_for(part), part)
        start = len(feature_bytes)
        feature_bytes.extend(packed)
        feature_info.append({"name": name, **{key: start + value if key in ("positions", "normals", "indices") else value for key, value in info.items()}})

    TARGET.mkdir(parents=True, exist_ok=True)
    (TARGET / "skin.json").write_text(json.dumps({
        "mesh": {**skin_info, "source": "BodyParts3D 4.0 complete Skin mesh"},
        "bones": bones_info,
        "muscles": muscles_info,
        "features": feature_info,
        "surface_atlas": surface_info,
    }, ensure_ascii=False), encoding="utf-8")
    (TARGET / "skin.pack").write_bytes(gzip.compress(skin_bytes, compresslevel=9, mtime=0))
    (TARGET / "bones.pack").write_bytes(gzip.compress(bone_bytes, compresslevel=9, mtime=0))
    (TARGET / "muscles.pack").write_bytes(gzip.compress(muscle_bytes, compresslevel=9, mtime=0))
    (TARGET / "features.pack").write_bytes(gzip.compress(feature_bytes, compresslevel=9, mtime=0))
    (TARGET / "surface_atlas.bin").write_bytes(surface_bytes)
    audit_path = ROOT / 'build' / 'authoring' / 'surface-atlas-build.json'
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    audit_path.write_text(json.dumps(surface_report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for obsolete in ("skin.bin", "bones.bin", "skin.bin.gz", "bones.bin.gz", "features.bin.gz", "skin_semantics.bin"):
        (TARGET / obsolete).unlink(missing_ok=True)
    print(f"Prepared complete 3D figure: {skin_info['faceCount']} skin faces, {bones_info['partCount']} skeletal parts, {muscles_info['partCount']} muscular parts")


if __name__ == "__main__":
    main()
