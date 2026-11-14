"""Full resolution NASA photos for the home and Deep space pages.

Each item is fetched by NASA ID from the NASA Image and Video Library
(the ~orig file), cropped where noted, scaled down to at most 2400 px on
the long edge (never up) and written to
site/src/assets/img/<slug>.jpg at JPEG quality 85. The ID, date, credit,
caption, short caption and alt text go to site/src/data/home-images.json.

Credits are the ones printed on each item's library page. Dates are when the
photo was taken when the page says so ("taken"), otherwise the date the
image was released ("released"). The Voyager 2 date comes from the item's
"4 days and 20 hours before closest approach" and NSSDCA's flyby date of
25 Aug 1989. The Pioneer 10 frame is cropped to remove the grey scan border.
Pioneer 11 has no frame from its own camera in the library, so its slot is
a photo of the spacecraft before launch.

Run with .venv/bin/python images_home.py.
"""

from __future__ import annotations

import io
import json
from pathlib import Path

from PIL import Image

import images

Image.MAX_IMAGE_PIXELS = 200_000_000

ROOT = Path(__file__).resolve().parent
SITE = ROOT.parent / "site"
OUT = SITE / "src" / "assets" / "img"
META = SITE / "src" / "data" / "home-images.json"
LONG_EDGE = 2400

ITEMS = [
    {
        "slug": "deep-voyager1", "group": "deep", "probe": "voyager1", "id": "PIA00022",
        "credit": "NASA/JPL", "date": "1979-03", "when": "Mar 1979", "kind": "taken",
        "crop": (0.14, 0.185, 0.865, 0.83),
        "focus": "45% 50%",
        "short": "Jupiter’s Great Red Spot, 1979",
        "caption": "Jupiter’s Great Red Spot, photographed by Voyager 1",
        "alt": "Jupiter’s clouds in cream and orange swirls, with the oval Great Red Spot at the top and a white oval storm below it.",
    },
    {
        "slug": "deep-voyager2", "group": "deep", "probe": "voyager2", "id": "PIA01492",
        "credit": "NASA/JPL", "date": "1989-08", "when": "Aug 1989", "kind": "taken",
        "focus": "50% 50%",
        "short": "Neptune, 1989",
        "caption": "Neptune and its Great Dark Spot, photographed by Voyager 2",
        "alt": "Neptune, a deep blue globe with a dark oval storm near its middle edged by bright white clouds.",
    },
    {
        "slug": "deep-newhorizons", "group": "deep", "probe": "newhorizons", "id": "PIA19952",
        "credit": "NASA/Johns Hopkins University Applied Physics Laboratory/Southwest Research Institute",
        "date": "2015-07-14", "when": "14 Jul 2015", "kind": "taken",
        "focus": "50% 48%",
        "short": "Pluto in enhanced color, 2015",
        "caption": "Pluto in enhanced color, photographed by New Horizons",
        "alt": "Pluto, a round world with a pale heart shaped plain on the right and dark red ground on the left, in enhanced color.",
    },
    {
        "slug": "deep-pioneer10", "group": "deep", "probe": "pioneer10", "id": "ARC-1973-AC73-9253",
        "credit": "NASA", "date": "1973-12-02", "when": "2 Dec 1973", "kind": "taken",
        "crop": (0.082, 0.0, 0.918, 1.0),
        "focus": "50% 50%",
        "short": "Jupiter and a moon, 1973",
        "caption": "Jupiter and one of its moons, top right, photographed by Pioneer 10 from 2,584,000 km",
        "alt": "Jupiter as a banded orange and cream globe on black, with a small orange moon to its upper right.",
    },
    {
        "slug": "deep-pioneer11", "group": "deep", "probe": "pioneer11", "id": "KSC-73P-0116",
        "credit": "NASA", "date": "1973-03-16", "when": "16 Mar 1973", "kind": "taken",
        "crop": (0.0, 0.28, 1.0, 1.0),
        "focus": "50% 35%",
        "short": "Pioneer 11 before launch, 1973",
        "caption": "Pioneer 11, then called Pioneer G, between the open halves of its nose cover",
        "alt": "Pioneer 11 under its round dish antenna, standing between the two open halves of its rocket nose cover.",
    },
    {
        "slug": "home-dsn-goldstone", "group": "dsn", "site": "Goldstone", "id": "PIA17790",
        "credit": "NASA/JPL-Caltech", "date": "2012-01-11", "when": "11 Jan 2012", "kind": "taken",
        "short": "2012",
        "caption": "Goldstone’s 70 m antenna at night",
        "alt": "A huge white dish antenna tilted toward the night sky above lit buildings in the desert, with the Moon to the right.",
    },
    {
        "slug": "home-dsn-madrid", "group": "dsn", "site": "Madrid", "id": "PIA24163",
        "credit": "NASA/JPL-Caltech", "date": "2021-01-22", "when": "22 Jan 2021", "kind": "released",
        "short": "Released 2021",
        "caption": "Madrid’s 34 m antenna DSS 56 at night",
        "alt": "A white dish antenna facing straight up on a lit steel tower against a black night sky.",
    },
    {
        "slug": "home-dsn-canberra", "group": "dsn", "site": "Canberra", "id": "PIA23797",
        "credit": "NASA/JPL-Caltech", "date": "2020-07-09", "when": "9 Jul 2020", "kind": "released",
        "short": "2020",
        "caption": "Canberra’s 70 m antenna DSS 43 during its 2020 upgrade, with a crane beside it",
        "alt": "A giant white dish antenna under blue sky with a tall red and white crane beside it and green hills behind.",
    },
    {
        "slug": "home-orbit-apollo14", "group": "tile", "id": "PIA12897",
        "credit": "NASA/GSFC/Arizona State University", "date": "2009-08-19", "when": "19 Aug 2009", "kind": "released",
        "short": "Apollo 14, 2009",
        "caption": "The Apollo 14 site and Cone crater, seen by the Lunar Reconnaissance Orbiter",
        "alt": "Grey cratered lunar ground from straight above, with the bright rim of Cone crater at top right and the astronauts’ faint trail at bottom left.",
    },
]


