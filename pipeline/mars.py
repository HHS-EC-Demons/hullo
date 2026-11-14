"""Ingenuity's 72 flights and a baked copy of the Jezero basemap.

Paths, airfield names and the basemap come from JPL's Mars 2020 MMGIS map
(the "Where is the rover?" map). Flight paths are thinned with
Douglas-Peucker at 0.25 m so the file stays small while every turn stays
visible. Each flight's sol, date, horizontal distance, altitude, ground
speed and duration come from NASA's own Ingenuity flight log (PDF), and so
do the mission totals, so the map never shows a figure NASA does not state.
Flights the log lists with 0 m and 0 m/s are hovers. Basemap tiles are
stored with XYZ row numbering: JPEG at zoom 13 to 16 over the whole area,
and WebP at zoom 17 and 18 only along the flight paths, listed in
deep.json so the map never asks for a tile that does not exist.

clock() reads the newest Perseverance raw image record from NASA's raw
image feed, whose sol and local mean solar time ("Sol-02024M12:55:51.155")
come with the UTC time the image was taken. The Mars page runs the NASA
GISS Mars24 algorithm from that one record, so its Jezero clock and sol
count follow Perseverance's own mission clock. Run with
.venv/bin/python mars.py clock
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

from pypdf import PdfReader

import net

CACHE = Path(__file__).resolve().parent / "cache" / "mmgis"
LAYERS = "https://mars.nasa.gov/mmgis-maps/M20/Layers"
CONFIG = "https://mars.nasa.gov/maps/location/api/configure/get?mission=M20"
BASEMAP = "M20_HiRISE_RGB_CTX_mosaic_25cm_v7_Merge_LERC_clip"
R_MARS_M = 3396190.0
ZOOMS = range(13, 17)
DEEP = {17: 100.0, 18: 50.0}
MARGIN_M = 350.0
FLIGHT_LOG = "https://science.nasa.gov/wp-content/uploads/2024/06/ingenuity-helicopter-flight-log.pdf"
MISSION_PAGE = "https://science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/"
RAW_FEED = "https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&num=1&order=sol+desc"
MARS24 = "https://www.giss.nasa.gov/tools/mars24/help/algorithm.html"
LOG_ROW = re.compile(
    r"(?<![\d.,~])(\d{1,2}) (\d{2,4}) ([A-Z][a-z]+\.?) (\d{1,2}), (\d{4}) ([\d,]+) ~?[\d,]+ (\d+) ~?[\d,]+ "
    r"([\d.]+) ~?[\d.]+ ([\d.]+)"
)
MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6, "jul": 7, "aug": 8,
          "sep": 9, "oct": 10, "nov": 11, "dec": 12}


def fetch(url: str, path: Path) -> bytes:
    if path.exists():
        return path.read_bytes()
    path.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(4):
        try:
            body = net.get(url, timeout=120)
            break
        except OSError:
            if attempt == 3:
                raise
            time.sleep(5 * (attempt + 1))
    path.write_bytes(body)
    time.sleep(0.25)
    return body


def parse_date(text: str) -> str:
    m = re.match(r"([A-Za-z]+)\.?\s+(\d+),\s*(\d{4})", text.strip())
    if not m:
        raise ValueError(f"unparsed date {text!r}")
    month = MONTHS[m.group(1)[:3].lower()]
    return date(int(m.group(3)), month, int(m.group(2))).isoformat()


def flight_log() -> tuple[dict[int, dict], dict]:
    """Rows and headline totals of NASA's Ingenuity flight log PDF."""
    raw = fetch(FLIGHT_LOG, CACHE / "ingenuity-helicopter-flight-log.pdf")
    reader = PdfReader(io.BytesIO(raw))
    text = " ".join(page.extract_text() for page in reader.pages)
    text = re.sub(r"[\ue000-\uf8ff]", " ", text)
    text = re.sub(r"\s+", " ", text)
    rows = {}
    for m in LOG_ROW.finditer(text):
        n = int(m.group(1))
        rows[n] = {
            "sol": int(m.group(2)),
            "date": parse_date(f"{m.group(3)} {m.group(4)}, {m.group(5)}"),
            "dist_m": float(m.group(6).replace(",", "")),
            "max_alt_m": float(m.group(7)),
            "max_speed_m_s": float(m.group(8)),
            "duration_s": float(m.group(9)),
        }
    if sorted(rows) != list(range(1, 73)):
        raise ValueError(f"flight log parsed {len(rows)} rows")
    minutes = re.search(r"FLIGHT TIME ~?([\d.]+)", text)
    km = re.search(r"\(~?([\d.]+) km\)", text)
    if not minutes or not km:
        raise ValueError("flight log totals not found")
    totals = {"minutes": float(minutes.group(1)), "km": float(km.group(1))}
    return rows, totals


def densify(coords: list[list[float]], step_deg: float) -> list[tuple[float, float]]:
    out = []
    for a, b in zip(coords, coords[1:]):
        n = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1]) / step_deg))
        out += [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n) for i in range(n)]
    out += [tuple(c[:2]) for c in coords[-1:]]
    return out


def deep_tiles(lines: list[list[list[float]]], points: list[tuple[float, float]]) -> dict[int, set[tuple[int, int]]]:
    """Tiles at zoom 17 and 18 within a buffer of every flight path and hover spot."""
    deg = 180.0 / (math.pi * R_MARS_M)
    found: dict[int, set[tuple[int, int]]] = {}
    for z, buf in DEEP.items():
        tiles = set()
        dense = [p for line in lines for p in densify(line, 5 * deg)] + points
        for lon, lat in dense:
            dlat = buf * deg
            dlon = dlat / math.cos(math.radians(lat))
            x0, y0 = tile_xy(lon - dlon, lat + dlat, z)
            x1, y1 = tile_xy(lon + dlon, lat - dlat, z)
            tiles.update((x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1))
        found[z] = tiles
    return found


