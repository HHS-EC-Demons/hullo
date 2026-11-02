"""Real NASA photos for the Silent, Passport, Classroom and 404 pages.

Each photo is fetched from the NASA Image and Video Library by its NASA ID,
always from the full resolution original. The photo is cropped to its aspect
around a focus point (or to a fixed box), scaled down to at most 2400 px on
the long edge and never up, and saved as JPEG quality 85 to
site/src/assets/img/<slug>.jpg so astro:assets can serve AVIF and WebP.

The Silent object photos (4:3) go to site/src/data/silent-images.json and the
other page photos to site/src/data/page-images.json, each with the library
title, date, center, credit, item page, and alt text and a caption where the
library title does not describe the photo. The script stops if the credit in
the library (secondary creator, or the XMP credit in the file metadata)
differs from the credit written here.

Run with .venv/bin/python silent_images.py
"""

from __future__ import annotations

import io
import json
import time
from pathlib import Path

from PIL import Image

import net

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / "cache" / "silent"
SITE = ROOT.parent / "site"
OUT = SITE / "src" / "assets" / "img"
SILENT_META = SITE / "src" / "data" / "silent-images.json"
PAGE_META = SITE / "src" / "data" / "page-images.json"
API = "https://images-api.nasa.gov"
LONG_EDGE = 2400
QUALITY = 85

SILENT = [
    {"object": "insight", "id": "PIA25287", "credit": "NASA/JPL-Caltech", "focus": (0.5, 0.56), "zoom": 1.45},
    {"object": "opportunity", "id": "PIA22222", "credit": "NASA/JPL-Caltech", "focus": (0.52, 0.45), "zoom": 1.25},
    {"object": "cassini", "id": "PIA04603", "credit": "NASA/JPL", "focus": (0.5, 0.42), "zoom": 1.0},
    {"object": "spirit", "id": "PIA12007", "credit": "NASA/JPL-Caltech", "focus": (0.5, 0.58), "zoom": 1.0},
    {"object": "lcross", "id": "KSC-2009-1745", "credit": "NASA", "focus": (0.45, 0.5), "zoom": 1.0,
     "alt": "LCROSS, wrapped in gold foil, on a stand in a clean room in Florida."},
    {"object": "phoenix", "id": "KSC-07PD-1090", "credit": "NASA/George Shelton", "focus": (0.5, 0.64), "zoom": 1.3},
    {"object": "galileo", "id": "s34-72-070", "credit": "NASA", "focus": (0.47, 0.5), "zoom": 2.6},
    {"object": "pioneer10", "id": "ARC-1972-AC72-2135", "credit": "NASA", "focus": (0.5, 0.55), "zoom": 1.36,
     "alt": "Pioneer 10 at Cape Kennedy before launch, a foil wrapped body under a wide silver dish, with a technician standing behind."},
    {"object": "near", "id": "9701593", "credit": "NASA", "focus": (0.5, 0.45), "zoom": 1.0,
     "alt": "NEAR Shoemaker before launch at Kennedy Space Center, a gold body with a white dish on top and solar panels on the sides."},
    {"object": "lunarprospector", "id": "KSC-97PC1803", "credit": "NASA", "focus": (0.5, 0.45), "zoom": 1.0,
     "alt": "Lunar Prospector, a dark drum covered in solar cells, with two technicians preparing the spacecraft."},
    {"object": "pathfinder", "id": "PIA01122", "credit": "NASA/JPL", "focus": (0.5, 0.55), "zoom": 1.0,
     "alt": "The Sojourner rover, small and six wheeled with a flat solar panel on top, on rocky Martian ground."},
    {"object": "pioneer11", "id": "9139575", "credit": "NASA", "focus": (0.5, 0.5), "zoom": 1.0,
     "alt": "The Atlas-Centaur rocket carrying Pioneer 11 lifting off at night in a cloud of smoke."},
    {"object": "viking1", "id": "PIA00381", "credit": "NASA/JPL", "focus": (0.82, 0.5), "zoom": 1.0},
    {"object": "viking2", "id": "PIA00568", "credit": "NASA/JPL", "focus": (0.5, 0.55), "zoom": 1.0},
    {"object": "alsep", "id": "as12-47-6919", "credit": "NASA", "focus": (0.5, 0.5), "zoom": 1.0},
    {"object": "surveyor3", "id": "as12-48-7121", "credit": "NASA", "focus": (0.5, 0.55), "zoom": 1.0,
     "alt": "Surveyor 3 on the slope of its small crater, photographed by the Apollo 12 crew."},
]

