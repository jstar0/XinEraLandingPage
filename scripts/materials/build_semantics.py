"""Recover and validate public material semantics against each exported atlas.

Run with uv run --with numpy --with pillow python scripts/materials/build_semantics.py
--client /path/to/minecraft-26.1.2-client.jar. No world archive is opened and no
geometry is exported. The archived exporter is parsed for pure template functions
only; its source-reading, terrain-editing and export statements are never run.
"""

from pathlib import Path
import argparse
import ast
import collections
import hashlib
import io
import json
import math
import struct
import zipfile

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public/xinera/gallery"
KINDS = {"stone", "wood", "leaves", "glass", "metal", "light", "water", "other"}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read_glb(path):
    raw = path.read_bytes()
    magic, version, length = struct.unpack_from("<4sII", raw)
    assert magic == b"glTF" and version == 2 and length == len(raw)
    json_length, kind = struct.unpack_from("<I4s", raw, 12)
    assert kind == b"JSON"
    document = json.loads(raw[20:20 + json_length])
    binary_length, kind = struct.unpack_from("<I4s", raw, 20 + json_length)
    assert kind == b"BIN\0"
    binary = raw[28 + json_length:28 + json_length + binary_length]
    assert len(binary) == binary_length
    return document, binary


def atlas_image(document, binary):
    texture = document["materials"][0]["pbrMetallicRoughness"]["baseColorTexture"]["index"]
    image_index = document["textures"][texture]["source"]
    view = document["bufferViews"][document["images"][image_index]["bufferView"]]
    start = view.get("byteOffset", 0)
    payload = binary[start:start + view["byteLength"]]
    return np.array(Image.open(io.BytesIO(payload)).convert("RGBA")), image_index


def first_frame(client, texture):
    namespace, path = texture.split(":", 1) if ":" in texture else ("minecraft", texture)
    image = Image.open(io.BytesIO(client.read(f"assets/{namespace}/textures/{path}.png"))).convert("RGBA")
    return np.array(image.crop((0, 0, image.width, image.width)).resize((16, 16), Image.Resampling.NEAREST))


def classify(texture):
    """Semantic response classes, never a claim that stone is metallic."""
    name = texture.rsplit("/", 1)[-1]
    if name.startswith("water_"):
        return "water"
    if "glass" in name or name in {"ice", "packed_ice", "blue_ice"}:
        return "glass"
    if (name in {"torch", "soul_torch", "redstone_torch", "glowstone", "sea_lantern",
                 "beacon", "end_rod", "jack_o_lantern", "lantern", "soul_lantern",
                 "shroomlight", "redstone_lamp_on", "glow_lichen", "magma"}
            or "froglight" in name or name.endswith("candle_lit")
            or name.startswith(("fire_", "soul_fire_", "lava_"))
            or name in {"campfire_fire", "soul_campfire_fire", "campfire_log_lit", "soul_campfire_log_lit"}):
        return "light"
    # Only thin foliage gets leaf transmission; grass/dirt/moss surfaces stay opaque.
    if ("leaves" in name or name.endswith("_sapling")
            or name in {"vine", "short_grass", "fern", "poppy", "azure_bluet", "dandelion",
                        "oxeye_daisy", "allium", "blue_orchid", "cornflower", "lily_of_the_valley",
                        "lily_pad", "seagrass", "sugar_cane", "bamboo_singleleaf"}
            or name.startswith(("tall_grass_", "large_fern_", "lilac_", "peony_", "rose_bush_",
                                "sunflower_", "carrots_stage", "potatoes_stage", "wheat_stage",
                                "sweet_berry_bush_")) or name.endswith("_tulip")
            or name.endswith("azalea_bush_plant")):
        return "leaves"
    if (name in {"iron_block", "gold_block", "copper_block", "iron_bars", "iron_trapdoor",
                 "iron_door_top", "iron_door_bottom", "iron_chain", "anvil", "anvil_top",
                 "chipped_anvil_top", "damaged_anvil_top", "lightning_rod", "exposed_lightning_rod",
                 "stonecutter_saw", "rail", "rail_corner", "tripwire_hook"}
            or name.startswith("cauldron_")):
        return "metal"
    if ("_log" in name or "_planks" in name or "_door_" in name or name.endswith("_trapdoor")
            or name.startswith(("crafting_table_", "jukebox_", "barrel_", "beehive_", "loom_",
                                "cartography_table_", "lectern_", "scaffolding_"))
            or name in {"ladder", "bookshelf", "lever", "redstone_torch_off", "note_block", "campfire_log", "bamboo_stalk"}):
        return "wood"
    if (name.endswith(("_ore", "_concrete", "_terracotta"))
            or any(part in name for part in ("stone", "diorite", "andesite", "granite", "quartz", "bricks", "prismarine", "deepslate"))
            or name in {"tuff", "netherrack", "gravel", "clay", "obsidian", "purpur_block", "flower_pot",
                        "diamond_block", "emerald_block", "lapis_block", "coal_block", "raw_iron_block"}
            or name.startswith(("furnace_", "blast_furnace_", "smoker_", "grindstone_"))):
        return "stone"
    return "other"


