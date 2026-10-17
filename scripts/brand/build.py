"""Subset native ChillBitmap glyphs and derive the existing vector brand mark.

Run from any directory:
  uv run --with pillow --with fonttools --with brotli python scripts/brand/build.py
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
TEXT = "心纪元"
LICENSE_COMMIT = "f9e3b2f988a2c4107f866aa43c3d61a2b27254d5"


def rectangles(alpha: Image.Image) -> list[tuple[int, int, int, int]]:
    """Merge identical horizontal alpha runs vertically, without smoothing edges."""
    values = alpha.load()
    active: dict[tuple[int, int], tuple[int, int, int, int]] = {}
    merged = []
    for y in range(alpha.height + 1):
        runs = []
        if y < alpha.height:
            x = 0
            while x < alpha.width:
                if values[x, y] < 128:
                    x += 1
                    continue
                start = x
                while x < alpha.width and values[x, y] >= 128:
                    x += 1
                runs.append((start, x))
        following = {}
        for key in runs:
            x0, x1 = key
            previous = active.pop(key, None)
            following[key] = (x0, previous[1] if previous else y, x1, y + 1)
        merged.extend(active.values())
        active = following
    return merged


def assert_same_alpha(alpha: Image.Image, rects: list[tuple[int, int, int, int]]) -> None:
    pixels = set()
    for x0, y0, x1, y1 in rects:
        for y in range(y0, y1):
            for x in range(x0, x1):
                assert (x, y) not in pixels, "Overlapping contour rectangles"
                pixels.add((x, y))
    source = {(x, y) for y in range(alpha.height) for x in range(alpha.width) if alpha.getpixel((x, y)) >= 128}
    assert pixels == source, "Conversion changed the source alpha silhouette"


def main() -> None:
    source = ROOT / "app/fonts/ChillBitmap_16px.ttf"
    original = TTFont(source, recalcTimestamp=False)
    font = TTFont(source, recalcTimestamp=False)
    license_path = ROOT / "scripts/brand/LICENSE-ChillBitmap.txt"
    license_text = license_path.read_text()
    options = Options()
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.name_legacy = True
    options.layout_features = []
    options.recalc_timestamp = False
    subsetter = Subsetter(options=options)
    subsetter.populate(text=TEXT)
    subsetter.subset(font)

    # OFL reserves the original family name. Rename only identity fields; preserve
    # copyright, author, source URL and original license notice in every language.
    replacement_names = {
        1: "XinEra Pixel Wordmark",
        3: "XinEra-Pixel-Wordmark-2026-10-17",
        4: "XinEra Pixel Wordmark Regular",
        6: "XinEraPixelWordmark-Regular",
        16: "XinEra Pixel Wordmark",
        17: "Regular",
    }
    for record in list(font["name"].names):
        value = replacement_names.get(record.nameID)
        if record.nameID == 13:
            value = record.toUnicode() + "\n\n" + license_text
        if value is not None:
            font["name"].setName(value, record.nameID, record.platformID, record.platEncID, record.langID)
    font["name"].setName(
        "Three-character web subset of ChillBitmap_16px by ChillType / Warren2060. "
        "Subset and WOFF2 conversion on 2026-10-17; original glyph outlines and metrics unchanged. "
        "Source: https://github.com/Warren2060/ChillBitmap",
        10, 3, 1, 0x409,
    )
    font.flavor = "woff2"
    destination = ROOT / "app/fonts/xinera-wordmark.woff2"
    destination.parent.mkdir(parents=True, exist_ok=True)
    font.save(destination)
    rebuilt = TTFont(destination)
    assert set(rebuilt.getBestCmap()) == {ord(char) for char in TEXT}
    glyph_metrics = {}
    for char in TEXT:
        before_name = original.getBestCmap()[ord(char)]
        after_name = rebuilt.getBestCmap()[ord(char)]
        before = original["glyf"][before_name]
        after = rebuilt["glyf"][after_name]
        assert before.getCoordinates(original["glyf"]) == after.getCoordinates(rebuilt["glyf"])
        assert original["hmtx"][before_name] == rebuilt["hmtx"][after_name]
        coordinates, _, _ = after.getCoordinates(rebuilt["glyf"])
        assert all(x % 64 == 0 and y % 64 == 0 for x, y in coordinates)
        glyph_metrics[char] = {
            "advance": rebuilt["hmtx"][after_name][0],
            "contours": after.numberOfContours,
            "bounds": [after.xMin, after.yMin, after.xMax, after.yMax],
        }
    for record in original["name"].names:
        if record.nameID in {0, 8, 9, 12, 14}:
            preserved = rebuilt["name"].getName(record.nameID, record.platformID, record.platEncID, record.langID)
            assert preserved is not None and preserved.toUnicode() == record.toUnicode()
    assert license_text in rebuilt["name"].getDebugName(13)

    logo_source = ROOT / "public/xinera/logo-pixel-96-mono.png"
    logo = Image.open(logo_source).convert("RGBA").getchannel("A")
    rects = rectangles(logo)
    assert_same_alpha(logo, rects)
    path = "".join(f"M{x0} {y0}h{x1-x0}v{y1-y0}H{x0}Z" for x0, y0, x1, y1 in rects)
    component = ROOT / "components/site/brand.tsx"
    text = component.read_text()
    text, matches = re.subn(
        r"// BEGIN GENERATED BRAND MARK.*?// END GENERATED BRAND MARK",
        f'// BEGIN GENERATED BRAND MARK\nconst markPath =\n  "{path}";\n// END GENERATED BRAND MARK',
        text,
        flags=re.S,
    )
    assert matches == 1, "Expected one generated mark block"
    component.write_text(text)
    favicon = ROOT / "public/xinera/brand-mark.svg"
    favicon.write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">\n'
        '  <title>心纪元</title>\n'
        '  <style>:root{color:#253043}@media(prefers-color-scheme:dark){:root{color:#ebebeb}}</style>\n'
        f'  <path fill="currentColor" d="{path}"/>\n'
        '</svg>\n'
    )
    report = {
        "wordmark_source": "app/fonts/ChillBitmap_16px.ttf",
        "wordmark_source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "logo_source_sha256": hashlib.sha256(logo_source.read_bytes()).hexdigest(),
        "woff2_bytes": destination.stat().st_size,
        "woff2_sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
        "units_per_em": rebuilt["head"].unitsPerEm,
        "ascent": rebuilt["hhea"].ascent,
        "descent": rebuilt["hhea"].descent,
        "native_pixel_grid": 16,
        "glyph_metrics": glyph_metrics,
        "source_glyphs_and_metrics_unchanged": True,
        "copyright_and_author_names_preserved": True,
        "full_ofl_embedded": True,
        "license_source_commit": LICENSE_COMMIT,
        "license_sha256": hashlib.sha256(license_path.read_bytes()).hexdigest(),
        "logo_rectangles": len(rects),
        "favicon_bytes": favicon.stat().st_size,
        "logo_alpha_mismatch_pixels": 0,
    }
    (ROOT / "scripts/brand/verification.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
