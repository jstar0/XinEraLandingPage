"""Add the cathedral's omitted source water without re-exporting its architecture.

uv run --with numpy --with pillow python scripts/materials/export_cathedral_water.py
  --client /path/to/minecraft-26.1.2-client.jar

Uses only the saved original source-volume NPZ, read-only. Fluid heights follow
the corrected homepage exporter: full-height interior falling-water columns,
MC level-derived exposed caps, and no internal faces between any water states.
"""

from pathlib import Path
import argparse
import collections
import io
import json
import zipfile

import numpy as np
from PIL import Image

from build_semantics import ROOT, PUBLIC, cathedral_template_scope, digest, first_frame, padded
from repair_volcano_alpha import build_glb


NORMALS = {
    "east": (1, 0, 0), "west": (-1, 0, 0), "up": (0, 1, 0),
    "down": (0, -1, 0), "south": (0, 0, 1), "north": (0, 0, -1),
}
FACES = {
    "east": [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]],
    "west": [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]],
    "up": [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
    "down": [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
    "south": [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
    "north": [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]],
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--client", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=PUBLIC / "cathedral-water.glb")
    parser.add_argument("--report", type=Path, default=Path(__file__).with_name("cathedral-water-verification.json"))
    args = parser.parse_args()
    source = ROOT / "design-exploration/2026-10-16-gallery-cathedral/assets/source-volume.npz"
    source_bytes = source.read_bytes()
    data = np.load(source)
    volume = data["volume"]
    original_volume_hash = digest(volume.tobytes())
    metadata = json.loads((PUBLIC / "cathedral-source.json").read_text())
    assert original_volume_hash == metadata["preservation"]["source_sha256"]
    main_path = PUBLIC / "cathedral.glb"
    main_hash = digest(main_path.read_bytes())
    states = [json.loads(str(state)) for state in data["states"]]
    water_ids = np.array([state["Name"] == "minecraft:water" for state in states])
    is_water = water_ids[volume]
    source_positions = np.argwhere(is_water)
    assert len(source_positions) == 1429
    bounds = metadata["world_bounds_exclusive"]
    origin = np.array([bounds["x"][0], bounds["y"][0], bounds["z"][0]])
    transform = metadata["transform"]
    offset = np.array([transform["center_x"], transform["origin_y"], transform["center_z"]])
    scale = transform["scale"]
    quads, normals, uvs = [], [], []
    face_counts = collections.Counter()
    culled = collections.Counter()
    source_heights = {}
    ny, nz, nx = volume.shape
    with zipfile.ZipFile(args.client) as client:
        scope, exporter_hash = cathedral_template_scope(client)
        assert scope["states"] == states
        full = np.array([scope["is_full"].get(i, False) for i in range(len(states))])
        atlas = np.zeros((20, 40, 4), np.uint8)
        for tile, texture in enumerate(["minecraft:block/water_still", "minecraft:block/water_flow"]):
            pixels = first_frame(client, texture)
            pixels[:, :, :3] = (pixels[:, :, :3] * np.array([.28, .58, .86])).astype(np.uint8)
            pixels[:, :, 3] = 80
            atlas[:, tile * 20:(tile + 1) * 20] = padded(pixels)
        for y, z, x in source_positions:
            state = states[int(volume[y, z, x])]
            level = int(state.get("Properties", {}).get("level", "0"))
            above = y + 1 < ny and is_water[y + 1, z, x]
            height = 1.0 if above else (8 - level) / 9 if level < 8 else 8 / 9
            source_heights[(int(y), int(z), int(x))] = height
            for face, normal in NORMALS.items():
                dx, dy, dz = normal
                xx, yy, zz = x + dx, y + dy, z + dz
                if 0 <= xx < nx and 0 <= yy < ny and 0 <= zz < nz:
                    neighbor = volume[yy, zz, xx]
                    if water_ids[neighbor]:
                        culled["internalWater"] += 1
                        continue
                    if full[neighbor]:
                        culled["againstOpaqueCube"] += 1
                        continue
                vertices = np.array(FACES[face], float)
                vertices[:, 1] *= height
                vertices += np.array([x, y, z]) + origin
                vertices = (vertices - offset) * scale
                quads.append(vertices)
                normals.append(np.tile(normal, (4, 1)))
                tile = 0 if face in {"up", "down"} else 1
                uv = np.array([[0, 1], [1, 1], [1, 0], [0, 0]], float)
                uv[:, 0] = (tile * 20 + 2 + uv[:, 0] * 16) / 40
                uv[:, 1] = 1 - (2 + uv[:, 1] * 16) / 20
                uvs.append(uv)
                face_counts["top" if face == "up" else "bottom" if face == "down" else "side"] += 1
    # Every pair of stacked source cells meets exactly; no recurring 1/32-block gaps.
    stacked = 0
    for (y, z, x), height in source_heights.items():
        if (y + 1, z, x) in source_heights:
            assert height == 1.0
            stacked += 1
    positions = np.array(quads, dtype="<f4").reshape(-1, 3)
    normal_array = np.array(normals, dtype="<f4").reshape(-1, 3)
    uv_array = np.array(uvs, dtype="<f4").reshape(-1, 2)
    indices = (np.arange(len(quads))[:, None, None] * 4 + np.array([[0, 1, 2], [0, 2, 3]])).reshape(-1).astype("<u4")
    # Assert outward winding and finite coordinates before creating a public artifact.
    triangles = positions[indices.reshape(-1, 3)]
    cross = np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0])
    assert np.all(np.einsum("ij,ij->i", cross, normal_array[indices[::3]]) > 0)
    assert np.isfinite(positions).all()
    binary = bytearray()
    views, accessors = [], []

    def append(payload, target=None):
        binary.extend(b"\0" * (-len(binary) % 4))
        view = {"buffer": 0, "byteOffset": len(binary), "byteLength": len(payload)}
        if target:
            view["target"] = target
        views.append(view)
        binary.extend(payload)
        return len(views) - 1

    for values, component, accessor_type, target in [
        (positions, 5126, "VEC3", 34962), (normal_array, 5126, "VEC3", 34962),
        (uv_array, 5126, "VEC2", 34962), (indices, 5125, "SCALAR", 34963),
    ]:
        accessor = {"bufferView": append(values.tobytes(), target), "componentType": component,
                    "count": len(values), "type": accessor_type}
        if accessor_type == "VEC3" and not accessors:
            accessor.update({"min": values.min(axis=0).tolist(), "max": values.max(axis=0).tolist()})
        accessors.append(accessor)
    png = io.BytesIO()
    Image.fromarray(atlas).save(png, format="PNG")
    image_view = append(png.getvalue())
    document = {
        "asset": {"version": "2.0", "generator": "XinEra saved-source fluid exporter"},
        "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [{"name": "water", "mesh": 0}],
        "meshes": [{"name": "water", "primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1, "TEXCOORD_0": 2}, "indices": 3, "material": 0}]}],
        "materials": [{"name": "water", "alphaMode": "BLEND", "doubleSided": True,
                       "pbrMetallicRoughness": {"baseColorTexture": {"index": 0}, "metallicFactor": 0, "roughnessFactor": .14}}],
        "images": [{"bufferView": image_view, "mimeType": "image/png"}],
        "textures": [{"source": 0, "sampler": 0}],
        "samplers": [{"magFilter": 9728, "minFilter": 9728, "wrapS": 33071, "wrapT": 33071}],
        "buffers": [{"byteLength": len(binary)}], "bufferViews": views, "accessors": accessors,
    }
    output = build_glb(document, bytes(binary))
    args.output.write_bytes(output)
    water_map = {"tiles": [{"tile": tile, "texture": texture, "kind": "water"}
                           for tile, texture in enumerate(["minecraft:block/water_still", "minecraft:block/water_flow"])]}
    (PUBLIC / "cathedral-water-materials.json").write_text(json.dumps(water_map, indent=2) + "\n")
    world_positions = source_positions[:, [2, 0, 1]] + origin
    assert digest(main_path.read_bytes()) == main_hash
    assert source.read_bytes() == source_bytes
    report = {
        "source": "saved original cathedral source-volume.npz (read-only)",
        "sourceVolumeSha256": original_volume_hash, "sourceFileSha256": digest(source_bytes),
        "templateExporterSha256": exporter_hash, "sourceWaterBlocks": len(source_positions),
        "sourceStateLevels": dict(collections.Counter(states[int(i)].get("Properties", {}).get("level", "0") for i in volume[is_water])),
        "sourceWorldBoundsInclusive": {"min": world_positions.min(axis=0).tolist(), "max": world_positions.max(axis=0).tolist()},
        "coordinateTransform": "[(worldX-208)*0.1, (worldY-64)*0.1, (worldZ+816)*0.1]",
        "localBounds": [positions.min(axis=0).tolist(), positions.max(axis=0).tolist()],
        "quads": dict(face_counts), "triangles": len(indices) // 3, "culledFaces": dict(culled),
        "stackedWaterPairsWithoutGap": stacked, "sourceUnchanged": True,
        "cathedralMainGlbUnchanged": True, "cathedralMainGlbSha256": main_hash,
        "bytes": len(output), "sha256": digest(output), "meshName": "water", "atlasSize": [40, 20],
        "limitations": "Vanilla first texture frames and the same level-height approximation as the homepage; this is the saved world snapshot, not live fluid simulation.",
    }
    args.report.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
