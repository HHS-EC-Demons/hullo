"""Public domain photos from the NASA Image and Video Library.

Each item is fetched by its NASA ID, resized for the web and saved with its
title, date and credit so the site can print the credit under the photo.
"""

from __future__ import annotations

import io
import json
import time
from pathlib import Path

from PIL import Image

import net

CACHE = Path(__file__).resolve().parent / "cache" / "images"
API = "https://images-api.nasa.gov"

ITEMS = [
    {"id": "as14-67-09386", "slug": "apollo14-reflector", "width": 1400, "credit": "NASA"},
    {"id": "as11-37-5551", "slug": "apollo11-reflector", "width": 1400, "credit": "NASA"},
    {"id": "PIA24648", "slug": "ingenuity-flight5", "width": 1600, "credit": "NASA/JPL-Caltech/ASU/MSSS"},
]


def get(url: str, path: Path) -> bytes:
    if path.exists():
        return path.read_bytes()
    path.parent.mkdir(parents=True, exist_ok=True)
    body = net.get(url.replace("http://", "https://"), timeout=120)
    path.write_bytes(body)
    time.sleep(0.5)
    return body


def build(site_public: Path) -> list[dict]:
    out_dir = site_public / "img"
    out_dir.mkdir(parents=True, exist_ok=True)
    meta = []
    for item in ITEMS:
        search = json.loads(get(f"{API}/search?nasa_id={item['id']}", CACHE / f"{item['id']}.search.json"))
        data = search["collection"]["items"][0]["data"][0]
        assets = json.loads(get(f"{API}/asset/{item['id']}", CACHE / f"{item['id']}.asset.json"))
        hrefs = [a["href"] for a in assets["collection"]["items"]]
        pick = next((h for h in hrefs if "~large" in h), None) or next(h for h in hrefs if "~orig" in h)
        raw = get(pick, CACHE / f"{item['id']}.jpg")
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        if img.width > item["width"]:
            img = img.resize((item["width"], round(img.height * item["width"] / img.width)), Image.LANCZOS)
        dest = out_dir / f"{item['slug']}.jpg"
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
        })
    (site_public / "data" / "images.json").write_text(json.dumps(meta, indent=1))
    return meta
