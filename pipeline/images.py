"""Public domain photos from NASA, saved with their ID, date and credit.

ITEMS are fetched from the NASA Image and Video Library by NASA ID and
written to site/public/img for the pages that read data/images.json.

PHOTOS feed astro:assets. Each is fetched by NASA ID from the library, or
straight from its Photojournal or HiRISE file when the library does not
hold that figure, cropped and scaled, and written to
site/src/assets/img/<slug>.jpg. Their metadata goes to
site/src/data/photos.json. Each credit is the one printed on the item's
Photojournal, NASA or HiRISE page. The date is when the photo was taken, as
the item's page states it, or None when the page gives no such date. HiRISE pages ask for the credit
NASA/JPL/University of Arizona where no other credit is printed.

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
PJ = "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia"
HIRISE = "https://static.uahirise.org/images"

ITEMS = [
    {"id": "as14-67-09386", "slug": "apollo14-reflector", "width": 1100, "credit": "NASA"},
    {"id": "PIA24648", "slug": "ingenuity-flight5", "width": 1200, "credit": "NASA/JPL-Caltech/ASU/MSSS",
     "crop": (0.0, 0.3, 0.5, 0.8)},
    {"id": "PIA23645", "slug": "pale-blue-dot", "width": 900, "credit": "NASA/JPL-Caltech",
     "crop": (0.48, 0.4037, 0.7094, 0.6935)},
    {"id": "as11-37-5551", "slug": "apollo11-reflector", "width": 900, "credit": "NASA",
     "crop": (0.35, 0.03, 0.85, 0.405)},
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
    out_dir = site_public / "img"
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
            "cropped": "crop" in item,
        })
    (site_public / "data" / "images.json").write_text(json.dumps(meta, indent=1))
    build_photos(SITE / "src" / "assets" / "img", SITE / "src" / "data" / "photos.json")
    return meta


def build_photos(out_dir: Path, meta_path: Path, max_width: int = 1400) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    meta = {}
    for item in PHOTOS:
        if "url" in item:
            name = item["url"].rsplit("/", 1)[1]
            raw = get(item["url"], CACHE / "direct" / f"{item['id']}-{name}")
            title, page = item["title"], item["page"]
        else:
            data, raw = library(item["id"], True)
            title = data.get("title", "").strip()
            page = f"https://images.nasa.gov/details/{item['id']}"
        img = Image.open(io.BytesIO(raw))
        img = img.convert("L" if img.mode in ("L", "I;16", "I") else "RGB")
        if "crop" in item:
            l, t, r, b = item["crop"]
            img = img.crop((round(l * img.width), round(t * img.height), round(r * img.width), round(b * img.height)))
        if img.width > max_width:
            img = img.resize((max_width, round(img.height * max_width / img.width)), Image.LANCZOS)
        dest = out_dir / f"{item['slug']}.jpg"
        img.save(dest, "JPEG", quality=84, optimize=True, progressive=True)
        meta[item["slug"]] = {
            "id": item["id"],
            "observation": item.get("observation"),
            "title": title,
            "date": item["date"],
            "credit": item["credit"],
            "page": page,
            "width": img.width,
            "height": img.height,
            "cropped": "crop" in item,
        }
    meta_path.parent.mkdir(parents=True, exist_ok=True)
    meta_path.write_text(json.dumps(meta, indent=1) + "\n")
    return meta


if __name__ == "__main__":
    for slug, item in build_photos(SITE / "src" / "assets" / "img", SITE / "src" / "data" / "photos.json").items():
        print(f"{slug} {item['id']} {item['width']}x{item['height']}")
