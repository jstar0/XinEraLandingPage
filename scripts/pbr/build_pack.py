"""Build the exact-name subset of VNR used by the exported XinEra scenes.

uv run --with pillow python scripts/pbr/build_pack.py --source /path/to/VNR
PNG I/O only uses Pillow; LabPBR channel conversion uses tested labpbr.mjs.
"""

from pathlib import Path
import argparse
import hashlib
import json
import math
import shutil
import subprocess

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
REVISION = "70d89ee4d401a27c4518ebab3b13897c2a6b6921"
URL = "https://github.com/Poudingue/Vanilla-Normals-Renewed"


def key(texture):
    return texture.removeprefix("minecraft:").removeprefix("block/")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    args = parser.parse_args()
    source = args.source.resolve()
    block = source / "assets/minecraft/textures/block"
    target = ROOT / "public/xinera/pbr"
    target.mkdir(parents=True, exist_ok=True)
    definitions = sorted((ROOT / "public/xinera").glob("*/*-materials.json"))
    scenes = {
        str(path.relative_to(ROOT / "public")): sorted({key(t["texture"]) for t in json.loads(path.read_text())["tiles"]})
        for path in definitions
    }
    required = sorted({name for names in scenes.values() for name in names})
    entries = []
    payload = bytearray()
    for name in required:
        normal_path = block / f"{name}_n.png"
        specular_path = block / f"{name}_s.png"
        if not normal_path.exists() and not specular_path.exists():
            continue
        images = []
        sources = {}
        for label, path, default in [
            ("normal", normal_path, (128, 128, 255, 255)),
            ("specular", specular_path, (0, 10, 0, 255)),
        ]:
            if path.exists():
                image = Image.open(path).convert("RGBA")
                if image.size != (16, 16):
                    raise ValueError(f"Unexpected texture dimensions: {path}: {image.size}")
                sources[label] = hashlib.sha256(path.read_bytes()).hexdigest()
            else:
                image = Image.new("RGBA", (16, 16), default)
            images.append(image.tobytes())
        for offset in range(0, 16 * 16 * 4, 4):
            payload.extend(images[0][offset:offset + 4])
            payload.extend(images[1][offset:offset + 4])
        entries.append({"key": name, "tile": len(entries), "normal": normal_path.exists(), "specular": specular_path.exists(), "sources": sources})
    converted = subprocess.run(["node", str(ROOT / "scripts/pbr/labpbr.mjs")], input=bytes(payload), stdout=subprocess.PIPE, check=True).stdout
    assert len(converted) == len(entries) * 16 * 16 * 9
    columns = 16
    rows = math.ceil(len(entries) / columns)
    atlases = {name: Image.new("RGB", (columns * 16, rows * 16)) for name in ["normal", "orm", "f0"]}
    for entry in entries:
        start = entry["tile"] * 16 * 16 * 9
        pixels = converted[start:start + 16 * 16 * 9]
        for channel, (name, atlas) in enumerate(atlases.items()):
            tile = bytes(value for offset in range(0, len(pixels), 9) for value in pixels[offset + channel * 3:offset + channel * 3 + 3])
            atlas.paste(Image.frombytes("RGB", (16, 16), tile), ((entry["tile"] % columns) * 16, (entry["tile"] // columns) * 16))
    files = {}
    for name, atlas in atlases.items():
        temporary = target / f"{name}.png"
        atlas.save(temporary, optimize=True)
        digest = hashlib.sha256(temporary.read_bytes()).hexdigest()
        filename = f"vnr-{name}-{digest[:12]}.png"
        temporary.rename(target / filename)
        files[name] = {"url": f"/xinera/pbr/{filename}", "sha256": digest, "bytes": (target / filename).stat().st_size}
    matched = {entry["key"] for entry in entries}
    manifest = {
        "version": 1,
        "source": {"name": "Vanilla Normals Renewed", "author": "Poudingue", "url": URL, "revision": REVISION},
        "encoding": {"standard": "LabPBR 1.3", "normal": "DirectX RG to OpenGL RGB; reconstruct Z", "orm": "R=normal.B AO; G=1-specular.R smoothness; B=(specular.G>=230)", "f0": "linear RGB=specular.G/255 for dielectric; metals use original block albedo", "colorSpace": "none", "flipY": False},
        "tileSize": 16, "columns": columns, "width": columns * 16, "height": rows * 16,
        "atlases": files,
        "textures": entries,
        "coverage": {"required": len(required), "matched": len(entries), "normal": sum(e["normal"] for e in entries), "specular": sum(e["specular"] for e in entries), "missing": sorted(set(required) - matched), "scenes": {name: {"required": len(names), "matched": len(set(names) & matched)} for name, names in scenes.items()}},
    }
    (target / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n")
    runtime = {
        "tileSize": 16, "columns": columns,
        "width": columns * 16, "height": rows * 16,
        "atlases": {name: value["url"] for name, value in files.items()},
        "textures": [[entry["key"], entry["tile"], int(entry["normal"]) + 2 * int(entry["specular"])] for entry in entries],
    }
    (target / "runtime.json").write_text(json.dumps(runtime, separators=(",", ":")) + "\n")
    shutil.copyfile(source / "README.md", target / "SOURCE-README.md")
    (target / "ATTRIBUTION.md").write_text(f"""# 材质来源与使用说明

本网站部分方块的法线、粗糙度、反射率贴图来自 **[Poudingue 的 Vanilla Normals Renewed]({URL})**。

- 原作者：Poudingue · [支持作者](https://www.patreon.com/Poudingue)
- 来源版本：[`{REVISION}`]({URL}/tree/{REVISION})
- 原始许可说明：[完整 README](/xinera/pbr/SOURCE-README.md)
- 作者允许使用、修改及再分发，要求不售卖并附项目或 Patreon 链接，且不可与 Realistico 混用。

这里只收录当前场景确实使用且原包存在的同名法线和高光贴图，保留场景原有基础颜色。未匹配的方块保留语义材质，不声称全部覆盖。

我们把 LabPBR 1.3 的 RG 法线转换为 Three.js 切线空间法线，把高光 R 转换为感知粗糙度。G 小于 230 时是电介质反射率，绝不解释为金属度；G 大于等于 230 时是金属类别。金属采用 Three.js 的金属度与原有基础颜色，未实现 LabPBR 命名金属的复数折射率；未实现视差遮挡或原包全套着色器。

当前覆盖 {len(entries)}/{len(required)} 种实际使用纹理名（法线 {sum(e['normal'] for e in entries)}，高光 {sum(e['specular'] for e in entries)}）。转换记录和原图 SHA256 见 [manifest](/xinera/pbr/manifest.json)。
""")
    print(json.dumps({"coverage": manifest["coverage"], "atlasBytes": sum(f["bytes"] for f in files.values()), "manifestBytes": (target / "manifest.json").stat().st_size, "atlases": files}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
