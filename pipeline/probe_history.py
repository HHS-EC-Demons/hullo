"""Distance from the Sun and from Earth for each probe, from launch to now.

One JPL Horizons vector table per probe and center, every calendar month,
from the first epoch Horizons holds for the probe's trajectory to STOP.
Distances are geometric (no light time correction) in astronomical units.
The Sun table uses center 500@10 (the Sun's body center) and the Earth
table uses center 500@399 (Earth's center).

Writes site/src/data/probe-history.json.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np

import horizons

AU_KM = 149597870.7
C_KM_S = 299792.458
STOP = "2026-11-01"
OUT = Path(__file__).resolve().parents[1] / "site" / "src" / "data" / "probe-history.json"

PROBES = [
    ("voyager1", "Voyager 1", "-31"),
    ("voyager2", "Voyager 2", "-32"),
    ("newhorizons", "New Horizons", "-98"),
    ("pioneer10", "Pioneer 10", "-23"),
    ("pioneer11", "Pioneer 11", "-24"),
]


def coverage_start(command: str) -> str:
    """First epoch Horizons can return for this target, read from its own error text."""
    try:
        horizons.query({
            "COMMAND": command,
            "EPHEM_TYPE": "VECTORS",
            "CENTER": "500@10",
            "START_TIME": "1960-01-01",
            "STOP_TIME": "1960-02-01",
            "STEP_SIZE": "1 d",
            "VEC_TABLE": "2",
            "CSV_FORMAT": "YES",
        })
    except RuntimeError as err:
        text = str(err)
        match = re.search(r"prior to A\.D\. (\d{4})-([A-Z]{3})-(\d{2}) (\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)", text)
        if not match:
            raise
        year, mon, day, hh, mm, ss = match.groups()
        when = datetime.strptime(f"{year}-{mon.title()}-{day} {hh}:{mm}:{int(float(ss)):02d}", "%Y-%b-%d %H:%M:%S")
        when = when.replace(second=0) + timedelta(minutes=2)
        return when.strftime("%Y-%m-%d %H:%M")
    raise RuntimeError("Horizons returned data for 1960, expected a coverage error")


def monthly(command: str, center: str, start: str) -> tuple[list[str], np.ndarray]:
    result = horizons.query({
        "COMMAND": command,
        "EPHEM_TYPE": "VECTORS",
        "CENTER": center,
        "START_TIME": start,
        "STOP_TIME": STOP,
        "STEP_SIZE": "1 mo",
        "VEC_TABLE": "2",
        "VEC_CORR": "NONE",
        "OUT_UNITS": "KM-S",
        "CSV_FORMAT": "YES",
        "TIME_TYPE": "UT",
    })
    table = horizons.rows(result)
    stamps = [r[1].replace("A.D. ", "").strip() for r in table]
    pos = np.array([[float(v) for v in r[2:5]] for r in table])
    return stamps, np.linalg.norm(pos, axis=1)


def iso(stamp: str) -> str:
    when = datetime.strptime(stamp.split(".")[0], "%Y-%b-%d %H:%M:%S")
    return when.replace(tzinfo=timezone.utc).strftime("%Y-%m-%dT%H:%MZ")


def year_fraction(stamp: str) -> float:
    when = datetime.strptime(stamp.split(".")[0], "%Y-%b-%d %H:%M:%S")
    start = datetime(when.year, 1, 1)
    end = datetime(when.year + 1, 1, 1)
    return when.year + (when - start).total_seconds() / (end - start).total_seconds()


def build() -> dict:
    out = {
        "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "source": "JPL Horizons API, geometric state vectors every month, centers 500@10 (Sun) and 500@399 (Earth), time type UT",
        "au_km": AU_KM,
        "stop_utc": STOP + "T00:00Z",
        "probes": {},
    }
    for key, name, command in PROBES:
        start = coverage_start(command)
        stamps, sun_km = monthly(command, "500@10", start)
        earth_stamps, earth_km = monthly(command, "500@399", start)
        assert stamps == earth_stamps, f"{key} Sun and Earth tables must share epochs"
        out["probes"][key] = {
            "name": name,
            "horizons_id": command,
            "first_utc": iso(stamps[0]),
            "t": [round(year_fraction(s), 4) for s in stamps],
            "sun_au": [round(float(d) / AU_KM, 3) for d in sun_km],
            "earth_light_h": [round(float(d) / C_KM_S / 3600, 4) for d in earth_km],
        }
    return out


if __name__ == "__main__":
    data = build()
    OUT.write_text(json.dumps(data, separators=(",", ":")) + "\n")
    for key, p in data["probes"].items():
        print(key, p["first_utc"], len(p["t"]), p["sun_au"][-1], "AU", p["earth_light_h"][-1], "h")
