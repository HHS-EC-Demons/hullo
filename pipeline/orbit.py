"""LRO views of the six Apollo landing sites, cropped from LROC PDS products.

Each crop comes from a map-projected LROC NAC orthoimage in the LROC RDR
archive at the PDS Imaging Node, which is public domain. The product's
PDS4 label gives the equirectangular grid (bounding coordinates, degrees
per pixel and standard parallel), so the site's NSSDCA coordinates become
a line and sample. Only the rows around the site are downloaded, with an
HTTP range request, then cropped, stretched to 8 bits between the 0.5 and
99.7 percentiles, and written to site/src/assets/img/orbit-<site>-lro.jpg.
The product ID, acquisition time, pixel scale and center go to
site/src/data/lro.json.

maps() writes the two site maps at the top of the Orbit page. The Moon map
is the Apollo region cut from NASA SVS's CGI Moon Kit color map (SVS 4720,
lroc_color_poles_8k.tif, an equirectangular LROC WAC mosaic centered on 0
degrees longitude, public domain per the SVS help page). The Mars map is the
USGS Astrogeology Viking MDIM 2.1 colorized global mosaic at 1 km per pixel
(equirectangular, centered on 0 degrees, public domain per its Astropedia
page), turned so 240 degrees east sits in the middle and every lander is
away from the edges, then scaled to 2400 px wide. The bounds of each map go
to site/src/data/orbit-maps.json, so the page can place each site from its
latitude and longitude.

Run with .venv/bin/python orbit.py, or .venv/bin/python orbit.py maps
"""

from __future__ import annotations

import json
import math
import re
import ssl
import time
import urllib.request
from pathlib import Path

import certifi
import numpy as np
from PIL import Image

import net

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / "cache" / "lroc"
SITE = ROOT.parent / "site"
PDS = "https://pds.mcp.nasa.gov/data/store/img/lunar_reconnaissance_orbiter/pds4/lroc/lro-l-lroc-5-rdr/LROLRC_2001/DATA/SDP/NAC_DTM/"
LUNAR_SITES = "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html"
CTX = ssl.create_default_context(cafile=certifi.where())
TYPES = {"IEEE754LSBSingle": ("<f4", 4), "SignedLSB2": ("<i2", 2), "UnsignedLSB2": ("<u2", 2), "UnsignedByte": ("u1", 1)}

SITES = [
    {"site": "apollo11", "product": "APOLLO11/NAC_DTM_APOLLO11_M150361817_50CM", "lat": 0.6738, "lon": 23.4740, "size": 600,
     "lm": (0.67416, 23.47314)},
    {"site": "apollo12", "product": "APOLLO12/NAC_DTM_APOLLO12_M120005333_50CM", "lat": -3.0145, "lon": -23.4200, "size": 760,
     "lm": (-3.0128, -23.4219)},
    {"site": "apollo14", "product": "APOLLO14/NAC_DTM_APOLLO14_M150633128_50CM", "lat": -3.6450, "lon": -17.4753, "size": 720,
     "lm": (-3.64589, -17.47194)},
    {"site": "apollo15", "product": "APOLLO15/NAC_DTM_APOLLO15_M111571816_50CM", "lat": 26.1328, "lon": 3.6325, "size": 720,
     "lm": (26.13239, 3.63330)},
    {"site": "apollo16", "product": "APOLLO16_2/NAC_DTM_APOLLO16_2_M152770233_50CM", "lat": -8.9746, "lon": 15.4998, "size": 600,
     "lm": (-8.9734, 15.5011)},
    {"site": "apollo17", "product": "APOLLO17_1/NAC_DTM_APOLLO17_1_M134985003_60CM", "lat": 20.1917, "lon": 30.7689, "size": 600,
     "lm": (20.1911, 30.7723)},
]


def get(url: str, path: Path, rng: tuple[int, int] | None = None) -> bytes:
    if path.exists():
        return path.read_bytes()
    path.parent.mkdir(parents=True, exist_ok=True)
    headers = {"User-Agent": net.AGENT}
    if rng:
        headers["Range"] = f"bytes={rng[0]}-{rng[1]}"
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=600, context=CTX) as resp:
                body = resp.read()
            break
        except OSError:
            if attempt == 3:
                raise
            time.sleep(5 * (attempt + 1))
    path.write_bytes(body)
    time.sleep(0.5)
    return body


def tag(label: str, name: str) -> str:
    return re.search(rf"<(?:cart:)?{name}[^>]*>([^<]+)<", label).group(1).strip()


