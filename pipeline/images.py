"""Public domain photos from NASA, saved with their ID, date and credit.

ITEMS are fetched from the NASA Image and Video Library by NASA ID,
cropped and written to site/src/assets/img/home-<slug>.jpg, with their
metadata in site/public/data/images.json.

The Moon, Mars and Orbit photos and site/src/data/photos.json belong to
images_planets.py, which build() runs after the home items, so a rerun of
this step keeps their full size and every photos.json entry.

Run with .venv/bin/python images.py, or as the images step of build.py.
"""

from __future__ import annotations

import io
import json
import time
from pathlib import Path

from PIL import Image

import net

Image.MAX_IMAGE_PIXELS = 200_000_000

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / "cache" / "images"
SITE = ROOT.parent / "site"
API = "https://images-api.nasa.gov"

ITEMS = [
    {"id": "PIA23645", "slug": "pale-blue-dot", "width": 900, "credit": "NASA/JPL-Caltech",
     "crop": (0.48, 0.4037, 0.7094, 0.6935)},
    {"id": "as11-37-5551", "slug": "apollo11-reflector", "width": 900, "credit": "NASA",
     "crop": (0.35, 0.03, 0.85, 0.405)},
]


def get(url: str, path: Path) -> bytes:
    if path.exists():
        return path.read_bytes()
    path.parent.mkdir(parents=True, exist_ok=True)
    body = net.get(url.replace("http://", "https://"), timeout=120)
    path.write_bytes(body)
    time.sleep(0.5)
    return body


def library(nasa_id: str, prefer_orig: bool) -> tuple[dict, bytes]:
    search = json.loads(get(f"{API}/search?nasa_id={nasa_id}", CACHE / f"{nasa_id}.search.json"))
    data = search["collection"]["items"][0]["data"][0]
    assets = json.loads(get(f"{API}/asset/{nasa_id}", CACHE / f"{nasa_id}.asset.json"))
    hrefs = [a["href"] for a in assets["collection"]["items"]]
    order = ["~orig", "~large"] if prefer_orig else ["~large", "~orig"]
    pick = next(h for tag in order for h in hrefs if tag in h and h.lower().endswith((".jpg", ".jpeg", ".png", ".tif")))
    raw = get(pick, CACHE / f"{nasa_id}{pick.rsplit('~', 1)[1].split('.')[0]}.{pick.rsplit('.', 1)[1].lower()}")
    return data, raw


def build(site_public: Path) -> list[dict]:
    out_dir = SITE / "src" / "assets" / "img"
    out_dir.mkdir(parents=True, exist_ok=True)
    meta = []
    for item in ITEMS:
        data, raw = library(item["id"], "crop" in item)
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        if "crop" in item:
            l, t, r, b = item["crop"]
            img = img.crop((round(l * img.width), round(t * img.height), round(r * img.width), round(b * img.height)))
        if img.width > item["width"]:
            img = img.resize((item["width"], round(img.height * item["width"] / img.width)), Image.LANCZOS)
        dest = out_dir / f"home-{item['slug']}.jpg"
        img.save(dest, "JPEG", quality=80, optimize=True, progressive=True)
        meta.append({
            "slug": item["slug"],
            "nasa_id": item["id"],
            "title": data.get("title", "").strip(),
            "date": data.get("date_created", "")[:10],
            "center": data.get("center", ""),
            "credit": item["credit"],
            "width": img.width,
            "height": img.height,
            "page": f"https://images.nasa.gov/details/{item['id']}",
            "cropped": "crop" in item,
        })
    (site_public / "data" / "images.json").write_text(json.dumps(meta, indent=1))
    import images_planets

    images_planets.build()
    return meta


if __name__ == "__main__":
    for item in build(SITE / "public"):
        print(f"{item['slug']} {item['nasa_id']} {item['width']}x{item['height']}")
