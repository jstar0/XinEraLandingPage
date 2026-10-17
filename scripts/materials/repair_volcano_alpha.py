"""Restore only the original leaf alpha lost by the volcano surface exporter.

uv run --with numpy --with pillow python scripts/materials/repair_volcano_alpha.py
  --client /path/to/minecraft-26.1.2-client.jar [--write]

Default is validation/dry-run. The original BIN prefix is retained byte for byte;
the corrected tiny PNG is appended and the diffuse image points to its new view.
No geometry, index, UV, RGB pixel or emission image is rewritten.
"""

from pathlib import Path
import argparse
import io
import json
import struct
import zipfile

import numpy as np
from PIL import Image

from build_semantics import PUBLIC, atlas_image, digest, first_frame, padded, read_glb, scene_definitions, tile_pixels


def build_glb(document, binary):
    encoded = json.dumps(document, separators=(",", ":")).encode()
    encoded += b" " * (-len(encoded) % 4)
    binary += b"\0" * (-len(binary) % 4)
    return (struct.pack("<4sII", b"glTF", 2, 28 + len(encoded) + len(binary))
            + struct.pack("<I4s", len(encoded), b"JSON") + encoded
            + struct.pack("<I4s", len(binary), b"BIN\0") + binary)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--client", type=Path, required=True)
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--report", type=Path, default=Path(__file__).with_name("volcano-alpha-verification.json"))
    args = parser.parse_args()
    target = PUBLIC / "volcano.glb"
    original_file = target.read_bytes()
    document, binary = read_glb(target)
    atlas, image_index = atlas_image(document, binary)
    before_document = json.loads(json.dumps(document))
    updated = atlas.copy()
    changes = []
    with zipfile.ZipFile(args.client) as client:
        definitions, _ = scene_definitions("volcano", client, atlas)
        for definition in definitions:
            if "leaves" not in definition["texture"]:
                continue
            tile = definition["tile"]
            patch = tile_pixels(updated, tile)
            alpha = padded(first_frame(client, definition["texture"]))[:, :, 3]
            changes.append({"tile": tile, "texture": definition["texture"],
                            "restoredTransparentPixels": int((alpha < 128).sum()),
                            "changedAlphaPixels": int((patch[:, :, 3] != alpha).sum())})
            patch[:, :, 3] = alpha
            assert np.array_equal(tile_pixels(updated, tile)[:, :, :3], tile_pixels(atlas, tile)[:, :, :3])
    assert {change["tile"] for change in changes} == {3, 12, 13}
    assert np.array_equal(updated[:, :, :3], atlas[:, :, :3])
    for definition in definitions:
        if "leaves" not in definition["texture"]:
            assert np.array_equal(tile_pixels(updated, definition["tile"]), tile_pixels(atlas, definition["tile"]))
    previous = document.get("extras", {}).get("xineraLeafAlphaRepair")
    if previous and not sum(change["changedAlphaPixels"] for change in changes):
        assert next(material for material in document["materials"] if material["name"] == "terrain")["alphaMode"] == "MASK"
        print("Already repaired; verified the original alpha, no file changed.")
        return
    assert previous is None, "Unexpected partial previous patch; inspect before modifying"
    png = io.BytesIO()
    Image.fromarray(updated).save(png, format="PNG")
    payload = png.getvalue()
    original_length = len(binary)
    binary += b"\0" * (-len(binary) % 4)
    view_index = len(document["bufferViews"])
    document["bufferViews"].append({"buffer": 0, "byteOffset": len(binary), "byteLength": len(payload)})
    binary += payload
    document["images"][image_index]["bufferView"] = view_index
    document["buffers"][0]["byteLength"] = len(binary)
    terrain = next(material for material in document["materials"] if material["name"] == "terrain")
    terrain["alphaMode"] = "MASK"
    terrain["alphaCutoff"] = .45
    document.setdefault("extras", {})["xineraLeafAlphaRepair"] = {
        "originalBinLength": original_length,
        "originalImageBufferView": before_document["images"][image_index]["bufferView"],
        "bufferView": view_index,
        "leafTiles": [change["tile"] for change in changes],
        "rgbUnchanged": True,
    }
    for key in ["meshes", "accessors", "nodes", "scenes", "textures", "samplers"]:
        assert document.get(key) == before_document.get(key), key
    assert document["bufferViews"][:-1] == before_document["bufferViews"]
    assert binary[:original_length] == read_glb(target)[1]
    for before, after in zip(before_document["materials"], document["materials"]):
        assert before.get("emissiveTexture") == after.get("emissiveTexture")
        assert before.get("emissiveFactor") == after.get("emissiveFactor")
    output = build_glb(document, binary)
    report = {
        "mode": "applied" if args.write else "dry-run", "scene": "volcano", "leafTiles": changes,
        "beforeBytes": len(original_file), "beforeSha256": digest(original_file),
        "afterBytes": len(output), "afterSha256": digest(output),
        "atlasSize": [atlas.shape[1], atlas.shape[0]], "rgbPixelsUnchanged": True,
        "nonLeafPixelsUnchanged": True, "geometryUvAndEmissionUnchanged": True,
        "preservedBinPrefixBytes": original_length, "preservedBinPrefixSha256": digest(binary[:original_length]),
        "appendedPngBytes": len(payload), "appendedPngSha256": digest(payload),
        "terrainAlphaMode": "MASK", "terrainAlphaCutoff": .45,
        "limitations": "Existing source surface canopy shell is retained; this patch does not invent complete trees or missing canopy undersides.",
    }
    if args.write:
        target.write_bytes(output)
        actual_atlas, _ = atlas_image(*read_glb(target))
        assert np.array_equal(actual_atlas, updated)
    args.report.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
