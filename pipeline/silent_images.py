"""One public domain photo for each silent object on the Silent page.

Each photo is fetched from the NASA Image and Video Library by its NASA ID,
cropped to 4:3 around a focus point, scaled to 1200 px wide and saved to
site/src/assets/img/silent-<object id>.jpg so astro:assets can serve AVIF and
WebP. The title, date, center and credit from the library go to
site/src/data/silent-images.json. The script stops if the library's credit
for a JPL photo differs from the credit written here.

Run with .venv/bin/python silent_images.py
"""

from __future__ import annotations

import io
import json
import time
from pathlib import Path

from PIL import Image

import net

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / "cache" / "silent"
SITE = ROOT.parent / "site"
OUT = SITE / "src" / "assets" / "img"
META = SITE / "src" / "data" / "silent-images.json"
API = "https://images-api.nasa.gov"
WIDTH = 1200
ASPECT = 4 / 3

ITEMS = [
    {"object": "insight", "id": "PIA25287", "credit": "NASA/JPL-Caltech", "focus": (0.5, 0.56), "zoom": 1.45},
    {"object": "opportunity", "id": "PIA22222", "credit": "NASA/JPL-Caltech", "focus": (0.52, 0.45), "zoom": 1.25},
    {"object": "cassini", "id": "PIA04603", "credit": "NASA/JPL", "focus": (0.5, 0.42), "zoom": 1.0},
    {"object": "spirit", "id": "PIA12007", "credit": "NASA/JPL-Caltech", "focus": (0.5, 0.58), "zoom": 1.0},
    {"object": "lcross", "id": "KSC-2009-1745", "credit": "NASA", "focus": (0.45, 0.5), "zoom": 1.0},
    {"object": "phoenix", "id": "KSC-07PD-1090", "credit": "NASA", "focus": (0.5, 0.64), "zoom": 1.3},
    {"object": "galileo", "id": "s34-72-070", "credit": "NASA", "focus": (0.47, 0.5), "zoom": 2.6},
    {"object": "pioneer10", "id": "ARC-1972-AC72-2135", "credit": "NASA", "focus": (0.5, 0.55), "zoom": 1.36},
    {"object": "near", "id": "9701593", "credit": "NASA", "focus": (0.5, 0.45), "zoom": 1.0},
    {"object": "lunarprospector", "id": "KSC-97PC1803", "credit": "NASA", "focus": (0.5, 0.45), "zoom": 1.0},
    {"object": "pathfinder", "id": "PIA01122", "credit": "NASA/JPL", "focus": (0.5, 0.55), "zoom": 1.0},
    {"object": "pioneer11", "id": "9139575", "credit": "NASA", "focus": (0.5, 0.5), "zoom": 1.0},
    {"object": "viking1", "id": "PIA00381", "credit": "NASA/JPL", "focus": (0.82, 0.5), "zoom": 1.0},
    {"object": "viking2", "id": "PIA00568", "credit": "NASA/JPL", "focus": (0.5, 0.55), "zoom": 1.0},
    {"object": "alsep", "id": "as12-47-6919", "credit": "NASA", "focus": (0.5, 0.5), "zoom": 1.0},
    {"object": "surveyor3", "id": "AS12-48-7133", "credit": "NASA", "focus": (0.5, 0.5), "zoom": 1.0},
]


def get(url: str, path: Path) -> bytes:
    if path.exists():
        return path.read_bytes()
    path.parent.mkdir(parents=True, exist_ok=True)
    body = net.get(url.replace("http://", "https://"), timeout=180)
    path.write_bytes(body)
    time.sleep(0.5)
    return body


def crop_box(w: int, h: int, focus: tuple[float, float], zoom: float) -> tuple[int, int, int, int]:
    """Largest 4:3 box inside w by h, shrunk by zoom and centred on focus, kept inside the image."""
    bw, bh = (w, w / ASPECT) if w / h < ASPECT else (h * ASPECT, h)
    bw, bh = bw / zoom, bh / zoom
    cx = min(max(focus[0] * w, bw / 2), w - bw / 2)
    cy = min(max(focus[1] * h, bh / 2), h - bh / 2)
    return round(cx - bw / 2), round(cy - bh / 2), round(cx + bw / 2), round(cy + bh / 2)


def build() -> list[dict]:
    OUT.mkdir(parents=True, exist_ok=True)
    meta = []
    for item in ITEMS:
        nasa_id = item["id"]
        search = json.loads(get(f"{API}/search?nasa_id={nasa_id}", CACHE / f"{nasa_id}.search.json"))
        data = search["collection"]["items"][0]["data"][0]
        library_credit = (data.get("secondary_creator") or "").strip()
        if library_credit and library_credit != item["credit"]:
            raise SystemExit(f"{nasa_id}: library credit {library_credit!r} differs from {item['credit']!r}")
        assets = json.loads(get(f"{API}/asset/{nasa_id}", CACHE / f"{nasa_id}.asset.json"))
        hrefs = [a["href"] for a in assets["collection"]["items"] if a["href"].lower().endswith((".jpg", ".jpeg", ".png", ".tif"))]
        pick = next(h for tag in ("~large", "~orig", "~medium") for h in hrefs if tag in h and not h.lower().endswith(".tif"))
        raw = get(pick, CACHE / f"{nasa_id}{pick.rsplit('~', 1)[1]}")
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        img = img.crop(crop_box(img.width, img.height, item["focus"], item["zoom"]))
        if img.width > WIDTH:
            img = img.resize((WIDTH, round(WIDTH / ASPECT)), Image.LANCZOS)
        dest = OUT / f"silent-{item['object']}.jpg"
        img.save(dest, "JPEG", quality=84, optimize=True, progressive=True)
        meta.append({
            "object": item["object"],
            "nasa_id": nasa_id,
            "title": " ".join((data.get("title") or "").split()),
            "date": (data.get("date_created") or "")[:10],
            "center": data.get("center") or "",
            "credit": item["credit"],
            "width": img.width,
            "height": img.height,
            "page": f"https://images.nasa.gov/details/{nasa_id}",
        })
        print(f"{item['object']:16} {nasa_id:22} {img.width}x{img.height}")
    META.write_text(json.dumps(meta, indent=1, ensure_ascii=False) + "\n")
    return meta


if __name__ == "__main__":
    build()