def padded(pixels):
    return np.pad(pixels, ((2, 2), (2, 2), (0, 0)), mode="edge")


def tile_pixels(atlas, tile):
    columns = atlas.shape[1] // 20
    x, y = tile % columns * 20, tile // columns * 20
    return atlas[y:y + 20, x:x + 20]


def template_pixels(client, texture, tint):
    pixels = first_frame(client, texture)
    if tint:
        pixels[:, :, :3] = (pixels[:, :, :3] * np.array([.59, .78, .34])).astype(np.uint8)
    if "water" in texture:
        pixels[:, :, :3] = (pixels[:, :, :3] * np.array([.28, .58, .86])).astype(np.uint8)
        pixels[:, :, 3] = 125
    if "glass" in texture:
        pixels[:, :, 3] = np.maximum(pixels[:, :, 3], 65)
    return pixels


def cathedral_template_scope(client):
    source = ROOT / "design-exploration/2026-10-16-gallery-cathedral/tools/export-cathedral.py"
    state_file = source.parents[1] / "assets/source-volume.npz"
    states = [json.loads(str(state)) for state in np.load(state_file)["states"]]
    allowed = {"read_json", "model", "match", "applications", "rotation", "texkey", "template"}
    parsed = ast.parse(source.read_text())
    definitions = [node for node in parsed.body if isinstance(node, ast.FunctionDef) and node.name in allowed]
    assert {node.name for node in definitions} == allowed
    scope = {"client": client, "np": np, "math": math, "json": json,
             "states": states, "models": {}, "blocks": {}, "textures": {},
             "is_full": {}, "missing": collections.Counter(),
             "skip": {"air", "cave_air", "void_air", "light", "barrier", "structure_void"},
             "normals": {"east": (1, 0, 0), "west": (-1, 0, 0), "up": (0, 1, 0),
                         "down": (0, -1, 0), "south": (0, 0, 1), "north": (0, 0, -1)}}
    exec(compile(ast.Module(body=definitions, type_ignores=[]), str(source), "exec"), scope)
    for index in range(len(states)):
        scope["template"](index)
    assert not scope["missing"], scope["missing"]
    return scope, digest(source.read_bytes())


def cathedral_textures(client):
    scope, exporter_sha = cathedral_template_scope(client)
    return [{"tile": tile, "texture": texture, "tint": tint}
            for (texture, tint), tile in scope["textures"].items()], exporter_sha


def volcano_candidates(client):
    source = ROOT / "design-exploration/2026-10-16-gallery-volcano/tools/export.py"
    parsed = ast.parse(source.read_text())
    definitions = [node for node in parsed.body if isinstance(node, ast.FunctionDef) and node.name == "texture"]
    assert len(definitions) == 1
    scope = {"client": client, "np": np, "io": io, "Image": Image,
             "textures": {}, "texture_images": {}, "missing": collections.Counter()}
    exec(compile(ast.Module(body=definitions, type_ignores=[]), str(source), "exec"), scope)
    names = {entry.rsplit("/", 1)[-1][:-4] for entry in client.namelist()
             if entry.startswith("assets/minecraft/textures/block/") and entry.endswith(".png")}
    names.update({"grass_block", "spruce_wood", "snow_block", "snow", "lava", "water", "oak_fence"})
    for name in sorted(names):
        for face in ["up", "west"]:
            scope["texture"]("minecraft:" + name, face)
    assert not scope["missing"], scope["missing"]
    candidates = collections.defaultdict(list)
    for (texture, tint), pixels in scope["texture_images"].items():
        candidates[np.array(pixels).tobytes()].append(("minecraft:block/" + texture, tint))
    return candidates, digest(source.read_bytes())