PAGES = [
    {"slug": "silent-hero", "id": "AS12-48-7133", "credit": "NASA", "box": (0.0, 0.27, 1.0, 0.9367),
     "caption": "Charles Conrad Jr. checks Surveyor 3’s TV camera, with the Apollo 12 lander behind",
     "alt": "An astronaut in a white suit beside the spindly Surveyor 3 lander on grey lunar ground, with the Apollo 12 lunar module small on the horizon under a black sky."},
    {"slug": "passport-l1", "id": "PIA12967", "credit": "NASA/GSFC/Arizona State University", "aspect": 4 / 3,
     "focus": (0.495, 0.498), "zoom": 2.0,
     "caption": "Luna 17, which carried Lunokhod 1, seen from orbit by LRO",
     "alt": "Grey cratered ground on Mare Imbrium seen from orbit, with an arrow pointing at the small bright Luna 17 lander."},
    {"slug": "passport-l2", "id": "PIA12976", "credit": "NASA/GSFC/Arizona State University", "box": (0.0, 0.2, 1.0, 0.95),
     "caption": "Luna 21, which carried Lunokhod 2, and the rover’s tracks, seen by LRO",
     "alt": "The bright Luna 21 lander seen from orbit on the floor of Le Monnier crater, with faint rover tracks in the grey soil."},
    {"slug": "class-voyager1", "id": "PIA21747", "credit": "NASA/JPL-Caltech/KSC", "box": (0.0, 0.0, 1.0, 1.0),
     "caption": "Voyager 1 lifts off on a Titan Centaur rocket",
     "alt": "A white Titan Centaur rocket rising from its launch tower above a cloud of orange lit smoke."},
    {"slug": "nope-dss14", "id": "PIA26716", "credit": "NASA/JPL-Caltech", "box": (0.0, 0.0, 1.0, 1.0),
     "caption": "The 70 m dish DSS-14 at Goldstone, California, pointing at the night sky",
     "alt": "A huge white radio dish on a lit steel frame, tipped up toward a dark sky with faint stars."},
]


def get(url: str, path: Path) -> bytes:
    if path.exists():
        return path.read_bytes()
    path.parent.mkdir(parents=True, exist_ok=True)
    body = net.get(url.replace("http://", "https://"), timeout=600)
    path.write_bytes(body)
    time.sleep(0.5)
    return body


def focus_box(w: int, h: int, aspect: float, focus: tuple[float, float], zoom: float) -> tuple[int, int, int, int]:
    """Largest box of the aspect inside w by h, shrunk by zoom and centred on focus, kept inside the image."""
    bw, bh = (w, w / aspect) if w / h < aspect else (h * aspect, h)
    bw, bh = bw / zoom, bh / zoom
    cx = min(max(focus[0] * w, bw / 2), w - bw / 2)
    cy = min(max(focus[1] * h, bh / 2), h - bh / 2)
    return round(cx - bw / 2), round(cy - bh / 2), round(cx + bw / 2), round(cy + bh / 2)


def library(nasa_id: str) -> tuple[dict, Image.Image, str]:
    """Library record, full resolution original as RGB, and the XMP credit from the file metadata if any."""
    search = json.loads(get(f"{API}/search?nasa_id={nasa_id}", CACHE / f"{nasa_id}.search.json"))
    data = search["collection"]["items"][0]["data"][0]
    assets = json.loads(get(f"{API}/asset/{nasa_id}", CACHE / f"{nasa_id}.asset.json"))
    hrefs = [a["href"] for a in assets["collection"]["items"]]
    orig = next(h for h in hrefs if "~orig." in h.lower())
    meta_href = next((h for h in hrefs if h.endswith("metadata.json")), None)
    xmp = ""
    if meta_href:
        meta = json.loads(get(meta_href, CACHE / f"{nasa_id}.metadata.json"))
        xmp = str(meta.get("XMP:Credit") or "").strip()
    raw = get(orig, CACHE / f"{nasa_id}~orig{Path(orig).suffix.lower()}")
    return data, Image.open(io.BytesIO(raw)).convert("RGB"), xmp


def check_credit(nasa_id: str, data: dict, xmp: str, credit: str) -> None:
    for found in ((data.get("secondary_creator") or "").strip(), xmp):
        if found and found != credit:
            raise SystemExit(f"{nasa_id}: library credit {found!r} differs from {credit!r}")


def save(img: Image.Image, slug: str) -> Image.Image:
    scale = min(1.0, LONG_EDGE / max(img.width, img.height))
    if scale < 1.0:
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    img.save(OUT / f"{slug}.jpg", "JPEG", quality=QUALITY, optimize=True, progressive=True)
    return img


def record(nasa_id: str, data: dict, credit: str, img: Image.Image) -> dict:
    return {
        "nasa_id": nasa_id,
        "title": " ".join((data.get("title") or "").split()),
        "date": (data.get("date_created") or "")[:10],
        "center": data.get("center") or "",
        "credit": credit,
        "width": img.width,
        "height": img.height,
        "page": f"https://images.nasa.gov/details/{nasa_id}",
    }


def build() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    silent = []
    for item in SILENT:
        data, img, xmp = library(item["id"])
        check_credit(item["id"], data, xmp, item["credit"])
        img = save(img.crop(focus_box(img.width, img.height, 4 / 3, item["focus"], item["zoom"])), f"silent-{item['object']}")
        silent.append({"object": item["object"], **record(item["id"], data, item["credit"], img), **({"alt": item["alt"]} if "alt" in item else {})})
        print(f"silent-{item['object']:16} {item['id']:22} {img.width}x{img.height}")
    SILENT_META.write_text(json.dumps(silent, indent=1, ensure_ascii=False) + "\n")

    pages = {}
    for item in PAGES:
        data, img, xmp = library(item["id"])
        check_credit(item["id"], data, xmp, item["credit"])
        if "box" in item:
            x0, y0, x1, y1 = item["box"]
            box = (round(x0 * img.width), round(y0 * img.height), round(x1 * img.width), round(y1 * img.height))
        else:
            box = focus_box(img.width, img.height, item["aspect"], item["focus"], item["zoom"])
        img = save(img.crop(box), item["slug"])
        pages[item["slug"]] = {**record(item["id"], data, item["credit"], img), "caption": item["caption"], "alt": item["alt"]}
        print(f"{item['slug']:23} {item['id']:22} {img.width}x{img.height}")
    PAGE_META.write_text(json.dumps(pages, indent=1, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    build()