def save_tile(z: int, x: int, y: int, dest: Path, fmt: str) -> None:
    tms_y = 2 ** z - 1 - y
    raw = fetch(f"{LAYERS}/{BASEMAP}/{z}/{x}/{tms_y}.png", CACHE / "tiles" / f"{z}/{x}/{tms_y}.png")
    img = Image.open(io.BytesIO(raw)).convert("RGBA")
    flat = Image.new("RGB", img.size, (138, 122, 104))
    flat.paste(img, mask=img.split()[3])
    dest.parent.mkdir(parents=True, exist_ok=True)
    if fmt == "webp":
        flat.save(dest, "WEBP", quality=72, method=6)
    else:
        flat.save(dest, "JPEG", quality=78, optimize=True, progressive=True)


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
    log, nasa_totals = flight_log()
    points = {f["properties"]["Flight"]: f["properties"] for f in way["features"]}
    paths = {f["properties"]["Flight"]: f["geometry"]["coordinates"] for f in path["features"]}

    lon0, lat0 = points[0]["Lon"], points[0]["Lat"]
    flights = []
    all_lon, all_lat = [], []
    deep_lines, deep_points = [], []
    running = 0.0
    for n in sorted(k for k in points if k > 0):
        p = points[n]
        row = log[n]
        hover = row["dist_m"] == 0 and row["max_speed_m_s"] == 0
        coords = paths.get(n, [])
        local = [to_local(c[0], c[1], lon0, lat0) for c in coords]
        kept = simplify(local, 0.25) if len(local) > 2 else list(range(len(local)))
        line = [] if hover else [[round(coords[i][1], 7), round(coords[i][0], 7)] for i in kept]
        all_lon += [c[0] for c in coords]
        all_lat += [c[1] for c in coords]
        if coords and not hover:
            deep_lines.append(coords)
        deep_points.append((p["Lon"], p["Lat"]))
        running += row["dist_m"]
        flights.append({
            "n": n,
            "sol": row["sol"],
            "date": row["date"],
            "from": p["FromAirfld"],
            "to": p["ToAirfld"],
            "hover": hover,
            "dist_m": row["dist_m"],
            "total_m": running,
            "max_alt_m": row["max_alt_m"],
            "max_speed_m_s": row["max_speed_m_s"],
            "duration_s": row["duration_s"],
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
                save_tile(z, x, y, tiles_out / str(z) / str(x) / f"{y}.jpg", "jpeg")
                count += 1
    deep = deep_tiles(deep_lines, deep_points)
    deep_bytes = 0
    for z, tiles in deep.items():
        for x, y in sorted(tiles):
            dest = tiles_out / str(z) / str(x) / f"{y}.webp"
            save_tile(z, x, y, dest, "webp")
            deep_bytes += dest.stat().st_size
    index = {str(z): sorted(f"{x}/{y}" for x, y in tiles) for z, tiles in deep.items()}
    (tiles_out / "deep.json").write_text(json.dumps(index, separators=(",", ":")))

    out = {
        "source": "JPL Mars 2020 MMGIS layers m20_heli_waypoints.json and m20_heli_flight_path.json, and NASA's Ingenuity flight log",
        "flight_log": FLIGHT_LOG,
        "mission_page": MISSION_PAGE,
        "basemap": f"{LAYERS}/{BASEMAP}",
        "bbox": [round(v, 6) for v in bbox],
        "zooms": [min(ZOOMS), max(ZOOMS)],
        "deep_zooms": [min(DEEP), max(DEEP)],
        "tiles": count,
        "deep_tiles": sum(len(v) for v in deep.values()),
        "start": start,
        "flights": flights,
        "totals": {
            "flights": len(flights),
            "log_distance_m": running,
            "nasa_km": nasa_totals["km"],
            "nasa_minutes": nasa_totals["minutes"],
            "hovers": [f["n"] for f in flights if f["hover"]],
        },
    }
    data_dir = site_public / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "ingenuity.json").write_text(json.dumps(out, separators=(",", ":")))
    return {"flights": len(flights), "tiles": count, "deep_tiles": out["deep_tiles"],
            "deep_mb": round(deep_bytes / 1e6, 2), "nasa": nasa_totals, "log_m": running}


def clock(out: Path) -> dict:
    """Write the newest raw image's UTC time, sol and LMST for the Jezero clock."""
    image = json.loads(net.get(RAW_FEED, timeout=120))["images"][0]
    m = re.fullmatch(r"Sol-(\d+)M(\d\d):(\d\d):(\d\d(?:\.\d+)?)", image["date_taken_mars"])
    if not m:
        raise ValueError(f"unexpected date_taken_mars {image['date_taken_mars']}")
    record = {
        "source": RAW_FEED,
        "algorithm": MARS24,
        "image": image["imageid"],
        "link": image["link"],
        "utc": image["date_taken_utc"] + "Z",
        "sol": int(m.group(1)),
        "lmst_h": round(int(m.group(2)) + int(m.group(3)) / 60 + float(m.group(4)) / 3600, 6),
        "tt_minus_utc_s": 69.184,
    }
    out.write_text(json.dumps(record, indent=1) + "\n")
    return record


if __name__ == "__main__":
    import sys

    if sys.argv[1:] == ["clock"]:
        print(clock(Path(__file__).resolve().parent.parent / "site" / "src" / "data" / "jezero-clock.json"))