def fit(img: Image.Image) -> Image.Image:
    scale = LONG_EDGE / max(img.width, img.height)
    if scale >= 1:
        return img
    return img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)


def build() -> dict:
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {}
    for item in ITEMS:
        data, raw = images.library(item["id"], True)
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        source = (img.width, img.height)
        if "crop" in item:
            l, t, r, b = item["crop"]
            img = img.crop((round(l * img.width), round(t * img.height), round(r * img.width), round(b * img.height)))
        img = fit(img)
        img.save(OUT / f"{item['slug']}.jpg", "JPEG", quality=85, optimize=True, progressive=True)
        meta[item["slug"]] = {
            "slug": item["slug"],
            "group": item["group"],
            "probe": item.get("probe"),
            "site": item.get("site"),
            "id": item["id"],
            "title": data.get("title", "").strip(),
            "date": item["date"],
            "when": item["when"],
            "kind": item["kind"],
            "credit": item["credit"],
            "caption": item["caption"],
            "short": item["short"],
            "focus": item.get("focus", "50% 50%"),
            "alt": item["alt"],
            "page": f"https://images.nasa.gov/details/{item['id']}",
            "source_px": list(source),
            "width": img.width,
            "height": img.height,
            "cropped": "crop" in item,
        }
    META.write_text(json.dumps(meta, indent=1, ensure_ascii=False) + "\n")
    return meta


if __name__ == "__main__":
    for slug, m in build().items():
        size = (OUT / f"{slug}.jpg").stat().st_size
        print(f"{slug} {m['id']} {m['source_px'][0]}x{m['source_px'][1]} -> {m['width']}x{m['height']} {size // 1024} KB")
