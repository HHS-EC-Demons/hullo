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

Run with .venv/bin/python orbit.py
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


def build(out_dir: Path, meta_path: Path) -> list[dict]:
    out_dir.mkdir(parents=True, exist_ok=True)
    meta = [crop(item, out_dir) for item in SITES]
    meta_path.write_text(json.dumps({"source": "LROC RDR NAC_DTM orthoimages, PDS Imaging Node", "coordinates": LUNAR_SITES,
                                     "credit": "NASA/GSFC/Arizona State University", "crops": meta}, indent=1) + "\n")
    return meta


if __name__ == "__main__":
    for row in build(SITE / "src" / "assets" / "img", SITE / "src" / "data" / "lro.json"):
        print(row["site"], row["product"], row["acquired"], f"{row['scale_m']} m/px", row["width"], row["lm_px"])
