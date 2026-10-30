"""Sky chart data: real stars, constellation lines and where the spacecraft are.

Stars come from the Yale Bright Star Catalogue, 5th revised edition
(Hoffleit and Warren 1991, VizieR V/50), every star brighter than visual
magnitude 5.5, at its J2000 catalog position.

Constellation lines come from d3-celestial by Olaf Frohn (BSD 3-Clause),
whose line figures join catalog stars at their J2000 positions.

Spacecraft positions come from JPL Horizons observer tables seen from
Earth's center (500@399): quantity 1, astrometric right ascension and
declination in the ICRF, and quantity 29, the constellation, once a day at
00:00 UT from 2026-01-01 to 2028-01-01. The site ships one small file per
month. The Moon, Mars and the asteroid Eros stand in for the hardware that
rests on them.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import horizons
import net

CACHE = Path(__file__).resolve().parent / "cache" / "sky"
VIZIER = (
    "https://vizier.cfa.harvard.edu/viz-bin/asu-tsv?-source=V/50/catalog"
    "&-out=HR,_RAJ2000,_DEJ2000,Vmag,pmRA,pmDE&Vmag=%3C5.5&-out.max=9999"
)
LINES = "https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json"
NAMES = "https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.json"
MAG_LIMIT = 5.5
START = "2026-01-01"
STOP = "2028-01-01"
MONTHS = {m: i + 1 for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])}

BODIES = [
    {"key": "voyager1", "name": "Voyager 1", "short": "V1", "command": "-31", "kind": "probe"},
    {"key": "voyager2", "name": "Voyager 2", "short": "V2", "command": "-32", "kind": "probe"},
    {"key": "newhorizons", "name": "New Horizons", "short": "NH", "command": "-98", "kind": "probe"},
    {"key": "pioneer10", "name": "Pioneer 10", "short": "P10", "command": "-23", "kind": "probe"},
    {"key": "pioneer11", "name": "Pioneer 11", "short": "P11", "command": "-24", "kind": "probe"},
    {"key": "moon", "name": "Moon", "short": "Moon", "command": "301", "kind": "world",
     "holds": "Apollo mirrors, Surveyor 3, Lunar Prospector, LCROSS"},
    {"key": "mars", "name": "Mars", "short": "Mars", "command": "499", "kind": "world",
     "holds": "Ingenuity, Viking 1 and 2, Pathfinder, Spirit, Opportunity, Phoenix, InSight"},
    {"key": "eros", "name": "Eros", "short": "Eros", "command": "433;", "kind": "world",
     "holds": "NEAR Shoemaker"},
]


def cached(url: str, name: str) -> bytes:
    path = CACHE / name
    if path.exists():
        return path.read_bytes()
    CACHE.mkdir(parents=True, exist_ok=True)
    body = net.get(url, timeout=180)
    path.write_bytes(body)
    return body


def stars() -> list[float]:
    """Flat list of right ascension, declination (degrees) and magnitude."""
    text = cached(VIZIER, "bsc5-v50.tsv").decode()
    out: list[tuple[float, float, float]] = []
    for line in text.splitlines():
        if not line or line.startswith("#"):
            continue
        cells = line.split("\t")
        if len(cells) < 4 or not cells[0].strip().isdigit():
            continue
        try:
            ra, dec, mag = float(cells[1]), float(cells[2]), float(cells[3])
        except ValueError:
            continue
        if mag < MAG_LIMIT:
            out.append((ra, dec, mag))
    out.sort(key=lambda s: s[2])
    flat: list[float] = []
    for ra, dec, mag in out:
        flat += [round(ra, 2), round(dec, 2), round(mag, 1)]
    return flat


def lines() -> list[list[float]]:
    """Constellation figures as flat [ra, dec, ra, dec, ...] polylines."""
    data = json.loads(cached(LINES, "constellations.lines.json"))
    out = []
    for feature in data["features"]:
        for part in feature["geometry"]["coordinates"]:
            flat: list[float] = []
            for lon, lat in part:
                flat += [round(lon % 360.0, 2), round(lat, 2)]
            out.append(flat)
    return out


def constellation_names() -> dict[str, str]:
    data = json.loads(cached(NAMES, "constellations.json"))
    return {f["id"]: f["properties"]["name"] for f in data["features"]}


def track(command: str) -> tuple[list[datetime], list[float], list[float], list[str], str]:
    result = horizons.query({
        "COMMAND": command,
        "EPHEM_TYPE": "OBSERVER",
        "CENTER": "500@399",
        "START_TIME": START,
        "STOP_TIME": STOP,
        "STEP_SIZE": "1 d",
        "QUANTITIES": "1,29",
        "TIME_TYPE": "UT",
        "CSV_FORMAT": "YES",
        "ANG_FORMAT": "DEG",
        "EXTRA_PREC": "NO",
    })
    times, ra, dec, con = [], [], [], []
    for r in horizons.rows(result):
        date, hm = r[0].split(" ")
        y, mon, d = date.split("-")
        hh, mm = hm.split(":")
        times.append(datetime(int(y), MONTHS[mon], int(d), int(hh), int(mm), tzinfo=timezone.utc))
        ra.append(float(r[3]))
        dec.append(float(r[4]))
        con.append(r[5])
    return times, ra, dec, con, horizons.header_value(result, "Target body name")


def build(out_dir: Path) -> dict:
    """Write the star file and one position file per month, return the index."""
    out_dir.mkdir(parents=True, exist_ok=True)
    names = constellation_names()
    tracks = {}
    targets = {}
    for body in BODIES:
        times, ra, dec, con, target = track(body["command"])
        tracks[body["key"]] = (times, ra, dec, con)
        targets[body["key"]] = target
    first = tracks[BODIES[0]["key"]][0]
    for key, (times, *_rest) in tracks.items():
        assert times == first, f"{key} does not share epochs"
    months: dict[str, list[int]] = {}
    for i, t in enumerate(first):
        months.setdefault(t.strftime("%Y-%m"), []).append(i)
    for month, idx in months.items():
        days = []
        for i in idx:
            row: list[float | str] = []
            for body in BODIES:
                _, ra, dec, con = tracks[body["key"]]
                row += [round(ra[i], 3), round(dec[i], 3), con[i]]
            days.append(row)
        payload = {"month": month, "first_day": first[idx[0]].strftime("%Y-%m-%d"), "days": days}
        (out_dir / f"{month}.json").write_text(json.dumps(payload, separators=(",", ":")))
    star_list = stars()
    (out_dir / "stars.json").write_text(json.dumps({
        "mag_limit": MAG_LIMIT,
        "stars": star_list,
        "lines": lines(),
    }, separators=(",", ":")))
    used = sorted({c for _, _, _, cons in tracks.values() for c in cons})
    return {
        "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "source": "JPL Horizons observer tables, center 500@399, quantities 1 (astrometric RA and Dec, ICRF) and 29, daily at 00:00 UT",
        "stars_source": "Yale Bright Star Catalogue 5th revised ed. (VizieR V/50), V < 5.5, J2000",
        "lines_source": "d3-celestial constellations.lines.json, Olaf Frohn, BSD 3-Clause",
        "star_count": len(star_list) // 3,
        "months": sorted(months),
        "bodies": [{**b, "horizons_target": targets[b["key"]]} for b in BODIES],
        "constellations": {c: names.get(c, c) for c in used},
    }