def scene_definitions(scene, client, atlas):
    if scene == "cathedral":
        definitions, exporter_sha = cathedral_textures(client)
        method = "pure template replay from archived states, then exact RGBA and gutter comparison"
    elif scene == "volcano":
        candidates, exporter_sha = volcano_candidates(client)
        definitions = []
        for tile in range(atlas.shape[0] // 20 * (atlas.shape[1] // 20)):
            pixels = tile_pixels(atlas, tile)
            if not pixels.any():
                continue
            original = pixels[2:18, 2:18].copy()
            # A repaired leaf tile can be compared to the exact old exporter output.
            original[original[:, :, 3] < 128] = [34, 58, 29, 255]
            matches = candidates.get(pixels[2:18, 2:18].tobytes(), []) or candidates.get(original.tobytes(), [])
            assert len(matches) == 1, (scene, tile, matches)
            texture, tint = matches[0]
            expected = first_frame(client, texture)
            if tint:
                expected[:, :, :3] = (expected[:, :, :3] * np.array(tint)).astype(np.uint8)
            if "leaves" in texture:
                expected[expected[:, :, 3] < 128] = [34, 58, 29, 255]
                compare = pixels.copy()
                compare[compare[:, :, 3] < 128] = [34, 58, 29, 255]
            else:
                compare = pixels
            assert np.array_equal(padded(expected), compare), (scene, tile, texture)
            definitions.append({"tile": tile, "texture": texture, "tint": tint})
        method = "exact RGBA and gutter match against the archived exporter's texture function"
    else:
        source = PUBLIC / f"{scene}-source.json"
        definitions = json.loads(source.read_text())["atlas"]["textures"]
        exporter_sha = None
        method = "recorded atlas insertion order, then exact RGBA and gutter comparison"
    if scene != "volcano":
        for definition in definitions:
            expected = padded(template_pixels(client, definition["texture"], definition["tint"]))
            assert np.array_equal(expected, tile_pixels(atlas, definition["tile"])), (scene, definition)
    assert [item["tile"] for item in definitions] == list(range(len(definitions)))
    return definitions, {"method": method, "exporterSha256": exporter_sha, "verifiedTiles": len(definitions),
                         "verifiedPixelsIncludingGutters": len(definitions) * 400}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--client", type=Path, required=True)
    parser.add_argument("--report", type=Path, default=Path(__file__).with_name("verification.json"))
    args = parser.parse_args()
    reports = []
    with zipfile.ZipFile(args.client) as client:
        for scene in ["cathedral", "volcano", "claire", "west", "asa", "royal", "north"]:
            model = PUBLIC / f"{scene}.glb"
            document, binary = read_glb(model)
            atlas, _ = atlas_image(document, binary)
            definitions, evidence = scene_definitions(scene, client, atlas)
            public = {"tiles": [{"tile": item["tile"], "texture": item["texture"], "kind": classify(item["texture"])}
                                for item in definitions]}
            assert all(item["kind"] in KINDS for item in public["tiles"])
            output = PUBLIC / f"{scene}-materials.json"
            output.write_text(json.dumps(public, ensure_ascii=False, indent=2) + "\n")
            evidence.update({"scene": scene, "modelBytes": model.stat().st_size,
                             "modelSha256": digest(model.read_bytes()), "atlasSize": [atlas.shape[1], atlas.shape[0]],
                             "mappingBytes": output.stat().st_size, "mappingSha256": digest(output.read_bytes()),
                             "kinds": dict(collections.Counter(item["kind"] for item in public["tiles"])),
                             "waterTiles": [item["tile"] for item in public["tiles"] if item["kind"] == "water"]})
            reports.append(evidence)
            print(json.dumps(evidence))
    args.report.write_text(json.dumps({"clientSha256": digest(args.client.read_bytes()), "scenes": reports}, indent=2) + "\n")


if __name__ == "__main__":
    main()
