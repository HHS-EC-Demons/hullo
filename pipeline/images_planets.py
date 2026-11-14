"""Large, sharp photos for the Moon, Mars and Orbit pages.

NEW photos come from the NASA Image and Video Library by NASA ID, always
the full resolution original. Each is cropped and scaled so its long edge
is at most the given size (2400 px by default) and never scaled up, then
written to site/src/assets/img/<slug>.jpg at JPEG quality 85.

LARGER re-renders photos that images.py lists in PHOTOS, from the same
originals and with the same crops, at a larger size so they stay sharp on
retina screens. Originals smaller than the target are kept at their own
size.

The ID, date, credit, page and pixel size of every photo go to
site/src/data/photos.json, merged with the entries already there. Every
credit is the one printed on the photo's Photojournal or NASA Image and
Video Library page. A crop is either fractions of the original (left, top,
right, bottom) or a pixel box. "mark" gives a point of the original, such
as Ingenuity in a wide mosaic, as fractions of the written image.

Run with .venv/bin/python images_planets.py, or name slugs to redo only
those, as in .venv/bin/python images_planets.py mars-van-zyl
"""

from __future__ import annotations

import io
import json
import sys
from pathlib import Path

from PIL import Image

import images

Image.MAX_IMAGE_PIXELS = 300_000_000

SITE = Path(__file__).resolve().parent.parent / "site"
OUT = SITE / "src" / "assets" / "img"
META = SITE / "src" / "data" / "photos.json"
QUALITY = 85

NEW = [
    {"slug": "moon-earthrise", "id": "as08-14-2383", "credit": "NASA", "date": "1968-12-24",
     "crop": (0.0, 0.33, 1.0, 0.8925)},
    {"slug": "moon-laser-station", "id": "GSFC_20171208_Archive_e001973", "credit": "NASA/GSFC",
     "date": "2010-09-18", "crop": (0.0, 0.0, 0.895, 1.0)},
    {"slug": "mars-van-zyl", "id": "PIA24663", "credit": "NASA/JPL-Caltech/ASU/MSSS",
     "date": "2021-04-15", "until": "2021-04-26", "crop": (0.318, 0.02, 0.838, 0.85)},
    {"slug": "mars-two-years", "id": "PIA25881", "credit": "NASA/JPL-Caltech/ASU/MSSS",
     "date": "2023-04-16"},
    {"slug": "mars-valinor", "id": "PIA26237", "credit": "NASA/JPL-Caltech/ASU/MSSS",
     "date": "2024-02-21", "box": (9671, 3165, 12071, 4365), "point": (10679, 3705)},
]

LARGER = {
    "moon-a11-reflector": 1800,
    "moon-a14-reflector": 1800,
    "moon-a15-reflector": 1800,
    "mars-selfie": 2400,
    "orbit-apollo11-surface": 1800,
    "orbit-apollo12-surface": 1800,
    "orbit-apollo14-surface": 1800,
    "orbit-apollo15-surface": 1800,
    "orbit-apollo16-surface": 1800,
    "orbit-apollo17-surface": 1800,
    "orbit-spirit-surface": 1800,
}


def cut(img: Image.Image, crop: tuple[float, float, float, float] | None, box: tuple[int, int, int, int] | None) -> Image.Image:
    if box:
        return img.crop(box)
    if crop:
        l, t, r, b = crop
        return img.crop((round(l * img.width), round(t * img.height), round(r * img.width), round(b * img.height)))
    return img


def fit(img: Image.Image, long_edge: int) -> Image.Image:
    scale = long_edge / max(img.width, img.height)
    if scale >= 1:
        return img
    return img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)


def save(img: Image.Image, slug: str) -> Path:
    dest = OUT / f"{slug}.jpg"
    img.save(dest, "JPEG", quality=QUALITY, optimize=True, progressive=True)
    return dest


def open_rgb(raw: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(raw))
    return img.convert("L" if img.mode in ("L", "I;16", "I") else "RGB")


def build_new(meta: dict, only: set[str]) -> None:
    for item in NEW:
        if only and item["slug"] not in only:
            continue
        data, raw = images.library(item["id"], True)
        img = cut(open_rgb(raw), item.get("crop"), item.get("box"))
        out = fit(img, item.get("long_edge", 2400))
        save(out, item["slug"])
        entry = {
            "id": item["id"],
            "observation": None,
            "title": data.get("title", "").strip(),
            "date": item["date"],
            "credit": item["credit"],
            "page": f"https://images.nasa.gov/details/{item['id']}",
            "width": out.width,
            "height": out.height,
            "cropped": "crop" in item or "box" in item,
        }
        if "until" in item:
            entry["until"] = item["until"]
        if "point" in item and "box" in item:
            x0, y0, x1, y1 = item["box"]
            px, py = item["point"]
            entry["mark"] = [round((px - x0) / (x1 - x0), 4), round((py - y0) / (y1 - y0), 4)]
        meta[item["slug"]] = entry


def build_larger(meta: dict, only: set[str]) -> None:
    by_slug = {p["slug"]: p for p in images.PHOTOS}
    for slug, long_edge in LARGER.items():
        if only and slug not in only:
            continue
        item = by_slug[slug]
        if "url" in item:
            raw = images.get(item["url"], images.CACHE / "direct" / f"{item['id']}-{item['url'].rsplit('/', 1)[1]}")
        else:
            _, raw = images.library(item["id"], True)
        out = fit(cut(open_rgb(raw), item.get("crop"), None), long_edge)
        save(out, slug)
        meta[slug]["width"] = out.width
        meta[slug]["height"] = out.height


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    only = set(sys.argv[1:])
    meta = json.loads(META.read_text())
    build_new(meta, only)
    build_larger(meta, only)
    META.write_text(json.dumps(meta, indent=1) + "\n")
    for slug in [i["slug"] for i in NEW] + list(LARGER):
        if only and slug not in only:
            continue
        m = meta[slug]
        size = (OUT / f"{slug}.jpg").stat().st_size
        print(f"{slug} {m['id']} {m['width']}x{m['height']} {size // 1024} KB")


if __name__ == "__main__":
    main()
