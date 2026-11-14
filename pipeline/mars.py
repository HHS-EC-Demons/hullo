"""Ingenuity's 72 flights and a baked copy of the Jezero basemap.

Both come from JPL's Mars 2020 MMGIS map (the "Where is the rover?" map).
Flight paths are thinned with Douglas-Peucker at 0.25 m so the file stays
small while every turn stays visible. Basemap tiles are re-encoded as JPEG
and stored with XYZ row numbering for Leaflet.
"""

from __future__ import annotations

import io
import json
import math
import re
import time
from datetime import date
from pathlib import Path

from PIL import Image

import net

CACHE = Path(__file__).resolve().parent / "cache" / "mmgis"
LAYERS = "https://mars.nasa.gov/mmgis-maps/M20/Layers"
CONFIG = "https://mars.nasa.gov/maps/location/api/configure/get?mission=M20"
BASEMAP = "M20_HiRISE_RGB_CTX_mosaic_25cm_v7_Merge_LERC_clip"
R_MARS_M = 3396190.0
ZOOMS = range(13, 17)
MARGIN_M = 350.0
MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6, "jul": 7, "aug": 8,
          "sep": 9, "oct": 10, "nov": 11, "dec": 12}


def fetch(url: str, path: Path) -> bytes:
    if path.exists():
        return path.read_bytes()
    path.parent.mkdir(parents=True, exist_ok=True)
    body = net.get(url, timeout=120)
    path.write_bytes(body)
    time.sleep(0.25)
    return body


def parse_date(text: str) -> str:
    m = re.match(r"([A-Za-z]+)\.?\s+(\d+),\s*(\d{4})", text.strip())
    if not m:
        raise ValueError(f"unparsed date {text!r}")
    month = MONTHS[m.group(1)[:3].lower()]
    return date(int(m.group(3)), month, int(m.group(2))).isoformat()


def to_local(lon: float, lat: float, lon0: float, lat0: float) -> tuple[float, float]:
    k = math.pi / 180.0 * R_MARS_M
    return (lon - lon0) * k * math.cos(math.radians(lat0)), (lat - lat0) * k


def simplify(points: list[tuple[float, float]], tol: float) -> list[int]:
    """Douglas-Peucker on local metre coordinates, returning kept indices."""
    keep = {0, len(points) - 1}
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = points[a]
        bx, by = points[b]
        dx, dy = bx - ax, by - ay
        norm = math.hypot(dx, dy)
        best, idx = 0.0, -1
        for i in range(a + 1, b):
            px, py = points[i]
            if norm == 0:
                d = math.hypot(px - ax, py - ay)
            else:
                d = abs(dy * px - dx * py + bx * ay - by * ax) / norm
            if d > best:
                best, idx = d, i
        if best > tol and idx > 0:
            keep.add(idx)
            stack += [(a, idx), (idx, b)]
    return sorted(keep)


def tile_xy(lon: float, lat: float, z: int) -> tuple[int, int]:
    n = 2 ** z
    x = int((lon + 180.0) / 360.0 * n)
    lat_r = math.radians(lat)
    y = int((1.0 - math.asinh(math.tan(lat_r)) / math.pi) / 2.0 * n)
    return x, y


def build(site_public: Path) -> dict:
    fetch(CONFIG, CACHE / "config_M20.json")
    way = json.loads(fetch(f"{LAYERS}/json/m20_heli_waypoints.json", CACHE / "m20_heli_waypoints.json"))
    path = json.loads(fetch(f"{LAYERS}/json/m20_heli_flight_path.json", CACHE / "m20_heli_flight_path.json"))
    points = {f["properties"]["Flight"]: f["properties"] for f in way["features"]}
    paths = {f["properties"]["Flight"]: f["geometry"]["coordinates"] for f in path["features"]}

    lon0, lat0 = points[0]["Lon"], points[0]["Lat"]
    flights = []
    all_lon, all_lat = [], []
    for n in sorted(k for k in points if k > 0):
        p = points[n]
        coords = paths.get(n, [])
        local = [to_local(c[0], c[1], lon0, lat0) for c in coords]
        kept = simplify(local, 0.25) if len(local) > 2 else list(range(len(local)))
        line = [[round(coords[i][1], 7), round(coords[i][0], 7)] for i in kept]
        all_lon += [c[0] for c in coords]
        all_lat += [c[1] for c in coords]
        flights.append({
            "n": n,
            "sol": p["Sol"],
            "date": parse_date(p["Earth_Date"]),
            "from": p["FromAirfld"],
            "to": p["ToAirfld"],
            "dist_m": p["Dist_m"],
            "total_m": p["Total_m"],
            "max_alt_m": p["Max_Alt_m"],
            "max_speed_m_s": p["Max_Spd_m"] if p["Max_Spd_m"] > 0 else None,
            "duration_s": p["Duration_s"],
            "total_s": p["total_s"],
            "end": [round(p["Lat"], 7), round(p["Lon"], 7)],
            "path": line,
        })
    start = {"lat": round(lat0, 7), "lon": round(lon0, 7), "name": points[0]["ToAirfld"] or points[0]["FromAirfld"],
             "sol": points[0]["Sol"], "date": parse_date(points[0]["Earth_Date"])}

    dlat = MARGIN_M / (math.pi / 180.0 * R_MARS_M)
    dlon = dlat / math.cos(math.radians(lat0))
    bbox = [min(all_lon) - dlon, min(all_lat) - dlat, max(all_lon) + dlon, max(all_lat) + dlat]

    tiles_out = site_public / "tiles" / "jezero"
    count = 0
    for z in ZOOMS:
        x0, y0 = tile_xy(bbox[0], bbox[3], z)
        x1, y1 = tile_xy(bbox[2], bbox[1], z)
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                tms_y = 2 ** z - 1 - y
                raw = fetch(f"{LAYERS}/{BASEMAP}/{z}/{x}/{tms_y}.png", CACHE / "tiles" / f"{z}/{x}/{tms_y}.png")
                img = Image.open(io.BytesIO(raw)).convert("RGBA")
                flat = Image.new("RGB", img.size, (138, 122, 104))
                flat.paste(img, mask=img.split()[3])
                dest = tiles_out / str(z) / str(x) / f"{y}.jpg"
                dest.parent.mkdir(parents=True, exist_ok=True)
                flat.save(dest, "JPEG", quality=78, optimize=True, progressive=True)
                count += 1

    out = {
        "source": "JPL Mars 2020 MMGIS layers m20_heli_waypoints.json and m20_heli_flight_path.json",
        "basemap": f"{LAYERS}/{BASEMAP}",
        "bbox": [round(v, 6) for v in bbox],
        "zooms": [min(ZOOMS), max(ZOOMS)],
        "tiles": count,
        "start": start,
        "flights": flights,
        "totals": {
            "flights": len(flights),
            "distance_m": flights[-1]["total_m"],
            "air_time_s": flights[-1]["total_s"],
        },
    }
    data_dir = site_public / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "ingenuity.json").write_text(json.dumps(out, separators=(",", ":")))
    return {"flights": len(flights), "tiles": count, "bbox": out["bbox"]}
