"""One public domain photo of each deep space probe, from the NASA Image and Video Library.

Each photo is fetched by NASA ID, cropped, scaled and written to
site/src/assets/img/home-<probe>.jpg so astro:assets can serve AVIF and WebP.
The ID, date, center and credit go to site/src/data/probe-photos.json. The
credit is the one on the item's library page (NASA/JPL-Caltech for the JPL
Photojournal items, NASA for the Kennedy and Ames items, which list only
their NASA center). The New Horizons frame is cropped to the spacecraft so no
mission patch on a worker's suit shows.

Run with .venv/bin/python probe_photos.py.
"""

from __future__ import annotations

import io
import json
from pathlib import Path

from PIL import Image

import net

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / "cache" / "probe_photos"
SITE = ROOT.parent / "site"
OUT_IMG = SITE / "src" / "assets" / "img"
OUT_JSON = SITE / "src" / "data" / "probe-photos.json"
API = "https://images-api.nasa.gov"
WIDTH = 1200

PHOTOS = [
    {
        "probe": "voyager1",
        "id": "PIA21740",
        "credit": "NASA/JPL-Caltech",
        "date": "1977",
        "caption": "Engineers fit the cover over Voyager 1’s Golden Record in 1977.",
        "alt": "Two engineers in white clean room suits fix a cover onto the side of Voyager 1, a dark ten sided spacecraft body.",
        "crop": (0.0, 0.0, 1.0, 1.0),
    },
    {
        "probe": "voyager2",
        "id": "PIA21736",
        "credit": "NASA/JPL-Caltech",
        "date": "1977-03-23",
        "caption": "Engineers work on Voyager 2 on 23 Mar 1977.",
        "alt": "Voyager 2 on a test stand under its large white dish antenna, with engineers on a platform beside it.",
        "crop": (0.0, 0.05, 1.0, 1.0),
    },
    {
        "probe": "newhorizons",
        "id": "KSC-05pd2460",
        "credit": "NASA",
        "date": "2005-11-07",
        "caption": "Workers fit the power generator to New Horizons at Kennedy Space Center on 7 Nov 2005.",
        "alt": "New Horizons, a gold foil wrapped spacecraft with a white dish on top, in a clean room with its black power generator being attached.",
        "crop": (0.0, 0.12, 0.74, 1.0),
    },
    {
        "probe": "pioneer10",
        "id": "ARC-1972-AC72-2135",
        "credit": "NASA",
        "date": "1972-02-26",
        "caption": "Pioneer 10 at Cape Kennedy before its launch in 1972.",
        "alt": "Pioneer 10, a silver spacecraft under a wide round dish, on a stand in a clean room with two people beside it.",
        "crop": (0.172, 0.0, 0.828, 1.0),
    },
    {
        "probe": "pioneer11",
        "id": "KSC-73P-0116",
        "credit": "NASA",
        "date": "1973-03-16",
        "caption": "Pioneer 11, then called Pioneer G, waits for its nose cover at Cape Kennedy on 16 Mar 1973.",
        "alt": "Pioneer 11 under its round dish antenna, standing between the two open halves of its rocket nose cover.",
        "crop": (0.0, 0.28, 1.0, 1.0),
    },
]


def fetch(nasa_id: str) -> tuple[bytes, dict]:
    CACHE.mkdir(parents=True, exist_ok=True)
    img_path = CACHE / f"{nasa_id}.jpg"
    meta_path = CACHE / f"{nasa_id}.json"
    if not meta_path.exists():
        search = json.loads(net.get(f"{API}/search?nasa_id={nasa_id}"))
        meta_path.write_text(json.dumps(search["collection"]["items"][0]["data"][0]))
    if not img_path.exists():
        assets = json.loads(net.get(f"{API}/asset/{nasa_id}"))["collection"]["items"]
        hrefs = [a["href"] for a in assets]
        pick = next((h for h in hrefs if h.endswith("~large.jpg")), None) or next(h for h in hrefs if h.endswith("~orig.jpg"))
        img_path.write_bytes(net.get(pick.replace("http://", "https://")))
    return img_path.read_bytes(), json.loads(meta_path.read_text())


def build() -> list[dict]:
    out = []
    OUT_IMG.mkdir(parents=True, exist_ok=True)
    for p in PHOTOS:
        raw, meta = fetch(p["id"])
        im = Image.open(io.BytesIO(raw)).convert("RGB")
        x0, y0, x1, y1 = p["crop"]
        im = im.crop((int(x0 * im.width), int(y0 * im.height), int(x1 * im.width), int(y1 * im.height)))
        if im.width > WIDTH:
            im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
        slug = f"home-{p['probe']}"
        im.save(OUT_IMG / f"{slug}.jpg", quality=86, optimize=True, progressive=True)
        out.append({
            "probe": p["probe"],
            "slug": slug,
            "nasa_id": p["id"],
            "title": meta.get("title", ""),
            "center": meta.get("center", ""),
            "date": p["date"],
            "credit": p["credit"],
            "caption": p["caption"],
            "alt": p["alt"],
            "width": im.width,
            "height": im.height,
            "page": f"https://images.nasa.gov/details/{p['id']}",
        })
    OUT_JSON.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    return out


if __name__ == "__main__":
    for item in build():
        print(item["slug"], item["nasa_id"], item["width"], "x", item["height"])
