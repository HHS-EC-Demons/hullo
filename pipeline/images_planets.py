"""Every photo on the Moon, Mars and Orbit pages, with its ID, date and credit.

This file is the one owner of site/src/data/photos.json and of the moon-,
mars- and orbit- photos in site/src/assets/img. images.py runs build()
after its home items, so the images step of build.py cannot shrink these
photos or drop a photos.json entry.

NEW photos come from the NASA Image and Video Library by NASA ID, always
the full resolution original. Each is cropped and scaled so its long edge
is at most the given size (2400 px by default) and never scaled up.

PHOTOS are fetched by NASA ID from the library, or straight from their
Photojournal or HiRISE file when the library does not hold that figure.
Each is cropped, then scaled to at most 1400 px wide, or to the long edge
in LARGER so it stays sharp on retina screens. Originals smaller than the
target keep their own size. The date is when the photo was taken, as the
item's page states it, or None when the page gives no such date. HiRISE
pages ask for the credit NASA/JPL/University of Arizona where no other
credit is printed.

Every photo is written to site/src/assets/img/<slug>.jpg at JPEG quality
85. Its ID, date, credit, page and pixel size go to photos.json, merged
with the entries already there. Every credit is the one printed on the
photo's Photojournal, HiRISE or NASA Image and Video Library page. A crop
is either fractions of the original (left, top, right, bottom) or a pixel
box. "mark" gives a point of the original, such as Ingenuity in a wide
mosaic, as fractions of the written image.

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
PJ = "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia"
HIRISE = "https://static.uahirise.org/images"
WIDTH = 1400

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

PHOTOS = [
    {"slug": "mars-selfie", "id": "PIA24542", "credit": "NASA/JPL-Caltech/MSSS", "date": "2021-04-06"},
    {"slug": "mars-after-flight05", "id": "PIA24648", "credit": "NASA/JPL-Caltech/ASU/MSSS", "date": "2021-05-07",
     "crop": (0.0, 0.3, 0.5, 0.8)},
    {"slug": "mars-flight01", "id": "PIA24584", "credit": "NASA/JPL-Caltech", "date": "2021-04-19"},
    {"slug": "mars-flight02", "id": "PIA24593", "credit": "NASA/JPL-Caltech", "date": "2021-04-22"},
    {"slug": "mars-flight05", "id": "PIA24650", "credit": "NASA/JPL-Caltech", "date": "2021-05-07"},
    {"slug": "mars-flight09", "id": "PIA24725", "credit": "NASA/JPL-Caltech", "date": "2021-07-05"},
    {"slug": "mars-flight26", "id": "PIA25219", "credit": "NASA/JPL-Caltech", "date": "2022-04-19"},
    {"slug": "mars-flight54", "id": "PIA25969", "credit": "NASA/JPL-Caltech", "date": "2023-08-03"},
    {"slug": "mars-flight66", "id": "PIA26049", "credit": "NASA/JPL-Caltech", "date": "2023-11-03"},
    {"slug": "mars-flight70", "id": "PIA26242", "credit": "NASA/JPL-Caltech", "date": "2023-12-22"},
    {"slug": "mars-flight72", "id": "PIA26243", "credit": "NASA/JPL-Caltech", "date": "2024-01-18"},
    {"slug": "mars-final-airfield", "id": "PIA26236", "credit": "NASA/JPL-Caltech/ASU/MSSS", "date": "2024-02-04"},
    {"slug": "moon-a11-reflector", "id": "as11-40-5948", "credit": "NASA", "date": "1969-07-20"},
    {"slug": "moon-a14-reflector", "id": "as14-67-09386", "credit": "NASA", "date": "1971-02-05"},
    {"slug": "moon-a15-reflector", "id": "as15-086-11601", "credit": "NASA", "date": "1971-07-31",
     "crop": (0.0, 0.12, 0.6, 0.72)},
    {"slug": "orbit-apollo11-surface", "id": "as11-40-5927", "credit": "NASA", "date": "1969-07-20"},
    {"slug": "orbit-apollo12-surface", "id": "AS12-48-7134", "credit": "NASA", "date": "1969-11-20"},
    {"slug": "orbit-apollo14-surface", "id": "as14-66-09277", "credit": "NASA", "date": "1971-02-05"},
    {"slug": "orbit-apollo15-surface", "id": "as15-086-11601", "credit": "NASA", "date": "1971-07-31"},
    {"slug": "orbit-apollo16-surface", "id": "as16-113-18334", "credit": "NASA", "date": "1972-04-21"},
    {"slug": "orbit-apollo17-surface", "id": "as17-134-20382", "credit": "NASA", "date": "1972-12-13"},
    {"slug": "orbit-viking1-surface", "id": "PIA00381", "credit": "NASA/JPL", "date": "1976-07-20"},
    {"slug": "orbit-viking2-surface", "id": "PIA00568", "credit": "NASA/JPL", "date": None},
    {"slug": "orbit-spirit-surface", "id": "PIA04995", "credit": "NASA/JPL/Cornell", "date": None,
     "crop": (0.04, 0.04, 0.96, 0.7)},
    {"slug": "orbit-opportunity-surface", "id": "PIA05182", "credit": "NASA/JPL", "date": "2004-01-31"},
    {"slug": "orbit-viking1-hirise", "id": "PIA01881", "credit": "NASA/JPL-Caltech/University of Arizona",
     "date": "2006-11-22", "url": f"{PJ}/pia01/pia01881/figures/PIA01881_lander.jpg",
     "page": "https://photojournal.jpl.nasa.gov/catalog/PIA01881", "observation": "PSP_001521_2025",
     "title": "Viking Lander 1 (Thomas A. Mutch Memorial Station) Imaged from Orbit, lander figure"},
    {"slug": "orbit-viking2-hirise", "id": "PIA01882", "credit": "NASA/JPL-Caltech/University of Arizona",
     "date": "2006-11-21", "url": f"{PJ}/pia01/pia01882/figures/PIA01882_lander.jpg",
     "page": "https://photojournal.jpl.nasa.gov/catalog/PIA01882", "observation": "PSP_001501_2280",
     "title": "Viking Lander 2 (Gerald A. Soffen Memorial Station) Imaged from Orbit, lander figure"},
    {"slug": "orbit-spirit-hirise", "id": "ESP_021925_1650", "credit": "NASA/JPL-Caltech/UArizona",
     "date": "2011-03-31", "url": f"{HIRISE}/2011/details/ESP_021925_1650.jpg",
     "page": "https://www.uahirise.org/ESP_021925_1650", "observation": "ESP_021925_1650",
     "title": "Spirit, Spirit, Shining Bright"},
    {"slug": "orbit-opportunity-hirise", "id": "ESP_050177_1780", "credit": "NASA/JPL-Caltech/UArizona",
     "date": "2017-04-10", "url": f"{HIRISE}/2017/details/cut/ESP_050177_1780-1.jpg",
     "page": "https://www.uahirise.org/ESP_050177_1780", "observation": "ESP_050177_1780",
     "title": "What Opportunity Left Behind"},
    {"slug": "orbit-insight-2018", "id": "ESP_058005_1845", "credit": "NASA/JPL-Caltech/UArizona",
     "date": "2018-12-11", "url": f"{HIRISE}/2018/details/cut/ESP_058005_1845-lander-full-res.jpg",
     "page": "https://www.uahirise.org/ESP_058005_1845", "observation": "ESP_058005_1845",
     "title": "InSight Lander on Mars, lander cutout"},
    {"slug": "orbit-insight-2024", "id": "PIA26515", "credit": "NASA/JPL/University of Arizona",
     "date": "2024-10-23", "url": f"{PJ}/pia26/pia26515/PIA26515.jpg",
     "page": "https://photojournal.jpl.nasa.gov/catalog/PIA26515",
     "title": "HiRISE Studies the Dust on InSight", "crop": (0.0, 0.0, 1.0, 0.89)},
    {"slug": "orbit-phoenix-2008", "id": "PIA22223", "credit": "NASA/JPL-Caltech/Univ. of Arizona",
     "date": "2008-07-20", "url": f"{PJ}/pia22/pia22223/figures/PIA22223_fig1.jpg",
     "page": "https://photojournal.jpl.nasa.gov/catalog/PIA22223", "observation": "PSP_009290_2485",
     "title": "NASA's Phoenix Lander on Mars, Nearly a Decade Later, figure 1", "crop": (0.0, 0.0, 1.0, 0.93)},
    {"slug": "orbit-phoenix-2017", "id": "PIA22223", "credit": "NASA/JPL-Caltech/Univ. of Arizona",
     "date": "2017-12-21", "url": f"{PJ}/pia22/pia22223/figures/PIA22223_fig2.jpg",
     "page": "https://photojournal.jpl.nasa.gov/catalog/PIA22223", "observation": "ESP_053451_2485",
     "title": "NASA's Phoenix Lander on Mars, Nearly a Decade Later, figure 2", "crop": (0.0, 0.0, 1.0, 0.93)},
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


def fit_width(img: Image.Image, width: int) -> Image.Image:
    if img.width <= width:
        return img
    return img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)


def build_photos(meta: dict, only: set[str]) -> None:
    for item in PHOTOS:
        slug = item["slug"]
        if only and slug not in only:
            continue
        if "url" in item:
            raw = images.get(item["url"], images.CACHE / "direct" / f"{item['id']}-{item['url'].rsplit('/', 1)[1]}")
            title, page = item["title"], item["page"]
        else:
            data, raw = images.library(item["id"], True)
            title = data.get("title", "").strip()
            page = f"https://images.nasa.gov/details/{item['id']}"
        img = cut(open_rgb(raw), item.get("crop"), None)
        out = fit(img, LARGER[slug]) if slug in LARGER else fit_width(img, WIDTH)
        save(out, slug)
        meta[slug] = {
            **meta.get(slug, {}),
            "id": item["id"],
            "observation": item.get("observation"),
            "title": title,
            "date": item["date"],
            "credit": item["credit"],
            "page": page,
            "width": out.width,
            "height": out.height,
            "cropped": "crop" in item,
        }


def build(only: set[str] | None = None) -> dict:
    """Write the photos (all, or only the named slugs) and merge photos.json."""
    only = only or set()
    OUT.mkdir(parents=True, exist_ok=True)
    meta = json.loads(META.read_text()) if META.exists() else {}
    build_new(meta, only)
    build_photos(meta, only)
    META.write_text(json.dumps(meta, indent=1) + "\n")
    return meta


def main() -> None:
    only = set(sys.argv[1:])
    meta = build(only)
    for slug in [i["slug"] for i in NEW] + [p["slug"] for p in PHOTOS]:
        if only and slug not in only:
            continue
        m = meta[slug]
        size = (OUT / f"{slug}.jpg").stat().st_size
        print(f"{slug} {m['id']} {m['width']}x{m['height']} {size // 1024} KB")


if __name__ == "__main__":
    main()