def crop(item: dict, out_dir: Path) -> dict:
    name = item["product"].rsplit("/", 1)[1]
    label = get(PDS + item["product"] + ".xml", CACHE / f"{name}.xml").decode()
    lines, samples = [int(x) for x in re.findall(r"<elements>(\d+)</elements>", label)][:2]
    offset = int(re.findall(r'<offset unit="byte">(\d+)</offset>', label)[1])
    np_type, size = TYPES[re.findall(r"<data_type>([^<]+)</data_type>", label)[-1]]
    res = float(tag(label, "pixel_resolution_y"))
    parallel = float(tag(label, "standard_parallel_1"))
    scale = float(tag(label, "pixel_scale_y"))
    west = float(tag(label, "west_bounding_coordinate"))
    north = float(tag(label, "north_bounding_coordinate"))
    start = tag(label, "start_date_time")

    def pixel(lat: float, lon: float) -> tuple[float, float]:
        return (north - lat) / res, ((lon % 360) - west) / (res / math.cos(math.radians(parallel)))

    line, sample = pixel(item["lat"], item["lon"])
    half = item["size"] // 2
    l0, l1 = int(line) - half, int(line) + half
    s0, s1 = int(sample) - half, int(sample) + half
    if l0 < 0 or s0 < 0 or l1 > lines or s1 > samples:
        raise ValueError(f"{item['site']} crop falls outside {name}")
    raw = get(PDS + item["product"] + ".IMG", CACHE / f"{name}_{l0}_{l1}.bin",
              (offset + l0 * samples * size, offset + l1 * samples * size - 1))
    rows = np.frombuffer(raw, dtype=np_type).reshape(l1 - l0, samples)
    window = rows[:, s0:s1].astype(np.float64)
    window[(window < -1e30) | (window == -32768)] = np.nan
    lo, hi = np.nanpercentile(window, [0.5, 99.7])
    img = np.nan_to_num(np.clip((window - lo) / (hi - lo), 0, 1))
    dest = out_dir / f"orbit-{item['site']}-lro.jpg"
    Image.fromarray((img * 255).round().astype(np.uint8), "L").save(dest, "JPEG", quality=88, optimize=True, progressive=True)
    lm_line, lm_sample = pixel(*item["lm"])
    return {
        "site": item["site"],
        "product": name,
        "label": PDS + item["product"] + ".xml",
        "acquired": start,
        "scale_m": round(scale, 3),
        "center": [item["lat"], item["lon"]],
        "width": s1 - s0,
        "height": l1 - l0,
        "lm_px": [round(lm_sample - s0), round(lm_line - l0)],
        "file": dest.name,
    }


MOSAICS = ROOT / "cache" / "mosaics"
MOON_KIT = "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_8k.tif"
MARS_MDIM = ("https://astrogeology.usgs.gov/ckan/dataset/7131d503-cdc9-45a5-8f83-5126c0fd397e/resource/"
             "5ea881c6-01b3-41fa-a7af-42d2131b54f1/download/mars_viking_mdim21_clrmosaic_1km.jpg")
MOON_BOX = {"west": -34.0, "east": 44.0, "north": 32.0, "south": -16.0}
MARS_WEST = 60.0
MAP_WIDTH = 2400


def fetch(url: str, path: Path) -> Path:
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": net.AGENT}), timeout=900, context=CTX) as resp:
            path.write_bytes(resp.read())
    return path


def moon_map(out_dir: Path) -> dict:
    img = Image.open(fetch(MOON_KIT, MOSAICS / "lroc_color_poles_8k.tif")).convert("RGB")
    per_deg = img.width / 360
    box = MOON_BOX
    left = round((box["west"] + 180) * per_deg)
    right = round((box["east"] + 180) * per_deg)
    top = round((90 - box["north"]) * per_deg)
    bottom = round((90 - box["south"]) * per_deg)
    crop = img.crop((left, top, right, bottom))
    crop.save(out_dir / "orbit-map-moon.jpg", "JPEG", quality=85, optimize=True, progressive=True)
    return {
        "file": "orbit-map-moon.jpg",
        "west": left / per_deg - 180, "east": right / per_deg - 180,
        "north": 90 - top / per_deg, "south": 90 - bottom / per_deg,
        "width": crop.width, "height": crop.height,
        "id": "SVS 4720", "year": 2019, "credit": "NASA's Scientific Visualization Studio",
        "page": "https://svs.gsfc.nasa.gov/4720/", "file_url": MOON_KIT,
    }


def mars_map(out_dir: Path) -> dict:
    img = Image.open(fetch(MARS_MDIM, MOSAICS / "mars_viking_mdim21_clrmosaic_1km.jpg")).convert("RGB")
    cut = round((MARS_WEST + 180) / 360 * img.width)
    turned = Image.new("RGB", img.size)
    turned.paste(img.crop((cut, 0, img.width, img.height)), (0, 0))
    turned.paste(img.crop((0, 0, cut, img.height)), (img.width - cut, 0))
    out = turned.resize((MAP_WIDTH, round(img.height * MAP_WIDTH / img.width)), Image.LANCZOS)
    out.save(out_dir / "orbit-map-mars.jpg", "JPEG", quality=85, optimize=True, progressive=True)
    west = cut / img.width * 360 - 180
    return {
        "file": "orbit-map-mars.jpg",
        "west": west, "east": west + 360, "north": 90.0, "south": -90.0,
        "width": out.width, "height": out.height,
        "id": "MDIM 2.1", "year": 2009, "credit": "USGS Astrogeology Science Center, NASA Ames",
        "page": "https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m", "file_url": MARS_MDIM,
    }


def maps(out_dir: Path, meta_path: Path) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    meta = {"moon": moon_map(out_dir), "mars": mars_map(out_dir)}
    meta_path.write_text(json.dumps(meta, indent=1) + "\n")
    return meta


def build(out_dir: Path, meta_path: Path) -> list[dict]:
    out_dir.mkdir(parents=True, exist_ok=True)
    meta = [crop(item, out_dir) for item in SITES]
    meta_path.write_text(json.dumps({"source": "LROC RDR NAC_DTM orthoimages, PDS Imaging Node", "coordinates": LUNAR_SITES,
                                     "credit": "NASA/GSFC/Arizona State University", "crops": meta}, indent=1) + "\n")
    return meta


if __name__ == "__main__":
    import sys

    if sys.argv[1:] == ["maps"]:
        for body, m in maps(SITE / "src" / "assets" / "img", SITE / "src" / "data" / "orbit-maps.json").items():
            print(body, m["width"], m["height"], round(m["west"], 3), round(m["east"], 3))
        raise SystemExit
    for row in build(SITE / "src" / "assets" / "img", SITE / "src" / "data" / "lro.json"):
        print(row["site"], row["product"], row["acquired"], f"{row['scale_m']} m/px", row["width"], row["lm_px"])
